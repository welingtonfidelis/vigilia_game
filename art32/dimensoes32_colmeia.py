"""VII — Colmeia Pálida (M5 F6), em 16 e 32-bit: Zangão de Quitina, Mariposa Pálida, Casulo Vivo
e A Rainha dos Esporos. Quitina ocre com aros escuros, asas de cera pálida com veios, seda de
casulo, ovos e esporos acesos em amarelo-esverdeado."""
from __future__ import annotations

import math

from dimensoes32_base import Dual, cyl, dmarks, fill, hsh, seg, sphere, vol

CHITIN = [(40, 26, 12), (78, 52, 22), (124, 86, 36), (170, 126, 58), (210, 174, 98)]
BAND = [(20, 14, 8), (36, 26, 14), (54, 40, 22)]
WING = [(96, 92, 74), (138, 134, 112), (180, 176, 152), (214, 212, 192), (238, 236, 222)]
VEIN = (86, 78, 56)
SPORE = [(80, 80, 20), (140, 140, 40), (200, 200, 70), (236, 236, 140), (252, 250, 210)]
SILK = [(96, 92, 76), (136, 132, 112), (176, 172, 150), (210, 206, 186), (236, 234, 220)]
FUR = [(110, 102, 82), (150, 142, 118), (192, 186, 162), (226, 222, 204)]
LEG = [(24, 18, 12), (44, 34, 22), (68, 54, 34), (96, 78, 50)]
RUST = [(90, 34, 20), (150, 62, 30), (206, 110, 46), (240, 170, 90)]
CROWN = [(60, 20, 14), (110, 40, 24), (170, 70, 34), (220, 140, 60), (246, 206, 130)]


def pal_k(K, key):
    return K[key]


# ── Zangão de Quitina (24×32), soldado em pé, braço-foice ─────────────────

class Zangao(Dual):
    mid, stem, act, size16, style, kind = 'zangao', 'zangao', 'VII', (24, 32), 'legs', 'monster'
    name = 'Zangão de Quitina'
    glow = {'spore'}
    lift = 1.5

    def pal(self):
        return {'chitin': CHITIN, 'band': BAND, 'wing': WING, 'spore': SPORE, 'leg': LEG}

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        if P.atk is None:
            ex, ey = 21.5, 17 + b + P.swing * 0.5          # ponta da foice
        else:
            ex, ey = [(18, 10), (19, 2.5), (23, 21), (22, 16)][P.atk]
        flap = (t % 2) * 0.8

        def wings(p):
            self.wing(p, (11, 12 + b), (4, 2.5 + b - flap), 2.4, K['wing'], VEIN, 11)
            self.wing(p, (11, 13 + b), (2.5, 9 + b - flap * 0.5), 1.9, K['wing'], VEIN, 12)

        def legs(p):
            for x0, lift in ((9, ll), (13, lr)):
                knee = (x0 - 1, 25.5 - lift * 0.5)
                vol(p, self.taper(seg(x0 + 1, 20 + b, *knee), 1.1, 0.8), K['leg'], spec=False)
                vol(p, self.taper(seg(*knee, x0 + 1.5, 30.5 - lift), 0.8, 0.5), K['leg'], spec=False)
                fill(p, self.r(x0 + 0.5, 30.5 - lift, 3, 1), K['leg'][1])

        def abdomen(p):
            self.segments(p, (10, 17 + b), (3, 24.5 + b), 3.8, K['chitin'], K['band'][1], 4)
            vol(p, self.taper(seg(3.5, 24 + b, 1.5, 26.5 + b), 0.7, 0.2), K['chitin'], spec=False)   # ferrão
            dmarks(p, P, 21, self.s, area=(3, 16 + b, 10, 24 + b))

        def thorax(p):
            pts = self.e(12.5, 15 + b, 4.2, 4)
            sphere(p, pts, K['chitin'], 12.5 * self.s, (15 + b) * self.s, 4.2 * self.s, 4 * self.s)
            for i in range(3):
                self.dot(p, 10.5 + i * 1.5, 12.5 + b + (i % 2) * 0.5, K['chitin'][4] if i == 1 else K['chitin'][3])
            dmarks(p, P, 23, self.s, area=(9, 12 + b, 15, 18 + b))

        def head(p):
            hy = 9 + b
            pts = self.e(16.2, hy, 3.3, 3)
            sphere(p, pts, K['chitin'], 16.2 * self.s, hy * self.s, 3.3 * self.s, 3 * self.s)
            for (ax, ay, bx, by) in ((15.2, hy - 2.5, 13, hy - 6.5), (16.8, hy - 2.6, 19.5, hy - 7)):
                fill(p, self.taper(seg(ax, ay, bx, by), 0.45, 0.25), K['leg'][2])
                self.dot(p, bx, by, K['leg'][3])
            eye = self.e(17.8, hy - 0.2, 1.4, 1.6)
            fill(p, eye, K['spore'][2] if not P.hurt else K['spore'][0])
            if not P.hurt:
                self.dot(p, 18.2, hy - 0.9, K['spore'][4 if t % 2 == 0 else 3])
                self.fine(p, 35, round((hy + 0.6) * 2), K['spore'][3])
            fill(p, self.taper(seg(18.6, hy + 1.6, 20.4, hy + 2.6), 0.55, 0.3), K['chitin'][1])

        def arm(p):
            sx, sy = 14, 14 + b
            mx, my = (sx + ex) / 2 - 0.5, (sy + ey) / 2 + 2
            vol(p, self.taper(seg(sx, sy, mx, my), 1.1, 0.8), K['chitin'], spec=False)
            blade = self.taper(seg(mx, my, ex, ey), 1.0, 0.25)
            vol(p, blade, [K['chitin'][1], K['chitin'][2], K['chitin'][3], K['chitin'][4], K['wing'][4]])
            # gancho da ponta e serrilha clara no fio
            hx, hy = ex - (ex - mx) * 0.12, ey + 1
            fill(p, self.taper(seg(ex, ey, hx - 0.8, hy + 0.6), 0.4, 0.2), K['chitin'][3])
            for k in (0.35, 0.65):
                self.dot(p, mx + (ex - mx) * k, my + (ey - my) * k - 0.8, K['wing'][4])

        return [wings, legs, abdomen, thorax, head, arm]


