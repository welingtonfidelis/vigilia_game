"""X — Deserto de Ossos (M5 F6), em 16 e 32-bit: Múmia Errante, Chacal de Ossos, Escorpião Gigante e
O Rei dos Ossuários. Osso e areia ocre sob um céu roxo de sol preto, linho gasto, quitina castanha,
ouro velho e brilho violeta."""
from __future__ import annotations

import math

from PIL import Image

from dimensoes32_base import ACTS, Dual, Piece, bay, dith, dmarks, fill, hsh, seg, sphere, vol
from lib32 import OL, noise

BONE = [(84, 70, 54), (130, 114, 90), (176, 160, 130), (214, 202, 172), (240, 232, 208)]
LINEN = [(70, 56, 40), (110, 92, 66), (152, 132, 98), (190, 172, 134), (220, 206, 170)]
VIOLET = [(70, 30, 90), (120, 50, 150), (180, 90, 210), (225, 170, 240), (250, 230, 255)]
CARA = [(30, 16, 10), (58, 32, 18), (92, 54, 30), (130, 84, 48), (170, 120, 70)]
GOLD = [(90, 58, 20), (150, 104, 36), (210, 160, 60), (244, 214, 120), (255, 244, 200)]
ROBE = [(30, 12, 34), (52, 22, 58), (80, 36, 88), (112, 56, 120), (146, 84, 150)]
DARK = [(14, 8, 12), (26, 16, 20), (42, 28, 30)]


# ── Múmia Errante (24×32) ─────────────────────────────────────────────────

class Mumia(Dual):
    mid, stem, act, size16, style, kind = 'mumia', 'mumia', 'X', (24, 32), 'legs', 'monster'
    name = 'Múmia Errante'
    glow = {'violet'}
    lift = 1.0

    def pal(self):
        return {'linen': LINEN, 'violet': VIOLET, 'dark': DARK}

    def wraps(self, p, pts, K, seed, slope=0.5):
        """Faixas de linho enroladas: listras diagonais com fresta escura entre elas."""
        s = self.s
        for (x, y) in pts:
            u, v = x / s, y / s
            k = (v + u * slope + seed) % 2.2
            if k < 0.35:
                p.p(x, y, K['linen'][0])
            elif k < 0.6 and s == 2:
                p.p(x, y, K['linen'][4] if hsh(x, y, seed) < 0.5 else p.g(x, y))

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        if P.atk is None:
            hx, hy = 19 + P.swing * 0.4, 17 + b
        else:
            hx, hy = [(17, 10), (19, 7), (23, 16), (21, 15)][P.atk]

        def legs(p):
            for x0, lift in ((9, ll), (13, lr)):
                pts = self.t(21, 30 - lift, x0, x0 + 3, x0 - 0.3, x0 + 2.8)
                vol(p, pts, K['linen'], spec=False)
                self.wraps(p, pts, K, x0, 0.8)
                fill(p, self.r(x0 - 0.5, 30.2 - lift, 3.8, 1), K['linen'][1])

        def body(p):
            pts = self.t(11 + b, 22 + b, 8, 15.5, 7.5, 15.5)
            vol(p, pts, K['linen'])
            self.wraps(p, pts, K, 2)
            # tira solta balançando
            tail = [(8 - 1.5 * k / 6 + 0.6 * math.sin(k + t), 15 + b + k) for k in range(7)]
            fill(p, self.taper(tail, 0.6, 0.4), K['linen'][2])
            dmarks(p, P, 91, self.s, area=(8, 12 + b, 15, 21 + b))

        def head(p):
            hy_ = 7.5 + b
            pts = self.e(13.2, hy_, 3.2, 3.4)
            vol(p, pts, K['linen'])
            self.wraps(p, pts, K, 5, -0.4)
            fill(p, self.r(12.5, hy_ - 0.8, 4, 1.6), K['dark'][0])                       # fresta dos olhos
            if not P.hurt:
                self.dot(p, 14.5, hy_ - 0.4, K['violet'][4 if t % 2 == 0 else 3])
                self.dot(p, 13, hy_ - 0.4, K['violet'][2])

        def arm(p):
            sx, sy = 14, 13 + b
            vol(p, self.taper(seg(sx, sy, hx, hy), 1.2, 0.9), K['linen'], spec=False)
            for k in range(3):                                                          # garras
                fill(p, self.taper(seg(hx, hy, hx + 1.6, hy - 0.8 + k * 0.8), 0.35, 0.2), K['dark'][2])

        return [legs, body, head, arm]


