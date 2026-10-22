"""Gente 32-bit do Vigília: o prefeito (8 quadros), os moradores por ofício e gênero
(3 quadros) e as crianças (3 quadros), montados por peças como os heróis do hd24.

Enquadramento igual ao da 16-bit ampliada: os adultos ficam centrados em x = 26 (o
16-bit é centrado em x = 13 do quadro de 24), pé no fundo (contorno em y = 61).
"""
from __future__ import annotations

import math

from gente32_base import (Canvas, Rig, OL, mix, mul, hsh, noise, ell, rect, trap, rows_of, stroke, bez,
                          shade, shade_cyl, edge, SKIN, SKIN_DARK, TEAL, HAT, CHAR, WHITE_HAIR, GOLD, BRASS,
                          FIRE, RED, BOOT, LEATHER, TROUSER, GREEN, STRAW, BLUE, LINEN, SCARF, PURPLE, ROPE,
                          IRON, GAMBESON, WOOD, WAX, HAIR, EYE, WHITE, LIP, LIP_DARK)

W, H = 48, 64
AX = 51          # espelho dos adultos: x' = AX - x (centro em 26,0)
CX = 25.5        # centro para elipses


def mx(x):
    return AX - x


# ── Peças comuns ──────────────────────────────────────────────────────────

def boot(c, x0, y0, pal, w=8, h=5, toe=0):
    """Bota de frente: cano, peito do pé arredondado, sola escura e brilho no bico."""
    pts = []
    for y in range(y0, y0 + h):
        k = y - y0
        a, b = x0, x0 + w - 1
        if k == 0:
            a, b = x0 + 1, x0 + w - 2
        pts += [(x, y) for x in range(a, b + 1)]
    shade(c, pts, pal, spec=False, bias=0.1)
    for x in range(x0, x0 + w):
        c.p(x, y0 + h - 1, pal[0])                       # sola
    c.p(x0 + 1, y0 + h - 3, pal[3])                      # brilho do bico
    c.p(x0 + 2, y0 + h - 3, pal[3])
    c.p(x0 + 2, y0 + h - 4, pal[2])
    for x in range(x0 + 1, x0 + w - 1):                  # dobra do cano
        c.p(x, y0 + 1, pal[1] if x > x0 + 2 else pal[2])


def leg(c, x0, top, bottom, pal, w=6, crease=True):
    pts = rect(x0, top, w, bottom - top + 1)
    shade_cyl(c, pts, pal, lit=0.3, spec=False)
    if crease and bottom - top > 5:
        ky = top + (bottom - top) * 2 // 3
        c.p(x0 + w - 2, ky, pal[0])
        c.p(x0 + w - 3, ky + 1, pal[1])


def legs(c, lift=(0, 0), pal=CHAR, bpal=BOOT, top=48, foot=60, x0s=(18, 28), bh=5, bw=8):
    for x0, up in zip(x0s, lift):
        by = foot - bh + 1 - up
        leg(c, x0, top, by, pal)
        boot(c, x0 - 1, by, bpal, w=bw, h=bh)


HAND_L = [
    ".3443.",
    "234432",
    "233321",
    "232121",
    ".2121.",
]


def hand(c, cx, cy, skin, side='l', grip=False):
    """Mão fechada de frente (6×5): dorso aceso, nós dos dedos e o polegar para dentro."""
    x0, y0 = round(cx - 2.5), round(cy - 2)
    for j, row in enumerate(HAND_L):
        for i, ch in enumerate(row):
            if ch == '.':
                continue
            xx = x0 + (i if side == 'l' else 5 - i)
            k = int(ch)
            if side == 'r':
                k = max(1, k - (1 if i >= 3 else 0))
            c.p(xx, y0 + j, skin[min(k, len(skin) - 1)])


def sleeve(c, x0, top, bottom, pal, w=7, cuff=None, cuff_h=3, elbow=True):
    pts = rect(x0, top, w, bottom - top + 1)
    shade_cyl(c, pts, pal, lit=0.3)
    # ombro arredondado
    for x in (x0, x0 + w - 1):
        c.p(x, top, None)
    if elbow:
        ey = top + (bottom - top) // 2
        c.p(x0 + 2, ey, pal[1]); c.p(x0 + 3, ey, pal[1]); c.p(x0 + 4, ey + 1, pal[1])
        c.p(x0 + 1, ey + 1, pal[3] if len(pal) > 3 else pal[2])
    if cuff:
        cy0 = bottom - cuff_h + 1
        shade(c, rect(x0, cy0, w, cuff_h), cuff, spec=True, bias=0.05)
        for x in range(x0, x0 + w):
            c.p(x, cy0, cuff[-2])
            c.p(x, bottom, cuff[1])


def face(c, top, skin, cx=CX, rx=7.0, ry=7.5, ey_off=8, eyes='r', brows=None, mouth='plain',
         blush=False, nose='small', lashes=False, ears=True):
    """Rosto de frente (14 px): crânio sombreado, orelhas, olhos, sobrancelhas, nariz e boca."""
    cy = top + ry
    if ears:
        for ex in (round(cx - rx) - 1, round(cx + rx) + 1):
            pts = ell(ex, top + ey_off + 1, 1.2, 2.2)
            shade(c, pts, skin, spec=False)
            c.p(ex, top + ey_off + 1, skin[1])
    pts = ell(cx, cy, rx, ry)
    shade(c, pts, skin, spec=False, bias=0.12)
    ey = top + ey_off
    lx, rxe = round(cx - 4.5), round(cx + 3.5)       # pares de olhos: (lx, lx+1) e (rxe, rxe+1)
    # órbitas levemente sombreadas
    for x in (lx, lx + 1, rxe, rxe + 1):
        c.p(x, ey - 1, skin[1])
    for x0 in (lx, rxe):
        if eyes == 'r':          # olhando um pouco para a direita
            c.p(x0, ey, WHITE); c.p(x0 + 1, ey, EYE)
        elif eyes == 'l':
            c.p(x0, ey, EYE); c.p(x0 + 1, ey, WHITE)
        elif eyes == 'closed':
            c.p(x0, ey, skin[0]); c.p(x0 + 1, ey, skin[0])
        else:                    # de frente: pupila para dentro
            inner = x0 + 1 if x0 == lx else x0
            outer = x0 if x0 == lx else x0 + 1
            c.p(inner, ey, EYE); c.p(outer, ey, WHITE)
        c.p(x0, ey + 1, skin[2])
        c.p(x0 + 1, ey + 1, skin[2])
    if lashes:
        c.p(lx - 1, ey - 1, EYE); c.p(rxe + 2, ey - 1, EYE)
    if brows:
        for (x0, d) in ((lx - 1, 1), (rxe, -1)):
            for i in range(3):
                c.p(x0 + i, ey - 2 - (1 if (i == 1) else 0) * 0, brows)
    # nariz: luz à esquerda, sombra à direita e na base
    nx = round(cx)
    if nose == 'big':
        c.p(nx - 1, ey + 1, skin[3]); c.p(nx, ey + 1, skin[2])
        c.p(nx - 1, ey + 2, skin[3]); c.p(nx, ey + 2, skin[1]); c.p(nx + 1, ey + 2, skin[1])
        c.p(nx - 1, ey + 3, skin[1]); c.p(nx, ey + 3, mix(skin[2], RED[3], 0.35)); c.p(nx + 1, ey + 3, skin[0])
    else:
        c.p(nx, ey + 1, skin[1]); c.p(nx, ey + 2, skin[1])
        c.p(nx - 1, ey + 2, skin[3])
        c.p(nx - 1, ey + 3, skin[1]); c.p(nx, ey + 3, skin[0])
    my = ey + 5
    if mouth == 'plain':
        for x in range(nx - 2, nx + 2):
            c.p(x, my, LIP_DARK if x in (nx - 1, nx) else skin[1])
        c.p(nx - 1, my + 1, skin[3]); c.p(nx, my + 1, skin[3])
    elif mouth == 'lips':
        for x in range(nx - 2, nx + 2):
            c.p(x, my, LIP_DARK if x in (nx - 1, nx) else LIP)
        c.p(nx - 1, my + 1, LIP); c.p(nx, my + 1, mix(LIP, WHITE, 0.25))
    elif mouth == 'smile':
        c.p(nx - 2, my - 1, skin[1]); c.p(nx + 1, my - 1, skin[1])
        for x in range(nx - 1, nx + 1):
            c.p(x, my, LIP_DARK)
    if blush:
        c.p(lx - 1, ey + 2, mix(skin[2], RED[3], 0.4)); c.p(rxe + 2, ey + 2, mix(skin[2], RED[3], 0.4))
    return ey


