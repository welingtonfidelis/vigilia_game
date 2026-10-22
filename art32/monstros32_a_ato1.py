"""Ato I (Catacumbas) em 32-bit: Esqueleto Rangente, Rato-de-ossuário, Acólito Caído e
O Guardião das Urnas. Desenho à mão no pixel novo, peça a peça (ver monstros32_a_base)."""
from __future__ import annotations

import math

from monstros32_a_base import (AMBER, BONE, BRONZE, CLAY, CLOTH_RED, EMBER, FLESH, FUR, IRON, LEATHER, NOITE, OL,  # noqa: F401
                               PALE, PINK, PURPLE, RED_EYE, RUST, SICK, STEEL, STONE, WOOD, core_burst, ell, hsh,
                               mix, mul, path, polyp, rect, seg, shade, tone, trap)

DARK_IN = (26, 20, 20)          # fundo das cavidades (peito, órbitas)
URN = [(40, 40, 46), (60, 60, 66), (84, 82, 84), (118, 110, 100), (156, 144, 122), (196, 184, 158)]   # barro das urnas


def bone_tube(c, x0, y0, x1, y1, r0, r1=None, ramp=BONE):
    shade(c, seg(x0, y0, x1, y1, r0, r1), ramp, kind='cylx' if abs(x1 - x0) < abs(y1 - y0) else 'cyly')


def rib_band(c, cx, y, hw, droop, ramp=BONE):
    """Uma costela de cada lado, 2 px de espessura, curvando para baixo nas pontas."""
    for s in (-1, 1):
        for i in range(1, hw + 1):
            k = i / hw
            yy = y + round(droop * k * k)
            far = i >= hw - 1
            for q in range(2):
                ti = (3 if q == 0 else 2) - (1 if s > 0 else 0) - (1 if far else 0)
                c.p(round(cx + s * i - (0.5 if s < 0 else -0.5)), yy + q, tone(ramp, ti))


# ── Esqueleto Rangente (48×64) ────────────────────────────────────────────────

