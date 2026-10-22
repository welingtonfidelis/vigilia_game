"""Modelos detalhados 48x64 (idle de 4 quadros) no estilo do Sentinela HD.

Volumes sombreados por uma normal aproximada (luz de cima-esquerda), peças contornadas uma a uma,
o tronco e a cabeça respiram 1 px. Escala só inteira na tela.
"""
import math

from lib import C, PAL, hsh

W, H = 48, 64

PAL.update({
    's4': (198, 206, 214), 's3': (158, 168, 180), 's2': (116, 126, 138), 's1': (80, 88, 102), 's0': (48, 52, 64),
    'g3': (255, 226, 122), 'g2': (233, 185, 73), 'g1': (176, 124, 46), 'g0': (112, 72, 30),
    'r3': (204, 76, 70), 'r2': (164, 48, 50), 'r1': (118, 30, 38), 'r0': (74, 18, 28),
    'k0': (120, 72, 52), 'k1': (176, 120, 88), 'k2': (220, 166, 126), 'k3': (240, 200, 160),
    'kd0': (66, 40, 28), 'kd1': (108, 70, 48), 'kd2': (150, 100, 70), 'kd3': (184, 132, 96),
    'hr0': (90, 30, 20), 'hr1': (140, 50, 30), 'hr2': (190, 82, 44), 'hr3': (226, 128, 70),
    'hb0': (120, 84, 36), 'hb1': (176, 132, 60), 'hb2': (220, 180, 96), 'hb3': (246, 222, 150),
    'hn0': (44, 28, 18), 'hn1': (78, 50, 30), 'hn2': (116, 78, 44), 'hn3': (150, 106, 64),
    'bk0': (14, 12, 14), 'bk1': (34, 30, 34), 'bk2': (58, 52, 58), 'bk3': (84, 78, 84),
    'wh0': (130, 130, 138), 'wh1': (180, 182, 190), 'wh2': (222, 224, 228), 'wh3': (250, 250, 250),
    'fu0': (48, 38, 32), 'fu1': (84, 70, 58), 'fu2': (124, 108, 90), 'fu3': (168, 152, 128),
    'le0': (52, 34, 22), 'le1': (88, 60, 38), 'le2': (124, 88, 54), 'le3': (160, 120, 76),
    'wo0': (46, 30, 20), 'wo1': (82, 56, 36), 'wo2': (122, 86, 54), 'wo3': (150, 112, 72),
    'b0': (24, 34, 64), 'b1': (40, 60, 104), 'b2': (62, 92, 150), 'b3': (100, 136, 198),
    'v0': (30, 48, 32), 'v1': (50, 78, 48), 'v2': (78, 112, 66), 'v3': (112, 146, 88),
    'n0': (130, 118, 98), 'n1': (180, 168, 144), 'n2': (218, 208, 186), 'n3': (244, 238, 222),
    'p0': (34, 24, 46), 'p1': (60, 44, 80), 'p2': (92, 72, 118), 'p3': (128, 104, 156),
    'f0': (150, 40, 20), 'f1': (230, 96, 30), 'f2': (255, 170, 60), 'f3': (255, 236, 170),
})

STEEL = ['s0', 's1', 's2', 's3', 's4']
GOLD = ['g0', 'g1', 'g2', 'g3']
RED = ['r0', 'r1', 'r2', 'r3']
SKIN = ['k0', 'k1', 'k2', 'k3']
SKIND = ['kd0', 'kd1', 'kd2', 'kd3']
HAIR = {'red': ['hr0', 'hr1', 'hr2', 'hr3'], 'blond': ['hb0', 'hb1', 'hb2', 'hb3'], 'brown': ['hn0', 'hn1', 'hn2', 'hn3'],
        'black': ['bk0', 'bk1', 'bk2', 'bk3'], 'white': ['wh0', 'wh1', 'wh2', 'wh3']}
FUR = ['fu0', 'fu1', 'fu2', 'fu3']
LEATHER = ['le0', 'le1', 'le2', 'le3']
WOOD = ['wo0', 'wo1', 'wo2', 'wo3']
BLUE = ['b0', 'b1', 'b2', 'b3']
GREEN = ['v0', 'v1', 'v2', 'v3']
LINEN = ['n0', 'n1', 'n2', 'n3']
PURPLE = ['p0', 'p1', 'p2', 'p3']
FIRE = ['f0', 'f1', 'f2', 'f3']


