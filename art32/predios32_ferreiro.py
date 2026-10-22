"""Ferreiro 32-bit: ruína e níveis 1–3 (224×192, o dobro do pack 16-bit).

Casa de pedra com telhado de ardósia e chaminé à esquerda, e à direita o alpendre aberto
da forja (telhado de uma água, braseiro aceso, bigorna, ferramentas na parede do fundo).
As janelas ficam onde o overlay 16-bit acende; o braseiro não entra no overlay (o jogo
acende a forja à parte, com as fagulhas).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from predios32_kit import (  # noqa: E402
    noise, DIRT, FIRE, GOLD, IRON, LEATHER, MOSS, ROOF_RED, ROOF_SLATE, SOOT, STEEL, STONE, VOID, WOOD, Canvas, barrel,
    boards, broken_beam, broken_door, chimney, door, eave_shadow, hsh, layer, lerp, merge, mix, mul, new_pair,
    plinth, rafter_stubs, roof, roof_hole, rubble, scorch, wall_ashlar, weeds, window,
)

W, H = 224, 192
# Pedra mais escura e azulada do ferreiro grande (nível 3).
FSTONE = [(40, 42, 50), (62, 66, 76), (86, 92, 102), (112, 120, 130), (142, 150, 160)]
ASH = [(46, 44, 44), (70, 66, 64), (98, 94, 90), (128, 122, 116)]


# ── Peças do ferreiro ─────────────────────────────────────────────────────

def lean_to(c, x0, x1, y0, y1, pal=ROOF_SLATE, seed=0, missing=0.0, dirt=0.0):
    """Telhado de uma água do alpendre: ardósia, rufo claro em cima e testeira embaixo."""
    roof(c, y0, y1, (x0, x0), (x1, x1), (x0 - 2, x0 - 2), (x1 + 2, x1 + 2), 'slate', pal, seed=seed,
         ridge=False, missing=missing, dirt=dirt)
    for x in range(x0, x1 + 1):
        c.p(x, y0, pal[4] if (x - x0) % 9 else pal[2])
        c.p(x, y0 + 1, pal[3] if (x - x0) % 9 else pal[1])
    # Testeira de madeira sob o beiral.
    for x in range(x0, x1 + 1):
        c.p(x, y1 - 2, WOOD[3] if hsh(x, 0, seed) > 0.2 else WOOD[2])
        c.p(x, y1 - 1, WOOD[2])
        c.p(x, y1, WOOD[0])


def shed(c, x0, y0, x1, y1, glow=None, seed=0, tools=True, cold=False):
    """Fundo do alpendre: tábuas no escuro, chão de terra batida, brilho da brasa e ferramentas."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            k = (x - x0) % 8
            col = VOID[2] if k else VOID[1]
            if k and hsh(x, (y + int(hsh(x, 0, seed) * 6)) // 6, seed + 1) < 0.18:
                col = VOID[3]
            if y < y0 + 5:
                col = mix(VOID[0], col, (y - y0) / 5)          # sombra funda do alpendre
            if y > y1 - 4:
                col = mix(DIRT[0], VOID[2], 0.5) if hsh(x, y, seed + 2) < 0.7 else DIRT[0]
            if glow and not cold:
                gx, gy, r = glow
                d = math.hypot((x - gx) / r, (y - gy) / (r * 0.8))
                if d < 1:
                    col = mix(col, FIRE[0], 0.55 * (1 - d) ** 1.5)
            c.p(x, y, col)
    if not tools:
        return
    # Varão com ferramentas penduradas: tenaz, martelo, ferraduras.
    by = y0 + 9
    for x in range(x0 + 3, x1 - 2):
        c.p(x, by, WOOD[1])
    tx = x0 + 6
    lit = (lambda xx, yy: IRON[3]) if cold else (lambda xx, yy: mix(IRON[3], FIRE[2], 0.25))
    # Tenaz.
    for i in range(9):
        c.p(tx + i // 4, by + 1 + i, lit(0, 0) if i % 3 else IRON[2])
        c.p(tx + 3 - i // 4, by + 1 + i, IRON[2])
    # Martelo.
    hx = tx + 9
    for i in range(8):
        c.p(hx, by + 1 + i, WOOD[2])
    c.rect(hx - 2, by + 8, 5, 3, IRON[2])
    c.rect(hx - 2, by + 8, 5, 1, lit(0, 0))
    # Ferraduras.
    for k, fx in enumerate((hx + 7, hx + 13)):
        if fx + 4 > x1 - 2:
            break
        for (dx, dy) in ((0, 1), (0, 2), (0, 3), (1, 4), (2, 4), (3, 3), (3, 2), (3, 1)):
            c.p(fx + dx, by + 1 + dy, lit(0, 0) if dy < 3 else IRON[2])


def forge(c, x0, y0, w, h, pal=STONE, lit=True, seed=0):
    """Braseiro de pedra: borda de trás, monte de brasa entre as laterais, tampo da frente e cinzeiro."""
    # Corpo de tijolos.
    for y in range(y0 + 7, y0 + h):
        ly = y - (y0 + 7)
        row = ly // 4
        for x in range(x0, x0 + w):
            lx = x - x0 + (3 if row % 2 else 0)
            col = pal[2]
            if ly % 4 == 3 or lx % 6 == 5:
                col = pal[0]
            elif ly % 4 == 0:
                col = pal[3]
            col = mul(col, 0.9 + 0.18 * hsh(lx // 6, row, seed))
            if lit and x < x0 + w * 0.3:
                col = mix(col, FIRE[1], 0.08)
            c.p(x, y, col)
    # Borda de trás (a pedra clara que aparece por cima das brasas).
    c.rect(x0 + 1, y0, w - 2, 2, pal[4])
    c.rect(x0 + 1, y0 + 1, w - 2, 1, pal[3])
    # Laterais.
    for x in list(range(x0, x0 + 3)) + list(range(x0 + w - 3, x0 + w)):
        for y in range(y0 + 1, y0 + 7):
            c.p(x, y, pal[3] if x < x0 + w // 2 else pal[1])
    # Brasas (ou cinza fria).
    for y in range(y0 + 2, y0 + 6):
        for x in range(x0 + 3, x0 + w - 3):
            cx = x0 + w / 2
            d = abs(x - cx) / (w / 2 - 3)
            heap = (y - (y0 + 2)) / 4 + (1 - d) * 0.6
            if not lit:
                col = ASH[1] if hsh(x, y, seed) > 0.3 else ASH[0]
                if y == y0 + 2 and hsh(x, 1, seed) < 0.5:
                    col = ASH[2]
            else:
                col = FIRE[3] if heap > 1.0 else (FIRE[2] if heap > 0.7 else (FIRE[1] if heap > 0.45 else FIRE[0]))
                if hsh(x, y, seed + 1) < 0.22:
                    col = VOID[2] if heap < 0.8 else FIRE[1]   # carvão escuro no meio da brasa
            c.p(x, y, col)
    if lit:
        # Línguas de fogo baixas saindo do monte.
        for i, fx in enumerate(range(x0 + 6, x0 + w - 5, 5)):
            fh = 2 + int(hsh(i, 3, seed) * 3)
            for k in range(fh):
                c.p(fx + (k % 2), y0 + 1 - k, FIRE[2] if k < fh - 1 else FIRE[3])
    # Tampo da frente.
    c.rect(x0, y0 + 6, w, 1, pal[4])
    c.rect(x0, y0 + 7, w, 1, pal[1])
    # Boca do cinzeiro (arco escuro) com brilho no fundo.
    mx = x0 + w // 2
    for y in range(y0 + h - 7, y0 + h):
        for x in range(mx - 4, mx + 4):
            if y == y0 + h - 7 and x in (mx - 4, mx + 3):
                continue
            col = VOID[1]
            if lit and y > y0 + h - 4:
                col = FIRE[0] if hsh(x, y, seed + 2) < 0.6 else mix(FIRE[0], VOID[1], 0.5)
            c.p(x, y, col)


def anvil(c, x, y, w=12, cold=False, stump=True):
    """Bigorna: bico à esquerda, mesa clara, cintura e pé; em cima de um toco."""
    top = STEEL if not cold else IRON
    c.rect(x, y, w, 1, top[4])
    c.rect(x, y + 1, w, 2, IRON[3])
    c.rect(x + w - 1, y, 1, 3, IRON[2])
    c.p(x - 1, y, top[3])
    c.p(x - 2, y, IRON[3])
    c.p(x - 3, y + 1, IRON[2])
    c.p(x - 1, y + 1, IRON[3])
    c.p(x - 2, y + 1, IRON[2])
    c.rect(x + 3, y + 3, w - 6, 2, IRON[2])
    c.rect(x + 3, y + 3, 1, 2, IRON[3])
    c.rect(x + 1, y + 5, w - 2, 2, IRON[2])
    c.rect(x + 1, y + 5, w - 2, 1, IRON[3])
    c.p(x + 1, y + 6, IRON[1])
    c.p(x + w - 2, y + 6, IRON[1])
    if stump:
        for yy in range(y + 7, y + 9):
            for xx in range(x, x + w):
                c.p(xx, yy, WOOD[3] if yy == y + 7 else (WOOD[2] if (xx - x) % 3 else WOOD[1]))


def eave_sign(c, x0, y0, w, h, hang_y, icon='anvil', tilt=0.0, broken=False, seed=0):
    """Placa da ferraria pendurada no canto do beiral: moldura clara, fundo escuro, bigorna pintada."""
    t = Canvas(c.w, c.h)
    t.rect(x0, y0, w, h, WOOD[3])
    t.rect(x0, y0, w, 1, WOOD[4])
    t.rect(x0, y0 + h - 1, w, 1, WOOD[1])
    t.rect(x0 + w - 1, y0, 1, h, WOOD[1])
    t.rect(x0 + 2, y0 + 2, w - 4, h - 4, VOID[3])
    for x in range(x0 + 2, x0 + w - 2):
        if hsh(x, 0, seed) < 0.3:
            t.p(x, y0 + h - 4, VOID[2])
    ix, iy = x0 + w // 2, y0 + h // 2
    if icon == 'anvil':
        t.rect(ix - 5, iy - 2, 10, 2, STEEL[3])
        t.rect(ix - 5, iy - 2, 10, 1, STEEL[4])
        t.p(ix - 6, iy - 2, STEEL[2])
        t.p(ix - 7, iy - 2, STEEL[2])
        t.rect(ix - 2, iy, 4, 1, STEEL[2])
        t.rect(ix - 4, iy + 1, 8, 2, STEEL[2])
        t.rect(ix - 4, iy + 1, 8, 1, STEEL[3])
    if broken:
        for y in range(y0, y0 + h):
            for x in range(x0 + w - 4 - int(hsh(y // 2, 1, seed) * 4), x0 + w):
                t.p(x, y, None)
    for x in range(t.w):
        for y in range(t.h):
            if t.px[y][x] is not None:
                c.p(x, y + round((x - x0) * tilt), t.px[y][x])
    # Correntes até o beiral.
    for k, cx in enumerate((x0 + 2, x0 + w - 3)):
        if broken and k == 1:
            continue
        drop = round((cx - x0) * tilt)
        for y in range(hang_y, y0 + drop):
            c.p(cx, y, IRON[3] if (y - hang_y) % 2 else IRON[1])


def weapon_rack(c, x0, y0, x1, y1, seed=0):
    """Armeiro de madeira com três espadas em pé (lâmina de aço, guarda dourada, punho de couro)."""
    for px in (x0, x1 - 2):
        for y in range(y0 + 2, y1):
            c.p(px, y, WOOD[3])
            c.p(px + 1, y, WOOD[1])
    for by in (y0 + 12, y1 - 6):
        for x in range(x0, x1):
            c.p(x, by, WOOD[3])
            c.p(x, by + 1, WOOD[1])
    for i, sx in enumerate((x0 + 5, x0 + 10, x0 + 15)):
        top = y0 + (i % 2) * 2
        for y in range(top, top + 14):
            c.p(sx, y, STEEL[4] if y < top + 3 else STEEL[3])
            c.p(sx + 1, y, STEEL[2])
        c.p(sx, top - 1, STEEL[4])
        c.rect(sx - 2, top + 14, 6, 1, GOLD[2])
        c.p(sx - 2, top + 14, GOLD[3])
        for y in range(top + 15, top + 20):
            c.p(sx, y, LEATHER[2])
            c.p(sx + 1, y, LEATHER[1])
        c.rect(sx, top + 20, 2, 1, GOLD[1])


def grime(c, x0, y0, w, h, seed=0, k=0.5):
    """Encardido de ruína: pedras manchadas, escorrido escuro de cima e musgo subindo do pé."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            if c.g(x, y) is None:
                continue
            v = noise(x * 0.8, y * 0.15, seed + 61, 3)
            f = 1.0
            if v > 0.62:
                f -= k * 0.5 * (v - 0.62) / 0.38 + 0.12
            if hsh(x // 7, y // 4, seed + 62) < 0.18:
                f -= 0.12
            c.shade(x, y, max(0.35, f))
            if y > y0 + h - 12 and hsh(x, y, seed + 63) < 0.08 + 0.25 * (y - (y0 + h - 12)) / 12:
                c.p(x, y, mix(c.g(x, y), MOSS[1], 0.6))


def wall_cracks(c, x0, y0, w, h, n=6, seed=0):
    """Pedras soltas: alguns blocos arrancados (buraco escuro) e rachaduras em zigue-zague."""
    for k in range(n):
        cx = x0 + 4 + int(hsh(k, 1, seed) * (w - 8))
        cy = y0 + 4 + int(hsh(k, 2, seed) * (h - 8))
        if hsh(k, 3, seed) < 0.5:
            bw, bh = 6 + int(hsh(k, 4, seed) * 6), 4 + int(hsh(k, 5, seed) * 3)
            for y in range(cy, cy + bh):
                for x in range(cx, cx + bw):
                    if c.g(x, y) is not None:
                        c.p(x, y, VOID[1] if y > cy else VOID[0])
            c.rect(cx, cy + bh, bw, 1, STONE[1])
        else:
            x, y = cx, cy
            for i in range(10):
                if c.g(x, y) is not None:
                    c.p(x, y, VOID[2])
                x += 1 if hsh(k, i, seed + 6) < 0.6 else 0
                y += 1


# ── Peças ────────────────────────────────────────────────────────────────

def ferreiro_1():
    """Nível 1: casinha de pedra, duas janelas, porta de tábuas e o braseiro no alpendre."""
    c, lt = new_pair(W, H)
    chimney(c, 50, 57, 12, 86, STONE, seed=3)
    roof(c, 81, 136, (45, 37), (154, 163), (61, 39), (137, 160), 'slate', ROOF_SLATE, seed=21)
    lean_to(c, 150, 209, 119, 137, seed=22)
    wall_ashlar(c, 46, 138, 108, 46, STONE, bw=14, bh=8, seed=23)
    eave_shadow(c, 46, 153, 138, 6)
    shed(c, 154, 140, 201, 183, glow=(170, 168, 34), seed=24)
    beam_post(c, 202, 138, 46)
    forge(c, 158, 166, 24, 18, STONE, seed=25)
    for gx in (54, 132):
        window(c, lt, gx, 144, 14, 14, sill='wood', seed=gx)
    door(c, 100, 152, 24, 32, pw=4, seed=26)
    plinth(c, 44, 184, 112, 6, STONE, seed=27)
    c.outline()
    return c, lt


def beam_post(c, x, y0, h, pal=WOOD):
    """Esteio do alpendre: viga em pé com quina clara e mão-francesa até a testeira."""
    for y in range(y0, y0 + h):
        c.p(x, y, pal[3])
        c.p(x + 1, y, pal[2])
        c.p(x + 2, y, pal[2] if hsh(x, y // 4, 3) > 0.25 else pal[1])
        c.p(x + 3, y, pal[0])
    for i in range(6):
        c.p(x - 1 - i, y0 + 5 - i, pal[2])
        c.p(x - 1 - i, y0 + 6 - i, pal[1])


def _ferreiro_2(ruin: bool):
    """Nível 2 (e a ruína): casa maior, placa da bigorna no canto, bigorna ao lado do braseiro."""
    c, lt = new_pair(W, H)
    lit = None if ruin else lt
    chimney(c, 36, 45, 12, 78, STONE, seed=4, broken=ruin)
    roof(c, 73, 132, (33, 23), (166, 175), (54, 26), (145, 172), 'slate', ROOF_SLATE, seed=31,
         missing=0.3 if ruin else 0.0, dirt=1.0 if ruin else 0.0)
    if ruin:
        roof_hole(c, 68, 82, 16, 11, ROOF_SLATE, seed=32, rafters=[58, 66, 74], lean=0.12)
        rafter_stubs(c, [58, 66, 76], 69, 76, seed=3)
        scorch(c, 40, 72, 60, 34, seed=33, k=0.55)
        scorch(c, 110, 90, 40, 30, seed=34, k=0.6)
    lean_to(c, 164, 221, 115, 133, seed=34, missing=0.18 if ruin else 0.0, dirt=0.8 if ruin else 0.0)
    wall_ashlar(c, 32, 134, 136, 50, STONE, bw=14, bh=8, seed=35)
    eave_shadow(c, 32, 167, 134, 6)
    if ruin:
        grime(c, 32, 134, 136, 50, seed=36)
        wall_cracks(c, 32, 140, 136, 40, n=12, seed=36)
    shed(c, 168, 136, 213, 183, glow=None if ruin else (184, 166, 36), seed=37, cold=ruin)
    beam_post(c, 214, 134, 50)
    forge(c, 172, 166, 24, 18, STONE, lit=not ruin, seed=38)
    a = layer(c)
    if ruin:
        # Bigorna tombada no chão.
        a.rect(197, 178, 6, 6, IRON[2])
        a.rect(197, 178, 6, 1, IRON[3])
        a.rect(203, 180, 4, 4, IRON[1])
    else:
        anvil(a, 195, 174, w=10)
    merge(c, a, (1, 1, 0.75))
    for i, gx in enumerate((48, 140)):
        window(c, lit, gx, 140, 14, 14, sill='wood', lintel='stone', broken=ruin, seed=40 + i)
        if ruin:
            scorch(c, gx - 6, 124, 26, 18, seed=41 + i, k=0.45)
            if i == 1:
                boards(c, gx, 140, 14, 14, seed=2)
    if ruin:
        broken_door(c, 100, 152, 24, 32, seed=42)
    else:
        door(c, 100, 152, 24, 32, pw=4, seed=42)
    s = layer(c)
    eave_sign(s, 28, 138, 18, 12, 132, tilt=0.3 if ruin else 0.0, broken=ruin, seed=43)
    merge(c, s)
    plinth(c, 30, 184, 140, 6, STONE, seed=44)
    if ruin:
        scorch(c, 96, 128, 32, 26, seed=45, k=0.45)
        r = layer(c)
        broken_beam(r, 172, 150, 206, 176, burnt=True)
        broken_beam(r, 120, 188, 150, 176, burnt=True)
        rubble(r, 50, 188, 40, 20, STONE, seed=5, extra=ROOF_SLATE)
        rubble(r, 82, 191, 30, 12, STONE, seed=6, extra=ROOF_SLATE)
        rubble(r, 138, 187, 34, 18, STONE, seed=7, extra=ROOF_SLATE)
        rubble(r, 186, 186, 26, 12, STONE, seed=8)
        weeds(r, 30, 214, 184, seed=9, density=0.35, tall=7)
        merge(c, r, (1, 1, 0.7))
    c.outline()
    return c, (None if ruin else lt)


def ferreiro_2():
    return _ferreiro_2(False)


def ferreiro_ruin():
    return _ferreiro_2(True)


def ferreiro_3():
    """Nível 3: oficina grande de pedra escura, armeiro com espadas, barril e forja com bigorna."""
    c, lt = new_pair(W, H)
    chimney(c, 24, 33, 12, 70, STONE, seed=5)
    roof(c, 65, 128, (23, 11), (174, 186), (46, 13), (153, 186), 'slate', ROOF_SLATE, seed=51)
    lean_to(c, 176, 221, 111, 129, seed=52)
    wall_ashlar(c, 20, 130, 158, 54, FSTONE, bw=14, bh=8, seed=53)
    # Cunhais de pedra clara na quina da casa.
    for y in range(130, 184):
        if ((y - 130) // 8) % 2 == 0:
            c.rect(20, y, 6, 1, FSTONE[3] if (y - 130) % 8 == 0 else FSTONE[2])
            c.p(25, y, FSTONE[1])
    eave_shadow(c, 20, 177, 130, 6)
    shed(c, 178, 132, 211, 183, glow=(194, 166, 32), seed=54)
    beam_post(c, 212, 130, 54)
    forge(c, 182, 166, 24, 18, FSTONE, seed=55)
    a = layer(c)
    anvil(a, 191, 174, w=11)
    merge(c, a, (1, 1, 0.75))
    for gx in (40, 144):
        window(c, lt, gx, 136, 14, 14, sill='stone', lintel='stone', shutters=[mul(v, 0.8) for v in WOOD[1:]],
               sw=3, seed=gx)
    door(c, 100, 152, 24, 32, pw=4, arch=6, seed=56)
    s = layer(c)
    eave_sign(s, 16, 134, 18, 12, 128, seed=57)
    merge(c, s)
    plinth(c, 18, 184, 164, 6, FSTONE, seed=58)
    r = layer(c)
    weapon_rack(r, 4, 150, 26, 183)
    barrel(r, 6, 184, w=13, h=15)
    merge(c, r)
    c.outline()
    return c, lt


PIECES = {
    'building/ferreiro/ruin': ferreiro_ruin,
    'building/ferreiro/level-1': ferreiro_1,
    'building/ferreiro/level-2': ferreiro_2,
    'building/ferreiro/level-3': ferreiro_3,
}
