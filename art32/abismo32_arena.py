"""Arena do abismo em 32-bit: o fundo (back), os pilares da frente (mid), o primeiro plano
(fore) de cada ato, as camadas de profundidade dos andares (depth, na paleta neutra DL) e
os fundos prontos de cada andar (back-1…4 = fundo + profundidade tingida + escurecimento,
como o pack faz). O chão da arena é o mesmo do corredor.
"""
from __future__ import annotations

import math

from abismo32_base import (OL, BONE, BONE_VI, DL, EMPH, FLAME, FLESH, FOAM, GLASS_C, GLASS_R, IRON2, KELP,
                           LAMP, LAVA, MOSS, SPORE, ST, VEIN, WOOD2, bayer, blank, chain_v, dark_arch,
                           dl_to_act, fog, glow, hsh, masonry, mix, moss_patch, mul, put, shade_px, skull,
                           stepped, stones, tnoise, wood_beam, ROMANS)
import abismo32_corredor as COR
import abismo32_corredor_atos as CA

W, H = 640, 384
P = 640
GROUND = 236   # onde a parede encontra o chão (o chão da arena entra em y 256)


def ground_zone(c, R, top=GROUND, idx=4):
    """Faixa do chão atrás do piso: escura, com a borda de cima acesa."""
    for y in range(top, H):
        t = (y - top) / (H - top)
        for x in range(W):
            c.p(x, y, stepped([R[idx - 2], R[idx - 1], R[idx]], 0.9 - t * 0.7, x, y))
    for x in range(W):
        c.p(x, top, R[idx + 3])
        c.p(x, top + 1, R[idx + 1])


def side_vignette(c, w=56, k=0.6, y0=0, y1=H):
    for y in range(y0, y1):
        for x in range(w):
            t = 1 - x / w
            if t > bayer(x, y) * 0.95:
                shade_px(c, x, y, 1 - k * t)
                shade_px(c, W - 1 - x, y, 1 - k * t)


def top_dark(c, h=80, k=0.55):
    for y in range(h):
        t = 1 - y / h
        for x in range(W):
            if t > bayer(x, y) * 0.9:
                shade_px(c, x, y, 1 - k * t)


# ── Ato I ────────────────────────────────────────────────────────────────

def cage(c, x, top, chain_len, R=IRON2):
    chain_v(c, x, 0, top, R)
    cw, ch = 16, 26
    x0 = x - cw // 2
    y0 = top
    for i in range(cw):
        put(c, x0 + i, y0, R[4])
        put(c, x0 + i, y0 + 1, R[2])
        put(c, x0 + i, y0 + ch, R[3])
    skull(c, x - 5, y0 + 8, [mul(b, 0.85) for b in BONE])
    for i in range(3):
        put(c, x - 1, y0 + 18 + i * 2, BONE[3])
        put(c, x - 3 + i * 3, y0 + 19 + i, BONE[2])
    for bx in range(x0, x0 + cw, 4):
        for y in range(y0 + 1, y0 + ch):
            put(c, bx, y, R[4] if bx < x else R[3])
    put(c, x - 1, y0 - 2, R[5])
    put(c, x, y0 - 2, R[3])


def ossuary_arch(c, cx, top, w, bottom, R, seed):
    dark_arch(c, cx, top, w, bottom, [R[0], R[1], R[2], R[3]], ring=[R[3], R[5], R[7], R[8], R[9], R[10]], ring_w=6)
    cols, rows = 3, 3
    for r in range(rows):
        for k in range(cols):
            nx = cx - w // 2 + 16 + k * (w - 32) // (cols - 1)
            ny = top + 44 + r * 44
            h = hsh(k, r, seed)
            content = 'skull' if h < 0.55 else ('candle' if h < 0.8 else 'bones')
            COR.loculus(c, nx, ny, R, content, seed + k + r * 5)


