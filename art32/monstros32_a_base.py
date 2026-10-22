"""Base dos monstros e chefes 32-bit dos atos I–III (Vigília).

Cada monstro é uma função `desenho(K, P)` que pinta as peças do quadro numa pose `P` e as
entrega ao compositor `K` (uma peça por canvas). O compositor:
  · contorna cada peça com a cor do material escurecida (linhas de dentro);
  · no fim, só a silhueta de fora vira OL (contorno seletivo, como pede o README);
  · nas variantes (deep / core / phase2) remapeia as cores da peça (mais escura, menos
    saturada e puxada para o tom do bioma), acende olhos e brilhos na cor de ênfase do ato
    e espalha marcas de corrupção do material do ato (I musgo e rachadura, II ferrugem,
    III esporos) em lugares fixos de cada peça — a variante sai do mesmo desenho.

A folha tem os 19 quadros da 16-bit: parado 0–3, corrida 4–7 (pose própria: pernas que
sobem, deriva ou salto), ataque 8–11, dano 12–13 e morte 14–18 (derivados do quadro 0 como
na 16-bit, com os deslocamentos dobrados).
Luz de cima e da esquerda; alfa só 0 ou 255. Nada aqui usa arte de terceiros.
"""
from __future__ import annotations

import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import lib32 as L  # noqa: E402
from lib32 import OL, Canvas, hsh, mix, mul, noise  # noqa: E402,F401
from PIL import Image  # noqa: E402

WHITE = (250, 246, 234)
NOITE = (7, 6, 10)
PALE = (170, 182, 192)

# ── Paletas dos atos (8 tons do bioma + 4 ênfases, as mesmas da 16-bit) ─────────
ACT_RAMP = {
    'I': [(18, 19, 17), (30, 32, 28), (44, 48, 41), (62, 66, 56), (84, 88, 74), (112, 112, 94), (148, 140, 118), (196, 186, 160)],
    'II': [(8, 16, 20), (14, 28, 36), (20, 42, 52), (28, 58, 70), (40, 80, 92), (58, 106, 114), (86, 138, 140), (140, 190, 186)],
    'III': [(14, 10, 22), (24, 18, 40), (36, 26, 60), (52, 36, 84), (74, 52, 112), (100, 74, 138), (132, 108, 160), (214, 204, 176)],
}
ACT_ACC = {
    'I': [(150, 96, 40), (232, 170, 80), (78, 96, 66), (226, 216, 190)],      # âmbar fraco, âmbar, musgo, osso
    'II': [(92, 46, 28), (156, 84, 44), (240, 192, 96), (176, 222, 214)],     # ferrugem, ferrugem clara, lanterna, reflexo
    'III': [(94, 122, 46), (150, 180, 70), (70, 176, 204), (160, 234, 240)],  # doentio, doentio claro, biolum, biolum claro
}
ACCENT = {'I': (0, 1), 'II': (1, 2), 'III': (2, 3)}          # (brilho médio, brilho forte) em ACT_ACC
MODES = {'deep': (0.62, 0.80, 3), 'core': (0.48, 0.68, 5), 'phase2': (0.70, 0.84, 7)}   # saturação, brilho, marcas

