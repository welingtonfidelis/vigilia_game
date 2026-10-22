"""Efeitos de combate em 32-bit: folhas de 5 quadros de 128×128 (o dobro dos 64×64 do
pack), na mesma ordem e com o centro no mesmo lugar. O corte e o impacto têm uma versão
por ato, na cor de ênfase dele.
"""
from __future__ import annotations

import math

from abismo32_base import ST, blank, hsh, mix, put
from lib32 import sheet

F = 128


def pal5(dark, mid, light, white=(250, 246, 234)):
    return [dark, mix(dark, mid, 0.5), mid, mix(mid, light, 0.5), light, white]


GENERIC = pal5((90, 96, 112), (170, 178, 196), (236, 238, 244))


def act_pal(act):
    st = ST[act]
    # Escuro do ato, ênfase e a ênfase clara (como o pack: base, cor e brilho).
    mids = {'I': (150, 96, 40), 'II': (156, 84, 44), 'III': (70, 176, 204), 'IV': (80, 206, 206), 'V': (242, 120, 30), 'VI': (214, 52, 128)}
    lights = {'I': (232, 170, 80), 'II': (240, 192, 96), 'III': (160, 234, 240), 'IV': (246, 244, 232), 'V': (255, 206, 110), 'VI': (246, 128, 186)}
    darks = {'I': st[10], 'II': st[10], 'III': st[10], 'IV': st[10], 'V': st[10], 'VI': st[10]}
    return pal5(darks[act], mids[act], lights[act])


# ── Corte ────────────────────────────────────────────────────────────────

SLASH = [  # (ângulo inicial, final, espessura máxima, faíscas)
    (184, 164, 4, 0),
    (184, 114, 9, 0),
    (184, 58, 15, 5),
    (166, 78, 6, 4),
    (126, 92, 3, 3),
]


def slash_frame(i, pal):
    c = blank(F, F)
    cx, cy, R = 72, 58, 54
    a0, a1, tmax, sparks = SLASH[i]
    n = int(abs(a0 - a1) * 4) + 1
    for k in range(n):
        t = k / max(1, n - 1)
        a = math.radians(a0 + (a1 - a0) * t)
        # Grossura: cheia no meio, afinando nas pontas (mais longa no rastro).
        th = max(1.0, tmax * math.sin(math.pi * (0.04 + 0.92 * t)) ** 0.9)
        for j in range(int(th * 2) + 1):
            rr = R - j * 0.5
            x = cx + rr * math.cos(a)
            y = cy + rr * math.sin(a)
            f = j / (th * 2)
            col = pal[5] if f < 0.1 else (pal[4] if f < 0.2 else (pal[3] if f < 0.3 else (pal[2] if f < 0.62 else (pal[1] if f < 0.8 else pal[0]))))
            if i >= 3 and f > 0.5:
                col = pal[1]
            put(c, x, y, col)
    # Riscos de velocidade por dentro do arco.
    if i in (1, 2):
        for k in range(2):
            a = math.radians(a0 + (a1 - a0) * (0.35 + k * 0.25))
            rr = R - tmax - 6 - k * 3
            for j in range(10):
                aa = a - math.radians(j * 1.2)
                put(c, cx + rr * math.cos(aa), cy + rr * math.sin(aa), pal[1] if j > 4 else pal[2])
    for k in range(sparks):
        x = 30 + int(hsh(k, i, 7) * 76)
        y = 22 + int(hsh(k, i, 8) * 12) - i * 2
        put(c, x, y, pal[4] if k % 2 else pal[2])
        if i == 2 and k % 2 == 0:
            put(c, x + 1, y, pal[1])
    return c.image()


# ── Impacto ──────────────────────────────────────────────────────────────

