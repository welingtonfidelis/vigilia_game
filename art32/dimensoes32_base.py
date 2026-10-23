"""Base dos biomas das dimensões fundas (M5 F6): Colmeia Pálida, Fossa Cantante, Cidadela de
Engrenagens e Deserto de Ossos, numerais VII a X do corredor.

Diferente dos outros geradores de art32/, estes desenham as **duas** resoluções do mesmo desenho:
as coordenadas são escritas em unidades da 16-bit e multiplicadas pela escala `s` (1 na 16-bit,
2 na 32-bit). A 16-bit sai nativa (sem reduzir a 32-bit) e o enquadramento das duas é o mesmo
por construção. O detalhe que só cabe no pixel novo (veio, poro, rebite, grão) entra quando s = 2.

Monstros: a folha de 19 quadros e as variantes (-deep, -core, -phase2) da base de
monstros32_b_base.py, com os deslocamentos da pose na escala certa. Corredor, objetos, efeitos e
o índice `src/render/pack-dimensoes.ts` também saem daqui. Nada aqui usa arte de terceiros.
"""
from __future__ import annotations

import json
import math
import os
import sys
from typing import Callable, Optional, Sequence

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

import lib32 as L  # noqa: E402
import monstros32_b_base as MB  # noqa: E402
from lib32 import OL, Canvas, hsh, mix, mul, noise  # noqa: E402,F401
from monstros32_b_base import (PG, THICK, E, R, T, Pose, bay, bbox, bbox_pts, bend, cyl, dissolve, dk,  # noqa: E402,F401
                               edge_dark, edge_light, fill, fix_outline, flash, glowpx, lean, rows_of, seg, shift,
                               sphere, squash, vol)

RGB = tuple

# ── Paletas dos biomas (fundo, ênfases, brilho das variantes, poeira da morte) ─────────────

ACTS = {
    'VII': {   # Colmeia Pálida: brancos doentes, quitina ocre, esporo amarelo-esverdeado
        'ramp': [(14, 12, 8), (28, 24, 16), (44, 40, 28), (64, 60, 42), (90, 86, 62), (124, 118, 88), (166, 160, 124), (220, 214, 186)],
        'acc': [(110, 40, 24), (170, 70, 34), (220, 170, 70), (250, 226, 150)],
        'glow': [(80, 80, 20), (140, 140, 40), (200, 200, 70), (236, 236, 140), (252, 250, 210)],
        'dust': [(124, 118, 88), (166, 160, 124), (200, 200, 70), (236, 236, 140)],
        'ambience': 'rgba(120, 112, 60, 0.11)',
    },
    'VIII': {  # Fossa Cantante: azul do fundo, luz viva ciano e rosa
        'ramp': [(4, 8, 18), (8, 16, 34), (12, 26, 52), (18, 38, 72), (26, 54, 96), (40, 76, 124), (70, 110, 160), (170, 200, 230)],
        'acc': [(40, 120, 140), (60, 200, 200), (240, 120, 180), (250, 230, 250)],
        'glow': [(20, 80, 100), (30, 150, 170), (60, 220, 220), (170, 250, 240), (240, 255, 250)],
        'dust': [(40, 76, 124), (70, 110, 160), (60, 220, 220), (170, 250, 240)],
        'ambience': 'rgba(20, 70, 110, 0.15)',
    },
    'IX': {    # Cidadela de Engrenagens: ferro preto, latão, lâmpada vermelha
        'ramp': [(10, 9, 8), (20, 18, 16), (32, 30, 28), (48, 44, 40), (66, 62, 56), (90, 84, 74), (122, 112, 96), (190, 176, 150)],
        'acc': [(110, 70, 30), (180, 130, 50), (230, 190, 90), (250, 240, 190)],
        'glow': [(120, 20, 16), (190, 40, 24), (240, 80, 40), (255, 170, 110), (255, 230, 200)],
        'dust': [(66, 62, 56), (122, 112, 96), (180, 130, 50), (240, 80, 40)],
        'ambience': 'rgba(110, 70, 30, 0.12)',
    },
    'X': {     # Deserto de Ossos: ocre e osso sob um céu roxo de sol preto
        'ramp': [(16, 10, 18), (32, 20, 30), (52, 32, 40), (80, 52, 50), (112, 78, 60), (150, 110, 74), (192, 152, 98), (236, 214, 170)],
        'acc': [(90, 40, 90), (150, 70, 140), (230, 200, 130), (250, 240, 210)],
        'glow': [(70, 30, 90), (120, 50, 150), (180, 90, 210), (225, 170, 240), (250, 230, 255)],
        'dust': [(150, 110, 74), (192, 152, 98), (236, 214, 170), (180, 90, 210)],
        'ambience': 'rgba(120, 60, 110, 0.12)',
    },
}
for _act, _p in ACTS.items():
    MB.ACT_RAMP[_act] = _p['ramp']
    MB.ACT_ACC[_act] = _p['acc']
    MB.VGLOW[_act] = _p['glow']
    MB.DUST[_act] = _p['dust']