# ── Rampas de material (escuro → claro) ─────────────────────────────────────────
BONE = [(96, 86, 72), (140, 128, 108), (184, 172, 150), (218, 208, 188), (242, 236, 220)]
IRON = [(26, 27, 33), (42, 44, 52), (62, 66, 76), (88, 94, 106), (124, 132, 144)]
STEEL = [(54, 58, 68), (82, 88, 100), (112, 120, 132), (150, 160, 170), (196, 204, 212)]
RUST = [(60, 30, 20), (92, 46, 28), (130, 66, 36), (166, 96, 50), (200, 130, 70)]
WOOD = [(40, 27, 19), (64, 44, 30), (92, 64, 42), (124, 88, 56), (156, 116, 74)]
LEATHER = [(46, 30, 20), (74, 50, 32), (106, 74, 42), (138, 100, 62), (168, 128, 84)]
CLOTH_RED = [(56, 16, 22), (84, 26, 32), (118, 40, 42), (150, 58, 54), (180, 82, 70)]
PURPLE = [(30, 22, 40), (50, 38, 66), (74, 58, 92), (100, 82, 120), (132, 110, 152)]
BRONZE = [(70, 46, 22), (112, 76, 34), (156, 112, 50), (204, 158, 76), (238, 204, 120)]
CLAY = [(36, 36, 42), (56, 57, 64), (80, 80, 86), (112, 106, 100), (152, 142, 124)]
STONE = [(40, 41, 48), (60, 62, 70), (82, 86, 94), (108, 113, 120), (142, 148, 154)]
FUR = [(30, 30, 37), (46, 47, 56), (66, 68, 79), (92, 96, 106), (126, 130, 138)]
PINK = [(108, 52, 56), (150, 78, 78), (190, 112, 104), (220, 150, 136)]
DROWN = [(70, 76, 88), (100, 110, 122), (134, 146, 156), (166, 180, 188), (204, 214, 218)]
TAR = [(10, 10, 14), (20, 20, 26), (34, 34, 42), (54, 56, 66), (84, 88, 100)]
TEAL = [(16, 40, 44), (28, 66, 70), (44, 98, 100), (74, 140, 136), (122, 200, 192)]
SHELL = [(14, 18, 30), (26, 36, 62), (40, 58, 96), (58, 86, 134), (88, 120, 168)]
MUSH_RED = [(70, 22, 30), (104, 34, 40), (140, 50, 52), (174, 70, 66), (204, 104, 90)]
FLESH = [(150, 136, 112), (186, 174, 150), (214, 204, 182), (234, 228, 210), (250, 246, 234)]
BARK = [(40, 27, 19), (66, 45, 30), (96, 66, 42), (130, 94, 58), (172, 132, 80)]
MOSS = [(34, 54, 36), (52, 80, 50), (76, 108, 62), (104, 136, 72), (140, 164, 80)]
BROWN = [(26, 18, 14), (46, 32, 22), (72, 50, 32), (102, 72, 44), (136, 100, 62)]
SICK = [(70, 94, 40), (106, 134, 56), (150, 180, 70), (206, 226, 132)]
WATER_GLOW = [(47, 122, 120), (122, 200, 192), (196, 240, 230)]
EMBER = [(150, 40, 20), (230, 96, 30), (255, 150, 50), (255, 220, 140)]
AMBER = [(150, 96, 40), (233, 185, 73), (255, 226, 122)]
RED_EYE = [(120, 24, 24), (200, 50, 40), (255, 120, 90)]

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
N8 = N4 + ((1, 1), (-1, -1), (1, -1), (-1, 1))
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def bay(x: int, y: int) -> float:
    return (BAYER[y % 4][x % 4] + 0.5) / 16


# ── Conjuntos de pontos ─────────────────────────────────────────────────────────

def ell(cx, cy, rx, ry):
    rx, ry = max(rx, 0.5), max(ry, 0.5)
    return [(x, y) for y in range(math.floor(cy - ry), math.ceil(cy + ry) + 1)
            for x in range(math.floor(cx - rx), math.ceil(cx + rx) + 1)
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0]


def rect(x0, y0, w, h):
    return [(x, y) for y in range(y0, y0 + h) for x in range(x0, x0 + w)]


def trap(y0, y1, l0, r0, l1, r1):
    pts = []
    for y in range(y0, y1 + 1):
        k = (y - y0) / max(1, y1 - y0)
        a = round(l0 + (l1 - l0) * k)
        b = round(r0 + (r1 - r0) * k)
        pts += [(x, y) for x in range(a, b + 1)]
    return pts


def seg(x0, y0, x1, y1, r0, r1=None):
    """Cápsula do segmento (x0,y0)-(x1,y1), raio de r0 a r1."""
    r1 = r0 if r1 is None else r1
    R = max(r0, r1)
    pts = []
    dx, dy = x1 - x0, y1 - y0
    ll = dx * dx + dy * dy or 1e-6
    for y in range(math.floor(min(y0, y1) - R), math.ceil(max(y0, y1) + R) + 1):
        for x in range(math.floor(min(x0, x1) - R), math.ceil(max(x0, x1) + R) + 1):
            t = max(0.0, min(1.0, ((x - x0) * dx + (y - y0) * dy) / ll))
            px, py = x0 + dx * t, y0 + dy * t
            r = r0 + (r1 - r0) * t
            if (x - px) ** 2 + (y - py) ** 2 <= r * r + 0.25:
                pts.append((x, y))
    return pts


