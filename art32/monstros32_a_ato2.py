"""Ato II (Minas Inundadas) em 32-bit: Mineiro Afogado, Enguia de Breu, Golem de
Ferro-negro e A Couraça Submersa. Desenho à mão no pixel novo, peça a peça."""
from __future__ import annotations

import math

from monstros32_a_base import (AMBER, BRONZE, DROWN, IRON, LEATHER, NOITE, PALE, RUST, SHELL, STEEL, TAR, TEAL,  # noqa: F401
                               WATER_GLOW, WHITE, WOOD, core_burst, ell, hsh, mix, mul, path, polyp, rect, seg,
                               shade, shade_tube, tone, trap)

ALGA = [(26, 52, 36), (40, 76, 46), (62, 104, 58), (96, 136, 74)]
PANTS = [(26, 30, 38), (40, 46, 58), (58, 66, 80), (80, 90, 104), (108, 118, 130)]
SHIRT = [(70, 74, 72), (100, 104, 98), (132, 134, 124), (164, 164, 150)]
IRON_B = [(28, 30, 38), (44, 48, 58), (64, 70, 82), (88, 96, 108), (118, 126, 138), (160, 168, 178)]   # ferro-negro
BARNACLE = [(96, 92, 84), (150, 146, 134), (196, 192, 180), (230, 228, 218)]


def barnacle(c, x, y, r):
    """Craca: cone baixo, borda clara em cima e furo escuro no meio."""
    pts = ell(x + 0.5, y + 0.5, r + 0.3, r * 0.8)
    shade(c, pts, BARNACLE)
    c.p(x, y, BARNACLE[0])
    if r > 1.8:
        c.p(x + 1, y, BARNACLE[0])
        c.p(x, y - 1, BARNACLE[1])


def rivet(c, x, y, ramp):
    c.p(x, y, ramp[-1])
    c.p(x + 1, y + 1, ramp[1])
    c.p(x + 1, y, ramp[-2])


# ── Mineiro Afogado (48×64) ───────────────────────────────────────────────────

