"""IX — Cidadela de Engrenagens (M5 F6), em 16 e 32-bit: Autômato Sentinela, Aranha de Engrenagem,
Fornalha Ambulante e O Colosso de Ferro-negro. Ferro preto rebitado, latão, lâmpadas vermelhas,
brasa e vapor."""
from __future__ import annotations

import math

from PIL import Image

from dimensoes32_base import ACTS, Dual, Piece, bay, dith, dmarks, fill, hsh, seg, sphere, vol
from lib32 import OL, noise

IRONB = [(10, 10, 12), (22, 22, 26), (38, 38, 44), (58, 58, 66), (86, 86, 96), (124, 124, 134)]
BRASS = [(70, 44, 18), (120, 80, 30), (180, 130, 50), (226, 186, 92), (250, 230, 160)]
LAMP = [(120, 20, 16), (190, 40, 24), (240, 80, 40), (255, 170, 110), (255, 230, 200)]
FIRE = [(120, 30, 12), (200, 70, 20), (246, 140, 40), (255, 210, 110), (255, 246, 210)]
STEAM = [(70, 70, 76), (110, 110, 116), (156, 156, 160)]


def rivets(m: Dual, p, pts, K, step: float, seed: int):
    """Rebites: pontinhos claros com sombra embaixo, em fileiras."""
    sset = set(pts)
    s = m.s
    for (x, y) in pts:
        u, v = x / s, y / s
        if (u % step) < 1 / s and (v % step) < 1 / s and (x, y + s) in sset:
            p.rect(x, y, s, s, K['iron'][4])
            if s == 2:
                p.p(x, y, K['iron'][5])
                p.p(x + 1, y + 1, K['iron'][2])


def gear(m: Dual, p, cx, cy, r, teeth, rot, ramp, hole=True):
    """Engrenagem: disco de latão com dentes, aro e furo no meio (gira com rot)."""
    s = m.s
    out = []
    for (x, y) in m.e(cx, cy, r + 1.0, r + 1.0):
        u, v = x / s - cx, y / s - cy
        d = math.hypot(u, v)
        a = math.atan2(v, u) + rot
        tooth = math.cos(a * teeth) > 0.2
        if d <= r or (tooth and d <= r + 1.0):
            out.append((x, y))
            if hole and d < r * 0.28:
                p.p(x, y, ramp[0])
                continue
            k = 0.6 - 0.35 * (u / (r + 1)) - 0.3 * (v / (r + 1)) - (0.2 if abs(d - r * 0.62) < 0.5 else 0)
            p.p(x, y, ramp[max(0, min(len(ramp) - 1, int(k * len(ramp))))])
    return out


# ── Autômato Sentinela (24×32) ────────────────────────────────────────────

