"""Chão da vila em 32-bit: o tileset do terreno (256×256, tiles de 32 nos MESMOS lugares da
grade de 8×8 da 16-bit), a grama de outono e as cercas (cemitério e madeira, 8 quadros).

Regras do chão:
  · toda textura é periódica em 32 px (o ruído grosso repete na borda do tile), então os
    tiles de grama emendam entre si sem costura em qualquer ordem — e também espelhados,
    como o jogo faz;
  · as bordas de terra, trilha e água dos 9 pedaços têm o mesmo recuo (10 px) em toda
    quina de tile, com a onda da borda indo a zero ali, para os pedaços emendarem;
  · detalhe solto (folha de capim, pedrinha, flor) nunca cruza a borda do tile.
"""
from __future__ import annotations

import math

from vila32_base import (
    IRON, K, OL, STEEL, WOODV, hsh, mix, mul, quant, rock, rock_shape, wood_px,
)

T = 32

# Rampas do chão, perto dos tons da 16-bit (escuro → claro).
GR = [(40, 62, 40), (52, 80, 50), (62, 94, 54), (74, 106, 58), (84, 116, 64), (96, 130, 74), (118, 152, 88)]
DT = [(42, 30, 22), (64, 44, 30), (82, 57, 38), (96, 67, 40), (106, 74, 42), (120, 85, 50), (138, 98, 58)]
TR = [(84, 60, 40), (106, 74, 42), (122, 87, 50), (134, 96, 56), (142, 103, 60), (154, 116, 68), (170, 132, 82)]
WT = [(26, 74, 78), (36, 96, 98), (47, 122, 120), (60, 138, 134), (92, 172, 164), (138, 210, 200), (200, 240, 232)]
GRAY = [(42, 42, 48), (62, 64, 74), (78, 82, 92), (94, 100, 108), (106, 112, 120), (128, 136, 144), (154, 163, 171), (180, 188, 194)]
CLIFF = [(34, 24, 18), (56, 40, 28), (78, 55, 37), (98, 69, 44), (120, 86, 54), (142, 104, 64), (164, 124, 80)]
VOID = [(7, 6, 10), (11, 9, 16), (16, 12, 24), (22, 16, 34)]
AUT = [(110, 78, 34), (128, 92, 40), (142, 104, 46), (150, 112, 52), (162, 122, 58), (178, 138, 68), (200, 160, 80)]


def pnoise(x: float, y: float, seed: int, scale: int, period: int = T) -> float:
    """Ruído de valor suave e periódico (repete a cada `period` px nos dois eixos)."""
    n = period // scale
    xi, yi = math.floor(x / scale), math.floor(y / scale)
    fx, fy = x / scale - xi, y / scale - yi
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    h = lambda a, b: hsh(a % n, b % n, seed)
    a = h(xi, yi) * (1 - sx) + h(xi + 1, yi) * sx
    b = h(xi, yi + 1) * (1 - sx) + h(xi + 1, yi + 1) * sx
    return a * (1 - sy) + b * sy


def field(u: int, v: int, seed: int) -> float:
    """Variação grossa de tom, igual em todo tile do mesmo material (−0.5..0.5)."""
    return pnoise(u, v, seed, 16) * 0.6 + pnoise(u, v, seed + 1, 8) * 0.4 - 0.5


# ── Texturas por material (u, v = posição dentro do tile; k = semente do tile) ──

def grass_base(u: int, v: int) -> tuple:
    t = 0.5 + field(u, v, 11) * 0.2 + (pnoise(u, v, 12, 4) - 0.5) * 0.22
    return quant(t, GR[2:5], u, v, 0.55)


def blades(c: K, ox: int, oy: int, seed: int, n: int, pal=GR, inside=None) -> None:
    """Tufinhos de capim (três folhas em leque), base escura e ponta clara, inteiros dentro
    do tile; e pintas soltas claras e escuras."""
    for i in range(n):
        x = 2 + int(hsh(i, seed, 1) * 28)
        y = 4 + int(hsh(i, seed, 2) * 26)
        if inside and not (inside(x, y) and inside(x - 1, y - 3) and inside(x + 1, y - 3)):
            continue
        h = 2 + int(hsh(i, seed, 3) * 2)
        c.p(ox + x, oy + y, pal[1])
        c.p(ox + x - 1, oy + y, pal[2])
        for j in range(1, h + 1):
            c.p(ox + x, oy + y - j, pal[4] if j < h else pal[5])
        if hsh(i, seed, 4) < 0.7:
            c.p(ox + x - 1, oy + y - 1, pal[3])
            c.p(ox + x - 1, oy + y - 2, pal[5])
        if hsh(i, seed, 5) < 0.6:
            c.p(ox + x + 1, oy + y - 1, pal[3])
            if h > 2:
                c.p(ox + x + 1, oy + y - 2, pal[4])
    for i in range(n):
        x, y = int(hsh(i, seed, 6) * 32), int(hsh(i, seed, 7) * 32)
        if inside is None or inside(x, y):
            c.p(ox + x, oy + y, pal[5] if i % 3 == 0 else pal[4])


def grass_tile(c: K, ox: int, oy: int, seed: int, n: int = 9, inside=None) -> None:
    for v in range(T):
        for u in range(T):
            if inside is None or inside(u, v):
                c.p(ox + u, oy + v, grass_base(u, v))
    # Pontinhos escuros (terra entre o capim).
    for i in range(10):
        x, y = int(hsh(i, seed, 7) * 32), int(hsh(i, seed, 8) * 32)
        if inside is None or inside(x, y):
            c.p(ox + x, oy + y, GR[1])
    blades(c, ox, oy, seed, n, inside=inside)


def dirt_base(u: int, v: int, pal=DT, seed: int = 21) -> tuple:
    t = 0.55 + field(u, v, seed) * 0.16 + (pnoise(u, v, seed + 2, 4) - 0.5) * 0.3
    return quant(t, pal[2:6], u, v, 0.3)


