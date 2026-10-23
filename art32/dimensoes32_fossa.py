"""VIII — Fossa Cantante (M5 F6), em 16 e 32-bit: Peixe-lanterna, Água-viva Abissal, Caranguejo de
Casco Negro e O Coro Submerso. Pele azul-breu, luz viva ciano e rosa, osso de baleia, basalto,
cracas e pérolas negras."""
from __future__ import annotations

import math

from PIL import Image

from dimensoes32_base import ACTS, Dual, Piece, bay, dith, dmarks, fill, hsh, seg, sphere, vol
from lib32 import OL, noise

SKIN = [(8, 14, 24), (18, 28, 42), (30, 44, 62), (48, 66, 88), (78, 100, 122)]
BELLY = [(52, 62, 74), (86, 96, 106), (128, 136, 140), (170, 176, 176)]
TEETH = [(176, 184, 190), (236, 240, 242)]
MOUTH = [(30, 8, 16), (70, 18, 32), (110, 34, 52)]
CYAN = [(20, 80, 100), (30, 150, 170), (60, 220, 220), (170, 250, 240), (240, 255, 250)]
PINK = [(90, 30, 60), (160, 60, 110), (230, 110, 170), (250, 180, 220), (255, 236, 248)]
BELL = [(40, 52, 90), (70, 90, 140), (110, 140, 190), (160, 190, 226), (214, 232, 250)]
SHELL = [(6, 8, 14), (14, 18, 28), (26, 32, 46), (42, 50, 68), (68, 80, 100)]
CLAW = [(60, 54, 58), (104, 94, 92), (150, 140, 130), (196, 188, 174)]
BARN = [(90, 96, 98), (140, 146, 144), (190, 194, 188)]
PALE = [(60, 76, 92), (96, 116, 132), (140, 160, 172), (186, 202, 208), (224, 234, 236)]
HAIR = [(6, 10, 20), (14, 22, 38), (24, 36, 58), (40, 56, 82)]


def wave(x, k, t):
    return math.sin(x * k + t * math.pi / 2)


# ── Peixe-lanterna (24×24), retaguarda, isca acesa ────────────────────────

