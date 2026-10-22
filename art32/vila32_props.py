"""Enfeites da vila em 32-bit: barril, caixote, balde, sacos, feno, bancos, lampião, cofre,
lenha, quadro de avisos, poço, carroça e fogueira (acesa e apagada).

Cada função devolve a imagem 32-bit (o dobro da 16-bit, mesmo enquadramento). Madeira com
veio e tábua a tábua, ferro com brilho, pedra com volume; luz de cima e da esquerda.
"""
from __future__ import annotations

import math

from vila32_base import (
    FIRE, GOLD, IRON, K, LINEN, OL, ROCK, ROOF_RED, STEEL, STRAW, TEAL, WARM_LIGHT, WOODV, cylinder,
    ellipse_pts, hsh, lit, mask2, mix, mul, noise, pillow, plank, poly_pts, quant, rect_pts, rock,
    rock_shape, wood_px,
)

SACK = [(92, 80, 62), (128, 116, 96), (160, 148, 124), (190, 178, 152), (214, 204, 180), (238, 232, 214)]
ROPE = [(52, 36, 22), (86, 62, 38), (124, 92, 56), (158, 124, 78)]
PAPER = [(150, 140, 120), (196, 186, 164), (224, 216, 196), (242, 236, 220)]
INK = (70, 62, 56)


# ── barril, caixote, balde ────────────────────────────────────────────────

def staves(c: K, cx: float, top: int, bot: int, hw, n: int, seed: int, pal=WOODV, skip=None) -> None:
    """Corpo de aduelas: cilindro com luz da esquerda, junta entre aduelas e veio."""
    for y in range(top, bot + 1):
        w = hw(y)
        for x in range(c.w):
            u = (x + 0.5 - cx) / w
            if abs(u) > 1 or (skip and skip(x, y)):
                continue
            s = int((math.asin(u) / math.pi + 0.5) * n)
            u2 = min(1.0, (x + 1.5 - cx) / w)
            s2 = int((math.asin(u2) / math.pi + 0.5) * n)
            v = cylinder(u) * (0.9 + 0.16 * hsh(s, 0, seed))
            g = noise(y / 3.0, s * 7.0, seed + 1, 1.0)
            if g > 0.66 and hsh(x, s, seed + 2) < 0.7:
                v -= 0.16
            elif g < 0.16:
                v += 0.1
            col = quant(v, pal[1:], x, y, 0.45)
            if s != s2 and abs(u) < 0.97:
                col = mul(col, 0.62)
            c.p(x, y, col)


def hoop(c: K, cx: float, y: int, hw, pal=IRON, rivets=(-0.35, 0.3)) -> None:
    for dy, k in ((0, 0.16), (1, -0.12)):
        w = hw(y + dy) + 0.3
        for x in range(c.w):
            u = (x + 0.5 - cx) / w
            if abs(u) > 1:
                continue
            c.p(x, y + dy, quant(cylinder(u) + k, pal[1:], x, y))
    w = hw(y + 2)
    for x in range(c.w):
        if abs((x + 0.5 - cx) / w) <= 1 and c.has(x, y + 2):
            c.shade(x, y + 2, 0.78)
    for r in rivets:
        rx = round(cx + r * hw(y) - 0.5)
        c.p(rx, y, STEEL[4])
        c.p(rx, y + 1, IRON[1])


def barrel() -> K:
    c = K(32, 32)
    cx, top, bot = 16.0, 10, 29
    hw = lambda y: 6.2 + 1.8 * math.sin(math.pi * (y - top + 0.5) / (bot - top + 1))
    staves(c, cx, 12, bot, hw, 7, 11)
    # Boca: a borda das aduelas (clara em cima) e a tampa rebaixada, com a sombra da borda de trás.
    rim = ellipse_pts(cx, 12.9, hw(12) + 0.1, 2.9)
    lid = ellipse_pts(cx, 13.1, hw(12) - 2.0, 1.8)
    for (x, y) in rim:
        c.p(x, y, WOODV[5] if y < 13 else WOODV[4])
    for (x, y) in lid:
        col = WOODV[3] if (x - 4) % 5 else WOODV[2]
        if (x, y - 1) not in lid:
            col = WOODV[1]
        elif (x - 1, y) not in lid:
            col = WOODV[2]
        c.p(x, y, col)
    for x in range(c.w):
        if (x, 15) not in rim and (x, 14) in rim and c.has(x, 15):
            c.p(x, 15, WOODV[2])
    hoop(c, cx, 16, hw)
    hoop(c, cx, 24, hw, rivets=(-0.45, 0.2))
    # Batoque na barriga e base no escuro.
    c.p(12, 20, WOODV[0])
    c.p(13, 20, WOODV[1])
    c.p(12, 21, WOODV[1])
    c.p(13, 21, WOODV[4])
    for x in range(c.w):
        for y in (27, 28):
            if c.has(x, y):
                c.shade(x, y, 0.84 if y == 27 else 0.72)
    c.outline_in()
    return c


def crate() -> K:
    c = K(32, 32)
    x0, y0, x1, y1 = 6, 10, 25, 29
    # Miolo: três tábuas deitadas, mais claras.
    for i, py in enumerate((14, 18, 22)):
        plank(c, x0 + 3, py, x1 - x0 - 5, 4, WOODV[2:], vertical=False, seed=20 + i)
    c.rect(x0 + 3, 26, x1 - x0 - 5, 1, WOODV[2])
    # Travessa em diagonal (de cima-esquerda para baixo-direita), 3 px.
    for t in range(0, 15):
        x = x0 + 4 + t
        y = y0 + 3 + round(t * 13 / 14)
        for d, col in ((-1, WOODV[4]), (0, WOODV[3]), (1, WOODV[3]), (2, WOODV[1])):
            c.p(x, y + d, col)
    # Moldura: quatro tábuas de 3 px, cantos com cantoneira de ferro e cravos.
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            fx = x - x0 < 3 or x1 - x < 3
            fy = y - y0 < 4 or y1 - y < 3
            if not (fx or fy):
                continue
            if fy:
                k = (y - y0) if y - y0 < 4 else (y - (y1 - 2))
                n = 4 if y - y0 < 4 else 3
                col = wood_px(x, y, k, n, WOODV[1:], 31)
            else:
                k = (x - x0) if x - x0 < 3 else (x - (x1 - 2))
                col = wood_px(y, x, k, 3, WOODV[1:], 32)
            c.p(x, y, col)
    for (cx, cy) in ((x0 + 1, y0 + 1), (x1 - 2, y0 + 1), (x0 + 1, y1 - 2), (x1 - 2, y1 - 2)):
        c.rect(cx, cy, 2, 2, IRON[2])
        c.p(cx, cy, IRON[4])
        c.p(cx + 1, cy + 1, IRON[1])
    for (nx, ny) in ((x0 + 1, 17), (x1 - 1, 17), (15, y0 + 1), (15, y1 - 1)):
        c.p(nx, ny, IRON[3])
    # Corte nos cantos de fora (como a 16-bit) e contorno.
    for (x, y) in ((x0, y0), (x1, y0), (x0, y0 + 1), (x1, y0 + 1), (x0 + 1, y0), (x1 - 1, y0),
                   (x0, y1), (x1, y1), (x0, y1 - 1), (x1, y1 - 1), (x0 + 1, y1), (x1 - 1, y1)):
        c.px[y][x] = None
    c.outline_in()
    return c


