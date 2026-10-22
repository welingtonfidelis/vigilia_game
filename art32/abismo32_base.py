"""Base do cenário do abismo em 32-bit: paletas dos seis atos, ruído que emenda nas bordas,
pontilhado em degraus e materiais desenhados no pixel novo (cantaria, pedra irregular,
madeira, ferro, água, névoa). Usada pelos geradores abismo32_*.py.

Tudo aqui sai de código: nada de arte de terceiros. As camadas que repetem na horizontal
passam `period` (a largura da camada) para o ruído e os padrões: a coluna 0 emenda com a
última sem costura.
"""
from __future__ import annotations

import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

from lib32 import OL, Canvas, hsh, mix, mul  # noqa: E402,F401

ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI']


def ramp_from(anchors, n):
    """n tons interpolados entre as âncoras (do escuro para o claro)."""
    out = []
    for i in range(n):
        t = i / (n - 1) * (len(anchors) - 1)
        k = min(int(t), len(anchors) - 2)
        out.append(mix(anchors[k], anchors[k + 1], t - k))
    return out


# ── Paletas ──────────────────────────────────────────────────────────────
# ST: 15 tons da pedra do ato. ST[2k] é a k-ésima cor da 16-bit (do escuro ao claro), e
# os tons ímpares ficam no meio: o 32-bit ganha o dobro de degraus com a mesma cara.

ANCHORS = {
    'I': [(12, 13, 11), (18, 19, 17), (30, 32, 28), (44, 48, 41), (62, 66, 56), (84, 88, 74), (112, 112, 94), (148, 140, 118)],
    'II': [(5, 11, 14), (8, 16, 20), (14, 28, 36), (20, 42, 52), (28, 58, 70), (40, 80, 92), (58, 106, 114), (86, 138, 140)],
    'III': [(9, 6, 15), (14, 10, 22), (24, 18, 40), (36, 26, 60), (52, 36, 84), (74, 52, 112), (100, 74, 138), (132, 108, 160)],
    'IV': [(5, 15, 18), (8, 22, 26), (14, 40, 48), (22, 60, 68), (34, 84, 90), (56, 112, 114), (96, 146, 142), (150, 184, 174)],
    'V': [(6, 5, 5), (10, 8, 8), (22, 17, 16), (36, 28, 26), (52, 42, 40), (72, 62, 62), (98, 90, 94), (128, 122, 128)],
    'VI': [(5, 4, 10), (8, 6, 14), (18, 10, 26), (32, 14, 40), (50, 18, 52), (76, 22, 60), (110, 26, 64), (150, 40, 80)],
}
ST = {k: ramp_from(v, 15) for k, v in ANCHORS.items()}

# Cor de ênfase do ato (a que o pack usa para tingir o brilho das camadas de profundidade).
EMPH = {
    'I': [(150, 96, 40), (232, 170, 80), (255, 214, 140), (255, 244, 206)],
    'II': [(156, 100, 40), (240, 192, 96), (255, 228, 160), (255, 248, 222)],
    'III': [(34, 104, 128), (70, 176, 204), (130, 222, 236), (196, 246, 250)],
    'IV': [(30, 122, 126), (80, 206, 206), (150, 236, 230), (214, 252, 246)],
    'V': [(196, 58, 26), (242, 120, 30), (255, 186, 80), (255, 236, 170)],
    'VI': [(130, 30, 80), (214, 52, 128), (246, 128, 186), (255, 206, 228)],
}

