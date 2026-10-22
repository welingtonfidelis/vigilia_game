"""Estalagem 32-bit: ruína, nível 1, nível 2 e nível 3 (224×192, o dobro do pack 16-bit).

Mesma composição da 16-bit: telhado de ardósia escura, andares de enxaimel caiado, o
térreo de tábuas (nível 2) ou de cantaria (nível 3), a placa da chave e o lampião. As
janelas ficam onde o overlay 16-bit acende; a ruína é o nível 2 destruído, sem luz.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from predios32_kit import (  # noqa: E402
    GREEN, MOSS, ROOF_SLATE, STONE, VOID, WOOD, Canvas, barrel, beam, boards, broken_beam, broken_door,
    chimney, crate, door, eave_shadow, hsh, lantern, layer, merge, mul, new_pair, plinth, rafter_stubs, roof,
    roof_hole, rubble, scorch, sign, timber, wall_planks, wall_stone, weeds, window,
)

W, H = 224, 192


# ── Peças só da estalagem ─────────────────────────────────────────────────

def joists(c: Canvas, x0: int, x1: int, y: int, h: int = 2, step: int = 10, broken: bool = False, seed: int = 0):
    """Cabeças dos barrotes saindo sob o andar de cima (balanço), com a sombra entre elas."""
    for x in range(x0, x1 + 1):
        k = (x - x0) % step
        head = k < 4 and not (broken and hsh((x - x0) // step, 0, seed) < 0.3)
        for yy in range(y, y + h):
            if head:
                col = WOOD[3] if k == 0 else (WOOD[2] if k < 3 else WOOD[1])
                if yy == y + h - 1:
                    col = WOOD[1] if k < 3 else WOOD[0]
            else:
                col = VOID[2] if yy == y else VOID[1]
            c.p(x, yy, col)


def jetty_beam(c: Canvas, x0: int, w: int, y: int, seed: int = 0):
    """Frechal grosso entre os andares: viga deitada com veio e pinos."""
    beam(c, x0, y, w, 4, False, WOOD, seed + 60)
    for x in range(x0 + 6, x0 + w - 2, 14):
        c.p(x, y + 1, WOOD[0])
        c.p(x + 1, y + 2, WOOD[4])


def string_course(c: Canvas, x0: int, y0: int, w: int, seed: int = 0):
    """Cornija de pedra sobre o térreo: aba clara, face e a sombra de baixo com mísulas."""
    for x in range(x0, x0 + w):
        k = (x - x0 + 3) % 14
        tone = 0.9 + 0.18 * hsh((x - x0 + 3) // 14, 0, seed)
        c.p(x, y0, mul(STONE[4], tone))
        c.p(x, y0 + 1, mul(STONE[3], tone))
        c.p(x, y0 + 2, mul(STONE[2] if k else STONE[1], tone))
        c.p(x, y0 + 3, STONE[1] if k in (5, 6, 7, 8) else STONE[0])
        if k == 0:
            c.p(x, y0 + 1, STONE[1])


def stone_frame(c: Canvas, gx: int, gy: int, gw: int, gh: int):
    """Verga e ombreiras de pedra em volta de uma janela do térreo de cantaria."""
    c.rect(gx - 4, gy - 6, gw + 8, 4, STONE[3])
    c.rect(gx - 4, gy - 6, gw + 8, 1, STONE[4])
    c.rect(gx - 4, gy - 3, gw + 8, 1, STONE[1])
    c.rect(gx + gw // 2 - 2, gy - 6, 4, 4, STONE[4])          # fecho da verga
    c.rect(gx + gw // 2 - 2, gy - 3, 4, 1, STONE[2])


def missing_boards(c: Canvas, x0: int, y0: int, w: int, h: int, pw: int, seed: int = 0, n: int = 4):
    """Tábuas arrancadas: vão escuro com ponta lascada em cima e embaixo."""
    for i in range(n):
        b = int(hsh(i, 1, seed) * (w // pw))
        bx = x0 + b * pw
        top = y0 + int(hsh(i, 2, seed) * h * 0.5)
        bot = top + 6 + int(hsh(i, 3, seed) * h * 0.4)
        for x in range(bx, bx + pw - 1):
            t = top + int(hsh(x, 4, seed) * 3)
            bb = min(y0 + h - 1, bot - int(hsh(x, 5, seed) * 3))
            for y in range(t, bb):
                c.p(x, y, VOID[1] if x > bx else VOID[2])
            c.p(x, t - 1, WOOD[3])
            c.p(x, bb, WOOD[1])


def ivy(c: Canvas, x0: int, y0: int, h: int, seed: int = 0):
    """Hera subindo pela parede: caule torto e folhas em dois tons."""
    x = x0
    for i in range(h):
        y = y0 - i
        if hsh(i // 3, 0, seed) < 0.3:
            x += 1 if hsh(i, 1, seed) < 0.5 else -1
        c.p(x, y, WOOD[1])
        if hsh(i, 2, seed) < 0.55:
            side = 1 if hsh(i, 3, seed) < 0.5 else -1
            c.p(x + side, y, MOSS[2])
            c.p(x + side * 2, y, MOSS[1])
            c.p(x + side, y - 1, MOSS[3])


def clear_lights_under(lt: Canvas, obj: Canvas) -> None:
    """Apaga a luz onde um objeto (placa) fica na frente da janela."""
    for y in range(obj.h):
        for x in range(obj.w):
            if obj.px[y][x] is not None:
                lt.px[y][x] = None


# ── Nível 1 ───────────────────────────────────────────────────────────────

def estalagem_1():
    """Nível 1: casa térrea de enxaimel, telhado de ardósia, duas janelas e a placa da chave."""
    c, lt = new_pair(W, H)
    roof(c, 77, 133, (41, 29), (182, 194), (62, 32), (161, 191), 'slate', ROOF_SLATE, seed=21)
    posts = [38, 66, 94, 122, 150, 178, 182]
    braces = [(42, 163, 65, 181), (154, 163, 177, 181)]
    timber(c, 38, 134, 148, 50, posts, rails=[156], braces=braces, seed=22)
    eave_shadow(c, 38, 185, 134, 6)
    for gx in (56, 154):
        window(c, lt, gx, 136, 14, 14, shutters=GREEN, sw=3, sill='wood', seed=gx)
    door(c, 100, 152, 24, 32, pw=4, seed=23)
    s = layer(c)
    sign(s, 130, 134, w=18, h=14, icon='key', bracket=20, seed=2)
    merge(c, s)
    plinth(c, 36, 184, 152, 6, STONE, seed=24)
    c.outline()
    return c, lt


# ── Nível 2 e ruína ───────────────────────────────────────────────────────

def _estalagem_2(ruin: bool):
    """Nível 2: andar de cima em balanço (enxaimel, cinco janelas), térreo de tábuas, porta e lampião."""
    c, lt = new_pair(W, H)
    lit = None if ruin else lt
    if not ruin:
        chimney(c, 168, 39, 12, 56, STONE, seed=8)
    roof(c, 49, 109, (25, 11), (198, 212), (52, 14), (171, 209), 'slate', ROOF_SLATE, seed=31,
         missing=0.24 if ruin else 0.0, dirt=0.75 if ruin else 0.0)
    if ruin:
        # Canto de cima à direita desabado: borda rasgada, ripas e caibros à mostra.
        for y in range(44, 76):
            cut = 170 + (y - 48) * 1.3 + 3 * hsh(y // 2, 0, 41)
            for x in range(int(cut), 214):
                c.p(x, y, None)
            if c.g(int(cut) - 1, y) and y >= 49:
                c.p(int(cut) - 1, y, ROOF_SLATE[0] if y % 4 else WOOD[1])
        chimney(c, 163, 35, 11, 56, STONE, broken=True, seed=8)
        for (xa, ya, xb, yb) in ((176, 56, 184, 50), (186, 64, 195, 59), (194, 72, 203, 68)):
            broken_beam(c, xa, ya, xb, yb, burnt=True)
        roof_hole(c, 68, 63, 11, 16, ROOF_SLATE, seed=42, rafters=[60, 67, 74])
        roof_hole(c, 138, 58, 10, 10, ROOF_SLATE, seed=43, rafters=[133, 140])
        rafter_stubs(c, [57, 63, 71, 76], 45, 52, seed=4)
        rafter_stubs(c, [131, 139, 145], 46, 51, seed=5)
        scorch(c, 50, 50, 44, 30, seed=44, k=0.6)
    # Andar de cima: enxaimel em balanço (um pouco mais largo que o térreo).
    posts = [20, 48, 132, 160, 200]
    wins = (32, 70, 106, 142, 180)
    braces = [(gx - 1, 133, gx + 3, 137) for gx in wins]                     # escorinhas sob os peitoris
    braces += [(53, 112, 66, 136), (87, 112, 102, 136), (102, 112, 87, 136), (165, 112, 177, 136)]
    timber(c, 20, 110, 184, 28, posts, rails=[], braces=braces, seed=32, dirty=0.8 if ruin else 0.0)
    eave_shadow(c, 20, 203, 110, 6)
    for i, gx in enumerate(wins):
        window(c, lit, gx, 112, 12, 16, sill='wood', broken=ruin, seed=50 + i)
        if ruin:
            scorch(c, gx - 6, 108, 24, 18, seed=60 + i, k=0.6)
            if i in (1, 4):
                boards(c, gx, 112, 12, 16, seed=i)
    jetty_beam(c, 20, 184, 138, seed=33)
    joists(c, 24, 199, 142, 2, 10, broken=ruin, seed=34)
    # Térreo de tábuas em pé.
    wall_planks(c, 24, 144, 176, 40, WOOD, pw=10, seed=35, nails=(147, 179))
    if ruin:
        missing_boards(c, 24, 146, 176, 36, 10, seed=36, n=5)
        scorch(c, 90, 140, 40, 30, seed=45, k=0.62)
    for i, gx in enumerate((48, 160)):
        window(c, lit, gx, 148, 14, 14, shutters=GREEN, sw=3, sill='wood', broken=ruin, seed=70 + i)
    if ruin:
        broken_door(c, 100, 152, 24, 32, seed=37)
    else:
        door(c, 100, 152, 24, 32, pw=4, seed=37)
        lantern(c, lt, 93, 149)
    s = layer(c)
    sign(s, 130, 144, w=18, h=14, icon='key', bracket=20, seed=3, tilt=0.4 if ruin else 0.0)
    merge(c, s)
    plinth(c, 22, 184, 180, 6, STONE, seed=38)
    if ruin:
        r = layer(c)
        broken_beam(r, 104, 186, 136, 174, burnt=True)
        rubble(r, 41, 185, 26, 16, STONE, seed=11, extra=ROOF_SLATE)
        rubble(r, 82, 191, 30, 16, STONE, seed=12, extra=ROOF_SLATE)
        rubble(r, 143, 185, 26, 12, STONE, seed=13, extra=ROOF_SLATE)
        rubble(r, 183, 185, 38, 18, STONE, seed=14, extra=ROOF_SLATE)
        weeds(r, 24, 200, 184, seed=15, density=0.35, tall=7)
        merge(c, r, (1, 1, 0.7))
        ivy(c, 27, 182, 30, seed=3)
    c.outline()
    return c, (None if ruin else lt)


def estalagem_2():
    return _estalagem_2(False)


def estalagem_ruin():
    return _estalagem_2(True)


# ── Nível 3 ───────────────────────────────────────────────────────────────

def estalagem_3():
    """Nível 3: três andares — dois de enxaimel em balanço e o térreo de cantaria."""
    c, lt = new_pair(W, H)
    chimney(c, 18, 25, 12, 44, STONE, seed=9)
    chimney(c, 190, 25, 12, 44, STONE, seed=10)
    roof(c, 37, 89, (11, -3), (212, 226), (38, 6), (187, 217), 'slate', ROOF_SLATE, seed=81)
    # Último andar (debaixo do beiral): seis janelas.
    top_w = (18, 52, 88, 124, 160, 194)
    braces = [(gx - 1, 108, gx + 2, 111) for gx in top_w]
    braces += [(68, 91, 84, 111), (84, 91, 68, 111), (104, 91, 116, 111), (178, 91, 190, 111)]
    timber(c, 6, 90, 212, 22, [6, 34, 118, 146, 174, 214], rails=[], braces=braces, seed=82)
    eave_shadow(c, 6, 217, 90, 5)
    for i, gx in enumerate(top_w):
        window(c, lt, gx, 90, 12, 14, sill='wood', seed=90 + i)
    jetty_beam(c, 4, 216, 112, seed=83)
    joists(c, 6, 217, 116, 2, 14, seed=84)
    # Segundo andar: seis janelas com floreiras.
    mid_w = (20, 54, 88, 124, 158, 192)
    braces = [(70, 119, 84, 143), (84, 119, 70, 143), (104, 119, 118, 143), (40, 119, 50, 143)]
    timber(c, 8, 118, 208, 26, [8, 36, 120, 148, 176, 212], rails=[], braces=braces, seed=85)
    eave_shadow(c, 8, 215, 118, 3)
    for i, gx in enumerate(mid_w):
        window(c, lt, gx, 118, 12, 16, sill='wood', box=(i % 5 == 0 or i == 2 or i == 3), seed=100 + i)
    jetty_beam(c, 6, 212, 144, seed=86)
    string_course(c, 8, 146, 208, seed=87)
    # Térreo de cantaria com janelas de verga de pedra.
    wall_stone(c, 12, 150, 200, 34, STONE, seed=88, moss_rows=8, bh=(8, 7), bw=(11, 8))
    for i, gx in enumerate((24, 62, 150, 186)):
        gw = 12 if gx == 150 else 14
        stone_frame(c, gx, 158 - 4, gw, 14)
        window(c, lt, gx, 154, gw, 14, sill='stone', seed=110 + i)
    door(c, 99, 153, 26, 31, double=True, frame=WOOD, pw=4, seed=89)
    lantern(c, lt, 91, 153)
    s = layer(c)
    sign(s, 132, 148, w=18, h=14, icon='key', bracket=20, seed=4)
    clear_lights_under(lt, s)
    merge(c, s)
    plinth(c, 10, 184, 204, 6, STONE, seed=91)
    b = layer(c)
    crate(b, 4, 184, 14, 14)
    crate(b, 6, 170, 12, 13)
    crate(b, 206, 184, 14, 14)
    barrel(b, 191, 184, w=12, h=15, seed=3)
    merge(c, b)
    c.outline()
    return c, lt


PIECES = {
    'building/estalagem/ruin': estalagem_ruin,
    'building/estalagem/level-1': estalagem_1,
    'building/estalagem/level-2': estalagem_2,
    'building/estalagem/level-3': estalagem_3,
}
