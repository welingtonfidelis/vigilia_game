"""Objetos da arena em 32-bit: tocha e braseiro (animados), correntes, ossos, entulho,
estalagmite, coluna quebrada, raízes, cogumelo, altar, os objetos de cada ato, os portões
dos chefes e o círculo ritual (neutro, para tingir). O dobro de pixels da 16-bit, mesma
âncora (pé no meio de baixo; a teia pendura do alto) e o contorno OL só por fora.
"""
from __future__ import annotations

import math

from abismo32_base import (BONE, BONE_VI, CRATE, DL, FLAME, FLESH, FOAM, FUNGUS, GLASS_C, KELP, LAMP, LAVA,
                           OL, PALE, PIPE, RUST, SPORE, ST, VEIN, VIOLET, WOOD2, blank, bone_h, hsh, mul,
                           put, sphere, stepped, tnoise)
from lib32 import sheet

STONE_G = [(26, 28, 34), (38, 40, 48), (52, 56, 66), (70, 74, 86), (92, 98, 110), (118, 124, 136), (150, 156, 168)]
IRON_D = [(16, 16, 20), (28, 28, 34), (42, 44, 52), (60, 64, 74), (84, 88, 100), (112, 118, 130), (150, 156, 168)]


def box(c, x, y, w, h, R, base, top_hi=2, left_hi=1, right_lo=1, bottom_lo=1, tex=0.0, seed=0):
    """Bloco com chanfro aceso em cima/esquerda e sombra embaixo/direita."""
    n = len(R)
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            t = base
            if yy - y < top_hi:
                t = base + 2 if yy == y else base + 1
            elif xx - x < left_hi:
                t = base + 1
            elif x + w - 1 - xx < right_lo:
                t = base - 1
            elif y + h - 1 - yy < bottom_lo:
                t = base - 1
            elif tex and tnoise(xx, yy, seed, 3) > 1 - tex:
                t = base + (1 if hsh(xx, yy, seed) < 0.5 else -1)
            c.p(xx, yy, R[max(0, min(n - 1, t))])


def cyl_v(c, x, y, w, h, R, profile=None, seed=0, tex=0.12):
    """Cilindro em pé: tom por coluna (luz da esquerda)."""
    n = len(R)
    prof = profile or [min(n - 1, max(0, int(n * (0.85 - 0.75 * (i / max(1, w - 1)) ** 0.8)))) for i in range(w)]
    if not profile:
        prof[0] = max(0, prof[0] - 2)
    for yy in range(y, y + h):
        for i in range(w):
            t = prof[i]
            if tex and tnoise(x + i, yy, seed, 3) > 1 - tex:
                t = max(0, t - 1)
            c.p(x + i, yy, R[t])


def flame(c, cx, base_y, w, h, frame, seed=0, pal=FLAME):
    """Chama de pixel art em 4 tons: língua que balança por quadro, miolo claro."""
    sway = [0, 1, 0, -1][frame % 4]
    hh = h + [0, 2, -1, 1][frame % 4]
    for y in range(base_y - hh, base_y + 1):
        t = (base_y - y) / hh  # 0 embaixo, 1 na ponta
        half = w / 2 * (1 - t) ** 0.7 * (0.9 + 0.2 * math.sin(t * 6 + frame + seed))
        off = sway * t * 2 + math.sin(t * 5 + frame * 1.7 + seed) * t * 1.5
        for x in range(int(cx - half + off - 0.5), int(cx + half + off + 1.5)):
            d = abs(x - (cx + off)) / max(0.6, half)
            if d > 1.05:
                continue
            k = (1 - d) * (1 - t * 0.8)
            col = pal[1] if k < 0.25 else (pal[2] if k < 0.5 else (pal[3] if k < 0.75 else pal[4]))
            if t > 0.8:
                col = pal[1] if d > 0.4 else pal[2]
            put(c, x, y, col)
    # Fagulha solta.
    if frame % 2 == 0:
        put(c, cx + sway * 2 + (2 if frame == 0 else -2), base_y - hh - 3, pal[3])


def skull_big(c, x, y, R=BONE, k=1.0):
    """Caveira de frente 16×15 (x, y = canto de cima à esquerda), luz da esquerda."""
    R = [mul(v, k) for v in R]
    rows = [
        '....XXXXXXXX....',
        '..XXXXXXXXXXXX..',
        '.XXXXXXXXXXXXXX.',
        'XXXXXXXXXXXXXXXX',
        'XXXXXXXXXXXXXXXX',
        'XXEEEEXXXXEEEEXX',
        'XEEEEEEXXEEEEEEX',
        'XEEEEEEXXEEEEEEX',
        'XXEEEEXXXXEEEEXX',
        '.XXXXXXNNXXXXXX.',
        '..XXXXNNNNXXXX..',
        '..XXXXXXXXXXXX..',
        '...TXTXTXTXTX...',
        '...XXXXXXXXXX...',
        '....XXXXXXXX....',
    ]
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            if ch == 'E':
                col = (14, 10, 10) if not (i in (2, 10) and j == 6) else (40, 30, 28)
            elif ch == 'N':
                col = R[0]
            elif ch == 'T':
                col = R[1]
            else:
                t = i / 15
                col = R[5] if (t < 0.35 and j < 3) else (R[4] if t < 0.5 else (R[3] if t < 0.8 else R[2]))
                if j >= 11:
                    col = R[3] if i < 8 else R[2]
                if j == 4 and i in (6, 7, 8, 9):
                    col = R[3]
            c.p(x + i, y + j, col)


# ── Genéricos ────────────────────────────────────────────────────────────

def torch():
    frames = []
    for f in range(4):
        c = blank(32, 64)
        # Cabo de madeira com anel de ferro e ponteira.
        cyl_v(c, 12, 28, 8, 30, WOOD2[0:5], profile=[3, 4, 3, 2, 2, 2, 1, 0], seed=f)
        for y in (38, 50):
            for x in range(11, 21):
                c.p(x, y, IRON_D[4] if x < 16 else IRON_D[2])
        box(c, 11, 56, 10, 6, IRON_D, 2)
        # Cabeça: cesto de ferro batido em losango, a borda em brasa e o pano enrolado.
        CUP = [(40, 18, 14), (70, 30, 22), (104, 46, 32), (138, 64, 44)]
        for j in range(12):
            y = 18 + j
            hw = 13 - j * 0.85
            for x in range(int(16 - hw), int(16 + hw) + 1):
                lx = (x - (16 - hw)) / (2 * hw)
                col = CUP[3] if lx < 0.3 else (CUP[2] if lx < 0.65 else CUP[1])
                if j == 0:
                    col = LAVA[4] if (x + f) % 3 else LAVA[5]
                elif j == 1:
                    col = LAVA[2]
                elif j in (5, 6):
                    col = IRON_D[4] if lx < 0.5 else IRON_D[2]
                if j > 7 and lx > 0.7:
                    col = CUP[0]
                c.p(x, y, col)
        flame(c, 16, 17, 16, 15, f, seed=1)
        c.outline(OL)
        frames.append(c.image())
    return sheet(frames)


