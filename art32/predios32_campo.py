"""Campo de treino 32-bit: ruína e níveis 1–3 (288×192, o dobro do pack 16-bit).

Terreiro de terra batida cercado (cerca de trás com moirões e travessa, laterais em
perspectiva, cerca da frente com a porteira no meio). Nível 1: um boneco de palha;
nível 2: dois bonecos, alvo e armeiro; nível 3: pavilhão azul com estandartes, segundo
alvo e caixotes. A ruína é o nível 2 queimado e revirado. O campo não acende nada.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from predios32_kit import (  # noqa: E402
    BONE, CLOTH_BLUE, GOLD, GRASS, IRON, LEATHER, MOSS, ROOF_BLUE, ROOF_RED, SOOT, STEEL, STONE, THATCH, VOID,
    WOOD, Canvas, banner, barrel, crate, hsh, layer, lerp, merge, mix, mul, new_pair, noise, roof, rubble, weeds,
)

W, H = 288, 192
EARTH = [(62, 42, 28), (84, 58, 36), (104, 72, 44), (124, 90, 56), (146, 110, 70)]
STRAW = [(120, 84, 40), (164, 124, 58), (200, 160, 80), (230, 196, 120)]
BURLAP = [(110, 86, 52), (146, 116, 72), (178, 146, 96), (204, 176, 124)]
TARGET_RED = [(96, 30, 30), (138, 46, 46), (176, 66, 62), (206, 96, 84)]
ASH = [(52, 48, 46), (78, 72, 68), (110, 104, 98)]


# ── Terreiro e cerca ──────────────────────────────────────────────────────

def ground(c, y0, y1, x0=6, x1=281, seed=0, burnt=False):
    """Terra batida: tons em manchas, pedrinhas com luz em cima, trilhas mais escuras."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            v = noise(x, y * 1.4, seed + 1, 11) * 0.4 + noise(x, y, seed + 2, 2) * 0.35 + hsh(x, y, seed + 5) * 0.25
            col = EARTH[2]
            if v > 0.7:
                col = mix(EARTH[2], EARTH[3], 0.4)
            elif v < 0.28:
                col = mix(EARTH[1], EARTH[2], 0.45)
            r = hsh(x, y, seed + 3)
            if r < 0.07:
                col = mix(EARTH[1], EARTH[2], 0.3)
            elif r > 0.975:
                col = mix(EARTH[2], EARTH[3], 0.7)
            if burnt:
                b = noise(x, y * 1.3, seed + 9, 10) * 0.75 + noise(x, y, seed + 12, 3) * 0.25
                if b > 0.6:
                    col = mix(col, SOOT[1], 0.75) if b < 0.7 else mix(col, SOOT[0], 0.85)
                elif b > 0.52:
                    col = mix(col, SOOT[1], 0.35)
                a = noise(x, y, seed + 13, 6)
                if a > 0.74 and b < 0.6:
                    col = mix(col, ASH[1], 0.5)              # cinza clara espalhada
                if hsh(x, y, seed + 10) < 0.025:
                    col = SOOT[0]
            c.p(x, y, col)
    # Pedrinhas.
    for k in range(int((x1 - x0) * (y1 - y0) / 160)):
        px, py = x0 + 2 + int(hsh(k, 1, seed + 4) * (x1 - x0 - 4)), y0 + 2 + int(hsh(k, 2, seed + 4) * (y1 - y0 - 4))
        c.p(px, py, EARTH[4] if not burnt else ASH[2])
        c.p(px + 1, py, EARTH[3] if not burnt else ASH[1])
        c.p(px, py + 1, EARTH[0])
        c.p(px + 1, py + 1, EARTH[0])


def scuff(c, cx, cy, rx, ry, seed=0, k=0.82):
    """Chão pisoteado em volta de um boneco/alvo (mais escuro, com marcas de pé)."""
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            d = math.hypot((x - cx) / rx, (y - cy) / ry)
            if d < 1 and c.g(x, y) is not None:
                if noise(x, y, seed, 3) * 0.5 + (1 - d) * 0.6 > 0.55:
                    c.shade(x, y, k)
    for i in range(5):
        fx = int(cx - rx * 0.7 + hsh(i, 1, seed) * rx * 1.4)
        fy = int(cy - ry * 0.6 + hsh(i, 2, seed) * ry * 1.2)
        c.shade(fx, fy, 0.7)
        c.shade(fx + 1, fy, 0.7)
        c.shade(fx, fy + 1, 0.8)


