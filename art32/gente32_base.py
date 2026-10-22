"""Base dos geradores 32-bit de gente e bichos (prefeito, moradores, crianças, cães e gatos).

Mesma ideia dos modelos detalhados dos heróis (pack16/hd24.py): cada peça (perna, casaco,
braço, cabeça, chapéu...) é desenhada no seu próprio canvas, sombreada por uma normal
aproximada (luz de cima-esquerda) e contornada sozinha. Na montagem, o contorno de cada
peça vira:
  · OL (preto-quente) onde encosta no fundo — a silhueta de fora;
  · a cor da própria peça escurecida onde passa por cima de outra peça (contorno colorido).
Nada aqui usa arte de terceiros.
"""
from __future__ import annotations

import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import lib32 as L  # noqa: E402
from lib32 import Canvas, OL, mix, mul, hsh, noise  # noqa: E402,F401

# ── Rampas (escuro → claro) ───────────────────────────────────────────────

SKIN = [(132, 80, 60), (178, 124, 92), (214, 162, 124), (236, 194, 156), (248, 216, 184)]
SKIN_DARK = [(64, 38, 28), (98, 62, 44), (134, 88, 62), (164, 114, 80), (190, 140, 102)]
TEAL = [(16, 48, 52), (28, 80, 82), (44, 116, 114), (72, 156, 148), (116, 196, 186)]
HAT = [(10, 9, 13), (24, 24, 30), (38, 38, 46), (58, 60, 70), (86, 90, 102)]
CHAR = [(22, 22, 28), (36, 36, 44), (54, 56, 64), (78, 82, 92), (104, 110, 120)]
WHITE_HAIR = [(108, 110, 122), (148, 154, 166), (188, 194, 202), (222, 224, 224), (248, 244, 232)]
GOLD = [(98, 62, 26), (150, 106, 40), (200, 156, 64), (236, 196, 88), (255, 232, 140)]
BRASS = [(82, 56, 28), (130, 92, 44), (176, 132, 62), (214, 176, 90)]
FIRE = [(150, 40, 20), (226, 96, 30), (255, 160, 56), (255, 214, 120), (255, 244, 200)]
RED = [(66, 18, 24), (104, 30, 36), (146, 50, 50), (182, 72, 66), (212, 104, 90)]
BOOT = [(30, 20, 14), (50, 34, 24), (78, 54, 36), (106, 76, 50), (136, 100, 66)]
LEATHER = [(48, 32, 20), (78, 54, 34), (108, 76, 46), (140, 102, 64), (170, 130, 86)]
TROUSER = [(44, 30, 20), (70, 48, 32), (98, 70, 46), (128, 94, 60), (152, 116, 76)]
GREEN = [(28, 46, 32), (44, 70, 44), (62, 96, 60), (90, 124, 74), (118, 152, 90)]
STRAW = [(108, 74, 30), (150, 110, 50), (190, 150, 72), (218, 180, 98), (242, 212, 132)]
BLUE = [(24, 34, 62), (38, 56, 94), (56, 86, 136), (76, 120, 190), (112, 156, 220)]
LINEN = [(132, 120, 100), (172, 162, 140), (206, 198, 176), (230, 224, 204), (246, 242, 228)]
SCARF = [(84, 28, 30), (124, 46, 46), (160, 66, 64), (190, 92, 84), (216, 124, 108)]
PURPLE = [(30, 22, 40), (50, 38, 64), (74, 60, 92), (100, 84, 122), (132, 110, 156)]
ROPE = [(110, 78, 34), (150, 112, 52), (196, 156, 78), (232, 196, 104)]
IRON = [(40, 42, 50), (66, 70, 80), (98, 104, 114), (136, 144, 154), (182, 190, 198), (236, 238, 236)]
GAMBESON = [(70, 22, 28), (100, 38, 42), (140, 58, 58), (176, 76, 74), (204, 106, 96)]
WOOD = [(36, 24, 16), (60, 40, 26), (90, 62, 40), (120, 86, 54), (150, 112, 72)]
WAX = [(150, 140, 120), (196, 188, 168), (230, 224, 206), (248, 244, 232)]
HAIR = {
    'brown': [(44, 26, 14), (72, 44, 24), (104, 68, 36), (136, 94, 52), (164, 120, 70)],
    'black': [(10, 9, 12), (24, 22, 26), (40, 36, 42), (60, 56, 62), (84, 78, 86)],
    'blond': [(120, 84, 36), (168, 128, 58), (210, 170, 86), (232, 200, 116), (248, 228, 158)],
    'grey': [(84, 86, 96), (124, 128, 138), (164, 170, 178), (204, 208, 212), (236, 236, 236)],
    'red': [(86, 30, 18), (130, 50, 28), (172, 78, 40), (206, 112, 60), (232, 150, 92)],
}
EYE = (14, 10, 12)
WHITE = (244, 240, 228)
LIP = (150, 66, 62)
LIP_DARK = (104, 48, 40)


