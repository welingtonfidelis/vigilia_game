"""Base dos monstros e chefes 32-bit dos atos IV–VI (Cidade Afogada, Forja Abissal, Coração do Abismo).

Cada monstro é montado por peças (como art32/pack16/hd24.py): cada peça é desenhada num canvas
próprio, ganha um anel de contorno na cor do material escurecida e é colada por cima das de trás;
no fim, o anel que encosta no vazio vira OL (contorno preto-quente só na silhueta de fora).

Folha de 19 quadros, igual à 16-bit: parado 0–3, andando 4–7, golpe 8–11, acerto 12–13,
morte 14–18. As poses (respiração, passada, golpe, dor) são desenhadas pela própria peça a partir
de `Pose`; inclinação, avanço, clarão e desmanche da morte são aplicados no quadro pronto, com
o dobro do deslocamento da 16-bit.

Variantes (-deep, -core, -phase2) saem do mesmo desenho: a paleta do monstro é escurecida,
dessaturada e puxada para o tom do ato, os brilhos passam para a cor de ênfase do ato e as peças
ganham marcas de corrupção do material do ato (cracas e algas, fendas de brasa, veias).
Nada aqui usa arte de terceiros.
"""
from __future__ import annotations

import math
import os
import sys
from typing import Callable, Iterable, Optional, Sequence

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import lib32 as L  # noqa: E402
from lib32 import OL, Canvas, hsh, mix, mul, noise  # noqa: E402,F401

RGB = tuple

# ── Paletas dos atos (as mesmas do fundo da masmorra 16-bit) ──────────────

ACT_RAMP = {
    'IV': [(8, 22, 26), (14, 40, 48), (22, 60, 68), (34, 84, 90), (56, 112, 114), (96, 146, 142), (150, 184, 174), (226, 232, 218)],
    'V': [(10, 8, 8), (22, 17, 16), (36, 28, 26), (52, 42, 40), (72, 62, 62), (98, 90, 94), (128, 122, 128), (170, 160, 156)],
    'VI': [(8, 6, 14), (18, 10, 26), (32, 14, 40), (50, 18, 52), (76, 22, 60), (110, 26, 64), (150, 40, 80), (210, 196, 196)],
}
ACT_ACC = {   # ênfases: (escura, média, forte, brilho)
    'IV': [(150, 70, 62), (214, 112, 92), (80, 206, 206), (246, 244, 232)],     # coral, coral claro, ciano, pérola
    'V': [(120, 28, 16), (196, 58, 26), (242, 120, 30), (255, 206, 110)],      # brasa escura, brasa, laranja, amarelo
    'VI': [(90, 42, 122), (168, 30, 58), (214, 52, 128), (246, 128, 186)],     # violeta, carmesim, magenta, rosa
}
# Rampa de brilho (olhos, fendas, núcleo) das variantes, do escuro ao mais aceso.
VGLOW = {
    'IV': [(26, 78, 86), (52, 150, 156), (80, 206, 206), (176, 238, 232), (246, 244, 232)],
    'V': [(120, 28, 16), (196, 58, 26), (242, 120, 30), (255, 206, 110), (255, 240, 200)],
    'VI': [(90, 42, 122), (168, 30, 58), (214, 52, 128), (246, 128, 186), (255, 214, 236)],
}
# Partículas da morte: gotas e bolhas, cinza e brasa, fiapos de alma.
DUST = {
    'IV': [(96, 146, 142), (150, 184, 174), (80, 206, 206), (226, 232, 218)],
    'V': [(98, 90, 94), (128, 122, 128), (242, 120, 30), (255, 206, 110)],
    'VI': [(90, 42, 122), (110, 26, 64), (214, 52, 128), (246, 128, 186)],
}
# saturação mantida, brilho, quantidade de marcas
MODES = {'deep': (0.62, 0.80, 3), 'core': (0.46, 0.66, 7), 'phase2': (0.74, 0.86, 6)}

WHITE = (250, 246, 234)
NOITE = (7, 6, 10)

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def bay(x: int, y: int) -> float:
    return (BAYER[y % 4][x % 4] + 0.5) / 16


def clamp(c) -> RGB:
    return tuple(max(0, min(255, round(v))) for v in c[:3])


def dk(c, k: float = 0.5) -> RGB:
    """Cor do material escurecida (linha de dentro), levemente fria."""
    return clamp((c[0] * k, c[1] * k, c[2] * min(1.0, k * 1.08) + 2))


