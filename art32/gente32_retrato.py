"""Retratos 32-bit do prefeito e da prefeita (96×168, o dobro do 48×84 da 16-bit).

Busto de frente como na 16-bit: chapéu preto de aba larga com fita dourada e pena vermelha,
rosto (ele grisalho de bigode; ela de tranças compridas com contas douradas), camisa branca,
casaco verde-azulado com a corrente e o medalhão da vigília e a lanterninha no peito.
Montado por peças, cada uma com o seu contorno (ver gente32_base.Rig).
"""
from __future__ import annotations

import math

from gente32_base import (Canvas, Rig, OL, mix, mul, hsh, noise, ell, rect, trap, rows_of, stroke, bez,
                          shade, shade_cyl, SKIN, SKIN_DARK, TEAL, HAT, WHITE_HAIR, GOLD, BRASS, FIRE, RED,
                          LINEN, IRON, HAIR, EYE, WHITE, LIP, LIP_DARK)

PW, PH = 96, 168
CXP = 47.5          # centro do rosto e do corpo (x = 47 | 48)

SKIN6 = [(110, 64, 48), (150, 98, 72), (188, 132, 100), (216, 164, 126), (236, 194, 156), (248, 216, 184)]
SKIND6 = [(52, 30, 22), (80, 50, 34), (112, 72, 50), (140, 96, 66), (166, 118, 82), (190, 142, 104)]
LOCS = [(36, 22, 12), (62, 38, 20), (92, 58, 30), (122, 82, 44), (152, 108, 62)]
TEAL6 = [(12, 40, 44), (24, 70, 72), (38, 104, 104), (58, 138, 134), (88, 174, 166), (124, 204, 194)]
GREY6 = [(70, 74, 84), (104, 110, 120), (140, 146, 156), (172, 180, 188), (204, 210, 214), (234, 236, 236)]


def fill_rows(pts):
    return rows_of(pts)


def felt(c, pts, k=0.06, seed=0):
    """Textura de feltro/lã: variação suave de tom, sem pontilhado."""
    for (x, y) in pts:
        v = c.g(x, y)
        if v is not None:
            n = noise(x, y, seed, 3) - 0.5
            c.p(x, y, mul(v, 1 + n * k * 2))


# ── Chapéu ────────────────────────────────────────────────────────────────

def hat_crown(c):
    pts = []
    for y in range(9, 33):
        k = (y - 9) / 23
        a = round(32 - k * 2)
        b = round(66 + k * 3)
        if y == 9:
            a, b = 36, 62
        elif y == 10:
            a, b = 33, 65
        pts += [(x, y) for x in range(a, b + 1)]
    shade_cyl(c, pts, HAT, lit=0.22)
    felt(c, pts, 0.05, 3)
    rows = rows_of(pts)
    # vinco no topo e luz na borda de cima
    for x in range(38, 61):
        d = abs(x - 49)
        c.p(x, 9 + (1 if d < 8 else 0), HAT[3] if x < 49 else HAT[2])
        if d < 8:
            c.p(x, 11, HAT[1] if d < 6 else HAT[2])
    for y in range(12, 30):                                  # brilho do feltro
        a, b = rows[y]
        c.p(a + 5, y, HAT[4] if y < 22 else HAT[3])
        c.p(a + 6, y, HAT[3])
    for y in range(13, 30):                                  # lado direito na sombra
        a, b = rows[y]
        for x in range(b - 4, b + 1):
            c.p(x, y, HAT[0])
    return pts


def hat_band(c):
    for y in range(27, 33):
        k = (y - 27) / 5
        a, b = round(32 - (y - 9) / 23 * 2), round(66 + (y - 9) / 23 * 3)
        for x in range(a, b + 1):
            u = (x - a) / max(1, b - a)
            col = [GOLD[3], GOLD[3], GOLD[2], GOLD[2], GOLD[1], GOLD[0]][y - 27]
            if u > 0.7:
                col = mul(col, 0.78)
            c.p(x, y, col)
    for x in range(33, 69, 3):
        c.p(x, 29, GOLD[1])                                  # pesponto
    # fivela
    for y in range(26, 34):
        for x in range(39, 47):
            edge = x in (39, 46) or y in (26, 33)
            inner = x in (40, 45) or y in (27, 32)
            if edge:
                c.p(x, y, GOLD[1])
            elif inner:
                c.p(x, y, GOLD[4] if (x < 43 and y < 30) else GOLD[2])
            else:
                c.p(x, y, HAT[1])
    c.p(42, 29, GOLD[3]); c.p(43, 29, GOLD[3]); c.p(42, 30, GOLD[2]); c.p(43, 30, GOLD[2])


