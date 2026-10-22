"""Medalhas de rank 32-bit (16×16 → 32×32): fita de duas tiras em V, disco com aro em relevo,
campo abaulado com o arco de brilho, e a variante com a letra (-glyph).

E ferro, D bronze, C prata e B ouro são metal liso com a letra gravada (sulco escuro e luz na
borda de baixo); A e S têm aro de ouro e campo esmaltado (verde-água e roxo) com a letra
em marfim, e o brilho em estrela no alto à direita, como no 16-bit."""
from __future__ import annotations

import math

from interface32_base import GOLD, Canvas, ellipse, outline

W = 32
CX, CY, R = 16.0, 20.0, 10.5

# Rampas de 7 tons (escuro → claro).
IRON7 = [(36, 38, 46), (54, 58, 68), (74, 78, 88), (92, 98, 108), (112, 118, 128), (150, 158, 168), (196, 202, 210)]
BRONZE7 = [(54, 32, 20), (80, 52, 32), (104, 72, 42), (130, 94, 54), (152, 112, 60), (184, 142, 84), (222, 184, 128)]
SILVER7 = [(60, 64, 74), (84, 90, 100), (106, 112, 120), (132, 140, 150), (156, 164, 174), (188, 198, 208), (232, 238, 244)]
GOLD7 = [(92, 56, 24), (126, 88, 36), (152, 112, 50), (184, 140, 62), (208, 164, 80), (236, 196, 96), (255, 236, 164)]
TEAL7 = [(14, 46, 50), (24, 70, 72), (36, 98, 98), (48, 124, 120), (76, 162, 154), (122, 200, 192), (196, 238, 230)]
PLUM7 = [(28, 12, 44), (46, 22, 68), (64, 46, 86), (88, 72, 106), (110, 90, 132), (138, 112, 164), (190, 170, 214)]
IVORY = [(150, 140, 120), (222, 214, 196), (250, 246, 234)]

# Fita: (tira da esquerda, tira da direita), cada uma com 3 tons.
RIBBON = {
    'e': ([(30, 30, 36), (42, 42, 48), (58, 60, 68)], [(56, 64, 74), (74, 84, 96), (96, 108, 120)]),
    'd': ([(70, 26, 30), (96, 38, 40), (120, 52, 52)], [(110, 44, 44), (138, 58, 58), (166, 82, 78)]),
    'c': ([(26, 40, 68), (38, 56, 92), (50, 74, 116)], [(42, 68, 108), (58, 90, 138), (84, 118, 168)]),
    'b': ([(104, 42, 42), (138, 58, 58), (160, 74, 72)], [(140, 56, 56), (176, 74, 74), (204, 104, 98)]),
    'a': ([(20, 60, 62), (30, 84, 86), (40, 104, 104)], [(36, 98, 96), (47, 122, 120), (70, 150, 146)]),
    's': ([(32, 12, 50), (48, 20, 70), (64, 32, 90)], [(70, 56, 86), (90, 74, 106), (114, 96, 134)]),
}
# Metal do aro e do campo; None = esmalte com aro de ouro.
METAL = {'e': IRON7, 'd': BRONZE7, 'c': SILVER7, 'b': GOLD7}
ENAMEL = {'a': (GOLD7, TEAL7), 's': (GOLD7, PLUM7)}

FONT = {
    'a': ['...##...', '..####..', '.##..##.', '.##..##.', '##....##', '##....##', '########', '##....##', '##....##', '##....##'],
    'b': ['######..', '##...##.', '##...##.', '##...##.', '######..', '##....##', '##....##', '##....##', '##....##', '#######.'],
    'c': ['..#####.', '.##...##', '##......', '##......', '##......', '##......', '##......', '##......', '.##...##', '..#####.'],
    'd': ['######..', '##...##.', '##....##', '##....##', '##....##', '##....##', '##....##', '##....##', '##...##.', '######..'],
    'e': ['#######.', '##......', '##......', '##......', '######..', '##......', '##......', '##......', '##......', '#######.'],
    's': ['.######.', '##....##', '##......', '.##.....', '..####..', '.....##.', '......##', '......##', '##....##', '.######.'],
}


def clamp(i: int, n: int) -> int:
    return max(0, min(n - 1, i))


def ribbon(c: Canvas, rank: str) -> None:
    left, right = RIBBON[rank]
    for y in range(1, 13):
        k = round(2.2 * (y - 1) / 11)
        for side, pal in ((0, left), (1, right)):
            x0 = 8 + k if side == 0 else 18 - k
            for j in range(6):
                col = pal[1]
                if j == 0:
                    col = pal[2]                       # borda de cima/esquerda pega luz
                elif j == 5:
                    col = pal[0]
                elif j in (2, 3):
                    col = pal[2] if side == 0 else pal[1]
                if j == 2:
                    col = right[2] if side == 0 else left[1]   # risca da outra cor no meio
                if y == 1:
                    col = pal[2] if j < 5 else pal[1]
                if y == 2:
                    col = pal[0]                       # dobra da fita no alto
                c.p(x0 + j, y, col)
        # Sombra onde as duas tiras se encostam.
        if k >= 2:
            c.p(14, y, left[0])