class Automato(Dual):
    mid, stem, act, size16, style, kind = 'automato', 'automato', 'IX', (24, 32), 'legs', 'monster'
    name = 'Autômato Sentinela'
    glow = {'lamp'}
    lift = 1.5

    def pal(self):
        return {'iron': IRONB, 'brass': BRASS, 'lamp': LAMP}

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        if P.atk is None:
            tx, ty = 22, 9 + b                                   # ponta da lança
        else:
            tx, ty = [(18, 4), (19, 2), (24, 15), (22, 12)][P.atk]

        def legs(p):
            for x0, lift in ((9, ll), (13, lr)):
                thigh = self.r(x0, 20 + b, 3, 5)
                vol(p, thigh, K['iron'], spec=False)
                fill(p, self.e(x0 + 1.5, 25.5 - lift * 0.5, 1.6, 1.4), K['brass'][2])     # joelho
                shin = self.r(x0 + 0.2, 26 - lift * 0.5, 2.6, 5 - lift * 0.5)
                vol(p, shin, K['iron'], spec=False)
                fill(p, self.r(x0 - 0.5, 30.5 - lift, 4, 1.5), K['iron'][1])

        def torso(p):
            pts = self.t(12 + b, 21 + b, 7.5, 16.5, 8.5, 15.5)
            vol(p, pts, K['iron'])
            rivets(self, p, pts, K, 3, 71)
            gear(self, p, 12, 16 + b, 2.6, 8, t * 0.2, K['brass'])
            fill(p, self.r(8, 20.5 + b, 9, 1), K['brass'][1])                            # cinto de latão
            dmarks(p, P, 73, self.s, area=(8, 12 + b, 16, 20 + b))

        def head(p):
            hy = 8 + b
            pts = self.e(12.5, hy, 3.4, 3.2)
            sphere(p, pts, K['iron'], 12.5 * self.s, hy * self.s, 3.4 * self.s, 3.2 * self.s)
            fill(p, self.r(9.5, hy + 0.2, 6, 1.2), K['brass'][2])                         # aro do visor
            if not P.hurt:
                fill(p, self.e(14, hy - 0.4, 1.2, 1.1), K['lamp'][2])
                self.dot(p, 14.2, hy - 0.8, K['lamp'][4 if t % 2 == 0 else 3])
            else:
                fill(p, self.e(14, hy - 0.4, 1.2, 1.1), K['lamp'][0])
            fill(p, self.taper(seg(12.5, hy - 3, 12.5, hy - 5.2), 0.4, 0.3), K['brass'][2])  # antena
            self.dot(p, 12.5, hy - 5.4, K['lamp'][3])

        def spear(p):
            gx, gy = 15.5, 15 + b                                                        # punho
            bx, by = gx - (tx - gx) * 0.6, gy - (ty - gy) * 0.6
            fill(p, self.taper(seg(bx, by, tx, ty), 0.45, 0.45), K['iron'][3])
            hd = self.taper(seg(tx - (tx - gx) * 0.18, ty - (ty - gy) * 0.18, tx + (tx - gx) * 0.12, ty + (ty - gy) * 0.12), 1.0, 0.2)
            vol(p, hd, [K['iron'][3], K['iron'][4], K['iron'][5], (200, 204, 210), (240, 242, 246)])
            vol(p, self.e(gx, gy, 1.7, 1.5), K['brass'], spec=False)

        return [legs, torso, head, spear]


# ── Aranha de Engrenagem (32×24), enxame de corda ─────────────────────────

class AranhaEng(Dual):
    mid, stem, act, size16, style, kind = 'aranhaEngrenagem', 'aranha-engrenagem', 'IX', (32, 24), 'legs', 'monster'
    name = 'Aranha de Engrenagem'
    glow = {'lamp'}
    lift = 1.5

    def pal(self):
        return {'iron': IRONB, 'brass': BRASS, 'lamp': LAMP}

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        lg = 0 if P.atk is None else [-0.5, 1, 2.5, 1][P.atk]

        def legs(p):
            for i, (hx, out) in enumerate(((12, -1), (14, -1), (17, 1), (19, 1), (21, 1), (10, -1))):
                lift = ll if i % 2 == 0 else lr
                knee = (hx + out * 4 + lg * 0.5, 9 + b - lift * 0.3)
                foot = (hx + out * 7 + lg, 23 - lift)
                fill(p, self.taper(seg(hx + lg * 0.5, 14 + b, *knee), 0.6, 0.5), K['iron'][3])
                fill(p, self.taper(seg(*knee, *foot), 0.5, 0.25), K['iron'][2])
                self.dot(p, *knee, K['brass'][2])

        def body(p):
            cx, cy = 16 + lg * 0.5, 14 + b
            pts = self.e(cx, cy, 6, 4)
            sphere(p, pts, K['brass'], cx * self.s, cy * self.s, 6 * self.s, 4 * self.s)
            gear(self, p, cx - 0.5, cy - 3.2, 2.6, 7, t * 0.45, K['iron'][1:], hole=False)    # engrenagem de corda
            for ex in (cx + 3.5, cx + 5):
                fill(p, self.e(ex, cy + 0.2, 0.75, 0.75), K['lamp'][2] if not P.hurt else K['iron'][1])
                if not P.hurt:
                    self.dot(p, ex, cy, K['lamp'][4 if t % 2 == 0 else 3])
            dmarks(p, P, 75, self.s, area=(cx - 5, cy - 2, cx + 3, cy + 3))

        return [legs, body]