# ── Chacal de Ossos (32×24), enxame de esqueleto ──────────────────────────

class Chacal(Dual):
    mid, stem, act, size16, style, kind = 'chacal', 'chacal', 'X', (32, 24), 'legs', 'monster'
    name = 'Chacal de Ossos'
    glow = {'violet'}
    lift = 1.5

    def pal(self):
        return {'bone': BONE, 'violet': VIOLET, 'dark': DARK}

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        lg = 0 if P.atk is None else [-0.5, 1.5, 3, 1.5][P.atk]
        jaw = 0.4 + (1.2 if P.atk in (1, 2) else 0)

        def legs(p):
            for (hx, hy, lift, back) in ((9, 13, ll, True), (12, 13, lr, True), (20 + lg * 0.3, 13, lr, False), (23 + lg * 0.3, 13, ll, False)):
                knee = (hx + (1.2 if back else -0.6), 18 + b * 0.5 - lift * 0.4)
                foot = (hx + (-0.6 if back else 0.8), 23 - lift)
                fill(p, self.taper(seg(hx, hy + b, *knee), 0.6, 0.45), K['bone'][2] if not back else K['bone'][1])
                fill(p, self.taper(seg(*knee, *foot), 0.45, 0.35), K['bone'][2] if not back else K['bone'][1])

        def spine(p):
            path = [(5 + k * 1.6 + lg * 0.3, 11 + b - 0.6 * math.sin(k * 0.35)) for k in range(12)]
            for i, (x, y) in enumerate(path):
                fill(p, self.e(x, y, 0.8, 0.8), K['bone'][3] if i % 2 else K['bone'][2])
            tail = [(5 - k * 0.8, 11 + b - k * 0.6 + 0.4 * math.sin(k + t)) for k in range(6)]
            fill(p, self.taper(tail, 0.5, 0.25), K['bone'][2])
            # costelas
            for i in range(5):
                x = 10 + i * 1.8 + lg * 0.3
                fill(p, self.taper([(x, 11.5 + b), (x - 0.6, 13.5 + b), (x + 0.3, 15 + b)], 0.35, 0.3), K['bone'][3])

        def skull(p):
            cx, cy = 25 + lg, 10 + b
            cran = self.e(cx, cy, 2.8, 2.4)
            sphere(p, cran, K['bone'], cx * self.s, cy * self.s, 2.8 * self.s, 2.4 * self.s)
            snout = self.taper(seg(cx + 1, cy + 0.2, cx + 5.5, cy + 0.6), 1.3, 0.8)
            vol(p, snout, K['bone'])
            low = self.taper(seg(cx + 0.5, cy + 1.8, cx + 4.8, cy + 1.8 + jaw), 0.7, 0.4)
            vol(p, low, K['bone'], spec=False)
            for (ex, ey) in ((cx - 1, cy - 2.6), (cx + 0.6, cy - 2.8)):                   # orelhas
                fill(p, self.pg([(ex - 0.8, cy - 1.2), (ex, ey - 2), (ex + 0.8, cy - 1.2)]), K['bone'][2])
            fill(p, self.e(cx + 0.5, cy - 0.3, 0.9, 0.8), K['dark'][0])
            if not P.hurt:
                self.dot(p, cx + 0.6, cy - 0.4, K['violet'][4 if t % 2 == 0 else 3])
            for i in range(3):
                self.dot(p, cx + 2 + i * 1.1, cy + 1.3, K['bone'][4])

        return [legs, spine, skull]


# ── Escorpião Gigante (40×32), tanque de ferrão ───────────────────────────