# ── Mariposa Pálida (24×24), voa batendo as asas ──────────────────────────

class Mariposa(Dual):
    mid, stem, act, size16, style, kind = 'mariposa', 'mariposa', 'VII', (24, 24), 'float', 'monster'
    name = 'Mariposa Pálida'
    glow = {'spore', 'rust'}

    def pal(self):
        return {'wing': WING, 'fur': FUR, 'spore': SPORE, 'rust': RUST, 'leg': LEG}

    def layers(self, P, K):
        b, t = P.bob, P.t
        up = [0, 1.2, 2.4, 1.2][t] if P.atk is None else [2.4, 0, -1, 1][P.atk]
        lg = 0 if P.atk is None else [0, 1, 2, 1][P.atk]
        dark = [mul_r(c, 0.78) for c in K['wing']]

        def back_wings(p):
            self.wing(p, (11 + lg, 11 + b), (3.5 + lg, 3 + b + up), 3.8, dark, VEIN, 31)
            self.wing(p, (11 + lg, 13 + b), (5 + lg, 18.5 + b - up * 0.3), 2.8, dark, VEIN, 32)

        def body(p):
            pts = self.oval(12.5 + lg, 8 + b, 11.5 + lg, 18.5 + b, 2.1)
            for (x, y, u, v) in pts:
                i = max(0, min(3, int((0.6 - 0.45 * v + 0.15 * math.sin((u + 1) * 7)) * 4)))
                p.p(x, y, K['fur'][i])
            head = self.e(13 + lg, 7.2 + b, 1.7, 1.6)
            sphere(p, head, K['fur'], (13 + lg) * self.s, (7.2 + b) * self.s, 1.7 * self.s, 1.6 * self.s)
            for (bx, by) in ((10 + lg, 2.8 + b), (16.5 + lg, 3.2 + b)):
                path = seg(13 + lg, 6 + b, bx, by)
                fill(p, self.taper(path, 0.5, 0.25), K['fur'][1])
                if self.s == 2:                                                    # antena de pena
                    for k in range(1, len(path), 3):
                        x, y = path[k]
                        p.p(round(x * 2) - 1, round(y * 2) + 1, K['fur'][2])
            if not P.hurt:
                self.dot(p, 14.2 + lg, 6.9 + b, K['spore'][4 if t % 2 == 0 else 3])
            for k in range(3):
                fill(p, self.taper(seg(11.5 + lg + k * 0.9, 15 + b, 10.8 + lg + k, 19.5 + b), 0.35, 0.2), K['leg'][2])

        def front_wings(p):
            self.wing(p, (12.5 + lg, 11 + b), (21 + lg, 2.5 + b + up), 4.2, K['wing'], VEIN, 33)
            self.wing(p, (12.5 + lg, 13.5 + b), (18.5 + lg, 19.5 + b - up * 0.3), 3.0, K['wing'], VEIN, 34)
            cx, cy = 17.8 + lg, 7.8 + b + up * 0.55                                 # olho falso na asa
            fill(p, self.e(cx, cy, 1.9, 1.7), K['rust'][1])
            fill(p, self.e(cx, cy, 1.0, 0.9), K['spore'][3 if t % 2 else 2])
            self.fine(p, round(cx * 2) - 1, round(cy * 2) - 1, K['spore'][4])
            dmarks(p, P, 35, self.s, area=(13 + lg, 3 + b, 21 + lg, 13 + b))

        return [back_wings, body, front_wings]


def mul_r(c, k):
    return tuple(max(0, min(255, round(v * k))) for v in c[:3])


# ── Casulo Vivo (32×40), casulo de seda que anda em perninhas ─────────────