# ── Fornalha Ambulante (32×40), tanque de grelha acesa ────────────────────

class Fornalha(Dual):
    mid, stem, act, size16, style, kind = 'fornalha', 'fornalha', 'IX', (32, 40), 'legs', 'monster'
    name = 'Fornalha Ambulante'
    glow = {'fire', 'lamp'}
    lift = 1.0

    def pal(self):
        return {'iron': IRONB, 'brass': BRASS, 'fire': FIRE, 'lamp': LAMP, 'steam': STEAM}

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        flare = 0 if P.atk is None else [0, 1, 2, 1][P.atk]

        def legs(p):
            for x0, lift in ((9, ll), (18, lr)):
                vol(p, self.r(x0, 31 + b * 0.5, 5, 6 - lift), K['iron'], spec=False)
                fill(p, self.r(x0 - 1, 37 - lift, 7, 2), K['iron'][1])

        def chimney(p):
            vol(p, self.r(9, 3 + b, 4, 7), K['iron'], spec=False)
            fill(p, self.r(8.5, 2.5 + b, 5, 1.2), K['brass'][2])
            for i in range(3):                                                           # fumaça
                x = 10.5 + 1.2 * math.sin(t + i) - i * 0.8
                y = 1.5 + b - i * 1.2 - (t % 2) * 0.6
                if y > 0:
                    self.dot(p, x, y, K['steam'][2 - min(2, i)])

        def body(p):
            pts = self.r(5, 9 + b, 22, 22)
            vol(p, pts, K['iron'])
            rivets(self, p, pts, K, 3.5, 77)
            fill(p, self.r(5, 9 + b, 22, 1.2), K['brass'][2])
            fill(p, self.r(5, 28.8 + b, 22, 1.2), K['brass'][1])
            # boca de grelha com fogo; no golpe a brasa cresce
            gx0, gy0, gw, gh = 14, 15 + b - flare * 0.5, 10, 9 + flare
            for (x, y) in self.r(gx0, gy0, gw, gh):
                u, v = x / self.s - gx0, y / self.s - gy0
                hot = 0.95 - 0.6 * (v / gh) - 0.25 * abs(u - gw / 2) / (gw / 2) + 0.1 * math.sin(u * 2 + t)
                p.p(x, y, K['fire'][max(0, min(4, int(hot * 5)))])
                if (u % 2.5) < 0.9:
                    p.p(x, y, K['iron'][1])
            dmarks(p, P, 79, self.s, area=(6, 10 + b, 13, 28 + b))

        def arm(p):
            sx, sy = 26, 18 + b
            ex, ey = (29, 25 + b) if P.atk is None else [(28, 14), (30, 10), (31, 24), (30, 20)][P.atk]
            vol(p, self.taper(seg(sx, sy, ex, ey), 1.4, 1.1), K['iron'], spec=False)
            fill(p, self.taper(seg(ex, ey, ex - 1.5, ey + 2), 0.7, 0.3), K['brass'][2])     # gancho

        return [legs, chimney, body, arm]


# ── O Colosso de Ferro-negro (64×64), autômato gigante em placas ──────────

