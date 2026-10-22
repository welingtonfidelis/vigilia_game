"""Base comum dos geradores de arte 32-bit do Vigília (Python 3 + Pillow).

Estilo (ver art32/README.md):
  · o dobro de pixels da peça 16-bit, mesmo enquadramento e âncora;
  · 4–5 tons por material (rampas abaixo), luz de cima e da esquerda;
  · contorno de 1 px: preto-quente (OL) só na silhueta de fora; por dentro, linhas na
    cor do material escurecida (contorno colorido);
  · detalhe que caiba no pixel novo: telha a telha, tijolo a tijolo, veio de madeira,
    reflexo no vidro, musgo, cravos, costuras.
Nada aqui usa arte de terceiros.
"""
from __future__ import annotations

import json
import math
import os
from typing import Iterable, Optional, Sequence

from PIL import Image

RGB = tuple[int, int, int]

# ── Paleta (rampas do escuro para o claro) ─────────────────────────────────

OL: RGB = (23, 18, 15)
ROOF_RED = [(66, 24, 28), (100, 38, 40), (136, 56, 54), (168, 76, 68), (200, 108, 92)]
ROOF_BLUE = [(24, 32, 58), (36, 52, 92), (54, 80, 132), (78, 112, 170), (112, 146, 200)]
ROOF_SLATE = [(34, 36, 44), (52, 56, 66), (74, 80, 92), (100, 108, 120), (132, 140, 152)]
THATCH = [(92, 64, 30), (128, 92, 42), (164, 124, 58), (198, 160, 82), (226, 196, 120)]
STONE = [(50, 52, 62), (76, 80, 90), (104, 110, 118), (134, 142, 150), (168, 176, 184)]
DARKSTONE = [(30, 30, 38), (44, 44, 54), (62, 62, 74), (84, 84, 98), (110, 110, 124)]
MORTAR: RGB = (44, 44, 50)
WOOD = [(34, 23, 17), (56, 38, 27), (86, 59, 40), (118, 83, 54), (150, 110, 72)]
PLASTER = [(146, 132, 108), (180, 166, 140), (204, 192, 168), (224, 214, 192)]
LEAF = [(26, 44, 30), (40, 66, 42), (58, 92, 56), (84, 122, 72), (116, 152, 92)]
PINE = [(18, 34, 28), (28, 52, 40), (42, 72, 52), (62, 98, 66), (90, 128, 84)]
AUTUMN = [(70, 26, 24), (108, 40, 34), (146, 58, 44), (184, 86, 58), (214, 124, 80)]
GRASS = [(36, 58, 36), (52, 80, 48), (72, 104, 60), (96, 130, 74), (126, 158, 92)]
DIRT = [(58, 40, 28), (84, 60, 40), (112, 82, 54), (140, 106, 70), (168, 132, 90)]
GOLD = [(112, 72, 30), (176, 124, 46), (233, 185, 73), (255, 226, 122)]
IRON = [(24, 24, 30), (42, 42, 50), (66, 68, 78), (104, 108, 120), (150, 156, 168)]
STEEL = [(48, 52, 64), (80, 88, 102), (116, 126, 138), (158, 168, 180), (198, 206, 214)]
GLASS = [(10, 12, 20), (18, 24, 38), (32, 42, 62), (62, 78, 104)]
WATER = [(16, 44, 52), (26, 72, 80), (44, 112, 116), (78, 160, 156), (140, 214, 204)]
ABYSS = [(20, 8, 30), (48, 20, 70), (82, 36, 116), (122, 62, 168), (176, 112, 224)]
BONE = [(110, 100, 84), (150, 140, 120), (190, 180, 160), (222, 214, 196), (244, 238, 222)]
SKIN = [(120, 72, 52), (176, 120, 88), (220, 166, 126), (240, 200, 160)]
SKIN_DARK = [(66, 40, 28), (108, 70, 48), (150, 100, 70), (184, 132, 96)]
CLOTH_RED = [(74, 18, 28), (118, 30, 38), (164, 48, 50), (204, 76, 70)]
CLOTH_BLUE = [(24, 34, 64), (40, 60, 104), (62, 92, 150), (100, 136, 198)]
CLOTH_GREEN = [(30, 48, 32), (50, 78, 48), (78, 112, 66), (112, 146, 88)]
CLOTH_PURPLE = [(34, 24, 46), (60, 44, 80), (92, 72, 118), (128, 104, 156)]
LINEN = [(130, 118, 98), (180, 168, 144), (218, 208, 186), (244, 238, 222)]
LEATHER = [(52, 34, 22), (88, 60, 38), (124, 88, 54), (160, 120, 76)]
FIRE = [(150, 40, 20), (230, 96, 30), (255, 170, 60), (255, 236, 170)]
FLOWERS = [(196, 60, 60), (230, 190, 70), (232, 228, 214), (210, 120, 150)]
WARM_LIGHT = [(236, 150, 64), (255, 190, 100), (255, 222, 140), (255, 244, 200)]