def brazier():
    frames = []
    for f in range(4):
        c = blank(64, 64)
        # Pé, haste e bacia de ferro.
        box(c, 16, 54, 34, 8, IRON_D, 3)
        cyl_v(c, 27, 36, 12, 18, IRON_D, profile=[2, 5, 5, 4, 4, 3, 3, 3, 2, 2, 1, 1])
        for j in range(16):
            y = 22 + j
            hw = 27 - j * 0.75
            for x in range(int(32 - hw), int(32 + hw) + 1):
                lx = (x - (32 - hw)) / (2 * hw)
                col = IRON_D[5] if lx < 0.18 else (IRON_D[4] if lx < 0.5 else (IRON_D[3] if lx < 0.8 else IRON_D[2]))
                if j in (0, 1):
                    col = IRON_D[5] if j == 0 else IRON_D[3]
                if j == 6:
                    col = IRON_D[1]
                if j == 7:
                    col = IRON_D[5] if lx < 0.5 else IRON_D[4]
                c.p(x, y, col)
        # Brasas na boca da bacia.
        for x in range(8, 57):
            r = hsh(x, f, 7)
            c.p(x, 21, LAVA[5] if r < 0.3 else (LAVA[4] if r < 0.7 else LAVA[3]))
            c.p(x, 20, LAVA[3] if r < 0.5 else (120, 36, 20))
        for k, (cx, w, h) in enumerate(((20, 12, 14), (32, 16, 20), (45, 12, 13))):
            flame(c, cx, 20, w, h + [0, 1, 2, 1][(f + k) % 4], (f + k) % 4, seed=k * 2)
        c.outline(OL)
        frames.append(c.image())
    return sheet(frames)


def chain():
    """Corrente de prisioneiro: elos grossos (de frente e de lado) presos numa chapa."""
    c = blank(64, 64)
    R = IRON_D
    y, k = 0, 0
    while y < 46:
        if k % 2 == 0:
            for dy in range(14):
                for dx in range(14):
                    edge = dx < 3 or dx > 10 or dy < 3 or dy > 10
                    if not edge or y + dy >= 50:
                        continue
                    col = R[5] if (dx < 2 or dy < 2) else (R[4] if dx < 7 else R[3])
                    if dx > 11 or dy > 11:
                        col = R[2]
                    c.p(25 + dx, y + dy, col)
            y += 11
        else:
            for dy in range(11):
                for dx in range(5):
                    if y + dy < 50:
                        c.p(30 + dx, y + dy, R[4] if dx < 2 else (R[3] if dx < 4 else R[2]))
            y += 8
        k += 1
    box(c, 18, 50, 28, 14, R, 3)
    for x in (21, 42):
        c.p(x, 54, R[6])
        c.p(x, 55, R[1])
    c.outline(OL)
    return c


