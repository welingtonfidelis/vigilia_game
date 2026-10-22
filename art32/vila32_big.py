"""Peças grandes da vila em 32-bit: fonte termal (bacia cheia, vazia e a água por cima),
boca da caverna do abismo, portão da paliçada (aberto) e a torrinha do berrante.

As pedras da bacia e da caverna são separadas em blocos (agrupamento por k-médias dentro da
área de pedra da 16-bit no dobro) e cada bloco ganha volume próprio; a madeira é tora a tora
e tábua a tábua, com veio e ferragem. A silhueta segue a 16-bit no dobro.
"""
from __future__ import annotations

import math

from vila32_base import (
    BROWNROCK, FOLIAGE, GOLD, IRON, OL, K, MOSSV, ROCK, STEEL, TEAL, VIOLET, WOODV, cylinder, ellipse_pts,
    hsh, lit, load16, mask2, mul, noise, quant, rock, wood_px,
)

BONE_H = [(70, 64, 58), (106, 98, 88), (150, 140, 122), (190, 180, 160), (222, 214, 196), (242, 236, 222)]
ROPE = [(52, 36, 22), (86, 62, 38), (124, 92, 56), (158, 124, 78)]


# ── Utilidades ────────────────────────────────────────────────────────────

def classify(file: str, groups: dict) -> dict:
    """{grupo: conjunto de pixels 16-bit} pela cor (OL vai para 'ol')."""
    im = load16(file)
    p = im.load()
    out = {k: set() for k in groups}
    out['ol'] = set()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = p[x, y]
            if a == 0:
                continue
            if (r, g, b) == OL:
                out['ol'].add((x, y))
                continue
            for k, cols in groups.items():
                if (r, g, b) in cols:
                    out[k].add((x, y))
                    break
    return out


def up(pts: set) -> set:
    return {(2 * x + dx, 2 * y + dy) for (x, y) in pts for dx in (0, 1) for dy in (0, 1)}


def smooth_mask(file: str) -> set:
    return mask2(file, smooth=True)


def kmeans(pts: set, k: int, seed: int, iters: int = 12, sy: float = 1.3) -> list:
    """Divide a área em k blocos parecidos com pedras (k-médias; y pesa mais, pedras deitadas)."""
    P = sorted(pts)
    # Início: pontos mais afastados entre si (determinístico).
    cs = [P[int(hsh(seed, 0, 1) * len(P))]]
    while len(cs) < k:
        best, bd = None, -1
        for i in range(0, len(P), 3):
            x, y = P[i]
            d = min((x - cx) ** 2 + ((y - cy) * sy) ** 2 for cx, cy in cs)
            if d > bd:
                best, bd = P[i], d
        cs.append(best)
    cs = [(float(x), float(y)) for x, y in cs]
    for _ in range(iters):
        acc = [[0.0, 0.0, 0] for _ in cs]
        lab = {}
        for (x, y) in P:
            j = min(range(len(cs)), key=lambda i: (x - cs[i][0]) ** 2 + ((y - cs[i][1]) * sy) ** 2)
            lab[(x, y)] = j
            acc[j][0] += x
            acc[j][1] += y
            acc[j][2] += 1
        cs = [(a[0] / a[2], a[1] / a[2]) if a[2] else cs[i] for i, a in enumerate(acc)]
    cells = [set() for _ in cs]
    for p, j in lab.items():
        cells[j].add(p)
    return [c for c in cells if c]


def stones(c: K, area: set, k: int, pal, seed: int, joint=None, moss=None, warm=None) -> list:
    cells = kmeans(area, k, seed)
    joint = joint or pal[0]
    for i, cell in enumerate(cells):
        rock(c, cell, pal, seed + 3 * i, facet=0.3, cracks=1 if len(cell) > 60 else 0, moss=moss)
    lab = {p: i for i, cell in enumerate(cells) for p in cell}
    for (x, y), i in lab.items():
        for dx, dy in ((1, 0), (0, 1)):
            j = lab.get((x + dx, y + dy))
            if j is not None and j != i:
                c.p(x, y, joint)
    return cells