def mineiro(K, P):
    t = P.t
    b = P.bob + P.dy
    drip = (t * 3) % 7

    # calças e botas
    lg = K.new()
    for i, x0 in enumerate((16, 26)):
        u = P.lift[i]
        shade(lg, rect(x0, 42, 6, 14 - u), PANTS, kind='cylx')
        lg.vl(x0 + 2, 46, 8 - u, PANTS[1])                        # costura
        lg.p(x0 + 4, 49, PANTS[0])
        boot = rect(x0 - 2, 56 - u, 10, 7) + rect(x0 - 2, 55 - u, 9, 1)
        shade(lg, boot, LEATHER, kind='flat')
        lg.hl(x0 - 2, 55 - u, 9, LEATHER[3])
        lg.hl(x0 - 2, 62 - u, 10, LEATHER[0])
        lg.hl(x0 - 1, 57 - u, 3, LEATHER[4])
    K.add(lg, name='legs')

    # macacão de couro com suspensórios, cinto e algas grudadas
    bd = K.new()
    shade(bd, rect(18, 24, 14, 20), LEATHER, kind='cylx')
    for x in (20, 21, 28, 29):
        bd.vl(x, 24, 14, LEATHER[0] if x in (21, 29) else LEATHER[1])
    bd.p(20, 25, BRONZE[3]); bd.p(28, 25, BRONZE[3])             # botões
    bd.hl(18, 38, 14, WOOD[0]); bd.hl(18, 39, 14, WOOD[1])
    shade(bd, rect(23, 37, 4, 4), BRONZE, kind='flat')
    bd.p(24, 38, NOITE); bd.p(25, 39, BRONZE[0])
    bd.hl(22, 32, 6, LEATHER[1]); bd.vl(22, 32, 3, LEATHER[1])   # bolso
    for (x, y) in ((23, 29), (24, 30), (26, 34), (27, 35), (19, 41), (30, 27)):
        bd.p(x, y, ALGA[1])
        bd.p(x + 1, y, ALGA[2])
    K.add(bd, dy=b, name='body')
    alg = K.new()
    for (x, y0, L_) in ((18, 25, 7), (31, 25, 9), (22, 40, 5)):
        for j in range(L_):
            alg.p(x + (1 if (j + t) % 4 == 2 else 0), y0 + j, ALGA[(j % 3) + (1 if j < 2 else 0)])
    K.add(alg, dy=b)

    # braços: manga da camisa enrolada no cotovelo, antebraço afogado (inchado, azulado)
    ar = K.new()
    shade(ar, trap(26, 32, 13, 17, 13, 17), SHIRT, kind='cylx')
    shade(ar, trap(26, 31, 32, 36, 32, 36), SHIRT, kind='cylx')
    K.add(ar, dy=b, name='sleeves')
    fa = K.new()
    shade(fa, trap(33, 40, 13, 17, 13, 16), DROWN, kind='cylx')
    shade(fa, trap(32, 37, 32, 36, 33, 36), DROWN, kind='cylx')
    shade(fa, ell(14.5, 41.5, 2.6, 2.4), DROWN)
    fa.p(14, 36, DROWN[1]); fa.p(15, 38, DROWN[1])
    K.add(fa, dy=b, name='arms')
    cuff = K.new()
    shade(cuff, rect(12, 32, 6, 2), SHIRT, kind='cyly')
    shade(cuff, rect(31, 31, 6, 2), SHIRT, kind='cyly')
    K.add(cuff, dy=b)

    # picareta no ombro
    pk = K.new()
    shade_tube(pk, [(34, 42), (42.5, 12)], 1.3, 1.2, WOOD)
    head = path([(33, 9), (37, 7.5), (41, 7.5), (44, 9), (47, 13)], 1.6, 0.6)
    shade(pk, head, STEEL, kind='cyly')
    shade(pk, rect(40, 8, 4, 5), IRON, kind='flat')
    for (x, y, k) in ((36, 8, 2), (38, 8, 1), (45, 11, 2), (34, 9, 1)):
        pk.p(x, y, RUST[k])
    pk.p(33, 9, STEEL[4])
    K.add(pk, dy=b, name='pick')
    fist = K.new()
    shade(fist, ell(35.5, 38.5, 2.6, 2.2), DROWN)
    K.add(fist, dy=b)

    # cabeça: rosto afogado, olhos vazios que brilham, boca aberta pingando
    hd = K.new()
    face = [p for p in ell(24.5, 18.5, 6.8, 7.0)] + rect(19, 19, 12, 5)
    shade(hd, face, DROWN, spec=False)
    for (x0, y0) in ((21, 17), (27, 17)):
        hd.fill(rect(x0, y0, 3, 3), (24, 34, 40))
        hd.lit(x0 + 1, y0 + 1, WATER_GLOW[2]); hd.lit(x0, y0 + 1, WATER_GLOW[1], 1); hd.lit(x0 + 1, y0, WATER_GLOW[0], 1)
        hd.hl(x0, y0 + 3, 3, DROWN[1])                           # olheira inchada
    hd.fill(rect(23, 22, 4, 3), (24, 22, 26))
    hd.p(23, 22, DROWN[1]); hd.p(26, 22, DROWN[1])
    hd.lit(24, 24, (40, 60, 66), 1, var=True)
    hd.vl(25, 19, 2, DROWN[1])
    for (x, y) in ((18, 15), (18, 17), (19, 19), (31, 16), (31, 18)):
        hd.p(x, y, (40, 46, 50))                                 # cabelo molhado
    K.add(hd, dy=b, name='head')

    # capacete de couro (casco baixo e aba) com lampião de bronze na frente
    hm = K.new()
    dome = [p for p in ell(24.5, 12.5, 9.0, 5.6) if p[1] <= 12]
    shade(hm, dome, LEATHER)
    shade(hm, rect(14, 12, 22, 2), LEATHER, kind='cyly')
    hm.hl(14, 13, 22, LEATHER[0])
    hm.hl(16, 10, 17, LEATHER[1])                                # costura
    for x in (17, 21, 28, 32):
        hm.p(x, 10, LEATHER[3])
    K.add(hm, dy=b, name='helm')
    lp = K.new()
    shade(lp, rect(21, 5, 7, 6), BRONZE, kind='flat')
    lp.fill(rect(22, 6, 5, 4), (40, 70, 70))
    lp.lit(23, 7, WATER_GLOW[2]); lp.lit(24, 7, WATER_GLOW[2]); lp.lit(23, 8, WATER_GLOW[1], 1); lp.lit(25, 8, WATER_GLOW[1], 1)
    lp.lit(25, 7, WATER_GLOW[1], 1); lp.lit(24, 8, WATER_GLOW[1], 1)
    lp.hl(21, 5, 7, BRONZE[3]); lp.hl(21, 10, 7, BRONZE[1])
    K.add(lp, dy=b)

    # gota pingando do queixo e do braço
    dr = K.new()
    dr.p(30, 26 + drip % 4, WATER_GLOW[0]); dr.p(30, 27 + drip % 4, TEAL[2])
    dr.p(14, 45 + (drip + 2) % 5, WATER_GLOW[0])
    K.add(dr, dy=b, fx=True)