def clods(c: K, ox: int, oy: int, seed: int, n: int, pal=DT, inside=None) -> None:
    """Torrões: bolinhas de 2–3 px com a quina de cima-esquerda clara e a sombra embaixo."""
    for i in range(n):
        x, y = 2 + int(hsh(i, seed, 41) * 27), 2 + int(hsh(i, seed, 42) * 27)
        if inside and not (inside(x, y) and inside(x + 2, y + 2)):
            continue
        big = hsh(i, seed, 43) < 0.4
        c.p(ox + x, oy + y, pal[6])
        c.p(ox + x + 1, oy + y, pal[5])
        c.p(ox + x, oy + y + 1, pal[5])
        c.p(ox + x + 1, oy + y + 1, pal[3])
        if big:
            c.p(ox + x + 2, oy + y + 1, pal[3])
            c.p(ox + x + 1, oy + y + 2, pal[2])
            c.p(ox + x + 2, oy + y + 2, pal[1])
        else:
            c.p(ox + x + 1, oy + y + 2, pal[2])
            c.p(ox + x + 2, oy + y + 1, pal[2])


def pebbles(c: K, ox: int, oy: int, seed: int, n: int, light, mid, dark, inside=None, big: float = 0.3) -> None:
    for i in range(n):
        x = 2 + int(hsh(i, seed, 11) * 27)
        y = 2 + int(hsh(i, seed, 12) * 27)
        if inside and not (inside(x, y) and inside(x + 2, y + 2) and inside(x - 1, y - 1)):
            continue
        w = 2 + (1 if hsh(i, seed, 13) < big else 0)
        c.p(ox + x, oy + y, light)
        c.p(ox + x + 1, oy + y, mid if w == 2 else light)
        if w == 3:
            c.p(ox + x + 2, oy + y, mid)
            c.p(ox + x, oy + y + 1, mid)
            c.p(ox + x + 1, oy + y + 1, mid)
            c.p(ox + x + 2, oy + y + 1, dark)
            c.p(ox + x + 1, oy + y + 2, dark)
        else:
            c.p(ox + x + 1, oy + y + 1, dark)


def dirt_tile(c: K, ox: int, oy: int, seed: int, inside=None) -> None:
    for v in range(T):
        for u in range(T):
            if inside is None or inside(u, v):
                c.p(ox + u, oy + v, dirt_base(u, v))
    clods(c, ox, oy, seed + 5, 6, DT, inside)
    pebbles(c, ox, oy, seed, 4, DT[6], DT[5], DT[1], inside)
    for i in range(6):
        x, y = 1 + int(hsh(i, seed, 21) * 30), 1 + int(hsh(i, seed, 22) * 30)
        if inside is None or inside(x, y):
            c.p(ox + x, oy + y, DT[2])


def trail_tile(c: K, ox: int, oy: int, seed: int, inside=None) -> None:
    for v in range(T):
        for u in range(T):
            if inside is None or inside(u, v):
                c.p(ox + u, oy + v, dirt_base(u, v, TR, 31))
    clods(c, ox, oy, seed + 5, 5, TR, inside)
    pebbles(c, ox, oy, seed, 3, GRAY[5], GRAY[3], TR[1], inside, big=0.5)
    pebbles(c, ox, oy, seed + 50, 4, TR[6], TR[5], TR[1], inside)
    for i in range(5):
        x, y = 1 + int(hsh(i, seed, 23) * 30), 1 + int(hsh(i, seed, 24) * 30)
        if inside is None or inside(x, y):
            c.p(ox + x, oy + y, (176, 136, 70))


def water_px(u: int, v: int) -> tuple:
    t = 0.42 + field(u, v, 41) * 0.2
    return quant(t, WT[1:5], u, v, 0.7)


def ripples(c: K, ox: int, oy: int, seed: int, n: int, inside=None) -> None:
    """Reflexos: traço claro com a sombra da marola embaixo."""
    for i in range(n):
        L = 3 + int(hsh(i, seed, 31) * 5)
        x = 2 + int(hsh(i, seed, 32) * (28 - L))
        y = 3 + int(hsh(i, seed, 33) * 26)
        if inside and not (inside(x, y) and inside(x + L, y + 1)):
            continue
        for j in range(L):
            c.p(ox + x + j, oy + y, WT[5] if 0 < j < L - 1 else WT[4])
            c.p(ox + x + j + 1, oy + y + 1, WT[1])
        if hsh(i, seed, 34) < 0.4:
            c.p(ox + x + 1, oy + y, WT[6])


def water_tile(c: K, ox: int, oy: int, seed: int, inside=None) -> None:
    for v in range(T):
        for u in range(T):
            if inside is None or inside(u, v):
                c.p(ox + u, oy + v, water_px(u, v))
    ripples(c, ox, oy, seed, 5, inside)


# ── Bordas dos 9 pedaços ──────────────────────────────────────────────────

def wave(u: float, seed: int, amp: float = 2.2) -> float:
    """Onda da borda: série de senos que vai a zero nas duas quinas do tile (as ondas
    curtas fazem os dentes da beira, como os torrões da 16-bit)."""
    v = sum(amp * (hsh(k, seed, 61) - 0.5) * 2 / k * math.sin(math.pi * k * u / T) for k in (1, 2, 3))
    v += 1.1 * math.sin(math.pi * (8 + (seed % 3)) * u / T) * (0.6 + 0.4 * hsh(9, seed, 62))
    return v


def patch_d(X: int, Y: int, W: int, H: int, bx: int, by: int, inset: float = 10.0, r: float = 9.0) -> float:
    """Distância (aprox.) até a borda de um retalho que ocupa um bloco de W×H tiles; > 0 dentro."""
    Xc, Yc = X + 0.5, Y + 0.5
    i, j = X // T, Y // T
    u, v = Xc - i * T, Yc - j * T
    top = Yc - (inset + wave(u, (bx + i) * 7 + 1))
    bot = (H * T - Yc) - (inset + wave(u, (bx + i) * 7 + 2))
    left = Xc - (inset + wave(v, (by + j) * 7 + 3))
    right = (W * T - Xc) - (inset + wave(v, (by + j) * 7 + 4))
    a, b = min(left, right), min(top, bot)
    if a < r and b < r:
        return r - math.hypot(r - a, r - b) if (a < r and b < r) else min(a, b)
    return min(a, b)


