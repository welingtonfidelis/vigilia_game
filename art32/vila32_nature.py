"""Natureza e marcos da vila em 32-bit: árvores (verde, seca, pinheiro, de outono), pedras,
samambaia, arbusto, taboa, cristais e espinheiro corrompidos, lápides, cerca torta e os
decalques (lápide, placa, estandarte, entulho).

Folhagem em tufos (cada tufo com a sua luz, por cima da luz da copa inteira), casca com
sulcos, pedra com facetas, luz de cima e da esquerda. Cada função devolve a peça 32-bit no
dobro da 16-bit, cobrindo o mesmo lugar.
"""
from __future__ import annotations

import math
from typing import Optional, Sequence

from vila32_base import (
    BROWNROCK, CLOTH_RED, CORRUPT, FOLIAGE, GOLD, GRAVESTONE, IRON, K, MOSSV, OL, PINEV, REDLEAF,
    ROCK, VIOLET, WOODV, cylinder, ellipse_pts, hsh, mask2, mul, noise, poly_pts, quant, rock, rock_shape,
    sphere, wood_px,
)

GREEN_OL = (30, 50, 36)
BARK = [(30, 22, 18), (48, 34, 26), (70, 50, 34), (94, 68, 44), (122, 92, 60)]
DEADWOOD = [(22, 16, 14), (36, 27, 22), (52, 39, 31), (72, 55, 42), (96, 76, 58)]
CATTAIL = [(52, 32, 22), (82, 52, 32), (112, 76, 46), (144, 104, 62), (172, 134, 86)]


# ── Utilidades de desenho ─────────────────────────────────────────────────

def seg_pts(x0: float, y0: float, x1: float, y1: float, w0: float, w1: Optional[float] = None, cap: bool = False) -> dict:
    """Pontos de um segmento grosso: {(x, y): (t ao longo, desvio com sinal)}."""
    w1 = w0 if w1 is None else w1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1.0
    ux, uy = dx / L, dy / L
    out = {}
    pad = max(w0, w1) + 2
    for y in range(int(min(y0, y1) - pad), int(max(y0, y1) + pad) + 1):
        for x in range(int(min(x0, x1) - pad), int(max(x0, x1) + pad) + 1):
            px, py = x + 0.5 - x0, y + 0.5 - y0
            t = (px * ux + py * uy) / L
            off = -px * uy + py * ux
            if not cap and (t < 0 or t > 1):
                continue
            tt = max(0.0, min(1.0, t))
            w = (w0 + (w1 - w0) * tt) / 2
            if cap and (t < 0 or t > 1):
                ex, ey = (px, py) if t < 0 else (x + 0.5 - x1, y + 0.5 - y1)
                if math.hypot(ex, ey) <= w:
                    out[(x, y)] = (tt, 0.0)
                continue
            if abs(off) <= w:
                out[(x, y)] = (t, off / max(w, 0.5))
    return out


def limb(pts: Sequence[tuple[float, float]], w0: float, w1: float) -> dict:
    """Galho/tronco como polilinha afinando de w0 a w1: {(x, y): desvio −1..1}."""
    total = sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))
    acc = 0.0
    out = {}
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        L = math.hypot(x1 - x0, y1 - y0)
        wa = w0 + (w1 - w0) * acc / total
        wb = w0 + (w1 - w0) * (acc + L) / total
        for p, (t, off) in seg_pts(x0, y0, x1, y1, wa, wb, cap=True).items():
            if p not in out or abs(off) < abs(out[p]):
                out[p] = off
        acc += L
    return out


def bark_col(x: int, y: int, off: float, pal=BARK, seed: int = 0, grooves: bool = True) -> tuple:
    """Casca: cilindro pela posição na largura (off −1..1) e sulcos no comprido."""
    v = cylinder(off) * 0.95
    if grooves:
        g = noise(x * 1.7, y / 4.0, seed, 1.0)
        if g > 0.64:
            v -= 0.22
        elif g < 0.2:
            v += 0.08
    return quant(v, pal, x, y, 0.4)