def hat_brim(c):
    pts = []
    cy = 38.5
    for y in range(32, 45):
        dy = (y - cy) / 6.2
        if abs(dy) > 1:
            continue
        hw = 37 * math.sqrt(1 - dy * dy)
        pts += [(x, y) for x in range(round(CXP - hw), round(CXP + hw) + 1)]
    for (x, y) in pts:
        u = (x - CXP) / 37
        if y <= 37:                         # face de cima da aba
            t = 0.75 - u * 0.6 - (y - 32) * 0.04
            col = HAT[4] if t > 1.05 else HAT[3] if t > 0.75 else HAT[2] if t > 0.35 else HAT[1]
        elif y == 38:                       # quina da aba (luz)
            col = HAT[4] if u < -0.3 else HAT[3] if u < 0.4 else HAT[2]
        elif y == 39:
            col = HAT[2] if u < 0.2 else HAT[1]
        else:                               # por baixo
            col = HAT[1] if y < 42 else HAT[0]
        c.p(x, y, col)
    felt(c, pts, 0.04, 5)
    for x in range(14, 22):                                  # pontas viradas para cima
        c.p(x, 37, HAT[3])
    return pts


def feather(c):
    path = bez((66, 31), (71, 19), (81, 7), 40)
    vane = []
    for i, (x, y) in enumerate(path):
        t = i / (len(path) - 1)
        w = 4.2 * math.sin(min(1.0, t * 1.15) * math.pi) + 0.6
        nx, ny = -0.82, -0.57                     # para o lado esquerdo-de-cima da haste
        for d in range(int(w * 2) + 1):
            s = d / 2
            vane.append((round(x + nx * s * 0.9), round(y + ny * s * 0.3 + s * 0.15)))
            vane.append((round(x - nx * s * 0.35), round(y - ny * s * 0.2)))
    vane = sorted(set(vane))
    shade(c, vane, RED, spec=True)
    for i, (x, y) in enumerate(path):          # barbas: riscos na diagonal
        if i % 3 == 0 and 4 < i < 38:
            for s in range(1, 4):
                c.p(round(x - s), round(y + s * 0.4), RED[1])
    for (x, y) in path:                        # haste clara
        c.p(round(x), round(y), RED[4] if y < 20 else RED[3])
    c.p(81, 7, RED[2])


# ── Rosto ─────────────────────────────────────────────────────────────────

def face_shape():
    pts = []
    for y in range(40, 77):
        t = (y - 40) / 36
        if t < 0.55:
            hw = 17.5
        else:
            k = (t - 0.55) / 0.45
            hw = 17.5 - 9.5 * k ** 1.6
        if y == 76:
            hw = 6
        pts += [(x, y) for x in range(round(CXP - hw + 0.5), round(CXP + hw - 0.5) + 1)]
    return pts


