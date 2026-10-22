"""Caminhada de perfil dos heróis 32-bit (corredor do abismo): 8 quadros de 48×64.

O herói anda para a direita. Vista de lado desenhada para cada classe com os mesmos
materiais e cores do modelo detalhado (hd24): o lado de longe (braço e perna de trás) usa
a rampa um tom abaixo, o de perto fica por cima. Ciclo de passo em 8 quadros (contato,
desce, passa, sobe, para cada perna); a altura do corpo sai do pé que está no chão.
"""
import math

import herois32_base as B
import herois32_armas as A
import hd24 as HD
from hd24 import ell, rect, trap

W, H = B.W, B.H
STEEL, GOLD, RED, SKIN, SKIND = HD.STEEL, HD.GOLD, HD.RED, HD.SKIN, HD.SKIND
FUR, LEATHER, WOOD, BLUE, GREEN, LINEN, PURPLE, HAIR = HD.FUR, HD.LEATHER, HD.WOOD, HD.BLUE, HD.GREEN, HD.LINEN, HD.PURPLE, HD.HAIR

# ângulo da coxa (graus, + para a frente) e dobra do joelho, perna A; a B vai 4 atrás
THIGH = [24, 14, 2, -10, -22, -14, 4, 18]
KNEE = [2, 8, 4, 4, 10, 42, 52, 24]
L1, L2 = 9.5, 9.0


def far(pal):
    """Rampa do lado de longe: um tom abaixo."""
    return [pal[0]] + list(pal[:-1])


def shade(c, pts, pal, **kw):
    HD.shade(c, pts, pal, **kw)


def leg_geom(k, hip):
    """Joelho, tornozelo e ângulo da canela para a perna no quadro k."""
    t1, t2 = math.radians(THIGH[k % 8]), math.radians(KNEE[k % 8])
    knee = (hip[0] + L1 * math.sin(t1), hip[1] + L1 * math.cos(t1))
    a2 = t1 - t2
    ank = (knee[0] + L2 * math.sin(a2), knee[1] + L2 * math.cos(a2))
    return knee, ank, a2


def foot_low(k):
    """Altura do solado abaixo do quadril (para achar a altura do corpo)."""
    knee, ank, a2 = leg_geom(k, (0, 0))
    toe = ank[1] + 2.4 + max(0.0, -math.sin(a2)) * 2.5
    return max(ank[1] + 2.4, toe)


def hip_y(k):
    low = max(foot_low(k), foot_low(k + 4))
    return 62 - low


def draw_leg(c, hip, k, pal, boot, hw=3.2, boot_top=None, knee_pal=None, cuff=None):
    knee, ank, a2 = leg_geom(k, hip)
    B.limb(c, hip, knee, hw, pal)
    B.limb(c, knee, ank, hw - 0.3, pal)
    if knee_pal:
        B.ball(c, knee[0] + 0.8, knee[1], 2.6, knee_pal)
    # bota: do tornozelo para a frente, com o bico baixando quando o pé está no ar
    lift = max(0.0, -math.sin(a2))
    tip_ang = 10 + lift * 30
    if boot_top:
        bt = (ank[0] - math.sin(a2) * boot_top, ank[1] - math.cos(a2) * boot_top)
        B.limb(c, bt, ank, hw + 0.2, boot, cap0=False)
    B.draw_local(c, (ank[0] - 1, ank[1] + 0.5), tip_ang, [
        B.box(-1, 6, -2.4, 2.2, boot, spec=False)])
    if cuff:
        B.limb(c, (ank[0] - math.sin(a2) * 4, ank[1] - math.cos(a2) * 4), (ank[0] - math.sin(a2) * 2, ank[1] - math.cos(a2) * 2), hw + 0.6, cuff, cap0=False, cap1=False)
    return knee, ank


def arm_pts(sh, swing, bend=18, l1=8.5, l2=9.5):
    """Ombro → cotovelo → mão; swing em graus (+ para a frente)."""
    a1 = math.radians(swing)
    el = (sh[0] + l1 * math.sin(a1), sh[1] + l1 * math.cos(a1))
    a2 = math.radians(swing + bend)
    hn = (el[0] + l2 * math.sin(a2), el[1] + l2 * math.cos(a2))
    return el, hn


def draw_arm(c, sh, el, hn, sleeve, hand, hw=2.8, cuff=None, hand_r=2.8):
    B.limb(c, sh, el, hw, sleeve)
    B.limb(c, el, hn, hw - 0.2, sleeve)
    if cuff:
        dx, dy = hn[0] - el[0], hn[1] - el[1]
        d = math.hypot(dx, dy) or 1
        p0 = (hn[0] - dx / d * 3.5, hn[1] - dy / d * 3.5)
        p1 = (hn[0] - dx / d * 1.2, hn[1] - dy / d * 1.2)
        B.limb(c, p0, p1, hw + 0.3, cuff, spec=False, cap0=False, cap1=False)
    B.ball(c, hn[0] + 0.6, hn[1] + 0.8, hand_r, hand, spec=False)


