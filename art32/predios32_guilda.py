"""Guilda 32-bit: ruína, nível 1, nível 2 e nível 3 (224×192, o dobro do pack 16-bit).

Mesma composição da 16-bit: telhado de ardósia azul de quatro águas; no nível 1 uma casa
de pedra com a placa do escudo; no 2 o andar de cima em enxaimel sobre o térreo de
pedra, com estandartes azuis ao lado da porta dupla; no 3 a casa mais larga, com o
torreão de ameias atrás do telhado, escudos pintados na parede e floreiras. A ruína é o
nível 2 destruído. As janelas ficam onde o overlay 16-bit acende.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import predios32_kit as kit  # noqa: E402
from predios32_kit import (  # noqa: E402
    GLASS, GOLD, GREEN, LIT, ROOF_BLUE, STONE, VOID, WOOD, Canvas, banner, beam, boards, broken_beam,
    broken_door, door, eave_shadow, hsh, layer, merge, mix, mul, new_pair, plinth, roof, roof_hole, rubble,
    scorch, sign, timber, wall_ashlar, weeds, window,
)

W, H = 224, 192
BANNER_BLUE = [(22, 32, 62), (38, 58, 102), (58, 90, 146), (92, 128, 192)]
HERALD_RED = [(90, 24, 30), (138, 40, 44), (176, 62, 58), (206, 96, 84)]
BONE_W = [(176, 168, 150), (214, 206, 188), (236, 230, 214)]


# ── Peças próprias da guilda ───────────────────────────────────────────────

def _scale(x, y, j, face, pal, seed, t):
    """Ardósia em escama: placas de ponta arredondada, desencontradas, com brilho na quina."""
    course, ly = j // 5, j % 5
    sw = 6 if face == 0 else 3
    off = (sw // 2) if course % 2 else 0
    sx, s = (x + off) % sw, (x + off) // sw
    if ly == 0:
        col = pal[1]                                    # sombra da fiada de cima
        if sx in (0, sw - 1):
            col = pal[0]
    elif ly == 1:
        col = pal[3] if sx < sw - 1 else pal[1]
        if sx == 1 and face == 0:
            col = pal[4] if t < 0.35 else mix(pal[3], pal[4], 0.5)
    elif ly in (2, 3):
        col = pal[2] if sx < sw - 1 else pal[1]
        if sx == 0:
            col = mix(pal[2], pal[3], 0.5)
    else:
        col = pal[1] if 0 < sx < sw - 1 else pal[0]     # ponta arredondada
    if sw > 3 and ly == 3 and sx == sw - 1:
        col = pal[0]
    col = mul(col, 0.88 + 0.2 * hsh(s, course, seed + 3))
    r = hsh(s, course, seed + 4)
    if r < 0.04 and ly in (1, 2) and 1 <= sx <= 3:
        col = mix(col, (150, 156, 120), 0.45)            # líquen
    return col, (course, s)


kit.ROOF_MAT.setdefault('scale', _scale)
kit.COURSE.setdefault('scale', 5)


def jetty(c: Canvas, x0: int, x1: int, y: int, joist_y: int, xs, pal=WOOD):
    """Viga do balanço do andar de cima, com as cabeças dos barrotes aparecendo embaixo."""
    beam(c, x0, y, x1 - x0 + 1, 4, False, pal, seed=61)
    for x in range(x0, x1 + 1):
        c.p(x, y + 3, pal[0])
    for jx in xs:
        c.rect(jx, joist_y, 4, 3, pal[2])
        c.rect(jx, joist_y, 4, 1, pal[3])
        c.p(jx, joist_y + 1, pal[3])
        c.rect(jx + 3, joist_y, 1, 3, pal[1])
        c.rect(jx, joist_y + 2, 4, 1, pal[1])
        c.p(jx + 1, joist_y + 1, pal[0])                       # cerne do barrote
        c.rect(jx + 1, joist_y + 3, 4, 1, mul(STONE[1], 0.8))   # sombra na pedra


def herald(c: Canvas, x: int, y: int, field=HERALD_RED):
    """Escudo pintado na parede: borda dourada, campo vermelho e faixa branca em pala."""
    rows = [10, 10, 10, 10, 10, 8, 8, 6, 4, 2]
    for j, wd in enumerate(rows):
        x0 = x + (10 - wd) // 2
        for i in range(wd):
            xx = x0 + i
            edge = i == 0 or i == wd - 1 or j == 0 or j == len(rows) - 1
            if edge:
                col = GOLD[3] if (i == 0 or j == 0) else GOLD[1]
            else:
                col = field[2] if xx < x + 5 else field[1]
                if xx in (x + 4, x + 5):
                    col = BONE_W[2] if xx == x + 4 else BONE_W[1]   # pala branca
                if j == 1 and 0 < i < wd - 1 and xx not in (x + 4, x + 5):
                    col = field[3]
            c.p(xx, y + j, col)
    # Tachas e sombra na pedra.
    c.p(x + 1, y + 1, GOLD[2])
    c.p(x + 8, y + 1, GOLD[2])
    for j in range(1, len(rows) + 1):
        wd = rows[j - 1]
        c.shade(x + (10 - wd) // 2 + wd, y + j, 0.7)


def tower(c: Canvas, lt: Canvas | None):
    """Torreão de pedra atrás do telhado: ameias, cornija, seteira acesa e quina na sombra."""
    x0, x1 = 188, 215
    # Corpo de pedra miúda.
    wall_ashlar(c, x0, 22, x1 - x0 + 1, 40, STONE, seed=71, bw=9, bh=5, moss_rows=0)
    for y in range(22, 62):
        for x in range(x1 - 4, x1 + 1):
            c.shade(x, y, 0.72)
        c.p(x0, y, mix(c.g(x0, y) or STONE[3], STONE[4], 0.5))
    # Cornija com mísulas.
    c.rect(186, 16, 32, 6, STONE[2])
    c.rect(186, 16, 32, 1, STONE[4])
    c.rect(186, 17, 32, 1, STONE[3])
    c.rect(186, 21, 32, 1, STONE[0])
    for mx in range(189, 216, 6):
        c.rect(mx, 22, 3, 3, STONE[2])
        c.p(mx, 22, STONE[3])
        c.rect(mx, 25, 3, 1, STONE[0])
    c.rect(212, 17, 6, 4, STONE[1])
    # Ameias.
    for mx in (186, 194, 202, 210):
        c.rect(mx, 12, 4, 4, STONE[2])
        c.rect(mx, 12, 4, 1, STONE[4])
        c.p(mx, 13, STONE[3])
        c.rect(mx + 3, 13, 1, 3, STONE[1])
    # Janela do torreão em arco redondo, com aduelas e vidro aceso.
    gx, gy, gw, gh = 196, 28, 10, 14
    cx, ay = gx + (gw - 1) / 2, gy + 5            # centro do arco

    def inside(x, y, grow=0.0):
        if not (gx - grow <= x <= gx + gw - 1 + grow and y <= gy + gh - 1 + grow):
            return False
        return y >= ay or math.hypot(x - cx, y - ay) <= gw / 2 + grow
    for y in range(gy - 4, gy + gh + 2):
        for x in range(gx - 3, gx + gw + 3):
            if inside(x, y, 2.4) and not inside(x, y):
                col = STONE[3] if x < cx else STONE[2]
                if y < ay and int(math.degrees(math.atan2(y - ay, x - cx)) // 30) % 2:
                    col = STONE[4] if x < cx else STONE[3]
                if x >= gx + gw or (y < ay and x > cx and math.hypot(x - cx, y - ay) > gw / 2 + 1.4):
                    col = STONE[1]
                c.p(x, y, col)
    for y in range(gy - 1, gy + gh):
        for x in range(gx, gx + gw):
            if not inside(x, y):
                continue
            t = ((x - gx) / gw + (y - gy) / gh) / 2
            col = mix(GLASS[2], GLASS[0], t)
            if y <= gy + 1:
                col = GLASS[0]
            if (x - gx) - (y - gy) * 0.6 in (1, 2) and gy + 1 < y < gy + gh // 2:
                col = GLASS[3]
            c.p(x, y, col)
            if lt is not None:
                d = min(1.0, math.hypot((x - cx) / (gw * 0.6), (y - (gy + gh * 0.65)) / (gh * 0.7)))
                lt.p(x, y, mix(LIT[4], LIT[1], d))
    for y in range(gy, gy + gh):
        c.p(gx + gw // 2 - 1, y, WOOD[2])
        c.p(gx + gw // 2, y, WOOD[1])
        if lt is not None:
            lt.p(gx + gw // 2 - 1, y, None)
            lt.p(gx + gw // 2, y, None)
    for x in range(gx, gx + gw):
        c.p(x, gy + 7, WOOD[2])
        if lt is not None:
            lt.p(x, gy + 7, None)
    c.rect(gx - 3, gy + gh, gw + 6, 2, STONE[4])
    c.rect(gx - 3, gy + gh + 1, gw + 6, 1, STONE[1])
    # Sombra do telhado na base do torreão.
    for y in range(56, 62):
        for x in range(x0, x1 + 1):
            c.shade(x, y, 0.85 - 0.03 * (y - 56))


def stone_damage(c: Canvas, x0: int, y0: int, w: int, h: int, seed: int = 0, holes: int = 6, cracks: int = 5):
    """Parede de pedra castigada: blocos arrancados, rachaduras e escorrido escuro."""
    for k in range(holes):
        hx = x0 + 2 + int(hsh(k, 1, seed) * (w - 14))
        hy = y0 + 2 + int(hsh(k, 2, seed) * (h - 10))
        hw, hh = 5 + int(hsh(k, 3, seed) * 5), 3 + int(hsh(k, 4, seed) * 3)
        for y in range(hy, hy + hh):
            for x in range(hx, hx + hw):
                if c.g(x, y) is None:
                    continue
                if (y == hy and (x - hx) < int(hsh(k, 10, seed) * 3)) or \
                        (y == hy + hh - 1 and (hx + hw - x) <= int(hsh(k, 11, seed) * 3)):
                    continue                              # quinas lascadas, não retângulo
                col = VOID[2] if y > hy else VOID[1]
                if x == hx or y == hy:
                    col = VOID[1]
                if y == hy + hh - 1:
                    col = STONE[1]                      # quina de baixo pega luz
                c.p(x, y, col)
        if c.g(hx + hw, hy + hh) is not None:
            c.p(hx + hw, hy + hh - 1, STONE[1])
    for k in range(cracks):
        x = x0 + 4 + int(hsh(k, 5, seed) * (w - 8))
        y = y0 + int(hsh(k, 6, seed) * (h // 2))
        for i in range(8 + int(hsh(k, 7, seed) * 14)):
            if c.g(x, y) is None:
                break
            c.p(x, y, VOID[2])
            if c.g(x + 1, y) is not None and i % 3 == 0:
                c.p(x + 1, y, mul(c.g(x + 1, y), 1.15))
            y += 1
            x += 1 if hsh(k, i, seed + 8) < 0.45 else (-1 if hsh(k, i, seed + 8) > 0.8 else 0)
    for x in range(x0, x0 + w):
        n = int(hsh(x // 3, 9, seed) * 9)
        for y in range(y0, y0 + n):
            c.shade(x, y, 0.82)                         # escorrido sob o balanço


def torn_banner(c: Canvas, x: int, y: int, w: int, h: int, pal=BANNER_BLUE, seed: int = 0):
    """Estandarte rasgado e desbotado: barra irregular, furos e o emblema meio apagado."""
    faded = [mix(col, (70, 70, 74), 0.35) for col in pal]
    c.rect(x - 1, y - 2, w + 2, 2, WOOD[1])
    c.rect(x - 1, y - 2, w + 2, 1, WOOD[3])
    for xx in range(x, x + w):
        bottom = y + h - 6 + int(hsh(xx, 0, seed) * 7) - (4 if xx > x + w * 0.6 else 0)
        for yy in range(y, bottom):
            lx = xx - x
            col = faded[2]
            if lx == 0:
                col = faded[3]
            elif lx >= w - 2:
                col = faded[1]
            elif lx % 3 == 2:
                col = mix(faded[2], faded[1], 0.6)
            if yy > y + h // 3 and hsh(xx // 2, yy // 2, seed + 1) < 0.1:
                continue                                 # furo
            if yy == bottom - 1:
                col = faded[0]
            c.p(xx, yy, col)
    cx, cy = x + (w - 1) // 2, y + h // 2 - 4
    for (dx, dy) in ((0, -2), (-1, -1), (1, -1), (-2, 0), (0, 2)):
        if c.g(cx + dx, cy + dy) is not None:
            c.p(cx + dx, cy + dy, GOLD[1])
    c.rect(x, y, w, 1, mul(faded[1], 0.8))


def cut_corner(c: Canvas, xa: int, ya: int, slope: float, y_end: int, seed: int):
    """Arranca o canto de cima à direita do telhado ao longo de uma linha quebrada."""
    for y in range(ya - 3, y_end):
        cut = xa + (y - ya) * slope + 4 * hsh(y // 2, 0, seed) - 2
        for x in range(int(cut), W):
            c.p(x, y, None)
        ex = int(cut) - 1
        band = 9 + int(hsh(y // 3, 2, seed) * 6)
        for k in range(band):
            x = ex - k
            if c.g(x, y) is None:
                continue
            col = VOID[0] if k > 1 else VOID[1]
            if k == band - 1:
                col = ROOF_BLUE[3] if hsh(x, y, seed) < 0.5 else ROOF_BLUE[2]   # quina das telhas
            c.p(x, y, col)
        # Caibros descendo pelo vão, um deles partido.
        for i, rx0 in enumerate((xa - 2, xa + 12, xa + 26)):
            rx_ = rx0 + int((y - ya) * 0.25)
            if ex - band < rx_ <= ex and not (i == 1 and y > ya + 18):
                c.p(rx_, y, WOOD[2])
                c.p(rx_ + 1, y, WOOD[0])


# ── Nível 1 ────────────────────────────────────────────────────────────────

def guilda_1():
    """Nível 1: casa de pedra com telhado de ardósia azul, duas janelas e a placa do escudo."""
    c, lt = new_pair(W, H)
    wall_ashlar(c, 40, 132, 144, 52, STONE, seed=3, bw=14, bh=8, moss_rows=8)
    roof(c, 81, 136, (43, 31), (180, 192), (62, 34), (161, 189), 'scale', ROOF_BLUE, seed=2)
    eave_shadow(c, 40, 183, 137, 6)
    # Quinas de pedra mais clara.
    for qy in range(140, 184, 8):
        for qx, w in ((40, 6), (178, 6)):
            c.rect(qx, qy, w, 7, STONE[3])
            c.rect(qx, qy, w, 1, STONE[4])
            c.rect(qx, qy + 6, w, 1, STONE[1])
    for gx in (56, 152):
        window(c, lt, gx, 146, 16, 16, shutters=GREEN, sw=3, sill='wood', lintel='stone', seed=gx)
    door(c, 100, 152, 24, 32, pw=4, seed=3, frame=STONE)
    s = layer(c)
    sign(s, 128, 140, w=18, h=13, icon='shield', bracket=20)
    merge(c, s)
    plinth(c, 38, 184, 148, 6, STONE, seed=4)
    c.outline()
    return c, lt


# ── Nível 2 e ruína ────────────────────────────────────────────────────────

def _guilda_2(ruin: bool):
    c, lt = new_pair(W, H)
    lit = None if ruin else lt
    # Térreo de pedra (as fiadas começam acima para cair no ritmo da 16-bit).
    wall_ashlar(c, 24, 136, 176, 48, STONE, seed=7, bw=14, bh=8, moss_rows=10 if ruin else 7)
    roof(c, 49, 108, (25, 11), (198, 212), (52, 15), (171, 209), 'scale', ROOF_BLUE, seed=6,
         missing=0.27 if ruin else 0.0, dirt=0.9 if ruin else 0.0)
    if ruin:
        cut_corner(c, 166, 50, 1.1, 92, seed=5)
        roof_hole(c, 76, 71, 20, 16, ROOF_BLUE, seed=8, rafters=[64, 74, 84])
        roof_hole(c, 134, 67, 12, 9, ROOF_BLUE, seed=9, rafters=[127, 137])
        scorch(c, 50, 50, 56, 30, seed=5, k=0.6)
    # Andar de cima em enxaimel, sob o beiral.
    posts = [20, 76, 104, 160, 200]
    braces = [(25, 128, 33, 133), (52, 128, 60, 133), (81, 128, 89, 133), (109, 128, 117, 133),
              (143, 128, 151, 133), (165, 128, 173, 133), (192, 128, 199, 133)]
    timber(c, 20, 110, 184, 24, posts, rails=[], braces=braces, seed=13, dirty=0.75 if ruin else 0.0)
    eave_shadow(c, 20, 203, 110, 5)
    for i, gx in enumerate((36, 84, 128, 176)):
        window(c, lit, gx, 112, 12, 14, sill='wood', broken=ruin, seed=40 + i)
        if ruin:
            scorch(c, gx - 6, 108, 24, 14, seed=50 + i, k=0.6)
            if i == 2:
                boards(c, gx, 112, 12, 14, seed=3)
    jetty(c, 20, 203, 134, 138, range(30, 196, 18) if not ruin else (30, 48, 120, 138, 174))
    if ruin:
        for x in range(84, 116):
            if hsh(x // 4, 0, 6) < 0.5:
                c.p(x, 137, VOID[1])                       # viga partida
    # Térreo: janelas com venezianas, estandartes e a porta dupla.
    for i, gx in enumerate((48, 160)):
        window(c, lit, gx, 148, 16, 16, shutters=GREEN, sw=3, sill='wood', broken=ruin, seed=60 + i)
    if ruin:
        stone_damage(c, 24, 138, 176, 46, seed=21, holes=4, cracks=6)
    for bx in (68, 146):
        if ruin:
            torn_banner(c, bx, 142, 10, 28, BANNER_BLUE, seed=bx)
        else:
            banner(c, bx, 142, 10, 28, BANNER_BLUE, 'diamond', seed=bx)
    if ruin:
        broken_door(c, 98, 148, 28, 36, seed=6, frame=WOOD)
        scorch(c, 90, 136, 44, 22, seed=7, k=0.55)
    else:
        door(c, 98, 148, 28, 36, double=True, pw=4, seed=5)
    plinth(c, 22, 184, 180, 6, STONE, seed=14)
    if ruin:
        r = layer(c)
        broken_beam(r, 52, 186, 86, 170, burnt=True)
        broken_beam(r, 150, 184, 178, 172)
        rubble(r, 34, 188, 24, 18, STONE, seed=11, extra=ROOF_BLUE)
        rubble(r, 74, 192, 30, 16, STONE, seed=12, extra=ROOF_BLUE)
        rubble(r, 138, 187, 24, 14, STONE, seed=13, extra=ROOF_BLUE)
        rubble(r, 176, 187, 30, 18, STONE, seed=14, extra=ROOF_BLUE)
        weeds(r, 22, 202, 184, seed=6, density=0.38, tall=7)
        weeds(r, 24, 200, 138, seed=7, density=0.12, tall=3)
        merge(c, r, (1, 1, 0.7))
    c.outline()
    return c, (None if ruin else lt)


def guilda_2():
    return _guilda_2(False)


def guilda_ruin():
    return _guilda_2(True)


# ── Nível 3 ────────────────────────────────────────────────────────────────

def guilda_3():
    """Nível 3: casa larga, torreão com ameias, cinco janelas com floreira, escudos e estandartes."""
    c, lt = new_pair(W, H)
    wall_ashlar(c, 14, 132, 196, 52, STONE, seed=17, bw=14, bh=8, moss_rows=7)
    roof(c, 33, 96, (17, 1), (204, 222), (50, 3), (173, 218), 'scale', ROOF_BLUE, seed=16)
    tower(c, lt)
    # Andar de cima.
    posts = [10, 38, 66, 94, 122, 150, 178, 206, 210]
    braces = []
    for a, b in zip(posts[:-2], posts[1:-1]):
        braces.append((a + 5, 122, a + 13, 129))
        braces.append((b - 1, 122, b - 9, 129))
    timber(c, 10, 98, 204, 32, posts, rails=[], braces=braces, seed=19)
    eave_shadow(c, 10, 213, 98, 5)
    for i, gx in enumerate((24, 66, 106, 146, 188)):
        window(c, lt, gx, 102, 12, 16, sill='wood', box=True, seed=80 + i)
    jetty(c, 10, 213, 130, 134, range(20, 206, 14))
    # Térreo.
    for i, gx in enumerate((44, 164)):
        window(c, lt, gx, 144, 16, 16, shutters=GREEN, sw=3, sill='wood', lintel='stone', seed=90 + i)
    for bx in (64, 150):
        banner(c, bx, 138, 10, 32, BANNER_BLUE, 'diamond', seed=bx)
    for hx in (22, 190):
        herald(c, hx, 162)
    # Porta dupla com arco de aduelas e fecho.
    for y in range(134, 145):
        for x in range(90, 134):
            d = math.hypot((x - 111.5) / 22, (y - 147) / 13)
            if 0.78 <= d <= 1.0:
                seg = int(math.degrees(math.atan2(y - 147, x - 111.5)) // 14)
                col = STONE[3] if seg % 2 else STONE[2]
                if d > 0.95:
                    col = STONE[1]
                c.p(x, y, col)
    c.rect(108, 134, 8, 5, STONE[4])
    c.rect(108, 138, 8, 1, STONE[1])
    c.rect(115, 135, 1, 3, STONE[2])
    door(c, 97, 145, 30, 39, double=True, pw=5, seed=9)
    plinth(c, 12, 184, 200, 6, STONE, seed=20)
    c.outline()
    return c, lt


PIECES = {
    'building/guilda/ruin': guilda_ruin,
    'building/guilda/level-1': guilda_1,
    'building/guilda/level-2': guilda_2,
    'building/guilda/level-3': guilda_3,
}
