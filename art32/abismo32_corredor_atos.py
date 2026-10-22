"""Corredor dos atos II a VI em 32-bit (o ato I e as peças comuns ficam em
abismo32_corredor.py). Cada ato tem a base da parede (teto, textura, rodapé — a mesma nas
variantes a, b e na do patamar, para emendar), os objetos de cada vão, o pilar, o chão, o
primeiro plano e o arco de divisa.
"""
from __future__ import annotations

import math

from abismo32_base import (ALGAE, BONE_VI, CRATE, EMPH, FLESH, FOAM, FUNGUS, GLASS_C, GLASS_R, IRON2, KELP,
                           LAMP, LAVA, ORE, PALE, PIPE, RUST, SPORE, ST, VEIN, VIOLET, WOOD2, bayer, blank,
                           chain_v, dark_arch, fbm, glow, hsh, masonry, moss_patch, mul, put, shade_px,
                           sphere, stepped, stones, tint_px, tnoise, wood_beam)
from abismo32_corredor import (FILL0, H, P, PILLARS, W, WALL0, WALL1, bay, cornice_shadow, entry_frame,
                               fill_below, floor_layer, fore_layer, rubble_base, shadow_right, stair,
                               vignette_left, ceiling_coffers)


def run_bays(c, plan, variant, table):
    for i, kind in enumerate(plan.get(variant, [])):
        x0, x1 = bay(i)
        table[kind](c, x0, x1, i * 37 + (0 if variant == 'a' else 400))