ROMAN_NAMES = {'VII': 'Colmeia Pálida', 'VIII': 'Fossa Cantante', 'IX': 'Cidadela de Engrenagens', 'X': 'Deserto de Ossos'}


def file_at(file: str, s: int) -> str:
    """Caminho no disco: export/ na 16-bit, export32/ na 32-bit (mesmo nome)."""
    return L.path16(file) if s == 1 else L.path32(file)


def save(img: Image.Image, file: str, s: int) -> str:
    out = file_at(file, s)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.save(out)
    return out


# ── Monstro nas duas escalas ──────────────────────────────────────────────

BOB16 = [0, 0.5, 1, 0.5]


class Dual(MB.Monster):
    """Monstro desenhado em unidades 16-bit. `self.s` é a escala do desenho; as formas passam
    pelos atalhos abaixo (E, R, T, PG, THICK em unidades 16-bit, já multiplicadas)."""

    size16 = (24, 32)
    lift = 1.5           # quanto o pé sobe na passada (unidades 16-bit)
    name = ''            # nome no jogo (vai para o índice)

    def __init__(self, s: int = 2):
        self.s = s
        self.size = (self.size16[0] * s, self.size16[1] * s)

    # -- formas em unidades 16-bit
    def e(self, cx, cy, rx, ry):
        s = self.s
        return E(cx * s + (s - 1) * 0.5, cy * s + (s - 1) * 0.5, rx * s, ry * s)

    def r(self, x, y, w, h):
        s = self.s
        return R(round(x * s), round(y * s), max(1, round(w * s)), max(1, round(h * s)))

    def t(self, y0, y1, l0, r0, l1, r1):
        s = self.s
        return T(round(y0 * s), round(y1 * s + s - 1), l0 * s, r0 * s + s - 1, l1 * s, r1 * s + s - 1)

    def pg(self, poly):
        s = self.s
        return PG([(x * s, y * s) for (x, y) in poly])

    def thick(self, path, r):
        s = self.s
        return THICK([(x * s + (s - 1) * 0.5, y * s + (s - 1) * 0.5) for (x, y) in path], r * s)

    def oval(self, ax, ay, bx, by, w):
        """Oval inclinado com o eixo maior de (ax, ay) a (bx, by) e meia-largura w (unidades
        16-bit). Devolve [(x, y, u, v)]: u vai de -1 (ponta a) a 1 (ponta b), v de -1 a 1 na largura."""
        s = self.s
        ax, ay, bx, by, w = ax * s, ay * s, bx * s, by * s, w * s
        cx, cy = (ax + bx) / 2 + (s - 1) * 0.5, (ay + by) / 2 + (s - 1) * 0.5
        L = max(0.5, math.hypot(bx - ax, by - ay) / 2)
        ux, uy = (bx - ax) / (2 * L), (by - ay) / (2 * L)
        out = []
        ext = int(L + w) + 2
        for y in range(int(cy - ext), int(cy + ext) + 1):
            for x in range(int(cx - ext), int(cx + ext) + 1):
                dx, dy = x - cx, y - cy
                u = (dx * ux + dy * uy) / L
                v = (-dx * uy + dy * ux) / max(0.5, w)
                if u * u + v * v <= 1.0:
                    out.append((x, y, u, v))
        return out

    def taper(self, path, r0, r1):
        """Traço que afina de r0 a r1 ao longo do caminho (unidades 16-bit): membro, foice, espinho."""
        s = self.s
        pts = set()
        n = len(path)
        for i, (x, y) in enumerate(path):
            r = (r0 + (r1 - r0) * i / max(1, n - 1)) * s
            X, Y = x * s + (s - 1) * 0.5, y * s + (s - 1) * 0.5
            for yy in range(int(math.floor(Y - r)), int(math.ceil(Y + r)) + 1):
                for xx in range(int(math.floor(X - r)), int(math.ceil(X + r)) + 1):
                    if (xx - X) ** 2 + (yy - Y) ** 2 <= r * r + 0.25:
                        pts.add((xx, yy))
        return sorted(pts, key=lambda q: (q[1], q[0]))

    def wing(self, p, root, tip, w, ramp, vein, seed, torn: float = 0.0):
        """Asa translúcida: clareia da raiz para a ponta, margem escura e veios que saem da raiz."""
        pts = self.oval(*root, *tip, w)
        n = len(ramp)
        for (x, y, u, v) in pts:
            if torn and hsh(x // self.s, y // self.s, seed) < torn and u > 0.1:
                continue
            k = (u + 1) / 2
            edge = u * u + v * v > 0.8
            i = 1 + int(k * (n - 2)) if not edge else max(0, int(k * (n - 2)) - 1)
            if not edge and (x + y) % (3 * self.s) == 0 and k > 0.5:
                i = min(n - 1, i + 1)
            p.p(x, y, ramp[max(0, min(n - 1, i))])
        sset = {(x, y) for (x, y, _, _) in pts}
        rx, ry = root
        tx, ty = tip
        for j in range(3 if self.s == 1 else 5):
            a = -0.7 + 1.4 * j / max(1, (3 if self.s == 1 else 5) - 1)
            ex = tx + (-(ty - ry)) * a * w / max(1, math.hypot(tx - rx, ty - ry))
            ey = ty + (tx - rx) * a * w / max(1, math.hypot(tx - rx, ty - ry))
            for (x, y) in self.thick(seg(rx, ry, ex * 0.85 + rx * 0.15, ey * 0.85 + ry * 0.15), 0.2 if self.s == 2 else 0.01):
                if (x, y) in sset:
                    p.p(x, y, vein)
        return pts

    def segments(self, p, a, b, w, ramp, band, nseg, glowfn=None):
        """Ventre em segmentos: oval com aros escuros perpendiculares ao eixo e volume de cilindro."""
        pts = self.oval(*a, *b, w)
        n = len(ramp)
        for (x, y, u, v) in pts:
            k = (u + 1) / 2 * nseg
            ring = (k % 1) < (0.16 if self.s == 2 else 0.22)
            shade = 0.62 - 0.42 * v - 0.12 * abs(u)
            i = max(0, min(n - 1, int(shade * n)))
            p.p(x, y, band if ring and abs(v) < 0.92 else ramp[i])
            if glowfn:
                glowfn(p, x, y, u, v, k)
        return pts

    def dot(self, p, x, y, col):
        """Um pixel 16-bit (um bloco s×s)."""
        p.rect(round(x * self.s), round(y * self.s), self.s, self.s, col)

    def fine(self, p, x, y, col):
        """Detalhe que só cabe na 32-bit: um pixel do pixel novo (x, y em unidades 32-bit)."""
        if self.s == 2:
            p.p(x, y, col)

    # -- folha
    def frames(self, mode: str = '') -> list:
        s = self.s
        d = s * self.face
        out = []
        for t in range(4):
            out.append(self.render(Pose(t=t, bob=BOB16[t], mode=mode)))
        for t in range(4):
            if self.style == 'legs':
                lf = self.lift
                lift = [(lf, 0), (0, 0), (0, lf), (0, 0)][t]
                out.append(self.render(Pose(t=t, bob=[0, 1, 0, 1][t], lift=lift, swing=[1, 0, -1, 0][t], run=t, mode=mode)))
            else:
                f = self.render(Pose(t=t, bob=BOB16[t], run=t, mode=mode))
                x0, y0, x1, y1 = bbox(f)
                rise = min([0, 1, 1, 0][t] * s, max(0, y0 - 1))
                sway = [-1, 0, 1, 0][t] * s
                sway = max(-max(0, x0 - 1), min(max(0, f.w - 2 - x1), sway))
                out.append(fix_outline(bend(shift(f, 0, -rise), sway, -sway // 2)))
        a = [self.render(Pose(t=0, atk=k, mode=mode)) for k in range(4)]
        out.append(fix_outline(lean(a[0], -d)))
        out.append(fix_outline(lean(self._shift_in(a[1], d), d)))
        out.append(self.strike(fix_outline(lean(self._shift_in(a[2], d), 2 * d)), d))
        out.append(fix_outline(self._shift_in(a[3], d)))
        base = self.render(Pose(t=0, mode=mode))
        hurt = self.render(Pose(t=0, hurt=True, mode=mode))
        out.append(flash(base))
        out.append(fix_outline(lean(self._shift_in(hurt, -d), -d)))
        sh = self._shift_in(hurt, -d)
        dust = MB.DUST[self.act]
        out.append(fix_outline(lean(sh, -2 * d)))
        out.append(fix_outline(lean(squash(sh, 0.8), -d)))
        out.append(fix_outline(squash(sh, 0.5)))
        out.append(dissolve(fix_outline(squash(sh, 0.3)), 0.45, 7, dust, rise=s))
        out.append(dissolve(fix_outline(squash(sh, 0.2)), 0.85, 9, dust, rise=2 * s))
        assert len(out) == 19
        return out

    def strike(self, c: Canvas, d: int) -> Canvas:
        return smear_s(c, d, self.s, MB.ACT_ACC[self.act][3])


def smear_s(c: Canvas, d: int, s: int, hi=(250, 246, 234)) -> Canvas:
    """O arco claro do golpe na frente do corpo, na escala do desenho."""
    o = MB.copy(c)
    x0, y0, x1, y1 = bbox(c)
    h = y1 - y0 + 1
    ya, yb = y0 + int(h * 0.16), y0 + int(h * 0.58)
    for y in range(ya, yb):
        xs = [x for x in range(c.w) if c.px[y][x] is not None]
        if not xs:
            continue
        k = (y - ya) / max(1, yb - ya - 1)
        bulge = math.sin(k * math.pi)
        edge = max(xs) if d > 0 else min(xs)
        off = s + round(bulge * 2 * s)
        for t in range(s if 0.15 < k < 0.85 else 1):
            x = edge + (1 if d > 0 else -1) * (off + t)
            if 0 <= x < c.w and o.px[y][x] is None:
                o.px[y][x] = hi if t == 0 else (190, 196, 204)
    return o


# ── Marcas de corrupção das variantes ─────────────────────────────────────

def dmarks(p: Canvas, P: Pose, seed: int, s: int, area=None, count: Optional[int] = None, scale: float = 1.0) -> None:
    """Marcas da variante numa peça já pintada, no estilo do bioma.

    VII: pústulas de esporo acesas com borda escura; VIII: pontos de luz viva e cracas;
    IX: ferrugem com rebite aceso; X: rachaduras de areia com lasca roxa."""
    if not P.mode:
        return
    pts = p.mask()
    if not pts:
        return
    bx0, by0, bx1, by1 = area if area else bbox_pts(pts)
    if area:
        bx0, by0, bx1, by1 = [round(v * s) for v in area]
    n = count if count is not None else round(MB.MODES[P.mode][2] * scale)
    if count is None:
        room = sum(1 for (x, y) in pts if bx0 <= x <= bx1 and by0 <= y <= by1)
        n = min(n, max(1, room // (40 * s * s)))
    g = MB.VGLOW[P.act]
    deep = P.mode == 'deep'
    inside = lambda x, y, m: all(p.g(x + dx, y + dy) is not None for dx in (-m, 0, m) for dy in (-m, 0, m))
    placed = 0
    for i in range(160):
        if placed >= n:
            break
        mx = bx0 + int(hsh(i, 0, seed) * (bx1 - bx0 + 1))
        my = by0 + int(hsh(i, 1, seed) * (by1 - by0 + 1))
        if not inside(mx, my, s):
            continue
        placed += 1
        if P.act == 'VII':
            r = s if deep else s + 1
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    q = dx * dx + dy * dy
                    if q <= r * r and p.g(mx + dx, my + dy) is not None:
                        p.p(mx + dx, my + dy, g[3] if q <= (r - 1) * (r - 1) * 0.4 else (g[2] if q <= (r - 1) ** 2 else (40, 36, 16)))
        elif P.act == 'VIII':
            for j in range(1 if deep else 3):
                x, y = mx + j * 2 * s, my + (j % 2) * s
                if p.g(x, y) is None:
                    continue
                p.rect(x, y, s, s, g[3] if j == 0 else g[2])
                if s == 2 and p.g(x - 1, y) is not None:
                    p.p(x - 1, y, g[1])
        elif P.act == 'IX':
            L_ = (3 if deep else 5) * s
            x = mx
            for j in range(L_):
                y = my + j
                if p.g(x, y) is None:
                    break
                p.p(x, y, (96, 52, 26) if j % 2 else (70, 36, 20))
                if s == 2 and p.g(x + 1, y) is not None:
                    p.p(x + 1, y, (120, 66, 32))
            p.rect(mx, my, s, s, g[2] if deep else g[3])
        else:
            L_ = (3 if deep else 6) * s
            x, y = mx, my
            for j in range(L_):
                if p.g(x, y) is None:
                    break
                p.p(x, y, (40, 24, 30))
                x += 1 if hsh(i, j, seed + 5) > 0.5 else 0
                y += 1
            if not deep:
                p.rect(mx, my, s, s, g[2])


# ── Retrato (32×36 na 16-bit, 64×72 na 32-bit) ────────────────────────────

def portrait_s(frame: Canvas, kind: str, act: str, s: int, seed: int = 0) -> Canvas:
    """Retrato do painel no mesmo arranjo dos outros: fundo do bioma em degradê pontilhado;
    monstro em busto 2×, chefe em 1× (cabeça e tronco)."""
    W, H = 32 * s, 36 * s
    ramp = MB.ACT_RAMP[act]
    acc = MB.ACT_ACC[act]
    c = Canvas(W, H)
    for y in range(H):
        for x in range(W):
            v = 1.0 + 2.2 * (y / (H - 1))
            dx, dy = (x - W / 2) / (W / 2), (y - H * 0.45) / (H / 2)
            v -= 0.35 * max(0.0, dx * dx + dy * dy - 0.55)
            lo = int(math.floor(v))
            fr = v - lo
            c.p(x, y, ramp[max(0, min(7, lo + (1 if fr > bay(x // s, y // s) else 0)))])
    for i in range(14):
        x = 2 * s + int(hsh(i, 0, 71 + seed) * (W - 4 * s))
        y = 2 * s + int(hsh(i, 1, 71 + seed) * (H - 4 * s))
        col = ramp[5] if i % 2 else acc[1]
        c.rect(x, y, max(1, s // 2) if i % 3 else s, max(1, s // 2) if i % 3 else s, col)
    x0, y0, x1, y1 = bbox(frame)
    if kind == 'boss':
        left = (x0 + x1 + 1) // 2 - W // 2
        for y in range(H - 2 * s):
            for x in range(W):
                sx, sy = left + x, y0 + y
                if 0 <= sx < frame.w and sy < frame.h and frame.px[sy][sx] is not None:
                    c.p(x, y + 2 * s, frame.px[sy][sx])
    else:
        bw = 16 * s
        low = (y1 - y0) < 16 * s
        left = x1 - bw + 1 if low else round((x0 + x1 + 1) / 2 - bw / 2)
        rows = min(17 * s, y1 - y0 + 1)
        oy = H - rows * 2 - s if low else 2 * s
        for y in range(rows):
            for x in range(bw):
                sx, sy = left + x, y0 + y
                if 0 <= sx < frame.w and sy < frame.h and frame.px[sy][sx] is not None:
                    c.rect(x * 2, oy + y * 2, 2, 2, frame.px[sy][sx])
    inner = mix(OL, ramp[2], 0.45)
    for x in range(W):
        c.p(x, 0, OL); c.p(x, H - 1, OL)
        if s == 2:
            c.p(x, 1, inner); c.p(x, H - 2, inner)
    for y in range(H):
        c.p(0, y, OL); c.p(W - 1, y, OL)
        if s == 2:
            c.p(1, y, inner); c.p(W - 2, y, inner)
    for (x, y, sx, sy) in ((0, 0, 1, 1), (W - 1, 0, -1, 1), (0, H - 1, 1, -1), (W - 1, H - 1, -1, -1)):
        c.p(x, y, None)
        if s == 2:
            c.p(x + sx, y, None); c.p(x, y + sy, None)
            c.p(x + sx, y + sy, OL)
    return c


# ── Corredor e objetos ────────────────────────────────────────────────────

class Piece:
    """Peça de cenário em unidades 16-bit (w16 × h16), desenhada na escala s."""

    def __init__(self, w16: int, h16: int, s: int):
        self.s, self.w16, self.h16 = s, w16, h16
        self.c = Canvas(w16 * s, h16 * s)
        self.W, self.H = w16 * s, h16 * s

    # bloco de um pixel 16-bit
    def dot(self, x, y, col):
        self.c.rect(round(x * self.s), round(y * self.s), self.s, self.s, col)

    def rect(self, x, y, w, h, col):
        s = self.s
        self.c.rect(round(x * s), round(y * s), max(1, round(w * s)), max(1, round(h * s)), col)

    def hl(self, x, y, w, col):
        self.rect(x, y, w, 1, col)

    def vl(self, x, y, h, col):
        self.rect(x, y, 1, h, col)

    def fine(self, X, Y, col):
        """Pixel da 32-bit (coordenadas da escala 2); na 16-bit, nada."""
        if self.s == 2:
            self.c.p(X, Y, col)

    def each(self, x0, y0, x1, y1):
        """Todos os pixels da escala atual dentro da caixa 16-bit, com (x16, y16) em float."""
        s = self.s
        for Y in range(max(0, round(y0 * s)), min(self.H, round(y1 * s))):
            for X in range(max(0, round(x0 * s)), min(self.W, round(x1 * s))):
                yield X, Y, X / s, Y / s

    def shape(self, pts16: Sequence[tuple[float, float]]) -> list:
        """Polígono em unidades 16-bit → pixels da escala."""
        s = self.s
        return PG([(x * s, y * s) for (x, y) in pts16])

    def ellipse_pts(self, cx, cy, rx, ry) -> list:
        s = self.s
        return E(cx * s + (s - 1) * 0.5, cy * s + (s - 1) * 0.5, rx * s, ry * s)

    def put(self, pts, col):
        for (x, y) in pts:
            self.c.p(x, y, col)

    def image(self) -> Image.Image:
        return self.c.image()


def dith(ramp: Sequence[RGB], v: float, X: int, Y: int, s: int) -> RGB:
    """Tom da rampa para v em [0, 1], com pontilhado ordenado na passagem (grão de 1 pixel 16-bit
    na 16-bit e de 1 px na 32-bit)."""
    v = max(0.0, min(0.999, v)) * (len(ramp) - 1)
    lo = int(v)
    fr = v - lo
    b = bay(X, Y) if s == 2 else bay(X, Y)
    return ramp[min(len(ramp) - 1, lo + (1 if fr > b else 0))]


def outline_piece(c: Canvas, col: RGB = OL) -> None:
    c.outline(col)


# ── Efeitos: o golpe e o impacto do bioma, recoloridos dos efeitos do ato V ─────────────

def recolor_fx(src_file: str, dst_file: str, ramp: Sequence[RGB]) -> None:
    """Recolore um efeito do próprio pack (o do ato V) pela luminância, nas duas resoluções."""
    for s in (1, 2):
        src = file_at(src_file, s)
        if not os.path.exists(src):
            continue
        img = Image.open(src).convert('RGBA')
        px = img.load()
        for y in range(img.height):
            for x in range(img.width):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255
                c = ramp[min(len(ramp) - 1, int(lum * len(ramp)))]
                px[x, y] = (c[0], c[1], c[2], a)
        save(img, dst_file, s)


# ── Índice para o jogo (src/render/pack-dimensoes.ts) ─────────────────────

ANIMS = {'idle': {'frames': [0, 1, 2, 3], 'fps': 6}, 'run': {'frames': [4, 5, 6, 7], 'fps': 10},
         'attack': {'frames': [8, 9, 10, 11], 'fps': 12}, 'hit': {'frames': [12, 13], 'fps': 10},
         'death': {'frames': [14, 15, 16, 17, 18], 'fps': 8}}


def monster_entries(mon: Dual) -> list[dict]:
    w, h = mon.size16
    base = f'char/{mon.kind}/{mon.mid}'
    out = []
    floors = {'deep': [2, 3], 'core': [4], 'phase2': [4]}
    for mode in mon.modes():
        e = {'id': base + (f'-{mode}' if mode else ''), 'type': 'character', 'file': mon.file(mode),
             'anchor': [0.5, 1], 'size': [w, h], 'frameSize': [w, h], 'sheetSize': [w * 19, h], 'frames': 19,
             'animations': ANIMS, 'columns': 19, 'rows': 1}
        if mode:
            e['variant'] = mode
        e.update({'act': mon.act, 'panelScale': 1 if mon.kind == 'boss' else 2, 'name': mon.name})
        if mode:
            e.update({'baseId': base, 'floors': floors[mode]})
        out.append(e)
    out.append({'id': f'ui/portrait/{mon.kind}/{mon.mid}', 'type': 'portrait', 'file': mon.portrait_file(),
                'anchor': [0, 0], 'size': [32, 36], 'act': mon.act})
    return out


def corridor_entries(act: str) -> list[dict]:
    low = act.lower()
    name = ROMAN_NAMES[act]
    out = []
    for layer, size, extra in (('wall-a', [320, 192], {'tileX': True}), ('wall-b', [320, 192], {'tileX': True}),
                               ('floor', [320, 64], {'stageY': 128, 'tileX': True}), ('fore', [320, 32], {'stageY': 160, 'tileX': True}),
                               ('door', [48, 192], {}), ('entry', [72, 192], {})):
        e = {'id': f'corridor/{act}/{layer}', 'type': 'arena-layer', 'file': f'export/corridor/corridor-{low}-{layer}.png',
             'anchor': [0, 0], 'size': size, 'layer': layer, 'act': act, 'actName': name, 'opaque': layer not in ('fore', 'door')}
        e.update(extra)
        out.append(e)
    return out


def prop_entry(act: str, pid: str, size: Sequence[int]) -> dict:
    return {'id': f'prop/arena/{act}/{pid}', 'type': 'prop', 'file': f'export/arena/props/prop-arena-{act.lower()}-{pid}.png',
            'anchor': [0.5, 1], 'size': list(size), 'act': act}


def fx_entries(act: str) -> list[dict]:
    low = act.lower()
    return [{'id': f'fx/{act}/{kind}', 'type': 'fx', 'file': f'export/fx/fx-{kind}-{low}.png', 'anchor': [0.5, 0.5],
             'size': [64, 64], 'frameSize': [64, 64], 'sheetSize': [320, 64], 'frames': 5,
             'animations': {'play': {'frames': [0, 1, 2, 3, 4], 'fps': fps}}, 'columns': 5, 'rows': 1, 'act': act}
            for kind, fps in (('slash', 18), ('impact', 14))]


INDEX = os.path.join(L.ROOT, 'src', 'render', 'pack-dimensoes.ts')
INDEX_JSON = os.path.join(HERE, 'dimensoes32.json')


def write_index(entries_by_act: dict) -> None:
    """Grava o índice das peças das dimensões fundas. Cada bioma guarda as suas entradas em
    art32/dimensoes32.json, para gerar um bioma de cada vez sem perder os outros."""
    data = {}
    if os.path.exists(INDEX_JSON):
        with open(INDEX_JSON) as fh:
            data = json.load(fh)
    data.update(entries_by_act)
    with open(INDEX_JSON, 'w') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=1)
    entries = [e for act in ('VII', 'VIII', 'IX', 'X') for e in data.get(act, [])]
    body = json.dumps(entries, ensure_ascii=False, indent=2)
    out = (
        '// Gerado por art32/dimensoes32.py: as peças dos biomas das dimensões fundas (M5 F6),\n'
        '// somadas ao índice do pack em pack.ts. Não editar à mão.\n\n'
        "import type { PackAsset } from './pack.ts';\n\n"
        f'export const PACK_DIMENSOES: PackAsset[] = {body};\n'
    )
    with open(INDEX, 'w') as fh:
        fh.write(out)


def stack(images, out, scale=2, bg=(60, 74, 56)):
    w = max(i.width for i in images)
    h = sum(i.height + 4 for i in images)
    sh = Image.new('RGBA', (w, h), bg + (255,))
    y = 0
    for i in images:
        sh.alpha_composite(i, (0, y))
        y += i.height + 4
    sh.resize((w * scale, h * scale), Image.NEAREST).save(out)