class Colosso(Dual):
    mid, stem, act, size16, style, kind = 'colosso', 'colosso', 'IX', (64, 64), 'legs', 'boss'
    name = 'O Colosso de Ferro-negro'
    glow = {'lamp', 'fire'}
    lift = 1.5

    def pal(self):
        return {'iron': IRONB, 'brass': BRASS, 'lamp': LAMP, 'fire': FIRE, 'steam': STEAM}

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        phase2 = P.mode == 'phase2'
        if P.atk is None:
            fx, fy = 50, 44 + b
        else:
            fx, fy = [(46, 24), (50, 12), (60, 46), (55, 38)][P.atk]

        def legs(p):
            for x0, lift in ((20, ll), (33, lr)):
                vol(p, self.r(x0, 42 + b, 8, 10), K['iron'], spec=False)
                fill(p, self.e(x0 + 4, 52 - lift * 0.5, 4, 3), K['brass'][2])
                vol(p, self.r(x0 + 0.5, 53 - lift * 0.5, 7, 9 - lift * 0.5), K['iron'], spec=False)
                fill(p, self.r(x0 - 1.5, 61 - lift, 11, 3), K['iron'][1])

        def arm_back(p):
            vol(p, self.taper(seg(18, 22 + b, 12, 34 + b) + seg(12, 34 + b, 14, 42 + b), 3.2, 2.6), K['iron'], spec=False)
            vol(p, self.e(14, 43 + b, 3.5, 3), K['iron'], spec=False)

        def torso(p):
            pts = self.t(16 + b, 43 + b, 15, 45, 19, 41)
            vol(p, pts, K['iron'])
            rivets(self, p, pts, K, 4, 81)
            # núcleo de brasa no peito; na fase 2, rachaduras acesas por todo lado
            core = self.e(30, 30 + b, 4, 4)
            for (x, y) in core:
                u, v = x / self.s - 30, y / self.s - 30 - b
                k = 0.95 - 0.12 * math.hypot(u, v)
                p.p(x, y, K['fire'][max(0, min(4, int(k * 5)))])
            if phase2:
                for i in range(7):
                    x0 = 18 + 22 * hsh(i, 0, 83)
                    y0 = 18 + b + 22 * hsh(i, 1, 83)
                    for j in range(8):
                        self.dot(p, x0 + (1 if hsh(i, j, 84) > 0.5 else 0) * j * 0.3, y0 + j * 0.6, K['fire'][3 if j % 2 else 2])
            dmarks(p, P, 85, self.s, area=(18, 18 + b, 42, 42 + b))

        def plates(p):
            if phase2:                                                                   # as placas caíram
                return
            for (x0, y0, w, h) in ((15, 17, 9, 12), (36, 17, 9, 12), (19, 31, 7, 10), (34, 31, 7, 10)):
                pts = self.r(x0, y0 + b, w, h)
                vol(p, pts, [K['iron'][2], K['iron'][3], K['iron'][4], K['iron'][5], (160, 160, 170)])
                fill(p, self.r(x0, y0 + b, w, 0.8), K['brass'][2])
                rivets(self, p, pts, K, 3, 87 + x0)

        def head(p):
            hy = 11 + b
            pts = self.r(25, hy - 4, 10, 8)
            vol(p, pts, K['iron'])
            fill(p, self.r(25, hy - 4.5, 10, 1), K['brass'][2])
            fill(p, self.r(26, hy - 0.5, 8, 1.6), K['iron'][0])                           # visor
            if not P.hurt:
                for i in range(4):
                    self.dot(p, 27 + i * 1.8, hy, K['lamp'][3 if (i + t) % 2 else 2])
            for sx_ in (21, 39):                                                         # chaminés de vapor nos ombros
                vol(p, self.r(sx_, 12 + b, 3, 5), K['iron'], spec=False)
                for i in range(2):
                    self.dot(p, sx_ + 1 + math.sin(t + i), 11 + b - i * 1.4, K['steam'][2 - i])

        def arm(p):
            sx, sy = 43, 21 + b
            mx, my = (sx + fx) / 2 + 2, (sy + fy) / 2 + 2
            vol(p, self.taper(seg(sx, sy, mx, my), 3.4, 2.8), K['iron'], spec=False)
            fill(p, self.e(mx, my, 2.6, 2.6), K['brass'][2])
            vol(p, self.taper(seg(mx, my, fx, fy), 2.8, 2.4), K['iron'], spec=False)
            fist = self.r(fx - 4, fy - 3.5, 8, 7)
            vol(p, fist, K['iron'])
            rivets(self, p, fist, K, 2.5, 89)

        return [arm_back, legs, torso, plates, head, arm]


MONSTERS = [Automato, AranhaEng, Fornalha, Colosso]


# ── Cenário: ferro rebitado, engrenagens, canos e lâmpadas vermelhas ──────