# ── Formas ────────────────────────────────────────────────────────────────

def ell(cx, cy, rx, ry):
    rx, ry = max(rx, 0.01), max(ry, 0.01)
    return [(x, y) for y in range(int(math.floor(cy - ry)), int(math.ceil(cy + ry)) + 1)
            for x in range(int(math.floor(cx - rx)), int(math.ceil(cx + rx)) + 1)
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0]


def rect(x0, y0, w, h):
    return [(x, y) for y in range(y0, y0 + h) for x in range(x0, x0 + w)]


def trap(y0, y1, l0, r0, l1, r1):
    """Trapézio de y0 a y1 com as bordas interpoladas (inclusivo)."""
    pts = []
    for y in range(y0, y1 + 1):
        k = (y - y0) / max(1, y1 - y0)
        a = round(l0 + (l1 - l0) * k)
        b = round(r0 + (r1 - r0) * k)
        pts += [(x, y) for x in range(a, b + 1)]
    return pts


def rows_of(pts):
    rows = {}
    for (x, y) in pts:
        rows.setdefault(y, []).append(x)
    return {y: (min(xs), max(xs)) for y, xs in rows.items()}


def cols_of(pts):
    cols = {}
    for (x, y) in pts:
        cols.setdefault(x, []).append(y)
    return {x: (min(ys), max(ys)) for x, ys in cols.items()}


def stroke(path, r0, r1=None):
    """Pontos de um traço grosso por uma lista de (x, y), raio de r0 a r1."""
    r1 = r0 if r1 is None else r1
    pts = set()
    n = len(path)
    for i, (x, y) in enumerate(path):
        r = r0 + (r1 - r0) * i / max(1, n - 1)
        for p in ell(x, y, r, r):
            pts.add(p)
    return sorted(pts)


def bez(p0, p1, p2, n=24):
    out = []
    for i in range(n + 1):
        t = i / n
        a, b, c = (1 - t) ** 2, 2 * (1 - t) * t, t * t
        out.append((a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]))
    return out


def mirror_pts(pts, axis2):
    """Espelha pontos em x: x' = axis2 - x (axis2 = 2·centro − 1)."""
    return [(axis2 - x, y) for (x, y) in pts]


# ── Sombreamento ──────────────────────────────────────────────────────────

def shade(c, pts, pal, lx=-0.6, ly=-0.8, spec=True, box=None, bias=0.0):
    """Pinta pela normal aproximada da caixa (luz de cima-esquerda), como no hd24."""
    pts = list(pts)
    if not pts:
        return
    if box is None:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        box = (min(xs), min(ys), max(xs), max(ys))
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = max(1, (x1 - x0) / 2), max(1, (y1 - y0) / 2)
    n = len(pal)
    for (x, y) in pts:
        nx, ny = (x - cx) / rx, (y - cy) / ry
        v = -(nx * lx + ny * ly) * 0.7 + 0.15 + bias
        i = max(0, min(n - 1, int((v + 1) / 2 * n + 0.15)))
        if not spec and i == n - 1:
            i = n - 2
        c.p(x, y, pal[i])