def wet_ledge(c, R, y0=WALL1 - 2, foam=FOAM, base=5, seed=0):
    """Rodapé molhado: pedras baixas com a borda brilhando de água e poças."""
    for x in range(W):
        c.p(x, y0, R[3])
        c.p(x, y0 + 1, R[8])
    stones(c, 0, y0 + 2, W, 20, R, base, cs=14, seed=seed + 1, period=P, gap=0.9, sq=1.8)
    for k in range(48):
        x = int(hsh(k, 0, seed + 2) * W)
        L = 4 + int(hsh(k, 1, seed + 2) * 12)
        y = y0 + 1 + (0 if hsh(k, 2, seed + 2) < 0.6 else 6)
        for i in range(L):
            put(c, x + i, y, foam[3] if i < L - 2 else foam[2], P)
        if hsh(k, 3, seed + 2) < 0.3:
            put(c, x + L // 2, y - 1, foam[4], P)
    for x in range(W):
        for y in range(y0 + 22, FILL0):
            c.p(x, y, stepped([R[3], R[4]], 0.6 - (y - y0 - 22) / 12, x, y))


# ── Ato II · Minas Inundadas ─────────────────────────────────────────────

def strata(c, R, seed, n=3, y0=64, gap=50):
    """Veios escuros que atravessam a rocha (ondas inteiras no período: emendam)."""
    for k in range(n):
        m1, m2 = 1 + int(hsh(k, 0, seed) * 3), 3 + int(hsh(k, 1, seed) * 3)
        ph1, ph2 = hsh(k, 2, seed) * 6.28, hsh(k, 3, seed) * 6.28
        yc = y0 + k * gap + int(hsh(k, 4, seed) * 16)
        for x in range(W):
            y = yc + 10 * math.sin(2 * math.pi * m1 * x / W + ph1) + 4 * math.sin(2 * math.pi * m2 * x / W + ph2)
            y = int(y)
            if WALL0 + 4 < y < WALL1 - 6:
                put(c, x, y, R[2])
                put(c, x, y + 1, R[2] if tnoise(x, k, seed + 5, 12, P) > 0.35 else R[3])
                put(c, x, y + 2, R[7])


def ore_specks(c, seed, n=70, ramp=ORE, y0=WALL0 + 6, y1=WALL1 - 8):
    for k in range(n):
        x = int(hsh(k, 0, seed) * W)
        y = y0 + int(hsh(k, 1, seed) * (y1 - y0))
        put(c, x, y, ramp[2], P)
        if hsh(k, 2, seed) < 0.5:
            put(c, x + 1, y, ramp[1], P)
            put(c, x, y - 1, ramp[3], P)


def post_II(c, px, top=WALL0 - 2, bottom=WALL1):
    wood_beam(c, px - 5, top, 10, bottom - top, WOOD2, base=3, vertical=True, seed=210 + px, period=P, rot=0.08)
    for yb in (96, 168):
        for x in range(px - 6, px + 6):
            put(c, x, yb, IRON2[4], P)
            put(c, x, yb + 1, IRON2[3], P)
            put(c, x, yb + 2, IRON2[1], P)
        put(c, px - 3, yb + 1, IRON2[6], P)
        put(c, px + 2, yb + 1, IRON2[6], P)
    for side in (-1, 1):
        for i in range(24):
            x = px + side * (5 + i)
            y = 64 - i
            put(c, x, y - 1, WOOD2[5], P)
            put(c, x, y, WOOD2[4], P)
            put(c, x, y + 1, WOOD2[3], P)
            put(c, x, y + 2, WOOD2[1], P)
    shadow_right(c, px, 5, top, bottom, depth=4)


def base_II(c):
    R = ST['II']
    fill_below(c, R)
    stones(c, 0, 0, W, 30, R, 4, cs=16, seed=201, period=P, gap=1.0, mortar=R[1])
    stones(c, 0, 40, W, WALL1 - 40, R, 6, cs=17, seed=203, period=P, gap=1.2, mortar=R[2])
    strata(c, R, 204)
    ore_specks(c, 205)
    cornice_shadow(c, 40, 10, k=0.5)
    wood_beam(c, 0, 28, W, 12, WOOD2, base=3, seed=202, nails=[(x, 33) for x in range(14, W, 40)], period=P, rot=0.06)
    wet_ledge(c, R, seed=206)


def lamp_hang(c, x, y, glow_col=LAMP, period=P):
    """Lampião de mina pendurado num braço de ferro, com a poça de luz."""
    for i in range(8):
        put(c, x - 8 + i, y, IRON2[4] if i < 6 else IRON2[3], period)
    put(c, x - 9, y - 1, IRON2[5], period)
    put(c, x - 9, y + 1, IRON2[2], period)
    for j in range(1, 6):
        put(c, x, y + j, IRON2[3] if j % 2 else IRON2[5], period)
    ly = y + 6
    for xx in range(x - 4, x + 5):
        put(c, xx, ly, IRON2[4] if xx < x else IRON2[2], period)
    for j in range(1, 11):
        for xx in range(x - 4, x + 5):
            lx = xx - (x - 4)
            if lx in (0, 8):
                col = IRON2[3] if lx == 0 else IRON2[1]
            elif lx == 4:
                col = IRON2[2]
            else:
                col = glow_col[3] if (lx in (2, 3) and 2 <= j <= 7) else glow_col[2]
                if j > 8:
                    col = glow_col[1]
            put(c, xx, ly + j, col, period)
    for xx in range(x - 5, x + 6):
        put(c, xx, ly + 11, IRON2[3] if xx < x else IRON2[1], period)
    put(c, x - 1, ly + 3, glow_col[4], period)
    glow(c, x, ly + 6, 30, glow_col[2], 0.24, period=period)


def ore_vein(c, x0, x1, y, seed):
    for x in range(x0, x1, 3):
        yy = int(y + 5 * math.sin(x * 0.11 + seed) + 2 * math.sin(x * 0.37))
        put(c, x, yy, ORE[2], P)
        put(c, x + 1, yy, ORE[1], P)
        put(c, x, yy - 1, ORE[3], P)
        put(c, x, yy + 1, ORE[0], P)
        if hsh(x, 1, seed) < 0.3:
            put(c, x + 1, yy - 2, ORE[2], P)


def pipe_valve(c, x0, x1, y, seed):
    """Cano velho de ferro esverdeado com braçadeiras, registro de roda e a goteira."""
    for x in range(x0, x1):
        for j, t in enumerate((3, 4, 3, 2, 2, 1, 0)):
            col = PIPE[t]
            if (x - x0) % 30 in (0, 1, 2):
                col = PIPE[min(5, t + 1)] if j < 3 else PIPE[max(0, t - 1)]
            if tnoise(x, y + j, seed, 5) > 0.82:
                col = RUST[1 + (j < 3)]
            put(c, x, y + j, col, P)
    for ex in (x0 - 6, x1):
        wood_beam(c, ex, y - 3, 6, 13, WOOD2, base=3, vertical=True, seed=seed + ex)
    cx = (x0 + x1) // 2 - 6
    for x in range(cx - 1, cx + 2):
        for yy in range(y - 6, y):
            put(c, x, yy, IRON2[3] if x < cx + 1 else IRON2[1], P)
    for dy in range(-9, 10):
        for dx in range(-9, 10):
            d = math.hypot(dx, dy)
            on_ring = 6.5 <= d <= 8.5
            spoke = d < 7 and (abs(dx) <= 0.6 or abs(dy) <= 0.6)
            if on_ring or spoke or d < 2:
                lit = -dx - dy
                col = RUST[3] if lit > 3 else (RUST[2] if lit > -3 else RUST[1])
                if d < 2:
                    col = RUST[4] if dx + dy < 0 else RUST[1]
                put(c, cx + dx, y - 14 + dy, col, P)
    # Goteira.
    dx_ = cx + 22
    for yy in range(y + 7, WALL1 - 2, 4):
        put(c, dx_, yy, FOAM[3], P)
        put(c, dx_, yy + 1, FOAM[2], P)
    for i in range(-4, 5):
        put(c, dx_ + i, WALL1 - 1, FOAM[4] if abs(i) < 2 else FOAM[2], P)


def crate(c, x, y, w, h, seed):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx, ly = xx - x, yy - y
            frame = lx < 3 or lx >= w - 3 or ly < 3 or ly >= h - 3
            if frame:
                t = 3 if (lx < 1 or ly < 1) else (1 if (lx >= w - 1 or ly >= h - 1) else 2)
                col = CRATE[t]
            else:
                pl = (ly - 3) % 6
                col = CRATE[3] if pl == 0 else (CRATE[0] if pl == 5 else CRATE[2])
                if tnoise(xx, yy, seed, 4) > 0.8:
                    col = CRATE[1]
            put(c, xx, yy, col, P)
    # Escora em diagonal (ferro enferrujado) e pregos.
    for i in range(min(w, h) - 6):
        xx = x + 3 + int(i * (w - 6) / (h - 6))
        yy = y + 3 + i
        put(c, xx, yy, RUST[2], P)
        put(c, xx + 1, yy, RUST[1], P)
    for (nx, ny) in ((x + 1, y + 1), (x + w - 2, y + 1), (x + 1, y + h - 2), (x + w - 2, y + h - 2)):
        put(c, nx, ny, IRON2[5], P)


def pickaxe(c, x, bottom):
    for i in range(44):
        xx = x + i * 14 // 44
        yy = bottom - i
        put(c, xx, yy, WOOD2[4], P)
        put(c, xx + 1, yy, WOOD2[2], P)
    hx, hy = x + 14, bottom - 44
    for i in range(-12, 13):
        yy = hy + int((i * i) / 30)
        put(c, hx + i, yy, IRON2[5] if i < 0 else IRON2[4], P)
        put(c, hx + i, yy + 1, IRON2[3], P)
        put(c, hx + i, yy + 2, IRON2[1] if abs(i) < 9 else None, P)
    put(c, hx - 13, hy + 5, IRON2[5], P)
    put(c, hx + 13, hy + 5, IRON2[3], P)


def tunnel(c, cx, top, w, bottom, R, seed):
    ring = [WOOD2[0], WOOD2[2], WOOD2[3], WOOD2[4], WOOD2[5], WOOD2[6]]
    dark_arch(c, cx, top, w, bottom, [R[0], R[1], R[2], R[3]], ring=ring, ring_w=4, period=P)
    # Trilhos e dormentes saindo do túnel.
    for k in range(4):
        yy = bottom - 3 - k * 4
        for x in range(cx - w // 2 + 2 + k * 2, cx + w // 2 - 2 - k * 2):
            put(c, x, yy, WOOD2[3] if k == 0 else WOOD2[2], P)
            put(c, x, yy + 1, WOOD2[1], P)
    for rx in (cx - 10, cx + 8):
        for yy in range(bottom - 18, bottom):
            put(c, rx + (bottom - yy) // 6 * (1 if rx < cx else -1), yy, IRON2[4], P)
    lamp_hang(c, cx - 10, top + 14)


def feat_II():
    R = ST['II']

    def lamp_ore(c, x0, x1, s):
        lamp_hang(c, x0 + 52, 46)
        ore_vein(c, x0 + 10, x0 + 70, 136, s)

    def pipe(c, x0, x1, s):
        pipe_valve(c, x0 + 6, x1 - 8, 116, s)

    def crates(c, x0, x1, s):
        crate(c, x0 + 22, 194, 30, 24, s)
        crate(c, x0 + 52, 198, 26, 20, s + 1)
        crate(c, x0 + 30, 172, 28, 22, s + 2)
        pickaxe(c, x0 + 96, WALL1 - 1)
        rubble_base(c, x0 + 80, x1, R, s)

    def tun(c, x0, x1, s):
        tunnel(c, (x0 + x1) // 2 + 6, 104, 80, WALL1, R, s)

    return {'lamp-ore': lamp_ore, 'pipe': pipe, 'crates': crates, 'tunnel': tun}


PLAN_II = {'a': ['lamp-ore', 'pipe', 'crates', 'tunnel'], 'b': ['crates', 'tunnel', 'lamp-ore', 'pipe']}


def wall_II(variant):
    c = blank(W, H)
    base_II(c)
    run_bays(c, PLAN_II, variant, feat_II())
    for px in PILLARS:
        post_II(c, px)
    return c


def floor_II():
    """Passarela de tábuas com trilhos de vagonete sobre a água escura das minas."""
    R = ST['II']
    c = blank(W, 128)
    tops = [int(1 + 4 * tnoise(x, 0, 220, 20, P) + 2 * hsh(x // 4, 0, 221)) for x in range(W)]
    for x in range(W):
        for y in range(tops[x], 20):
            hatch = (x + y) % 6 == 0
            col = stepped([R[3], R[4], R[5]], 0.75 - (y - tops[x]) / 26, x, y)
            if hatch:
                col = R[6] if (x // 6) % 3 else R[3]
            c.p(x, y, col)
        c.p(x, tops[x], R[8])
    # Tábuas em pé (vistas de cima, de lado) com veio e frestas.
    for y in range(20, 80):
        for x in range(W):
            lx = x % 20
            k = x // 20
            tone = 3 + (-1, 0, 0, 1)[int(hsh(k, 0, 222) * 4)]
            base = [R[3], R[4], R[5], R[6], R[7]]
            if lx == 19:
                col = R[1]
            elif lx == 0:
                col = base[min(4, tone)]
            else:
                g = tnoise(x * 3, y * 0.4, 223 + k, 3)
                col = base[tone - 1] if g > 0.66 else base[min(4, max(0, tone - (1 if lx > 15 else 0)))]
            c.p(x, y, col)
    for x in range(W):
        c.p(x, 20, R[2])
    # Trilhos de ferro.
    for ry in (22, 38, 66):
        for x in range(W):
            c.p(x, ry, PIPE[4])
            c.p(x, ry + 1, PIPE[3])
            c.p(x, ry + 2, PIPE[1])
            if x % 40 == 8:
                c.p(x, ry + 1, RUST[3])
        # Rebites ferrugem nas tábuas.
    for x in range(10, W, 40):
        for ry in (28, 58):
            c.p(x, ry, RUST[2])
            c.p(x + 1, ry + 1, RUST[0])
    for x in range(W):
        c.p(x, 78, R[1])
        c.p(x, 79, R[0])
    # Água escura com estacas e reflexos.
    for y in range(80, 128):
        t = (y - 80) / 48
        for x in range(W):
            n = tnoise(x, y * 4, 224, 24, P)
            col = stepped([R[1], R[2], R[3]], 0.75 - t * 0.5 + (n - 0.5) * 0.25, x, y)
            c.p(x, y, col)
    for k in range(10):
        x = 8 + k * 64
        for y in range(80, 108):
            c.p(x, y, WOOD2[4])
            c.p(x + 1, y, WOOD2[3])
            c.p(x + 2, y, WOOD2[1])
        # Reflexo quebrado da estaca.
        for y in range(108, 124, 2):
            if hsh(k, y, 225) < 0.7:
                c.p(x + int(2 * math.sin(y)), y, WOOD2[2])
    for k in range(60):
        x = int(hsh(k, 0, 226) * W)
        y = 84 + int(hsh(k, 1, 226) * 42)
        L = 6 + int(hsh(k, 2, 226) * 18)
        col = R[5] if y < 104 else R[4]
        for i in range(L):
            put(c, x + i, y, col, P)
    for x in range(W):
        if (x // 3) % 5 != 0:
            c.p(x, 80, R[4])
    return c


def fore_II_deco(c, R):
    for k in range(14):
        x = int(hsh(k, 0, 230) * W)
        y = 56 + int(hsh(k, 1, 230) * 7)
        L = 4 + int(hsh(k, 2, 230) * 10)
        for i in range(L):
            put(c, x + i, y, FOAM[4] if i < L // 2 else FOAM[3], P)
    for (x, y) in ((150, 56), (420, 58)):
        for i in range(12):
            put(c, x + i, y, WOOD2[4], P)
            put(c, x + i, y + 1, WOOD2[2], P)


def door_II():
    """Arco de escoramento: dois esteios com cintas de ferro, viga com mão-francesa e
    um lampião no meio."""
    c = blank(96, 384)
    wood_beam(c, 0, 4, 96, 20, WOOD2, base=3, seed=240, nails=[(8, 12), (46, 12), (86, 12)])
    for x in range(96):
        c.p(x, 4, PIPE[3])
        c.p(x, 5, PIPE[2])
    for x0 in (4, 76):
        wood_beam(c, x0, 24, 16, 240, WOOD2, base=3, vertical=True, seed=241 + x0, rot=0.06)
        for yb in range(48, 256, 36):
            for x in range(x0 - 1, x0 + 17):
                c.p(x, yb, IRON2[4])
                c.p(x, yb + 1, IRON2[2])
            c.p(x0 + 3, yb, IRON2[6])
            c.p(x0 + 12, yb, IRON2[6])
    for side in (0, 1):
        for i in range(22):
            x = 20 + i if side == 0 else 75 - i
            y = 26 + i
            for k, col in enumerate((WOOD2[5], WOOD2[4], WOOD2[3], WOOD2[1])):
                c.p(x, y + k - 1, col)
    lamp_hang(c, 48, 22, period=0)
    # Tira o braço do lampião (aqui ele pende direto da viga).
    for i in range(8):
        c.px[22][40 + i] = WOOD2[1] if c.px[22][40 + i] else None
    c.outline(ST['II'][1])
    return c


def entry_II():
    c, R = entry_frame('II', wall_II)
    ring = [WOOD2[0], WOOD2[2], WOOD2[3], WOOD2[4], WOOD2[5], WOOD2[6]]
    dark_arch(c, 104, 122, 34, 226, [R[0], R[1], R[2], R[3]], ring=ring, ring_w=3)
    stair(c, R, rail=True, ring=ring, ring_w=4)
    for k in range(8):
        sx, sy = k * 16, 110 + k * 14
        for x in range(sx, sx + 16):
            c.p(x, sy, RUST[2])
            c.p(x, sy + 1, RUST[1])
    vignette_left(c, R)
    return c


# ── Ato III · Jardim de Fungos ───────────────────────────────────────────

def spores(c, seed, n=120, y0=0, y1=WALL1, ramp=SPORE):
    for k in range(n):
        x = int(hsh(k, 0, seed) * W)
        y = y0 + int(hsh(k, 1, seed) * (y1 - y0))
        r = hsh(k, 2, seed)
        put(c, x, y, ramp[3] if r < 0.3 else ramp[2], P)
        if r < 0.08:
            for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put(c, x + dx, y + dy, ramp[1], P)
            put(c, x, y, ramp[4], P)


def base_III(c):
    R = ST['III']
    fill_below(c, R)
    for y in range(0, 40):
        for x in range(W):
            c.p(x, y, stepped([R[1], R[2], R[3], R[4]], y / 46, x, y))
    # Franja de gotas e fios pendurados no teto.
    for x in range(W):
        L = int(2 + 6 * tnoise(x, 0, 300, 6, P) ** 2 + (5 if hsh(x, 1, 301) < 0.05 else 0))
        for j in range(L):
            c.p(x, 34 + j, R[4] if j < L - 1 else R[6])
    stones(c, 0, 40, W, WALL1 - 40, R, 6, cs=22, seed=302, period=P, gap=1.3, mortar=R[1])
    cornice_shadow(c, 40, 10, k=0.5)
    spores(c, 303)
    # Tapete de musgo-fungo no pé da parede.
    for x in range(W):
        h = int(4 + 4 * tnoise(x, 0, 304, 10, P))
        for y in range(WALL1 - h, WALL1 + 24):
            if y < WALL1:
                col = R[8] if y == WALL1 - h else (R[6] if (x + y) % 3 else R[5])
            else:
                ly = y - WALL1
                blade = (x * 7 + ly) % 5 == 0
                col = stepped([R[4], R[6], R[8]], 0.85 - ly / 30, x, y)
                if blade:
                    col = R[3]
                if ly == 0:
                    col = R[9]
            c.p(x, y, col)
        if hsh(x, 2, 305) < 0.04:
            c.p(x, WALL1 - h - 1, FUNGUS[4])
            c.p(x, WALL1 - h - 2, FUNGUS[5])


def pillar_III(c, px, R=None):
    """Pilar-cogumelo: chapéu largo com lamelas que brilham, caule anelado."""
    R = R or ST['III']
    prof = [7, 11, 12, 11, 11, 10, 10, 10, 10, 10, 9, 9, 9, 8, 7, 5]
    for y in range(46, WALL1):
        ly = (y - 46) % 18
        for i, t in enumerate(prof):
            x = px - 8 + i
            col = R[t]
            if ly == 17 and 0 < i < 15:
                col = R[max(0, t - 2)]
            elif ly == 0 and 0 < i < 15:
                col = R[min(14, t + 1)]
            elif tnoise(x, y, 310, 3) > 0.82:
                col = R[min(14, t + 1)]
            put(c, x, y, col, P)
    # Pé bulboso.
    for y in range(WALL1 - 12, WALL1 + 2):
        hw = 9 + (y - (WALL1 - 12)) // 3
        for x in range(px - hw, px + hw):
            lx = x - (px - hw)
            col = R[10] if lx < hw * 0.6 else (R[8] if lx < hw * 1.4 else R[6])
            if y == WALL1 - 12:
                col = R[11]
            put(c, x, y, col, P)
    # Chapéu.
    cw = 38
    for y in range(30, 52):
        for x in range(px - cw, px + cw + 1):
            dx = (x - px) / cw
            top = 30 + 10 * dx * dx
            if y < top:
                continue
            ly = y - top
            if y >= 47:
                # Lamelas por baixo: escuras, com pontos de esporo.
                col = R[3] if (x % 3) else R[2]
                if y == 47:
                    col = R[5]
                if y == 49 and x % 4 == 0:
                    col = SPORE[3]
                if y > 49 and abs(x - px) > cw - 10:
                    continue
            else:
                lit = -dx * 0.7 + (1 - ly / 10) * 0.6
                col = R[12] if lit > 0.75 else (R[10] if lit > 0.35 else (R[9] if lit > 0 else R[8]))
                if ly < 1:
                    col = R[13] if dx < 0.2 else R[11]
                if tnoise(x, y, 311, 3) > 0.8:
                    col = R[9]
            put(c, x, y, col, P)
    shadow_right(c, px, 8, 52, WALL1, depth=5)


def shelf_fungus(c, x, y, w, R):
    for i in range(w):
        dx = (i - w / 2) / (w / 2)
        h = int(3 + 2 * (1 - dx * dx))
        for j in range(h):
            col = R[11] if j == 0 else (R[9] if j < h - 1 else R[6])
            if j == 0 and i < w * 0.3:
                col = R[12]
            put(c, x + i, y + j, col, P)
        put(c, x + i, y + h, R[3], P)
        if i % 4 == 1:
            put(c, x + i, y + h + 1, SPORE[3], P)
    for i in range(w):
        put(c, x + i, y - 1, R[13] if i < w // 2 else R[12], P)


def puffballs(c, cx, cy, seed):
    balls = [(0, 0, 9), (-16, 6, 7), (12, 10, 6), (-6, 18, 5), (20, -6, 7), (-2, 30, 4)]
    for (dx, dy, r) in balls:
        sphere(c, cx + dx, cy + dy, r, FUNGUS[1:7], period=P)
        for k in range(int(r)):
            a = hsh(k, dx, seed) * 6.28
            rr = r * 0.6 * hsh(k, dy, seed + 1)
            put(c, cx + dx + rr * math.cos(a), cy + dy + rr * math.sin(a), FUNGUS[1], P)
        put(c, cx + dx + 1, cy + dy + 1, SPORE[4], P)
    glow(c, cx, cy + 8, 40, FUNGUS[5], 0.14, period=P)


def star_arch(c, cx, top, w, bottom, R, seed):
    dark_arch(c, cx, top, w, bottom, [R[0], R[0], R[1], R[2]], ring=[R[2], R[4], R[6], R[8], R[9], R[10]], ring_w=4, period=P)
    for k in range(34):
        x = cx - w // 2 + 3 + int(hsh(k, 0, seed) * (w - 6))
        y = top + 6 + int(hsh(k, 1, seed) * (bottom - top - 10))
        d = math.hypot(x - cx, y - (top + w / 2))
        if y < top + w / 2 and d > w / 2 - 3:
            continue
        r = hsh(k, 2, seed)
        put(c, x, y, SPORE[4] if r < 0.2 else (SPORE[3] if r < 0.6 else SPORE[1]), P)
        if r < 0.1:
            for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put(c, x + dx, y + dy, SPORE[1], P)


def shrooms(c, x0, x1, seed, base=WALL1 - 4, scale=1.0):
    """Moitinha de cogumelos: caule claro, chapéu verde com pintas."""
    n = 5
    for k in range(n):
        x = x0 + int((x1 - x0) * (k + 0.5) / n + (hsh(k, 0, seed) - 0.5) * 10)
        h = int((14 + hsh(k, 1, seed) * 30) * scale)
        cw = int((5 + hsh(k, 2, seed) * 8) * scale)
        for y in range(base - h, base + 2):
            put(c, x, y, BONE_VI[3], P)
            put(c, x + 1, y, BONE_VI[2], P)
            if y > base - 4:
                put(c, x - 1, y, BONE_VI[2], P)
                put(c, x + 2, y, BONE_VI[1], P)
        ty = base - h
        for i in range(-cw, cw + 2):
            dx = i / cw
            hh = int(3 * (1 - dx * dx)) + 1
            for j in range(hh):
                col = FUNGUS[5] if (j == 0 and i < 0) else (FUNGUS[4] if j < hh - 1 else FUNGUS[2])
                put(c, x + i, ty - hh + j + 1, col, P)
            put(c, x + i, ty + 1, FUNGUS[1], P)
        put(c, x - cw // 2, ty - 1, FUNGUS[6], P)
        put(c, x + 2, ty - 2, SPORE[3], P)
        glow(c, x, ty, 12, FUNGUS[5], 0.12, period=P)


def feat_III():
    R = ST['III']

    def shelves(c, x0, x1, s):
        shelf_fungus(c, x0 + 18, 102, 34, R)
        shelf_fungus(c, x0 + 60, 130, 38, R)
        shelf_fungus(c, x0 + 30, 180, 30, R)

    def puffs(c, x0, x1, s):
        puffballs(c, x0 + 66, 100, s)

    def arch(c, x0, x1, s):
        star_arch(c, (x0 + x1) // 2 + 4, 96, 72, WALL1, R, s)

    def cluster(c, x0, x1, s):
        shrooms(c, x0 + 20, x1 - 20, s)

    return {'shelves': shelves, 'puffs': puffs, 'arch': arch, 'cluster': cluster}


PLAN_III = {'a': ['shelves', 'puffs', 'arch', 'cluster'], 'b': ['arch', 'cluster', 'shelves', 'puffs']}


def wall_III(variant):
    c = blank(W, H)
    base_III(c)
    run_bays(c, PLAN_III, variant, feat_III())
    for px in PILLARS:
        pillar_III(c, px)
    return c


def floor_III():
    """Chão de micélio em camadas: estrias compridas, brotos que brilham."""
    R = ST['III']
    c = blank(W, 128)
    tops = [int(2 + 4 * tnoise(x, 0, 320, 18, P) + 2 * hsh(x // 5, 0, 321)) for x in range(W)]
    for y in range(0, 128):
        for x in range(W):
            if y < tops[x]:
                continue
            if y < 32:
                base = [R[5], R[6], R[7]]
                t = 0.7 - (y - tops[x]) / 60
            elif y < 80:
                base = [R[3], R[4], R[5]]
                t = 0.55 - (y - 32) / 160
            else:
                base = [R[1], R[2], R[3]]
                t = 0.9 - (y - 80) / 60
            col = stepped(base, t, x, y)
            # Estrias: fios compridos de micélio claro/escuro.
            n = tnoise(x, y * 6, 322, 30, P)
            if n > 0.72 and (y % 3 == 0):
                col = R[10] if y < 32 else (R[8] if y < 80 else R[5])
            elif n < 0.18 and y % 3 == 1:
                col = R[2] if y < 80 else R[0]
            if y == tops[x]:
                col = R[10]
            c.p(x, y, col)
    for k in range(26):
        x = int(hsh(k, 0, 323) * W)
        y = 6 + int(hsh(k, 1, 323) * 100)
        h = 2 + int(hsh(k, 2, 323) * 4)
        col = SPORE if y < 82 else [mul(v, 0.6) for v in SPORE]
        for j in range(h):
            put(c, x, y - j, col[1], P)
        put(c, x, y - h, col[3], P)
        put(c, x - 1, y - h + 1, col[2], P)
        put(c, x + 1, y - h + 1, col[2], P)
    return c


def fore_III_deco(c, R):
    shrooms(c, 130, 160, 340, base=62, scale=0.5)
    shrooms(c, 452, 488, 341, base=62, scale=0.45)
    for k in range(8):
        x = int(hsh(k, 0, 342) * W)
        put(c, x, 50 + int(hsh(k, 1, 342) * 10), SPORE[3], P)


def door_III():
    """Cogumelo gigante: chapéu verde com pintas e lamelas brilhando, caule anelado com
    orelhas-de-pau."""
    R = ST['III']
    c = blank(96, 384)
    prof = [6, 9, 11, 12, 12, 11, 11, 11, 10, 10, 10, 10, 10, 10, 9, 9, 9, 9, 8, 8, 8, 7, 6, 4]
    for y in range(40, 252):
        ly = (y - 40) % 22
        for i, t in enumerate(prof):
            x = 36 + i
            col = R[t]
            if ly == 21 and 0 < i < 23:
                col = R[max(0, t - 2)]
            elif ly == 0 and 0 < i < 23:
                col = R[min(14, t + 1)]
            elif tnoise(x, y, 350, 3) > 0.8:
                col = R[min(14, t + 1)]
            c.p(x, y, col)
    for y in range(238, 262):
        hw = 14 + (y - 238) // 3
        for x in range(48 - hw, 48 + hw):
            lx = x - (48 - hw)
            col = R[10] if lx < hw * 0.6 else (R[8] if lx < hw * 1.3 else R[5])
            if y == 238:
                col = R[11]
            c.p(x, y, col)
    for (x, y, w) in ((14, 100, 26), (56, 150, 28)):
        shelf_fungus(c, x, y, w, R)
    # Chapéu verde.
    for y in range(0, 46):
        for x in range(96):
            dx = (x - 48) / 48
            top = 2 + 34 * dx * dx
            if y < top:
                continue
            ly = y - top
            if y >= 38:
                if y >= 42 and abs(dx) > 0.85:
                    continue
                col = FUNGUS[1] if x % 3 else FUNGUS[0]
                if y == 38:
                    col = FUNGUS[5]
                if y == 40 and x % 4 == 1:
                    col = SPORE[3]
            else:
                lit = -dx * 0.6 + (1 - min(1, ly / 14)) * 0.7
                col = FUNGUS[5] if lit > 0.8 else (FUNGUS[4] if lit > 0.45 else (FUNGUS[3] if lit > 0.1 else FUNGUS[2]))
                if ly < 1:
                    col = FUNGUS[6]
            c.p(x, y, col)
    for (sx, sy, r) in ((30, 12, 2), (56, 8, 3), (70, 22, 2), (22, 26, 2), (44, 24, 2)):
        for y in range(sy - r, sy + r + 1):
            for x in range(sx - r, sx + r + 1):
                if (x - sx) ** 2 + (y - sy) ** 2 <= r * r and c.g(x, y):
                    c.p(x, y, FUNGUS[6] if x - sx + y - sy < 0 else FUNGUS[5])
    for (x, y) in ((18, 30), (50, 4), (64, 14), (36, 18)):
        c.p(x, y, SPORE[4])
    c.outline(R[1])
    return c


def entry_III():
    c, R = entry_frame('III', wall_III)
    stair(c, R, rail=True, inner=[R[0], R[0], R[1]])
    for k in range(8):
        sx, sy = k * 16, 110 + k * 14
        for x in range(sx, sx + 16):
            if tnoise(x, sy, 360, 4) > 0.45:
                c.p(x, sy, FUNGUS[3])
                c.p(x, sy - 1, FUNGUS[4] if hsh(x, k, 361) < 0.3 else c.g(x, sy - 1))
    shrooms(c, 84, 104, 362, base=110 + 6 * 14 - 1, scale=0.4)
    vignette_left(c, R)
    return c


# ── Ato IV · Cidade Afogada ──────────────────────────────────────────────

def column_IV(c, px, R, top=WALL0 - 4, bottom=WALL1, broken=False):
    """Coluna canelada com capitel de volutas e base de toro; `broken` tira um trecho."""
    prof = [4, 10, 11, 9, 7, 10, 9, 7, 10, 9, 7, 9, 8, 6, 9, 8, 6, 8, 7, 5, 7, 6, 5, 3]
    gap0, gap1 = 64, 98
    for y in range(top + 12, bottom - 12):
        if broken and gap0 <= y < gap1:
            continue
        for i, t in enumerate(prof):
            x = px - 12 + i
            col = R[t]
            if tnoise(x, y, 400, 4) > 0.84 and 0 < i < 23:
                col = R[t - 1]
            if broken and (y - gap1) in range(0, 4) and hsh(i, 0, 401) < 0.6 - (y - gap1) * 0.15:
                continue
            if broken and (gap0 - y) in range(1, 5) and hsh(i, 1, 401) < 0.6 - (gap0 - y) * 0.15:
                continue
            put(c, x, y, col, P)
    # Capitel: ábaco, volutas e colarinho.
    for j in range(12):
        y = top + j
        hw = 18 if j < 4 else (16 if j < 9 else 13)
        for x in range(px - hw, px + hw):
            lx = x - (px - hw)
            tone = 12 if j == 0 else (10 if j < 3 else (9 if lx < hw else 7))
            if j == 3 or j == 11:
                tone = 5
            if lx >= 2 * hw - 2:
                tone -= 3
            put(c, x, y, R[tone], P)
    for side in (-1, 1):
        vx, vy = px + side * 14, top + 7
        for a in range(0, 360, 20):
            rr = 3.2
            x = vx + rr * math.cos(math.radians(a))
            y = vy + rr * math.sin(math.radians(a))
            put(c, x, y, R[12] if a > 180 else R[8], P)
        put(c, vx, vy, R[4], P)
    for j in range(12):
        y = bottom - 12 + j
        hw = 14 if j < 3 else (17 if j < 7 else 18)
        for x in range(px - hw, px + hw):
            lx = x - (px - hw)
            tone = (11 if j in (3, 7) else 9) if lx < hw else 7
            if j in (2, 6, 11):
                tone = 4
            if lx >= 2 * hw - 2:
                tone -= 2
            put(c, x, y, R[tone], P)
    if broken:
        rubble_base(c, px - 20, px + 26, R, 402, n=6)
    shadow_right(c, px, 13, top, bottom, depth=6)


def stained_window(c, cx, top, w, bottom, R, seed, broken=False, glass_mix=(0.42, 0.62), pale=False):
    """Vitral em arco: mosaico de vidro azul-piscina e vermelho, chumbo escuro, moldura
    de pedra e peitoril com goteiras."""
    r = w / 2
    cyc = top + r
    cell = 8
    for y in range(top - 4, bottom + 1):
        for x in range(int(cx - r - 4), int(cx + r + 4)):
            dx = x + 0.5 - cx
            d = math.hypot(dx, y + 0.5 - cyc) if y + 0.5 < cyc else abs(dx)
            if d <= r:
                lx, ly = int(x - (cx - r)), y - top
                ci, cj = lx // cell, ly // cell
                if lx % cell == 0 or ly % cell == 0 or d > r - 1.2:
                    col = R[1]
                else:
                    h = hsh(ci, cj, seed)
                    other = [R[8], R[9], R[10], R[11], R[12]] if pale else [R[2], R[3], R[4], R[5], R[6]]
                    pal = GLASS_C if h < glass_mix[0] else (GLASS_R if h < glass_mix[1] else other)
                    dim = broken and hsh(ci, cj, seed + 1) < 0.25
                    if dim:
                        pal = [R[0], R[1], R[1], R[2], R[2]]
                    k = 2
                    if lx % cell == 1 or ly % cell == 1:
                        k = 3
                    if lx % cell == cell - 1 or ly % cell == cell - 1:
                        k = 1
                    if (lx % cell, ly % cell) == (2, 2):
                        k = 4
                    col = pal[k]
                put(c, x, y, col, P)
            elif d <= r + 4:
                ang = math.atan2(y + 0.5 - cyc, dx) if y + 0.5 < cyc else 0
                seg = int((ang + math.pi) / (math.pi / 10))
                col = R[10] if (dx < 0 and y < cyc) else (R[8] if seg % 2 else R[9])
                if d > r + 3:
                    col = R[4]
                put(c, x, y, col, P)
    for x in range(int(cx - r - 6), int(cx + r + 7)):
        put(c, x, bottom + 1, R[12], P)
        put(c, x, bottom + 2, R[10], P)
        put(c, x, bottom + 3, R[8], P)
        put(c, x, bottom + 4, R[4], P)
    for k in range(8):
        x = int(cx - r + 4 + k * (w - 8) / 7)
        for j in range(0, 10, 3):
            put(c, x, bottom + 6 + j + (k % 2) * 2, GLASS_C[3] if j == 0 else R[9], P)
    glow(c, cx, (top + bottom) / 2, w * 0.9, GLASS_C[2], 0.1, period=P)


def statue_niche(c, cx, top, bottom, R, seed):
    dark_arch(c, cx, top, 44, bottom, [R[0], R[1], R[2], R[3]], ring=[R[3], R[5], R[7], R[9], R[10], R[11]], ring_w=3, period=P)
    # Figura encapuzada de pedra clara, segurando uma pérola.
    h = bottom - top - 26
    y0 = top + 18
    for y in range(y0, bottom - 2):
        t = (y - y0) / h
        hw = 6 + t * 12 if y > y0 + 16 else 6 + 1.5 * math.sin(min(1, (y - y0) / 16) * math.pi)
        for x in range(int(cx - hw), int(cx + hw) + 1):
            dx = (x - cx) / max(1, hw)
            tone = 3 if dx < -0.4 else (2 if dx < 0.3 else 1)
            if y > y0 + 18 and (x - cx) % 6 == 0:
                tone -= 1
            col = R[8 + 2 * max(0, tone)] if tone < 3 else R[13]
            if y < y0 + 14 and abs(x - cx) < 4 and y > y0 + 5:
                col = R[1]  # rosto no escuro do capuz
            put(c, x, y, col, P)
    for x in range(int(cx - 20), int(cx + 21)):
        put(c, x, bottom - 2, R[11], P)
        put(c, x, bottom - 1, R[6], P)
    sphere(c, cx - 1, y0 + 30, 3, [PALE[1], PALE[2], PALE[3], PALE[4], (255, 255, 248)], period=P)
    glow(c, cx, y0 + 30, 14, PALE[4], 0.18, period=P)


def kelp(c, x0, x1, seed, base=WALL1 - 1, n=5, hmax=90):
    for k in range(n):
        x = x0 + int((x1 - x0) * (k + 0.5) / n)
        h = int(40 + hsh(k, 0, seed) * (hmax - 40))
        ph = hsh(k, 1, seed) * 6.28
        for j in range(h):
            xx = x + 4 * math.sin(j * 0.12 + ph) * (j / h)
            col = KELP[3] if j % 6 < 3 else KELP[2]
            put(c, xx, base - j, col, P)
            put(c, xx + 1, base - j, KELP[1], P)
            if j % 9 == 4:
                side = 1 if (j // 9) % 2 else -1
                for i in range(1, 5):
                    put(c, xx + side * i, base - j - i // 2, KELP[4] if i < 3 else KELP[3], P)
    for k in range(3):
        x = x0 + int(hsh(k, 5, seed) * (x1 - x0))
        for i in range(5):
            put(c, x + i, base - (i % 2), KELP[4], P)
            put(c, x + i, base + 1, KELP[1], P)


def base_IV(c):
    R = ST['IV']
    fill_below(c, R)
    ceiling_coffers(c, R)
    masonry(c, 0, WALL0, W, WALL1 - WALL0, R, 6, bh=14, bw=(28, 42), seed=410, period=P, stain=0.32)
    cornice_shadow(c, WALL0, 8)
    # Marcas de água: escorridos verticais e a linha da maré.
    for k in range(40):
        x = int(hsh(k, 0, 411) * W)
        L = 20 + int(hsh(k, 1, 411) * 60)
        y = WALL0 + 6 + int(hsh(k, 2, 411) * 40)
        for j in range(L):
            if hsh(j, k, 412) < 0.85:
                shade_px(c, x, y + j, 0.82, P)
    for x in range(W):
        y = 150 + int(3 * math.sin(2 * math.pi * 3 * x / W))
        tint_px(c, x, y, ALGAE[3], 0.35)
        tint_px(c, x, y + 1, ALGAE[1], 0.45)
    moss_patch(c, 0, 160, W, WALL1, ALGAE, seed=413, density=0.3, period=P)
    from abismo32_corredor import plinth
    plinth(c, R, 'IV')


def feat_IV():
    R = ST['IV']

    def window(c, x0, x1, s):
        stained_window(c, (x0 + x1) // 2 + 2, 60, 62, 190, R, s)

    def window_b(c, x0, x1, s):
        stained_window(c, (x0 + x1) // 2 + 2, 60, 62, 190, R, s, broken=True)

    def statue(c, x0, x1, s):
        statue_niche(c, (x0 + x1) // 2 + 2, 68, WALL1, R, s)

    def weed(c, x0, x1, s):
        kelp(c, x0 + 10, x1 - 10, s)
        sphere(c, x0 + 78, WALL1 - 4, 3, [PALE[1], PALE[2], PALE[3], PALE[4], (255, 255, 248)], period=P)

    return {'window': window, 'window-b': window_b, 'statue': statue, 'weed': weed}


PLAN_IV = {'a': ['window', 'statue', 'window-b', 'weed'], 'b': ['statue', 'window-b', 'weed', 'window']}


def wall_IV(variant):
    c = blank(W, H)
    R = ST['IV']
    base_IV(c)
    run_bays(c, PLAN_IV, variant, feat_IV())
    for px in PILLARS:
        column_IV(c, px, R, broken=(variant == 'b' and px == 320))
    return c


def floor_IV():
    c = floor_layer('IV')
    R = ST['IV']
    # Poças rasas que espelham o vitral.
    for k in range(9):
        cx = int(hsh(k, 0, 420) * W)
        cy = 40 + int(hsh(k, 1, 420) * 36)
        rx = 12 + int(hsh(k, 2, 420) * 14)
        for y in range(cy - 2, cy + 3):
            for x in range(cx - rx, cx + rx + 1):
                dx = (x - cx) / rx
                dy = (y - cy) / 2.6
                if dx * dx + dy * dy > 1:
                    continue
                col = R[5] if dy < 0 else R[6]
                if y == cy - 1 and -0.6 < dx < 0.2:
                    col = GLASS_C[2]
                if y == cy and 0.1 < dx < 0.5:
                    col = GLASS_R[1]
                put(c, x, y, col, P)
        put(c, cx - rx // 3, cy - 1, GLASS_C[4], P)
    for k in range(40):
        x = int(hsh(k, 0, 421) * W)
        y = 36 + int(hsh(k, 1, 421) * 80)
        put(c, x, y, R[8] if y < 82 else R[5], P)
    return c


def fore_IV_deco(c, R):
    kelp(c, 100, 116, 430, base=63, n=2, hmax=26)
    kelp(c, 380, 396, 431, base=63, n=2, hmax=22)
    sphere(c, 570, 60, 2, [PALE[2], PALE[3], PALE[4], (255, 255, 248)], period=P)


def door_IV():
    R = ST['IV']
    c = blank(96, 384)
    masonry(c, 16, 0, 64, 40, R, 6, bh=10, bw=(16, 24), seed=440, stain=0.2)
    for y in range(18, 30):
        for x in range(42, 54):
            c.p(x, y, PALE[3] if x < 47 else PALE[2])
    # Coluna larga (fuste canelado) ocupando o arco.
    prof = [4, 11, 12, 10, 8, 11, 10, 8, 11, 10, 8, 10, 9, 7, 10, 9, 7, 9, 8, 6, 8, 7, 5, 8, 7, 5, 7, 6, 4, 6, 5, 3]
    for y in range(54, 240):
        for i, t in enumerate(prof):
            x = 32 + i
            col = R[t]
            if tnoise(x, y, 441, 4) > 0.84:
                col = R[t - 1]
            c.p(x, y, col)
    for j in range(14):
        y = 40 + j
        hw = 34 if j < 5 else (30 if j < 10 else 22)
        for x in range(48 - hw, 48 + hw):
            lx = x - (48 - hw)
            tone = 12 if j == 0 else (10 if j < 4 else (9 if lx < hw else 7))
            if j in (4, 13):
                tone = 4
            if lx >= 2 * hw - 2:
                tone -= 3
            c.p(x, y, R[tone])
    for j in range(26):
        y = 240 + j
        hw = 22 if j < 4 else (30 if j < 12 else 34)
        for x in range(48 - hw, 48 + hw):
            lx = x - (48 - hw)
            tone = (11 if j in (4, 12) else 9) if lx < hw else 7
            if j in (3, 11, 25):
                tone = 4
            if lx >= 2 * hw - 2:
                tone -= 2
            c.p(x, y, R[tone])
    # Escorridos e cracas.
    for k in range(30):
        x = 34 + int(hsh(k, 0, 442) * 28)
        y = 120 + int(hsh(k, 1, 442) * 60)
        c.p(x, y, KELP[2] if k % 3 else R[2])
    kelp(c, 26, 34, 443, base=238, n=1, hmax=46)
    kelp(c, 64, 72, 444, base=238, n=1, hmax=40)
    c.outline(R[1])
    return c


def entry_IV():
    c, R = entry_frame('IV', wall_IV)
    stair(c, R, rail=True)
    kelp(c, 96, 120, 450, base=210, n=2, hmax=50)
    vignette_left(c, R)
    return c


# ── Ato V · Forja Abissal ────────────────────────────────────────────────

def iron_plates(c, R, y0=44, y1=WALL1, seed=500):
    """Chapas de ferro batido: costuras com rebites, chanfro aceso e textura martelada."""
    seams_y = list(range(y0, y1, 40))
    for y in range(y0, y1):
        ly = (y - y0) % 40
        for x in range(W):
            lx = (x - 40) % 80
            pid = ((x - 40) // 80, (y - y0) // 40)
            tone = 5 + (-1, 0, 0, 1)[int(hsh(pid[0] % 8, pid[1], seed) * 4)]
            if ly == 0 or lx == 0:
                col = R[2]
            elif ly == 1 or lx == 1:
                col = R[min(14, tone + 3)]
            elif ly == 39 or lx == 79:
                col = R[max(0, tone - 2)]
            else:
                n = tnoise(x, y, seed + 1, 2.5, P)
                d = bayer(x, y)
                col = R[tone] if n > d * 0.6 + 0.2 else R[tone - 1]
                if tnoise(x, y, seed + 2, 30, P) < 0.25:
                    col = R[max(0, R.index(col) - 1)] if col in R else col
            c.p(x, y, col)
    for y in seams_y:
        for x in range(8, W, 16):
            for (dx, dy, k) in ((0, 3, 10), (1, 3, 7), (0, 4, 7), (1, 4, 3)):
                put(c, (x + dx) % W, y + dy, R[k], P)
    for x in range(40, W, 80):
        for y in range(y0 + 8, y1, 16):
            for (dx, dy, k) in ((3, 0, 10), (4, 0, 7), (3, 1, 7), (4, 1, 3)):
                put(c, x + dx, y + dy, R[k], P)


def base_V(c):
    R = ST['V']
    fill_below(c, R)
    for y in range(0, 20):
        for x in range(W):
            c.p(x, y, stepped([R[1], R[2]], y / 30, x, y))
    # Viga em I rebitada.
    for x in range(W):
        for y in range(20, 44):
            ly = y - 20
            if ly < 4:
                col = R[10] if ly == 0 else (R[8] if ly == 1 else R[6])
            elif ly < 20:
                col = stepped([R[3], R[4], R[5]], 0.7 - (ly - 4) / 30, x, y)
            else:
                col = R[8] if ly == 20 else (R[6] if ly < 23 else R[3])
            c.p(x, y, col)
        if x % 20 == 10:
            for yy in (27, 36):
                c.p(x, yy, R[11])
                c.p(x + 1, yy, R[8])
                c.p(x, yy + 1, R[7])
                c.p(x + 1, yy + 1, R[3])
    iron_plates(c, R)
    cornice_shadow(c, 44, 10, k=0.5)
    # Calor subindo do pé da parede.
    for y in range(170, WALL1):
        k = (y - 170) / (WALL1 - 170)
        for x in range(W):
            if k * 0.5 > bayer(x, y) + 0.1:
                tint_px(c, x, y, LAVA[3], 0.18 * k)
    # Rodapé de brasas.
    for x in range(W):
        c.p(x, WALL1, R[3])
        c.p(x, WALL1 + 1, R[9])
        for y in range(WALL1 + 2, FILL0):
            col = stepped([R[3], R[4], R[5]], 0.7 - (y - WALL1) / 30, x, y)
            c.p(x, y, col)
    for k in range(110):
        x = int(hsh(k, 0, 510) * W)
        y = WALL1 + 3 + int(hsh(k, 1, 510) * 18)
        r = hsh(k, 2, 510)
        put(c, x, y, LAVA[5] if r < 0.2 else (LAVA[4] if r < 0.5 else LAVA[2]), P)
        if r < 0.15:
            put(c, x + 1, y, LAVA[3], P)


def pillar_V(c, px, R=None):
    R = R or ST['V']
    prof = [3, 9, 10, 8, 7, 7, 7, 6, 6, 6, 6, 5, 5, 4, 3, 2]
    for y in range(40, WALL1 + 2):
        for i, t in enumerate(prof):
            x = px - 8 + i
            col = R[t]
            if tnoise(x, y, 520, 3, P) > 0.8:
                col = R[t - 1]
            put(c, x, y, col, P)
        if (y - 40) % 14 == 6:
            put(c, px - 5, y, R[11], P)
            put(c, px - 5, y + 1, R[4], P)
            put(c, px + 4, y, R[9], P)
            put(c, px + 4, y + 1, R[3], P)
    for (yy, hw) in ((40, 11), (WALL1 - 8, 11)):
        for y in range(yy, yy + 8):
            for x in range(px - hw, px + hw):
                lx = x - (px - hw)
                col = R[9] if y == yy else (R[7] if lx < hw else R[5])
                if y == yy + 7:
                    col = R[2]
                put(c, x, y, col, P)
    shadow_right(c, px, 11, 44, WALL1, depth=6)


def furnace(c, cx, top, w, bottom, R, seed):
    """Boca de fornalha em arco com grelha e fogo vivo atrás."""
    r = w / 2
    cyc = top + r
    for y in range(top - 6, bottom + 1):
        for x in range(int(cx - r - 6), int(cx + r + 7)):
            dx = x + 0.5 - cx
            d = math.hypot(dx, y + 0.5 - cyc) if y + 0.5 < cyc else abs(dx)
            if d <= r:
                t = (y - top) / (bottom - top)
                n = fbm(x, y * 0.6 - seed, seed, 8, 0, 2)
                heat = t * 0.9 + n * 0.6 - 0.15
                col = LAVA[max(1, min(7, int(heat * 8)))]
                lx = int(x - (cx - r)) % 6
                if lx == 0:
                    col = R[2]
                elif lx == 1:
                    col = R[6]
                if d > r - 1.5:
                    col = R[1]
                put(c, x, y, col, P)
            elif d <= r + 6:
                ang = math.atan2(y + 0.5 - cyc, dx) if y + 0.5 < cyc else 0
                seg = int((ang + math.pi) / (math.pi / 8))
                col = R[9] if seg % 2 else R[8]
                if dx < 0 and y < cyc:
                    col = R[10] if seg % 2 else R[9]
                if d > r + 5:
                    col = R[3]
                if d < r + 1.5:
                    col = LAVA[3]
                put(c, x, y, col, P)
    for x in range(int(cx - r - 8), int(cx + r + 9)):
        put(c, x, bottom, R[10], P)
        put(c, x, bottom + 1, R[7], P)
        put(c, x, bottom + 2, R[3], P)
    glow(c, cx, bottom - 20, w * 1.1, LAVA[5], 0.28, period=P)


def lava_crack(c, x, y0, y1, seed, R):
    xx = x
    pts = []
    for y in range(y0, y1):
        r = hsh(y, 0, seed)
        xx += 1 if r > 0.55 else (0 if r > 0.25 else -1)
        if hsh(y, 1, seed) < 0.1:
            xx += 1
        pts.append((xx, y))
    for (x_, y_) in pts:
        put(c, x_ - 2, y_, R[1], P)
        put(c, x_ + 2, y_, R[1], P)
        put(c, x_ - 1, y_, LAVA[4], P)
        put(c, x_, y_, LAVA[6], P)
        put(c, x_ + 1, y_, LAVA[3], P)
    for (x_, y_) in pts[::5]:
        glow(c, x_, y_, 10, LAVA[4], 0.16, period=P)


def shelves_V(c, x0, x1, R, seed):
    for sy in (100, 150):
        for x in range(x0, x1):
            put(c, x, sy, R[11], P)
            put(c, x, sy + 1, R[8], P)
            put(c, x, sy + 2, R[6], P)
            put(c, x, sy + 3, R[2], P)
        for bx in (x0 + 6, x1 - 8):
            for j in range(4, 12):
                put(c, bx + (j - 4) // 2, sy + j, R[7], P)
                put(c, bx + (j - 4) // 2 + 1, sy + j, R[3], P)
    # Lingotes e tenazes nas prateleiras.
    for k in range(3):
        x = x0 + 12 + k * 14
        for y in range(94, 100):
            for i in range(10):
                col = R[10] if y == 94 else (R[8] if i < 5 else R[6])
                put(c, x + i, y, col, P)
    for i in range(22):
        put(c, x1 - 40 + i, 146 - (i // 6), IRON2[5], P)
        put(c, x1 - 40 + i, 147 - (i // 6), IRON2[2], P)
    cx, cy = (x0 + x1) // 2, 125
    for dy in range(-9, 10):
        for dx in range(-9, 10):
            d = math.hypot(dx, dy)
            if 6.5 <= d <= 8.5 or (d < 7 and (abs(dx) <= 0.6 or abs(dy) <= 0.6)) or d < 2:
                lit = -dx - dy
                col = (226, 74, 54) if lit > 3 else ((168, 40, 30) if lit > -3 else (104, 22, 18))
                put(c, cx + dx, cy + dy, col, P)


def feat_V():
    R = ST['V']

    def forge(c, x0, x1, s):
        furnace(c, x0 + 44, 112, 36, 210, R, s)
        rubble_base(c, x0 + 72, x1 - 10, R, s, n=8)

    def chains(c, x0, x1, s):
        for (dx, L) in ((44, 60), (70, 104), (98, 46)):
            chain_v(c, x0 + dx, 44, 44 + L, IRON2, big=True)
        for y in range(148, 158):
            for x in range(x0 + 64, x0 + 77):
                put(c, x, y, IRON2[4] if x < x0 + 70 else IRON2[2], P)

    def crack_(c, x0, x1, s):
        lava_crack(c, x0 + 50, 74, 200, s, R)

    def shelf(c, x0, x1, s):
        shelves_V(c, x0 + 6, x1 - 6, R, s)

    return {'forge': forge, 'chains': chains, 'crack': crack_, 'shelf': shelf}


PLAN_V = {'a': ['forge', 'chains', 'crack', 'shelf'], 'b': ['crack', 'shelf', 'forge', 'chains']}


def wall_V(variant):
    c = blank(W, H)
    base_V(c)
    run_bays(c, PLAN_V, variant, feat_V())
    for px in PILLARS:
        pillar_V(c, px)
    return c


def floor_V():
    c = floor_layer('V')
    R = ST['V']
    # Rachaduras de lava descendo do meio-fio para o piso.
    for k in range(10):
        x = 20 + k * 64 + int(hsh(k, 0, 530) * 20)
        y0 = 8
        L = 30 + int(hsh(k, 1, 530) * 40)
        xx = x
        for j in range(L):
            y = y0 + j
            if hsh(j, k, 531) < 0.55:
                xx += 1
            core = LAVA[5] if j < L * 0.6 else LAVA[4]
            put(c, xx, y, core, P)
            put(c, xx - 1, y, LAVA[2], P)
            put(c, xx + 1, y, R[1], P)
    return c


def fore_V_deco(c, R):
    for k in range(30):
        x = int(hsh(k, 0, 540) * W)
        y = 44 + int(hsh(k, 1, 540) * 19)
        put(c, x, y, LAVA[5] if k % 3 else LAVA[6], P)
        if k % 4 == 0:
            put(c, x + 1, y, LAVA[3], P)


def door_V():
    R = ST['V']
    c = blank(96, 384)
    for y in range(12, 36):
        for x in range(0, 96):
            ly = y - 12
            col = R[10] if ly == 0 else (R[7] if ly < 3 else stepped([R[3], R[4]], 0.6, x, y))
            if ly >= 21:
                col = R[6] if ly == 21 else R[2]
            c.p(x, y, col)
        if y in (18, 28):
            for x in range(6, 96, 12):
                c.p(x, y, R[11])
                c.p(x + 1, y + 1, R[3])
    prof = [3, 8, 9, 8, 7, 7, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2]
    for y in range(36, 244):
        for i, t in enumerate(prof):
            x = 18 + i
            col = R[t]
            if tnoise(x, y, 550, 2.5) > bayer(x, y) * 0.5 + 0.45:
                col = R[t - 1] if t > 0 else col
            c.p(x, y, col)
        if (y - 36) % 16 == 8:
            for xx in (20, 46):
                c.p(xx, y, R[10])
                c.p(xx + 1, y + 1, R[3])
    # Veio de lava ondulando no meio do pilar.
    for y in range(80, 236):
        x = 34 + int(4 * math.sin(y * 0.12))
        c.p(x, y, LAVA[5])
        c.p(x + 1, y, LAVA[3])
        c.p(x - 1, y, LAVA[1])
    for y in range(240, 262):
        for x in range(12, 84):
            ly = y - 240
            col = R[9] if ly == 0 else (R[6] if x < 48 else R[4])
            if ly > 18:
                col = R[2]
            c.p(x, y, col)
    chain_v(c, 84, 36, 120, IRON2, big=True)
    for y in range(120, 130):
        for x in range(80, 89):
            c.p(x, y, IRON2[4] if x < 84 else IRON2[2])
    c.outline(R[1])
    return c


def entry_V():
    c, R = entry_frame('V', wall_V)
    stair(c, R, rail=True)
    for k in range(20):
        x = int(hsh(k, 0, 560) * 140)
        y = 120 + int(hsh(k, 1, 560) * 110)
        if c.g(x, y) and sum(c.g(x, y)) < 120:
            c.p(x, y, LAVA[4] if k % 2 else LAVA[2])
    vignette_left(c, R)
    return c


# ── Ato VI · Coração do Abismo ───────────────────────────────────────────

def base_VI(c):
    R = ST['VI']
    fill_below(c, R, idx=6)
    for y in range(0, 44):
        for x in range(W):
            c.p(x, y, stepped([R[1], R[2], R[3]], y / 60, x, y))
    # Costelas em arco no teto, de 80 em 80, com contas de veia.
    for x in range(W):
        lx = (x % 80) / 80
        y = int(6 + 26 * math.sin(lx * math.pi))
        for yy in range(y - 6, y):
            if yy >= 0:
                tint_px(c, x, yy, FLESH[1], 0.4 * (1 - (y - yy) / 6))
        put(c, x, y, VEIN[2] if x % 3 else VEIN[3], P)
        put(c, x, y + 1, R[1], P)
        if x % 6 == 0:
            put(c, x, y - 1, VEIN[4], P)
    stones(c, 0, 44, W, WALL1 - 44, R, 6, cs=24, seed=600, period=P, gap=1.5, mortar=R[1], sq=1.1)
    cornice_shadow(c, 44, 8, k=0.5)
    for k in range(70):
        x = int(hsh(k, 0, 601) * W)
        y = 50 + int(hsh(k, 1, 601) * 160)
        put(c, x, y, FLESH[5] if k % 4 else EMPH['VI'][2], P)
    # Pé da parede: lodo violeta pontilhado.
    for x in range(W):
        c.p(x, WALL1, R[4])
        c.p(x, WALL1 + 1, R[10])
        for y in range(WALL1 + 2, FILL0):
            n = fbm(x, y, 602, 6, P, 2)
            col = stepped([R[4], R[6], R[8]], 0.85 - (y - WALL1) / 26 + (n - 0.5) * 0.5, x, y)
            if hsh(x, y, 603) < 0.05:
                col = VIOLET[2] if n > 0.5 else VIOLET[1]
            c.p(x, y, col)


def pillar_VI(c, px, R=None):
    """Pilar-espinha: vértebras de carne com espinhos dos lados."""
    R = R or ST['VI']
    for y0 in range(42, WALL1, 16):
        for y in range(y0, min(WALL1, y0 + 14)):
            ly = y - y0
            hw = 11 if 1 <= ly <= 12 else 9
            for x in range(px - hw, px + hw):
                lx = x - (px - hw)
                t = lx / (2 * hw)
                col = R[12] if t < 0.25 else (R[10] if t < 0.7 else R[8])
                if ly == 1:
                    col = R[13]
                if ly >= 12:
                    col = R[6]
                if lx == 0:
                    col = R[8]
                put(c, x, y, col, P)
        for y in range(y0 + 14, y0 + 16):
            for x in range(px - 6, px + 6):
                put(c, x, y, R[1], P)
        for side in (-1, 1):
            for i in range(4):
                put(c, px + side * (11 + i), y0 + 6, BONE_VI[3] if i < 2 else BONE_VI[1], P)
            put(c, px + side * 11, y0 + 7, BONE_VI[0], P)
    shadow_right(c, px, 15, 44, WALL1, depth=5)


def eye(c, cx, cy, rx=11, ry=6, R=None, veins=True, seed=0):
    R = R or ST['VI']
    for y in range(int(cy - ry - 2), int(cy + ry + 3)):
        for x in range(int(cx - rx - 2), int(cx + rx + 3)):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            lid = abs(dy) <= (1 - dx * dx) ** 0.7 if abs(dx) < 1 else False
            lid2 = abs(dy) <= (1 - (dx * 0.92) ** 2) ** 0.7 * 1.3 if abs(dx * 0.92) < 1 else False
            if lid:
                d = math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.2)
                col = BONE_VI[3] if dy < 0.2 else BONE_VI[2]
                if d < ry * 0.95:
                    col = EMPH['VI'][1] if d > ry * 0.5 else EMPH['VI'][2]
                    if d > ry * 0.85:
                        col = EMPH['VI'][0]
                if d < ry * 0.9 and abs(x + 0.5 - cx) < max(1.2, rx * 0.12) * max(0.0, 1 - (d / ry) ** 2) ** 0.5:
                    col = (16, 6, 14)
                put(c, x, y, col, P)
            elif lid2:
                put(c, x, y, FLESH[1] if dy < 0 else FLESH[0], P)
    put(c, cx - 3, cy - 2, (255, 240, 246), P)
    if veins:
        for k in range(3):
            x, y = cx - 4 + k * 4, cy + ry + 2
            for j in range(24 + int(hsh(k, 0, seed) * 16)):
                x += (1 if hsh(j, k, seed) > 0.6 else (-1 if hsh(j, k, seed) < 0.35 else 0))
                put(c, x, y + j, VEIN[2] if j % 4 else VEIN[3], P)
                if j % 7 == 3:
                    put(c, x + 1, y + j, VEIN[1], P)


def eyes_arch(c, cx, top, w, bottom, R, seed):
    dark_arch(c, cx, top, w, bottom, [R[0], R[0], R[1], R[2]], ring=[R[2], R[4], R[6], R[8], R[10], R[12]], ring_w=4, period=P)
    for k in range(3):
        ex = cx - 12 + int(hsh(k, 0, seed) * 24)
        ey = top + 22 + k * 32
        for (dx, col) in ((0, EMPH['VI'][2]), (1, EMPH['VI'][1]), (5, EMPH['VI'][2]), (6, EMPH['VI'][1])):
            put(c, ex + dx, ey, col, P)
        glow(c, ex + 3, ey, 8, EMPH['VI'][0], 0.25, period=P)


def tendrils(c, x0, x1, top, seed, n=4, L=(50, 100)):
    for k in range(n):
        x = x0 + int((x1 - x0) * (k + 0.5) / n)
        length = L[0] + int(hsh(k, 0, seed) * (L[1] - L[0]))
        ph = hsh(k, 1, seed) * 6.28
        for j in range(length):
            xx = x + 6 * math.sin(j * 0.09 + ph) + 3 * math.sin(j * 0.31 + ph * 2)
            col = VEIN[3] if (j // 3) % 2 else VEIN[2]
            put(c, xx, top + j, col, P)
            put(c, xx + 1, top + j, VEIN[1], P)
            if j % 11 == 5:
                put(c, xx - 1, top + j, VEIN[4], P)


def feat_VI():
    R = ST['VI']

    def eye_(c, x0, x1, s):
        eye(c, x0 + 40, 124, seed=s)

    def arch(c, x0, x1, s):
        eyes_arch(c, (x0 + x1) // 2, 92, 72, WALL1, R, s)

    def veins(c, x0, x1, s):
        tendrils(c, x0 + 10, x1 - 40, 44, s, n=4)
        for x in range(x0 + 50, x0 + 74):
            put(c, x, 140, VEIN[3], P)
            put(c, x, 141, VEIN[1], P)

    def plain(c, x0, x1, s):
        for k in range(18):
            x = x0 + int(hsh(k, 0, s) * (x1 - x0))
            y = 60 + int(hsh(k, 1, s) * 140)
            put(c, x, y, EMPH['VI'][2] if k % 3 else EMPH['VI'][3], P)

    return {'eye': eye_, 'arch': arch, 'veins': veins, 'plain': plain}


PLAN_VI = {'a': ['eye', 'arch', 'veins', 'plain'], 'b': ['veins', 'plain', 'eye', 'arch']}


def wall_VI(variant):
    c = blank(W, H)
    base_VI(c)
    run_bays(c, PLAN_VI, variant, feat_VI())
    for px in PILLARS:
        pillar_VI(c, px)
    return c


def floor_VI():
    R = ST['VI']
    c = blank(W, 128)
    tops = [int(2 + 5 * tnoise(x, 0, 620, 20, P)) for x in range(W)]
    for y in range(128):
        for x in range(W):
            if y < tops[x]:
                continue
            if y < 32:
                n = fbm(x, y, 621, 10, P, 2)
                col = stepped([R[4], R[5], R[6], R[7]], 0.3 + n * 0.6 - (y - tops[x]) / 70, x, y)
                if y == tops[x]:
                    col = R[9]
            elif y < 80:
                n = fbm(x, y, 622, 16, P, 2)
                col = stepped([R[2], R[3], R[4]], 0.35 + n * 0.5, x, y)
                if y == 32:
                    col = R[1]
            else:
                col = stepped([R[0], R[1], R[2]], 0.9 - (y - 80) / 60, x, y)
            c.p(x, y, col)
    # Veias que descem do meio-fio e somem no chão.
    for k in range(7):
        x = 24 + k * 92 + int(hsh(k, 0, 623) * 20)
        xx = x
        for j in range(4, 32 + int(hsh(k, 1, 623) * 20)):
            xx += 1 if hsh(j, k, 624) > 0.6 else (-1 if hsh(j, k, 624) < 0.35 else 0)
            put(c, xx, j, VEIN[3] if j % 3 else VEIN[2], P)
            put(c, xx + 1, j, VEIN[1], P)
    return c


def fore_VI_deco(c, R):
    for (x, y) in ((140, 56), (296, 54), (460, 58)):
        for (dx, col) in ((0, EMPH['VI'][2]), (1, EMPH['VI'][1]), (4, EMPH['VI'][2]), (5, EMPH['VI'][1])):
            put(c, x + dx, y, col, P)
    tendrils(c, 186, 200, 46, 640, n=1, L=(14, 18))
    tendrils(c, 316, 330, 48, 641, n=1, L=(12, 16))


def door_VI():
    R = ST['VI']
    c = blank(96, 384)
    for y0 in range(20, 266, 16):
        for y in range(y0, y0 + 14):
            ly = y - y0
            hw = 15 if 1 <= ly <= 12 else 13
            for x in range(48 - hw, 48 + hw):
                lx = x - (48 - hw)
                t = lx / (2 * hw)
                col = R[12] if t < 0.25 else (R[10] if t < 0.7 else R[8])
                if ly == 1:
                    col = R[13]
                if ly >= 12:
                    col = R[6]
                c.p(x, y, col)
        for y in range(y0 + 14, y0 + 16):
            for x in range(40, 56):
                c.p(x, y, R[2])
        for side in (-1, 1):
            for i in range(5):
                c.p(48 + side * (15 + i), y0 + 6, BONE_VI[3] if i < 3 else BONE_VI[1])
            c.p(48 + side * 15, y0 + 7, BONE_VI[0])
    eye(c, 48, 126, rx=10, ry=6, veins=False)
    for k in range(2):
        tendrils(c, 34 + k * 26, 36 + k * 26, 136, 650 + k, n=1, L=(50, 60))
    # Chifres curvos no alto.
    for side in (-1, 1):
        for i in range(30):
            a = i / 30
            x = 48 + side * (6 + 34 * a)
            y = 18 - 16 * math.sin(a * math.pi * 0.8)
            for k, col in enumerate((BONE_VI[4], BONE_VI[3], BONE_VI[1])):
                if a > 0.85 and k == 2:
                    continue
                c.p(x, y + k, col)
    c.outline(R[1])
    return c


def entry_VI():
    c, R = entry_frame('VI', wall_VI)
    stair(c, R, rail=True)
    for k in range(8):
        sx, sy = k * 16, 110 + k * 14
        for x in range(sx, sx + 16):
            c.p(x, sy, VEIN[2] if x % 3 else VEIN[3])
    vignette_left(c, R)
    return c


ACTS = {
    'II': {'wall-a': lambda: wall_II('a'), 'wall-b': lambda: wall_II('b'), 'floor': floor_II,
           'fore': lambda: fore_layer('II', fore_II_deco), 'door': door_II, 'entry': entry_II},
    'III': {'wall-a': lambda: wall_III('a'), 'wall-b': lambda: wall_III('b'), 'floor': floor_III,
            'fore': lambda: fore_layer('III', fore_III_deco), 'door': door_III, 'entry': entry_III},
    'IV': {'wall-a': lambda: wall_IV('a'), 'wall-b': lambda: wall_IV('b'), 'floor': floor_IV,
           'fore': lambda: fore_layer('IV', fore_IV_deco), 'door': door_IV, 'entry': entry_IV},
    'V': {'wall-a': lambda: wall_V('a'), 'wall-b': lambda: wall_V('b'), 'floor': floor_V,
          'fore': lambda: fore_layer('V', fore_V_deco), 'door': door_V, 'entry': entry_V},
    'VI': {'wall-a': lambda: wall_VI('a'), 'wall-b': lambda: wall_VI('b'), 'floor': floor_VI,
           'fore': lambda: fore_layer('VI', fore_VI_deco), 'door': door_VI, 'entry': entry_VI},
}