def polyp(pts):
    c = Canvas(400, 400)
    c.poly([(x + 100, y + 100) for x, y in pts], (1, 1, 1))
    return [(x - 100, y - 100) for (x, y) in c.mask()]


def path(points, r0, r1=None):
    """Tubo por uma polilinha (lista de (x, y)), raio de r0 a r1 ao longo dela."""
    r1 = r0 if r1 is None else r1
    out = set()
    n = len(points) - 1
    for i in range(n):
        ra = r0 + (r1 - r0) * i / n
        rb = r0 + (r1 - r0) * (i + 1) / n
        out.update(seg(*points[i], *points[i + 1], ra, rb))
    return sorted(out)


# ── Sombreado por normal (luz de cima-esquerda, um pouco de frente) ─────────────

_LX, _LY, _LZ = -0.56, -0.66, 0.50
_LN = math.sqrt(_LX * _LX + _LY * _LY + _LZ * _LZ)
_LX, _LY, _LZ = _LX / _LN, _LY / _LN, _LZ / _LN


def shade(c, pts, ramp, kind='sphere', spec=True, box=None, bias=0.0, hi=0.86):
    """Pinta a forma com a rampa pela normal aproximada.
    kind: 'sphere' (bolha), 'cylx' (cilindro de pé), 'cyly' (cilindro deitado), 'flat' (placa)."""
    pts = list(pts)
    if not pts:
        return
    if box is None:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        rx, ry = (max(xs) - min(xs)) / 2 + 0.6, (max(ys) - min(ys)) / 2 + 0.6
    else:
        cx, cy, rx, ry = box
    n = len(ramp)
    lo = -0.8
    for (x, y) in pts:
        nx, ny = (x - cx) / rx, (y - cy) / ry
        if kind == 'cylx':
            ny = -0.25 + ny * 0.25
        elif kind == 'cyly':
            nx = -0.2 + nx * 0.25
        elif kind == 'flat':
            nx, ny = nx * 0.4, ny * 0.4
        d = nx * nx + ny * ny
        if d > 0.98:
            s = math.sqrt(d / 0.98)
            nx, ny, d = nx / s, ny / s, 0.98
        nz = math.sqrt(1 - d)
        lam = nx * _LX + ny * _LY + nz * _LZ + bias
        if spec and lam > hi:
            i = n - 1
        else:
            m = n - 1 if spec else n
            i = int((lam - lo) / (hi - lo) * m)
            i = max(0, min(m - 1, i))
        c.p(x, y, ramp[i])


def shade_tube(c, points, r0, r1, ramp, spec=True, hi=0.86, bias=0.0, only=None):
    """Tubo por uma polilinha, sombreado pela normal em volta da linha do meio
    (rabo, enguia, perna fina, tentáculo). `only`: limita aos pontos dados."""
    n_seg = len(points) - 1
    acc = {}
    for i in range(n_seg):
        (x0, y0), (x1, y1) = points[i], points[i + 1]
        ra = r0 + (r1 - r0) * i / n_seg
        rb = r0 + (r1 - r0) * (i + 1) / n_seg
        dx, dy = x1 - x0, y1 - y0
        ll = dx * dx + dy * dy or 1e-6
        R = max(ra, rb)
        for y in range(math.floor(min(y0, y1) - R - 1), math.ceil(max(y0, y1) + R) + 2):
            for x in range(math.floor(min(x0, x1) - R - 1), math.ceil(max(x0, x1) + R) + 2):
                t = max(0.0, min(1.0, ((x - x0) * dx + (y - y0) * dy) / ll))
                px, py = x0 + dx * t, y0 + dy * t
                r = ra + (rb - ra) * t
                d2 = (x - px) ** 2 + (y - py) ** 2
                if d2 <= r * r + 0.25:
                    q = d2 / max(r * r, 0.01)
                    if (x, y) not in acc or q < acc[(x, y)][0]:
                        acc[(x, y)] = (q, (x - px) / max(r, 0.5), (y - py) / max(r, 0.5))
    n = len(ramp)
    lo = -0.8
    for (x, y), (_, nx, ny) in acc.items():
        if only is not None and (x, y) not in only:
            continue
        d = nx * nx + ny * ny
        if d > 0.98:
            s = math.sqrt(d / 0.98)
            nx, ny, d = nx / s, ny / s, 0.98
        nz = math.sqrt(1 - d)
        lam = nx * _LX + ny * _LY + nz * _LZ + bias
        if spec and lam > hi:
            i = n - 1
        else:
            m = n - 1 if spec else n
            i = max(0, min(m - 1, int((lam - lo) / (hi - lo) * m)))
        c.p(x, y, ramp[i])
    return sorted(acc)