def bucket() -> K:
    c = K(32, 32)
    cx, top, bot = 16.0, 12, 29
    hw = lambda y: 9.6 - 1.3 * (y - top) / (bot - top)
    staves(c, cx, top, bot, hw, 8, 41)
    # Boca: borda clara e água com reflexo.
    rim = ellipse_pts(cx, 14.2, hw(13) + 0.2, 2.8)
    water = ellipse_pts(cx, 14.6, hw(13) - 1.8, 1.7)
    for (x, y) in rim:
        if (x, y) not in water:
            c.p(x, y, WOODV[5] if y <= 13 else WOODV[3])
    for (x, y) in water:
        t = (x - (cx - hw(13))) / (2 * hw(13))
        col = TEAL[2] if t > 0.35 else TEAL[3]
        if (x, y - 1) not in water:
            col = TEAL[1]
        c.p(x, y, col)
    for (x, y) in ((11, 15), (12, 15), (13, 15), (18, 16), (19, 16)):
        c.p(x, y, TEAL[5] if x < 15 else TEAL[4])
    hoop(c, cx, 18, hw)
    hoop(c, cx, 25, hw, rivets=(-0.4, 0.35))
    for x in range(c.w):
        if c.has(x, 28):
            c.shade(x, 28, 0.75)
    # Alça de ferro (arco um pouco pontudo, puxado pelo gancho), 2 px.
    pts = []
    for i in range(120):
        a = math.pi * i / 119
        r = 1.0 + 0.18 * math.sin(a) ** 6
        pts.append((cx - 0.5 - 7.6 * math.cos(a), 12.6 - 9.4 * r * math.sin(a) ** 0.85))
    for (x, y) in pts:
        c.p(round(x), round(y), IRON[2])
        c.p(round(x) + (1 if x < cx - 0.5 else -1), round(y), IRON[1])
    for (x, y) in pts:
        x, y = round(x), round(y)
        if c.g(x, y - 1) is None and y < 11:
            c.p(x, y - 1, IRON[4] if x < cx else IRON[3])
    for ex in (round(cx - 9.5), round(cx + 7.5)):
        c.rect(ex, 12, 2, 3, IRON[2])
        c.p(ex, 12, IRON[4])
    c.outline_in()
    return c


# ── sacos e feno ──────────────────────────────────────────────────────────

