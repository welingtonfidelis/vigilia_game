"""Monstros e chefes 32-bit dos atos I–III do Vigília (folhas, variantes e retratos).

Peças (ids do inventário, categorias "monstros" e "interface"):
  Ato I   char/monster/esqueleto, rato, acolito (+ -deep, -core) · char/boss/guardiaoUrnas (+ -phase2)
  Ato II  char/monster/mineiro, enguia, golem (+ -deep, -core)   · char/boss/couraca (+ -phase2)
  Ato III char/monster/esporento, aranha, brotado (+ -deep, -core) · char/boss/maeBolor (+ -phase2)
  e os retratos ui/portrait/monster/<monstro> e ui/portrait/boss/<chefe> (64×72).

Os desenhos ficam em monstros32_a_ato1/2/3.py e a base comum (peças, contorno seletivo,
poses, variantes, quadros de ação e retrato) em monstros32_a_base.py.

Uso: python3 -I art32/monstros32_a.py [ids...] [--preview <pasta>] [--dry]
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import lib32 as L  # noqa: E402
from PIL import Image  # noqa: E402
import monstros32_a_base as B  # noqa: E402
import monstros32_a_ato1 as A1  # noqa: E402

try:
    import monstros32_a_ato2 as A2  # noqa: E402
except ImportError:          # durante o desenho, um ato pode ainda não existir
    A2 = None
try:
    import monstros32_a_ato3 as A3  # noqa: E402
except ImportError:
    A3 = None


def _reg():
    R = {
        'esqueleto': B.Monster('esqueleto', A1.esqueleto, (48, 64), 'I', 'legs', 'monster'),
        'rato': B.Monster('rato', A1.rato, (48, 32), 'I', 'legs', 'monster'),
        'acolito': B.Monster('acolito', A1.acolito, (48, 64), 'I', 'float', 'monster'),
        'guardiaoUrnas': B.Monster('guardiaoUrnas', A1.guardiao_urnas, (96, 112), 'I', 'legs', 'boss', big=True),
    }
    if A2:
        R.update({
            'mineiro': B.Monster('mineiro', A2.mineiro, (48, 64), 'II', 'legs', 'monster'),
            'enguia': B.Monster('enguia', A2.enguia, (48, 48), 'II', 'float', 'monster'),
            'golem': B.Monster('golem', A2.golem, (64, 80), 'II', 'legs', 'monster', big=True),
            'couraca': B.Monster('couraca', A2.couraca, (112, 96), 'II', 'legs', 'boss', big=True),
        })
    if A3:
        R.update({
            'esporento': B.Monster('esporento', A3.esporento, (48, 48), 'III', 'hop', 'monster'),
            'aranha': B.Monster('aranha', A3.aranha, (64, 48), 'III', 'legs', 'monster'),
            'brotado': B.Monster('brotado', A3.brotado, (64, 80), 'III', 'legs', 'monster', big=True),
            'maeBolor': B.Monster('maeBolor', A3.mae_bolor, (96, 112), 'III', 'float', 'boss', big=True),
        })
    return R


def _files():
    inv = {e['id']: e for e in L.inventory('monstros')}
    inv.update({e['id']: e for e in L.inventory('interface')})
    return inv


def build(mid, M, inv, save=True):
    """Gera as folhas (base e variantes) e o retrato de um monstro. Devolve {id: (img, file)}."""
    out = {}
    modes = ['', 'deep', 'core'] if M.kind == 'monster' else ['', 'phase2']
    base0 = None
    for mode in modes:
        pid = f'char/{M.kind}/{mid}' + (f'-{mode}' if mode else '')
        e = inv[pid]
        frames = M.frames(mode)
        assert len(frames) == e['frames'] == 19, pid
        img = B.sheet_img(frames)
        fw, fh = e['frameSize']
        assert img.size == (fw * 2 * 19, fh * 2), (pid, img.size)
        if save:
            L.save32(img, e['file'])
        out[pid] = (img, e['file'], frames)
        if not mode:
            base0 = frames[0]
    pid = f'ui/portrait/{M.kind}/{mid}'
    e = inv[pid]
    pimg = B.portrait(base0, M.kind, M.act).image()
    if save:
        L.save32(pimg, e['file'])
    out[pid] = (pimg, e['file'], None)
    return out


def preview_sheet(mid, res, inv, folder):
    """Folha de conferência: a 16-bit ampliada 2× em cima de cada folha 32-bit."""
    rows = []
    for pid, (img, file, frames) in res.items():
        if frames is None:
            continue
        old = Image.open(L.path16(file)).convert('RGBA')
        rows.append(old.resize((old.width * 2, old.height * 2), Image.NEAREST))
        rows.append(img)
    w = max(r.width for r in rows)
    h = sum(r.height + 4 for r in rows)
    sh = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    y = 0
    for r in rows:
        sh.alpha_composite(r, (0, y))
        y += r.height + 4
    scale = 2 if w < 1200 else 1
    L.preview([sh], os.path.join(folder, f'{mid}.png'), scale=scale)
    # quadros grandes do idle (base) para olhar o pixel de perto
    base = [r for r in res.values() if r[2] is not None]
    big = [base[0][2][i].image() for i in (0, 2, 4, 6, 9, 12, 13, 15, 17)]
    big += [b[2][0].image() for b in base[1:]]
    L.preview(big, os.path.join(folder, f'{mid}-zoom.png'), scale=4 if base[0][2][0].w <= 64 else 3)


def preview_portraits(res_all, folder):
    ims = []
    for res in res_all:
        for pid, (img, file, frames) in res.items():
            if frames is None:
                old = Image.open(L.path16(file)).convert('RGBA')
                ims.append(old.resize((64, 72), Image.NEAREST))
                ims.append(img)
    L.preview(ims, os.path.join(folder, 'retratos.png'), scale=3)


def main(argv):
    folder = None
    save = True
    ids = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == '--preview':
            folder = argv[i + 1]
            i += 2
            continue
        if a == '--dry':
            save = False
        else:
            ids.append(a)
        i += 1
    R = _reg()
    inv = _files()
    ids = ids or list(R)
    res_all = []
    for mid in ids:
        res = build(mid, R[mid], inv, save)
        res_all.append(res)
        for pid, (img, file, _) in res.items():
            print(f'{pid:36s} → {L.path32(file) if save else "(não gravado)"}  {img.size[0]}×{img.size[1]}')
        if folder:
            os.makedirs(folder, exist_ok=True)
            preview_sheet(mid, res, inv, folder)
    if folder and res_all:
        preview_portraits(res_all, folder)


if __name__ == '__main__':
    main(sys.argv[1:])