def shade(c, mask, pal, lx=-0.6, ly=-0.8, spec=True):
    if not mask:
        return
    xs = [p[0] for p in mask]; ys = [p[1] for p in mask]
    cx = (min(xs) + max(xs)) / 2; cy = (min(ys) + max(ys)) / 2
    rx = max(1, (max(xs) - min(xs)) / 2); ry = max(1, (max(ys) - min(ys)) / 2)
    n = len(pal)
    for (x, y) in mask:
        nx = (x - cx) / rx; ny = (y - cy) / ry
        v = -(nx * lx + ny * ly) * 0.7 + 0.15
        i = max(0, min(n - 1, int((v + 1) / 2 * n + 0.15)))
        if not spec and i == n - 1:
            i = n - 2
        c.p(x, y, pal[i])


def ell(cx, cy, rx, ry):
    return [(x, y) for y in range(int(cy - ry), int(cy + ry) + 1) for x in range(int(cx - rx), int(cx + rx) + 1)
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0]


def rect(x0, y0, w, h):
    return [(x, y) for y in range(y0, y0 + h) for x in range(x0, x0 + w)]


def trap(y0, y1, l0, r0, l1, r1):
    """trapézio de y0 a y1, bordas interpoladas."""
    pts = []
    for y in range(y0, y1 + 1):
        k = (y - y0) / max(1, y1 - y0)
        a = round(l0 + (l1 - l0) * k); b = round(r0 + (r1 - r0) * k)
        pts += [(x, y) for x in range(a, b + 1)]
    return pts


def part(fn, t):
    p = C(W, H)
    fn(p, t)
    p.outline()
    return p


def compose(layers, t):
    bob = [0, 0, 1, 1][t]
    out = C(W, H)
    for fn, up in layers:
        out.paste(part(fn, t), 0, bob if up else 0)
    return out


# ── peças ────────────────────────────────────────────────────────────────

def legs_hd(c, pal, boot, x0s=(16, 26), top=42, knee=None):
    for x0 in x0s:
        shade(c, rect(x0, top, 7, 11), pal)
        shade(c, rect(x0, top + 11, 7, 6), pal)
        if knee:
            shade(c, ell(x0 + 3, top + 11, 4, 2.5), knee)
        shade(c, rect(x0 - 1, 59, 9, 4), boot, spec=False)
        c.hl(x0 - 1, 62, 9, boot[0])


def face_hd(c, skin, cx=24, top=8, w=13, h=15, eyes=True, hurt=False):
    pts = ell(cx, top + h / 2, w / 2, h / 2)
    shade(c, pts, skin, spec=False)
    ey = top + 8
    if eyes:
        for ex in (cx - 4, cx + 3):
            c.hl(ex - 1, ey - 2, 3, skin[0])                                # sobrancelha
            c.p(ex, ey, 'noite'); c.p(ex - 1, ey, 'white' if not hurt else 'noite')
    c.vl(cx, ey + 1, 3, skin[1]); c.p(cx + 1, ey + 3, skin[0])          # nariz
    c.hl(cx - 2, ey + 5, 5, skin[0])                                      # boca
    return ey


def arm_hd(c, side, sleeve, hand, top=27, cuff=None):
    x0 = 9 if side == 'l' else 33
    shade(c, rect(x0, top, 7, 9), sleeve)
    shade(c, rect(x0, top + 9, 7, 8), sleeve)
    c.hl(x0, top + 8, 7, sleeve[0])
    if cuff:
        shade(c, rect(x0, top + 15, 7, 3), cuff, spec=False)
    shade(c, ell(x0 + 3, top + 20, 3.6, 3), hand, spec=False)
    return x0 + 3, top + 20


# ── Guardiã (o Sentinela de trança) ──────────────────────────────────────

