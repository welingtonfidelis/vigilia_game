"""Peças novas, em 16-bit e 32-bit, que tiram o 0x72 do jogo (desenho próprio, do zero):

  · fx-coin    moeda de ouro girando: 4 quadros (de frente, virando, de lado, voltando);
               16-bit 8×8 por quadro, 32-bit 16×16;
  · prop-chest baú do corredor: 3 quadros (fechado, abrindo, aberto com ouro);
               16-bit 16×16 por quadro, 32-bit 32×32, pé no meio de baixo;
  · fx-arrow   flecha em voo apontando para a direita; 16-bit 8×3, 32-bit 16×6.

O 16-bit é desenhado à mão (uma letra por pixel); o 32-bit repete a composição com o dobro
de pixels, mais tons, cravos, veio e brilho."""
from __future__ import annotations

import math

from PIL import Image

from interface32_base import (
    GOLD, IRON, OL, RED, STEEL, WOOD6, Canvas, ellipse, grid, hsh, noise, outline, rect,
)
import lib32

# ── Paleta curta do 16-bit (rampas do pack 16-bit) ───────────────────────

P16 = {
    'o': OL,
    'a': (112, 72, 30), 'b': (176, 124, 46), 'c': (233, 185, 73), 'd': (255, 226, 122), 'w': (255, 248, 214),
    '0': (34, 23, 17), '1': (56, 38, 27), '2': (86, 59, 40), '3': (118, 83, 54), '4': (150, 110, 72),
    'i': (42, 42, 50), 'j': (66, 68, 78), 'k': (104, 108, 120),
    'R': (204, 76, 70), 'r': (164, 48, 50), 'q': (118, 30, 38),
    's': (80, 88, 102), 't': (158, 168, 180), 'u': (220, 226, 232),
    'v': (196, 60, 60), 'g': (62, 92, 150),
}


def clamp(i: int, n: int) -> int:
    return max(0, min(n - 1, i))


# ── Moeda ────────────────────────────────────────────────────────────────

COIN16 = [
    ["..oooo..",
     ".owdcco.",
     "odccccbo",
     "odcdbcbo",
     "odcdbcbo",
     "occcccao",
     ".obbbao.",
     "..oooo.."],
    ["...oo...",
     "..odbo..",
     ".odccbo.",
     ".oddcao.",
     ".oddcbo.",
     ".occcao.",
     "..obao..",
     "...oo..."],
    ["...oo...",
     "..odbo..",
     "..ocao..",
     "..odbo..",
     "..ocao..",
     "..odbo..",
     "..obao..",
     "...oo..."],
    ["...oo...",
     "..obco..",
     ".obdcbo.",
     ".oaddbo.",
     ".obddbo.",
     ".oaccbo.",
     "..oabo..",
     "...oo..."],
]


def coin16() -> Image.Image:
    return lib32.sheet([grid(f, P16).image() for f in COIN16])


def erode(P: set) -> set:
    return {(x, y) for (x, y) in P if all(q in P for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))}


def coin_frame32(face_cx: float | None, rx: float, shift: float) -> Canvas:
    """Um quadro da moeda: face elíptica (centro, meia-largura) e a borda serrilhada ao lado.

    O aro sai de anéis de 1 px (erosão da forma), cada um com a luz de cima/esquerda:
    face de fora, topo do aro, sulco (luz ao contrário) e o campo com a estrela cunhada."""
    c = Canvas(16, 16)
    cy, ry = 8.0, 7.0
    if face_cx is None:
        # De lado: só a borda serrilhada, um bastão arredondado.
        for (x, y) in ellipse(8.0, cy, 3.0, ry):
            u = x + 0.5 - 8.0
            i = 3 if y % 2 else 2
            if u < -1.5:
                i += 1
            elif u > 1.5:
                i -= 1
            if y >= 11:
                i -= 1
            c.p(x, y, GOLD[clamp(i, 6)])
        outline(c)
        return c
    face = ellipse(face_cx, cy, rx, ry)
    band = set()
    if shift:
        for k in range(1, 9):
            band |= ellipse(face_cx + shift * k / 8, cy, rx, ry)
        band -= face
    for (x, y) in band:
        i = 2 if y % 2 else 1
        if y < 5:
            i += 1
        c.p(x, y, GOLD[clamp(i, 6)])
    layers = []
    cur = set(face)
    for _ in range(3 if not shift else 1):
        inner = erode(cur)
        layers.append(cur - inner)
        cur = inner
    field = cur
    tables = ([(0.5, 4), (-0.1, 3), (-0.6, 2), (-9, 1)],
              [(0.5, 5), (-0.1, 4), (-0.6, 3), (-9, 2)],
              [(0.3, 1), (-0.3, 2), (-9, 4)])
    if shift:
        tables = (tables[1],)
    for ring, table in zip(layers, tables):
        for (x, y) in ring:
            dx, dy = (x + 0.5 - face_cx) * 7.0 / rx, y + 0.5 - cy
            lit = -(dx * 0.6 + dy * 0.8) / (math.hypot(dx, dy) or 1)
            c.p(x, y, GOLD[next(i for t, i in table if lit > t)])
    for (x, y) in field:
        c.p(x, y, GOLD[3])
    # Estrela de quatro pontas cunhada no meio (em relevo).
    sx = max(1.0, 3.0 * rx / 7.0)
    star = {(x, y) for (x, y) in field
            if abs(x + 0.5 - face_cx) / sx + abs(y + 0.5 - cy) / 3.0 <= 1.0}
    for (x, y) in star:
        lit_edge = (x - 1, y) not in star or (x, y - 1) not in star
        dark_edge = (x + 1, y) not in star or (x, y + 1) not in star
        c.p(x, y, GOLD[5] if lit_edge and not dark_edge else GOLD[2] if dark_edge and not lit_edge else GOLD[4])
    for (x, y) in star:
        for q in ((x + 1, y), (x, y + 1)):
            if q not in star and q in field:
                c.p(q[0], q[1], GOLD[2])
    outline(c)
    return c


