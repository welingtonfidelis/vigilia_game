"""Corredor do abismo em 32-bit: paredes a/b, chão, primeiro plano, arco de divisa e patamar
da escada dos seis atos (o dobro de pixels do pack 16-bit, mesma composição).

A parede repete na horizontal (uma por sala, a ou b) e emenda com a outra variante e com o
patamar: o pilar das bordas fica metade em cada lado. O chão e o primeiro plano repetem.
"""
from __future__ import annotations

import math

from abismo32_base import (BONE, FLAME, IRON2, MOSS, RUST, ST, bayer, blank, bone_h, boulder_pile, candle,
                           chain_v, crack, dark_arch, flagstones, glow, hsh, masonry, moss_patch, mul, put,
                           shade_px, skull, stepped, tnoise)

W, H = 640, 384
P = 640
CEIL = 36      # fim do teto
WALL0 = 42     # começo da parede
WALL1 = 218    # começo do rodapé
FILL0 = 242    # dali para baixo fica sob o chão
PILLARS = (0, 160, 320, 480)


def bay(i):
    return 160 * i + 14, 160 * i + 146


# ── Peças comuns ─────────────────────────────────────────────────────────

def fill_below(c, R, top=FILL0, idx=4, x0=0, x1=W):
    for y in range(top, H):
        t = (y - top) / (H - top)
        for x in range(x0, x1):
            c.p(x, y, stepped([R[idx - 1], R[idx]], 1 - t * 0.6, x, y))


def shadow_right(c, px, half, y0, y1, depth=6, k=0.72, period=P):
    """Sombra que o pilar joga na parede à direita (luz da esquerda)."""
    for y in range(y0, y1):
        for d in range(depth):
            kk = k + (1 - k) * d / depth
            if bayer(px + half + d, y) < 0.85:
                shade_px(c, px + half + d, y, kk, period)


def cornice_shadow(c, y0, n=6, k=0.6, x0=0, x1=W):
    for y in range(y0, y0 + n):
        kk = k + (1 - k) * (y - y0) / n
        for x in range(x0, x1):
            shade_px(c, x, y, kk)


# ── Ato I · Catacumbas ───────────────────────────────────────────────────

CLOTH_I = [(30, 30, 26), (40, 42, 36), (52, 55, 47), (62, 66, 56), (78, 82, 70)]


def ceiling_coffers(c, R, top=0, bottom=CEIL, step=80, seed=0):
    """Teto em caixotões: nervuras a cada `step` px e, entre elas, painéis fundos com
    moldura em degrau (a face de baixo pega a luz das tochas) e uma roseta no meio."""
    for y in range(top, bottom):
        for x in range(W):
            lx = x % step
            ly = y - top
            if lx < 6:
                col = R[5] if lx < 2 else (R[4] if lx < 5 else R[2])
                if ly > bottom - top - 4:
                    col = R[6] if lx < 2 else R[5]
            elif ly < 3:
                col = R[1]
            else:
                px0, px1, py0, py1 = 9, step - 3, 5, bottom - top - 4
                if lx < px0 or lx >= px1 or ly < py0 or ly >= py1:
                    # Moldura: face de baixo acesa, lados médios, topo no escuro.
                    if ly >= py1:
                        col = R[5] if ly == py1 else R[4]
                    elif lx < px0:
                        col = R[3]
                    elif lx >= px1:
                        col = R[2]
                    else:
                        col = R[1]
                else:
                    t = (ly - py0) / (py1 - py0)
                    col = stepped([R[0], R[1], R[2], R[3]], 0.2 + 0.75 * t, x, y)
                    if lx == px0 or ly == py0:
                        col = R[0]
                    # Roseta.
                    rx, ry = lx - (px0 + px1) / 2, ly - (py0 + py1) / 2
                    d = math.hypot(rx, ry * 1.3)
                    if d < 4:
                        col = R[1] if d < 1.5 else (R[6] if rx + ry < 0 else R[4])
            c.p(x, y, col)
    # Cornija com dentículos.
    for x in range(W):
        c.p(x, bottom, R[4])
        c.p(x, bottom + 1, R[10])
        c.p(x, bottom + 2, R[8])
        c.p(x, bottom + 3, R[7] if (x % 8) < 5 else R[4])
        c.p(x, bottom + 4, R[6] if (x % 8) < 5 else R[3])
        c.p(x, bottom + 5, R[3])