def disc(rank: str) -> tuple[dict, list, list]:
    """Pixels do disco: (distância ao centro, luz) e as rampas do aro e do campo."""
    if rank in METAL:
        rim = field = METAL[rank]
    else:
        rim, field = ENAMEL[rank]
    px = {}
    for (x, y) in ellipse(CX, CY, R, R):
        dx, dy = x + 0.5 - CX, y + 0.5 - CY
        d = math.hypot(dx, dy)
        lit = -(dx * 0.6 + dy * 0.8) / (d or 1)
        px[(x, y)] = (d, lit, dx, dy)
    return px, rim, field


def medal(rank: str, glyph: bool) -> Canvas:
    c = Canvas(W, W)
    ribbon(c, rank)
    px, rim, field = disc(rank)
    enamel = rank in ENAMEL
    for (x, y), (d, lit, dx, dy) in px.items():
        if d >= 7.7:
            rr = (d - 7.7) / (R - 7.7)
            if rr > 0.72:
                i = 4 + round(lit * 1.6)              # face de fora do aro
            elif rr < 0.3:
                i = 2 - round(lit * 1.2)              # parede de dentro (luz ao contrário)
            else:
                i = 4 + round(lit * 0.9)              # topo do aro
            c.p(x, y, rim[clamp(i, 7)])
        else:
            # Campo levemente abaulado.
            b = 0.5 + 0.28 * lit * (d / 7.7) - 0.1 * (d / 7.7) ** 2
            i = 2 + int(b * 3.2)
            if not enamel:
                i = 3 + int(b * 2.2)
            c.p(x, y, field[clamp(i, 7)])
    # Contas no aro (metal) ou cravos de ouro (esmalte).
    n = 16
    for k in range(n):
        a = (k + 0.5) / n * 2 * math.pi
        x, y = int(CX + math.cos(a) * 9.1), int(CY + math.sin(a) * 9.1)
        lit = -(math.cos(a) * 0.6 + math.sin(a) * 0.8)
        c.p(x, y, rim[6] if lit > 0.3 else rim[5] if lit > -0.4 else rim[4])
    # Arco de brilho no campo (como o "C" claro do 16-bit).
    for (x, y), (d, lit, dx, dy) in px.items():
        a = math.degrees(math.atan2(dy, dx)) % 360
        lo, hi = (195, 250) if glyph else (150, 265)
        if 4.9 <= d <= 6.4 and lo <= a <= hi:
            c.p(x, y, field[6] if 200 <= a <= 235 else field[5])
    if glyph:
        letter(c, rank, field, enamel)
    if enamel:
        # Brilho em estrela no alto à direita.
        sx, sy = 25, 9
        for (x, y) in ((sx - 2, sy), (sx + 2, sy), (sx, sy - 2), (sx, sy + 2)):
            c.p(x, y, GOLD[4])
        for (x, y) in ((sx - 1, sy), (sx + 1, sy), (sx, sy - 1), (sx, sy + 1)):
            c.p(x, y, IVORY[1])
        c.p(sx, sy, (255, 255, 250))
    outline(c)
    return c


def letter(c: Canvas, rank: str, field: list, enamel: bool) -> None:
    rows = FONT[rank]
    x0, y0 = 12, 15
    on = {(x0 + x, y0 + y) for y, row in enumerate(rows) for x, ch in enumerate(row) if ch == '#'}
    if enamel:
        # Letra de marfim em relevo: sombra embaixo/direita no esmalte.
        for (x, y) in on:
            for dx, dy in ((1, 1), (0, 1), (1, 0)):
                if (x + dx, y + dy) not in on:
                    c.p(x + dx, y + dy, field[0])
        for (x, y) in on:
            top = (x, y - 1) not in on or (x - 1, y) not in on
            c.p(x, y, IVORY[2] if top else IVORY[1])
    else:
        # Letra gravada: sulco escuro, luz batendo na parede de baixo/direita.
        for (x, y) in on:
            for dx, dy in ((1, 1), (0, 1), (1, 0)):
                if (x + dx, y + dy) not in on:
                    c.p(x + dx, y + dy, field[6])
        for (x, y) in on:
            edge = (x, y - 1) not in on or (x - 1, y) not in on
            c.p(x, y, field[0] if edge else field[1])


RANKS = {}
for _r in 'edcbas':
    RANKS[f'export/ui/ui-icon-rank-{_r}.png'] = (lambda r=_r: medal(r, False))
    RANKS[f'export/ui/ui-icon-rank-{_r}-glyph.png'] = (lambda r=_r: medal(r, True))