def coin32() -> Image.Image:
    frames = [
        coin_frame32(8.0, 7.0, 0.0),
        coin_frame32(7.2, 4.6, 1.6),
        coin_frame32(None, 0, 0),
        coin_frame32(8.8, 4.6, -1.6),
    ]
    # Brilho no aro do quadro de frente.
    f0 = frames[0]
    f0.p(4, 3, GOLD[5])
    f0.p(3, 4, GOLD[5])
    f0.p(4, 4, (255, 255, 250))
    return lib32.sheet([f.image() for f in frames])


# ── Baú ──────────────────────────────────────────────────────────────────

CHEST16 = [
    ["................",
     "................",
     "................",
     "...oooooooooo...",
     "..o4k444444k4o..",
     ".o33j343343j32o.",
     ".o32j323323j21o.",
     ".o22j2ccdd2j21o.",
     ".o11i1bdcb1i10o.",
     ".o44k4bacb4k43o.",
     ".o33j33bb33j32o.",
     ".o11i111111i10o.",
     ".o33j343343j32o.",
     ".o22j222222j21o.",
     ".oi0i000000i0io.",
     "..oooooooooooo.."],
    ["................",
     "...oooooooooo...",
     "..o4k444444k4o..",
     ".o33j343343j32o.",
     ".o22j222222j21o.",
     ".o11i1ccdd1i10o.",
     ".o000c0000d000o.",
     ".o1bcdcbcdcbc1o.",
     ".o11i111111i10o.",
     ".o44k4bacb4k43o.",
     ".o33j33bb33j32o.",
     ".o11i111111i10o.",
     ".o33j343343j32o.",
     ".o22j222222j21o.",
     ".oi0i000000i0io.",
     "..oooooooooooo.."],
    ["...oooooooooo...",
     "..o2j222222j2o..",
     "..o1i111111i1o..",
     "..o0i000000i0o..",
     "..o1i111111i1o..",
     ".oo0i0cdc00i0oo.",
     ".o1bcdwdcbvcb1o.",
     ".ocdcbcdgcbcdco.",
     ".o44k4cddc4k43o.",
     ".o33j3bacb3j32o.",
     ".o33j33bb33j32o.",
     ".o11i111111i10o.",
     ".o33j343343j32o.",
     ".o22j222222j21o.",
     ".oi0i000000i0io.",
     "..oooooooooooo.."],
]


def chest16() -> Image.Image:
    return lib32.sheet([grid(f, P16).image() for f in CHEST16])


def chest_body32(c: Canvas, top: int) -> None:
    """Frente do baú: tábuas deitadas com veio, cantoneiras e cintas de ferro com cravos."""
    x0, x1, bot = 3, 28, 30
    for y in range(top, bot + 1):
        ly = y - top
        for x in range(x0, x1 + 1):
            k = ly % 5
            i = 3
            if k == 0:
                i = 4
            elif k == 4:
                i = 1
            elif noise(x / 3.0, y, 7, 1.4) < 0.28:
                i = 2
            if x == x0:
                i = min(5, i + 1)
            if x == x1:
                i = max(0, i - 2)
            c.p(x, y, WOOD6[clamp(i, 6)])
    for x in range(x0, x1 + 1):
        c.p(x, bot, WOOD6[0])
    iron_bands(c, top, bot)
    # Cantoneiras de ferro nos cantos de baixo.
    for (x, y) in ((x0, bot - 1), (x0 + 1, bot - 1), (x0, bot - 2), (x1, bot - 1), (x1 - 1, bot - 1), (x1, bot - 2)):
        c.p(x, y, IRON[3] if x < 16 else IRON[2])


