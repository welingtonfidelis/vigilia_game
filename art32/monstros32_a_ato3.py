"""Ato III (Jardim de Fungos) em 32-bit: Esporento, Aranha-de-micélio, Brotado e
A Mãe-Bolor. Desenho à mão no pixel novo, peça a peça."""
from __future__ import annotations

import math

from monstros32_a_base import (noise, BARK, BONE, BROWN, FLESH, LEATHER, MOSS, MUSH_RED, NOITE, PURPLE, RED_EYE, SICK,  # noqa: F401
                               WHITE, WOOD, core_burst, ell, hsh, mix, mul, path, polyp, rect, seg, shade,
                               shade_tube, tone, trap)

CREAM = [(150, 136, 112), (184, 172, 148), (212, 202, 180), (234, 228, 210), (248, 244, 230)]
GILL = [(92, 70, 64), (132, 108, 96), (176, 154, 136)]
WART = [(170, 160, 140), (214, 206, 188), (244, 240, 228)]
MYCEL = [(150, 146, 132), (196, 192, 176), (232, 230, 218)]
CAP_P = [(56, 30, 64), (86, 46, 88), (118, 70, 118), (150, 100, 146)]
CAP_MB = [(40, 16, 52), (70, 24, 44), (104, 34, 44), (140, 50, 52), (176, 72, 66), (206, 108, 92)]


def wart(c, x, y, big=False):
    """Pinta de chapéu de cogumelo: verruga clara com luz em cima e sombra embaixo."""
    if big:
        for (ax, ay, t) in ((0, 0, 2), (1, 0, 2), (-1, 1, 1), (0, 1, 1), (1, 1, 1), (2, 1, 0), (0, 2, 0), (1, 2, 0)):
            c.p(x + ax, y + ay, WART[t])
    else:
        c.p(x, y, WART[2]); c.p(x + 1, y, WART[1]); c.p(x, y + 1, WART[1]); c.p(x + 1, y + 1, WART[0])


def spore_puff(c, t, x0, y0, w, n, seed, rise=12):
    for k in range(n):
        x = x0 + int(hsh(k, seed, 5) * w)
        ph = (t + k * 2) % 6
        y = y0 - ph * rise // 6
        col = SICK[2] if k % 2 else SICK[1]
        c.p(x, y, col)
        if ph < 4:
            c.p(x + 1, y, SICK[1] if k % 2 else SICK[0])
            c.p(x, y + 1, SICK[0])
        if k % 3 == 0:
            c.lit(x, y, SICK[3], 1, var=True)


# ── Esporento (48×48, salta) ─────────────────────────────────────────────────

def esporento(K, P):
    t = P.t
    b = P.bob + P.squash
    dy = P.dy

    # pezinhos de raiz
    lg = K.new()
    for x0 in (16, 26):
        shade(lg, rect(x0, 38, 6, 6), CREAM[:4], kind='cylx')
        foot = rect(x0 - 2, 43, 9, 4) + rect(x0 - 1, 42, 7, 1)
        shade(lg, foot, BROWN, kind='flat')
        lg.hl(x0 - 2, 46, 9, BROWN[0])
        lg.p(x0 - 3, 46, BROWN[1]); lg.p(x0 + 7, 46, BROWN[1])    # raízes
        lg.p(x0 + 1, 45, BROWN[3]); lg.p(x0 + 4, 45, BROWN[3])
    K.add(lg, dy=dy, name='legs')

    # tronco com cara: olhos doentes, bocão de dentes tortos
    st = K.new()
    stem = ell(24.5, 30.5, 10.2, 10.2)
    shade(st, stem, CREAM)
    for (x, y) in stem:
        if hsh(x, y, 13) < 0.06 and y > 26:
            st.p(x, y, mul(st.g(x, y), 0.9))
    for (x0, y0) in ((19, 25), (27, 25)):
        st.fill([p for p in rect(x0, y0, 4, 4) if p not in ((x0, y0), (x0 + 3, y0 + 3))], (30, 26, 22))
        st.lit(x0 + 1, y0 + 1, SICK[3]); st.lit(x0 + 2, y0 + 1, SICK[2], 1); st.lit(x0 + 1, y0 + 2, SICK[2], 1)
        st.hl(x0, y0 - 1, 4, CREAM[1])                           # sobrancelha
    mouth = [p for p in ell(24.5, 35, 6.2, 3.0)]
    st.fill(mouth, (40, 18, 22))
    for (x, y) in mouth:
        if y >= 36 and st.g(x, y + 1) is None:
            st.p(x, y, (90, 40, 46))                             # língua
    for x in (20, 23, 26, 29):
        st.p(x, 33, CREAM[3]); st.p(x, 34, CREAM[2])             # dentes de cima
    for x in (22, 27):
        st.p(x, 37, CREAM[2])                                    # dentes de baixo
    K.add(st, dy=dy + b, name='stem')

    # chapéu vermelho de verrugas, lamelas por baixo
    cp = K.new()
    cap = []
    for y in range(4, 22):
        k = (y - 4) / 17
        hw = 8 + 13 * math.sin(min(1.0, k * 1.15) * math.pi / 2)
        cap += [(x, y) for x in range(round(24.5 - hw), round(24.5 + hw) + 1)]
    shade(cp, cap, MUSH_RED, box=(22, 12, 21, 14))
    for x in range(4, 46):
        yb = 21
        if cp.g(x, yb) is not None:
            cp.p(x, yb, GILL[2] if x % 2 else GILL[1])
            cp.p(x, yb - 1, MUSH_RED[1] if x > 24 else MUSH_RED[2])
    for x in range(8, 42, 3):
        cp.p(x, 22, GILL[0]); cp.p(x + 1, 22, GILL[1])           # lamelas
    for (x, y, big) in ((18, 8, True), (27, 6, False), (13, 13, True), (24, 12, True), (32, 10, False),
                        (36, 15, True), (8, 17, False), (20, 17, False), (41, 18, False), (29, 17, True)):
        wart(cp, x, y, big)
    K.add(cp, dy=dy + b, name='cap')

    sp = K.new()
    spore_puff(sp, t, 10, 8, 28, 5, 3)
    K.add(sp, dy=dy + b, deco=True)