def crown(c: K, region: set, pal: Sequence, seed: int, rad: tuple = (3.4, 5.0), spacing: float = 4.6,
          speck: Optional[Sequence] = None, speck_p: float = 0.0, clip: Optional[set] = None, glob_k: float = 0.45) -> set:
    """Copa em tufos: centros num grade com tremor dentro da região; cada tufo tem a sua
    esfera de luz somada à luz da copa inteira; os de baixo cobrem os de cima e jogam
    sombra de 1 px no de trás. Devolve a silhueta (união dos tufos dentro de clip)."""
    xs = [p[0] for p in region]
    ys = [p[1] for p in region]
    X0, X1, Y0, Y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    CX, CY, RX, RY = (X0 + X1) / 2, (Y0 + Y1) / 2, (X1 - X0) / 2, (Y1 - Y0) / 2
    centers = []
    row = 0
    y = Y0 + spacing * 0.4
    while y < Y1:
        x = X0 + (spacing / 2 if row % 2 else 0) + spacing * 0.3
        while x < X1:
            jx = x + (hsh(int(x * 10), int(y * 10), seed) - 0.5) * spacing * 0.7
            jy = y + (hsh(int(x * 10), int(y * 10), seed + 1) - 0.5) * spacing * 0.6
            if (int(jx), int(jy)) in region:
                r = rad[0] + (rad[1] - rad[0]) * hsh(int(jx), int(jy), seed + 2)
                centers.append((jx, jy, r))
            x += spacing
        y += spacing * 0.8
        row += 1
    centers.sort(key=lambda t: (t[1], t[0]))
    clip = clip if clip is not None else region
    owner: dict = {}
    for i, (cx, cy, r) in enumerate(centers):
        for (x, y) in ellipse_pts(cx, cy, r, r * 0.88):
            if (x, y) in clip:
                owner[(x, y)] = i
    for (x, y), i in owner.items():
        cx, cy, r = centers[i]
        loc = sphere(x, y, cx, cy - 0.5, r, r * 0.88, 0.1)
        glob = sphere(x, y, CX, CY, RX * 1.05, RY * 1.05, 0.12)
        ny = (y + 0.5 - CY) / RY
        v = glob_k * glob + (1 - glob_k) * loc - 0.12 * max(0.0, ny) ** 2
        v += (hsh(x, y, seed + 3) - 0.5) * 0.04
        col = quant(v, pal, x, y, 0.0)
        if speck and hsh(x, y, seed + 4) < speck_p and v > 0.35:
            col = speck[int(hsh(x, y, seed + 5) * len(speck))]
        c.p(x, y, col)
    # Sombra que cada tufo joga no de trás, logo abaixo da sua borda.
    for (x, y), i in owner.items():
        k = owner.get((x, y - 1))
        if k is not None and k > i:
            c.p(x, y, mul(c.g(x, y), 0.72))
    # Folhinhas de luz soltas na parte acesa.
    for (x, y), i in owner.items():
        cx, cy, r = centers[i]
        if (x + 0.5 - cx) < -r * 0.2 and (y + 0.5 - cy) < -r * 0.2 and hsh(x, y, seed + 6) < 0.07:
            c.p(x, y, pal[-1])
    return set(owner)


def edge_ol(c: K, col=OL) -> None:
    c.outline_in(col)


# ── Árvores ───────────────────────────────────────────────────────────────

def trunk(c: K, x0: float, x1: float, top: int, bot: int, flare: float = 2.5, pal=BARK, seed: int = 0) -> None:
    """Tronco em pé, com sulcos e a raiz abrindo embaixo."""
    for y in range(top, bot + 1):
        t = max(0.0, (y - (bot - 4)) / 4)
        a, b = x0 - flare * t * t, x1 + flare * t * t
        for x in range(int(a), int(math.ceil(b))):
            off = (x + 0.5 - (a + b) / 2) / ((b - a) / 2)
            c.p(x, y, bark_col(x, y, off, pal, seed))


def leafy_tree(file: str, pal: Sequence, crown_bottom: int, trunk_box: tuple, seed: int, speck=None, speck_p=0.0,
               branch: Optional[list] = None, trunk_top: Optional[int] = None, rad=(3.4, 5.0), spacing=4.6) -> K:
    m = mask2(file)
    W = max(p[0] for p in m) + 1
    H = max(p[1] for p in m) + 1
    from vila32_base import load16
    W, H = load16(file).width * 2, load16(file).height * 2
    c = K(W, H)
    x0, x1, top, bot = trunk_box
    trunk(c, x0, x1, trunk_top if trunk_top is not None else top, bot, seed=seed)
    if branch:
        for (x, y), off in limb(branch, 4.0, 2.5).items():
            c.p(x, y, bark_col(x, y, off, BARK, seed + 1, grooves=False))
    region = {p for p in m if p[1] < crown_bottom}
    # Afina a região um pouco para os tufos saírem do contorno da 16-bit só nas pontas.
    grown = set(region)
    for (x, y) in region:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            grown.add((x + dx, y + dy))
    crown(c, region, pal, seed + 10, rad=rad, spacing=spacing, speck=speck, speck_p=speck_p, clip=grown)
    # Sombra da copa no alto do tronco.
    for y in range(crown_bottom - 2, crown_bottom + 4):
        for x in range(int(x0) - 3, int(x1) + 4):
            g = c.g(x, y)
            if g is not None and g in BARK:
                c.p(x, y, mul(g, 0.62))
    edge_ol(c)
    return c


def tree_01() -> K:
    return leafy_tree('export/png/prop-tree-01.png', FOLIAGE, 44, (27.5, 36.5, 40, 62), 200)


def tree_autumn_small() -> K:
    return leafy_tree('export/png/prop-tree-autumn-small.png', REDLEAF, 44, (27.5, 36.5, 40, 62), 210,
                      speck=[(240, 138, 52), (196, 150, 70), (150, 112, 52)], speck_p=0.02)