# ── Utilidades ────────────────────────────────────────────────────────────

def hsh(x: int, y: int, s: int = 0) -> float:
    """Hash determinístico → [0, 1)."""
    n = (x * 374761393 + y * 668265263 + s * 1442695041) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def noise(x: float, y: float, s: int, scale: float) -> float:
    """Ruído de valor suave em 2D → [0, 1)."""
    xi, yi = math.floor(x / scale), math.floor(y / scale)
    fx, fy = x / scale - xi, y / scale - yi
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = hsh(xi, yi, s) * (1 - sx) + hsh(xi + 1, yi, s) * sx
    b = hsh(xi, yi + 1, s) * (1 - sx) + hsh(xi + 1, yi + 1, s) * sx
    return a * (1 - sy) + b * sy


def mix(a: Sequence[int], b: Sequence[int], t: float) -> RGB:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def mul(c: Sequence[int], k: float) -> RGB:
    return tuple(max(0, min(255, round(v * k))) for v in c[:3])  # type: ignore[return-value]


def ramp(r: Sequence[RGB], t: float) -> RGB:
    """Tom da rampa para t em [0, 1] (0 = escuro)."""
    t = max(0.0, min(1.0, t))
    i = min(len(r) - 1, int(t * len(r)))
    return r[i]


# ── Canvas ────────────────────────────────────────────────────────────────