def guardiao_f():
    L = []

    def cape(c, t):
        for y in range(22, 63):
            k = (y - 22) / 40
            l = round(7 - k * 4); r = round(41 + k * 4)
            for x in range(l, r + 1):
                fold = math.sin(x * 0.55 + y * 0.03)
                c.p(x, y, 'r0' if x <= l + 1 else ('r2' if fold > 0.55 else ('r0' if fold < -0.6 else 'r1')))
        for x in range(3, 46):
            if hsh(x, 0, 3) < 0.4:
                c.p(x, 62, None)
    L.append((cape, False))

    def legs(c, t):
        for x0 in (16, 26):
            shade(c, rect(x0, 42, 6, 11), STEEL)
            shade(c, rect(x0, 54, 6, 6), STEEL)
            shade(c, ell(x0 + 3, 53, 3.6, 2.4), GOLD)
            shade(c, rect(x0 - 1, 60, 8, 3), STEEL, spec=False)
            c.hl(x0 - 1, 62, 8, 's0'); c.hl(x0, 60, 6, 's3')
    L.append((legs, False))

    def mace(c, t):
        c.vl(11, 42, 10, 'wo1'); c.vl(12, 42, 10, 'wo0')
        c.hl(10, 50, 4, 'g1')
        shade(c, ell(11.5, 55.5, 4.2, 4.2), STEEL)
        for (x, y) in ((6, 55), (6, 56), (17, 55), (17, 56), (11, 50), (12, 50), (11, 61), (12, 61)):
            c.p(x, y, 's1' if x > 11 or y > 58 else 's3')
    L.append((mace, True))

    def torso(c, t):
        shade(c, trap(22, 36, 17, 31, 18, 30), STEEL)
        c.vl(24, 23, 13, 's4'); c.vl(25, 23, 13, 's1')
        c.hl(18, 28, 13, 's1')
        c.hl(17, 35, 15, 'g2'); c.hl(17, 36, 15, 'g1')
        c.hl(17, 37, 15, 'le1'); c.r(23, 37, 3, 1, 'g3')
        for i, y in enumerate((38, 41)):
            shade(c, rect(16 + i, y, 17 - 2 * i, 3), STEEL, spec=False)
            c.hl(16 + i, y + 2, 17 - 2 * i, 'g1')
        for y in range(38, 49):
            w = 3 if y < 46 else 2
            c.hl(24 - w, y, 2 * w + 1, 'r2'); c.p(24 - w, y, 'r3'); c.p(24 + w, y, 'r1')
        c.vl(24, 39, 7, 'g2')
    L.append((torso, True))

    def arm(c, t):
        shade(c, rect(10, 28, 6, 7), STEEL)
        shade(c, rect(10, 35, 6, 7), STEEL)
        c.hl(10, 34, 6, 's0'); c.hl(10, 40, 6, 'g1')
        shade(c, ell(12.5, 44, 3.4, 2.8), STEEL, spec=False)
    L.append((arm, True))

    def pauldrons(c, t):
        for cx in (13, 35):
            shade(c, ell(cx, 29, 5.6, 2.4), STEEL, spec=False)
            dome = ell(cx, 24.5, 6.4, 4.4)
            shade(c, dome, STEEL)
            for (x, y) in dome:
                if y == 28:
                    c.p(x, y, 'g2')
    L.append((pauldrons, True))

    def braid(c, t):
        for y in range(18, 46):
            sx = 13 + round(math.sin(y * 0.25) * 0.6)
            for d in range(4):
                c.p(sx + d, y, ['hb1', 'hb2', 'hb3', 'hb1'][(d + y // 2) % 4] if (y + d) % 4 else 'hb0')
        shade(c, rect(13, 46, 4, 2), RED); c.r(14, 48, 2, 3, 'hb2')
    L.append((braid, True))

    def crest(c, t):
        path = []
        for i in range(60):
            k = i / 59
            path.append((25 + k * 15, 6.5 - math.sin(k * 2.4) * 4.5 + k * k * 18, 3.8 - k * 2.4))
        for (x, y, r) in path:
            c.disk(x, y, r, 'g0')
        for (x, y, r) in path:
            c.disk(x - 0.4, y - 0.4, r * 0.75, 'g1')
        for (x, y, r) in path:
            c.disk(x - 0.8, y - 0.8, r * 0.45, 'g2')
    L.append((crest, True))

    def helm(c, t):
        pts = rect(18, 8, 13, 12) + [p for p in ell(24.5, 8.5, 6.5, 3.5) if p[1] < 9]
        shade(c, pts, STEEL)
        c.hl(18, 13, 13, 'g2'); c.hl(18, 14, 13, 'noite'); c.hl(18, 15, 13, 'g1')
        c.vl(24, 5, 8, 'g2'); c.vl(24, 16, 4, 'g2')
        for (x, y) in ((27, 17), (29, 17), (28, 18)):
            c.p(x, y, 's0')
        c.hl(19, 20, 11, 'g2'); c.hl(19, 21, 11, 'g1')
    L.append((helm, True))

    def shield(c, t):
        pts = []
        for y in range(27, 52):
            k = (y - 27) / 24
            hw = 7 if k < 0.45 else 7 * math.sqrt(max(0, 1 - ((k - 0.45) / 0.55) ** 2))
            pts += [(x, y) for x in range(round(37 - hw), round(37 + hw) + 1)]
        shade(c, pts, RED)
        rows = {}
        for (x, y) in pts:
            rows.setdefault(y, []).append(x)
        for y, xs in rows.items():
            c.p(min(xs), y, 's3'); c.p(max(xs), y, 's1')
        c.hl(30, 27, 15, 's4')
        for (y, x0, x1) in ((34, 34, 40), (35, 32, 42), (36, 31, 43), (37, 32, 42), (38, 34, 40)):
            c.hl(x0, y, x1 - x0 + 1, 'g2')
        for (x, y) in ((36, 35), (37, 35), (36, 36), (37, 36), (36, 37), (37, 37), (35, 36), (38, 36)):
            c.p(x, y, 'ember')
        c.vl(37, 35, 3, 'noite')
    L.append((shield, True))
    return L


# ── Selvagem ─────────────────────────────────────────────────────────────

def selvagem(g):
    hair = HAIR['red' if g == 'm' else 'blond']
    L = []

    def axe(c, t):
        shade(c, rect(39, 10, 3, 50), WOOD)
        for y in (24, 27, 30):
            c.hl(39, y, 3, 'le1')
        blade = []
        for y in range(4, 25):
            k = (y - 14) / 10
            w = round(7 * math.sqrt(max(0, 1 - k * k)))
            blade += [(x, y) for x in range(42, 42 + w + 1)]
        shade(c, blade, STEEL)
        for y in range(5, 24):
            xs = [x for (x, yy) in blade if yy == y]
            if xs:
                c.p(max(xs), y, 's4')
        shade(c, rect(34, 9, 5, 6), STEEL, spec=False)
        c.p(40, 8, 's3'); c.p(40, 7, 's3')
    L.append((axe, True))

    def legs(c, t):
        legs_hd(c, LEATHER, FUR, top=44)
        for x0 in (16, 26):
            c.hl(x0, 50, 7, 'le0'); c.hl(x0, 55, 7, 'le0')
            shade(c, rect(x0 - 1, 57, 9, 3), FUR, spec=False)
    L.append((legs, False))

    def kilt(c, t):
        pts = trap(38, 47, 15, 33, 13, 35)
        shade(c, pts, FUR, spec=False)
        for x in range(13, 36, 3):
            c.p(x, 47, None); c.p(x + 1, 46, 'fu0')
        c.hl(15, 38, 19, 'le1'); c.hl(15, 39, 19, 'le0')
        shade(c, ell(24, 38.5, 2.6, 1.6), ['n0', 'n1', 'n2', 'n3'])
    L.append((kilt, True))

    def torso(c, t):
        skin = SKIN
        shade(c, trap(24, 38, 15, 33, 17, 31), skin)
        c.hl(18, 31, 5, 'k1'); c.hl(26, 31, 5, 'k1')                         # peitorais
        c.vl(24, 32, 6, 'k1'); c.hl(21, 34, 2, 'k1'); c.hl(26, 34, 2, 'k1'); c.hl(21, 36, 2, 'k1'); c.hl(26, 36, 2, 'k1')
        if g == 'm':
            for k in range(7):                                                # pintura de guerra
                c.p(18 + k, 27 + k, 'b2'); c.p(19 + k, 27 + k, 'b1')
        else:
            shade(c, trap(26, 32, 17, 31, 17, 31), FUR, spec=False)
            c.hl(17, 32, 15, 'fu0')
    L.append((torso, True))

    def arms(c, t):
        for side in 'lr':
            arm_hd(c, side, SKIN, SKIN, top=27, cuff=LEATHER)
    L.append((arms, True))

    def mantle(c, t):
        pts = []
        for y in range(20, 31):
            for x in range(6, 43):
                shoulder = x <= 17 or x >= 31
                if y >= 25 and not shoulder:
                    continue
                if y == 30 and (x * 7) % 3 == 0:
                    continue
                pts.append((x, y))
        shade(c, pts, FUR)
        for (x, y) in pts:
            if hsh(x, y, 5) < 0.18:
                c.p(x, y, 'fu3')
        for (x0, y0) in ((8, 18), (38, 18)):                                 # orelhas do lobo
            shade(c, [(x0 + dx, y0 + dy) for dy in range(3) for dx in range(-dy, dy + 1)], FUR)
        for x in range(19, 30, 3):
            c.r(x, 24, 2, 3, 'n2'); c.p(x, 26, 'n1')                         # colar de dentes
    L.append((mantle, True))

    def head(c, t):
        shade(c, ell(24, 11, 9, 8), hair)                                    # cabelo atrás
        if g == 'f':
            for x0 in (14, 31):                                               # tranças
                for y in range(14, 34):
                    for d in range(3):
                        c.p(x0 + d, y, hair[(d + y // 2) % 3 + 1] if (y + d) % 3 else hair[0])
                c.r(x0, 34, 3, 2, 'le1')
        ey = face_hd(c, SKIN, top=7)
        shade(c, trap(3, 9, 18, 30, 16, 32), hair)                            # franja / topo
        if g == 'm':
            c.hl(19, ey - 2, 4, hair[1]); c.hl(26, ey - 2, 4, hair[1])
            # barba cheia abaixo do nariz, com bigode e uma trança no queixo
            pts = [p for p in ell(24, ey + 9, 8.5, 7) if p[1] >= ey + 4]
            shade(c, pts, hair, spec=False)
            c.hl(20, ey + 4, 9, hair[2]); c.hl(19, ey + 5, 3, hair[1]); c.hl(27, ey + 5, 3, hair[1])
            c.hl(22, ey + 6, 5, 'r0')
            for y in range(ey + 15, ey + 20):
                c.r(23, y, 3, 1, hair[1 + y % 2])
            c.r(23, ey + 20, 3, 1, 'le1')
        else:
            c.p(19, ey + 2, 'b2'); c.p(29, ey + 2, 'b2'); c.p(20, ey + 2, 'b1'); c.p(28, ey + 2, 'b1')
            c.hl(22, ey + 5, 5, 'r2')
    L.append((head, True))
    return L


# ── Lanceiro ─────────────────────────────────────────────────────────────

def lanceiro(g):
    skin = SKIND if g == 'm' else SKIN
    L = []

    def polearm(c, t):
        shade(c, rect(39, 6, 3, 57), WOOD)
        shade(c, [(x, y) for y in range(0, 8) for x in range(39, 42) if abs(x - 40) <= (y + 1) // 3], STEEL)
        blade = [(x, y) for y in range(8, 19) for x in range(42, 47) if x - 42 <= min(y - 7, 19 - y)]
        shade(c, blade, STEEL)
        shade(c, [(x, y) for y in range(11, 15) for x in range(35, 39)], STEEL, spec=False)
        c.hl(39, 19, 3, 'g2'); c.hl(39, 20, 3, 'g1')
    L.append((polearm, True))

    def legs(c, t):
        legs_hd(c, WOOD, LEATHER, top=44, knee=STEEL)
    L.append((legs, False))

    def coat(c, t):
        pts = trap(24, 47, 16, 32, 13, 35)
        shade(c, pts, BLUE)
        for (x, y) in pts:
            if (x - 13) % 4 == 0 and y > 26:
                c.p(x, y, 'b0')                                               # pespontos
            if y % 5 == 0 and (x - 13) % 4 == 2:
                c.p(x, y, 'b1')
        c.vl(24, 25, 22, 'g2'); c.vl(25, 25, 22, 'g1')
        c.hl(13, 47, 23, 'g2'); c.hl(13, 46, 23, 'g1')
        c.hl(16, 37, 17, 'le1'); c.hl(16, 38, 17, 'le0'); c.r(23, 37, 3, 2, 'g3')
        shade(c, trap(21, 25, 18, 30, 17, 31), STEEL, spec=False)              # gola de malha
        for (x, y) in trap(21, 25, 18, 30, 17, 31):
            if (x + y) % 2:
                c.p(x, y, 's1')
    L.append((coat, True))

    def arms(c, t):
        for side in 'lr':
            arm_hd(c, side, BLUE, STEEL, top=26, cuff=GOLD)
    L.append((arms, True))

    def head(c, t):
        if g == 'f':
            shade(c, ell(24, 16, 9, 8), HAIR['brown'])
            shade(c, ell(33, 22, 3, 4), HAIR['brown'])                        # coque
        ey = face_hd(c, skin, top=8)
        if g == 'm':
            pts = trap(ey + 3, ey + 9, 17, 31, 20, 28)
            shade(c, pts, HAIR['black'], spec=False)
            c.hl(17, ey + 3, 15, 'bk1'); c.hl(22, ey + 4, 5, 'r0')
        else:
            c.hl(22, ey + 5, 5, 'r2')
        # chapéu de ferro: copa e aba larga
        shade(c, [p for p in ell(24, 6, 7.5, 6) if p[1] <= 9], STEEL)
        c.vl(24, 0, 9, 's4'); c.vl(25, 1, 8, 's2')
        brim = [(x, y) for y in range(9, 12) for x in range(9 - (y - 9), 40 + (y - 9))]
        shade(c, brim, STEEL, ly=-1.6)
        c.hl(8, 11, 33, 's0')
    L.append((head, True))

    def shield(c, t):
        cx, cy = 11, 39
        disk = ell(cx, cy, 8.5, 8.5)
        shade(c, disk, WOOD)
        for (x, y) in disk:
            d = math.hypot(x - cx, y - cy)
            if d >= 7.2:
                c.p(x, y, 's3' if y < cy else 's1')
            elif abs(x - cx) <= 0 or abs(y - cy) <= 0:
                c.p(x, y, 'wo0')
        shade(c, ell(cx, cy, 2.5, 2.5), GOLD)
        c.p(cx - 1, cy - 1, 'g3')
    L.append((shield, True))
    return L


# ── Arqueiro ─────────────────────────────────────────────────────────────

def arqueiro(g):
    skin = SKIN if g == 'm' else SKIND
    L = []

    def quiver(c, t):
        shade(c, rect(33, 12, 6, 20), LEATHER)
        c.hl(33, 15, 6, 'g1'); c.hl(33, 28, 6, 'g1')
        for k, x in enumerate((32, 35, 38)):
            c.vl(x + 1, 4, 9, 'wo2')
            for y in range(3, 9):
                c.p(x, y, 'wh3' if k != 1 else 'r2'); c.p(x + 2, y, 'wh2' if k != 1 else 'r1')
    L.append((quiver, True))

    def legs(c, t):
        legs_hd(c, WOOD, LEATHER, top=44)
        for x0 in (16, 26):
            shade(c, rect(x0, 49, 7, 11), LEATHER)
            shade(c, rect(x0 - 1, 48, 9, 3), ['le1', 'le2', 'le3'], spec=False)   # dobra da bota
    L.append((legs, False))

    def tunic(c, t):
        pts = trap(38, 48, 16, 32, 14, 34)
        shade(c, pts, GREEN, spec=False)
        for x in range(14, 35, 2):
            c.p(x, 48, None); c.p(x + 1, 47, 'v0')
        c.vl(24, 40, 7, 'v0')
    L.append((tunic, True))

    def jerkin(c, t):
        shade(c, trap(24, 39, 16, 32, 16, 32), LEATHER)
        for (x, y) in ((19, 28), (29, 28), (19, 33), (29, 33), (24, 31), (21, 36), (27, 36)):
            c.p(x, y, 'g2'); c.p(x + 1, y + 1, 'g0')                       # tachas
        for k in range(15):                                                  # alça da aljava
            c.p(17 + k, 24 + k, 'le0'); c.p(18 + k, 24 + k, 'le0')
        c.hl(16, 38, 17, 'le0'); c.r(23, 37, 3, 3, 'g2'); c.p(24, 38, 'g0')
        shade(c, rect(30, 39, 4, 5), LEATHER)                                # bolsa
    L.append((jerkin, True))

    def arms(c, t):
        for side in 'lr':
            arm_hd(c, side, GREEN, skin, top=26, cuff=LEATHER)
        shade(c, rect(9, 37, 7, 6), LEATHER)                                 # braçadeira do arco
        c.hl(9, 39, 7, 'g1')
    L.append((arms, True))

    def capelet(c, t):
        pts = []
        for y in range(20, 31):
            a, b = (15, 33) if y < 22 else (8, 40)
            for x in range(a, b + 1):
                if y >= 29 and (x // 3) % 2:
                    continue                                                 # borda em dentes
                pts.append((x, y))
        shade(c, pts, GREEN)
        c.r(23, 24, 3, 3, 'g2'); c.p(24, 25, 'g3')                           # broche
    L.append((capelet, True))

    def head(c, t):
        if g == 'f':
            for y in range(14, 40):                                           # rabo de cavalo
                x = 32 + round(math.sin(y * 0.3) * 0.8)
                for d in range(3):
                    c.p(x + d, y, HAIR['black'][(d + y // 3) % 3 + 1] if (y + d) % 4 else 'bk0')
        ey = face_hd(c, skin, top=8)
        hair = HAIR['brown'] if g == 'm' else HAIR['black']
        shade(c, trap(7, 10, 19, 29, 17, 31), hair)                          # franja
        if g == 'm':
            pts = [p for p in ell(24, ey + 6, 7.5, 5) if p[1] >= ey + 3]
            shade(c, pts, HAIR['brown'], spec=False)
            c.hl(21, ey + 5, 7, 'k1'); c.hl(22, ey + 5, 5, 'r0')
        else:
            c.hl(22, ey + 5, 5, 'r1')
        # capuz arredondado, aberto no rosto
        hood = [p for p in ell(24, 13, 10.5, 12) if not (17 <= p[0] <= 31 and p[1] >= 8)]
        shade(c, hood, GREEN)
        for x in range(17, 32):
            c.p(x, 7, 'v0')
    L.append((head, True))

    def bow(c, t):
        pts = []
        for y in range(6, 62):
            k = (y - 34) / 27
            x = round(7 - 4.5 * math.sqrt(max(0, 1 - k * k)) + (2.2 * k ** 4))
            pts += [(x, y), (x + 1, y)]
        shade(c, pts, WOOD)
        c.line(3, 7, 7, 8, 'wo1'); c.line(3, 61, 7, 59, 'wo1')
        c.vl(9, 8, 52, 'wh1')
        shade(c, rect(1, 40, 5, 7), LEATHER); c.hl(1, 43, 5, 'g1')
    L.append((bow, True))
    return L


# ── Clérigo ──────────────────────────────────────────────────────────────

def clerigo(g):
    L = []

    def lantern(c, t):
        c.vl(10, 46, 4, 'g0')
        shade(c, rect(7, 50, 7, 9), GOLD)
        shade(c, rect(8, 52, 5, 5), FIRE)
        c.p(10, 54, 'f3')
        c.hl(7, 59, 7, 'g0'); c.r(9, 60, 3, 1, 'g0')
    L.append((lantern, True))

    def robe(c, t):
        pts = trap(24, 61, 17, 31, 11, 37)
        shade(c, pts, LINEN)
        for (x, y) in pts:
            if (x - 11) % 6 == 5 and y > 40:
                c.p(x, y, 'n0')
        c.hl(11, 60, 27, 'g1'); c.hl(11, 61, 27, 'g0'); c.hl(12, 59, 25, 'g2')
        for x in (20, 28):                                                   # estola
            shade(c, rect(x - 1, 25, 3, 26), RED)
            c.r(x - 1, 51, 3, 2, 'g2')
        c.hl(17, 38, 15, 'g1'); c.r(23, 37, 3, 3, 'g2')
        for (y, x0, x1) in ((29, 22, 26), (30, 21, 27), (31, 22, 26)):        # olho da vigília
            c.hl(x0, y, x1 - x0 + 1, 'g2')
        c.p(24, 30, 'ember'); c.p(24, 29, 'g3'); c.p(23, 30, 'noite')
    L.append((robe, True))

    def arms(c, t):
        for side in 'lr':
            arm_hd(c, side, LINEN, SKIN, top=25, cuff=GOLD)
    L.append((arms, True))

    def head(c, t):
        if g == 'f':
            shade(c, trap(2, 28, 18, 30, 13, 35), LINEN)                      # véu
        ey = face_hd(c, SKIN, top=7)
        if g == 'm':
            shade(c, [p for p in ell(24, 9, 7, 3) if p[1] <= 9], SKIN)       # calva
            c.p(21, 6, 'k3'); c.p(22, 6, 'k3')
            for x0 in (16, 30):
                shade(c, rect(x0, 11, 3, 9), HAIR['white'])
            c.hl(19, ey - 2, 4, 'wh2'); c.hl(26, ey - 2, 4, 'wh2')
            pts = trap(ey + 3, ey + 19, 17, 31, 22, 26)
            shade(c, pts, HAIR['white'], spec=False)
            for (x, y) in pts:
                if (x + y) % 5 == 0:
                    c.p(x, y, 'wh1')
            c.hl(22, ey + 4, 5, 'k0')
        else:
            c.hl(22, ey + 5, 5, 'r2')
            c.hl(18, 6, 13, 'g2'); c.hl(18, 7, 13, 'g1'); c.r(23, 5, 3, 2, 'g3')
    L.append((head, True))

    def hammer(c, t):
        shade(c, rect(38, 16, 3, 32), WOOD)
        c.hl(38, 30, 3, 'g1'); c.hl(38, 46, 3, 'g1')
        shade(c, rect(33, 9, 13, 8), STEEL)
        c.vl(39, 9, 8, 'g2'); c.vl(38, 9, 8, 'g1')
        c.hl(33, 16, 13, 's0')
    L.append((hammer, True))
    return L


# ── Piromante ────────────────────────────────────────────────────────────

def flame(c, cx, base, h, t, seed):
    for y in range(base - h, base + 1):
        k = (base - y) / h
        w = 3.2 * math.sin(min(1, (1 - k) * 1.6) * math.pi / 2) * (1 - k * 0.5)
        sway = round(math.sin(k * 3 + t * 1.6 + seed) * 1.4 * k)
        for x in range(round(cx - w) + sway, round(cx + w) + sway + 1):
            d = abs(x - cx - sway) / max(1, w)
            c.p(x, y, 'f3' if d < 0.35 and k < 0.6 else ('f2' if d < 0.7 else ('f1' if k < 0.8 else 'f0')))


def piromante(g):
    L = []

    def staff(c, t):
        shade(c, rect(39, 12, 3, 51), WOOD)
        shade(c, rect(37, 9, 7, 5), ['s0', 's1', 's2'])
        c.vl(37, 4, 6, 's1'); c.vl(43, 4, 6, 's1')
        flame(c, 40, 10, 10, t, 0.4)
    L.append((staff, True))

    def robe(c, t):
        pts = trap(22, 61, 16, 32, 10, 38)
        shade(c, pts, PURPLE)
        for (x, y) in pts:
            if (x - 10) % 6 == 5 and y > 38:
                c.p(x, y, 'p0')
        for x in range(10, 39):                                              # barra em brasa
            h = 2 + round(hsh(x, 1, 4) * 2)
            for y in range(62 - h, 62):
                c.p(x, y, 'f1' if y > 59 else ('f0' if y > 58 else 'p0'))
        c.hl(16, 38, 17, 'g1'); c.r(22, 38, 2, 7, 'g1'); c.r(26, 38, 2, 5, 'g0')
    L.append((robe, True))

    def arms(c, t):
        for side in 'lr':
            arm_hd(c, side, PURPLE, SKIN if g == 'f' else ['k0', 'k0', 'k1', 'k1'], top=25, cuff=['p0', 'p1', 'p1'])
    L.append((arms, True))

    def palm(c, t):
        flame(c, 12, 44, 8, t + 2, 1.7)
    L.append((palm, True))

    def hood(c, t):
        pts = trap(0, 28, 23, 25, 11, 37)
        shade(c, pts, PURPLE)
        shade(c, ell(24, 16, 8, 9), ['noite', 'noite', 'p0'], spec=False)
        glow = ['f2', 'f2', 'f3', 'f2'][t]
        for ex in (20, 27):
            c.r(ex, 15, 2, 2, 'f1'); c.p(ex, 15, glow)
        if g == 'f':
            shade(c, [p for p in ell(24, 20, 6, 5) if p[1] >= 18], SKIN, spec=False)   # queixo e boca à mostra
            c.hl(22, 22, 5, 'r2'); c.vl(24, 18, 2, 'k1')
            for x0 in (14, 31):                                                         # mechas ruivas no peito
                pts = [(x0 + round(math.sin(y * 0.45) * 1.0) + d, y) for y in range(23, 38) for d in range(3)]
                shade(c, pts, HAIR['red'])
        c.hl(11, 28, 27, 'p0')
    L.append((hood, True))
    return L


LOOKS = {
    ('guardiao', 'f'): guardiao_f,
    ('selvagem', 'm'): lambda: selvagem('m'), ('selvagem', 'f'): lambda: selvagem('f'),
    ('lanceiro', 'm'): lambda: lanceiro('m'), ('lanceiro', 'f'): lambda: lanceiro('f'),
    ('arqueiro', 'm'): lambda: arqueiro('m'), ('arqueiro', 'f'): lambda: arqueiro('f'),
    ('clerigo', 'm'): lambda: clerigo('m'), ('clerigo', 'f'): lambda: clerigo('f'),
    ('piromante', 'm'): lambda: piromante('m'), ('piromante', 'f'): lambda: piromante('f'),
}


def model(cls, g, t):
    return compose(LOOKS[(cls, g)](), t)


def sheet(cls, g):
    sh = C(W * 4, H)
    for t in range(4):
        sh.paste(model(cls, g, t), t * W, 0)
    return sh