def tree_autumn() -> K:
    return leafy_tree('export/png/prop-tree-autumn.png', REDLEAF, 62, (27.5, 36.5, 70, 94), 220,
                      speck=[(240, 138, 52), (196, 150, 70), (150, 112, 52)], speck_p=0.018,
                      branch=[(35, 74), (40, 68), (43, 64)], trunk_top=56, rad=(4.6, 6.4), spacing=6.0)


def tree_dead() -> K:
    c = K(64, 64)
    parts = [
        ([(32.5, 63), (32.5, 40), (32, 30), (31.5, 24)], 9.0, 7.0),
        ([(30, 29), (26, 25), (24, 21), (22.5, 16), (21.5, 11), (21, 7)], 5.4, 3.0),
        ([(23, 17), (19.5, 15.5), (18, 14)], 3.4, 2.4),
        ([(34, 28), (39, 24), (41.5, 20), (44, 17), (47, 13), (49, 9)], 5.4, 3.0),
        ([(42, 20), (46, 20.5), (51, 21.5)], 3.6, 2.6),
        ([(31, 26), (33.5, 23), (34, 22)], 4.6, 4.0),
    ]
    shape = {}
    for pts, w0, w1 in parts:
        for p, off in limb(pts, w0, w1).items():
            if p not in shape or abs(off) < abs(shape[p]):
                shape[p] = off
    shape = {p: o for p, o in shape.items() if 0 <= p[0] < 64 and 0 <= p[1] < 63}
    for (x, y), off in shape.items():
        c.p(x, y, bark_col(x, y, off, DEADWOOD, 230))
    # Toco quebrado no alto do tronco (lascas claras) e um oco.
    for (x, y) in ((31, 22), (32, 22), (33, 23), (30, 23)):
        c.p(x, y, DEADWOOD[4])
    for (x, y) in ((32, 44), (33, 44), (32, 45), (33, 45), (32, 46)):
        c.p(x, y, (14, 10, 10))
    c.p(31, 44, DEADWOOD[1])
    c.p(31, 45, DEADWOOD[4])
    # Raízes.
    for (x, y), off in limb([(29, 60), (26, 62.5)], 3.0, 2.0).items():
        c.p(x, y, bark_col(x, y, off, DEADWOOD, 231, False))
    for (x, y), off in limb([(36, 60), (39, 62.5)], 3.0, 2.0).items():
        c.p(x, y, bark_col(x, y, off, DEADWOOD, 232, False))
    edge_ol(c)
    return c