def nine_slice(c: K, tx: int, ty: int, kind: str) -> None:
    """Retalho 3×3 (terra, trilha ou água) cercado de grama, com a beira de cada material."""
    W = H = 3
    ox, oy = tx * T, ty * T
    D = {}
    for Y in range(H * T):
        for X in range(W * T):
            D[(X, Y)] = patch_d(X, Y, W, H, tx, ty)
    for j in range(H):
        for i in range(W):
            sx, sy = ox + i * T, oy + j * T
            ins = lambda u, v, i=i, j=j: D.get((i * T + u, j * T + v), -1) > 2.5
            out = lambda u, v, i=i, j=j: D.get((i * T + u, j * T + v), 1) <= 0
            grass_tile(c, sx, sy, 100 + tx * 10 + i + j * 3, n=10, inside=out)
            seed = 200 + (tx + i) * 13 + (ty + j) * 7
            if kind == 'dirt':
                dirt_tile(c, sx, sy, seed, inside=lambda u, v, f=ins: D.get(((u + sx - ox), (v + sy - oy)), -1) > 0)
            elif kind == 'trail':
                trail_tile(c, sx, sy, seed, inside=lambda u, v: D.get(((u + sx - ox), (v + sy - oy)), -1) > 0)
            else:
                water_tile(c, sx, sy, seed, inside=lambda u, v: D.get(((u + sx - ox), (v + sy - oy)), -1) > 3)
    rim(c, ox, oy, D, kind)


def rim(c: K, ox: int, oy: int, D: dict, kind: str) -> None:
    """Beira do retalho, pela distância até a borda (d)."""
    for (X, Y), d in D.items():
        x, y = ox + X, oy + Y
        up = D.get((X, Y - 3), 9) <= 0  # a grama fica em cima: sombra mais funda
        if kind == 'water':
            if -1.0 < d <= 0:
                c.p(x, y, (52, 46, 36) if hsh(X, Y, 71) < 0.7 else GR[1])
            elif 0 < d <= 1.6:
                # Pedrinhas e espuma da margem.
                k = int((X + Y * 0.5) / 3)
                lt = hsh(k, int(Y / 3), 72)
                c.p(x, y, GRAY[6] if lt < 0.45 else (GRAY[5] if lt < 0.8 else GRAY[7]))
            elif 1.6 < d <= 2.6:
                c.p(x, y, GRAY[3] if hsh(X, Y, 73) < 0.6 else WT[1])
            elif 2.6 < d <= (5.0 if up else 3.6):
                c.p(x, y, WT[0] if d < 3.8 else WT[1])
        else:
            if -1.0 < d <= 0 and hsh(X, Y, 74) < 0.55:
                c.p(x, y, GR[1])
            elif 0 < d <= 1.2:
                c.p(x, y, DT[0] if kind == 'dirt' else DT[2])
            elif 1.2 < d <= (3.4 if up else 2.2):
                g = c.g(x, y)
                if g is not None:
                    c.p(x, y, mul(g, 0.8 if kind == 'dirt' else 0.86))
    # Tufos de capim debruçados sobre a beira de cima.
    for (X, Y), d in D.items():
        if 0 < d <= 1.2 and D.get((X, Y - 2), 9) <= 0 and hsh(X, Y, 75) < 0.16 and (X % T) not in (0, 31):
            c.p(ox + X, oy + Y, GR[3])
            c.p(ox + X, oy + Y + 1, GR[2])


def inner_corners(c: K, tx: int, ty: int) -> None:
    """dirt-inner-{nw,ne,sw,se}: terra com um canto de grama (quarto de círculo de raio 10)."""
    for j in range(2):
        for i in range(2):
            sx, sy = (tx + i) * T, (ty + j) * T
            cx, cy = (0 if i == 0 else T), (0 if j == 0 else T)
            d = lambda u, v: math.hypot(u + 0.5 - cx, v + 0.5 - cy) - 10.0
            dirt_tile(c, sx, sy, 300 + i + 2 * j, inside=lambda u, v: d(u, v) > 0)
            grass_tile(c, sx, sy, 310 + i + 2 * j, n=4, inside=lambda u, v: d(u, v) <= 0)
            for v in range(T):
                for u in range(T):
                    dd = d(u, v)
                    up = (cy == 0)
                    if -1.0 < dd <= 0 and hsh(u, v, 76) < 0.55:
                        c.p(sx + u, sy + v, GR[1])
                    elif 0 < dd <= 1.2:
                        c.p(sx + u, sy + v, DT[0])
                    elif 1.2 < dd <= (3.2 if up else 2.2):
                        c.shade(sx + u, sy + v, 0.8)


def trail_on_dirt(c: K, tx: int, ty: int) -> None:
    sx, sy = tx * T, ty * T
    edge = lambda u: 10 + wave(u + 0.5, 91)
    dirt_tile(c, sx, sy, 320, inside=lambda u, v: v + 0.5 < edge(u))
    trail_tile(c, sx, sy, 321, inside=lambda u, v: v + 0.5 >= edge(u))
    for u in range(T):
        e = edge(u)
        for v in range(T):
            d = v + 0.5 - e
            if 0 <= d < 1.2:
                c.p(sx + u, sy + v, DT[2])
            elif 1.2 <= d < 2.6:
                c.shade(sx + u, sy + v, 0.88)
            elif -1.2 <= d < 0:
                c.p(sx + u, sy + v, DT[5] if hsh(u, v, 92) < 0.4 else c.g(sx + u, sy + v))