def door_planks(c, cx, top, w, bottom, R, seed):
    """Porta de tábuas em arco com cintas de ferro (a saída da sala)."""
    r = w / 2
    cyc = top + r
    for y in range(top - 6, bottom):
        for x in range(int(cx - r - 6), int(cx + r + 7)):
            dx = x + 0.5 - cx
            d = math.hypot(dx, y + 0.5 - cyc) if y + 0.5 < cyc else abs(dx)
            if d <= r:
                lx = int(x - (cx - r))
                pl = lx % 10
                tone = 2 + (1 if hsh(lx // 10, 0, seed) > 0.5 else 0)
                col = WOOD2[tone] if pl not in (0, 9) else (WOOD2[tone + 1] if pl == 0 else WOOD2[0])
                if tnoise(x, y * 0.3, seed, 3) > 0.75 and pl not in (0, 9):
                    col = WOOD2[tone - 1]
                col = mix(mul(col, 0.5), R[3], 0.35)
                put(c, x, y, col)
            elif d <= r + 6:
                ang = math.atan2(y + 0.5 - cyc, dx) if y + 0.5 < cyc else 0
                seg = int((ang + math.pi) / (math.pi / 8))
                col = R[8] if seg % 2 else R[7]
                if dx < 0 and y < cyc:
                    col = R[9] if seg % 2 else R[8]
                if d > r + 5:
                    col = R[3]
                put(c, x, y, col)
    for yb in (top + 30, bottom - 40):
        for x in range(int(cx - r), int(cx + r)):
            put(c, x, yb, IRON2[4])
            put(c, x, yb + 1, IRON2[2])
            if (x - cx) % 12 == 0:
                put(c, x, yb, IRON2[6])
    put(c, cx + 10, (top + bottom) // 2 + 10, IRON2[6])
    put(c, cx + 10, (top + bottom) // 2 + 11, IRON2[3])


def back_I():
    R = ST['I']
    c = blank(W, H)
    # Parede alta e escura (fundo do salão).
    masonry(c, 0, 0, W, GROUND, R, 4, bh=16, bw=(40, 64), seed=700, period=P, stain=0.4)
    top_dark(c, 120, 0.6)
    # Paredão do meio, mais claro, com cornija.
    masonry(c, 112, 96, 416, GROUND - 96, R, 6, bh=14, bw=(26, 38), seed=701, stain=0.3, moss=MOSS, moss_amt=0.05)
    for x in range(108, 532):
        c.p(x, 92, R[4])
        c.p(x, 93, R[9])
        c.p(x, 94, R[7])
        c.p(x, 95, R[3])
    moss_patch(c, 112, GROUND - 40, 528, GROUND, MOSS, seed=702, density=0.25)
    ossuary_arch(c, 66, 56, 88, GROUND, R, 703)
    ossuary_arch(c, 574, 56, 88, GROUND, R, 704)
    door_planks(c, 400, 104, 80, GROUND, R, 705)
    for (bx, h) in ((192, 48), (264, 48), (504, 48)):
        COR.banner(c, bx, 32, h, seed=bx)
    cage(c, 128, 56, 56)
    cage(c, 328, 44, 44)
    for x in (140, 232, 472, 524):
        for i in range(6):
            put(c, x - 2 + i, 196, IRON2[4] if i < 3 else IRON2[2])
        put(c, x, 197, IRON2[3])
        COR.candle(c, x, 195, 8)
        glow(c, x, 182, 20, FLAME[3], 0.22)
    ground_zone(c, R)
    side_vignette(c)
    return c


def mid_I():
    """Pilares escuros nas bordas (escondem a emenda entre salas) e uma gaiola."""
    R = ST['I']
    c = blank(W, H)
    for x0 in (12, 592):
        masonry(c, x0, 0, 36, 284, R, 4, bh=14, bw=(16, 20), seed=710 + x0, stain=0.25, chips=0.3)
        for y in range(284):
            c.p(x0, y, R[7])
            c.p(x0 + 1, y, R[6])
            c.p(x0 + 34, y, R[2])
            c.p(x0 + 35, y, R[1])
        for y in range(284, 296):
            for x in range(x0 - 4, x0 + 40):
                c.p(x, y, R[7] if y == 284 else (R[5] if x < x0 + 18 else R[3]))
        moss_patch(c, x0, 236, x0 + 36, 284, [mul(m, 0.75) for m in MOSS], seed=711 + x0, density=0.35)
    cage(c, 516, 70, 70)
    c.outline(R[1])
    return c


# ── Ato II ───────────────────────────────────────────────────────────────

def water_zone(c, R, top=GROUND, lamps=()):
    for y in range(top, H):
        t = (y - top) / (H - top)
        for x in range(W):
            n = tnoise(x, y * 5, 720, 30, P)
            col = stepped([R[1], R[2], R[3], R[4]], 0.7 - t * 0.5 + (n - 0.5) * 0.3, x, y)
            c.p(x, y, col)
    for k in range(90):
        x = int(hsh(k, 0, 721) * W)
        y = top + 4 + int(hsh(k, 1, 721) * (H - top - 8))
        L = 6 + int(hsh(k, 2, 721) * 26)
        col = R[6] if y < top + 60 else R[5]
        for i in range(L):
            put(c, x + i, y, col, P)
    for lx in lamps:
        for y in range(top + 2, top + 90, 3):
            w = 2 + (y - top) // 30
            if hsh(lx, y, 722) < 0.75:
                for i in range(-w, w + 1):
                    put(c, lx + i + int(2 * math.sin(y * 0.4)), y, LAMP[1] if abs(i) < 2 else R[6], P)
    for x in range(W):
        c.p(x, top, FOAM[2] if (x // 5) % 4 else FOAM[3])
        c.p(x, top + 1, R[5])


def back_II():
    R = ST['II']
    c = blank(W, H)
    stones(c, 0, 0, W, GROUND, R, 6, cs=17, seed=730, period=P, gap=1.2, mortar=R[2])
    CA.strata(c, R, 731, n=4, y0=40, gap=48)
    CA.ore_specks(c, 732, n=50, y0=10, y1=GROUND - 6)
    top_dark(c, 90, 0.55)
    CA.tunnel(c, 428, 112, 112, GROUND, R, 733)
    # Escoramentos de madeira.
    for (x0, x1, y) in ((0, 160, 32), (516, 640, 32), (120, 324, 72)):
        wood_beam(c, x0, y, x1 - x0, 9, WOOD2, base=3, seed=734 + x0, nails=[(x, y + 4) for x in range(x0 + 8, x1, 30)])
    for (px, y0) in ((32, 40), (608, 40), (124, 80), (300, 80), (560, 40)):
        wood_beam(c, px - 4, y0, 9, GROUND - y0, WOOD2, base=3, vertical=True, seed=735 + px, rot=0.06)
    for lx, ly in ((80, 44), (220, 84), (580, 44)):
        CA.lamp_hang(c, lx, ly, period=0)
    water_zone(c, R, lamps=(80, 220, 580))
    side_vignette(c)
    return c


def mid_II():
    c = blank(W, H)
    for (px, bx0, bx1) in ((16, 0, 140), (624, 500, 640)):
        wood_beam(c, px - 12, 0, 26, 318, WOOD2, base=3, vertical=True, seed=740 + px, rot=0.05)
        wood_beam(c, bx0, 16, bx1 - bx0, 14, WOOD2, base=3, seed=741 + px, nails=[(x, 22) for x in range(bx0 + 10, bx1, 26)])
        for yb in (80, 160, 240):
            for x in range(px - 13, px + 14):
                c.p(x, yb, IRON2[4])
                c.p(x, yb + 1, IRON2[2])
        side = 1 if px < 320 else -1
        for i in range(56):
            x = px + side * (14 + i)
            y = 30 + int(i * 0.75)
            c.p(x, y, IRON2[4])
            c.p(x, y + 1, IRON2[1])
    c.outline(ST['II'][1])
    return c


# ── Ato III ──────────────────────────────────────────────────────────────

def mushroom_sil(c, cx, cap_y, cap_w, stem_w, bottom, R, cap_t, stem_t, dots=True, seed=0):
    """Cogumelo-silhueta de fundo: chapéu achatado, caule, lamelas com pontos de luz."""
    for y in range(cap_y + 8, bottom):
        for x in range(cx - stem_w // 2, cx + stem_w // 2 + 1):
            lx = x - (cx - stem_w // 2)
            col = R[stem_t + 1] if lx < 2 else (R[stem_t] if lx < stem_w - 2 else R[max(0, stem_t - 1)])
            if 1 < lx < stem_w - 2 and (lx + (y // 7)) % 4 == 0:
                col = R[max(0, stem_t - 1)]
            put(c, x, y, col)
    for y in range(cap_y - cap_w // 6, cap_y + 10):
        for x in range(cx - cap_w // 2, cx + cap_w // 2 + 1):
            dx = (x - cx) / (cap_w / 2)
            top = cap_y - (cap_w / 6) * (1 - dx * dx) ** 0.6
            if y < top or abs(dx) > 1:
                continue
            if y >= cap_y + 6:
                if abs(dx) > 0.92:
                    continue
                col = R[max(0, cap_t - 2)]
                if dots and y == cap_y + 7 and x % 5 == 0:
                    col = SPORE[3]
            else:
                lit = -dx * 0.5 + (1 - (y - top) / 8) * 0.5
                col = R[cap_t + 1] if lit > 0.5 else (R[cap_t] if lit > 0 else R[max(0, cap_t - 1)])
                if y - top < 1 and dx < 0.4:
                    col = R[cap_t + 2]
                if hsh(int(x / 3), int(y / 3), seed + cx) < 0.06 and y - top > 2:
                    col = R[cap_t + 2]
            put(c, x, y, col)


def back_III():
    R = ST['III']
    c = blank(W, H)
    for y in range(GROUND):
        for x in range(W):
            c.p(x, y, stepped([R[1], R[2], R[3], R[4], R[5]], (y / GROUND) ** 1.4 * 0.9, x, y))
    CA.spores(c, 750, n=110, y0=4, y1=200)
    # Camada distante (clara, nevoenta).
    for (cx, cy, cw, sw) in ((40, 150, 70, 8), (200, 160, 56, 6), (300, 150, 44, 5), (380, 156, 60, 6), (470, 150, 40, 5), (600, 158, 64, 7)):
        mushroom_sil(c, cx, cy, cw, sw, GROUND, R, 6, 6, dots=False)
    fog(c, 140, GROUND, R[7], 0.05, 0.45, period=P, seed=751, wisps=0.4)
    # Camada perto (escura), com lamelas acesas.
    for (cx, cy, cw, sw) in ((100, 140, 112, 14), (300, 168, 70, 9), (470, 134, 120, 16), (612, 170, 60, 8)):
        mushroom_sil(c, cx, cy, cw, sw, GROUND, R, 3, 3, dots=True)
        glow(c, cx, cy + 10, cw * 0.5, SPORE[2], 0.08, ry=14)
    fog(c, 196, GROUND, R[8], 0.0, 0.5, period=P, seed=752, wisps=0.3)
    ground_zone(c, R)
    side_vignette(c)
    return c


def mid_III():
    R = ST['III']
    c = blank(W, H)
    for (cx, flip) in ((0, 1), (640, -1)):
        for y in range(70, 360):
            for i in range(6):
                x = cx + flip * i if flip > 0 else cx - 1 - i
                c.p(x, y, R[3] if i < 3 else R[2])
        for y in range(40, 82):
            for i in range(0, 80):
                dx = i / 80
                top = 40 + 28 * dx * dx
                if y < top:
                    continue
                x = cx + i if flip > 0 else cx - 1 - i
                col = R[3] if y < 74 else R[1]
                if y < top + 2:
                    col = R[5]
                if y == 78 and i % 5 == 2:
                    col = SPORE[3]
                if y > 78:
                    continue
                c.p(x, y, col)
    c.outline(R[0])
    return c


# ── Ato IV ───────────────────────────────────────────────────────────────

def rose_window(c, cx, cy, r, R):
    for y in range(int(cy - r - 3), int(cy + r + 4)):
        for x in range(int(cx - r - 3), int(cx + r + 4)):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d <= r:
                ang = math.atan2(y + 0.5 - cy, x + 0.5 - cx)
                seg = int((ang + math.pi) / (math.pi / 6))
                ring = int(d / (r / 3))
                if d < 3:
                    col = GLASS_R[3]
                elif abs(((ang + math.pi) % (math.pi / 6)) - math.pi / 12) < 0.09 or abs(d - r / 1.6) < 0.7:
                    col = R[1]
                else:
                    pal = GLASS_C if (seg + ring) % 3 else GLASS_R
                    col = pal[3 if (x + y) % 5 == 0 else 2]
                put(c, x, y, col)
            elif d <= r + 3:
                put(c, x, y, R[9] if (x < cx and y < cy) else R[6])
    glow(c, cx, cy, r * 2.2, GLASS_C[2], 0.12)


def back_IV():
    R = ST['IV']
    c = blank(W, H)
    masonry(c, 0, 0, W, GROUND, R, 5, bh=14, bw=(28, 44), seed=760, period=P, stain=0.35)
    top_dark(c, 70, 0.5)
    rose_window(c, 320, 28, 20, R)
    cols = (84, 196, 308, 420, 532)
    spans = [(-28, 84), (84, 196), (196, 308), (308, 420), (420, 532), (532, 644)]
    for (a, b) in spans:
        cx = (a + b) / 2
        rr = (b - a) / 2 - 6
        top = 120
        for y in range(int(top - rr), GROUND):
            for x in range(int(cx - rr), int(cx + rr) + 1):
                dx = x + 0.5 - cx
                d = math.hypot(dx, y + 0.5 - top) if y < top else abs(dx)
                if d <= rr:
                    t = (y - (top - rr)) / (GROUND - (top - rr))
                    col = stepped([R[2], R[3], R[4]], 0.3 + t * 0.5, x, y)
                    if d > rr - 2 and dx > 0:
                        col = R[5]
                    put(c, x, y, col)
                elif d <= rr + 4:
                    put(c, x, y, R[9] if (dx < 0 and y < top) else (R[7] if d < rr + 3 else R[4]))
    for px in cols:
        CA.column_IV(c, px, R, top=106, bottom=GROUND)
    # Feixes de luz pontilhados vindos do alto.
    for (x0, slope, L) in ((270, -0.25, 200), (300, 0.3, 190), (356, 0.22, 210), (372, -0.12, 170)):
        for i in range(0, L, 3):
            x = x0 + slope * i
            y = 40 + i
            for k in range(3):
                if hsh(int(x) + k * 3, y, 761) < 0.55 - i / L * 0.4:
                    put(c, x + k * 3, y + (k % 2), GLASS_C[3] if i < L / 2 else GLASS_C[2])
    CA.kelp(c, 70, 96, 762, base=GROUND - 1, n=2, hmax=50)
    CA.kelp(c, 290, 300, 763, base=GROUND - 1, n=1, hmax=40)
    ground_zone(c, R)
    side_vignette(c)
    return c


def mid_IV():
    R = ST['IV']
    c = blank(W, H)
    for x0 in (12, 588):
        for y in range(52, 340):
            for i in range(40):
                t = [4, 9, 10, 8, 7, 9, 8, 7, 8, 7, 6, 8, 7, 6, 7, 6, 6, 7, 6, 5, 6, 6, 5, 6, 5, 5, 5, 5, 4, 5, 4, 4, 4, 4, 3, 4, 3, 3, 3, 2][i]
                col = R[t]
                if tnoise(x0 + i, y, 770, 4) > 0.84:
                    col = R[max(0, t - 1)]
                c.p(x0 + i, y, col)
        for y in range(28, 52):
            hw = 26 if y < 36 else 22
            for x in range(x0 + 20 - hw, x0 + 20 + hw):
                lx = x - (x0 + 20 - hw)
                col = R[11] if y == 28 else (R[8] if lx < hw else R[6])
                if y in (35, 51):
                    col = R[3]
                c.p(x, y, col)
        for k in range(30):
            x = x0 + int(hsh(k, 0, 771 + x0) * 40)
            y = 36 + int(hsh(k, 1, 771 + x0) * 22)
            c.p(x, y, KELP[2 + k % 3] if k % 2 else ST['IV'][1])
    c.outline(R[1])
    return c


# ── Ato V ────────────────────────────────────────────────────────────────

def spires(c, R, seed):
    """Agulhas de rocha em silhueta: perfil irregular, saliências, e a borda da esquerda
    em brasa (a luz das fornalhas vem de baixo)."""
    peaks = []
    for k in range(22):
        x = int(hsh(k, 0, seed) * W)
        h = 50 + int(hsh(k, 1, seed) * 130)
        w = 30 + int(hsh(k, 2, seed) * 50)
        peaks.append((h, x, w, k))
    peaks.sort()
    for (h, px, w, k) in peaks:
        top = GROUND - h
        tone = 3 + (k % 3)
        lean = (hsh(k, 3, seed) - 0.5) * 0.5
        for y in range(top, GROUND):
            t = (y - top) / h
            jag_l = 3 * (tnoise(y, k, seed + 1, 7) - 0.5) + (2 if (y // 9) % 3 == 0 else 0)
            jag_r = 3 * (tnoise(y, k, seed + 2, 7) - 0.5)
            half = w / 2 * t
            cx = px + lean * (GROUND - y) * 0.3
            xl, xr = int(cx - half + jag_l), int(cx + half + jag_r)
            for x in range(xl, xr + 1):
                lx = (x - xl) / max(1, xr - xl)
                col = R[tone + 1] if lx < 0.3 else R[tone]
                if lx > 0.72:
                    col = R[tone - 1]
                if (y - top) % 23 == 11 and lx > 0.2:
                    col = R[tone - 1]
                if x <= xl + 1:
                    col = LAVA[3] if (hsh(y, k, seed) < 0.55 + t * 0.3) else LAVA[2]
                    if t > 0.7 and x == xl:
                        col = LAVA[4]
                put(c, x, y, col)


def back_V():
    R = ST['V']
    c = blank(W, H)
    for y in range(GROUND):
        for x in range(W):
            t = y / GROUND
            col = stepped([R[0], R[1], R[2], R[3]], t * 0.9, x, y)
            c.p(x, y, col)
    # Brilho vermelho atrás das agulhas.
    fog(c, 120, 210, LAVA[1], 0.0, 0.26, period=P, seed=780, wisps=0.5)
    spires(c, R, 781)
    for (x, L) in ((140, 96), (240, 40), (500, 70)):
        chain_v(c, x, 0, L, IRON2, big=True)
    CA.furnace(c, 58, 128, 52, GROUND - 4, R, 782)
    CA.furnace(c, 582, 128, 52, GROUND - 4, R, 783)
    ground_zone(c, R)
    for k in range(40):
        x = int(hsh(k, 0, 784) * W)
        put(c, x, GROUND + 2 + int(hsh(k, 1, 784) * 6), LAVA[4] if k % 3 else LAVA[5])
    side_vignette(c)
    return c


def heavy_links(c, x, y0, y1, R=IRON2):
    """Corrente grossa de elos quadrados (de frente e de lado)."""
    y, k = y0, 0
    while y < y1:
        if k % 2 == 0:
            for dy in range(12):
                for dx in range(12):
                    if 2 < dx < 9 and 2 < dy < 9:
                        continue
                    if y + dy >= y1:
                        continue
                    col = R[5] if (dx < 2 or dy < 2) else (R[3] if dx < 9 and dy < 9 else R[2])
                    put(c, x - 6 + dx, y + dy, col)
            y += 10
        else:
            for dy in range(8):
                for dx in range(4):
                    if y + dy < y1:
                        put(c, x - 2 + dx, y + dy, R[4] if dx < 2 else R[2])
            y += 6
        k += 1


def mid_V():
    c = blank(W, H)
    for x in (12, 628):
        heavy_links(c, x, 0, 300)
    for k in range(40):
        x = int(hsh(k, 0, 790) * W)
        c.p(x, 300 + (k % 2), LAVA[4] if k % 3 else LAVA[2])
    c.outline(OL)
    return c


# ── Ato VI ───────────────────────────────────────────────────────────────

def heart(c, cx, cy, R):
    """O coração pendurado no alto: dois lobos de carne escura com veias e brilho."""
    for y in range(int(cy - 44), int(cy + 40)):
        for x in range(int(cx - 64), int(cx + 64)):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            l1 = ((dx + 26) / 34) ** 2 + (dy / 38) ** 2
            l2 = ((dx - 26) / 34) ** 2 + (dy / 38) ** 2
            if min(l1, l2) > 1:
                continue
            nx = (dx + 26) / 34 if l1 < l2 else (dx - 26) / 34
            lit = -nx * 0.6 - dy / 38 * 0.6
            tone = 11 if lit > 0.55 else (10 if lit > 0.2 else (8 if lit > -0.2 else 7))
            if tnoise(x, y, 800, 6) > 0.72:
                tone += 1
            if ((dx * 0.7 + dy) % 13) < 1.2 and lit > -0.1:
                tone += 2  # facetas
            col = R[min(14, tone)]
            if abs(dx) < 1.5 and dy > -30:
                col = R[2]
            put(c, x, y, col)
    # Vasos que sobem do alto.
    for vx in (cx - 18, cx + 18):
        for y in range(0, int(cy - 30)):
            put(c, vx, y, VEIN[1])
            put(c, vx + 1, y, VEIN[0])
    glow(c, cx, cy, 90, FLESH[1], 0.1)


def roots(c, x0, y0, seed, depth=4, length=22, ang=math.pi / 2, spread=0.6):
    if depth == 0:
        return
    x, y = x0, y0
    for i in range(length):
        x += math.cos(ang) + (hsh(i, depth, seed) - 0.5) * 0.8
        y += math.sin(ang)
        put(c, x, y, VEIN[3] if i % 3 else VEIN[2])
        put(c, x + 1, y, VEIN[1])
    roots(c, x, y, seed + 1, depth - 1, int(length * 0.8), ang - spread * (0.6 + hsh(depth, 1, seed) * 0.6), spread)
    if hsh(depth, 2, seed) < 0.7:
        roots(c, x, y, seed + 2, depth - 1, int(length * 0.7), ang + spread * (0.6 + hsh(depth, 3, seed) * 0.6), spread)


def rib_lines(c, side, seed):
    """Costelas nas laterais: arcos de contas de osso rosado, mais claras na ponta."""
    for k in range(5):
        y0 = 40 + k * 36
        for i in range(0, 104):
            t = i / 104
            x = i if side < 0 else W - 1 - i
            y = y0 + int(46 * t * t + 6 * t)
            bead = (i // 3) % 2
            if i < 12:
                col = VEIN[1]
            else:
                col = BONE_VI[3] if (bead and t > 0.5) else (VEIN[3] if bead else VEIN[2])
            put(c, x, y, col)
            put(c, x, y + 1, VEIN[1] if bead else VEIN[0])


def back_VI():
    R = ST['VI']
    c = blank(W, H)
    for y in range(GROUND):
        for x in range(W):
            c.p(x, y, stepped([R[0], R[1], R[2], R[3], R[4]], (y / GROUND) ** 1.2 * 0.85, x, y))
    for k in range(60):
        x = int(hsh(k, 0, 810) * W)
        y = int(hsh(k, 1, 810) * 200)
        put(c, x, y, R[6] if k % 3 else FLESH[3])
    heart(c, 322, 34, R)
    roots(c, 290, 64, 811, depth=4, length=24, ang=math.pi * 0.62)
    roots(c, 354, 64, 812, depth=4, length=24, ang=math.pi * 0.38)
    roots(c, 250, 80, 813, depth=3, length=18, ang=math.pi * 0.7)
    roots(c, 396, 80, 814, depth=3, length=18, ang=math.pi * 0.3)
    rib_lines(c, -1, 815)
    rib_lines(c, 1, 816)
    CA.eye(c, 60, 138, rx=12, ry=6, R=R, veins=False)
    for (x, y) in ((200, 28), (460, 30), (130, 104), (500, 120)):
        put(c, x, y, EMPH['VI'][2])
        put(c, x + 3, y, EMPH['VI'][2])
    fog(c, 180, GROUND, FLESH[1], 0.0, 0.45, period=P, seed=817, wisps=0.4)
    ground_zone(c, R, idx=6)
    side_vignette(c)
    return c


def mid_VI():
    """Costelas escuras subindo dos cantos de baixo (contas grossas)."""
    R = ST['VI']
    c = blank(W, H)
    for side in (-1, 1):
        for k in range(4):
            p0 = (6 + 10 * k, 324)
            p1 = (40 + 10 * k, 214)
            p2 = (96 + 10 * k, 172 + 2 * k)
            n = 220
            for i in range(n):
                t = i / (n - 1)
                x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
                y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
                if t < 0.4 and (i // 5) % 2 == 1:
                    continue  # contas soltas embaixo
                for (dx, dy, col) in ((0, 0, R[5]), (1, 0, R[1]), (0, 1, R[1]), (1, 1, R[0]), (2, 1, R[0]), (1, 2, R[0])):
                    xx = int(x) + dx if side < 0 else W - 1 - int(x) - dx
                    if c.g(xx, int(y) + dy) is None or col != R[0]:
                        put(c, xx, int(y) + dy, col)
    return c


# ── Primeiro plano da arena ──────────────────────────────────────────────

def fore_arena(act, deco=None):
    """Montes de pedregulho nos cantos e uma faixa baixa de entulho (repete na horizontal:
    o monte da direita continua no da esquerda)."""
    from abismo32_base import boulder_pile
    R = ST[act]
    c = blank(W, 128)
    prof = []
    for x in range(W):
        h = 7 + 4 * tnoise(x, 0, 830, 24, P) + 2 * tnoise(x, 1, 833, 5, P)
        prof.append(int(h))
    # Faixa baixa: cascalho miúdo.
    for x in range(W):
        top = 128 - prof[x]
        for y in range(top, 128):
            n = hsh(x // 3, y // 2, 834)
            t = 3 if n > 0.4 else 2
            if y == top:
                t = 5
            elif y == top + 1:
                t = 4
            t -= int((y - top) / 10)
            put(c, x, y, R[max(0, t)], P)
    for (cx, top, w, sd) in ((-2, 56, 116, 1), (62, 84, 60, 2), (236, 104, 40, 3), (572, 86, 60, 4), (630, 50, 112, 5)):
        boulder_pile(c, cx, top, w, R, seed=840 + sd, base=3, period=P, bottom=128, rmin=5, rmax=11)
    prof = [0] * W
    for x in range(W):
        for y in range(128):
            if c.g(x, y) is not None:
                prof[x] = 128 - y
                break
    if deco:
        deco(c, R, prof)
    return c


def fore_deco_I(c, R, prof):
    for (x, k) in ((40, 0), (64, 1), (590, 2)):
        skull(c, x, 128 - prof[x] - 8, [mul(b, 0.55) for b in BONE])


def fore_deco_II(c, R, prof):
    for i in range(120):
        x = int(i * 0.98)
        y = 36 + int(i * 0.7)
        put(c, x, y, WOOD2[3])
        put(c, x, y + 1, WOOD2[2])
        put(c, x, y + 2, WOOD2[0])


def fore_deco_III(c, R, prof):
    for (cx, cy, w) in ((48, 50, 90), (612, 40, 96)):
        for y in range(cy + 4, 128 - prof[cx] + 6):
            for i in range(-3, 4):
                put(c, cx + i, y, R[2] if i < 1 else R[1], P)
        for y in range(cy - 12, cy + 8):
            for x in range(cx - w // 2, cx + w // 2):
                dx = (x - cx) / (w / 2)
                top = cy - 12 * (1 - dx * dx) ** 0.5
                if y < top:
                    continue
                col = R[3] if y < cy + 4 else R[1]
                if y == cy + 5 and x % 6 == 0:
                    col = SPORE[3]
                if y < top + 1.5:
                    col = R[5]
                put(c, x, y, col, P)


def fore_deco_IV(c, R, prof):
    for x0 in (8, 560):
        CA.kelp(c, x0, x0 + 60, 840 + x0, base=128 - prof[x0 + 30] + 4, n=4, hmax=30)


def fore_deco_V(c, R, prof):
    """Bigorna velha de pedra sobre o monte da esquerda e brasas no entulho."""
    base = 128 - max(prof[14:46]) + 3
    for y in range(base - 34, base - 26):
        for x in range(4, 56):
            col = R[8] if y == base - 34 else (R[6] if x < 30 else R[4])
            if y == base - 27:
                col = R[2]
            put(c, x, y, col)
    for y in range(base - 26, base):
        for x in range(14, 46):
            put(c, x, y, R[5] if x < 20 else (R[4] if x < 34 else R[2]))
    for k in range(16):
        x = int(hsh(k, 0, 850) * W)
        put(c, x, 128 - prof[x] + 2 + int(hsh(k, 1, 850) * 8), LAVA[4], P)


def fore_deco_VI(c, R, prof):
    for (x, y) in ((180, 72), (440, 76)):
        for (dx, col) in ((0, EMPH['VI'][2]), (1, EMPH['VI'][1]), (5, EMPH['VI'][2]), (6, EMPH['VI'][1])):
            put(c, x + dx, y, col)


# ── Profundidade (paleta DL) ─────────────────────────────────────────────

def dl(i):
    return DL[max(0, min(len(DL) - 1, i))]


def depth_entrance():
    c = blank(W, H)
    # Escada que desce da esquerda.
    for k in range(9):
        sx, sy = 0, 144 + k * 14
        x1 = 24 + k * 16
        for y in range(sy, sy + 14):
            for x in range(sx, x1):
                ly = y - sy
                col = dl(4) if ly == 0 else (dl(3) if ly < 3 else dl(2))
                if x == x1 - 1:
                    col = dl(1)
                c.p(x, y, col)
    # Tochas apagadas na parede.
    for tx in (152, 492):
        for y in range(164, 178):
            c.p(tx, y, dl(3))
            c.p(tx + 1, y, dl(1))
        for x in range(tx - 3, tx + 5):
            c.p(x, 164, dl(4))
            c.p(x, 165, dl(2))
    # Arco de entrada à direita.
    cx, top, w, bottom = 572, 132, 96, 300
    r = w / 2
    for y in range(top - 6, bottom):
        for x in range(int(cx - r - 6), int(cx + r + 7)):
            dx = x + 0.5 - cx
            d = math.hypot(dx, y + 0.5 - (top + r)) if y + 0.5 < top + r else abs(dx)
            if r - 14 <= d <= r:
                col = dl(4) if (d < r - 12 or (dx < 0 and y < top + r)) else dl(2)
                c.p(x, y, col)
    # Névoa baixa em degraus.
    for y in range(252, 336):
        t = max(0.0, 1 - abs(y - 274) / 36) if y < 274 else max(0.0, 1 - (y - 274) / 62)
        for x in range(W):
            n = tnoise(x, y * 4, 860, 40, P)
            k = t * (0.25 + 0.45 * n)
            if k > bayer(x, y) + 0.04:
                c.p(x, y, dl(10) if k > 0.5 else (dl(8) if k > 0.3 else dl(6)))
    return c


def depth_descent():
    c = blank(W, H)
    for (x, L) in ((30, 110), (96, 96), (200, 30), (440, 34), (520, 110), (560, 90), (604, 116)):
        chain_v(c, x, 0, L, [dl(0), dl(1), dl(2), dl(3), dl(5), dl(6), dl(8)], big=True)
    for (x0, y0, x1, y1) in ((0, 92, 112, 20), (524, 20, 640, 96)):
        n = int(max(abs(x1 - x0), abs(y1 - y0)))
        for i in range(n):
            x = x0 + (x1 - x0) * i / n
            y = y0 + (y1 - y0) * i / n
            for k, col in enumerate((dl(5), dl(3), dl(1))):
                c.p(int(x), int(y) + k, col)
    for k in range(16):
        x = int(hsh(k, 0, 870) * W)
        hgt = 3 + int(hsh(k, 1, 870) * 4)
        for dy in range(hgt):
            for dx in range(-dy, dy + 1):
                c.p(x + dx, 246 - hgt + dy, dl(6) if dx < 0 else (dl(4) if dx < dy else dl(2)))
    for x0 in (40, 300, 520):
        for x in range(x0, x0 + 44):
            c.p(x, 256, dl(12) if (x - x0) % 7 else dl(10))
            c.p(x, 257, dl(8))
    return c


def depth_core():
    c = blank(W, H)
    for (x, y, L, s) in ((24, 40, 40, 1), (124, 120, 46, 2), (64, 190, 42, 3), (600, 50, 44, 4), (556, 130, 48, 5), (590, 210, 40, 6)):
        drift = 0.25 if x < 320 else -0.25
        xx = x
        for i in range(L):
            put(c, xx, y + i, dl(12))
            put(c, xx + 1, y + i, dl(8))
            r = hsh(i, 1, s) + drift
            xx += 1 if r > 0.6 else (-1 if r < 0.35 else 0)
    for k in range(60):
        x = int(hsh(k, 0, 880) * W)
        y = 10 + int(hsh(k, 1, 880) * 240)
        c.p(x, y, dl(6) if k % 3 else dl(10))
    for side in (-1, 1):
        for y in range(256, H):
            t = (y - 256) / 128
            w = int(40 + 70 * t + 12 * tnoise(y, side, 881, 10))
            for i in range(w):
                x = i if side < 0 else W - 1 - i
                c.p(x, y, dl(0))
    return c


def depth_boss():
    c = blank(W, H)
    # Arco grande do salão do chefe.
    cx, top, r = 320, 24, 196
    for y in range(top - 2, 300):
        for x in range(cx - r - 10, cx + r + 10):
            dx = x + 0.5 - cx
            d = math.hypot(dx, y + 0.5 - (top + r)) if y + 0.5 < top + r else abs(dx)
            if r - 8 <= d <= r:
                ang = math.atan2(y + 0.5 - (top + r), dx)
                seg = int((ang + math.pi) / (math.pi / 30))
                col = dl(3) if seg % 2 else dl(2)
                if d > r - 1.5:
                    col = dl(5)
                ang_deg = math.degrees(ang) % 6
                if ang_deg < 1.0 and d < r - 2:
                    col = dl(6)
                c.p(x, y, col)
    # Estátuas/pilares com topo arredondado e bases de braseiro.
    for px in (52, 588):
        for y in range(104, 300):
            for x in range(px - 16, px + 16):
                dx = x - px
                if y < 120 and dx * dx + (y - 120) ** 2 > 256:
                    continue
                col = dl(2) if dx < -8 else (dl(1) if dx < 8 else dl(0))
                if dx == -16 or (y < 120 and dx * dx + (y - 120) ** 2 > 220):
                    col = dl(4)
                c.p(x, y, col)
        for ex in (px - 5, px + 3):
            c.p(ex, 114, dl(12))
            c.p(ex + 1, 114, dl(10))
        for y in range(278, 300):
            for x in range(px - 20, px + 20):
                c.p(x, y, dl(4) if y == 278 else dl(3))
    for bx in (92, 548):
        for x in range(bx - 12, bx + 12):
            c.p(x, 264, dl(5))
            c.p(x, 265, dl(3))
            c.p(x, 266, dl(3))
        for y in range(267, 300):
            c.p(bx - 1, y, dl(3))
            c.p(bx, y, dl(2))
        for x in range(bx - 8, bx + 8):
            c.p(x, 296, dl(4))
    return c


DEPTHS = {'entrance': depth_entrance, 'descent': depth_descent, 'core': depth_core, 'boss': depth_boss}
FLOOR_DEPTH = {1: 'entrance', 2: 'descent', 3: 'core', 4: 'boss'}
DARKEN = {1: 1.0, 2: 0.9, 3: 0.8, 4: 0.7}


def compose_floor(act, n, back_img, depth_img):
    """Fundo pronto do andar: o fundo do ato escurecido (mais nos cantos e embaixo) e a
    profundidade tingida com a rampa do ato (andares fundos descem um degrau)."""
    out = back_img.copy().convert('RGBA')
    po = out.load()
    pd = depth_img.load()
    k0 = DARKEN[n]
    for y in range(H):
        for x in range(W):
            r, g, b, a = po[x, y]
            k = k0
            if n > 1:
                edge = min(x, W - 1 - x) / 120
                k *= 0.92 + 0.08 * min(1.0, edge)
                if y < 40:
                    k = min(1.0, k + 0.06 * (1 - y / 40))
            if k < 1:
                po[x, y] = (round(r * k), round(g * k), round(b * k), 255)
            d = pd[x, y]
            if d[3]:
                lum = sum(d[:3]) / 3
                shift = 0 if n <= 2 or lum > 60 else 2
                col = dl_to_act(d[:3], act, shift)
                po[x, y] = col + (255,)
    return out


def pieces():
    reg = {}
    backs = {'I': back_I, 'II': back_II, 'III': back_III, 'IV': back_IV, 'V': back_V, 'VI': back_VI}
    mids = {'I': mid_I, 'II': mid_II, 'III': mid_III, 'IV': mid_IV, 'V': mid_V, 'VI': mid_VI}
    decos = {'I': fore_deco_I, 'II': fore_deco_II, 'III': fore_deco_III, 'IV': fore_deco_IV, 'V': fore_deco_V, 'VI': fore_deco_VI}
    cache = {}

    def back_of(act):
        if act not in cache:
            cache[act] = backs[act]().image()
        return cache[act]

    def depth_of(name):
        key = 'depth:' + name
        if key not in cache:
            cache[key] = DEPTHS[name]().image()
        return cache[key]

    for name in DEPTHS:
        reg[f'arena/depth/{name}'] = (lambda nm=name: depth_of(nm))
    for act in ROMANS:
        reg[f'arena/{act}/back'] = (lambda a=act: back_of(a))
        reg[f'arena/{act}/mid'] = mids[act]
        reg[f'arena/{act}/fore'] = (lambda a=act: fore_arena(a, decos[a]))
        floor_fn = COR.act_pieces(act)['floor']
        reg[f'arena/{act}/floor'] = floor_fn
        for n in (1, 2, 3, 4):
            reg[f'arena/{act}/back-{n}'] = (lambda a=act, k=n: compose_floor(a, k, back_of(a), depth_of(FLOOR_DEPTH[k])))
    return reg