# ── Aranha-de-micélio (64×48, de frente) ─────────────────────────────────────

def aranha(K, P):
    t = P.t
    b = P.bob + P.dy
    step = [0, 1, 0, -1][t] * 2
    SP = [(20, 14, 12), (38, 26, 20), (62, 44, 30), (90, 64, 42), (120, 88, 58)]

    # três pernas de cada lado, em arco, com juntas de fungo e pelos
    lg = K.new()
    joints = []
    for side in (-1, 1):
        run_u = P.lift[0] if side < 0 else P.lift[1]
        for k in range(3):
            lift = step if (k + (side > 0)) % 2 else -step
            u = max(0, lift) + run_u
            hx, hy = 32.5 + side * 5, 27 + b
            kx, ky = 32.5 + side * (13 + k * 6), 9 + k * 4 - u + b
            fx_, fy = kx + side * 7, 46 - u
            shade_tube(lg, [(hx, hy), (kx, ky)], 1.6, 1.3, SP)
            shade_tube(lg, [(kx, ky), (kx + side * 4, (ky + fy) / 2), (fx_, fy)], 1.3, 0.6, SP)
            joints.append((kx, ky))
            for j in range(1, 4):                                # pelos
                px = round(kx + side * 1.5 * j)
                py = round(ky + (fy - ky) * j / 4)
                lg.p(px + side * 2, py, SP[1])
            lg.p(round(fx_), round(fy), SP[0])
    K.add(lg, name='legs')
    jn = K.new()
    for (x, y) in joints:
        shade(jn, ell(x, y, 1.6, 1.4), MYCEL)
    K.add(jn)

    # abdômen com micélio e manchas que brilham
    ab = K.new()
    abd = ell(32.5, 22.5, 12.2, 9.4)
    shade(ab, abd, SP)
    for (x, y) in abd:
        r = hsh(x, y, 21)
        if r < 0.1:
            ab.p(x, y, SP[1])
    for i in range(7):                                           # fios de micélio
        x = 23 + i * 3 + (i % 2)
        for j in range(4 + (i % 3)):
            yy = 14 + j + (1 if i % 2 else 0)
            xx = x + (j // 2) * (1 if i % 2 else -1)
            if ab.g(xx, yy) is not None:
                ab.p(xx, yy, MYCEL[2] if j == 0 else MYCEL[1] if j < 3 else MYCEL[0])
    for (x, y) in ((27, 20), (37, 22), (32, 17), (30, 25), (35, 27)):
        ab.lit(x, y, SICK[3]); ab.lit(x + 1, y, SICK[2], 1); ab.lit(x, y + 1, SICK[1], 1)
    K.add(ab, dy=b, name='abdomen')
    fz = K.new()
    for x in range(21, 45, 2):
        y = 13 + round(abs(x - 32.5) / 4)
        fz.p(x, y - (1 if x % 4 == 1 else 0), MYCEL[2] if x < 33 else MYCEL[1])
    K.add(fz, dy=b, fx=True)

    # cabeça: quatro olhos vermelhos, dois pequenos, quelíceras
    hd = K.new()
    head = ell(32.5, 33, 8.4, 6.2)
    shade(hd, head, SP)
    for ex in (27, 30, 34, 37):
        big = ex in (30, 34)
        hd.fill(rect(ex, 31, 2, 2), (30, 8, 10))
        hd.lit(ex, 31, RED_EYE[2] if big else RED_EYE[1], 2 if big else 1)
        hd.lit(ex + 1, 32, RED_EYE[0], 1)
    hd.lit(31, 28, RED_EYE[1], 1); hd.lit(34, 28, RED_EYE[1], 1)
    hd.hl(28, 35, 10, SP[1])
    K.add(hd, dy=b, name='head')
    fg = K.new()
    for x in (29, 35):
        shade(fg, rect(x, 37, 3, 3), SP)
        fg.p(x + 1, 40, BONE[3]); fg.p(x + 1, 41, BONE[2])
    K.add(fg, dy=b)


# ── Brotado (64×80) ───────────────────────────────────────────────────────────

def bark_grain(c, pts, seed, ramp=BARK):
    """Veio da casca: linhas verticais onduladas e um nó ou outro."""
    S = set(pts)
    for (x, y) in pts:
        w = math.sin(y * 0.35 + x * 1.7 + seed) * 0.8
        if (x + round(w)) % 4 == 0 and hsh(x, y // 3, seed) < 0.8:
            col = c.g(x, y)
            if col in ramp:
                c.p(x, y, ramp[max(0, ramp.index(col) - 1)])
    return S


def brotado(K, P):
    t = P.t
    b = P.bob + P.dy

    # pernas de tronco e pés de raiz
    lg = K.new()
    for i, x0 in enumerate((18, 36)):
        u = P.lift[i]
        leg = rect(x0, 56, 12, 17 - u)
        shade(lg, leg, BARK, kind='cylx')
        bark_grain(lg, leg, 3 + i)
        foot = rect(x0 - 3, 72 - u, 18, 7)
        shade(lg, foot, BARK, kind='flat')
        lg.hl(x0 - 3, 78 - u, 18, BARK[0])
        for (x, d) in ((x0 - 5, -1), (x0 + 15, 1), (x0 + 5, 0)):
            lg.p(x, 78 - u, BARK[1]); lg.p(x + d, 78 - u, BARK[0])   # raízes
            if d:
                lg.p(x - d, 77 - u, BARK[2])
        lg.p(x0 - 2, 75 - u, MOSS[2]); lg.p(x0 + 13, 74 - u, MOSS[2])
    K.add(lg, name='legs')

    # braços de galho; o da direita segura um porrete de raiz
    ar = K.new()
    la = rect(8, 30, 10, 24)
    shade(ar, la, BARK, kind='cylx')
    bark_grain(ar, la, 7)
    ra = rect(46, 30, 10, 20)
    shade(ar, ra, BARK, kind='cylx')
    bark_grain(ar, ra, 9)
    K.add(ar, dy=b, name='arms')
    cl = K.new()
    shade_tube(cl, [(52, 46), (55, 58), (58, 68)], 2.4, 2.8, BARK)
    knob = ell(58.5, 69, 5.4, 6.0) + ell(55, 66, 2.4, 2.2) + ell(61.5, 73, 2.2, 2.0)
    shade(cl, knob, BARK)
    for (x, y) in ((57, 67), (60, 70), (56, 71)):
        cl.p(x, y, BARK[0])
    cl.p(54, 64, MOSS[3]); cl.p(55, 64, MOSS[2])
    K.add(cl, dy=b, name='club')
    fs = K.new()
    shade(fs, ell(12.5, 55.5, 6.6, 4.6), BARK)
    fs.hl(9, 56, 7, BARK[1])
    shade(fs, ell(51, 49, 5.2, 4.0), BARK)
    K.add(fs, dy=b)

    # corpo de casca com rugas e o manto de musgo
    bd = K.new()
    body = ell(32.5, 42.5, 18.2, 18.2)
    shade(bd, body, BARK)
    bark_grain(bd, body, 1)
    for (x, y) in ((24, 46), (25, 47), (39, 40), (38, 41), (34, 52), (35, 53), (28, 55)):
        bd.p(x, y, BARK[0])
    shade(bd, ell(36, 48, 2.4, 2.0), BARK)                       # nó
    bd.p(36, 48, BARK[0])
    K.add(bd, dy=b, name='body')
    ms = K.new()
    mantle = [p for p in ell(32.5, 31, 19, 8.4)]
    mantle = [(x, y) for (x, y) in mantle if not (y > 33 and hsh(x, 0, 41) < 0.45 and y > 35 + int(hsh(x, 1, 41) * 4))]
    shade(ms, mantle, MOSS)
    for (x, y) in mantle:
        r = hsh(x, y, 43)
        if r < 0.16:
            ms.p(x, y, MOSS[4] if y < 30 else MOSS[3])
        elif r > 0.86:
            ms.p(x, y, MOSS[0])
    for x in range(15, 51, 3):
        L_ = 2 + int(hsh(x, 3, 44) * 4)
        for j in range(L_):
            if ms.g(x, 37 + j) is None and ms.g(x, 36 + j) is not None:
                ms.p(x, 37 + j, MOSS[1] if j < L_ - 1 else MOSS[0])   # musgo pendendo
    K.add(ms, dy=b, name='moss')

    # cabeça de toco: olhos fundos que brilham, boca rachada
    hd = K.new()
    head = ell(32.5, 18.5, 10.2, 9.2)
    shade(hd, head, BARK)
    bark_grain(hd, head, 5)
    for ex in (27, 35):
        hd.fill(rect(ex, 16, 4, 4), (20, 14, 10))
        hd.lit(ex + 1, 17, SICK[3]); hd.lit(ex + 2, 17, SICK[2], 1); hd.lit(ex + 1, 18, SICK[1], 1)
        hd.hl(ex - 1, 15, 6, BARK[3])                            # testa
    for x in range(28, 38):
        hd.p(x, 23 + (1 if x in (30, 34) else 0), (24, 16, 12))
    hd.lit(32, 24, (24, 16, 12), 1, var=True)
    K.add(hd, dy=b, name='head')

    # brotos e cogumelos nos ombros e na cabeça
    sp = K.new()
    for (x, y, capc) in ((14, 22, MUSH_RED), (50, 20, CAP_P)):
        shade(sp, rect(x - 1, y, 3, 6), CREAM[:4], kind='cylx')
        capp = [p for p in ell(x + 0.5, y + 0.5, 5.2, 3.6) if p[1] <= y + 1]
        shade(sp, capp, capc if len(capc) > 4 else capc + [capc[-1]])
        sp.hl(x - 4, y + 1, 10, GILL[1])
        wart(sp, x - 2, y - 2)
        sp.p(x + 2, y - 1, WART[2])
    for (x, y, h) in ((24, 10, 5), (41, 8, 6)):
        for j in range(h):
            sp.p(x + (1 if j > h - 3 else 0), y + j, MOSS[2] if j < h - 1 else MOSS[1])
        sp.fill([(x - 2, y), (x - 1, y), (x - 2, y - 1)], MOSS[3])
        sp.fill([(x + 2, y + 1), (x + 3, y + 1), (x + 3, y)], MOSS[4])
    K.add(sp, dy=b, name='sprouts')
    sr = K.new()
    spore_puff(sr, t, 12, 22, 40, 4, 9, rise=14)
    K.add(sr, dy=b)


# ── A Mãe-Bolor (chefe 96×112, flutua) ───────────────────────────────────────

def mae_bolor(K, P):
    t = P.t
    b = P.bob
    dx, ldx, dy = P.dx, P.ldx, P.dy
    ph2 = K.phase2

    # saia de musgo em camadas recortadas, tufos claros e sombra sob cada camada
    sk = K.new()
    for y in range(72, 109):
        k = (y - 72) / 36
        a = round(28 - k * 22)
        z = round(68 + k * 22)
        for x in range(a, z + 1):
            u = (x - a) / max(1, z - a) * 2 - 1                  # -1 esquerda … 1 direita
            v = 0.55 - u * 0.5
            v += (noise(x, y, 51, 3.0) - 0.5) * 0.55             # touceiras
            edge = 72 + 12 * ((y - 72) // 12)
            scal = edge + round(2 * abs(math.sin(x * 0.45 + (y - 72) // 12)))
            if y - edge < 3 and y <= scal + 1:
                v -= 0.35                                        # sombra da camada de cima
            if (y - 72) % 12 >= 10 and hsh(x, y, 5) < 0.5:
                v += 0.25                                        # franja clara
            i = max(0, min(4, int(v * 5)))
            sk.p(x, y, MOSS[i])
            if hsh(x, y, 9) < 0.03:
                sk.p(x, y, SICK[2])
    for x in range(6, 91, 3):                                    # raízes
        L_ = 1 + int(hsh(x, 5, 3) * 3)
        for j in range(L_):
            sk.p(x + (j % 2), 109 + j, BARK[1] if j == 0 else BARK[0])
    for (x, y) in ((16, 100), (78, 97), (30, 104), (64, 104)):
        shade(sk, rect(x, y, 2, 4), CREAM[:4], kind='cylx')
        sk.fill([p for p in ell(x + 0.5, y, 3.0, 1.8) if p[1] <= y], MUSH_RED[2])
        sk.p(x - 1, y - 1, MUSH_RED[4]); sk.p(x + 1, y - 1, WART[2])
    K.add(sk, dx=ldx, dy=dy, name='skirt')

    # tronco pálido com o rosto chorando bolor
    tr = K.new()
    trunk = ell(48.5, 60.5, 18.4, 20.4)
    shade(tr, trunk, FLESH)
    for (x, y) in trunk:
        if hsh(x, y, 17) < 0.05 and y > 64:
            tr.p(x, y, FLESH[1])
    for side, x0 in ((-1, 37), (1, 53)):
        for k in range(7):                                       # pálpebra fechada, ponta de dentro mais alta
            kk = k if side < 0 else 6 - k
            yy = 55 - round(kk * 0.34)
            tr.p(x0 + k, yy, (40, 30, 34))
            tr.p(x0 + k, yy + 1, FLESH[1])
            tr.p(x0 + k, yy - 4 - round(kk * 0.4), FLESH[1])     # cenho de dor
        tx = x0 + (2 if side < 0 else 4)
        for j in range(6 + (t + (x0 // 10)) % 3 + (3 if ph2 else 0)):
            tr.lit(tx + (j // 5) * side, 57 + j, SICK[3] if j == 0 else (SICK[2] if j % 2 else SICK[1]), 2 if j == 0 else 1)
    mouth = ell(48.5, 70, 5.5 + (1 if ph2 else 0), 3.4 + (t % 2) * 0.6)
    M = set(mouth)
    tr.fill(mouth, (18, 8, 14))
    for (x, y) in mouth:
        if (x, y - 1) not in M:
            tr.p(x, y, (86, 50, 98))                             # gengiva roxa
        if (x, y + 1) not in M:
            tr.p(x, y + 1, FLESH[1])                             # lábio de baixo
    tr.lit(48, 72, (40, 20, 40), 1, var=True)
    K.add(tr, dx=dx, dy=dy + b, name='trunk')

    # chapéu enorme em cúpula, verrugas, lamelas
    cp = K.new()
    cap = [p for p in ell(48.5, 38, 45.8, 30) if 7 <= p[1] <= 43]
    if ph2:
        bites = [(14, 45, 6), (70, 46, 5), (91, 37, 4)]
        cap = [(x, y) for (x, y) in cap if all((x - bx) ** 2 + (y - by) ** 2 > br * br for bx, by, br in bites)]
    shade(cp, cap, CAP_MB, box=(44, 30, 44, 22))
    for (x, y) in cap:
        if hsh(x, y, 31) < 0.04:
            cp.p(x, y, mul(cp.g(x, y), 0.88))
    for x in range(2, 95):
        if cp.g(x, 43) is not None:
            cp.p(x, 43, GILL[2] if x % 2 else CAP_MB[0])
            cp.p(x, 42, CAP_MB[1])
    for (x, y, big) in ((28, 18, True), (44, 12, True), (62, 16, True), (72, 26, True), (20, 30, True),
                        (54, 24, False), (38, 26, False), (80, 34, False), (12, 36, False), (32, 36, True),
                        (52, 34, True), (66, 37, False), (46, 40, False), (86, 39, False), (24, 40, False),
                        (58, 9, False), (36, 13, False)):
        wart(cp, x, y, big)
    if ph2:
        core_burst(cp, 58, 25, K, r=4, arms=6, length=12, seed=23)
    K.add(cp, dx=dx, dy=dy + b, name='cap')
    gl = K.new()
    for x in range(6, 92, 3):
        if (x + 1) % 6:
            gl.p(x, 44, GILL[1]); gl.p(x, 45, GILL[0])           # lamelas aparecendo
    K.add(gl, dx=dx, dy=dy + b)

    # névoa de esporos
    ms = K.new()
    spore_puff(ms, t, 10, 14, 76, 8, 4, rise=16)
    K.add(ms, dx=dx, dy=dy + b)