RAMP = ACTS['IX']['ramp']
WALLI = [(12, 11, 10), (22, 20, 18), (34, 32, 30), (50, 47, 44), (70, 66, 60), (96, 90, 82)]
CEIL0, WALL1 = 18, 110
PILLARS = (0, 80, 160, 240)
FX_RAMP = [(40, 14, 10), (150, 40, 24), (240, 80, 40), (255, 170, 110), (255, 230, 200)]


def iron_wall(pc: Piece, x0, x1, y0, y1, seed, light=1.0):
    s = pc.s
    for X, Y, u, v in pc.each(x0, y0, x1, y1):
        pw, ph = 20, 16
        lu, lv = u % pw, (v - 2) % ph
        seam = lu < 0.9 or lv < 0.9
        rivet = (abs(lu - 2) < 0.6 or abs(lu - pw + 2) < 0.6) and (abs(lv - 2) < 0.6 or abs(lv - ph + 2) < 0.6)
        k = light * (0.4 + 0.14 * noise(u, v, seed, 20) + 0.12 * (1 - lv / ph)) - 0.38 * (abs(v - 74) / 60) ** 1.5
        col = dith(WALLI, k, X, Y, s)
        if seam:
            col = WALLI[0]
        elif rivet:
            col = WALLI[4] if s == 1 or (X + Y) % 2 else WALLI[5]
        elif s == 2 and hsh(X, Y, seed) < 0.02:
            col = (60, 36, 24)                                                     # pinta de ferrugem
        pc.c.p(X, Y, col)


def big_gear(pc: Piece, cx, cy, r, teeth, rot, seed):
    s = pc.s
    for X, Y, u, v in pc.each(cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4):
        du, dv = u - cx, v - cy
        d = math.hypot(du, dv)
        if d <= r + 4:
            if d > r + 2:                                                           # nicho escuro
                pc.c.p(X, Y, dith(WALLI, 0.08, X, Y, s))
                continue
        a = math.atan2(dv, du) + rot
        tooth = math.cos(a * teeth) > 0.1
        if d <= r or (tooth and d <= r + 2):
            spoke = any(abs(math.sin(a - k * math.pi / 3)) < 0.12 for k in range(3))
            if d < r * 0.2 or (d < r * 0.72 and not spoke and d > r * 0.3):
                pc.c.p(X, Y, dith(WALLI, 0.1, X, Y, s))
                continue
            k = 0.62 - 0.3 * du / r - 0.25 * dv / r - (0.18 if abs(d - r * 0.8) < 0.6 else 0)
            pc.c.p(X, Y, dith(BRASS, k, X, Y, s))


def pipes(pc: Piece, x0, x1, ys, seed):
    s = pc.s
    for y in ys:
        for X, Y, u, v in pc.each(x0, y - 2.5, x1, y + 2.5):
            n = (v - y) / 2.5
            k = 0.6 - 0.5 * n - (0.25 if (u - x0) % 22 < 1.5 else 0)
            pc.c.p(X, Y, dith(IRONB, k, X, Y, s))
    vx, vy = (x0 + x1) / 2, ys[0]
    for X, Y, u, v in pc.each(vx - 6, vy - 6, vx + 6, vy + 6):               # volante da válvula
        d = math.hypot(u - vx, v - vy)
        a = math.atan2(v - vy, u - vx)
        if 4.6 < d < 5.8 or (d < 4.8 and any(abs(math.sin(a - k * math.pi / 4)) < 0.15 for k in range(4))):
            pc.c.p(X, Y, dith(LAMP[:3] + [(250, 120, 80)], 0.6 - 0.3 * (u - vx) / 6, X, Y, s))