class Escorpiao(Dual):
    mid, stem, act, size16, style, kind = 'escorpiao', 'escorpiao', 'X', (40, 32), 'legs', 'monster'
    name = 'Escorpião Gigante'
    glow = {'violet'}
    lift = 1.0

    def pal(self):
        return {'cara': CARA, 'violet': VIOLET, 'dark': DARK}

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        strike = 0 if P.atk is None else [0.5, 1.5, 3, 1][P.atk]

        def legs(p):
            for i, x0 in enumerate((10, 13.5, 17, 20.5)):
                lift = ll if i % 2 == 0 else lr
                knee = (x0 - 2.5, 22 - lift * 0.4)
                foot = (x0 - 4, 31 - lift)
                vol(p, self.taper(seg(x0, 22 + b, *knee), 0.8, 0.6), K['cara'], spec=False)
                vol(p, self.taper(seg(*knee, *foot), 0.6, 0.3), K['cara'], spec=False)

        def tail(p):
            # cauda em segmentos que sobe por trás e arqueia sobre o corpo
            pts = []
            for k in range(9):
                a = math.pi * (0.95 - 0.85 * k / 8) - strike * 0.12
                pts.append((10 + 9 * math.cos(a) * (1 + 0.1 * k / 8) + strike * k / 8, 20 + b - 15 * math.sin(a) * (k / 8) ** 0.8))
            for i, (x, y) in enumerate(pts):
                r = 2.2 - i * 0.13
                sphere(p, self.e(x, y, r, r), K['cara'], x * self.s, y * self.s, r * self.s, r * self.s)
            sx, sy = pts[-1]
            sting = self.taper(seg(sx, sy, sx + 2.8 + strike * 0.4, sy + 2.5), 1.0, 0.2)
            fill(p, sting, K['violet'][2])
            self.dot(p, sx + 2.6 + strike * 0.4, sy + 2.2, K['violet'][4 if t % 2 == 0 else 3])

        def body(p):
            pts = self.oval(9, 21 + b, 27, 20 + b, 4.6)
            for (x, y, u, v) in pts:
                seg_ring = ((u + 1) * 3.5) % 1 < 0.15
                k = 0.6 - 0.4 * v - 0.12 * u
                p.p(x, y, K['cara'][0] if seg_ring else K['cara'][max(0, min(4, int(k * 5)))])
            dmarks(p, P, 93, self.s, area=(11, 17 + b, 25, 23 + b))

        def claws(p):
            for (dy, front) in ((-1.5, False), (0.5, True)):
                sx, sy = 26, 20 + b + dy
                ex, ey = 31 + strike * 0.6, 17 + b + dy * 1.6
                vol(p, self.taper(seg(sx, sy, ex, ey), 1.1, 0.9), K['cara'], spec=False)
                palm = self.oval(ex - 0.5, ey, ex + 3, ey - 0.5, 1.7)
                fill(p, [(x, y) for (x, y, _, _) in palm], K['cara'][3 if front else 2])
                fill(p, self.taper(seg(ex + 2.5, ey - 1, ex + 6, ey - 2.3), 1.0, 0.25), K['cara'][4 if front else 3])
                fill(p, self.taper(seg(ex + 2.5, ey + 0.6, ex + 5.5, ey + 1.2), 0.8, 0.25), K['cara'][3])

        def eyes(p):
            if not P.hurt:
                for ex in (25, 26.5):
                    self.dot(p, ex, 17 + b, K['violet'][3])

        return [tail, legs, body, claws, eyes]


# ── O Rei dos Ossuários (48×60), rei esqueleto de manto e coroa ───────────