def neck(c, top, bottom, skin, cx=CX, rx=3.0):
    pts = rect(round(cx - rx), top, round(2 * rx) + 1, bottom - top + 1)
    shade(c, pts, skin, spec=False)
    for x in range(round(cx - rx), round(cx + rx) + 1):
        c.p(x, top, skin[0])


def folds(c, pts, pal, period=5, seed=0, y_from=None, amp=0.0):
    """Dobras de pano: vincos escuros com a borda acesa ao lado, que abrem para baixo."""
    rows = rows_of(pts)
    ys = sorted(rows)
    if not ys:
        return
    y0 = y_from if y_from is not None else ys[0]
    for (x, y) in pts:
        if y < y0:
            continue
        a, b = rows[y]
        k = (y - y0) / max(1, ys[-1] - y0)
        u = (x - (a + b) / 2) / max(1, (b - a) / 2)          # -1..1
        ph = (x + amp * math.sin(y * 0.3 + seed) * k) / period
        f = ph - math.floor(ph)
        if f < 0.18 and hsh(int(math.floor(ph)), 0, seed) > 0.15 and k > 0.12:
            v = c.g(x, y)
            if v is not None:
                c.p(x, y, pal[0] if u > 0.2 else pal[1])
        elif 0.18 <= f < 0.34 and k > 0.25:
            v = c.g(x, y)
            if v is not None and u < 0.6:
                c.p(x, y, pal[min(len(pal) - 1, 3)] if u < -0.3 else pal[2])


# ── Prefeito ──────────────────────────────────────────────────────────────