class Canvas:
    """Grade de pixels RGB (None = transparente), com primitivas de pixel art."""

    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.px: list[list[Optional[RGB]]] = [[None] * w for _ in range(h)]

    @classmethod
    def from_image(cls, img: Image.Image) -> 'Canvas':
        img = img.convert('RGBA')
        c = cls(img.width, img.height)
        p = img.load()
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = p[x, y]
                if a > 0:
                    c.px[y][x] = (r, g, b)
        return c

    def p(self, x: float, y: float, c: Optional[Sequence[int]]) -> None:
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = None if c is None else (c[0], c[1], c[2])

    def g(self, x: int, y: int) -> Optional[RGB]:
        return self.px[y][x] if 0 <= x < self.w and 0 <= y < self.h else None

    def rect(self, x: int, y: int, w: int, h: int, c: Optional[Sequence[int]]) -> None:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.p(xx, yy, c)

    def hl(self, x: int, y: int, w: int, c) -> None:
        self.rect(x, y, w, 1, c)

    def vl(self, x: int, y: int, h: int, c) -> None:
        self.rect(x, y, 1, h, c)

    def line(self, x0: float, y0: float, x1: float, y1: float, c) -> None:
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n):
            t = i / max(n - 1, 1)
            self.p(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), c)

    def ellipse(self, cx: float, cy: float, rx: float, ry: float, c) -> None:
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                if ((x - cx) / max(rx, 0.01)) ** 2 + ((y - cy) / max(ry, 0.01)) ** 2 <= 1.0:
                    self.p(x, y, c)

    def poly(self, pts: Sequence[tuple[float, float]], c) -> None:
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            xs = []
            for i in range(len(pts)):
                (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
                if (y0 <= y + 0.5 < y1) or (y1 <= y + 0.5 < y0):
                    xs.append(x0 + (y + 0.5 - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]):
                for x in range(int(math.ceil(a - 0.5)), int(math.floor(b - 0.5)) + 1):
                    self.p(x, y, c)

    def shade(self, x: int, y: int, k: float) -> None:
        c = self.g(x, y)
        if c:
            self.px[y][x] = mul(c, k)

    def paste(self, o: 'Canvas', ox: int, oy: int) -> None:
        for y in range(o.h):
            for x in range(o.w):
                v = o.px[y][x]
                if v is not None:
                    self.p(ox + x, oy + y, v)

    def mask(self) -> list[tuple[int, int]]:
        return [(x, y) for y in range(self.h) for x in range(self.w) if self.px[y][x] is not None]

    def shade_volume(self, pts: Iterable[tuple[int, int]], pal: Sequence[RGB], lx: float = -0.6, ly: float = -0.8, spec: bool = True) -> None:
        """Pinta uma forma com a rampa por uma normal aproximada (luz de cima-esquerda)."""
        pts = list(pts)
        if not pts:
            return
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        rx, ry = max(1, (max(xs) - min(xs)) / 2), max(1, (max(ys) - min(ys)) / 2)
        n = len(pal)
        for (x, y) in pts:
            nx, ny = (x - cx) / rx, (y - cy) / ry
            v = -(nx * lx + ny * ly) * 0.7 + 0.15
            i = max(0, min(n - 1, int((v + 1) / 2 * n + 0.15)))
            if not spec and i == n - 1:
                i = n - 2
            self.p(x, y, pal[i])

    def outline(self, col: RGB = OL) -> None:
        """Contorno de 1 px por fora da silhueta."""
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x] is not None:
                    continue
                if any(self.g(x + dx, y + dy) not in (None, col) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                    add.append((x, y))
        for x, y in add:
            self.px[y][x] = col

    def image(self) -> Image.Image:
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        p = im.load()
        for y in range(self.h):
            for x in range(self.w):
                c = self.px[y][x]
                if c is not None:
                    p[x, y] = (c[0], c[1], c[2], 255)
        return im


# ── Padrões de material ───────────────────────────────────────────────────

def bricks(c: Canvas, x0: int, y0: int, w: int, h: int, pal: Sequence[RGB] = STONE, bw: int = 7, bh: int = 4, seed: int = 0) -> None:
    """Tijolo a tijolo: junta escura, topo claro, base escura e tom por tijolo."""
    for y in range(y0, y0 + h):
        ly = y - y0
        row = ly // bh
        off = (bw // 2) if row % 2 else 0
        for x in range(x0, x0 + w):
            lx = x - x0 + off
            bx, by = lx % bw, ly % bh
            if by == bh - 1 or bx == bw - 1:
                c.p(x, y, MORTAR)
                continue
            tone = 0.9 + 0.2 * hsh(lx // bw, row, seed)
            col = pal[2]
            if by == 0:
                col = pal[3]
            elif by == bh - 2:
                col = pal[1]
            elif bx == 0:
                col = mix(pal[2], pal[3], 0.5)
            c.p(x, y, mul(col, tone * (0.96 + 0.08 * noise(x, y, seed + 1, 2))))


def planks(c: Canvas, x0: int, y0: int, w: int, h: int, pal: Sequence[RGB] = WOOD, pw: int = 5, vertical: bool = True, seed: int = 0) -> None:
    """Tábuas com veio (verticais ou deitadas), luz na borda de cima/esquerda."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            a = (x - x0) if vertical else (y - y0)
            along, across = (y, x) if vertical else (x, y)
            k = a % pw
            col = pal[2]
            if k == 0:
                col = pal[3]
            elif k == pw - 1:
                col = pal[0]
            elif hsh(across, 0, seed) < 0.3 and noise(along, across, seed + 1, 4) > 0.4:
                col = pal[1]
            c.p(x, y, mul(col, 0.95 + 0.08 * noise(along / 3, across, seed + 2, 2)))


# ── Filtro rápido (peça pequena e secundária) ─────────────────────────────

def scale2x(src: Image.Image) -> Image.Image:
    src = src.convert('RGBA')
    w, h = src.size
    p = src.load()
    out = Image.new('RGBA', (w * 2, h * 2), (0, 0, 0, 0))
    o = out.load()
    g = lambda x, y: p[x, y] if 0 <= x < w and 0 <= y < h else (0, 0, 0, 0)
    for y in range(h):
        for x in range(w):
            P = p[x, y]
            A, B, C, D = g(x, y - 1), g(x + 1, y), g(x - 1, y), g(x, y + 1)
            e0 = A if (C == A and C != D and A != B) else P
            e1 = B if (A == B and A != C and B != D) else P
            e2 = C if (D == C and D != B and C != A) else P
            e3 = D if (B == D and B != A and D != C) else P
            o[2 * x, 2 * y], o[2 * x + 1, 2 * y], o[2 * x, 2 * y + 1], o[2 * x + 1, 2 * y + 1] = e0, e1, e2, e3
    return out


def thin_outline(img: Image.Image) -> Image.Image:
    """Depois do 2×: o contorno de dentro vira a cor vizinha escurecida (fica 1 px de OL)."""
    img = img.convert('RGBA')
    w, h = img.size
    p = img.load()
    out = img.copy()
    o = out.load()
    solid = lambda x, y: 0 <= x < w and 0 <= y < h and p[x, y][3] > 0
    for y in range(h):
        for x in range(w):
            c = p[x, y]
            if c[3] == 0 or c[:3] != OL:
                continue
            if any(not solid(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                continue
            nb = [p[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if solid(x + dx, y + dy) and p[x + dx, y + dy][:3] != OL]
            if nb:
                avg = tuple(sum(n[i] for n in nb) // len(nb) for i in range(3))
                o[x, y] = mul(avg, 0.5) + (255,)
    return out


# ── Conferência da convenção ──────────────────────────────────────────────

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(ROOT, 'public', 'assets', 'vigilia')


def path16(file: str) -> str:
    """Caminho da peça 16-bit (file do manifesto, 'export/...')."""
    return os.path.join(PACK, file)


def path32(file: str) -> str:
    """Caminho da peça 32-bit: mesmo nome, em export32/ no lugar de export/."""
    assert file.startswith('export/'), file
    return os.path.join(PACK, 'export32/' + file[len('export/'):])


def save32(img: Image.Image, file: str, check: bool = True) -> str:
    """Grava a peça 32-bit e confere que ela tem exatamente o dobro da 16-bit."""
    out = path32(file)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if check and os.path.exists(path16(file)):
        w, h = Image.open(path16(file)).size
        assert img.size == (w * 2, h * 2), f'{file}: {img.size} ≠ {(w * 2, h * 2)}'
    img.save(out)
    return out


def inventory(category: str) -> list[dict]:
    with open(os.path.join(ROOT, 'art32', 'inventory.json')) as fh:
        return json.load(fh)[category]


def sheet(frames: Sequence[Image.Image], cols: Optional[int] = None) -> Image.Image:
    """Junta quadros do mesmo tamanho numa folha (em linha, ou em `cols` colunas)."""
    fw, fh = frames[0].size
    cols = cols or len(frames)
    rows = math.ceil(len(frames) / cols)
    out = Image.new('RGBA', (fw * cols, fh * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        out.alpha_composite(f, ((i % cols) * fw, (i // cols) * fh))
    return out


def frames_of(img: Image.Image, fw: int, fh: int) -> list[Image.Image]:
    """Corta uma folha 16-bit nos quadros (linha a linha)."""
    out = []
    for y in range(0, img.height, fh):
        for x in range(0, img.width, fw):
            out.append(img.crop((x, y, x + fw, y + fh)))
    return out


def preview(images: Sequence[Image.Image], out: str, scale: int = 3, bg: RGB = (60, 74, 56)) -> None:
    """Folha de conferência: as peças lado a lado sobre um fundo, ampliadas."""
    w = sum(i.width + 6 for i in images)
    h = max(i.height for i in images)
    sh = Image.new('RGBA', (w, h), bg + (255,))
    x = 0
    for i in images:
        sh.alpha_composite(i.convert('RGBA'), (x, h - i.height))
        x += i.width + 6
    sh.resize((w * scale, h * scale), Image.NEAREST).save(out)
