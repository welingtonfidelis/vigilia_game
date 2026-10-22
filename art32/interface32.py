"""Interface 32-bit do Vigília: ícones das classes, armadura, amuleto e medalhas de rank,
mais três peças novas (16-bit e 32-bit) que tiram o 0x72 do jogo: a moeda girando, o baú
do corredor e a flecha em voo.

Ícones (ui-icon com .png do inventário 'interface'): 24×24 → 48×48 e 16×16 → 32×32,
mesmo enquadramento do 16-bit. Os .svg, retratos, molduras e web-icons ficam com outros
geradores.

Uso: python3 -I art32/interface32.py [pasta-de-prévias]"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from PIL import Image  # noqa: E402

import lib32  # noqa: E402
from interface32_icons import ICONS  # noqa: E402
from interface32_ranks import RANKS  # noqa: E402
from interface32_novas import NOVAS  # noqa: E402


def main(prev: str | None) -> None:
    done = []
    for file, fn in list(ICONS.items()) + list(RANKS.items()):
        img = fn().image()
        lib32.save32(img, file)
        done.append((file, img))
    for file16, fn16, fn32 in NOVAS:
        a = fn16()
        out16 = lib32.path16(file16)
        os.makedirs(os.path.dirname(out16), exist_ok=True)
        a.save(out16)
        b = fn32()
        lib32.save32(b, file16)
        done.append((file16, b))
    for file, _ in done:
        print('ok', lib32.path32(file).replace(lib32.ROOT + '/', ''))
    if prev:
        os.makedirs(prev, exist_ok=True)
        lib32.preview([grid_pairs(list(ICONS), 4)], os.path.join(prev, 'icones.png'), scale=4)
        lib32.preview([grid_pairs(list(RANKS), 4)], os.path.join(prev, 'ranks.png'), scale=5)
        for file16, _, _ in NOVAS:
            name = os.path.basename(file16)[:-4]
            lib32.preview(pair(file16), os.path.join(prev, f'nova-{name}.png'), scale=8, bg=(34, 30, 38))
        only32 = [Image.open(lib32.path32(f)).convert('RGBA') for f in list(ICONS) + list(RANKS)]
        lib32.preview(only32, os.path.join(prev, 'so32.png'), scale=2, bg=(28, 24, 30))


def pair(file: str) -> list[Image.Image]:
    """O 16-bit ampliado 2× (referência de enquadramento) e o 32-bit."""
    a = Image.open(lib32.path16(file)).convert('RGBA')
    return [a.resize((a.width * 2, a.height * 2), Image.NEAREST), Image.open(lib32.path32(file)).convert('RGBA')]


def grid_pairs(files: list[str], cols: int) -> Image.Image:
    """Pares 16→32 lado a lado, em `cols` pares por linha, com respiro entre eles."""
    cells = []
    for f in files:
        a, b = pair(f)
        cell = Image.new('RGBA', (a.width + b.width + 12, max(a.height, b.height) + 6), (0, 0, 0, 0))
        cell.alpha_composite(a, (0, 0))
        cell.alpha_composite(b, (a.width + 4, 0))
        cells.append(cell)
    return lib32.sheet(cells, cols)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
