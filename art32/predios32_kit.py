"""Kit dos prédios 32-bit do Vigília: telhados, paredes, janelas, portas e enfeites.

Tudo desenhado pixel a pixel no dobro do pack 16-bit, no estilo de `taverna32.py`:
4–5 tons por material, luz de cima e da esquerda, contorno OL só na silhueta de fora
e, por dentro, linhas na cor do material escurecida. Coordenadas sempre em pixels 32-bit.
Nada aqui deriva de arte de terceiros.
"""
from __future__ import annotations

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402

import lib32  # noqa: E402
from lib32 import *  # noqa: E402,F401,F403  (paleta inteira à mão para os módulos de prédio)
from lib32 import (  # noqa: E402
    BONE, CLOTH_BLUE, CLOTH_PURPLE, CLOTH_RED, DIRT, FIRE, GLASS, GOLD, GRASS, IRON, LEAF, MORTAR,
    OL, PLASTER, ROOF_BLUE, ROOF_RED, ROOF_SLATE, STEEL, STONE, THATCH, WOOD, Canvas, hsh, mix, mul, noise,
)

# Rampas extras (do escuro para o claro).
GREEN = [(30, 52, 34), (46, 78, 48), (68, 106, 62), (98, 138, 82)]          # venezianas
SHINGLE = [(38, 26, 20), (62, 42, 30), (90, 62, 41), (118, 84, 55), (146, 106, 70)]
MOSS = [(36, 56, 34), (54, 80, 44), (80, 106, 58), (108, 132, 72)]
VOID = [(8, 7, 10), (15, 12, 14), (24, 19, 20), (34, 27, 26)]               # interior no escuro
SOOT = [(26, 22, 22), (40, 34, 32), (56, 48, 44)]                           # fuligem / queimado
FLOWER = [(196, 60, 60), (230, 190, 70), (232, 228, 214), (210, 120, 150)]
BANNER_RED = [(74, 18, 28), (118, 30, 38), (164, 48, 50), (204, 76, 70)]
LIT = [(196, 112, 44), (236, 150, 64), (255, 190, 100), (255, 222, 140), (255, 244, 200)]


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def new_pair(w: int, h: int) -> tuple[Canvas, Canvas]:
    """Canvas da peça e canvas do overlay de luzes, do mesmo tamanho."""
    return Canvas(w, h), Canvas(w, h)


def put(c: Canvas, x: int, y: int, col) -> None:
    """Pinta só se cair no canvas (atalho para c.p com cor garantida)."""
    if col is not None:
        c.p(x, y, col)


def shade_rect(c: Canvas, x0: int, y0: int, w: int, h: int, k: float) -> None:
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            c.shade(x, y, k)


def cast_shadow(c: Canvas, obj: Canvas, dx: int = 2, dy: int = 2, k: float = 0.66) -> None:
    """Sombra do objeto (num canvas à parte) projetada em `c`, para baixo e para a direita."""
    for y in range(obj.h):
        for x in range(obj.w):
            if obj.px[y][x] is None:
                continue
            for s in range(1, max(dx, dy) + 1):
                tx, ty = x + min(s, dx), y + min(s, dy)
                if 0 <= tx < c.w and 0 <= ty < c.h and obj.px[ty][tx] is None and c.px[ty][tx] is not None:
                    c.px[ty][tx] = mul(c.px[ty][tx], k)


def layer(c: Canvas) -> Canvas:
    return Canvas(c.w, c.h)


def merge(c: Canvas, obj: Canvas, shadow: tuple[int, int, float] | None = (2, 2, 0.66)) -> None:
    """Cola um objeto desenhado à parte, com a sombra dele na parede de trás."""
    if shadow:
        cast_shadow(c, obj, *shadow)
    c.paste(obj, 0, 0)


# ── Telhados ───────────────────────────────────────────────────────────────

