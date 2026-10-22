"""Ato VI — Coração do Abismo, em 32-bit: Sombra Faminta, Lamento, Arauto do Fundo e Aquilo que
Vigia. Sombra feita de fiapos de névoa escura com borda de luz violeta, fantasma de vestido que se
desfaz em fumaça, máscara de osso, carne roxa com veias e olhos que vigiam."""
import math

from monstros32_b_base import (BOB, E, PG, R, T, THICK, Monster, Pose, bay, bbox, bbox_pts, cyl, dk, edge_light,  # noqa: F401
                               fill, hsh, marks, mix, mul, noise, rows_of, seg, sphere, vol)

VOID = [(5, 4, 9), (14, 9, 22), (26, 16, 38), (42, 26, 60), (64, 42, 88)]
GHOST = [(46, 36, 62), (70, 56, 92), (98, 82, 124), (132, 114, 158), (172, 156, 196)]
PALE = [(92, 90, 116), (134, 132, 158), (180, 178, 200), (220, 218, 232), (244, 242, 250)]
BONEV = [(104, 94, 84), (150, 140, 124), (196, 188, 170), (232, 226, 210)]
VGLOW = [(70, 30, 100), (122, 62, 168), (176, 112, 224), (226, 190, 250)]
HAIRV = [(6, 4, 10), (16, 12, 24), (30, 22, 42), (46, 36, 62)]
GOLDV = [(88, 60, 26), (150, 112, 52), (204, 162, 78), (244, 212, 124)]
STEELV = [(30, 30, 40), (54, 54, 66), (86, 86, 100), (124, 124, 140)]


def idx(v: float, n: int) -> int:
    return max(0, min(n - 1, int((v + 1) / 2 * n + 0.1)))


def smoky(p, pts, K, seed: int, t: int, key='void', rim=True):
    """Corpo de névoa: miolo quase preto, redemoinhos um tom acima pelo ruído que corre com t,
    borda esquerda/de cima acesa de violeta."""
    s = set(pts)
    v = K[key]
    for (x, y) in pts:
        n = noise(x * 0.8 + t * 1.5, y - t * 2.0, seed, 4.0)
        i = 0 if n < 0.45 else (1 if n < 0.68 else 2)
        p.p(x, y, v[i])
    if rim:
        for (x, y) in pts:
            if (x - 1, y) not in s or (x, y - 1) not in s:
                p.p(x, y, v[3])
                if (x + 1, y) in s and ((x - 1, y) not in s) and hsh(x, y, seed) < 0.5:
                    p.p(x + 1, y, v[2])


# ── Sombra Faminta (24×32 → 48×64) ────────────────────────────────────────

