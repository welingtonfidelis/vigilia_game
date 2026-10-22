"""Retratos de busto dos heróis 32-bit (96×168, o dobro dos 48×84 da interface).

Rosto e ombros no estilo dos modelos detalhados (hd24): volumes sombreados pela normal
com luz de cima-esquerda, peças contornadas uma a uma, mesmos materiais e cores. No
tamanho novo cabem olhos com íris e brilho, sobrancelha, nariz com narina, lábios,
orelha, fio de barba e de cabelo, cravos e costuras da roupa. A base do busto encosta no
pé do quadro (âncora no meio de baixo).
"""
import math

import herois32_base as B
import hd24 as HD
from hd24 import ell, rect, trap
from lib import C, hsh

PW, PH = 96, 168
CX = 48
STEEL, GOLD, RED, SKIN, SKIND = HD.STEEL, HD.GOLD, HD.RED, HD.SKIN, HD.SKIND
FUR, LEATHER, WOOD, BLUE, GREEN, LINEN, PURPLE, HAIR, FIRE = (HD.FUR, HD.LEATHER, HD.WOOD, HD.BLUE, HD.GREEN,
                                                             HD.LINEN, HD.PURPLE, HD.HAIR, HD.FIRE)


def shade(c, pts, pal, **kw):
    HD.shade(c, pts, pal, **kw)


def shade_cyl(c, pts, pal, spec=True, vy=0.35, lx=0.6, ly=0.8, bias=0.15, cx_off=0.0):
    """Sombra de volume que segue a forma linha a linha (cilindro em pé): a normal
    horizontal sai da largura de cada linha, com um pouco do alto/baixo da peça."""
    if not pts:
        return
    rows = {}
    for (x, y) in pts:
        rows.setdefault(y, []).append(x)
    ys = list(rows)
    y0, y1 = min(ys), max(ys)
    cy, ry = (y0 + y1) / 2, max(1, (y1 - y0) / 2)
    n = len(pal)
    for y, xs in rows.items():
        a, b = min(xs), max(xs)
        mid, half = (a + b) / 2 + cx_off, max(1, (b - a) / 2)
        for x in xs:
            nx = max(-1.0, min(1.0, (x - mid) / half))
            ny = (y - cy) / ry * vy
            v = -(nx * lx + ny * ly) * 0.7 + bias
            i = max(0, min(n - 1, int((v + 1) / 2 * n + 0.15)))
            if not spec and i == n - 1:
                i = n - 2
            c.p(x, y, pal[i])


def layer():
    return C(PW, PH)


def compose(layers):
    out = C(PW, PH)
    for L in layers:
        if L is None:
            continue
        o = B.copy(L)
        o.outline()
        B.paste(out, o)
    return out


def union(*ps):
    s = set()
    for p in ps:
        s.update(p)
    return sorted(s)


def poly(pts):
    """Pontos dentro de um polígono (lista de vértices)."""
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    out = []
    for y in range(int(min(ys)), int(max(ys)) + 1):
        for x in range(int(min(xs)), int(max(xs)) + 1):
            if B._inside(pts, x + 0.5, y + 0.5):
                out.append((x, y))
    return out


# ── Texturas ─────────────────────────────────────────────────────────────