def tone(ramp, i):
    return ramp[max(0, min(len(ramp) - 1, i))]


def darker(col, k=0.72):
    return mul(col, k)


# ── Peça e compositor ───────────────────────────────────────────────────────────

class Pt(Canvas):
    """Uma peça: desenhada no próprio canvas, depois contornada e colada pelo compositor."""

    def __init__(self, w, h):
        self.glow = {}
        super().__init__(w, h)

    def p(self, x, y, c):
        super().p(x, y, c)
        self.glow.pop((int(x), int(y)), None)

    def fill(self, pts, col):
        for x, y in pts:
            self.p(x, y, col)

    def vol(self, pts, ramp, **kw):
        shade(self, pts, ramp, **kw)

    def lit(self, x, y, col, lvl=2, var=False):
        """Pixel de brilho (olho, brasa, lanterna): nas variantes vira a cor de ênfase do ato.
        var=True: só brilha nas variantes (na peça base fica a cor dada)."""
        self.p(x, y, col)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.glow[(int(x), int(y))] = (lvl, var)

    def shift_line(self, pts, k=0.72):
        for x, y in pts:
            v = self.g(x, y)
            if v is not None:
                self.p(x, y, mul(v, k))


class Spr:
    """Quadro final: cor por pixel e tipo (0 corpo, 1 linha de dentro, 3 contorno OL, 4 efeito)."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]
        self.k = [[0] * w for _ in range(h)]

    def put(self, x, y, col, kind=0):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = col
            self.k[y][x] = kind

    def copy(self):
        o = Spr(self.w, self.h)
        o.px = [r[:] for r in self.px]
        o.k = [r[:] for r in self.k]
        return o

    def bbox(self, solid=False):
        deco = getattr(self, 'deco', set()) if solid else set()
        pts = [(x, y) for y in range(self.h) for x in range(self.w)
               if self.px[y][x] is not None and not (solid and (self.k[y][x] == 4 or (x, y) in deco))]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return min(xs), min(ys), max(xs), max(ys)

    def image(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        p = im.load()
        for y in range(self.h):
            for x in range(self.w):
                c = self.px[y][x]
                if c is not None:
                    p[x, y] = (c[0], c[1], c[2], 255)
        return im


def line_col(avg):
    return mix(mul(avg, 0.5), OL, 0.3)


class Comp(Spr):
    def __init__(self, w, h, act, mode='', alloc=None, seed=0):
        super().__init__(w, h)
        self.act, self.mode = act, mode
        self.alloc = alloc or {}
        self.areas = {}
        self.seed = seed
        acc = ACT_ACC[act]
        im, ih = ACCENT[act]
        self.acc_mid, self.acc_hi = acc[im], acc[ih]
        self.phase2 = mode == 'phase2'
        self.var = bool(mode)
        self.deco = set()            # enfeites soltos (esporos): não contam no limite do salto

    def new(self):
        return Pt(self.w, self.h)

    # cor de ênfase para pixels que o desenho já quer brilhando na variante
    def glowc(self, lvl=2):
        return self.acc_hi if lvl == 2 else self.acc_mid

    def add(self, c, dx=0, dy=0, name=None, line=True, fx=False, k_line=None, deco=False):
        dx, dy = int(dx), int(dy)
        pts = c.mask()
        if not pts:
            return
        if name:
            self.areas[name] = self.areas.get(name, 0) + len(pts)
        if self.mode:
            self._variant(c, name)
            pts = c.mask()
        lines = {}
        if line and not fx:
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            for y in range(min(ys) - 1, max(ys) + 2):
                for x in range(min(xs) - 1, max(xs) + 2):
                    if c.g(x, y) is not None:
                        continue
                    nb = [c.g(x + ax, y + ay) for ax, ay in N4]
                    nb = [v for v in nb if v is not None]
                    if nb:
                        avg = tuple(sum(v[i] for v in nb) // len(nb) for i in range(3))
                        lines[(x, y)] = k_line(avg) if k_line else line_col(avg)
        for (x, y) in pts:
            self.put(x + dx, y + dy, c.px[y][x], 4 if fx else 0)
        for (x, y), col in lines.items():
            self.put(x + dx, y + dy, col, 1)
        if deco:
            self.deco.update((x + dx, y + dy) for (x, y) in list(pts) + list(lines))

    def _variant(self, c, name):
        s, f, _ = MODES[self.mode]
        tint = ACT_RAMP[self.act][3]
        deep = self.mode == 'deep'
        for (x, y) in c.mask():
            g = c.glow.get((x, y))
            if g:
                lvl = g[0]
                c.px[y][x] = self.acc_hi if lvl == 2 else self.acc_mid
            else:
                c.px[y][x] = remap(c.px[y][x], self.act, s, f, tint)
        n = self.alloc.get(name, 0)
        if n:
            place_marks(c, n, self.act, deep, hash((name, self.mode, self.seed)) & 0xFFFF, self.acc_mid)

    def finish(self):
        w, h = self.w, self.h
        px, k = self.px, self.k

        def empty(x, y):
            return not (0 <= x < w and 0 <= y < h) or px[y][x] is None

        conv = [(x, y) for y in range(h) for x in range(w)
                if px[y][x] is not None and k[y][x] == 1 and any(empty(x + ax, y + ay) for ax, ay in N4)]
        for x, y in conv:
            px[y][x] = OL
            k[y][x] = 3
        add = [(x, y) for y in range(h) for x in range(w)
               if px[y][x] is None and any(not empty(x + ax, y + ay) and k[y + ay][x + ax] == 0 for ax, ay in N4)]
        for x, y in add:
            px[y][x] = OL
            k[y][x] = 3
        return self


_RC = {}


def remap(col, act, s, f, tint):
    key = (col, act, s, f)
    if key in _RC:
        return _RC[key]
    r, g, b = col
    l = 0.3 * r + 0.59 * g + 0.11 * b
    r, g, b = [(l + (v - l) * s) * f for v in (r, g, b)]
    r, g, b = r * 0.82 + tint[0] * 0.18, g * 0.82 + tint[1] * 0.18, b * 0.82 + tint[2] * 0.18
    out = (max(0, min(255, round(r))), max(0, min(255, round(g))), max(0, min(255, round(b))))
    _RC[key] = out
    return out


# ── Marcas de corrupção (desenhadas no pixel novo) ─────────────────────────────

MARK = {
    'I': dict(dark=(24, 24, 22), mat=[(44, 62, 40), (78, 96, 66), (112, 130, 84)], glow=(150, 96, 40)),
    'II': dict(dark=(40, 22, 16), mat=[(70, 34, 22), (110, 56, 32), (156, 84, 44)], glow=(196, 120, 60)),
    'III': dict(dark=(30, 22, 50), mat=[(62, 84, 34), (94, 122, 46), (150, 180, 70)], glow=(150, 180, 70)),
}


def _interior(c, x, y, r=1):
    for ay in range(-r, r + 1):
        for ax in range(-r, r + 1):
            if c.g(x + ax, y + ay) is None or (x + ax, y + ay) in c.glow:
                return False
    return True


def place_marks(c, n, act, deep, seed, acc_mid):
    pts = c.mask()
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, y0, bw, bh = min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    placed = []
    M = MARK[act]
    gl = M['glow'] if deep else acc_mid
    for i in range(160):
        if len(placed) >= n:
            break
        mx = x0 + int((0.1 + hsh(i, 0, seed) * 0.8) * bw)
        my = y0 + int((0.15 + hsh(i, 1, seed) * 0.75) * bh)
        if not _interior(c, mx, my, 2):
            continue
        if any(abs(mx - a) + abs(my - b) < 10 for a, b in placed):
            continue
        placed.append((mx, my))
        kind = len(placed) % 2
        r = hsh(i, 2, seed)
        if act == 'I':
            if kind:                                   # rachadura com brasa fraca
                x, y = mx, my
                L_ = 5 + int(r * 4) + (0 if deep else 2)
                for j in range(L_):
                    if c.g(x, y) is not None and (x, y) not in c.glow:
                        c.p(x, y, M['dark'])
                        if j == L_ // 2 or (not deep and j == L_ // 2 + 2):
                            c.p(x, y, gl)
                    y += 1
                    x += (1 if hsh(i, j + 3, seed) < 0.35 else (-1 if hsh(i, j + 3, seed) > 0.7 else 0))
            else:                                      # tufo de musgo
                for (ax, ay, t) in ((0, 0, 1), (1, 0, 1), (-1, 1, 0), (0, 1, 1), (1, 1, 0), (2, 1, 0), (0, -1, 2), (-1, 0, 2)):
                    if r < 0.5 and ax == 2:
                        continue
                    if c.g(mx + ax, my + ay) is not None and (mx + ax, my + ay) not in c.glow:
                        c.p(mx + ax, my + ay, M['mat'][t])
                if c.g(mx + 1, my + 2) is not None:
                    c.p(mx + 1, my + 2, M['dark'])
        elif act == 'II':                              # ferrugem: mancha redonda com escorrido
            for (ax, ay, t) in ((0, 0, 2), (1, 0, 1), (0, 1, 1), (1, 1, 0), (-1, 1, 0) if r > 0.5 else (2, 0, 0)):
                if c.g(mx + ax, my + ay) is not None and (mx + ax, my + ay) not in c.glow:
                    c.p(mx + ax, my + ay, M['mat'][t])
            dl = 2 + int(r * 3) + (0 if deep else 2)
            for j in range(dl):
                x, y = mx + 1, my + 2 + j
                if c.g(x, y) is not None and (x, y) not in c.glow:
                    c.p(x, y, M['mat'][0] if j % 2 == 0 else M['dark'])
            c.p(mx, my, gl)
        else:                                          # esporos: bolinhas com brilho
            for (ax, ay) in ((0, 0), (3, 1), (1, 3)) if not deep else ((0, 0), (3, 1)):
                bx, by = mx + ax - 1, my + ay - 1
                for (qx, qy, t) in ((0, 0, 2), (1, 0, 1), (0, 1, 1), (1, 1, 0)):
                    if c.g(bx + qx, by + qy) is not None and (bx + qx, by + qy) not in c.glow:
                        c.p(bx + qx, by + qy, M['mat'][t])
                if c.g(bx + 2, by + 1) is not None and (bx + 2, by + 1) not in c.glow:
                    c.p(bx + 2, by + 1, M['dark'])
            c.p(mx + 2, my + 2, gl)


def allot(areas, n, minarea=90):
    cand = {k: v for k, v in areas.items() if v >= minarea}
    tot = sum(cand.values())
    if not tot:
        return {}
    raw = {k: n * v / tot for k, v in cand.items()}
    out = {k: int(v) for k, v in raw.items()}
    rest = n - sum(out.values())
    for k in sorted(raw, key=lambda k: raw[k] - out[k], reverse=True)[:rest]:
        out[k] += 1
    return out


def core_burst(c, cx, cy, K, r=3, arms=4, length=9, seed=1):
    """Núcleo exposto da fase 2: brilho no peito e rachaduras irradiando."""
    dark = mix(ACT_RAMP[K.act][0], NOITE, 0.5)
    for (x, y) in ell(cx, cy, r + 1.4, r + 1.0):
        if c.g(x, y) is not None:
            c.p(x, y, dark)
    for (x, y) in ell(cx, cy, r, r * 0.8):
        if c.g(x, y) is not None:
            d = math.hypot(x - cx, (y - cy) * 1.2) / r
            c.lit(x, y, K.acc_hi if d < 0.55 else K.acc_mid, 2 if d < 0.55 else 1)
    angs = [math.pi * (0.25 + 0.5 * i) + (hsh(i, 0, seed) - 0.5) * 0.6 for i in range(arms)]
    for i, a in enumerate(angs):
        x, y = cx + math.cos(a) * (r + 1), cy + math.sin(a) * (r + 1)
        for j in range(length):
            a2 = a + (hsh(i, j, seed + 3) - 0.5) * 0.9
            x += math.cos(a2)
            y += math.sin(a2)
            xi, yi = round(x), round(y)
            if c.g(xi, yi) is None:
                break
            if (j % 3 == 1) and j < length - 2:
                c.lit(xi, yi, K.acc_mid, 1)
            else:
                c.p(xi, yi, dark)


# ── Pose ────────────────────────────────────────────────────────────────────────

class Pose:
    """t: quadro (0–3). Parado: respira 0-1-2-1. Corrida:
    legs  = passada (uma perna sobe de cada vez, o corpo desce na batida);
    float = deriva (o alto balança para um lado, a barra para o outro, sobe e desce);
    hop   = saltinho (achata no pouso)."""

    def __init__(self, t=0, run=False, style='legs', big=False):
        self.t, self.run, self.style = t, run, style
        self.bob = [0, 1, 2, 1][t]
        self.lift = (0, 0)
        self.dx = 0          # deslocamento do alto
        self.ldx = 0         # deslocamento da barra (float)
        self.dy = 0          # deslocamento de tudo
        self.squash = 0
        if run:
            if style == 'legs':
                Lf = 4 if big else 2
                self.bob = [0, 2, 0, 2][t]
                self.lift = [(Lf, 0), (0, 0), (0, Lf), (0, 0)][t]
            elif style == 'float':
                self.bob = 0
                self.dx = [-2, 0, 2, 0][t]
                self.ldx = -self.dx
                self.dy = [0, -2, 0, -2][t]
            else:
                self.bob = 0
                self.dy = -[0, 4, 6, 2][t]
                self.squash = 2 if t == 0 else 0


# ── Quadros de ação (como actions.py da 16-bit, deslocamentos dobrados) ─────────

def _rows(s):
    ys = [y for y in range(s.h) if any(v is not None for v in s.px[y])]
    return min(ys), max(ys)


def shift(s, dx, dy=0):
    o = Spr(s.w, s.h)
    for y in range(s.h):
        for x in range(s.w):
            if s.px[y][x] is not None:
                o.put(x + dx, y + dy, s.px[y][x], s.k[y][x])
    return o


def lean(s, amt):
    y0, y1 = _rows(s)
    o = Spr(s.w, s.h)
    for y in range(s.h):
        off = round(amt * (y1 - y) / max(1, y1 - y0))
        for x in range(s.w):
            if s.px[y][x] is not None:
                o.put(x + off, y, s.px[y][x], s.k[y][x])
    return o


def squash(s, keep):
    y0, y1 = _rows(s)
    h = y1 - y0 + 1
    nh = max(5, round(h * keep))
    o = Spr(s.w, s.h)
    for j in range(nh):
        sy = y1 - round(j * (h - 1) / max(1, nh - 1))
        for x in range(s.w):
            if s.px[sy][x] is not None:
                o.put(x, y1 - j, s.px[sy][x], s.k[sy][x])
    return o


def flash(s):
    o = s.copy()
    for y in range(s.h):
        for x in range(s.w):
            if o.px[y][x] is None:
                continue
            kk = o.k[y][x]
            if kk == 3:
                continue
            o.px[y][x] = (206, 198, 182) if kk == 1 else WHITE
    return o


def dissolve(s, amount, seed, rise=2):
    o = Spr(s.w, s.h)
    dust = [(78, 82, 92), (104, 108, 116), (62, 64, 72)]
    for y in range(s.h):
        for x in range(s.w):
            v = s.px[y][x]
            if v is None:
                continue
            r = hsh(x, y, seed)
            if r < amount:
                if r > amount * 0.72 and y - rise >= 0:
                    o.put(x, y - rise - int(r * 6), dust[int(hsh(x, y, seed + 1) * 3)], 4)
            else:
                o.put(x, y, v, s.k[y][x])
    return o


def smear(s, d):
    """Rastro curto do golpe na frente do corpo (meia-lua clara, sem brilho)."""
    o = s.copy()
    y0, y1 = _rows(s)
    h = y1 - y0 + 1
    ya, yb = y0 + int(h * 0.18), y0 + int(h * 0.58)
    n = max(1, yb - ya)
    for j, y in enumerate(range(ya, yb)):
        xs = [x for x in range(s.w) if s.px[y][x] is not None]
        if not xs:
            continue
        edge = max(xs) if d > 0 else min(xs)
        bulge = math.sin(math.pi * j / n)
        off = 2 + round(bulge * 4)
        thick = 1 + (1 if bulge > 0.35 else 0) + (1 if bulge > 0.8 else 0)
        for q in range(thick):
            x = edge + d * (off + q)
            if 0 <= x < s.w and o.px[y][x] is None:
                o.put(x, y, WHITE if q == thick - 1 or thick == 1 else PALE, 4)
    return o


def combat(base, d=1):
    b = base
    att = [lean(b, -2 * d), lean(shift(b, 2 * d), 2 * d), smear(lean(shift(b, 2 * d), 4 * d), d), shift(b, 2 * d)]
    hurt = [flash(b), lean(shift(b, -2 * d), -2 * d)]
    s2 = shift(b, -2 * d)
    death = [lean(s2, -4 * d), lean(squash(s2, 0.8), -2 * d), squash(s2, 0.5),
             dissolve(squash(s2, 0.3), 0.45, 7, 2), dissolve(squash(s2, 0.2), 0.85, 9, 4)]
    return att + hurt + death


# ── Montagem da folha ───────────────────────────────────────────────────────────

class Monster:
    def __init__(self, mid, fn, size, act, style, kind, big=False):
        self.mid, self.fn, self.size, self.act, self.style, self.kind = mid, fn, size, act, style, kind
        self.big = big

    def frame(self, P, mode='', alloc=None):
        w, h = self.size
        K = Comp(w, h, self.act, mode, alloc, seed=sum(map(ord, self.mid)))
        self.fn(K, P)
        return K

    def frames(self, mode=''):
        alloc = None
        if mode:
            ref = self.frame(Pose(0), '')
            area = sum(ref.areas.values())
            n = MODES[mode][2]
            n = max(n, round(n * min(1.6, (area / 1400) ** 0.5)))
            alloc = allot(ref.areas, n)
        base = [self.frame(Pose(t), mode, alloc).finish() for t in range(4)]
        poses = [Pose(t, True, self.style, self.big) for t in range(4)]
        x0, top, x1, _ = base[0].bbox(solid=True)
        if self.style == 'hop':                       # o salto não passa do topo do quadro
            for P in poses:
                P.dy = max(P.dy, -top)
        elif self.style == 'float':                   # a deriva não sai pelos lados
            room = (x0, self.size[0] - 1 - x1)
            for P in poses:
                P.dx = max(-room[0], min(room[1], P.dx))
                P.ldx = max(-room[0], min(room[1], P.ldx))
        run = [self.frame(P, mode, alloc).finish() for P in poses]
        return base + run + combat(base[0], 1)


def sheet_img(frames):
    return L.sheet([f.image() for f in frames])


# ── Retrato 64×72 ───────────────────────────────────────────────────────────────

def portrait(frame, kind, act):
    W, H = 64, 72
    ramp = ACT_RAMP[act]
    o = Spr(W, H)
    for y in range(H):
        for x in range(W):
            v = 1.0 + 2.2 * (y / (H - 1))
            lo = int(v)
            fr = v - lo
            o.put(x, y, ramp[min(7, lo + (1 if fr > bay(x, y) else 0))])
    x0, y0, x1, y1 = frame.bbox()
    if kind == 'boss':
        left = (x0 + x1 + 1) // 2 - 32
        for y in range(68):
            for x in range(64):
                sx, sy = left + x, y0 + y
                if 0 <= sx < frame.w and sy < frame.h and frame.px[sy][sx] is not None:
                    o.put(x, y + 4, frame.px[sy][sx])
    else:
        low = (y1 - y0) < 32
        left = x1 - 31 if low else round((x0 + x1 + 1) / 2 - 16)
        rows = min(34, y1 - y0 + 1)
        oy = H - rows * 2 - 2 if low else 4
        for y in range(rows):
            for x in range(32):
                sx, sy = left + x, y0 + y
                if 0 <= sx < frame.w and sy < frame.h and frame.px[sy][sx] is not None:
                    for q in range(4):
                        o.put(x * 2 + q % 2, oy + y * 2 + q // 2, frame.px[sy][sx])
    inner = mix(ramp[0], NOITE, 0.4)
    for x in range(W):
        o.put(x, 0, OL); o.put(x, H - 1, OL)
        o.put(x, 1, inner); o.put(x, H - 2, inner)
    for y in range(H):
        o.put(0, y, OL); o.put(W - 1, y, OL)
        o.put(1, y, inner); o.put(W - 2, y, inner)
    for (x, y) in ((0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)):
        o.px[y][x] = None
    for (x, y) in ((1, 1), (W - 2, 1), (1, H - 2), (W - 2, H - 2)):
        o.px[y][x] = OL
    return o