class Rei(Dual):
    mid, stem, act, size16, style, kind = 'reiOssuarios', 'rei-ossuarios', 'X', (48, 60), 'legs', 'boss'
    name = 'O Rei dos Ossuários'
    glow = {'violet'}
    lift = 1.0

    def pal(self):
        return {'bone': BONE, 'violet': VIOLET, 'gold': GOLD, 'robe': ROBE, 'dark': DARK}

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        phase2 = P.mode == 'phase2'
        if P.atk is None:
            ox, oy = 39, 15 + b                                   # orbe do cetro
        else:
            ox, oy = [(36, 6), (38, 3), (45, 20), (42, 15)][P.atk]

        def cape(p):
            pts = self.pg([(18, 17 + b), (30, 17 + b), (35, 56), (11, 56)])
            for (x, y) in pts:
                u, v = x / self.s, y / self.s
                fold = math.sin(u * 0.9 + v * 0.05) * 0.18
                k = 0.5 - 0.3 * ((u - 23) / 15) + fold - 0.2 * ((v - 16) / 40)
                p.p(x, y, K['robe'][max(0, min(4, int(k * 5)))])
            for i in range(8):                                                           # barra rasgada
                x = 11 + i * 3
                for (xx, yy) in self.pg([(x, 54), (x + 1.6, 58.5 - (i % 2) * 1.5), (x + 3.2, 54)]):
                    p.p(xx, yy, K['robe'][1])
            if phase2:                                                                    # armadura de ossos no manto
                for i in range(10):
                    x, y = 12 + 22 * hsh(i, 0, 95), 26 + 26 * hsh(i, 1, 95)
                    fill(p, self.taper(seg(x, y, x + 2, y + 1), 0.6, 0.3), K['bone'][3])

        def legs(p):
            for x0, lift in ((18, ll), (26, lr)):
                fill(p, self.taper(seg(x0 + 1, 40, x0, 52 - lift), 0.9, 0.7), K['bone'][2])
                fill(p, self.r(x0 - 1.5, 52 - lift, 4.5, 2), K['bone'][1])

        def skirt(p):
            sw = (ll - lr) * 0.4
            pts = self.pg([(17.5, 37 + b), (30.5, 37 + b), (33 + sw, 54), (15 + sw, 54)])
            for (x, y) in pts:
                u, v = x / self.s, y / self.s
                k = 0.42 - 0.3 * ((u - 24) / 9) + 0.16 * math.sin(u * 1.3)
                p.p(x, y, K['robe'][max(0, min(4, int(k * 5)))])
            fill(p, self.r(17.5, 37 + b, 13, 1.2), K['gold'][2])                          # cinto de ouro
            for (sx_, sy_) in ((18, 19 + b), (30, 19 + b)):                                  # ombreiras de osso
                sphere(p, self.e(sx_, sy_, 2.6, 2), K['bone'], sx_ * self.s, sy_ * self.s, 2.6 * self.s, 2 * self.s)

        def ribcage(p):
            spine = self.taper(seg(24, 20 + b, 24, 40 + b), 1.0, 1.0)
            vol(p, spine, K['bone'], spec=False)
            for i in range(5):
                y = 21.5 + b + i * 3
                w = 7 - i * 0.7
                for side in (-1, 1):
                    path = [(24 + side * w * k / 5, y + 1.8 * math.sin(k / 5 * math.pi * 0.8)) for k in range(6)]
                    fill(p, self.taper(path, 0.55, 0.4), K['bone'][3])
            glow_k = 3 if (t % 2 == 0 or phase2) else 2                                     # coração violeta
            fill(p, self.e(23, 27 + b, 1.8, 1.6), K['violet'][glow_k])
            pelvis = self.oval(19, 41 + b, 29, 41 + b, 2)
            fill(p, [(x, y) for (x, y, _, _) in pelvis], K['bone'][2])
            dmarks(p, P, 97, self.s, area=(18, 20 + b, 30, 38 + b))

        def head(p):
            cx, cy = 25, 11 + b
            sk = self.e(cx, cy, 4.2, 4.2)
            sphere(p, sk, K['bone'], cx * self.s, cy * self.s, 4.2 * self.s, 4.2 * self.s)
            fill(p, self.r(cx - 2.8, cy + 2.5, 5.6, 2.2), K['bone'][2])                      # maxilar
            for i in range(5):
                self.dot(p, cx - 2.2 + i * 1.1, cy + 2.6, K['bone'][4])
            for ex in (cx - 1.4, cx + 1.8):
                fill(p, self.e(ex, cy, 1.2, 1.3), K['dark'][0])
                if not P.hurt:
                    self.dot(p, ex + 0.2, cy, K['violet'][4 if t % 2 == 0 else 3])
            # coroa de ouro velho com pontas
            fill(p, self.r(cx - 4, cy - 4.5, 8, 2), K['gold'][2])
            for i in range(5):
                tx = cx - 3.6 + i * 1.8
                vol(p, self.pg([(tx - 0.8, cy - 4.4), (tx, cy - 7.5 - (i % 2) * 1.2), (tx + 0.8, cy - 4.4)]), K['gold'])
            self.dot(p, cx, cy - 3.6, K['violet'][3])

        def scepter(p):
            hx, hy = 32, 26 + b                                                          # mão
            vol(p, self.taper(seg(28, 19 + b, hx, hy), 1.0, 0.8), K['bone'], spec=False)
            fill(p, self.taper(seg(hx - (ox - hx) * 0.8, hy - (oy - hy) * 0.8, ox, oy), 0.55, 0.5), K['bone'][3])
            fill(p, self.e(ox, oy, 2.2, 2.2), K['violet'][2])
            fill(p, self.e(ox - 0.4, oy - 0.4, 1.1, 1.1), K['violet'][4 if t % 2 == 0 else 3])
            for k in range(3):                                                           # garra de ouro
                a = math.pi * (0.6 + 0.4 * k)
                fill(p, self.taper(seg(ox, oy + 1.5, ox + 2.4 * math.cos(a), oy + 1.5 + 2.4 * math.sin(a) * -1), 0.4, 0.2), K['gold'][2])

        return [cape, legs, ribcage, skirt, head, scepter]