def pilaster_I(c, cx, R, top=WALL0 - 4, bottom=WALL1, seed=0, moss=MOSS):
    """Pilastra de blocos com capitel e base, luz da esquerda."""
    prof = [4, 10, 10, 9, 9, 9, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 6, 6, 5, 3]
    for y in range(top + 10, bottom - 10):
        for i, t in enumerate(prof):
            x = cx - 12 + i
            ly = (y - top) % 20
            col = R[t]
            if ly == 19:
                col = R[max(0, t - 3)]
            elif ly == 0 and 0 < i < 22:
                col = R[min(14, t + 1)]
            elif 0 < i < 22:
                n = tnoise(x, y, seed + 31, 3)
                if n > 0.78:
                    col = R[min(14, t + 1)]
                elif n < 0.2:
                    col = R[t - 1]
            put(c, x, y, col)
    if moss:
        moss_patch(c, cx - 11, bottom - 40, cx + 11, bottom - 10, moss, seed=seed + 32, density=0.55, period=P)
    for (y0, flip) in ((top, False), (bottom - 10, True)):
        rows = [(15, 12), (15, 10), (14, 8), (14, 8), (13, 7), (13, 7), (13, 6), (14, 4), (15, 3), (15, 2)]
        if flip:
            rows = rows[::-1]
        for j, (hw, tone) in enumerate(rows):
            y = y0 + j
            for x in range(cx - hw, cx + hw):
                lx = x - (cx - hw)
                col = R[tone] if lx > 1 else R[min(14, tone + 1)]
                if lx >= 2 * hw - 2:
                    col = R[max(0, tone - 2)]
                put(c, x, y, col)
    shadow_right(c, cx, 15, top, bottom)


def loculus(c, cx, top, R, content, seed):
    """Nicho do ossuário (18×24) com aduelas, soleira e o que tiver dentro."""
    w, bottom = 18, top + 24
    dark_arch(c, cx, top, w, bottom, [R[0], R[1], R[2], R[3]], ring=[R[3], R[5], R[7], R[8], R[9], R[10]], ring_w=2)
    for x in range(cx - 12, cx + 12):
        lx = x - (cx - 12)
        put(c, x, bottom, R[10] if lx > 0 else R[8])
        put(c, x, bottom + 1, R[7])
        put(c, x, bottom + 2, R[4] if lx < 23 else R[3])
    if content == 'skull':
        skull(c, cx - 5, bottom - 10, BONE)
        put(c, cx + 5, bottom - 1, BONE[1])
    elif content == 'bones':
        bone_h(c, cx - 6, bottom - 2, 12, BONE)
        bone_h(c, cx - 4, bottom - 5, 9, [mul(b, 0.8) for b in BONE])
    elif content == 'candle':
        candle(c, cx - 1, bottom - 1, 6 + int(hsh(seed, 1) * 4))
        glow(c, cx, bottom - 10, 10, FLAME[3], 0.25, period=P)
    elif content == 'skulls':
        skull(c, cx - 8, bottom - 10, [mul(b, 0.75) for b in BONE])
        skull(c, cx - 2, bottom - 10, BONE)


def ossuary(c, x0, x1, R, rows=(0, 1, 2), seed=0):
    tops = (82, 126, 170)
    n = 5
    span = x1 - x0
    for r in rows:
        for k in range(n):
            cx = x0 + int(span * (k + 0.5) / n)
            h = hsh(k, r, seed)
            content = 'skull' if h < 0.4 else ('bones' if h < 0.62 else ('candle' if h < 0.76 else ('skulls' if h < 0.84 else 'empty')))
            loculus(c, cx, tops[r], R, content, seed + k * 7 + r)


