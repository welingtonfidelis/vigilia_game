"""Gente 32-bit do Vigília: prefeito, moradores, crianças, cães e gatos, e os retratos do
prefeito. Cada folha tem o dobro de pixels por quadro da 16-bit, os mesmos quadros na mesma
ordem e a mesma âncora (pé no meio de baixo).

Uso: python3 -I art32/gente32.py [pasta-de-prévias] [--only prefixo]
Grava em public/assets/vigilia/export32/ e, se receber uma pasta, folhas de prévia nela.
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

import lib32  # noqa: E402
import gente32_pessoas as P  # noqa: E402
from gente32_base import frames_sheet  # noqa: E402


def people_jobs():
    jobs = []
    jobs.append(('char/mayor', lambda: P.mayor_sheet('m')))
    jobs.append(('char/mayor/f', lambda: P.mayor_sheet('f')))
    for job in getattr(P, 'VILLAGER_JOBS', ()):
        for g in 'mf':
            jobs.append((f'char/villager/{job}/{g}', (lambda j=job, gg=g: P.villager_sheet(j, gg))))
    if hasattr(P, 'child_sheet'):
        for g in 'mf':
            jobs.append((f'char/child/{g}', (lambda gg=g: P.child_sheet(gg))))
    return jobs


def pet_jobs():
    try:
        import gente32_bichos as B
    except ImportError:
        return []
    return [(f'char/pet/{sp}/{coat}', (lambda s=sp, c=coat: B.pet_sheet(s, c))) for sp, coat in B.PETS]


def portrait_jobs():
    try:
        import gente32_retrato as R
    except ImportError:
        return []
    return [('ui/portrait/mayor', lambda: R.portrait('m')), ('ui/portrait/mayor/f', lambda: R.portrait('f'))]


def main(argv):
    prev = None
    only = None
    args = list(argv)
    if '--only' in args:
        i = args.index('--only')
        only = args[i + 1]
        del args[i:i + 2]
    if args:
        prev = args[0]
        os.makedirs(prev, exist_ok=True)
    inv = {e['id']: e for cat in ('gente', 'interface') for e in lib32.inventory(cat)}
    done = []
    groups = {}
    for pid, fn in people_jobs() + pet_jobs() + portrait_jobs():
        if only and not pid.startswith(only):
            continue
        e = inv[pid]
        res = fn()
        if isinstance(res, list):
            fw, fh = e['frameSize']
            assert len(res) == e['frames'], (pid, len(res), e['frames'])
            for f in res:
                assert (f.w, f.h) == (fw * 2, fh * 2), (pid, f.w, f.h)
            img = frames_sheet(res).image()
        else:
            img = res.image()
        out = lib32.save32(img, e['file'])
        done.append((pid, out))
        groups.setdefault(pid.split('/')[1] if pid.startswith('char/') else 'portrait', []).append(img)
        print(f'{pid} → {os.path.relpath(out, lib32.ROOT)}')
    if prev:
        for name, imgs in groups.items():
            if name == 'portrait':
                lib32.preview(imgs, os.path.join(prev, f'gente32-{name}.png'), scale=3)
                continue
            rows = []
            for im in imgs:
                rows.append(im)
            h = sum(i.height + 6 for i in rows)
            w = max(i.width for i in rows)
            sh = Image.new('RGBA', (w, h), (60, 74, 56, 255))
            y = 0
            for im in rows:
                sh.alpha_composite(im, (0, y))
                y += im.height + 6
            sc = 4 if name in ('pet', 'child') else 3
            sh.resize((w * sc, h * sc), Image.NEAREST).save(os.path.join(prev, f'gente32-{name}.png'))
    return done


if __name__ == '__main__':
    main(sys.argv[1:])