# ── Enguia de Breu (48×48, sobe de uma poça) ─────────────────────────────────

def enguia(K, P):
    t = P.t
    sway = [0, 1, 0, -1][t] * 2
    dx, ldx, dy = P.dx, P.ldx, P.dy
    open_ = 1 if t in (1, 2) else 0

    # poça de piche com reflexo e ondinhas
    pd = K.new()
    pud = ell(24.5, 42.5, 20.5, 4.6)
    shade(pd, pud, [(6, 8, 10), (10, 14, 18), (16, 30, 34), (24, 58, 60), (44, 98, 100)], kind='flat', bias=-0.1)
    for k in range(3):
        x = 8 + ((k * 13 + t * 3) % 30)
        pd.hl(x, 41 + (k % 2), 3, TEAL[3])
    pd.hl(10 + (t % 2) * 2, 44, 4, TEAL[2])
    K.add(pd, dx=ldx, name='puddle')

    # corpo em S, saindo da poça
    pts = []
    for k in range(31):
        f = k / 30
        y = 42 - f * 33
        x = 23.5 + math.sin(f * 9.0 + 0.6) * 7.5 * (1 - f * 0.7) + sway * f
        x += ldx + (dx - ldx) * f
        pts.append((x, y + dy * f))
    bd = K.new()
    body = shade_tube(bd, pts[::2] + [pts[-1]], 5.2, 3.4, TAR)
    # barbatana dorsal (do lado de fora da curva)
    fin = K.new()
    for k in range(3, 27, 2):
        x, y = pts[k]
        x2, _ = pts[k + 1]
        side = 1
        r = 5.2 - 1.8 * k / 30
        for j in range(3 if k % 4 == 1 else 2):
            fin.p(round(x + side * (r + j)), round(y), TEAL[1] if j else TEAL[2])
    K.add(fin)
    # brilho de piche e ventre
    for k in range(2, 28, 2):
        x, y = pts[k]
        r = 5.2 - 1.8 * k / 30
        bd.p(round(x - r * 0.45), round(y), TAR[4])
        bd.p(round(x + r * 0.5), round(y) + 1, TAR[1])            # escamas de piche
    K.add(bd, name='body')

    # cabeça larga, olhos amarelos, presas
    hx, hy = pts[-1][0] + 1, pts[-1][1] - 3
    hd = K.new()
    head = ell(hx, hy, 7.0, 5.0) + ell(hx + 2.5, hy + 2, 6.4, 3.4)
    shade(hd, head, TAR)
    for ex in (-3, 3):
        x, y = round(hx + ex), round(hy - 1)
        hd.fill(rect(x - 1, y - 1, 3, 3), (30, 24, 8))
        hd.lit(x, y, AMBER[2]); hd.lit(x - 1, y, AMBER[1], 1); hd.lit(x, y - 1, AMBER[1], 1)
    my = round(hy + 3) + open_
    hd.hl(round(hx - 4), my, 10, (40, 10, 16))
    if open_:
        hd.hl(round(hx - 3), my - 1, 8, (60, 16, 22))
    for k, x in enumerate(range(round(hx - 4), round(hx + 6), 2)):
        hd.p(x, my - 1 + (0 if k % 2 else 1) - open_, WHITE)
    hd.p(round(hx - 5), round(hy - 4), TAR[4]); hd.p(round(hx - 4), round(hy - 5), TAR[4])
    hd.vl(round(hx + 5), round(hy - 1), 3, TAR[1])               # guelra
    K.add(hd, name='head')


# ── Golem de Ferro-negro (64×80) ─────────────────────────────────────────────