def sack(c: K, body: set, neck: set, flap: set, tone: float, seed: int, folds: list, tie_y: int) -> None:
    shape = body | neck | flap
    light = pillow(shape, r=5.5, amb=0.3)
    for (x, y), v in light.items():
        v = v * 0.85 + tone
        if (x + 2 * y) % 4 == 0 and hsh(x, y, seed) < 0.35:
            v -= 0.05  # trama da juta
        c.p(x, y, quant(v, SACK, x, y, 0.3))
    for path in folds:
        for (x, y) in path:
            if (x, y) in shape:
                c.p(x, y, mul(c.g(x, y), 0.82))
                if (x - 1, y) in shape:
                    c.p(x - 1, y, mix(c.g(x - 1, y), SACK[5], 0.3))
    # Boca franzida: pregas em pé no tufo de cima.
    for (x, y) in flap:
        if (x + y // 3) % 3 == 0 and (x, y - 1) in flap:
            c.p(x, y, mul(c.g(x, y), 0.85))
    # Amarração de corda no gargalo.
    xs = sorted(p[0] for p in shape if p[1] == tie_y)
    for x in range(xs[0], xs[-1] + 1):
        c.p(x, tie_y, ROPE[3] if x < xs[0] + 2 else ROPE[2])
        c.p(x, tie_y + 1, ROPE[0] if (x + tie_y) % 2 else ROPE[1])
    kx = xs[-1] - 1
    c.p(kx, tie_y, ROPE[3])
    c.p(kx + 1, tie_y + 2, ROPE[2])
    c.p(kx + 1, tie_y + 3, ROPE[1])
    c.p(kx + 2, tie_y + 4, ROPE[1])


def blob(cx: float, cy: float, rx: float, ry: float, e: float = 2.5) -> set:
    """Superelipse (|x|^e + |y|^e <= 1): forma de saco, mais cheia que a elipse."""
    out = set()
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            if abs((x + 0.5 - cx) / rx) ** e + abs((y + 0.5 - cy) / ry) ** e <= 1:
                out.add((x, y))
    return out


def sacks() -> K:
    c = K(32, 32)
    # Saco de trás (esquerda, mais baixo) e da frente (direita, mais alto e mais claro).
    lb = blob(8.8, 23.6, 7.6, 8.0, 2.6)
    ln = poly_pts([(5, 14), (13, 14), (12, 18), (6, 18)])
    lf = blob(9.0, 12.4, 4.6, 3.0, 2.2)
    rb = blob(24.0, 21.4, 7.9, 9.2, 2.6)
    rn = poly_pts([(19.5, 10), (28.5, 10), (27.5, 14), (20.5, 14)])
    rf = blob(24.0, 8.0, 5.0, 3.2, 2.2)
    for s in (lb, rb):
        for p in [p for p in s if p[1] > 30]:
            s.discard(p)
    sack(c, lb, ln, lf, -0.04, 3, [[(7, 19), (6, 20), (6, 21), (5, 22)], [(11, 19), (12, 20), (12, 21), (13, 22), (13, 23)], [(9, 27), (9, 28), (10, 29)]], 15)
    front = rb | rn | rf
    for (x, y) in front:
        c.px[y][x] = None
    sack(c, rb, rn, rf, 0.05, 5, [[(22, 15), (21, 16), (21, 17), (20, 18), (20, 19)], [(27, 15), (28, 16), (28, 17), (29, 18)], [(24, 25), (24, 26), (25, 27)]], 12)
    # Sombra do saco da frente no de trás e remendo costurado.
    for (x, y) in list(lb | ln | lf):
        if (x, y) not in front and ((x + 1, y) in front or (x + 2, y) in front):
            c.p(x, y, mul(c.g(x, y), 0.74))
    c.rect(23, 22, 4, 3, (176, 150, 112))
    c.rect(23, 22, 4, 1, (196, 172, 132))
    for (x, y) in ((22, 22), (22, 24), (27, 23), (24, 25), (26, 21)):
        c.p(x, y, SACK[1])
    # Fenda entre os dois no chão e contorno.
    for y in (29, 30):
        for x in range(c.w):
            if c.has(x, y) and (x, y) not in front and (x + 1, y) in front:
                c.px[y][x] = None
    c.outline_in()
    for (x, y) in list(front):
        if c.g(x, y) not in (None, OL) and (x - 1, y) not in front and c.g(x - 1, y) not in (None, OL):
            c.p(x - 1, y, mul(c.g(x - 1, y), 0.5))
    return c


def hay() -> K:
    c = K(32, 32)
    x0, x1 = 2, 29
    top, face, bot = 8, 13, 29
    for y in range(top, bot + 1):
        for x in range(x0, x1 + 1):
            if y in (top, bot) and (x < 4 or x > 27):
                continue
            if y == top + 1 and (x < 3 or x > 28):
                continue
            if y < face:
                # Tampa: palha deitada, clara, em fios na horizontal.
                v = 0.8 + (noise(x / 3.0, y * 3.0, 51, 1.0) - 0.5) * 0.35
                if hsh(y, x // 3, 52) < 0.2:
                    v -= 0.2
                col = quant(v, STRAW, x, y, 0.6)
            else:
                # Frente: fios em pé de comprimento variado, base mais escura.
                t = (y - face) / (bot - face)
                strand = hsh(x, (y + int(hsh(x, 0, 53) * 7)) // 4, 54)
                v = 0.72 - 0.42 * t + (strand - 0.5) * 0.32
                if x == x0 + 1 or (x - x0) % 9 == 0:
                    v -= 0.1
                col = quant(v, STRAW, x, y, 0.5)
            c.p(x, y, col)
    # Quina da tampa com a frente.
    for x in range(x0 + 1, x1):
        c.p(x, face, STRAW[2] if hsh(x, 1, 55) < 0.6 else STRAW[1])
    # Duas amarras de barbante em volta do fardo (passam pela tampa também).
    for bx in (11, 21):
        for y in range(top, bot):
            for dx, col in ((0, ROPE[2]), (1, ROPE[1])):
                cc = col if y >= face else (ROPE[3] if dx == 0 else ROPE[2])
                if (y + dx) % 3 == 0:
                    cc = mul(cc, 0.8)
                c.p(bx + dx, y, cc)
        for y in range(top + 1, bot):
            if c.has(bx - 1, y) and y >= face:
                c.shade(bx - 1, y, 0.85)
    # Palhas soltas para fora.
    for (x, y) in ((0, 14), (1, 14), (1, 15), (30, 18), (31, 19), (30, 19), (12, 6), (12, 7), (13, 5), (24, 7), (25, 6)):
        c.p(x, y, STRAW[3] if y < 10 else STRAW[2])
    for x in range(x0, x1 + 1):
        for y in (bot - 1, bot):
            if c.has(x, y):
                c.shade(x, y, 0.82)
    c.outline_in()
    return c


# ── bancos e lampião ──────────────────────────────────────────────────────

def thermal_bench() -> K:
    """Banco de pedra da fonte termal: laje sobre dois pés."""
    c = K(32, 32)
    slab = rect_pts(1, 12, 30, 8) | rect_pts(0, 14, 32, 5)
    for (x, y) in slab:
        if y <= 14:
            v = 0.86 if y == 13 else 0.74
        elif y <= 16:
            v = 0.56
        else:
            v = 0.42
        v += (noise(x, y, 61, 3) - 0.5) * 0.15
        if x <= 1:
            v += 0.06
        c.p(x, y, quant(v, ROCK, x, y, 0.6))
    for lx in (2, 20):
        for (x, y) in rect_pts(lx, 20, 10, 10):
            if y == 29 and x in (lx, lx + 9):
                continue
            t = (x - lx) / 9
            v = 0.62 - 0.32 * t - 0.12 * (y == 20)
            v += (noise(x, y, 62, 3) - 0.5) * 0.14
            c.p(x, y, quant(v, ROCK, x, y, 0.6))
        c.rect(lx + 1, 20, 8, 1, ROCK[1])
    # Rachadura, lascas e musgo.
    for (x, y) in ((9, 15), (10, 16), (10, 17), (11, 18)):
        c.p(x, y, ROCK[1])
    c.p(9, 14, ROCK[4])
    for (x, y) in ((24, 17), (25, 18), (26, 18), (3, 27), (4, 28), (21, 28), (22, 27)):
        c.p(x, y, (74, 102, 58) if (x + y) % 2 else (58, 82, 46))
    c.hl(2, 13, 28, ROCK[5])
    c.outline_in()
    return c


def bench() -> K:
    c = K(64, 32)
    # Assento visto por cima (atrás do encosto, na sombra).
    for y in range(8, 12):
        for x in range(4, 60):
            col = wood_px(x, y, y - 8, 4, WOODV, 71)
            c.p(x, y, mul(col, 0.62))
    # Encosto: tábua deitada.
    c.rect(2, 2, 60, 6, WOODV[2])
    plank(c, 2, 2, 60, 6, WOODV[1:], vertical=False, seed=72)
    # Pés do encosto passando por trás do assento.
    for px in (8, 52):
        plank(c, px, 4, 4, 8, WOODV, vertical=True, seed=73)
        c.p(px + 1, 4, IRON[3])
    # Assento: quina de cima clara e frente em duas tábuas.
    for x in range(2, 62):
        c.p(x, 12, WOODV[5] if hsh(x, 12, 74) > 0.1 else WOODV[4])
        c.p(x, 13, WOODV[4])
    plank(c, 2, 14, 60, 2, WOODV[2:], vertical=False, seed=75, knot=False)
    plank(c, 2, 16, 60, 2, WOODV[1:], vertical=False, seed=76, knot=False)
    for x in (6, 57):
        c.p(x, 14, IRON[3])
        c.p(x, 16, IRON[2])
    # Pernas com travessa.
    for lx in (6, 50):
        for y in range(18, 28):
            for x in range(lx, lx + 8):
                k = x - lx
                col = wood_px(y, x, k, 8, WOODV, 77)
                if k < 2:
                    col = mul(col, 0.85)
                c.p(x, y, col)
        for y in (18, 19):
            for x in range(lx, lx + 8):
                c.shade(x, y, 0.7)
    for y in (22, 23, 24, 25, 26, 27):
        for x in range(14, 50):
            if y in (24, 25):
                c.p(x, y, WOODV[3] if y == 24 else WOODV[2])
    # Cantos de fora arredondados (como a 16-bit) e contorno.
    for (x, y) in ((2, 2), (61, 2), (2, 7), (61, 7), (2, 12), (61, 12), (2, 17), (61, 17)):
        c.px[y][x] = None
    for y in range(8, 12):
        for x in (2, 3, 60, 61):
            c.px[y][x] = None
    for y in range(18, 28):
        for x in range(0, 64):
            if not (6 <= x < 14 or 50 <= x < 58 or (14 <= x < 50 and y in (23, 24, 25, 26))):
                c.px[y][x] = None
    for x in range(14, 50):
        c.p(x, 23, OL)
        c.p(x, 26, OL)
    c.outline_in()
    # Linha escura entre encosto, sombra e assento.
    for x in range(3, 61):
        c.p(x, 8, OL if c.g(x, 8) is not None else None)
    return c


def lamp() -> tuple[K, K]:
    c = K(32, 64)
    lights = K(32, 64)
    DARK = [(20, 20, 26), (34, 34, 42), (48, 50, 60), (70, 76, 88), (104, 112, 126)]
    # Poste de ferro batido (cilindro escuro) com anéis.
    for y in range(18, 60):
        for x in range(12, 20):
            u = (x + 0.5 - 16) / 4
            v = cylinder(u) - 0.12 + (0.05 if (y // 3) % 5 == 0 and u < 0 else 0)
            c.p(x, y, quant(v, DARK, x, y, 0.4))
    for ry in (24, 40):
        for x in range(11, 21):
            u = (x + 0.5 - 16) / 5
            c.p(x, ry, quant(cylinder(u) + 0.12, DARK, x, ry))
            c.p(x, ry + 1, quant(cylinder(u) - 0.25, DARK, x, ry))
    # Pé em degraus.
    for i, (y, half) in enumerate(((54, 5), (55, 5), (56, 6), (57, 6), (58, 7), (59, 7), (60, 8), (61, 8), (62, 8))):
        for x in range(16 - half, 16 + half):
            u = (x + 0.5 - 16) / half
            k = 0.12 if i in (0, 2, 4, 6) else -0.12
            c.p(x, y, quant(cylinder(u) + k - 0.05, DARK, x, y, 0.3))
    # Capitel e braço no alto, com voluta embaixo do braço.
    for x in range(8, 26):
        u = (x + 0.5 - 16) / 10
        c.p(x, 16, DARK[3] if x < 17 else DARK[2])
        c.p(x, 17, DARK[2])
        c.p(x, 18, DARK[1])
    c.hl(9, 15, 15, DARK[2])
    c.hl(10, 15, 6, DARK[3])
    for (x, y) in ((19, 19), (20, 20), (21, 20), (22, 19), (19, 20)):
        c.p(x, y, DARK[2])
    # Lanterna pendurada à direita: gancho, telhadinho, armação, vidros e chama.
    c.p(23, 19, DARK[3])
    c.p(23, 20, DARK[2])
    for i, y in enumerate(range(21, 25)):
        for x in range(23 - i - 2, 23 + i + 3):
            c.p(x, y, DARK[4] if x < 22 - i // 2 else (DARK[3] if x < 24 else DARK[2]))
    c.p(23, 21, DARK[4])
    c.hl(15, 25, 16, DARK[3])
    c.hl(15, 26, 16, DARK[1])
    for y in range(27, 36):
        for x in range(16, 30):
            if x in (16, 17, 28, 29):
                c.p(x, y, (DARK[3], DARK[2], DARK[2], DARK[1])[(16, 17, 28, 29).index(x)])
                continue
            t = ((x - 18) / 10 + (y - 27) / 9) / 2
            col = mix((70, 62, 52), (28, 26, 30), t)
            if 0 <= (x - 18) - (y - 27) * 0.7 <= 1 and y < 31:
                col = (124, 122, 116)
            c.p(x, y, col)
            g = 1 - math.hypot((x - 22.5) / 7, (y - 32) / 7)
            lights.p(x, y, quant(0.25 + g * 1.1, WARM_LIGHT, x, y, 0.8))
    # Vela no meio, com a chama em gota.
    c.rect(22, 33, 2, 3, LINEN[3])
    c.p(23, 33, LINEN[2])
    c.p(23, 34, LINEN[1])
    c.p(23, 35, LINEN[1])
    for (x, y, k) in ((22, 32, 2), (23, 32, 1), (22, 31, 3), (23, 31, 2), (22, 30, 2), (22, 29, 1)):
        c.p(x, y, FIRE[k])
        lights.p(x, y, WARM_LIGHT[3])
    for (x, y) in ((22, 33), (23, 33)):
        lights.p(x, y, WARM_LIGHT[3])
    c.hl(15, 36, 16, DARK[3])
    c.hl(16, 37, 14, DARK[1])
    c.p(22, 38, DARK[2])
    c.p(23, 38, DARK[1])
    c.outline_in()
    return c, lights


# ── cofre, lenha, quadro ──────────────────────────────────────────────────

def coffer() -> K:
    c = K(64, 64)
    x0, x1 = 10, 53
    # Tampa: duas tábuas deitadas com a curva (mais clara em cima).
    for y in range(18, 30):
        for x in range(x0, x1 + 1):
            k = (y - 18) % 6
            col = wood_px(x, y, k, 6, WOODV[1:], 81 + (y - 18) // 6)
            if y < 20:
                col = mix(col, WOODV[5], 0.35)
            c.p(x, y, col)
    for x in range(x0, x1 + 1):
        c.p(x, 18, WOODV[5])
    # Faixa de ferro da tampa e a fresta.
    for x in range(x0, x1 + 1):
        c.p(x, 28, IRON[3] if x < 32 else IRON[2])
        c.p(x, 29, IRON[1])
        c.p(x, 30, OL)
    # Corpo: três tábuas, mais escuras.
    for y in range(31, 54):
        for x in range(x0, x1 + 1):
            k = (y - 31) % 8 if y < 55 else 0
            col = wood_px(x, y, k, 8, WOODV, 84 + (y - 31) // 8)
            c.p(x, y, col)
    for y in (54, 55):
        for x in range(x0, x1 + 1):
            c.p(x, y, WOODV[0] if y == 55 else WOODV[1])
    # Cintas de ferro (lados e meio), com rebites.
    for sx, w in ((11, 3), (30, 4), (50, 3)):
        for y in range(18, 56):
            if y in (28, 29, 30):
                continue
            for x in range(sx, sx + w):
                col = IRON[3] if x == sx else (IRON[1] if x == sx + w - 1 else IRON[2])
                if y == 18:
                    col = STEEL[3]
                c.p(x, y, col)
            if y % 6 == 3:
                c.p(sx + w // 2, y, STEEL[4])
    # Cantoneiras.
    for (cx, cy, dx, dy) in ((x0, 31, 1, 1), (x1, 31, -1, 1), (x0, 55, 1, -1), (x1, 55, -1, -1)):
        for i in range(5):
            c.p(cx + dx * i, cy, IRON[2])
            c.p(cx, cy + dy * i, IRON[2])
        c.p(cx + dx, cy + dy, STEEL[4])
    # Fechadura de ouro com buraco da chave.
    lx, ly = 28, 31
    for y in range(ly, ly + 9):
        for x in range(lx, lx + 8):
            t = (x - lx) / 7
            col = GOLD[3] if (x == lx or y == ly) else (GOLD[0] if (x == lx + 7 or y == ly + 8) else (GOLD[2] if t < 0.5 else GOLD[1]))
            c.p(x, y, col)
    c.rect(lx + 3, ly + 3, 2, 2, (12, 10, 14))
    c.p(lx + 3, ly + 5, (12, 10, 14))
    c.p(lx + 4, ly + 5, (12, 10, 14))
    c.p(lx + 3, ly + 6, (12, 10, 14))
    c.p(lx + 1, ly + 1, (255, 248, 200))
    # Alça de cima (argola) e cantos cortados.
    for (x, y) in ((x0, 18), (x1, 18), (x0, 56), (x1, 56)):
        c.px[y][x] = None
    for x in range(x0, x1 + 1):
        c.p(x, 56, OL)
        c.p(x, 57, OL)
    c.px[57][x0] = None
    c.px[57][x1] = None
    c.outline_in()
    return c


ENDWOOD = [(84, 58, 32), (112, 80, 44), (140, 104, 60), (166, 128, 76), (192, 156, 100), (214, 182, 126)]


def log_end(c: K, cx: float, cy: float, rx: float, ry: float, seed: int) -> None:
    """Topo de tora: casca, anéis de crescimento finos, cerne e uma rachadura; luz de cima-esquerda."""
    ang = hsh(seed, 1, 3) * math.pi * 2
    for (x, y) in ellipse_pts(cx, cy, rx, ry):
        dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
        r = math.sqrt(dx * dx + dy * dy)
        if r > 0.8:
            col = WOODV[3] if (dx + dy) < -0.5 else (WOODV[2] if (dx + dy) < 0.4 else WOODV[1])
        else:
            v = 0.62 - 0.22 * (dx + dy) * 0.6 + (noise(x, y, seed, 3) - 0.5) * 0.1
            rr = r * rx + (noise(x, y, seed + 1, 2) - 0.5) * 0.9
            if int(rr) % 2 == 1 and r > 0.22:
                v -= 0.2
            if r < 0.16:
                v = 0.15
            col = quant(v, ENDWOOD, x, y, 0.3)
        c.p(x, y, col)
    # Rachadura do cerne até perto da casca.
    for i in range(1, int(rx * 0.78)):
        c.p(round(cx - 0.5 + math.cos(ang) * i), round(cy - 0.5 + math.sin(ang) * i * ry / rx), ENDWOOD[0])


def bark_log(c: K, x0: int, x1: int, cy: float, r: float, seed: int) -> None:
    """Tora deitada vista de lado: casca com fendas no comprido, luz de cima."""
    for y in range(int(cy - r), int(cy + r) + 1):
        ny = (y + 0.5 - cy) / r
        if abs(ny) > 1:
            continue
        for x in range(x0, x1):
            v = lit(0, ny, math.sqrt(max(0, 1 - ny * ny)) + 0.05, 0.12)
            g = noise(x / 6.0, y * 1.7, seed, 1.0)
            if g > 0.62:
                v -= 0.25
            elif g < 0.18:
                v += 0.08
            c.p(x, y, quant(v, WOODV, x, y, 0.5))


def logs() -> K:
    c = K(64, 32)
    # Fundo da pilha (as frestas entre as toras ficam no escuro), na silhueta da 16-bit.
    for (x, y) in mask2('export/png/prop-logs.png'):
        c.p(x, y, WOODV[0])
    # Fileira de trás: duas toras, com a casca indo para a direita.
    bark_log(c, 17, 50, 12.0, 6.0, 91)
    log_end(c, 17.0, 12.5, 6.2, 6.2, 92)
    log_end(c, 33.0, 12.5, 6.2, 6.2, 93)
    # Fileira da frente: três toras e a casca da última até a ponta.
    bark_log(c, 42, 59, 22.5, 7.0, 94)
    for i, cx in enumerate((9.0, 25.0, 41.0)):
        log_end(c, cx, 22.5, 7.2, 7.2, 95 + i)
    for x in range(2, 60):
        if c.has(x, 29):
            c.shade(x, 29, 0.75)
    c.outline_in()
    return c


def paper(c: K, x0: int, y0: int, w: int, h: int, seed: int, pin=(196, 60, 60), curl: bool = False) -> None:
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            v = 0.85 - 0.3 * ((x - x0) / w) * 0.5 - 0.25 * ((y - y0) / h)
            c.p(x, y, quant(v, PAPER, x, y, 0.5))
    # Linhas de texto (traços curtos).
    for ly in range(y0 + 4, y0 + h - 2, 2):
        x = x0 + 2
        while x < x0 + w - 2:
            n = 1 + int(hsh(x, ly, seed) * 4)
            for i in range(n):
                if x + i < x0 + w - 2:
                    c.p(x + i, ly, INK if hsh(x + i, ly, seed + 1) < 0.85 else PAPER[1])
            x += n + 1
    # Sombra embaixo e à direita (sobre a tábua).
    for y in range(y0 + 1, y0 + h + 1):
        c.shade(x0 + w, y, 0.6)
    for x in range(x0 + 1, x0 + w + 1):
        c.shade(x, y0 + h, 0.6)
    if curl:
        c.p(x0 + w - 1, y0 + h - 1, PAPER[0])
        c.p(x0 + w - 2, y0 + h - 1, PAPER[1])
        c.p(x0 + w - 1, y0 + h - 2, PAPER[1])
    px = x0 + w // 2
    c.p(px - 1, y0, mul(pin, 0.7))
    c.p(px, y0, pin)
    c.p(px, y0 - 1, mix(pin, (255, 255, 255), 0.4))
    c.p(px - 1, y0 - 1, pin)


def board() -> K:
    c = K(64, 64)
    # Pés.
    for lx in (8, 48):
        for y in range(40, 61):
            for x in range(lx, lx + 8):
                c.p(x, y, wood_px(y, x, x - lx, 8, WOODV, 101))
        for x in range(lx, lx + 8):
            c.p(x, 44, mul(c.g(x, 44), 0.7))
            c.p(x, 45, mul(c.g(x, 45), 0.85))
    # Moldura e fundo de tábuas em pé, mais escuras.
    for y in range(10, 44):
        for x in range(4, 60):
            c.p(x, y, mul(wood_px(y, x, (x - 4) % 6, 6, WOODV, 102), 0.86))
    for y in range(10, 44):
        for x in range(4, 60):
            if 4 <= x < 10 or 54 <= x < 60 or 10 <= y < 14 or 38 <= y < 44:
                if 10 <= y < 14 or 38 <= y < 44:
                    k = (y - 10) if y < 14 else (y - 38)
                    col = wood_px(x, y, k, 4 if y < 14 else 6, WOODV[1:], 103)
                else:
                    k = (x - 4) if x < 10 else (x - 54)
                    col = wood_px(y, x, k, 6, WOODV[1:], 104)
                c.p(x, y, col)
    for y in range(14, 38):
        c.p(10, y, WOODV[0])
        c.p(53, y, WOODV[4])
    for x in range(10, 54):
        c.p(x, 14, WOODV[0])
        c.p(x, 37, WOODV[4])
    # Telhadinho em cima.
    for y in range(2, 10):
        for x in range(2, 62):
            if y == 2:
                col = WOODV[5]
            elif y < 5:
                col = wood_px(x, y, y - 3, 3, WOODV[2:], 105)
            else:
                col = wood_px(x, y, y - 5, 5, WOODV[1:], 106)
            c.p(x, y, col)
    for x in range(4, 60):
        c.shade(x, 10, 0.6)
        c.shade(x, 11, 0.8)
    # Avisos pregados.
    paper(c, 14, 16, 12, 14, 1, curl=True)
    paper(c, 30, 15, 10, 9, 2, pin=(230, 190, 70))
    paper(c, 30, 28, 10, 7, 3)
    paper(c, 42, 18, 8, 16, 4, pin=(80, 120, 190), curl=True)
    # Cartaz de procurado: cabeça e ombros em silhueta, título e recompensa.
    for y in range(19, 27):
        for x in range(15, 25):
            c.p(x, y, PAPER[2])
    for (x, y) in ellipse_pts(20.0, 21.6, 2.2, 2.4):
        c.p(x, y, (86, 74, 66))
    for (x, y) in ellipse_pts(20.0, 27.0, 4.2, 2.6):
        if y <= 26:
            c.p(x, y, (86, 74, 66))
    c.hl(16, 18, 8, (150, 50, 50))
    c.hl(17, 28, 6, INK)
    # Cantos de fora e contorno.
    for (x, y) in ((2, 2), (61, 2), (2, 9), (61, 9), (3, 9), (60, 9)):
        c.px[y][x] = None
    for y in range(44, 64):
        for x in range(64):
            if not (8 <= x < 16 or 48 <= x < 56):
                c.px[y][x] = None
    c.outline_in()
    for (x, y) in ((8, 60), (15, 60), (48, 60), (55, 60)):
        c.px[y][x] = None
    c.outline_in()
    return c


# ── poço ──────────────────────────────────────────────────────────────────

def roof_tiles(c: K, pts: set, pal=ROOF_RED, tw: int = 7, th: int = 5, seed: int = 0, lightx: float = 0.5) -> None:
    """Telha a telha em fiadas desencontradas (ponta arredondada embaixo); a esquerda pega
    mais luz e a direita cai para a sombra."""
    xs = [p[0] for p in pts]
    x0, x1 = min(xs), max(xs)
    y0 = min(p[1] for p in pts)
    for (x, y) in pts:
        j = y - y0
        course, ly = j // th, j % th
        off = (tw // 2) if course % 2 else 0
        sx = (x + off) % tw
        tile = (x + off) // tw
        if ly == 0:
            v = 0.95
        elif ly <= th - 3:
            v = 0.72 - 0.08 * (ly - 1)
        elif ly == th - 2:
            v = 0.45
        else:
            v = 0.1
        if sx == tw - 1 and ly < th - 1:
            v = 0.2
        if ly >= th - 2 and sx in (0, tw - 1):
            v = 0.1
        t = (x - x0) / max(1, x1 - x0)
        v -= max(0.0, t - lightx) * 0.55
        v *= 0.92 + 0.16 * hsh(tile, course, seed)
        col = quant(v, pal, x, y)
        if hsh(tile, course, seed + 1) < 0.05 and 0 < ly < th - 2:
            col = mix(col, (68, 106, 62), 0.55)
        c.p(x, y, col)


def well() -> K:
    c = K(64, 80)
    # Telhado de telhas, alargando para baixo, com cumeeira e beiral de madeira.
    roof = set()
    for y in range(2, 18):
        t = min(1.0, (y - 2) / 8)
        half = 20 + 12 * math.sin(t * math.pi / 2)
        for x in range(64):
            if abs(x + 0.5 - 32) <= half:
                roof.add((x, y))
    roof_tiles(c, roof, seed=111, lightx=0.45)
    for x in range(12, 52):
        c.p(x, 2, ROOF_RED[4] if x < 40 else ROOF_RED[3])
        c.p(x, 3, ROOF_RED[2] if x % 6 else ROOF_RED[0])
        c.p(x, 4, ROOF_RED[1])
    for x in range(64):
        c.p(x, 18, WOODV[4] if x < 32 else WOODV[3])
        c.p(x, 19, WOODV[2])
        c.p(x, 20, WOODV[1])
        c.p(x, 21, OL)
    # Postes (atrás do bocal) com a sombra do beiral.
    for px in (11, 47):
        for y in range(22, 56):
            for x in range(px, px + 6):
                c.p(x, y, wood_px(y, x, x - px, 6, WOODV[1:], 112 + px))
        for y in (22, 23, 24):
            for x in range(px, px + 6):
                c.shade(x, y, 0.65)
    # Sarilho: tronco deitado entre os postes, com a corda enrolada no meio.
    for y in range(23, 28):
        ny = (y + 0.5 - 25.5) / 2.6
        for x in range(17, 47):
            v = lit(0, ny, math.sqrt(max(0, 1 - ny * ny)) + 0.05, 0.15)
            if 26 <= x <= 37:
                c.p(x, y, quant(v + (0.08 if (x + y) % 3 == 0 else -0.04), ROPE, x, y))
            else:
                c.p(x, y, quant(v - (0.15 if noise(x / 4, y, 113, 1) > 0.6 else 0), WOODV[1:], x, y))
    for x in range(48, 53):
        c.p(x, 25, IRON[3])
    # Corda descendo até o balde.
    for y in range(28, 37):
        c.p(32, y, ROPE[2] if y % 2 else ROPE[3])
        c.p(33, y, ROPE[1] if y % 2 else ROPE[2])
    # Balde pendurado.
    for (x, y) in ((29, 36), (30, 35), (31, 34), (34, 34), (35, 35), (36, 36)):
        c.p(x, y, IRON[2])
    hw = lambda y: 5.6 - 0.9 * (y - 37) / 8
    staves(c, 32.5, 37, 45, hw, 6, 114)
    for x in range(27, 39):
        if c.has(x, 37):
            c.p(x, 37, WOODV[4])
    hoop(c, 32.5, 39, hw, rivets=())
    hoop(c, 32.5, 43, hw, rivets=())
    # Bocal de pedra: borda de lajes em volta da boca, poço escuro e água no fundo.
    rim = ellipse_pts(32, 54.5, 24, 8.6)
    hole = ellipse_pts(32, 54.8, 17.5, 5.0)
    water = ellipse_pts(32, 56.6, 13.0, 2.8)
    wall = set()
    for y in range(54, 78):
        for x in range(8, 56):
            u = (x + 0.5 - 32) / 24
            if abs(u) <= 1 and y <= 74 + 2.4 * math.sqrt(1 - u * u):
                wall.add((x, y))
    # Parede: pedra a pedra num cilindro (fiadas de 5 px desencontradas).
    for (x, y) in wall:
        u = (x + 0.5 - 32) / 24
        th = math.asin(max(-1, min(1, u)))
        row = (y - 54) // 5
        ly = (y - 54) % 5
        a = (th / math.pi + 0.5) * 12 + (0.5 if row % 2 else 0)
        blk = int(a)
        fa = a - blk
        tone = 0.88 + 0.22 * hsh(blk, row, 115)
        v = cylinder(u) * tone
        if ly == 0:
            v += 0.12
        elif ly == 3:
            v -= 0.1
        if fa < 0.12:
            v += 0.08
        col = quant(v, ROCK, x, y, 0.3)
        if ly == 4 or fa > 0.92:
            col = mul(ROCK[0], 0.85)
        if y > 70 and hsh(x, y, 116) < 0.18:
            col = mix(col, (70, 98, 56), 0.6)
        c.p(x, y, col)
    for (x, y) in rim:
        if (x, y) in hole:
            continue
        ang = math.atan2((y + 0.5 - 54.5) / 8.6, (x + 0.5 - 32) / 24)
        seg = int((ang + math.pi) / (2 * math.pi) * 14)
        ang2 = math.atan2((y + 0.5 - 54.5) / 8.6, (x + 1.5 - 32) / 24)
        seg2 = int((ang2 + math.pi) / (2 * math.pi) * 14)
        far = y < 54.5
        v = 0.78 if far else 0.68
        v += (hsh(seg, 0, 117) - 0.5) * 0.18 + (noise(x, y, 118, 2) - 0.5) * 0.1
        col = quant(v, ROCK, x, y, 0.3)
        if seg != seg2:
            col = ROCK[1]
        c.p(x, y, col)
    for (x, y) in rim:
        if (x, y) not in hole and (x, y - 1) not in rim:
            c.p(x, y, ROCK[5])
        if (x, y) not in hole and (x, y + 1) in wall and (x, y + 1) not in rim:
            c.p(x, y, ROCK[2])
    for (x, y) in hole:
        depth = (y - 50) / 9
        c.p(x, y, mix((40, 40, 48), (10, 10, 14), min(1, 0.4 + depth)))
    for (x, y) in hole:
        if (x, y - 1) not in hole:
            c.p(x, y, ROCK[1])
    for (x, y) in water:
        if (x, y) in hole:
            t = (x + 0.5 - 19) / 26
            c.p(x, y, TEAL[1] if t > 0.6 else TEAL[2])
    for (x, y) in ((24, 56), (25, 56), (26, 56), (35, 57), (36, 57), (30, 58)):
        c.p(x, y, TEAL[4])
    c.p(27, 56, TEAL[3])
    c.outline_in()
    return c


# ── carroça ───────────────────────────────────────────────────────────────

def wheel(c: K, cx: float, cy: float, r: float, seed: int) -> None:
    """Roda de raios: aro de ferro, cambotas de madeira, oito raios e cubo."""
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            if d > r:
                continue
            ang = math.atan2(dy, dx)
            lightside = -(dx * 0.6 + dy * 0.8) / max(d, 0.01)
            if d > r - 2:
                col = quant(0.5 + lightside * 0.35, IRON[1:], x, y)
            elif d > r - 5:
                seg = int((ang + math.pi) / (math.pi / 3))
                col = quant(0.55 + lightside * 0.25 - (0.12 if seg % 2 else 0), WOODV[1:], x, y, 0.3)
                if d > r - 3:
                    col = mul(col, 0.85)
            elif d <= 3.2:
                col = quant(0.6 + lightside * 0.3, IRON[1:], x, y)
                if d <= 1.2:
                    col = STEEL[3]
            else:
                col = None
                for k in range(8):
                    a = k * math.pi / 4 + 0.2
                    off = -dx * math.sin(a) + dy * math.cos(a)
                    along = dx * math.cos(a) + dy * math.sin(a)
                    if abs(off) < 1.1 and along > 0:
                        col = WOODV[4] if off < 0 else WOODV[2]
                if col is None:
                    continue
            c.p(x, y, col)
    # Cravos do aro.
    for k in range(8):
        a = k * math.pi / 4 + 0.6
        c.p(round(cx - 0.5 + math.cos(a) * (r - 1)), round(cy - 0.5 + math.sin(a) * (r - 1)), STEEL[4])


def cart() -> K:
    c = K(96, 64)
    # Carga atrás da guarda: saco (esquerda) e fardo de feno (direita).
    sk = ellipse_pts(26.5, 11.5, 8.5, 6.0) | rect_pts(19, 11, 16, 6)
    light = pillow(sk, r=4, amb=0.3)
    for (x, y), v in light.items():
        c.p(x, y, quant(v * 0.9 + 0.05, SACK, x, y, 0.3))
    for (x, y) in ((24, 7), (25, 8), (26, 9), (30, 8), (31, 9)):
        c.p(x, y, SACK[2])
    c.p(28, 5, SACK[3])
    c.p(29, 4, SACK[4])
    for y in range(3, 16):
        for x in range(43, 70):
            if y == 3 and (x < 45 or x > 67):
                continue
            if y < 6:
                v = 0.82 + (noise(x / 3, y * 3, 121, 1) - 0.5) * 0.3
            else:
                v = 0.65 - 0.25 * (y - 6) / 10 + (hsh(x, (y + int(hsh(x, 0, 122) * 5)) // 3, 123) - 0.5) * 0.3
            c.p(x, y, quant(v, STRAW, x, y, 0.5))
    for bx in (50, 61):
        for y in range(3, 16):
            c.p(bx, y, ROPE[2] if y < 6 else ROPE[1])
            c.p(bx + 1, y, ROPE[1] if y < 6 else ROPE[0])
    # Caixa da carroça: guarda de cima, tábuas deitadas e estacas em pé.
    for y in range(12, 40):
        for x in range(10, 82):
            if y < 16:
                col = wood_px(x, y, y - 12, 4, WOODV[1:], 124)
                if y == 12:
                    col = WOODV[5]
            elif y in (26, 27):
                col = WOODV[1] if y == 26 else WOODV[3]
            else:
                pk = (y - 16) if y < 26 else (y - 28)
                col = wood_px(x, y, pk % 5, 5, WOODV, 125 + (y - 16) // 5)
            c.p(x, y, col)
    for sx in (12, 28, 44, 60, 76):
        for y in range(12, 40):
            for x in range(sx, sx + 4):
                k = x - sx
                c.p(x, y, (WOODV[4], WOODV[3], WOODV[2], WOODV[1])[k])
            if y % 9 == 3:
                c.p(sx + 1, y, IRON[3])
        for y in (14, 27):
            c.rect(sx - 1, y, 6, 2, IRON[2])
            c.hl(sx - 1, y, 6, IRON[3])
    for x in range(10, 82):
        c.p(x, 38, WOODV[0])
        c.p(x, 39, OL)
    # Varais para a direita, descendo.
    for k, (y0, y1) in enumerate(((31, 39), (37, 46))):
        for i in range(0, 16):
            x = 80 + i
            y = y0 + round(i * (y1 - y0) / 15)
            c.p(x, y, WOODV[4] if k == 1 else WOODV[3])
            c.p(x, y + 1, WOODV[2] if k == 1 else WOODV[1])
        c.p(95, y1 + 1, IRON[2])
    # Rodas na frente.
    wheel(c, 25.0, 47.0, 15.0, 1)
    wheel(c, 67.0, 47.0, 15.0, 2)
    c.outline_in()
    return c


# ── fogueira ──────────────────────────────────────────────────────────────

EMBER = [(90, 30, 20), (160, 56, 24), (230, 110, 40), (255, 190, 90)]


def fire_ring(c: K, lit_up: bool) -> None:
    """Roda de pedras em volta do buraco; as de trás primeiro."""
    stones = [
        (13, 49, 5.5, 4.4), (21, 44, 5.0, 3.6), (32, 41.5, 5.0, 3.4), (43, 44, 5.0, 3.6), (51, 49, 5.5, 4.4),
        (49, 56, 5.5, 4.4), (40, 59, 5.0, 4.0), (32, 60, 4.6, 3.6), (24, 59, 5.0, 4.0), (15, 56, 5.5, 4.4),
    ]
    order = sorted(range(len(stones)), key=lambda i: stones[i][1])
    for i in order:
        x, y, rx, ry = stones[i]
        pts = rock_shape(x, y, rx, ry, 130 + i, lump=0.14)
        for p in pts:
            c.px[p[1]][p[0]] = None
        rock(c, pts, ROCK, 140 + i, facet=0.2, cracks=0, warm=(255, 150, 70) if lit_up and y > 47 else None)
        # Contorno de cada pedra (as da frente cobrem as de trás).
        for (px, py) in pts:
            if any((px + dx, py + dy) not in pts for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                c.p(px, py, OL)


def campfire(lit_up: bool) -> K:
    c = K(64, 64)
    # Fundo do buraco: cinza e brasa (acesa) ou cinza fria (apagada).
    pit = ellipse_pts(32, 51, 15, 6.5)
    for (x, y) in pit:
        n = noise(x, y, 150, 2)
        if lit_up:
            col = EMBER[0] if n < 0.45 else (mix(EMBER[0], (40, 34, 34), 0.5) if n < 0.7 else EMBER[1])
            if hsh(x, y, 151) < 0.08:
                col = EMBER[2]
        else:
            col = (30, 28, 30) if n < 0.5 else ((58, 56, 58) if n < 0.75 else (84, 82, 84))
        c.p(x, y, col)
    fire_ring(c, lit_up)
    # Lenha cruzada (apagada: carvão com a ponta queimada; acesa: em pé, em pirâmide).
    if not lit_up:
        logs_ = [((20, 47), (42, 55)), ((22, 55), (44, 46)), ((28, 44), (36, 57))]
    else:
        logs_ = [((21, 56), (31, 38)), ((43, 56), (33, 38)), ((27, 58), (35, 40)), ((19, 50), (45, 52))]
    for k, ((x0, y0), (x1, y1)) in enumerate(logs_):
        n = int(max(abs(x1 - x0), abs(y1 - y0)))
        for i in range(n + 1):
            t = i / n
            x = round(x0 + (x1 - x0) * t)
            y = round(y0 + (y1 - y0) * t)
            charred = (t > 0.6) if not lit_up else (t > 0.45)
            for d, base in ((-1, 3), (0, 2), (1, 1)):
                dx, dy = (0, d) if abs(x1 - x0) > abs(y1 - y0) else (d, 0)
                col = WOODV[base + 1] if not charred else ((26, 22, 22), (44, 38, 36), (62, 56, 52))[base - 1]
                if charred and lit_up and hsh(x, y + d, 152 + k) < 0.35:
                    col = EMBER[2 if base == 3 else 1]
                c.p(x + dx, y + dy, col)
            if not charred and hsh(i, k, 153) < 0.25:
                c.p(x, y, WOODV[1])
        # Ponta cortada da tora.
        c.p(x0, y0, STRAW[2])
    if lit_up:
        flame(c)
    c.outline_in()
    return c


def flame(c: K) -> None:
    """Chama da fogueira em quatro tons: vermelho por fora, laranja, amarelo e miolo claro.
    Três línguas (a do meio mais alta) que balançam para lados diferentes."""
    tongues = [(32.5, 18, 8.5, 3.0, 0.6), (26.5, 30, 5.0, -2.0, 1.9), (38.5, 27, 5.0, 2.2, 3.1)]
    base = 51
    field = {}
    for (cx, top, hw, sw, ph) in tongues:
        for y in range(top, base):
            t = (base - y) / (base - top)
            sway = math.sin(t * 4.2 + ph) * sw * t
            half = hw * (1 - t) ** 0.75
            if half < 0.5:
                half = 0.5
            for x in range(int(cx - hw - 4), int(cx + hw + 5)):
                d = abs(x + 0.5 - (cx + sway)) / half
                if d > 1:
                    continue
                v = (1 - d) * 0.8 + (1 - t) * 0.6 - 0.2
                field[(x, y)] = max(field.get((x, y), -1), v)
    for (x, y), v in field.items():
        if v < 0.25 and noise(x, y, 160, 2) > 0.6:
            continue
        col = FIRE[0] if v < 0.3 else FIRE[1] if v < 0.58 else FIRE[2] if v < 0.86 else FIRE[3]
        c.p(x, y, col)


def campfire_on() -> K:
    return campfire(True)


def campfire_off() -> K:
    return campfire(False)