MONSTERS = [Mumia, Chacal, Escorpiao, Rei]


# ── Cenário: céu roxo de sol preto, dunas e costelas de titã ──────────────

RAMP = ACTS['X']['ramp']
SKY = [(14, 8, 20), (26, 14, 34), (42, 22, 52), (64, 34, 72), (92, 52, 92), (124, 74, 108)]
SAND = [(40, 26, 22), (70, 46, 34), (104, 72, 48), (140, 102, 66), (176, 136, 88), (206, 170, 116)]
STONE = [(30, 20, 20), (52, 36, 32), (80, 58, 46), (110, 84, 62), (142, 112, 80)]
CEIL0, HORIZON, WALL1 = 0, 70, 110
PILLARS = (0, 80, 160, 240)
FX_RAMP = [(40, 20, 50), (120, 50, 150), (180, 90, 210), (225, 170, 240), (250, 230, 255)]


def sky_dunes(pc: Piece, x0, x1, seed, sun_at=None):
    """Céu em degradê pontilhado (sol preto com coroa violeta) e duas cadeias de dunas."""
    s = pc.s
    for X, Y, u, v in pc.each(x0, 0, x1, WALL1 + 2):
        far = HORIZON - 8 + 6 * math.sin(u * 0.03 + seed) + 3 * math.sin(u * 0.11 + seed * 2)
        near = HORIZON + 10 + 8 * math.sin(u * 0.022 + seed * 3) + 2 * noise(u, 0, seed, 9)
        if v < far:
            k = 0.15 + 0.6 * (v / HORIZON) ** 1.3
            col = dith(SKY, k, X, Y, s)
            if sun_at:
                d = math.hypot(u - sun_at[0], v - sun_at[1])
                if d < 9:
                    col = (6, 2, 8)
                elif d < 12.5:
                    col = dith(VIOLET, 0.9 - (d - 9) / 3.5 * 0.7, X, Y, s)
                elif d < 22 and bay(X, Y) < (1 - (d - 12.5) / 9.5) * 0.4:
                    col = VIOLET[1]
            if hsh(int(u), int(v), seed) < 0.002 and not sun_at:
                col = (220, 200, 230)
        elif v < near:
            k = 0.18 + 0.18 * (v - far) / 18 + 0.08 * math.sin(u * 0.2 + v)
            col = dith(SAND, k, X, Y, s)
        else:
            k = 0.32 + 0.18 * noise(u, v, seed, 12) + 0.08 * math.sin((u + v * 2) * 0.4) - 0.2 * ((v - near) / 30)
            col = dith(SAND, k, X, Y, s)
        pc.c.p(X, Y, col)