def hair_mass(c, pts, pal, seed=0, strand=3, hi=True):
    """Cabelo: volume que segue a forma, fios mais escuros e brilho no alto à esquerda."""
    shade_cyl(c, pts, pal, vy=0.6)
    s = set(pts)
    ys = [p[1] for p in pts]
    y0, y1 = min(ys), max(ys)
    for (x, y) in pts:
        if (x + seed) % strand == 0 and hsh(x, y // 5, seed) < 0.75:
            if c.g(x, y) != pal[-1]:
                c.p(x, y, pal[0] if c.g(x, y) in (pal[0], pal[1]) else pal[1])
        if hi and (x - y // 3 + seed) % 7 == 0 and y < y0 + (y1 - y0) * 0.45 and hsh(x, y, seed + 1) < 0.5:
            c.p(x, y, pal[-1])


def fur(c, pts, seed=0, hem=True):
    """Pele de bicho: volume, tufos em traço curto (claro em cima, sombra embaixo)."""
    shade_cyl(c, pts, FUR, vy=0.6)
    s = set(pts)
    for (x, y) in pts:
        if hsh(x // 3, y // 3, seed) < 0.5 and x % 3 == 0 and y % 3 == 0:
            jx = round(hsh(x, y, seed + 2) * 2)
            for i in range(3):
                if (x + jx + i, y + i) in s:
                    c.p(x + jx + i, y + i, 'fu3' if i == 0 else 'fu2')
            if (x + jx + 1, y + 3) in s:
                c.p(x + jx + 1, y + 3, 'fu0')


def quilt(c, pts, pal, step=8, seed=0):
    """Pespontos de casaco acolchoado: costuras verticais e pontos de linha."""
    for (x, y) in pts:
        if (x - seed) % step == 0:
            c.p(x, y, pal[0])
            if y % 4 == 0:
                c.p(x + 1, y, pal[1])


def flame(c, cx, base, h, t=0, seed=0.4, w=3.2):
    """Chama de pé (mesmo desenho da do hd24, com largura ajustável)."""
    for y in range(base - h, base + 1):
        k = (base - y) / h
        ww = w * math.sin(min(1, (1 - k) * 1.6) * math.pi / 2) * (1 - k * 0.5)
        sway = round(math.sin(k * 3 + t * 1.6 + seed) * 1.6 * k)
        for x in range(round(cx - ww) + sway, round(cx + ww) + sway + 1):
            d = abs(x - cx - sway) / max(1, ww)
            c.p(x, y, 'f3' if d < 0.35 and k < 0.6 else ('f2' if d < 0.7 else ('f1' if k < 0.8 else 'f0')))


def rivet(c, x, y):
    c.p(x, y, 's4'); c.p(x + 1, y + 1, 's0'); c.p(x + 1, y, 's2'); c.p(x, y + 1, 's2')


# ── Rosto ────────────────────────────────────────────────────────────────

class Face:
    """Rosto de frente (olhos com íris e brilho, sobrancelha, nariz, boca, orelhas)."""

    def __init__(self, skin, eye='b2', brow=None, cx=CX, ey=46, female=False):
        self.skin, self.eye, self.cx, self.ey = skin, eye, cx, ey
        self.brow = brow or skin[0]
        self.female = female

    def mask(self):
        cx, ey = self.cx, self.ey
        a = ell(cx, ey - 1, 15.5, 21)
        b = ell(cx, ey + 9, 11.5 if not self.female else 10.5, 12.5)
        return [p for p in union(a, b) if p[1] >= ey - 21]

    def draw(self, c, eyes=True, mouth=True, nose=True, ears=True):
        cx, ey, sk = self.cx, self.ey, self.skin
        if ears:
            for sx in (-1, 1):
                ex = cx + sx * 15.5
                shade_cyl(c, ell(ex, ey + 3, 2.8, 5.4), sk, spec=False)
                c.vl(round(ex) - sx, ey + 1, 5, sk[0])
                c.p(round(ex), ey, sk[2] if sx < 0 else sk[1])
        m = self.mask()
        shade_cyl(c, m, sk, spec=False, vy=0.45)
        # testa clara, maçãs, maxilar e queixo
        for (x, y) in m:
            if y < ey - 10 and x < cx - 2 and (x + y) % 2 == 0 and c.g(x, y) == sk[2]:
                c.p(x, y, sk[3])
            if y > ey + 16 and abs(x - cx) > 6 and c.g(x, y) in (sk[1], sk[2]):
                c.p(x, y, sk[1] if c.g(x, y) == sk[2] else sk[0])
        c.hl(cx - 12, ey + 7, 4, sk[3]); c.hl(cx + 8, ey + 7, 4, sk[1])
        if eyes:
            for sx in (-1, 1):
                x0 = cx - 11 if sx < 0 else cx + 5
                for i in range(8):                                        # sobrancelha arqueada
                    xx = x0 - 1 + i
                    yy = ey - 6 - (1 if 2 <= i <= 5 else 0) + (1 if (sx < 0 and i == 7) or (sx > 0 and i == 0) else 0)
                    c.p(xx, yy, self.brow)
                    if 1 <= i <= 6:
                        c.p(xx, yy + 1, self.brow)
                c.hl(x0, ey - 3, 6, sk[1])                               # pálpebra
                c.hl(x0, ey - 2, 6, 'noite')
                c.hl(x0, ey - 1, 6, 'white'); c.hl(x0, ey, 6, 'n1')
                ix = x0 + 2
                c.r(ix, ey - 1, 2, 2, self.eye)
                c.p(ix + 1, ey, 'noite'); c.p(ix, ey - 1, 'white')
                c.p(x0, ey, sk[1]); c.p(x0 + 5, ey, sk[1])
                c.hl(x0 + 1, ey + 1, 4, sk[1])                            # olheira
                if self.female:
                    c.p(x0 - 1, ey - 2, 'noite'); c.p(x0 + 6, ey - 2, 'noite')
        if nose:
            c.vl(cx - 1, ey, 7, sk[3])
            c.vl(cx + 1, ey + 1, 7, sk[1])
            c.r(cx - 1, ey + 7, 3, 1, sk[2])
            c.p(cx - 2, ey + 8, sk[0]); c.p(cx + 2, ey + 8, sk[0]); c.hl(cx - 1, ey + 9, 3, sk[1])
        if mouth:
            my = ey + 13
            w = 4 if self.female else 5
            if self.female:
                c.hl(cx - w + 1, my - 1, 2 * w - 1, 'r2')
                c.hl(cx - w, my, 2 * w + 1, 'r0')
                c.hl(cx - w + 1, my + 1, 2 * w - 1, 'r2'); c.hl(cx - 1, my + 1, 2, 'r3')
            else:
                c.hl(cx - w + 1, my - 1, 2 * w - 1, sk[1])
                c.hl(cx - w, my, 2 * w + 1, sk[0])
                c.hl(cx - w + 2, my + 1, 2 * w - 3, sk[2])
            c.hl(cx - 2, my + 4, 5, sk[1])                               # covinha do queixo


def neck(c, skin, cx=CX, y0=60, y1=84, w=8):
    pts = rect(cx - w, y0, 2 * w + 1, y1 - y0)
    shade_cyl(c, pts, skin, spec=False)
    for y in range(y0, y0 + 6):
        c.hl(cx - w, y, 2 * w + 1, skin[0] if y < y0 + 3 else skin[1])
    c.vl(cx - w + 3, y0 + 8, y1 - y0 - 10, skin[1])
    c.vl(cx + w - 3, y0 + 8, y1 - y0 - 10, skin[0])


# ── Busto ────────────────────────────────────────────────────────────────
# Tronco entre os braços; deltoides redondos no alto dos braços; base no pé do quadro.

def torso_pts(neck_w=12, top=76, sh=20, bottom=167):
    return poly([(CX - neck_w, top), (CX + neck_w, top), (CX + 32, top + 12), (CX + 27, top + 24),
                 (CX + 26, bottom + 1), (CX - 26, bottom + 1), (CX - 27, top + 24), (CX - 32, top + 12)])


def arm_pts(side, top=88):
    """Braço de um lado (−1 esquerda, +1 direita): deltoide e o braço descendo."""
    cx = CX + side * 31
    pts = ell(cx, top + 10, 14, 13)
    pts += poly([(cx - 13, top + 10), (cx + 13, top + 10), (cx + 12 - side * 1, 168), (cx - 12 - side * 1, 168)])
    return [p for p in union(pts) if 0 <= p[0] < PW]


def arms(c, pal, **kw):
    for side in (-1, 1):
        shade_cyl(c, arm_pts(side), pal, **kw)


def belt(c, y, x0=22, x1=74, pal=LEATHER, buckle=GOLD):
    shade(c, rect(x0, y, x1 - x0 + 1, 6), pal, spec=False)
    c.hl(x0, y + 5, x1 - x0 + 1, pal[0])
    shade(c, rect(CX - 5, y - 1, 11, 8), buckle, spec=False)
    c.r(CX - 3, y + 1, 7, 4, pal[0]); c.vl(CX, y + 1, 4, buckle[-1])


# ── Guardião / Guardiã ───────────────────────────────────────────────────

def guardiao(g):
    L = []
    crest = layer()
    path = []
    for i in range(90):
        k = i / 89
        path.append((54 + k * 34, 8 - math.sin(k * 2.4) * 7 + k * k * 52, 6.6 - k * 4.2))
    for (x, y, r) in path:
        crest.disk(x, y, r, 'g0')
    for (x, y, r) in path:
        crest.disk(x - 0.8, y - 0.8, r * 0.75, 'g1')
    for (x, y, r) in path:
        crest.disk(x - 1.6, y - 1.6, r * 0.42, 'g2')
    for (x, y, r) in path[4::7]:
        crest.p(x - 2, y - 2, 'g3'); crest.p(x + 1, y + 2, 'g0')
    L.append(crest)
    a = layer()
    arms(a, STEEL)
    for side in (-1, 1):                                                   # lâminas do braçal
        cx = CX + side * 31
        for y in (124, 136, 148, 160):
            a.hl(cx - 12, y, 25, 's1'); a.hl(cx - 12, y + 1, 25, 's3')
        for y in (128, 152):
            rivet(a, cx - 7, y); rivet(a, cx + 6, y)
    L.append(a)
    body = layer()
    tp = torso_pts()
    shade_cyl(body, tp, STEEL, vy=0.5)
    body.vl(CX - 1, 84, 50, 's4'); body.vl(CX, 84, 50, 's2'); body.vl(CX + 1, 84, 50, 's1')   # quilha
    for y in (118, 119):
        body.hl(23, y, 51, 's1' if y == 118 else 's3')
    for (x, y) in ((28, 94), (67, 94), (27, 112), (68, 112), (28, 126), (67, 126)):
        rivet(body, x, y)
    belt(body, 134, pal=['g0', 'g1', 'g2', 'g3'], buckle=['le0', 'le1', 'le2'])
    for y in range(141, 168):                                               # tabardo
        for x in range(CX - 11, CX + 12):
            d = abs(x - CX)
            body.p(x, y, 'r3' if x < CX - 8 else ('r1' if x > CX + 8 else ('r2' if (x + y // 6) % 9 else 'r1')))
        body.p(CX - 12, y, 'g1'); body.p(CX + 12, y, 'g0')
    body.vl(CX, 143, 25, 'g2')
    for (dx, dy) in ((-1, 150), (1, 150), (0, 149), (0, 151)):
        body.p(CX + dx, dy, 'g3')
    L.append(body)
    if g == 'f':
        braid = layer()
        for y in range(60, 142):
            sx = 33 + round(math.sin(y * 0.15) * 1.5)
            for d in range(8):
                ph = (d + y // 3) % 6
                braid.p(sx + d, y, ['hb1', 'hb2', 'hb3', 'hb2', 'hb1', 'hb0'][ph] if (y + d) % 6 else 'hb0')
        shade(braid, rect(33, 142, 8, 5), RED)
        for y in range(147, 156):
            braid.hl(34 + (y % 2), y, 6, 'hb2' if y % 3 else 'hb1')
        L.append(braid)
    gorget = layer()
    gp = [p for p in ell(CX, 76, 19, 9)]
    shade_cyl(gorget, gp, STEEL)
    gorget.hl(30, 79, 37, 'g2'); gorget.hl(31, 80, 35, 'g1')
    gorget.hl(30, 74, 37, 's1')
    L.append(gorget)
    pd = layer()
    for side in (-1, 1):
        cx = CX + side * 30
        for i, (yy, ry) in enumerate(((104, 5), (99, 6))):
            lame = ell(cx + side * 2, yy, 16, ry)
            shade_cyl(pd, lame, STEEL, spec=False)
            for (x, y) in lame:
                if y == round(yy + ry) - 1:
                    pd.p(x, y, 'g1')
        dome = ell(cx, 92, 18, 12)
        shade(pd, dome, STEEL)
        for (x, y) in dome:
            if y >= 102:
                pd.p(x, y, 'g2' if y == 102 else 'g1')
        rivet(pd, cx - 8, 92); rivet(pd, cx + 7, 92)
        for k in range(5):
            pd.p(cx - 8 + k, 85 - (k > 1) - (k > 3), 's4')
    L.append(pd)
    helm = layer()
    hp = rect(27, 18, 43, 50) + [p for p in ell(48.5, 19, 21.5, 13) if p[1] < 19]
    shade_cyl(helm, hp, STEEL, vy=0.3)
    helm.r(27, 33, 43, 2, 'g2'); helm.hl(27, 35, 43, 'g1')                # aro
    helm.r(27, 37, 43, 3, 'noite')                                        # viseira
    helm.hl(27, 40, 43, 's0'); helm.hl(27, 36, 43, 's0')
    helm.r(47, 6, 3, 27, 'g2'); helm.vl(47, 6, 27, 'g3'); helm.vl(49, 6, 27, 'g1')   # faixa
    helm.r(47, 41, 3, 23, 'g2'); helm.vl(47, 41, 23, 'g3'); helm.vl(49, 41, 23, 'g1')
    for (x, y) in ((56, 47), (60, 47), (58, 50), (56, 53), (60, 53), (58, 56), (64, 50)):
        helm.r(x, y, 2, 2, 's0'); helm.p(x, y + 2, 's3')
    helm.r(28, 64, 41, 2, 'g2'); helm.hl(28, 66, 41, 'g1')
    for x in range(31, 67, 4):
        rivet(helm, x, 22)
    L.append(helm)
    shield = layer()
    pts = []
    for y in range(112, 168):
        k = (y - 112) / 70
        hw = 18 if k < 0.45 else 18 * math.sqrt(max(0, 1 - ((k - 0.45) / 0.55) ** 2))
        pts += [(x, y) for x in range(round(84 - hw), round(84 + hw) + 1) if x < PW]
    shade(shield, pts, RED)
    rows = {}
    for (x, y) in pts:
        rows.setdefault(y, []).append(x)
    for y, xs in rows.items():
        shield.p(min(xs), y, 's3'); shield.p(min(xs) + 1, y, 's2')
    shield.hl(66, 112, 30, 's4'); shield.hl(66, 113, 30, 's2')
    for (y, x0, x1) in ((136, 78, 92), (137, 74, 95), (138, 72, 95), (139, 72, 95), (140, 74, 95), (141, 78, 92)):
        shield.hl(x0, y, x1 - x0 + 1, 'g2')
    shield.hl(78, 135, 15, 'g1'); shield.hl(78, 142, 15, 'g1')
    shade(shield, ell(85, 138, 3.4, 3), ['ember', 'f2', 'f3'])
    shield.vl(85, 136, 5, 'noite')
    L.append(shield)
    return L


# ── Selvagem ─────────────────────────────────────────────────────────────

def selvagem(g):
    hair = HAIR['red' if g == 'm' else 'blond']
    L = []
    axe = layer()
    B.draw_local(axe, (86, 150), -100, [B.rod(-20, 150, 2.4, WOOD)], 1.0)
    for y in (96, 102, 108):
        axe.hl(82, y, 6, 'le1')
    blade = []
    for y in range(2, 54):
        k = (y - 26) / 26
        w = round(18 * math.sqrt(max(0, 1 - k * k)))
        blade += [(x, y) for x in range(80 - w, 80) if x >= 0]
    shade(axe, blade, STEEL)
    for y in range(3, 53):
        xs = [x for (x, yy) in blade if yy == y]
        if xs:
            axe.p(min(xs), y, 's4'); axe.p(min(xs) + 1, y, 's3')
    shade(axe, rect(78, 20, 8, 14), STEEL, spec=False)
    L.append(axe)
    if g == 'f':
        back = layer()
        hair_mass(back, [p for p in ell(CX, 46, 24, 30) if p[1] <= 80], hair, seed=2)
        L.append(back)
    else:
        back = layer()
        hair_mass(back, [p for p in ell(CX, 42, 24, 28) if p[1] <= 70], hair, seed=2)
        L.append(back)
    a = layer()
    arms(a, SKIN, spec=False)
    for side in (-1, 1):
        cx = CX + side * 31
        a.vl(cx + side * 4, 104, 14, 'k1')
        shade(a, rect(cx - 12, 152, 25, 16), LEATHER, spec=False)           # braçadeira
        a.hl(cx - 12, 156, 25, 'le0'); a.hl(cx - 12, 162, 25, 'le0')
    L.append(a)
    body = layer()
    tp = torso_pts()
    shade_cyl(body, tp, SKIN, spec=False, vy=0.4)
    for sx in (-1, 1):                                                    # peitorais
        pec = [p for p in ell(CX + sx * 12, 112, 12, 9)]
        shade(body, pec, SKIN, spec=False)
        for i in range(20):
            body.p(CX + sx * (2 + i), 120 + round(math.sin(i / 19 * math.pi) * 2), 'k0' if i % 4 else 'k1')
        body.p(CX + sx * 13, 113, 'k0'); body.p(CX + sx * 14, 113, 'k1')
    body.vl(CX, 104, 64, 'k1')
    for y in (130, 142, 154):                                             # abdômen
        body.hl(CX - 9, y, 7, 'k1'); body.hl(CX + 3, y, 7, 'k1')
        body.hl(CX - 9, y + 1, 7, 'k2'); body.hl(CX + 3, y + 1, 7, 'k2')
    for sx in (-1, 1):                                                    # clavículas
        for i in range(14):
            body.p(CX + sx * (4 + i), 90 + i // 5, 'k1')
    if g == 'm':
        for kk in range(30):                                              # pintura de guerra
            for d in range(3):
                body.p(26 + kk + d, 96 + kk, 'b2' if d < 2 else 'b1')
        for kk in range(30):
            if kk % 3 != 1:
                body.p(32 + kk, 96 + kk, 'b1')
    else:
        top = [p for p in tp if 100 <= p[1] <= 130]
        fur(body, top, seed=4)
        body.hl(22, 130, 53, 'fu0'); body.hl(22, 131, 53, 'le1'); body.hl(22, 132, 53, 'le0')
        for (x0, x1) in ((30, 36), (60, 66)):                               # alças
            for y in range(84, 101):
                body.hl(x0 + (y - 84) // 8, y, 4, 'le1')
    belt(body, 156)
    L.append(body)
    nk = layer()
    neck(nk, SKIN, y0=60, y1=88, w=11)
    L.append(nk)
    mantle = layer()
    mp = []
    for y in range(78, 116):
        for x in range(0, PW):
            d = abs(x - CX)
            if y < 92 and d < 14 + (y - 78) * 0.4:
                continue
            if y >= 92 and d < 20 + (y - 92) * 0.9:
                continue
            if y >= 108 and (x * 7 + y) % 5 == 0:
                continue
            ok = y < 106 or (hsh(x // 4, 0, 7) * 10 + 106 > y)
            if ok:
                mp.append((x, y))
    fur(mantle, mp, seed=1)
    for (x0, y0) in ((12, 66), (84, 66)):                                  # orelhas do lobo
        ear = [(x0 + dx, y0 + dy) for dy in range(14) for dx in range(-dy // 2, dy // 2 + 1)]
        shade(mantle, ear, FUR)
        mantle.vl(x0, y0 + 5, 7, 'fu0'); mantle.vl(x0 + 1, y0 + 6, 5, 'r1')
    L.append(mantle)
    teeth = layer()
    pts = []
    for x in range(29, 68):
        y = 94 + round(math.sin((x - 29) / 38 * math.pi) * 7)
        teeth.p(x, y, 'le1')
        pts.append((x, y))
    for x in range(31, 66, 5):
        y = 95 + round(math.sin((x - 29) / 38 * math.pi) * 7)
        for i in range(7):
            w = 3 if i < 4 else (2 if i < 6 else 1)
            teeth.hl(x + (3 - w) // 2, y + i, w, 'n2' if i else 'n1')
        teeth.p(x, y + 1, 'n3')
    L.append(teeth)
    if g == 'f':
        braids = layer()
        for x0 in (25, 64):
            for y in range(52, 132):
                xx = x0 + round(math.sin(y * 0.1 + x0) * 1.2)
                for d in range(8):
                    ph = (d + y // 3) % 6
                    braids.p(xx + d, y, hair[[1, 2, 3, 2, 1, 0][ph]] if (y + d) % 6 else hair[0])
            shade(braids, rect(x0, 132, 8, 5), LEATHER)
            for y in range(137, 147):
                braids.hl(x0 + 1 + y % 2, y, 6, hair[2] if y % 3 else hair[1])
        L.append(braids)
    face = layer()
    F = Face(SKIN, eye='b2' if g == 'm' else 'b3', brow=hair[0] if g == 'm' else hair[1], female=(g == 'f'))
    F.draw(face)
    if g == 'f':
        for (x, y) in ((35, 53), (38, 55), (59, 53), (62, 55)):
            face.r(x, y, 2, 2, 'b2')
        face.vl(41, 40, 6, 'b2')
    L.append(face)
    top = layer()
    tpts = [p for p in ell(CX, 30, 20, 13) if p[1] <= 25 + abs(p[0] - CX) * 0.3 + round(math.sin(p[0] * 0.9) * 1.2)]
    tpts += [p for p in ell(CX, 44, 21, 26) if p[1] < 48 and abs(p[0] - CX) > 14.5]
    hair_mass(top, tpts, hair, seed=5, strand=2)
    L.append(top)
    if g == 'm':
        beard = layer()
        bp = [p for p in union(ell(CX, 68, 21, 23), ell(CX, 58, 17, 9)) if p[1] >= 53]
        bp = [p for p in bp if not (abs(p[0] - CX) < 5 and 58 <= p[1] <= 59)]
        hair_mass(beard, bp, hair, seed=3, strand=2, hi=False)
        for x in range(36, 61):                                            # bigode
            y = 54 + round(abs(x - CX) * 0.18)
            beard.p(x, y, hair[2]); beard.p(x, y + 1, hair[1])
        beard.hl(45, 58, 7, 'r0'); beard.hl(46, 59, 5, 'r2')
        for y in range(90, 108):                                           # trança da barba
            for d in range(7):
                beard.p(45 + d, y, hair[[1, 2, 3, 2, 1, 0][(d + y // 2) % 6]] if (y + d) % 5 else hair[0])
        shade(beard, rect(45, 108, 7, 4), LEATHER)
        beard.hl(46, 112, 5, hair[1]); beard.hl(47, 113, 3, hair[1])
        L.append(beard)
    return L


# ── Lanceiro / Lanceira ──────────────────────────────────────────────────

def lanceiro(g):
    skin = SKIND if g == 'm' else SKIN
    L = []
    pole = layer()
    B.draw_local(pole, (84, 166), -90, [B.rod(0, 140, 2.4, WOOD)], 1.0)
    tip = [(x, y) for y in range(0, 24) for x in range(79, 90) if abs(x - 84) <= (y + 2) // 4]
    shade(pole, tip, STEEL)
    shade(pole, [(x, y) for y in range(22, 48) for x in range(87, 96) if x - 87 <= min(y - 21, 48 - y)], STEEL)
    shade(pole, rect(76, 30, 6, 6), STEEL, spec=False)
    pole.r(81, 48, 7, 2, 'g2'); pole.hl(81, 50, 7, 'g1')
    L.append(pole)
    if g == 'f':
        back = layer()
        hair_mass(back, ell(CX, 44, 21, 22), HAIR['brown'], seed=1)
        hair_mass(back, ell(69, 64, 8, 9), HAIR['brown'], seed=2)          # coque
        back.hl(62, 60, 14, 'le1'); back.hl(62, 61, 14, 'le0')
        L.append(back)
    a = layer()
    arms(a, BLUE)
    for side in (-1, 1):
        cx = CX + side * 31
        quilt(a, [p for p in arm_pts(side) if p[1] > 104], BLUE, step=7, seed=cx % 7)
        a.hl(cx - 13, 152, 27, 'g2'); a.hl(cx - 13, 153, 27, 'g1')
    L.append(a)
    body = layer()
    tp = torso_pts()
    shade_cyl(body, tp, BLUE, vy=0.4)
    quilt(body, tp, BLUE, step=8, seed=4)
    body.r(46, 84, 2, 84, 'g2'); body.vl(48, 84, 84, 'g1')
    for y in range(98, 168, 12):
        body.r(41, y, 3, 3, 'g2'); body.p(42, y + 1, 'g3'); body.r(51, y, 3, 3, 'g2'); body.p(52, y + 1, 'g3')
        body.hl(44, y + 1, 7, 'g0')
    belt(body, 140)
    L.append(body)
    nk = layer()
    neck(nk, skin, y0=58, y1=82, w=9)
    L.append(nk)
    mail = layer()
    mp = [p for p in ell(CX, 84, 24, 11)]
    shade_cyl(mail, mp, STEEL, spec=False)
    for (x, y) in mp:
        if (x + y) % 2:
            mail.p(x, y, 's1')
        elif (x // 2 + y) % 3 == 0:
            mail.p(x, y, 's3')
    L.append(mail)
    face = layer()
    F = Face(skin, eye='hn1' if g == 'm' else 'v2', brow='bk1' if g == 'm' else 'hn0', female=(g == 'f'))
    F.draw(face)
    if g == 'f':
        hair_mass(face, [p for p in ell(CX, 30, 17, 9) if p[1] <= 33 - abs(p[0] - CX) * 0.05], HAIR['brown'], seed=3, strand=2)
    L.append(face)
    if g == 'm':
        beard = layer()
        bp = [p for p in union(ell(CX, 61, 17, 12), ell(CX, 56, 15.5, 6)) if p[1] >= 53]
        bp = [p for p in bp if not (abs(p[0] - CX) < 5 and 58 <= p[1] <= 59)]
        hair_mass(beard, bp, HAIR['black'], seed=2, strand=2, hi=False)
        for x in range(37, 60):
            beard.p(x, 54 + round(abs(x - CX) * 0.15), 'bk2')
        beard.hl(44, 58, 9, 'r0'); beard.hl(45, 59, 7, 'r1')
        L.append(beard)
    hat = layer()
    crown = [p for p in ell(CX, 29, 20, 21) if p[1] <= 31]
    shade(hat, crown, STEEL)
    hat.r(47, 8, 2, 24, 's4'); hat.vl(49, 9, 23, 's2')                   # crista da copa
    for (x, y) in ((36, 24), (60, 24), (42, 16), (55, 16)):
        rivet(hat, x, y)
    brim = [(x, y) for y in range(31, 38) for x in range(8 - (y - 31) * 2, 89 + (y - 31) * 2)]
    shade(hat, brim, STEEL, ly=-1.6)
    hat.hl(0, 38, 96, 's0')
    hat.hl(10, 31, 77, 's4')
    L.append(hat)
    shield = layer()
    cx, cy = 12, 148
    disk = ell(cx, cy, 25, 25)
    shade(shield, disk, WOOD)
    for (x, y) in disk:
        d = math.hypot(x - cx, y - cy)
        ang = math.atan2(y - cy, x - cx)
        if d >= 22:
            shield.p(x, y, 's3' if y < cy - 6 else ('s2' if y < cy + 6 else 's1'))
        elif d >= 21:
            shield.p(x, y, 'wo0')
        elif abs(x - cx) <= 0 or abs(y - cy) <= 0:
            shield.p(x, y, 'wo0')
        elif round(ang * 6) % 3 == 0 and d > 9 and hsh(x, y, 2) < 0.3:
            shield.p(x, y, 'wo1')
    shade(shield, ell(cx, cy, 8, 8), GOLD)
    shield.r(cx - 4, cy - 4, 3, 2, 'g3')
    for a_ in range(0, 360, 45):
        rivet(shield, round(cx + math.cos(math.radians(a_)) * 23), round(cy + math.sin(math.radians(a_)) * 23))
    L.append(shield)
    return L


# ── Arqueiro / Arqueira ──────────────────────────────────────────────────

def arqueiro(g):
    skin = SKIN if g == 'm' else SKIND
    L = []
    bow = layer()
    pts = []
    for y in range(2, 168):
        k = (y - 104) / 100
        x = round(13 - 9 * math.sqrt(max(0, 1 - k * k)) + 5 * k ** 4)
        pts += [(x + d, y) for d in range(4)]
    shade(bow, pts, WOOD)
    bow.vl(18, 4, 164, 'wh1')
    L.append(bow)
    q = layer()
    shade(q, rect(66, 50, 24, 40), LEATHER)
    q.hl(66, 56, 24, 'g1'); q.hl(66, 80, 24, 'g1')
    for i, x in enumerate((68, 75, 82)):
        q.vl(x + 2, 24, 30, 'wo2'); q.vl(x + 3, 24, 30, 'wo1')
        for y in range(8, 28):
            col = ('wh3', 'wh2', 'wh1') if i != 1 else ('r3', 'r2', 'r1')
            w = 2 if y > 10 else 1
            q.r(x + 2 - w, y, w, 1, col[0]); q.r(x + 4, y, w, 1, col[1])
            if y % 4 == 0:
                q.p(x + 1, y, col[2])
    L.append(q)
    a = layer()
    arms(a, GREEN)
    for side in (-1, 1):
        cx = CX + side * 31
        shade(a, rect(cx - 12, 140, 25, 28), LEATHER, spec=False)           # braçadeiras
        for y in (146, 154, 162):
            a.hl(cx - 12, y, 25, 'le0')
            a.p(cx - 2, y - 2, 'g2')
    L.append(a)
    body = layer()
    tp = torso_pts()
    shade_cyl(body, tp, GREEN, vy=0.4)
    jer = [p for p in tp if p[1] >= 100]
    shade_cyl(body, jer, LEATHER, vy=0.4)
    for y in range(102, 168):                                             # laço do gibão
        if y % 6 < 3:
            body.p(CX - 1 + (y % 6), y, 'le0')
    body.vl(CX, 102, 66, 'le0')
    for (x, y) in ((30, 112), (66, 112), (30, 130), (66, 130), (36, 150), (60, 150)):
        body.r(x, y, 2, 2, 'g2'); body.p(x + 1, y + 1, 'g0'); body.p(x, y, 'g3')
    for kk in range(66):                                                  # alça da aljava
        body.r(22 + kk // 1, 98 + kk, 5, 1, 'le0')
        body.p(23 + kk, 98 + kk, 'le1'); body.p(24 + kk, 98 + kk, 'le2')
    belt(body, 152)
    L.append(body)
    nk = layer()
    neck(nk, skin, y0=58, y1=84, w=9)
    L.append(nk)
    if g == 'f':
        tail = layer()
        tp2 = [(66 + round(math.sin(y * 0.11) * 2) + d, y) for y in range(40, 124) for d in range(8)]
        hair_mass(tail, tp2, HAIR['black'], seed=1, strand=2)
        tail.hl(66, 44, 9, 'le1')
        L.append(tail)
    hood = layer()
    inner = lambda x, y: ((x - CX) / 19.5) ** 2 + ((y - 50) / 29) ** 2 <= 1 and y >= 22
    hp = [p for p in ell(CX, 46, 30, 40) if not inner(*p) and p[1] <= 88]
    shade_cyl(hood, hp, GREEN, vy=0.5)
    for (x, y) in hp:
        if inner(x - (1 if x > CX else -1), y) or inner(x, y + 1):
            hood.p(x, y, 'v0')
        elif (x - CX) % 7 == 0 and y < 30:
            hood.p(x, y, 'v1')
    L.append(hood)
    face = layer()
    F = Face(skin, eye='hn1' if g == 'm' else 'hn0', brow='hn1' if g == 'm' else 'bk1', female=(g == 'f'))
    F.draw(face, ears=False)
    hair = HAIR['brown'] if g == 'm' else HAIR['black']
    fr = [p for p in ell(CX, 29, 18, 9) if p[1] <= 33 and inner(*p)]
    hair_mass(face, fr, hair, seed=3, strand=2)
    L.append(face)
    if g == 'm':
        beard = layer()
        bp = [p for p in union(ell(CX, 62, 15, 10), ell(CX, 56, 15, 5)) if p[1] >= 53]
        bp = [p for p in bp if not (abs(p[0] - CX) < 5 and 58 <= p[1] <= 59)]
        hair_mass(beard, bp, HAIR['brown'], seed=2, strand=2, hi=False)
        for x in range(38, 59):
            beard.p(x, 54 + round(abs(x - CX) * 0.15), 'hn2')
        beard.hl(44, 58, 9, 'r0'); beard.hl(45, 59, 7, 'r1')
        L.append(beard)
    cap = layer()
    cp = []
    for y in range(76, 112):
        half = 22 + min(1.0, (y - 76) / 12) * 26
        for x in range(round(CX - half), round(CX + half) + 1):
            if y >= 104 and ((x + 3) // 7) % 2 and y >= 104 + ((x + 3) % 7):
                continue
            cp.append((x, y))
    shade_cyl(cap, cp, GREEN, vy=0.6)
    for (x, y) in cp:
        if (x + 2 * y) % 11 == 0:
            cap.p(x, y, 'v1')
    shade(cap, ell(CX, 86, 4.5, 4.5), GOLD)
    cap.r(46, 84, 2, 2, 'g3'); cap.p(CX, 86, 'v0')
    L.append(cap)
    return L


# ── Clérigo / Clériga ────────────────────────────────────────────────────

def clerigo(g):
    L = []
    ham = layer()
    B.draw_local(ham, (84, 166), -90, [B.rod(0, 128, 2.6, WOOD)], 1.0)
    ham.hl(81, 110, 6, 'g1'); ham.hl(81, 112, 6, 'g1')
    shade(ham, rect(66, 14, 30, 24), STEEL)
    ham.r(82, 14, 4, 24, 'g2'); ham.vl(82, 14, 24, 'g3'); ham.vl(85, 14, 24, 'g1')
    ham.hl(66, 37, 30, 's0'); ham.hl(66, 14, 30, 's4')
    L.append(ham)
    if g == 'f':
        veil = layer()
        vp = []
        for y in range(12, 122):
            t = (y - 12) / 109
            half = 23 + t * 24
            vp += [(x, y) for x in range(round(CX - half), round(CX + half) + 1) if 0 <= x < PW]
        vp = [p for p in vp if not (((p[0] - CX) / 17.5) ** 2 + ((p[1] - 47) / 25) ** 2 <= 1 and p[1] >= 26)]
        shade_cyl(veil, vp, LINEN, vy=0.3)
        for (x, y) in vp:
            if (x - CX) % 9 == 0 and y > 70 and hsh(x, y // 6, 1) < 0.8:
                veil.p(x, y, 'n0')
        L.append(veil)
    a = layer()
    arms(a, LINEN)
    for side in (-1, 1):
        cx = CX + side * 31
        for (x, y) in arm_pts(side):
            if (x - cx) % 8 == 3 and y > 120:
                a.p(x, y, 'n0')
        a.hl(cx - 13, 156, 27, 'g2'); a.hl(cx - 13, 157, 27, 'g1')
    L.append(a)
    body = layer()
    tp = torso_pts()
    shade_cyl(body, tp, LINEN, vy=0.4)
    for x in (34, 62):                                                    # estola
        sp = [(xx, y) for y in range(80, 168) for xx in range(x - 5, x + 6)]
        shade_cyl(body, sp, RED, vy=0.2)
        for y in range(92, 168, 14):
            body.hl(x - 3, y, 7, 'g2'); body.vl(x, y - 3, 7, 'g2'); body.p(x, y, 'g3')
        body.vl(x - 5, 80, 88, 'g1'); body.vl(x + 5, 80, 88, 'g0')
    body.hl(22, 142, 53, 'g1'); body.hl(22, 143, 53, 'g0')
    for (y, x0, x1) in ((110, 42, 54), (111, 40, 56), (112, 39, 57), (113, 38, 58), (114, 39, 57), (115, 40, 56), (116, 42, 54)):
        body.hl(x0, y, x1 - x0 + 1, 'g2')
    body.hl(42, 109, 13, 'g1'); body.hl(42, 117, 13, 'g1')
    shade(body, ell(48, 113, 3.4, 2.8), ['ember', 'f2', 'f3'])
    body.vl(48, 111, 5, 'noite')
    for k in range(5):                                                    # raios do olho
        body.p(48 + (k - 2) * 4, 105 - (2 - abs(k - 2)), 'g2')
    L.append(body)
    nk = layer()
    neck(nk, SKIN, y0=58, y1=84, w=9)
    L.append(nk)
    face = layer()
    F = Face(SKIN, eye='b2' if g == 'm' else 'v2', brow='wh1' if g == 'm' else 'hb0', female=(g == 'f'))
    F.draw(face, ears=(g == 'm'))
    if g == 'm':
        for (x, y) in ((36, 36), (37, 35), (58, 35), (59, 36)):            # rugas
            face.p(x, y, 'k1')
        face.hl(42, 30, 12, 'k1'); face.hl(43, 33, 10, 'k1')
    L.append(face)
    if g == 'm':
        top = layer()
        shade(top, [p for p in ell(CX, 31, 16, 10) if p[1] <= 31], SKIN)    # calva
        top.r(40, 23, 4, 2, 'k3'); top.p(44, 23, 'k3')
        for x0 in (28, 62):
            hp = [(x, y) for y in range(34, 60) for x in range(x0, x0 + 7)]
            hair_mass(top, hp, HAIR['white'], seed=x0, strand=2)
        L.append(top)
        beard = layer()
        bp = []
        for y in range(53, 128):
            t = (y - 53) / 74
            half = 17.5 - t * 11
            bp += [(x, y) for x in range(round(CX - half), round(CX + half) + 1)]
        bp = [p for p in bp if not (abs(p[0] - CX) < 4 and 58 <= p[1] <= 59)]
        hair_mass(beard, bp, HAIR['white'], seed=4, strand=2, hi=False)
        for x in range(36, 61):
            y = 54 + round(abs(x - CX) * 0.2)
            beard.p(x, y, 'wh2'); beard.p(x, y + 1, 'wh1')
        beard.hl(45, 58, 7, 'k0')
        L.append(beard)
    else:
        circ = layer()
        for x in range(28, 69):
            y = 25 + round(abs(x - CX) * 0.08)
            circ.p(x, y, 'g2'); circ.p(x, y + 1, 'g1')
        shade(circ, ell(48, 22, 4.5, 4.5), GOLD)
        circ.p(47, 21, 'g3'); circ.p(48, 22, 'ember')
        L.append(circ)
    return L


# ── Piromante ────────────────────────────────────────────────────────────

def piromante(g):
    L = []
    staff = layer()
    B.draw_local(staff, (84, 166), -90, [B.rod(0, 136, 2.6, WOOD)], 1.0)
    shade(staff, rect(76, 22, 17, 10), ['s0', 's1', 's2'])
    for x in (76, 77, 91, 92):
        staff.vl(x, 8, 15, 's1' if x in (76, 91) else 's2')
    L.append(staff)
    fl = layer()
    flame(fl, 84, 24, 24, t=0.6, w=8)
    L.append(fl)
    a = layer()
    arms(a, PURPLE)
    for side in (-1, 1):
        cx = CX + side * 31
        for (x, y) in arm_pts(side):
            if (x - cx) % 8 == 3 and y > 116:
                a.p(x, y, 'p0')
        for x in range(cx - 13, cx + 14):
            hh = 2 + round(hsh(x, 1, side + 3) * 3)
            for y in range(166 - hh, 168):
                a.p(x, y, 'f1' if y > 165 else 'f0')
    L.append(a)
    body = layer()
    tp = torso_pts(neck_w=14)
    shade_cyl(body, tp, PURPLE, vy=0.4)
    for (x, y) in tp:
        if (x - 4) % 10 == 9 and y > 110:
            body.p(x, y, 'p0')
    body.hl(22, 144, 53, 'g1'); body.hl(22, 145, 53, 'g0')
    body.r(40, 146, 4, 22, 'g1'); body.r(54, 146, 4, 18, 'g0')
    for y in range(80, 168):                                              # debrum em brasa
        for x in (CX - 1, CX):
            body.p(x, y, 'f1' if (y // 3) % 2 else 'f0')
    L.append(body)
    hood = layer()
    hp = []
    for y in range(0, 104):
        t = y / 103
        half = 3 + 33 * min(1.0, (t / 0.55)) ** 0.8 if t < 0.55 else 36 + (t - 0.55) * 22
        tilt = round(-t * 4 + (t ** 2) * 2)
        hp += [(x, y) for x in range(round(CX - half) + tilt, round(CX + half) + 1) if 0 <= x < PW]
    shade_cyl(hood, hp, PURPLE, vy=0.4)
    for (x, y) in hp:
        if y > 52 and (x - 6) % 11 == 0:
            hood.p(x, y, 'p0')
    inner = lambda x, y: ((x - CX) / 19) ** 2 + ((y - 52) / 25) ** 2 <= 1
    void = [p for p in hp if inner(*p)]
    shade(hood, void, ['noite', 'noite', 'p0'], spec=False)
    for (x, y) in void:
        if not inner(x, y + 2) or not inner(x + 2, y) or not inner(x - 2, y):
            hood.p(x, y, 'p0')
    for ex in (40, 54):
        hood.r(ex - 1, 47, 5, 3, 'f0'); hood.r(ex, 47, 3, 3, 'f1'); hood.r(ex, 48, 3, 1, 'f2'); hood.p(ex + 1, 48, 'f3')
        hood.p(ex + 1, 46, 'f0')
    if g == 'f':
        chin = [p for p in ell(CX, 67, 13, 10) if p[1] >= 59 and inner(*p)]
        shade_cyl(hood, chin, SKIN, spec=False)
        hood.hl(44, 67, 9, 'r2'); hood.hl(43, 68, 11, 'r0'); hood.hl(45, 69, 7, 'r2'); hood.hl(47, 69, 2, 'r3')
        hood.vl(48, 60, 4, 'k1'); hood.p(46, 63, 'k0'); hood.p(50, 63, 'k0')
        for x0, side in ((28, -1), (62, 1)):
            pts = []
            for y in range(58, 126):
                t = (y - 58) / 67
                w = 7 if t < 0.75 else max(2, round(7 - (t - 0.75) * 20))
                xo = x0 + round(math.sin(y * 0.09) * 1.2) + round(side * t * 3)
                pts += [(xo + d + (7 - w) // 2, y) for d in range(w)]
            hair_mass(hood, pts, HAIR['red'], seed=x0, strand=2)
    hood.hl(4, 103, 88, 'p0')
    L.append(hood)
    hand = layer()
    hand_pal = SKIN if g == 'f' else ['k0', 'k0', 'k1', 'k1']
    shade(hand, ell(15, 160, 8, 6), hand_pal, spec=False)
    for x in (10, 13, 16, 19):
        hand.vl(x, 155, 4, hand_pal[0])
    L.append(hand)
    palm = layer()
    flame(palm, 15, 154, 22, t=1.7, w=7)
    L.append(palm)
    return L


LOOK = {'guardiao': guardiao, 'selvagem': selvagem, 'lanceiro': lanceiro,
        'arqueiro': arqueiro, 'clerigo': clerigo, 'piromante': piromante}


def portrait(cls, g):
    return compose(LOOK[cls](g))