def head_profile(c, hx, hy, skin, eye=True, brow=None, mouth=None, w=6.2, h=7.4, nose=True, ear=True):
    """Cabeça de perfil olhando para a direita (centro hx, hy). Devolve a linha do olho."""
    shade(c, ell(hx, hy, w, h), skin, spec=False)
    # queixo e maxilar um pouco para a frente
    shade(c, ell(hx + 2.5, hy + 4.5, 3.6, 2.6), skin, spec=False)
    fx = round(hx + w)
    ey = round(hy - 0.5)
    if nose:
        c.p(fx + 1, ey + 1, skin[2]); c.p(fx + 1, ey + 2, skin[1]); c.p(fx, ey + 3, skin[0])
    if eye:
        c.p(fx - 3, ey, 'noite'); c.p(fx - 2, ey, 'white'); c.p(fx - 3, ey - 1, skin[1])
        c.hl(fx - 4, ey - 2, 3, brow or skin[0])
    c.hl(fx - 2, ey + 5, 2, mouth or skin[0])
    if ear:
        c.r(round(hx - 1), ey, 2, 3, skin[1]); c.p(round(hx), ey + 1, skin[0])
    return ey


def hair_cap(c, hx, hy, pal, w=7.2, h=7.6, brow=5, back=2, extra=None):
    """Cabelo de perfil: a calota de cima até a linha da testa na frente e a nuca atrás
    da orelha (que fica à mostra)."""
    pts = [p for p in ell(hx - 1, hy - 1.5, w, h) if p[1] <= hy - brow or p[0] <= hx - back]
    if extra:
        pts += extra
    shade(c, pts, pal)
    ey = round(hy - 0.5)
    c.r(round(hx - 1), ey, 2, 3, pal[0] if False else 'k1')


def outl(c):
    return B.outlined(c)


class Pose:
    """Tudo o que muda de um quadro para outro."""

    def __init__(self, k):
        self.k = k
        self.hy = hip_y(k)
        self.hip = (23.0, self.hy)
        self.bob = round(self.hy - 41.5)
        self.front = k % 8            # perna da frente (perto da câmera): fase k
        self.back = (k + 4) % 8       # perna de trás: fase oposta
        # braço de perto balança com a perna de trás (oposto à perna de perto)
        self.swing_near = THIGH[self.back] * 1.1
        self.swing_far = THIGH[self.front] * 1.1


def compose(layers):
    out = B.blank()
    for L in layers:
        if L is not None:
            B.paste(out, outl(L))
    return out


# ── Peças comuns ─────────────────────────────────────────────────────────

def legs_layers(P, pal, boot, **kw):
    back, front = B.blank(), B.blank()
    draw_leg(back, (P.hip[0] - 1, P.hip[1]), P.back, far(pal), far(boot), **{k: (far(v) if isinstance(v, list) else v) for k, v in kw.items()})
    draw_leg(front, (P.hip[0] + 1, P.hip[1]), P.front, pal, boot, **kw)
    return back, front


def arms_free(P, sleeve, hand, sh, **kw):
    """Braços soltos balançando (o de longe atrás do corpo)."""
    back, front = B.blank(), B.blank()
    el, hn = arm_pts((sh[0] - 1, sh[1]), P.swing_far)
    draw_arm(back, (sh[0] - 1, sh[1]), el, hn, far(sleeve), far(hand), **kw)
    el, hn = arm_pts(sh, P.swing_near)
    draw_arm(front, sh, el, hn, sleeve, hand, **kw)
    return back, front