def impact_frame(i, pal):
    c = blank(F, F)
    cx, cy = 64, 64
    if i <= 1:
        r = 14 if i == 0 else 26
        for y in range(cy - r - 6, cy + r + 7):
            for x in range(cx - r - 6, cx + r + 7):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                ang = math.atan2(y - cy, x - cx)
                spike = r + 3 * max(0.0, math.cos(ang * 8)) ** 6 * (2 if i == 0 else 1)
                if d <= spike:
                    k = d / spike
                    col = pal[5] if k < 0.55 else (pal[4] if k < 0.8 else pal[3])
                    put(c, x, y, col)
        if i == 1:
            for k in range(10):
                a = k / 10 * 6.283 + 0.3
                for j in range(r + 4, r + 14):
                    put(c, cx + j * math.cos(a), cy + j * math.sin(a), pal[4] if j < r + 9 else pal[2])
            ring = r + 8
            for k in range(0, 360, 4):
                a = math.radians(k)
                if (k // 4) % 3:
                    put(c, cx + ring * math.cos(a), cy + ring * math.sin(a), pal[2])
    else:
        r = (40, 50, 60)[i - 2]
        dash = (3, 2, 1)[i - 2]
        for k in range(0, 720):
            a = math.radians(k / 2)
            on = (k // (6 * dash)) % 2 == 0 if i < 4 else (k % 8 < 2)
            if on:
                col = pal[3] if i == 2 else (pal[2] if i == 3 else pal[2])
                put(c, cx + r * math.cos(a), cy + r * math.sin(a) * (0.92 if i > 2 else 1), col)
        if i < 4:
            for k in range(10):
                a = k / 10 * 6.283 + 0.1 * i
                j0 = r - 8 if i == 2 else r - 4
                for j in range(j0, j0 + (12 if i == 2 else 8)):
                    put(c, cx + j * math.cos(a), cy + j * math.sin(a), pal[1] if j > j0 + 4 else pal[0])
        for k in range(8 if i > 2 else 5):
            a = hsh(k, i, 9) * 6.283
            j = r + 6 + hsh(k, i, 10) * 10
            x, y = cx + j * math.cos(a), cy + j * math.sin(a)
            for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1)):
                put(c, x + dx, y + dy, pal[0] if i == 4 else pal[1])
    return c.image()


# ── Veneno ───────────────────────────────────────────────────────────────

TOX = [(30, 50, 30), (58, 90, 58), (84, 118, 60), (112, 146, 84), (150, 182, 90), (196, 220, 130)]


def bubble(c, cx, cy, r, P=TOX):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r
            if d > 1:
                continue
            lit = -(x - cx) / r * 0.6 - (y - cy) / r * 0.7
            col = P[4] if lit > 0.45 else (P[3] if lit > 0 else (P[2] if lit > -0.4 else P[1]))
            if d > 0.85:
                col = P[1] if lit < 0.3 else P[2]
            put(c, x, y, col)
    if r >= 3:
        put(c, cx - r * 0.35, cy - r * 0.4, P[5])


def poison_frame(i):
    c = blank(F, F)
    # Poça que encolhe.
    if i < 3:
        rx = (40, 36, 28)[i]
        for y in range(112, 124):
            for x in range(64 - rx, 64 + rx + 1):
                dx, dy = (x - 64) / rx, (y - 118) / 5
                if dx * dx + dy * dy <= 1:
                    col = TOX[2] if dy < -0.2 else TOX[1]
                    if abs(dy) < 0.25 and abs(dx) < 0.5:
                        col = TOX[3]
                    put(c, x, y, col)
        put(c, 64, 113, TOX[4])
    rise = i * 14
    spread = 1 + i * 0.1
    groups = [(44, 98), (84, 92)]
    for g, (gx, gy) in enumerate(groups):
        n = 12 - i * 2
        for k in range(n):
            ox = (hsh(k, g, 11) - 0.5) * 26 * spread
            oy = (hsh(k, g, 12) - 0.5) * 16 - rise - hsh(k, g, 13) * i * 4
            r = 4 + hsh(k, g, 14) * 6 * (1 - i * 0.1)
            bubble(c, gx + ox, gy + oy, r)
    return c.image()


# ── Cura ─────────────────────────────────────────────────────────────────

HEAL = [(60, 140, 140), (122, 200, 192), (190, 240, 232), (250, 246, 234)]
HGOLD = [(150, 110, 40), (233, 192, 73), (255, 226, 140)]


