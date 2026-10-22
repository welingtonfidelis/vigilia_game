"""Ato V — Forja Abissal, em 32-bit: Ferreiro Cinzento, Cão de Brasa, Escravo da Forja e
O Martelo Que Não Dorme. Pele de cinza com fendas em brasa, couro chamuscado com furos acesos,
ferro preto rebitado com a cor do calor perto do fogo, metal derretido e fumaça."""
import math

from monstros32_b_base import (BOB, E, PG, R, T, THICK, Monster, Pose, bay, bbox_pts, cyl, dk, edge_light,  # noqa: F401
                               fill, hsh, marks, mix, mul, noise, rows_of, seg, vol)

ASH = [(30, 28, 30), (52, 50, 52), (80, 78, 80), (114, 110, 108), (154, 148, 142)]
CHAR = [(12, 10, 12), (26, 22, 24), (44, 38, 38), (68, 60, 58), (96, 86, 82)]
IRON = [(14, 14, 18), (28, 28, 34), (48, 48, 56), (76, 76, 86), (114, 114, 124)]
EMBER = [(120, 28, 16), (196, 58, 26), (242, 120, 30), (255, 206, 110), (255, 240, 200)]
LEATH = [(28, 18, 14), (50, 32, 22), (80, 52, 32), (112, 76, 46), (144, 104, 64)]
WOODV = [(30, 20, 14), (56, 38, 24), (88, 60, 36), (118, 84, 50)]
SMOKE = [(46, 42, 44), (72, 68, 70), (104, 100, 100)]
SKINF = [(56, 30, 20), (96, 58, 38), (136, 88, 58), (172, 122, 84), (204, 156, 112)]


def idx(v: float, n: int) -> int:
    return max(0, min(n - 1, int((v + 1) / 2 * n + 0.1)))


def cracks(p, pts, K, seed: int, n: int, t: int = 0, length: int = 7, key: str = 'ember'):
    """Fendas em brasa (do desenho base): zigue-zague com miolo aceso e beira queimada.
    O miolo pulsa com t."""
    s = set(pts)
    if not s:
        return
    x0, y0, x1, y1 = bbox_pts(pts)
    g = K[key]
    placed = 0
    for i in range(80):
        if placed >= n:
            break
        x = x0 + 2 + int(hsh(i, 0, seed) * max(1, x1 - x0 - 3))
        y = y0 + 2 + int(hsh(i, 1, seed) * max(1, y1 - y0 - 3))
        if not all((x + dx, y + dy) in s for dx in (-2, 2) for dy in (-2, 2)):
            continue
        placed += 1
        path = []
        for j in range(length):
            path.append((x, y))
            y += 1 if hsh(i, j, seed + 3) < 0.7 else 0
            x += 1 if hsh(i, j, seed + 4) > 0.55 else -1
        for j, (x, y) in enumerate(path):
            if (x, y) not in s:
                continue
            hot = (j + t + i) % 4 == 0
            p.p(x, y, g[3] if hot else (g[2] if j % 2 else g[1]))
            if (x + 1, y) in s and (x + 1, y) not in path:
                p.p(x + 1, y, dk(p.g(x + 1, y) or g[0], 0.55))


def flake(p, pts, col, seed: int, dens: float = 0.06):
    """Lascas de cinza clara na pele (só no lado aceso)."""
    for (x, y) in pts:
        cur = p.g(x, y)
        if cur and sum(cur) > 230 and hsh(x, y, seed) < dens:
            p.p(x, y, col)


def flame(p, cx, base, h, w, t, seed, K, key='fire', lean: float = 0.0):
    """Labareda: base larga, ponta que balança (e deita com `lean`); miolo claro."""
    g = K[key]
    for y in range(int(base - h), int(base) + 1):
        k = (base - y) / max(1, h)
        hw = w * math.sin(min(1.0, (1 - k) * 1.5) * math.pi / 2) * (1 - k * 0.55)
        sway = math.sin(k * 3 + t * 1.7 + seed) * 1.6 * k - lean * k * k
        for x in range(round(cx - hw + sway), round(cx + hw + sway) + 1):
            d = abs(x - cx - sway) / max(1.0, hw)
            p.p(x, y, g[3] if (d < 0.35 and k < 0.6) else (g[2] if d < 0.7 else (g[1] if k < 0.85 else g[0])))


# ── Ferreiro Cinzento (32×40 → 64×80) ─────────────────────────────────────