def titan_rib(pc: Piece, cx, seed):
    """Costela de titã fincada na areia, curvando para dentro do corredor: é o pilar."""
    s = pc.s
    for X, Y, u, v in pc.each(cx - 16, 0, cx + 16, WALL1 + 8):
        k_ = v / (WALL1 + 8)
        off = 9 * (1 - k_) ** 2 * (1 if seed % 2 else -1)
        half = 3 + 3.5 * k_
        dx = u - cx - off
        if abs(dx) > half:
            continue
        n = dx / half
        k = 0.6 - 0.45 * n + 0.05 * math.sin(v * 0.7) - 0.25 * (1 - k_)
        pc.c.p(X, Y, dith(BONE, k, X, Y, s))
        if hsh(int(u), int(v / 2), seed) < 0.04:
            pc.c.p(X, Y, BONE[1])


def giant_skull(pc: Piece, cx, base, seed):
    s = pc.s
    for X, Y, u, v in pc.each(cx - 22, base - 26, cx + 22, base):
        nx, ny = (u - cx) / 20, (v - (base - 6)) / 20
        if nx * nx + ny * ny > 1 or v > base:
            continue
        orb = any(((u - ex) / 5) ** 2 + ((v - (base - 12)) / 4.5) ** 2 < 1 for ex in (cx - 8, cx + 7))
        k = 0.62 - 0.4 * nx - 0.3 * ny
        pc.c.p(X, Y, dith(RAMP, 0.05, X, Y, s) if orb else dith(BONE, k, X, Y, s))
    for X, Y, u, v in pc.each(cx - 24, base - 4, cx + 24, base + 2):                 # areia cobrindo o queixo
        if v > base - 3 + 1.5 * math.sin(u * 0.4):
            pc.c.p(X, Y, dith(SAND, 0.45, X, Y, s))


def obelisk(pc: Piece, cx, base, seed, broken=False):
    s = pc.s
    top = base - (40 if broken else 62)
    for X, Y, u, v in pc.each(cx - 8, top - 6, cx + 8, base):
        w = 6 - 3 * (base - v) / (base - top + 6)
        if v < top:
            w = (v - (top - 6)) * 0.5 if not broken else -1
        if abs(u - cx) <= w:
            n = (u - cx) / max(0.5, w)
            k = 0.55 - 0.45 * n
            col = dith(STONE, k, X, Y, s)
            if (v - top) % 9 < 1.2 and abs(n) < 0.6:                                      # glifos
                col = VIOLET[1] if hsh(int(v / 9), int(u), seed) < 0.3 else STONE[0]
            pc.c.p(X, Y, col)


def ribcage_far(pc: Piece, cx, base, seed):
    s = pc.s
    for i in range(6):
        x = cx - 25 + i * 10
        h = 30 - abs(i - 2.5) * 5
        for X, Y, u, v in pc.each(x - 4, base - h - 2, x + 6, base):
            k_ = (base - v) / h
            xx = x + 5 * k_ ** 2
            if abs(u - xx) < 1.4 - 0.5 * k_:
                pc.c.p(X, Y, dith(BONE, 0.35 + 0.2 * (1 - k_), X, Y, s))


def plinth(pc: Piece, seed):
    s = pc.s
    for X, Y, u, v in pc.each(0, WALL1, pc.w16, pc.h16):
        pc.c.p(X, Y, dith(SAND, 0.32 + 0.12 * noise(u, v, seed, 8) - 0.15 * (v - WALL1) / 20, X, Y, s))


PLAN = {'a': ['skull', 'obelisk', 'ribs', 'obelisk-b'], 'b': ['ribs', 'skull', 'obelisk-b', 'obelisk']}