def plus(c, x, y, s, P):
    for k in range(-s, s + 1):
        col = P[2] if abs(k) < s else P[1]
        put(c, x + k, y, col)
        put(c, x, y + k, col)
    put(c, x, y, P[3])


def heal_frame(i):
    c = blank(F, F)
    for k in range(9):
        x = 20 + int(hsh(k, 0, 21) * 90)
        y = 28 + int(hsh(k, 1, 21) * 86) - i * 4
        s = 3 + int(2 * abs(math.sin(i * 1.3 + k)))
        if hsh(k, i, 22) < 0.85:
            plus(c, x + (k % 3 - 1) * i, y, s, HEAL)
    rx = (14, 20, 26, 32, 0)[i]
    if rx:
        for k in range(0, 360, 2):
            a = math.radians(k)
            if i == 0 or (k // 2) % 2 == 0:
                x, y = 64 + rx * math.cos(a), 116 + rx * 0.3 * math.sin(a)
                put(c, x, y, HGOLD[1] if math.sin(a) < 0 else HGOLD[2])
                if i == 0:
                    put(c, x, y + 1, HGOLD[0])
    return c.image()


# ── Brasa ────────────────────────────────────────────────────────────────

EMB = [(96, 38, 40), (138, 58, 58), (200, 70, 40), (255, 138, 42), (233, 192, 73), (250, 246, 234)]


def ember_frame(i):
    c = blank(F, F)
    if i < 3:
        h = (22, 16, 8)[i]
        w = (40, 38, 34)[i]
        for y in range(122 - h, 123):
            t = (122 - y) / h
            for x in range(64 - w, 64 + w + 1):
                dx = abs(x - 64) / w
                top = 1 - dx ** 1.5
                n = math.sin(x * 0.9 + i) * 0.15 + math.sin(x * 0.37 + i * 2) * 0.12
                if t > top * (0.8 + n) * (1.4 if abs(x - 64) < 6 else 1):
                    continue
                col = EMB[4] if t < 0.25 else (EMB[3] if t < 0.6 else EMB[2])
                if y >= 121:
                    col = EMB[4]
                put(c, x, y, col)
    for k in range(18):
        x = 16 + int(hsh(k, 0, 31) * 96)
        y0 = 84 + int(hsh(k, 1, 31) * 34)
        y = y0 - i * (12 + hsh(k, 2, 31) * 10)
        if y < 16:
            continue
        stage = i + hsh(k, 3, 31) * 1.5
        col = EMB[5] if stage < 0.6 else (EMB[4] if stage < 1.6 else (EMB[3] if stage < 2.4 else (EMB[1] if stage < 3.4 else EMB[0])))
        put(c, x, y, col)
        if hsh(k, 4, 31) < 0.4:
            put(c, x + 1, y, col)
            put(c, x, y + 1, col)
            put(c, x + 1, y + 1, EMB[max(0, EMB.index(col) - 1)])
    return c.image()


# ── Vazio ────────────────────────────────────────────────────────────────

VOID = [(7, 6, 10), (48, 20, 70), (106, 42, 138), (130, 104, 150), (170, 150, 196)]


def void_frame(i):
    c = blank(F, F)
    cx, cy = (64, 58, 66, 64, 60)[i], (58, 66, 66, 60, 68)[i]
    R = (36, 24, 14, 22, 40)[i]
    rot = (0.0, 0.7, 1.4, 2.1, 2.8)[i]
    def r_of(a):
        return R * (0.62 + 0.38 * math.cos(3 * (a - rot)))
    for y in range(cy - R - 4, cy + R + 5):
        for x in range(cx - R - 4, cx + R + 5):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            a = math.atan2(dy, dx)
            rr = r_of(a)
            if abs(d - rr) < 1.1:
                put(c, x, y, VOID[3])
                if abs(d - rr) < 0.6 and (dx + dy) < -R * 0.5:
                    put(c, x, y, VOID[4])
            elif abs(d - rr * 0.62) < 0.8 and (int(math.degrees(a) + 360) // 9) % 2 == 0:
                put(c, x, y, VOID[2])
            elif d < rr - 2 and hsh(x, y, i + 40) < 0.03:
                put(c, x, y, VOID[2])
    if i in (2, 3):
        core = 7 if i == 2 else 5
        for y in range(cy - core, cy + core + 1):
            for x in range(cx - core, cx + core + 1):
                d = math.hypot(x - cx, y - cy)
                if d <= core:
                    put(c, x, y, VOID[0] if d < core * 0.55 else VOID[1])
        for (dx, dy) in ((0, -core - 1), (0, core + 1), (-core - 1, 0), (core + 1, 0)):
            put(c, cx + dx, cy + dy, VOID[0])
    return c.image()


# ── Água ─────────────────────────────────────────────────────────────────

WAT = [(30, 86, 86), (47, 122, 120), (84, 162, 156), (122, 200, 192), (190, 236, 228), (250, 246, 234)]


def water_frame(i):
    c = blank(F, F)
    # Coluna (dois primeiros quadros).
    if i < 2:
        top = (86, 72)[i]
        for y in range(top, 114):
            for x in range(58, 70):
                lx = x - 58
                col = WAT[4] if lx < 3 else (WAT[3] if lx < 8 else WAT[2])
                put(c, x, y, col)
        for x in range(59, 69):
            put(c, x, top - 1, WAT[5] if x < 64 else WAT[4])
        for x in range(62, 66):
            put(c, x, top - 2, WAT[5])
    # Gotas em arco.
    span = (10, 22, 34, 46, 56)[i]
    height = (12, 22, 30, 32, 30)[i]
    base_y = (100, 96, 96, 98, 100)[i]
    if i > 0:
        for k in range(12):
            t = k / 11
            x = 64 + (t - 0.5) * 2 * span
            y = base_y - height * (1 - (2 * t - 1) ** 2) - (8 if i == 1 else 0)
            put(c, x, y, WAT[4] if k % 2 else WAT[3])
            put(c, x, y + 1, WAT[2])
    else:
        for (dx, dy) in ((-8, 4), (8, 4), (-6, 0), (6, 0)):
            put(c, 64 + dx, 84 + dy, WAT[3])
    # Poça.
    rx = (12, 16, 22, 26, 30)[i]
    for y in range(112, 124):
        for x in range(64 - rx * 2, 64 + rx * 2 + 1):
            dx, dy = (x - 64) / (rx * 2), (y - 118) / (2 + i * 0.6)
            if dx * dx + dy * dy <= 1:
                if i < 4 and abs(dy) > 0.45 and abs(dx) < 0.9:
                    col = WAT[3] if dy < 0 else WAT[1]
                elif i < 4:
                    col = WAT[2] if abs(dy) < 0.45 else WAT[1]
                else:
                    col = WAT[1] if dy > -0.3 else WAT[2]
                put(c, x, y, col)
    for x in range(64 - 4, 64 + 5):
        put(c, x, 118, WAT[4])
    put(c, 64, 116, WAT[5])
    put(c, 64, 120, WAT[3])
    return c.image()


def pieces():
    reg = {
        'fx/slash': lambda: sheet([slash_frame(i, GENERIC) for i in range(5)]),
        'fx/impact': lambda: sheet([impact_frame(i, GENERIC) for i in range(5)]),
        'fx/poison': lambda: sheet([poison_frame(i) for i in range(5)]),
        'fx/heal': lambda: sheet([heal_frame(i) for i in range(5)]),
        'fx/ember': lambda: sheet([ember_frame(i) for i in range(5)]),
        'fx/void': lambda: sheet([void_frame(i) for i in range(5)]),
        'fx/water': lambda: sheet([water_frame(i) for i in range(5)]),
    }
    for act in ('I', 'II', 'III', 'IV', 'V', 'VI'):
        reg[f'fx/{act}/slash'] = (lambda a=act: sheet([slash_frame(i, act_pal(a)) for i in range(5)]))
        reg[f'fx/{act}/impact'] = (lambda a=act: sheet([impact_frame(i, act_pal(a)) for i in range(5)]))
    return reg