def tone(c, s: float, f: float, tint, k: float = 0.16) -> RGB:
    r, g, b = c[:3]
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    r, g, b = [(lum + (v - lum) * s) * f for v in (r, g, b)]
    return clamp((r * (1 - k) + tint[0] * k, g * (1 - k) + tint[1] * k, b * (1 - k) + tint[2] * k))


def variant_palette(base: dict, glow: Iterable[str], act: str, mode: str) -> dict:
    """Paleta da variante: tudo escurece e puxa para o ato; os brilhos viram a ênfase do ato."""
    if not mode:
        return {k: list(v) for k, v in base.items()}
    s, f, _ = MODES[mode]
    tint = ACT_RAMP[act][3]
    glow = set(glow)
    out = {}
    g = VGLOW[act]
    for key, ramp in base.items():
        if key in glow:
            n = len(ramp)
            lo = 1 if mode == 'deep' else 0
            out[key] = [g[min(len(g) - 1, lo + round(i * (len(g) - 1 - lo) / max(1, n - 1)))] for i in range(n)]
        else:
            out[key] = [tone(c, s, f, tint) for c in ramp]
    return out


# ── Pose ──────────────────────────────────────────────────────────────────

class Pose:
    """O que muda de um quadro para o outro.

    t      fase do parado (0–3), usada também para cintilar brilhos
    bob    quanto o tronco desce (px 32-bit)
    lift   (esquerda, direita): quanto cada pé sobe na passada
    swing  balanço dos braços na passada (-1, 0, 1)
    run    fase da passada (0–3) ou None
    atk    fase do golpe (0 preparo, 1 avanço, 2 golpe, 3 volta) ou None
    hurt   rosto de dor (acerto e morte)
    mode   '', 'deep', 'core' ou 'phase2'
    """

    def __init__(self, t: int = 0, bob: int = 0, lift=(0, 0), swing: int = 0, run=None, atk=None,
                 hurt: bool = False, mode: str = '', act: str = 'IV'):
        self.t, self.bob, self.lift, self.swing = t, bob, lift, swing
        self.run, self.atk, self.hurt, self.mode, self.act = run, atk, hurt, mode, act

    @property
    def corrupt(self) -> int:
        return {'': 0, 'deep': 1, 'core': 2, 'phase2': 2}[self.mode]


BOB = [0, 1, 2, 1]


# ── Formas (listas de pontos) ─────────────────────────────────────────────

def E(cx: float, cy: float, rx: float, ry: float) -> list:
    return [(x, y) for y in range(int(math.floor(cy - ry)), int(math.ceil(cy + ry)) + 1)
            for x in range(int(math.floor(cx - rx)), int(math.ceil(cx + rx)) + 1)
            if ((x - cx) / max(rx, 0.01)) ** 2 + ((y - cy) / max(ry, 0.01)) ** 2 <= 1.0]


def R(x: int, y: int, w: int, h: int) -> list:
    return [(xx, yy) for yy in range(y, y + h) for xx in range(x, x + w)]


def T(y0: int, y1: int, l0: float, r0: float, l1: float, r1: float) -> list:
    """Trapézio de y0 a y1 com bordas interpoladas."""
    pts = []
    for y in range(y0, y1 + 1):
        k = (y - y0) / max(1, y1 - y0)
        a = round(l0 + (l1 - l0) * k)
        b = round(r0 + (r1 - r0) * k)
        pts += [(x, y) for x in range(a, b + 1)]
    return pts