class Peixe(Dual):
    mid, stem, act, size16, style, kind = 'peixeLanterna', 'peixe-lanterna', 'VIII', (24, 24), 'float', 'monster'
    name = 'Peixe-lanterna'
    glow = {'cyan'}

    def pal(self):
        return {'skin': SKIN, 'belly': BELLY, 'teeth': TEETH, 'mouth': MOUTH, 'cyan': CYAN}

    def layers(self, P, K):
        b, t = P.bob, P.t
        lg = 0 if P.atk is None else [-0.5, 1, 2, 1][P.atk]
        gape = 1.0 + (1.6 if P.atk in (1, 2) else 0) + (t % 2) * 0.3

        def tail(p):
            sw = wave(0, 1, t) * 1.2
            pts = self.pg([(5 + lg, 13 + b), (1 + lg, 8 + b + sw), (2 + lg, 13 + b), (1 + lg, 18 + b + sw), (5 + lg, 14 + b)])
            vol(p, pts, K['skin'], spec=False)

        def body(p):
            pts = self.oval(4.5 + lg, 13 + b, 18 + lg, 12.5 + b, 6.4)
            for (x, y, u, v) in pts:
                belly = v > 0.35
                ramp = K['belly'] if belly else K['skin']
                k = 0.62 - 0.38 * v - 0.18 * u if not belly else 0.7 - 0.5 * (v - 0.35)
                p.p(x, y, ramp[max(0, min(len(ramp) - 1, int(k * len(ramp))))])
            for i in range(4):                                                  # espinhos do dorso
                x0 = 8 + i * 2.2 + lg
                vol(p, self.taper(seg(x0, 7.5 + b, x0 - 1, 4.5 + b + (i % 2)), 0.5, 0.15), K['skin'], spec=False)
            dmarks(p, P, 61, self.s, area=(6 + lg, 8 + b, 14 + lg, 17 + b))

        def jaw(p):
            mx, my = 18.5 + lg, 13 + b
            mouth = self.pg([(mx - 4, my - 0.5), (mx + 1.5, my - gape - 1), (mx + 2, my + gape * 0.8 + 1), (mx - 3.5, my + 1)])
            fill(p, mouth, K['mouth'][1])
            for (x, y) in mouth:
                if (x // self.s + y // self.s) % 3 == 0:
                    p.p(x, y, K['mouth'][0])
            for i in range(4):                                                   # dentes de agulha
                self.dot(p, mx - 2.5 + i * 1.3, my - gape * (0.4 + 0.2 * i) - 0.2, K['teeth'][1])
                self.dot(p, mx - 2 + i * 1.2, my + gape * (0.3 + 0.2 * i) + 0.4, K['teeth'][0])

        def eye(p):
            ex, ey = 15 + lg, 9.5 + b
            fill(p, self.e(ex, ey, 1.2, 1.2), K['belly'][3] if not P.hurt else K['skin'][1])
            if not P.hurt:
                self.dot(p, ex + 0.3, ey, K['cyan'][2])

        def lure(p):
            bx, by = 13 + lg, 7 + b
            tx, ty = 21 + lg + (1 if P.atk == 2 else 0), 3 + b - (t % 2) * 0.5
            path = [(bx + (tx - bx) * k, by + (ty - by) * k - 2.5 * math.sin(k * math.pi)) for k in [i / 12 for i in range(13)]]
            fill(p, self.taper(path, 0.4, 0.3), K['skin'][3])
            lit = 4 if t % 2 == 0 or P.atk == 2 else 3
            fill(p, self.e(tx, ty, 1.5, 1.5), K['cyan'][2])
            self.dot(p, tx, ty - 0.3, K['cyan'][lit])

        return [tail, body, jaw, eye, (lure, 'noring')]


# ── Água-viva Abissal (24×28), enxame que pulsa ───────────────────────────

class AguaViva(Dual):
    mid, stem, act, size16, style, kind = 'aguaViva', 'agua-viva', 'VIII', (24, 28), 'float', 'monster'
    name = 'Água-viva Abissal'
    glow = {'pink', 'cyan'}

    def pal(self):
        return {'bell': BELL, 'pink': PINK, 'cyan': CYAN}

    def layers(self, P, K):
        b, t = P.bob, P.t
        pulse = [0, 0.6, 1.1, 0.6][t] if P.atk is None else [1.2, 0.2, -0.6, 0.6][P.atk]
        reach = 0 if P.atk is None else [0, 1.5, 3.5, 1.5][P.atk]

        def tentacles(p):
            for i in range(6):
                x0 = 7 + i * 2 + reach * 0.3
                pts = []
                for j in range(14):
                    y = 13 + b + j * 1.05
                    x = x0 + 0.9 * wave(j, 0.55, t + i) + reach * (j / 13) ** 1.5
                    pts.append((x, y))
                fill(p, self.taper(pts, 0.4, 0.2), K['pink'][1] if i % 2 else K['bell'][1])
            for i, x0 in enumerate((10, 14)):                                     # braços orais franjados
                pts = [(x0 + 1.4 * wave(j, 0.7, t + i * 2) + reach * 0.4 * j / 9, 12 + b + j) for j in range(10)]
                vol(p, self.taper(pts, 1.0, 0.4), K['pink'], spec=False)

        def bell(p):
            cx, cy = 12, 8.5 + b + pulse * 0.3
            rx, ry = 7.2 - pulse * 0.6, 6 + pulse * 0.4
            pts = [q for q in self.e(cx, cy, rx, ry) if q[1] <= (cy + ry * 0.55) * self.s]
            for (x, y) in pts:
                nx, ny = (x / self.s - cx) / rx, (y / self.s - cy) / ry
                k = 0.72 - 0.35 * nx - 0.3 * ny
                inner = nx * nx + ny * ny < 0.35
                p.p(x, y, K['bell'][max(0, min(4, int(k * 5)))] if not inner else K['pink'][2 if (t + x) % 2 else 1])
            for i in range(7):                                                   # pontos acesos na borda
                a = math.pi * (0.1 + 0.8 * i / 6)
                x, y = cx - math.cos(a) * rx * 0.95, cy + ry * 0.5
                self.dot(p, x, y, K['cyan'][3 if (i + t) % 2 else 2])
            dmarks(p, P, 63, self.s, area=(7, 4 + b, 17, 11 + b))

        return [tentacles, bell]


# ── Caranguejo de Casco Negro (40×32), tanque de garra enorme ─────────────

class Caranguejo(Dual):
    mid, stem, act, size16, style, kind = 'caranguejo', 'caranguejo', 'VIII', (40, 32), 'legs', 'monster'
    name = 'Caranguejo de Casco Negro'
    glow = {'cyan'}
    lift = 1.2

    def pal(self):
        return {'shell': SHELL, 'claw': CLAW, 'barn': BARN, 'cyan': CYAN}

    def layers(self, P, K):
        b, t = P.bob, P.t
        ll, lr = P.lift
        if P.atk is None:
            cx, cy, open_ = 35, 15 + b, 0.6 + (t % 2) * 0.3
        else:
            cx, cy, open_ = [(33, 9, 1.4), (36, 6, 1.8), (39, 16, 0.2), (36, 14, 0.8)][P.atk]

        def legs(p):
            for i, x0 in enumerate((9, 13, 19, 23)):
                lift = ll if i % 2 == 0 else lr
                out = -1 if i < 2 else 1
                knee = (x0 + out * 3, 23 - lift * 0.5)
                foot = (x0 + out * 7, 31 - lift)
                vol(p, self.taper(seg(x0, 21 + b, *knee), 1.0, 0.8), K['shell'], spec=False)
                vol(p, self.taper(seg(*knee, *foot), 0.8, 0.3), K['shell'], spec=False)

        def small_claw(p):
            vol(p, self.taper(seg(10, 20 + b, 5, 22 + b), 1.0, 0.8), K['shell'], spec=False)
            fill(p, self.taper(seg(5, 22 + b, 3, 20.5 + b), 0.8, 0.3), K['claw'][1])

        def carapace(p):
            pts = self.oval(3.5, 19 + b, 30, 18.5 + b, 7)
            for (x, y, u, v) in pts:
                if v > 0.45:
                    continue
                k = 0.62 - 0.45 * v - 0.18 * u + 0.08 * math.sin(u * 9)
                p.p(x, y, K['shell'][max(0, min(4, int(k * 5)))])
            for i, (bx, by) in enumerate(((9, 15), (12, 13.5), (20, 13.5), (24, 15), (15, 15.5))):   # cracas
                fill(p, self.e(bx, by + b, 1.2, 1.0), K['barn'][1])
                self.dot(p, bx, by + b, K['barn'][0] if i % 2 else K['cyan'][2])
            for i in range(4):                                                    # espinhos da borda da frente
                vol(p, self.taper(seg(26 + i * 1.2, 14 + b + i * 1.2, 28 + i * 1.4, 12.5 + b + i * 1.4), 0.6, 0.2), K['shell'], spec=False)
            dmarks(p, P, 65, self.s, area=(7, 13 + b, 26, 21 + b))

        def eyes(p):
            for (ex, ey) in ((25, 10), (28, 10.5)):
                fill(p, self.taper(seg(ex - 1, 14 + b, ex, ey + b), 0.4, 0.4), K['shell'][3])
                fill(p, self.e(ex, ey + b, 0.9, 0.9), K['cyan'][2] if not P.hurt else K['shell'][1])
                if not P.hurt:
                    self.dot(p, ex, ey + b - 0.2, K['cyan'][4 if t % 2 == 0 else 3])

        def claw(p):
            sx, sy = 27, 17 + b
            ex, ey = (sx + cx) / 2, (sy + cy) / 2 + 2
            vol(p, self.taper(seg(sx, sy, ex, ey), 1.6, 1.3), K['shell'], spec=False)
            palm = self.oval(ex - 0.5, ey, cx - 2, cy, 3.4)
            for (x, y, u, v) in palm:
                k = 0.6 - 0.4 * v
                p.p(x, y, K['shell'][max(0, min(4, int(k * 5)))])
            top = self.taper(seg(cx - 2.5, cy - 1.2, cx + 3.5, cy - 2.8 - open_), 1.7, 0.3)
            bot = self.taper(seg(cx - 2.5, cy + 1.2, cx + 3, cy + 1.8 + open_), 1.3, 0.3)
            vol(p, top, K['claw'])
            vol(p, bot, K['claw'], spec=False)

        return [legs, small_claw, carapace, eyes, claw]


# ── O Coro Submerso (56×60), sereia-leviatã de muitas bocas ───────────────

class Coro(Dual):
    mid, stem, act, size16, style, kind = 'coroSubmerso', 'coro-submerso', 'VIII', (56, 60), 'float', 'boss'
    name = 'O Coro Submerso'
    glow = {'pink', 'cyan'}

    def pal(self):
        return {'pale': PALE, 'hair': HAIR, 'pink': PINK, 'cyan': CYAN, 'skin': SKIN, 'mouth': MOUTH}

    def layers(self, P, K):
        b, t = P.bob, P.t
        phase2 = P.mode == 'phase2'
        if P.atk is None:
            hx, hy = 44, 28 + b + wave(0, 1, t) * 0.8
        else:
            hx, hy = [(40, 18), (46, 12), (52, 30), (47, 26)][P.atk]
        sing = P.atk in (1, 2) or phase2

        def hair(p):
            for i in range(7):                                                   # cabelo boiando para cima e para trás
                pts = []
                for j in range(16):
                    k = j / 15
                    x = 30 - 16 * k - i * 1.2 + 1.2 * wave(j, 0.5, t + i)
                    y = 12 + b - 10 * k + i * 1.3 + 1.0 * wave(j, 0.4, t + i * 2)
                    pts.append((x, y))
                vol(p, self.taper(pts, 1.6, 0.4), K['hair'], spec=False)

        def tail(p):
            pts = []
            for j in range(22):
                k = j / 21
                a = math.pi * 1.25 * k
                x = 29 - 16 * math.sin(a) + 1.2 * wave(j, 0.4, t)
                y = 40 + 15 * (1 - math.cos(a)) * 0.6 + b * (1 - k)
                pts.append((x, y))
            body = self.taper(pts, 5.4, 1.4)
            for (x, y) in body:
                k = 0.55 + 0.25 * math.sin((x + y) / (3 * self.s))
                p.p(x, y, K['skin'][max(0, min(4, int(k * 5)))])
            fx, fy = pts[-1]
            fill(p, self.pg([(fx, fy), (fx - 5, fy - 4), (fx - 4, fy + 1), (fx - 5, fy + 5)]), K['skin'][3])
            dmarks(p, P, 67, self.s, area=(12, 42, 32, 56))

        def arm_back(p):
            vol(p, self.taper(seg(26, 22 + b, 18, 30 + b) + seg(18, 30 + b, 14, 26 + b), 1.6, 1.0), K['pale'], spec=False)

        def torso(p):
            for (sx_, sy_) in ((25.2, 21 + b), (36.6, 20.6 + b)):                     # ombros
                sphere(p, self.e(sx_, sy_, 2.7, 2.3), K['pale'], sx_ * self.s, sy_ * self.s, 2.7 * self.s, 2.3 * self.s)
            pts = self.pg([(24.5, 21 + b), (27.5, 18.6 + b), (34.5, 18.3 + b), (38, 20.5 + b), (37, 26 + b), (34.5, 33 + b), (34, 43 + b), (26, 43 + b), (26.5, 33 + b), (24.5, 26 + b)])
            rows = {}
            for (x, y) in pts:
                rows.setdefault(y, []).append(x)
            for y, xs in rows.items():
                a, c = min(xs), max(xs)
                for x in xs:
                    n = (x - (a + c) / 2) / max(1, (c - a) / 2)
                    k = 0.6 - 0.42 * n - 0.1 * ((y / self.s - 18) / 25)
                    p.p(x, y, K['pale'][max(0, min(4, int(k * 5)))])
            for i in range(3):                                                    # costelas
                fill(p, self.taper(seg(25.5, 22 + b + i * 2, 29.5, 23 + b + i * 2), 0.3, 0.3), K['pale'][1])
            # o coro: rostos afogados fundidos no tronco, cada um com a boca aberta
            for j, (fx, fy) in enumerate(((31.5, 28), (29.5, 36.5))):
                for ex in (fx - 1.3, fx + 1.2):
                    fill(p, self.e(ex, fy - 1.6 + b, 0.7, 0.55), K['skin'][0])
                w = 1.0 + (0.8 if sing else 0.2) + (t + j) % 2 * 0.25
                m = self.oval(fx - 1.3, fy + 0.8 + b, fx + 1.3, fy + 0.8 + b, w * 0.7)
                fill(p, [(x, y) for (x, y, _, _) in m], K['mouth'][0])
                inner = self.oval(fx - 0.7, fy + 0.8 + b, fx + 0.7, fy + 0.8 + b, w * 0.35)
                fill(p, [(x, y) for (x, y, _, _) in inner], K['pink'][3 if sing else 1])
                fill(p, self.taper(seg(fx - 2.2, fy - 2.6 + b, fx + 2.2, fy - 2.8 + b), 0.3, 0.3), K['pale'][1])   # sobrancelha da cara
            dmarks(p, P, 69, self.s, area=(25, 20 + b, 35, 40 + b))

        def head(p):
            cx, cy = 31.5, 12.5 + b
            vol(p, self.taper(seg(31, cy + 4, 31, cy + 8), 2.2, 2.6), K['pale'], spec=False)   # pescoço
            pts = self.oval(cx - 0.5, cy - 4.5, cx + 0.8, cy + 5, 4.4)
            for (x, y, u, v) in pts:
                k = 0.62 - 0.45 * v - 0.12 * u
                p.p(x, y, K['pale'][max(0, min(4, int(k * 5)))])
            for ex in (32, 34.6):                                                # olhos vazios acesos
                fill(p, self.e(ex, cy - 0.6, 0.9, 0.7), K['skin'][0])
                if not P.hurt:
                    self.dot(p, ex, cy - 0.7, K['cyan'][3 if t % 2 == 0 else 2])
            w = 0.9 + (0.8 if sing else 0)
            fill(p, [(x, y) for (x, y, _, _) in self.oval(32, cy + 2.8, 35, cy + 2.8, w)], K['mouth'][0])
            fill(p, self.r(32.5, cy + 2.6, 2, 0.6), K['pink'][2 if sing else 0])

        def arm(p):
            sx, sy = 34, 21 + b
            ex, ey = (sx + hx) / 2 + 1, (sy + hy) / 2 + 1.5
            vol(p, self.taper(seg(sx, sy, ex, ey), 1.7, 1.2), K['pale'], spec=False)
            vol(p, self.taper(seg(ex, ey, hx, hy), 1.2, 0.9), K['pale'], spec=False)
            for k in range(4):                                                    # dedos com membrana
                a = -0.9 + k * 0.5
                fx, fy = hx + 2.6 * math.cos(a), hy + 2.6 * math.sin(a)
                fill(p, self.taper(seg(hx, hy, fx, fy), 0.45, 0.25), K['pale'][3])

        def song(p):
            if not sing:
                return
            for r_ in ((6, 9) if phase2 else (5,)):                               # anéis do canto
                for i in range(40):
                    a = -0.9 + 1.8 * i / 39
                    x = 36 + r_ * 1.4 * math.cos(a) + (t % 2) * 0.7
                    y = 31 + b + r_ * 1.6 * math.sin(a)
                    if (i + t) % 3:
                        self.dot(p, x, y, K['pink'][3 if r_ < 7 else 2])

        return [hair, tail, arm_back, torso, head, arm, (song, 'noring')]


MONSTERS = [Peixe, AguaViva, Caranguejo, Coro]


# ── Cenário: rocha do fundo, costelas de baleia e luz viva ────────────────

RAMP = ACTS['VIII']['ramp']
ROCK = [(6, 10, 18), (12, 20, 32), (20, 32, 48), (30, 46, 66), (44, 64, 88), (64, 88, 114)]
BONE = [(70, 78, 84), (110, 118, 120), (150, 158, 156), (190, 196, 190), (222, 226, 218)]
SAND = [(14, 18, 26), (24, 30, 40), (36, 44, 56), (52, 62, 74), (72, 84, 96)]
CEIL0, WALL1 = 18, 110
PILLARS = (0, 80, 160, 240)
FX_RAMP = [(10, 40, 60), (30, 150, 170), (60, 220, 220), (170, 250, 240), (240, 255, 250)]


def rock_wall(pc: Piece, x0, x1, y0, y1, seed, light=1.0):
    """Basalto em lajes com veios, luz de cima (raios da superfície) e pontos de luz viva."""
    s = pc.s
    for X, Y, u, v in pc.each(x0, y0, x1, y1):
        cell = noise(u, v, seed, 14)
        crack = abs(noise(u, v, seed + 1, 9) - 0.5) < 0.035
        ray = max(0.0, math.sin((u * 0.9 - v * 0.35) * 0.12 + seed)) ** 6 * 0.25 * max(0.0, 1 - v / 110)
        k = light * (0.28 + 0.3 * cell + ray) - 0.35 * (abs(v - 70) / 60) ** 1.6
        col = dith(ROCK, k, X, Y, s)
        if crack:
            col = ROCK[0]
        elif hsh(int(u), int(v), seed) < 0.004:
            col = CYAN[3]
        elif s == 2 and hsh(X, Y, seed + 3) < 0.012:
            col = CYAN[1]
        pc.c.p(X, Y, col)


def rib(pc: Piece, cx, top, bottom, w, seed):
    """Costela de baleia em pé, curvada, com nós de osso; vira o pilar do corredor."""
    s = pc.s
    for X, Y, u, v in pc.each(cx - w - 8, top, cx + w + 8, bottom):
        k_ = (v - top) / max(1, bottom - top)
        off = 5 * math.sin(k_ * math.pi) * (1 if seed % 2 else -1)
        half = w / 2 * (1.25 - 0.4 * k_) + (2.5 if bottom - v < 6 else 0)
        dx = u - cx - off
        if abs(dx) > half:
            continue
        n = dx / half
        k = 0.6 - 0.45 * n - 0.35 * (abs(v - 74) / 60) ** 1.4 + (0.08 if (v % 14) < 1.5 else 0)
        pc.c.p(X, Y, dith(BONE, k, X, Y, s))
    pts = {(X, Y) for X, Y, _, _ in pc.each(cx - w - 8, top, cx + w + 8, bottom) if pc.c.g(X, Y) in BONE}
    for (X, Y) in pts:
        if (X - 1, Y) not in pts or (X + 1, Y) not in pts:
            pc.c.p(X, Y, BONE[0])


def tube_worms(pc: Piece, cx, base, seed):
    s = pc.s
    for i in range(7):
        x = cx - 12 + 24 * hsh(i, 0, seed)
        h = 14 + 22 * hsh(i, 1, seed)
        for X, Y, u, v in pc.each(x - 1.4, base - h, x + 1.4, base):
            if abs(u - x) < 1.2:
                pc.c.p(X, Y, dith(BELLY, 0.7 - 0.5 * (u - x + 1.2) / 2.4, X, Y, s))
        for X, Y, u, v in pc.each(x - 3, base - h - 4, x + 3, base - h + 1):    # pluma vermelha acesa
            if (u - x) ** 2 / 9 + (v - (base - h - 1.5)) ** 2 / 5 < 1:
                pc.c.p(X, Y, dith([(90, 20, 30), (170, 40, 50), (230, 90, 90), (250, 170, 160)], 0.9 - abs(u - x) / 4, X, Y, s))


def clam(pc: Piece, cx, base, r, seed):
    """Concha gigante aberta com a pérola negra acesa."""
    s = pc.s
    for X, Y, u, v in pc.each(cx - r - 1, base - r * 1.4, cx + r + 1, base + 1):
        nx = (u - cx) / r
        top = base - r * 1.3 * math.sqrt(max(0.0, 1 - nx * nx))
        if top <= v <= base - r * 0.45 * math.sqrt(max(0.0, 1 - nx * nx)):         # tampa aberta
            ridge = math.sin(nx * 7) > 0.6
            pc.c.p(X, Y, dith(BONE, 0.55 - 0.3 * nx - (0.15 if ridge else 0), X, Y, s))
        elif base - r * 0.45 <= v <= base and abs(nx) < 1:                         # base
            pc.c.p(X, Y, dith(BONE, 0.4 - 0.2 * nx, X, Y, s))
    py = base - r * 0.55
    for X, Y, u, v in pc.each(cx - 3, py - 3, cx + 3, py + 3):
        q = ((u - cx) ** 2 + (v - py) ** 2) / 7.5
        if q < 1:
            pc.c.p(X, Y, dith([(8, 6, 16), (30, 20, 50), (70, 50, 110), (150, 120, 200), (240, 220, 255)], 0.9 - q - 0.3 * (u - cx) / 3, X, Y, s))


def anemones(pc: Piece, cx, base, seed):
    s = pc.s
    for i in range(5):
        x = cx - 14 + 28 * hsh(i, 0, seed)
        for j in range(9):
            a = math.pi * (0.15 + 0.7 * j / 8)
            for k in range(10):
                tx = x + math.cos(a) * k * 0.9 + 0.6 * math.sin(k * 0.8 + i)
                ty = base - math.sin(a) * k * 0.9
                pc.dot(tx, ty, PINK[1 + (k > 6)] if k < 9 else PINK[3])


def abyss_window(pc: Piece, cx, cy, r, seed):
    """Abertura para o breu do fundo, com luzinhas de bichos distantes."""
    s = pc.s
    for X, Y, u, v in pc.each(cx - r - 3, cy - r * 1.2 - 3, cx + r + 3, cy + r * 1.2 + 3):
        d = math.hypot((u - cx) / r, (v - cy) / (r * 1.2))
        if d <= 1:
            pc.c.p(X, Y, dith(RAMP, 0.02 + 0.08 * d ** 3, X, Y, s))
            if hsh(int(u), int(v), seed) < 0.01:
                pc.c.p(X, Y, CYAN[2] if hsh(int(u), int(v), seed + 1) < 0.6 else PINK[2])
        elif d <= 1.18:
            pc.c.p(X, Y, dith(ROCK, 0.5 - 0.4 * (d - 1) / 0.18, X, Y, s))


def ceiling(pc: Piece, seed):
    s = pc.s
    for X, Y, u, v in pc.each(0, 0, pc.w16, CEIL0 + 3):
        drip = v > CEIL0 - 2 + 3 * noise(u, 0, seed, 6)
        pc.c.p(X, Y, dith(ROCK, 0.08 + 0.12 * (v / CEIL0) + (0.06 if drip else 0), X, Y, s))


def plinth(pc: Piece, seed):
    s = pc.s
    for X, Y, u, v in pc.each(0, WALL1, pc.w16, pc.h16):
        lump = 2 * noise(u, 0, seed, 10)
        k = (0.32 if v < WALL1 + 3 + lump else 0.1) + 0.1 * noise(u, v, seed + 2, 6)
        pc.c.p(X, Y, dith(SAND if v < WALL1 + 3 + lump else ROCK, k, X, Y, s))


PLAN = {'a': ['tubes', 'clam', 'window', 'anemone'], 'b': ['window', 'anemone', 'tubes', 'clam']}


def wall(variant: str, s: int) -> Image.Image:
    pc = Piece(320, 192, s)
    seed = 13 if variant == 'a' else 29
    rock_wall(pc, 0, 320, CEIL0, WALL1 + 2, seed)
    ceiling(pc, seed)
    for i, feat in enumerate(PLAN[variant]):
        cx = PILLARS[i] + 40
        sd = seed * 10 + i
        if feat == 'tubes':
            tube_worms(pc, cx, WALL1 - 1, sd)
        elif feat == 'clam':
            clam(pc, cx, WALL1 - 2, 14, sd)
        elif feat == 'window':
            abyss_window(pc, cx, 62, 15, sd)
        else:
            anemones(pc, cx, WALL1 - 2, sd)
    plinth(pc, seed)
    for j, px in enumerate(PILLARS + (320,)):
        rib(pc, px, 0, WALL1 + 6, 9, j)
    return pc.image()


def door(s: int) -> Image.Image:
    """Arco de vértebras: discos de osso empilhados."""
    pc = Piece(48, 192, s)
    for i in range(12):
        y = 6 + i * 10.5
        w = 9 + 2 * math.sin(i * 0.9)
        for X, Y, u, v in pc.each(24 - w - 2, y, 24 + w + 2, y + 10):
            nx = (u - 24) / w
            if abs(nx) <= 1 and v < y + 8.5:
                k = 0.62 - 0.45 * nx - 0.2 * (v - y) / 8.5 - 0.3 * (abs(v - 74) / 60) ** 1.4
                pc.c.p(X, Y, dith(BONE, k, X, Y, s))
            elif abs(nx) <= 0.55:
                pc.c.p(X, Y, BONE[0])
        for side in (-1, 1):                                                       # processos laterais
            for X, Y, u, v in pc.each(24 + side * w, y + 2, 24 + side * (w + 4), y + 5):
                if pc.c.g(X, Y) is None:
                    pc.c.p(X, Y, dith(BONE, 0.4, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def entry(s: int) -> Image.Image:
    pc = Piece(72, 192, s)
    rock_wall(pc, 0, 72, CEIL0, WALL1 + 2, 41, light=0.7)
    ceiling(pc, 41)
    plinth(pc, 41)
    for X, Y, u, v in pc.each(0, 0, 30, 120):
        if u ** 2 / 26 ** 2 + (v - 120) ** 2 / 96 ** 2 < 1 and v > 24:
            pc.c.p(X, Y, dith(RAMP, 0.02 + 0.06 * (u / 30), X, Y, s))
    for i in range(8):
        y, x = 36 + i * 11, 2 + i * 7
        for X, Y, u, v in pc.each(x - 2, y, x + 10, y + 11):
            top = v < y + 2.2
            pc.c.p(X, Y, dith(ROCK, (0.62 if top else 0.3) - 0.03 * i, X, Y, s))
    for X, Y, u, v in pc.each(0, 0, 72, 192):
        if bay(X, Y) < max(0.0, 0.6 - u / 72):
            c = pc.c.g(X, Y)
            if c:
                pc.c.p(X, Y, tuple(max(0, round(v_ * 0.55)) for v_ in c))
    rib(pc, 72, 0, WALL1 + 6, 9, 5)
    return pc.image()


def floor(s: int) -> Image.Image:
    pc = Piece(320, 64, s)
    for X, Y, u, v in pc.each(0, 0, 320, 64):
        ripple = math.sin(u * 0.35 + 3 * noise(u, v, 7, 18) + v * 0.2)
        k = 0.4 - 0.3 * (v / 64) + 0.1 * ripple + 0.06 * noise(u, v, 9, 6)
        col = dith(SAND, k, X, Y, s)
        if hsh(int(u), int(v), 11) < 0.005:
            col = CYAN[2]
        elif hsh(int(u / 2), int(v / 2), 12) < 0.01:
            col = BONE[1]
        pc.c.p(X, Y, col)
    for X, Y, u, v in pc.each(0, 0, 320, 3):
        if v < 1.8 + 1.4 * math.sin(u * 0.27) and hsh(int(u / 3), 0, 4) < 0.6:
            pc.c.p(X, Y, None)
    return pc.image()


def fore(s: int) -> Image.Image:
    pc = Piece(320, 32, s)
    for i in range(10):
        cx = 12 + i * 32 + 8 * hsh(i, 0, 71)
        h = 5 + 9 * hsh(i, 1, 71)
        for j in range(5):                                                         # coral em leque, silhueta
            a = math.pi * (0.25 + 0.5 * j / 4)
            for k in range(int(h)):
                pc.dot(cx + math.cos(a) * k * 0.8, 31 - math.sin(a) * k, RAMP[1] if k < h - 2 else RAMP[2])
        for X, Y, u, v in pc.each(cx - 5, 28, cx + 5, 32):
            if (u - cx) ** 2 / 25 + (v - 32) ** 2 / 9 < 1:
                pc.c.p(X, Y, RAMP[0])
    return pc.image()


def corridor(s: int) -> dict:
    return {'wall-a': wall('a', s), 'wall-b': wall('b', s), 'floor': floor(s), 'fore': fore(s), 'door': door(s), 'entry': entry(s)}


# ── Objetos ───────────────────────────────────────────────────────────────

def prop_clam(s):
    pc = Piece(32, 32, s)
    clam(pc, 16, 31, 13, 3)
    pc.c.outline(OL)
    return pc.image()


def prop_tubes(s):
    pc = Piece(32, 64, s)
    tube_worms(pc, 16, 63, 5)
    pc.c.outline(OL)
    return pc.image()


def prop_rock(s):
    pc = Piece(64, 32, s)
    for X, Y, u, v in pc.each(0, 4, 64, 32):
        top = 32 - (20 * math.sqrt(max(0.0, 1 - ((u - 32) / 30) ** 2)) + 3 * noise(u, 0, 2, 6))
        if v >= top:
            k = 0.5 - 0.35 * (v - top) / 22 - 0.25 * (u - 32) / 32
            pc.c.p(X, Y, dith(ROCK, k, X, Y, s))
            if hsh(int(u), int(v), 5) < 0.02:
                pc.c.p(X, Y, CYAN[2])
    anemones(pc, 30, 18, 7)
    pc.c.outline(OL)
    return pc.image()


def prop_gate(s):
    """Portão do covil: a mandíbula de um leviatã em arco, dentes para baixo e a luz rosa do canto."""
    pc = Piece(96, 96, s)
    for X, Y, u, v in pc.each(14, 12, 82, 96):                                     # breu de dentro com o brilho
        if ((u - 48) / 30) ** 2 + ((v - 96) / 80) ** 2 < 1:
            g = max(0.0, 1 - math.hypot(u - 48, v - 72) / 34)
            pc.c.p(X, Y, dith(PINK, 0.1 + 0.85 * g * g, X, Y, s) if g > 0.25 else dith(RAMP, 0.08, X, Y, s))
    for side in (-1, 1):
        for i in range(160):
            k = i / 159
            x = 48 + side * 38 * math.cos(math.pi * 0.5 * k)
            y = 96 - 86 * math.sin(math.pi * 0.5 * k)
            w = 5 - 2.5 * k
            for X, Y, u, v in pc.each(x - w, y - 1, x + w, y + 1):
                n = (u - x) / w * side
                pc.c.p(X, Y, dith(BONE, 0.62 - 0.45 * n, X, Y, s))
        for j in range(6):                                                         # dentes
            k = 0.15 + j * 0.13
            x = 48 + side * 34 * math.cos(math.pi * 0.5 * k)
            y = 96 - 82 * math.sin(math.pi * 0.5 * k)
            for X, Y, u, v in pc.each(x - 2, y, x + 2, y + 9):
                if abs(u - x + side * (v - y) * 0.25) < 2 * (1 - (v - y) / 9):
                    pc.c.p(X, Y, dith(TEETH + [(255, 255, 255)], 0.7 - 0.4 * (v - y) / 9, X, Y, s))
    pc.c.outline(OL)
    return pc.image()


def props(s: int) -> dict:
    return {'boss-gate': prop_gate(s), 'clam': prop_clam(s), 'tubes': prop_tubes(s), 'rock': prop_rock(s)}
