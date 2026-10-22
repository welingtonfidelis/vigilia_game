"""Ato IV — Cidade Afogada, em 32-bit: Sacerdote Afogado, Sereia de Lodo, Cavaleiro Salobro e
O Arcebispo Sem Fôlego. Tecido encharcado (escurece da cintura para baixo, brilho molhado nas
dobras, barra de lodo com alga), bronze corroído com verdete e cracas, pele cinza-azulada de
afogado e olhos de luz ciano."""
import math

from monstros32_b_base import (BOB, E, PG, R, T, THICK, Monster, Pose, bay, bbox_pts, cyl, dk, edge_light,  # noqa: F401
                               fill, hsh, marks, mix, mul, noise, rows_of, seg, vol)


def idx(v: float, n: int) -> int:
    return max(0, min(n - 1, int((v + 1) / 2 * n + 0.1)))


# Rampas compartilhadas do ato
LINEN = [(84, 86, 76), (118, 118, 102), (154, 152, 132), (190, 186, 164), (222, 218, 198)]
WETLN = [(40, 56, 58), (60, 80, 78), (86, 108, 100), (116, 138, 124), (150, 168, 152)]
MUD = [(30, 36, 26), (46, 56, 34), (66, 78, 44), (92, 104, 58)]
WEED = [(20, 44, 32), (34, 70, 46), (56, 102, 62), (90, 138, 84)]
DROWN = [(54, 70, 82), (88, 108, 120), (128, 146, 156), (168, 184, 190), (208, 218, 220)]
EYE = [(26, 78, 86), (60, 170, 172), (130, 226, 222), (226, 250, 244)]
MIST = [(70, 120, 122), (110, 168, 166), (158, 208, 202)]
DROP = [(70, 140, 150), (150, 214, 216)]
BRONZE = [(52, 34, 20), (96, 66, 34), (150, 108, 52), (200, 156, 80), (236, 200, 120)]
GOLD = [(88, 60, 26), (150, 112, 52), (204, 162, 78), (244, 212, 124)]
STOLE = [(18, 28, 56), (32, 50, 94), (52, 80, 138), (84, 118, 180)]
VERD = [(24, 70, 70), (40, 112, 104), (74, 160, 138), (130, 200, 172)]
SHELL = [(70, 78, 74), (120, 126, 114), (170, 174, 158), (214, 214, 196)]