def skirt(c, P, top, bottom, pal, back_x, front_x, jag=False, seed=0, waist=(17, 29)):
    """Saia/túnica/casaco abaixo da cintura; a barra acompanha as pernas."""
    kf = leg_geom(P.front, P.hip)[0]
    kb = leg_geom(P.back, P.hip)[0]
    lo = min(kf[0], kb[0]) - 3
    hi = max(kf[0], kb[0]) + 3
    pts = []
    for y in range(top, bottom + 1):
        t = (y - top) / max(1, bottom - top)
        a = round(waist[0] + (min(back_x, lo) - waist[0]) * t)
        b = round(waist[1] + (max(front_x, hi) - waist[1]) * t)
        for x in range(a, b + 1):
            if jag and y >= bottom - 1 and (x // 2 + seed) % 2 and y == bottom:
                continue
            pts.append((x, y))
    shade(c, pts, pal, spec=False)
    return pts


# ── Guardião / Guardiã ───────────────────────────────────────────────────

def guardiao(P, g):
    b = P.bob
    hip = P.hip
    sh = (24, 26 + b)
    L = []
    # capa atrás, ondulando com o passo
    cape = B.blank()
    wave = math.sin(P.k / 8 * 2 * math.pi)
    for y in range(22 + b, 61):
        t = (y - 22 - b) / 38
        x0 = round(16 - t * (9 + 2 * wave) - 1.2 * math.sin(y * 0.35 + P.k * 0.8) * t)
        x1 = round(25 - t * 3)
        for x in range(x0, x1 + 1):
            fold = math.sin(x * 0.7 + y * 0.05 + P.k * 0.8)
            cape.p(x, y, 'r0' if x <= x0 + 1 else ('r2' if fold > 0.5 else ('r0' if fold < -0.6 else 'r1')))
    for x in range(0, 30):
        if HD.hsh(x, P.k // 2, 3) < 0.4:
            cape.p(x, 60, None)
    L.append(cape)
    # braço de longe (escudo vai na frente, segurado por ele)
    lb, lf = legs_layers(P, STEEL, STEEL, hw=3.0, knee_pal=GOLD)
    L.append(lb)
    if g == 'f':
        braid = B.blank()
        for y in range(17 + b, 44 + b):
            sx = 15 - round((y - 17 - b) * 0.12) + round(math.sin(y * 0.3 + P.k) * 0.6)
            for d in range(3):
                braid.p(sx + d, y, ['hb1', 'hb2', 'hb3'][(d + y // 2) % 3] if (y + d) % 4 else 'hb0')
        shade(braid, rect(13, 44 + b, 3, 2), RED)
        L.append(braid)
    # tronco de aço de perfil: peito para a frente
    torso = B.blank()
    pts = []
    for y in range(22 + b, 43 + b):
        t = (y - 22 - b) / 20
        x0 = round(18 - math.sin(t * 2.6) * 1.0)
        x1 = round(30 + math.sin(min(1, t * 1.6) * math.pi) * 1.6 - t * 1.5)
        pts += [(x, y) for x in range(x0, x1 + 1)]
    shade(torso, pts, STEEL)
    torso.hl(19, 35 + b, 11, 'g2'); torso.hl(19, 36 + b, 11, 'g1'); torso.hl(19, 37 + b, 11, 'le1')
    for y in range(38 + b, 48 + b):                                   # tabardo na frente
        torso.hl(26, y, 3, 'r2'); torso.p(26, y, 'r3'); torso.p(28, y, 'r1')
    for i, y in enumerate((38 + b, 41 + b)):                           # faldas
        shade(torso, rect(18, y, 9, 3), STEEL, spec=False)
        torso.hl(18, y + 2, 9, 'g1')
    L.insert(len(L), torso)
    L.insert(L.index(torso), lf)
    # elmo de perfil: cilindro com viseira na frente e crista para trás
    crest = B.blank()
    for i in range(50):
        kk = i / 49
        x = 26 - kk * 16
        y = 6 + b - math.sin(kk * 2.0) * 4 + kk * kk * 16
        r = 3.4 - kk * 2.2
        crest.disk(x, y, r, 'g0')
        crest.disk(x - 0.3, y - 0.4, r * 0.7, 'g1')
        crest.disk(x - 0.6, y - 0.8, r * 0.4, 'g2')
    L.append(crest)
    helm = B.blank()
    hp = rect(18, 8 + b, 12, 12) + [p for p in ell(24, 8.5 + b, 6, 3.5) if p[1] < 9 + b]
    shade(helm, hp, STEEL)
    helm.r(27, 13 + b, 3, 1, 'noite')                                  # fenda da viseira
    helm.hl(18, 12 + b, 12, 'g2'); helm.hl(18, 15 + b, 12, 'g1')
    helm.p(27, 12 + b, 'g3')
    for (x, y) in ((28, 17), (28, 18), (26, 18)):
        helm.p(x, y + b, 's0')
    helm.hl(19, 20 + b, 10, 'g2'); helm.hl(19, 21 + b, 10, 'g1')
    L.append(helm)
    # ombreira de perto
    pd = B.blank()
    shade(pd, ell(23, 25 + b, 5.6, 4.2), STEEL)
    for (x, y) in ell(23, 25 + b, 5.6, 4.2):
        if y == 28 + b:
            pd.p(x, y, 'g2')
    # braço de perto com a maça, balançando
    arm = B.blank()
    el, hn = arm_pts(sh, P.swing_near, bend=12)
    draw_arm(arm, sh, el, hn, STEEL, STEEL, hw=2.6, cuff=['g0', 'g1', 'g2'], hand_r=3.0)
    mace = B.blank()
    B.draw_local(mace, (hn[0] + 0.5, hn[1] + 1), 158 - P.swing_near * 0.4, A.mace(), 0.9)
    L.append(mace)
    L.append(arm)
    L.append(pd)
    # escudo na frente (braço de longe estendido), de leve três-quartos
    shield = B.blank()
    sx, sy = 33, 28 + b + round(math.sin(P.k / 8 * 4 * math.pi) * 0.6)
    spts = []
    for y in range(sy, sy + 23):
        t = (y - sy) / 22
        hw = 5 if t < 0.45 else 5 * math.sqrt(max(0, 1 - ((t - 0.45) / 0.55) ** 2))
        spts += [(x, y) for x in range(round(sx - hw), round(sx + hw) + 1)]
    shade(shield, spts, RED)
    rows = {}
    for (x, y) in spts:
        rows.setdefault(y, []).append(x)
    for y, xs in rows.items():
        shield.p(min(xs), y, 's3'); shield.p(max(xs), y, 's1')
    shield.hl(sx - 5, sy, 11, 's4')
    for (y, x0, x1) in ((7, -3, 3), (8, -4, 4), (9, -3, 3)):
        shield.hl(sx + x0, sy + y, x1 - x0 + 1, 'g2')
    for (x, y) in ((0, 7), (0, 8), (0, 9), (-1, 8), (1, 8)):
        shield.p(sx + x, sy + y, 'ember')
    shield.p(sx, sy + 8, 'noite')
    L.append(shield)
    return L


# ── Selvagem ─────────────────────────────────────────────────────────────

def selvagem(P, g):
    b = P.bob
    hair = HAIR['red' if g == 'm' else 'blond']
    sh = (24, 27 + b)
    L = []
    # machado no ombro: cabo da mão (na frente do peito) para trás e para cima
    axe = B.blank()
    grip = (30, 28 + b)
    B.draw_local(axe, grip, -150, A.axe(), 0.76)
    L.append(axe)
    # braço de longe solto
    back_arm = B.blank()
    el, hn = arm_pts((sh[0] - 1, sh[1]), P.swing_far)
    draw_arm(back_arm, (sh[0] - 1, sh[1]), el, hn, far(SKIN), far(SKIN), cuff=far(LEATHER))
    L.append(back_arm)
    lb, lf = legs_layers(P, LEATHER, FUR, boot_top=4)
    L.append(lb)
    torso = B.blank()
    pts = []
    for y in range(24 + b, 40 + b):
        t = (y - 24 - b) / 15
        x0 = round(18 - math.sin(t * 2.4) * 1.0)
        x1 = round(29 + math.sin(min(1, t * 1.5) * math.pi) * 1.5 - t)
        pts += [(x, y) for x in range(x0, x1 + 1)]
    shade(torso, pts, SKIN)
    torso.vl(29, 31 + b, 2, 'k1'); torso.hl(26, 33 + b, 3, 'k1'); torso.hl(26, 36 + b, 3, 'k1')
    if g == 'm':
        for kk in range(5):
            torso.p(23 + kk, 27 + kk + b, 'b2')
    else:
        shade(torso, [p for p in pts if 26 + b <= p[1] <= 32 + b], FUR, spec=False)
        torso.hl(18, 32 + b, 13, 'fu0')
    L.append(torso)
    L.append(lf)
    kilt = B.blank()
    skirt(kilt, P, 38 + b, 47 + b, FUR, 15, 30, jag=True, waist=(17, 29))
    kilt.hl(17, 38 + b, 13, 'le1'); kilt.hl(17, 39 + b, 13, 'le0')
    L.append(kilt)
    # cabeça
    head = B.blank()
    if g == 'f':
        for y in range(14 + b, 34 + b):                                 # trança nas costas
            x0 = 16 - round((y - 14 - b) * 0.1)
            for d in range(3):
                head.p(x0 + d, y, hair[(d + y // 2) % 3 + 1] if (y + d) % 3 else hair[0])
        head.r(15, 34 + b, 3, 2, 'le1')
    shade(head, ell(21, 12 + b, 7, 7.5), hair)
    ey = head_profile(head, 23.5, 13 + b, SKIN, brow=hair[1], ear=False)
    shade(head, [p for p in ell(22.5, 11 + b, 8, 7.5) if p[1] <= 7 + b or p[0] <= 20], hair)   # topo e nuca
    head.r(21, ey, 2, 3, 'k1'); head.p(22, ey + 1, 'k0')                    # orelha
    if g == 'm':
        beard = [p for p in ell(26, ey + 8, 5, 6.5) if p[1] >= ey + 3 and p[0] >= 21]
        shade(head, beard, hair, spec=False)
        head.hl(26, ey + 3, 5, hair[2]); head.hl(27, ey + 5, 3, 'r0')
        for y in range(ey + 13, ey + 17):
            head.r(26, y, 2, 1, hair[1 + y % 2])
        head.r(26, ey + 17, 2, 1, 'le1')
    else:
        head.p(27, ey + 2, 'b2'); head.p(28, ey + 2, 'b1')
        head.hl(28, ey + 5, 2, 'r2')
    L.append(head)
    mantle = B.blank()
    mp = [p for p in ell(22, 24 + b, 8.5, 5) if p[1] <= 28 + b]
    shade(mantle, mp, FUR)
    for (x, y) in mp:
        if HD.hsh(x, y, 5) < 0.18:
            mantle.p(x, y, 'fu3')
    shade(mantle, [(15 + dx, 19 + b + dy) for dy in range(3) for dx in range(-dy, dy + 1)], FUR)   # orelha do lobo
    if g == 'm':
        for x in range(25, 30, 3):
            mantle.r(x, 26 + b, 2, 2, 'n2')
    L.append(mantle)
    # braço de perto segura o cabo na frente do peito
    arm = B.blank()
    el = (26, 36 + b)
    draw_arm(arm, sh, el, grip, ['k0', 'k1', 'k2', 'k2'], SKIN, cuff=LEATHER)
    L.append(arm)
    return L


# ── Lanceiro / Lanceira ──────────────────────────────────────────────────

def lanceiro(P, g):
    b = P.bob
    skin = SKIND if g == 'm' else SKIN
    sh = (24, 26 + b)
    L = []
    # escudo redondo nas costas (de lado: elipse estreita)
    shield = B.blank()
    cx, cy = 15, 34 + b
    sp = ell(cx, cy, 3.2, 8.5)
    shade(shield, sp, WOOD)
    for (x, y) in sp:
        if ((x - cx) / 3.2) ** 2 + ((y - cy) / 8.5) ** 2 > 0.62:
            shield.p(x, y, 's3' if y < cy else 's1')
    shade(shield, ell(cx - 2, cy, 1.2, 2.2), GOLD)
    L.append(shield)
    back_arm = B.blank()
    el, hn = arm_pts((sh[0] - 1, sh[1]), P.swing_far)
    draw_arm(back_arm, (sh[0] - 1, sh[1]), el, hn, far(BLUE), far(STEEL), cuff=far(GOLD))
    L.append(back_arm)
    lb, lf = legs_layers(P, WOOD, LEATHER, boot_top=5, knee_pal=STEEL)
    L.append(lb)
    L.append(lf)
    coat = B.blank()
    pts = []
    for y in range(23 + b, 38 + b):
        t = (y - 23 - b) / 14
        x0 = round(18 - math.sin(t * 2.4) * 0.8)
        x1 = round(29 + math.sin(min(1, t * 1.5) * math.pi) * 1.4 - t)
        pts += [(x, y) for x in range(x0, x1 + 1)]
    shade(coat, pts, BLUE)
    sk = skirt(coat, P, 38 + b, 47 + b, BLUE, 16, 31, waist=(18, 29))
    for (x, y) in pts + sk:
        if (x - 13) % 4 == 0 and y > 26 + b:
            coat.p(x, y, 'b0')
    for y in range(24 + b, 48 + b):                                     # abotoamento na frente
        xs = [x for (x, yy) in pts + sk if yy == y]
        if xs:
            coat.p(max(xs) - 1, y, 'g2'); coat.p(max(xs) - 2, y, 'g1')
    rows = {}
    for (x, y) in sk:
        rows.setdefault(y, []).append(x)
    yb = max(rows)
    coat.hl(min(rows[yb]), yb, len(rows[yb]), 'g1')
    coat.hl(18, 37 + b, 12, 'le1'); coat.hl(18, 38 + b, 12, 'le0'); coat.r(26, 37 + b, 2, 2, 'g3')
    shade(coat, trap(21 + b, 25 + b, 20, 28, 19, 29), STEEL, spec=False)   # gola de malha
    for (x, y) in trap(21 + b, 25 + b, 20, 28, 19, 29):
        if (x + y) % 2:
            coat.p(x, y, 's1')
    L.append(coat)
    head = B.blank()
    if g == 'f':
        shade(head, ell(21, 15 + b, 7, 7), HAIR['brown'])
        shade(head, ell(16, 20 + b, 3, 3.5), HAIR['brown'])            # coque
    ey = head_profile(head, 23.5, 15 + b, skin)
    if g == 'm':
        beard = [p for p in ell(25.5, ey + 6, 5, 4.5) if p[1] >= ey + 3 and p[0] >= 21]
        shade(head, beard, HAIR['black'], spec=False)
        head.hl(27, ey + 4, 3, 'r0')
        shade(head, [p for p in ell(20.5, 13 + b, 3.5, 4.5) if p[0] <= 21], HAIR['black'], spec=False)
        head.r(22, ey, 2, 3, 'kd2'); head.p(23, ey + 1, 'kd1')
    else:
        head.hl(28, ey + 5, 2, 'r2')
        shade(head, [p for p in ell(20.5, 14 + b, 4.5, 5.5) if p[0] <= 21], HAIR['brown'])
        head.r(22, ey, 2, 3, 'k1'); head.p(23, ey + 1, 'k0')
    # chapéu de ferro: copa e aba larga, de lado
    shade(head, [p for p in ell(23, 9 + b, 7, 6) if p[1] <= 11 + b], STEEL)
    head.vl(23, 3 + b, 9, 's4'); head.vl(24, 4 + b, 8, 's2')
    brim = [(x, y) for y in range(11 + b, 13 + b) for x in range(11 - (y - 11 - b), 36 + (y - 11 - b))]
    shade(head, brim, STEEL, ly=-1.6)
    head.hl(10, 13 + b, 27, 's0')
    L.append(head)
    # alabarda em pé na frente, segura pela mão de perto
    pole = B.blank()
    grip = (35, 40 + b)
    B.draw_local(pole, grip, -90, A.polearm(), 0.82)
    L.append(pole)
    arm = B.blank()
    draw_arm(arm, sh, (28, 35 + b), (35, 39 + b), BLUE, STEEL, cuff=GOLD)
    L.append(arm)
    return L


# ── Arqueiro / Arqueira ──────────────────────────────────────────────────

def arqueiro(P, g):
    b = P.bob
    skin = SKIN if g == 'm' else SKIND
    sh = (24, 26 + b)
    L = []
    # aljava nas costas, com as penas aparecendo por cima do ombro
    q = B.blank()
    B.draw_local(q, (15, 36 + b), -105, [B.box(0, 18, -3, 3, LEATHER), B.box(3, 3, -3, 3, None, flat='g1'),
                                         B.box(15, 15, -3, 3, None, flat='g1')])
    for i, (x, y) in enumerate(((13, 13), (15, 12), (17, 13))):
        q.vl(x + 1, y + b + 3, 5, 'wo2')
        for yy in range(y + b, y + b + 4):
            q.p(x, yy, 'wh3' if i != 1 else 'r2'); q.p(x + 2, yy, 'wh2' if i != 1 else 'r1')
    L.append(q)
    back_arm = B.blank()
    el, hn = arm_pts((sh[0] - 1, sh[1]), P.swing_far)
    draw_arm(back_arm, (sh[0] - 1, sh[1]), el, hn, far(GREEN), far(skin), cuff=far(LEATHER))
    L.append(back_arm)
    lb, lf = legs_layers(P, WOOD, LEATHER, boot_top=8)
    L.append(lb)
    L.append(lf)
    body = B.blank()
    sk = skirt(body, P, 39 + b, 48 + b, GREEN, 16, 31, jag=True, waist=(18, 29))
    pts = []
    for y in range(24 + b, 41 + b):
        t = (y - 24 - b) / 16
        x0 = round(18 - math.sin(t * 2.4) * 0.8)
        x1 = round(29 + math.sin(min(1, t * 1.5) * math.pi) * 1.4 - t)
        pts += [(x, y) for x in range(x0, x1 + 1)]
    shade(body, pts, LEATHER)
    for (x, y) in ((26, 29), (26, 34), (22, 31), (28, 37)):
        body.p(x, y + b, 'g2'); body.p(x + 1, y + 1 + b, 'g0')
    body.hl(18, 39 + b, 12, 'le0'); body.r(26, 38 + b, 3, 3, 'g2'); body.p(27, 39 + b, 'g0')
    for kk in range(12):
        body.p(19 + kk // 2 + kk % 2, 25 + kk + b, 'le0')               # alça da aljava
    L.append(body)
    head = B.blank()
    if g == 'f':
        for y in range(16 + b, 38 + b):                                  # rabo de cavalo
            x = 14 - round((y - 16 - b) * 0.12) + round(math.sin(y * 0.3 + P.k * 0.8) * 0.8)
            for d in range(3):
                head.p(x + d, y, HAIR['black'][(d + y // 3) % 3 + 1] if (y + d) % 4 else 'bk0')
    ey = head_profile(head, 24, 14 + b, skin)
    hair = HAIR['brown'] if g == 'm' else HAIR['black']
    shade(head, [p for p in ell(25, 8.5 + b, 5, 2.5)], hair)
    if g == 'm':
        beard = [p for p in ell(26, ey + 6, 4.5, 4) if p[1] >= ey + 3 and p[0] >= 22]
        shade(head, beard, hair, spec=False)
        head.hl(28, ey + 4, 2, 'r0')
    else:
        head.hl(28, ey + 5, 2, 'r1')
    # capuz: cobre a nuca e o alto, aberto no rosto
    hood = [p for p in ell(22, 13 + b, 9, 10.5) if not (p[0] >= 22 and 7 + b <= p[1] <= 24 + b)]
    hood += [(x, y) for y in range(4 + b, 8 + b) for x in range(22, 28) if (x - 22) <= (y - 3 - b) * 1.5]
    shade(head, hood, GREEN)
    head.vl(22, 8 + b, 15, 'v0')
    L.append(head)
    cap = B.blank()
    cp = []
    for y in range(21 + b, 31 + b):
        a, bx = (17, 29) if y < 23 + b else (15, 31)
        for x in range(a, bx + 1):
            if y >= 29 + b and (x // 3) % 2:
                continue
            cp.append((x, y))
    shade(cap, cp, GREEN)
    cap.r(27, 24 + b, 2, 2, 'g2'); cap.p(28, 24 + b, 'g3')
    L.append(cap)
    # arco em pé na frente, mão de perto na empunhadura
    bow = B.blank()
    grip = (36, 36 + b)
    B.draw_local(bow, grip, -90, A.bow(bulge=3.5, curl=1.5), 1.0)
    L.append(bow)
    arm = B.blank()
    draw_arm(arm, sh, (28, 33 + b), (34, 36 + b), GREEN, skin, cuff=LEATHER)
    B.limb(arm, (29, 34 + b), (32, 35.5 + b), 3.2, LEATHER, cap0=False, cap1=False)   # braçadeira
    L.append(arm)
    return L


# ── Clérigo / Clériga ────────────────────────────────────────────────────

def robe_layer(P, pal, top, bottom, shoulder=(18, 29), hem_pal=None, jag=False):
    """Túnica longa de perfil: a barra abre para a frente e para trás com as pernas."""
    c = B.blank()
    kf = leg_geom(P.front, P.hip)[1]
    kb = leg_geom(P.back, P.hip)[1]
    front = max(kf[0], kb[0]) + 4
    back = min(kf[0], kb[0]) - 3
    pts = []
    for y in range(top, bottom + 1):
        t = (y - top) / max(1, bottom - top)
        tt = max(0.0, (t - 0.35) / 0.65)
        a = round(shoulder[0] - 1 * t + (min(back, shoulder[0] - 4) - shoulder[0] + 1) * tt)
        bx = round(shoulder[1] + 1.5 * math.sin(min(1, t * 2.5) * math.pi / 2) + (max(front, shoulder[1] + 4) - shoulder[1] - 1.5) * tt)
        pts += [(x, y) for x in range(a, bx + 1)]
    shade(c, pts, pal)
    return c, pts


def clerigo(P, g):
    b = P.bob
    sh = (24, 25 + b)
    L = []
    back_arm = B.blank()
    el, hn = arm_pts((sh[0] - 1, sh[1]), P.swing_far)
    draw_arm(back_arm, (sh[0] - 1, sh[1]), el, hn, far(LINEN), far(SKIN), cuff=far(GOLD))
    L.append(back_arm)
    # pés que aparecem sob a barra
    feet = B.blank()
    for ph, pal in ((P.back, ['le0', 'le0', 'le1']), (P.front, ['le0', 'le1', 'le2'])):
        knee, ank, a2 = leg_geom(ph, P.hip)
        B.draw_local(feet, (ank[0] - 1, ank[1] + 0.5), 10 + max(0.0, -math.sin(a2)) * 30, [B.box(-1, 6, -2.2, 2.0, pal, spec=False)])
    L.append(feet)
    robe, pts = robe_layer(P, LINEN, 23 + b, 60)
    for (x, y) in pts:
        if (x - 11) % 5 == 4 and y > 42:
            robe.p(x, y, 'n0')
    rows = {}
    for (x, y) in pts:
        rows.setdefault(y, []).append(x)
    for y in (58, 59, 60):
        if y in rows:
            robe.hl(min(rows[y]), y, max(rows[y]) - min(rows[y]) + 1, 'g2' if y == 58 else ('g1' if y == 59 else 'g0'))
    for y in range(25 + b, 50 + b):                                      # estola na frente
        if y in rows:
            x1 = max(rows[y])
            robe.r(x1 - 3, y, 2, 1, 'r2'); robe.p(x1 - 3, y, 'r3'); robe.p(x1 - 1, y, 'r1')
    if 50 + b in rows:
        robe.r(max(rows[50 + b]) - 3, 50 + b, 2, 2, 'g2')
    robe.hl(19, 37 + b, 11, 'g1')
    L.append(robe)
    head = B.blank()
    if g == 'f':
        shade(head, [(x, y) for y in range(5 + b, 29 + b) for x in range(round(15 - (y - 5 - b) * 0.15), 27)
                     if not (x >= 22 and 8 + b <= y <= 22 + b)], LINEN)          # véu
    ey = head_profile(head, 24, 14 + b, SKIN)
    if g == 'm':
        shade(head, [p for p in ell(23, 10 + b, 6, 4) if p[1] <= 11 + b], SKIN)   # calva
        head.p(21, 7 + b, 'k3'); head.p(22, 7 + b, 'k3')
        shade(head, rect(18, 12 + b, 4, 7), HAIR['white'])
        head.hl(26, ey - 2, 3, 'wh2')
        beard = [(x, y) for y in range(ey + 3, ey + 18) for x in range(21, 32) if x <= 31 - (y - ey - 3) * 0.35 and x >= 22 + (y - ey - 3) * 0.2]
        shade(head, beard, HAIR['white'], spec=False)
        for (x, y) in beard:
            if (x + y) % 5 == 0:
                head.p(x, y, 'wh1')
        head.hl(28, ey + 4, 2, 'k0')
    else:
        head.hl(28, ey + 5, 2, 'r2')
        head.hl(17, 8 + b, 11, 'g2'); head.hl(17, 9 + b, 11, 'g1'); head.r(26, 7 + b, 2, 2, 'g3')
    L.append(head)
    # martelo erguido na frente, mão de perto no cabo; lanterna na de longe não aparece
    ham = B.blank()
    grip = (33, 34 + b)
    B.draw_local(ham, grip, -80, A.hammer(), 0.75)
    L.append(ham)
    arm = B.blank()
    draw_arm(arm, sh, (27, 32 + b), (32, 34 + b), LINEN, SKIN, cuff=GOLD)
    L.append(arm)
    return L


# ── Piromante ────────────────────────────────────────────────────────────

def piromante(P, g):
    b = P.bob
    sh = (23, 25 + b)
    L = []
    hand = SKIN if g == 'f' else ['k0', 'k0', 'k1', 'k1']
    back_arm = B.blank()
    el, hn = arm_pts((sh[0] - 1, sh[1]), P.swing_far)
    draw_arm(back_arm, (sh[0] - 1, sh[1]), el, hn, far(PURPLE), far(hand), cuff=['p0', 'p0', 'p1'])
    L.append(back_arm)
    feet = B.blank()
    for ph, pal in ((P.back, ['bk0', 'bk0', 'bk1']), (P.front, ['bk0', 'bk1', 'bk2'])):
        knee, ank, a2 = leg_geom(ph, P.hip)
        B.draw_local(feet, (ank[0] - 1, ank[1] + 0.5), 10 + max(0.0, -math.sin(a2)) * 30, [B.box(-1, 6, -2.2, 2.0, pal, spec=False)])
    L.append(feet)
    robe, pts = robe_layer(P, PURPLE, 22 + b, 60, shoulder=(17, 29))
    rows = {}
    for (x, y) in pts:
        rows.setdefault(y, []).append(x)
        if (x - 10) % 5 == 4 and y > 40:
            robe.p(x, y, 'p0')
    for y in range(56, 61):                                              # barra em brasa
        if y in rows:
            for x in rows[y]:
                hh = 2 + round(HD.hsh(x, 1, 4) * 2)
                if y >= 61 - hh:
                    robe.p(x, y, 'f1' if y > 58 else ('f0' if y > 57 else 'p0'))
    robe.hl(18, 38 + b, 11, 'g1'); robe.r(27, 38 + b, 2, 6, 'g1')
    L.append(robe)
    hood = B.blank()
    hp = []
    for y in range(2 + b, 29 + b):
        t = (y - 2 - b) / 26
        a = round(22 - t * 8)
        bx = round(24 + t * 6) if t < 0.75 else round(28.5 - (t - 0.75) * 6)
        hp += [(x, y) for x in range(a, bx + 1)]
    hp += [p for p in ell(23, 17 + b, 8, 9) if p[1] >= 10 + b]
    shade(hood, hp, PURPLE)
    face = [p for p in ell(27, 17 + b, 4, 6.5) if p[0] >= 25]
    shade(hood, face, ['noite', 'noite', 'p0'], spec=False)
    glow = ['f2', 'f2', 'f3', 'f2'][P.k % 4]
    hood.r(28, 15 + b, 2, 2, 'f1'); hood.p(29, 15 + b, glow)
    if g == 'f':
        shade(hood, [p for p in ell(28, 21 + b, 3, 3) if p[1] >= 19 + b], SKIN, spec=False)
        hood.hl(28, 22 + b, 2, 'r2')
        hp2 = [(29 + round(math.sin(y * 0.45) * 0.6) + d, y) for y in range(23 + b, 34 + b) for d in range(2)]
        shade(hood, hp2, HAIR['red'])
    L.append(hood)
    staff = B.blank()
    grip = (34, 42 + b)
    B.draw_local(staff, grip, -90, A.staff(), 0.92)
    fb = A.staff_flame_base(grip, -90, 0.92)
    L.append(staff)
    fl = B.blank()
    HD.flame(fl, round(fb[0]), round(fb[1]), 8, P.k, 0.4)
    L.append(fl)
    arm = B.blank()
    draw_arm(arm, sh, (27, 34 + b), (33, 39 + b), PURPLE, hand, cuff=['p0', 'p1', 'p1'])
    L.append(arm)
    return L


LOOK = {'guardiao': guardiao, 'selvagem': selvagem, 'lanceiro': lanceiro,
        'arqueiro': arqueiro, 'clerigo': clerigo, 'piromante': piromante}


def frame(cls, g, k):
    P = Pose(k)
    return compose(LOOK[cls](P, g))


def frames(cls, g):
    return [frame(cls, g, k) for k in range(8)]