class Ferreiro(Monster):
    mid, stem, act, size, style = 'ferreiroCinzento', 'ferreiro-cinzento', 'V', (64, 80), 'legs'
    glow = {'ember'}
    lift = 4

    def pal(self):
        return {'ash': ASH, 'ember': EMBER, 'lea': LEATH, 'iron': IRON, 'wood': WOODV, 'char': CHAR,
                'pants': [(18, 16, 18), (30, 28, 30), (46, 42, 44), (64, 60, 62)],
                'soot': [(10, 8, 10), (22, 20, 22), (36, 32, 34)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t = P.bob, P.t
        ll, lr = P.lift
        if P.atk is None:
            hx, hy, mx, my = 53, 44 + b, 40, 8 + b
        else:
            hx, hy, mx, my = [(50, 34, 33, 6), (54, 32, 52, 7), (55, 44, 57, 66), (54, 42, 50, 28)][P.atk]

        def legs(p):
            for x0, lift in ((19, ll), (35, lr)):
                thigh = R(x0, 54, 11, 12)
                vol(p, thigh, K['pants'], spec=False)
                shin = R(x0, 64 - lift, 11, 9)
                vol(p, shin, K['pants'], spec=False)
                p.rect(x0 + 2, 63 - lift, 6, 4, K['lea'][2]); p.hl(x0 + 2, 63 - lift, 6, K['lea'][3])   # joelheira
                boot = R(x0 - 2, 71 - lift, 15, 7) + E(x0 + 12, 75 - lift, 2.5, 2.5)
                vol(p, boot, K['lea'], spec=False)
                p.hl(x0 - 2, 77 - lift, 15, K['lea'][0]); p.hl(x0 - 2, 71 - lift, 15, K['lea'][3])
                p.hl(x0 - 1, 73 - lift, 13, K['lea'][1])
                for x in range(x0, x0 + 11, 3):
                    p.p(x, 72 - lift, K['iron'][4])

        def arm_l(p):
            pts = E(10, 41 + b, 7, 14)
            vol(p, pts, K['ash'])
            cracks(p, pts, K, 81, 2, t, 6)
            flake(p, pts, K['ash'][4], 82)
            fist = E(10, 56 + b, 6, 4.5)
            vol(p, fist, K['ash'], spec=False)
            for fx in (7, 10, 13):
                p.vl(fx, 55 + b, 3, K['ash'][1])
            p.hl(5, 51 + b, 11, K['lea'][1]); p.hl(5, 52 + b, 11, K['lea'][2])         # bracelete de couro

        def body(p):
            torso = E(32, 40 + b, 18, 17.5)
            vol(p, torso, K['ash'], bias=0.05)
            a = K['ash']
            p.hl(22, 31 + b, 8, a[1]); p.hl(34, 31 + b, 8, a[1])                          # peitoral
            cracks(p, torso, K, 83, 3, t, 8)
            flake(p, torso, a[4], 84)
            marks(p, P, 85, area=(18, 26 + b, 46, 40 + b))
            # avental de couro chamuscado, com alças e furos de queimadura acesos
            ap = T(38 + b, 61, 20, 44, 18, 46)
            lea = K['lea']
            for (x, y) in ap:
                k = (x - 32) / 13
                i = idx(-k * 0.55 + 0.1 + 0.25 * math.sin((x - 18) * 0.5), len(lea))
                p.p(x, y, lea[i])
            p.hl(20, 38 + b, 25, lea[0]); p.hl(20, 39 + b, 25, lea[3])
            for x in range(18, 47):                                                     # barra queimada
                if hsh(x, 0, 86) < 0.5:
                    p.p(x, 61, lea[0]); p.p(x, 60, K['char'][2])
            for (x, y) in ((26, 46), (37, 52), (30, 57), (41, 44)):
                p.rect(x, y + (b if y < 50 else 0), 2, 2, K['soot'][0])
                for (dx, dy) in ((-1, 0), (2, 0), (0, -1), (1, 2)):
                    p.p(x + dx, y + dy + (b if y < 50 else 0), K['ember'][1 + (t + x) % 2])
            for x0 in (21, 41):                                                         # alças
                for y in range(26 + b, 39 + b):
                    x = x0 + (y - 26 - b) // 5 * (1 if x0 < 30 else -1)
                    p.p(x, y, lea[2]); p.p(x + 1, y, lea[1])
                p.rect(x0, 37 + b, 3, 3, K['iron'][3]); p.p(x0, 37 + b, K['iron'][4])
            marks(p, P, 87, area=(20, 42, 44, 58))

        def hammer(p):
            dx, dy = mx - hx, my - hy
            ln = math.hypot(dx, dy) or 1
            ux, uy = dx / ln, dy / ln
            nx, ny = -uy, ux
            handle = THICK(seg(hx - ux * 4, hy - uy * 4, mx - ux * 5, my - uy * 5), 1.3)
            w = K['wood']
            for (x, y) in handle:
                s = (x - hx) * nx + (y - hy) * ny
                p.p(x, y, w[3] if s < -0.5 else (w[1] if s > 0.6 else w[2]))
            for k in (0.45, 0.62):
                x, y = hx + dx * k, hy + dy * k
                p.p(round(x), round(y), K['iron'][3]); p.p(round(x + nx), round(y + ny), K['iron'][2])
            corners = [(mx + nx * sx * 11 + ux * sy * 6, my + ny * sx * 11 + uy * sy * 6) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            head = PG(corners)
            vol(p, head, K['iron'])
            ir = K['iron']
            for (x, y) in head:
                s = (x - mx) * nx + (y - my) * ny
                u = (x - mx) * ux + (y - my) * uy
                if s > 8.5:                                                          # face quente da ponta
                    p.p(x, y, K['ember'][2] if s > 9.5 else K['ember'][1])
                elif s > 7:
                    p.p(x, y, mix(ir[2], K['ember'][0], 0.6))
                elif abs(u) < 0.6:
                    p.p(x, y, ir[1])
                elif abs(s) < 0.6:
                    p.p(x, y, ir[3])
            ex, ey = mx + nx * 10, my + ny * 10
            p.p(round(ex), round(ey), K['ember'][4 if t % 2 == 0 else 3])

        def arm_r(p):
            path = seg(52, 30 + b, 57, 38 + b) + seg(57, 38 + b, hx + 1, hy)
            pts = THICK(path, 5) + E(52, 31 + b, 7, 6)
            vol(p, pts, K['ash'])
            cracks(p, pts, K, 88, 2, t, 6)
            flake(p, pts, K['ash'][4], 89)
            vol(p, E(hx, hy, 4.5, 4), K['ash'], spec=False)
            p.hl(hx - 3, hy - 4, 7, K['lea'][1]); p.hl(hx - 3, hy - 5, 7, K['lea'][2])

        def head(p):
            y0 = 11 + b
            hd = E(32, y0 + 9, 9, 9.5)
            vol(p, hd, K['ash'], bias=0.05)
            a = K['ash']
            p.hl(25, y0 + 6, 6, a[1]); p.hl(34, y0 + 6, 6, a[1])                          # sobrolho pesado
            for ex in (27, 35):
                p.rect(ex, y0 + 8, 3, 2, K['soot'][0])
                if not P.hurt:
                    p.p(ex, y0 + 8, K['ember'][4 if t % 2 == 0 else 3]); p.p(ex + 1, y0 + 8, K['ember'][2])
                    p.p(ex + 1, y0 + 9, K['ember'][1])
            p.vl(32, y0 + 9, 4, a[3]); p.p(33, y0 + 12, a[1])
            cracks(p, [q for q in hd if q[1] < y0 + 7], K, 90, 1, t, 4)
            # barba de fuligem em tranças grossas, boca acesa por dentro
            beard = [q for q in E(32, y0 + 17, 9, 7) if q[1] >= y0 + 13]
            for (x, y) in beard:
                i = 2 if (x + y // 2) % 4 == 0 else (1 if (x // 2) % 2 else 0)
                p.p(x, y, K['soot'][i])
            for x0 in (28, 35):
                for y in range(y0 + 20, y0 + 26):
                    p.p(x0 + (y % 2), y, K['soot'][1 + (y % 2)])
                p.rect(x0, y0 + 26, 2, 2, K['iron'][3])
            p.hl(29, y0 + 14, 6, K['soot'][0])
            p.hl(30, y0 + 15, 4, K['ember'][1] if not P.hurt else K['soot'][0])
            p.hl(31, y0 + 15, 2, K['ember'][2] if not P.hurt else K['soot'][0])
            if P.corrupt == 2:
                marks(p, P, 91, count=1, area=(25, y0 + 1, 39, y0 + 7))

        return [legs, arm_l, body, hammer, arm_r, head]


# ── Cão de Brasa (24×18 → 48×36), virado para a direita ───────────────────

def coal(p, pts, K, seed: int, bias: float = 0.0):
    """Carvão: facetas com tom próprio, luz de cima-esquerda, quinas claras de cinza."""
    pts = list(pts)
    if not pts:
        return
    x0, y0, x1, y1 = bbox_pts(pts)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = max(1, (x1 - x0) / 2), max(1, (y1 - y0) / 2)
    ch = K['coal']
    n = len(ch)
    for (x, y) in pts:
        nx, ny = (x - cx) / rx, (y - cy) / ry
        fx, fy = (x + (y // 3) % 2 * 2) // 4, y // 3
        v = -(nx * -0.6 + ny * -0.8) * 0.6 + bias + (hsh(fx, fy, seed) - 0.5) * 0.7
        i = idx(v, n)
        if (x + (y // 3) % 2 * 2) % 4 == 0 and i > 0:
            i -= 1                                                        # aresta da faceta
        p.p(x, y, ch[i])


class Cao(Monster):
    mid, stem, act, size, style = 'caoBrasa', 'cao-brasa', 'V', (48, 36), 'legs'
    glow = {'ember', 'fire'}
    lift = 3
    G = 34

    def pal(self):
        return {'coal': [(10, 8, 10), (22, 18, 20), (38, 32, 32), (58, 50, 48), (84, 74, 70)],
                'ember': EMBER, 'fire': [(150, 40, 20), (230, 96, 30), (255, 170, 60), (255, 236, 170)],
                'bone': [(150, 130, 110), (214, 200, 176)], 'mouth': [(30, 6, 4), (90, 14, 8)]}

    def layers(self, P: Pose, K: dict) -> list:
        b = [0, 1, 1, 0][P.t] if P.run is None else [0, 1, 0, 1][P.run]
        t, G = P.t, self.G
        back, front = P.lift
        if P.atk is None:
            hdx, hdy, jaw = 0, 0, 1
        else:
            hdx, hdy, jaw = [(-2, 2, 1), (1, 0, 2), (2, 1, 4), (0, 0, 1)][P.atk]
        if P.hurt:
            jaw = 3

        def legs(p):
            ch = K['coal']
            for (x, lift, kind, shade_) in ((12, back, 'back', 1), (31, front, 'front', 1), (17, back, 'back', 0), (36, front, 'front', 0)):
                top = 22 + b
                if kind == 'back':
                    pts = THICK(seg(x, top, x - 2, top + 6 - lift) + seg(x - 2, top + 6 - lift, x + 1, G - 2 - lift), 1.5)
                else:
                    pts = THICK(seg(x, top, x + 1, G - 2 - lift), 1.4)
                for (px_, py_) in pts:
                    p.p(px_, py_, ch[1 + shade_] if px_ < x else ch[shade_])
                fx = x + 1 if kind == 'back' else x + 1
                p.rect(fx - 1, G - 1 - lift, 4, 2, ch[0 + shade_])
                p.p(fx + 2, G - lift, K['bone'][0])
                if (x + t) % 3 == 0:
                    p.p(x, top + 4, K['ember'][2])

        def tail(p):
            for k in range(14):
                kk = k / 13
                x = 8 - kk * 5 + math.sin(kk * 3 + t * 1.3) * 1.5
                y = 17 + b - kk * 12
                r = 2.4 - kk * 1.6
                for yy in range(int(y - r), int(y + r) + 1):
                    for xx in range(int(x - r), int(x + r) + 1):
                        if (xx - x) ** 2 + (yy - y) ** 2 <= r * r + 0.3:
                            p.p(xx, yy, K['fire'][min(3, int(kk * 3) + (1 if (xx + t) % 3 == 0 else 0))] if kk > 0.25
                                else K['coal'][2])

        def body(p):
            pts = E(29, 20 + b, 7.5, 6.8) + E(16, 19 + b, 9, 5.2) + E(22, 19 + b, 8, 5.5)
            pts = list(set(pts))
            coal(p, pts, K, 101)
            cracks(p, pts, K, 102, 4, t, 6)
            marks(p, P, 103, area=(12, 15 + b, 34, 24 + b))

        def mane(p):
            lean = 3 if P.run is not None else 1.5
            for k, x in enumerate((15, 20, 25, 30, 34)):
                h = (6, 9, 8, 11, 8)[k] + ((k + t) % 3) - 1
                base = 16 + b - (1 if x > 26 else 0)
                flame(p, x, base, h, 2.6 if k % 2 else 2.0, t + k, k * 1.3, K, lean=lean)

        def head(p):
            ox, oy = 37 + hdx, 15 + b + hdy
            skull = E(ox, oy, 5.5, 5)
            snout = PG([(ox + 1, oy - 2), (ox + 9, oy + 1), (ox + 9, oy + 3), (ox + 1, oy + 4)])
            ear = PG([(ox - 5, oy - 2), (ox - 3, oy - 11), (ox + 1, oy - 3)])
            coal(p, list(set(skull + snout)), K, 104, bias=0.15)
            coal(p, ear, K, 105, bias=0.3)
            p.p(ox - 3, oy - 7, K['ember'][1]); p.p(ox - 3, oy - 6, K['ember'][2]); p.p(ox - 2, oy - 5, K['ember'][1])
            # mandíbula de baixo abre conforme o golpe; boca acesa por dentro
            jw = PG([(ox, oy + 3), (ox + 8, oy + 3 + jaw), (ox + 8, oy + 5 + jaw), (ox, oy + 6)])
            coal(p, jw, K, 106, bias=-0.2)
            for x in range(ox + 1, ox + 9):
                for y in range(oy + 3, oy + 3 + jaw):
                    top = y == oy + 3
                    p.p(x, y, K['ember'][2] if top else (K['ember'][3] if (x + t) % 4 == 0 else K['mouth'][1]))
            for x in (ox + 3, ox + 6):
                p.p(x, oy + 3, K['bone'][1]); p.p(x, oy + 4, K['bone'][0] if jaw > 1 else K['bone'][1])   # presas
            p.p(ox + 7, oy + 2 + jaw, K['bone'][1])
            if P.hurt:
                p.hl(ox, oy - 1, 3, K['coal'][0])
            else:
                p.p(ox, oy - 1, K['ember'][4 if t % 2 == 0 else 3]); p.p(ox + 1, oy - 1, K['ember'][3])
                p.p(ox, oy, K['ember'][1]); p.p(ox + 1, oy, K['ember'][2])
            p.rect(ox + 8, oy, 2, 2, K['coal'][0])                              # focinho
            p.hl(ox - 2, oy + 5, 3, K['ember'][1])

        return [tail, legs, body, mane, head]


# ── Escravo da Forja (24×32 → 48×64) ──────────────────────────────────────

def chain_links(p, x0, y0, x1, y1, K, key='iron'):
    """Corrente: elos alternando de frente (aro claro) e de lado (traço escuro)."""
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    ir = K[key]
    for i in range(n + 1):
        k = i / max(1, n)
        x, y = round(x0 + (x1 - x0) * k), round(y0 + (y1 - y0) * k)
        p.p(x, y, ir[4] if i % 3 == 0 else (ir[2] if i % 3 == 1 else ir[1]))


class Escravo(Monster):
    mid, stem, act, size, style = 'escravoForja', 'escravo-forja', 'V', (48, 64), 'legs'
    glow = {'ember', 'hot'}
    lift = 3
    G = 60

    def pal(self):
        return {'skin': [(42, 24, 16), (74, 44, 30), (108, 70, 46), (144, 100, 68), (180, 134, 94)],
                'soot': [(30, 22, 20), (48, 36, 30)], 'ember': EMBER, 'iron': IRON, 'rag': [(40, 30, 24), (66, 50, 38), (96, 76, 56), (124, 100, 74)],
                'hot': [(150, 40, 20), (230, 96, 30), (255, 170, 60), (255, 236, 170)], 'scar': [(70, 34, 24), (112, 60, 42)],
                'mouth': [(20, 8, 6)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t, G = P.bob, P.t, self.G
        ll, lr = P.lift
        sw = P.swing
        if P.atk is None:
            hx, hy, bx, by = 36, 39 + b + sw, 42, 22 + b + sw
        else:
            hx, hy, bx, by = [(32, 30, 27, 13), (37, 31, 40, 15), (39, 34, 45, 25), (37, 37, 42, 24)][P.atk]

        def legs(p):
            for x0, lift in ((16, ll), (26, lr)):
                pts = T(44, 56 - lift, x0, x0 + 6, x0 + 1, x0 + 5)
                vol(p, pts, K['skin'], spec=False)
                p.p(x0 + 2, 50 - lift // 2, K['skin'][3])                               # joelho ossudo
                p.hl(x0 + 1, 51 - lift // 2, 4, K['skin'][1])
                foot = R(x0 - 1, 58 - lift, 8, 3)
                vol(p, foot, K['skin'], spec=False)
                p.hl(x0 - 1, 60 - lift, 8, K['skin'][0])
                cuff = R(x0 - 1, 55 - lift, 8, 3)
                vol(p, cuff, K['iron'])
                p.hl(x0 - 1, 55 - lift, 8, K['iron'][4]); p.p(x0 + 3, 56 - lift, K['iron'][1])
            chain_links(p, 23, 57 - ll, 25, 58, K)
            chain_links(p, 25, 58, 26, 57 - lr, K)

        def arm_l(p):
            pts = THICK(seg(16, 28 + b, 12, 35 + b) + seg(12, 35 + b, 10, 42 + b), 1.8)
            vol(p, pts, K['skin'], spec=False)
            vol(p, E(10, 44 + b, 2.6, 2.2), K['skin'], spec=False)
            cuff = R(7, 40 + b, 7, 3)
            vol(p, cuff, K['iron']); p.hl(7, 40 + b, 7, K['iron'][4])
            chain_links(p, 9, 43 + b, 7 + (t % 2), 50 + b, K)                          # corrente partida

        def body(p):
            torso = PG([(15, 27 + b), (33, 27 + b), (31, 34 + b), (29, 42 + b), (19, 42 + b), (17, 34 + b)]) + \
                E(19, 28 + b, 4, 3) + E(29, 28 + b, 4, 3)
            vol(p, torso, K['skin'], spec=False)
            sk = K['skin']
            p.hl(17, 27 + b, 5, sk[3]); p.hl(27, 27 + b, 5, sk[3])                   # ombros ossudos
            for j, ry in enumerate((31, 34, 37)):                                     # costelas à mostra
                p.hl(18 + j, ry + b, 4, sk[1]); p.hl(27, ry + b, 4 - j, sk[1])
                p.hl(18 + j, ry + b + 1, 3, sk[3])
            p.vl(24, 30 + b, 11, sk[1])
            p.hl(21, 41 + b, 7, sk[1])                                                # barriga funda
            for (x, y) in ((19, 29), (27, 38)):                                       # cicatrizes de chicote
                for k in range(5):
                    p.p(x + k, y + b + (k % 2), K['scar'][k % 2])
            for (x, y) in torso:                                                      # fuligem
                if noise(x, y, 114, 3) > 0.72:
                    p.p(x, y, K['soot'][1] if (x + y) % 2 else K['soot'][0])
            # marca de ferro em brasa no peito
            for (dx, dy) in ((0, 0), (1, 0), (2, 0), (1, 1), (1, 2), (0, 2), (2, 2)):
                p.p(26 + dx, 30 + b + dy, K['ember'][1 + (dx + t) % 2])
            rag = T(41 + b, 48, 17, 31, 15, 33)
            r = K['rag']
            for (x, y) in rag:
                k = (x - 24) / 10
                i = idx(-k * 0.5 + 0.2 * math.sin(x * 0.9), len(r))
                p.p(x, y, r[i])
            for x in range(15, 34):
                if hsh(x // 2, 0, 111) < 0.4:
                    p.p(x, 48, None); p.p(x, 47, r[0])
            p.hl(17, 41 + b, 15, r[0]); p.hl(17, 42 + b, 15, K['iron'][2])               # corda de cintura
            marks(p, P, 112, area=(16, 27 + b, 32, 45))

        def ladle(p):
            dx, dy = bx - hx, by - hy
            ln = math.hypot(dx, dy) or 1
            rod = THICK(seg(hx, hy + 2, bx - dx / ln * 3, by - dy / ln * 3), 0.9)
            for (x, y) in rod:
                p.p(x, y, K['iron'][3] if (x + y) % 2 else K['iron'][2])
            bowl = [q for q in E(bx, by, 4.5, 4.2) if q[1] >= by - 1]
            vol(p, bowl, K['iron'])
            p.hl(bx - 4, by + 3, 9, K['iron'][0])
            h = K['hot']
            for x in range(bx - 4, bx + 5):                                            # metal derretido
                p.p(x, by - 1, h[2] if (x + t) % 3 else h[3])
                p.p(x, by, h[1] if (x + t) % 4 else h[2])
            p.p(bx - 1, by - 2, h[3]); p.p(bx + 1, by - 2 - (t % 2), h[2])

        def arm_r(p):
            pts = THICK(seg(32, 28 + b, 35, 33 + b) + seg(35, 33 + b, hx, hy), 1.8)
            vol(p, pts, K['skin'], spec=False)
            vol(p, E(hx, hy, 2.6, 2.4), K['skin'], spec=False)
            cuff = R(hx - 3, hy - 4, 7, 3)
            vol(p, cuff, K['iron']); p.hl(hx - 3, hy - 4, 7, K['iron'][4])

        def head(p):
            y0 = 15 + b
            hd = E(22, y0 + 6, 5.8, 6.4)
            vol(p, hd, K['skin'], spec=False, bias=0.05)
            sk = K['skin']
            p.hl(17, y0 + 4, 4, sk[1]); p.hl(23, y0 + 4, 4, sk[1])
            for ex in (18, 23):
                p.rect(ex, y0 + 5, 3, 2, K['mouth'][0])
                if not P.hurt:
                    p.p(ex + 1, y0 + 5, K['ember'][4 if t % 2 == 0 else 3]); p.p(ex + 2, y0 + 5, K['ember'][2])
            p.vl(22, y0 + 6, 3, sk[3]); p.p(23, y0 + 8, sk[1])
            p.p(18, y0 + 8, sk[1]); p.p(26, y0 + 8, sk[1])
            p.hl(20, y0 + 10, 5, K['mouth'][0]); p.hl(20, y0 + 11, 5, sk[1])
            if P.hurt:
                p.rect(21, y0 + 10, 3, 2, K['mouth'][0])
            for k in range(5):                                                         # cicatriz no crânio
                p.p(23 + k, y0 + 1 + k // 2, K['scar'][1])
            col = R(17, y0 + 12, 11, 3)                                                # coleira de ferro
            vol(p, col, K['iron'])
            p.hl(17, y0 + 12, 11, K['iron'][4])
            for x in (19, 22, 25):
                p.p(x, y0 + 13, K['iron'][1])
            vol(p, E(22, y0 + 16, 1.6, 1.6), K['iron'])
            p.p(22, y0 + 16, K['iron'][0])
            if P.corrupt == 2:
                marks(p, P, 113, count=1, area=(17, y0 + 1, 27, y0 + 9))

        return [legs, arm_l, body, ladle, arm_r, head]

    def strike(self, c, d):
        """Golpe: um arco de gotas de metal derretido na frente."""
        from monstros32_b_base import bbox
        x0, y0, x1, y1 = bbox(c)
        cols = [(255, 236, 170), (255, 170, 60), (230, 96, 30)]
        for k in range(9):
            x = x1 - 6 + k
            y = y0 + 14 + round(((k - 3) / 4) ** 2 * 4)
            if 0 <= x < c.w and 0 <= y < c.h and c.px[y][x] is None:
                c.px[y][x] = cols[k % 3]
        return c


# ── O Martelo Que Não Dorme (chefe 48×56 → 96×112) ────────────────────────

def plate(p, pts, K, rivets=(), seams_y=(), seams_x=(), bias=0.0, key='iron', heat=None):
    """Chapa de ferro rebitada: volume, costuras (linha escura + fio de luz) e rebites.
    `heat` = (cx, cy, raio): perto do fogo o ferro puxa para a cor do calor."""
    vol(p, pts, K[key], bias=bias)
    s = set(pts)
    ir = K[key]
    if heat:
        hx, hy, hr = heat
        for (x, y) in pts:
            d = math.hypot(x - hx, (y - hy) * 1.3)
            c = p.g(x, y)
            if d < hr * 0.62:
                p.p(x, y, mix(c, K['heat'][1], 0.32))
            elif d < hr and bay(x, y) < (1 - d / hr) * 1.2:
                p.p(x, y, mix(c, K['heat'][0], 0.3))
    for y in seams_y:
        for (x, yy) in pts:
            if yy == y:
                p.p(x, y, ir[0])
                if (x, y + 1) in s:
                    p.p(x, y + 1, ir[3])
    for x in seams_x:
        for (xx, y) in pts:
            if xx == x:
                p.p(x, y, ir[0])
                if (x + 1, y) in s:
                    p.p(x + 1, y, ir[3])
    for (x, y) in rivets:
        if (x, y) in s:
            p.p(x, y, ir[4]); p.p(x + 1, y + 1, ir[0]); p.p(x + 1, y, ir[2])


class Martelo(Monster):
    mid, stem, act, kind, size, style = 'martelo', 'martelo', 'V', 'boss', (96, 112), 'legs'
    glow = {'ember', 'fire'}
    lift = 4
    G = 110

    def pal(self):
        return {'iron': IRON, 'ember': EMBER, 'fire': [(120, 28, 16), (196, 58, 26), (242, 120, 30), (255, 206, 110), (255, 244, 214)],
                'heat': [(70, 26, 30), (110, 40, 34)], 'wood': WOODV, 'smoke': SMOKE, 'noite': [(6, 5, 8), (16, 12, 14)]}

    def layers(self, P: Pose, K: dict) -> list:
        b, t, G = P.bob, P.t, self.G
        ll, lr = P.lift
        ph2 = P.mode == 'phase2'
        sw = P.swing
        if P.atk is None:
            gx, gy, mx, my = 86, 62 + b + sw, 85, 19 + b + sw
        else:
            gx, gy, mx, my = [(80, 52, 72, 13), (84, 52, 86, 13), (82, 58, 86, 92), (86, 60, 85, 24)][P.atk]

        def legs(p):
            for x0, lift in ((22, ll), (54, lr)):
                thigh = R(x0, 80, 18, 10)
                plate(p, thigh, K, rivets=((x0 + 3, 82), (x0 + 13, 82)))
                p.hl(x0 + 1, 90, 16, K['noite'][0])
                shin = R(x0 + 1, 91 - lift, 16, 12)
                plate(p, shin, K, rivets=((x0 + 4, 94 - lift), (x0 + 12, 94 - lift)), seams_y=(97 - lift,))
                vol(p, E(x0 + 9, 91 - lift, 5, 3.5), K['iron'])
                foot = R(x0 - 4, 102 - lift, 26, 8) + E(x0 + 21, 106 - lift, 3, 3.6)
                plate(p, foot, K, rivets=((x0, 104 - lift), (x0 + 9, 104 - lift), (x0 + 18, 104 - lift)), bias=-0.05)
                p.hl(x0 - 4, 109 - lift, 26, K['iron'][0])

        def arm_l(p):
            up = R(2, 36 + b, 16, 30)
            plate(p, up, K, rivets=((5, 40 + b), (5, 58 + b), (13, 40 + b)), seams_y=(50 + b,))
            p.hl(2, 65 + b, 16, K['noite'][0])
            fist = R(0, 66 + b, 18, 14)
            plate(p, fist, K, rivets=((3, 68 + b), (9, 68 + b)), seams_y=(72 + b, 76 + b), bias=-0.05)
            for x in range(1, 17, 4):
                p.vl(x, 72 + b, 7, K['iron'][1])                                      # dedos

        def body(p):
            pts = []
            for y in range(32 + b, 81):
                k = (y - 32 - b) / (48 - b)
                a, z = round(14 + k * 10), round(81 - k * 10)
                pts += [(x, y) for x in range(a, z + 1)]
            rv = [(20, 36 + b), (75, 36 + b), (26, 74), (68, 74), (48, 36 + b), (34, 36 + b), (62, 36 + b),
                  (24, 60), (72, 60)]
            plate(p, pts, K, rivets=rv, seams_y=(42 + b,), seams_x=(29, 66), heat=(48, 58 + b, 30))
            ir = K['iron']
            # boca da fornalha: arco, grelha e fogo vivo
            mouth = [q for q in R(30, 48 + b, 36, 22)] + [q for q in E(48, 49 + b, 18, 5) if q[1] < 48 + b]
            fl = K['fire']
            for (x, y) in mouth:
                k = (y - 44 - b) / 26
                n = noise(x, y * 1.4 + t * 6, 121, 3.5) + (0.35 if ph2 else 0.0)
                v = k * 1.15 + n * 0.75 - 0.35
                i = 4 if v > 1.05 else (3 if v > 0.8 else (2 if v > 0.55 else (1 if v > 0.3 else 0)))
                p.p(x, y, fl[i] if v > 0.12 else K['noite'][0])
            for x in range(33, 64, 6):                                                # grelha
                for y in range(44 + b, 70 + b):
                    if p.g(x, y) is not None and (x, y) in set(mouth):
                        p.p(x, y, ir[1]); p.p(x + 1, y, ir[3] if not ph2 else ir[2])
            arch = [q for q in E(48, 49 + b, 20, 7) if q[1] < 47 + b and q not in set(mouth)]
            fill(p, arch, ir[3])
            for (x, y) in arch:
                if (x - 28) % 5 == 0:
                    p.p(x, y, ir[1])                                                  # aduelas do arco
            lip = R(28, 70 + b, 40, 4)
            vol(p, lip, K['iron'])
            p.hl(29, 70 + b, 38, fl[2] if not ph2 else fl[3])                          # brilho do fogo na beira
            if ph2:
                marks(p, P, 122, count=8, area=(16, 36, 80, 78))
            else:
                marks(p, P, 122, area=(16, 36, 80, 78))

        def pauldrons(p):
            for cx in (16, 80):
                dome = E(cx, 34 + b, 14, 9)
                plate(p, dome, K, rivets=((cx - 8, 34 + b), (cx, 28 + b), (cx + 7, 34 + b)))
                for (x, y) in dome:
                    if y == 40 + b:
                        p.p(x, y, K['iron'][0])
                    if y == 41 + b:
                        p.p(x, y, K['iron'][3])

        def hammer(p):
            dx, dy = mx - gx, my - gy
            ln = math.hypot(dx, dy) or 1
            ux, uy = dx / ln, dy / ln
            nx, ny = -uy, ux
            handle = THICK(seg(gx - ux * 34, gy - uy * 34, mx - ux * 10, my - uy * 10), 1.8)
            w = K['wood']
            for (x, y) in handle:
                s = (x - gx) * nx + (y - gy) * ny
                p.p(x, y, w[3] if s < -0.8 else (w[1] if s > 0.8 else w[2]))
            for k in (-26, -14, 14):
                x, y = gx + ux * k, gy + uy * k
                band = THICK([(x - ux, y - uy), (x + ux, y + uy)], 2.2)
                fill(p, band, K['iron'][2])
                p.p(round(x - nx), round(y - ny), K['iron'][4])
            corners = [(mx + nx * sx * 12 + ux * sy * 11, my + ny * sx * 12 + uy * sy * 11)
                       for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            head = PG(corners)
            vol(p, head, K['iron'])
            ir = K['iron']
            for (x, y) in head:
                s = (x - mx) * nx + (y - my) * ny
                u = (x - mx) * ux + (y - my) * uy
                if s > 9.5:
                    p.p(x, y, K['ember'][3] if s > 11 else K['ember'][2])                # face incandescente
                elif s > 7.5:
                    p.p(x, y, mix(ir[2], K['ember'][0], 0.7))
                elif abs(u) > 9.5:
                    p.p(x, y, ir[1] if u > 0 else ir[3])
                elif abs(s) < 0.7 or abs(s + 6) < 0.6:
                    p.p(x, y, ir[1])
            for (sx, sy) in ((-1, -1), (-1, 1)):
                rx, ry = mx + nx * sx * 9 + ux * sy * 8, my + ny * sx * 9 + uy * sy * 8
                p.p(round(rx), round(ry), ir[4]); p.p(round(rx) + 1, round(ry) + 1, ir[0])

        def arm_r(p):
            path = seg(80, 38 + b, 84, 50 + b) + seg(84, 50 + b, gx, gy)
            pts = THICK(path, 6)
            plate(p, pts, K, rivets=((78, 42 + b), (84, 46 + b)))
            fist = E(gx, gy, 7, 6)
            plate(p, fist, K, bias=-0.05)
            p.hl(gx - 6, gy - 1, 13, K['iron'][1]); p.hl(gx - 6, gy + 2, 13, K['iron'][1])

        def head(p):
            y0 = 10 + b
            for x0 in (28, 62):                                                       # chaminés-chifre
                horn = R(x0, y0 - 6, 6, 18)
                plate(p, horn, K, seams_y=(y0,))
                cap = R(x0 - 1, y0 - 8, 8, 3)
                vol(p, cap, K['iron'])
                p.hl(x0, y0 - 8, 6, K['noite'][0] if not ph2 else K['fire'][2])
            box = [q for q in R(34, y0, 28, 22) if not (q[0] in (34, 61) and q[1] in (y0, y0 + 21))]
            plate(p, box, K, rivets=((37, y0 + 3), (57, y0 + 3), (37, y0 + 17), (57, y0 + 17)), seams_x=(47,))
            ir = K['iron']
            p.hl(35, y0 + 7, 26, ir[4]); p.hl(35, y0 + 8, 26, ir[1])                    # testa
            slit = R(38, y0 + 10, 20, 3 if not ph2 else 4)
            fill(p, slit, K['noite'][0])
            if not P.hurt:
                fl = K['fire']
                for x in range(38, 58):
                    p.p(x, y0 + 11, fl[1] if x % 3 else fl[2])
                for ex in (42, 52):
                    p.rect(ex, y0 + 10, 3, 2, fl[3]); p.p(ex + 1, y0 + 10, fl[4] if t % 2 == 0 else fl[3])
            for x in range(38, 58, 3):
                p.vl(x, y0 + 15, 4, ir[1])                                             # grade da boca
            if P.corrupt == 2:
                marks(p, P, 123, count=2, area=(36, y0 + 1, 60, y0 + 20))

        def smoke(p):
            sm = K['smoke'] if not ph2 else K['fire']
            for k, x0 in enumerate((31, 65)):
                for j in range(3):
                    x = x0 + round(math.sin(j * 1.7 + t + k) * 1.5) + j
                    y = 1 - j + (t + k) % 2 + b
                    if 0 <= y:
                        p.p(x, y, sm[min(len(sm) - 1, 2 - j + (1 if ph2 else 0))])
                        p.p(x + 1, y, sm[1])

        return [legs, arm_l, body, pauldrons, hammer, arm_r, head, (smoke, 'noring')]


MONSTERS = [Ferreiro(), Cao(), Escravo(), Martelo()]
