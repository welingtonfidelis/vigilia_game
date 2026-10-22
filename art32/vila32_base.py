"""Base dos geradores 32-bit da vila (enfeites, natureza, tiles do chão e efeitos pequenos).

Amplia o lib32 com o que as peças da vila pedem: tela com contorno por dentro, máscara da
peça 16-bit no dobro (para conferir que a silhueta 32-bit cobre o mesmo lugar), luz por
normal (cilindro, esfera e "almofada" para formas soltas), quantização na rampa com
pontilhado ordenado e texturas de madeira, pedra, folhagem e chão que emendam sem costura.
Nada aqui usa arte de terceiros: tudo é desenhado por código.
"""
from __future__ import annotations

import math
import os
import sys
from typing import Callable, Iterable, Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402

# Paletas do lib32 que as peças da vila usam (reexportadas daqui).
from lib32 import (  # noqa: E402,F401
    CLOTH_RED, FIRE, GOLD, IRON, LINEN, OL, ROOF_RED, STEEL, WARM_LIGHT, Canvas, hsh, mix, mul, noise,
    path16, preview, save32, scale2x,
)

RGB = tuple[int, int, int]
Pt = tuple[int, int]

# Rampas próprias da vila (escuro → claro), afinadas com os tons das peças 16-bit.
WOODV = [(30, 21, 16), (48, 33, 24), (68, 47, 32), (92, 64, 42), (120, 86, 54), (150, 112, 70)]
STRAW = [(92, 64, 30), (138, 100, 44), (184, 140, 62), (218, 178, 84), (240, 210, 120)]
ROCK = [(40, 40, 48), (60, 62, 72), (82, 86, 96), (106, 112, 120), (134, 142, 150), (166, 174, 182)]
BROWNROCK = [(34, 24, 18), (54, 38, 26), (78, 54, 36), (104, 74, 48), (132, 98, 62), (162, 124, 82)]
REDLEAF = [(52, 18, 22), (84, 28, 32), (116, 40, 44), (148, 56, 58), (176, 76, 72), (204, 106, 92)]
FOLIAGE = [(24, 40, 28), (36, 58, 38), (52, 80, 50), (72, 104, 60), (96, 130, 74), (126, 158, 92)]
PINEV = [(16, 30, 26), (24, 46, 36), (36, 64, 46), (52, 86, 58), (74, 112, 70), (100, 138, 86)]
VIOLET = [(26, 12, 38), (52, 24, 76), (86, 40, 122), (128, 66, 172), (176, 112, 224), (226, 182, 250)]
CORRUPT = [(20, 12, 24), (34, 20, 40), (52, 32, 62), (74, 48, 88), (98, 70, 114)]
GRAVESTONE = [(46, 50, 58), (68, 74, 84), (92, 100, 110), (118, 126, 136), (148, 156, 164), (176, 184, 190)]
MOSSV = [(38, 56, 34), (58, 82, 44), (84, 110, 58), (112, 138, 72)]
TEAL = [(18, 52, 56), (30, 82, 86), (47, 122, 120), (74, 158, 152), (122, 200, 192), (196, 240, 230)]
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

# Luz de cima e da esquerda, um pouco de frente (x para a direita, y para baixo, z para fora).
_l = (-0.55, -0.62, 0.56)
_n = math.sqrt(sum(v * v for v in _l))
LIGHT = tuple(v / _n for v in _l)


def bayer(x: int, y: int) -> float:
    return (BAYER[y & 3][x & 3] + 0.5) / 16.0


def quant(v: float, pal: Sequence[RGB], x: int = 0, y: int = 0, dither: float = 0.0) -> RGB:
    """Tom da rampa para v em [0, 1], com pontilhado ordenado opcional nas transições."""
    v = max(0.0, min(1.0, v))
    f = v * (len(pal) - 1)
    if dither:
        f += (bayer(x, y) - 0.5) * dither
    i = int(math.floor(f + 0.5))
    return pal[max(0, min(len(pal) - 1, i))]


def lit(nx: float, ny: float, nz: float, amb: float = 0.18) -> float:
    """Difusa (0–1) para uma normal; amb é o piso do lado da sombra."""
    n = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
    d = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / n
    return amb + (1 - amb) * max(0.0, d)