BONE = [(84, 76, 62), (124, 116, 96), (160, 152, 128), (196, 188, 162), (226, 216, 190), (246, 240, 222)]
MOSS = [(30, 40, 26), (44, 58, 36), (60, 78, 48), (80, 100, 62), (104, 126, 78)]
RUST = [(58, 34, 18), (92, 56, 26), (130, 82, 36), (168, 110, 50), (204, 142, 70)]
FLAME = [(140, 40, 18), (214, 92, 30), (246, 150, 52), (255, 204, 110), (255, 240, 196)]
WOOD2 = [(34, 16, 10), (52, 26, 16), (74, 37, 22), (98, 50, 29), (126, 66, 36), (156, 86, 46), (186, 114, 64)]
IRON2 = [(14, 14, 18), (24, 24, 30), (38, 38, 46), (56, 58, 68), (80, 84, 96), (112, 118, 132), (150, 156, 168)]
LAMP = [(150, 92, 40), (214, 150, 66), (240, 192, 96), (255, 226, 152), (255, 248, 216)]
FOAM = [(40, 80, 92), (58, 106, 114), (100, 160, 160), (150, 204, 196), (196, 236, 226)]
ORE = [(96, 50, 26), (140, 76, 38), (190, 110, 50), (236, 156, 76)]
FUNGUS = [(38, 50, 22), (58, 76, 30), (82, 106, 40), (110, 138, 52), (142, 170, 66), (182, 210, 100), (222, 240, 150)]
SPORE = [(30, 90, 112), (52, 140, 168), (82, 186, 212), (140, 224, 238), (200, 248, 252)]
GLASS_C = [(16, 70, 76), (34, 120, 124), (62, 176, 178), (100, 220, 216), (170, 246, 238)]
GLASS_R = [(70, 30, 28), (110, 50, 44), (150, 70, 62), (190, 96, 80), (226, 132, 108)]
GLASS_G = [(60, 50, 20), (110, 92, 36), (170, 146, 60), (220, 196, 100)]
KELP = [(54, 26, 24), (90, 40, 36), (132, 60, 52), (176, 86, 70), (214, 116, 92)]
PALE = [(56, 96, 98), (96, 146, 142), (150, 184, 174), (196, 214, 202), (236, 240, 228)]
LAVA = [(52, 10, 6), (96, 22, 12), (140, 32, 16), (196, 58, 26), (236, 104, 30), (255, 156, 56), (255, 206, 110), (255, 240, 190)]
FLESH = [(46, 14, 34), (76, 22, 60), (110, 26, 64), (150, 36, 72), (190, 44, 96), (226, 74, 140), (246, 128, 186)]
VEIN = [(70, 14, 34), (110, 22, 48), (168, 30, 58), (214, 52, 92), (246, 110, 140)]
VIOLET = [(30, 14, 48), (52, 24, 78), (78, 36, 108), (104, 54, 140), (138, 82, 176)]
BONE_VI = [(96, 80, 88), (140, 124, 130), (178, 164, 166), (210, 196, 196), (236, 228, 226)]

PIPE = [(14, 30, 38), (24, 50, 60), (40, 80, 92), (58, 106, 114), (86, 138, 140), (132, 182, 178)]
CRATE = [(12, 24, 30), (20, 38, 46), (30, 56, 64), (44, 76, 84), (62, 98, 104)]
ALGAE = [(10, 38, 38), (16, 58, 54), (28, 82, 72), (46, 108, 92), (72, 138, 114)]
STAIN = [(30, 22, 18), (52, 38, 30), (78, 58, 42)]

# Cores da camada de profundidade (DL, neutra, para tingir): do escuro ao brilho.
DL = [(10, 12, 20), (16, 19, 29), (22, 26, 38), (31, 36, 50), (40, 46, 62), (52, 59, 77),
      (64, 72, 92), (86, 95, 118), (107, 116, 139), (128, 138, 162), (150, 160, 186), (170, 180, 204), (190, 200, 222)]


def dl_to_act(col, act, shift=0):
    """Cor da camada DL levada para a rampa do ato (como o pack faz nos fundos de andar).

    DL 0 → ST[2], 22..38 → ST[4], 40..62 → ST[6], 64..92 → ST[8], 150..186 → ST[10] (névoa),
    190..222 → ênfase. `shift` desce degraus de pedra (andares mais fundos ficam mais escuros)."""
    st = ST[act]
    lum = sum(col) / 3
    if lum >= 196:
        return EMPH[act][min(3, int((lum - 196) / 6))]
    if lum >= 182:
        return EMPH[act][0] if lum < 190 else EMPH[act][1]
    # Marcos da DL (luminância) → índice da rampa do ato.
    marks = [(14, 2), (29, 4), (49, 6), (76, 8), (165, 10)]
    if lum <= marks[0][0]:
        idx = 2.0
    else:
        idx = float(marks[-1][1])
        for (l0, i0), (l1, i1) in zip(marks, marks[1:]):
            if l0 <= lum <= l1:
                idx = i0 + (i1 - i0) * (lum - l0) / (l1 - l0)
                break
    i = max(0, min(14, round(idx) - shift))
    return st[i]


# ── Ruído e pontilhado ───────────────────────────────────────────────────