def iron_bands(c: Canvas, y0: int, y1: int) -> None:
    for bx in (7, 23):
        for y in range(y0, y1 + 1):
            c.p(bx, y, IRON[4] if bx < 16 else IRON[3])
            c.p(bx + 1, y, IRON[2] if bx < 16 else IRON[1])
        for y in range(y0 + 1, y1, 4):
            c.p(bx, y, STEEL[6] if bx < 16 else STEEL[5])
            c.p(bx + 1, y, IRON[0])


def lid_closed32(c: Canvas, top: int) -> None:
    """Tampa abaulada: tábuas seguindo a curva, lábio escuro embaixo."""
    for y in range(top, top + 9):
        ly = y - top
        inset = 2 if ly == 0 else 1 if ly == 1 else 0
        for x in range(3 + inset, 29 - inset):
            if ly < 3:
                i = 5 if ly == 0 else 4
            elif ly == 4:
                i = 2                                     # junta entre as tábuas da tampa
            elif ly >= 7:
                i = 1 if ly == 7 else 0                   # lábio
            else:
                i = 3 if noise(x / 3.0, y, 9, 1.4) > 0.25 else 2
            if x == 3 + inset and ly < 7:
                i = min(5, i + 1)
            if x == 28 - inset:
                i = max(0, i - 2)
            c.p(x, y, WOOD6[clamp(i, 6)])
    iron_bands(c, top, top + 8)
    for bx in (7, 23):
        c.p(bx, top, IRON[4] if bx < 16 else IRON[3])


def lock32(c: Canvas, x: int, y: int) -> None:
    """Fechadura de ouro com buraco da chave."""
    for (px, py) in rect(x, y, 6, 6):
        i = 3
        if px == x or py == y:
            i = 4
        if px == x + 5 or py == y + 5:
            i = 1
        c.p(px, py, GOLD[i])
    c.p(x, y, GOLD[5])
    for (px, py) in ((x + 2, y + 2), (x + 3, y + 2), (x + 2, y + 3), (x + 2, y + 4)):
        c.p(px, py, GOLD[0] if py < y + 4 else (60, 36, 18))
    c.p(x + 3, y + 3, GOLD[2])


def coin_pile32(c: Canvas, y_rim: int, y_top: int, seed: int = 3) -> None:
    """Monte de moedas: cúpula de ouro com moedas uma a uma, uma gema e brilhos."""
    cx = 16.0
    pile = set()
    for y in range(y_top, y_rim + 1):
        f = (y - y_top) / max(1, y_rim - y_top)
        hw = 3 + 9.5 * math.sqrt(f)
        for x in range(int(cx - hw), int(cx + hw) + 1):
            if 4 <= x <= 27:
                pile.add((x, y))
    for (x, y) in pile:
        u = (x + 0.5 - cx) / 12
        i = 3 if u < 0.15 else 2
        if y > y_rim - 2:
            i -= 1
        c.p(x, y, GOLD[clamp(i, 6)])
    # Moedas soltas: disquinho claro com sombra embaixo/direita.
    for k in range(18):
        x = int(5 + hsh(k, 1, seed) * 22)
        y = int(y_top + 1 + hsh(k, 2, seed) * (y_rim - y_top))
        if (x, y) in pile and (x + 1, y + 1) in pile:
            c.p(x, y, GOLD[4])
            c.p(x + 1, y, GOLD[3])
            c.p(x, y + 1, GOLD[2])
            c.p(x + 1, y + 1, GOLD[1])
    # Uma gema vermelha e uma azul no monte.
    for (gx, gy, pal) in ((11, y_top + 3, RED), (20, y_top + 4, ((26, 38, 70), (52, 82, 132), (96, 140, 214)))):
        c.p(gx, gy, pal[4] if pal is RED else pal[2])
        c.p(gx + 1, gy, pal[2] if pal is RED else pal[1])
        c.p(gx, gy + 1, pal[2] if pal is RED else pal[1])
        c.p(gx + 1, gy + 1, pal[1] if pal is RED else pal[0])
    for (sx, sy) in ((14, y_top + 1), (24, y_top + 5)):
        c.p(sx, sy, (255, 255, 240))


