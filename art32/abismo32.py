"""Cenário do abismo em 32-bit: corredor e arena dos seis atos, objetos da arena, efeitos
de combate e as molduras da interface do abismo (o dobro de pixels do pack 16-bit).

Uso: python3 -I art32/abismo32.py [pasta-de-prévias] [--only=prefixo ...]
  · sem argumentos, grava todas as peças em export32/;
  · com uma pasta, grava também folhas de conferência (16-bit ampliada × 32-bit);
  · --only=corridor/I grava só as peças cujo id começa assim.

Os geradores ficam em abismo32_base.py (paletas e materiais), abismo32_corredor.py (peças
comuns e o ato I), abismo32_corredor_atos.py (atos II a VI), abismo32_arena.py,
abismo32_props.py, abismo32_fx.py e abismo32_ui.py.
"""
from __future__ import annotations

import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

import lib32  # noqa: E402
import abismo32_corredor as COR  # noqa: E402
from abismo32_base import ROMANS  # noqa: E402

try:
    import abismo32_arena as ARENA  # noqa: E402
except ImportError:  # pragma: no cover - durante a montagem
    ARENA = None
try:
    import abismo32_props as PROPS  # noqa: E402
except ImportError:  # pragma: no cover
    PROPS = None
try:
    import abismo32_fx as FX  # noqa: E402
except ImportError:  # pragma: no cover
    FX = None
try:
    import abismo32_ui as UI  # noqa: E402
except ImportError:  # pragma: no cover
    UI = None

INV = {e['id']: e for e in lib32.inventory('abismo') + lib32.inventory('interface')}
UI_IDS = ('ui/boss-banner', 'ui/dungeon-frame', 'ui/hp-frame', 'ui/room-node')


def registry():
    """id → função que devolve a Image 32-bit."""
    reg = {}
    for act in ROMANS:
        for part, fn in COR.act_pieces(act).items():
            reg[f'corridor/{act}/{part}'] = fn
    if ARENA:
        reg.update(ARENA.pieces())
    if PROPS:
        reg.update(PROPS.pieces())
    if FX:
        reg.update(FX.pieces())
    if UI:
        reg.update(UI.pieces())
    return reg


_memo: dict = {}


def build(iid, reg):
    """Desenha a peça (uma função usada por dois ids — o chão — roda uma vez só)."""
    fn = reg[iid]
    if fn not in _memo:
        out = fn()
        if hasattr(out, 'image'):
            out = out.image()
        _memo[fn] = out
    return _memo[fn]