class Casulo(Dual):
    mid, stem, act, size16, style, kind = 'casulo', 'casulo', 'VII', (32, 40), 'legs', 'monster'
    name = 'Casulo Vivo'
    glow = {'spore'}
    lift = 1.0

    def pal(self):
        return {'silk': SILK, 'spore': SPORE, 'leg': LEG, 'band': BAND}

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        lx = 0 if P.atk is None else [-0.6, 1, 2.6, 1][P.atk]
        gape = (1.2 if P.atk in (1, 2) else 0) + (t % 2) * 0.3

        def legs(p):
            for i, x0 in enumerate((7.5, 11.5, 17, 21)):
                lift = ll if i % 2 == 0 else lr
                knee = (x0 - 1.8, 33.5 - lift * 0.6)
                vol(p, self.taper(seg(x0 + 1.2, 29, *knee), 0.8, 0.6), K['leg'], spec=False)
                vol(p, self.taper(seg(*knee, x0 - 0.6, 39 - lift), 0.6, 0.35), K['leg'], spec=False)

        def pod(p):
            cx, cy = 16 + lx * 0.5, 19 + b
            pts = self.oval(cx - 0.8, cy - 13, cx + 0.8, cy + 12, 10.2)
            silk = K['silk']
            s = self.s
            for (x, y, u, v) in pts:
                wrap = math.sin(((u + 1) * 6.5 + v * 1.2) * math.pi / 2)        # voltas de seda
                lump = 0.08 * math.sin(v * 5 + u * 3)
                shade = 0.58 - 0.38 * v - 0.18 * u + 0.14 * wrap + lump
                i = max(0, min(4, int(shade * 5)))
                if abs(wrap) > 0.93 and s == 2:
                    i = max(0, i - 1)
                p.p(x, y, silk[i])
            if s == 2:
                for i in range(12):                                             # fios soltos
                    x = round((cx - 9 + 18 * hsh(i, 0, 41)) * 2)
                    y = round((cy - 11 + 22 * hsh(i, 1, 41)) * 2)
                    for j in range(6):
                        if p.g(x + j, y + j // 2) is not None:
                            p.p(x + j, y + j // 2, silk[4] if j % 2 else silk[3])
            dmarks(p, P, 43, self.s, area=(7, 8 + b, 14, 30 + b))

        def slit(p):
            cx = 18.5 + lx
            top, bot = 9.5 + b, 27.5 + b
            w = 1.7 + gape
            pts = self.pg([(cx, top), (cx + w, (top + bot) / 2 - 1), (cx + w * 0.4, bot), (cx - w * 0.6, (top + bot) / 2)])
            sp = K['spore']
            for (x, y) in pts:
                k = abs(x / self.s - cx) / max(0.5, w)
                p.p(x, y, sp[4] if k < 0.2 and self.s == 2 else (sp[3] if k < 0.45 else (sp[2] if k < 0.8 else sp[1])))
            ey = (top + bot) / 2 - 2.5                                          # a larva lá dentro
            if not P.hurt:
                self.dot(p, cx - 0.4, ey, K['band'][0]); self.dot(p, cx + 0.9, ey + 0.4, K['band'][0])
            fill(p, self.taper(seg(cx - 0.5, ey + 3, cx + 1, ey + 3.4), 0.4, 0.4), K['band'][1])

        def lips(p):
            cx = 18.5 + lx
            top, bot = 9.5 + b, 27.5 + b
            w = 1.7 + gape
            for (a, c) in (((cx - w * 0.6 - 0.8, (top + bot) / 2), K['silk'][1]), ((cx + w + 0.7, (top + bot) / 2 - 1), K['silk'][3])):
                vol(p, self.taper(seg(cx, top + 0.5, a[0], a[1]) + seg(a[0], a[1], cx + 0.2, bot - 0.5), 0.55, 0.45), K['silk'], spec=False)

        return [legs, pod, lips, (slit, 'noring')]


# ── A Rainha dos Esporos (56×56), rainha voadora de ventre cheio de ovos ──

class Rainha(Dual):
    mid, stem, act, size16, style, kind = 'rainhaEsporos', 'rainha-esporos', 'VII', (56, 56), 'float', 'boss'
    name = 'A Rainha dos Esporos'
    glow = {'spore'}

    def pal(self):
        return {'chitin': CHITIN, 'band': BAND, 'wing': WING, 'spore': SPORE, 'leg': LEG, 'silk': SILK, 'crown': CROWN}

    def layers(self, P, K):
        b, t = P.bob, P.t
        flap = [0, 1.5, 3, 1.5][t]
        if P.atk is None:
            sx, sy = 48, 38 + b
        else:
            sx, sy = [(45, 22), (47, 8), (54, 42), (50, 32)][P.atk]
        phase2 = P.mode == 'phase2'
        torn = 0.22 if phase2 else 0.0

        def wings_back(p):
            dark = [mul_r(c, 0.8) for c in K['wing']]
            self.wing(p, (27, 23 + b), (3, 2 + b + flap), 6, dark, VEIN, 51, torn)
            self.wing(p, (26, 26 + b), (1.5, 21 + b + flap * 0.4), 4.4, dark, VEIN, 52, torn)

        def legs(p):
            for (ax, ay, bx, by) in ((28, 33 + b, 25.5, 43 + b), (31.5, 34 + b, 32, 44 + b), (34, 33 + b, 37, 42 + b)):
                vol(p, self.taper(seg(ax, ay, bx, by), 0.9, 0.5), K['leg'], spec=False)

        def abdomen(p):
            sp = K['spore']

            def eggs(pp, x, y, u, v, k):
                # ovos acesos sob a pele, entre os aros
                if (k % 1) > 0.3 and (k % 1) < 0.8 and abs(v) < 0.55 and hsh(int(k), int((v + 1) * 2), 17) < 0.7:
                    d = abs((k % 1) - 0.55) * 2 + abs(v) * 0.9
                    if d < 0.55:
                        pp.p(x, y, sp[3] if d < 0.25 and (int(k) + t) % 3 else sp[2])

            self.segments(p, (28, 32 + b), (3, 45 + b), 9.5, K['silk'], K['band'][1], 6, eggs)
            dmarks(p, P, 55, self.s, area=(5, 32 + b, 24, 46 + b))

        def thorax(p):
            pts = self.e(30.5, 28 + b, 7.4, 7.2)
            sphere(p, pts, K['chitin'], 30.5 * self.s, (28 + b) * self.s, 7.4 * self.s, 7.2 * self.s)
            for (ax, ay, bx, by) in ((25, 24 + b, 35, 22 + b), (24.5, 28 + b, 36.5, 27 + b)):      # aros da couraça
                fill(p, self.thick(seg(ax, ay, bx, by), 0.25 if self.s == 2 else 0.01), K['chitin'][1])
            for i in range(4):
                self.dot(p, 27 + i * 1.8, 23 + b + (i % 2), K['chitin'][4] if i % 2 else K['chitin'][3])
            dmarks(p, P, 57, self.s, area=(25, 23 + b, 35, 33 + b))

        def wings_front(p):
            self.wing(p, (29, 22 + b), (12, 0.5 + b + flap), 5.2, K['wing'], VEIN, 53, torn)

        def head(p):
            hx, hy = 38, 17.5 + b
            pts = self.e(hx, hy, 5.4, 4.8)
            sphere(p, pts, K['chitin'], hx * self.s, hy * self.s, 5.4 * self.s, 4.8 * self.s)
            for i, (tx, ty) in enumerate(((33, 6.5), (35.5, 4.5), (38.5, 3.5), (41.5, 4.5), (44, 7.5))):
                vol(p, self.taper(seg(tx + (hx - tx) * 0.25, hy - 3.2, tx, ty + b), 1.2, 0.3), K['crown'])
            for (ex, ey) in ((40.4, hy - 0.6), (42.2, hy + 0.9), (38.6, hy + 1.3)):
                fill(p, self.e(ex, ey, 0.95, 0.95), K['spore'][2] if not P.hurt else K['band'][1])
                if not P.hurt:
                    self.dot(p, ex, ey - 0.3, K['spore'][4 if t % 2 == 0 else 3])
            vol(p, self.taper(seg(41.5, hy + 3.4, 44.5, hy + 5.2), 0.7, 0.3), K['chitin'], spec=False)

        def scythe(p):
            shx, shy = 34.5, 25 + b
            mx, my = (shx + sx) / 2 + 1.5, (shy + sy) / 2 + 2.5
            vol(p, self.taper(seg(shx, shy, mx, my), 1.7, 1.2), K['chitin'], spec=False)
            blade = self.taper(seg(mx, my, sx, sy), 1.4, 0.3)
            vol(p, blade, K['crown'])
            hx, hy = sx - (sx - mx) * 0.1, sy + 1.4
            fill(p, self.taper(seg(sx, sy, hx - 1.2, hy + 0.8), 0.5, 0.2), K['crown'][3])
            for k in (0.3, 0.55, 0.8):
                self.dot(p, mx + (sx - mx) * k, my + (sy - my) * k - 1.2, K['crown'][4])

        def spores(p):
            if not phase2 and P.mode != 'core':
                return
            for i in range(10):
                x = (4 + 48 * hsh(i, t, 59)) * self.s
                y = (4 + 44 * hsh(i, 1, 59)) * self.s
                p.rect(round(x), round(y), self.s, self.s, K['spore'][3 if i % 2 else 2])

        return [wings_back, legs, abdomen, thorax, wings_front, head, scythe, (spores, 'noring')]


MONSTERS = [Zangao, Mariposa, Casulo, Rainha]


# ── Cenário: corredor de favos de cera e árvores-esporo ───────────────────

from dimensoes32_base import ACTS, Piece, dith  # noqa: E402
from lib32 import OL, noise  # noqa: E402

RAMP = ACTS['VII']['ramp']
WAX = [(70, 62, 40), (104, 94, 64), (140, 128, 92), (176, 164, 124), (206, 196, 158), (230, 222, 190)]
HONEY = [(90, 56, 14), (150, 96, 24), (206, 148, 44), (238, 200, 96)]
BARK = [(62, 60, 52), (98, 96, 84), (140, 138, 122), (182, 180, 164), (220, 218, 204)]
CEIL0, WALL0, WALL1 = 18, 21, 110
PILLARS = (0, 80, 160, 240)
FX_RAMP = [(40, 36, 16), (120, 116, 40), (200, 200, 70), (236, 236, 140), (252, 250, 210)]


def hex_cell(u, v, wc=10.0, hc=8.6):
    """Favo de cera: (dentro, dx, dy, id da célula) do ponto (u, v) em unidades 16-bit."""
    row = math.floor(v / hc)
    off = (row % 2) * wc / 2
    col = math.floor((u + off) / wc)
    dx = (u + off) - (col + 0.5) * wc
    dy = v - (row + 0.5) * hc
    a = abs(dx) / (wc / 2)
    bb = abs(dy) / (hc / 2)
    d = max(a * 0.92 + bb * 0.42, bb)
    return d, dx, dy, (col, row)


def honeycomb(pc: Piece, x0, x1, y0, y1, seed, light=1.0):
    """Parede de favos: aro de cera claro, fundo escuro; uns tampados, uns acesos com larva."""
    s = pc.s
    for X, Y, u, v in pc.each(x0, y0, x1, y1):
        d, dx, dy, cid = hex_cell(u + seed * 3.7, v, wc=13, hc=11.2)
        r = hsh(cid[0], cid[1], seed)
        # luz das tochas na altura do meio; o teto e o pé da parede ficam no escuro
        shade = light * (0.62 + 0.3 * noise(u, v, seed, 30)) - 0.55 * (abs(v - 74) / 56) ** 1.4
        if d > 0.84:                                                     # aro de cera
            k = 0.2 + 0.55 * shade + (0.1 if dy < 0 else -0.08)
            pc.c.p(X, Y, dith(WAX, k, X, Y, s))
        elif r < 0.12:                                                   # tampado com cera
            k = 0.1 + 0.45 * shade - 0.15 * (dy / 5.6) + (0.06 if s == 2 and hsh(X, Y, seed) < 0.15 else 0)
            pc.c.p(X, Y, dith(WAX, k, X, Y, s))
        elif r < 0.19:                                                   # mel aceso com larva
            k = 0.8 - 0.5 * (d / 0.84)
            pc.c.p(X, Y, dith(HONEY, k, X, Y, s))
            if abs(dx) < 1.3 and abs(dy + 0.5) < 0.9:
                pc.c.p(X, Y, HONEY[3] if s == 1 else (252, 236, 170))
        else:                                                            # fundo escuro do favo
            k = 0.06 + 0.18 * shade + 0.1 * max(0.0, -dy / 5.6)
            pc.c.p(X, Y, dith(RAMP, k, X, Y, s))


def trunk(pc: Piece, cx, top, bottom, w, seed, roots=True):
    """Árvore-esporo: tronco branco cilíndrico com lenticelas, raízes no pé e galhos no topo."""
    s = pc.s
    for X, Y, u, v in pc.each(cx - w / 2 - 6, top, cx + w / 2 + 6, bottom):
        half = w / 2 + (max(0.0, v - (bottom - 10)) * 0.7 if roots else 0)
        half += max(0.0, (top + 8 - v)) * 0.6                          # alarga no topo (galhos)
        wob = 0.6 * math.sin(v * 0.35 + seed)
        dx = u - cx - wob
        if abs(dx) > half:
            continue
        n = dx / max(0.5, half)
        k = 0.58 - 0.5 * n + 0.06 * math.sin(v * 0.9 + seed) - 0.4 * (abs(v - 74) / 60) ** 1.4
        col = dith(BARK, k, X, Y, s)
        if hsh(int(u * 0.5), int(v / 3), int(seed * 10)) < 0.12 and abs(n) < 0.7:   # lenticela escura
            col = BARK[0]
        if s == 2 and hsh(X, Y, int(seed * 10) + 1) < 0.05:
            col = BARK[1]
        pc.c.p(X, Y, col)
    # bordas do tronco em contorno escuro
    pts = [(X, Y) for X, Y, _, _ in pc.each(cx - w / 2 - 6, top, cx + w / 2 + 6, bottom) if pc.c.g(X, Y) in BARK]
    sset = set(pts)
    for (X, Y) in pts:
        if (X - 1, Y) not in sset or (X + 1, Y) not in sset:
            pc.c.p(X, Y, mul_r(BARK[0], 0.6))


def spore_pod(pc: Piece, cx, cy, r, seed, stalk_top=None):
    """Vagem de esporos pendurada, acesa por dentro."""
    s = pc.s
    if stalk_top is not None:
        for X, Y, u, v in pc.each(cx - 1, stalk_top, cx + 1, cy - r + 1):
            if abs(u - cx - 0.4 * math.sin(v * 0.4)) < 0.6:
                pc.c.p(X, Y, BARK[1])
    for X, Y, u, v in pc.each(cx - r - 1, cy - r * 1.3 - 1, cx + r + 1, cy + r * 1.3 + 1):
        nx, ny = (u - cx) / r, (v - cy) / (r * 1.3)
        q = nx * nx + ny * ny
        if q > 1:
            continue
        if q > 0.7:
            pc.c.p(X, Y, mul_r(SPORE[1], 0.7))
        else:
            k = 0.95 - 0.7 * q - 0.2 * nx - 0.1 * ny
            pc.c.p(X, Y, dith(SPORE, k, X, Y, s))
        if 0.7 < q and math.sin(math.atan2(ny, nx) * 6) > 0.6:
            pc.c.p(X, Y, mul_r(SPORE[0], 0.8))


def egg_niche(pc: Piece, cx, top, bottom, seed):
    """Nicho escuro na cera com um cacho de ovos pálidos acesos."""
    s = pc.s
    w = 14
    for X, Y, u, v in pc.each(cx - w, top, cx + w, bottom):
        ny = (v - top) / (bottom - top)
        half = w * math.sqrt(max(0.0, 1 - (1 - ny) ** 2 * 0.9))
        if abs(u - cx) <= half:
            edge = abs(u - cx) > half - 1.2 or v < top + 1.2
            pc.c.p(X, Y, dith(WAX, 0.55, X, Y, s) if edge else dith(RAMP, 0.08 + 0.12 * ny, X, Y, s))
    for i in range(7):
        ex = cx - 9 + 18 * hsh(i, 0, seed)
        ey = bottom - 3 - 6 * hsh(i, 1, seed) * (1 - abs(ex - cx) / 12)
        for X, Y, u, v in pc.each(ex - 2.2, ey - 3, ex + 2.2, ey + 3):
            nx, ny = (u - ex) / 2.1, (v - ey) / 2.8
            q = nx * nx + ny * ny
            if q <= 1:
                k = 0.95 - 0.55 * q - 0.25 * nx
                pc.c.p(X, Y, mul_r(SILK[1], 0.8) if q > 0.75 else dith(SPORE[1:], k, X, Y, s))


def wax_drips(pc: Piece, x0, x1, top, seed):
    s = pc.s
    for i in range(int((x1 - x0) / 5)):
        x = x0 + i * 5 + 2 * hsh(i, 0, seed)
        L_ = 6 + 16 * hsh(i, 1, seed)
        for X, Y, u, v in pc.each(x - 1.4, top, x + 1.4, top + L_ + 2):
            w = 1.3 * (1 - (v - top) / (L_ + 2)) + 0.4
            if abs(u - x) <= w:
                k = 0.75 - 0.3 * (u - x) / max(0.5, w)
                pc.c.p(X, Y, dith(WAX, k, X, Y, s))
        for X, Y, u, v in pc.each(x - 1, top + L_ + 0.5, x + 1, top + L_ + 2.5):
            if (u - x) ** 2 + (v - top - L_ - 1.5) ** 2 < 1.1:
                pc.c.p(X, Y, HONEY[2])


def tunnel(pc: Piece, cx, cy, r, seed):
    s = pc.s
    for X, Y, u, v in pc.each(cx - r - 3, cy - r - 3, cx + r + 3, cy + r + 3):
        d = math.hypot(u - cx, (v - cy) * 1.15)
        if d <= r:
            k = 0.02 + 0.1 * (d / r) ** 3
            pc.c.p(X, Y, dith(RAMP, k, X, Y, s))
        elif d <= r + 2.6:
            ang = math.atan2(v - cy, u - cx)
            k = 0.45 + 0.35 * math.cos(ang + 2.2) + (0.1 if math.sin(ang * 9) > 0.5 else 0)
            pc.c.p(X, Y, dith(CHITIN, k, X, Y, s))


def ceiling(pc: Piece, seed):
    s = pc.s
    for X, Y, u, v in pc.each(0, 0, pc.w16, CEIL0 + 3):
        rib = abs(((u + 10) % 20) - 10) < 2.2
        k = (0.2 if rib else 0.06) + 0.08 * (v / CEIL0) + (0.08 if rib and ((u + 10) % 20) < 10 else 0)
        pc.c.p(X, Y, dith(CHITIN if rib else RAMP, k, X, Y, s))
    for X, Y, u, v in pc.each(0, CEIL0, pc.w16, CEIL0 + 2):
        pc.c.p(X, Y, dith(WAX, 0.3 + 0.1 * (v - CEIL0), X, Y, s))


def plinth(pc: Piece, seed):
    s = pc.s
    for X, Y, u, v in pc.each(0, WALL1, pc.w16, pc.h16):
        lump = 2.5 * noise(u, 0, seed, 9) + 1.5 * math.sin(u * 0.4)
        if v < WALL1 + 4 + lump:
            k = 0.5 + 0.3 * noise(u, v, seed + 1, 5) - 0.25 * (v - WALL1) / 8
            pc.c.p(X, Y, dith(WAX, k, X, Y, s))
        else:
            k = 0.12 + 0.15 * noise(u, v, seed + 2, 7)
            pc.c.p(X, Y, dith(RAMP, k, X, Y, s))


PLAN = {'a': ['pod', 'eggs', 'drips', 'tunnel'], 'b': ['eggs', 'tunnel', 'pod', 'drips']}


def wall(variant: str, s: int) -> Image.Image:
    pc = Piece(320, 192, s)
    seed = 7 if variant == 'a' else 19
    honeycomb(pc, 0, 320, CEIL0, WALL1 + 2, seed)
    ceiling(pc, seed)
    for i, feat in enumerate(PLAN[variant]):
        cx = PILLARS[i] + 40
        sd = seed * 10 + i
        if feat == 'pod':
            spore_pod(pc, cx - 8, 46, 5, sd, stalk_top=CEIL0)
            spore_pod(pc, cx + 9, 62, 4, sd + 1, stalk_top=CEIL0)
        elif feat == 'eggs':
            egg_niche(pc, cx, 58, WALL1 - 2, sd)
        elif feat == 'drips':
            wax_drips(pc, cx - 22, cx + 22, CEIL0 + 2, sd)
            spore_pod(pc, cx, 84, 3.5, sd + 2)
        else:
            tunnel(pc, cx, 70, 15, sd)
    plinth(pc, seed)
    for px in PILLARS + (320,):
        trunk(pc, px, 0, WALL1 + 6, 12, px * 0.1 + seed)
    return pc.image()


def door(s: int) -> Image.Image:
    pc = Piece(48, 192, s)
    trunk(pc, 24, 4, 132, 18, 3.3)
    for X, Y, u, v in pc.each(4, 0, 44, 8):                               # nó de quitina no alto
        if abs(u - 24) < 20 - v * 1.2:
            k = 0.5 + 0.3 * math.cos((u - 24) * 0.2) - 0.05 * v
            pc.c.p(X, Y, dith(CHITIN, k, X, Y, s))
    for y in (30, 70, 104):                                               # aros de quitina no tronco
        for X, Y, u, v in pc.each(13, y, 35, y + 3):
            if pc.c.g(X, Y) is not None:
                pc.c.p(X, Y, dith(CHITIN, 0.65 - 0.2 * (v - y), X, Y, s))
    spore_pod(pc, 33, 52, 3, 9)
    return pc.image()


def entry(s: int) -> Image.Image:
    pc = Piece(72, 192, s)
    honeycomb(pc, 0, 72, CEIL0, WALL1 + 2, 31, light=0.7)
    ceiling(pc, 31)
    plinth(pc, 31)
    # escada de cera descendo da esquerda, com a boca escura do poço
    for X, Y, u, v in pc.each(0, 0, 30, 120):
        if (u - 0) ** 2 / 26 ** 2 + (v - 120) ** 2 / 96 ** 2 < 1 and v > 24:
            pc.c.p(X, Y, dith(RAMP, 0.02 + 0.05 * (u / 30), X, Y, s))
    for i in range(8):
        y = 36 + i * 11
        x = 2 + i * 7
        for X, Y, u, v in pc.each(x - 2, y, x + 10, y + 11):
            top = v < y + 2.2
            k = (0.7 if top else 0.32) - 0.03 * i + (0.08 if u < x + 1 else 0)
            pc.c.p(X, Y, dith(WAX, k, X, Y, s))
    for X, Y, u, v in pc.each(0, 0, 72, 192):                               # escurece para a esquerda
        if bay(X, Y) < max(0.0, 0.6 - u / 72):
            c = pc.c.g(X, Y)
            if c:
                pc.c.p(X, Y, mul_r(c, 0.55))
    trunk(pc, 72, 0, WALL1 + 6, 12, 7.0)
    return pc.image()


def floor(s: int) -> Image.Image:
    pc = Piece(320, 64, s)
    for X, Y, u, v in pc.each(0, 0, 320, 64):
        d, dx, dy, cid = hex_cell(u * 0.8, v * 1.7 + 3, wc=18, hc=14)
        edge = d > 0.86
        k = 0.34 - 0.26 * (v / 64) + 0.08 * noise(u, v, 5, 11)
        if edge:
            pc.c.p(X, Y, dith(RAMP, max(0.03, k - 0.2), X, Y, s))
        else:
            k += 0.06 * hsh(cid[0], cid[1], 3) - 0.05 * (dy / 7)
            pc.c.p(X, Y, dith(WAX if v < 12 else RAMP, k + (0.05 if v < 12 else 0.08), X, Y, s))
        if hsh(int(u), int(v), 9) < 0.006:
            pc.c.p(X, Y, SPORE[3])
    for X, Y, u, v in pc.each(0, 0, 320, 3):                               # beira de cera irregular
        if v < 2.2 + 1.2 * math.sin(u * 0.31) and hsh(int(u / 4), 0, 4) < 0.5:
            pc.c.p(X, Y, None)
    return pc.image()


def fore(s: int) -> Image.Image:
    pc = Piece(320, 32, s)
    for i in range(9):
        cx = 14 + i * 36 + 8 * hsh(i, 0, 61)
        h = 6 + 8 * hsh(i, 1, 61)
        for X, Y, u, v in pc.each(cx - 10, 32 - h - 3, cx + 10, 32):
            if hsh(i, 2, 61) < 0.5:                                          # cogumelo-esporo baixo
                cap = (u - cx) ** 2 / 36 + (v - (32 - h)) ** 2 / 6 < 1
                stem = abs(u - cx) < 1.2 and v > 32 - h
                if cap or stem:
                    pc.c.p(X, Y, RAMP[1] if cap else RAMP[0])
            else:                                                             # torrão de cera
                if (u - cx) ** 2 / 64 + (v - 32) ** 2 / (h * h * 0.4) < 1:
                    pc.c.p(X, Y, RAMP[1] if v < 30 else RAMP[0])
    return pc.image()


def corridor(s: int) -> dict:
    return {'wall-a': wall('a', s), 'wall-b': wall('b', s), 'floor': floor(s), 'fore': fore(s), 'door': door(s), 'entry': entry(s)}


# ── Objetos ───────────────────────────────────────────────────────────────

def prop_eggs(s):
    pc = Piece(32, 32, s)
    for X, Y, u, v in pc.each(2, 24, 30, 32):
        if (u - 16) ** 2 / 196 + (v - 32) ** 2 / 64 < 1:
            pc.c.p(X, Y, dith(WAX, 0.55 - 0.3 * (v - 24) / 8, X, Y, s))
    for i, (ex, ey) in enumerate(((10, 24), (16, 22), (22, 24), (13, 18), (19, 18), (16, 13))):
        for X, Y, u, v in pc.each(ex - 3, ey - 4, ex + 3, ey + 4):
            nx, ny = (u - ex) / 2.8, (v - ey) / 3.6
            q = nx * nx + ny * ny
            if q <= 1:
                pc.c.p(X, Y, mul_r(SILK[1], 0.75) if q > 0.78 else dith(SPORE[1:], 0.95 - 0.6 * q - 0.2 * nx, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def prop_stalk(s):
    pc = Piece(32, 64, s)
    trunk(pc, 16, 22, 64, 5, 2.2)
    spore_pod(pc, 16, 14, 7, 4)
    pc.c.outline(OL)
    return pc.image()


def prop_lump(s):
    pc = Piece(64, 32, s)
    for X, Y, u, v in pc.each(0, 4, 64, 32):
        top = 32 - (18 * math.sqrt(max(0.0, 1 - ((u - 32) / 30) ** 2)) + 3 * math.sin(u * 0.5))
        if v >= top:
            d, dx, dy, cid = hex_cell(u, v, wc=7, hc=6)
            k = 0.6 - 0.35 * (v - top) / 20 + (0.1 if d > 0.85 else -0.1)
            pc.c.p(X, Y, dith(WAX, k, X, Y, s))
            if d < 0.5 and hsh(cid[0], cid[1], 8) < 0.25:
                pc.c.p(X, Y, HONEY[2])
    pc.c.outline(OL)
    return pc.image()


def prop_gate(s):
    """Portão do covil: duas costelas de quitina em arco, membrana de favo e o brilho do ninho."""
    pc = Piece(96, 96, s)
    for X, Y, u, v in pc.each(16, 14, 80, 96):                             # membrana de favo
        if ((u - 48) / 28) ** 2 + ((v - 96) / 76) ** 2 < 1:
            d, dx, dy, cid = hex_cell(u, v, wc=8, hc=7)
            glow = max(0.0, 1 - math.hypot(u - 48, v - 70) / 30)
            if d > 0.82:
                pc.c.p(X, Y, dith(WAX, 0.45 + 0.3 * glow, X, Y, s))
            else:
                pc.c.p(X, Y, dith(SPORE, 0.15 + 0.75 * glow * glow, X, Y, s) if glow > 0.2 else dith(RAMP, 0.15, X, Y, s))
    for side in (-1, 1):                                                   # costelas
        for i in range(140):
            k = i / 139
            x = 48 + side * 36 * math.cos(math.pi * 0.5 * k)
            y = 96 - 84 * math.sin(math.pi * 0.5 * k)
            w = 4.5 - 2.5 * k
            for X, Y, u, v in pc.each(x - w, y - 1, x + w, y + 1):
                n = (u - x) / w * side
                pc.c.p(X, Y, dith(CHITIN, 0.6 - 0.45 * n, X, Y, s))
    for X, Y, u, v in pc.each(30, 4, 66, 16):                             # coroa do arco
        if ((u - 48) / 18) ** 2 + ((v - 16) / 12) ** 2 < 1:
            pc.c.p(X, Y, dith(CROWN, 0.6 - (v - 4) / 30, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def props(s: int) -> dict:
    return {'boss-gate': prop_gate(s), 'eggs': prop_eggs(s), 'stalk': prop_stalk(s), 'lump': prop_lump(s)}


from dimensoes32_base import bay  # noqa: E402
from PIL import Image  # noqa: E402,F811