def banner(c, cx, top, h, cloth=CLOTH_I, emblem=RUST, seed=0):
    """Estandarte rasgado pendurado numa haste de ferro, com dobras e brasão."""
    w = 20
    x0 = cx - w // 2
    for x in range(x0 - 3, x0 + w + 3):
        put(c, x, top, IRON2[4] if x < cx else IRON2[3])
        put(c, x, top + 1, IRON2[2])
    put(c, x0 - 4, top, IRON2[5])
    put(c, x0 + w + 3, top, IRON2[3])
    for y in range(top + 2, top + h):
        for x in range(x0, x0 + w):
            lx = x - x0
            # Barra rasgada: ponta em V e franjas.
            cut = h - 6 + abs(lx - w / 2 + 0.5) * 0.7 - 6 + int(hsh(lx, 3, seed) * 4)
            if y - top > cut:
                continue
            if hsh(lx, (y - top) // 3, seed + 1) < 0.02:
                continue  # furo
            fold = math.sin(lx * 0.9 + seed) * 0.5 + 0.5
            tone = 2 + (1 if fold > 0.7 else (-1 if fold < 0.2 else 0))
            if lx == 0:
                tone = 3
            if lx == w - 1:
                tone = 1
            col = cloth[max(0, min(len(cloth) - 1, tone))]
            ly = y - top
            if 4 <= ly <= 5:
                col = emblem[2] if lx not in (0, w - 1) else emblem[1]
            if 10 <= ly <= 20:
                # Brasão: caveira estilizada em ferrugem.
                ex, ey = lx - w // 2, ly - 15
                if (abs(ex + 0.5) < 4 and -4 <= ey <= 1) or (abs(ex + 0.5) < 2.5 and 2 <= ey <= 4):
                    col = emblem[2] if ex < 0 else emblem[1]
                    if ey == -1 and abs(ex + 0.5) in (1.5, 2.5):
                        col = cloth[0]
            put(c, x, y, col)
    for x in range(x0, x0 + w):
        put(c, x, top + 2, cloth[0])


def chain_weight(c, x, top, length, R):
    chain_v(c, x, top, top + length, IRON2, big=True)
    # Argola de ferro na ponta.
    for dy in range(12):
        for dx in range(-6, 7):
            d = math.hypot(dx, dy - 6)
            if 3.5 <= d <= 6:
                col = IRON2[5] if dx + (dy - 6) < -3 else (IRON2[3] if dx + (dy - 6) < 3 else IRON2[2])
                put(c, x + dx, top + length + dy, col)
    # Gancho na parede.
    for xx in range(x - 3, x + 3):
        put(c, xx, top - 1, IRON2[3])
    put(c, x - 3, top - 2, IRON2[4])


def rubble_base(c, x0, x1, R, seed, y=WALL1 - 1, moss=MOSS, n=None):
    """Entulho ao pé da parede: pedras de vários tamanhos com topo aceso e musgo."""
    n = n or int((x1 - x0) / 9)
    for k in range(n):
        x = x0 + int(hsh(k, 0, seed) * (x1 - x0))
        rx = 2 + int(hsh(k, 1, seed) * 5)
        ry = max(2, int(rx * (0.6 + 0.3 * hsh(k, 2, seed))))
        for dy in range(-ry, 1):
            for dx in range(-rx, rx + 1):
                if (dx / rx) ** 2 + (dy / ry) ** 2 > 1.0:
                    continue
                nx, ny = dx / rx, dy / ry
                lit = -nx * 0.6 - ny * 0.8
                tone = 6 + (2 if lit > 0.55 else (1 if lit > 0.1 else (-1 if lit < -0.3 else 0)))
                if dy == 0:
                    tone = 3
                put(c, x + dx, y + dy, R[tone])
        if hsh(k, 3, seed) < 0.35:
            for i in range(-rx, rx):
                if hsh(i, k, seed + 4) < 0.6:
                    put(c, x + i, y - ry, moss[3] if i < 0 else moss[2])


def altar_alcove(c, x0, x1, R, seed=0):
    cx = (x0 + x1) // 2
    dark_arch(c, cx, 84, 92, WALL1, [R[0], R[1], R[2], R[3], R[4]], ring=[R[3], R[5], R[7], R[8], R[9], R[10]], ring_w=4)
    # Fecho do arco.
    for y in range(76, 86):
        for x in range(cx - 4, cx + 4):
            put(c, x, y, R[10] if x < cx - 2 else (R[8] if x < cx + 2 else R[6]))
    # Sarcófago-altar: tampa, corpo com relevo e a caveira entre duas velas.
    ax0, ax1, atop = cx - 34, cx + 34, 166
    for y in range(atop, WALL1):
        for x in range(ax0, ax1):
            lx, ly = x - ax0, y - atop
            if ly < 4:
                col = R[10] if ly == 0 else (R[8] if ly < 3 else R[4])
            else:
                col = R[6] if lx > 1 else R[8]
                if lx >= ax1 - ax0 - 3:
                    col = R[4]
                if 10 <= ly <= 30 and (lx - 6) % 16 in (0, 1) and 4 < lx < ax1 - ax0 - 6:
                    col = R[4] if (lx - 6) % 16 == 1 else R[8]
                if ly == 8 or ly == 34:
                    col = R[4]
                if tnoise(x, y, seed + 40, 3) > 0.8:
                    col = R[7]
            put(c, x, y, col)
    for x in range(ax0 - 2, ax1 + 2):
        put(c, x, atop - 1, R[4])
    skull(c, cx - 5, atop - 10, BONE)
    for vx in (cx - 22, cx + 20):
        candle(c, vx, atop - 1, 10)
        glow(c, vx, atop - 14, 22, FLAME[3], 0.22, period=P)
    glow(c, cx, atop - 6, 28, FLAME[2], 0.12, period=P)


def wall_cracks(c, x0, x1, R, seed, top=120, n=2):
    for k in range(n):
        x = x0 + 20 + int(hsh(k, 0, seed) * (x1 - x0 - 40))
        y = top + int(hsh(k, 1, seed) * 30)
        crack(c, x, y, 34 + int(hsh(k, 2, seed) * 24), R[3], R[8], seed=seed + k * 13)


def wall_I(variant):
    """Catacumbas: tijolo com musgo, caixotões no teto, ossuários, estandartes, altar."""
    R = ST['I']
    c = blank(W, H)
    fill_below(c, R)
    ceiling_coffers(c, R)
    masonry(c, 0, WALL0, W, WALL1 - WALL0, R, 6, bh=14, bw=(26, 38), seed=11, period=P,
            moss=MOSS, moss_amt=0.05, stain=0.3)
    cornice_shadow(c, WALL0, 8)
    moss_patch(c, 0, WALL1 - 50, W, WALL1, MOSS, seed=60, density=0.22, period=P)
    plinth(c, R, 'I')
    bays = {'a': ['oss', 'oss-low', 'oss', 'chain'], 'b': ['altar', 'oss', 'banners', 'oss']}.get(variant, [])
    for i, kind in enumerate(bays):
        x0, x1 = bay(i)
        s = i * 31 + (0 if variant == 'a' else 500)
        if kind == 'oss':
            ossuary(c, x0, x1, R, seed=s)
        elif kind == 'oss-low':
            ossuary(c, x0, x1, R, rows=(2,), seed=s)
            banner(c, (x0 + x1) // 2, 48, 64, seed=s)
        elif kind == 'chain':
            chain_weight(c, x0 + 66, 80, 40, R)
            wall_cracks(c, x0 + 60, x1, R, s)
            rubble_base(c, x0 + 40, x1 - 10, R, s)
        elif kind == 'altar':
            altar_alcove(c, x0, x1, R, s)
        elif kind == 'banners':
            banner(c, x0 + 24, 48, 70, seed=s)
            banner(c, x1 - 24, 48, 70, seed=s + 1)
            wall_cracks(c, x0 + 34, x1 - 34, R, s, top=140)
            rubble_base(c, x0 + 20, x1 - 10, R, s)
    for px in PILLARS:
        pilaster_I(c, px, R, seed=7)
    return c


def plinth(c, R, act, y0=WALL1):
    """Rodapé: friso escuro, blocos grandes, degrau aceso e o pé que some sob o chão."""
    for x in range(W):
        c.p(x, y0, R[3])
        c.p(x, y0 + 1, R[9])
    masonry(c, 0, y0 + 2, W, 14, R, 6, bh=14, bw=(44, 70), seed=77, period=P, stain=0.45, chips=0.4)
    for x in range(W):
        c.p(x, y0 + 16, R[4])
        c.p(x, y0 + 17, R[8])
        for y in range(y0 + 18, y0 + 24):
            c.p(x, y, stepped([R[5], R[6]], 1 - (y - y0 - 18) / 6, x, y))


# ── Chão e primeiro plano ────────────────────────────────────────────────

def floor_layer(act):
    """Chão do corredor (o mesmo da arena): meio-fio de tijolos, piso de lajes onde os
    pés pisam (y 44 e 76) e a faixa da frente escurecendo em degraus."""
    R = ST[act]
    c = blank(W, 128)
    base_curb, base_floor = 6, 4
    # Borda de cima recortada.
    tops = [int(1 + 5 * tnoise(x, 0, 90, 16, P) + 2 * hsh(x // 3, 0, 91)) for x in range(W)]
    masonry(c, 0, 0, W, 32, R, base_curb, bh=10, bw=(22, 34), seed=93, period=P, stain=0.4, chips=0.35)
    for x in range(W):
        for y in range(0, tops[x]):
            c.px[y][x] = None
        c.p(x, tops[x], R[base_curb + 3])
        c.p(x, tops[x] + 1, R[base_curb + 2])
    # Piso de lajes.
    for x in range(W):
        c.p(x, 32, R[2])
        c.p(x, 33, R[3])
    flagstones(c, 34, (10, 12, 12, 14), R, base_floor, seed=95, period=P)
    # Faixa da frente: lajes grandes no escuro, em degraus.
    for y in range(82, 128):
        t = (y - 82) / 46
        for x in range(W):
            lx = (x + (37 if ((y - 82) // 24) % 2 else 0)) % 96
            col = stepped([R[1], R[2], R[3], R[4]], 0.95 - t * 0.75, x, y)
            if lx == 0 or (y - 82) % 24 == 0:
                col = R[max(0, R.index(col) - 1)] if col in R else col
            c.p(x, y, col)
    return c


def floor_I():
    c = floor_layer('I')
    # Ossos espalhados no piso (claros perto da luz, apagados no escuro).
    for k in range(14):
        x = int(hsh(k, 0, 101) * (W - 20)) + 6
        y = 40 + int(hsh(k, 1, 101) * 76)
        pal = BONE if y < 80 else [mul(b, 0.55) for b in BONE]
        if hsh(k, 2, 101) < 0.5:
            bone_h(c, x, y, 6 + int(hsh(k, 3, 101) * 6), pal)
        else:
            # Osso torto em diagonal curta.
            for i in range(7):
                c.p(x + i, y + i // 3, pal[3] if i < 4 else pal[2])
            c.p(x - 1, y - 1, pal[4])
            c.p(x + 7, y + 3, pal[2])
    return c


def fore_layer(act, deco):
    R = ST[act]
    c = blank(W, 64)
    for (x0, x1, top, seed) in ((14, 34, 24, 1), (96, 108, 27, 2), (165, 191, 21, 3), (254, 270, 26, 4), (303, 313, 28, 5)):
        boulder_pile(c, x0 + x1, top * 2 + 2, (x1 - x0) * 2 + 4, R, seed=seed * 13 + len(act), base=3, period=P, bottom=64, rmin=3, rmax=6)
    deco(c, R)
    return c


def fore_I_deco(c, R):
    for (x, y) in ((80, 58), (300, 60), (452, 58)):
        bone_h(c, x, y, 10, [mul(b, 0.75) for b in BONE])
    skull(c, 220, 52, [mul(b, 0.7) for b in BONE])


# ── Arco de divisa e patamar da escada ───────────────────────────────────

def door_I():
    R = ST['I']
    c = blank(96, 384)
    cx = 48
    # Bloco do teto sobre o arco.
    masonry(c, 16, 0, 64, 40, R, 6, bh=10, bw=(14, 22), seed=301, stain=0.2)
    for x in range(16, 80):
        c.p(x, 33, R[4])
    # Capitel.
    for j, (hw, tone) in enumerate([(34, 11), (34, 9), (33, 7), (33, 7), (32, 5), (30, 8), (30, 8), (30, 7), (29, 6), (28, 4), (27, 3), (26, 3)]):
        for x in range(cx - hw, cx + hw):
            lx = x - (cx - hw)
            col = R[min(14, tone + 1)] if lx < 2 else (R[max(0, tone - 2)] if lx > 2 * hw - 3 else R[tone])
            c.p(x, 40 + j, col)
    # Fuste de blocos com volume cilíndrico.
    prof = [3, 10, 11, 10, 10, 9, 9, 9, 9, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 4, 4, 3, 3, 3, 2]
    sx0 = cx - len(prof) // 2
    for y in range(52, 240):
        ly = (y - 52) % 24
        for i, t in enumerate(prof):
            x = sx0 + i
            col = R[t]
            if ly == 23:
                col = R[max(0, t - 3)]
            elif ly == 0:
                col = R[min(14, t + 1)]
            else:
                n = tnoise(x, y, 303, 3)
                if n > 0.8:
                    col = R[min(14, t + 1)]
                elif n < 0.18:
                    col = R[max(0, t - 1)]
            if y > 200 and tnoise(x, y, 304, 5) > 0.66 and 0 < i < len(prof) - 1:
                col = MOSS[2 if i < 14 else 1]
            c.p(x, y, col)
    # Relíquia: caveira com dois ossos cruzados e uma plaquinha de ferro.
    skull(c, cx - 5, 100, BONE)
    for i in range(18):
        c.p(cx - 13 + i, 114 + i // 6, BONE[3] if i < 9 else BONE[2])
        c.p(cx + 4 - i, 114 + i // 6, BONE[3] if i < 9 else BONE[2])
    for (x, y) in ((cx - 14, 113), (cx + 5, 113), (cx - 14, 116), (cx + 5, 116)):
        c.p(x, y, BONE[4])
    for y in range(124, 140):
        c.p(cx - 1, y, IRON2[3])
        c.p(cx, y, IRON2[2])
    for y in range(140, 146):
        for x in range(cx - 4, cx + 4):
            c.p(x, y, IRON2[4] if x < cx - 1 else IRON2[2])
    # Base.
    for j, (hw, tone) in enumerate([(26, 3), (27, 4), (28, 8), (29, 9), (30, 7), (30, 7), (31, 6), (31, 5), (32, 6), (32, 6),
                                    (32, 5), (32, 5), (32, 5), (32, 4), (32, 4), (32, 4), (32, 3), (32, 3), (32, 3), (32, 2), (32, 2), (32, 2), (32, 1), (32, 1)]):
        for x in range(cx - hw, cx + hw):
            lx = x - (cx - hw)
            col = R[min(14, tone + 1)] if lx < 2 else (R[max(0, tone - 2)] if lx > 2 * hw - 3 else R[tone])
            c.p(x, 240 + j, col)
    for x in range(cx - 32, cx + 32):
        for y in range(264, 270):
            if (x + y) % 2 == 0 or y < 266:
                c.p(x, y, R[1])
    c.outline(R[1])
    return c


def entry_frame(act, wall_fn):
    """Patamar: a escada desce da escuridão à esquerda até o chão; à direita, a parede do
    ato (a mesma da sala) com a metade esquerda do pilar da divisa."""
    R = ST[act]
    c = blank(144, H)
    wall = wall_fn('bare')
    # A parede da direita: as últimas 144 colunas da parede a (emenda com a coluna 0 dela).
    for y in range(H):
        for x in range(144):
            c.px[y][x] = wall.px[y][W - 144 + x]
    return c, R


def stair(c, R, x0=0, y_top=110, n=8, step_w=16, step_h=14, rail=True, inner=None, ring=None, ring_w=3):
    """Escada que desce para a direita, com o vão escuro do arco no alto à esquerda."""
    inner = inner or [R[0], R[1], R[2]]
    # Vão de onde a escada vem.
    dark_arch(c, 32, 52, 60, 140, inner, ring=ring or [R[3], R[5], R[7], R[8], R[9], R[10]], ring_w=ring_w)
    # Massa escura sob a escada (descendo até o chão).
    for y in range(100, FILL0):
        for x in range(0, 136):
            sy = y_top + int((x - x0) / step_w) * step_h
            if y >= sy:
                col = stepped([R[0], R[1], R[2]], 0.6 - (y - sy) / 220, x, y)
                if (x + y) % 9 == 0 and y > sy + 4:
                    col = R[0]
                c.p(x, y, col)
    for k in range(n):
        sx = x0 + k * step_w
        sy = y_top + k * step_h
        for x in range(sx, sx + step_w + 2):
            for y in range(sy, sy + step_h):
                ly = y - sy
                if ly == 0:
                    col = R[9] if x - sx < step_w else R[7]
                elif ly == 1:
                    col = R[7]
                elif ly < 4:
                    col = R[5]
                else:
                    col = stepped([R[2], R[3], R[4]], 0.8 - ly / step_h, x, y)
                c.p(x, y, col)
    if rail:
        for k in range(n * step_w):
            x = x0 + 4 + k
            y = y_top - 22 + int(k * step_h / step_w)
            c.p(x, y, R[6])
            c.p(x, y + 1, R[3])
        for k in range(0, n, 2):
            x = x0 + 4 + k * step_w
            y = y_top - 22 + int(k * step_w * step_h / step_w)
            for j in range(2, 22):
                c.p(x, y + j, R[5])
                c.p(x + 1, y + j, R[3])


def vignette_left(c, R, w=40, k=0.55):
    for y in range(c.h):
        for x in range(w):
            t = 1 - x / w
            if t * 1.0 > bayer(x, y) * 0.9 + 0.05:
                shade_px(c, x, y, 1 - k * t)


def entry_I():
    c, R = entry_frame('I', wall_I)
    wall_cracks(c, 70, 130, R, 412, top=100, n=1)
    stair(c, R)
    vignette_left(c, R)
    return c


# ── Registro ─────────────────────────────────────────────────────────────

def act_pieces(act):
    """id da peça do corredor → função que a desenha."""
    from abismo32_corredor_atos import ACTS as MORE
    table = {
        'I': {
            'wall-a': lambda: wall_I('a'),
            'wall-b': lambda: wall_I('b'),
            'floor': floor_I,
            'fore': lambda: fore_layer('I', fore_I_deco),
            'door': door_I,
            'entry': entry_I,
        },
    }
    table.update(MORE)
    return table.get(act, {})
