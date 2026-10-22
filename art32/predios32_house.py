"""Casinhas dos moradores 32-bit (building/house/01..05): 128×96, o dobro do pack 16-bit.

As cinco são variações da mesma casinha de tábuas com telhado de telha e porta vermelha
em arco: muda o lado da chaminé, quais janelas existem (e acendem), as floreiras e o que
fica encostado na parede (barril, pilha de lenha).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from predios32_kit import *  # noqa: E402,F401,F403
from predios32_kit import (  # noqa: E402
    ROOF_RED, STONE, WOOD, IRON, GLASS, barrel, chimney, door, eave_shadow, flowerbox, glass, hsh, layer,
    merge, mix, mul, new_pair, plinth, roof, wall_planks,
)

W, H = 128, 96
DOOR_RED = [(56, 20, 24), (96, 36, 38), (132, 54, 52), (166, 74, 66), (196, 102, 88)]


def small_window(c, lt, gx, gy, gw=12, gh=12, box=False, seed=0):
    """Janelinha de casinha: moldura de 2 px, cruzeta, peitoril (ou floreira) logo embaixo."""
    c.rect(gx - 2, gy - 2, gw + 4, gh + 2, WOOD[1])
    c.rect(gx - 2, gy - 2, 1, gh + 2, WOOD[3])
    c.rect(gx + gw + 1, gy - 1, 1, gh + 1, WOOD[0])
    glass(c, gx, gy, gw, gh, lt)
    mx, my = gx + gw // 2 - 1, gy + gh // 2 - 1
    c.rect(mx, gy, 2, gh, WOOD[2])
    c.rect(mx, gy, 1, gh, WOOD[3])
    c.rect(gx, my, gw, 2, WOOD[2])
    c.rect(gx, my, gw, 1, WOOD[3])
    if lt is not None:
        for y in range(gy, gy + gh):
            lt.p(mx, y, None)
            lt.p(mx + 1, y, None)
        for x in range(gx, gx + gw):
            lt.p(x, my, None)
            lt.p(x, my + 1, None)
    if box:
        flowerbox(c, gx - 3, gy + gh + 3, gw + 6, seed=seed)
    else:
        c.rect(gx - 3, gy + gh, gw + 6, 2, WOOD[3])
        c.rect(gx - 3, gy + gh, gw + 6, 1, WOOD[4])
        c.rect(gx - 2, gy + gh + 2, gw + 4, 1, WOOD[0])


def woodpile(c, x0, y0, x1, y1, step_x=None, step_y=0, seed=0):
    """Pilha de lenha rachada vista de topo: toras em fileiras, casca escura e cerne claro."""
    rows = []
    y = y1
    while y - 6 >= y0 - 1:
        rows.append(y - 6)
        y -= 6
    for ri, ry in enumerate(rows):
        xa = x0 if (step_x is None or ry >= step_y) else step_x
        off = 3 if ri % 2 else 0
        x = xa + off - 3
        k = 0
        while x < x1 + 3:
            k += 1
            r = 2.6 + hsh(k, ri, seed) * 0.6
            cx, cy = x + 3, ry + 3
            for yy in range(ry, ry + 6):
                for xx in range(int(cx - 4), int(cx + 4)):
                    if not (xa <= xx <= x1 and y0 <= yy <= y1 - 1):
                        continue
                    d = ((xx - cx + 0.5) / (r + 0.3)) ** 2 + ((yy - cy + 0.5) / r) ** 2
                    if d <= 1.0:
                        lit = (xx - cx) + (yy - cy) < 0
                        if d > 0.6:
                            col = WOOD[1] if lit else WOOD[0]                        # casca
                        else:
                            col = WOOD[4] if lit and d > 0.2 else WOOD[3]            # cerne
                        if (xx, yy) == (int(cx), int(cy)):
                            col = WOOD[2]                                             # miolo
                        if hsh(k, ri, seed + 1) < 0.4 and xx == int(cx) + 1 and yy > cy and d <= 0.6:
                            col = WOOD[1]                                             # racha
                        c.p(xx, yy, col)
                    elif c.g(xx, yy) is None:
                        c.p(xx, yy, mix(WOOD[0], (12, 9, 8), 0.4))                 # vão entre toras
            x += 6


def house(chimney_side=None, windows=(True, True), flowers=(False, False), extra=None, seed=0):
    c, lt = new_pair(W, H)
    if chimney_side == 'right':
        chimney(c, 84, 15, 12, 30, STONE, seed=seed + 1)
    elif chimney_side == 'left':
        chimney(c, 32, 15, 12, 30, STONE, seed=seed + 1)
    roof(c, 23, 62, (19, 13), (108, 114), (32, 15), (95, 112), 'tile', ROOF_RED, seed=seed + 2)
    wall_planks(c, 22, 64, 84, 24, WOOD, pw=10, seed=seed + 3, nails=(66, 85), weather=6, seams=False)
    eave_shadow(c, 22, 105, 64, 5)
    for i, gx in enumerate((38, 78)):
        if windows[i]:
            small_window(c, lt, gx, 64, 12, 12, box=flowers[i], seed=seed + 4 + i)
    door(c, 56, 67, 16, 21, pal=DOOR_RED, frame=WOOD, arch=6, pw=4, seed=seed + 6, step=False, studs=False)
    plinth(c, 19, 88, 90, 6, STONE, seed=seed + 7, joint=12)
    if extra == 'woodpile':
        p = layer(c)
        woodpile(p, 108, 70, 127, 88, step_x=112, step_y=76, seed=seed)
        merge(c, p, (1, 1, 0.7))
    elif extra == 'barrel':
        p = layer(c)
        barrel(p, 8, 88, w=12, h=16, seed=seed)
        merge(c, p, (2, 1, 0.7))
    c.outline()
    return c, lt


PIECES = {
    'building/house/01': lambda: house('right', (True, True), (False, False), seed=10),
    'building/house/02': lambda: house('left', (False, True), (False, True), seed=20),
    'building/house/03': lambda: house(None, (True, True), (False, False), extra='woodpile', seed=30),
    'building/house/04': lambda: house('right', (True, False), (False, False), extra='barrel', seed=40),
    'building/house/05': lambda: house('left', (True, True), (True, True), seed=50),
}