def wall(variant: str, s: int) -> Image.Image:
    pc = Piece(320, 192, s)
    seed = 23 if variant == 'a' else 43
    sky_dunes(pc, 0, 320, seed, sun_at=(200, 26) if variant == 'b' else None)
    for i, feat in enumerate(PLAN[variant]):
        cx = PILLARS[i] + 40
        if feat == 'skull':
            giant_skull(pc, cx, WALL1 - 1, seed + i)
        elif feat == 'obelisk':
            obelisk(pc, cx, WALL1 - 1, seed + i)
        elif feat == 'obelisk-b':
            obelisk(pc, cx + 6, WALL1 - 1, seed + i, broken=True)
        else:
            ribcage_far(pc, cx, HORIZON + 12, seed + i)
    plinth(pc, seed)
    for j, px in enumerate(PILLARS + (320,)):
        titan_rib(pc, px, j)
    return pc.image()


def door(s: int) -> Image.Image:
    """Presa de titã em pé, com anéis de ouro velho."""
    pc = Piece(48, 192, s)
    for X, Y, u, v in pc.each(4, 0, 44, 132):
        k_ = v / 132
        half = 4 + 9 * k_
        off = 6 * (1 - k_) ** 2
        dx = u - 24 - off
        if abs(dx) <= half:
            n = dx / half
            col = dith(BONE, 0.62 - 0.45 * n - 0.2 * (1 - k_), X, Y, s)
            if abs((v % 30) - 15) < 1.5 and v > 20:
                col = dith(GOLD, 0.6 - 0.4 * n, X, Y, s)
            pc.c.p(X, Y, col)
    pc.c.outline(OL)
    return pc.image()


def entry(s: int) -> Image.Image:
    pc = Piece(72, 192, s)
    sky_dunes(pc, 0, 72, 53)
    plinth(pc, 53)
    for i in range(8):                                                             # degraus de arenito
        y, x = 36 + i * 11, 2 + i * 7
        for X, Y, u, v in pc.each(0, y, x + 10, y + 11):
            top = v < y + 2.2
            pc.c.p(X, Y, dith(STONE, (0.6 if top else 0.3) - 0.03 * i - (0.15 if u < x else 0), X, Y, s))
    for X, Y, u, v in pc.each(0, 0, 72, 192):
        if bay(X, Y) < max(0.0, 0.55 - u / 72):
            c = pc.c.g(X, Y)
            if c:
                pc.c.p(X, Y, tuple(max(0, round(v_ * 0.6)) for v_ in c))
    titan_rib(pc, 72, 5)
    return pc.image()


def floor(s: int) -> Image.Image:
    pc = Piece(320, 64, s)
    for X, Y, u, v in pc.each(0, 0, 320, 64):
        ripple = math.sin(u * 0.5 + 2 * noise(u, v, 4, 16) + v * 0.15)
        k = 0.52 - 0.34 * (v / 64) + 0.07 * ripple + 0.05 * noise(u, v, 6, 5)
        col = dith(SAND, k, X, Y, s)
        if hsh(int(u / 2), int(v / 2), 8) < 0.012:
            col = BONE[2 if v < 30 else 1]
        pc.c.p(X, Y, col)
    for X, Y, u, v in pc.each(0, 0, 320, 3):
        if v < 1.6 + 1.2 * math.sin(u * 0.19) and hsh(int(u / 4), 0, 2) < 0.6:
            pc.c.p(X, Y, None)
    return pc.image()


def fore(s: int) -> Image.Image:
    pc = Piece(320, 32, s)
    for i in range(8):
        cx = 18 + i * 40 + 10 * hsh(i, 0, 91)
        if hsh(i, 1, 91) < 0.5:                                                    # osso meio enterrado
            for X, Y, u, v in pc.each(cx - 10, 24, cx + 10, 32):
                if abs(v - (30 - 4 * math.sin((u - cx + 10) / 20 * math.pi))) < 1.3:
                    pc.c.p(X, Y, RAMP[2])
        for X, Y, u, v in pc.each(cx - 14, 26, cx + 14, 32):                      # beira de duna
            if (u - cx) ** 2 / 196 + (v - 32) ** 2 / 25 < 1:
                pc.c.p(X, Y, RAMP[1] if v < 30 else RAMP[0])
    return pc.image()


def corridor(s: int) -> dict:
    return {'wall-a': wall('a', s), 'wall-b': wall('b', s), 'floor': floor(s), 'fore': fore(s), 'door': door(s), 'entry': entry(s)}