def soaked(p, pts, K, top: int, bottom: int, fold: float = 0.33, fold_f: float = 0.85, wet_at: float = 0.42,
           seed: int = 0, dry='ln', wet='wet'):
    """Pano encharcado: dobras verticais, escurece de molhado abaixo de uma linha ondulada
    (com escorridos subindo), brilho molhado nos topos das dobras."""
    rows = rows_of(pts)
    D, Wt = K[dry], K[wet]
    n = len(D)
    for y, xs in rows.items():
        a, z = min(xs), max(xs)
        cx, rx = (a + z) / 2, max(1.0, (z - a) / 2)
        for x in xs:
            nx = (x - cx) / rx
            f = math.sin((x - a) * fold_f + 0.6 + y * 0.03)
            v = -nx * 0.62 + fold * f + 0.08
            i = idx(v, n)
            if x == z and i > 0:
                i -= 1
            wl = top + (bottom - top) * wet_at + 3 * math.sin(x * 0.7 + seed) + 5 * hsh(x // 2, 0, seed + 5)
            if hsh(x, 1, seed + 6) < 0.12:
                wl -= 8 + 6 * hsh(x, 2, seed)                  # escorrido de água subindo no pano
            wet_here = y > wl or (y > wl - 3 and bay(x, y) < (y - (wl - 3)) / 3)
            col = (Wt if wet_here else D)[i]
            if f > 0.82 and nx < 0.4 and hsh(x, y // 3, seed + 8) < 0.35:
                col = (Wt if wet_here else D)[min(n - 1, i + 1)]  # brilho molhado na crista da dobra
            p.p(x, y, col)


def mud_hem(p, K, x0: int, x1: int, ground: int, seed: int, hmin: int = 3, hvar: int = 4):
    """Barra suja de lodo com tufos de alga subindo."""
    for x in range(x0, x1 + 1):
        mh = hmin + int(hsh(x, 1, seed) * hvar)
        for y in range(ground - mh + 1, ground + 1):
            if p.g(x, y) is None:
                continue
            k = (ground - y) / max(1, mh)
            i = 3 if k > 0.75 else (2 if k > 0.45 else (1 if k > 0.15 else 0))
            if (x + y) % 5 == 0:
                i = max(0, i - 1)
            p.p(x, y, K['mud'][i])
        if hsh(x, 3, seed) < 0.22:                             # fio de alga subindo
            hgt = 2 + int(hsh(x, 4, seed) * 5)
            for j in range(hgt):
                y = ground - mh - j + 1
                if p.g(x, y) is not None:
                    p.p(x, y, K['weed'][2] if j < hgt - 1 else K['weed'][3])


# ── Sacerdote Afogado (24×32 → 48×64) ─────────────────────────────────────

class Sacerdote(Monster):
    mid, stem, act, size, style = 'sacerdote', 'sacerdote', 'IV', (48, 64), 'float'
    glow = {'eye', 'mist'}
    G = 60

    def pal(self):
        return {'ln': LINEN, 'wet': WETLN, 'mud': MUD, 'weed': WEED, 'skin': DROWN, 'eye': EYE, 'mist': MIST,
                'drop': DROP, 'brz': BRONZE, 'gold': GOLD, 'blue': STOLE,
                'hair': [(18, 26, 28), (32, 44, 46), (52, 66, 66)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t, G = P.bob, P.t, self.G
        yt = 24 + b
        if P.atk is None:
            sw = [0, 2, 0, -2][t]
            hx, hy, cx, cy = 35, 41 + b, 37 + sw, 53 + b
        else:
            hx, hy, cx, cy = [(37, 32, 41, 26), (39, 37, 44, 42), (40, 34, 44, 33), (36, 40, 40, 50)][P.atk]

        def hair_back(p):
            for x0, s in ((16, -1), (30, 1)):
                for j in range(4):
                    x = x0 + j
                    for y in range(10 + b, 24 + b + int(hsh(x, 0, 3) * 4)):
                        p.p(x + (1 if y > 20 + b and s > 0 else 0), y, K['hair'][(j + y // 3) % 3])

        def robe(p):
            pts = []
            for y in range(yt, G + 1):
                k = (y - yt) / (G - yt)
                a = round(18.5 - k * 5.8)
                z = round(29.5 + k * 6.2)
                inset = (4, 2, 1)[y - yt] if y - yt < 3 else 0
                for x in range(a + inset, z - inset + 1):
                    if y > G - 2 and hsh(x, 0, 31) < 0.45:
                        continue
                    pts.append((x, y))
            soaked(p, pts, K, yt, G, seed=3)
            mud_hem(p, K, 10, 38, G, seed=31)
            # amito (gola) e estola azul com franja de ouro e cruz bordada
            for x in range(20, 30):
                p.p(x, yt + 1, K['ln'][4] if x < 25 else K['ln'][3])
                p.p(x, yt + 2, K['ln'][2])
            for sx in (19, 27):
                for y in range(yt + 1, yt + 27):
                    p.p(sx, y, K['blue'][3]); p.p(sx + 1, y, K['blue'][2]); p.p(sx + 2, y, K['blue'][1])
                for y in (yt + 27, yt + 28):
                    p.p(sx, y, K['gold'][3]); p.p(sx + 1, y, K['gold'][2]); p.p(sx + 2, y, K['gold'][1])
                for x in range(sx, sx + 3):
                    if (x + t) % 2 == 0:
                        p.p(x, yt + 29, K['gold'][1])
                p.vl(sx + 1, yt + 19, 5, K['gold'][3]); p.hl(sx, yt + 20, 3, K['gold'][2])
                p.p(sx + 2, yt + 21, K['gold'][1])
            # cíngulo de corda com nó e ponta pendurada
            for x in range(17, 32):
                p.p(x, yt + 14, K['brz'][3] if (x + yt) % 3 else K['brz'][1])
                p.p(x, yt + 15, K['brz'][2] if (x + yt) % 3 != 1 else K['brz'][0])
            p.rect(22, yt + 13, 3, 3, K['brz'][2]); p.p(22, yt + 13, K['brz'][4]); p.p(24, yt + 15, K['brz'][0])
            for y in range(yt + 16, yt + 25):
                x = 23 + (1 if y > yt + 20 else 0)
                p.p(x, y, K['brz'][2] if y % 2 else K['brz'][1])
            p.rect(23, yt + 25, 3, 2, K['gold'][2]); p.p(23, yt + 25, K['gold'][3])
            marks(p, P, 11, area=(13, yt + 6, 35, G - 6))

        def arm_l(p):
            pts = T(26 + b, 41 + b, 14, 18, 11, 18)
            soaked(p, pts, K, 26 + b, 41 + b, fold=0.2, fold_f=1.2, wet_at=0.55, seed=7)
            for x in range(11, 19):
                p.p(x, 41 + b, K['wet'][1])
            hand = E(14.5, 43.5 + b, 2.4, 2.2)
            vol(p, hand, K['skin'], spec=False)
            for fx in (13, 15):
                p.vl(fx, 45 + b, 2, K['skin'][1])

        def arm_r(p):
            path = seg(33, 28 + b, hx, hy - 3)
            pts = THICK(path, 2.6) + E(hx, hy - 3, 3.2, 2.2)
            soaked(p, pts, K, 26 + b, hy, fold=0.15, fold_f=1.3, wet_at=0.6, seed=9)
            vol(p, E(hx, hy, 2.3, 2.1), K['skin'], spec=False)
            p.p(hx + 1, hy + 2, K['skin'][1])

        def chain(p):
            n = max(abs(cx - hx), abs(cy - 5 - hy)) + 1
            for i in range(n + 1):
                k = i / max(1, n)
                x = round(hx + (cx - hx) * k)
                y = round(hy + 1 + (cy - 5 - hy - 1) * k)
                p.p(x, y, K['gold'][3] if i % 2 else K['gold'][1])

        def censer(p):
            body = E(cx, cy, 3.6, 3.2)
            vol(p, body, K['brz'])
            lid = [q for q in E(cx, cy - 2, 2.6, 2.4) if q[1] <= cy - 2]
            vol(p, lid, K['brz'])
            p.p(cx, cy - 5, K['brz'][3]); p.p(cx, cy - 4, K['brz'][2])
            for x in range(cx - 3, cx + 4):
                p.p(x, cy, K['gold'][3] if x < cx else K['gold'][2])
            g = K['eye']
            for x in (cx - 2, cx, cx + 2):
                p.p(x, cy + 1, g[2] if (x + t) % 2 else g[1])
            p.p(cx, cy + 2, g[3] if t % 2 == 0 else g[2])
            p.hl(cx - 1, cy + 4, 3, K['brz'][0])

        def vapor(p):
            m = K['mist']
            puffs = 5 if P.atk == 2 else 3
            for k in range(puffs):
                y = cy - 7 - k * 4 - (t % 2) * 2
                x = cx + round(math.sin(k * 1.4 + t * 0.9) * 2) + (k if P.atk == 2 else 0)
                if y < 1:
                    continue
                p.p(x, y, m[2 - min(2, k // 2)])
                if k % 2 == 0:
                    p.p(x + 1, y, m[1]); p.p(x, y - 1, m[0])

        def head(p):
            y0 = 10 + b
            pts = []
            for y in range(y0, y0 + 14):
                hw = (5, 6, 6.5, 7, 7, 7, 7, 6.5, 6.5, 6, 5, 4, 3, 2)[y - y0]
                pts += [(x, y) for x in range(round(24.5 - hw), round(24.5 + hw))]
            vol(p, pts, K['skin'], spec=False, bias=0.05)
            sk = K['skin']
            p.hl(20, y0 + 4, 3, sk[1]); p.hl(26, y0 + 4, 3, sk[1])                  # sobrancelha caída
            for ex in (20, 26):
                p.rect(ex, y0 + 5, 3, 3, sk[1])                                     # órbitas fundas
                p.hl(ex, y0 + 6, 3, sk[0])
                if P.hurt:
                    p.hl(ex, y0 + 6, 3, dk(sk[0], 0.7))
                else:
                    p.p(ex + 1, y0 + 6, K['eye'][3] if t % 2 == 0 else K['eye'][2])
                    p.p(ex + 2, y0 + 6, K['eye'][1])
                p.p(ex + (0 if ex < 24 else 2), y0 + 8, sk[1])                     # olheira
            p.vl(24, y0 + 7, 3, sk[3]); p.p(25, y0 + 9, sk[1])                      # nariz
            p.p(19, y0 + 9, sk[1]); p.p(30, y0 + 9, sk[1]); p.p(29, y0 + 10, sk[1])  # bochecha chupada
            if P.hurt:
                p.rect(23, y0 + 11, 3, 2, (18, 26, 30))
            else:
                p.hl(23, y0 + 11, 3, (18, 26, 30)); p.p(24, y0 + 12, (30, 40, 44))
            p.hl(23, y0 + 13, 3, sk[1])
            # cabelo molhado colado nas têmporas, com alga embaraçada
            for x in (17, 18, 31, 32):
                for y in range(y0, y0 + 10 + (x % 3)):
                    p.p(x, y, K['hair'][(x + y) % 3])
            for (x, y) in ((17, y0 + 3), (32, y0 + 6), (18, y0 + 8), (31, y0 + 1)):
                p.p(x, y, K['weed'][3]); p.p(x, y + 1, K['weed'][2])
            for y in range(y0 + 10, y0 + 16):
                p.p(16 + (y % 2), y, K['weed'][1 + (y % 2)])
            # solidéu azul com botão de ouro
            cap = [q for q in E(24.5, y0, 7.6, 6) if q[1] <= y0 - 1]
            vol(p, cap, K['blue'])
            p.hl(18, y0 - 1, 14, K['blue'][1])
            p.rect(24, y0 - 7, 2, 2, K['gold'][2]); p.p(24, y0 - 7, K['gold'][3])
            if P.corrupt == 2:
                marks(p, P, 12, count=1, area=(19, y0 + 1, 30, y0 + 10))

        def drip(p):
            y = 25 + b + (t * 3) % 7
            p.p(22, y, K['drop'][1]); p.p(22, y + 1, K['drop'][0])
            p.p(13, 47 + b + (t * 2) % 6, K['drop'][1])

        return [hair_back, robe, arm_l, chain, censer, arm_r, head, (vapor, 'noring'), (drip, 'noring')]


# ── Sereia de Lodo (24×28 → 48×56) ────────────────────────────────────────

def tube(p, path, radii, ramp, scales=None, belly=None):
    """Corpo em tubo (cauda, tentáculo): disco a disco, sombreado pela normal do disco mais perto;
    escamas em meia-lua opcionais."""
    best: dict = {}
    for (x, y), r in zip(path, radii):
        for yy in range(int(y - r - 1), int(y + r + 2)):
            for xx in range(int(x - r - 1), int(x + r + 2)):
                d2 = (xx - x) ** 2 + (yy - y) ** 2
                if d2 <= r * r + 0.3:
                    k = math.sqrt(d2) / max(0.5, r)
                    cur = best.get((xx, yy))
                    if cur is None or k < cur[0]:
                        best[(xx, yy)] = (k, (xx - x) / max(0.5, r), (yy - y) / max(0.5, r))
    n = len(ramp)
    for (x, y), (k, nx, ny) in best.items():
        v = -(nx * -0.6 + ny * -0.8) * 0.75 + 0.1
        i = idx(v, n)
        if scales and (y % 3 == 0) and ((x + (y // 3) * 2) % 4 == 0) and i > 0:
            i -= 1                                                   # borda da escama
        if scales and (y % 3 == 1) and ((x + (y // 3) * 2) % 4 == 1) and i < n - 1 and k < 0.7:
            i += 1                                                   # brilho da escama
        col = ramp[i]
        if belly and ny > 0.45:
            col = belly[min(len(belly) - 1, max(0, i - 1))]
        p.p(x, y, col)
    return list(best)


class Sereia(Monster):
    mid, stem, act, size, style = 'sereia', 'sereia', 'IV', (48, 56), 'float'
    glow = {'eye'}

    def pal(self):
        return {'skin': [(56, 74, 72), (92, 112, 106), (134, 152, 144), (176, 190, 180), (214, 224, 212)],
                'scale': [(16, 42, 38), (28, 68, 56), (46, 100, 74), (74, 134, 94), (116, 170, 120)],
                'belly': [(70, 96, 76), (108, 134, 104), (150, 172, 138)],
                'fin': [(26, 78, 82), (44, 116, 114), (86, 166, 152), (150, 208, 190)],
                'kelp': [(14, 32, 24), (26, 54, 36), (42, 80, 50), (68, 112, 68), (104, 146, 90)],
                'bone': [(110, 100, 84), (172, 162, 140), (226, 218, 198)],
                'eye': [(112, 132, 126), (196, 212, 204), (246, 250, 240)],
                'pool': [(12, 20, 18), (20, 34, 30), (32, 52, 44), (50, 78, 66), (92, 132, 118)],
                'mud': MUD, 'weed': WEED, 'mouth': [(10, 14, 14), (34, 30, 30)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t = P.bob, P.t
        sway = [0, 2, 0, -2][t]
        if P.atk is None:
            hl_, hr_ = (10, 37 + b + sway // 2), (35, 37 + b - sway // 2)
            el, er = (12, 31 + b), (32, 31 + b)
        else:
            hl_, el, hr_, er = [((13, 18), (11, 24), (33, 17), (35, 23)),
                                ((17, 28), (12, 30), (39, 28), (35, 27)),
                                ((36, 31), (24, 31), (45, 29), (38, 28)),
                                ((12, 35), (12, 30), (39, 35), (34, 30))][P.atk]

        def puddle(p):
            pts = E(24, 50, 22, 4.5)
            pool = K['pool']
            for (x, y) in pts:
                d = math.sqrt(((x - 24) / 22) ** 2 + ((y - 50) / 4.5) ** 2)
                i = 1 if d < 0.55 else 2
                if y < 49 and d > 0.7:
                    i = 3
                ring = (d * 3.2 - t * 0.25) % 1.0
                if 0.3 < d < 0.92 and ring < 0.12:
                    i = min(4, i + 1)
                if d < 0.3:
                    i = 0
                p.p(x, y, pool[i])
            for x in range(3, 46):
                if hsh(x, 0, 51) < 0.3:
                    y = 50 + round(math.sqrt(max(0.0, 1 - ((x - 24) / 22) ** 2)) * 4.5)
                    p.p(x, y, K['mud'][1]); p.p(x, y - 1, K['mud'][2])
            for (x, y) in ((8, 48), (38, 47), (15, 52), (33, 52)):
                p.p(x, y, K['weed'][2]); p.p(x, y - 1, K['weed'][3])
            p.p(6 + (t % 2) * 34, 49, pool[4])

        def tail(p):
            path, radii = [], []
            for j in range(57):
                k = j / 4
                path.append((30 + math.cos(k * 0.45) * 10, 48 - k * 1.0))
                radii.append(4.0 - k * 0.14)
            tube(p, path, radii, K['scale'], scales=True, belly=K['belly'])
            fx, fy = 40, 35
            fin = PG([(fx - 1, fy), (fx + 6, fy - 6 + sway), (fx + 4, fy), (fx + 7, fy + 5 + sway)])
            fill(p, fin, K['fin'][1])
            for (x, y) in fin:
                if (x + y) % 3 == 0:
                    p.p(x, y, K['fin'][2])                                       # raios da nadadeira
            edge_light(p, fin, K['fin'][3], 't')
            marks(p, P, 21, count=P.corrupt * 2, area=(14, 34, 44, 50))

        def strands(p, y0, x0s, ymin, lens, out=1.0, front=False):
            """Mechas de alga: fio a fio, ondulando, com folhinhas mais claras."""
            kel = K['kelp']
            for j, x0 in enumerate(x0s):
                side = -1 if x0 < 22 else 1
                ln = lens[j % len(lens)]
                for y in range(ymin, y0 + ln):
                    k = max(0, y - ymin)
                    x = x0 + side * min(3, k * 0.18 * out) + math.sin(y * 0.33 + j * 1.7 + t * 0.8) * 0.9
                    x = round(x)
                    tone = 1 + (j + (1 if front else 0)) % 3
                    if (y + j * 3) % 6 == 0:
                        tone = min(4, tone + 1)
                        p.p(x + side, y, kel[tone])                       # folhinha
                    p.p(x, y, kel[tone] if (y + j) % 7 else kel[0])

        def hair_back(p):
            y0 = 14 + b
            strands(p, y0, (13, 14, 15, 16, 28, 29, 30, 31), y0 - 4, (24, 27, 22, 26), out=1.2)

        def body(p):
            torso = E(22, 30 + b, 6.2, 9) + E(22, 25.5 + b, 7.2, 2.5)
            vol(p, torso, K['skin'], spec=False)
            sc = K['scale']
            waist = T(36 + b, 47, 17, 27, 15, 30)
            for (x, y) in waist:
                if y < 39 + b and p.g(x, y) is not None and bay(x, y) > (y - 35 - b) / 4:
                    continue
                rows = [xx for (xx, yy) in waist if yy == y]
                a, z = min(rows), max(rows)
                k = (x - (a + z) / 2) / max(1, (z - a) / 2)
                i = idx(-k * 0.7 + 0.15, len(sc))
                if (y % 3 == 0) and ((x + (y // 3) * 2) % 4 == 0):
                    i = max(0, i - 1)
                elif (y % 3 == 1) and ((x + (y // 3) * 2) % 4 == 1):
                    i = min(len(sc) - 1, i + 1)
                p.p(x, y, sc[i])
            sk = K['skin']
            p.hl(17, 24 + b, 4, sk[3]); p.hl(24, 24 + b, 4, sk[3])                   # clavículas
            for j, ry in enumerate((28, 31, 34)):                                     # costelas em arco
                for side in (-1, 1):
                    for k in range(1, 6 - j):
                        x = 22 + side * (1 + k)
                        y = ry + b + round(k * k * 0.12)
                        p.p(x, y, sk[1])
                        if k > 1:
                            p.p(x, y + 1, sk[3])
            p.p(22, 27 + b, sk[3]); p.p(22, 36 + b, sk[0])
            marks(p, P, 22, count=P.corrupt, area=(17, 28 + b, 27, 44))

        def arms(p):
            for (sx, sy), (ex, ey), (hx, hy) in (((16, 25 + b), el, hl_), ((28, 25 + b), er, hr_)):
                pts = THICK(seg(sx, sy, ex, ey), 1.4) + THICK(seg(ex, ey, hx, hy), 1.1)
                vol(p, pts, K['skin'], spec=False)
                p.p(ex, ey, K['skin'][1])                                         # cotovelo ossudo
                vol(p, E(hx, hy, 1.6, 1.4), K['skin'], spec=False)
                fwd = P.atk in (1, 2)
                for k in range(3):                                                # garras de osso, longas
                    if fwd:
                        x, y = hx + 2, hy - 2 + k * 2
                        for j in range(4):
                            p.p(x + j, y + (1 if j == 3 else 0), K['bone'][2 if j < 2 else 1])
                    else:
                        x, y = hx - 2 + k * 2, hy + 2
                        curl = 1 if hx < 22 else -1
                        for j in range(4):
                            p.p(x + (curl if j == 3 else 0), y + j, K['bone'][2 if j < 2 else 1])

        def head(p):
            y0 = 14 + b
            hd = E(22, y0, 5.6, 7) + T(y0 + 4, y0 + 9, 18, 26, 21, 23)
            vol(p, hd, K['skin'], spec=False, bias=0.05)
            sk = K['skin']
            for ex in (18, 24):
                p.hl(ex, y0 - 1, 3, sk[1])
                if P.hurt:
                    p.hl(ex, y0 + 1, 3, sk[0])
                else:
                    p.hl(ex, y0, 3, K['eye'][1]); p.p(ex + 1, y0, K['eye'][2])
                    p.hl(ex, y0 + 1, 3, sk[1])
            p.p(22, y0 + 3, sk[1]); p.p(21, y0 + 4, sk[0]); p.p(23, y0 + 4, sk[0])   # nariz de afogado
            mh = 3 if (P.hurt or P.atk == 2) else 2
            p.rect(21, y0 + 6, 3, mh, K['mouth'][0])
            p.p(21, y0 + 6, K['bone'][2]); p.p(23, y0 + 6, K['bone'][2])            # dentinhos
            p.hl(21, y0 + 6 + mh, 3, sk[1])
            # couro cabeludo de alga, repartido no meio, e mechas na frente dos ombros
            cap = [q for q in E(22, y0 - 2, 6.6, 5) if q[1] <= y0 - 3]
            for (x, y) in cap:
                p.p(x, y, K['kelp'][2 if (x + (1 if x < 22 else 0)) % 2 else 3])
            p.vl(22, y0 - 7, 4, K['kelp'][1])
            strands(p, y0, (15, 16, 17, 27, 28, 29), y0 - 4, (14, 17, 12), out=0.6, front=True)

        return [puddle, tail, hair_back, body, arms, head]


# ── Cavaleiro Salobro (32×40 → 64×80) ─────────────────────────────────────

def corrode(p, pts, K, seed: int, amount: float = 0.3, streaks: bool = True):
    """Bronze corroído: verdete junta nas partes escuras (reentrâncias), escorre em fios e deixa
    pites; o lado aceso fica quase limpo."""
    s = set(pts)
    v = K['verd']
    for (x, y) in pts:
        cur = p.g(x, y)
        if cur is None:
            continue
        lum = sum(cur) / 3
        n = noise(x, y, seed, 2.6) * 0.75 + hsh(x, y, seed + 4) * 0.25
        if n > 1 - amount * (1.5 - lum / 200):
            i = 0 if lum < 80 else (1 if lum < 130 else 2)
            p.p(x, y, v[i])
        elif hsh(x, y, seed + 1) < 0.03:
            p.p(x, y, dk(cur, 0.62))                                   # pite
    if streaks:
        for (x, y) in pts:
            if hsh(x, 0, seed + 2) < 0.08 and hsh(x, y // 11, seed + 3) < 0.12:
                for j in range(3 + int(hsh(x, y, seed) * 5)):
                    if (x, y + j) in s:
                        p.p(x, y + j, v[0] if j % 2 else v[1])


def barnacle(p, x, y, K, glow=None):
    """Craca: cone de concha com furo escuro (3×3)."""
    sh = K['shell']
    for (dx, dy, i) in ((-1, 0, 2), (1, 0, 1), (0, -1, 3), (0, 1, 0), (-1, -1, 2), (1, 1, 0), (1, -1, 2), (-1, 1, 1)):
        p.p(x + dx, y + dy, sh[i])
    p.p(x, y, glow or (12, 30, 34))


class Cavaleiro(Monster):
    mid, stem, act, size, style = 'cavaleiroSalobro', 'cavaleiro-salobro', 'IV', (64, 80), 'legs'
    glow = {'eye'}
    lift = 4
    G = 78

    def pal(self):
        return {'brz': [(42, 30, 20), (78, 54, 32), (118, 84, 46), (160, 120, 62), (200, 162, 92)],
                'verd': VERD, 'shell': SHELL, 'weed': WEED, 'eye': EYE, 'gold': GOLD,
                'steel': [(38, 46, 48), (66, 78, 78), (104, 116, 112), (148, 158, 150), (196, 204, 192)],
                'enamel': [(12, 36, 40), (22, 58, 62), (34, 84, 84), (56, 114, 106)],
                'lea': [(42, 28, 20), (72, 48, 30), (104, 72, 44)], 'noite': [(8, 12, 14), (20, 30, 32)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t, G = P.bob, P.t, self.G
        ll, lr = P.lift
        sw = P.swing
        if P.atk is None:
            gx, gy, tx, ty = 55, 53 + b + sw, 55, 12 + b + sw
        else:
            gx, gy, tx, ty = [(52, 42, 46, 2), (56, 46, 61, 6), (56, 48, 63, 10), (55, 51, 56, 10)][P.atk]
        hx, hy = gx, gy + 2

        def legs(p):
            for x0, lift, seed in ((20, ll, 1), (36, lr, 2)):
                thigh = R(x0, 54, 12, 11)
                vol(p, thigh, K['brz'], bias=-0.1)
                shin = R(x0 + 1, 66 - lift, 10, 7)
                vol(p, shin, K['brz'])
                p.vl(x0 + 3, 67 - lift, 5, K['brz'][4])
                knee = E(x0 + 5.5, 65 - lift, 5.5, 3)
                vol(p, knee, K['brz'])
                p.p(x0 + 5, 65 - lift, K['brz'][4])
                foot = [q for q in R(x0 - 2, 72 - lift, 16, 6)] + E(x0 + 12, 75 - lift, 3, 2.5)
                vol(p, foot, K['brz'], spec=False)
                p.hl(x0 - 2, 77 - lift, 16, K['brz'][0])
                p.hl(x0 - 1, 74 - lift, 14, K['brz'][1])
                corrode(p, thigh + shin, K, 40 + seed, 0.16)
                if lift == 0 and seed == 1:
                    barnacle(p, x0 + 7, 58, K)

        def sword(p):
            blade = THICK(seg(gx, gy, tx, ty), 1.4)
            dx, dy = tx - gx, ty - gy
            ln = math.hypot(dx, dy) or 1
            nx, ny = -dy / ln, dx / ln
            st = K['steel']
            for (x, y) in blade:
                side = (x - gx) * nx + (y - gy) * ny
                p.p(x, y, st[3] if side < -0.6 else (st[1] if side > 0.6 else st[2]))
            for k in range(0, int(ln) - 4):
                x = round(gx + dx * k / ln); y = round(gy + dy * k / ln)
                if k > 3:
                    p.p(x, y, st[1] if k % 9 else st[0])                  # sulco da lâmina
                if hsh(k, 0, 33) < 0.12:
                    p.p(x + round(nx), y + round(ny), K['verd'][1])        # salitre
            p.p(tx, ty, st[4])
            guard = THICK(seg(gx - nx * 5, gy - ny * 5, gx + nx * 5, gy + ny * 5), 1.0)
            vol(p, guard, K['brz'])
            grip = THICK(seg(gx, gy, gx - dx / ln * 6, gy - dy / ln * 6), 1.0)
            for j, (x, y) in enumerate(grip):
                p.p(x, y, K['lea'][(x + y) % 3])
            px_, py_ = gx - dx / ln * 7.5, gy - dy / ln * 7.5
            vol(p, E(px_, py_, 1.8, 1.8), K['brz'])

        def arm(p):
            path = seg(47, 32 + b, 51, 44 + b) + seg(51, 44 + b, hx, hy)
            pts = THICK(path, 3.6)
            vol(p, pts, K['brz'])
            vol(p, E(51, 44 + b, 4, 3), K['brz'])
            corrode(p, pts, K, 44, 0.16, streaks=False)
            vol(p, E(hx, hy, 3.6, 3.2), K['brz'], spec=False)
            p.hl(hx - 2, hy - 1, 4, K['brz'][1])

        def body(p):
            torso = PG([(19, 26 + b), (46, 26 + b), (44, 48 + b), (21, 48 + b)])
            vol(p, torso, K['brz'], bias=0.05)
            br = K['brz']
            for y in range(27 + b, 47 + b):                                      # quilha do peitoral
                p.p(32, y, br[4] if y < 38 + b else br[3]); p.p(33, y, br[1])
            for y in range(28 + b, 40 + b):
                p.p(20 + (y - 28 - b) // 6, y, br[3])
            p.hl(21, 40 + b, 23, br[0]); p.hl(21, 41 + b, 23, br[2])               # borda do plastrão
            faulds = T(48 + b, 57, 20, 45, 18, 47)
            vol(p, faulds, K['brz'], bias=-0.05)
            for k, y in enumerate((48 + b, 51 + b, 54 + b)):                          # lâminas da saia
                p.hl(19, y, 28, br[0]); p.hl(19, y + 1, 28, br[3] if k else br[2])
                for x in (22, 32, 43):
                    p.p(x, y + 2, br[4]); p.p(x + 1, y + 2, br[1])                    # rebites
            gor = R(26, 24 + b, 14, 3)
            vol(p, gor, K['brz'], spec=False)
            corrode(p, torso + faulds, K, 45, 0.16)
            for (x, y) in ((40, 30), (24, 42), (36, 45), (27, 33)):
                barnacle(p, x, y + b, K)
            for (x, y) in ((22, 32), (42, 36)):
                p.p(x, y + b, K['verd'][2]); p.p(x + 1, y + b, K['verd'][1]); p.p(x, y + 1 + b, K['verd'][1])
            marks(p, P, 46, area=(21, 28 + b, 44, 54))

        def pauldron(p):
            pts = E(47, 29 + b, 6.5, 4.5)
            vol(p, pts, K['brz'])
            for (x, y) in pts:
                if y == 31 + b:
                    p.p(x, y, K['brz'][1])
            corrode(p, pts, K, 47, 0.16, streaks=False)
            barnacle(p, 49, 28 + b, K)

        def head(p):
            y0 = 8 + b
            helm = R(24, y0 + 3, 18, 17) + [q for q in E(33, y0 + 4, 9, 5) if q[1] <= y0 + 3]
            vol(p, helm, K['brz'], bias=0.05)
            br = K['brz']
            for y in range(y0, y0 + 9):
                p.p(32, y, br[4]); p.p(33, y, br[1])                                  # crista do elmo
            p.rect(26, y0 + 8, 14, 2, K['noite'][0])                                 # viseira
            p.hl(26, y0 + 10, 14, br[1])
            p.hl(26, y0 + 7, 14, br[3])
            if not P.hurt:
                for ex in (28, 36):
                    p.p(ex, y0 + 8, K['eye'][3] if t % 2 == 0 else K['eye'][2]); p.p(ex + 1, y0 + 8, K['eye'][2])
                    p.p(ex, y0 + 9, K['eye'][1])
            for (x, y) in ((35, 13), (37, 13), (39, 13), (36, 15), (38, 15), (35, 17), (37, 17)):
                p.p(x, y0 + y - 1, K['noite'][1])                                      # respiros
            for x in range(25, 41, 3):
                p.p(x, y0 + 19, br[4])                                                # rebites do aro
            corrode(p, helm, K, 48, 0.16)
            barnacle(p, 27, y0 + 14, K)
            # alga presa no elmo, pendurada dos dois lados
            for x0, ln in ((25, 8), (26, 12), (27, 6), (40, 14), (41, 18), (42, 10)):
                for j in range(ln):
                    x = x0 + (1 if (j // 3) % 2 and x0 > 33 else 0) - (1 if (j // 4) % 2 and x0 < 33 else 0)
                    p.p(x, y0 + 1 + j, K['weed'][1 + (j + x0) % 3])
            for x in range(28, 37):
                if hsh(x, 0, 49) < 0.6:
                    p.p(x, y0 - 1 + (x % 2), K['weed'][2])
            if P.corrupt == 2:
                marks(p, P, 49, count=1, area=(25, y0 + 11, 40, y0 + 18))

        def shield(p):
            y0 = 28 + b
            pts = [q for q in R(4, y0, 20, 40) if not ((q[0] in (4, 23)) and q[1] in (y0, y0 + 39))]
            vol(p, pts, K['brz'], bias=0.1)
            en = K['enamel']
            field = R(7, y0 + 3, 14, 34)
            for (x, y) in field:
                k = (x - 7) / 13 + (y - y0) / 60
                p.p(x, y, en[3] if k < 0.35 else (en[2] if k < 0.8 else (en[1] if k < 1.3 else en[0])))
            gd = K['gold']
            for y in range(y0 + 4, y0 + 36):
                p.p(13, y, gd[3]); p.p(14, y, gd[2]); p.p(15, y, gd[1])
            for x in range(8, 20):
                p.p(x, y0 + 15, gd[3]); p.p(x, y0 + 16, gd[2]); p.p(x, y0 + 17, gd[1])
            p.p(13, y0 + 15, gd[3])
            for y in range(y0 + 2, y0 + 38, 5):
                p.p(5, y, K['brz'][4]); p.p(22, y, K['brz'][2])                     # rebites do aro
            corrode(p, pts, K, 50, 0.16)
            for (x, y) in ((6, 30), (18, 6), (10, 25), (16, 33), (19, 27)):
                barnacle(p, x, y0 + y, K)
            for x in range(5, 23):                                                  # alga pingando da borda
                if hsh(x, 0, 52) < 0.35:
                    for j in range(2 + int(hsh(x, 1, 52) * 4)):
                        p.p(x, y0 + 38 + j - 1, K['weed'][1 + j % 2])
            marks(p, P, 51, area=(6, y0 + 4, 21, y0 + 34))

        return [legs, sword, arm, body, pauldron, head, shield]


# ── O Arcebispo Sem Fôlego (chefe 48×60 → 96×120) ────────────────────────

def gold_cross(p, x, y, K, s: int = 1):
    """Cruz bordada a ouro (braços de 2 px, luz na esquerda)."""
    g = K['gold']
    for j in range(-4 * s, 5 * s):
        p.p(x, y + j, g[3]); p.p(x + 1, y + j, g[1])
    for j in range(-3 * s, 4 * s):
        p.p(x + j, y - 1 * s, g[3] if j < 1 else g[2]); p.p(x + j, y, g[1])
    p.p(x, y - 1 * s, g[3])


class Arcebispo(Monster):
    mid, stem, act, kind, size, style = 'arcebispo', 'arcebispo', 'IV', 'boss', (96, 120), 'float'
    glow = {'eye', 'core'}
    G = 118

    def pal(self):
        return {'cope': [(10, 16, 36), (20, 34, 68), (34, 56, 104), (56, 86, 142), (92, 124, 180)],
                'copew': [(8, 20, 30), (16, 38, 52), (28, 60, 76), (46, 88, 104), (76, 120, 132)],
                'ln': LINEN, 'wet': WETLN, 'gold': GOLD, 'skin': DROWN, 'eye': EYE, 'mud': MUD, 'weed': WEED,
                'shell': SHELL, 'drop': DROP, 'core': [(26, 78, 86), (60, 170, 172), (150, 236, 230), (240, 252, 246)],
                'coral': [(96, 40, 40), (150, 70, 62), (214, 112, 92)], 'mouth': [(8, 14, 18), (24, 34, 40)],
                'gem': [(30, 90, 96), (80, 206, 206), (200, 250, 244)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t, G = P.bob, P.t, self.G
        ph2 = P.mode == 'phase2'
        if P.atk is None:
            sb, st = (77, 116), (77, 28 + b)
        else:
            sb, st = [((73, 108), (68, 16)), ((78, 110), (83, 20)), ((76, 106), (86, 30)), ((77, 114), (80, 26))][P.atk]
        ang = math.atan2(st[0] - sb[0], sb[1] - st[1])           # inclinação do báculo
        grip = (round(sb[0] + (st[0] - sb[0]) * 0.55), round(sb[1] + (st[1] - sb[1]) * 0.55))

        def rot(dx, dy):
            c, s = math.cos(ang), math.sin(ang)
            return st[0] + dx * c - dy * s, st[1] + dx * s + dy * c

        def lappets(p):
            for x0 in (37, 56):
                pts = R(x0, 22 + b, 4, 30)
                cyl(p, pts, K['ln'], spec=False)
                p.hl(x0, 51 + b, 4, K['gold'][2]); p.hl(x0, 52 + b, 4, K['gold'][1])

        def cope(p):
            yt = 44 + b
            pts = []
            for y in range(yt, G + 1):
                k = (y - yt) / (G - yt)
                a = round(27 - k * 19)
                z = round(69 + k * 19)
                ins = max(0, 6 - (y - yt) * 2)
                for x in range(a + ins, z - ins + 1):
                    if y > G - 2 and hsh(x // 2, 0, 61) < 0.35:
                        continue
                    pts.append((x, y))
            soaked(p, pts, K, yt, G, fold=0.3, fold_f=0.42, wet_at=0.55, seed=13, dry='cope', wet='copew')
            mud_hem(p, K, 6, 90, G, seed=62, hmin=4, hvar=6)
            g = K['gold']
            for y in range(yt + 4, G - 3):                                        # orfrei da abertura
                for x0 in (40, 54):
                    p.p(x0, y, g[3]); p.p(x0 + 1, y, g[2]); p.p(x0 + 2, y, g[1])
                    if (y // 4) % 2 == 0:
                        p.p(x0 + 1, y, g[3])
            for x in range(8, 89):                                               # barra dourada
                y = G - 6 - (1 if x % 7 == 0 else 0)
                if p.g(x, y) is not None:
                    p.p(x, y, g[2]); p.p(x, y + 1, g[1])
            for (x, y) in ((28, 72), (68, 72), (20, 100), (76, 100), (32, 92), (64, 92)):
                gold_cross(p, x, y + b // 2, K)
            for x in range(10, 88, 5):                                            # alga presa na barra
                if hsh(x, 1, 63) < 0.5:
                    for j in range(3 + int(hsh(x, 2, 63) * 6)):
                        p.p(x + (j // 3) % 2, G - 7 - j, K['weed'][1 + j % 3])
            if ph2:
                for (x, y) in ((24, 84), (70, 80), (16, 106), (80, 108), (60, 104)):
                    for (dx, dy, i) in ((0, 0, 2), (1, 0, 1), (0, -1, 2), (-1, -1, 1), (1, -2, 2), (0, -3, 2), (2, -3, 1)):
                        p.p(x + dx, y + dy, K['coral'][i])                       # coral brotando
                marks(p, P, 64, count=6, area=(14, 60, 84, 108))

        def alb(p):
            pts = R(43, 50 + b, 11, G - 50 - b - 4)
            soaked(p, pts, K, 50 + b, G - 4, fold=0.2, fold_f=1.1, wet_at=0.5, seed=17)
            for y in (60, 72, 84, 96):
                p.hl(43, y + b, 11, K['gold'][2]); p.hl(43, y + b + 1, 11, K['gold'][1])
                p.p(48, y + b, K['gem'][1])

        def arm_l(p):
            pts = E(30, 61 + b, 8.5, 12)
            soaked(p, pts, K, 49 + b, 73 + b, fold=0.25, fold_f=0.7, wet_at=0.7, seed=19, dry='cope', wet='copew')
            for y in range(66 + b, 73 + b):
                p.p(22 + (y - 66 - b) // 3, y, K['gold'][2])
            vol(p, E(29, 75 + b, 4, 3.5), K['skin'], spec=False)
            for fx in (27, 29, 31):
                p.vl(fx, 77 + b, 3, K['skin'][1 if fx < 31 else 0])

        def crozier(p):
            staff = THICK(seg(sb[0], sb[1], st[0], st[1]), 1.1)
            g = K['gold']
            for (x, y) in staff:
                d = (x - sb[0]) * math.cos(ang) + (y - sb[1]) * math.sin(ang)
                p.p(x, y, g[3] if d < -0.4 else (g[1] if d > 0.5 else g[2]))
            for k in range(5, 80, 13):                                            # nós do báculo
                x = sb[0] + (st[0] - sb[0]) * k / 88; y = sb[1] + (st[1] - sb[1]) * k / 88
                vol(p, E(x, y, 2.2, 1.6), g)
            path = []
            for j in range(40):
                a = j / 39 * math.pi * 1.55
                r = 1 - j / 39 * 0.45
                path.append(rot(7 - math.cos(a) * 7 * r, -6 - math.sin(a) * 9 * r))
            pts = THICK([rot(0, 0), rot(0, -4)] + path, 1.5)
            vol(p, pts, g)
            ex, ey = path[-1]
            vol(p, E(ex, ey, 2, 2), K['gem'])
            for j, (dx, dy) in enumerate(((-1, 6), (-2, 8), (-2, 10), (-1, 12), (-2, 14), (-1, 16))):  # alga pendurada
                x, y = rot(dx, dy)
                p.p(x, y, K['weed'][1 + j % 3])
            corr = K['shell']
            x, y = rot(1, 20)
            p.p(x, y, corr[2]); p.p(x, y + 1, corr[1])

        def arm_r(p):
            gx, gy = grip
            pts = E(66, 61 + b, 8.5, 12) + THICK(seg(66, 62 + b, gx - 2, gy), 4)
            soaked(p, pts, K, 49 + b, 76, fold=0.25, fold_f=0.7, wet_at=0.7, seed=23, dry='cope', wet='copew')
            vol(p, E(gx, gy, 3.5, 3.5), K['skin'], spec=False)
            p.vl(gx + 1, gy - 2, 4, K['skin'][1])

        def head(p):
            y0 = 25 + b
            face = E(48, y0 + 11, 10, 11.5)
            vol(p, face, K['skin'], spec=False, bias=0.05)
            sk = K['skin']
            for ex in (41, 51):
                p.hl(ex, y0 + 8, 5, sk[1])
                p.rect(ex, y0 + 9, 5, 4, sk[0])
                p.rect(ex + 1, y0 + 10, 3, 2, K['mouth'][0])
                if not P.hurt:
                    p.p(ex + 1, y0 + 10, K['eye'][3] if t % 2 == 0 else K['eye'][2])
                    p.p(ex + 2, y0 + 10, K['eye'][2]); p.p(ex + 1, y0 + 11, K['eye'][1])
                    if ph2:
                        p.p(ex + 2, y0 + 11, K['eye'][3])
                p.hl(ex, y0 + 14, 5, sk[1])
            p.vl(48, y0 + 12, 5, sk[3]); p.vl(49, y0 + 13, 4, sk[1]); p.hl(47, y0 + 17, 3, sk[0])
            mo = (3, 4, 4, 3)[t] + (2 if P.hurt or P.atk == 2 else 0)            # boca sem fôlego, arfando
            p.rect(45, y0 + 19, 7, mo, K['mouth'][0])
            p.hl(45, y0 + 19, 7, K['mouth'][1])
            if ph2:
                p.hl(46, y0 + 20, 5, K['core'][2]); p.p(48, y0 + 21, K['core'][3])
            p.p(40, y0 + 18, sk[1]); p.p(57, y0 + 18, sk[1])
            barnacle(p, 56, y0 + 16, K)
            # mitra alta: faixas de linho, orfrei de ouro com pedras, base dourada
            for y in range(0, 24):
                hw = max(0, round(12 * math.cos(y / 24 * math.pi / 2)))
                yy = y0 - 1 - y
                for x in range(48 - hw, 49 + hw):
                    k = (x - 48) / max(1, hw)
                    i = 4 if k < -0.6 else (3 if k < 0.1 else (2 if k < 0.6 else 1))
                    if y % 6 == 5:
                        i = max(0, i - 1)
                    p.p(x, yy, K['ln'][i])
            g = K['gold']
            for y in range(y0 - 23, y0):
                p.p(47, y, g[3]); p.p(48, y, g[2]); p.p(49, y, g[1])
            for x in range(38, 59):
                p.p(x, y0 - 12, g[3] if x < 48 else g[2]); p.p(x, y0 - 11, g[1])
            for x in range(36, 61):
                p.p(x, y0 - 1, g[2]); p.p(x, y0, g[3] if x < 48 else g[1]); p.p(x, y0 + 1, g[1])
            for (x, y) in ((48, y0 - 12), (48, y0 - 19), (42, y0), (54, y0)):
                p.p(x, y, K['gem'][2]); p.p(x + 1, y, K['gem'][1])
            if ph2:                                                               # mitra rachada
                x = 52
                for y in range(y0 - 18, y0 - 1):
                    p.p(x, y, K['mouth'][0])
                    x += 1 if y % 3 == 0 else 0
            if P.corrupt == 2:
                marks(p, P, 66, count=2, area=(40, y0 + 4, 56, y0 + 20))

        def morse(p):
            cx, cy = 48, 53 + b
            if ph2:
                vol(p, E(cx, cy, 6, 6), K['gold'])
                core = E(cx, cy, 4, 4)
                for (x, y) in core:
                    d = math.hypot(x - cx, y - cy)
                    p.p(x, y, K['core'][3] if d < 1.3 else (K['core'][2] if d < 2.6 else K['core'][1]))
                for (sx, sy) in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
                    for j in range(5, 12):
                        x, y = cx + sx * j, cy + sy * (j // 2 + 1)
                        p.p(x, y, K['core'][1] if j % 3 else K['core'][2])
            else:
                vol(p, E(cx, cy, 5.5, 5), K['gold'])
                vol(p, E(cx, cy, 2.5, 2.5), K['gem'])
                p.p(cx - 1, cy - 1, K['gem'][2])

        def drips(p):
            for k, x in enumerate((16, 34, 62, 84)):
                y = G - 10 - ((t * 3 + k * 5) % 10)
                p.p(x, y, K['drop'][1]); p.p(x, y + 1, K['drop'][0])
            p.p(46, 51 + b + (t * 2) % 5, K['drop'][1])

        return [lappets, cope, alb, arm_l, crozier, arm_r, head, morse, (drips, 'noring')]


MONSTERS = [Sacerdote(), Sereia(), Cavaleiro(), Arcebispo()]