def chest32(state: int) -> Canvas:
    c = Canvas(32, 32)
    if state == 0:
        lid_closed32(c, 8)
        chest_body32(c, 17)
        for x in range(3, 29):
            c.p(x, 16, WOOD6[0])
        lock32(c, 13, 13)
    elif state == 1:
        # Tampa erguida: aparece mais acima, e a fresta solta o brilho do ouro.
        lid_closed32(c, 3)
        for y in (12, 13, 14, 15, 16):
            for x in range(3, 29):
                c.p(x, y, (40, 26, 16) if y < 14 else WOOD6[0])
        for x in range(4, 28):
            if hsh(x, 5, 2) < 0.55:
                c.p(x, 14, GOLD[2] if hsh(x, 6, 2) < 0.5 else GOLD[3])
            if hsh(x, 7, 2) < 0.35:
                c.p(x, 13, GOLD[1])
        for x in (8, 15, 21):
            c.p(x, 12, GOLD[4])
        c.p(16, 12, (255, 255, 240))
        chest_body32(c, 17)
        for x in range(3, 29):
            c.p(x, 16, WOOD6[1])
        lock32(c, 13, 17)
        # Lingueta da fechadura subiu com a tampa.
        for (px, py) in rect(14, 9, 4, 3):
            c.p(px, py, GOLD[4] if px == 14 or py == 9 else GOLD[1] if px == 17 or py == 11 else GOLD[3])
    else:
        # Tampa aberta para trás: o lado de dentro (escuro) em pé atrás do corpo.
        for y in range(1, 11):
            inset = 2 if y == 1 else 1 if y == 2 else 0
            for x in range(4 + inset, 28 - inset):
                k = (x - 4) % 5
                i = 1 if k else 0
                if y == 10:
                    i = 0
                if x == 4 + inset:
                    i = 2
                c.p(x, y, WOOD6[i])
        for bx in (7, 23):
            for y in range(1, 11):
                c.p(bx, y, IRON[2])
                c.p(bx + 1, y, IRON[1])
            c.p(bx, 3, IRON[3])
            c.p(bx, 7, IRON[3])
        # Borda de dentro do baú e o monte de ouro saindo por cima.
        for x in range(3, 29):
            c.p(x, 11, WOOD6[2])
            c.p(x, 12, WOOD6[0])
        coin_pile32(c, 17, 9)
        chest_body32(c, 17)
        lock32(c, 13, 17)
    outline(c)
    return c


def chest32_sheet() -> Image.Image:
    return lib32.sheet([chest32(s).image() for s in range(3)])


# ── Flecha ───────────────────────────────────────────────────────────────

ARROW16 = [
    "rr...s..",
    "oRhhhtuo",
    "qq...s..",
]


def arrow16() -> Image.Image:
    pal = dict(P16)
    pal['h'] = (176, 134, 88)
    return grid(ARROW16, pal).image()


def arrow32() -> Image.Image:
    c = Canvas(16, 6)
    # Haste de duas linhas: clara em cima, escura embaixo, com veio.
    for x in range(2, 11):
        c.p(x, 2, WOOD6[5] if x % 4 else WOOD6[4])
        c.p(x, 3, WOOD6[3] if x % 5 else WOOD6[2])
    # Entalhe (nock) de osso no fim.
    c.p(1, 2, (222, 214, 196))
    c.p(1, 3, (150, 140, 120))
    # Penas: vane de cima clara, de baixo na sombra, com a faixa creme.
    for x in range(1, 7):
        c.p(x, 1, RED[4] if x < 6 else RED[3])
        c.p(x, 4, RED[2] if x < 6 else RED[1])
    c.p(3, 1, (232, 224, 204))
    c.p(3, 4, (190, 180, 160))
    # Ponta de aço larga (com farpas para trás) e aresta clara no meio.
    for (x, y, col) in ((10, 1, STEEL[3]), (11, 1, STEEL[4]), (10, 4, STEEL[1]), (11, 4, STEEL[2]),
                        (11, 2, STEEL[5]), (12, 2, STEEL[6]), (13, 2, STEEL[6]), (14, 2, STEEL[5]),
                        (11, 3, STEEL[3]), (12, 3, STEEL[3]), (13, 3, STEEL[2]), (14, 3, STEEL[2])):
        c.p(x, y, col)
    outline(c)
    return c.image()


NOVAS = [
    ('export/png/fx-coin.png', coin16, coin32),
    ('export/png/prop-chest.png', chest16, chest32_sheet),
    ('export/png/fx-arrow.png', arrow16, arrow32),
]