def post(c, x, y0, y1, w=4, pal=WOOD, burnt=False, cap=True):
    """Moirão: quina clara à esquerda, sombra à direita, topo chanfrado."""
    p = [SOOT[0], SOOT[1], SOOT[2], mix(SOOT[2], WOOD[2], 0.5), WOOD[2]] if burnt else pal
    for y in range(y0, y1 + 1):
        for xx in range(x, x + w):
            lx = xx - x
            col = p[3] if lx == 0 else (p[1] if lx == w - 1 else p[2])
            if hsh(xx, y // 3, 7) < 0.2 and 0 < lx < w - 1:
                col = p[1]
            c.p(xx, y, col)
    if cap:
        for xx in range(x, x + w):
            c.p(xx, y0, p[4] if xx < x + w - 1 else p[2])
        c.p(x, y0, p[3])


def rail(c, x0, x1, y, pal=WOOD, burnt=False, skip=()):
    """Travessa: brilho em cima, veio no meio, sombra embaixo."""
    p = [SOOT[0], SOOT[1], SOOT[2], mix(SOOT[2], WOOD[2], 0.6)] if burnt else pal
    for x in range(x0, x1 + 1):
        if any(a <= x <= b for a, b in skip):
            continue
        c.p(x, y, p[3])
        c.p(x, y + 1, p[2] if hsh(x // 3, 0, 5) > 0.25 else p[1])
        c.p(x, y + 2, p[1])
        c.p(x, y + 3, p[0])


def fences(c, T, ruin=False, seed=0):
    """Cerca de trás (moirões a cada 18 px), laterais e a da frente com a porteira."""
    top = 2 * T
    posts = [8 + 18 * i for i in range(16)]
    gone = set()
    if ruin:
        gone = {i for i in range(16) if hsh(i, 1, seed) < 0.22}
    # Vão escuro atrás da travessa (aparece entre os moirões).
    for y in range(top + 9, top + 14):
        for x in range(6, 282):
            c.p(x, y, mix(EARTH[0], VOID[2], 0.4) if y < top + 12 else EARTH[0])
    # Travessa (na ruína, partida e queimada em trechos).
    skips = []
    if ruin:
        for i in range(15):
            if hsh(i, 2, seed) < 0.3 or i in gone:
                skips.append((posts[i] + 4, posts[i + 1] - 1))
    rail(c, 6, 281, top + 5, burnt=ruin, skip=skips)
    for i, px in enumerate(posts):
        if i in gone:
            # Toco quebrado e queimado.
            post(c, px, top + 8, top + 12, burnt=True, cap=False)
            c.p(px + 1, top + 7, SOOT[2])
            continue
        lean = (hsh(i, 3, seed) - 0.5) * 3 if ruin else 0
        short = int(hsh(i, 4, seed) * 3) if ruin else 0
        burnt = ruin and hsh(i, 5, seed) < 0.6
        post(c, px + round(lean * 0.3), top + 1 + short, top + 12, burnt=burnt)
        c.p(px + 1, top + 6, IRON[3] if not burnt else SOOT[2])   # prego da travessa
    # Laterais em perspectiva: travessa em pé com moirões a cada 16 px.
    for xs, xr in ((6, 8), (276, 278)):
        for y in range(top + 12, 184):
            c.p(xs, y, WOOD[1])
            c.p(xs + 1, y, EARTH[1])
            c.p(xr, y, WOOD[3] if not ruin or hsh(y // 6, xs, seed) > 0.3 else SOOT[2])
            c.p(xr + 1, y, WOOD[1])
            c.p(xr + 2, y, EARTH[1])
            c.p(xr + 3, y, EARTH[0])
        for y in range(top + 14, 180, 16):
            if ruin and hsh(y, xs, seed + 6) < 0.3:
                continue
            post(c, xs, y, y + 5, w=6, burnt=ruin and hsh(y, xs, seed + 7) < 0.5)
    # Frente: moirões baixos, travessa e a porteira (vão entre os mourões grandes).
    gate = (122, 167)
    fposts = [26 + 18 * i for i in range(6)] + [170 + 18 * i for i in range(6)]
    fskips = [(gate[0], gate[1])]
    if ruin:
        for i in range(len(fposts) - 1):
            if hsh(i, 8, seed) < 0.25:
                fskips.append((fposts[i] + 4, fposts[i + 1] - 1))
    rail(c, 6, 281, 177, burnt=ruin, skip=fskips)
    for i, px in enumerate(fposts):
        if ruin and hsh(i, 9, seed) < 0.2:
            post(c, px, 179, 183, burnt=True, cap=False)
            continue
        post(c, px, 172, 183, burnt=ruin and hsh(i, 10, seed) < 0.5)
    # Beira da frente: barranquinho escuro com capim.
    for x in range(6, 282):
        c.p(x, 184, EARTH[0])
        c.p(x, 185, mix(EARTH[0], EARTH[1], 0.5))
        c.p(x, 186, EARTH[1])
        c.p(x, 187, EARTH[2] if hsh(x, 0, seed + 12) > 0.3 else EARTH[1])
    # Mourões da porteira, mais grossos, descendo até a beira da imagem.
    for gx in (gate[0], gate[1] - 5):
        for y in range(166, 190):
            for xx in range(gx, gx + 6):
                lx = xx - gx
                col = WOOD[3] if lx == 0 else (WOOD[0] if lx == 5 else (WOOD[1] if lx == 4 else WOOD[2]))
                if ruin and lx > 2 and y < 172:
                    col = SOOT[1]
                c.p(xx, y, col)
        c.rect(gx, 166, 6, 1, WOOD[4])
        c.rect(gx, 170, 6, 1, IRON[2])
        c.p(gx + 1, 170, IRON[4])


def tufts(c, T, seed=0, density=0.3):
    """Capim nas beiradas da cerca (dentro do terreiro)."""
    top = 2 * T + 14
    weeds(c, 12, 276, top + 4, seed=seed, density=density, tall=4)
    weeds(c, 12, 276, 176, seed=seed + 1, density=density, tall=5)
    for y in range(top + 8, 170, 9):
        for x in (12, 13, 270, 271):
            if hsh(x, y, seed + 2) < density:
                c.p(x, y, GRASS[2])
                c.p(x, y - 1, GRASS[3])


# ── Objetos do treino ─────────────────────────────────────────────────────

def ground_shadow(c, x0, x1, y, k=0.68):
    """Sombra achatada no chão, puxada para a direita (sol de cima-esquerda)."""
    cx, rx = (x0 + x1) / 2 + 3, (x1 - x0) / 2 + 3
    for yy in range(y - 2, y + 2):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if abs(x - cx) / rx + abs(yy - y + 0.5) / 2.2 < 1:
                c.shade(x, yy, k)


def dummy(c, x, y, h=32, burnt=False, seed=0, broken=False):
    """Boneco de palha: cabeça de saco com olhos em X, corpo amarrado, braço de pau e estaca."""
    straw = [SOOT[0], (76, 54, 30), (118, 84, 44), (150, 112, 60)] if burnt else STRAW
    sack = [SOOT[0], (70, 56, 40), (98, 80, 58), (122, 102, 76)] if burnt else BURLAP
    # Estaca.
    for yy in range(y + h - 8, y + h):
        c.p(x + 4, yy, WOOD[3])
        c.p(x + 5, yy, WOOD[1])
    # Braço (pau atravessado).
    if not broken:
        for xx in range(x - 3, x + 13):
            c.p(xx, y + 12, WOOD[3] if not burnt else SOOT[2])
            c.p(xx, y + 13, WOOD[1] if not burnt else SOOT[0])
        for xx in (x - 3, x + 12):
            c.p(xx, y + 11, straw[3])
            c.p(xx, y + 14, straw[2])
    # Corpo de palha.
    for yy in range(y + 10, y + h - 7):
        for xx in range(x, x + 10):
            lx = xx - x
            col = straw[2] if lx < 6 else straw[1]
            if lx == 0:
                col = straw[3]
            if hsh(xx, yy // 2, seed) < 0.25:
                col = straw[3] if lx < 6 else straw[2]
            if lx == 9:
                col = straw[0]
            c.p(xx, yy, col)
    for by in (y + 15, y + h - 10):
        for xx in range(x, x + 10):
            c.p(xx, by, LEATHER[2] if xx < x + 6 else LEATHER[1])
    for i in range(3):
        c.p(x + 2 + i * 3, y + h - 7, straw[2])          # fiapos soltos embaixo
    # Cabeça de saco.
    for yy in range(y, y + 10):
        for xx in range(x + 1, x + 9):
            d = math.hypot((xx - (x + 4.5)) / 4.2, (yy - (y + 5)) / 5.2)
            if d > 1:
                continue
            col = sack[2] if xx < x + 6 else sack[1]
            if d < 0.5 and xx < x + 5 and yy < y + 4:
                col = sack[3]
            if (xx + yy) % 3 == 0:
                col = mul(col, 0.92)
            c.p(xx, yy, col)
    if not burnt:
        for (ex, ey) in ((x + 3, y + 4), (x + 6, y + 4)):
            c.p(ex - 1, ey - 1, VOID[2])
            c.p(ex, ey, VOID[2])
            c.p(ex - 1, ey + 1, VOID[2])
            c.p(ex + 1, ey - 1, VOID[2])
            c.p(ex + 1, ey + 1, VOID[2])
        for xx in range(x + 3, x + 7):
            c.p(xx, y + 7, sack[0] if xx % 2 else sack[1])
    else:
        c.p(x + 3, y + 4, FIREISH)
        c.p(x + 6, y + 6, SOOT[2])
    # Amarração do pescoço.
    c.rect(x + 2, y + 9, 6, 1, LEATHER[1])
    if burnt:
        for yy in range(y, y + h - 7):
            for xx in range(x - 3, x + 13):
                if c.g(xx, yy) is not None and noise(xx, yy, seed + 31, 3) > 0.55:
                    c.p(xx, yy, SOOT[0] if noise(xx, yy, seed + 32, 2) > 0.5 else SOOT[1])
        for i in range(3):
            c.p(x + 2 + i * 3, y + h - 8, FIREISH)          # brasa ainda acesa no pé


FIREISH = (150, 60, 30)


def target(c, cx, cy, r, legs_to, arrows=(), burnt=False, seed=0):
    """Alvo de palha com anéis pintados num cavalete; flechas espetadas."""
    # Cavalete.
    for i, (dx0, dx1) in enumerate(((-r // 2, -r + 1), (r // 2, r - 1))):
        for yy in range(cy, legs_to + 1):
            t = (yy - cy) / max(1, legs_to - cy)
            xx = round(cx + lerp(dx0, dx1, t))
            c.p(xx, yy, WOOD[3] if i == 0 else WOOD[2])
            c.p(xx + 1, yy, WOOD[1])
    rings = [STRAW[2], BONE[3], TARGET_RED[2], BONE[3], TARGET_RED[2], GOLD[2]]
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x - cx, y - cy) / (r + 0.3)
            if d > 1:
                continue
            ring = min(5, int(d * 6))
            col = rings[5 - ring]
            if ring == 5:
                col = STRAW[1] if hsh(x, y, seed) < 0.5 else STRAW[2]
            nx, ny = (x - cx) / r, (y - cy) / r
            lit = -(nx * -0.6 + ny * -0.8)
            if lit > 0.45:
                col = mix(col, (255, 248, 230), 0.18)
            elif lit < -0.45:
                col = mul(col, 0.8)
            if burnt and noise(x, y, seed + 3, 3) > 0.5:
                col = mix(col, SOOT[0], 0.7)
            c.p(x, y, col)
    for (ax, ay, ln) in arrows:
        # Haste saindo para cima-direita com penas.
        for i in range(ln):
            c.p(ax + i // 2, ay - i, WOOD[3] if i < ln - 2 else BONE[3])
        c.p(ax + ln // 2, ay - ln, BONE[2])
        c.p(ax, ay, IRON[1])


def rack(c, x0, y0, w, h, broken=False, burnt=False, seed=0):
    """Armeiro: dois montantes, duas travessas, lanças e espadas encostadas."""
    p = [SOOT[0], SOOT[1], SOOT[2], mix(SOOT[2], WOOD[2], 0.5)] if burnt else WOOD
    for px in (x0 + 1, x0 + w - 4):
        for y in range(y0 + 2, y0 + h):
            if broken and px > x0 + 2 and y < y0 + h // 2:
                continue
            c.p(px, y, p[3])
            c.p(px + 1, y, p[2])
            c.p(px + 2, y, p[1])
    for by in (y0 + 8, y0 + h - 8):
        for x in range(x0, x0 + w):
            if broken and by == y0 + 8 and x > x0 + w // 2:
                continue
            c.p(x, by, p[3])
            c.p(x, by + 1, p[1])
    # Lanças (haste comprida, ponta de aço) e espadas (lâmina, guarda, punho).
    for i, sx in enumerate(range(x0 + 5, x0 + w - 5, 5)):
        if i % 2 == 0:
            top = y0 - 2 + (2 if broken and i == 2 else 0)
            for y in range(top + 5, y0 + h - 1):
                c.p(sx, y, WOOD[3] if not burnt else SOOT[2])
                c.p(sx + 1, y, WOOD[1] if not burnt else SOOT[0])
            c.p(sx, top, STEEL[4])
            c.rect(sx, top + 1, 2, 3, STEEL[3])
            c.p(sx + 1, top + 1, STEEL[2])
            c.rect(sx - 1, top + 4, 4, 1, IRON[2])
        else:
            top = y0 + 3
            for y in range(top, top + 18):
                c.p(sx, y, STEEL[4] if y < top + 2 else STEEL[3])
                c.p(sx + 1, y, STEEL[2])
            c.rect(sx - 2, top + 18, 6, 1, GOLD[2])
            for y in range(top + 19, top + 24):
                c.p(sx, y, LEATHER[2])
                c.p(sx + 1, y, LEATHER[1])
            c.rect(sx, top + 24, 2, 1, GOLD[1])


def canopy(c, seed=0):
    """Pavilhão da guilda: telhado de ardósia azul, sanefa recortada com galão e dois esteios."""
    roof(c, 51, 67, (116, 113), (175, 178), (124, 113), (167, 178), 'slate', ROOF_BLUE, seed=seed)
    # Sanefa de pano azul com listras, galão dourado e barra recortada em arcos.
    for y in range(68, 78):
        for x in range(112, 180):
            lx = x - 112
            col = CLOTH_BLUE[2] if (lx // 4) % 2 == 0 else CLOTH_BLUE[1]
            if lx % 4 == 0 and (lx // 4) % 2 == 0:
                col = CLOTH_BLUE[3]
            if y == 68:
                col = GOLD[2] if lx % 3 else GOLD[3]
            elif y == 69:
                col = GOLD[1]
            k = lx % 8
            depth = 74 + round(3 * math.sin(math.pi * k / 8))
            if y > depth:
                continue
            if y == depth:
                col = GOLD[1] if k not in (0, 7) else CLOTH_BLUE[0]
            c.p(x, y, col)
    # Esteios.
    for px in (117, 169):
        for y in range(70, 104):
            c.p(px, y, WOOD[3])
            c.p(px + 1, y, WOOD[2])
            c.p(px + 2, y, WOOD[1])
    # Sombra do pavilhão no chão.
    for y in range(98, 108):
        for x in range(116, 182):
            if hsh(x, y, seed) < 0.9:
                c.shade(x, y, 0.82)


# ── Peças ────────────────────────────────────────────────────────────────

def campo_1():
    """Nível 1: terreiro cercado com um boneco de palha."""
    c, _ = new_pair(W, H)
    T = 49
    ground(c, 2 * T + 9, 187, seed=1)
    fences(c, T, seed=2)
    tufts(c, T, seed=3)
    scuff(c, 56, 148, 18, 6, seed=4)
    o = layer(c)
    dummy(o, 50, 118, 32, seed=5)
    ground_shadow(c, 50, 60, 149)
    merge(c, o, None)
    c.outline()
    return c, None


def _campo_2(ruin: bool):
    c, _ = new_pair(W, H)
    T = 41
    ground(c, 2 * T + 9, 187, seed=11, burnt=ruin)
    fences(c, T, ruin=ruin, seed=12)
    tufts(c, T, seed=13, density=0.45 if ruin else 0.25)
    if not ruin:
        scuff(c, 56, 132, 16, 5, seed=14)
        scuff(c, 96, 140, 16, 5, seed=15)
    o = layer(c)
    if ruin:
        dummy(o, 50, 104, 34, burnt=True, seed=16, broken=True)
        dummy(o, 90, 108, 34, burnt=True, seed=17)
        target(o, 226, 118, 12, 137, arrows=((222, 114, 8), (231, 121, 7), (219, 124, 6)), burnt=True, seed=18)
        rack(o, 194, 136, 24, 36, broken=True, burnt=True, seed=19)
    else:
        dummy(o, 50, 102, 32, seed=16)
        dummy(o, 90, 110, 32, seed=17)
        target(o, 226, 118, 12, 136, arrows=((224, 116, 7),), seed=18)
        rack(o, 194, 136, 24, 38, seed=19)
    for (x0, x1, y) in ((50, 60, 134), (90, 100, 142), (214, 240, 137), (194, 218, 174)):
        ground_shadow(c, x0, x1, y)
    merge(c, o, None)
    if ruin:
        r = layer(c)
        rubble(r, 82, 184, 30, 18, STONE, seed=21, extra=ROOF_RED)
        rubble(r, 182, 180, 28, 10, STONE, seed=22)
        rubble(r, 242, 186, 32, 14, STONE, seed=23, extra=ROOF_RED)
        weeds(r, 14, 270, 182, seed=24, density=0.2, tall=6)
        merge(c, r, None)
    c.outline()
    return c, None


def campo_2():
    return _campo_2(False)


def campo_ruin():
    return _campo_2(True)


def campo_3():
    """Nível 3: pavilhão azul com estandartes, dois bonecos, dois alvos, armeiro e caixotes."""
    c, _ = new_pair(W, H)
    T = 33
    ground(c, 2 * T + 9, 187, seed=31)
    fences(c, T, seed=32)
    tufts(c, T, seed=33)
    scuff(c, 56, 116, 16, 5, seed=34)
    scuff(c, 96, 124, 16, 5, seed=35)
    canopy(c, seed=36)
    b = layer(c)
    banner(b, 126, 80, 10, 24, CLOTH_BLUE, 'star')
    banner(b, 154, 80, 10, 24, CLOTH_BLUE, 'star')
    merge(c, b, (1, 1, 0.75))
    o = layer(c)
    dummy(o, 50, 86, 32, seed=37)
    dummy(o, 90, 94, 30, seed=38)
    target(o, 224, 102, 12, 120, arrows=((222, 100, 7), (228, 106, 6)), seed=39)
    target(o, 246, 130, 12, 148, arrows=((244, 128, 7),), seed=40)
    rack(o, 194, 136, 24, 38, seed=41)
    crate(o, 16, 168, w=14, h=14)
    barrel(o, 31, 168, w=12, h=15)
    for i, ax in enumerate((33, 36, 39)):
        for y in range(146, 154):
            o.p(ax, y, WOOD[3])
        o.p(ax, 145, BONE[3])
        o.p(ax - 1, 146, BONE[2])
    for (x0, x1, y) in ((50, 60, 118), (90, 100, 124), (212, 238, 121), (234, 260, 149), (194, 218, 174), (16, 44, 168)):
        ground_shadow(c, x0, x1, y)
    merge(c, o, None)
    c.outline()
    return c, None


PIECES = {
    'building/campo/ruin': campo_ruin,
    'building/campo/level-1': campo_1,
    'building/campo/level-2': campo_2,
    'building/campo/level-3': campo_3,
}