def _tile(x, y, j, face, pal, seed, t):
    """Telha de barro: fiadas de 6, capa arredondada com brilho à esquerda."""
    course, ly = j // 6, j % 6
    tw = 8 if face == 0 else 4
    off = (tw // 2) if course % 2 else 0
    sx, tile = (x + off) % tw, (x + off) // tw
    if ly == 0:
        col = pal[4] if t < 0.25 else pal[3]
    elif ly <= 3:
        col = mix(pal[3], pal[2], (ly - 1) / 2)
        if sx == 1 and face == 0:
            col = mix(col, pal[4], 0.5)
    elif ly == 4:
        col = pal[1]
    else:
        col = pal[0]
    if sx == tw - 1 and 1 <= ly <= 4:
        col = pal[0]
    if ly >= 4 and sx in (0, tw - 1):
        col = pal[0]
    col = mul(col, 0.9 + 0.18 * hsh(tile, course, seed + 11))
    if 1 <= ly <= 4 and hsh(tile, course, seed + 12) < 0.06 and hsh(x, y, seed + 13) < 0.55:
        col = mix(col, MOSS[3] if ly < 3 else MOSS[1], 0.7)   # musgo salpicado
    return col, (course, tile)


def _slate(x, y, j, face, pal, seed, t):
    """Ardósia: fiadas de 5, placas retas de 7 com junta escura e líquen claro."""
    course, ly = j // 5, j % 5
    sw = 7 if face == 0 else 4
    off = (course * 3 + int(hsh(course, 0, seed) * 4)) % sw
    sx, s = (x + off) % sw, (x + off) // sw
    if ly == 4:
        col = pal[0]
    elif ly == 0:
        col = pal[3] if sx < sw - 2 else pal[2]
    elif ly == 3:
        col = pal[1]
    else:
        col = mix(pal[2], pal[3], 0.35) if sx < 2 else pal[2]
    if sx == sw - 1 and ly < 4:
        col = pal[1] if ly == 0 else pal[0]
    tone = 0.86 + 0.24 * hsh(s, course, seed + 3)
    col = mul(col, tone)
    r = hsh(s, course, seed + 4)
    if r < 0.035 and ly in (1, 2) and 1 <= sx <= 3:
        col = mix(col, (128, 132, 102), 0.3)           # líquen
    elif r > 0.97 and ly == 3 and sx >= sw - 3:
        col = pal[0]                                   # quina lascada
    return col, (course, s)


def _shingle(x, y, j, face, pal, seed, t):
    """Tabuinha de madeira: fiadas de 5, largura variada, veio em pé."""
    course, ly = j // 5, j % 5
    sw = 6 if face == 0 else 3
    off = int(hsh(course, 1, seed) * sw)
    sx, s = (x + off) % sw, (x + off) // sw
    if ly == 4:
        col = pal[0]
    elif ly == 0:
        col = pal[3]
    else:
        col = pal[2]
        if hsh(x, course, seed + 5) < 0.28:
            col = pal[1]                               # veio
        elif hsh(x, course, seed + 6) > 0.9:
            col = pal[3]
    if sx == sw - 1 and ly < 4:
        col = pal[0]
    col = mul(col, 0.86 + 0.24 * hsh(s, course, seed + 7))
    if ly in (1, 2, 3) and hsh(s, course, seed + 8) < 0.04:
        col = mix(col, MOSS[2], 0.5)
    return col, (course, s)


def _thatch(x, y, j, face, pal, seed, t):
    """Palha: camadas de 7 com franja caindo sobre a de baixo, fios em pé."""
    lh = 7
    layer_i, ly = j // lh, j % lh
    hang = int(hsh(x, layer_i, seed) * 3.2)            # franja da camada de cima
    if layer_i > 0 and ly < hang:
        col = pal[3] if ly == hang - 1 else pal[2]
    elif ly < 2 + (1 if hsh(x, layer_i, seed + 1) < 0.3 else 0) and layer_i > 0:
        col = pal[1] if ly == 0 or hang == 0 else pal[1]
    else:
        seg = (j + int(hsh(x, 0, seed + 2) * 5)) // 4
        r = hsh(x, seg, seed + 3)
        col = pal[2]
        if r > 0.62:
            col = pal[3]
        if r > 0.93:
            col = pal[4]
        if r < 0.16:
            col = pal[1]
        if ly == lh - 1 and r > 0.4:
            col = pal[3]
    col = mul(col, 0.94 + 0.12 * noise(x, j, seed + 4, 5))
    return col, (layer_i, x // 6)


ROOF_MAT = {'tile': _tile, 'slate': _slate, 'shingle': _shingle, 'thatch': _thatch}


COURSE = {'tile': 6, 'slate': 5, 'shingle': 5, 'thatch': 7}


def roof(c: Canvas, y0: int, y1: int, ol, orr, hl, hr, mat='tile', pal=ROOF_RED, seed=0,
         ridge=True, eave=True, side_k=(0.76, 0.56), missing: float = 0.0, dirt: float = 0.0):
    """Telhado de quatro águas visto de frente.

    y0..y1: linhas preenchidas (y1 é a borda do beiral). ol/orr: x da borda de fora à
    esquerda/direita em (y0, y1); hl/hr: x das arestas (espigões) em (y0, y1). Entre os
    espigões fica a água da frente; fora deles, as águas laterais, mais escuras.
    missing: fração de telhas caídas (em manchas, mostrando a ripa); dirt: encardido.
    """
    fn = ROOF_MAT[mat]
    ch = COURSE[mat]
    H = max(1, y1 - y0)
    for y in range(y0, y1 + 1):
        t = (y - y0) / H
        xl, xr = round(lerp(ol[0], ol[1], t)), round(lerp(orr[0], orr[1], t))
        hx_l, hx_r = lerp(hl[0], hl[1], t), lerp(hr[0], hr[1], t)
        for x in range(xl, xr + 1):
            face = -1 if x < hx_l - 0.5 else (1 if x > hx_r + 0.5 else 0)
            col, cid = fn(x, y, y - y0, face, pal, seed, t)
            if face:
                col = mul(col, side_k[0] if face < 0 else side_k[1])
            if dirt:
                col = mix(col, (66, 56, 52), dirt * 0.22)
                col = mul(col, 1 - dirt * 0.4 * noise(x, y * 1.5, seed + 80, 8))
                if hsh(x, y, seed + 81) < dirt * 0.06:
                    col = mul(col, 0.7)
            if missing and 2 < y - y0 < H - 2:
                course, tile = cid
                m = noise(tile * 2.0, course * 2.0, seed + 70, 3) * 0.7 + hsh(tile, course, seed + 71) * 0.3
                if m > 1 - missing:
                    ly = (y - y0) % ch
                    col = VOID[1] if ly != ch // 2 else (WOOD[1] if hsh(x // 9, course, seed + 72) < 0.8 else VOID[0])
                    if ly == ch // 2 - 1 and col == VOID[1]:
                        col = VOID[0]
            c.p(x, y, col)
        # Espigões: capa de telha clara (esquerda) e escura (direita), com emendas.
        for hx, light in ((hx_l, True), (hx_r, False)):
            if xl + 1 < round(hx) < xr - 1:
                bx = round(hx)
                notch = (y - y0) % 5 == 4
                a = pal[3] if light else pal[2]
                b = pal[2] if light else pal[1]
                if notch:
                    a, b = pal[1], pal[0]
                c.p(bx - 1 if light else bx, y, a)
                c.p(bx if light else bx + 1, y, b)
    if ridge:
        xa, xb = round(hl[0]) - 1, round(hr[0]) + 1
        for x in range(max(xa, round(ol[0])), min(xb, round(orr[0])) + 1):
            k = (x - xa) % 7
            c.p(x, y0, pal[4] if k not in (0, 6) else pal[2])
            c.p(x, y0 + 1, pal[3] if k else pal[1])
            c.p(x, y0 + 2, pal[1] if k else pal[0])
    if eave:
        xl, xr = round(ol[1]), round(orr[1])
        for x in range(xl, xr + 1):
            c.p(x, y1, mul(pal[0], 0.7))
            c.p(x, y1 - 1, mix(pal[0], pal[1], 0.5) if (x // 3) % 2 else pal[0])


def thatch_ridge(c: Canvas, x0: int, x1: int, y: int, pal=THATCH, seed=0):
    """Cumeeira de palha amarrada: rolo mais escuro com varas cruzadas."""
    for x in range(x0, x1 + 1):
        for dy in range(5):
            col = [pal[2], pal[1], pal[1], pal[0], pal[1]][dy]
            if dy == 0 and hsh(x, 0, seed) > 0.5:
                col = pal[3]
            c.p(x, y + dy, col)
        k = (x - x0) % 8
        if k in (1, 6):
            c.p(x, y + 1, WOOD[3])
            c.p(x, y + 3, WOOD[2])
        elif k in (2, 5):
            c.p(x, y + 2, WOOD[3])
        elif k in (3, 4):
            c.p(x, y + 2, WOOD[2])


def eave_shadow(c: Canvas, x0: int, x1: int, y: int, depth: int = 5):
    """Sombra do beiral na parede logo abaixo."""
    for yy in range(y, y + depth):
        k = 0.6 + 0.4 * (yy - y) / depth
        for x in range(x0, x1 + 1):
            c.shade(x, yy, k)


def roof_hole(c: Canvas, cx: int, cy: int, rx: int, ry: int, pal=ROOF_RED, seed=0, rafters=None, lean=0.25):
    """Rombo no telhado: borda rasgada, escuro por dentro, ripas e caibros (um quebrado)."""
    rafters = rafters if rafters is not None else list(range(cx - rx + 3, cx + rx - 1, 6))
    def rad(x, y):
        a = math.atan2((y - cy) / ry, (x - cx) / rx)
        return 0.78 + 0.42 * noise(a * 2.2 + 10, 0, seed, 1) + 0.12 * (hsh(x, y, seed) - 0.5)
    pts = []
    for y in range(cy - ry - 3, cy + ry + 4):
        for x in range(cx - rx - 3, cx + rx + 4):
            if c.g(x, y) is None:
                continue
            d = math.hypot((x - cx) / rx, (y - cy) / ry)
            r = rad(x, y)
            if d <= r:
                pts.append((x, y))
            elif d <= r + 0.16:
                # Borda quebrada: em cima fica na sombra, embaixo a quina da telha pega luz.
                c.p(x, y, pal[0] if y < cy else (pal[3] if hsh(x, y, seed + 2) < 0.6 else pal[2]))
    for (x, y) in pts:
        col = VOID[0] if y < cy - ry // 3 else VOID[1]
        if (y - cy + 40) % 6 == 0 and hsh(x // 5, y, seed + 3) < 0.75:
            col = WOOD[1] if hsh(x, y, seed + 4) < 0.85 else WOOD[0]          # ripa
        elif (y - cy + 40) % 6 == 5 and hsh(x // 5, y + 1, seed + 3) < 0.75:
            col = VOID[2]
        for i, rx_ in enumerate(rafters):
            xx = rx_ + round((y - cy) * lean * (1 if i % 2 else -0.4))
            if xx <= x <= xx + 1:
                broken = i == len(rafters) - 1 and y > cy + ry * 0.2
                if not broken:
                    col = WOOD[2] if x == xx else WOOD[0]
                    if y < cy - ry // 2:
                        col = WOOD[3] if x == xx else WOOD[1]
        c.p(x, y, col)


def rafter_stubs(c: Canvas, xs, top: int, base: int, seed: int = 0, burnt=True):
    """Caibros partidos espetados acima do telhado aberto."""
    p = SOOT if burnt else WOOD
    for i, x in enumerate(xs):
        t = top + int(hsh(i, 0, seed) * 3)
        for y in range(t, base):
            c.p(x, y, p[2] if len(p) > 2 else p[1])
            c.p(x + 1, y, p[0])
        c.p(x, t, WOOD[3])
        c.p(x + 1, t + 1, WOOD[2])


# ── Paredes ────────────────────────────────────────────────────────────────

def wall_planks(c: Canvas, x0: int, y0: int, w: int, h: int, pal=WOOD, pw: int = 8, seed: int = 0,
                nails=(), weather: int = 8, seams: bool = True):
    """Tábuas em pé: fresta escura, quina clara, veio, nós, emendas e pé molhado."""
    for x in range(x0, x0 + w):
        lx = x - x0
        b, k = lx // pw, lx % pw
        tone = 0.86 + 0.24 * hsh(b, 0, seed)
        seam = y0 + 6 + int(hsh(b, 1, seed) * (h - 12)) if seams and hsh(b, 2, seed) < 0.45 else -99
        for y in range(y0, y0 + h):
            if k == pw - 1:
                col = pal[0]
            elif k == 0:
                col = pal[3]
            else:
                col = pal[2]
                seg = (y + int(hsh(x, 3, seed) * 9)) // 7
                r = hsh(x, seg, seed + 1)
                if r < 0.2:
                    col = pal[1]
                elif r > 0.93:
                    col = pal[3]
            if y == seam:
                col = pal[0]
            elif y == seam + 1 and k != pw - 1:
                col = pal[3]
            col = mul(col, tone)
            if weather and y > y0 + h - weather:
                f = (y - (y0 + h - weather)) / weather
                col = mul(col, 1 - 0.28 * f)
                if hsh(x, y, seed + 4) < 0.12 * f:
                    col = MOSS[1]
            c.p(x, y, col)
        # Nó na madeira (anel escuro).
        if hsh(b, 5, seed) < 0.35 and 2 <= k <= pw - 4:
            ky = y0 + 4 + int(hsh(b, 6, seed) * max(1, h - 10))
            if k == 3:
                c.p(x, ky, pal[0])
                c.p(x + 1, ky, pal[1])
                c.p(x, ky + 1, pal[1])
                c.p(x + 1, ky - 1, pal[3])
    for ny in nails:
        for x in range(x0 + 2, x0 + w, pw):
            c.p(x, ny, IRON[1])
            c.p(x + 1, ny, IRON[3])


def wall_stone(c: Canvas, x0: int, y0: int, w: int, h: int, pal=STONE, seed: int = 0, moss_rows: int = 8,
               bh=(7, 6), bw=(10, 8), mortar=MORTAR):
    """Cantaria: blocos de largura variada, chanfro claro em cima, musgo embaixo."""
    y, row = y0, 0
    while y < y0 + h:
        hh = bh[row % len(bh)]
        x = x0 - int(hsh(row, 0, seed + 31) * 8)
        while x < x0 + w:
            ww = bw[0] + int(hsh(x, row, seed + 32) * bw[1])
            tone = 0.86 + 0.24 * hsh(x, row, seed + 33)
            for yy in range(y, min(y + hh, y0 + h)):
                for xx in range(max(x, x0), min(x + ww, x0 + w)):
                    ly, lx = yy - y, xx - x
                    if ly == hh - 1 or lx == ww - 1:
                        col = mortar
                    elif ly == 0:
                        col = pal[4] if lx < ww - 3 else pal[3]
                    elif lx == 0:
                        col = pal[3]
                    elif ly == hh - 2 or lx == ww - 2:
                        col = pal[1]
                    else:
                        col = mix(pal[2], pal[3], noise(xx, yy, seed + 34, 2) * 0.6)
                    if col != mortar:
                        col = mul(col, tone)
                        if moss_rows and yy > y0 + h - moss_rows and hsh(xx, yy, seed + 35) < 0.14:
                            col = mix(col, MOSS[1], 0.6)
                        elif hsh(xx, yy, seed + 36) < 0.02:
                            col = mul(col, 0.8)        # pinta na pedra
                    c.p(xx, yy, col)
            x += ww
        y += hh
        row += 1


def wall_ashlar(c: Canvas, x0: int, y0: int, w: int, h: int, pal=STONE, seed: int = 0, bw: int = 12,
                bh: int = 6, moss_rows: int = 8, mortar=MORTAR):
    """Pedra aparelhada regular (blocos iguais, desencontrados), com tom por bloco."""
    for y in range(y0, y0 + h):
        ly = y - y0
        row = ly // bh
        off = (bw // 2) if row % 2 else 0
        for x in range(x0, x0 + w):
            lx = x - x0 + off
            bx, by = lx % bw, ly % bh
            if by == bh - 1 or bx == bw - 1:
                c.p(x, y, mortar)
                continue
            col = pal[2]
            if by == 0:
                col = pal[3] if bx < bw - 3 else pal[2]
            elif by == bh - 2:
                col = pal[1]
            elif bx == 0:
                col = mix(pal[2], pal[3], 0.6)
            elif bx == bw - 2:
                col = mix(pal[1], pal[2], 0.5)
            tone = 0.88 + 0.22 * hsh(lx // bw, row, seed)
            col = mul(col, tone * (0.97 + 0.06 * noise(x, y, seed + 1, 2)))
            if moss_rows and y > y0 + h - moss_rows and hsh(x, y, seed + 2) < 0.12:
                col = mix(col, MOSS[1], 0.55)
            elif hsh(x, y, seed + 3) < 0.015:
                col = mul(col, 0.8)
            c.p(x, y, col)


def plaster(c: Canvas, x0: int, y0: int, w: int, h: int, seed: int = 0, dirty: float = 0.0, cracks: int = 6):
    """Reboco manchado com rachaduras finas (dirty > 0 suja e descasca, para ruínas)."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            v = noise(x, y, seed + 21, 5)
            col = mix(PLASTER[1], PLASTER[3], v)
            if hsh(x, y, seed + 22) < 0.03:
                col = PLASTER[0]
            if dirty:
                d = noise(x * 0.7, y * 0.12, seed + 26, 3) * 0.6 + noise(x, y, seed + 28, 9) * 0.4
                if d > 1 - dirty * 0.45:
                    col = mix(col, (112, 96, 76), 0.45)         # escorrido de umidade
                elif d > 1 - dirty * 0.6:
                    col = mix(col, (112, 96, 76), 0.22)
            c.p(x, y, col)
    if dirty:
        for k in range(int(dirty * w * h / 700) + 1):
            px_ = x0 + 3 + int(hsh(k, 11, seed) * (w - 6))
            py_ = y0 + 3 + int(hsh(k, 12, seed) * (h - 6))
            rx, ry = 3 + hsh(k, 13, seed) * 5, 2 + hsh(k, 14, seed) * 3
            for y in range(int(py_ - ry) - 1, int(py_ + ry) + 2):
                for x in range(int(px_ - rx) - 1, int(px_ + rx) + 2):
                    if not (x0 <= x < x0 + w and y0 <= y < y0 + h):
                        continue
                    d = math.hypot((x - px_) / rx, (y - py_) / ry) + 0.25 * (hsh(x, y, seed + 15) - 0.5)
                    if d <= 1:
                        c.p(x, y, WOOD[2] if (y - y0) % 3 == 0 else (WOOD[1] if (y - y0) % 3 == 1 else VOID[2]))
                    elif d <= 1.25:
                        c.p(x, y, PLASTER[0] if (y > py_ or x > px_) else PLASTER[3])
    for k in range(cracks):
        cx = x0 + int(hsh(k, 1, seed + 23) * w)
        cy = y0 + 3 + int(hsh(k, 2, seed + 23) * max(1, h - 6))
        sgn = 1 if hsh(k, 4, seed + 23) < 0.5 else -1
        for i in range(int(3 + hsh(k, 3, seed + 23) * 5)):
            if x0 <= cx + i < x0 + w and y0 <= cy + (i // 2) * sgn < y0 + h:
                c.p(cx + i, cy + (i // 2) * sgn, PLASTER[0])


def beam(c: Canvas, x: int, y: int, bw: int, bh: int, vertical: bool, pal=WOOD, seed: int = 24):
    """Viga com quina clara, base escura e veio."""
    for yy in range(y, y + bh):
        for xx in range(x, x + bw):
            a = (xx - x) if vertical else (yy - y)
            n = bw if vertical else bh
            col = pal[3] if a == 0 else (pal[1] if a == n - 1 else pal[2])
            along, across = (yy, xx) if vertical else (xx, yy)
            if 0 < a < n - 1 and hsh(across, 0, seed) < 0.35 and noise(along, across, seed + 1, 4) > 0.42:
                col = pal[1]
            c.p(xx, yy, col)


def brace(c: Canvas, xa: int, ya: int, xb: int, yb: int, pal=WOOD):
    """Escora diagonal de 3 px (clara em cima, escura embaixo)."""
    n = max(abs(xb - xa), abs(yb - ya))
    for i in range(n + 1):
        t = i / max(1, n)
        x, y = round(lerp(xa, xb, t)), round(lerp(ya, yb, t))
        c.p(x, y - 1, pal[3])
        c.p(x, y, pal[2])
        c.p(x, y + 1, pal[1])


def timber(c: Canvas, x0: int, y0: int, w: int, h: int, posts, rails, braces=(), seed: int = 0,
           dirty: float = 0.0, pw: int = 4, rh: int = 4, pal=WOOD):
    """Enxaimel: reboco manchado entre postes, travessas e escoras; pinos nas juntas."""
    plaster(c, x0, y0, w, h, seed=seed, dirty=dirty)
    for (xa, ya, xb, yb) in braces:
        brace(c, xa, ya, xb, yb, pal)
    for ry in rails:
        beam(c, x0, ry, w, rh, False, pal, seed + 24)
    for px in posts:
        beam(c, px, y0, pw, h, True, pal, seed + 25)
    for px in posts:
        for ry in rails:
            c.p(px + 1, ry + 1, pal[0])
            c.p(px + 2, ry + 2, pal[4])


def plinth(c: Canvas, x0: int, y0: int, w: int, h: int = 6, pal=STONE, seed: int = 0, joint: int = 14):
    """Rodapé de pedra: lajes com quina clara, junta escura, tom por laje e musgo no pé."""
    edges = [x0]
    while edges[-1] < x0 + w:
        edges.append(edges[-1] + joint - 3 + int(hsh(len(edges), 0, seed) * 7))
    for i in range(len(edges) - 1):
        a, b = edges[i], min(edges[i + 1], x0 + w)
        tone = 0.88 + 0.2 * hsh(i, 1, seed)
        for y in range(y0, y0 + h):
            for x in range(a, b):
                ly, lx = y - y0, x - a
                col = pal[2]
                if ly == 0:
                    col = pal[4] if lx < (b - a) - 2 else pal[3]
                elif ly == 1:
                    col = pal[3]
                elif ly == h - 1:
                    col = pal[0]
                elif ly == h - 2:
                    col = pal[1]
                if lx == 0 and 0 < ly < h - 1:
                    col = mix(pal[3], pal[2], 0.5)
                if x == b - 1 and 0 < ly:
                    col = pal[0]
                col = mul(col, tone * (0.96 + 0.08 * noise(x, y, seed + 2, 2)))
                if ly >= h - 3 and hsh(x, y, seed + 3) < 0.1:
                    col = mix(col, MOSS[1], 0.5)
                c.p(x, y, col)


# ── Janelas ────────────────────────────────────────────────────────────────

def glass(c: Canvas, x0: int, y0: int, w: int, h: int, lights: Canvas | None = None, broken=False, seed=0):
    """Vidro escuro com degradê, reflexo na diagonal e sombra da moldura em cima."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            t = ((x - x0) / max(1, w) + (y - y0) / max(1, h)) / 2
            col = mix(GLASS[2], GLASS[0], t)
            if y == y0:
                col = GLASS[0]
            lx = (x - x0) - (y - y0) * 0.7
            if 1 <= lx <= 2 and (y - y0) < h * 0.6 and y > y0:
                col = GLASS[3]
            if broken:
                col = VOID[1] if hsh(x, y, seed) > 0.25 else VOID[2]
            c.p(x, y, col)
            if lights is not None and not broken:
                cx, cy = x0 + w / 2, y0 + h * 0.62
                d = min(1.0, math.hypot((x - cx) / max(1, w * 0.62), (y - cy) / max(1, h * 0.7)))
                lc = mix(LIT[4], LIT[1], d)
                if y == y0:
                    lc = LIT[0]
                lights.p(x, y, lc)
    if broken:
        # Cacos presos na moldura.
        for i in range(3):
            sx = x0 + int(hsh(i, 1, seed) * (w - 2))
            for k in range(2 + i % 2):
                c.p(sx + k, y0 + k, GLASS[3] if k == 0 else GLASS[2])
        c.p(x0 + w - 1, y0 + h - 1, GLASS[3])
        c.p(x0 + w - 2, y0 + h - 1, GLASS[2])


def window(c: Canvas, lights: Canvas | None, gx: int, gy: int, gw: int, gh: int, *, frame=WOOD,
           mull: str = 'cross', shutters=None, sw: int = 3, box: bool = False, sill: str = 'wood',
           lintel: str | None = None, broken=False, seed: int = 0, fw: int = 2):
    """Janela: vidro gx,gy,gw,gh; moldura de `fw` px; cruzeta; venezianas e floreira opcionais."""
    # Moldura.
    c.rect(gx - fw, gy - fw, gw + 2 * fw, gh + 2 * fw, frame[1])
    c.rect(gx - fw, gy - fw, gw + 2 * fw, 1, frame[3])
    c.rect(gx - fw, gy - fw, 1, gh + 2 * fw, frame[3])
    c.rect(gx + gw + fw - 1, gy - fw + 1, 1, gh + 2 * fw - 1, frame[0])
    glass(c, gx, gy, gw, gh, lights, broken=broken, seed=seed)
    # Caixilhos.
    bars = []
    if mull in ('cross', 'vbar'):
        mx = gx + gw // 2 - 1
        bars.append((mx, gy, 2, gh))
    if mull in ('cross', 'hbar'):
        my = gy + gh // 2 - 1
        bars.append((gx, my, gw, 2))
    if mull == 'grid':
        for mx in range(gx + gw // 3 - 1, gx + gw - 2, gw // 3):
            bars.append((mx, gy, 1, gh))
        bars.append((gx, gy + gh // 2, gw, 1))
    for (bx, by, bw_, bh_) in bars:
        c.rect(bx, by, bw_, bh_, frame[2])
        if bw_ > 1 and bh_ > bw_:
            c.rect(bx, by, 1, bh_, frame[3])
        elif bh_ > 1:
            c.rect(bx, by, bw_, 1, frame[3])
        if lights is not None:
            for yy in range(by, by + bh_):
                for xx in range(bx, bx + bw_):
                    lights.p(xx, yy, None)
    if broken and mull == 'cross':
        # Caixilho partido: um pedaço da travessa caiu.
        c.rect(gx + 1, gy + gh // 2 - 1, gw // 2 - 2, 2, VOID[1])
    if shutters is not None:
        for sx0, side in ((gx - fw - sw, -1), (gx + gw + fw, 1)):
            for y in range(gy - fw, gy + gh + fw):
                for x in range(sx0, sx0 + sw):
                    lx = x - sx0
                    col = shutters[2] if lx % 2 == 0 else shutters[1]
                    if lx == 0:
                        col = shutters[3] if side < 0 else shutters[2]
                    if lx == sw - 1:
                        col = shutters[0]
                    if (y - gy) in (1, gh - 2):
                        col = shutters[0]
                    if broken and hsh(x, y // 3, seed + 9) < 0.25:
                        col = shutters[0]
                    c.p(x, y, col)
    if sill == 'wood':
        c.rect(gx - fw - 1, gy + gh + fw, gw + 2 * fw + 2, 2, frame[3])
        c.rect(gx - fw - 1, gy + gh + fw + 1, gw + 2 * fw + 2, 1, frame[1])
    elif sill == 'stone':
        c.rect(gx - fw - 2, gy + gh + fw, gw + 2 * fw + 4, 3, STONE[3])
        c.rect(gx - fw - 2, gy + gh + fw, gw + 2 * fw + 4, 1, STONE[4])
        c.rect(gx - fw - 2, gy + gh + fw + 2, gw + 2 * fw + 4, 1, STONE[1])
    if lintel == 'stone':
        c.rect(gx - fw - 2, gy - fw - 3, gw + 2 * fw + 4, 3, STONE[3])
        c.rect(gx - fw - 2, gy - fw - 3, gw + 2 * fw + 4, 1, STONE[4])
        c.rect(gx - fw - 2, gy - fw - 1, gw + 2 * fw + 4, 1, STONE[1])
    elif lintel == 'wood':
        beam(c, gx - fw - 2, gy - fw - 3, gw + 2 * fw + 4, 3, False)
    if box:
        flowerbox(c, gx - fw - 1, gy + gh + fw + 2, gw + 2 * fw + 2, seed=seed)


def boards(c: Canvas, x0: int, y0: int, w: int, h: int, seed: int = 0, pal=WOOD):
    """Tábuas pregadas de través tapando um vão (janela de casa abandonada)."""
    for i in range(2):
        ya = y0 + 2 + i * (h // 2) + int(hsh(i, 1, seed) * 3)
        tilt = (hsh(i, 2, seed) - 0.5) * 0.5
        for x in range(x0 - 2, x0 + w + 2):
            y = ya + round((x - x0) * tilt)
            c.p(x, y, pal[3])
            c.p(x, y + 1, pal[2])
            c.p(x, y + 2, pal[2] if hsh(x, i, seed) < 0.7 else pal[1])
            c.p(x, y + 3, pal[0])
        for nx in (x0, x0 + w - 1):
            c.p(nx, ya + round((nx - x0) * tilt) + 1, IRON[3])


def flowerbox(c: Canvas, x0: int, y0: int, w: int, seed: int = 0, dead=False):
    """Floreira de madeira com flores e folhas caindo pela frente."""
    c.rect(x0, y0, w, 5, WOOD[2])
    c.rect(x0, y0, w, 1, WOOD[4])
    c.rect(x0, y0 + 4, w, 1, WOOD[0])
    c.rect(x0, y0, 1, 5, WOOD[3])
    c.rect(x0 + w - 1, y0, 1, 5, WOOD[1])
    for i, x in enumerate(range(x0 + 1, x0 + w - 1, 3)):
        if dead:
            c.p(x, y0 - 1, (88, 74, 46))
            c.p(x + 1, y0 - 2, (110, 92, 56))
            continue
        c.p(x, y0 - 1, GREEN[2])
        c.p(x + 1, y0 - 1, GREEN[1])
        c.p(x + 1, y0 - 2, GREEN[3])
        fl = FLOWER[int(hsh(i, 0, seed) * 4)]
        c.p(x, y0 - 2, fl)
        c.p(x + 1, y0 - 3, mul(fl, 1.15))
        c.p(x, y0 - 3, mul(fl, 0.8))
    if not dead:
        for i in range(max(1, w // 6)):
            x = x0 + 2 + i * 6
            c.p(x, y0 + 5, GREEN[1])
            c.p(x, y0 + 6, GREEN[0])
            if i % 2 == 0:
                c.p(x + 1, y0 + 5, GREEN[2])


def arch_window(c: Canvas, lights: Canvas | None, gx: int, gy: int, gw: int, gh: int, *, frame=STONE,
                lead=True, broken=False, seed=0, sill=True):
    """Janela ogival de capela: moldura de pedra, vitral em losangos de chumbo."""
    cx = gx + (gw - 1) / 2
    ar = gw / 2  # altura do arco
    def inside(x, y, grow=0):
        if not (gx - grow <= x < gx + gw + grow and gy - grow <= y < gy + gh + grow):
            return False
        if y < gy + ar:
            # Ogiva: dois arcos que se cruzam no topo.
            dy = (gy + ar) - y
            half =(gw / 2 + grow) * math.sqrt(max(0.0, 1 - (dy / (ar + grow)) ** 2))
            return abs(x - cx) <= half
        return True
    for y in range(gy - 3, gy + gh + 3):
        for x in range(gx - 3, gx + gw + 3):
            if inside(x, y, 2) and not inside(x, y, 0):
                col = frame[3] if (x < cx and y < gy + gh) else frame[2]
                if y >= gy + gh:
                    col = frame[1]
                if inside(x, y, 1) and not inside(x, y, 0) and x > cx:
                    col = frame[1]
                c.p(x, y, col)
    for y in range(gy, gy + gh):
        for x in range(gx, gx + gw):
            if not inside(x, y):
                continue
            t = ((x - gx) / gw + (y - gy) / gh) / 2
            col = mix(GLASS[2], GLASS[0], t)
            leadline = lead and (((x - gx) + (y - gy)) % 4 == 0 or ((x - gx) - (y - gy)) % 4 == 0)
            if broken:
                col = VOID[1] if hsh(x, y, seed) > 0.3 else VOID[2]
            elif leadline:
                col = (40, 40, 48)
            elif (x - gx) - (y - gy) * 0.5 in (1, 2) and y - gy < gh * 0.5:
                col = GLASS[3]
            c.p(x, y, col)
            if lights is not None and not broken and not leadline:
                d = min(1.0, math.hypot((x - cx) / (gw * 0.7), (y - (gy + gh * 0.6)) / (gh * 0.6)))
                lc = mix(LIT[4], LIT[1], d)
                if (x + y) % 7 == 0:
                    lc = mix(lc, (236, 120, 90), 0.4)   # vidro colorido
                lights.p(x, y, lc)
    # Pinázio do meio.
    for y in range(gy + int(ar) - 1, gy + gh):
        c.p(round(cx), y, frame[2])
        if lights is not None:
            lights.p(round(cx), y, None)
    if sill:
        c.rect(gx - 3, gy + gh + 1, gw + 6, 2, frame[3])
        c.rect(gx - 3, gy + gh + 2, gw + 6, 1, frame[1])


# ── Portas ────────────────────────────────────────────────────────────────

def door(c: Canvas, x0: int, y0: int, w: int, h: int, *, pal=WOOD, frame=WOOD, double=False, arch=0,
         bands=True, ring=True, step=True, studs=True, pw: int = 4, seed: int = 0):
    """Porta de tábuas em pé com batente, ferragens, argola e soleira (arch = raio do arco)."""
    def in_door(x, y):
        if arch and y < y0 + arch:
            cx = x0 + (w - 1) / 2
            return math.hypot((x - cx) / (w / 2), (y - (y0 + arch)) / arch) <= 1.0
        return True
    # Batente: friso escuro por fora, quina clara à esquerda e em cima.
    for y in range(y0 - 3, y0 + h):
        for x in range(x0 - 3, x0 + w + 3):
            if in_door(x, y) and x0 <= x < x0 + w and y >= y0:
                continue
            if arch:
                d = math.hypot((x - (x0 + (w - 1) / 2)) / (w / 2 + 3), (y - (y0 + arch)) / (arch + 3))
                if y < y0 + arch and d > 1.0:
                    continue
                outer = y < y0 + arch and d > 0.9
            else:
                outer = False
            col = frame[3] if x < x0 else (frame[1] if x >= x0 + w else frame[2])
            if y <= y0 - 2 or (arch and y < y0 + arch and x < x0 + w / 2):
                col = frame[3]
            if x in (x0 - 3, x0 + w + 2) or y == y0 - 3 or outer:
                col = frame[0]
            c.p(x, y, col)
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if not in_door(x, y):
                continue
            lx = x - x0
            k = lx % pw
            col = pal[2] if k not in (0, pw - 1) else (pal[3] if k == 0 else pal[0])
            if hsh(lx // pw, (y + lx) // 4, seed + 41) < 0.22 and 0 < k < pw - 1:
                col = pal[1]
            if double and lx in (w // 2 - 1, w // 2):
                col = pal[0] if lx == w // 2 - 1 else pal[1]
            c.p(x, y, col)
            if y == y0 or (lx == 0):
                c.shade(x, y, 0.7)                     # sombra do batente
    if bands:
        for by in (y0 + max(arch, 4) + 2, y0 + h - 8):
            for x in range(x0, x0 + w):
                if in_door(x, by):
                    c.p(x, by, IRON[3])
                    c.p(x, by + 1, IRON[1])
            if studs:
                for x in range(x0 + 2, x0 + w - 1, 4):
                    c.p(x, by, GOLD[1] if hsh(x, by, 3) < 0.5 else IRON[4])
    if ring:
        hy = y0 + h // 2 + 1
        hxs = (x0 + w // 2 - 3, x0 + w // 2 + 2) if double else (x0 + w - 4,)
        for hx in hxs:
            c.p(hx, hy, GOLD[3])
            c.p(hx, hy + 1, GOLD[1])
            c.p(hx - 1, hy + 1, GOLD[2])
    if step:
        c.rect(x0 - 3, y0 + h, w + 6, 2, STONE[3])
        c.rect(x0 - 3, y0 + h, w + 6, 1, STONE[4])


def broken_door(c: Canvas, x0: int, y0: int, w: int, h: int, *, frame=WOOD, seed=0, arch=0):
    """Vão de porta arrombada: escuro lá dentro, tábua caída na diagonal e lascas."""
    for y in range(y0 - 2, y0 + h):
        for x in range(x0 - 2, x0 + w + 2):
            if x0 <= x < x0 + w and y >= y0:
                continue
            c.p(x, y, frame[3] if x < x0 else (frame[1] if x >= x0 + w else frame[2]))
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            col = VOID[0] if (x - x0) < w * 0.6 else VOID[1]
            if y > y0 + h - 4:
                col = VOID[2]
            c.p(x, y, col)
    # Folha arrancada encostada na diagonal.
    for i in range(h - 4):
        t = i / max(1, h - 5)
        x = round(lerp(x0 + 2, x0 + w - 4, t))
        y = y0 + 3 + i
        for d in range(3):
            c.p(x + d, y, WOOD[3] if d == 0 else (WOOD[2] if d == 1 else WOOD[0]))
    # Pedaço da folha ainda preso na dobradiça.
    for y in range(y0 + 1, y0 + h // 2 + int(hsh(1, 1, seed) * 5)):
        c.p(x0 + w - 2, y, WOOD[2])
        c.p(x0 + w - 1, y, WOOD[1])
    c.rect(x0 + w - 3, y0 + 4, 3, 1, IRON[2])
    c.rect(x0 - 3, y0 + h, w + 6, 2, STONE[2])
    c.rect(x0 - 3, y0 + h, w + 6, 1, STONE[3])


# ── Chaminé, placas, estandartes e miudezas ────────────────────────────────

def chimney(c: Canvas, x0: int, top: int, w: int, bottom: int, pal=STONE, seed=3, soot=True, broken=False):
    """Chaminé de tijolo com capa e boca escura; lado direito na sombra."""
    lib32.bricks(c, x0, top + 5, w, bottom - top - 5, pal, bw=6, bh=4, seed=seed)
    for y in range(top + 5, bottom):
        for x in range(x0 + w - 3, x0 + w):
            c.shade(x, y, 0.76)
        c.p(x0, y, mix(pal[3], pal[4], 0.5) if (y // 4) % 2 == 0 else c.g(x0, y))
    if broken:
        for x in range(x0, x0 + w):
            cut = int(hsh(x // 3, 0, seed) * 4)
            for y in range(top + 5, top + 5 + cut):
                c.p(x, y, None)
        return
    c.rect(x0 - 2, top, w + 4, 5, pal[2])
    c.rect(x0 - 2, top, w + 4, 1, pal[4])
    c.rect(x0 - 2, top + 1, 1, 3, pal[3])
    c.rect(x0 - 2, top + 4, w + 4, 1, pal[0])
    c.rect(x0 + w - 1, top + 1, 3, 3, pal[1])
    c.rect(x0 + 2, top + 1, w - 4, 2, VOID[0])
    if soot:
        for x in range(x0 + 1, x0 + w - 1):
            if hsh(x, 1, seed) < 0.6:
                c.p(x, top + 5, SOOT[1])


def sign(c: Canvas, x: int, y: int, w: int = 16, h: int = 14, icon: str = 'mug', bracket: int = 18, seed=0,
         tilt: float = 0.0):
    """Placa pendurada num braço de ferro, com o desenho pintado (tilt: caída de um lado)."""
    dst = c
    dst.rect(x, y, bracket, 2, IRON[2])
    dst.rect(x, y, bracket, 1, IRON[3])
    dst.p(x + 1, y + 2, IRON[2])
    dst.p(x + 2, y + 3, IRON[1])
    bx, by = x + bracket - w - 1, y + 4
    for i, cx_ in enumerate((bx + 2, bx + w - 3)):
        drop = round((cx_ - bx) * tilt)
        for yy in range(y + 2, y + 4 + drop):
            dst.p(cx_, yy, IRON[1])
    c = Canvas(dst.w, dst.h)
    c.rect(bx, by, w, h, WOOD[2])
    c.rect(bx, by, w, 1, WOOD[4])
    c.rect(bx, by + h - 1, w, 1, WOOD[0])
    c.rect(bx, by, 1, h, WOOD[3])
    c.rect(bx + w - 1, by, 1, h, WOOD[1])
    for xx in range(bx + 2, bx + w - 2):
        if hsh(xx, 0, seed) < 0.3:
            c.p(xx, by + h - 3, WOOD[1])
    ix, iy = bx + w // 2, by + h // 2
    if icon == 'mug':
        c.rect(ix - 4, iy - 3, 6, 7, GOLD[2])
        c.rect(ix - 4, iy - 3, 2, 7, GOLD[3])
        c.rect(ix, iy - 3, 2, 7, GOLD[1])
        c.rect(ix - 4, iy - 4, 6, 2, (240, 236, 220))
        c.rect(ix + 2, iy - 1, 2, 1, GOLD[1])
        c.rect(ix + 3, iy - 1, 1, 4, GOLD[1])
        c.rect(ix + 2, iy + 2, 2, 1, GOLD[1])
    elif icon == 'key':
        c.rect(ix - 5, iy - 2, 4, 4, GOLD[2])
        c.p(ix - 4, iy - 1, WOOD[1])
        c.p(ix - 3, iy - 1, WOOD[1])
        c.p(ix - 4, iy, WOOD[1])
        c.p(ix - 3, iy, WOOD[1])
        c.p(ix - 5, iy - 2, GOLD[3])
        c.rect(ix - 1, iy - 1, 7, 2, GOLD[2])
        c.rect(ix - 1, iy - 1, 7, 1, GOLD[3])
        c.rect(ix + 3, iy + 1, 1, 2, GOLD[1])
        c.rect(ix + 5, iy + 1, 1, 2, GOLD[1])
    elif icon == 'bed':
        c.rect(ix - 5, iy, 10, 3, GOLD[2])
        c.rect(ix - 5, iy, 10, 1, GOLD[3])
        c.rect(ix - 5, iy - 3, 2, 6, GOLD[1])
        c.rect(ix - 3, iy - 2, 3, 2, (240, 236, 220))
    elif icon == 'swords':
        for i in range(8):
            c.p(ix - 4 + i, iy - 4 + i, STEEL[3])
            c.p(ix + 3 - i, iy - 4 + i, STEEL[2])
        c.rect(ix - 4, iy + 2, 2, 2, GOLD[2])
        c.rect(ix + 2, iy + 2, 2, 2, GOLD[1])
    elif icon == 'anvil':
        c.rect(ix - 5, iy - 2, 10, 2, IRON[3])
        c.rect(ix - 5, iy - 2, 10, 1, IRON[4])
        c.rect(ix - 7, iy - 2, 2, 1, IRON[3])
        c.rect(ix - 2, iy, 4, 2, IRON[2])
        c.rect(ix - 4, iy + 2, 8, 2, IRON[2])
    elif icon == 'shield':
        for yy in range(7):
            half = 4 if yy < 4 else 4 - (yy - 3)
            for xx in range(-half, half):
                c.p(ix + xx, iy - 3 + yy, CLOTH_BLUE[2] if xx < 0 else CLOTH_BLUE[1])
        c.p(ix - 1, iy - 1, GOLD[3])
        c.p(ix, iy - 1, GOLD[2])
        c.p(ix - 1, iy, GOLD[2])
    for yy in range(c.h):
        for xx in range(c.w):
            if c.px[yy][xx] is not None:
                dst.p(xx, yy + round((xx - bx) * tilt), c.px[yy][xx])


def lantern(c: Canvas, lights: Canvas | None, x: int, y: int):
    """Lampião de parede com braço, vidro aceso e luz no overlay."""
    c.rect(x - 3, y - 4, 5, 1, IRON[2])
    c.rect(x + 1, y - 4, 1, 3, IRON[1])
    c.rect(x - 1, y - 1, 5, 1, IRON[3])
    c.rect(x - 1, y, 5, 6, IRON[1])
    c.rect(x, y + 1, 3, 4, (255, 200, 110))
    c.p(x, y + 1, (255, 240, 200))
    c.rect(x - 1, y + 6, 5, 1, IRON[2])
    c.p(x + 1, y + 7, IRON[1])
    if lights is not None:
        for yy in range(y + 1, y + 5):
            for xx in range(x, x + 3):
                lights.p(xx, yy, LIT[3] if (xx, yy) != (x, y + 1) else LIT[4])


def banner(c: Canvas, x: int, y: int, w: int, h: int, pal=BANNER_RED, emblem: str = 'star', rod=WOOD, torn=False, seed=0):
    """Estandarte pendurado numa vara, com dobras, ponta em V e emblema dourado."""
    c.rect(x - 1, y - 2, w + 2, 2, rod[2])
    c.rect(x - 1, y - 2, w + 2, 1, rod[4] if len(rod) > 4 else rod[3])
    c.p(x - 2, y - 2, GOLD[2])
    c.p(x + w, y - 2, GOLD[2])
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx = xx - x
            col = pal[2]
            if lx == 0:
                col = pal[3]
            elif lx >= w - 2:
                col = pal[1]
            elif lx % 3 == 2:
                col = mix(pal[2], pal[1], 0.6)          # dobra
            if yy > y + h - (w // 2 + 1) and abs(xx - (x + (w - 1) / 2)) < (yy - (y + h - (w // 2 + 1))) * 1.0:
                continue                                  # ponta em V
            if torn and hsh(xx, yy // 2, seed) < 0.12 and yy > y + h // 2:
                continue
            c.p(xx, yy, col)
    cx, cy = x + (w - 1) // 2, y + h // 2 - 2
    if emblem == 'star':
        for (dx, dy) in ((0, -2), (-2, 0), (2, 0), (0, 2), (0, -1), (-1, 0), (1, 0), (0, 1)):
            c.p(cx + dx, cy + dy, GOLD[2])
        c.p(cx, cy, GOLD[3])
    elif emblem == 'cross':
        for dy in range(-3, 4):
            c.p(cx, cy + dy, GOLD[2])
        for dx in range(-2, 3):
            c.p(cx + dx, cy - 1, GOLD[2])
        c.p(cx, cy - 1, GOLD[3])
    elif emblem == 'diamond':
        for (dx, dy) in ((0, -2), (-1, -1), (1, -1), (-2, 0), (2, 0), (-1, 1), (1, 1), (0, 2)):
            c.p(cx + dx, cy + dy, GOLD[2])
        c.p(cx, cy, GOLD[3])
    c.rect(x, y, w, 1, mul(pal[1], 0.8))                 # sombra da vara


def barrel(c: Canvas, x: int, bottom: int, w: int = 12, h: int = 16, pal=WOOD, seed=0, broken=False):
    """Barril com aduelas, aros de ferro e tampa clara."""
    for y in range(bottom - h, bottom):
        t = (y - (bottom - h)) / h
        bulge = round(math.sin(t * math.pi) * 1.2)
        for xx in range(x - bulge, x + w + bulge):
            lx = (xx - x + bulge) / (w + 2 * bulge)
            col = pal[3] if lx < 0.3 else (pal[2] if lx < 0.72 else pal[1])
            if (xx - x) % 4 == 0 and 0.1 < lx < 0.9:
                col = pal[1] if lx > 0.3 else pal[2]
            c.p(xx, y, col)
    for hy in (bottom - h + 2, bottom - 4):
        for xx in range(x - 1, x + w + 1):
            c.p(xx, hy, IRON[3] if xx < x + w // 3 else (IRON[2] if xx < x + 2 * w // 3 else IRON[1]))
    c.rect(x + 1, bottom - h, w - 2, 1, pal[4] if len(pal) > 4 else pal[3])
    c.rect(x + 2, bottom - h + 1, w - 4, 1, pal[1])
    if broken:
        for xx in range(x + w // 2, x + w + 2):
            for y in range(bottom - h, bottom - h + 3 + int(hsh(xx, 0, seed) * 4)):
                c.p(xx, y, None)


def crate(c: Canvas, x: int, bottom: int, w: int = 12, h: int = 12, pal=WOOD):
    """Caixote de tábuas com travessa em X."""
    y0 = bottom - h
    for y in range(y0, bottom):
        for xx in range(x, x + w):
            col = pal[2] if ((y - y0) // 3) % 2 == 0 else mix(pal[2], pal[1], 0.4)
            if (y - y0) % 3 == 2:
                col = pal[1]
            c.p(xx, y, col)
    c.rect(x, y0, w, 1, pal[3])
    c.rect(x, y0, 1, h, pal[3])
    c.rect(x + w - 1, y0, 1, h, pal[0])
    c.rect(x, bottom - 1, w, 1, pal[0])
    for i in range(1, w - 1):
        yy = y0 + 1 + round(i * (h - 3) / (w - 2))
        c.p(x + i, yy, pal[3])
        c.p(x + i, yy + 1, pal[1])


def _chunk(c: Canvas, x: int, y: int, w: int, h: int, pal, tone: float, chip: bool):
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            ly, lx = yy - y, xx - x
            if chip and ly == 0 and lx == w - 1:
                continue
            col = pal[2]
            if ly == 0:
                col = pal[4] if len(pal) > 4 else pal[3]
            elif lx == 0:
                col = pal[3]
            elif lx == w - 1 or ly == h - 1:
                col = pal[1]
            if ly == h - 1 and lx == w - 1:
                col = pal[0]
            c.p(xx, yy, mul(col, tone))


def rubble(c: Canvas, cx: int, base: int, w: int, h: int, pal=STONE, seed=0, extra=None):
    """Monte de entulho: blocos de pedra empilhados, cacos de telha e lascas de madeira."""
    rows = max(2, h // 4)
    k = 0
    for r in range(rows):
        width = w * (1 - r / (rows + 0.6))
        yb = base - r * 4
        x = cx - width / 2 + (hsh(r, 0, seed) - 0.5) * 3
        while x < cx + width / 2 - 2:
            k += 1
            sw = 4 + int(hsh(k, 1, seed) * 4)
            sh = 3 + int(hsh(k, 2, seed) * 2)
            yo = int(hsh(k, 3, seed) * 2)
            _chunk(c, int(x), yb - sh - yo, sw, sh, pal, 0.84 + 0.26 * hsh(k, 4, seed), hsh(k, 5, seed) < 0.5)
            x += sw - (1 if hsh(k, 6, seed) < 0.5 else 0)
    if extra:
        for i in range(max(1, w // 10)):
            ex = int(cx - w / 3 + hsh(i, 5, seed + 1) * w * 0.66)
            ey = base - 3 - int(hsh(i, 6, seed + 1) * h * 0.55)
            c.rect(ex, ey, 3, 1, extra[3])
            c.rect(ex, ey + 1, 3, 1, extra[1])
            c.p(ex + 3, ey + 1, extra[0])
    for i in range(max(1, w // 14)):
        sx = int(cx - w / 3 + hsh(i, 7, seed + 2) * w * 0.66)
        sy = base - 2 - int(hsh(i, 8, seed + 2) * h * 0.4)
        c.p(sx, sy, WOOD[3])
        c.p(sx + 1, sy - 1, WOOD[2])
        c.p(sx + 2, sy - 1, WOOD[1])


def weeds(c: Canvas, x0: int, x1: int, base: int, seed=0, density=0.5, tall=6):
    """Mato crescendo junto da parede (folhas finas, de baixo para cima)."""
    for x in range(x0, x1):
        if hsh(x, 0, seed) > density:
            continue
        hh = 2 + int(hsh(x, 1, seed) * tall)
        lean = 1 if hsh(x, 2, seed) < 0.3 else (-1 if hsh(x, 2, seed) > 0.7 else 0)
        for i in range(hh):
            xx = x + (lean if i > hh * 0.6 else 0)
            col = GRASS[3] if i == hh - 1 else (GRASS[2] if i > hh // 3 else GRASS[1])
            c.p(xx, base - 1 - i, col)


def broken_beam(c: Canvas, xa: int, ya: int, xb: int, yb: int, pal=WOOD, burnt=False):
    """Viga quebrada/caída (3 px), ponta lascada; queimada fica na rampa de fuligem."""
    p = SOOT + [SOOT[2]] if burnt else pal
    n = max(abs(xb - xa), abs(yb - ya))
    for i in range(n + 1):
        t = i / max(1, n)
        x, y = round(lerp(xa, xb, t)), round(lerp(ya, yb, t))
        c.p(x, y - 1, p[3] if len(p) > 3 else p[2])
        c.p(x, y, p[2])
        c.p(x, y + 1, p[1])
    c.p(xb + (1 if xb >= xa else -1), yb - 1, p[2])
    c.p(xb, yb - 2, p[3] if len(p) > 3 else p[2])


def scorch(c: Canvas, x0: int, y0: int, w: int, h: int, seed=0, k=0.55):
    """Marca de fogo/fuligem subindo pela parede (escurece o que já está lá)."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            fy = (y - y0) / max(1, h)
            fx = abs((x - x0) / max(1, w) - 0.5) * 2
            v = noise(x, y, seed + 51, 4) * 0.6 + (1 - fx) * 0.5 + fy * 0.3
            if v > 0.82:
                c.shade(x, y, k)
            elif v > 0.7:
                c.shade(x, y, (1 + k) / 2)


# ── Conferência ───────────────────────────────────────────────────────────

def blank(file: str) -> Image.Image:
    """Overlay vazio no dobro do tamanho (ruínas e campo não acendem nada)."""
    w, h = Image.open(lib32.path16(file)).size
    return Image.new('RGBA', (w * 2, h * 2), (0, 0, 0, 0))


def night(img: Image.Image, lit: Image.Image) -> Image.Image:
    dark = Image.new('RGBA', img.size, (20, 26, 40, 150))
    out = Image.alpha_composite(img.copy(), Image.composite(dark, Image.new('RGBA', img.size, (0, 0, 0, 0)), img.split()[3]))
    out.alpha_composite(lit)
    return out


def check(file: str, img: Image.Image, lit: Image.Image, lights_file: str | None) -> str:
    """Confere silhueta (IoU com a 16-bit ampliada) e luzes dentro das manchas da 16-bit."""
    a = Image.open(lib32.path16(file)).convert('RGBA').resize(img.size, Image.NEAREST)
    pa, pb = a.load(), img.load()
    both = o16 = o32 = 0
    for y in range(img.height):
        for x in range(img.width):
            A, B = pa[x, y][3] > 0, pb[x, y][3] > 0
            both += A and B
            o16 += A and not B
            o32 += B and not A
    iou = both / max(1, both + o16 + o32)
    msg = f'IoU {iou:.3f} (só16 {o16}, só32 {o32})'
    if lights_file and os.path.exists(lib32.path16(lights_file)):
        l16 = Image.open(lib32.path16(lights_file)).convert('RGBA').resize(img.size, Image.NEAREST)
        q16, q32 = l16.load(), lit.load()
        out = sum(1 for y in range(img.height) for x in range(img.width) if q32[x, y][3] and not q16[x, y][3])
        n32 = sum(1 for y in range(img.height) for x in range(img.width) if q32[x, y][3])
        n16 = sum(1 for y in range(img.height) for x in range(img.width) if q16[x, y][3])
        msg += f' · luz32 {n32} px ({out} fora da 16) · luz16 {n16} px'
    return msg


def preview_row(file: str, img: Image.Image, lit: Image.Image) -> Image.Image:
    """16-bit ampliada | 32-bit | 32-bit à noite com o overlay aceso."""
    a = Image.open(lib32.path16(file)).convert('RGBA').resize(img.size, Image.NEAREST)
    return lib32.sheet([a, img, night(img, lit)])