def PG(poly: Sequence[tuple[float, float]]) -> list:
    """Polígono preenchido (regra par-ímpar, centro do pixel)."""
    ys = [p[1] for p in poly]
    pts = []
    for y in range(int(math.floor(min(ys))), int(math.ceil(max(ys))) + 1):
        xs = []
        for i in range(len(poly)):
            (x0, y0), (x1, y1) = poly[i], poly[(i + 1) % len(poly)]
            if (y0 <= y + 0.5 < y1) or (y1 <= y + 0.5 < y0):
                xs.append(x0 + (y + 0.5 - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            pts += [(x, y) for x in range(int(math.ceil(a - 0.5)), int(math.floor(b - 0.5)) + 1)]
    return pts


def THICK(path: Sequence[tuple[float, float]], r: float) -> list:
    """Traço grosso ao longo de um caminho (discos de raio r)."""
    s = set()
    for (x, y) in path:
        for yy in range(int(math.floor(y - r)), int(math.ceil(y + r)) + 1):
            for xx in range(int(math.floor(x - r)), int(math.ceil(x + r)) + 1):
                if (xx - x) ** 2 + (yy - y) ** 2 <= r * r + 0.25:
                    s.add((xx, yy))
    return sorted(s, key=lambda p: (p[1], p[0]))


def seg(x0, y0, x1, y1, n=None) -> list:
    n = n or int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 2
    return [(x0 + (x1 - x0) * i / (n - 1), y0 + (y1 - y0) * i / (n - 1)) for i in range(n)]


def rows_of(pts) -> dict:
    rows: dict = {}
    for (x, y) in pts:
        rows.setdefault(y, []).append(x)
    return rows


def bbox_pts(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


# ── Pintura ───────────────────────────────────────────────────────────────

def vol(c: Canvas, pts, ramp, lx: float = -0.6, ly: float = -0.8, spec: bool = True, bias: float = 0.0,
        box=None) -> None:
    """Volume sombreado por uma normal aproximada (luz de cima-esquerda)."""
    pts = list(pts)
    if not pts:
        return
    x0, y0, x1, y1 = box or bbox_pts(pts)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = max(1, (x1 - x0) / 2), max(1, (y1 - y0) / 2)
    n = len(ramp)
    for (x, y) in pts:
        nx, ny = (x - cx) / rx, (y - cy) / ry
        v = -(nx * lx + ny * ly) * 0.7 + 0.15 + bias
        i = max(0, min(n - 1, int((v + 1) / 2 * n + 0.15)))
        if not spec and i == n - 1:
            i = n - 2
        c.p(x, y, ramp[i])


def sphere(c: Canvas, pts, ramp, cx: float, cy: float, rx: float, ry: float, amb: float = 0.18,
           dither: bool = True) -> None:
    """Volume redondo de verdade (normal de esfera, luz de cima-esquerda e da frente), com
    pontilhado de 1 px na passagem de um tom para o outro."""
    lx, ly, lz = -0.48, -0.58, 0.66
    n = len(ramp)
    for (x, y) in pts:
        nx, ny = (x - cx) / max(1, rx), (y - cy) / max(1, ry)
        nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
        v = max(0.0, nx * lx + ny * ly + nz * lz) * (1 - amb) + amb
        f = v * (n - 1)
        i = int(f)
        if dither and i < n - 1 and f - i > 0.78 and bay(x, y) < 0.5:
            i += 1
        c.p(x, y, ramp[max(0, min(n - 1, i))])


def cyl(c: Canvas, pts, ramp, bias: float = 0.0, fold: float = 0.0, fold_f: float = 0.9, fold_ph: float = 0.0,
        vy: float = 0.0, spec: bool = True, rim: bool = True) -> None:
    """Pano/membro como cilindro em pé: luz da esquerda por linha, com dobras verticais opcionais."""
    rows = rows_of(pts)
    if not rows:
        return
    ys = sorted(rows)
    yt, yb = ys[0], ys[-1]
    n = len(ramp)
    for y, xs in rows.items():
        a, b = min(xs), max(xs)
        cx, rx = (a + b) / 2, max(1.0, (b - a) / 2)
        ky = (y - yt) / max(1, yb - yt)
        for x in xs:
            nx = (x - cx) / rx
            v = -nx * 0.62 + bias - vy * ky
            if fold:
                v += fold * math.sin((x - a) * fold_f + fold_ph + y * 0.04)
            i = max(0, min(n - 1, int((v + 1) / 2 * n + 0.1)))
            if not spec and i == n - 1:
                i = n - 2
            if rim and x == b and i > 0:
                i = max(0, i - 1)
            c.p(x, y, ramp[i])


def fill(c: Canvas, pts, col) -> None:
    for (x, y) in pts:
        c.p(x, y, col)


def edge_light(c: Canvas, pts, col, side: str = 'tl') -> None:
    """Acende a borda de cima/esquerda de uma forma."""
    s = set(pts)
    for (x, y) in pts:
        if ('t' in side and (x, y - 1) not in s) or ('l' in side and (x - 1, y) not in s):
            c.p(x, y, col)


def edge_dark(c: Canvas, pts, col, side: str = 'br') -> None:
    s = set(pts)
    for (x, y) in pts:
        if ('b' in side and (x, y + 1) not in s) or ('r' in side and (x + 1, y) not in s):
            c.p(x, y, col)


def glowpx(c: Canvas, x, y, ramp, t: int = 0, big: bool = False) -> None:
    """Brilho pequeno (olho, brasa): miolo aceso e borda na cor de baixo."""
    hi = ramp[-1] if (t % 2 == 0 or len(ramp) < 3) else ramp[-2]
    if big:
        for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1)):
            c.p(x + dx, y + dy, ramp[-2])
        c.p(x, y, hi)
    else:
        c.p(x, y, hi)


# ── Montagem por peças ────────────────────────────────────────────────────

Layer = Callable[[Canvas], None]


def close_holes(p: Canvas, cap: int = 3) -> None:
    """Fecha furinhos fechados de até `cap` px dentro da peça (viravam um '+' de contorno)."""
    w, h = p.w, p.h
    seen = set()
    for y in range(1, h - 1):
        row = p.px[y]
        for x in range(1, w - 1):
            if row[x] is not None or (x, y) in seen:
                continue
            if sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if p.px[y + dy][x + dx] is not None) < 2:
                continue
            region, st, ok = {(x, y)}, [(x, y)], True
            while st:
                cx, cy = st.pop()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    q = (cx + dx, cy + dy)
                    if not (0 < q[0] < w - 1 and 0 < q[1] < h - 1):
                        ok = False
                        break
                    if p.px[q[1]][q[0]] is None and q not in region:
                        region.add(q)
                        st.append(q)
                if not ok or len(region) > cap:
                    ok = False
                    break
            seen |= region
            if ok:
                for (qx, qy) in region:
                    nb = [p.g(qx + dx, qy + dy) for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1))]
                    p.px[qy][qx] = next(v for v in nb if v is not None) if any(nb) else None
                for (qx, qy) in region:
                    if p.px[qy][qx] is None:
                        nb = [p.g(qx + dx, qy + dy) for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1))]
                        p.px[qy][qx] = next((v for v in nb if v is not None), None)