def compare_sheet(ids, imgs, out, cols=2, scale=1, bg=(255, 0, 255)):
    """Folha de conferência: para cada peça, a 16-bit ampliada 2× e a 32-bit ao lado."""
    pairs = []
    for iid in ids:
        if iid not in imgs:
            continue
        a = Image.open(lib32.path16(INV[iid]['file'])).convert('RGBA')
        a = a.resize((a.width * 2, a.height * 2), Image.NEAREST)
        pairs.append((a, imgs[iid]))
    if not pairs:
        return
    cw = max(a.width for a, _ in pairs) * 2 + 12
    ch = max(a.height for a, _ in pairs) + 8
    rows = (len(pairs) + cols - 1) // cols
    sh = Image.new('RGBA', (cw * cols, ch * rows), bg + (255,))
    for k, (a, b) in enumerate(pairs):
        x, y = (k % cols) * cw, (k // cols) * ch
        sh.alpha_composite(a, (x, y))
        sh.alpha_composite(b, (x + a.width + 4, y))
    if scale != 1:
        sh = sh.resize((sh.width * scale, sh.height * scale), Image.NEAREST)
    sh.save(out)


def scene_sheets(done, prev):
    """Folhas de conjunto, montadas como o jogo monta (em 32-bit, coordenadas ×2)."""
    def get(iid):
        return done.get(iid) or Image.open(lib32.path32(INV[iid]['file'])).convert('RGBA')

    # Corredor: patamar + parede a + arco + parede b, chão em y 256 e primeiro plano em y 320.
    rows = []
    for act in ROMANS:
        if not all(f'corridor/{act}/{p}' in INV for p in ('wall-a', 'wall-b')):
            continue
        sc = Image.new('RGBA', (144 + 1280, 384), (5, 5, 7, 255))
        sc.alpha_composite(get(f'corridor/{act}/entry'), (0, 0))
        sc.alpha_composite(get(f'corridor/{act}/wall-a'), (144, 0))
        sc.alpha_composite(get(f'corridor/{act}/wall-b'), (784, 0))
        for x in (0, 640, 1280):
            sc.alpha_composite(get(f'corridor/{act}/floor'), (x, 256))
        sc.alpha_composite(get(f'corridor/{act}/door'), (784 - 48, 0))
        for x in (0, 640, 1280):
            sc.alpha_composite(get(f'corridor/{act}/fore'), (x, 320))
        torch = get('prop/arena/torch').crop((0, 0, 32, 64))
        for tx in (144 + 68, 784 - 68, 784 + 68):
            sc.alpha_composite(torch, (tx - 16, 296 - 64))
        rows.append(sc)
    if rows:
        sh = Image.new('RGBA', (rows[0].width, sum(r.height + 8 for r in rows)), (20, 20, 24, 255))
        y = 0
        for r in rows:
            sh.alpha_composite(r, (0, y))
            y += r.height + 8
        sh.save(os.path.join(prev, 'abismo-corredor.png'))
    # Arena: o fundo de cada andar com pilares, chão, objetos e primeiro plano.
    tiles = []
    for act in ROMANS:
        for n in (1, 4):
            sc = get(f'arena/{act}/back-{n}').copy()
            sc.alpha_composite(get(f'arena/{act}/mid'))
            sc.alpha_composite(get(f'arena/{act}/floor'), (0, 256))
            if n == 4:
                gate = get(f'prop/arena/{act}/boss-gate')
                sc.alpha_composite(gate, (2 * 254 - 96, 2 * 152 - 192))
                ritual = get('decal/arena/ritual-circle')
                sc.alpha_composite(ritual, (2 * 174 - 160 + 80, 2 * 158 - 16))
            sc.alpha_composite(get(f'arena/{act}/fore'), (0, 292))
            tiles.append(sc)
    sh = Image.new('RGBA', (2 * 648, 6 * 392), (20, 20, 24, 255))
    for i, t in enumerate(tiles):
        sh.alpha_composite(t, ((i % 2) * 648, (i // 2) * 392))
    sh.save(os.path.join(prev, 'abismo-arena.png'))
    # Objetos, efeitos e molduras (lib32.preview: lado a lado, ampliados).
    props = [get(i) for i in INV if i.startswith('prop/') and 'boss-gate' not in i and i != 'prop/arena/torch' and i != 'prop/arena/brazier']
    props += [get('prop/arena/torch'), get('prop/arena/brazier')]
    # Em três fileiras (lib32.preview faz cada uma; aqui só empilha).
    rows = []
    for k in range(3):
        part = props[k * len(props) // 3:(k + 1) * len(props) // 3]
        tmp = os.path.join(prev, f'.objetos-{k}.png')
        lib32.preview(part, tmp, scale=2, bg=(40, 36, 44))
        rows.append(Image.open(tmp).convert('RGBA'))
        os.remove(tmp)
    sh = Image.new('RGBA', (max(r.width for r in rows), sum(r.height + 12 for r in rows)), (24, 22, 28, 255))
    y = 0
    for r in rows:
        sh.alpha_composite(r, (0, y))
        y += r.height + 12
    sh.save(os.path.join(prev, 'abismo-objetos.png'))
    lib32.preview([get(f'prop/arena/{a}/boss-gate') for a in ROMANS] + [get('decal/arena/ritual-circle')],
                  os.path.join(prev, 'abismo-portoes.png'), scale=2, bg=(40, 36, 44))
    fx = [get(i) for i in INV if i.startswith('fx/')]
    sh = Image.new('RGBA', (640, 128 * len(fx)), (40, 36, 44, 255))
    for k, im in enumerate(fx):
        sh.alpha_composite(im, (0, 128 * k))
    sh.save(os.path.join(prev, 'abismo-efeitos.png'))
    lib32.preview([get(i) for i in UI_IDS], os.path.join(prev, 'abismo-molduras.png'), scale=2, bg=(40, 36, 44))


def main(argv):
    prev = None
    only = []
    for a in argv[1:]:
        if a.startswith('--only='):
            only.append(a.split('=', 1)[1])
        else:
            prev = a
    reg = registry()
    done = {}
    t0 = time.time()
    for iid in reg:
        if only and not any(iid.startswith(o) for o in only):
            continue
        img = build(iid, reg)
        lib32.save32(img, INV[iid]['file'])
        done[iid] = img
    print(f'{len(done)} peças em {time.time() - t0:.1f}s')
    if prev:
        os.makedirs(prev, exist_ok=True)
        groups = {}
        for iid in done:
            parts = iid.split('/')
            key = '-'.join(parts[:2]) if parts[0] in ('corridor', 'arena') else ('-'.join(parts[:3]) if parts[0] in ('prop',) else parts[0])
            groups.setdefault(key, []).append(iid)
        for key, ids in groups.items():
            compare_sheet(ids, done, os.path.join(prev, f'cmp-{key}.png'), cols=1 if key.startswith(('corridor', 'arena')) else 2)
        if not only:
            scene_sheets(done, prev)


if __name__ == '__main__':
    main(sys.argv)