# ── Fonte termal ──────────────────────────────────────────────────────────

THERMAL = 'export/png/prop-thermal-basin.png'
STONE_COLS = {(78, 82, 92), (106, 112, 120), (154, 163, 171)}
WATER_COLS = {(47, 122, 120), (122, 200, 192), (250, 246, 234)}
GRASS_COLS = {(112, 146, 84), (90, 122, 74), (58, 90, 58)}
MINERAL = {(232, 224, 208), (200, 160, 80)}


def thermal(filled: bool) -> K:
    file = THERMAL if filled else 'export/png/prop-thermal-basin-empty.png'
    g = classify(THERMAL, {'stone': STONE_COLS, 'water': WATER_COLS, 'grass': GRASS_COLS, 'mineral': MINERAL})
    sil = smooth_mask(file)
    water = up(g['water'] | g['mineral'])
    grass = up(g['grass'])
    c = K(160, 128)
    area = {p for p in sil if p not in water and p not in grass}
    stones(c, area, 26, ROCK, 900, joint=ROCK[0], moss=MOSSV)
    grass_tufts(c, grass & sil, 908)
    # Fundo da bacia: água quente (cheia) ou lodo escuro (vazia).
    xs = [p[0] for p in water]
    ys = [p[1] for p in water]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    rx, ry = (max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2
    for (x, y) in water:
        d = math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)
        if filled:
            v = 0.85 - 0.55 * d + (noise(x, y, 901, 4) - 0.5) * 0.12
            col = quant(v, TEAL[1:5], x, y, 0.5)
        else:
            v = 0.55 - 0.4 * d + (noise(x, y, 902, 3) - 0.5) * 0.25
            col = quant(v, [(20, 16, 14), (34, 26, 20), (48, 38, 30), (40, 40, 48), (58, 58, 66)], x, y, 0.5)
        c.p(x, y, col)
    # Sombra da borda de pedra de cima no fundo.
    for (x, y) in water:
        if any((x, y - k) in area for k in (1, 2, 3)):
            c.p(x, y, mul(c.g(x, y), 0.7))
    if filled:
        # Marolas soltas (traço claro com a sombra embaixo) e brilhos.
        for i in range(12):
            x0 = round(cx - rx * 0.7 + hsh(i, 0, 903) * rx * 1.4)
            y0 = round(cy - ry * 0.6 + hsh(i, 1, 903) * ry * 1.2)
            L = 3 + int(hsh(i, 2, 903) * 5)
            for j in range(L):
                x, y = x0 + j, y0 + (1 if j in (0, L - 1) else 0)
                if (x, y) in water and (x, y + 1) in water:
                    c.p(x, y, TEAL[5] if 0 < j < L - 1 else TEAL[4])
                    c.p(x, y + 1, TEAL[1])
        for (x, y) in ((round(cx) - 6, round(cy) - 2), (round(cx) + 8, round(cy) + 3), (round(cx) - 1, round(cy) + 6)):
            c.p(x, y, (250, 246, 234))
            c.p(x + 1, y, TEAL[5])
    else:
        # Poças que sobraram e rachaduras no lodo.
        for (x, y) in water:
            if noise(x, y, 904, 5) > 0.72 and (x, y - 1) in water:
                c.p(x, y, (36, 70, 72) if noise(x, y, 905, 2) > 0.5 else (28, 54, 58))
    # Crosta mineral (enxofre e sal) na beira da frente.
    for (x, y) in up(g['mineral']):
        if hsh(x, y, 906) < 0.75:
            c.p(x, y, (200, 160, 80) if hsh(x // 2, y, 907) < 0.5 else (232, 224, 208))
    c.outline_in()
    return c


def grass_tufts(c: K, region: set, seed: int) -> None:
    """Tufos de capim na beira: folhas finas em pé (alternando claro e escuro), ponta clara
    e base na sombra."""
    ys = {}
    for (x, y) in region:
        ys.setdefault(x, []).append(y)
    for (x, y) in region:
        top = min(ys[x])
        t = (y - top) / max(1, max(ys[x]) - top)
        blade = (x + int(hsh(x, 0, seed) * 3)) % 3
        v = 0.85 - 0.5 * t - (0.15 if blade == 0 else 0)
        col = quant(v, FOLIAGE, x, y)
        if y == top:
            col = FOLIAGE[5]
        c.p(x, y, col)


def fill_holes(pts: set, w: int, h: int) -> set:
    """Fecha os buracos de uma máscara (o que não alcança a borda por fora vira dentro)."""
    outside, stack = set(), [(0, 0)]
    while stack:
        x, y = stack.pop()
        if (x, y) in outside or (x, y) in pts or not (-1 <= x <= w and -1 <= y <= h):
            continue
        outside.add((x, y))
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return {(x, y) for y in range(h) for x in range(w) if (x, y) not in outside}


def components(pts: set) -> list:
    out, seen = [], set()
    for p in pts:
        if p in seen:
            continue
        stack, comp = [p], set()
        while stack:
            q = stack.pop()
            if q in seen or q not in pts:
                continue
            seen.add(q)
            comp.add(q)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    stack.append((q[0] + dx, q[1] + dy))
        out.append(comp)
    return out


def thermal_basin() -> K:
    return thermal(True)


def thermal_basin_empty() -> K:
    return thermal(False)


def thermal_water() -> K:
    """A água por cima da bacia (o jogo põe com 90% de opacidade): sem contorno, com o olho
    d'água mais claro no meio, marolas e brilhos."""
    sil = fill_holes(smooth_mask('export/png/prop-thermal-water.png'), 160, 128)
    c = K(160, 128)
    xs = [p[0] for p in sil]
    ys = [p[1] for p in sil]
    cx, cy = 82.0, 70.0
    rx, ry = (max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2
    for (x, y) in sil:
        d = math.hypot((x + 0.5 - cx) / (rx * 0.8), (y + 0.5 - cy) / (ry * 0.8))
        v = 0.95 - 0.6 * d + (noise(x, y, 911, 4) - 0.5) * 0.14
        c.p(x, y, quant(v, TEAL[1:6], x, y, 0.6))
    for i in range(14):
        x0 = round(cx - rx * 0.7 + hsh(i, 0, 912) * rx * 1.4)
        y0 = round(cy - ry * 0.6 + hsh(i, 1, 912) * ry * 1.2)
        L = 3 + int(hsh(i, 2, 912) * 5)
        for j in range(L):
            x, y = x0 + j, y0 + (1 if j in (0, L - 1) else 0)
            if (x, y) in sil and (x, y + 1) in sil:
                c.p(x, y, TEAL[5] if 0 < j < L - 1 else TEAL[4])
                c.p(x, y + 1, TEAL[2])
    for (x, y) in ((76, 66), (77, 66), (90, 72), (84, 78), (70, 74)):
        if (x, y) in sil:
            c.p(x, y, (250, 246, 234))
    # Borda mais escura (a água mais rasa junto da pedra).
    for (x, y) in sil:
        if any((x + dx, y + dy) not in sil for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            c.p(x, y, TEAL[1])
    return c


# ── Caverna do abismo ─────────────────────────────────────────────────────

CAVE = 'export/png/prop-abyss-cave.png'


def abyss_cave() -> K:
    g = classify(CAVE, {'rock': {(138, 98, 58), (90, 62, 42), (42, 30, 22)}, 'vine': {(58, 90, 58), (90, 122, 74), (112, 146, 84)},
                        'hole': {(7, 6, 10), (48, 20, 70)}, 'steps': {(42, 42, 48)}})
    sil = smooth_mask(CAVE)
    hole = up(g['hole'] | g['steps'])
    # A boca: o que estiver cercado pelo buraco também é buraco (as juntas de OL lá dentro).
    c = K(160, 128)
    area = {p for p in sil if p not in hole}
    stones(c, area, 30, BROWNROCK, 920, joint=OL)
    hx = [p[0] for p in hole]
    hy = [p[1] for p in hole]
    hcx = (min(hx) + max(hx)) / 2
    top, bot = min(hy), max(hy)
    for (x, y) in hole:
        t = (y - top) / (bot - top)
        d = abs(x + 0.5 - hcx) / ((max(hx) - min(hx)) / 2)
        v = 0.5 - 0.35 * t + 0.25 * d + (noise(x, y, 921, 4) - 0.5) * 0.3
        col = quant(v, [(5, 4, 8), (10, 6, 16), (20, 10, 32), (36, 16, 56), (48, 20, 70)], x, y, 0.6)
        c.p(x, y, col)
    # Degraus descendo para o escuro, na boca.
    for k in range(5):
        y0 = bot - 2 - k * 4
        w = 22 - k * 3
        for y in range(y0 - 1, y0 + 1):
            for x in range(round(hcx - w), round(hcx + w)):
                if (x, y) in hole:
                    v = 0.45 - k * 0.08
                    c.p(x, y, quant(v + (0.15 if y == y0 - 1 else 0), [(16, 14, 20), (30, 30, 36), (42, 42, 48), (66, 66, 76), (90, 90, 100)], x, y, 0.4))
    # Brilhos violeta lá no fundo.
    for i in range(10):
        x = round(hcx - 14 + hsh(i, 0, 922) * 28)
        y = round(top + 6 + hsh(i, 1, 922) * (bot - top - 26))
        if (x, y) in hole:
            c.p(x, y, VIOLET[3] if i % 3 else VIOLET[5])
    for (x, y) in hole:
        if any((x + dx, y - k) in area for k in (1, 2) for dx in (0,)):
            c.p(x, y, mul(c.g(x, y), 0.5))
    c.outline_in()
    # Cipós: seguem o traçado verde da 16-bit, com folhinhas.
    for (x, y) in sorted(g['vine']):
        for dx in (0, 1):
            for dy in (0, 1):
                X, Y = 2 * x + dx, 2 * y + dy
                c.p(X, Y, FOLIAGE[2] if dx else FOLIAGE[3])
    for (x, y) in sorted(g['vine']):
        if hsh(x, y, 923) < 0.5:
            X, Y = 2 * x + (2 if hsh(x, y, 924) < 0.5 else -1), 2 * y + 1
            c.p(X, Y, FOLIAGE[4])
            c.p(X, Y - 1, FOLIAGE[5])
    return c


# ── Portão da paliçada (aberto) ───────────────────────────────────────────

def log_col(c: K, x0: int, w: int, top: int, bot: int, seed: int, point: bool = True) -> None:
    """Tora em pé (cilindro com casca) com ponta apontada no alto (corte claro)."""
    cx = x0 + w / 2
    for y in range(top, bot):
        for x in range(x0, x0 + w):
            u = (x + 0.5 - cx) / (w / 2)
            if point:
                tip = top + abs(u) * 6
                if y < tip:
                    continue
                if y < tip + 3:
                    # Faces do corte: esquerda clara, direita na sombra.
                    c.p(x, y, (196, 156, 100) if u < 0 else (150, 112, 70))
                    continue
            v = cylinder(u) * 0.95
            # Casca: fendas compridas (poucas) e nós.
            gr = noise(x * 1.3, y / 9.0, seed, 1.0)
            if gr > 0.72 and abs(u) < 0.8:
                v -= 0.2
            elif gr < 0.12:
                v += 0.07
            c.p(x, y, quant(v, WOODV, x, y, 0.25))


def gate_open() -> K:
    W, H = 160, 192
    c = K(W, H)
    # Torres: três toras de cada lado, com amarras de ferro.
    for side in (0, 1):
        for k in range(3):
            x0 = (3 + 10 * k) if side == 0 else (W - 3 - 10 * (3 - k))
            log_col(c, x0, 10, 52, 182, 930 + k + 5 * side)
        for yb in (104, 152):
            for x in range(2, 32):
                X = x if side == 0 else W - 1 - x
                c.p(X, yb, IRON[3])
                c.p(X, yb + 1, IRON[2])
                c.p(X, yb + 2, IRON[1])
            for k in range(3):
                bx = (7 + 10 * k) if side == 0 else (W - 8 - 10 * k)
                c.p(bx, yb + 1, STEEL[4])
        # Base de pedra.
        for y in range(182, 190):
            for x in range(2, 42):
                X = x if side == 0 else W - 1 - x
                blk = (x + (4 if y >= 186 else 0)) // 10
                v = 0.62 if y == 182 else 0.45 + (hsh(blk, y // 4, 931 + side) - 0.5) * 0.2
                if (x + (4 if y >= 186 else 0)) % 10 == 0 or y == 185:
                    v = 0.15
                c.p(X, y, quant(v, ROCK, X, y, 0.3))
    # Folhas do portão abertas, encostadas por dentro das torres (tábuas em pé, de quina).
    for side in (0, 1):
        x0 = 32 if side == 0 else W - 42
        for y in range(82, 190):
            for x in range(x0, x0 + 10):
                k = (x - x0) % 2
                col = WOODV[3] if k == 0 else WOODV[1]
                if side == 1:
                    col = WOODV[2] if k == 0 else WOODV[1]
                if noise(x, y / 4, 932 + side, 1) > 0.7:
                    col = mul(col, 0.8)
                c.p(x, y, col)
        for yb in (104, 160):
            for x in range(x0, x0 + 10):
                c.p(x, yb, IRON[3])
                c.p(x, yb + 1, IRON[1])
        # Mão-francesa sob a verga.
        for i in range(12):
            bx = (x0 + 10 + i) if side == 0 else (x0 - 1 - i)
            for d in range(3):
                c.p(bx, 82 + i - d + 2, WOODV[4] if d == 0 else WOODV[2])
            for d in range(3, 5):
                c.p(bx, 82 + i - d + 2, WOODV[1])
    # Verga: viga grossa de um lado ao outro, com cavilhas de ferro.
    for y in range(66, 82):
        for x in range(4, W - 4):
            col = wood_px(x, y, y - 66, 16, WOODV, 933)
            k = y - 66
            col = WOODV[5] if k == 0 else WOODV[4] if k < 3 else WOODV[1] if k > 13 else col
            c.p(x, y, col)
    for x in range(28, W - 28, 18):
        for (dx, dy, col) in ((0, 0, STEEL[3]), (1, 0, IRON[3]), (0, 1, IRON[3]), (1, 1, IRON[1]), (2, 1, OL), (1, 2, OL)):
            c.p(x + dx, 72 + dy, col)
    c.outline_in()
    # O vão do portão fica vazio (a passagem).
    return c


# ── Torrinha do berrante ──────────────────────────────────────────────────

HORN = 'export/png/prop-horn-stand.png'


def horn_stand() -> K:
    W, H = 144, 188
    c = K(W, H)
    # Pés de pedra.
    for x0 in (32, 96):
        for y in range(178, 186):
            for x in range(x0, x0 + 18):
                v = 0.85 if y == 178 else 0.5 + (hsh(x // 6, y // 4, 940) - 0.5) * 0.2
                if y == 181 or (x - x0) % 6 == 0 and y > 181:
                    v = 0.2
                c.p(x, y, quant(v, ROCK, x, y, 0.3))
    # Escada à direita: dois banzos e degraus a cada 12 px.
    for rx in (112, 121):
        for y in range(66, 184):
            c.p(rx, y, WOODV[3])
            c.p(rx + 1, y, WOODV[2])
    for y in range(72, 180, 12):
        for x in range(112, 123):
            c.p(x, y, WOODV[4])
            c.p(x, y + 1, WOODV[2])
    # Postes.
    for x0 in (36, 100):
        for y in range(46, 178):
            for x in range(x0, x0 + 12):
                c.p(x, y, wood_px(y, x, x - x0, 12, WOODV, 941 + x0))
    # Travessas e o X.
    for yb in (70, 160):
        for y in range(yb, yb + 6):
            for x in range(48, 100):
                c.p(x, y, wood_px(x, y, y - yb, 6, WOODV, 942 + yb))
        for x in (52, 94):
            c.p(x, yb + 2, STEEL[3])
            c.p(x + 1, yb + 3, IRON[1])
    for (a, b) in (((48, 78), (99, 158)), ((99, 78), (48, 158))):
        n = 80
        for i in range(n + 1):
            t = i / n
            x = round(a[0] + (b[0] - a[0]) * t)
            y = round(a[1] + (b[1] - a[1]) * t)
            for d in range(8):
                c.p(x, y + d - 4, WOODV[4] if d == 0 else (WOODV[1] if d == 7 else WOODV[3 - (d > 4)]))
    # Plataforma.
    for y in range(46, 62):
        for x in range(22, 122):
            k = y - 46
            col = wood_px(x, y, k % 8, 8, WOODV, 943 + k // 8)
            if k == 0:
                col = WOODV[5]
            c.p(x, y, col)
    for x in range(30, 120, 16):
        c.p(x, 52, STEEL[3])
        c.p(x + 1, 53, IRON[1])
    # Apoios do chifre e a corda.
    for x0 in (40, 92):
        for y in range(18, 46):
            for x in range(x0, x0 + 6):
                c.p(x, y, wood_px(y, x, x - x0, 6, WOODV, 944))
    for i in range(28):
        y = 26 + i
        x = round(70 + math.sin(i / 5) * 1.5)
        c.p(x, y, ROPE[2] if i % 2 else ROPE[3])
        c.p(x + 1, y, ROPE[1])
    # O chifre: cone de osso com anéis, bocal à esquerda e boca à direita.
    m = classify(HORN, {'horn': {(232, 224, 208), (160, 146, 124), (106, 112, 120), (78, 82, 92), (233, 192, 73), (200, 160, 80), (7, 6, 10)}})['horn']
    cols = {}
    for (x, y) in m:
        if y <= 22:
            cols.setdefault(x, []).append(y)
    span = {}
    for x16, ys in cols.items():
        span[x16] = (min(ys), max(ys))
    for x in range(4, 138):
        x16 = x // 2
        if x16 not in span:
            continue
        t0, t1 = span[x16]
        top, bot = 2 * t0 - 1, 2 * t1 + 2
        for y in range(top, bot):
            u = (y + 0.5 - (top + bot) / 2) / ((bot - top) / 2)
            v = lit(0, u, math.sqrt(max(0.0, 1 - u * u)) + 0.05, 0.2)
            ring = (x * 0.7 + u * 3) % 9
            if ring < 1.2:
                v -= 0.18
            c.p(x, y, quant(v, BONE_H, x, y, 0.4))
        # Faixas de ouro.
        if x16 in (15, 30, 47) or (x16 + 1) in (15, 30, 47) and x % 2:
            for y in range(top, bot):
                u = (y + 0.5 - (top + bot) / 2) / ((bot - top) / 2)
                v = lit(0, u, math.sqrt(max(0.0, 1 - u * u)) + 0.05, 0.2)
                c.p(x, y, quant(v, GOLD, x, y))
    # Boca do chifre (aro claro e o escuro de dentro).
    for (x, y) in ellipse_pts(131, 20, 5.5, 15):
        if x >= 126:
            c.p(x, y, (14, 12, 16) if (x, y) in ellipse_pts(132, 20, 3.5, 12.5) else BONE_H[4])
    c.outline_in()
    return c