def compose(w: int, h: int, layers: Sequence) -> Canvas:
    """Cola as peças em ordem; cada uma com anel na cor do material escurecida; silhueta em OL.

    Uma camada é uma função f(canvas) ou (f, 'noring') para brilhos soltos sem contorno."""
    out = Canvas(w, h)
    ring = [[False] * w for _ in range(h)]
    for item in layers:
        fn, opt = (item if isinstance(item, tuple) else (item, ''))
        p = Canvas(w, h)
        fn(p)
        if opt != 'noring':
            close_holes(p)
            add = []
            for y in range(h):
                row = p.px[y]
                for x in range(w):
                    if row[x] is not None:
                        continue
                    nb = None
                    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
                        v = p.g(x + dx, y + dy)
                        if v is not None and (nb is None or sum(v) < sum(nb)):
                            nb = v
                    if nb is not None:
                        add.append((x, y, nb))
            for x, y, nb in add:
                out.px[y][x] = dk(nb, 0.48)
                ring[y][x] = True
        for y in range(h):
            row = p.px[y]
            for x in range(w):
                if row[x] is not None:
                    out.px[y][x] = row[x]
                    ring[y][x] = False
    for y in range(h):
        for x in range(w):
            if ring[y][x] and any(0 <= x + dx < w and 0 <= y + dy < h and out.px[y + dy][x + dx] is None
                                  for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out.px[y][x] = OL
    return out


# ── Transformações do quadro pronto (golpe, acerto, morte, flutuar) ───────

def copy(c: Canvas) -> Canvas:
    o = Canvas(c.w, c.h)
    o.px = [row[:] for row in c.px]
    return o


def bbox(c: Canvas):
    pts = c.mask()
    if not pts:
        return 0, 0, 0, 0
    return bbox_pts(pts)


def shift(c: Canvas, dx: int, dy: int = 0) -> Canvas:
    o = Canvas(c.w, c.h)
    for y in range(c.h):
        for x in range(c.w):
            v = c.px[y][x]
            if v is not None:
                o.p(x + dx, y + dy, v)
    return o


def lean(c: Canvas, k: float) -> Canvas:
    """Inclina: a linha de cima anda k px, os pés ficam."""
    x0, y0, x1, y1 = bbox(c)
    o = Canvas(c.w, c.h)
    for y in range(c.h):
        off = round(k * (y1 - y) / max(1, y1 - y0))
        for x in range(c.w):
            v = c.px[y][x]
            if v is not None:
                o.p(x + off, y, v)
    return o


def bend(c: Canvas, top: float, bottom: float) -> Canvas:
    """Desloca suave de `top` (cima) a `bottom` (base), sem degrau."""
    x0, y0, x1, y1 = bbox(c)
    o = Canvas(c.w, c.h)
    for y in range(c.h):
        k = (y - y0) / max(1, y1 - y0)
        off = round(top + (bottom - top) * max(0.0, min(1.0, k)))
        for x in range(c.w):
            v = c.px[y][x]
            if v is not None:
                o.p(x + off, y, v)
    return o


def squash(c: Canvas, keep: float) -> Canvas:
    """Mantém os pés e tira linhas do corpo até a altura virar keep×altura."""
    x0, y0, x1, y1 = bbox(c)
    h = y1 - y0 + 1
    nh = max(4, round(h * keep))
    o = Canvas(c.w, c.h)
    for j in range(nh):
        sy = y1 - round(j * (h - 1) / max(1, nh - 1))
        o.px[y1 - j] = c.px[sy][:]
    return o


def fix_outline(c: Canvas) -> Canvas:
    """Refaz a silhueta OL depois de deslocar linhas."""
    o = copy(c)
    w, h = c.w, c.h
    strip = [(x, y) for y in range(h) for x in range(w)
             if o.px[y][x] == OL and any(0 <= x + dx < w and 0 <= y + dy < h and o.px[y + dy][x + dx] is None
                                         for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in strip:
        o.px[y][x] = None
    o.outline(OL)
    return o


def flash(c: Canvas) -> Canvas:
    """Clarão do acerto: tudo vira branco em 3 tons (guarda o volume), contorno fica."""
    o = copy(c)
    for y in range(c.h):
        for x in range(c.w):
            v = c.px[y][x]
            if v is None or v == OL:
                continue
            lum = 0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2]
            o.px[y][x] = (252, 250, 242) if lum > 120 else ((232, 226, 214) if lum > 50 else (196, 188, 178))
    return o


def smear(c: Canvas, d: int, cols=((250, 246, 234), (190, 196, 204))) -> Canvas:
    """Rastro curto do golpe na frente do corpo: um arco claro de 2 px."""
    o = copy(c)
    x0, y0, x1, y1 = bbox(c)
    h = y1 - y0 + 1
    ya, yb = y0 + int(h * 0.16), y0 + int(h * 0.58)
    for j, y in enumerate(range(ya, yb)):
        xs = [x for x in range(c.w) if c.px[y][x] is not None]
        if not xs:
            continue
        k = (y - ya) / max(1, yb - ya - 1)
        bulge = math.sin(k * math.pi)
        edge = max(xs) if d > 0 else min(xs)
        off = 2 + round(bulge * 4)
        for t in range(2 if 0.15 < k < 0.85 else 1):
            x = edge + d * (off + t)
            if 0 <= x < c.w and o.px[y][x] is None:
                o.px[y][x] = cols[0] if t == 0 else cols[1]
    return o


def dissolve(c: Canvas, amount: float, seed: int, dust: Sequence[RGB], rise: int = 2) -> Canvas:
    """Desmancha em pedaços (ruído em grão de 2 px) e solta partículas que sobem."""
    o = Canvas(c.w, c.h)
    for y in range(c.h):
        for x in range(c.w):
            v = c.px[y][x]
            if v is None:
                continue
            r = 0.55 * noise(x, y, seed, 2.2) + 0.45 * hsh(x, y, seed)
            if r < amount:
                if r > amount * 0.78 and hsh(x, y, seed + 3) < 0.5:
                    ny = y - rise - int(hsh(x, y, seed + 1) * 6)
                    if 0 <= ny < c.h and o.px[ny][x] is None:
                        o.px[ny][x] = dust[int(hsh(x, y, seed + 2) * len(dust)) % len(dust)]
            else:
                o.px[y][x] = v
    # tira grãos soltos de 1 px que não são partícula
    for y in range(c.h):
        for x in range(c.w):
            v = o.px[y][x]
            if v is None or v in dust:
                continue
            if all(o.g(x + dx, y + dy) is None for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o.px[y][x] = None
    return o


# ── Marcas de corrupção (variantes) ───────────────────────────────────────

def _inside(p: Canvas, x: int, y: int, m: int = 2) -> bool:
    return all(p.g(x + dx, y + dy) is not None for dx in (-m, 0, m) for dy in (-m, 0, m))


def marks(p: Canvas, P: Pose, seed: int, count: Optional[int] = None, area=None, scale: float = 1.0) -> None:
    """Marcas de corrupção do ato numa peça já pintada (só por dentro dela).

    IV: cracas e fiapos de alga; V: fendas de brasa; VI: veias com bolhas acesas.
    `area` = (x0, y0, x1, y1) limita onde caem; a posição é relativa à caixa da peça, então a
    marca acompanha a peça de quadro em quadro."""
    if not P.mode:
        return
    pts = p.mask()
    if not pts:
        return
    bx0, by0, bx1, by1 = area or bbox_pts(pts)
    n = count if count is not None else round(MODES[P.mode][2] * scale)
    if count is None:                                                    # peça pequena: menos marcas
        room = sum(1 for (x, y) in pts if bx0 <= x <= bx1 and by0 <= y <= by1)
        n = min(n, max(1, room // 75))
    act = P.act
    g = VGLOW[act]
    deep = P.mode == 'deep'
    placed = 0
    for i in range(120):
        if placed >= n:
            break
        mx = bx0 + int(hsh(i, 0, seed) * (bx1 - bx0 + 1))
        my = by0 + int(hsh(i, 1, seed) * (by1 - by0 + 1))
        if not _inside(p, mx, my, 2):
            continue
        placed += 1
        kind = int(hsh(i, 2, seed) * 2)
        if act == 'IV':
            if kind == 0:     # cracas: 2 ou 3 cones de concha com furo escuro
                for j, (ox, oy) in enumerate(((0, 0), (3, 1), (1, 3))[:2 + (i % 2)]):
                    x, y = mx + ox, my + oy
                    if not _inside(p, x, y, 1):
                        continue
                    for (dx, dy, col) in ((-1, 0, (150, 156, 142)), (1, 0, (96, 104, 96)), (0, -1, (200, 204, 188)),
                                          (0, 1, (84, 92, 86)), (-1, -1, (176, 180, 166)), (1, 1, (70, 78, 74)),
                                          (1, -1, (140, 146, 134)), (-1, 1, (110, 118, 108))):
                        p.p(x + dx, y + dy, col)
                    p.p(x, y, (14, 34, 38) if (deep or j) else g[2])
            else:             # alga grudada escorrendo
                L = 5 + int(hsh(i, 3, seed) * 5) + (0 if deep else 3)
                x = mx
                for j in range(L):
                    y = my + j
                    if p.g(x, y) is None:
                        break
                    p.p(x, y, (34, 72, 50) if j % 3 else (60, 110, 70))
                    if j % 3 == 1 and p.g(x + 1, y) is not None:
                        p.p(x + 1, y, (22, 50, 38))
                    x += (1 if hsh(i, j, seed + 9) > 0.6 else (-1 if hsh(i, j, seed + 9) < 0.25 else 0))
                if not deep:
                    p.p(mx, my, g[3])
        elif act == 'V':      # fenda de brasa em zigue-zague, com galhos no -core
            L = 5 + int(hsh(i, 3, seed) * 5) + (0 if deep else 3)
            x, y = mx, my
            path = []
            for j in range(L):
                path.append((x, y))
                y += 1
                x += (1 if hsh(i, j, seed + 7) > 0.62 else (-1 if hsh(i, j, seed + 7) < 0.3 else 0))
            if not deep:
                bx, by = path[len(path) // 2]
                for j in range(4):
                    path.append((bx + j + 1, by + j // 2))
            for j, (x, y) in enumerate(path):
                if p.g(x, y) is None:
                    continue
                p.p(x, y, g[3] if (j % 3 == 1 and not deep) else g[2] if j % 2 else g[1])
                if p.g(x + 1, y) is not None and (x + 1, y) not in path:
                    p.p(x + 1, y, (40, 16, 10))
        else:                 # veia ramificada com bolha acesa na ponta
            L = 6 + int(hsh(i, 3, seed) * 5) + (0 if deep else 3)
            x, y = mx, my
            sx = 1 if hsh(i, 4, seed) < 0.5 else -1
            for j in range(L):
                if p.g(x, y) is None:
                    break
                p.p(x, y, (110, 26, 64) if j % 2 else (76, 22, 60))
                if j == L // 2 and p.g(x + sx, y - 1) is not None:
                    p.p(x + sx, y - 1, (110, 26, 64))
                    p.p(x + 2 * sx, y - 2, (76, 22, 60))
                x += sx if j % 2 else 0
                y += 1
            if p.g(x, y) is not None:
                p.p(x, y, g[2])
                if not deep:
                    p.p(x - 1, y, g[1]); p.p(x, y - 1, g[3])


# ── Folha completa ────────────────────────────────────────────────────────

class Monster:
    mid = ''               # id do jogo
    kind = 'monster'       # 'monster' ou 'boss'
    stem = ''              # nome do arquivo (kebab)
    act = 'IV'
    size = (48, 64)        # quadro 32-bit
    style = 'legs'         # 'legs' (passada desenhada) ou 'float' (desliza e balança)
    glow: set = set()      # rampas que viram a ênfase do ato nas variantes
    lift = 3               # quanto o pé sobe na passada
    face = 1               # +1 olha para a direita (o corredor espelha os inimigos)

    def pal(self) -> dict:
        raise NotImplementedError

    def layers(self, P: Pose, K: dict) -> list:
        raise NotImplementedError

    # -- render
    def render(self, P: Pose) -> Canvas:
        P.act = self.act
        K = variant_palette(self.pal(), self.glow, self.act, P.mode)
        w, h = self.size
        return compose(w, h, self.layers(P, K))

    def modes(self) -> list:
        return ['', 'deep', 'core'] if self.kind == 'monster' else ['', 'phase2']

    def file(self, mode: str = '') -> str:
        return f'export/png/char-{self.kind}-{self.stem}' + (f'-{mode}' if mode else '') + '.png'

    def portrait_file(self) -> str:
        return f'export/ui/portrait-monster/ui-portrait-{self.kind}-{self.stem}.png'

    def frames(self, mode: str = '') -> list:
        w, h = self.size
        d = 2 * self.face
        out = []
        for t in range(4):
            out.append(self.render(Pose(t=t, bob=BOB[t], mode=mode)))
        for t in range(4):
            if self.style == 'legs':
                Lf = self.lift
                lift = [(Lf, 0), (0, 0), (0, Lf), (0, 0)][t]
                out.append(self.render(Pose(t=t, bob=[0, 2, 0, 2][t], lift=lift, swing=[1, 0, -1, 0][t], run=t, mode=mode)))
            else:
                f = self.render(Pose(t=t, bob=BOB[t], run=t, mode=mode))
                x0, y0, x1, y1 = bbox(f)
                bob = -2 * self._rise16(mode, 4 + t)                  # flutua quando a 16-bit flutua
                bob = max(bob, -max(0, y0 - 1))
                sway = [-2, 0, 2, 0][t]
                sway = max(-max(0, x0 - 1), min(max(0, w - 2 - x1), sway))
                out.append(fix_outline(bend(shift(f, 0, bob), sway, -sway // 2)))
        a = [self.render(Pose(t=0, atk=k, mode=mode)) for k in range(4)]
        out.append(fix_outline(lean(a[0], -d)))
        out.append(fix_outline(lean(self._shift_in(a[1], d), d)))
        out.append(self.strike(fix_outline(lean(self._shift_in(a[2], d), 2 * d)), d))
        out.append(fix_outline(self._shift_in(a[3], d)))
        base = self.render(Pose(t=0, mode=mode))
        hurt = self.render(Pose(t=0, hurt=True, mode=mode))
        out.append(flash(base))
        out.append(fix_outline(lean(self._shift_in(hurt, -d), -d)))
        s = self._shift_in(hurt, -d)
        dust = DUST[self.act]
        out.append(fix_outline(lean(s, -2 * d)))
        out.append(fix_outline(lean(squash(s, 0.8), -d)))
        out.append(fix_outline(squash(s, 0.5)))
        out.append(dissolve(fix_outline(squash(s, 0.3)), 0.45, 7, dust, rise=2))
        out.append(dissolve(fix_outline(squash(s, 0.2)), 0.85, 9, dust, rise=4))
        assert len(out) == 19
        return out

    def _rise16(self, mode: str, i: int) -> int:
        """Quantos px o quadro i da folha 16-bit (da mesma variante) sobe em relação ao quadro 0."""
        from PIL import Image
        path = L.path16(self.file(mode))
        if not os.path.exists(path):
            return [0, 1, 0, 1][i % 4]
        src = Image.open(path).convert('RGBA')
        fw, fh = self.size[0] // 2, self.size[1] // 2
        b0 = src.crop((0, 0, fw, fh)).getchannel('A').getbbox()
        bi = src.crop((i * fw, 0, i * fw + fw, fh)).getchannel('A').getbbox()
        return max(0, b0[3] - bi[3]) if b0 and bi else 0

    def _shift_in(self, c: Canvas, dx: int) -> Canvas:
        """Avança dx sem cortar a silhueta na borda do quadro (se não couber, anda o que der)."""
        x0, y0, x1, y1 = bbox(c)
        if dx > 0:
            dx = min(dx, max(0, c.w - 1 - x1))
        else:
            dx = max(dx, -x0)
        return shift(c, dx)

    def strike(self, c: Canvas, d: int) -> Canvas:
        """Quadro do golpe: por padrão, o arco claro na frente."""
        return smear(c, d)


def sheet_image(frames: Sequence[Canvas]):
    return L.sheet([f.image() for f in frames])


# ── Retrato 64×72 ─────────────────────────────────────────────────────────

def portrait(frame: Canvas, kind: str, act: str, seed: int = 0) -> Canvas:
    """Retrato do painel: fundo do bioma em degradê pontilhado; monstro em busto 2× (igual à
    16-bit, os baixinhos deitados mostram a cabeça), chefe em 1× (cabeça e tronco)."""
    W, H = 64, 72
    ramp = ACT_RAMP[act]
    c = Canvas(W, H)
    for y in range(H):
        for x in range(W):
            v = 1.0 + 2.2 * (y / (H - 1))
            dx, dy = (x - W / 2) / (W / 2), (y - H * 0.45) / (H / 2)
            v -= 0.35 * max(0.0, dx * dx + dy * dy - 0.55)       # vinheta nos cantos
            lo = int(math.floor(v))
            fr = v - lo
            c.p(x, y, ramp[max(0, min(7, lo + (1 if fr > bay(x, y) else 0)))])
    acc = ACT_ACC[act]
    for i in range(14):                                          # bolhas / brasas / ciscos de alma
        x = 4 + int(hsh(i, 0, 71 + seed) * (W - 8))
        y = 4 + int(hsh(i, 1, 71 + seed) * (H - 8))
        if act == 'IV':
            c.p(x, y, ramp[5]); c.p(x + 1, y, ramp[4]); c.p(x, y + 1, ramp[4])
        elif act == 'V':
            c.p(x, y, acc[1] if i % 3 else acc[2])
        else:
            c.p(x, y, ramp[5] if i % 2 else acc[0])
    x0, y0, x1, y1 = bbox(frame)
    if kind == 'boss':
        left = (x0 + x1 + 1) // 2 - W // 2
        for y in range(H - 4):
            for x in range(W):
                sx, sy = left + x, y0 + y
                if 0 <= sx < frame.w and sy < frame.h and frame.px[sy][sx] is not None:
                    c.p(x, y + 4, frame.px[sy][sx])
    else:
        low = (y1 - y0) < 32
        left = x1 - 31 if low else round((x0 + x1 + 1) / 2 - 16)
        rows = min(34, y1 - y0 + 1)
        oy = H - rows * 2 - 2 if low else 4
        for y in range(rows):
            for x in range(32):
                sx, sy = left + x, y0 + y
                if 0 <= sx < frame.w and sy < frame.h and frame.px[sy][sx] is not None:
                    c.rect(x * 2, oy + y * 2, 2, 2, frame.px[sy][sx])
    inner = mix(OL, ramp[2], 0.45)
    for x in range(W):
        c.p(x, 0, OL); c.p(x, H - 1, OL); c.p(x, 1, inner); c.p(x, H - 2, inner)
    for y in range(H):
        c.p(0, y, OL); c.p(W - 1, y, OL); c.p(1, y, inner); c.p(W - 2, y, inner)
    for (x, y, sx, sy) in ((0, 0, 1, 1), (W - 1, 0, -1, 1), (0, H - 1, 1, -1), (W - 1, H - 1, -1, -1)):
        c.p(x, y, None); c.p(x + sx, y, None); c.p(x, y + sy, None)
        c.p(x + sx, y + sy, OL)
    return c


# ── Conferência ───────────────────────────────────────────────────────────

def coverage(mon: Monster, frames: Sequence[Canvas]) -> float:
    """IoU da silhueta 32-bit (quadro 0) com a 16-bit ampliada 2× — o enquadramento tem de bater."""
    from PIL import Image
    src = Image.open(L.path16(mon.file())).convert('RGBA')
    w16, h16 = mon.size[0] // 2, mon.size[1] // 2
    f16 = src.crop((0, 0, w16, h16)).resize((w16 * 2, h16 * 2), Image.NEAREST)
    a = f16.getchannel('A').load()
    m32 = frames[0]
    inter = uni = 0
    for y in range(mon.size[1]):
        for x in range(mon.size[0]):
            p = a[x, y] > 0
            q = m32.px[y][x] is not None
            inter += p and q
            uni += p or q
    return inter / max(1, uni)