def tnoise(x: float, y: float, s: int, scale: float, period: int = 0) -> float:
    """Ruído de valor suave em [0, 1); com `period`, emenda em x (a grade dá a volta)."""
    if period:
        n = max(1, round(period / scale))
        gx = x * n / period
    else:
        n = 0
        gx = x / scale
    gy = y / scale
    xi, yi = math.floor(gx), math.floor(gy)
    fx, fy = gx - xi, gy - yi
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    x0, x1 = (xi % n, (xi + 1) % n) if n else (xi, xi + 1)
    a = hsh(x0, yi, s) * (1 - sx) + hsh(x1, yi, s) * sx
    b = hsh(x0, yi + 1, s) * (1 - sx) + hsh(x1, yi + 1, s) * sx
    return a * (1 - sy) + b * sy


def fbm(x, y, s, scale, period=0, octaves=3):
    tot, amp, norm = 0.0, 1.0, 0.0
    for o in range(octaves):
        tot += tnoise(x, y, s + o * 17, scale / (2 ** o), period) * amp
        norm += amp
        amp *= 0.5
    return tot / norm


BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def bayer(x: int, y: int) -> float:
    return (BAYER[y & 3][x & 3] + 0.5) / 16


def stepped(ramp, t: float, x: int, y: int):
    """Tom da rampa para t em [0, 1] com pontilhado ordenado entre dois degraus vizinhos."""
    t = max(0.0, min(1.0, t)) * (len(ramp) - 1)
    i = int(t)
    if i >= len(ramp) - 1:
        return ramp[-1]
    return ramp[i + 1] if (t - i) > bayer(x, y) else ramp[i]


def wrapd(a: float, b: float, period: int) -> float:
    """Distância com sinal a − b, dando a volta em `period` (0 = sem volta)."""
    d = a - b
    if period:
        d = (d + period / 2) % period - period / 2
    return d


# ── Canvas: ajudas ───────────────────────────────────────────────────────

def blank(w, h):
    return Canvas(w, h)


def fill(c: Canvas, col):
    for y in range(c.h):
        row = c.px[y]
        for x in range(c.w):
            row[x] = col


def put(c: Canvas, x, y, col, period=0):
    """Pixel com volta horizontal (para camadas que repetem)."""
    x, y = int(x), int(y)
    if period:
        x %= period
    if 0 <= x < c.w and 0 <= y < c.h and col is not None:
        c.px[y][x] = (col[0], col[1], col[2])


def shade_px(c: Canvas, x, y, k, period=0):
    x, y = int(x), int(y)
    if period:
        x %= period
    v = c.g(x, y)
    if v is not None:
        c.px[y][x] = mul(v, k)


def tint_px(c: Canvas, x, y, col, t, period=0):
    x, y = int(x), int(y)
    if period:
        x %= period
    v = c.g(x, y)
    if v is not None:
        c.px[y][x] = mix(v, col, t)


def glow(c: Canvas, cx, cy, r, col, strength=0.5, steps=4, period=0, ry=None, y_min=0, y_max=None):
    """Poça de luz em degraus: mistura a cor em anéis quantizados, com pontilhado na borda
    de cada degrau (nada de alfa parcial)."""
    ry = ry or r
    y_max = c.h if y_max is None else y_max
    for y in range(max(y_min, int(cy - ry - 1)), min(y_max, int(cy + ry + 2))):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot((x - cx) / r, (y - cy) / ry)
            if d >= 1:
                continue
            k = (1 - d) * steps
            q = int(k) + (1 if (k - int(k)) > bayer(x, y) else 0)
            if q <= 0:
                continue
            tint_px(c, x, y, col, strength * q / steps, period)


def fog(c: Canvas, y0, y1, col, k0, k1, period=0, x0=0, x1=None, seed=0, wisps=0.0):
    """Névoa em degraus de tom: de k0 (em y0) a k1 (em y1), quantizada em degraus de 1/8
    com pontilhado ordenado; `wisps` desenha fiapos horizontais mais densos."""
    x1 = c.w if x1 is None else x1
    for y in range(max(0, y0), min(c.h, y1)):
        t = (y - y0) / max(1, y1 - y0)
        base = k0 + (k1 - k0) * t
        for x in range(x0, x1):
            k = base
            if wisps:
                n = tnoise(x, y * 3, seed, 28, period)
                k += wisps * max(0.0, n - 0.45)
            k = max(0.0, min(1.0, k))
            q = k * 8
            qi = int(q) + (1 if (q - int(q)) > bayer(x, y) else 0)
            if qi:
                tint_px(c, x, y, col, qi / 8, period)


def outline(c: Canvas, col=OL):
    c.outline(col)


