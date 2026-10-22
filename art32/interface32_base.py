"""Base dos geradores da interface 32-bit (ícones, medalhas de rank e peças novas).

Formas em coordenadas contínuas (centro do pixel em x + 0.5), pintadas pixel a pixel
com as rampas de lib32. Nada aqui usa arte de terceiros."""
from __future__ import annotations

import math
import os
import sys
from typing import Callable, Iterable, Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib32 import BONE, IRON, OL, Canvas, hsh, noise  # noqa: E402,F401  (reexportados)

Pt = tuple[int, int]

# ── Rampas da interface (escuro → claro; o último é o brilho) ─────────────

GOLD = [(92, 56, 24), (140, 96, 38), (190, 140, 52), (233, 185, 73), (255, 226, 122), (255, 248, 214)]
STEEL = [(40, 44, 54), (66, 72, 84), (96, 104, 116), (128, 138, 150), (162, 172, 184), (204, 212, 220), (240, 244, 248)]
WOOD6 = [(40, 26, 18), (62, 42, 28), (90, 62, 42), (118, 84, 54), (146, 106, 66), (176, 134, 88)]
LEATHER5 = [(42, 26, 18), (66, 44, 28), (96, 64, 40), (126, 88, 56), (158, 116, 76)]
RED = [(64, 18, 24), (100, 32, 36), (138, 54, 54), (176, 74, 74), (210, 112, 100), (236, 160, 140)]
BLUE = [(22, 32, 62), (36, 56, 100), (52, 82, 132), (66, 106, 176), (96, 140, 214), (150, 186, 236)]
AMETHYST = [(36, 12, 52), (64, 24, 92), (98, 40, 130), (130, 70, 168), (168, 116, 204), (210, 172, 236), (250, 246, 255)]
FIRE = [(104, 28, 16), (164, 50, 22), (226, 92, 30), (255, 138, 42), (255, 186, 70), (255, 228, 140), (255, 250, 222)]


# ── Formas (conjuntos de pixels) ─────────────────────────────────────────

def ellipse(cx: float, cy: float, rx: float, ry: Optional[float] = None) -> set[Pt]:
    ry = rx if ry is None else ry
    out = set()
    for y in range(int(cy - ry - 2), int(cy + ry + 2)):
        for x in range(int(cx - rx - 2), int(cx + rx + 2)):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1.0:
                out.add((x, y))
    return out


def poly(pts: Sequence[tuple[float, float]], w: int = 64, h: int = 64) -> set[Pt]:
    c = Canvas(w, h)
    c.poly(pts, (1, 1, 1))
    return set(c.mask())


def rect(x: int, y: int, w: int, h: int) -> set[Pt]:
    return {(xx, yy) for yy in range(y, y + h) for xx in range(x, x + w)}


class Seg:
    """Segmento a→b: para cada pixel dá (t ao longo em px, s de lado em px; s>0 = lado de cima/esquerda)."""

    def __init__(self, ax: float, ay: float, bx: float, by: float):
        self.ax, self.ay = ax, ay
        dx, dy = bx - ax, by - ay
        self.L = math.hypot(dx, dy)
        self.ux, self.uy = dx / self.L, dy / self.L
        nx, ny = -self.uy, self.ux
        if nx + ny > 0:
            nx, ny = -nx, -ny
        self.nx, self.ny = nx, ny

    def ts(self, x: int, y: int) -> tuple[float, float]:
        rx, ry = x + 0.5 - self.ax, y + 0.5 - self.ay
        return rx * self.ux + ry * self.uy, rx * self.nx + ry * self.ny

    def band(self, hw: float | Callable[[float], float], t0: float = 0.0, t1: Optional[float] = None) -> dict[Pt, tuple[float, float]]:
        """Pixels a até hw do eixo (hw pode variar com t em [0, 1]); valor = (t/L, s/hw)."""
        t1 = self.L if t1 is None else t1
        hwf = hw if callable(hw) else (lambda _t, v=hw: v)
        out = {}
        xs = (self.ax, self.ax + self.ux * self.L)
        ys = (self.ay, self.ay + self.uy * self.L)
        m = 8
        for y in range(int(min(ys)) - m, int(max(ys)) + m):
            for x in range(int(min(xs)) - m, int(max(xs)) + m):
                t, s = self.ts(x, y)
                if t < t0 or t > t1:
                    continue
                k = hwf(t / self.L)
                if k > 0 and abs(s) <= k:
                    out[(x, y)] = (t / self.L, s / k)
        return out


def edges(P: Iterable[Pt]) -> dict[Pt, tuple[bool, bool, bool, bool]]:
    """Para cada pixel: (vizinho de cima fora, esquerda fora, baixo fora, direita fora)."""
    P = set(P)
    return {(x, y): ((x, y - 1) not in P, (x - 1, y) not in P, (x, y + 1) not in P, (x + 1, y) not in P) for (x, y) in P}


def grid(rows: Sequence[str], pal: dict[str, tuple]) -> Canvas:
    """Desenho à mão: uma letra por pixel ('.' = vazio)."""
    c = Canvas(len(rows[0]), len(rows))
    for y, row in enumerate(rows):
        assert len(row) == c.w, (y, row)
        for x, ch in enumerate(row):
            if ch != '.':
                c.p(x, y, pal[ch])
    return c


def outline(c: Canvas) -> None:
    c.outline(OL)