def shade_cyl(c, pts, pal, lit=0.35, spec=True, bias=0.0):
    """Cilindro em pé (braço, perna, manga): luz pela esquerda, borda direita escura."""
    pts = list(pts)
    if not pts:
        return
    rows = rows_of(pts)
    n = len(pal)
    for (x, y) in pts:
        a, b = rows[y]
        k = 0.5 if b == a else (x - a) / (b - a)
        v = 1.0 - abs(k - lit) * 1.6 - (0.25 if k > 0.8 else 0) + bias
        i = max(0, min(n - 1, int(v * n)))
        if not spec and i == n - 1:
            i = n - 2
        c.p(x, y, pal[i])


def edge(col):
    """Cor do contorno de dentro: o próprio material bem escurecido, puxado para o OL."""
    return mix(mul(col, 0.5), OL, 0.3)


# ── Montagem por peças ────────────────────────────────────────────────────

class Rig:
    """Junta peças (canvas próprios) de trás para frente, com o contorno de cada uma."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.layers = []

    def part(self, fn, dx=0, dy=0, ring='full'):
        c = Canvas(self.w, self.h)
        fn(c)
        self.layers.append((c, dx, dy, ring))
        return c

    def canvas(self, c, dx=0, dy=0, ring='full'):
        self.layers.append((c, dx, dy, ring))

    def build(self) -> Canvas:
        w, h = self.w, self.h
        out = Canvas(w, h)
        line = [[False] * w for _ in range(h)]
        for (c, dx, dy, ring) in self.layers:
            fill = {}
            for y in range(c.h):
                for x in range(c.w):
                    v = c.px[y][x]
                    if v is not None:
                        fill[(x + dx, y + dy)] = v
            if ring:
                rng = {}
                for (x, y), v in fill.items():
                    for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        q = (x + ddx, y + ddy)
                        if q in fill:
                            continue
                        e = edge(v)
                        if q not in rng or sum(e) < sum(rng[q]):
                            rng[q] = e
                for (x, y), e in rng.items():
                    if not (0 <= x < w and 0 <= y < h):
                        continue
                    if ring == 'outer' and out.px[y][x] is not None:
                        continue
                    out.px[y][x] = e
                    line[y][x] = True
            for (x, y), v in fill.items():
                if 0 <= x < w and 0 <= y < h:
                    out.px[y][x] = v
                    line[y][x] = False
        # silhueta: contorno que encosta no fundo vira OL
        def empty(x, y):
            return not (0 <= x < w and 0 <= y < h) or out.px[y][x] is None
        for y in range(h):
            for x in range(w):
                if line[y][x] and any(empty(x + a, y + b) for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    out.px[y][x] = OL
        # peças sem contorno que tocam o fundo ganham OL por fora
        add = []
        for y in range(h):
            for x in range(w):
                if out.px[y][x] is None and any(
                        0 <= x + a < w and 0 <= y + b < h and out.px[y + b][x + a] is not None
                        and not line[y + b][x + a] and out.px[y + b][x + a] != OL
                        for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    add.append((x, y))
        for (x, y) in add:
            out.px[y][x] = OL
        return out


def frames_sheet(frames):
    fw, fh = frames[0].w, frames[0].h
    sh = Canvas(fw * len(frames), fh)
    for i, f in enumerate(frames):
        sh.paste(f, i * fw, 0)
    return sh


def dot(c, x, y, col):
    c.p(x, y, col)


def hline(c, x0, x1, y, col):
    for x in range(min(x0, x1), max(x0, x1) + 1):
        c.p(x, y, col)


def vline(c, x, y0, y1, col):
    for y in range(min(y0, y1), max(y0, y1) + 1):
        c.p(x, y, col)


def recolor(c, pts, fn):
    for (x, y) in pts:
        v = c.g(x, y)
        if v is not None:
            c.p(x, y, fn(v, x, y))


def inside(c, x, y):
    return c.g(x, y) is not None