class K(Canvas):
    """Tela da vila: Canvas do lib32 com contorno por dentro e utilidades de máscara."""

    def has(self, x: int, y: int) -> bool:
        return self.g(x, y) is not None

    def fill(self, pts: Iterable[Pt], col) -> None:
        for x, y in pts:
            self.p(x, y, col)

    def put(self, x: int, y: int, col, only_on: bool = False) -> None:
        """Pinta; com only_on, só onde já tem tinta (não muda a silhueta)."""
        if only_on and not self.has(int(x), int(y)):
            return
        self.p(x, y, col)

    def outline_in(self, col: RGB = OL, keep: Optional[set] = None) -> None:
        """Contorno de 1 px por dentro: o pixel da borda da silhueta vira OL."""
        edge = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is None or (keep and (x, y) in keep):
                    continue
                if any(self.g(x + dx, y + dy) is None for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    edge.append((x, y))
        for x, y in edge:
            self.px[y][x] = col

    def inner_line(self, pts: Iterable[Pt], k: float = 0.55) -> None:
        """Linha interna na cor do material escurecida (contorno colorido)."""
        for x, y in pts:
            c = self.g(x, y)
            if c is not None and c != OL:
                self.px[y][x] = mul(c, k)

    def sub(self, x0: int, y0: int, w: int, h: int) -> 'K':
        o = K(w, h)
        for y in range(h):
            for x in range(w):
                o.px[y][x] = self.g(x0 + x, y0 + y)
        return o


def canvas_of(img: Image.Image) -> K:
    c = K(img.width, img.height)
    c.px = Canvas.from_image(img).px
    return c


# ── Peça 16-bit de referência ─────────────────────────────────────────────

def load16(file: str) -> Image.Image:
    return Image.open(path16(file)).convert('RGBA')


def mask2(file: str, smooth: bool = False) -> set[Pt]:
    """Silhueta da 16-bit no dobro (vizinho mais próximo ou Scale2x nas diagonais)."""
    im = load16(file)
    a = Image.new('RGBA', im.size, (0, 0, 0, 0))
    pa, pi = a.load(), im.load()
    for y in range(im.height):
        for x in range(im.width):
            if pi[x, y][3] > 0:
                pa[x, y] = (255, 255, 255, 255)
    big = scale2x(a) if smooth else a.resize((im.width * 2, im.height * 2), Image.NEAREST)
    pb = big.load()
    return {(x, y) for y in range(big.height) for x in range(big.width) if pb[x, y][3] > 0}


def mask_of(img: Image.Image) -> set[Pt]:
    p = img.convert('RGBA').load()
    return {(x, y) for y in range(img.height) for x in range(img.width) if p[x, y][3] > 0}


def iou(img: Image.Image, file: str) -> float:
    a, b = mask_of(img), mask2(file)
    return len(a & b) / max(1, len(a | b))


def up2(img: Image.Image) -> Image.Image:
    return img.resize((img.width * 2, img.height * 2), Image.NEAREST)


# ── Formas e volume ───────────────────────────────────────────────────────

def ellipse_pts(cx: float, cy: float, rx: float, ry: float) -> set[Pt]:
    out = set()
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            if ((x + 0.5 - cx) / max(rx, 0.01)) ** 2 + ((y + 0.5 - cy) / max(ry, 0.01)) ** 2 <= 1.0:
                out.add((x, y))
    return out


def poly_pts(pts: Sequence[tuple[float, float]]) -> set[Pt]:
    c = K(1, 1)
    out: set[Pt] = set()
    c.p = lambda x, y, col: out.add((int(x), int(y)))  # type: ignore[assignment]
    Canvas.poly(c, pts, (0, 0, 0))
    return out


def rect_pts(x: int, y: int, w: int, h: int) -> set[Pt]:
    return {(xx, yy) for yy in range(y, y + h) for xx in range(x, x + w)}


def dist_in(pts: set[Pt]) -> dict[Pt, float]:
    """Distância (chanfro 3-4, em px) de cada ponto até fora da forma."""
    INF = 1e9
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, x1, y0, y1 = min(xs) - 1, max(xs) + 1, min(ys) - 1, max(ys) + 1
    w, h = x1 - x0 + 1, y1 - y0 + 1
    d = [[0.0 if (x + x0, y + y0) not in pts else INF for x in range(w)] for y in range(h)]
    for y in range(h):
        for x in range(w):
            if d[y][x]:
                v = d[y][x]
                if x > 0:
                    v = min(v, d[y][x - 1] + 3)
                if y > 0:
                    v = min(v, d[y - 1][x] + 3)
                    if x > 0:
                        v = min(v, d[y - 1][x - 1] + 4)
                    if x < w - 1:
                        v = min(v, d[y - 1][x + 1] + 4)
                d[y][x] = v
    for y in range(h - 1, -1, -1):
        for x in range(w - 1, -1, -1):
            if d[y][x]:
                v = d[y][x]
                if x < w - 1:
                    v = min(v, d[y][x + 1] + 3)
                if y < h - 1:
                    v = min(v, d[y + 1][x] + 3)
                    if x < w - 1:
                        v = min(v, d[y + 1][x + 1] + 4)
                    if x > 0:
                        v = min(v, d[y + 1][x - 1] + 4)
                d[y][x] = v
    return {(x, y): d[y - y0][x - x0] / 3.0 for (x, y) in pts}


def pillow(pts: set[Pt], r: float = 4.0, amb: float = 0.2, bump: Optional[Callable[[int, int], float]] = None) -> dict[Pt, float]:
    """Luz (0–1) de uma forma solta como almofada: borda arredondada de raio r, miolo chato."""
    d = dist_in(pts)

    def h(x: int, y: int) -> float:
        v = d.get((x, y))
        if v is None:
            return 0.0
        t = min(1.0, v / r)
        hh = r * math.sqrt(max(0.0, 1 - (1 - t) ** 2))
        if bump:
            hh += bump(x, y)
        return hh

    out = {}
    for (x, y) in pts:
        nx = (h(x - 1, y) - h(x + 1, y)) / 2
        ny = (h(x, y - 1) - h(x, y + 1)) / 2
        out[(x, y)] = lit(nx, ny, 1.0, amb)
    return out


def sphere(x: float, y: float, cx: float, cy: float, rx: float, ry: float, amb: float = 0.18) -> float:
    nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
    nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
    return lit(nx, ny, nz + 0.05, amb)


def cylinder(u: float, amb: float = 0.18) -> float:
    """Luz de um cilindro em pé; u em [-1, 1] da esquerda para a direita."""
    u = max(-1.0, min(1.0, u))
    return lit(u, -0.15, math.sqrt(1 - u * u) + 0.05, amb)


def paint_lit(c: K, light: dict[Pt, float], pal: Sequence[RGB], dither: float = 0.0, tex: Optional[Callable[[int, int], float]] = None) -> None:
    for (x, y), v in light.items():
        if tex:
            v += tex(x, y)
        c.p(x, y, quant(v, pal, x, y, dither))


# ── Materiais ─────────────────────────────────────────────────────────────

def wood_px(along: float, across: int, k: int, n: int, pal: Sequence[RGB], seed: int) -> RGB:
    """Um pixel de tábua: k = posição na largura (0..n-1), veio ao longo do comprimento."""
    if k == 0:
        col = pal[3]
    elif k == n - 1:
        col = pal[1]
    else:
        col = pal[2]
        g = noise(along / 5.0, across * 3.1, seed, 1.0)
        if hsh(across, seed, 7) < 0.45 and g > 0.58:
            col = pal[1]
        elif hsh(across, seed, 8) < 0.25 and g < 0.22:
            col = pal[3]
    return col


def plank(c: K, x0: int, y0: int, w: int, h: int, pal: Sequence[RGB] = WOODV[1:], vertical: bool = False, seed: int = 0, knot: bool = True) -> None:
    """Tábua com quina clara (cima/esquerda), quina escura e veio; nó de vez em quando."""
    n = w if vertical else h
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            k = (x - x0) if vertical else (y - y0)
            along = y if vertical else x
            c.p(x, y, wood_px(along, (x if vertical else y), k, n, pal, seed))
    if knot and n >= 4 and hsh(x0, y0, seed + 3) < 0.6:
        L = h if vertical else w
        a = int(2 + hsh(x0, y0, seed + 4) * max(1, L - 5))
        b = n // 2
        kx, ky = (x0 + b, y0 + a) if vertical else (x0 + a, y0 + b)
        c.p(kx, ky, pal[0])
        c.p(kx + (0 if vertical else 1), ky + (1 if vertical else 0), pal[1])


def stone_px(x: int, y: int, base: float, pal: Sequence[RGB], seed: int, dither: float = 0.6) -> RGB:
    v = base + (noise(x, y, seed, 3) - 0.5) * 0.18 + (hsh(x, y, seed + 1) - 0.5) * 0.08
    return quant(v, pal, x, y, dither)


def pair_preview(items: Sequence[tuple[str, Image.Image]], out: Optional[str], scale: int = 3, bg: RGB = (60, 74, 56)) -> None:
    """Prévia: para cada peça, a 16-bit ampliada 2× e a 32-bit ao lado."""
    if not out:
        return
    ims = []
    for file, img in items:
        ims.append(up2(load16(file)))
        ims.append(img)
    preview(ims, out, scale, bg)


# ── Pedra ─────────────────────────────────────────────────────────────────

def rock_shape(cx: float, cy: float, rx: float, ry: float, seed: int, lump: float = 0.12, flat_bottom: Optional[float] = None) -> set[Pt]:
    """Contorno de pedra: elipse com o raio mexido por ruído no ângulo (e base achatada)."""
    out = set()
    for y in range(int(cy - ry * 1.3) - 1, int(cy + ry * 1.3) + 2):
        for x in range(int(cx - rx * 1.3) - 1, int(cx + rx * 1.3) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            a = math.atan2(dy, dx)
            k = 1 + lump * (noise((a + math.pi) * 2.2, 0.5, seed, 1.0) - 0.5) * 2
            if dx * dx + dy * dy <= k * k and (flat_bottom is None or y <= flat_bottom):
                out.add((x, y))
    return out


def rock(c: 'K', pts: set[Pt], pal: Sequence[RGB], seed: int, facet: float = 0.22, cracks: int = 1, rim: bool = True, moss: Optional[Sequence[RGB]] = None, warm: Optional[RGB] = None) -> None:
    """Pedra com volume: esfera da caixa da forma + facetas por ruído, quina clara em cima
    à esquerda, quina escura embaixo à direita, rachaduras e musgo no topo (opcional)."""
    if not pts:
        return
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    cx, cy = (min(xs) + max(xs) + 1) / 2, (min(ys) + max(ys) + 1) / 2
    rx, ry = (max(xs) - min(xs) + 1) / 2, (max(ys) - min(ys) + 1) / 2
    for (x, y) in pts:
        nx, ny = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
        nz = math.sqrt(max(0.0, 1 - min(1.0, nx * nx + ny * ny)))
        # Facetas: a normal desvia por regiões (ruído grosso), o que dá planos de corte.
        fx = (noise(x, y, seed, 5) - 0.5) * facet * 3
        fy = (noise(x, y, seed + 7, 5) - 0.5) * facet * 3
        v = lit(nx + fx, ny + fy, nz + 0.25, 0.16)
        v += (hsh(x, y, seed + 2) - 0.5) * 0.06
        col = quant(v, pal, x, y, 0.35)
        if warm and nx > -0.2 and ny < 0.3:
            col = mix(col, warm, 0.18)
        c.p(x, y, col)
    for (x, y) in pts:
        up, left = (x, y - 1) not in pts, (x - 1, y) not in pts
        down, right = (x, y + 1) not in pts, (x + 1, y) not in pts
        if rim and (up or left) and not (down or right):
            c.p(x, y, pal[-1] if up and (x + 0.5 - cx) < rx * 0.4 else pal[-2])
        elif rim and (down or right) and not (up or left):
            c.p(x, y, pal[1])
    for k in range(cracks):
        x = int(cx - rx * 0.3 + hsh(seed, k, 3) * rx * 0.8)
        y = int(cy - ry * 0.4 + hsh(seed, k, 4) * ry * 0.5)
        for i in range(int(2 + hsh(seed, k, 5) * rx * 0.5)):
            if (x, y) in pts and (x, y + 1) in pts:
                c.p(x, y, pal[0])
                if (x + 1, y) in pts:
                    c.p(x + 1, y, pal[-2] if hsh(x, y, seed) < 0.5 else c.g(x + 1, y))
            x += 1 if hsh(x, y, seed + 9) < 0.6 else 0
            y += 1
    if moss:
        for (x, y) in pts:
            ny = (y + 0.5 - cy) / ry
            if ny < -0.35 and noise(x, y, seed + 11, 3) > 0.55 and (x, y - 1) in pts:
                c.p(x, y, moss[1] if (x, y - 2) in pts else moss[2])