def lamp_cage(pc: Piece, cx, cy, seed):
    s = pc.s
    for X, Y, u, v in pc.each(cx - 14, cy - 14, cx + 14, cy + 14):               # halo
        d = math.hypot(u - cx, v - cy)
        if d < 13 and bay(X, Y) < (1 - d / 13) * 0.35:
            c = pc.c.g(X, Y)
            if c:
                pc.c.p(X, Y, tuple(min(255, round(c[i] * 0.7 + LAMP[2][i] * 0.3)) for i in range(3)))
    for X, Y, u, v in pc.each(cx - 4, cy - 5, cx + 4, cy + 5):
        nx, ny = (u - cx) / 3.5, (v - cy) / 4.5
        if nx * nx + ny * ny <= 1:
            k = 0.95 - 0.6 * (nx * nx + ny * ny)
            pc.c.p(X, Y, dith(LAMP, k, X, Y, s))
            if abs(u - cx) < 0.5 or abs(v - cy) < 0.5:
                pc.c.p(X, Y, IRONB[1])
    # medidor embaixo
    gx, gy = cx, cy + 14
    for X, Y, u, v in pc.each(gx - 5, gy - 5, gx + 5, gy + 5):
        d = math.hypot(u - gx, v - gy)
        if d < 4.5:
            pc.c.p(X, Y, BRASS[1] if d > 3.6 else (220, 214, 196))
    for i in range(4):
        pc.dot(gx + i * 0.8, gy - i * 0.6, LAMP[1])


def vent(pc: Piece, cx, base, seed):
    s = pc.s
    for X, Y, u, v in pc.each(cx - 12, base - 14, cx + 12, base):
        grate = (u - cx + 12) % 3 < 1.1
        pc.c.p(X, Y, dith(WALLI, 0.08 if grate else 0.3, X, Y, s))
    for i in range(14):                                                           # vapor subindo
        x = cx - 10 + 20 * hsh(i, 0, seed)
        y = base - 16 - 40 * hsh(i, 1, seed)
        r = 2 + 3 * hsh(i, 2, seed)
        for X, Y, u, v in pc.each(x - r, y - r, x + r, y + r):
            if (u - x) ** 2 + (v - y) ** 2 < r * r and bay(X, Y) < 0.45 * (1 - (base - 16 - y) / 44):
                pc.c.p(X, Y, STEAM[1] if v < y else STEAM[0])


def column(pc: Piece, cx, top, bottom, w):
    """Viga de ferro em I com cintas de latão."""
    s = pc.s
    for X, Y, u, v in pc.each(cx - w / 2 - 2, top, cx + w / 2 + 2, bottom):
        dx = u - cx
        flange = abs(dx) <= w / 2 + 1.5 and ((v - top) % 36 < 3)
        if abs(dx) <= w / 2 or flange:
            n = dx / (w / 2 + 1.5)
            k = 0.55 - 0.45 * n - 0.32 * (abs(v - 74) / 60) ** 1.4
            ramp = BRASS if flange else IRONB
            pc.c.p(X, Y, dith(ramp, k, X, Y, s))
            if abs(abs(dx) - w / 4) < 0.5 and not flange:
                pc.c.p(X, Y, IRONB[1])


def ceiling(pc: Piece, seed):
    s = pc.s
    for X, Y, u, v in pc.each(0, 0, pc.w16, CEIL0 + 3):
        beam = (u % 40) < 3
        pc.c.p(X, Y, dith(BRASS if beam and v > CEIL0 - 2 else WALLI, 0.08 + 0.1 * (v / CEIL0) + (0.15 if beam else 0), X, Y, s))


def plinth(pc: Piece, seed):
    s = pc.s
    for X, Y, u, v in pc.each(0, WALL1, pc.w16, pc.h16):
        k = (0.4 if v < WALL1 + 3 else 0.12) + (0.1 if (u % 10) < 0.8 else 0)
        pc.c.p(X, Y, dith(BRASS if v < WALL1 + 1.2 else WALLI, k, X, Y, s))


PLAN = {'a': ['gear', 'pipes', 'lamp', 'vent'], 'b': ['lamp', 'vent', 'gear', 'pipes']}