def bones():
    c = blank(64, 32)
    # Costelas e ossos longos cruzados, a caveira por cima.
    for i in range(44):
        c.p(10 + i, 26 - i // 11, BONE[3] if i < 30 else BONE[2])
        c.p(10 + i, 27 - i // 11, BONE[1])
    for i in range(40):
        c.p(12 + i, 20 + i // 8, BONE[4] if i < 20 else BONE[3])
        c.p(12 + i, 21 + i // 8, BONE[2])
    for (x, y) in ((8, 25), (8, 28), (55, 21), (55, 23), (10, 19), (10, 22), (53, 24), (53, 27)):
        c.p(x, y, BONE[4])
        c.p(x + 1, y, BONE[3])
        c.p(x, y + 1, BONE[2])
    for k in range(4):
        for i in range(10):
            a = i / 10 * math.pi
            c.p(24 + k * 6 + int(4 * math.cos(a)), 30 - int(6 * math.sin(a)), BONE[3] if i < 5 else BONE[2])
    skull_big(c, 24, 3, BONE)
    # Mandíbula torta ao lado.
    for i in range(7):
        c.p(40 + i, 17 + (1 if i in (0, 6) else 0), BONE[3])
        c.p(40 + i, 18, BONE[1])
    c.outline(OL)
    return c


def rubble_pile(c, x0, x1, base, top, R, seed, n=14):
    """Monte de pedras quebradas: blocos de faces planas (luz de cima-esquerda)."""
    for k in range(n):
        cx = x0 + 4 + hsh(k, 0, seed) * (x1 - x0 - 8)
        rx = 4 + hsh(k, 1, seed) * 6
        ry = rx * (0.6 + 0.3 * hsh(k, 2, seed))
        cy = base - ry + 1 - (top * (1 - abs(cx - (x0 + x1) / 2) / ((x1 - x0) / 2))) * hsh(k, 3, seed)
        sk = (hsh(k, 4, seed) - 0.5) * 0.8
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                nx, ny = (x - cx) / rx, (y - cy) / ry
                if abs(nx) + abs(ny) * 1.15 + abs(nx + sk * ny) * 0.25 > 1.15 or y >= base + 1:
                    continue
                # Faces: topo (aceso), frente esquerda, frente direita (sombra).
                if ny < -0.35 + sk * nx * 0.5:
                    t = 5
                elif nx < -0.1:
                    t = 3
                else:
                    t = 2
                if hsh(int(x / 3), int(y / 3), seed + k) < 0.12:
                    t -= 1
                c.p(x, y, R[max(0, min(len(R) - 1, t))])


def rubble():
    c = blank(64, 32)
    rubble_pile(c, 4, 64, 31, 12, [mul(v, 0.8) for v in STONE_G], 11, n=18)
    c.outline(OL)
    return c


def stalagmite():
    c = blank(32, 64)
    for y in range(6, 64):
        t = (y - 6) / 58
        hw = 2 + 14 * t ** 0.8
        for x in range(int(16 - hw), int(16 + hw) + 1):
            lx = (x - (16 - hw)) / max(1, 2 * hw)
            tone = 5 if lx < 0.22 else (4 if lx < 0.5 else (3 if lx < 0.8 else 2))
            if (y + int(lx * 6)) % 11 == 0:
                tone -= 1  # anéis de depósito
            if (y + int(lx * 6)) % 11 == 1 and lx < 0.6:
                tone += 1
            c.p(x, y, STONE_G[max(0, min(6, tone))])
    c.p(15, 6, STONE_G[6])
    c.outline(OL)
    return c


def column_broken():
    c = blank(64, 128)
    R = STONE_G
    prof = [1, 5, 6, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1]
    x0 = 14
    for y in range(34, 112):
        for i, t in enumerate(prof):
            x = x0 + i
            # Topo quebrado em dentes.
            jag = 34 + int(10 * tnoise(i, 0, 21, 3)) + (6 if i in (10, 11, 12, 22, 23) else 0)
            if y < jag:
                continue
            col = R[t]
            if (y - 40) % 24 == 0:
                col = R[max(0, t - 2)]
            elif (y - 40) % 24 == 1:
                col = R[min(6, t + 1)]
            if y == jag:
                col = R[6] if i < 20 else R[4]
            c.p(x, y, col)
    # Rachadura descendo do topo.
    x = 30
    for y in range(44, 80):
        c.p(x, y, R[0])
        c.p(x + 1, y, R[5])
        if hsh(y, 0, 22) < 0.3:
            x += 1
    box(c, 6, 110, 52, 6, R, 4)
    box(c, 0, 116, 62, 10, R, 3)
    c.outline(OL)
    return c


def root_strand(c, x, y0, y1, R, seed, w=3, amp=6, branches=True):
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0)
        xx = x + amp * math.sin(t * 5 + seed) + 2 * math.sin(t * 13 + seed * 2)
        ww = max(2, int(w * (0.7 + 0.4 * t)))
        for i in range(ww):
            col = R[4] if i == 0 else (R[3] if i < ww * 0.4 else (R[2] if i < ww - 1 else R[0]))
            if (y + i * 2) % 9 == 0 and 0 < i < ww - 1:
                col = R[1]
            c.p(xx + i, y, col)
        if branches and hsh(y, 0, seed) < 0.06:
            side = 1 if hsh(y, 1, seed) < 0.5 else -1
            for j in range(1, 7):
                c.p(xx + (ww if side > 0 else -1) + side * j, y + j // 2, R[2] if j < 4 else R[1])


def roots():
    c = blank(96, 64)
    R = [(28, 18, 12), (44, 28, 18), (66, 44, 28), (92, 64, 40), (118, 86, 54)]
    for (x, s, w) in ((10, 1, 7), (40, 2, 6), (66, 3, 7), (78, 4, 5)):
        root_strand(c, x, 0, 62, R, s, w=w)
    c.outline(OL)
    return c


def mushroom():
    c = blank(64, 64)
    R = ST['III']
    # Caule claro.
    cyl_v(c, 22, 40, 14, 22, BONE_VI, profile=[1, 3, 4, 4, 3, 3, 3, 3, 2, 2, 2, 1, 1, 0])
    for x in range(20, 38):
        c.p(x, 61, BONE_VI[1])
    # Chapéu roxo pintado.
    for y in range(6, 44):
        for x in range(2, 63):
            dx = (x - 32) / 30
            top = 6 + 26 * (dx * dx) ** 1.2
            if y < top or abs(dx) > 1:
                continue
            if y > 38:
                if abs(dx) > 0.92:
                    continue
                col = R[3] if x % 3 else R[1]
                if y == 39:
                    col = R[6]
                if y == 41 and x % 4 == 0:
                    col = SPORE[3]
                c.p(x, y, col)
                continue
            lit = -dx * 0.7 - (y - 20) / 30 * 0.5
            col = VIOLET[4] if lit > 0.55 else (VIOLET[3] if lit > 0.15 else (VIOLET[2] if lit > -0.25 else VIOLET[1]))
            c.p(x, y, col)
    for (sx, sy) in ((18, 18), (30, 12), (44, 22), (24, 30), (52, 30), (36, 26)):
        c.p(sx, sy, (220, 210, 236))
        c.p(sx + 1, sy, VIOLET[4])
    # Filhote ao pé.
    for y in range(54, 62):
        for x in range(8, 16):
            c.p(x, y, VIOLET[3] if y < 57 else BONE_VI[2])
    c.outline(OL)
    return c


def altar():
    c = blank(128, 64)
    R = STONE_G
    box(c, 6, 48, 116, 15, R, 2, tex=0.1, seed=1)
    box(c, 16, 26, 96, 22, R, 3, tex=0.12, seed=2)
    for x in range(26, 104, 13):
        for y in range(30, 44):
            c.p(x, y, R[1])
            c.p(x + 1, y, R[5])
    box(c, 10, 18, 108, 8, R, 4)
    # Pano vermelho e as velas.
    box(c, 48, 4, 30, 14, [(60, 14, 20), (96, 22, 28), (140, 34, 38), (176, 54, 52), (210, 86, 76)], 2)
    for x in range(48, 78):
        c.p(x, 18, (60, 14, 20))
    for vx in (20, 104):
        for y in range(4, 18):
            c.p(vx, y, BONE[4])
            c.p(vx + 1, y, BONE[3])
            c.p(vx + 2, y, BONE[2])
        c.p(vx + 1, 3, (40, 30, 20))
        c.p(vx + 1, 2, FLAME[3])
        c.p(vx + 1, 1, FLAME[4])
        c.p(vx, 2, FLAME[2])
        c.p(vx + 1, 0, FLAME[2])
    c.outline(OL)
    return c


# ── Ato I ────────────────────────────────────────────────────────────────

def urn():
    c = blank(64, 64)
    U = [(52, 54, 44), (72, 76, 62), (96, 100, 82), (122, 126, 104), (150, 152, 128)]
    for y in range(4, 64):
        if y < 10:
            hw = 7 if y > 5 else 3
        elif y < 14:
            hw = 13
        elif y < 20:
            hw = 10
        else:
            hw = 10 + 12 * math.sin(min(1, (y - 20) / 40) * math.pi * 0.95)
            if y > 56:
                hw = 13
        for x in range(int(32 - hw), int(32 + hw) + 1):
            lx = (x - (32 - hw)) / max(1, 2 * hw)
            tone = 4 if lx < 0.2 else (3 if lx < 0.45 else (2 if lx < 0.75 else 1))
            if y in (13, 19):
                tone = 0
            col = U[tone]
            if y in (30, 31, 46, 47):
                col = RUST[3] if lx < 0.5 else RUST[2]
            if tnoise(x, y, 31, 4) > 0.82:
                col = U[max(0, tone - 1)]
            c.p(x, y, col)
    # Rachadura e lasca.
    x = 40
    for y in range(22, 44):
        c.p(x, y, U[0])
        if hsh(y, 0, 32) < 0.35:
            x += 1
    c.p(42, 24, OL)
    c.outline(OL)
    return c


def candle_i():
    c = blank(32, 32)
    for (x, h) in ((7, 14), (15, 22), (23, 11)):
        for y in range(32 - h, 30):
            c.p(x, y, BONE[4])
            c.p(x + 1, y, BONE[3])
            c.p(x + 2, y, BONE[2])
        c.p(x + 1, 31 - h, (40, 30, 20))
        flame(c, x + 1, 30 - h, 3, 5, x % 4)
        c.p(x - 1, 31 - h + 3, BONE[3])
        c.p(x - 1, 31 - h + 4, BONE[2])
    for x in range(4, 30):
        c.p(x, 30, BONE[2])
        c.p(x, 31, BONE[1])
    c.outline(OL)
    return c


def skull_pile():
    c = blank(64, 64)
    rows = [(4, 48, [0.85, 1.0, 0.9]), (12, 35, [1.0, 0.9]), (20, 22, [1.0])]
    for (x0, y0, tones) in rows:
        for i, k in enumerate(tones):
            skull_big(c, x0 + i * 18, y0, BONE, k)
    skull_big(c, 46, 49, BONE, 0.75)
    for (x, y) in ((2, 62),):
        bone_h(c, x, y, 10, BONE)
    c.outline(OL)
    return c


def web():
    c = blank(64, 64)
    T = [(120, 116, 100), (170, 164, 140), (210, 204, 180)]
    for k in range(7):
        a = k / 6 * math.pi / 2
        for r in range(0, 70):
            x, y = r * math.cos(a), r * math.sin(a)
            if x < 64 and y < 64 and hsh(r, k, 41) < 0.9:
                c.p(x, y, T[2] if r < 30 else T[1])
    for ring in range(8, 64, 8):
        for i in range(0, 60):
            a = i / 59 * math.pi / 2
            sag = 1 + 0.12 * math.sin(a * 12)
            x, y = ring * sag * math.cos(a), ring * sag * math.sin(a)
            if 0 <= x < 64 and 0 <= y < 64 and hsh(i, ring, 42) < 0.85:
                c.p(x, y, T[1] if ring < 40 else T[0])
    for x in range(64):
        c.p(x, 0, T[2])
    for y in range(64):
        c.p(0, y, T[2])
    return c


# ── Ato II ───────────────────────────────────────────────────────────────

def beam():
    c = blank(64, 128)
    for x0 in (4, 40):
        from abismo32_base import wood_beam
        wood_beam(c, x0, 18, 18, 110, WOOD2, base=3, vertical=True, seed=x0, rot=0.06)
        for y in (40, 80, 110):
            c.p(x0 + 8, y, PIPE[4])
    from abismo32_base import wood_beam
    wood_beam(c, 0, 4, 64, 16, WOOD2, base=3, seed=5, nails=[(6, 10), (56, 10)])
    for i in range(30):
        x, y = 22 + i * 18 // 30, 20 + i
        for k, col in enumerate((WOOD2[4], WOOD2[2], WOOD2[0])):
            c.p(x + k, y, col)
    c.outline(OL)
    return c


def rail():
    c = blank(128, 64)
    # Prancha com trilho e furos quadrados.
    for x in range(0, 128):
        for y in range(36, 52):
            ly = y - 36
            col = WOOD2[3] if ly > 3 else PIPE[3]
            if ly == 0:
                col = PIPE[5]
            elif ly in (1, 2):
                col = PIPE[3]
            elif ly == 3:
                col = PIPE[1]
            elif ly >= 13:
                col = WOOD2[1]
            elif ly == 4:
                col = WOOD2[5]
            c.p(x, y, col)
        for y in range(52, 58):
            c.p(x, y, PIPE[2] if y < 54 else PIPE[1])
    for hx in range(8, 128, 20):
        for y in range(41, 47):
            for x in range(hx, hx + 6):
                c.p(x, y, OL if (y in (41, 46) or x in (hx, hx + 5)) else WOOD2[0])
    # Vagonete.
    for y in range(22, 38):
        for x in range(70, 112):
            lx, ly = x - 70, y - 22
            hw = 21 - ly * 0.25
            if abs(x - 91) > hw:
                continue
            col = CRATE[3] if ly < 2 else (CRATE[2] if lx < 20 else CRATE[1])
            if (lx % 10) == 0:
                col = CRATE[0]
            c.p(x, y, col)
    for x in range(62, 70):
        for y in range(28, 38):
            c.p(x, y, CRATE[2] if y > 29 else CRATE[3])
    for wx in (80, 102):
        for dy in range(-5, 6):
            for dx in range(-5, 6):
                d = math.hypot(dx, dy)
                if d <= 5:
                    col = IRON_D[4] if d > 3.5 else (IRON_D[2] if d > 1.5 else IRON_D[5])
                    c.p(wx + dx, 38 + dy, col)
    c.outline(OL)
    return c


def drowned_lantern():
    c = blank(64, 64)
    for y in range(54, 62):
        hw = 26 - abs(y - 57) * 2
        for x in range(32 - hw, 32 + hw):
            c.p(x, y, PIPE[4] if y < 56 else (PIPE[2] if y < 59 else PIPE[1]))
    for x in (22, 42):
        c.p(x, 56, LAMP[2])
    box(c, 22, 12, 20, 6, WOOD2, 3)
    for y in range(4, 12):
        hw = (y - 4) // 2 + 1
        for x in range(32 - hw, 32 + hw):
            c.p(x, y, WOOD2[4] if x < 32 else WOOD2[2])
    for y in range(18, 50):
        for x in range(22, 42):
            lx = x - 22
            if lx < 3 or lx > 16:
                col = WOOD2[4] if lx < 2 else WOOD2[2]
            else:
                t = abs(lx - 9.5) / 7
                col = LAMP[4] if t < 0.3 else (LAMP[3] if t < 0.65 else GLASS_C[2])
                if (y - 18) % 10 == 0:
                    col = WOOD2[2]
            c.p(x, y, col)
    box(c, 20, 50, 24, 4, WOOD2, 3)
    c.outline(OL)
    return c


def pipe_prop():
    c = blank(128, 64)
    for x in range(0, 104):
        for j, t in enumerate((5, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 0)):
            col = WOOD2[t]
            if tnoise(x, j, 61, 5) > 0.8:
                col = RUST[2]
            c.p(x, 20 + j, col)
    for y in range(20, 58):
        for i, t in enumerate((5, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 0)):
            c.p(86 + i, y, WOOD2[t])
    for bx in (26, 58):
        for y in range(17, 35):
            for x in range(bx, bx + 6):
                c.p(x, y, GOLD_B[3] if x < bx + 2 else (GOLD_B[2] if x < bx + 4 else GOLD_B[1]))
    for x in range(80, 104):
        for y in range(56, 64):
            c.p(x, y, PIPE[4] if y == 56 else (PIPE[2] if x < 92 else PIPE[1]))
    c.p(92, 60, FOAM[4])
    for (x, y) in ((40, 34), (40, 38), (39, 37), (41, 37)):
        c.p(x, y, FOAM[3])
    c.outline(OL)
    return c


GOLD_B = [(90, 50, 20), (150, 92, 36), (196, 128, 56), (232, 170, 90)]


# ── Ato III ──────────────────────────────────────────────────────────────

def spore_pod():
    c = blank(64, 64)
    for y in range(36, 60):
        c.p(31, y, ST['III'][4])
        c.p(32, y, ST['III'][2])
    for x in range(22, 42):
        c.p(x, 60, ST['III'][5] if x < 32 else ST['III'][3])
        c.p(x, 61, ST['III'][2])
    sphere(c, 32, 24, 15, FUNGUS[1:7])
    for k in range(9):
        a = hsh(k, 0, 71) * 6.28
        r = 4 + hsh(k, 1, 71) * 9
        c.p(32 + r * math.cos(a), 24 + r * math.sin(a), SPORE[3])
    c.p(32, 8, FUNGUS[4])
    c.p(32, 7, FUNGUS[5])
    c.outline(OL)
    for (x, y) in ((14, 6), (50, 10), (54, 20), (10, 30)):
        c.p(x, y, SPORE[3])
        c.p(x + 1, y, SPORE[1])
    return c


def giant_mushroom():
    c = blank(64, 128)
    cyl_v(c, 24, 58, 16, 64, BONE_VI, profile=[1, 3, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 0])
    for x in range(20, 44):
        c.p(x, 122, VIOLET[3] if x < 32 else VIOLET[2])
        c.p(x, 123, VIOLET[1])
    for y in range(6, 62):
        for x in range(0, 64):
            dx = (x - 32) / 32
            if abs(dx) > 1:
                continue
            top = 54 - 48 * (1 - dx * dx) ** 0.55
            if y < top:
                continue
            if y > 54:
                col = VIOLET[1] if x % 3 else VIOLET[0]
                if y == 55:
                    col = VIOLET[3]
                if y == 57 and x % 5 == 2:
                    col = SPORE[3]
                if y > 57 and abs(dx) > 0.88:
                    continue
                c.p(x, y, col)
                continue
            lit = -dx * 0.7 - (y - 24) / 40 * 0.6
            col = VIOLET[4] if lit > 0.55 else (VIOLET[3] if lit > 0.15 else (VIOLET[2] if lit > -0.25 else VIOLET[1]))
            c.p(x, y, col)
    for (sx, sy) in ((16, 30), (28, 14), (42, 22), (36, 38), (50, 40), (22, 44)):
        c.p(sx, sy, (226, 214, 240))
        c.p(sx + 1, sy, VIOLET[4])
    c.outline(OL)
    return c


def glowing_pool():
    c = blank(128, 64)
    R = ST['III']
    for y in range(26, 63):
        for x in range(6, 124):
            dx, dy = (x - 64) / 58, (y - 44) / 17
            d = dx * dx + dy * dy
            if d > 1:
                continue
            if d > 0.62:
                col = R[3] if dy < 0 else R[1]
                if d > 0.62 and d < 0.7 and dy < 0:
                    col = R[5]
            else:
                k = 1 - d / 0.62
                col = SPORE[3] if k > 0.6 else (SPORE[2] if k > 0.25 else SPORE[1])
                if -0.4 < dx < 0.3 and abs(dy + 0.15) < 0.06:
                    col = SPORE[4]
            c.p(x, y, col)
    for (x, h) in ((14, 8), (20, 5), (108, 7), (114, 4), (64, 4)):
        for j in range(h):
            c.p(x, 34 - j, FUNGUS[3])
        c.p(x, 34 - h, FUNGUS[5])
    c.outline(OL)
    return c


def root_iii():
    c = blank(64, 64)
    R = [ST['III'][1], ST['III'][3], ST['III'][5], ST['III'][7], ST['III'][9]]
    for (x, s, w) in ((8, 5, 7), (26, 6, 6), (42, 7, 7)):
        root_strand(c, x, 0, 63, R, s, w=w, amp=5)
    c.outline(OL)
    for k in range(10):
        x = 8 + int(hsh(k, 0, 81) * 48)
        y = 4 + int(hsh(k, 1, 81) * 56)
        if c.g(x, y) and c.g(x, y) != OL:
            c.p(x, y, SPORE[3])
    return c


# ── Ato IV ───────────────────────────────────────────────────────────────

def coral():
    c = blank(64, 64)
    def branch(x, y, ang, L, depth):
        w = 2 + depth // 2
        for i in range(L):
            x += math.cos(ang)
            y += math.sin(ang)
            for k in range(w + 1):
                c.p(x + k, y, KELP[4] if k == 0 else (KELP[3] if k < w else KELP[1]))
        if depth == 0:
            for (dx, dy, col) in ((0, -1, (246, 226, 214)), (1, -1, (226, 190, 170)), (0, -2, (250, 240, 230)), (1, 0, (226, 190, 170))):
                c.p(x + dx, y + dy, col)
            return
        branch(x, y, ang - 0.5, int(L * 0.7), depth - 1)
        branch(x, y, ang + 0.5, int(L * 0.7), depth - 1)
    branch(32, 63, -math.pi / 2, 16, 3)
    c.outline(OL)
    return c


def pearl():
    c = blank(64, 64)
    T = [ST['IV'][3], ST['IV'][5], ST['IV'][7], ST['IV'][9], ST['IV'][11], ST['IV'][13]]
    # Concha de baixo (estrias) e de cima (domo aberto).
    for y in range(44, 62):
        for x in range(6, 60):
            dx, dy = (x - 32) / 26, (y - 44) / 18
            if dx * dx + dy * dy > 1:
                continue
            col = T[3] if (x % 5) else T[1]
            if y < 47:
                col = T[4]
            c.p(x, y, col)
    for y in range(12, 36):
        for x in range(10, 56):
            dx = (x - 33) / 23
            top = 12 + 20 * dx * dx
            if y < top or abs(dx) > 1:
                continue
            lit = -dx * 0.6 - (y - 20) / 20 * 0.5
            col = T[4] if lit > 0.4 else (T[3] if lit > 0 else T[2])
            if y > 32:
                col = T[0]
            c.p(x, y, col)
    sphere(c, 32, 40, 9, [PALE[1], PALE[2], PALE[3], PALE[4], (250, 250, 240)])
    c.outline(OL)
    return c


def statue_iv():
    c = blank(64, 128)
    T = [ST['IV'][4], ST['IV'][6], ST['IV'][8], ST['IV'][10], ST['IV'][12], ST['IV'][13]]
    box(c, 10, 100, 44, 28, [ST['IV'][3], ST['IV'][5], ST['IV'][7], ST['IV'][9], ST['IV'][11]], 2)
    for y in range(6, 100):
        t = (y - 6) / 94
        hw = 8 + 14 * t
        for x in range(int(32 - hw), int(32 + hw) + 1):
            lx = (x - (32 - hw)) / (2 * hw)
            tone = 4 if lx < 0.25 else (3 if lx < 0.5 else (2 if lx < 0.8 else 1))
            if y > 30 and (x - 32) % 7 == 0:
                tone -= 1
            col = T[max(0, tone)]
            if tnoise(x, y, 91, 4) > 0.84:
                col = T[max(0, tone - 1)]
            c.p(x, y, col)
    for (x, y) in ((27, 22), (35, 22)):
        for dy in range(3):
            c.p(x, y + dy, ST['IV'][1])
            c.p(x + 1, y + dy, ST['IV'][1])
    box(c, 46, 50, 10, 8, T, 2)
    for (x, y) in ((24, 60), (38, 76), (30, 90)):
        c.p(x, y, GLASS_C[3])
    c.outline(OL)
    return c


def broken_window():
    c = blank(64, 128)
    R = ST['IV']
    from abismo32_corredor_atos import stained_window
    stained_window(c, 33, 6, 54, 122, R, 97, broken=True, glass_mix=(0.34, 0.64), pale=True)
    # Sem goteiras nem brilho no objeto solto: limpa o que passou da moldura.
    for y in range(c.h):
        for x in range(c.w):
            if y > 123:
                c.px[y][x] = None
    c.outline(OL)
    return c


# ── Ato V ────────────────────────────────────────────────────────────────

def anvil():
    c = blank(64, 64)
    A = [(26, 22, 22), (40, 34, 34), (58, 52, 54), (80, 74, 78), (104, 98, 104), (136, 130, 136)]
    box(c, 6, 54, 50, 10, A, 2)
    for y in range(32, 54):
        hw = 12 + (y - 32) * 0.35 if y > 44 else 12
        for x in range(int(31 - hw), int(31 + hw)):
            lx = (x - (31 - hw)) / (2 * hw)
            c.p(x, y, A[3] if lx < 0.3 else (A[2] if lx < 0.75 else A[1]))
    for y in range(12, 32):
        ly = y - 12
        x0 = 2 + max(0, 10 - ly * 2) if ly < 8 else 8
        for x in range(x0, 60):
            col = A[4] if ly < 2 else (A[3] if x < 30 else A[2])
            if ly == 0:
                col = A[5]
            if ly > 16:
                col = A[1]
            c.p(x, y, col)
    for x in range(26, 44):
        c.p(x, 11, LAVA[5])
        c.p(x, 10, LAVA[6] if 30 < x < 40 else LAVA[4])
        if 32 < x < 38:
            c.p(x, 9, LAVA[4])
    c.outline(OL)
    return c


def lava_crack_prop():
    c = blank(128, 64)
    for y in range(32, 64):
        for x in range(2, 128):
            dx, dy = (x - 65) / 63, (y - 48) / 15
            d = dx * dx + dy * dy
            if d > 1:
                continue
            col = ST['V'][3] if dy < -0.3 else ST['V'][2]
            if d > 0.8:
                col = ST['V'][4] if dy < 0 else ST['V'][1]
            c.p(x, y, col)
    y = 48
    for x in range(10, 120):
        if hsh(x, 0, 101) < 0.35:
            y += 1 if hsh(x, 1, 101) < 0.5 else -1
            y = max(44, min(53, y))
        c.p(x, y, LAVA[6])
        c.p(x, y - 1, LAVA[4])
        c.p(x, y + 1, LAVA[3])
        c.p(x, y + 2, LAVA[1])
    c.outline(OL)
    return c


def heavy_chain():
    c = blank(64, 128)
    R = IRON_D
    y = 0
    k = 0
    while y < 110:
        if k % 2 == 0:
            for dy in range(18):
                for dx in range(18):
                    edge = dx < 4 or dx > 13 or dy < 4 or dy > 13
                    if not edge:
                        continue
                    col = R[5] if (dx < 2 or dy < 2) else (R[4] if dx < 9 else R[3])
                    if dx > 15 or dy > 15:
                        col = R[2]
                    c.p(23 + dx, y + dy, col)
            y += 14
        else:
            for dy in range(14):
                for dx in range(6):
                    c.p(29 + dx, y + dy, R[4] if dx < 2 else (R[3] if dx < 4 else R[2]))
            y += 10
        k += 1
    box(c, 14, 112, 36, 16, [ST['V'][2], ST['V'][3], ST['V'][4], ST['V'][5], ST['V'][6]], 2)
    c.p(22, 122, LAVA[5])
    c.outline(OL)
    return c


def slag():
    c = blank(64, 64)
    S = [ST['V'][1], ST['V'][2], ST['V'][3], ST['V'][4], ST['V'][5], ST['V'][6]]
    rubble_pile(c, 2, 64, 63, 26, S, 111, n=22)
    for k in range(14):
        x = 6 + int(hsh(k, 0, 112) * 54)
        y = 40 + int(hsh(k, 1, 112) * 22)
        if c.g(x, y):
            c.p(x, y, LAVA[5] if k % 3 else LAVA[6])
            c.p(x + 1, y, LAVA[3])
    c.outline(OL)
    return c


# ── Ato VI ───────────────────────────────────────────────────────────────

def vein_prop():
    c = blank(64, 128)
    x = 30
    for y in range(0, 128):
        x += (1 if hsh(y // 4, 0, 121) > 0.55 else (-1 if hsh(y // 4, 0, 121) < 0.4 else 0)) * (y % 4 == 0)
        x = max(22, min(40, x))
        for i in range(8):
            col = VEIN[3] if i < 2 else (VEIN[2] if i < 6 else VEIN[1])
            if (y // 6) % 2 == 0 and i == 1:
                col = VEIN[4]
            c.p(x + i, y, col)
        if y % 22 == 10:
            for j in range(10):
                c.p(x + 8 + j, y + j // 3, VEIN[2] if j < 6 else VEIN[1])
                if j < 4:
                    c.p(x + 8 + j, y + j // 3 - 1, VEIN[3])
    c.outline(OL)
    return c


def eye_prop():
    c = blank(64, 64)
    from abismo32_corredor_atos import eye
    for (x0, y0, x1, y1) in ((2, 26, 14, 36), (50, 42, 62, 52), (8, 50, 18, 62), (48, 22, 58, 30)):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n):
            c.p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, VEIN[2])
    eye(c, 32, 40, rx=24, ry=12, veins=False)
    c.outline(OL)
    return c


def floating_shard():
    c = blank(64, 64)
    pts = [(34, 2), (50, 24), (40, 52), (18, 34)]
    c.poly(pts, VIOLET[0])
    for y in range(64):
        for x in range(64):
            if c.g(x, y):
                c.p(x, y, VIOLET[1] if x < 32 else VIOLET[0])
    for i in range(32):
        t = i / 31
        c.p(34 - 16 * t, 2 + 32 * t, FLESH[5])
        c.p(34 - 16 * t + 1, 2 + 32 * t, FLESH[3])
    for i in range(20):
        c.p(18 + 22 * i / 20, 34 + 18 * i / 20, VIOLET[2])
    c.outline(OL)
    for (x, y) in ((24, 58), (40, 60), (32, 62)):
        c.p(x, y, FLESH[5])
        c.p(x + 1, y, FLESH[3])
    return c


def bone_pedestal():
    c = blank(64, 64)
    B = BONE_VI
    box(c, 10, 52, 44, 12, [VEIN[0], VEIN[1], VEIN[2], VEIN[3], VEIN[4]], 2)
    for y in range(52, 54):
        for x in range(10, 54):
            c.p(x, y, B[3])
    cyl_v(c, 22, 30, 20, 22, B, profile=[1, 3, 4, 4, 4, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 0])
    box(c, 14, 20, 36, 10, B, 2)
    for (x, h) in ((12, 14), (48, 14)):
        for y in range(20 - h, 20):
            c.p(x, y, B[3])
            c.p(x + 2, y, B[1])
            c.p(x + 1, y, B[2])
    sphere(c, 32, 12, 7, FLESH[2:7])
    c.outline(OL)
    return c


# ── Portões dos chefes (192×192, base em y 191) ─────────────────────────

def gate_I():
    c = blank(192, 192)
    R = ST['I']
    cx, top, w = 96, 8, 142
    r = w / 2
    for y in range(top, 192):
        for x in range(int(cx - r), int(cx + r) + 1):
            dx = x + 0.5 - cx
            d = math.hypot(dx, y + 0.5 - (top + r)) if y + 0.5 < top + r else abs(dx)
            if d > r:
                continue
            inner = d <= r - 22 and y > top + 24
            if inner:
                # Porta de ferro cravejada.
                t = (y - top) / 184
                col = stepped([R[1], R[2], R[3]], 0.35 + 0.3 * t, x, y)
                if (x - 34) % 12 == 0 and (y - 44) % 14 == 0:
                    col = R[8]
                elif (x - 34) % 12 == 1 and (y - 44) % 14 == 1:
                    col = R[1]
                if (x - cx) % 24 == 0:
                    col = R[2]
            else:
                ang = math.atan2(y + 0.5 - (top + r), dx) if y + 0.5 < top + r else 0
                seg = int((ang + math.pi) / (math.pi / 10))
                tone = 5 if seg % 2 else 4
                if d > r - 2:
                    tone = 3
                elif d < r - 20:
                    tone = 7
                elif dx < 0 and y < top + r:
                    tone += 1
                col = R[tone]
                if tnoise(x, y, 131, 4) > 0.8:
                    col = R[tone - 1]
            c.p(x, y, col)
    for (sx, sy) in ((36, 66), (156, 66), (36, 114), (156, 114)):
        skull_big(c, sx - 8, sy - 7, BONE)
    # Emblema de ferrugem no alto.
    for dy in range(-10, 11):
        for dx in range(-10, 11):
            d = math.hypot(dx, dy)
            if 6 <= d <= 9 or d < 2.5 or (d < 10 and (abs(dx) < 1 or abs(dy) < 1) and d > 8):
                col = RUST[3] if dx + dy < 0 else RUST[1]
                if d < 2.5:
                    col = FLAME[3]
                c.p(96 + dx, 18 + dy, col)
    c.outline(OL)
    return c


def gate_II():
    c = blank(192, 192)
    R = ST['II']
    from abismo32_base import wood_beam
    for y in range(26, 192):
        for x in range(38, 156):
            ly = (y - 26) % 20
            col = R[3] if ly > 1 else WOOD2[4] if ly == 0 else WOOD2[2]
            if y > 160:
                col = stepped([R[5], R[6], R[8]], 0.4 + 0.3 * math.sin(y * 0.8), x, y)
                if (y - 160) % 6 == 0:
                    col = FOAM[2]
            c.p(x, y, col)
    wood_beam(c, 26, 18, 140, 12, WOOD2, base=3, seed=141)
    wood_beam(c, 26, 18, 12, 174, WOOD2, base=3, vertical=True, seed=142)
    wood_beam(c, 154, 18, 12, 174, WOOD2, base=3, vertical=True, seed=143)
    # Roda do registro.
    cx, cy = 96, 92
    for dy in range(-30, 31):
        for dx in range(-30, 31):
            d = math.hypot(dx, dy)
            ang = math.atan2(dy, dx)
            on = 22 <= d <= 27 or d < 6 or (d < 23 and min(abs((ang % (math.pi / 3)) - math.pi / 6) * d, 99) < 0) \
                or (d < 23 and abs(math.sin(ang * 3)) * d < 1.6)
            if 27 < d <= 30 and abs(math.sin(ang * 4)) < 0.15:
                on = True
            if on:
                lit = -dx - dy
                col = RUST[4] if lit > 12 else (RUST[3] if lit > -4 else (RUST[2] if lit > -20 else RUST[1]))
                c.p(cx + dx, cy + dy, col)
    c.outline(OL)
    return c


def gate_III():
    c = blank(192, 192)
    R = ST['III']
    # Arco de micélio retorcido.
    for i in range(400):
        t = i / 399
        ang = math.pi * (1 - t)
        x = 96 + 74 * math.cos(ang)
        y = 120 - 100 * math.sin(ang)
        th = 9 + 2 * math.sin(t * 40)
        for k in range(int(-th / 2), int(th / 2) + 1):
            nx, ny = math.cos(ang), -math.sin(ang)
            px, py = x + nx * k, y + ny * k
            band = (i // 6) % 2
            col = R[5] if k < -th / 4 else (R[4] if k < th / 4 else R[2])
            if band:
                col = R[max(0, R.index(col) - 1)]
            c.p(px, py, col)
    for x0 in (14, 162):
        for y in range(120, 188):
            for i in range(16):
                col = R[5] if i < 4 else (R[4] if i < 11 else R[2])
                if (y // 6) % 2:
                    col = R[max(0, R.index(col) - 1)]
                c.p(x0 + i, y, col)
    for (px, py) in ((40, 40), (152, 40), (24, 92), (168, 92)):
        for y in range(py - 16, py + 17):
            for x in range(px - 11, px + 12):
                dx, dy = (x - px) / 11, (y - py) / 16
                if dx * dx + dy * dy <= 1:
                    lit = -dx * 0.6 - dy * 0.7
                    col = FUNGUS[5] if lit > 0.5 else (FUNGUS[4] if lit > 0 else (FUNGUS[3] if lit > -0.4 else FUNGUS[2]))
                    if abs(dx) < 0.12:
                        col = FUNGUS[2]
                    c.p(x, y, col)
        c.p(px, py, SPORE[4])
        c.p(px, py - 16, FUNGUS[6])
    c.outline(OL)
    return c


def gate_IV():
    c = blank(192, 192)
    R = ST['IV']
    for y in range(64, 192):
        for x in range(18, 174):
            col = R[5] if x < 22 else (R[4] if x < 170 else R[3])
            if y == 64:
                col = R[8]
            if tnoise(x, y, 151, 6) > 0.82:
                col = R[3]
            c.p(x, y, col)
    from abismo32_corredor_atos import stained_window
    stained_window(c, 96, 8, 100, 118, R, 152, glass_mix=(0.2, 0.32))
    box(c, 40, 130, 112, 62, [R[3], R[5], R[6], R[7], R[9]], 2)
    for x in range(40, 152):
        c.p(x, 130, R[10])
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            if abs(dx) + abs(dy) <= 6 and (abs(dx) < 2 or abs(dy) < 2 or abs(dx) == abs(dy)):
                c.p(96 + dx, 122 + dy, PALE[4] if abs(dx) + abs(dy) < 4 else PALE[3])
    c.outline(OL)
    return c


def gate_V():
    c = blank(192, 192)
    R = ST['V']
    A = [R[4], R[6], R[8], R[9], R[10], R[12]]
    # Fornalha alta.
    box(c, 54, 0, 84, 70, A, 1)
    for y in range(8, 64):
        for x in range(66, 126):
            col = R[1]
            if (y - 8) % 6 in (2, 3):
                col = LAVA[4] if (x + y) % 9 else LAVA[5]
                if (y - 8) % 6 == 3:
                    col = LAVA[3]
            c.p(x, y, col)
    for x in range(54, 138):
        c.p(x, 70, R[1])
    # Mesa da forja com rebites em brasa.
    box(c, 14, 86, 164, 26, A, 2)
    for x in range(20, 172, 10):
        c.p(x, 84, LAVA[4])
        c.p(x, 85, LAVA[2])
    box(c, 54, 112, 84, 44, A, 1)
    box(c, 38, 156, 116, 36, A, 2)
    c.outline(OL)
    return c


def gate_VI():
    c = blank(192, 192)
    R = ST['VI']
    cx, cy = 98, 104
    for y in range(20, 176):
        for x in range(18, 182):
            dx, dy = (x - cx) / 76, (y - cy) / 72
            lobes = min(((x - cx + 34) / 46) ** 2 + ((y - cy + 26) / 46) ** 2, ((x - cx - 34) / 46) ** 2 + ((y - cy + 26) / 46) ** 2)
            body = dx * dx + (dy * 1.05) ** 2
            if body > 1 and lobes > 1:
                continue
            lit = -dx * 0.5 - dy * 0.6
            tone = 6 if lit > 0.4 else (5 if lit > 0 else (4 if lit > -0.4 else 3))
            if (x - cx) * 0.9 + (y - cy) > 40 and (x - cx) * 0.9 + (y - cy) < 70:
                tone = max(2, tone - 1)
            if (x - cx) - (y - cy) * 0.7 > 30:
                tone = min(8, tone + 2)
            col = R[tone]
            hole = ((x - cx) / 24) ** 2 + ((y - cy - 6) / 32) ** 2
            if hole < 1:
                col = R[0] if hole < 0.75 else R[1]
            c.p(x, y, col)
    for side in (-1, 1):
        for i in range(44):
            x = cx + side * (22 + i * 0.95)
            y = 44 - i * 0.85
            for k, col in enumerate((VEIN[4], VEIN[3], VEIN[1])):
                c.p(x, y + k, col)
    for y in range(168, 192):
        for i in range(7):
            c.p(cx - 3 + i, y, VEIN[4] if i < 2 else (VEIN[3] if i < 5 else VEIN[1]))
    for k in range(14):
        a = k / 14 * 6.28
        c.p(cx + 78 * math.cos(a), cy + 70 * math.sin(a), VEIN[2])
    c.outline(OL)
    return c


def ritual_circle():
    """Círculo ritual (paleta neutra DL, o jogo tinge): anel pontilhado, runas e pontas."""
    c = blank(320, 32)
    cx, cy, rx, ry = 160, 16, 150, 12
    for i in range(0, 720):
        a = i / 720 * 6.283
        x, y = cx + rx * math.cos(a), cy + ry * math.sin(a)
        if (i // 6) % 2 == 0:
            c.p(x, y, DL[12] if y < cy else DL[10])
        x2, y2 = cx + (rx - 14) * math.cos(a), cy + (ry - 4) * math.sin(a)
        if (i // 3) % 4 == 0:
            c.p(x2, y2, DL[8])
    for k in range(22):
        a = k / 22 * 6.283
        x, y = cx + (rx - 34) * math.cos(a), cy + (ry - 6) * math.sin(a)
        L = 6 + int(hsh(k, 0, 161) * 10)
        for i in range(L):
            c.p(x + i - L // 2, y, DL[5] if i % 4 else DL[7])
    for side in (-1, 1):
        for i in range(14):
            x = cx + side * (rx + 2 + i * 0.6)
            for dy in (-3 + i // 5, 3 - i // 5):
                c.p(x, cy + dy, DL[11])
        c.p(cx + side * (rx + 10), cy, DL[12])
    return c


def pieces():
    reg = {
        'prop/arena/torch': torch,
        'prop/arena/brazier': brazier,
        'prop/arena/chain': chain,
        'prop/arena/bones': bones,
        'prop/arena/rubble': rubble,
        'prop/arena/stalagmite': stalagmite,
        'prop/arena/column-broken': column_broken,
        'prop/arena/roots': roots,
        'prop/arena/mushroom': mushroom,
        'prop/arena/altar': altar,
        'prop/arena/I/urn': urn,
        'prop/arena/I/candle': candle_i,
        'prop/arena/I/skull-pile': skull_pile,
        'prop/arena/I/web': web,
        'prop/arena/II/beam': beam,
        'prop/arena/II/rail': rail,
        'prop/arena/II/drowned-lantern': drowned_lantern,
        'prop/arena/II/pipe': pipe_prop,
        'prop/arena/III/spore-pod': spore_pod,
        'prop/arena/III/giant-mushroom': giant_mushroom,
        'prop/arena/III/glowing-pool': glowing_pool,
        'prop/arena/III/root': root_iii,
        'prop/arena/IV/coral': coral,
        'prop/arena/IV/pearl': pearl,
        'prop/arena/IV/statue': statue_iv,
        'prop/arena/IV/broken-window': broken_window,
        'prop/arena/V/anvil': anvil,
        'prop/arena/V/lava-crack': lava_crack_prop,
        'prop/arena/V/heavy-chain': heavy_chain,
        'prop/arena/V/slag': slag,
        'prop/arena/VI/vein': vein_prop,
        'prop/arena/VI/eye': eye_prop,
        'prop/arena/VI/floating-shard': floating_shard,
        'prop/arena/VI/bone-pedestal': bone_pedestal,
        'prop/arena/I/boss-gate': gate_I,
        'prop/arena/II/boss-gate': gate_II,
        'prop/arena/III/boss-gate': gate_III,
        'prop/arena/IV/boss-gate': gate_IV,
        'prop/arena/V/boss-gate': gate_V,
        'prop/arena/VI/boss-gate': gate_VI,
        'decal/arena/ritual-circle': ritual_circle,
    }
    return reg
