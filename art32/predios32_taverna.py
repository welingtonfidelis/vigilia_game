"""Taverna 32-bit: ruína, nível 1 e nível 2 (o nível 3 é o piloto em taverna32.py).

Cada função devolve (peça, luzes) em 224×192, o dobro do pack 16-bit, com a mesma
composição: as janelas ficam onde o overlay 16-bit acende.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from predios32_kit import *  # noqa: E402,F401,F403
from predios32_kit import (  # noqa: E402
    GREEN, ROOF_RED, STONE, WOOD, IRON, VOID, barrel, broken_beam, broken_door, chimney, crate, door, hsh,
    rafter_stubs, boards,
    eave_shadow, lantern, layer, merge, new_pair, plinth, roof, roof_hole, rubble, scorch, sign, timber,
    wall_planks, wall_stone, weeds, window,
)

W, H = 224, 192


def taverna_1():
    """Nível 1: barracão de tábuas com telhado de telha, duas janelas e a placa da caneca."""
    c, lt = new_pair(W, H)
    roof(c, 81, 136, (43, 31), (180, 192), (62, 34), (161, 189), 'tile', ROOF_RED, seed=1)
    wall_planks(c, 40, 137, 144, 47, WOOD, pw=10, seed=2, nails=(141, 179))
    eave_shadow(c, 40, 183, 137, 6)
    for gx in (56, 152):
        window(c, lt, gx, 148, 16, 16, shutters=GREEN, sw=3, sill='wood', seed=gx)
    door(c, 100, 152, 24, 32, pw=4, seed=3)
    s = layer(c)
    sign(s, 128, 138, w=16, h=14, icon='mug', bracket=20)
    merge(c, s)
    plinth(c, 38, 184, 148, 6, STONE, seed=4)
    b = layer(c)
    barrel(b, 44, 184, w=12, h=16)
    merge(c, b)
    c.outline()
    return c, lt


def _taverna_2(ruin: bool):
    """Nível 2 (e a ruína, que é ele destruído): enxaimel caiado, chaminé, porta dupla."""
    c, lt = new_pair(W, H)
    lit = None if ruin else lt
    chimney(c, 44, 53, 12, 72, STONE, broken=ruin)
    roof(c, 65, 128, (29, 15), (194, 208), (54, 18), (169, 207), 'tile', ROOF_RED, seed=5,
         missing=0.2 if ruin else 0.0, dirt=0.7 if ruin else 0.0)
    if ruin:
        # Canto de cima à direita arrancado: telhas quebradas na borda.
        for y in range(62, 96):
            cut = 172 + (y - 62) * 1.05 + 3 * hsh(y // 2, 0, 9)
            for x in range(int(cut), 212):
                c.p(x, y, None)
            if c.g(int(cut) - 1, y):
                c.p(int(cut) - 1, y, ROOF_RED[0] if y % 3 else WOOD[1])
        broken_beam(c, 178, 70, 190, 64)
        roof_hole(c, 68, 76, 12, 14, ROOF_RED, seed=6, rafters=[60, 67, 74])
        roof_hole(c, 139, 73, 10, 10, ROOF_RED, seed=7, rafters=[134, 141])
        rafter_stubs(c, [58, 64, 72], 61, 68, seed=1)
        rafter_stubs(c, [133, 141], 62, 66, seed=2)
        scorch(c, 52, 64, 40, 26, seed=3, k=0.6)
    # Paredes de enxaimel: postes nos mesmos lugares da 16-bit, escoras sob as janelas.
    posts = [24, 52, 82, 164, 192, 196]
    braces = [(28, 170, 51, 180), (81, 170, 58, 180), (168, 170, 191, 180)]
    timber(c, 24, 129, 176, 55, posts, rails=[129, 164, 180], braces=braces, seed=11,
           dirty=0.75 if ruin else 0.0)
    eave_shadow(c, 24, 199, 129, 6)
    for i, gx in enumerate((32, 64, 144, 176)):
        window(c, lit, gx, 144, 16, 16, sill='wood', broken=ruin, seed=20 + i)
        if ruin:
            scorch(c, gx - 4, 128, 24, 18, seed=30 + i, k=0.62)
            if i in (1, 3):
                boards(c, gx, 144, 16, 16, seed=i)
    if ruin:
        broken_door(c, 98, 148, 28, 36, seed=4)
    else:
        door(c, 98, 148, 28, 36, double=True, pw=4, seed=4)
    if not ruin:
        lantern(c, lt, 91, 135)
    s = layer(c)
    sign(s, 132, 130, w=18, h=12, icon='mug', bracket=20, tilt=0.35 if ruin else 0.0)
    merge(c, s)
    plinth(c, 22, 184, 180, 6, STONE, seed=12)
    b = layer(c)
    barrel(b, 3, 184, w=10, h=16, broken=ruin, seed=1)
    barrel(b, 15, 184, w=10, h=16, broken=ruin, seed=2)
    crate(b, 202, 184, w=14, h=14)
    merge(c, b)
    if ruin:
        # Entulho: pedra, telha quebrada e vigas caídas na frente das paredes.
        r = layer(c)
        broken_beam(r, 60, 186, 92, 172, burnt=True)
        rubble(r, 42, 186, 24, 14, STONE, seed=1, extra=ROOF_RED)
        rubble(r, 81, 191, 30, 12, STONE, seed=2, extra=ROOF_RED)
        rubble(r, 146, 186, 28, 14, STONE, seed=3, extra=ROOF_RED)
        rubble(r, 186, 186, 34, 18, STONE, seed=4, extra=ROOF_RED)
        weeds(r, 22, 200, 184, seed=5, density=0.35, tall=7)
        merge(c, r, (1, 1, 0.7))
    c.outline()
    return c, (None if ruin else lt)


def taverna_2():
    return _taverna_2(False)


def taverna_ruin():
    return _taverna_2(True)


PIECES = {
    'building/taverna/ruin': taverna_ruin,
    'building/taverna/level-1': taverna_1,
    'building/taverna/level-2': taverna_2,
}