def golem(K, P):
    t = P.t
    b = P.bob + P.dy
    pulse = [WATER_GLOW[0], WATER_GLOW[1], WATER_GLOW[2], WATER_GLOW[1]][t]

    # pernas com joelheira e pé largo
    lg = K.new()
    for i, x0 in enumerate((16, 36)):
        u = P.lift[i]
        shade(lg, rect(x0, 58, 14, 15 - u), IRON_B, kind='cylx')
        lg.hl(x0, 64 - u // 2, 14, IRON_B[0])
        shade(lg, ell(x0 + 7, 64 - u // 2, 6, 3), IRON_B)
        rivet(lg, x0 + 2, 69 - u, IRON_B)
        foot = rect(x0 - 3, 72 - u, 20, 7)
        shade(lg, foot, IRON_B, kind='flat')
        lg.hl(x0 - 3, 72 - u, 20, IRON_B[4])
        lg.hl(x0 - 3, 78 - u, 20, IRON_B[0])
        for k in (5, 10, 15):
            lg.vl(x0 - 3 + k, 75 - u, 3, IRON_B[1])
    K.add(lg, name='legs')

    # braços e punhos grandes, baixos
    ar = K.new()
    for x0 in (2, 50):
        shade(ar, rect(x0, 32, 12, 20), IRON_B, kind='cylx')
        ar.hl(x0, 41, 12, IRON_B[1])
        rivet(ar, x0 + 2, 35, IRON_B); rivet(ar, x0 + 8, 46, IRON_B)
    K.add(ar, dy=b, name='arms')
    fs = K.new()
    for x0 in (0, 48):
        shade(fs, rect(x0, 51, 16, 15), IRON_B)
        for k in range(1, 4):
            fs.vl(x0 + k * 4, 55, 9, IRON_B[1])                  # dedos
        fs.hl(x0, 54, 16, IRON_B[1]); fs.hl(x0 + 1, 52, 13, IRON_B[4])
        for (x, y, kk) in ((x0 + 3, 60, 2), (x0 + 11, 57, 1)):
            fs.p(x, y, RUST[kk])
    K.add(fs, dy=b, name='fists')

    # tronco em barril, placas rebitadas, buraco com o cristal que pulsa, rachaduras
    tr = K.new()
    torso = []
    for y in range(26, 60):
        k = abs(y - 42) / 17
        a = round(12 + k * k * 6)
        z = round(52 - k * k * 6)
        torso += [(x, y) for x in range(a, z + 1)]
    shade(tr, torso, IRON_B)
    for y in (33, 50):
        for x in range(12, 53):
            if tr.g(x, y) is not None:
                tr.p(x, y, IRON_B[1])
                if x % 5 == 2:
                    rivet(tr, x, y - 2, IRON_B)
    for x in (22, 42):
        for y in range(27, 59):
            if tr.g(x, y) is not None and not (33 <= y <= 50):
                tr.p(x, y, IRON_B[1])
    cav = ell(32.5, 41.5, 9.5, 6.5)
    tr.fill(cav, (6, 12, 16))
    for (x, y) in cav:
        if y == 35 or (tr.g(x, y - 1) not in (None, (6, 12, 16)) and y < 41):
            tr.p(x, y, IRON_B[0])
    gem = polyp([(26.5, 42), (29, 37.5), (36, 37.5), (38.5, 42), (36, 46.5), (29, 46.5)])
    for (x, y) in gem:
        u, v = (x - 32.5) / 6, (y - 42) / 4.5
        f = -(u * 0.55 + v * 0.85)
        if y <= 39:
            col, lvl = (WATER_GLOW[1] if u < 0.3 else TEAL[3]), 1     # mesa do cristal
        elif f > 0.35:
            col, lvl = pulse, 2
        elif f > -0.2:
            col, lvl = TEAL[3], 1
        elif f > -0.6:
            col, lvl = TEAL[2], 1
        else:
            col, lvl = TEAL[1], 1
        tr.lit(x, y, col, lvl)
    for x in range(28, 38):
        tr.lit(x, 40, TEAL[2] if x > 33 else TEAL[3], 1)          # aresta
    tr.lit(29, 38, WHITE); tr.lit(30, 38, WATER_GLOW[2], 1)
    for (x, y) in ((32, 41), (33, 43), (31, 44)):
        tr.lit(x, y, TEAL[2], 1)                                 # facetas
    for (pts_, glow) in ((((18, 52), (19, 53), (20, 54), (20, 55), (21, 56)), (20, 54)),
                         (((46, 30), (47, 31), (47, 32), (48, 33)), (47, 31))):
        for (x, y) in pts_:
            tr.p(x, y, NOITE)
        tr.lit(glow[0], glow[1], pulse, 1)
    for (x, y0, L_) in ((40, 51, 7), (16, 36, 5), (49, 40, 6)):
        for j in range(L_):
            tr.p(x, y0 + j, RUST[2] if j < 2 else RUST[1])       # ferrugem escorrendo
    if K.phase2:
        core_burst(tr, 32, 42, K, r=4, arms=6, length=10, seed=11)
    K.add(tr, dy=b, name='torso')

    # cabeça afundada entre os ombros, viseira em fenda
    hd = K.new()
    shade(hd, rect(24, 16, 18, 14), IRON_B)
    hd.hl(24, 16, 18, IRON_B[4])
    hd.fill(rect(26, 22, 14, 2), NOITE)
    for x in range(27, 39):
        hd.lit(x, 22, pulse if 29 <= x <= 36 else TEAL[2], 2 if 30 <= x <= 35 else 1)
    hd.hl(26, 26, 14, IRON_B[1])
    rivet(hd, 25, 18, IRON_B); rivet(hd, 39, 18, IRON_B)
    K.add(hd, dy=b, name='head')

    # ombreiras em cúpula, rebites
    sh = K.new()
    for cx in (12.5, 52.5):
        dome = ell(cx, 27, 11.5, 8.2)
        shade(sh, dome, IRON_B)
        for (x, y) in dome:
            if y == 33:
                sh.p(x, y, IRON_B[1])
        for (x, y) in ((cx - 6, 25), (cx, 22), (cx + 6, 25), (cx - 3, 30), (cx + 4, 30)):
            rivet(sh, round(x), y, IRON_B)
    sh.p(8, 24, RUST[2]); sh.p(55, 29, RUST[1]); sh.p(56, 30, RUST[1])
    K.add(sh, dy=b, name='shoulders')


# ── A Couraça Submersa (chefe 112×96) ─────────────────────────────────────────

def couraca(K, P):
    t = P.t
    b = P.bob + P.dy
    snap = [0, 2, 2, 0][t]
    ph2 = K.phase2
    mid = 56

    # seis pernas articuladas
    lg = K.new()
    for x in (20, 32, 44, 68, 80, 92):
        side = -1 if x < mid else 1
        u = P.lift[0] if x < mid else P.lift[1]
        kx, ky = x + side * 7, 72 - u // 2
        fx_, fy = kx + side * 5, 94 - u
        shade_tube(lg, [(x, 60 + b), (kx, ky)], 2.4, 2.0, SHELL)
        shade_tube(lg, [(kx, ky), (fx_, fy)], 2.0, 0.7, SHELL)
        shade(lg, ell(kx, ky, 2.4, 2.1), IRON_B)
        lg.p(fx_, fy, SHELL[0]); lg.p(fx_, fy - 1, SHELL[1])
    K.add(lg, name='legs')

    # braços e pinças em tesoura (abrem e fecham)
    for side in (-1, 1):
        cx = 16 if side < 0 else 96
        ay = 18 - snap // 2
        arm = K.new()
        shade_tube(arm, [(cx - side * 22, 54), (cx - side * 12, 46), (cx - side * 2, ay + 22)], 3.4, 3.0, SHELL)
        K.add(arm, dy=b)
        cl = K.new()
        palm = ell(cx, ay + 14, 11, 9.5)
        shade(cl, palm, SHELL)
        for (x, y) in palm:
            if hsh(x, y, 61) < 0.05:
                cl.p(x, y, SHELL[0])
        def mx(x):
            return x if side < 0 else 2 * cx - x
        outer = [(mx(x), y) for (x, y) in ((cx - 6, ay + 8), (cx - 8.5, ay), (cx - 6, ay - 7 - snap), (cx - 1, ay - 11 - snap), (cx + 2, ay - 10 - snap))]
        inner = [(mx(x), y) for (x, y) in ((cx + 4, ay + 7), (cx + 6, ay + 1), (cx + 5, ay - 4 + snap), (cx + 3, ay - 6 + snap))]
        po = shade_tube(cl, outer, 4.0, 1.0, SHELL)
        pi = shade_tube(cl, inner, 3.4, 1.0, SHELL)
        for (x, y) in outer[-1:] + inner[-1:]:
            cl.p(round(x), round(y), BARNACLE[2])
        for k in range(1, len(outer) - 1):                       # dentes do lado de dentro
            x, y = outer[k]
            cl.p(round(x + (2 if side < 0 else -2)), round(y), SHELL[4])
        for k in range(1, len(inner) - 1):
            x, y = inner[k]
            cl.p(round(x - (2 if side < 0 else -2)), round(y), SHELL[4])
        for (x, y) in ((cx - side * 4, ay + 18), (cx + side * 3, ay + 11), (cx - side * 6, ay + 13)):
            barnacle(cl, x, y, 1.6)
        for (x, y) in ((cx + side * 5, ay + 19), (cx, ay + 21)):
            cl.p(x, y, RUST[2]); cl.p(x, y + 1, RUST[1])
        K.add(cl, dy=b, name=f'claw{side}')

    # olhos em haste com lanternas
    ey = K.new()
    for ex in (44, 68):
        shade_tube(ey, [(ex, 38), (ex + (1 if ex > mid else -1), 18)], 1.6, 1.4, SHELL)
    K.add(ey, dy=b)
    lan = K.new()
    for ex in (44, 68):
        ex2 = ex + (1 if ex > mid else -1)
        shade(lan, rect(ex2 - 3, 10, 7, 8), BRONZE, kind='flat')
        lan.fill(rect(ex2 - 2, 11, 5, 5), (60, 36, 10))
        for (x, y) in rect(ex2 - 2, 11, 5, 5):
            d = abs(x - ex2) + abs(y - 13)
            lan.lit(x, y, AMBER[2] if d <= 1 else AMBER[1], 2 if d <= 1 else 1)
        lan.lit(ex2 - 1, 12, WHITE)
        lan.hl(ex2 - 3, 9, 7, BRONZE[3]); lan.hl(ex2 - 3, 17, 7, BRONZE[1])
        lan.vl(ex2, 11, 5, BRONZE[1])                             # grade da lanterna
        if ph2 and ex > mid:
            for (x, y) in ((ex2 + 2, 11), (ex2 + 3, 12), (ex2 + 2, 15)):
                lan.p(x, y, NOITE)                                # vidro rachado
    K.add(lan, dy=b)

    # carapaça: placas, junta, rebites, cracas e ferrugem
    sh = K.new()
    shell = ell(56, 50, 34.5, 20.5)
    shade(sh, shell, SHELL, bias=0.05)
    for (x, y) in shell:
        r = hsh(x, y, 71)
        if r < 0.05:
            sh.p(x, y, mul(sh.g(x, y), 0.85))
        elif r > 0.985 and y < 50:
            sh.p(x, y, SHELL[4])
    for x in range(24, 89):                                      # juntas das placas
        y = round(52 + ((x - 56) / 34) ** 2 * 6)
        if sh.g(x, y) is not None:
            sh.p(x, y, SHELL[0]); sh.p(x, y - 1, SHELL[3] if x < 56 else SHELL[2])
    for x0 in (40, 56, 72):
        for y in range(31, 52):
            xx = x0 + round((y - 50) * (x0 - 56) / 60)
            if sh.g(xx, y) is not None:
                sh.p(xx, y, SHELL[0])
    for k in range(9):
        x = 26 + k * 7
        y = round(59 + ((x - 56) / 34) ** 2 * 4)
        if sh.g(x, y) is not None:
            rivet(sh, x, y, [SHELL[0], SHELL[1], SHELL[3], SHELL[4]])
    for (x, y) in ((28, 44), (38, 38), (48, 34), (62, 34), (74, 38), (84, 46), (44, 54), (68, 54), (35, 48)):
        barnacle(sh, x, y, 2.2)
        if hsh(x, y, 3) < 0.6:
            barnacle(sh, x + 4, y + 2, 1.4)
    for (x, y) in ((40, 44), (54, 40), (70, 46), (62, 56), (32, 54)):
        sh.p(x, y, RUST[2]); sh.p(x + 1, y + 1, RUST[1]); sh.p(x + 1, y + 2, RUST[1]); sh.p(x, y + 1, RUST[3])
    under = [(x, y) for (x, y) in shell if y >= 62]
    for (x, y) in under:
        sh.p(x, y, SHELL[0] if y > 63 else TEAL[0])
    for x in range(30, 84, 4):
        if sh.g(x, 65) is not None:
            sh.p(x, 65, TEAL[1])
    if ph2:
        core_burst(sh, 56, 46, K, r=5, arms=6, length=14, seed=17)
        for (x, y) in ell(56, 46, 9, 6):
            if hsh(x, y, 5) < 0.04 and sh.g(x, y) is not None:
                sh.p(x, y, NOITE)
    K.add(sh, dy=b, name='shell')