def tree_pine() -> K:
    c = K(64, 96)
    cx = 32.0
    # Tronco embaixo.
    trunk(c, 27.5, 36.5, 72, 93, flare=2.0, seed=240)
    for y in range(74, 80):
        for x in range(26, 38):
            if c.has(x, y):
                c.shade(x, y, 0.6)
    # Andares de galhos, de baixo para cima (o de cima cobre o de baixo). Cada andar tem
    # prateleiras de galho de 5 px que caem para as pontas, com quina clara em cima e a
    # barriga escura; a esquerda pega luz e a direita fica na sombra.
    tiers = [(60, 75, 15, 30), (44, 59, 11, 24), (28, 43, 8, 18), (2, 27, 1, 12)]
    for k, (top, bot, hw0, hw1) in enumerate(tiers):
        pts = {}
        for y in range(top, bot + 3):
            t = (y - top) / (bot - top)
            hw = hw0 + (hw1 - hw0) * min(1.0, t)
            for x in range(64):
                d = abs(x + 0.5 - cx)
                u = (x + 0.5 - cx) / max(hw, 0.6)
                droop = (d / max(hw1, 1)) ** 1.5 * 4
                shelf_y = y - top - droop
                ly = int(shelf_y) % 5 if shelf_y >= 0 else 0
                # Pontas de cada prateleira passam um pouco da linha do andar.
                reach = hw + (1.5 if ly >= 3 else 0)
                if d > reach:
                    continue
                edge = bot - 1 + droop * 0.6 + (1.3 if ((x + k) // 3) % 2 else 0)
                if y > edge:
                    continue
                pts[(x, y)] = (u, ly, d / max(reach, 1))
        for (x, y), (u, ly, r) in pts.items():
            v = 0.66 - 0.42 * max(-1.0, min(1.0, u))
            d = abs(x + 0.5 - cx)
            brk = hsh(int(d) // 3, y // 5, 242 + k) < 0.65
            if ly == 0 and brk:
                v += 0.16
            elif ly == 4 and brk:
                v -= 0.22
            # Agulhas: riscos em diagonal, descendo para fora.
            v += (hsh(int((y - d * 0.9) / 2), int(d) // 2, 241 + k) - 0.5) * 0.22
            if (x, y + 1) not in pts:
                v -= 0.2
            if y < top + 3 and k < 3:
                v -= 0.2  # sombra do andar de cima
            c.p(x, y, quant(v, PINEV, x, y, 0.35))
        for (x, y) in pts:
            if any((x + dx, y + dy) not in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                if y > top + 2 or k == 3:
                    c.p(x, y, OL)
    edge_ol(c)
    return c


# ── Pedras ────────────────────────────────────────────────────────────────

def boulder(rocks: list, seed: int, moss: bool = True) -> K:
    c = K(64, 64)
    for i, (cx, cy, rx, ry, flat) in enumerate(rocks):
        pts = {p for p in rock_shape(cx, cy, rx, ry, seed + i, lump=0.1, flat_bottom=flat)}
        rock(c, pts, BROWNROCK, seed + 10 + i, facet=0.24, cracks=1 + i % 2, moss=MOSSV if (moss and i == 0) else None)
        for (x, y) in pts:
            if any((x + dx, y + dy) not in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                c.p(x, y, OL)
    # Capim no pé da pedra.
    return c


def boulder_01() -> K:
    return boulder([(31.0, 44.5, 18.5, 15.8, 59), (48.5, 53.5, 9.5, 8.0, 60)], 300)


def boulder_02() -> K:
    return boulder([(42.0, 47.0, 14.0, 11.0, 56), (21.0, 50.0, 9.0, 9.5, 58)], 310)


# ── Plantas baixas (contorno verde-escuro, como na 16-bit) ────────────────

def bush() -> K:
    c = K(40, 32)
    m = mask2('export/png/prop-bush.png')
    crown(c, m, FOLIAGE[1:] + [(150, 182, 108)], 400, rad=(3.0, 4.4), spacing=4.0, glob_k=0.5)
    edge_ol(c, GREEN_OL)
    # Base na sombra.
    for x in range(40):
        for y in (29, 30):
            g = c.g(x, y)
            if g is not None and g != GREEN_OL:
                c.p(x, y, mul(g, 0.75))
    return c


def sample(pts: list, step: float = 0.5) -> list:
    """Amostra uma polilinha em passos de ~step px: [(x, y, dx, dy, s)] (s = distância)."""
    out = []
    acc = 0.0
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        L = math.hypot(x1 - x0, y1 - y0) or 1.0
        n = max(1, int(L / step))
        for k in range(n):
            t = k / n
            out.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, (x1 - x0) / L, (y1 - y0) / L, acc + L * t))
        acc += L
    return out


def fern() -> K:
    """Samambaia: folhas em arco, nervura no meio e folíolos em riscos de 1 px inclinados
    para a ponta; a fresta entre os folíolos fica no verde-escuro do contorno."""
    c = K(44, 32)
    fronds = [
        ([(21, 30), (20, 21), (21, 12), (23, 5)], 6.0),
        ([(21, 30), (15, 23), (11, 16), (10, 11)], 5.5),
        ([(22, 30), (28, 22), (33, 15), (36, 12)], 5.5),
        ([(21, 30), (15, 26), (8, 22), (3, 22)], 5.0),
        ([(22, 30), (29, 27), (36, 20), (40, 18)], 5.0),
        ([(21, 30), (12, 28), (5, 27), (1, 29)], 4.5),
        ([(22, 30), (31, 27), (38, 26), (42, 28)], 4.5),
    ]
    for k, (pts, wmax) in enumerate(fronds):
        path = sample(pts, 0.5)
        total = path[-1][4] or 1.0
        for (x, y, dx, dy, d) in path:
            c.p(round(x - 0.5), round(y - 0.5), FOLIAGE[2])
        last = -9.0
        for (x, y, dx, dy, d) in path:
            t = d / total
            if d - last < 2.0 or t < 0.12:
                continue
            last = d
            ln = wmax * (1 - t) ** 0.6 * min(1.0, (t - 0.08) * 5)
            for side in (-1, 1):
                ax, ay = -dy * side * 0.8 + dx * 0.6, dx * side * 0.8 + dy * 0.6
                lit_side = (ax * -0.6 + ay * -0.8) > 0
                for j in range(1, int(round(ln)) + 1):
                    qx, qy = round(x - 0.5 + ax * j), round(y - 0.5 + ay * j)
                    if not (1 <= qx < 43 and 1 <= qy < 31):
                        continue
                    v = 0.98 - 0.2 * (j / max(1.0, ln)) + (0.1 if lit_side else -0.14) - 0.3 * (qy / 32) + 0.06 * (k == 0)
                    c.p(qx, qy, quant(v, FOLIAGE, qx, qy, 0.0))
    c.outline(GREEN_OL)
    return c


def reeds() -> K:
    """Taboa: três espigas marrons em hastes, lâminas compridas atrás e na frente."""
    c = K(28, 36)
    back = [([(3, 36), (2.5, 26), (1.5, 16)], 3.0), ([(25, 36), (25.5, 25), (26.5, 13)], 3.0), ([(16, 36), (17.5, 27), (20, 19)], 2.6)]
    front = [([(8, 36), (9, 27), (12, 18)], 3.0), ([(20, 36), (19.5, 30), (16.5, 22)], 2.6), ([(11, 36), (10, 31), (6, 24)], 2.6)]

    def blade(pts, w, k):
        for (x, y), off in limb(pts, w, 1.0).items():
            if 1 <= x < 27 and 1 <= y < 36:
                v = 0.72 - 0.3 * off - 0.32 * (y / 36) - (0.14 if k else 0)
                c.p(x, y, quant(v, FOLIAGE, x, y, 0.3))

    for pts, w in back:
        blade(pts, w, 1)
    for (sx, head_top, head_bot) in ((4, 9, 19), (13, 10, 21), (22, 6, 16)):
        for y in range(head_bot, 36):
            c.p(sx, y, FOLIAGE[3])
            c.p(sx + 1, y, FOLIAGE[2])
        for y in range(head_top - 4, head_top):
            c.p(sx, y, CATTAIL[2] if y > head_top - 3 else CATTAIL[3])
        for y in range(head_top, head_bot):
            for x in range(sx - 1, sx + 3):
                if y in (head_top, head_bot - 1) and x in (sx - 1, sx + 2):
                    continue
                u = (x + 0.5 - (sx + 1)) / 2
                v = cylinder(u) + (0.06 if (y + x) % 3 == 0 else -0.04) - 0.1
                c.p(x, y, quant(v, CATTAIL, x, y, 0.3))
    for pts, w in front:
        blade(pts, w, 0)
    c.outline(GREEN_OL)
    return c


# ── Corrompidos ───────────────────────────────────────────────────────────

def shard(c: K, base: tuple, tip: tuple, w: float, seed: int) -> None:
    """Lasca de cristal: prisma com três faces (clara, meio, escura), ponta e brilho na aresta."""
    (bx, by), (tx, ty) = base, tip
    pts = {}
    L = math.hypot(tx - bx, ty - by)
    ux, uy = (tx - bx) / L, (ty - by) / L
    for y in range(int(min(by, ty)) - 2, int(max(by, ty)) + 3):
        for x in range(int(min(bx, tx) - w - 2), int(max(bx, tx) + w + 3)):
            px, py = x + 0.5 - bx, y + 0.5 - by
            t = (px * ux + py * uy) / L
            off = (-px * uy + py * ux)
            if t < -0.05 or t > 1:
                continue
            half = w * (1 if t < 0.72 else (1 - t) / 0.28)
            if abs(off) <= half:
                pts[(x, y)] = (t, off / max(half, 0.5))
    for (x, y), (t, o) in pts.items():
        if o < -0.35:
            col = VIOLET[4]
        elif o < 0.3:
            col = VIOLET[3] if t > 0.3 else VIOLET[2]
        else:
            col = VIOLET[1]
        if t > 0.72 and o < 0.2:
            col = VIOLET[4]
        # Veios escuros por dentro (a corrupção).
        if noise(x, y, seed, 3) > 0.7 and -0.3 < o < 0.6:
            col = VIOLET[0]
        c.p(x, y, col)
    for (x, y), (t, o) in pts.items():
        if -0.6 < o < -0.25 and 0.15 < t < 0.85 and hsh(x, y, seed + 1) < 0.7:
            c.p(x, y, VIOLET[5])
    for (x, y) in pts:
        if any((x + dx, y + dy) not in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            c.p(x, y, OL)


def corrupt_base(c: K, cx: float, cy: float, rx: float, ry: float, seed: int, flat: int) -> None:
    pts = rock_shape(cx, cy, rx, ry, seed, lump=0.14, flat_bottom=flat)
    rock(c, pts, CORRUPT, seed + 1, facet=0.3, cracks=2)
    # Rachaduras que brilham.
    for (x, y) in pts:
        if noise(x, y, seed + 2, 2) > 0.78 and hsh(x, y, seed + 3) < 0.5:
            c.p(x, y, VIOLET[3])
    for (x, y) in pts:
        if any((x + dx, y + dy) not in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            c.p(x, y, OL)


def crystal_corrupt_01() -> K:
    c = K(32, 48)
    shard(c, (6.5, 42), (5, 22), 3.2, 500)
    shard(c, (26.5, 42), (29, 19), 3.4, 501)
    shard(c, (17.5, 44), (17.5, 8), 4.2, 502)
    corrupt_base(c, 16.0, 43.0, 16.0, 5.6, 503, 46)
    return c


def crystal_corrupt_02() -> K:
    c = K(48, 40)
    shard(c, (11, 30), (10.5, 14), 3.0, 510)
    shard(c, (40, 34), (40.5, 20), 3.2, 511)
    shard(c, (25.5, 32), (26, 8), 4.0, 512)
    corrupt_base(c, 15.0, 32.0, 14.0, 7.0, 513, 38)
    corrupt_base(c, 36.0, 33.0, 11.0, 6.0, 514, 38)
    shard(c, (31, 36), (33, 26), 2.0, 515)
    return c


def bramble_corrupt() -> K:
    """Espinheiro corrompido: o emaranhado segue o traçado dos ramos da 16-bit, mas cada ramo
    vira um caule de 3 px com luz da esquerda, espinhos claros e botões violeta que brilham."""
    from vila32_base import load16
    src = load16('export/png/prop-bramble-corrupt.png')
    sp = src.load()
    stem, buds = set(), []
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = sp[x, y]
            if a == 0 or (r, g, b) == OL:
                continue
            if (r, g, b) == (214, 120, 255):
                buds.append((x, y))
            stem.add((x, y))
    c = K(64, 44)
    shape: dict = {}
    for (x, y) in stem:
        for dx, dy in ((1, 0), (0, 1), (1, 1), (-1, 1)):
            q = (x + dx, y + dy)
            if q not in stem:
                continue
            if dx and dy and ((x + dx, y) in stem or (x, y + dy) in stem):
                continue
            for p, (t, off) in seg_pts(2 * x + 1, 2 * y + 1, 2 * q[0] + 1, 2 * q[1] + 1, 2.8).items():
                if p not in shape or abs(off) < abs(shape[p]):
                    shape[p] = off
        for p, (t, off) in seg_pts(2 * x + 1, 2 * y + 1, 2 * x + 1.01, 2 * y + 1, 2.8, cap=True).items():
            shape.setdefault(p, 0.0)
    for (x, y), off in shape.items():
        if 1 <= x < 63 and 1 <= y < 44:
            v = 0.52 + 0.18 * (-off) + (noise(x, y, 520, 3) - 0.5) * 0.2
            if (x - 1, y) not in shape or (x, y - 1) not in shape:
                v += 0.18
            if (x + 1, y) not in shape or (x, y + 1) not in shape:
                v -= 0.2
            c.p(x, y, quant(v, CORRUPT, x, y, 0.3))
    # Espinhos: pontas de 1–2 px para fora do caule.
    for (x, y) in list(shape):
        if not (2 <= x < 62 and 2 <= y < 42) or hsh(x, y, 521) > 0.09:
            continue
        for dx, dy in ((1, -1), (-1, -1), (1, 0), (-1, 0)):
            if (x + dx, y + dy) not in shape and (x - dx, y - dy) in shape:
                c.p(x + dx, y + dy, CORRUPT[4])
                if (x + 2 * dx, y + 2 * dy) not in shape and hsh(x, y, 522) < 0.5:
                    c.p(x + 2 * dx, y + 2 * dy, CORRUPT[3])
                break
    # Botões violeta que brilham onde a 16-bit tem o violeta.
    for (bx, by) in buds:
        x, y = 2 * bx, 2 * by
        for (dx, dy, k) in ((0, 0, 5), (1, 0, 4), (0, 1, 3), (1, 1, 2), (-1, 0, 3), (0, -1, 4), (2, 0, 2), (1, -1, 3)):
            if 1 <= x + dx < 63 and 1 <= y + dy < 44:
                c.p(x + dx, y + dy, VIOLET[k])
    c.outline()
    return c


# ── Lápides e cerca torta ─────────────────────────────────────────────────

def slab(c: K, pts: set, seed: int, moss_rows: int = 3) -> None:
    """Pedra lavrada vista de frente: quina clara à esquerda e em cima, escura à direita."""
    y1 = max(p[1] for p in pts)
    for (x, y) in pts:
        v = 0.6 + (noise(x, y, seed, 3) - 0.5) * 0.16 + (hsh(x, y, seed + 1) - 0.5) * 0.06
        left = (x - 1, y) not in pts
        right = (x + 1, y) not in pts or (x + 2, y) not in pts
        up = (x, y - 1) not in pts
        if left or (x - 2, y) not in pts:
            v += 0.22
        if up:
            v += 0.3
        if right:
            v -= 0.26
        c.p(x, y, quant(v, GRAVESTONE, x, y, 0.3))
    for (x, y) in pts:
        if y > y1 - moss_rows and hsh(x, y, seed + 2) < 0.4 + 0.15 * (y - (y1 - moss_rows)):
            c.p(x, y, MOSSV[1] if hsh(x, y, seed + 3) < 0.5 else MOSSV[2])


def grave_broken() -> K:
    c = K(28, 26)
    stump = poly_pts([(2, 26), (2, 11), (6, 7), (9, 9), (11, 6), (15, 10), (15, 26)])
    slab(c, stump, 600)
    for (x, y) in ((9, 9), (9, 10), (8, 11), (8, 12), (9, 13), (9, 14), (8, 15)):
        c.p(x, y, GRAVESTONE[1])
        c.p(x + 1, y, GRAVESTONE[4])
    for (x, y) in ((9, 12), (10, 12), (11, 12)):
        c.p(x, y, GRAVESTONE[2])
    for (x, y) in list(stump):
        if any((x + dx, y + dy) not in stump for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            c.p(x, y, OL)
    piece = poly_pts([(14, 26), (14, 18), (16, 16), (27, 17), (28, 19), (28, 26)])
    slab(c, piece, 601, moss_rows=2)
    for x in range(16, 27):
        c.p(x, 18, GRAVESTONE[5] if x < 22 else GRAVESTONE[4])
    for (x, y) in ((19, 21), (20, 21), (21, 21), (22, 21), (19, 23), (20, 23), (21, 23)):
        c.p(x, y, GRAVESTONE[1])
    for (x, y) in list(piece):
        if any((x + dx, y + dy) not in piece for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            c.p(x, y, OL)
    return c


def grave_leaning() -> K:
    c = K(24, 30)
    pts = set()
    for y in range(4, 28):
        t = (y - 4) / 24
        shift = round(4 * (1 - t))  # topo pende para a direita
        lx, rx = 4 + shift - (1 if y > 24 else 0), 19 + shift
        if y < 8:
            r = 8 - y
            lx += [0, 0, 1, 2, 4][min(4, r)]
            rx -= [0, 0, 1, 2, 4][min(4, r)]
        for x in range(lx, rx + 1):
            pts.add((x, y))
    slab(c, pts, 610, moss_rows=4)
    # Inscrição: duas linhas cavadas e uma cruz pequena.
    for i, y in enumerate((15, 19)):
        shift = round(4 * (1 - (y - 4) / 24))
        for x in range(8 + shift, 16 + shift):
            c.p(x, y, GRAVESTONE[1])
            c.p(x, y + 1, GRAVESTONE[4])
    sx = 12 + round(4 * (1 - (9 - 4) / 24))
    for (dx, dy) in ((0, 0), (0, 1), (0, 2), (-1, 1), (1, 1), (0, 3)):
        c.p(sx + dx, 9 + dy, GRAVESTONE[1])
    for (x, y) in ((10, 24), (11, 25), (17, 23)):
        c.p(x, y, GRAVESTONE[1])
    # Terra e capim no pé.
    for x in range(3, 22):
        c.p(x, 28, (58, 82, 44) if hsh(x, 28, 611) < 0.5 else (84, 110, 58))
        c.p(x, 27, (70, 98, 56) if hsh(x, 27, 612) < 0.4 else c.g(x, 27))
    edge_ol(c)
    return c


def board_seg(c: K, x0, y0, x1, y1, w: float, seed: int, lit_side: int = -1) -> None:
    pts = seg_pts(x0, y0, x1, y1, w)
    for (x, y), (t, off) in pts.items():
        k = (off + 1) / 2 * (w - 1)
        n = max(2, int(round(w)))
        kk = int(round(k)) if lit_side < 0 else int(round((w - 1) - k))
        col = wood_px(t * 40, int(off * 3 + seed), max(0, min(n - 1, kk)), n, WOODV[1:], seed)
        c.p(x, y, col)
    for (x, y) in pts:
        if any((x + dx, y + dy) not in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            c.p(x, y, OL)


def fence_crooked() -> K:
    c = K(68, 40)
    # De trás para a frente: tábua do chão, postes, travessas, tábua caída.
    board_seg(c, 28, 37.5, 46, 35.5, 5.0, 700)
    board_seg(c, 32.5, 22, 42.5, 34, 4.0, 701)
    board_seg(c, 42, 18, 43, 34, 5.0, 702)
    board_seg(c, 65, 18, 61, 39, 5.0, 703)
    board_seg(c, 2, 8, 7.5, 39, 5.0, 704)
    board_seg(c, 29, 8, 25.5, 39, 5.0, 705)
    board_seg(c, 0, 17, 32, 15, 5.0, 706)
    board_seg(c, 44, 25, 68, 15, 5.0, 707)
    # Pregos nas cruzes.
    for (x, y) in ((4, 16), (27, 15), (62, 17), (45, 24)):
        c.p(x, y, IRON[4])
        c.p(x + 1, y + 1, IRON[1])
    # Ponta lascada no alto de cada poste.
    for (x, y) in ((2, 9), (5, 8), (28, 9), (25, 8)):
        if c.g(x, y) not in (None, OL):
            c.p(x, y, WOODV[5])
    return c


# ── Decalques ─────────────────────────────────────────────────────────────

def decal_grave() -> K:
    c = K(20, 24)
    pts = set()
    for y in range(0, 21):
        for x in range(2, 18):
            if y < 4:
                r = 4 - y
                if x < 2 + [0, 1, 2, 3, 5][r] or x > 17 - [0, 1, 2, 3, 5][r]:
                    continue
            pts.add((x, y))
    slab(c, pts, 620, moss_rows=2)
    # Cruz cavada.
    for (x, y) in [(9, y) for y in range(5, 13)] + [(x, 8) for x in range(6, 13)]:
        c.p(x, y, GRAVESTONE[1])
        c.p(x + 1, y + 1 if x == 9 else y + 1, GRAVESTONE[4] if c.g(x + 1, y + 1) not in (GRAVESTONE[1],) else GRAVESTONE[1])
    for y in range(5, 13):
        c.p(9, y, GRAVESTONE[1])
        c.p(10, y, GRAVESTONE[2])
    for x in range(6, 14):
        c.p(x, 8, GRAVESTONE[1])
        c.p(x, 9, GRAVESTONE[2])
    c.p(10, 8, GRAVESTONE[1])
    # Monte de terra na frente.
    for y in range(20, 23):
        for x in range(0, 20):
            if y == 20 and (x < 1 or x > 18):
                continue
            v = 0.5 - 0.15 * (y - 20) + (hsh(x, y, 621) - 0.5) * 0.3
            c.p(x, y, quant(v, WOODV, x, y, 0.4))
    edge_ol(c)
    return c


def decal_sign() -> K:
    c = K(32, 32)
    for y in range(18, 31):
        for x in range(12, 20):
            c.p(x, y, wood_px(y, x, x - 12, 8, WOODV, 630))
    for x in range(12, 20):
        c.p(x, 18, WOODV[0])
        c.p(x, 19, mul(c.g(x, 19), 0.7))
    for y in range(2, 18):
        for x in range(2, 30):
            if 2 <= y < 4 or y >= 16 or x < 4 or x >= 28:
                fy = y < 4 or y >= 16
                k = (y - 2) if y < 4 else (y - 16) if y >= 16 else (x - 2 if x < 4 else x - 28)
                col = wood_px(x if fy else y, y if fy else x, k, 2, WOODV[1:], 631)
            else:
                k = (y - 4) % 4
                col = wood_px(x, y, k, 4, WOODV[2:], 632 + (y - 4) // 4)
            c.p(x, y, col)
    # Seta entalhada e cravos.
    for (x, y) in [(x, 10) for x in range(8, 22)] + [(19, 8), (20, 9), (19, 12), (20, 11)]:
        c.p(x, y, WOODV[1])
        c.p(x, y + 1, WOODV[4]) if c.g(x, y + 1) not in (WOODV[1],) and y == 10 else None
    for (x, y) in ((4, 3), (27, 3), (4, 16), (27, 16)):
        c.p(x, y, IRON[4])
    for (x, y) in ((2, 2), (29, 2), (2, 17), (29, 17)):
        c.px[y][x] = None
    edge_ol(c)
    return c


def decal_banner() -> K:
    c = K(32, 64)
    # Mastro com remate dourado.
    for y in range(3, 63):
        for x in range(13, 19):
            c.p(x, y, wood_px(y, x, x - 13, 6, WOODV, 640))
    for (x, y) in ellipse_pts(16.0, 2.0, 3.0, 2.4):
        v = sphere(x, y, 16.0, 2.0, 3.0, 2.4)
        c.p(x, y, quant(v, GOLD, x, y))
    c.hl(13, 4, 6, GOLD[1])
    # Travessa.
    for x in range(3, 19):
        c.p(x, 6, WOODV[4])
        c.p(x, 7, WOODV[2])
    c.p(3, 6, WOODV[3])
    for x in (6, 10, 14):
        c.p(x, 8, (60, 46, 36))
    # Pano vermelho com dobras, rabo de andorinha e o emblema dourado.
    for y in range(8, 40):
        for x in range(5, 17):
            if y > 34 and abs(x + 0.5 - 11) < (y - 34) * 1.2:
                continue
            fold = math.sin((x - 5) * 0.75 + 0.6) * 0.5 + 0.5
            v = 0.5 + 0.32 * fold - 0.22 * ((x - 5) / 11) - 0.1 * ((y - 8) / 32)
            c.p(x, y, quant(v, CLOTH_RED, x, y, 0.0))
    for x in range(5, 17):
        c.p(x, 8, CLOTH_RED[3])
    ex, ey = 10, 15
    for (dx, dy) in ((0, -3), (0, -2), (-3, 0), (-2, 0), (2, 0), (3, 0), (0, 2), (0, 3), (-1, -1), (1, -1), (-1, 1), (1, 1), (0, 0)):
        c.p(ex + dx, ey + dy, GOLD[2] if (dx, dy) != (0, 0) else GOLD[3])
    for (dx, dy) in ((1, -2), (-2, 1), (1, 2), (2, 1)):
        c.p(ex + dx, ey + dy, GOLD[1])
    edge_ol(c)
    return c


def decal_rubble() -> K:
    c = K(32, 32)
    # Monte de terra embaixo, blocos quebrados e uma tábua.
    base = poly_pts([(0, 31), (2, 26), (8, 21), (20, 19), (28, 21), (32, 26), (32, 31)])
    for (x, y) in base:
        v = 0.45 + (hsh(x, y, 650) - 0.5) * 0.3 - 0.1 * (y - 22) / 9
        c.p(x, y, quant(v, ROCK, x, y, 0.5) if hsh(x // 2, y // 2, 651) < 0.5 else quant(v, WOODV, x, y, 0.5))
    for (x, y) in base:
        if any((x + dx, y + dy) not in base for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            c.p(x, y, OL)
    board_seg(c, 23, 25, 31, 14, 3.4, 652)
    for i, (cx, cy, rx, ry) in enumerate(((10, 22, 5.5, 4.0), (19, 18, 6.0, 4.5), (6, 27, 4.5, 3.4), (16, 26, 6.0, 4.0), (25, 27, 4.4, 3.4))):
        pts = rock_shape(cx, cy, rx, ry, 660 + i, lump=0.22)
        rock(c, pts, ROCK, 670 + i, facet=0.35, cracks=0)
        for (x, y) in pts:
            if any((x + dx, y + dy) not in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                c.p(x, y, OL)
    return c