def grass_stones(c: K, tx: int, ty: int) -> None:
    sx, sy = tx * T, ty * T
    grass_tile(c, sx, sy, 330, n=10)
    for k, (cx, cy, rx, ry) in enumerate(((10.5, 11.0, 3.4, 2.8), (19.0, 21.5, 5.0, 4.0), (9.0, 24.5, 2.6, 2.2))):
        pts = rock_shape(cx, cy, rx, ry, 331 + k, lump=0.15)
        local = K(T, T)
        rock(local, pts, GRAY[1:], 334 + k, facet=0.25, cracks=0)
        for (x, y) in pts:
            if any((x + dx, y + dy) not in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                local.p(x, y, GRAY[0])
        # Sombra no capim, embaixo à direita.
        for (x, y) in pts:
            for (dx, dy) in ((1, 1), (0, 1)):
                if (x + dx, y + dy) not in pts and 0 <= x + dx < T and 0 <= y + dy < T:
                    c.p(sx + x + dx, sy + y + dy, GR[0])
        for (x, y) in pts:
            c.p(sx + x, sy + y, local.g(x, y))


# ── Abismo ────────────────────────────────────────────────────────────────

def void_tile(c: K, tx: int, ty: int, seed: int, mist: bool = False, glint: bool = False) -> None:
    sx, sy = tx * T, ty * T
    for v in range(T):
        for u in range(T):
            t = 0.25 + field(u, v, 81) * 0.5
            c.p(sx + u, sy + v, quant(t, VOID, u, v, 0.8))
    # Pontos de luz: violeta e verde-musgo, alguns com brilho em cruz.
    for i in range(22):
        x, y = int(hsh(i, seed, 1) * 32), int(hsh(i, seed, 2) * 32)
        r = hsh(i, seed, 3)
        col = (48, 20, 70) if r < 0.45 else (106, 42, 138) if r < 0.7 else (122, 150, 64) if r < 0.92 else (176, 112, 224)
        c.p(sx + x, sy + y, col)
        if r > 0.86 and 1 <= x < 31 and 1 <= y < 31:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                c.p(sx + x + dx, sy + y + dy, mul(col, 0.5))
    if mist:
        for (x0, y0, L) in ((0, 12, 12), (27, 12, 5), (16, 24, 13), (4, 4, 6)):
            for j in range(L):
                for dy, col in ((0, (108, 94, 128)), (1, (84, 70, 104)), (2, (52, 42, 68))):
                    if j in (0, L - 1) and dy == 0:
                        continue
                    c.p(sx + (x0 + j) % T, sy + y0 + dy, col)
    if glint:
        gx, gy = 15, 15
        for d in range(1, 5):
            col = (210, 236, 150) if d < 2 else (122, 150, 64) if d < 4 else (60, 74, 40)
            for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)):
                c.p(sx + gx + dx, sy + gy + dy, col)
        c.p(sx + gx, sy + gy, (250, 255, 220))
        for dx, dy in ((1, 1), (-1, -1), (1, -1), (-1, 1)):
            c.p(sx + gx + dx, sy + gy + dy, (122, 150, 64))


# ── Paredão (topo, face e pé) ─────────────────────────────────────────────