def eye(c, x0, y0, sk, iris, side, old=False, lashes=False):
    """Olho de 7×5: pálpebra de cima, branco, íris 2×3 com pupila e brilho, pálpebra de baixo."""
    lid = mix(sk[0], OL, 0.5)
    for x in range(x0 + 1, x0 + 6):
        c.p(x, y0, lid)
    c.p(x0, y0 + 1, lid); c.p(x0 + 6, y0 + 1, mix(sk[1], OL, 0.2))
    for y in (y0 + 1, y0 + 2, y0 + 3):
        for x in range(x0 + 1, x0 + 6):
            c.p(x, y, WHITE if y < y0 + 3 else mix(WHITE, sk[2], 0.4))
    c.p(x0 + 1, y0 + 1, mix(WHITE, sk[1], 0.45))           # canto na sombra
    ix = x0 + 3
    for dy in (1, 2, 3):
        c.p(ix, y0 + dy, iris[1]); c.p(ix + 1, y0 + dy, iris[0])
    c.p(ix, y0 + 2, EYE); c.p(ix + 1, y0 + 2, EYE); c.p(ix + 1, y0 + 1, EYE)
    c.p(ix, y0 + 1, WHITE)                                  # brilho
    for x in range(x0 + 1, x0 + 6):
        c.p(x, y0 + 4, sk[2])
    c.p(x0 + 1, y0 + 4, sk[1]); c.p(x0 + 5, y0 + 4, sk[1])
    for x in range(x0 + 1, x0 + 6):                        # dobra da pálpebra
        c.p(x, y0 - 1, sk[2] if not old else sk[1])
    if old:
        for x in range(x0 + 1, x0 + 5):                    # bolsa sob o olho
            c.p(x, y0 + 6, sk[2])
        c.p(x0 + 2, y0 + 5, sk[3])
        out = x0 - 1 if side == 'l' else x0 + 7
        d = -1 if side == 'l' else 1
        c.p(out, y0 + 3, sk[2]); c.p(out + d, y0 + 2, sk[2]); c.p(out + d, y0 + 4, sk[2])   # pés de galinha
    if lashes:
        out = x0 if side == 'l' else x0 + 6
        d = -1 if side == 'l' else 1
        c.p(out, y0, EYE); c.p(out + d, y0 - 1, EYE); c.p(out, y0 + 1, EYE)
        for x in range(x0 + 1, x0 + 6):
            c.p(x, y0, mix(EYE, lid, 0.3))


def head(c, g):
    sk = SKIN6 if g == 'm' else SKIND6
    # orelhas
    for (ex, s) in ((29, -1), (66, 1)):
        pts = ell(ex, 58, 2.6, 5)
        shade(c, pts, sk, spec=False)
        for y in range(55, 62):
            c.p(ex + s * 0, y, sk[1])
    pts = face_shape()
    shade(c, pts, sk, spec=False, bias=0.12, box=(28, 36, 67, 78))
    rows = rows_of(pts)
    # sombra da aba na testa
    for y in range(40, 48):
        a, b = rows[y]
        for x in range(a, b + 1):
            v = c.g(x, y)
            c.p(x, y, mul(v, 0.62 if y < 44 else 0.8 if y < 46 else 0.9))
    # maçãs e queixo
    for (x, y) in ell(38.5, 62, 3.5, 2.2) + ell(57.5, 62, 3.5, 2.2):
        v = c.g(x, y)
        if v:
            c.p(x, y, mix(v, (200, 90, 80) if g == 'm' else (150, 70, 60), 0.22))
    for x in range(44, 52):
        c.p(x, 75, sk[1])
    c.p(47, 73, sk[3]); c.p(48, 73, sk[3])
    # sobrancelhas
    brow = GREY6 if g == 'm' else [mix(c_, (0, 0, 0), 0.3) for c_ in LOCS]
    for (x0, s) in ((34, 1), (54, -1)):
        for i in range(9):
            x = x0 + i
            y = 50 - (1 if 2 <= i <= 6 else 0) + (1 if (s > 0 and i == 0) or (s < 0 and i == 8) else 0)
            c.p(x, y, brow[3] if i < 5 else brow[2])
            if g == 'm':
                c.p(x, y + 1, brow[1] if i % 2 else brow[2])
                if i in (1, 4, 7):
                    c.p(x, y - 1, brow[2])
    iris = [(46, 54, 70), (78, 92, 112)] if g == 'm' else [(34, 20, 14), (70, 44, 28)]
    eye(c, 35, 52, sk, iris, 'l', old=(g == 'm'), lashes=(g == 'f'))
    eye(c, 55, 52, sk, iris, 'r', old=(g == 'm'), lashes=(g == 'f'))
    # nariz: dorso aceso, lado direito na sombra, ponta, asas e narinas
    for y in range(53, 62):
        c.p(46, y, sk[4] if y < 59 else sk[3])
        c.p(49, y, sk[2]); c.p(50, y, sk[2] if y < 57 else sk[1])
    for y in range(57, 62):
        c.p(51, y, sk[2])
    for (x, y) in ((44, 61), (45, 62), (44, 62)):
        c.p(x, y, sk[2])
    for x in range(45, 51):
        c.p(x, 62, sk[3] if x < 49 else sk[2])
    c.p(46, 61, sk[5] if g == 'm' else sk[4]); c.p(47, 61, sk[4])
    for (x, y) in ((44, 63), (45, 64), (46, 64), (49, 64), (50, 64), (51, 63)):
        c.p(x, y, sk[1])
    c.p(45, 63, sk[0]); c.p(50, 63, sk[0]); c.p(47, 63, sk[2]); c.p(48, 63, sk[2])
    if g == 'm':
        c.p(48, 62, mix(sk[3], (210, 100, 90), 0.3)); c.p(47, 62, mix(sk[3], (210, 100, 90), 0.25))
        # sulcos do rosto
        for (x, y) in ((42, 64), (41, 66), (40, 68), (53, 64), (54, 66), (55, 68)):
            c.p(x, y, sk[2])
        for x in range(40, 56, 2):                             # ruga da testa
            c.p(x, 47, mul(sk[2], 0.85))
    # boca
    my = 71
    if g == 'm':
        for x in range(44, 52):
            c.p(x, my, mix(LIP_DARK, sk[0], 0.3))
        for x in range(45, 51):
            c.p(x, my + 1, mix(LIP, sk[1], 0.6))
        for x in range(45, 51):
            c.p(x, my + 2, sk[3])
    else:
        for x in range(43, 53):
            c.p(x, my - 1, LIP if 44 <= x <= 51 else sk[1])
        c.p(47, my - 2, LIP); c.p(48, my - 2, LIP); c.p(45, my - 2, LIP); c.p(50, my - 2, LIP)
        for x in range(43, 53):
            c.p(x, my, LIP_DARK if 44 <= x <= 51 else sk[0])
        for x in range(44, 52):
            c.p(x, my + 1, mix(LIP, WHITE, 0.15) if 46 <= x <= 49 else LIP)
        for x in range(45, 51):
            c.p(x, my + 2, mix(LIP, sk[1], 0.5))
        c.p(46, my + 1, mix(LIP, WHITE, 0.4))


