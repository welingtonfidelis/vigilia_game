"""Molduras da interface do abismo em 32-bit: faixa do chefe, moldura 9-slice da dungeon,
moldura da barra de vida (janela interna transparente no mesmo lugar) e o marcador de
sala (normal, atual, limpo). Paleta da interface (ferro, ouro, vermelho), contorno OL.
"""
from __future__ import annotations

import math

from abismo32_base import (OL, blank, put)
from lib32 import sheet

IRON = [(24, 24, 28), (42, 42, 48), (60, 64, 72), (78, 82, 92), (106, 112, 120), (130, 138, 148), (154, 163, 171), (196, 204, 210)]
GOLD = [(96, 66, 28), (150, 112, 52), (200, 160, 80), (233, 192, 73), (255, 226, 140)]
RED = [(52, 18, 22), (74, 26, 30), (96, 38, 40), (118, 46, 46), (138, 58, 58), (166, 80, 74)]
BONE = [(110, 98, 80), (160, 146, 124), (200, 190, 168), (232, 224, 208), (248, 244, 232)]


def rivet(c, x, y, s=8):
    """Botão de ouro quadrado (s×s) com brilho no canto de cima."""
    for j in range(s):
        for i in range(s):
            col = GOLD[2]
            if i == 0 or j == 0:
                col = GOLD[3]
            if i == s - 1 or j == s - 1:
                col = GOLD[0]
            if 1 <= i <= 2 and 1 <= j <= 2:
                col = GOLD[4]
            put(c, x + i, y + j, col)
    put(c, x + s - 2, y + s - 2, GOLD[1])


def corner(c, x0, y0):
    """Canto 32×32: placa de ferro em três degraus e o rebite de ouro."""
    for j in range(32):
        for i in range(32):
            x, y = x0 + i, y0 + j
            d = min(i, j, 31 - i, 31 - j)
            if d < 2:
                col = OL
            elif d < 4:
                col = IRON[5] if (i < 16 and j < 16) or i + j < 32 else IRON[4]
                if i > 27 or j > 27:
                    col = IRON[3]
            elif d < 6:
                col = IRON[1]
            elif d < 8:
                col = IRON[3] if (i < j) == (i + j < 32) else IRON[4]
                if i < 8 or j < 8:
                    col = IRON[4]
                if i > 23 or j > 23:
                    col = IRON[2]
            else:
                col = IRON[1]
                if (i + j) % 7 == 0:
                    col = IRON[0]
            put(c, x, y, col)
    rivet(c, x0 + 12, y0 + 12, 8)


def dungeon_frame():
    c = blank(128, 128)
    # Trilhos (8 px): contorno, aresta clara, miolo, sombra; cravos a cada 12 px.
    for k in range(32, 96):
        for t in range(8):
            if t < 2:
                col = OL
            elif t < 3:
                col = IRON[6]
            elif t < 6:
                col = IRON[4]
            elif t < 7:
                col = IRON[3]
            else:
                col = IRON[1]
            put(c, k, t, col)                       # topo
            put(c, t, k, col)                       # esquerda
            put(c, k, 127 - t, OL if t < 2 else (IRON[1] if t == 7 else (IRON[2] if t < 6 else IRON[3])))  # base
            put(c, 127 - t, k, OL if t < 2 else (IRON[1] if t == 7 else (IRON[2] if t < 6 else IRON[3])))  # direita
        if (k - 32) % 12 == 8:
            for (x, y) in ((k, 3), (k + 1, 3), (k, 4)):
                put(c, x, y, IRON[7])
                put(c, y, x, IRON[7])
            put(c, k + 1, 5, IRON[2])
            put(c, 5, k + 1, IRON[2])
    for (x, y) in ((0, 0), (96, 0), (0, 96), (96, 96)):
        corner(c, x, y)
    return c


def hp_frame():
    c = blank(128, 32)
    for x in range(8, 120):
        put(c, x, 4, OL)
        put(c, x, 5, OL)
        put(c, x, 6, IRON[1])
        put(c, x, 7, IRON[2])
        put(c, x, 8, IRON[5] if x % 16 else IRON[7])
        put(c, x, 9, IRON[4])
        put(c, x, 22, IRON[3])
        put(c, x, 23, IRON[3] if x % 16 else IRON[5])
        put(c, x, 24, IRON[1])
        put(c, x, 25, IRON[1])
        put(c, x, 26, OL)
        put(c, x, 27, OL)
    for x0 in (0, 120):
        for y in range(32):
            for i in range(8):
                x = x0 + i
                if i < 2 or i > 5 or y < 2 or y > 29:
                    col = OL
                elif i == 2:
                    col = IRON[5] if y < 28 else IRON[3]
                elif i == 5:
                    col = IRON[1]
                else:
                    col = IRON[3] if y % 8 else IRON[4]
                    if y in (2, 3):
                        col = IRON[6]
                put(c, x, y, col)
        put(c, x0 + 3, 15, GOLD[3])
        put(c, x0 + 4, 15, GOLD[1])
        put(c, x0 + 3, 16, GOLD[1])
    return c