class Sombra(Monster):
    mid, stem, act, size, style = 'sombra', 'sombra', 'VI', (48, 64), 'float'
    glow = {'eye', 'wisp'}

    def pal(self):
        return {'void': VOID, 'eye': VGLOW, 'wisp': [(62, 40, 86), (98, 70, 130), (150, 120, 190)],
                'bone': BONEV, 'teeth': [(150, 140, 130), (214, 208, 196), (250, 246, 234)],
                'maw': [(40, 10, 34), (70, 18, 52), (104, 30, 70)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t = P.bob, P.t
        if P.atk is None:
            cl = ((8, 44 + b), (40, 44 + b))
            open_ = 0
        else:
            cl = [((10, 24), (38, 22)), ((14, 36), (44, 32)), ((20, 40), (46, 38)), ((9, 42), (41, 42))][P.atk]
            open_ = (0, 1, 3, 1)[P.atk]
        if P.hurt:
            open_ = 2

        def body(p):
            pts = []
            for y in range(10 + b, 62):
                k = (y - 10 - b) / (51 - b)
                hw = 7 + math.sin(min(1.0, k * 1.15) * math.pi) * 10 - max(0.0, k - 0.8) * 6
                a = round(24 - hw + math.sin(y * 0.35 + t) * 1.6)
                z = round(24 + hw + math.cos(y * 0.3 + t) * 1.6)
                for x in range(a, z + 1):
                    if y > 52 and hsh(x // 3, 0, 141 + t) < (y - 52) / 10:
                        continue                                                  # fiapos de baixo
                    pts.append((x, y))
            for k, x0 in enumerate(range(12, 38, 4)):                             # fiapos pendentes
                ln = 8 + int(hsh(x0, t, 142) * 5)
                for j in range(ln):
                    y = 50 + j
                    x = x0 + round(math.sin(j * 0.5 + t + k) * 1.2)
                    if y < 63:
                        pts.append((x, y))
                        if j < ln * 0.6:
                            pts.append((x + 1, y))
            smoky(p, pts, K, 143, t)
            marks(p, P, 144, area=(12, 36 + b, 36, 52))

        def arms(p):
            for (hx, hy), sx in ((cl[0], 12), (cl[1], 36)):
                pts = THICK(seg(sx, 30 + b, (sx + hx) / 2, (30 + b + hy) / 2 + 2) + seg((sx + hx) / 2, (30 + b + hy) / 2 + 2, hx, hy), 2.2)
                smoky(p, pts, K, 145, t)
                side = -1 if hx < 24 else 1
                fwd = P.atk in (1, 2) and side > 0
                for k in range(3):                                                # garras de osso
                    for j in range(6):
                        if fwd:
                            x, y = hx + 1 + j, hy - 2 + k * 2 + (1 if j > 3 else 0)
                        else:
                            x, y = hx - 2 + k * 2 + (side if j > 3 else 0), hy + 1 + j
                        p.p(x, y, K['bone'][3 if j < 2 else (2 if j < 4 else 1)])

        def face(p):
            for ex in (17, 28):                                                   # olhos
                if P.hurt:
                    p.hl(ex, 20 + b, 4, K['eye'][0])
                else:
                    p.rect(ex, 18 + b, 4, 3, K['eye'][1])
                    p.rect(ex + 1, 18 + b, 2, 2, K['eye'][2])
                    p.p(ex + 1, 18 + b, K['eye'][3] if t % 2 == 0 else K['eye'][2])
            # bocarra em meia-lua com dentes em serra em cima e embaixo
            for x in range(13, 36):
                curve = round(abs(x - 24) ** 1.6 * 0.07)
                top = 26 + b - curve
                bot = 33 + b - curve + open_
                for y in range(top, bot):
                    k = (y - top) / max(1, bot - top)
                    p.p(x, y, K['maw'][2] if k < 0.25 else (K['maw'][1] if k < 0.6 else K['maw'][0]))
                tooth_t = 3 if (x % 3 == 0) else (2 if x % 3 == 1 else 1)
                for j in range(tooth_t):
                    p.p(x, top + j, K['teeth'][2 if j == 0 else 1])
                tooth_b = 3 if (x % 3 == 1) else (2 if x % 3 == 2 else 1)
                for j in range(tooth_b):
                    p.p(x, bot - 1 - j, K['teeth'][1 if j == 0 else 0])

        def wisps(p):
            w = K['wisp']
            for k in range(4):
                x = 12 + k * 8 + (t + k) % 2
                y = 6 + b - (t + k) % 3 * 2
                if y >= 0:
                    p.p(x, y, w[2 if k % 2 else 1]); p.p(x, y + 1, w[0])
                    if k % 2 == 0:
                        p.p(x + 1, y - 1, w[0])

        return [body, arms, face, (wisps, 'noring')]


# ── Lamento (24×32 → 48×64) ───────────────────────────────────────────────

class Lamento(Monster):
    mid, stem, act, size, style = 'lamento', 'lamento', 'VI', (48, 64), 'float'
    glow = {'tear'}

    def pal(self):
        return {'dress': GHOST, 'pale': PALE, 'hair': HAIRV, 'tear': [(98, 72, 150), (150, 120, 210), (214, 196, 250)],
                'eyes': [(6, 4, 10), (24, 16, 36)], 'mouth': [(14, 6, 18), (40, 20, 50)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t = P.bob, P.t
        wail = P.atk in (1, 2) or P.hurt
        if P.atk is None:
            hands = ((19, 23 + b), (29, 23 + b))
        else:
            hands = [((19, 20), (29, 20)), ((14, 24), (34, 22)), ((12, 26), (38, 24)), ((18, 24), (30, 24))][P.atk]

        def hair_back(p):
            hv = K['hair']
            for j, x0 in enumerate((14, 15, 16, 17, 31, 32, 33, 34)):
                side = -1 if x0 < 24 else 1
                for y in range(10 + b, 44 + b - (j % 3) * 3):
                    x = x0 + (side * ((y - 24 - b) // 4) if y > 24 + b else 0) + round(math.sin(y * 0.3 + t + j) * 0.6)
                    p.p(x, y, hv[1 + (j + y // 4) % 3] if (y + j) % 5 else hv[0])

        def dress(p):
            pts = []
            for y in range(26 + b, 62):
                k = (y - 26 - b) / (35 - b)
                a = round(18 - k * 8 + math.sin(y * 0.3 + t) * 0.8)
                z = round(30 + k * 8 + math.sin(y * 0.27 + t + 1) * 0.8)
                for x in range(a, z + 1):
                    if y > 50 and hsh(x // 2, y // 2 + t, 13) < (y - 50) / 12:
                        continue                                                  # some em fumaça
                    pts.append((x, y))
            d = K['dress']
            rows = rows_of(pts)
            for y, xs in rows.items():
                a, z = min(xs), max(xs)
                cx, rx = (a + z) / 2, max(1.0, (z - a) / 2)
                for x in xs:
                    nx = (x - cx) / rx
                    v = -nx * 0.6 + 0.3 * math.sin((x - a) * 0.75 + y * 0.05) + 0.1
                    i = idx(v, len(d))
                    if y > 46 and bay(x, y) < (y - 46) / 20:
                        i = max(0, i - 1)                                         # escurece ao sumir
                    p.p(x, y, d[i])
            p.hl(18, 34 + b, 13, d[0]); p.hl(18, 35 + b, 13, d[3])                  # cintura
            for x in range(19, 30):                                               # decote rendado
                p.p(x, 27 + b + (x % 2), K['pale'][2])
            marks(p, P, 151, area=(14, 36 + b, 34, 52))

        def arms(p):
            for (hx, hy), (sx, ex) in ((hands[0], (18, 14)), (hands[1], (30, 34))):
                pts = THICK(seg(sx, 28 + b, ex, 34 + b) + seg(ex, 34 + b, hx, hy + 3), 1.7)
                vol(p, pts, K['dress'], spec=False)

        def head(p):
            y0 = 9 + b
            hd = E(24, y0 + 7, 6.6, 7.6)
            vol(p, hd, K['pale'], spec=False, bias=0.1)
            pl = K['pale']
            p.hl(19, y0 + 4, 3, pl[1]); p.hl(26, y0 + 4, 3, pl[1])                  # sobrancelha aflita
            p.p(22, y0 + 3, pl[1]); p.p(25, y0 + 3, pl[1])
            for ex in (19, 26):                                                   # olhos fundos
                p.hl(ex, y0 + 5, 3, pl[0])
                p.hl(ex, y0 + 6, 3, K['eyes'][0]); p.p(ex + 1, y0 + 6, K['eyes'][1])
                p.hl(ex, y0 + 7, 3, pl[1])
            for k, ex in enumerate((20, 27)):                                     # lágrimas de luz
                ln = 3 + (t + k) % 3
                for j in range(ln):
                    p.p(ex, y0 + 8 + j, K['tear'][2 if j == 0 else 1])
                p.p(ex, y0 + 8 + ln, K['tear'][0])
            mh = 4 if wail else 2
            p.rect(23, y0 + 11, 3, mh, K['mouth'][0]); p.p(24, y0 + 11, K['mouth'][1])
            p.vl(24, y0 + 8, 2, pl[1])
            # franja e risca do cabelo por cima da testa
            hv = K['hair']
            cap = [q for q in E(24, y0 + 3, 7.4, 5) if q[1] <= y0 + 2]
            for (x, y) in cap:
                p.p(x, y, hv[2] if (x + (1 if x < 24 else 0)) % 3 else hv[1])
            p.vl(24, y0 - 2, 4, hv[0])
            for x in (17, 18, 30, 31):
                for y in range(y0 + 2, y0 + 12):
                    p.p(x, y, hv[1 + (x + y) % 2])

        def hands_(p):
            for (hx, hy) in hands:
                vol(p, E(hx, hy + 1, 2, 2.8), K['pale'], spec=False)
                for fx in (hx - 1, hx + 1):
                    p.vl(fx, hy - 2, 2, K['pale'][2])

        return [hair_back, dress, arms, head, hands_]

    def strike(self, c, d):
        """O golpe do Lamento é um grito: ondas violeta saindo para a frente."""
        x0, y0, x1, y1 = bbox(c)
        cols = [(214, 196, 250), (150, 120, 210)]
        for k, r in enumerate((4, 8)):
            for j in range(-6, 7):
                x = x1 + r - round(abs(j) * 0.35)
                y = y0 + 20 + j
                if 0 <= x < c.w and 0 <= y < c.h and c.px[y][x] is None:
                    c.px[y][x] = cols[k]
        return c


# ── Arauto do Fundo (32×40 → 64×80) ───────────────────────────────────────

class Arauto(Monster):
    mid, stem, act, size, style = 'arauto', 'arauto', 'VI', (64, 80), 'legs'
    glow = {'eye', 'mask'}
    lift = 3
    G = 78

    def pal(self):
        return {'robe': [(28, 18, 42), (48, 32, 68), (72, 50, 98), (102, 76, 132), (138, 110, 168)], 'gold': GOLDV, 'bone': BONEV, 'steel': STEELV, 'void': VOID,
                'banner': [(20, 10, 30), (40, 20, 58), (66, 34, 94), (96, 52, 130)],
                'eye': [(64, 84, 34), (110, 140, 50), (156, 190, 74), (214, 236, 140)],
                'mask': [(70, 30, 100), (176, 112, 224)], 'wood': [(28, 18, 14), (54, 36, 24), (82, 56, 34)],
                'fur': [(24, 22, 30), (44, 40, 52), (68, 64, 78), (98, 94, 108)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t, G = P.bob, P.t, self.G
        ll, lr = P.lift
        sway = [0, 2, 2, 0][t]
        if P.atk is None:
            mo, bl = (44, 43 + b), (56, 33 + b)
        else:
            mo, bl = [((40, 26), (53, 16)), ((40, 26), (55, 17)), ((40, 26), (56, 18)), ((42, 34), (55, 26))][P.atk]

        def feet(p):
            for x0, lift in ((24, ll), (36, lr)):
                pts = R(x0, 73 - lift, 8, 4) + E(x0 + 7, 75 - lift, 2, 2)
                vol(p, pts, K['void'], spec=False)
                p.hl(x0, 73 - lift, 8, K['void'][3])

        def robe(p):
            pts = []
            for y in range(28 + b, 77):
                k = (y - 28 - b) / (48 - b)
                a, z = round(22 - k * 8), round(42 + k * 8)
                for x in range(a, z + 1):
                    pts.append((x, y))
            rd = K['robe']
            for y, xs in rows_of(pts).items():
                a, z = min(xs), max(xs)
                cx, rx = (a + z) / 2, max(1.0, (z - a) / 2)
                for x in xs:
                    nx = (x - cx) / rx
                    v = -nx * 0.65 + 0.28 * math.sin((x - a) * 0.6 + 0.4) + 0.05
                    p.p(x, y, rd[idx(v, len(rd))])
            g = K['gold']
            for y in range(30 + b, 76):
                p.p(32, y, g[3]); p.p(33, y, g[1])
            for x in range(14, 51):
                if p.g(x, 75) is not None:
                    p.p(x, 75, g[2]); p.p(x, 76, g[1])
            for y in (36, 46, 56, 66):
                p.hl(30, y + b, 6, g[2]); p.hl(30, y + b + 1, 6, g[1]); p.p(30, y + b, g[3])
            marks(p, P, 161, area=(18, 40 + b, 46, 70))

        def banner(p):
            for y in range(8 + b, 78):
                p.p(12, y, K['wood'][2]); p.p(13, y, K['wood'][1]); p.p(14, y, K['wood'][0])
            vol(p, E(13, 7 + b, 2, 2), K['gold'])
            p.hl(11, 10 + b, 5, K['gold'][2])
            cloth = []
            for y in range(11 + b, 36 + b):
                k = (y - 11 - b) / 25
                w = 14 if k < 0.72 else round(14 * (1 - (k - 0.72) / 0.28))
                off = round(sway * max(0.0, k - 0.2))
                for x in range(15, 15 + max(1, w)):
                    if k > 0.72 and abs(x - 22) < (k - 0.72) * 22:
                        continue                                                  # rabo de andorinha
                    cloth.append((x + off, y))
            bn = K['banner']
            for (x, y) in cloth:
                f = math.sin((x - 15) * 0.6 + y * 0.05)
                p.p(x, y, bn[2 if f > 0.4 else (1 if f > -0.5 else 0)])
            for (x, y) in cloth:
                if y == 11 + b:
                    p.p(x, y, K['gold'][2])
            ex, ey = 19 + round(sway * 0.3), 21 + b                               # o olho
            for (x, y) in E(ex, ey, 3.4, 2.4):
                p.p(x, y, K['eye'][2])
            p.hl(ex - 3, ey + 1, 7, K['eye'][1])
            p.rect(ex - 1, ey - 2, 2, 5, K['void'][0])
            p.p(ex - 2, ey - 1, K['eye'][3])

        def mantle(p):
            pts = E(33, 31 + b, 15, 5.5)
            fu = K['fur']
            for (x, y) in pts:
                v = -(x - 33) / 15 * 0.6 - (y - 31 - b) / 5.5 * 0.5 + (hsh(x, y // 2, 162) - 0.5) * 0.5
                p.p(x, y, fu[idx(v, len(fu))])
            for x in range(18, 49):
                if hsh(x, 0, 163) < 0.5:
                    p.p(x, 37 + b, fu[1])                                         # pelo pendendo
            for cx in (24, 42):
                vol(p, E(cx, 31 + b, 7, 4), K['steel'])
                p.hl(cx - 5, 33 + b, 11, K['steel'][0])

        def horn(p):
            hx, hy = mo
            path = [(hx + (bl[0] - hx) * k / 20, hy + (bl[1] - hy) * k / 20 - math.sin(k / 20 * math.pi) * 3) for k in range(21)]
            pts = THICK(path, 1.2)
            vol(p, pts, K['bone'])
            for k in (5, 10, 15):
                x, y = path[k]
                p.p(round(x), round(y), K['bone'][0])                             # anéis do chifre
            bell = E(bl[0], bl[1], 3.4, 3.4)
            vol(p, bell, K['bone'])
            p.rect(round(bl[0]), round(bl[1]) - 1, 2, 2, K['void'][0])
            hand = E(hx + 1, hy + 1, 3, 3)
            vol(p, hand, K['robe'], spec=False)

        def head(p):
            y0 = 8 + b
            hood = [q for q in E(32.5, y0 + 9, 8.6, 9.5) if q[1] <= y0 + 9] + R(24, y0 + 10, 18, 10)
            hood += [(33 + (y0 - 1 - y) // 2, y) for y in range(y0 - 3, y0)]                 # bico do capuz
            rd = K['robe']
            for (x, y) in hood:
                k = (x - 32.5) / 8
                p.p(x, y, rd[idx(-k * 0.7 + 0.15, len(rd))])
            mask = E(32.5, y0 + 11.5, 6.6, 7) + T(y0 + 14, y0 + 19, 27, 38, 30, 35)
            vol(p, mask, K['bone'], spec=False, bias=0.15)
            bn = K['bone']
            p.vl(32, y0 + 6, 9, bn[3]); p.vl(33, y0 + 6, 9, bn[1])                    # quilha da máscara
            for ex, sl in ((28, 1), (35, -1)):                                    # olhos rasgados
                p.hl(ex, y0 + 10, 3, K['void'][0]); p.p(ex + (2 if sl > 0 else 0), y0 + 9, K['void'][0])
                p.hl(ex, y0 + 11, 3, bn[0])
                if not P.hurt:
                    p.p(ex + 1, y0 + 10, K['mask'][1] if t % 2 == 0 else K['mask'][0])
            for (x, y) in ((28, 14), (37, 14), (29, 15), (36, 15)):
                p.p(x, y0 + y, bn[1])                                             # entalhes nas maçãs
            for x in range(30, 36, 2):
                p.p(x, y0 + 17, bn[0]); p.p(x, y0 + 16, bn[1])                    # boca costurada
            for x in range(25, 41):
                p.p(x, y0 + 5, rd[0])
            if P.corrupt == 2:
                marks(p, P, 164, count=1, area=(27, y0 + 7, 38, y0 + 16))

        return [feet, banner, robe, mantle, horn, head]

    def strike(self, c, d):
        """Golpe do Arauto: o chifre toca — anéis de som saindo da boca do chifre."""
        cols = [(214, 196, 250), (176, 112, 224)]
        cx, cy = 58, 18
        for k, r in enumerate((4, 7)):
            for a in range(-50, 51, 10):
                x = round(cx + r * math.cos(math.radians(a)))
                y = round(cy + r * math.sin(math.radians(a)))
                if 0 <= x < c.w and 0 <= y < c.h and c.px[y][x] is None:
                    c.px[y][x] = cols[k]
        return c


# ── Aquilo que Vigia (chefe final 64×64 → 128×128) ───────────────────────

class Aquilo(Monster):
    mid, stem, act, kind, size, style = 'aquiloQueVigia', 'aquilo-que-vigia', 'VI', 'boss', (128, 128), 'float'
    glow = {'iris', 'spark', 'vein'}

    def pal(self):
        return {'flesh': [(16, 8, 24), (34, 16, 50), (56, 30, 80), (84, 50, 112), (118, 80, 148)],
                'tent': [(20, 10, 30), (40, 20, 56), (62, 36, 84), (92, 60, 116)],
                'vein': [(76, 22, 60), (122, 34, 82), (176, 60, 120)],
                'sclera': [(150, 136, 118), (196, 186, 166), (226, 220, 204), (250, 248, 238)],
                'iris': [(30, 56, 30), (58, 96, 44), (96, 138, 58), (146, 182, 80), (204, 226, 132)],
                'lid': [(44, 22, 58), (70, 40, 90), (100, 66, 124)], 'pupil': [(4, 3, 6)],
                'blood': [(150, 50, 60), (196, 80, 84)], 'spark': [(150, 120, 190), (230, 214, 250)],
                'small': [(196, 186, 166), (232, 226, 210)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t = P.bob, P.t
        ph2 = P.mode == 'phase2'
        look = [0, 1, 0, -1][t] if P.atk is None else (0, 1, 2, 1)[P.atk]
        openy = 1.0
        if P.atk == 0:
            openy = 0.55
        elif P.atk == 2:
            openy = 1.12
        if P.hurt:
            openy = 0.35
        reach = (0, 4, 8, 2)[P.atk] if P.atk is not None else 0
        cx, cy = 64, 54 + b

        def tentacles(p):
            for k in range(7):
                base_x = 28 + k * 12
                path, radii = [], []
                for j in range(36):
                    jj = j / 35
                    y = 86 + j
                    x = base_x + math.sin(jj * 7.5 + k + t * 0.9) * (2 + jj * 6) + reach * jj * (k / 6)
                    path.append((x, y)); radii.append(5.4 - jj * 4.2)
                best = {}
                for (x, y), r in zip(path, radii):
                    for yy in range(int(y - r - 1), int(y + r + 2)):
                        for xx in range(int(x - r - 1), int(x + r + 2)):
                            d2 = (xx - x) ** 2 + (yy - y) ** 2
                            if d2 <= r * r + 0.3:
                                kk = (xx - x) / max(0.6, r)
                                if (xx, yy) not in best or abs(kk) < abs(best[(xx, yy)]):
                                    best[(xx, yy)] = kk
                tn = K['tent']
                for (x, y), kk in best.items():
                    i = idx(-kk * 0.8 + 0.1, len(tn))
                    p.p(x, y, tn[i])
                for j in range(4, 34, 5):                                          # ventosas
                    x, y = path[j]
                    p.p(round(x + radii[j] * 0.3), round(y), K['tent'][3])
                    p.p(round(x + radii[j] * 0.3), round(y) + 1, K['tent'][0])
                x, y = path[-1]
                p.p(round(x), round(y), K['spark'][0] if not ph2 else K['vein'][2])

        def orb(p):
            pts = E(cx, cy, 46, 40)
            sphere(p, pts, K['flesh'], cx, cy, 46, 40)
            fl = K['flesh']
            for (x, y) in pts:                                                     # carne enrugada
                n = noise(x, y, 171, 5)
                if 0.47 < n < 0.53:
                    p.p(x, y, dk(p.g(x, y), 0.72))
            for (x, y) in pts:                                                     # brilho úmido
                d = ((x - cx + 20) / 9) ** 2 + ((y - cy + 25) / 4) ** 2
                if d < 1:
                    p.p(x, y, fl[4] if d < 0.45 else mix(fl[3], fl[4], 0.5))
            vn = K['vein']
            for k in range(9):                                                     # veias pulsando
                ang = k / 9 * math.tau + 0.4
                x, y = cx + math.cos(ang) * 22, cy + math.sin(ang) * 19
                for j in range(14):
                    x += math.cos(ang + math.sin(j * 0.8 + k) * 0.6) * 1.2
                    y += math.sin(ang + math.sin(j * 0.8 + k) * 0.6) * 1.2
                    if p.g(round(x), round(y)) is not None:
                        p.p(round(x), round(y), vn[(j + t + k) % 3 if j % 4 == 0 else 0])
            smalls = [(26, 52), (100, 56), (48, 82), (84, 28), (38, 30), (90, 80)]
            if ph2:
                smalls += [(30, 70), (104, 40), (66, 88)]
            for i, (x, y) in enumerate(smalls):                                    # olhos menores
                blink = (t + i) % 4 == 3 and not ph2
                y += b
                if blink:
                    p.hl(x - 3, y, 7, K['lid'][0]); p.hl(x - 3, y - 1, 7, K['lid'][2])
                    continue
                for (xx, yy) in E(x, y, 3.4, 2.2):
                    p.p(xx, yy, K['small'][1] if yy < y else K['small'][0])
                p.rect(x - 1 + (look if i % 2 else -look) // 2, y - 1, 2, 3, K['pupil'][0])
                p.hl(x - 3, y - 3, 7, K['lid'][2]); p.hl(x - 3, y + 3, 7, K['lid'][0])
            if ph2:
                marks(p, P, 172, count=9, area=(24, 20, 104, 90))

        def eye(p):
            ry = 16 * openy
            sc = E(cx, cy - 2, 24, max(2.0, ry))
            for (x, y) in sc:
                d = ((x - cx) / 24) ** 2 + ((y - cy + 2) / max(2.0, ry)) ** 2
                i = 3 if d < 0.25 and y < cy else (2 if d < 0.55 else (1 if d < 0.85 else 0))
                p.p(x, y, K['sclera'][i])
            bl = K['blood']
            for k in range(6 if not ph2 else 14):                                  # vasinhos no branco
                ang = k / (6 if not ph2 else 14) * math.tau + 0.2
                x, y = cx + math.cos(ang) * 22, cy - 2 + math.sin(ang) * ry * 0.9
                for j in range(5 + k % 3):
                    x -= math.cos(ang) * 1.1; y -= math.sin(ang) * 0.6 + (0.5 if j % 2 else -0.5)
                    if (round(x), round(y)) in set(sc):
                        p.p(round(x), round(y), bl[j % 2])
            ix = cx + look * 4
            ir_r = min(12, max(2.0, ry * 0.85))
            iris = [q for q in E(ix, cy - 2, 12, ir_r) if q in set(sc)]
            irs = K['iris']
            for (x, y) in iris:
                d = math.hypot(x - ix, (y - cy + 2) * 12 / max(1, ir_r)) / 12
                a = math.atan2(y - cy + 2, x - ix)
                v = 1 - d + 0.18 * math.sin(a * 9)                                 # estrias do íris
                i = idx(v * 1.6 - 0.6, len(irs))
                p.p(x, y, irs[i])
            pw = 2 if P.atk != 2 else 4
            for y in range(round(cy - 2 - ir_r + 2), round(cy - 2 + ir_r - 1)):
                for x in range(ix - pw // 2, ix + (pw + 1) // 2 + 1):
                    if (x, y) in set(iris):
                        p.p(x, y, K['pupil'][0])
            p.rect(ix - 6, round(cy - 2 - ir_r * 0.5), 2, 2, K['sclera'][3])
            # pálpebras de carne por cima e por baixo
            ld = K['lid']
            for x in range(cx - 28, cx + 29):
                k = (x - cx) / 28
                top = cy - 2 - ry * math.sqrt(max(0.0, 1 - k * k)) - 1
                bot = cy - 2 + ry * math.sqrt(max(0.0, 1 - k * k)) + 1
                for j, col in enumerate((ld[0], ld[1], ld[2])):
                    p.p(x, round(top) - j, col)
                for j, col in enumerate((ld[0], ld[1])):
                    p.p(x, round(bot) + j, col)
            if P.corrupt == 2 and not ph2:
                marks(p, P, 173, count=2, area=(44, cy - 8, 84, cy + 4))

        def sparks(p):
            sp = K['spark']
            for k in range(8):
                ang = k / 8 * math.tau + t * 0.4
                x = round(cx + math.cos(ang) * 56)
                y = round(cy + math.sin(ang) * 48)
                if 0 <= x < 128 and 0 <= y < 128:
                    p.p(x, y, sp[1] if k % 2 else sp[0])
                    if k % 2:
                        p.p(x + 1, y, sp[0]); p.p(x, y + 1, sp[0])

        return [tentacles, orb, eye, (sparks, 'noring')]

    def strike(self, c, d):
        """Golpe: o olho dispara um feixe de faíscas para a frente."""
        x0, y0, x1, y1 = bbox(c)
        cols = [(230, 214, 250), (176, 112, 224), (246, 128, 186)]
        for j in range(0, 22):
            x = 92 + j
            for dy in (-1, 0, 1):
                y = 52 + dy + round(math.sin(j * 0.9) * (j / 10))
                if 0 <= x < c.w and 0 <= y < c.h and (dy == 0 or j % 3 == 0):
                    c.px[y][x] = cols[(j + abs(dy)) % 3]
        return c


MONSTERS = [Sombra(), Lamento(), Arauto(), Aquilo()]