def grey_hair(c):
    """Cabelo grisalho do prefeito: laterais em mechas e franja curta sob a aba."""
    for (x0, x1, s) in ((26, 34, 1), (62, 70, -1)):
        pts = []
        for y in range(42, 66):
            t = (y - 42) / 23
            a, b = x0, x1
            if s > 0:
                b = round(x1 - t * 4)
                a = round(x0 + t * 3)
            else:
                a = round(x0 + t * 4)
                b = round(x1 - t * 3)
            pts += [(x, y) for x in range(a, b + 1)]
        shade(c, pts, GREY6, spec=True, box=(x0 - 4, 38, x1 + 4, 68))
        rows = rows_of(pts)
        for (x, y) in pts:
            ph = (x * 0.9 + y * 0.35 * s) / 2.6
            f = ph - math.floor(ph)
            if f < 0.28:
                c.p(x, y, GREY6[1] if (s < 0 or x > (rows[y][0] + rows[y][1]) / 2) else GREY6[2])
            elif f < 0.42:
                c.p(x, y, GREY6[4] if s > 0 else GREY6[3])
        for y in range(62, 66):                                 # pontas
            a, b = rows[y]
            for x in range(a, b + 1):
                if hsh(x, y, 4) < 0.45:
                    c.p(x, y, None)
    for x in range(33, 63):                                     # franja sob a aba
        h = 2 + round(hsh(x // 2, 0, 9) * 2)
        for y in range(43, 43 + h):
            c.p(x, y, GREY6[2] if (x + y) % 3 else GREY6[1])


def mustache(c):
    """Bigodão grisalho: cheio sob o nariz, pontas caídas até o canto da boca."""
    pts = []
    for y in range(64, 71):
        t = (y - 64) / 6
        hw = 5 + t * 7.5
        for x in range(round(CXP - hw), round(CXP + hw) + 1):
            d = abs(x - CXP)
            if y == 64 and d > 5:
                continue
            pts.append((x, y))
    for (x0, s_) in ((35, 1), (60, -1)):                       # pontas
        for y in range(70, 74):
            for d in range(2):
                pts.append((x0 + s_ * (y - 70) // 2 + s_ * d, y))
    pts = sorted(set(pts))
    shade(c, pts, GREY6, spec=True, box=(33, 62, 62, 74))
    for (x, y) in pts:                                          # fios penteados para fora
        s_ = 1 if x > CXP else -1
        ph = (x - CXP - s_ * (y - 63) * 1.4) / 2.2
        if (ph - math.floor(ph)) < 0.3:
            c.p(x, y, GREY6[1] if s_ > 0 else GREY6[2])
    for x in range(44, 52):                                     # sombra sobre a boca
        c.p(x, 70, GREY6[1] if x > 47 else GREY6[2])
    c.p(47, 64, GREY6[3]); c.p(48, 64, GREY6[3])


def locs(c):
    """Tranças (dreads) da prefeita, com contas douradas, caindo na frente dos ombros."""
    for side, xs in (('l', (21, 25, 29)), ('r', (63, 67, 71))):
        for i, x0 in enumerate(xs):
            bottom = 108 + (i * 3 if side == 'l' else (2 - i) * 3) - (4 if i == 1 else 0)
            top = 42
            for y in range(top, bottom + 1):
                wob = round(math.sin(y * 0.16 + i * 1.3 + (0 if side == 'l' else 2)) * 0.8)
                drift = 0
                if side == 'l':
                    drift = -round(max(0, y - 70) * 0.12 * (2 - i))
                else:
                    drift = round(max(0, y - 70) * 0.12 * i)
                x = x0 + wob + drift
                for d in range(4):
                    seg = (y + i * 2) % 5
                    if seg == 0:
                        col = LOCS[0] if d in (0, 3) else LOCS[1]
                    else:
                        col = [LOCS[2], LOCS[4], LOCS[3], LOCS[1]][d] if seg in (1, 2) else [LOCS[2], LOCS[3], LOCS[2], LOCS[1]][d]
                    c.p(x + d, y, col)
            # contas douradas
            for by in (64 + i * 7, 88 + i * 5):
                if by > bottom - 3:
                    continue
                wob = round(math.sin(by * 0.16 + i * 1.3 + (0 if side == 'l' else 2)) * 0.8)
                drift = -round(max(0, by - 70) * 0.12 * (2 - i)) if side == 'l' else round(max(0, by - 70) * 0.12 * i)
                bx = x0 + wob + drift
                for yy in range(by, by + 3):
                    for d in range(-1, 5):
                        col = GOLD[3] if d < 1 else GOLD[2] if d < 3 else GOLD[1]
                        if yy == by + 2:
                            col = GOLD[0] if d > 0 else GOLD[1]
                        c.p(bx + d, yy, col)
                c.p(bx, by, GOLD[4])
    for x in range(33, 63):                                     # risca e raízes sob a aba
        c.p(x, 43, LOCS[1] if x % 4 else LOCS[0])
        c.p(x, 44, LOCS[2] if (x // 4) % 2 else LOCS[1])


def hair_back_f(c):
    pts = [(x, y) for y in range(40, 82) for x in range(24, 72) if y < 66 or x < 39 or x > 56]
    shade(c, pts, LOCS[:3], spec=False)


# ── Corpo ─────────────────────────────────────────────────────────────────

def coat(c, g):
    pts = []
    for y in range(84, PH):
        t = min(1.0, (y - 84) / 18)
        hw = 11 + (35.5 - 11) * math.sqrt(t) if y < 102 else 46
        if y < 102:
            hw = min(46, 11 + 35 * (1 - (1 - t) ** 2.2))
        pts += [(x, y) for x in range(max(2, round(CXP - hw)), min(93, round(CXP + hw)) + 1)]
    for (x, y) in pts:
        u = (x - CXP) / 46
        v = 0.95 - u * 1.25 - max(0, (y - 140) / 120)
        # ombros mais acesos
        if y < 104:
            v += 0.25 * (1 - (y - 84) / 20)
        i = max(0, min(5, int(v * 3.0 + 1.1)))
        c.p(x, y, TEAL6[i])
    felt(c, pts, 0.035, 11)
    rows = rows_of(pts)
    # costuras da manga e vincos de pano
    for y in range(104, PH):
        k = (y - 104) / 64
        for (x, col) in ((round(16 + k * 1), TEAL6[2]), (round(79 - k * 1), TEAL6[0])):
            c.p(x, y, col)
            c.p(x + (1 if x < 48 else -1), y, TEAL6[4] if x < 48 else TEAL6[2])
    for (x0, y0, x1, y1) in ((20, 104, 30, 120), (22, 104, 33, 126), (76, 104, 66, 122), (73, 104, 64, 128)):
        for i in range(12):
            t = i / 11
            x = round(x0 + (x1 - x0) * t)
            y = round(y0 + (y1 - y0) * t)
            c.p(x, y, TEAL6[2] if x < 48 else TEAL6[0])
    # lapelas: abertas em V até o medalhão
    for y in range(86, 112):
        t = (y - 86) / 25
        lx = round(40 - t * 0 + t * 4)
        rx = round(55 - t * 4)
        for x in range(lx - 6 + round(t * 4), lx + 1):
            c.p(x, y, TEAL6[5] if x == lx else TEAL6[4])
        for x in range(rx, rx + 7 - round(t * 4)):
            c.p(x, y, TEAL6[1] if x == rx else TEAL6[2])
        c.p(lx + 1, y, TEAL6[1]); c.p(rx - 1, y, TEAL6[0])
    # frente fechada abaixo: debrum dourado e botões
    for y in range(112, PH):
        for x in (44, 51):
            c.p(x, y, GOLD[2] if x == 44 else GOLD[1])
        c.p(45, y, TEAL6[3]); c.p(50, y, TEAL6[1])
        for x in range(46, 50):
            c.p(x, y, TEAL6[2])
    for by in (132, 148, 164):
        for (x, y) in ell(47.5, by, 2.4, 2.2):
            c.p(x, y, GOLD[3] if (x < 48 and y < by) else GOLD[2] if x < 49 else GOLD[1])
        c.p(46, by - 1, GOLD[4])
        c.p(47, by + 2, GOLD[0]); c.p(48, by + 2, GOLD[0])
    # bolso com aba do lado esquerdo
    for x in range(20, 34):
        c.p(x, 140, TEAL6[1]); c.p(x, 139, TEAL6[4])
    for x in range(20, 34):
        c.p(x, 141, TEAL6[2])
    c.p(26, 142, GOLD[2]); c.p(27, 142, GOLD[1])


def shirt(c, g):
    """Camisa branca de gola alta e o lenço do pescoço."""
    pts = trap(84, 111, 40, 55, 44, 51)
    shade(c, pts, LINEN, spec=True, box=(38, 82, 57, 112))
    for y in range(86, 111, 3):                                 # pregas
        c.p(47, y, LINEN[1]); c.p(48, y + 1, LINEN[2])
    # pontas da gola
    for (pts2, pal) in (([(x, y) for y in range(81, 93) for x in range(39, 47) if x - 39 >= (y - 81) * 0.7], LINEN),
                        ([(x, y) for y in range(81, 93) for x in range(49, 57) if 56 - x >= (y - 81) * 0.7], LINEN)):
        shade(c, pts2, pal, spec=True)
    if g == 'f':
        for y in range(92, 104):                               # jabô
            w = 3 + (y - 92) // 3
            for x in range(round(CXP - w), round(CXP + w) + 1):
                c.p(x, y, LINEN[3] if (x + y) % 4 else LINEN[1])


def neck(c, g):
    sk = SKIN6 if g == 'm' else SKIND6
    pts = trap(70, 92, 39, 56, 38, 57)
    shade(c, pts, sk, spec=False, box=(34, 66, 61, 96))
    for y in range(70, 80):                                     # sombra do queixo
        for x in range(40, 56):
            v = c.g(x, y)
            if v:
                c.p(x, y, mul(v, 0.72 if y < 76 else 0.86))
    if g == 'm':
        c.p(47, 82, sk[3]); c.p(48, 82, sk[3]); c.p(47, 83, sk[2])


def chain_medal(c):
    """Corrente de elos e o medalhão da vigília com a brasa no meio."""
    for path in (bez((26, 92), (32, 108), (44, 111), 40), bez((69, 92), (63, 108), (51, 111), 40)):
        for i, (x, y) in enumerate(path):
            k = i % 4
            if k in (0, 1):
                c.p(round(x), round(y), GOLD[3] if k == 0 else GOLD[2])
                c.p(round(x), round(y) + 1, GOLD[1])
            elif k == 2:
                c.p(round(x), round(y), GOLD[1])
    cx, cy = 47.5, 118
    disk = ell(cx, cy, 7.6, 7.6)
    shade(c, disk, GOLD, spec=True)
    for (x, y) in disk:
        d = math.hypot(x - cx, y - cy)
        if d > 6.6:
            c.p(x, y, GOLD[1] if (x - cx) + (y - cy) > 0 else GOLD[3])
        elif 4.4 < d <= 5.4:
            c.p(x, y, GOLD[1] if (x - cx) + (y - cy) < 0 else GOLD[3])
    # raios gravados
    for a in range(8):
        ang = a * math.pi / 4
        x, y = cx + math.cos(ang) * 5.9, cy + math.sin(ang) * 5.9
        c.p(round(x), round(y), GOLD[0])
    # brasa / chama no centro
    for (x, y) in ell(cx, cy + 0.5, 3, 3.2):
        d = math.hypot(x - cx, (y - cy - 0.5) * 0.9)
        c.p(x, y, FIRE[4] if d < 1 else FIRE[3] if d < 2 else FIRE[1])
    c.p(47, 115, FIRE[3]); c.p(48, 114, FIRE[2]); c.p(48, 113, GOLD[3])
    # argola
    for (x, y) in ((46, 110), (47, 109), (48, 109), (49, 110), (46, 111), (49, 111)):
        c.p(x, y, GOLD[2])


def lantern_badge(c):
    """A lanterninha pendurada no peito, presa por um cordão."""
    for y in range(116, 129):
        c.p(82, y, TEAL6[0] if y % 2 else mix(TEAL6[0], OL, 0.4))
    cx = 82.5
    # alça
    for (x, y) in ((80, 129), (81, 128), (82, 127), (83, 127), (84, 128), (85, 129)):
        c.p(x, y, IRON[2])
    # tampa
    cap = trap(130, 134, 79, 86, 75, 90)
    shade(c, cap, IRON, spec=True)
    for x in range(75, 91):
        c.p(x, 134, BRASS[1])
    # vidro com a chama
    for y in range(135, 152):
        for x in range(75, 91):
            post = x in (75, 76, 89, 90) or x in (82, 83)
            if post:
                c.p(x, y, IRON[1] if x > 83 else IRON[3] if x in (75, 82) else IRON[2])
                continue
            d = math.hypot((x - cx) / 6.2, (y - 143.5) / 8.5)
            c.p(x, y, FIRE[3] if d < 0.45 else FIRE[2] if d < 0.8 else FIRE[1])
    for y in range(139, 148):                                   # chama
        w = 2.4 * math.sin((y - 139) / 9 * math.pi * 0.9)
        for x in range(round(cx - w), round(cx + w) + 1):
            if x in (82, 83) and y < 143:
                c.p(x, y, FIRE[4])
            elif x in (82, 83):
                c.p(x, y, FIRE[4] if y < 146 else FIRE[3])
    for (x, y) in ((77, 136), (77, 137), (78, 136), (86, 136)):
        c.p(x, y, FIRE[4])                                      # reflexo
    # base
    base = rect(75, 152, 16, 5)
    shade(c, base, IRON, spec=False)
    for x in range(75, 91):
        c.p(x, 152, BRASS[2] if x < 84 else BRASS[1])
        c.p(x, 156, IRON[0])
    c.p(76, 153, IRON[4])


def portrait(g):
    R = Rig(PW, PH)
    R.part(lambda c: coat(c, g))
    R.part(lambda c: neck(c, g))
    R.part(lambda c: shirt(c, g))
    R.part(chain_medal)
    R.part(lantern_badge)
    if g == 'f':
        R.part(hair_back_f, ring=None)
    R.part(lambda c: head(c, g))
    if g == 'm':
        R.part(grey_hair)
        R.part(mustache)
    else:
        def p_ear(c):
            for ex in (30, 65):
                for (x, y) in ell(ex, 66, 1.6, 1.8):
                    c.p(x, y, GOLD[3] if y < 66 else GOLD[1])
                c.p(ex, 66, None) if False else None
        R.part(locs)
        R.part(p_ear)
    R.part(hat_crown)
    R.part(hat_band, ring=None)
    R.part(feather)
    R.part(hat_brim)
    return R.build()