# ── Objetos ───────────────────────────────────────────────────────────────

def prop_skull(s):
    pc = Piece(32, 32, s)
    for X, Y, u, v in pc.each(4, 8, 28, 32):
        nx, ny = (u - 16) / 11, (v - 20) / 11
        if nx * nx + ny * ny > 1:
            continue
        orb = any(((u - ex) / 3) ** 2 + ((v - 20) / 2.8) ** 2 < 1 for ex in (12, 20))
        pc.c.p(X, Y, dith(RAMP, 0.05, X, Y, s) if orb else dith(BONE, 0.62 - 0.4 * nx - 0.3 * ny, X, Y, s))
    for X, Y, u, v in pc.each(0, 26, 32, 32):
        if v > 28 + math.sin(u * 0.5):
            pc.c.p(X, Y, dith(SAND, 0.5, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def prop_tusk(s):
    pc = Piece(32, 64, s)
    for X, Y, u, v in pc.each(4, 0, 28, 64):
        k_ = v / 64
        half = 1 + 5 * k_
        dx = u - 16 - 6 * (1 - k_) ** 2
        if abs(dx) <= half:
            pc.c.p(X, Y, dith(BONE, 0.62 - 0.45 * dx / half, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def prop_bones(s):
    pc = Piece(64, 32, s)
    for i in range(7):
        x0, y0 = 6 + 50 * hsh(i, 0, 5), 18 + 10 * hsh(i, 1, 5)
        a = hsh(i, 2, 5) * math.pi
        L_ = 10 + 8 * hsh(i, 3, 5)
        for k in range(int(L_ * 2)):
            x, y = x0 + math.cos(a) * k * 0.5, y0 + math.sin(a) * k * 0.25
            end = k < 2 or k > L_ * 2 - 3
            pc.rect(x - (1 if end else 0.5), y - (1 if end else 0.5), 2 if end else 1, 2 if end else 1, BONE[3] if k % 3 else BONE[2])
    for X, Y, u, v in pc.each(0, 26, 64, 32):
        if v > 28.5 + math.sin(u * 0.3):
            pc.c.p(X, Y, dith(SAND, 0.45, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def prop_gate(s):
    """Portão do covil: duas presas de titã cruzadas no alto, crânios na soleira e o brilho violeta."""
    pc = Piece(96, 96, s)
    for X, Y, u, v in pc.each(16, 16, 80, 96):
        if ((u - 48) / 28) ** 2 + ((v - 96) / 78) ** 2 < 1:
            g = max(0.0, 1 - math.hypot(u - 48, v - 70) / 32)
            pc.c.p(X, Y, dith(VIOLET, 0.08 + 0.8 * g * g, X, Y, s) if g > 0.25 else dith(RAMP, 0.06, X, Y, s))
    for side in (-1, 1):
        for i in range(160):
            k = i / 159
            x = 48 + side * (38 - 44 * k ** 1.3)
            y = 96 - 88 * math.sin(math.pi * 0.5 * k)
            w = 5.5 - 4 * k
            for X, Y, u, v in pc.each(x - w, y - 1, x + w, y + 1):
                n = (u - x) / w * side
                pc.c.p(X, Y, dith(BONE, 0.62 - 0.45 * n, X, Y, s))
    for j, cx in enumerate((24, 36, 48, 60, 72)):                                  # crânios na soleira
        for X, Y, u, v in pc.each(cx - 5, 84, cx + 5, 96):
            nx, ny = (u - cx) / 5, (v - 90) / 5
            if nx * nx + ny * ny <= 1:
                orb = any(((u - ex) / 1.3) ** 2 + ((v - 90) / 1.2) ** 2 < 1 for ex in (cx - 2, cx + 2))
                pc.c.p(X, Y, VIOLET[3] if orb else dith(BONE, 0.6 - 0.4 * nx, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def props(s: int) -> dict:
    return {'boss-gate': prop_gate(s), 'skull': prop_skull(s), 'tusk': prop_tusk(s), 'bones': prop_bones(s)}