def wall(variant: str, s: int) -> Image.Image:
    pc = Piece(320, 192, s)
    seed = 17 if variant == 'a' else 37
    iron_wall(pc, 0, 320, CEIL0, WALL1 + 2, seed)
    ceiling(pc, seed)
    for i, feat in enumerate(PLAN[variant]):
        cx = PILLARS[i] + 40
        if feat == 'gear':
            big_gear(pc, cx, 64, 20, 12, 0.13 * i, seed + i)
        elif feat == 'pipes':
            pipes(pc, cx - 30, cx + 30, (50, 58, 88), seed + i)
        elif feat == 'lamp':
            lamp_cage(pc, cx, 54, seed + i)
        else:
            vent(pc, cx, WALL1 - 2, seed + i)
    plinth(pc, seed)
    for px in PILLARS + (320,):
        column(pc, px, 0, WALL1 + 6, 9)
    return pc.image()


def door(s: int) -> Image.Image:
    """Pistão gigante: cilindro de ferro com haste polida e anéis de latão."""
    pc = Piece(48, 192, s)
    for X, Y, u, v in pc.each(8, 2, 40, 132):
        dx = u - 24
        half = 14 if v < 40 or v > 112 else 9
        if abs(dx) <= half:
            n = dx / half
            rod = half == 9 and abs(dx) < 4
            ramp = [(70, 74, 84), (120, 126, 138), (176, 182, 192), (220, 224, 230)] if rod else IRONB
            k = 0.6 - 0.45 * n - 0.25 * (abs(v - 74) / 60) ** 1.4
            pc.c.p(X, Y, dith(ramp, k, X, Y, s))
            if (v - 2) % 12 < 1.2 and not rod:
                pc.c.p(X, Y, dith(BRASS, 0.6 - 0.4 * n, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def entry(s: int) -> Image.Image:
    pc = Piece(72, 192, s)
    iron_wall(pc, 0, 72, CEIL0, WALL1 + 2, 47, light=0.7)
    ceiling(pc, 47)
    plinth(pc, 47)
    for X, Y, u, v in pc.each(0, 0, 30, 120):
        if u ** 2 / 26 ** 2 + (v - 120) ** 2 / 96 ** 2 < 1 and v > 24:
            pc.c.p(X, Y, dith(RAMP, 0.02 + 0.05 * (u / 30), X, Y, s))
    for i in range(8):                                                           # escada de grade
        y, x = 36 + i * 11, 2 + i * 7
        for X, Y, u, v in pc.each(x - 2, y, x + 10, y + 3):
            pc.c.p(X, Y, dith(IRONB, 0.6 - 0.03 * i - (0.3 if (u % 2) < 0.7 else 0), X, Y, s))
    for X, Y, u, v in pc.each(0, 0, 72, 192):
        if bay(X, Y) < max(0.0, 0.6 - u / 72):
            c = pc.c.g(X, Y)
            if c:
                pc.c.p(X, Y, tuple(max(0, round(v_ * 0.55)) for v_ in c))
    column(pc, 72, 0, WALL1 + 6, 9)
    return pc.image()


def floor(s: int) -> Image.Image:
    pc = Piece(320, 64, s)
    for X, Y, u, v in pc.each(0, 0, 320, 64):
        pw = 32
        lu = u % pw
        seam = lu < 1 or (v % 16) < 0.9
        grate = 6 < lu < 26 and 3 < (v % 16) < 13 and (lu % 3) < 1.1
        k = 0.4 - 0.3 * (v / 64) + 0.06 * noise(u, v, 3, 9)
        col = dith(WALLI, k, X, Y, s)
        if seam:
            col = WALLI[0]
        elif grate:
            col = dith(WALLI, k - 0.25, X, Y, s)
        elif (abs(lu - 3) < 0.6 or abs(lu - 29) < 0.6) and abs((v % 16) - 3) < 0.6:
            col = WALLI[4]
        pc.c.p(X, Y, col)
    return pc.image()


def fore(s: int) -> Image.Image:
    pc = Piece(320, 32, s)
    for i in range(6):
        cx = 30 + i * 54 + 10 * hsh(i, 0, 81)
        r = 6 + 5 * hsh(i, 1, 81)
        for X, Y, u, v in pc.each(cx - r - 2, 32 - r - 2, cx + r + 2, 32):
            d = math.hypot(u - cx, v - 32)
            a = math.atan2(v - 32, u - cx)
            if d <= r or (math.cos(a * 10) > 0.2 and d <= r + 1.6):
                pc.c.p(X, Y, RAMP[1] if d > r * 0.4 else RAMP[0])
    for X, Y, u, v in pc.each(0, 29, 320, 32):                                  # cano baixo
        if (u % 110) < 70:
            pc.c.p(X, Y, RAMP[1])
    return pc.image()


def corridor(s: int) -> dict:
    return {'wall-a': wall('a', s), 'wall-b': wall('b', s), 'floor': floor(s), 'fore': fore(s), 'door': door(s), 'entry': entry(s)}


# ── Objetos ───────────────────────────────────────────────────────────────

def prop_valve(s):
    pc = Piece(32, 32, s)
    for X, Y, u, v in pc.each(4, 18, 28, 32):
        pc.c.p(X, Y, dith(IRONB, 0.55 - 0.4 * (u - 16) / 12, X, Y, s))
    pipes(pc, 2, 30, (20,), 3)
    pc.c.outline(OL)
    return pc.image()


def prop_boiler(s):
    pc = Piece(32, 64, s)
    for X, Y, u, v in pc.each(4, 10, 28, 64):
        n = (u - 16) / 12
        k = 0.58 - 0.45 * n
        pc.c.p(X, Y, dith(BRASS if (v - 10) % 14 < 1.5 else IRONB, k, X, Y, s))
    for X, Y, u, v in pc.each(10, 0, 22, 10):
        if (u - 16) ** 2 / 36 + (v - 10) ** 2 / 100 < 1:
            pc.c.p(X, Y, dith(IRONB, 0.6 - 0.4 * (u - 16) / 6, X, Y, s))
    lamp_cage(pc, 16, 30, 5)
    pc.c.outline(OL)
    return pc.image()


def prop_gears(s):
    pc = Piece(64, 32, s)
    for (cx, cy, r, rot) in ((18, 22, 9, 0.2), (40, 24, 7, 0.5), (30, 16, 6, 0.1), (52, 27, 5, 0.3)):
        for X, Y, u, v in pc.each(cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2):
            d = math.hypot(u - cx, (v - cy) * 1.6)
            a = math.atan2(v - cy, u - cx) + rot
            if d <= r or (math.cos(a * 9) > 0.2 and d <= r + 1.6):
                k = 0.6 - 0.3 * (u - cx) / r - 0.3 * (v - cy) / r - (0.3 if d < r * 0.3 else 0)
                pc.c.p(X, Y, dith(BRASS, k, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def prop_gate(s):
    """Portão do covil: porta-cofre redonda com dentes de engrenagem e a lâmpada do Colosso."""
    pc = Piece(96, 96, s)
    cx, cy, r = 48, 52, 38
    for X, Y, u, v in pc.each(cx - r - 4, cy - r - 4, cx + r + 4, 96):
        du, dv = u - cx, v - cy
        d = math.hypot(du, dv)
        a = math.atan2(dv, du)
        if v > 92:
            continue
        if d <= r or (math.cos(a * 18) > 0.3 and d <= r + 3):
            ring = abs(d - r * 0.82) < 2.2
            bolt = abs(d - r * 0.9) < 1.2 and math.cos(a * 12) > 0.85
            k = 0.55 - 0.3 * du / r - 0.3 * dv / r
            col = dith(BRASS if ring or d > r else IRONB, k + (0.15 if ring else 0), X, Y, s)
            if bolt:
                col = BRASS[4]
            pc.c.p(X, Y, col)
    for X, Y, u, v in pc.each(cx - 6, cy - 6, cx + 6, cy + 6):
        d = math.hypot(u - cx, v - cy)
        if d < 5.5:
            pc.c.p(X, Y, dith(LAMP, 0.95 - d / 7, X, Y, s))
    for X, Y, u, v in pc.each(0, 88, 96, 96):                                 # soleira
        pc.c.p(X, Y, dith(IRONB, 0.4 - 0.2 * (v - 88) / 8, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def props(s: int) -> dict:
    return {'boss-gate': prop_gate(s), 'valve': prop_valve(s), 'boiler': prop_boiler(s), 'gears': prop_gears(s)}