def skull16(c, x, y):
    rows = [
        '..XXXXXXXXXX..',
        '.XXXXXXXXXXXX.',
        'XXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXX',
        'XEEEXXXXXXEEEX',
        'XEEEEXXXXEEEEX',
        'XXEEXXXXXXEEXX',
        '.XXXXXNNXXXXX.',
        '..XXXXXXXXXX..',
        '..XTXTXTXTXX..',
        '...XXXXXXXX...',
    ]
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            if ch == 'E':
                col = (20, 14, 12)
            elif ch == 'N':
                col = BONE[0]
            elif ch == 'T':
                col = BONE[1]
            else:
                t = i / 13
                col = BONE[4] if (t < 0.3 and j < 3) else (BONE[3] if t < 0.62 else (BONE[2] if t < 0.85 else BONE[1]))
            put(c, x + i, y + j, col)


def boss_banner():
    c = blank(640, 96)
    # Faixa de pano.
    for x in range(20, 620):
        for y in range(14, 80):
            ly = y - 14
            if ly < 2 or ly > 63:
                col = OL
            elif ly < 4:
                col = RED[5] if ly == 2 else RED[4]
            elif ly < 8:
                col = RED[2]
            elif ly < 10:
                col = GOLD[3] if ly == 8 else GOLD[1]
            elif ly > 59:
                col = RED[1]
            elif 56 < ly <= 59:
                col = RED[2]
            elif 54 <= ly <= 56:
                col = GOLD[2] if ly == 54 else (GOLD[1] if ly == 55 else RED[1])
            else:
                # Trama do tecido e um leve degradê de cima para baixo.
                t = (ly - 10) / 44
                col = RED[3] if t < 0.15 else RED[2]
                if (x + ly * 3) % 12 == 0 and ly % 4 == 1:
                    col = RED[1]
                if t > 0.85:
                    col = RED[1] if (x + ly) % 2 else RED[2]
            if ly == 8 and x % 24 == 0:
                col = GOLD[4]
            put(c, x, y, col)
    # Pontas: triângulos dobrados com a sombra da dobra e a vareta de ferro.
    for side in (-1, 1):
        for j in range(8, 88):
            dist = abs(j - 48)
            reach = int(30 - dist * 0.62)
            for i in range(max(0, reach)):
                x = 6 + i if side < 0 else 633 - i
                col = RED[4] if i < reach - 3 else RED[3]
                if i < 2:
                    col = RED[5]
                if dist > 36:
                    col = RED[3]
                put(c, x, j, col)
            # Dobra: faixa escura onde a ponta encontra a faixa.
            for k in range(3):
                put(c, (20 + k) if side < 0 else (619 - k), j if 14 <= j < 80 else -1, RED[0] if k == 0 else RED[1])
        for j in range(8, 88):
            for i in range(6):
                x = i if side < 0 else 639 - i
                col = OL if i in (0, 5) else (IRON[4] if i == 1 else (IRON[3] if i < 4 else IRON[1]))
                if j in (8, 87):
                    col = OL
                put(c, x, j, col)
        for (x, y) in ((2, 6), (3, 6), (2, 89), (3, 89)):
            put(c, x if side < 0 else 639 - x, y, IRON[5])
    # Contorno das pontas.
    c.outline(OL)
    from abismo32_props import skull_big
    BIG = [(84, 76, 62), BONE[0], BONE[1], BONE[2], BONE[3], BONE[4]]
    skull_big(c, 36, 39, BIG)
    skull_big(c, 588, 39, BIG)
    return c


def room_node():
    frames = []
    for state in range(3):
        c = blank(32, 32)
        cx, cy = 15.5, 15.5
        for y in range(32):
            for x in range(32):
                d = math.hypot(x - cx, y - cy)
                if d > 14:
                    continue
                lit = -(x - cx) * 0.6 - (y - cy) * 0.8
                if d > 12.6:
                    col = OL
                elif d > 10:
                    if state == 1:
                        col = GOLD[2] if lit > 2 else (GOLD[1] if lit > -4 else GOLD[0])
                    else:
                        col = IRON[4] if lit > 2 else (IRON[3] if lit > -4 else IRON[2])
                else:
                    if state == 0:
                        col = IRON[1] if lit > -3 else IRON[0]
                        if d > 9 and lit < 0:
                            col = IRON[2]
                    elif state == 1:
                        col = GOLD[3] if lit > 0 else GOLD[2]
                        if d < 3.5:
                            col = (255, 138, 42) if d > 1.5 else (255, 200, 120)
                        if lit > 6 and d > 6:
                            col = GOLD[4]
                    else:
                        col = IRON[4] if lit > 0 else IRON[3]
                        if lit > 6 and d > 6:
                            col = IRON[5]
                put(c, x, y, col)
        if state == 2:
            # Visto: traço claro com sombra.
            pts = [(9, 16), (10, 17), (11, 18), (12, 19), (13, 20), (14, 19), (15, 18), (16, 17), (17, 16), (18, 15), (19, 14), (20, 13), (21, 12), (22, 11)]
            for (x, y) in pts:
                put(c, x, y, BONE[4])
                put(c, x, y + 1, BONE[3])
                put(c, x + 1, y + 2, IRON[2])
        if state == 1:
            put(c, 10, 9, (255, 252, 236))
            put(c, 11, 9, GOLD[4])
        frames.append(c.image())
    return sheet(frames)


def pieces():
    return {
        'ui/boss-banner': boss_banner,
        'ui/dungeon-frame': dungeon_frame,
        'ui/hp-frame': hp_frame,
        'ui/room-node': room_node,
    }
