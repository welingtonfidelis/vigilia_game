"""Casa 32-bit: ruína, nível 1 (palha), nível 2 (tabuinha) e nível 3 (sobrado de telha).

Cada função devolve (peça, luzes) em 224×192, o dobro do pack 16-bit, com a mesma
composição: silhueta, janelas (onde o overlay 16-bit acende), porta e enfeites.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from predios32_kit import *  # noqa: E402,F401,F403
from predios32_kit import (  # noqa: E402
    COURSE, ROOF_MAT, GREEN, MOSS, ROOF_RED, SHINGLE, SOOT, STONE, THATCH, VOID, WOOD, IRON, beam, boards, broken_beam,
    broken_door, chimney, door, eave_shadow, flowerbox, hsh, layer, merge, mix, mul, new_pair, noise,
    plinth, rafter_stubs, roof, roof_hole, rubble, scorch, thatch_ridge, wall_ashlar, wall_planks, weeds,
    window,
)

W, H = 224, 192

# Palha dourada da casa nível 1 (a 16-bit é bem clara: o tom do meio é o c8a050).
THATCH_GOLD = [(98, 66, 30), (150, 108, 46), (196, 154, 72), (226, 186, 90), (248, 220, 132)]
# Pedra do térreo do sobrado na sombra do andar de cima (balanço).
STONE_SHADE = [mul(c, 0.72) for c in STONE]
# Borda de rombo em telhado queimado: quase tudo escuro, uma ou outra lasca clara.
BURNT = [SOOT[0], SOOT[1], (74, 54, 38), (104, 76, 50), (126, 92, 60)]
IVY = [(28, 48, 30), (42, 70, 40), (62, 98, 52), (92, 128, 70)]


def _thatch_gold(x, y, j, face, pal, seed, t):
    """Palha em camadas de 8: franja de pontas claras caindo sobre a sombra da camada de baixo."""
    lh = 8
    layer_i, ly = j // lh, j % lh
    hang = 1 + int(hsh(x // 2, layer_i, seed) * 2.6)      # franja em feixes de 2 px
    if layer_i > 0 and ly < hang:
        col = pal[4] if ly == hang - 1 and hsh(x, layer_i, seed + 1) < 0.55 else pal[3]
    elif layer_i > 0 and ly < hang + 2:
        col = pal[0] if ly == hang else pal[1]
    else:
        seg = (j + int(hsh(x, 0, seed + 2) * 6)) // 3
        r = hsh(x, seg, seed + 3)
        k = 1.5 + 1.6 * (ly / lh)                        # mais claro para baixo (as pontas)
        if r > 0.72:
            k += 1
        elif r < 0.2:
            k -= 1
        col = pal[max(1, min(4, int(k)))]
    return col, (layer_i, x // 6)


ROOF_MAT['thatch_gold'] = _thatch_gold
COURSE['thatch_gold'] = 8


def thatch_roof(c, y0, y1, ol, orr, hl, hr, pal=THATCH_GOLD, seed=0):
    """Telhado de palha: camadas com franja, cumeeira amarrada e beiral grosso e desfiado."""
    roof(c, y0, y1, ol, orr, hl, hr, 'thatch_gold', pal, seed=seed, ridge=False, eave=False, side_k=(0.8, 0.6))
    # Cantos de cima arredondados (a palha é grossa e não faz quina viva).
    for dy, cut in ((0, 3), (1, 1)):
        for k in range(cut):
            c.p(round(ol[0]) + k, y0 + dy, None)
            c.p(round(orr[0]) - k, y0 + dy, None)
    thatch_ridge(c, round(ol[0]) + 3, round(orr[0]) - 3, y0, THATCH, seed=seed)
    # Beiral: borda grossa com as pontas da palha cortadas, mais clara em cima e sombra embaixo.
    xl, xr = round(ol[1]), round(orr[1])
    for x in range(xl, xr + 1):
        for k, col in enumerate((pal[4], pal[3], pal[2], pal[1], pal[0])):
            y = y1 - 4 + k
            if k < 3 and hsh(x, k, seed + 10) < 0.3:
                col = pal[2] if k == 0 else pal[1]
            c.p(x, y, col)
        if hsh(x // 2, 1, seed + 9) < 0.3:
            c.p(x, y1, None)


def ragged_hole(c, cx, cy, rx, ry, y0, seed=0, rafters=(), ch=5, cw=6):
    """Rombo que segue a grade das telhas/tabuinhas: cai peça inteira, borda em degraus.

    Por dentro: escuro, ripas deitadas (algumas partidas) e caibros em pé; a borda de baixo
    ganha a sombra da espessura do telhado, sem contorno claro.
    """
    def cell_in(x, y):
        course = (y - y0) // ch
        off = int(hsh(course, 1, seed) * cw)
        cxl = (x + off) // cw
        ccx = cxl * cw - off + cw / 2
        ccy = y0 + course * ch + ch / 2
        d = math.hypot((ccx - cx) / rx, (ccy - cy) / ry)
        return d + 0.35 * (hsh(cxl, course, seed + 1) - 0.5) < 1.0
    pts = [(x, y) for y in range(cy - ry - ch, cy + ry + ch) for x in range(cx - rx - cw, cx + rx + cw)
           if c.g(x, y) is not None and cell_in(x, y)]
    inside = set(pts)
    for (x, y) in pts:
        col = VOID[0] if y < cy - ry // 3 else VOID[1]
        if (y - y0) % ch == ch // 2 and hsh(x // 7, y, seed + 2) < 0.7:
            col = WOOD[1] if hsh(x, y, seed + 3) < 0.8 else SOOT[1]
        elif (y - y0) % ch == ch // 2 - 1 and hsh(x // 7, y + 1, seed + 2) < 0.7:
            col = VOID[2]
        for i, rx_ in enumerate(rafters):
            if rx_ <= x <= rx_ + 1 and not (i == len(rafters) - 1 and y > cy):
                col = (WOOD[2] if x == rx_ else WOOD[0]) if y > cy - ry // 2 else (WOOD[3] if x == rx_ else WOOD[1])
        c.p(x, y, col)
    # Espessura: a fiada logo abaixo do rombo fica na sombra; pontas soltas penduradas.
    for (x, y) in pts:
        if (x, y + 1) not in inside and c.g(x, y + 1) is not None:
            c.shade(x, y + 1, 0.55)
            c.shade(x, y + 2, 0.78)
        if (x, y - 1) not in inside and hsh(x, y, seed + 4) < 0.25:
            c.p(x, y, SOOT[2])


def missing_boards(c, x0, y0, w, h, pw, seed=0, n=3):
    """Tábuas arrancadas: vão escuro com ponta lascada em cima e embaixo."""
    for i in range(n):
        b = int(hsh(i, 1, seed) * (w // pw))
        bx = x0 + b * pw
        ya = y0 + 8 + int(hsh(i, 2, seed) * (h // 3))
        yb = ya + 8 + int(hsh(i, 3, seed) * (h // 3))
        for x in range(bx, bx + pw - 1):
            ja = ya + int(hsh(x, 4, seed) * 3)
            jb = yb - int(hsh(x, 5, seed) * 3)
            for y in range(ja, min(jb, y0 + h - 2)):
                c.p(x, y, VOID[1] if x > bx else VOID[2])
            c.p(x, ja - 1, WOOD[3])                    # lasca clara na ponta de cima
            c.p(x, jb, WOOD[1])


def hanging_shutter(c, x, y, w, h):
    """Veneziana solta, pendurada torta por uma dobradiça."""
    for i in range(h):
        sx = x - i // 5
        for k in range(w):
            col = GREEN[2] if k == 0 else (GREEN[1] if k < w - 1 else GREEN[0])
            if i in (2, h - 3):
                col = GREEN[0]
            c.p(sx + k, y + i, col)
    c.p(x + w, y + 1, IRON[2])


def planter(c, x0, base, w, seed=0, dead=False):
    """Canteiro de madeira no pé da parede, com flores."""
    flowerbox(c, x0, base - 6, w, seed=seed, dead=dead)
    c.rect(x0, base - 1, w, 1, WOOD[0])


def ivy(c, x0, y_bottom, h, seed=0, spread=8):
    """Hera subindo pela pedra: talo escuro e folhas em cachos (só onde já há parede)."""
    def leaf(x, y, big):
        for (dx, dy, k) in ((0, 0, 2), (1, 0, 1), (0, -1, 3), (1, 1, 0)) if big else ((0, 0, 2), (0, -1, 3)):
            if c.g(x + dx, y + dy) is not None:
                c.p(x + dx, y + dy, IVY[k])
    for i in range(h):
        y = y_bottom - i
        x = x0 + round(3 * noise(0, i, seed, 7) - 1.5)
        if c.g(x, y) is None:
            continue
        c.p(x, y, IVY[0])
        if i % 2 == 0:
            side = -1 if (i // 2) % 2 else 1
            reach = 1 + int(hsh(i, 1, seed) * spread * (1 - i / (h * 1.3)))
            for r in range(1, reach + 1):
                if c.g(x + side * r, y - r // 3) is not None:
                    c.p(x + side * r, y - r // 3, IVY[1])
            leaf(x + side * reach, y - reach // 3 - 1, hsh(i, 2, seed) < 0.6)
            if hsh(i, 3, seed) < 0.5:
                leaf(x + side * (reach // 2), y - 2, False)


def casa_1():
    """Nível 1: casebre de tábuas com telhado de palha, duas janelas e porta simples."""
    c, lt = new_pair(W, H)
    thatch_roof(c, 93, 145, (51, 43), (172, 180), (64, 46), (159, 178), seed=1)
    wall_planks(c, 52, 146, 120, 38, WOOD, pw=10, seed=2, nails=(151, 180))
    beam(c, 48, 146, 128, 3, False)                    # frechal sob o beiral
    eave_shadow(c, 52, 171, 149, 5)
    for gx in (64, 148):
        window(c, lt, gx, 152, 14, 14, shutters=GREEN, sw=2, sill='wood', seed=gx)
    door(c, 103, 155, 18, 29, pw=6, seed=3, ring=True)
    plinth(c, 49, 184, 126, 6, STONE, seed=4)
    c.outline()
    return c, lt


def _casa_2(ruin: bool):
    """Nível 2 (e a ruína, que é ele destruído): tabuinha, chaminé, floreiras."""
    c, lt = new_pair(W, H)
    lit = None if ruin else lt
    chimney(c, 50, 69, 12, 84, STONE, broken=ruin, seed=4)
    roof(c, 77, 136, (37, 25), (186, 198), (60, 30), (163, 193), 'shingle', SHINGLE, seed=5,
         missing=0.22 if ruin else 0.0, dirt=1.0 if ruin else 0.0)
    if ruin:
        # Telhado chamuscado e o canto de cima à direita arrancado.
        scorch(c, 30, 76, 170, 60, seed=2, k=0.5)
        for y in range(74, 112):
            cut = 166 + (y - 74) * 0.95 + 4 * hsh(y // 2, 0, 9)
            for x in range(int(cut), 205):
                c.p(x, y, None)
            if c.g(int(cut) - 1, y):
                c.p(int(cut) - 1, y, SOOT[0] if y % 3 else WOOD[1])
        broken_beam(c, 168, 82, 182, 74, burnt=True)
        ragged_hole(c, 72, 91, 16, 16, 77, seed=6, rafters=[66, 76, 86])
        ragged_hole(c, 138, 84, 12, 10, 77, seed=7, rafters=[134, 142])
        rafter_stubs(c, [60, 66, 74], 74, 80, seed=1)
        rafter_stubs(c, [134, 142], 75, 79, seed=2)
    wall_planks(c, 34, 137, 156, 47, WOOD, pw=10, seed=8, nails=(141, 180), weather=12 if ruin else 8)
    eave_shadow(c, 34, 189, 137, 6)
    if ruin:
        scorch(c, 34, 137, 156, 30, seed=5, k=0.62)
        missing_boards(c, 34, 137, 156, 47, 10, seed=6)
    for i, gx in enumerate((52, 156)):
        window(c, lit, gx, 146, 16, 16, shutters=GREEN, sw=2, sill='wood', broken=ruin, seed=20 + i,
               box=False)
        flowerbox(c, gx - 3, 166, 22, seed=7 + i, dead=ruin)
        if ruin and i == 1:
            boards(c, gx, 146, 16, 16, seed=3)
        if ruin and i == 0:
            hanging_shutter(c, gx - 5, 144, 3, 20)
    if ruin:
        broken_door(c, 101, 153, 22, 31, seed=4)
    else:
        door(c, 101, 153, 22, 31, pw=5, seed=4)
    plinth(c, 31, 184, 162, 6, STONE, seed=12)
    if ruin:
        r = layer(c)
        broken_beam(r, 56, 186, 90, 170, burnt=True)
        broken_beam(r, 150, 184, 176, 176)
        rubble(r, 40, 188, 28, 14, STONE, seed=1, extra=SHINGLE)
        rubble(r, 82, 191, 28, 12, STONE, seed=2, extra=SHINGLE)
        rubble(r, 146, 188, 28, 14, STONE, seed=3, extra=SHINGLE)
        rubble(r, 184, 188, 34, 18, STONE, seed=4, extra=SHINGLE)
        weeds(r, 30, 194, 184, seed=5, density=0.35, tall=7)
        merge(c, r, (1, 1, 0.7))
    c.outline()
    return c, (None if ruin else lt)


def casa_2():
    return _casa_2(False)


def casa_ruin():
    return _casa_2(True)


def casa_3():
    """Nível 3: sobrado de telha, andar de tábuas em balanço sobre o térreo de pedra."""
    c, lt = new_pair(W, H)
    chimney(c, 176, 39, 12, 60, STONE, seed=6)
    roof(c, 49, 108, (21, 7), (202, 216), (48, 10), (175, 213), 'tile', ROOF_RED, seed=7)
    # Andar de cima: tábuas em pé, com a viga do piso embaixo (as cabeças dos barrotes à mostra).
    wall_planks(c, 16, 110, 192, 30, WOOD, pw=10, seed=9, nails=(113, 136), weather=0)
    eave_shadow(c, 16, 207, 110, 6)
    beam(c, 16, 140, 192, 2, False, WOOD)
    for x in range(22, 204, 14):
        c.rect(x, 140, 4, 2, WOOD[3])
        c.p(x + 3, 141, WOOD[1])
    # Térreo de pedra aparelhada; a fiada de cima fica na sombra do balanço.
    wall_ashlar(c, 20, 142, 184, 6, STONE_SHADE, seed=10, bw=14, bh=6, moss_rows=0)
    wall_ashlar(c, 20, 148, 184, 36, STONE, seed=11, bw=14, bh=8, moss_rows=8)
    for x in range(20, 204):
        c.shade(x, 148, 0.72)
        c.shade(x, 149, 0.86)
    ivy(c, 22, 182, 34, seed=3)
    ivy(c, 201, 182, 28, seed=4)
    for gx in (32, 80, 128, 176):
        window(c, lt, gx, 112, 14, 16, shutters=GREEN, sw=2, sill='wood', box=True, seed=gx)
    for gx in (46, 162):
        window(c, lt, gx, 150, 16, 14, shutters=GREEN, sw=2, sill='stone', lintel=None, seed=gx)
    door(c, 102, 153, 20, 31, pw=5, seed=12, arch=6)
    p = layer(c)
    planter(p, 40, 184, 16, seed=1)
    planter(p, 166, 184, 16, seed=2)
    merge(c, p, (1, 1, 0.7))
    plinth(c, 17, 184, 190, 6, STONE, seed=13)
    c.outline()
    return c, lt


PIECES = {
    'building/casa/ruin': casa_ruin,
    'building/casa/level-1': casa_1,
    'building/casa/level-2': casa_2,
    'building/casa/level-3': casa_3,
}