def esqueleto(K, P):
    t = P.t
    b = P.bob + P.dy
    jaw = [0, 1, 2, 1][t]

    # pernas: canela com fíbula, fêmur, patela e pé (cada osso contornado)
    shins, fem, knees, feet = K.new(), K.new(), K.new(), K.new()
    for i, cx in enumerate((19.5, 29.5)):
        u = P.lift[i]
        ky = 50 - u // 2
        ank = 58 - u
        s = -1 if i == 0 else 1
        bone_tube(fem, cx, 38, cx + 0.5 * s, ky - 2, 1.8, 1.4)
        bone_tube(shins, cx - 0.5 * s, ky + 1, cx - 0.5 * s, ank, 1.5, 1.2)
        shins.vl(int(cx + 2.5 * s), ky + 3, max(1, ank - ky - 4), BONE[1])
        shade(knees, ell(cx, ky, 2.6, 2.0), BONE)
        fx0 = int(cx - 3) + (s if s > 0 else 0)
        foot = ell(cx, ank + 0.5, 2.2, 1.5) + rect(fx0, ank + 2, 7, 3) + rect(fx0 + 1, ank + 1, 5, 1)
        shade(feet, foot, BONE, kind='flat')
        for k in (2, 4):
            feet.vl(fx0 + k, ank + 3, 2, BONE[0])                # dedos
        feet.hl(fx0, ank + 4, 7, BONE[1])
    K.add(shins, name='shins')
    K.add(fem)
    K.add(knees)
    K.add(feet, name='feet')

    # trapo vermelho preso na bacia, em tiras de barra rasgada
    rag = K.new()
    for x in range(15, 35):
        strip = (x - 15) // 3
        L_ = 6 + int(hsh(strip, t // 2, 17) * 7) + (1 if (x - 15) % 3 == 1 else 0)
        for y in range(37, 37 + L_):
            if (x - 15) % 3 == 2 and y > 41 and hsh(strip, 3, 9) < 0.5:
                continue                                         # fenda entre tiras
            fold = math.sin(x * 1.05 + 0.4)
            i = 2 + (1 if fold > 0.45 else (-1 if fold < -0.5 else 0))
            if y >= 37 + L_ - 2:
                i -= 1
            if x <= 16 or x >= 33:
                i -= 1
            if hsh(x, y, 5) < 0.05 and 40 < y < 37 + L_ - 2:
                continue                                         # furinhos
            rag.p(x, y, tone(CLOTH_RED, i))
    K.add(rag, dy=b, name='rags')

    # bacia
    pel = K.new()
    shade(pel, ell(20.5, 39, 4.2, 2.8) + ell(28.5, 39, 4.2, 2.8) + rect(22, 37, 6, 5), BONE)
    pel.fill(rect(24, 40, 2, 2), DARK_IN)
    pel.p(19, 39, BONE[1]); pel.p(30, 39, BONE[1])
    K.add(pel, dy=b, name='pelvis')

    # caixa do peito: fundo escuro, coluna no vão, três pares de costelas e clavícula
    cav = K.new()
    cav.fill(ell(24.5, 30.5, 8.0, 7.5), DARK_IN)
    K.add(cav, dy=b, line=False)
    sp = K.new()
    for y in range(23, 39, 3):
        sp.hl(24, y, 2, BONE[2]); sp.p(24, y, BONE[3])
        sp.hl(24, y + 1, 2, BONE[1])
    K.add(sp, dy=b)
    ribs = K.new()
    for (y, hw) in ((25, 9), (29, 9), (33, 7)):
        rib_band(ribs, 24.5, y, hw, 2)
    K.add(ribs, dy=b, name='ribs', k_line=lambda a: (40, 33, 30))
    cla = K.new()
    for x in range(15, 35):
        d = abs(x - 24.5)
        y = 22 - (1 if d > 6 else 0)
        cla.p(x, y, BONE[3] if x < 25 else BONE[2])
        cla.p(x, y + 1, BONE[1] if d < 2 else (BONE[2] if x < 25 else BONE[1]))
    K.add(cla, dy=b)

    # braços (úmero, antebraço com rádio e ulna); o da direita segura a espada
    arm = K.new()
    bone_tube(arm, 13, 23, 11.5, 31, 1.6, 1.3)
    bone_tube(arm, 36, 23, 37.5, 30, 1.6, 1.3)
    K.add(arm, dy=b)
    fore = K.new()
    bone_tube(fore, 11.5, 32, 11, 38, 1.1)
    fore.vl(13, 33, 5, BONE[1])
    bone_tube(fore, 37.5, 31, 38.5, 37, 1.1)
    fore.vl(36, 32, 5, BONE[1])
    K.add(fore, dy=b)
    joints = K.new()
    shade(joints, ell(13, 23, 2.2, 2.0), BONE)
    shade(joints, ell(36, 23, 2.2, 2.0), BONE)
    shade(joints, ell(11.5, 31.5, 1.6, 1.4), BONE)
    shade(joints, ell(37.5, 30.5, 1.6, 1.4), BONE)
    K.add(joints, dy=b)

    # espada enferrujada de ponta para cima, com fio dentado
    sw = K.new()
    blade = [(x, y) for y in range(13, 38) for x in range(38, 42)
             if not (y < 16 and abs(x - 39.5) > (y - 12) * 0.7)]
    shade(sw, blade, STEEL, kind='cylx')
    for y in range(17, 36):
        sw.p(39, y, STEEL[3])
        sw.p(40, y, STEEL[1])
    for (x, y) in ((41, 20), (41, 21), (41, 29)):
        sw.p(x, y, None)                                         # dentes no fio
    for (x, y, k) in ((38, 22, 2), (39, 23, 1), (40, 26, 2), (38, 31, 1), (39, 32, 2), (41, 34, 1), (40, 17, 2)):
        sw.p(x, y, RUST[k])
    shade(sw, rect(35, 37, 10, 2), IRON, kind='cyly')
    sw.p(35, 37, IRON[3]); sw.p(44, 38, IRON[0])
    shade(sw, rect(39, 39, 2, 5), LEATHER, kind='cylx')
    sw.p(39, 40, LEATHER[0]); sw.p(40, 42, LEATHER[0])
    shade(sw, ell(39.5, 44.5, 1.6, 1.3), IRON)
    K.add(sw, dy=b)
    fist = K.new()
    for (x, y) in ((37, 39), (37, 41), (41, 40)):
        shade(fist, rect(x, y, 2, 2), BONE)
    K.add(fist, dy=b)

    # crânio: órbitas com brasa, nariz, dentes de cima e uma rachadura
    sk = K.new()
    head = [p for p in ell(24.5, 10.5, 7.2, 6.6) if p[1] <= 14] + trap(14, 17, 18, 31, 19, 30)
    shade(sk, head, BONE, spec=False)
    for (x0, y0) in ((19, 10), (26, 10)):
        sk.fill([(x, y) for (x, y) in rect(x0, y0, 5, 4) if not ((x in (x0, x0 + 4)) and (y in (y0, y0 + 3)))], DARK_IN)
        sk.hl(x0 + 1, y0 - 1, 3, BONE[1])                        # arco da órbita
    sk.lit(21, 11, RED_EYE[2]); sk.lit(22, 11, RED_EYE[1], 1); sk.lit(21, 12, RED_EYE[1], 1)
    sk.lit(28, 11, RED_EYE[2]); sk.lit(29, 11, RED_EYE[1], 1); sk.lit(28, 12, RED_EYE[1], 1)
    sk.lit(24, 14, DARK_IN, 1, var=True); sk.lit(25, 14, DARK_IN, 1, var=True); sk.p(24, 15, DARK_IN)
    sk.hl(19, 15, 2, BONE[2]); sk.hl(29, 15, 2, BONE[1])       # maçãs
    sk.fill(rect(20, 17, 10, 2), DARK_IN)
    for x in range(20, 30, 2):
        sk.p(x, 17, BONE[3]); sk.p(x + 1, 17, BONE[2])           # dentes de cima
    for (x, y) in ((28, 8), (27, 9), (28, 10), (30, 13), (29, 14)):
        sk.p(x, y, BONE[0])                                      # rachadura
    sk.p(29, 9, BONE[1])
    K.add(sk, dy=b, name='skull')
    mand = K.new()
    shade(mand, trap(19, 21, 19, 30, 21, 28), BONE, spec=False)
    for x in range(21, 29, 2):
        mand.p(x, 19, BONE[3]); mand.p(x + 1, 19, BONE[1])       # dentes de baixo
    K.add(mand, dy=b + jaw)

    # elmo de ferro enferrujado e amassado
    hm = K.new()
    dome = [p for p in ell(24.5, 7.5, 8.2, 6.0) if p[1] <= 7 and not (p[0] >= 30 and p[1] <= 3)]
    shade(hm, dome, IRON)
    shade(hm, rect(16, 7, 18, 2), IRON, kind='cyly')
    for x in (18, 22, 27, 31):
        hm.p(x, 7, IRON[4])                                      # rebites
    for (x, y, k) in ((20, 4, 2), (21, 5, 1), (26, 3, 2), (29, 6, 1), (17, 8, 1), (30, 8, 2), (23, 2, 1)):
        hm.p(x, y, RUST[k])
    hm.p(29, 4, IRON[1]); hm.p(30, 4, IRON[0])                   # amassado
    K.add(hm, dy=b, name='helm')

    # escudo redondo de tábuas, com um pedaço quebrado
    sh = K.new()
    disk = [p for p in ell(11, 37, 7.2, 7.2)
            if not (p[0] - 11 + p[1] - 37 < -6.5 + (1 if (p[0] + p[1]) % 3 == 0 else 0))]
    shade(sh, disk, WOOD, kind='flat')
    for (x, y) in disk:
        if (x - 4) % 4 == 3:
            sh.p(x, y, WOOD[1])                                  # junta das tábuas
        d = math.hypot(x - 11, y - 37)
        if d > 6.0:
            sh.p(x, y, IRON[3] if (y < 37 and x < 13) else IRON[1])
    shade(sh, ell(11, 37, 2.2, 2.2), IRON)
    sh.p(10, 36, IRON[4])
    for (x, y) in ((7, 41), (15, 33), (15, 41)):
        sh.p(x, y, IRON[4])                                      # cravos
    K.add(sh, dy=b, name='shield')


# ── Rato-de-ossuário (48×32, virado para a direita) ──────────────────────────

def fur_tufts(c, pts, ramp, seed, dirx=-1, step=3):
    """Pelo em tufos: traços curtos escuros na direção do pelo e pontas claras em cima."""
    S = set(pts)
    ys = [p[1] for p in pts]
    top = min(ys)
    for (x, y) in pts:
        if (x * 7 + y * 3 + seed) % step or hsh(x, y, seed) < 0.35:
            continue
        col = c.g(x, y)
        if col is None:
            continue
        i = ramp.index(col) if col in ramp else 2
        for j in range(3):
            q = (x + dirx * j, y + (j + 1) // 2)
            if q in S:
                c.p(q[0], q[1], ramp[max(0, i - 1)])
        if y - top < 6 and (x - dirx, y) in S:
            c.p(x - dirx, y, ramp[min(len(ramp) - 1, i + 1)])


def rato(K, P):
    t = P.t
    b = P.bob // 2 + P.dy + 1                                    # pés na penúltima linha
    sw = [0, 1, 0, -1][t] * 2
    sniff = 2 if t in (1, 2) else 0
    mid = 25

    # rabo anelado, quase rente ao chão, subindo devagar
    tl = K.new()
    pts = []
    for k in range(23):
        x = 12 - k * 0.52
        y = 23.5 - k * 0.28 - (sw * ((k - 10) / 12) ** 2 if k > 10 else 0)
        pts.append((x, y))
    tube = path(pts[::2] + [pts[-1]], 1.2, 0.5)
    for (x, y) in tube:
        ring = (x // 2) % 2
        tl.p(x, y, PINK[2] if ring else PINK[1])
    for (x, y) in tube:
        if tl.g(x, y + 1) is None:
            tl.p(x, y, PINK[0])
    K.add(tl, dy=b)

    # patas: as de trás (esquerda) e as da frente (direita)
    legs = K.new()
    for (x, back) in ((14, True), (20, True), (29, False), (34, False)):
        u = P.lift[0] if x < mid else P.lift[1]
        shade(legs, rect(x, 25, 3, 5 - u), FUR, kind='cylx')
        legs.hl(x - (1 if back else 0), 30 - u, 4, PINK[1])
        legs.p(x + 3 - (1 if back else 0), 30 - u, PINK[0])
    K.add(legs)

    # corpo comprido e baixo, pelo em tufos, espinhas de osso deitadas no lombo
    bd = K.new()
    body = [p for p in ell(23, 20.5, 13.4, 7.6)]
    body = [(x, y) for (x, y) in body if not (y <= 14 and hsh(x, 0, 11) < 0.3)]
    shade(bd, body, FUR)
    fur_tufts(bd, body, FUR, 3)
    for x in range(11, 35):
        if hsh(x, 2, 7) < 0.45:
            bd.p(x, 28, None)                                    # barriga desfiada
    K.add(bd, dy=b, name='body')
    sp = K.new()
    for i, x in enumerate((15, 19, 23, 27)):
        y = 14 - (1 if i in (1, 2) else 0)
        sp.hl(x, y, 3, BONE[2]); sp.p(x, y, BONE[3])
        sp.hl(x - 1, y - 1, 2, BONE[3]); sp.p(x - 2, y - 2, BONE[4])
    K.add(sp, dy=b, name='spines')

    # orelha atrás da cabeça
    ear = K.new()
    shade(ear, ell(33 + sniff, 13.5, 2.4, 2.8), FUR)
    ear.fill(ell(33.4 + sniff, 14, 1.0, 1.5), PINK[1])
    ear.p(33 + sniff, 13, PINK[2])
    K.add(ear, dy=b)

    # cabeça de focinho comprido
    hd = K.new()
    head = ell(36.5 + sniff, 20, 5.6, 4.8) + polyp([(38 + sniff, 16), (45.5 + sniff, 21), (44 + sniff, 24), (37 + sniff, 24.5)])
    shade(hd, head, FUR)
    fur_tufts(hd, [p for p in head if p[0] < 38 + sniff], FUR, 5)
    hd.fill(ell(45 + sniff, 21.5, 1.3, 1.1), PINK[2])
    hd.p(45 + sniff, 21, PINK[3])
    hd.lit(37 + sniff, 18, RED_EYE[2]); hd.lit(38 + sniff, 18, RED_EYE[1], 1); hd.lit(37 + sniff, 19, RED_EYE[0], 1)
    hd.hl(36 + sniff, 17, 3, FUR[1])
    hd.hl(39 + sniff, 23, 4, FUR[1])                             # boca
    K.add(hd, dy=b, name='head')
    th = K.new()
    th.fill(rect(42 + sniff, 24, 2, 2), BONE[4])
    th.p(43 + sniff, 25, BONE[2])
    K.add(th, dy=b)
    wh = K.new()
    for (dx_, dy_) in ((5, -2), (5, 0), (4, 2)):
        wh.line(45 + sniff, 22, 45 + sniff + dx_, 22 + dy_, PALE)
    K.add(wh, dy=b, fx=True)


# ── Acólito Caído (48×64, flutua) ─────────────────────────────────────────────

def acolito(K, P):
    t = P.t
    b = P.bob
    sw = [0, 1, 0, -1][t] * 2
    dx, ldx, dy = P.dx, P.ldx, P.dy

    def off(y):
        k = max(0.0, min(1.0, (y - 40) / 14))
        return round(dx + (ldx - dx) * k)

    # túnica: do ombro (sobe e desce) à barra rasgada (fixa)
    rb = K.new()
    top = 24 + b
    for y in range(top, 61):
        k = (y - top) / (60 - top)
        a = round(18 - k * 6)
        z = round(31 + k * 6)
        o = off(y)
        for x in range(a, z + 1):
            fold = math.sin((x - 24.5) * (0.62 + 0.1 * math.sin(y * 0.15)) + 0.6)
            i = 2 + (1 if fold > 0.62 else (-1 if fold < -0.62 else 0))
            if x <= a + 1:
                i += 1
            if x >= z - 1:
                i -= 1
            rb.p(x + o, y, tone(PURPLE, i))
    for x in range(10, 40):                                      # barra rasgada
        L_ = int(hsh(x // 2, t // 2, 23) * 4)
        o = off(61)
        for y in range(60, 61 + L_):
            if y < 63:
                rb.p(x + o, y, PURPLE[0] if (x + y) % 3 else (48, 20, 70))
    K.add(rb, dy=dy, name='robe')

    # cordão de bronze com nó e pontas
    belt = K.new()
    o = off(38 + b)
    for x in range(18, 32):
        belt.p(x + o, 38 + b, BRONZE[3] if x % 2 else BRONZE[2])
        belt.p(x + o, 39 + b, BRONZE[1] if x % 2 else BRONZE[2])
    for y in range(40, 46):
        belt.p(22 + off(y + b), y + b, BRONZE[2] if y % 2 else BRONZE[1])
        belt.p(24 + off(y + b), y + b - 1, BRONZE[3] if y % 2 else BRONZE[1])
    shade(belt, ell(23 + o, 39 + b, 1.6, 1.3), BRONZE)
    K.add(belt, dy=dy)

    # mangas largas e mãos pálidas
    ar = K.new()
    shade(ar, trap(26, 39, 14, 17, 12, 18), PURPLE, kind='cylx')
    shade(ar, trap(26, 37, 32, 35, 31, 37), PURPLE, kind='cylx')
    ar.hl(12, 39, 7, PURPLE[0]); ar.hl(31, 37, 7, PURPLE[0])
    K.add(ar, dx=dx, dy=dy + b, name='arms')
    # livro na mão esquerda, com runa doentia na capa e cantos de bronze
    bk = K.new()
    COVER = [(38, 20, 26), (60, 32, 38), (86, 48, 52), (114, 68, 66)]
    shade(bk, rect(8, 39, 9, 11), COVER, kind='flat')
    bk.vl(16, 40, 10, (196, 186, 160)); bk.hl(9, 49, 8, (170, 160, 136))      # páginas
    bk.vl(8, 39, 11, COVER[0])                                                # lombada
    for (x, y) in ((9, 39), (15, 39), (9, 48), (15, 48)):
        bk.p(x, y, BRONZE[3])
    for (x, y) in ((12, 41), (11, 42), (13, 42), (12, 43), (12, 44), (11, 45), (13, 45), (12, 46)):
        bk.lit(x, y, SICK[2], 1)
    bk.lit(12, 43, SICK[3])
    K.add(bk, dx=dx, dy=dy + b, name='book')
    hands = K.new()
    shade(hands, ell(15, 41.5, 2.4, 2.0), FLESH[:4])
    shade(hands, ell(34.5, 39, 2.2, 2.0), FLESH[:4])
    K.add(hands, dx=dx, dy=dy + b)

    # incensário de bronze balançando, com fumaça doentia
    cs = K.new()
    cx = 34 + sw
    for k in range(8):
        y = 41 + k
        x = round(34 + (cx - 34) * k / 8)
        cs.p(x, y, BRONZE[2] if k % 2 else BRONZE[1])
    ball = ell(cx + 0.5, 52, 3.2, 3.0)
    shade(cs, ball, BRONZE)
    cs.hl(cx - 2, 49, 6, BRONZE[1])
    shade(cs, rect(cx, 47, 2, 2), BRONZE)
    for (x, y) in ((cx - 1, 52), (cx + 1, 52), (cx + 2, 51), (cx, 54)):
        cs.lit(x, y, SICK[2], 1)
    cs.lit(cx + 1, 53, SICK[3])
    K.add(cs, dx=dx, dy=dy + b)
    sm = K.new()
    for k in range(4):
        x = cx + (1 if (k + t) % 2 else 0) + 1
        y = 45 - k * 3 - (t % 2)
        col = SICK[1] if k < 2 else (78, 104, 70)
        sm.p(x, y, col)
        if k < 3:
            sm.p(x + 1, y, col if k else SICK[2])
            sm.p(x, y - 1, (78, 104, 70))
    K.add(sm, dx=dx, dy=dy + b, fx=True)

    # capuz pontudo, abertura escura e rosto encovado
    hd = K.new()
    hood = polyp([(24.5, 2.5), (27.5, 5.5), (31.5, 11), (34, 18), (34, 26), (15, 26), (15, 18), (17.5, 11), (21.5, 5.5)])
    shade(hd, hood, PURPLE)
    opening = [p for p in ell(24.5, 17.5, 5.6, 8.0) if p[1] >= 10] + rect(19, 17, 12, 8)
    hd.fill(opening, (14, 10, 18))
    for (x, y) in opening:
        if hd.g(x - 1, y) not in (None, (14, 10, 18)) and x < 25:
            hd.p(x - 1, y, PURPLE[4])                            # borda do capuz na luz
    face = [p for p in ell(24.5, 18.5, 3.2, 4.3) if p[1] >= 15]
    shade(hd, face, [(110, 100, 84), (150, 138, 116), (180, 168, 144), (204, 194, 170)], spec=False)
    hd.p(22, 20, (110, 100, 84)); hd.p(27, 20, (110, 100, 84))   # maçãs fundas
    hd.lit(22, 17, SICK[3]); hd.lit(23, 17, SICK[2], 1)
    hd.lit(26, 17, SICK[2], 1); hd.lit(27, 17, SICK[3])
    hd.lit(24, 21, (60, 40, 40), 1, var=True); hd.lit(25, 21, (60, 40, 40), 1, var=True)
    hd.p(24, 22, (150, 138, 116))
    for y in range(8, 25, 4):
        hd.p(31, y, PURPLE[1]); hd.p(18, y + 2, PURPLE[3])       # dobras
    K.add(hd, dx=dx, dy=dy + b, name='hood')


# ── O Guardião das Urnas (chefe 96×112) ──────────────────────────────────────

def _urn(c, cx, cy, rx, ry, ramp, band, glow_xy=None, glow=EMBER):
    shade(c, ell(cx, cy, rx, ry), ramp)
    neck = rect(round(cx - rx * 0.45), round(cy - ry - 3), round(rx * 0.9) + 1, 4)
    shade(c, neck, ramp, kind='cylx')
    shade(c, ell(cx, cy - ry - 3.5, rx * 0.6, 1.4), ramp)
    shade(c, ell(cx, cy - ry - 5.5, 1.2, 1.2), band)
    for x in range(round(cx - rx), round(cx + rx) + 1):
        y = round(cy - ry * 0.35)
        if c.g(x, y) is not None:
            c.p(x, y, band[3] if x < cx else band[2])
            c.p(x, y + 1, band[1])
    if glow_xy:
        gx, gy = glow_xy
        for (x, y) in ((gx, gy - 1), (gx, gy), (gx + 1, gy), (gx, gy + 1), (gx - 1, gy + 2)):
            c.p(x, y, NOITE)
        c.lit(gx, gy, glow[2]); c.lit(gx + 1, gy, glow[1], 1)


def guardiao_urnas(K, P):
    t = P.t
    b = P.bob + P.dy
    g = [AMBER[1], AMBER[2], EMBER[2], AMBER[2]][t]
    ph2 = K.phase2

    # pernas de pedra com cintas de ferro, pés em bloco
    lg = K.new()
    for i, x0 in enumerate((30, 54)):
        u = P.lift[i]
        shade(lg, rect(x0, 80, 14, 23 - u), STONE, kind='cylx')
        for y in (87, 94):
            if y < 103 - u:
                shade(lg, rect(x0, y, 14, 2), IRON, kind='cylx')
        for (x, y) in ((x0 + 3, 84), (x0 + 9, 91), (x0 + 5, 98)):
            if y < 102 - u:
                lg.p(x, y, STONE[1]); lg.p(x + 1, y + 1, STONE[1])
        foot = rect(x0 - 4, 103 - u, 22, 8)
        shade(lg, foot, STONE, kind='flat')
        lg.hl(x0 - 4, 103 - u, 22, STONE[3])
        for k in range(1, 4):
            lg.vl(x0 - 4 + k * 5 + (1 if i else 0), 107 - u, 3, STONE[0])
        lg.hl(x0 - 4, 110 - u, 22, STONE[0])
    K.add(lg, name='legs')

    # braços de osso grosso, cada mão segurando uma urna pequena
    ar = K.new()
    for s in (-1, 1):
        sx = 26 if s < 0 else 70
        ex = 17 if s < 0 else 79
        hx = 13 if s < 0 else 83
        bone_tube(ar, sx, 44, ex, 56, 3.2, 2.6)
        bone_tube(ar, ex, 57, hx, 64, 2.4, 2.2)
        ar.vl(ex - s * 3, 59, 5, BONE[1])
        shade(ar, ell(ex, 56.5, 3.2, 2.6), BONE)
        shade(ar, ell(sx, 44, 5.5, 4.6), BONE)
        ar.p(sx - 2, 42, BONE[4]); ar.p(sx + 2 * s, 46, BONE[1])
    K.add(ar, dy=b, name='arms')
    urns = K.new()
    _urn(urns, 12, 74, 9, 9.5, URN, BRONZE, (12, 77), (EMBER[0], EMBER[1], g))
    _urn(urns, 84, 76, 9, 9.5, URN, BRONZE, (85, 79), (EMBER[0], EMBER[1], g))
    for (x, y) in ((8, 67), (9, 68), (87, 70)):
        urns.p(x, y, CLAY[1])
    K.add(urns, dy=b, name='urns')
    fing = K.new()
    for s, hx in ((-1, 13), (1, 83)):
        for k in range(3):
            shade(fing, rect(hx - 4 + k * 3, 64 + (k % 2), 2, 4), BONE)
    K.add(fing, dy=b)

    # corpo de urna: barro escuro, faixas de bronze com meandro, rachaduras com brasa
    bd = K.new()
    body = ell(48, 63, 28.5, 24.5)
    shade(bd, body, URN, bias=0.08)
    for (x, y) in body:
        if hsh(x, y, 41) < 0.06:
            bd.p(x, y, mul(bd.g(x, y), 0.88))                    # poros do barro
    for yb in (47, 76):
        for x in range(18, 79):
            for q in range(3):
                y = yb + q
                if bd.g(x, y) is None:
                    continue
                lit_ = x < 46
                col = BRONZE[3 if lit_ else 2] if q == 0 else (BRONZE[2 if lit_ else 1] if q == 1 else BRONZE[0])
                if q == 1 and (x % 6 in (0, 1, 2)) and ((x // 3) % 2 == 0):
                    col = BRONZE[0]                              # meandro
                bd.p(x, y, col)
    cracks = [((34, 54), [(1, 1), (0, 1), (1, 1), (1, 1), (0, 1), (1, 1)]),
              ((62, 66), [(-1, 1), (0, 1), (-1, 1), (0, 1), (1, 1), (0, 1)]),
              ((26, 61), [(1, 1), (1, 1), (0, 1), (1, 1), (0, 1), (1, 1), (1, 1)]),
              ((70, 51), [(-1, 1), (-1, 1), (0, 1), (-1, 1), (-1, 1), (0, 1)])]
    for ci, ((x, y), steps) in enumerate(cracks):
        for j, (ax, ay) in enumerate(steps):
            bd.p(x, y, NOITE)
            bd.p(x + 1, y, CLAY[1])
            if j in (2, 3):
                bd.lit(x, y, g if j == 2 else EMBER[1], 2 if j == 2 else 1)
            x += ax
            y += ay
    for (x, y) in ((28, 40), (30, 38), (31, 39), (66, 37), (68, 36), (70, 37), (69, 38)):
        bd.fill(rect(x, y, 2, 2), BONE[3])                       # ossos pela boca quebrada
    if ph2:                                                      # barro estourado: o núcleo de brasa aparece
        core_burst(bd, 33, 64, K, r=4, arms=5, length=12, seed=5)
        for (x, y) in ((26, 58), (27, 57), (40, 70), (41, 71)):
            bd.p(x, y, URN[4])                                   # lascas soltas
    K.add(bd, dy=b, name='body')

    # caveira em relevo no bojo (o ossuário)
    skl = K.new()
    sk_ = [p for p in ell(48.5, 69, 5.4, 4.6) if p[1] <= 71] + rect(45, 71, 8, 4)
    shade(skl, sk_, BONE, spec=False)
    skl.fill(rect(45, 68, 3, 3), NOITE); skl.fill(rect(50, 68, 3, 3), NOITE)
    skl.lit(46, 69, g, 1, var=True); skl.lit(51, 69, g, 1, var=True)
    skl.p(48, 72, NOITE); skl.p(49, 72, NOITE)
    for x in range(45, 53, 2):
        skl.p(x, 74, BONE[1])
    K.add(skl, dy=b)

    # corrente pendurada de ombro a ombro, elo a elo
    ch = K.new()
    for k in range(17):
        x = 27 + k * 2.6
        y = 49 + math.sin(k / 16 * math.pi) * 9
        if k % 2:
            ch.fill(rect(round(x) - 1, round(y) - 1, 3, 3), IRON[3])
            ch.p(round(x), round(y), IRON[0])
            ch.p(round(x) - 1, round(y) - 1, IRON[4])
        else:
            ch.hl(round(x) - 1, round(y), 3, IRON[2])
            ch.p(round(x) - 1, round(y), IRON[3])
    K.add(ch, dy=b)

    # cabeça de urna: tampa, puxador, olhos de brasa e boca rachada
    hd = K.new()
    shade(hd, ell(48, 28, 16.5, 13.5), URN, bias=0.08)
    for (x, y) in ell(48, 28, 16.5, 13.5):
        if hsh(x, y, 43) < 0.05:
            hd.p(x, y, mul(hd.g(x, y), 0.88))
    lid = rect(37, 12, 23, 5)
    shade(hd, lid, STONE, kind='cyly')
    hd.hl(39, 11, 19, STONE[3])
    hd.hl(37, 16, 23, BRONZE[2]); hd.hl(37, 17, 23, BRONZE[1])
    shade(hd, rect(46, 7, 5, 4), BRONZE, kind='cylx')
    shade(hd, ell(48, 5.5, 1.8, 1.6), BRONZE)
    if ph2:
        for (x, y) in lid:
            if x > 52 and y < 12 + (x - 52) // 2:
                hd.p(x, y, None)                                 # tampa lascada
        for (x, y) in ((54, 13), (55, 13), (56, 14)):
            hd.lit(x, y, EMBER[1], 1)
    for ex in (40, 53):
        hd.fill(rect(ex, 26, 6, 4), NOITE)
        hd.p(ex, 26, CLAY[1]); hd.p(ex + 5, 29, CLAY[1])
        hd.lit(ex + 2, 27, g); hd.lit(ex + 3, 27, g)
        hd.lit(ex + 2, 28, EMBER[1], 1); hd.lit(ex + 3, 28, EMBER[1], 1)
        hd.hl(ex, 25, 6, CLAY[0])                                # cenho
    hd.fill(rect(42, 34, 14, 2), NOITE)
    for x in (43, 46, 50, 53):
        hd.p(x, 36, NOITE)
    hd.lit(48, 34, EMBER[0], 1, var=True)
    for (x, y) in ((58, 20), (59, 21), (59, 22), (60, 23)):
        hd.p(x, y, NOITE)
    hd.hl(36, 40, 26, BRONZE[2]); hd.hl(36, 41, 26, BRONZE[1])
    K.add(hd, dy=b, name='head')