def mayor_frame(g, idle_t=None, run_k=None):
    """Quadro do prefeito (g='m' de barba branca; g='f' de cabelo preto e jabô)."""
    skin = SKIN if g == 'm' else SKIN_DARK
    lift = (0, 0)
    bob = 0
    hand_dy = (0, 0)
    sway = 0
    t = 0
    if idle_t is not None:
        t = idle_t
        bob = [0, 0, 1, 1][t]
    else:
        k = run_k
        t = k
        if k == 0:
            lift, hand_dy, sway = (4, 0), (2, -2), 1
        elif k == 2:
            lift, hand_dy, sway = (0, 4), (-2, 2), -1
        else:
            bob = -2
    R = Rig(W, H)

    # pernas: calça escura e botas
    def p_legs(c):
        legs(c, lift=lift, pal=CHAR, bpal=BOOT, top=46, foot=60, x0s=(19, 27), bh=5, bw=8)
    R.part(p_legs)

    # casaco
    def p_coat(c):
        mayor_coat(c, g, sway)
    R.part(p_coat, 0, bob)

    # lanterna (por baixo da mão direita, que segura a alça)
    def p_lantern(c):
        lantern(c, 38 + (1 if sway < 0 else 0), 42 + hand_dy[1], t)
    R.part(p_lantern, 0, bob)

    # braços
    def p_arm_l(c):
        sleeve(c, 13, 27, 39 + hand_dy[0] // 2, TEAL, w=7, cuff=GOLD, cuff_h=3)
        hand(c, 16.2, 42 + hand_dy[0], skin, 'l')
    R.part(p_arm_l, 0, bob)

    def p_arm_r(c):
        sleeve(c, 32, 27, 39 + hand_dy[1] // 2, TEAL, w=7, cuff=GOLD, cuff_h=3)
        hand(c, 35.5, 42 + hand_dy[1], skin, 'r')
    R.part(p_arm_r, 0, bob)

    def p_head(c):
        mayor_head(c, g, skin)
    R.part(p_head, 0, bob)

    def p_hat(c):
        mayor_hat(c)
    R.part(p_hat, 0, bob)
    return R.build()


def lantern(c, cx, top, t):
    """Lanterna de latão pendurada pela alça: alça, tampa, vidro aceso, base."""
    # alça
    for (x, y) in ((cx - 1, top), (cx, top - 1), (cx + 1, top - 1), (cx + 2, top)):
        c.p(x, y, BRASS[1])
    c.p(cx - 1, top + 1, BRASS[1]); c.p(cx + 2, top + 1, BRASS[0])
    # tampa
    cap = trap(top + 2, top + 4, cx - 1, cx + 1, cx - 3, cx + 3)
    shade(c, cap, BRASS, spec=True)
    c.p(cx - 1, top + 2, BRASS[3]); c.p(cx, top + 2, BRASS[2])
    for x in range(cx - 3, cx + 4):
        c.p(x, top + 4, BRASS[0] if x > cx else BRASS[1])
    # corpo de vidro com a chama
    gy0, gy1 = top + 5, top + 11
    flick = [0, 1, 0, -1][t % 4]
    for y in range(gy0, gy1 + 1):
        for x in range(cx - 2, cx + 3):
            d = math.hypot((x - cx) / 2.2, (y - (gy0 + gy1) / 2 - 0.8) / 3.0)
            col = FIRE[3] if d < 0.45 else FIRE[2] if d < 0.85 else FIRE[1]
            c.p(x, y, col)
    fx = cx + (1 if flick > 0 else 0)
    c.p(fx, gy0 + 2, FIRE[4]); c.p(cx, gy0 + 3, FIRE[4]); c.p(cx, gy0 + 4, FIRE[4])
    c.p(cx, gy1 - 1, BRASS[0]); c.p(cx, gy1 - 2, FIRE[1])          # pavio
    for y in range(gy0, gy1 + 1):                       # montantes
        c.p(cx - 3, y, BRASS[2]); c.p(cx + 3, y, BRASS[0])
    c.p(cx - 2, gy0, FIRE[4]); c.p(cx - 2, gy0 + 1, FIRE[4])        # reflexo no vidro
    # base
    base = rect(cx - 3, gy1 + 1, 7, 2)
    shade(c, base, BRASS, spec=False)
    for x in range(cx - 3, cx + 4):
        c.p(x, gy1 + 2, BRASS[0])
    c.p(cx - 2, gy1 + 1, BRASS[3])


def mayor_coat(c, g, sway):
    # gola/pescoço
    neck(c, 23, 27, SKIN if g == 'm' else SKIN_DARK)
    body = trap(26, 40, 16, 35, 16, 35) + trap(41, 51, 16, 35, 15 + sway, 36 + sway)
    shade(c, body, TEAL, spec=False, box=(13, 24, 38, 52))
    rows = rows_of(body)
    # dobras na aba do casaco
    for x0 in (19, 31):
        for y in range(44, 52):
            xx = x0 + (sway if y > 47 else 0)
            c.p(xx, y, TEAL[1])
            c.p(xx - 1, y, TEAL[3] if x0 < 26 else TEAL[2])
    # colete escuro no meio, com o casaco aberto
    vest = trap(27, 45, 22, 29, 23, 28)
    for (x, y) in vest:
        c.p(x, y, CHAR[1] if x > 25 else CHAR[2])
    for y in range(29, 45, 3):
        c.p(25, y, GOLD[3]); c.p(26, y, GOLD[1])            # botões
    # abertura das abas e calça entre elas
    for y in range(46, 52):
        c.p(25 + (sway if y > 48 else 0), y, TEAL[0])
        c.p(26 + (sway if y > 48 else 0), y, CHAR[1])
    # lapelas acesas
    for y in range(27, 46):
        k = (y - 27) / 18
        lx = round(22 - k * 0 + (1 if y > 40 else 0))
        rx_ = mx(lx)
        c.p(lx - 1, y, TEAL[4] if y < 34 else TEAL[3])
        c.p(lx - 2, y, TEAL[3] if y < 34 else TEAL[2])
        c.p(rx_ + 1, y, TEAL[2])
        c.p(rx_ + 2, y, TEAL[1])
    # bolsos com aba
    for x0 in (17, 30):
        for x in range(x0, x0 + 5):
            c.p(x, 44, TEAL[0]); c.p(x, 43, TEAL[3] if x0 < 26 else TEAL[2])
        c.p(x0 + 2, 45, GOLD[2])
    # barra dourada
    for y in (50, 51):
        a, b = rows[y]
        for x in range(a, b + 1):
            c.p(x, y, GOLD[2] if y == 50 else GOLD[1])
    for x in range(rows[50][0], rows[50][1] + 1, 3):
        c.p(x, 50, GOLD[3])
    # corrente e medalhão da vigília
    for i, (x, y) in enumerate(bez((19, 28), (21, 33), (24.5, 33.5), 10) + bez((32, 28), (30, 33), (26.5, 33.5), 10)):
        c.p(round(x), round(y), GOLD[3] if i % 2 else GOLD[1])
    med = ell(25.5, 36.5, 3.2, 3.2)
    shade(c, med, GOLD)
    for (x, y) in med:
        if math.hypot(x - 25.5, y - 36.5) > 2.6:
            c.p(x, y, GOLD[1] if x + y > 62 else GOLD[3])
    c.p(25, 36, FIRE[3]); c.p(26, 36, FIRE[2]); c.p(25, 37, FIRE[2]); c.p(26, 37, FIRE[1])
    c.p(25, 35, FIRE[4])
    if g == 'f':
        # jabô branco
        jab = trap(26, 31, 24, 27, 23, 28)
        shade(c, jab, LINEN, spec=True)
        for y in (28, 30):
            c.p(24, y, LINEN[1]); c.p(27, y, LINEN[1])


def locks(c, xs, top, bottom, pal, w=3, wave=0.6, seed=0, ends=None):
    """Mechas de cabelo em pé: cada mecha tem luz à esquerda, sombra à direita e um
    brilho que corre na altura; as pontas variam um pouco."""
    for i, x0 in enumerate(xs):
        bot = bottom if ends is None else ends[i]
        bot -= int(hsh(i, 3, seed) * 2)
        for y in range(top, bot + 1):
            off = round(math.sin(y * 0.33 + i * 1.9 + seed) * wave)
            ww = w if y < bot - 1 else max(1, w - 1)
            for d in range(ww):
                col = pal[3] if d == 0 else (pal[2] if d < ww - 1 else pal[1])
                if d == 0 and (y - top + i * 3) % 8 in (2, 3):
                    col = pal[4] if len(pal) > 4 else pal[3]
                c.p(x0 + off + d, y, col)


def under_brim(c, y0, y1, k=0.8):
    """Sombra da aba do chapéu na testa."""
    for y in range(y0, y1 + 1):
        for x in range(c.w):
            v = c.g(x, y)
            if v is not None:
                c.p(x, y, mul(v, k if y == y0 else (k + 1) / 2))


def mayor_head(c, g, skin):
    top = 11
    if g == 'f':
        hair = HAIR['black']
        # cabelo atrás da cabeça, até os ombros (o pescoço fica à mostra)
        back = [p for p in trap(12, 27, 18, 33, 16, 35) if p[1] <= 24 or p[0] <= 20 or p[0] >= 31]
        shade(c, back, hair[:4], spec=False)
    ey = face(c, top, skin, eyes='r', mouth='lips' if g == 'f' else 'plain',
              nose='big' if g == 'm' else 'small', lashes=(g == 'f'),
              brows=(WHITE_HAIR[3] if g == 'm' else HAIR['black'][1]))
    under_brim(c, 12, 13)
    if g == 'm':
        # cabelo grisalho dos lados, por cima das orelhas
        locks(c, (17, 19), 12, 20, WHITE_HAIR, w=2, wave=0.3, seed=1)
        locks(c, (31, 33), 12, 20, WHITE_HAIR, w=2, wave=0.3, seed=2)
        # barba cheia branca até o peito
        beard = []
        for y in range(ey + 2, 32):
            k = (y - (ey + 2)) / (31 - (ey + 2))
            hw = 6.9 * math.sqrt(max(0.0, 1 - max(0.0, k - 0.1) ** 1.5)) if k < 1 else 1
            a = round(25.5 - hw)
            b = round(25.5 + hw)
            for x in range(a, b + 1):
                if y <= ey + 3 and 21 <= x <= 30:
                    continue                                   # bochechas à mostra
                beard.append((x, y))
        shade(c, beard, WHITE_HAIR, spec=True, bias=0.05)
        rows = rows_of(beard)
        for (x, y) in beard:
            a, b = rows[y]
            u = (x - 25.5) / max(1, (b - a) / 2)
            # mechas que descem e se juntam na ponta
            ph = (x - 25.5 - u * (y - ey) * 0.25) / 2.6
            if (ph - math.floor(ph)) < 0.3 and y > ey + 6:
                c.p(x, y, WHITE_HAIR[1] if u > 0 else WHITE_HAIR[2])
        # bigode caído
        for x in range(20, 32):
            d = abs(x - 25.5)
            yy = ey + 4 + (1 if d > 3 else 0) + (1 if d > 5 else 0)
            c.p(x, yy, WHITE_HAIR[4] if x < 25 else WHITE_HAIR[3])
            c.p(x, yy + 1, WHITE_HAIR[2] if x < 26 else WHITE_HAIR[1])
        c.p(25, ey + 6, LIP_DARK); c.p(26, ey + 6, LIP_DARK)
        c.p(25, ey + 7, WHITE_HAIR[2]); c.p(26, ey + 7, WHITE_HAIR[2])
    else:
        hair = HAIR['black']
        # mechas que emolduram o rosto e caem até os ombros
        locks(c, (16, 18), 12, 27, hair, w=3, wave=0.5, seed=3, ends=(26, 28))
        locks(c, (31, 33), 12, 27, hair, w=3, wave=0.5, seed=4, ends=(28, 26))
        for x in range(20, 32):                                 # risca sob a aba
            c.p(x, 12, hair[2] if x < 26 else hair[1])
        c.p(19, 13, hair[2]); c.p(32, 13, hair[1])
        c.p(19, ey + 3, GOLD[3]); c.p(19, ey + 4, GOLD[1])       # brincos
        c.p(32, ey + 3, GOLD[3]); c.p(32, ey + 4, GOLD[1])


def mayor_hat(c):
    # copa alta (chapéu de abas largas da prefeitura)
    crown = trap(0, 7, 20, 31, 19, 32)
    crown = [p for p in crown if not (p[1] == 0 and p[0] in (20, 31))]
    shade_cyl(c, crown, HAT, lit=0.28)
    for x in range(23, 29):
        c.p(x, 0, HAT[2])                                  # vinco no topo
        c.p(x, 1, HAT[1] if x in (24, 25, 26, 27) else HAT[2])
    c.p(21, 1, HAT[4]); c.p(21, 2, HAT[4]); c.p(21, 3, HAT[3])
    # fita dourada com fivela
    for x in range(19, 33):
        c.p(x, 5, GOLD[3] if x < 26 else GOLD[2])
        c.p(x, 6, GOLD[2] if x < 26 else GOLD[1])
        c.p(x, 7, HAT[0])
    for (x, y) in ((22, 5), (23, 5), (22, 6), (23, 6)):
        c.p(x, y, GOLD[4] if (x, y) == (22, 5) else GOLD[1])
    # aba larga
    rows = [(12, 39), (10, 41), (11, 40), (14, 37)]
    for k, (a, b) in enumerate(rows):
        y = 8 + k
        for x in range(a, b + 1):
            u = (x - 25.5) / 15
            if k == 0:
                col = HAT[4] if u < -0.55 else HAT[3] if u < 0.1 else HAT[2]
            elif k == 1:
                col = HAT[3] if u < -0.6 else HAT[2] if u < 0.4 else HAT[1]
            elif k == 2:
                col = HAT[1]
            else:
                col = HAT[0]
            c.p(x, y, col)
    # pena vermelha presa na fita
    path = bez((31, 7), (35, 5), (40, 0), 18)
    pts = stroke(path, 1.4, 0.7)
    shade(c, pts, RED, spec=True)
    for i, (x, y) in enumerate(path):
        if i % 3 == 0 and i > 2:
            c.p(round(x) + 1, round(y) + 1, RED[1])
        if i < 15:
            c.p(round(x), round(y), RED[4] if i % 2 else RED[3])


def mayor_sheet(g):
    frames = [mayor_frame(g, idle_t=t) for t in range(4)] + [mayor_frame(g, run_k=k) for k in range(4)]
    return frames


# ── Moradores ─────────────────────────────────────────────────────────────
# Esqueleto (de 16-bit ×2): chapéu/cabelo a partir de y=4, rosto 12–26 (olhos em 20),
# ombros em 27, mangas 28–37, mãos 38–42, cintura 38–40, pernas 41–55, botas 56–60.

VILLAGER_JOBS = ('lavrador', 'artesa', 'acolito', 'guarda')
FACE_TOP = 12


def straw_hat(c):
    """Chapéu de palha trançada: copa baixa, fita e aba larga com a trama em raios."""
    crown = [p for p in rect(20, 5, 12, 6) if not (p[1] == 5 and p[0] in (20, 31))]
    shade_cyl(c, crown, STRAW, lit=0.3)
    for (x, y) in crown:
        if (y - 5) % 2 == 1:
            v = c.g(x, y)
            c.p(x, y, mix(v, STRAW[0], 0.25) if (x + y // 2) % 2 else v)
    for x in range(20, 32):
        c.p(x, 5, STRAW[4] if x < 26 else STRAW[3])
    for x in range(20, 32):                                 # fita
        c.p(x, 10, LEATHER[2] if x < 26 else LEATHER[1])
        c.p(x, 11, LEATHER[1] if x < 26 else LEATHER[0])
    rows = [(12, 39), (10, 41), (11, 40), (14, 37)]
    for k, (a, b) in enumerate(rows):
        y = 12 + k
        for x in range(a, b + 1):
            u = (x - 25.5) / 15
            base = [STRAW[4] if u < -0.4 else STRAW[3], STRAW[3] if u < -0.2 else STRAW[2],
                    STRAW[2] if u < 0.2 else STRAW[1], STRAW[0]][k]
            # trama em raios a partir da copa
            ang = math.atan2(y - 9, x - 25.5)
            if k < 3 and (int(ang * 9) % 2 == 0) and (x + k) % 2 == 0:
                base = mix(base, STRAW[0], 0.3)
            c.p(x, y, base)
    for x in (13, 17, 22, 29, 34, 38):                      # fios soltos na borda
        c.p(x, 15, STRAW[1])


def kettle_helm(c):
    """Chapéu de ferro (capelina): cúpula com crista, rebites e aba."""
    dome = [p for p in ell(25.5, 10, 7, 8) if p[1] <= 12]
    shade(c, dome, IRON, spec=True, box=(18, 2, 33, 14))
    for y in range(3, 13):
        c.p(25, y, IRON[4] if y < 8 else IRON[3]); c.p(26, y, IRON[1])
    c.p(22, 5, IRON[5]); c.p(21, 6, IRON[5]); c.p(22, 6, IRON[4])
    for x in range(19, 33, 3):
        c.p(x, 11, IRON[1]); c.p(x, 10, IRON[4] if x < 26 else IRON[3])
    rows = [(17, 34), (15, 36), (16, 35)]
    for k, (a, b) in enumerate(rows):
        y = 13 + k
        for x in range(a, b + 1):
            u = (x - 25.5) / 11
            col = [IRON[4] if u < -0.3 else IRON[3], IRON[2] if u < 0.2 else IRON[1], IRON[0]][k]
            c.p(x, y, col)
    c.p(16, 14, IRON[4])


def hood_ring(c, opening_top=12):
    """Capuz do acólito: casca por fora do rosto, com borda escura por dentro e caimento nos ombros."""
    outer = [p for p in ell(25.5, 17.5, 9.6, 11.5) if p[1] >= 6]
    inner = set(ell(25.5, 20, 6.6, 8.2))
    pts = [p for p in outer if p not in inner or p[1] < opening_top]
    shade(c, pts, PURPLE, spec=True, box=(15, 5, 36, 30))
    for (x, y) in pts:
        if any((x + a, y + b) in inner and (x + a, y + b)[1] >= opening_top for a, b in ((1, 0), (-1, 0), (0, 1))):
            c.p(x, y, PURPLE[0])                       # sombra da borda
    for y in range(7, 11):
        c.p(25, y, PURPLE[1])                          # costura do capuz
    c.p(24, 7, PURPLE[3]); c.p(23, 8, PURPLE[3])


def headscarf(c):
    """Lenço vermelho de pintas, com o nó e as pontas do lado direito."""
    cap = [p for p in ell(25.5, 15, 8, 9.5) if p[1] <= 14]
    shade(c, cap, SCARF, spec=True, box=(17, 5, 34, 16))
    for (x, y) in cap:
        if (x + 2 * y) % 5 == 0 and (y % 3 == 0):
            c.p(x, y, LINEN[3] if x < 27 else LINEN[1])           # pintas
    for x in range(18, 34):                                         # barra dobrada
        c.p(x, 13, SCARF[3] if x < 26 else SCARF[2])
        c.p(x, 14, SCARF[1])
    knot = ell(34.5, 14, 2, 1.8)
    shade(c, knot, SCARF, spec=False)
    tails = [(35, 16), (35, 17), (36, 16), (36, 17), (36, 18), (37, 17), (37, 18), (37, 19), (36, 19)]
    for (x, y) in tails:
        c.p(x, y, SCARF[2] if x < 37 else SCARF[1])


def short_hair(c, pal):
    """Cabelo curto crespo: touca de cachos miúdos e costeletas."""
    cap = [p for p in ell(25.5, 15.5, 8, 9.5) if p[1] <= 14] + rect(18, 13, 2, 5) + rect(32, 13, 2, 5)
    shade(c, cap, pal, spec=False, box=(17, 5, 34, 18))
    for (x, y) in cap:
        if (x * 2 + y * 3) % 5 == 0 and y < 13:
            c.p(x, y, pal[3] if x < 26 else pal[2])                    # cachos
        elif (x * 2 + y * 3) % 5 == 1 and y < 13:
            c.p(x, y, pal[0])
    for x in range(20, 32):
        c.p(x, 13, pal[1])


def shirt(c, pal, top=27, bottom=40, l0=17, r0=34, l1=17, r1=34, neck='v', skin=SKIN):
    pts = trap(top, bottom, l0, r0, l1, r1)
    shade(c, pts, pal, spec=False, box=(12, 24, 39, 44))
    if neck == 'v':
        for y in range(top, top + 4):
            w = top + 3 - y
            for x in range(25 - w, 27 + w):
                c.p(x, y, skin[2] if x < 26 else skin[1])
        c.p(25, top + 4, pal[0]); c.p(26, top + 4, pal[0])
        for y in (top + 1, top + 3):                      # cordão do decote
            c.p(24, y, LEATHER[1]); c.p(27, y, LEATHER[1])
    elif neck == 'round':
        for x in range(23, 29):
            c.p(x, top, skin[1])
        c.p(24, top + 1, pal[1]); c.p(27, top + 1, pal[1])
    for x in range(l0, r0 + 1):
        c.p(x, top, pal[0] if x < 22 or x > 29 else c.g(x, top))
    return pts


def belt(c, y, x0, x1, pal, buckle=GOLD):
    for x in range(x0, x1 + 1):
        c.p(x, y, pal[2] if x < 26 else pal[1])
        c.p(x, y + 1, pal[1] if x < 26 else pal[0])
    if buckle:
        for (x, yy) in ((25, y), (26, y), (25, y + 1), (26, y + 1)):
            c.p(x, yy, buckle[3] if (x, yy) == (25, y) else buckle[1])


def skirt(c, pal, top, bottom, l0, r0, l1, r1, sway=0, seed=0, hem=None):
    pts = []
    for y in range(top, bottom + 1):
        k = (y - top) / max(1, bottom - top)
        a = round(l0 + (l1 - l0) * k + sway * k * k)
        b = round(r0 + (r1 - r0) * k + sway * k * k)
        pts += [(x, y) for x in range(a, b + 1)]
    shade(c, pts, pal, spec=False, box=(l1 - 2, top - 6, r1 + 2, bottom + 2))
    folds(c, pts, pal, period=4.5, seed=seed, amp=1.2 + abs(sway))
    rows = rows_of(pts)
    if hem:
        for y in range(bottom - len(hem) + 1, bottom + 1):
            a, b = rows[y]
            for x in range(a, b + 1):
                c.p(x, y, hem[bottom - y] if x < 26 + sway else mul(hem[bottom - y], 0.85))
    # barra irregular
    a, b = rows[bottom]
    for x in range(a, b + 1):
        if hsh(x, 1, seed + sway * 7) < 0.25:
            c.p(x, bottom, None)
    return pts


def beard_short(c, ey, pal, full=True):
    """Barba aparada: contorna o maxilar (full) ou só cavanhaque, com bigode e boca à mostra."""
    pts = []
    for (x, y) in ell(CX, FACE_TOP + 7, 7, 7.5):
        if full:
            side = x <= 20 or x >= 31
            if (side and y >= ey + 2) or y >= ey + 4:
                pts.append((x, y))
        elif 22 <= x <= 29 and y >= ey + 4:
            pts.append((x, y))
    shade(c, pts, pal[1:], spec=False, box=(18, ey, 33, ey + 8))
    for x in range(23, 29):
        c.p(x, ey + 4, pal[3] if x < 26 else pal[2])                    # bigode
    c.p(22, ey + 5, pal[2]); c.p(29, ey + 5, pal[1])
    for x in (24, 25, 26, 27):
        c.p(x, ey + 5, LIP_DARK if x in (25, 26) else pal[1])
    for (x, y) in pts:                                                    # fios
        if y > ey + 5 and (x * 3 + y) % 4 == 0:
            c.p(x, y, pal[1])


def villager_frame(job, g, f):
    skin = SKIN if (job, g) in (('lavrador', 'm'), ('lavrador', 'f'), ('acolito', 'm'), ('acolito', 'f'),
                                ('guarda', 'm')) else SKIN_DARK
    lift = [(0, 0), (4, 0), (0, 4)][f]
    hdy = [(0, 0), (2, -1), (-1, 2)][f]
    sway = [0, 1, -1][f]
    bob = [0, -1, -1][f]
    dress = job == 'acolito' or ((job in ('lavrador', 'artesa')) and g == 'f')
    R = Rig(W, H)

    # ── atrás: cabelo comprido, pernas
    if job == 'guarda' and g == 'f':
        R.part(lambda c: shade(c, trap(14, 28, 17, 34, 16, 35), HAIR['black'][:4], spec=False), 0, bob)

    if dress:
        def p_feet(c):
            for x0, up in ((18, lift[0]), (28, lift[1])):
                if up == 0:
                    boot(c, x0 - 1, 56, BOOT, w=8, h=5)
        R.part(p_feet)
    else:
        tpal = CHAR if job == 'guarda' else TROUSER

        def p_legs(c):
            legs(c, lift=lift, pal=tpal, bpal=BOOT, top=40, foot=60, x0s=(18, 28), bh=5, bw=8)
            if job == 'lavrador':                       # remendo no joelho
                ky = 47 - 0
                for (x, y) in rect(19, ky, 4, 4):
                    c.p(x, y, TROUSER[3] if (x + y) % 3 else TROUSER[2])
                for x in range(19, 23):
                    c.p(x, ky - 1, TROUSER[0]); c.p(x, ky + 4, TROUSER[0])
            if job == 'guarda':                         # perneiras amarradas
                for x0, up in ((18, lift[0]), (28, lift[1])):
                    for yy in (47, 50, 53):
                        y = yy - up // 2
                        for x in range(x0, x0 + 6):
                            c.p(x, y, CHAR[0] if (x + yy) % 2 else CHAR[2])
        R.part(p_legs)

    # ── corpo
    def p_body(c):
        if job == 'lavrador' and g == 'm':
            shirt(c, GREEN, skin=skin)
            belt(c, 38, 17, 34, ROPE, buckle=None)
            c.p(23, 38, ROPE[3]); c.p(23, 39, ROPE[1]); c.p(22, 40, ROPE[1]); c.p(22, 41, ROPE[0])
            for y in range(30, 37):                         # vincos da camisa
                c.p(21, y, GREEN[1]); c.p(30, y, GREEN[1])
        elif job == 'lavrador':
            neck(c, 24, 27, skin)
            skirt(c, GREEN, 40, 58, 17, 34, 11, 40, sway=sway, seed=2, hem=[GREEN[0], GREEN[1]])
            shirt(c, GREEN, bottom=39, neck='round', skin=skin)
            belt(c, 37, 17, 34, ROPE, buckle=None)
            c.p(27, 39, ROPE[2]); c.p(28, 40, ROPE[1]); c.p(27, 41, ROPE[0])
            for x in range(18, 34, 2):                      # franzido do corpete
                c.p(x, 36, GREEN[1])
        elif job == 'artesa' and g == 'm':
            shirt(c, BLUE, neck='round', skin=skin)
            # avental de linho com bolso e ferramenta
            bib = rect(21, 29, 10, 9)
            shade(c, bib, LINEN, spec=False)
            for y in range(27, 29):
                c.p(21, y, LINEN[2]); c.p(30, y, LINEN[1])
            for x in range(23, 29):
                c.p(x, 34, LINEN[1])
            c.p(23, 35, LINEN[0]); c.p(28, 35, LINEN[0])
            for y in range(30, 34):                          # lápis de carpinteiro no bolso
                c.p(27, y, GOLD[2] if y > 30 else WOOD[1])
                c.p(28, y, GOLD[1] if y > 30 else WOOD[1])
            belt(c, 38, 17, 34, LEATHER, buckle=IRON[1:])
        elif job == 'artesa':
            neck(c, 24, 27, skin)
            skirt(c, BLUE, 40, 58, 17, 34, 11, 40, sway=sway, seed=5, hem=[BLUE[0], BLUE[1]])
            shirt(c, BLUE, bottom=39, neck='round', skin=skin)
            # avental comprido
            ap = []
            for y in range(29, 57):
                k = max(0, (y - 40) / 16)
                a = round(22 - k * 1.5 + sway * k * k)
                b = round(29 + k * 1.5 + sway * k * k)
                ap += [(x, y) for x in range(a, b + 1)]
            shade(c, ap, LINEN, spec=False, box=(18, 26, 34, 58))
            folds(c, ap, LINEN, period=4, seed=9, amp=1)
            for y in range(27, 29):
                c.p(22, y, LINEN[2]); c.p(29, y, LINEN[1])
            belt(c, 38, 17, 34, LEATHER, buckle=None)
            c.p(25, 39, LEATHER[1]); c.p(25, 40, LEATHER[1]); c.p(24, 41, LEATHER[0])
        elif job == 'acolito':
            neck(c, 24, 27, skin)
            robe = []
            for y in range(27, 58):
                k = (y - 27) / 31
                a = round(17 - k * 6 + sway * k * k * 1.5)
                b = round(34 + k * 6 + sway * k * k * 1.5)
                robe += [(x, y) for x in range(a, b + 1)]
            shade(c, robe, PURPLE, spec=False, box=(10, 22, 41, 60))
            folds(c, robe, PURPLE, period=4.5, seed=3, y_from=40, amp=1.4)
            rows = rows_of(robe)
            for y in (56, 57):                                 # barra bordada
                a, b = rows[y]
                for x in range(a, b + 1):
                    c.p(x, y, ROPE[1] if y == 57 else (ROPE[2] if x % 4 else ROPE[3]))
            for x in range(rows[57][0], rows[57][1] + 1):
                if hsh(x, 2, sway) < 0.2:
                    c.p(x, 57, None)
            belt(c, 38, 17, 34, ROPE, buckle=None)
            for y in range(40, 54):                            # cordão
                xx = 25 + (sway if y > 47 else 0)
                c.p(xx, y, ROPE[2]); c.p(xx + 1, y, ROPE[0])
            c.p(25 + sway, 54, ROPE[3]); c.p(26 + sway, 54, ROPE[1])
            # pingente da vigília
            for (x, y) in ((25, 31), (26, 31), (24, 32), (27, 32), (25, 33), (26, 33)):
                c.p(x, y, GOLD[3] if y < 33 else GOLD[1])
            c.p(25, 32, FIRE[2]); c.p(26, 32, EYE)
            for (x, y) in ((24, 28), (24, 29), (24, 30), (27, 28), (27, 29), (27, 30)):
                c.p(x, y, GOLD[1])
        elif job == 'guarda':
            pts = shirt(c, GAMBESON, neck='none', skin=skin)
            for (x, y) in pts:                                 # acolchoado
                if y > 28 and (x - 17) % 4 == 3:
                    c.p(x, y, GAMBESON[0] if x > 26 else GAMBESON[1])
                if y > 28 and (y - 29) % 5 == 4 and (x - 17) % 4 != 3:
                    c.p(x, y, GAMBESON[1])
            for y in range(28, 38):
                c.p(26, y, GAMBESON[0]); c.p(25, y, GAMBESON[3])
            for x in range(20, 32):                            # gola
                c.p(x, 27, GAMBESON[4] if x < 26 else GAMBESON[3])
                c.p(x, 28, GAMBESON[1])
            belt(c, 38, 17, 34, LEATHER, buckle=GOLD)
            for y in range(40, 43):                            # aba do gibão
                for x in range(17, 35):
                    c.p(x, y, GAMBESON[2] if x < 26 else GAMBESON[1])
            for x in range(17, 35, 4):
                c.p(x + 3, 41, GAMBESON[0]); c.p(x + 3, 42, GAMBESON[0])
    R.part(p_body, 0, bob)

    # ── braços
    sleeve_pal = {'lavrador': GREEN, 'artesa': BLUE, 'acolito': PURPLE, 'guarda': GAMBESON}[job]
    cuff = {'lavrador': None, 'artesa': None, 'acolito': ROPE, 'guarda': LEATHER}[job]

    def p_arm(side):
        def fn(c):
            x0 = 13 if side == 'l' else 32
            dy = hdy[0] if side == 'l' else hdy[1]
            sleeve(c, x0, 28, 37 + dy // 2, sleeve_pal, w=7, cuff=cuff, cuff_h=2)
            if job == 'guarda':
                for y in range(30, 36, 2):
                    c.p(x0 + 3, y, GAMBESON[0])
            if job == 'lavrador' and g == 'm':
                for x in range(x0, x0 + 7):                  # manga arregaçada
                    c.p(x, 36 + dy // 2, GREEN[3] if x < x0 + 3 else GREEN[2])
                    c.p(x, 37 + dy // 2, GREEN[1])
            if job == 'acolito' and side == 'l':
                return
            hand(c, 16.5 if side == 'l' else 34.5, 40 + dy, skin, side)
        return fn

    R.part(p_arm('l'), 0, bob)
    R.part(p_arm('r'), 0, bob)

    if job == 'acolito':
        def p_candle(c):
            dy = hdy[0]
            # vela de cera presa na mão esquerda
            cy0 = 40 + dy
            for y in range(cy0, cy0 + 6):
                for x in range(12, 17):
                    c.p(x, y, WAX[3] if x == 12 else WAX[2] if x < 15 else WAX[1])
            for x in range(12, 17):
                c.p(x, cy0, WAX[3] if x < 15 else WAX[2])
            c.p(14, cy0 + 1, WAX[0]); c.p(13, cy0 + 2, WAX[3])           # pingo
            c.p(14, cy0 - 1, OL)                                          # pavio
            fl = [(14, cy0 - 2), (14, cy0 - 3), (13, cy0 - 2), (15, cy0 - 2), (14, cy0 - 4)]
            for i, (x, y) in enumerate(fl):
                c.p(x, y, [FIRE[3], FIRE[4], FIRE[2], FIRE[1], FIRE[2]][i])
            hand(c, 17.5, 41 + dy, skin, 'l')
        R.part(p_candle, 0, bob)

    if job == 'guarda':
        sdy = hdy[1]

        def p_spear_(c):
            sx = 39
            for y in range(8, 61):
                c.p(sx, y, WOOD[3] if y % 7 else WOOD[2]); c.p(sx + 1, y, WOOD[1])
            blade = [(x, y) for y in range(0, 8) for x in range(37, 43)
                     if abs(x - 39.5) <= (0.6 + 2.2 * math.sin(min(1.0, (y + 0.5) / 7) * math.pi * 0.9))]
            shade(c, blade, IRON, spec=True, box=(36, 0, 43, 8))
            for y in range(1, 7):
                c.p(39, y, IRON[4]); c.p(40, y, IRON[2])
            for y in (7, 8):
                c.p(39, y, IRON[1]); c.p(40, y, IRON[0])
            for (x, y) in ((38, 9), (39, 9), (40, 9), (41, 9), (38, 10), (37, 11), (38, 12)):
                c.p(x, y, GAMBESON[3] if x < 40 else GAMBESON[1])           # fita vermelha
            c.p(39, 60, IRON[2]); c.p(40, 60, IRON[1])
            # dedos por cima da haste
            for y in range(39, 42):
                c.p(39, y, skin[2] if y < 41 else skin[1]); c.p(40, y, skin[1])
            c.p(38, 39, skin[3]); c.p(38, 40, skin[2]); c.p(38, 41, skin[2])
        R.part(p_spear_, 0, bob + sdy)

    # ── cabeça
    def p_head(c):
        hairc = None
        if job == 'lavrador' and g == 'f':
            hairc = HAIR['brown']
            shade(c, trap(13, 22, 18, 33, 18, 34), hairc[:4], spec=False)
        if job == 'acolito':
            # nuca do capuz atrás
            pass
        lips = 'lips' if g == 'f' else 'plain'
        ey = face(c, FACE_TOP, skin, eyes='r', mouth=lips, lashes=(g == 'f'),
                  brows=(skin[0] if g == 'f' else mix(skin[0], OL, 0.4)), blush=(g == 'f'))
        if job in ('lavrador', 'guarda') and g == 'm':
            beard_short(c, ey, HAIR['brown'] if job == 'lavrador' else HAIR['black'], full=True)
        if job == 'artesa' and g == 'm':
            short_hair(c, HAIR['black'])
            beard_short(c, ey, HAIR['black'], full=False)
        if job == 'artesa' and g == 'f':
            headscarf(c)
        if job == 'lavrador':
            straw_hat(c)
            under_brim(c, 16, 17, 0.82)
        if job == 'lavrador' and g == 'f':
            # trança caindo pelo ombro direito
            for y in range(16, 37):
                sx = 32 + round(math.sin(y * 0.4) * 0.6)
                for d in range(3):
                    col = hairc[[3, 2, 1][d]] if (y + d) % 4 else hairc[0]
                    c.p(sx + d, y, col)
            for (x, y) in ((32, 37), (33, 37), (34, 37), (33, 38)):
                c.p(x, y, SCARF[2])
            c.p(33, 39, hairc[2]); c.p(32, 40, hairc[1]); c.p(34, 40, hairc[1])
        if job == 'guarda':
            if g == 'f':
                locks(c, (17, 32), 15, 26, HAIR['black'], w=3, wave=0.3, seed=7)
            kettle_helm(c)
            under_brim(c, 16, 17, 0.8)
        if job == 'acolito':
            if g == 'f':
                for (x, y) in ((20, 13), (21, 13), (22, 13), (20, 14), (21, 14), (20, 15)):
                    c.p(x, y, HAIR['brown'][2] if x > 20 else HAIR['brown'][1])
            hood_ring(c)
    R.part(p_head, 0, bob)
    return R.build()


def villager_sheet(job, g):
    return [villager_frame(job, g, f) for f in range(3)]


# ── Crianças (32×44) ──────────────────────────────────────────────────────
# Centradas em x = 18 (como a 16-bit, centrada em 9 do quadro de 16): espelho x' = 35 − x.
# Cabeça grande (rosto 8–19, olhos em 13), corpo 22–31, pernas 32–37, sapatos 37–41.

CW, CH = 32, 44
CCX = 17.5
MUSTARD = [(98, 64, 26), (146, 106, 44), (196, 154, 70), (226, 188, 86), (246, 216, 128)]
DRESS = [(70, 22, 28), (104, 36, 40), (140, 56, 56), (176, 76, 74), (204, 104, 94)]


def kid_face(c, skin, ey, g):
    pts = ell(CCX, 13, 7.5, 7)
    shade(c, pts, skin, spec=False, bias=0.15)
    for ex in (9, 26):                                       # orelhas
        for y in (13, 14):
            c.p(ex, y, skin[2] if y == 13 else skin[1])
    for (x0, inner) in ((14, 15), (20, 20)):
        c.p(x0, ey - 1, skin[1]); c.p(x0 + 1, ey - 1, skin[1])
        c.p(inner, ey, EYE); c.p(inner, ey + 1, EYE)
        outer = x0 + 1 if inner == x0 else x0
        c.p(outer, ey, WHITE); c.p(outer, ey + 1, skin[2])
    for x in (12, 13, 22, 23):                               # bochechas coradas
        c.p(x, ey + 2, mix(skin[2], RED[3], 0.45))
    c.p(18, ey + 2, skin[1])                                  # nariz
    c.p(17, ey + 4, LIP_DARK); c.p(18, ey + 4, LIP_DARK)
    c.p(16, ey + 3, skin[1]); c.p(19, ey + 3, skin[1])
    if g == 'f':
        c.p(17, ey + 4, LIP); c.p(18, ey + 4, LIP_DARK)


def child_frame(g, f):
    skin = SKIN
    lift = [(0, 0), (3, 0), (0, 3)][f]
    hdy = [(0, 0), (2, -1), (-1, 2)][f]
    bob = [0, -1, -1][f]
    sway = [0, 1, -1][f]
    R = Rig(CW, CH)
    hair = HAIR['blond'] if g == 'm' else HAIR['brown']

    if g == 'f':
        def p_braids_back(c):
            shade(c, trap(6, 16, 10, 25, 9, 26), hair[:4], spec=False)
        R.part(p_braids_back, 0, bob)

    def p_legs(c):
        for x0, up in zip((13, 19), lift):
            by = 38 - up
            if g == 'm':
                leg(c, x0, 31, by, TROUSER, w=4, crease=False)
            else:
                pts = rect(x0, 33, 4, by - 33 + 1)
                shade_cyl(c, pts, LINEN, lit=0.3, spec=False)          # meias
            boot(c, x0 - 1, by, BOOT if g == 'm' else LEATHER, w=6, h=5)
    R.part(p_legs)

    def p_body(c):
        neck(c, 19, 21, skin, cx=CCX, rx=2)
        if g == 'm':
            pts = trap(21, 31, 11, 24, 10, 25)
            shade(c, pts, MUSTARD, spec=False, box=(7, 19, 28, 33))
            for y in range(22, 31):
                c.p(13, y, MUSTARD[3]) if y % 3 else None
            for x in range(15, 21):                              # gola redonda
                c.p(x, 21, skin[1])
            c.p(16, 22, MUSTARD[1]); c.p(19, 22, MUSTARD[1])
            belt(c, 28, 10, 25, LEATHER, buckle=None)
            c.p(17, 28, GOLD[3]); c.p(18, 28, GOLD[2]); c.p(17, 29, GOLD[1]); c.p(18, 29, GOLD[1])
            for x in range(10, 26):                              # barra da túnica
                c.p(x, 31, MUSTARD[1] if (x + sway) % 3 else MUSTARD[0])
        else:
            bod = trap(21, 27, 11, 24, 11, 24)
            shade(c, bod, DRESS, spec=False, box=(7, 19, 28, 34))
            sk = []
            for y in range(28, 35):
                k = (y - 28) / 6
                a = round(11 - k * 2 + sway * k)
                b = round(24 + k * 2 + sway * k)
                sk += [(x, y) for x in range(a, b + 1)]
            shade(c, sk, DRESS, spec=False, box=(7, 19, 28, 36))
            folds(c, sk, DRESS, period=3.5, seed=4, amp=0.8)
            rows = rows_of(sk)
            for x in range(rows[34][0], rows[34][1] + 1):
                c.p(x, 34, DRESS[1]); c.p(x, 33, DRESS[2] if x % 3 else DRESS[1])
            for x in range(11, 25):                               # cinta
                c.p(x, 27, DRESS[1])
            # gola branca arredondada
            for (x, y) in [(x, y) for y in (21, 22, 23) for x in range(13, 23)
                           if abs(x - CCX) <= [5, 4.5, 3][y - 21] and not (y == 21 and 16 <= x <= 19)]:
                c.p(x, y, LINEN[3] if x < 18 else LINEN[2])
            c.p(17, 23, DRESS[0]); c.p(18, 23, DRESS[0])
            for x in range(16, 20):
                c.p(x, 21, skin[1])
    R.part(p_body, 0, bob)

    sleeve_pal = MUSTARD if g == 'm' else DRESS

    def p_arm(side):
        def fn(c):
            x0 = 8 if side == 'l' else 24
            dy = hdy[0] if side == 'l' else hdy[1]
            pts = rect(x0, 22, 4, 7 + dy // 2)
            shade_cyl(c, pts, sleeve_pal, lit=0.3)
            c.p(x0, 22, None); c.p(x0 + 3, 22, None)
            for x in range(x0, x0 + 4):
                c.p(x, 28 + dy // 2, sleeve_pal[1])
            hp = ell(x0 + 1.5, 30.5 + dy, 2, 1.7)
            shade(c, hp, skin, spec=False, bias=0.2)
            c.p(x0 + (2 if side == 'l' else 1), 31 + dy, skin[1])
        return fn
    R.part(p_arm('l'), 0, bob)
    R.part(p_arm('r'), 0, bob)

    def p_head(c):
        ey = 13
        kid_face(c, skin, ey, g)
        # cabelo: touca, franja recortada e laterais
        cap = [p for p in ell(CCX, 10.5, 8.5, 8.5) if p[1] <= 9]
        cap += [(x, y) for y in range(9, 13) for x in (10, 11, 24, 25)]
        shade(c, cap, hair, spec=True, box=(8, 1, 27, 14))
        for x in range(11, 25):                                   # franja em mechas
            d = (x * 7) % 3
            for y in range(9, 9 + d):
                c.p(x, y, hair[2] if x < 18 else hair[1])
        for (x, y) in cap:
            if y < 8 and (x + 2 * y) % 6 == 0:
                c.p(x, y, hair[1])
        if g == 'm':
            for (x, y) in ((16, 1), (17, 0), (17, 1), (18, 0), (16, 2)):
                c.p(x, y, hair[3])                                 # topete
        else:
            # tranças dos lados e laço vermelho
            for x0 in (8, 25):
                for y in range(10, 22):
                    sx = x0 + round(math.sin(y * 0.6) * 0.4)
                    for d in range(3):
                        c.p(sx + d, y, hair[[3, 2, 1][d]] if (y + d) % 3 else hair[0])
                for d in range(3):
                    c.p(x0 + d, 22, RED[3] if d < 2 else RED[1])
                c.p(x0 + 1, 23, hair[2])
            # laço: duas alças, o nó escuro no meio e as pontas caídas
            bow = {(24, 1): 3, (25, 1): 3, (24, 2): 3, (25, 2): 2, (24, 3): 2, (25, 3): 1,
                   (26, 2): 0, (27, 1): 3, (28, 1): 2, (27, 2): 2, (28, 2): 1, (27, 3): 1, (28, 3): 1,
                   (25, 4): 2, (25, 5): 1, (27, 4): 1, (28, 5): 0}
            for (x, y), k in bow.items():
                c.p(x, y, RED[k])
    R.part(p_head, 0, bob)
    return R.build()


def child_sheet(g):
    return [child_frame(g, f) for f in range(3)]