def cliff_stones(c: K, sx: int, sy: int, variant: int, y0: int, y1: int, seed: int) -> None:
    """Pedras irregulares (células de Voronoi) entre as linhas y0 e y1, com junta escura.
    As sementes perto das quinas esquerda/direita são as mesmas em toda variante (e
    repetem a cada 32 px), então qualquer variante emenda com qualquer outra."""
    H = y1 - y0
    pts = []
    # Sementes compartilhadas na faixa da quina (x em −7..7, repetidas em ±32).
    rows = max(2, round(H / 13))
    for r in range(rows):
        yy = y0 + (r + 0.5) * H / rows + (hsh(r, H, seed) - 0.5) * 3
        xx = (hsh(r, H, seed + 1) - 0.5) * 8
        for k in (-1, 0, 1):
            pts.append((xx + k * T, yy))
    # Sementes da variante no miolo.
    for r in range(rows):
        yy = y0 + (r + 0.5) * H / rows + (hsh(r, variant, seed + 2) - 0.5) * 6
        xx = 13 + hsh(r, variant, seed + 3) * 7
        pts.append((xx, yy))
        if hsh(r, variant, seed + 4) < 0.35:
            pts.append((xx + (6 if xx < 16 else -6), yy + (5 if r == 0 else -5)))
    owner = {}
    for y in range(y0, y1):
        for x in range(T):
            jit = (pnoise(x, y, seed + 9, 4) - 0.5) * 2.4
            ds = sorted((math.hypot((x + 0.5 - px) * 0.9, y + 0.5 - py) + jit * (1 if i % 2 else -1), i) for i, (px, py) in enumerate(pts))
            (d0, i0), (d1, _) = ds[0], ds[1]
            owner[(x, y)] = -1 if (d1 - d0) < 1.1 else i0
    cells: dict = {}
    for p_, i in owner.items():
        if i >= 0:
            # As três cópias de uma semente da quina são a mesma pedra.
            key = i if i >= rows * 3 else -(1 + i // 3)
            cells.setdefault(key, set()).add(p_)
    for (x, y), i in owner.items():
        c.p(sx + x, sy + y, OL)
    for key, cell in cells.items():
        shared = key < 0
        # A pedra da quina é uma só, dividida entre a esquerda e a direita do tile: a luz é
        # calculada com ela inteira (x da direita trazido para antes do 0).
        wrap = {((x - T) if (shared and x >= T // 2) else x, y): (x, y) for (x, y) in cell}
        local = K(2 * T, T)
        rock(local, {(x + T // 2, y) for (x, y) in wrap}, CLIFF, seed + 7 * key + (0 if shared else variant * 13), facet=0.42, cracks=0, rim=True)
        for (wx, wy), (x, y) in wrap.items():
            c.p(sx + x, sy + y, local.g(wx + T // 2, wy))
    for x in range(T):
        c.p(sx + x, sy + y0, OL)


def cliff_top(c: K, tx: int, ty: int, variant: int) -> None:
    sx, sy = tx * T, ty * T
    grass_tile(c, sx, sy, 400 + variant, n=10, inside=lambda u, v: v < 22)
    for u in range(T):
        lip = 20 + (1 if hsh(u // 3, variant, 401) < 0.3 else 0)
        for v in range(19, T):
            if v < lip:
                continue
            if v == lip or v == lip + 1:
                col = GR[6] if v == lip else GR[4]
            elif v == lip + 2:
                col = OL
            else:
                t = (v - lip - 3) / 8
                col = quant(0.3 - 0.25 * t + (pnoise(u, v, 402, 4) - 0.5) * 0.4, CLIFF[:3], u, v, 0.2)
            c.p(sx + u, sy + v, col)
    # Raízes penduradas e capim caindo pela beira.
    for i in range(4):
        u = 2 + int(hsh(i, variant, 403) * 28)
        L = 3 + int(hsh(i, variant, 404) * 5)
        for k in range(L):
            c.p(sx + u + (k // 3), sy + 23 + k, (92, 68, 46) if k < L - 1 else (70, 52, 36))
    for i in range(5):
        u = 1 + int(hsh(i, variant, 405) * 30)
        c.p(sx + u, sy + 22, GR[3])
        c.p(sx + u, sy + 23, GR[2])


def cliff_face(c: K, tx: int, ty: int, variant: int) -> None:
    cliff_stones(c, tx * T, ty * T, variant, 0, T, 410)


def cliff_base(c: K, tx: int, ty: int, variant: int) -> None:
    sx, sy = tx * T, ty * T
    cliff_stones(c, sx, sy, variant, 0, 20, 420)
    for v in range(20, 25):
        for u in range(T):
            c.p(sx + u, sy + v, CLIFF[0] if v < 24 else OL)
    for u in range(T):
        if hsh(u, variant, 421) < 0.3:
            c.p(sx + u, sy + 20, CLIFF[1])
    grass_tile(c, sx, sy, 425 + variant, n=6, inside=lambda u, v: v >= 25)
    for u in range(T):
        c.p(sx + u, sy + 25, GR[1] if hsh(u, 25, 426) < 0.6 else GR[2])


# ── Linha de baixo: terreiro, lama, trilha em pé, flores, lajota e rocha ──

def yard(c: K, tx: int, ty: int) -> None:
    sx, sy = tx * T, ty * T
    for v in range(T):
        for u in range(T):
            t = 0.58 + field(u, v, 501) * 0.14 + (pnoise(u, v, 502, 4) - 0.5) * 0.12
            c.p(sx + u, sy + v, quant(t, DT[2:6], u, v, 0.7))
    # Chão batido: riscos de vassoura e algumas pedrinhas pisadas.
    for i in range(5):
        x, y = 2 + int(hsh(i, 0, 503) * 24), 2 + int(hsh(i, 0, 504) * 28)
        for j in range(4 + int(hsh(i, 0, 505) * 4)):
            if x + j < 31:
                c.p(sx + x + j, sy + y, DT[2])
    pebbles(c, sx, sy, 506, 4, DT[6], DT[5], DT[1])


def mud(c: K, tx: int, ty: int) -> None:
    sx, sy = tx * T, ty * T
    for v in range(T):
        for u in range(T):
            t = 0.4 + field(u, v, 511) * 0.4 + (pnoise(u, v, 512, 4) - 0.5) * 0.3
            c.p(sx + u, sy + v, quant(t, [(30, 22, 16), (42, 30, 22), (58, 41, 28), (74, 52, 34), (90, 62, 42)], u, v, 0.8))
    # Brilho molhado e uma poça rasa.
    for (x, y) in ((6, 6), (7, 6), (22, 9), (23, 9), (12, 25), (26, 22)):
        c.p(sx + x, sy + y, (120, 98, 76))
    for y in range(15, 20):
        for x in range(13, 25):
            if ((x + 0.5 - 19) / 6) ** 2 + ((y + 0.5 - 17.5) / 2.5) ** 2 <= 1:
                c.p(sx + x, sy + y, (52, 60, 62) if y > 16 else (36, 34, 34))
    for x in range(15, 20):
        c.p(sx + x, sy + 17, (96, 112, 112))
    c.p(sx + 21, sy + 18, (76, 90, 90))


def trail_v(c: K, tx: int, ty: int) -> None:
    sx, sy = tx * T, ty * T
    left = lambda v: 10 + 1.6 * math.sin(2 * math.pi * v / T) + 0.8 * math.sin(4 * math.pi * v / T + 1)
    right = lambda v: 22 + 1.4 * math.sin(2 * math.pi * v / T + 2) + 0.8 * math.sin(4 * math.pi * v / T + 0.5)
    inside = lambda u, v: left(v + 0.5) <= u + 0.5 < right(v + 0.5)
    grass_tile(c, sx, sy, 520, n=10, inside=lambda u, v: not inside(u, v))
    for v in range(T):
        for u in range(T):
            if inside(u, v):
                c.p(sx + u, sy + v, dirt_base(u, v))
    pebbles(c, sx, sy, 521, 4, DT[6], DT[5], DT[1], inside=lambda u, v: inside(u, v))
    for v in range(T):
        l, r = left(v + 0.5), right(v + 0.5)
        for u in range(T):
            d = min(u + 0.5 - l, r - u - 0.5)
            if 0 <= d < 1.0:
                c.p(sx + u, sy + v, DT[1])
            elif 1.0 <= d < 2.0:
                c.shade(sx + u, sy + v, 0.86)
            elif -1.0 <= d < 0 and hsh(u, v, 522) < 0.5:
                c.p(sx + u, sy + v, GR[1])


def grass_flowers(c: K, tx: int, ty: int) -> None:
    sx, sy = tx * T, ty * T
    grass_tile(c, sx, sy, 530, n=12)
    flowers = [((5, 7), (200, 64, 60)), ((24, 6), (236, 196, 76)), ((14, 16), (236, 232, 218)), ((26, 21), (96, 132, 210)),
               ((7, 25), (236, 196, 76)), ((18, 27), (210, 120, 150))]
    for (x, y), col in flowers:
        c.p(sx + x, sy + y + 1, GR[1])
        c.p(sx + x, sy + y + 2, GR[2])
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            c.p(sx + x + dx, sy + y + dy, col if dy <= 0 else mul(col, 0.75))
        c.p(sx + x, sy + y, (250, 228, 120) if col != (236, 196, 76) else (180, 110, 40))
        c.p(sx + x - 1, sy + y - 1, mix(col, (255, 255, 255), 0.3))


def flagstone(c: K, tx: int, ty: int) -> None:
    """Lajota: placas de pedra em duas fiadas desencontradas, junta na quina do tile."""
    sx, sy = tx * T, ty * T
    for v in range(T):
        for u in range(T):
            c.p(sx + u, sy + v, GRAY[1])
    slabs = [(0, 0, 16, 16), (16, 0, 16, 16), (0, 16, 8, 16), (8, 16, 16, 16), (24, 16, 8, 16)]
    for k, (x0, y0, w, h) in enumerate(slabs):
        tone = (hsh(k, 0, 541) - 0.5) * 0.14
        for y in range(y0 + 1, y0 + h):
            for x in range(x0 + 1, x0 + w):
                v = 0.55 + tone + (pnoise(x, y, 542 + k, 4) - 0.5) * 0.12
                if y == y0 + 1 or x == x0 + 1:
                    v += 0.18
                if y == y0 + h - 1 or x == x0 + w - 1:
                    v -= 0.18
                c.p(sx + x, sy + y, quant(v, GRAY[2:], x, y, 0.6))
    # Lajotas cortadas nas quinas de fora: a junta vira na quina do tile (as que passam de 32 voltam do outro lado).
    for (x, y) in ((6, 6), (7, 7), (22, 9), (13, 24), (14, 25), (28, 22)):
        c.p(sx + x, sy + y, GRAY[1])
    for (x, y) in ((1, 15), (17, 15), (9, 31), (25, 31), (2, 31)):
        c.p(sx + x, sy + y if y < 32 else 31, (70, 98, 56))


def rock_ground(c: K, tx: int, ty: int) -> None:
    sx, sy = tx * T, ty * T
    for v in range(T):
        for u in range(T):
            c.p(sx + u, sy + v, GRAY[0] if hsh(u, v, 551) < 0.5 else GRAY[1])
    # Cascalho: pedrinhas de 3–5 px, cada uma com luz de cima.
    for i in range(46):
        cx, cy = 1 + hsh(i, 0, 552) * 30, 1 + hsh(i, 0, 553) * 30
        rx = 1.4 + hsh(i, 0, 554) * 1.6
        ry = rx * 0.8
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                if 0 <= x < T and 0 <= y < T and ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1:
                    ny = (y + 0.5 - cy) / ry
                    nx = (x + 0.5 - cx) / rx
                    v = 0.5 - 0.35 * ny - 0.2 * nx + (hsh(i, 1, 555) - 0.5) * 0.2
                    c.p(sx + x, sy + y, quant(v, GRAY[2:], x, y, 0.3))


def rock_top(c: K, tx: int, ty: int) -> None:
    """Topo de muro de pedra: blocos grandes vistos de cima, em duas fiadas."""
    sx, sy = tx * T, ty * T
    for v in range(T):
        for u in range(T):
            c.p(sx + u, sy + v, GRAY[0])
    for (x0, y0, w, h) in ((0, 0, 16, 15), (16, 0, 16, 15), (0, 16, 8, 15), (8, 16, 16, 15), (24, 16, 8, 15)):
        for y in range(y0, y0 + h):
            for x in range(x0 + 1, x0 + w):
                v = 0.62 + (pnoise(x, y, 561, 4) - 0.5) * 0.14
                if y == y0:
                    v = 0.95
                elif x == x0 + 1:
                    v += 0.15
                elif x == x0 + w - 1:
                    v -= 0.2
                if y >= y0 + h - 2:
                    v -= 0.15
                c.p(sx + x, sy + y, quant(v, GRAY[2:], x, y, 0.5))
    for (x, y) in ((5, 7), (6, 8), (21, 23), (22, 23)):
        c.p(sx + x, sy + y, GRAY[2])


def rock_face(c: K, tx: int, ty: int) -> None:
    """Face de muro: pedras em pé (colunas de 6 px), juntas desencontradas a cada 10 px."""
    sx, sy = tx * T, ty * T
    for v in range(T):
        for u in range(T):
            c.p(sx + u, sy + v, GRAY[0])
    for col in range(4):
        x0 = col * 8
        off = 0 if col % 2 == 0 else 5
        for k in range(-1, 4):
            y0 = k * 10 + off
            for y in range(max(0, y0), min(T, y0 + 9)):
                for x in range(x0, x0 + 7):
                    v = 0.55 + (pnoise(x, y, 571 + col, 4) - 0.5) * 0.16 + (hsh(col, k, 572) - 0.5) * 0.1
                    if y == y0:
                        v = 0.92
                    elif x == x0:
                        v += 0.16
                    elif x >= x0 + 5:
                        v -= 0.22
                    c.p(sx + x, sy + y, quant(v, GRAY[2:], x, y, 0.5))


# ── Folha inteira ─────────────────────────────────────────────────────────

def terrain() -> K:
    c = K(256, 256)
    for i in range(4):
        grass_tile(c, i * T, 0, 10 + i * 7, n=9)
    # Detalhes de cada grama: trevo (0), nada (1), tufo mais escuro (2), broto e pedrinha (3).
    for (x, y) in ((6, 9), (7, 8), (8, 9), (7, 10), (22, 22), (23, 21), (24, 22), (23, 23)):
        c.p(x, y, GR[6] if (x + y) % 2 else GR[5])
    for (x, y) in ((2 * T + 14, 12), (2 * T + 15, 11), (2 * T + 16, 12), (2 * T + 13, 13), (2 * T + 17, 13), (2 * T + 15, 13)):
        c.p(x, y, GR[0])
    for (x, y, col) in ((3 * T + 15, 9, GR[6]), (3 * T + 14, 10, GR[5]), (3 * T + 16, 10, GR[5]), (3 * T + 15, 11, GR[2]),
                        (3 * T + 24, 24, GRAY[6]), (3 * T + 25, 24, GRAY[4]), (3 * T + 25, 25, GRAY[1])):
        c.p(x, y, col)
    dirt_tile(c, 4 * T, 0, 600)
    trail_tile(c, 5 * T, 0, 601)
    water_tile(c, 6 * T, 0, 602)
    void_tile(c, 7, 0, 603)
    nine_slice(c, 0, 1, 'dirt')
    inner_corners(c, 3, 1)
    nine_slice(c, 5, 1, 'trail')
    trail_on_dirt(c, 3, 3)
    grass_stones(c, 4, 3)
    nine_slice(c, 0, 4, 'water')
    for n in range(3):
        cliff_top(c, 3 + n, 4, n)
        cliff_face(c, 3 + n, 5, n)
        cliff_base(c, 3 + n, 6, n)
    void_tile(c, 6, 4, 604)
    void_tile(c, 7, 4, 605, mist=True)
    void_tile(c, 6, 5, 606, glint=True)
    void_tile(c, 7, 5, 607)
    yard(c, 0, 7)
    mud(c, 1, 7)
    trail_v(c, 2, 7)
    grass_flowers(c, 3, 7)
    flagstone(c, 4, 7)
    rock_ground(c, 5, 7)
    rock_top(c, 6, 7)
    rock_face(c, 7, 7)
    # Os dois tiles sem nome (6,6) e (7,6) seguem vazios, como na 16-bit.
    for y in range(6 * T, 7 * T):
        for x in range(6 * T, 8 * T):
            c.px[y][x] = None
    return c


# ── Grama de outono (tiles soltos) ────────────────────────────────────────

def autumn_grass(k: int) -> K:
    c = K(T, T)
    for v in range(T):
        for u in range(T):
            t = 0.5 + field(u, v, 701) * 0.24 + (pnoise(u, v, 702, 4) - 0.5) * 0.2
            c.p(u, v, quant(t, AUT[1:6], u, v, 0.9))
    # Capim seco.
    blades(c, 0, 0, 710 + k, 12, pal=[AUT[0], AUT[1], AUT[2], AUT[3], AUT[4], AUT[5], AUT[6]])
    # Folhas caídas: pequenas, com a cor do outono (vermelha, laranja, dourada, marrom).
    cols = [[(138, 58, 58), (100, 40, 40)], [(214, 120, 52), (160, 80, 40)], [(220, 180, 84), (170, 130, 60)], [(96, 66, 44), (70, 48, 32)]]
    n = (5, 8, 6, 5)[k]
    for i in range(n):
        x, y = 2 + int(hsh(i, k, 720) * 27), 2 + int(hsh(i, k, 721) * 27)
        a, b = cols[int(hsh(i, k, 722) * (4 if k != 3 else 3))]
        c.p(x, y, a)
        c.p(x + 1, y, a)
        c.p(x + 1, y + 1, b)
        if hsh(i, k, 723) < 0.5:
            c.p(x, y - 1, a)
        c.p(x + 2, y + 1, AUT[0])
    if k == 3:
        # Restos de capim verde.
        blades(c, 0, 0, 730, 8, pal=[(40, 62, 40), (52, 80, 50), (58, 90, 58), (66, 98, 56), (74, 106, 58), (84, 116, 64), (96, 130, 74)])
    for i in range(6):
        x, y = int(hsh(i, k, 740) * 32), int(hsh(i, k, 741) * 32)
        c.p(x, y, (90, 62, 42))
    return c


# ── Cercas (8 quadros de 32×32) ───────────────────────────────────────────

def gate_leaf(c: K, ox: int, iron: bool) -> None:
    """Folha do portãozinho aberta para dentro, vista de quina: travessas inclinadas e
    três barras em pé, presa no pilar da esquerda."""
    def bar(x0, y0, x1, y1, light, dark):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n):
            t = i / max(1, n - 1)
            x, y = round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t)
            c.p(ox + x, y, light)
            c.p(ox + x, y + 1, dark)
    if iron:
        for x in (8, 11, 14):
            dy = (x - 6) // 2
            for y in range(9 + dy, 25 + dy):
                c.p(ox + x, y, IRON[3] if y > 9 + dy else STEEL[3])
        bar(6, 11, 15, 15, IRON[3], IRON[1])
        bar(6, 21, 15, 25, IRON[3], IRON[1])
    else:
        for x in (8, 12):
            dy = (x - 6) // 2
            for y in range(9 + dy, 26 + dy):
                c.p(ox + x, y, WOODV[4])
                c.p(ox + x + 1, y, WOODV[2])
        bar(6, 11, 15, 15, WOODV[4], WOODV[2])
        bar(6, 20, 15, 24, WOODV[4], WOODV[2])
        bar(6, 22, 14, 13, WOODV[3], WOODV[1])


def fence_sheet(kind: str) -> K:
    """Quadros: 0 reta, 1 em pé, 2 quina NO, 3 quina NE, 4 quina SO, 5 quina SE, 6 portãozinho
    aberto, 7 mourão solto. Mesmo lugar de cada peça que na 16-bit, ×2."""
    c = K(8 * T, T)
    iron = kind == 'cemetery'
    POST = [(46, 50, 58), (62, 68, 78), (74, 80, 92), (92, 100, 112), (118, 126, 138), (150, 158, 168)] if iron else WOODV

    def post(f: int, x0: int, y0: int, w: int, y1: int, cap: bool = True) -> None:
        ox = f * T
        for y in range(y0, y1):
            for x in range(x0, x0 + w):
                if iron:
                    k = x - x0
                    v = 0.75 if k == 0 else (0.3 if k == w - 1 else 0.55)
                    v += (hsh(x // 2, y // 3, 801 + f) - 0.5) * 0.1
                    if (y - y0) % 7 == 6:
                        v -= 0.2  # junta da pedra
                    col = quant(v, POST, x, y)
                else:
                    col = wood_px(y, x, x - x0, w, WOODV[1:], 802 + f + x0)
                c.p(ox + x, y, col)
        if cap:
            if iron:
                for x in range(x0 - 1, x0 + w + 1):
                    c.p(ox + x, y0 - 2, POST[5] if x < x0 + w - 1 else POST[3])
                    c.p(ox + x, y0 - 1, POST[3] if x < x0 + w else POST[1])
            else:
                for x in range(x0, x0 + w):
                    c.p(ox + x, y0, WOODV[5] if x < x0 + w - 1 else WOODV[3])
                    c.p(ox + x, y0 + 1, WOODV[4])

    def rail(f: int, x0: int, x1: int, y: int) -> None:
        ox = f * T
        for x in range(x0, x1):
            if iron:
                c.p(ox + x, y, IRON[3])
                c.p(ox + x, y + 1, IRON[2])
                c.p(ox + x, y + 2, IRON[1])
            else:
                for dy in range(4):
                    c.p(ox + x, y + dy, wood_px(x, y + dy, dy, 4, WOODV[1:], 803 + y))

    def pickets(f: int, xs, top: int, bot: int) -> None:
        ox = f * T
        for x in xs:
            for y in range(top, bot):
                c.p(ox + x, y, IRON[3] if y > top + 1 else STEEL[3])
                c.p(ox + x + 1, y, IRON[1] if y > top + 1 else STEEL[1])
            # Ponta de lança.
            c.p(ox + x, top - 1, STEEL[4])
            c.p(ox + x + 1, top - 1, STEEL[2])
            c.p(ox + x, top - 2, STEEL[4])

    def vbar(f: int, x0: int, y0: int, y1: int) -> None:
        """Peça em pé que liga a cerca de cima com a de baixo (lado do cercado)."""
        ox = f * T
        for y in range(y0, y1):
            if iron:
                c.p(ox + x0, y, IRON[3])
                c.p(ox + x0 + 1, y, IRON[2])
                c.p(ox + x0 + 2, y, IRON[1])
            else:
                for dx in range(4):
                    c.p(ox + x0 + dx, y, wood_px(y, x0 + dx, dx, 4, WOODV[1:], 804))

    if iron:
        # 0: grade reta (lanças e duas travessas).
        pickets(0, (1, 9, 17, 25), 4, 28)
        rail(0, 0, T, 13)
        rail(0, 0, T, 21)
        # 1: lado em pé: barra com dois mourões pequenos.
        vbar(1, 15, 0, T)
        for y0 in (4, 20):
            post(1, 12, y0, 9, y0 + 4)
        # 2–5: quinas com o pilar de pedra e a grade saindo para dentro.
        for f, side, stub in ((2, 1, 'down'), (3, -1, 'down'), (4, 1, 'up'), (5, -1, 'up')):
            if side == 1:
                pickets(f, (26,), 4, 28)
                rail(f, 20, T, 13)
                rail(f, 20, T, 21)
            else:
                pickets(f, (2, 10), 4, 28)
                rail(f, 0, 12, 13)
                rail(f, 0, 12, 21)
            if stub == 'down':
                vbar(f, 15, 26, T)
            else:
                vbar(f, 15, 0, 6)
            post(f, 12, 6, 8, 28)
        # 6: portãozinho aberto entre dois pilares.
        post(6, 0, 4, 6, 28)
        post(6, 26, 4, 6, 28)
        gate_leaf(c, 6 * T, True)
        # 7: pilar sozinho.
        post(7, 12, 4, 9, 28)
    else:
        for x0, y0 in ((2, 6), (18, 6)):
            post(0, x0, y0, 4, 28)
        rail(0, 0, T, 12)
        rail(0, 0, T, 20)
        vbar(1, 14, 0, T)
        for y0 in (5, 21):
            for y in range(y0, y0 + 4):
                for x in range(12, 20):
                    c.p(T + x, y, wood_px(x, y, y - y0, 4, WOODV[1:], 805))
        for f, side, stub in ((2, 1, 'down'), (3, -1, 'down'), (4, 1, 'up'), (5, -1, 'up')):
            if side == 1:
                rail(f, 20, T, 12)
                rail(f, 20, T, 20)
                post(f, 12, 4, 8, 28)
                for y in range(8, 28):
                    c.p(f * T + 20, y, WOODV[0])
                    c.p(f * T + 21, y, WOODV[1])
            else:
                rail(f, 0, 12, 12)
                rail(f, 0, 12, 20)
                post(f, 2, 6, 4, 28)
                post(f, 12, 4, 8, 28)
            if stub == 'down':
                vbar(f, 14, 28, T)
            else:
                vbar(f, 14, 0, 4)
        post(6, 0, 2, 6, 28)
        post(6, 26, 2, 6, 28)
        gate_leaf(c, 6 * T, False)
        post(7, 12, 4, 8, 28)
    # Contorno por quadro (sem vazar de um quadro para o outro; quem toca a borda segue aberto).
    for f in range(8):
        sub = c.sub(f * T, 0, T, T)
        edge = []
        for y in range(T):
            for x in range(T):
                if sub.px[y][x] is None:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < T and 0 <= ny < T and sub.px[ny][nx] is None:
                        edge.append((x, y))
                        break
        for x, y in edge:
            c.p(f * T + x, y, OL)
    return c