def to_img(c: Canvas) -> Image.Image:
    return c.image()


# ── Materiais ────────────────────────────────────────────────────────────

def brick_rows(seed, bw, period, rows):
    """Juntas verticais de cada fiada (emendam em `period`)."""
    out = []
    for r in range(rows):
        off = int(hsh(r, 0, seed) * bw[1])
        spans = []
        x = off
        k = 1
        while x < off + period:
            w = bw[0] + int(hsh(r, k, seed) * (bw[1] - bw[0] + 1))
            k += 1
            if off + period - (x + w) < bw[0]:
                w = off + period - x
            spans.append((x, w))
            x += w
        bid = [0] * period
        lxs = [0] * period
        wid = [0] * period
        for i, (sx, w) in enumerate(spans):
            for t in range(w):
                xx = (sx + t) % period
                bid[xx], lxs[xx], wid[xx] = i, t, w
        out.append((bid, lxs, wid))
    return out


def masonry(c: Canvas, x0, y0, w, h, R, base, bh=12, bw=(20, 34), seed=0, period=0,
            mask=None, moss=None, moss_amt=0.0, stain=0.35, mortar=None, chips=0.25, pits=0.03):
    """Cantaria tijolo a tijolo: junta funda, chanfro claro em cima e à esquerda, sombra
    embaixo e à direita, tom por bloco, manchas de umidade, poros e quinas lascadas.
    `mask(x, y)` → False pula o pixel. `moss` é uma rampa de musgo (nos topos e juntas)."""
    P = period or (x0 + w)
    rows = brick_rows(seed, bw, P, h // bh + 2)
    mo = R[base - 2] if mortar is None else mortar
    for y in range(y0, y0 + h):
        ly = y - y0
        r = ly // bh
        by = ly % bh
        bid, lxs, wid = rows[r]
        for x in range(x0, x0 + w):
            if mask and not mask(x, y):
                continue
            xx = x % P
            i, lx, wd = bid[xx], lxs[xx], wid[xx]
            tone = base + (-1, 0, 0, 0, 1)[int(hsh(i, r, seed + 7) * 5)]
            if tnoise(x, y, seed + 5, 48, period) < stain:
                tone -= 1
            if by == bh - 1 or lx == wd - 1:
                col = mo if hsh(x, y, seed + 2) > 0.2 else R[max(0, base - 3)]
            else:
                chip = hsh(i, r, seed + 11)
                if chip < chips and ((lx < 2 and by < 2 and lx + by < 2) or (lx >= wd - 3 and by >= bh - 3 and (wd - 2 - lx) + (bh - 2 - by) < 2)):
                    col = mo
                elif by == 0:
                    col = R[min(14, tone + 2)] if lx < wd - 3 else R[tone + 1]
                elif lx == 0:
                    col = R[min(14, tone + 1)]
                elif by == bh - 2 or lx == wd - 2:
                    col = R[tone - 1]
                else:
                    n = tnoise(x, y, seed + 3, 3, period)
                    t2 = tone + (1 if n > 0.74 else (-1 if n < 0.22 else 0))
                    if hsh(x, y, seed + 9) < pits:
                        t2 = tone - 2
                    col = R[max(0, min(14, t2))]
            if moss and by <= 2 or (moss and (by == bh - 1)):
                m = tnoise(x, y, seed + 21, 9, period) * 0.7 + 0.3 * hsh(x, y, seed + 22)
                if m > 1 - moss_amt:
                    col = moss[3] if by == 0 else (moss[2] if by in (1, bh - 1) else moss[1])
            c.p(x, y, col)
    # Fios de musgo que escorrem das juntas.
    if moss and moss_amt > 0:
        for k in range(int(w * h * moss_amt / 600)):
            sx = x0 + int(hsh(k, 1, seed + 23) * w)
            r = int(hsh(k, 2, seed + 23) * (h // bh))
            sy = y0 + r * bh + bh - 1
            if mask and not mask(sx, sy):
                continue
            for d in range(1 + int(hsh(k, 3, seed + 23) * 4)):
                if c.g(sx % c.w if period else sx, sy + d) is not None:
                    put(c, sx, sy + d, moss[2] if d == 0 else moss[1], period)


def crack(c: Canvas, x, y, length, dark, lit, seed=0, period=0, drift=0.0):
    """Rachadura: sulco escuro que desce em zigue-zague, com a borda de baixo/direita acesa."""
    for i in range(length):
        put(c, x, y, dark, period)
        if lit is not None and hsh(i, 0, seed) < 0.7:
            put(c, x + 1, y, lit, period)
        r = hsh(i, 1, seed) + drift
        if r < 0.3:
            x -= 1
        elif r > 0.7:
            x += 1
        y += 1
        if hsh(i, 2, seed) < 0.06:
            # Galho curto.
            bx, by = x, y
            for j in range(2 + int(hsh(i, 3, seed) * 4)):
                bx += 1 if hsh(i, 4, seed) < 0.5 else -1
                by += 1 if j % 2 else 0
                put(c, bx, by, dark, period)


def cells(seed, cs, period, rows):
    """Pontos das pedras irregulares (grade com jitter) — emendam em `period`."""
    nx = max(1, period // cs)
    pts = {}
    for j in range(-1, rows + 2):
        for i in range(nx):
            jx = 0.18 + 0.64 * hsh(i, j, seed)
            jy = 0.18 + 0.64 * hsh(i, j, seed + 1)
            pts[(i, j)] = (i * cs + jx * cs, j * cs + jy * cs)
    return nx, pts


def stones(c: Canvas, x0, y0, w, h, R, base, cs=22, seed=0, period=0, gap=1.1, mask=None,
           sq=1.0, tone_var=(-1, 0, 0, 1), rim=True, tex=True, mortar=None, flat=False):
    """Pedra irregular (Voronoi) com rejunte fundo, aresta acesa em cima/esquerda e sombra
    embaixo/direita; cada pedra tem o seu tom e uma textura fina. `sq` achata as pedras
    (>1 = mais largas que altas)."""
    P = period or (x0 + w)
    csy = cs / sq
    nx, pts = cells(seed, cs, P, int(h / csy) + 2)
    mo = R[max(0, base - 3)] if mortar is None else mortar
    for y in range(y0, y0 + h):
        gy = (y - y0) / csy
        cj = int(math.floor(gy))
        for x in range(x0, x0 + w):
            if mask and not mask(x, y):
                continue
            ci = int((x % P) // cs)
            best = []
            for dj in (-1, 0, 1):
                for di in (-1, 0, 1):
                    key = ((ci + di) % nx, cj + dj)
                    p = pts.get(key)
                    if p is None:
                        continue
                    dx = wrapd(x % P, p[0], P)
                    dy = (y - y0) - p[1] / cs * csy
                    best.append((dx * dx + dy * dy, dx, dy, key))
            best.sort()
            d1, dx1, dy1, k1 = best[0]
            d2, dx2, dy2, k2 = best[1]
            # Distância até o bissetor entre os dois pontos mais perto.
            vx, vy = dx1 - dx2, dy1 - dy2  # p2 − p1
            L = math.hypot(vx, vy) or 1.0
            ed = (d2 - d1) / (2 * L)
            tone = base + tone_var[int(hsh(k1[0], k1[1], seed + 3) * len(tone_var))]
            if ed < gap:
                col = mo
            else:
                nxv, nyv = vx / L, vy / L  # normal para fora da pedra
                facing = (nxv * -0.6) + (nyv * -0.8)  # >0: aresta virada para a luz
                if rim and ed < gap + 1.4:
                    col = R[min(14, tone + 2)] if facing > 0.25 else (R[max(0, tone - 2)] if facing < -0.35 else R[tone])
                elif rim and ed < gap + 2.6 and not flat:
                    col = R[min(14, tone + 1)] if facing > 0.4 else (R[max(0, tone - 1)] if facing < -0.5 else R[tone])
                else:
                    t2 = tone
                    if tex:
                        n = tnoise(x, y, seed + 5, 4, period)
                        if n > 0.76:
                            t2 += 1
                        elif n < 0.2:
                            t2 -= 1
                        if hsh(x, y, seed + 6) < 0.02:
                            t2 -= 1
                    col = R[max(0, min(14, t2))]
            c.p(x, y, col)


def planks_v(c: Canvas, x0, y0, w, h, R, base=3, pw=8, seed=0, rot=0.0, nails=True, period=0):
    """Tábuas em pé com veio, nós, frestas e podridão (manchas escuras e musgo)."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            lx = (x - x0) % pw
            k = (x - x0) // pw
            tone = base + (-1, 0, 0, 1)[int(hsh(k, 0, seed) * 4)]
            if lx == pw - 1:
                col = R[max(0, base - 3)]
            elif lx == 0:
                col = R[min(len(R) - 1, tone + 1)]
            elif lx == pw - 2:
                col = R[max(0, tone - 1)]
            else:
                g = math.sin((y * 0.35 + hsh(k, 1, seed) * 20) + lx * 1.7 + 3 * tnoise(lx + k * 9, y, seed + 2, 6))
                col = R[tone] if g < 0.55 else R[max(0, tone - 1)]
                kn = hsh(k, 3, seed)
                ky = y0 + int(hsh(k, 4, seed) * h)
                if kn < 0.5 and abs(y - ky) <= 1 and 1 <= lx <= 3:
                    col = R[max(0, tone - 2)]
            if rot and tnoise(x, y, seed + 7, 7, period) * 0.8 + 0.2 * hsh(x, y, seed + 8) > 1 - rot:
                col = R[max(0, base - 2)]
            c.p(x, y, col)


def wood_beam(c: Canvas, x, y, w, h, R=WOOD2, base=3, vertical=False, seed=0, nails=(), period=0, rot=0.0):
    """Viga de madeira: chanfro claro em cima/esquerda, sombra embaixo/direita, veio
    comprido, rachas no topo e pregos de ferro."""
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            a = (xx - x) if vertical else (yy - y)
            n = w if vertical else h
            along = yy if vertical else xx
            across = a
            if a == 0:
                col = R[base + 2]
            elif a == 1:
                col = R[base + 1]
            elif a == n - 1:
                col = R[max(0, base - 2)]
            elif a == n - 2:
                col = R[base - 1]
            else:
                g = tnoise(along * 0.25, across * 3, seed, 1.0) + 0.35 * tnoise(along, across, seed + 1, 9, period if not vertical else 0)
                col = R[base] if g < 0.78 else R[base - 1]
                if g < 0.2:
                    col = R[base + 1]
            if rot and tnoise(xx, yy, seed + 4, 6, period) > 1 - rot:
                col = R[max(0, base - 2)]
            put(c, xx, yy, col, period)
    for (nx_, ny_) in nails:
        put(c, nx_, ny_, IRON2[5], period)
        put(c, nx_ + 1, ny_, IRON2[2], period)
        put(c, nx_, ny_ + 1, IRON2[2], period)


def chain_v(c: Canvas, x, y0, y1, R=IRON2, period=0, big=False):
    """Corrente em pé: elos de frente (anel) e de lado (barra), alternados."""
    y = y0
    k = 0
    lw, lh = (6, 9) if big else (4, 6)
    while y < y1:
        if k % 2 == 0:
            for dy in range(lh):
                for dx in range(lw):
                    edge = dx in (0, lw - 1) or dy in (0, lh - 1)
                    corner = dx in (0, lw - 1) and dy in (0, lh - 1)
                    if not edge or corner or y + dy >= y1:
                        continue
                    col = R[5] if (dx == 0 or dy == 0) else (R[3] if dx < lw - 1 and dy < lh - 1 else R[2])
                    if dx == lw - 1 or dy == lh - 1:
                        col = R[2]
                    put(c, x - lw // 2 + dx, y + dy, col, period)
            y += lh - 1
        else:
            for dy in range(lh - 1):
                if y + dy < y1:
                    put(c, x - 1, y + dy, R[4] if dy < 2 else R[3], period)
                    put(c, x, y + dy, R[2], period)
                    if big:
                        put(c, x - 2, y + dy, R[2], period)
            y += lh - 2
        k += 1


def moss_patch(c: Canvas, x0, y0, x1, y1, moss, seed=0, density=0.5, grow_down=True, period=0):
    """Musgo em tufos por cima do que já está pintado: nasce de baixo (ou espalhado),
    topo do tufo aceso, miolo médio, base escura e pontinhos claros."""
    def on(x, y):
        if y < y0 or y >= y1:
            return False
        t = (y - y0) / max(1, y1 - y0) if grow_down else 0.5
        n = fbm(x, y, seed, 9, period, 2) + 0.12 * hsh(x, y, seed + 1)
        return n > 1.02 - density * (0.35 + 0.75 * t)
    for y in range(y0, y1):
        for x in range(x0, x1):
            xx = x % period if period else x
            if c.g(xx, y) is None or not on(x, y):
                continue
            if not on(x, y - 1):
                col = moss[3]
            elif not on(x, y + 1):
                col = moss[1]
            elif not on(x - 1, y):
                col = moss[3] if hsh(x, y, seed + 2) < 0.5 else moss[2]
            else:
                col = moss[2] if hsh(x, y, seed + 3) > 0.08 else moss[4]
            put(c, x, y, col, period)


def skull(c: Canvas, x, y, R=BONE, facing=0):
    """Caveira de frente 10×10 (x, y = canto de cima à esquerda)."""
    rows = [
        '..XXXXXX..',
        '.XXXXXXXX.',
        'XXXXXXXXXX',
        'XXXXXXXXXX',
        'XEEXXXXEEX',
        'XEEXXXXEEX',
        'XXXXNNXXXX',
        '.XXXXXXXX.',
        '..TXTXTX..',
        '..XXXXXX..',
    ]
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            if ch == 'E':
                col = (14, 12, 10)
            elif ch == 'N':
                col = R[0]
            elif ch == 'T':
                col = R[1]
            else:
                t = (i + facing) / 10
                col = R[4] if (t < 0.45 and j < 4) else (R[3] if t < 0.7 else R[2])
                if j == 0 or (j == 1 and i in (1, 2)):
                    col = R[5]
                if j >= 7:
                    col = R[2] if i < 6 else R[1]
            c.p(x + i, y + j, col)


def bone_h(c: Canvas, x, y, length, R=BONE):
    """Osso longo deitado, com as cabeças nas pontas."""
    for i in range(length):
        c.p(x + i, y, R[4] if i < length * 0.6 else R[3])
        c.p(x + i, y + 1, R[2])
    for ex in (x - 1, x + length):
        c.p(ex, y - 1, R[4])
        c.p(ex, y, R[3])
        c.p(ex, y + 1, R[2])
        c.p(ex, y + 2, R[1])


def candle(c: Canvas, x, y, h=6, wax=BONE, flame=FLAME):
    """Vela fina (x, y = base): cera, pavio e chama de 3 px."""
    for j in range(h):
        c.p(x, y - j, wax[3] if j < h - 1 else wax[4])
        c.p(x + 1, y - j, wax[2])
    c.p(x, y - h, (40, 30, 20))
    c.p(x, y - h - 1, flame[3])
    c.p(x, y - h - 2, flame[4])
    c.p(x + 1, y - h - 1, flame[2])
    c.p(x, y - h - 3, flame[2])


def dark_arch(c: Canvas, cx, top, w, bottom, inner, ring=None, ring_w=3, period=0, deep=None):
    """Abertura em arco (topo redondo) com o miolo escuro em degraus e o anel de aduelas.
    inner = rampa escura (do mais fundo ao menos fundo); ring = rampa da pedra do anel."""
    r = w / 2
    cy = top + r
    for y in range(top - ring_w - 1, bottom):
        for x in range(int(cx - r - ring_w - 1), int(cx + r + ring_w + 2)):
            dx = x + 0.5 - cx
            if y + 0.5 < cy:
                d = math.hypot(dx, y + 0.5 - cy)
            else:
                d = abs(dx)
            if d <= r:
                # Miolo: mais fundo no alto e no meio, borda de baixo/direita pega luz.
                t = (y - top) / max(1, bottom - top)
                k = 0.25 + 0.5 * t
                if d > r - 1.5 and dx > 0:
                    k += 0.3
                put(c, x, y, stepped(inner, k, x, y), period)
            elif ring and d <= r + ring_w:
                ang = math.atan2(y + 0.5 - cy, dx) if y + 0.5 < cy else (math.pi / 2 if dx > 0 else -math.pi / 2)
                seg = int((ang + math.pi) / (math.pi / 9))
                tone = 1 if seg % 2 else 0
                if d > r + ring_w - 1:
                    col = ring[0]
                elif d < r + 1:
                    col = ring[1]
                else:
                    col = ring[2 + tone]
                if y + 0.5 < cy and dx < 0 and d > r + ring_w - 2:
                    col = ring[3 + tone] if len(ring) > 3 + tone else ring[-1]
                put(c, x, y, col, period)


def flagstones(c: Canvas, y0, rows, R, base, seed=0, period=640, bw=(36, 72), wear=0.25, mask=None):
    """Piso de lajes visto de lado: fiadas mais altas perto da câmera, junta escura,
    borda de cima de cada laje acesa, quinas gastas, manchas e trincas finas.
    rows = alturas das fiadas (de trás para a frente)."""
    y = y0
    for r, rh in enumerate(rows):
        spans = brick_rows(seed + r * 7, bw, period, 1)[0]
        bid, lxs, wid = spans
        for yy in range(y, y + rh):
            ly = yy - y
            for x in range(c.w):
                if mask and not mask(x, yy):
                    continue
                xx = x % period
                i, lx, wd = bid[xx], lxs[xx], wid[xx]
                tone = base + (-1, 0, 0, 0, 1)[int(hsh(i, r, seed + 3) * 5)]
                if ly == rh - 1 or lx == wd - 1:
                    col = R[max(0, base - 2)]
                elif ly == 0:
                    col = R[min(14, tone + 1)]
                elif lx == 0 and ly < rh - 2:
                    col = R[min(14, tone + 1)] if hsh(i, r, seed + 5) < 0.6 else R[tone]
                else:
                    n = tnoise(x, yy, seed + 6, 3, period)
                    t2 = tone + (1 if n > 0.8 else (-1 if n < 0.16 else 0))
                    col = R[max(0, min(14, t2))]
                    if wear and hsh(i, r, seed + 8) < wear and (lx < 3 and ly > rh - 4):
                        col = R[max(0, base - 2)]
                c.p(x, yy, col)
        y += rh
    return y


def sphere(c: Canvas, cx, cy, r, R, period=0, spec=True, ry=None):
    """Bola sombreada pela rampa (luz de cima-esquerda), com brilho de 1–2 px."""
    ry = ry or r
    n = len(R)
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            nx, ny = (x + 0.5 - cx) / r, (y + 0.5 - cy) / ry
            d = nx * nx + ny * ny
            if d > 1:
                continue
            nz = math.sqrt(1 - d)
            lum = -0.55 * nx - 0.65 * ny + 0.55 * nz
            i = max(0, min(n - 1, int((lum + 0.6) / 1.6 * n)))
            if not spec and i == n - 1:
                i = n - 2
            if d > 0.82 and i > 0:
                i -= 1
            put(c, x, y, R[i], period)
    if spec:
        put(c, cx - r * 0.4, cy - ry * 0.45, R[-1], period)


def tline(c: Canvas, x0, y0, x1, y1, cols, period=0):
    """Linha grossa: `cols` são as cores de cada camada (de cima para baixo)."""
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n):
        t = i / max(n - 1, 1)
        x = round(x0 + (x1 - x0) * t)
        y = round(y0 + (y1 - y0) * t)
        for k, col in enumerate(cols):
            if col is not None:
                put(c, x, y + k, col, period)


def boulder_pile(c: Canvas, cx, top, w, R, seed=0, base=3, period=0, bottom=None, rmin=4, rmax=10):
    """Monte de pedregulhos (primeiro plano): pedras redondas empilhadas de trás para a
    frente, cada uma com a borda de cima-esquerda acesa e a base escura; o contorno de
    cima fica cheio de calombos, como entulho de verdade."""
    bottom = c.h if bottom is None else bottom
    hw = w / 2
    H = bottom - top
    rocks = []
    k = 0
    for layer in range(6):
        ly = layer / 5  # 0 = alto do monte, 1 = pé
        y_band = top + H * (0.15 + 0.85 * ly)
        span = hw * (0.35 + 0.65 * ly ** 0.6)
        n = 2 + int(span / 7)
        for i in range(n):
            x = cx - span + (i + 0.5) * 2 * span / n + (hsh(k, 0, seed) - 0.5) * 6
            r = rmin + hsh(k, 1, seed) * (rmax - rmin) * (0.7 + 0.5 * ly)
            rocks.append((y_band + (hsh(k, 2, seed) - 0.5) * 4, x, r, k))
            k += 1
    rocks.sort()
    for (y0, x0, r, kk) in rocks:
        ry = r * 0.8
        tone = base + (-1, 0, 0, 1)[int(hsh(kk, 3, seed) * 4)]
        for y in range(int(y0 - ry) - 1, min(bottom, int(y0 + ry) + 2)):
            for x in range(int(x0 - r) - 1, int(x0 + r) + 2):
                nx, ny = (x + 0.5 - x0) / r, (y + 0.5 - y0) / ry
                d = nx * nx + ny * ny
                if d > 1:
                    continue
                lit = -nx * 0.6 - ny * 0.8
                t = tone + (2 if (lit > 0.55 and d > 0.45) else (1 if lit > 0.15 else (-1 if lit < -0.45 else 0)))
                if d > 0.82 and lit < 0.2:
                    t -= 1
                depth = (y - top) / max(1, H)
                t -= int(depth * 2.2)
                put(c, x, y, R[max(0, min(len(R) - 1, t))], period)
