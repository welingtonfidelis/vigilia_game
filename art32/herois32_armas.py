"""Armas e braços dos heróis 32-bit, em coordenadas locais (u ao longo, v de lado).

Cada arma reproduz a peça do modelo detalhado (hd24) quando está na pose de descanso, mas
pode girar em qualquer ângulo (e com escorço) sem serrilhar: o pixel é decidido pela forma
local e a luz continua vindo de cima-esquerda. A origem é a empunhadura (onde fica a mão).
"""
import math

import herois32_base as B
from herois32_base import rod, box, mask, disk
import hd24 as HD

STEEL, GOLD, WOOD, LEATHER = HD.STEEL, HD.GOLD, HD.WOOD, HD.LEATHER


# ── armas (pose de descanso: ângulo, empunhadura) ───────────────────────

def mace():
    """Maça de flanges do Guardião. Descanso: empunhadura (11.5, 44), ângulo 90 (para baixo)."""
    return [
        rod(-2, 7, 1.0, ['wo0', 'wo1', 'wo2'], spec=False),
        box(6, 6, -2, 2, None, flat='g1'),
        disk(11.5, 0, 4.2, STEEL, bill=True),
        disk(11.5 + 5.6, 0, 1.0, STEEL, bill=True, spec=False),
        disk(11.5 - 5.6, 0, 1.0, STEEL, bill=True, spec=False),
        disk(11.5, 5.6, 1.0, STEEL, bill=True, spec=False),
        disk(11.5, -5.6, 1.0, STEEL, bill=True, spec=False),
    ]


MACE_REST = ((11.5, 44), 90)


def axe():
    """Machado do Selvagem. Descanso: empunhadura (40, 47), ângulo -90 (para cima)."""
    def blade_w(u):
        k = (u - 33) / 10
        return round(7 * math.sqrt(max(0.0, 1 - k * k)))

    def in_blade(u, v):
        return 23 - 0.5 <= u <= 43.5 and 1.5 <= v <= 2 + blade_w(round(u)) + 0.5

    def edge(u, v):
        return 's4' if v >= 2 + blade_w(round(u)) - 0.5 else None

    def wraps(u, v):
        return 'le1' if round(u) in (17, 20, 23) else None
    return [
        rod(-12, 37, 1.0, WOOD, color=wraps),
        mask(in_blade, 23, 43, 2, 9, STEEL, color=edge),
        box(33, 38, -6, -2, STEEL, spec=False),
        box(39, 40, 0, 0, None, flat='s3'),
    ]


AXE_REST = ((40, 47), -90)


def polearm():
    """Alabarda do Lanceiro. Descanso: empunhadura (40, 46), ângulo -90."""
    def tip(u, v):
        return 38.5 <= u <= 46.5 and abs(v) <= (47 - round(u)) // 3 + 0.01

    def blade(u, v):
        uu, vv = round(u), round(v)
        return 28 <= uu <= 38 and 2 <= vv <= 6 and vv - 2 <= min(39 - uu, uu - 27)

    def ring(u, v):
        uu = round(u)
        return 'g2' if uu == 27 else ('g1' if uu == 26 else None)
    return [
        rod(-16, 40, 1.0, WOOD, color=ring),
        mask(tip, 39, 46, -2, 2, STEEL),
        mask(blade, 28, 38, 2, 6, STEEL),
        box(32, 35, -5, -2, STEEL, spec=False),
    ]


POLEARM_REST = ((40, 46), -90)


def hammer():
    """Martelo do Clérigo. Descanso: empunhadura (39, 45), ângulo -90."""
    def bands(u, v):
        return 'g1' if round(u) in (15, -1) else None

    def head_col(u, v):
        uu, vv = round(u), round(v)
        if uu == 29:
            return 's0'
        if vv == 0:
            return 'g2'
        if vv == -1:
            return 'g1'
        return None
    return [
        rod(-2, 29, 1.0, WOOD, color=bands),
        box(29, 36, -6, 6, STEEL, color=head_col),
    ]


HAMMER_REST = ((39, 45), -90)


def staff():
    """Cajado do Piromante (sem a chama, que sobe sempre para cima). Descanso: (40, 45), -90."""
    return [
        rod(-17, 33, 1.0, WOOD),
        box(32, 36, -3, 3, ['s0', 's1', 's2']),
        box(36, 41, -3, -3, None, flat='s1'),
        box(36, 41, 3, 3, None, flat='s1'),
    ]


STAFF_REST = ((40, 45), -90)
STAFF_FLAME_U = 35      # a chama nasce aqui (base em y = 10 no descanso)


def staff_flame_base(grip, ang, fs=1.0):
    a = math.radians(ang)
    return grip[0] + math.cos(a) * STAFF_FLAME_U * fs, grip[1] + math.sin(a) * STAFF_FLAME_U * fs


def bow(draw=0.0, L=27, bulge=4.5, curl=2.2, string=True, arrow=False):
    """Arco longo. u ao longo do arco (centro na empunhadura), v para o lado da barriga.
    draw = quanto a corda foi puxada (px para o lado de dentro)."""
    def limb_v(u):
        k = max(-1.0, min(1.0, u / L))
        bend = 1 + draw / 30.0
        return bulge * bend * math.sqrt(max(0.0, 1 - k * k)) - curl * k ** 4 - 2.5

    def in_limb(u, v):
        if abs(u) > L + 0.5:
            return False
        lv = limb_v(u)
        return lv - 1.4 <= v <= lv + 0.6

    prims = [mask(in_limb, -L, L, -4, bulge + 2, WOOD)]
    tip_v = limb_v(L)

    def in_string(u, v):
        if not string or abs(u) > L - 1:
            return False
        if draw <= 0.5:
            return abs(v - (tip_v + 0.3)) <= 0.5
        # duas retas das pontas até o ponto de puxada (u=0, v=tip_v - draw)
        k = 1 - abs(u) / (L - 1)
        sv = tip_v + 0.3 - draw * k
        return abs(v - sv) <= 0.55

    prims.append(mask(in_string, -L, L, tip_v - draw - 1, tip_v + 1, None, flat='wh1'))
    prims.append(box(-3, 3, -0.5 + limb_v(0) - 1.5, limb_v(0) + 0.5, LEATHER))
    if arrow:
        nock = tip_v + 0.3 - draw

        def in_arrow(u, v):
            return abs(u) <= 0.5 and nock - 0.5 <= v <= limb_v(0) + 9
        prims.append(mask(in_arrow, -1, 1, nock, limb_v(0) + 9, None, flat='wo2'))
        prims.append(mask(lambda u, v: abs(u) <= 1.6 - (v - limb_v(0) - 9) * 0.5 and limb_v(0) + 9 <= v <= limb_v(0) + 12,
                          -2, 2, limb_v(0) + 9, limb_v(0) + 12, STEEL))
        prims.append(mask(lambda u, v: 1 <= abs(u) <= 2 and nock - 0.5 <= v <= nock + 3,
                          -2, 2, nock, nock + 3, None, flat='wh3'))
    return prims


def lantern_draw(c, x, y, lit=True, tilt=0):
    """Lanterna do Clérigo pendurada em (x, y) (alça)."""
    c.vl(x, y, 4, 'g0')
    pts = HD.rect(x - 3, y + 4, 7, 9)
    HD.shade(c, pts, GOLD)
    HD.shade(c, HD.rect(x - 2, y + 6, 5, 5), HD.FIRE if lit else ['bk0', 'bk1', 'bk2'])
    if lit:
        c.p(x, y + 8, 'f3')
    c.hl(x - 3, y + 13, 7, 'g0')
    c.r(x - 1, y + 14, 3, 1, 'g0')


# ── braços ───────────────────────────────────────────────────────────────

ARM_STYLES = {
    # sleeve, hand, cuff, largura/2, comprimentos (braço, antebraço até o miolo da mão)
    'guardiao': dict(sleeve=STEEL, hand=STEEL, cuff=['g0', 'g1', 'g2'], hw=2.6, l1=8, l2=10, elbow='s0', hand_r=(3.4, 2.8)),
    'selvagem': dict(sleeve=HD.SKIN, hand=HD.SKIN, cuff=LEATHER, hw=3.0, l1=9, l2=11, elbow='k1', hand_r=(3.6, 3.0)),
    'lanceiro': dict(sleeve=HD.BLUE, hand=STEEL, cuff=GOLD, hw=3.0, l1=9, l2=11, elbow='b0', hand_r=(3.6, 3.0)),
    'arqueiro': dict(sleeve=HD.GREEN, hand=None, cuff=LEATHER, hw=3.0, l1=9, l2=11, elbow='v0', hand_r=(3.6, 3.0)),
    'clerigo': dict(sleeve=HD.LINEN, hand=HD.SKIN, cuff=GOLD, hw=3.0, l1=9, l2=11, elbow='n0', hand_r=(3.6, 3.0)),
    'piromante': dict(sleeve=HD.PURPLE, hand=None, cuff=['p0', 'p1', 'p1'], hw=3.0, l1=9, l2=11, elbow='p0', hand_r=(3.6, 3.0)),
}


def ik(S, Hn, l1, l2, bend=1):
    """Cotovelo de um braço de dois ossos (bend=±1 escolhe para que lado dobra)."""
    dx, dy = Hn[0] - S[0], Hn[1] - S[1]
    d = math.hypot(dx, dy)
    d = max(0.01, min(d, l1 + l2 - 0.01))
    a0 = math.atan2(dy, dx)
    cosb = max(-1.0, min(1.0, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))
    a = a0 + bend * math.acos(cosb)
    return S[0] + l1 * math.cos(a), S[1] + l1 * math.sin(a)


def arm_layer(style, S, Hn, bend=1, hand_pal=None, bracer=False):
    """Braço desenhado do ombro S até a mão Hn (camada sem contorno)."""
    st = ARM_STYLES[style]
    c = B.blank()
    E = ik(S, Hn, st['l1'], st['l2'], bend)
    dx, dy = Hn[0] - E[0], Hn[1] - E[1]
    d = math.hypot(dx, dy) or 1
    W0 = (E[0] + dx / d * (d - 3.2), E[1] + dy / d * (d - 3.2))      # punho
    B.limb(c, S, E, st['hw'], st['sleeve'])
    B.limb(c, E, W0, st['hw'], st['sleeve'], cap0=False)
    c.p(round(E[0]), round(E[1]), st['elbow'])
    if st['cuff']:
        cf = (E[0] + dx / d * (d - 5.2), E[1] + dy / d * (d - 5.2))
        B.limb(c, cf, W0, st['hw'] + 0.2, st['cuff'], spec=False, cap0=False, cap1=False)
    if bracer:
        cf = (E[0] + dx / d * 1.5, E[1] + dy / d * 1.5)
        B.limb(c, cf, (E[0] + dx / d * 6.5, E[1] + dy / d * 6.5), st['hw'] + 0.3, LEATHER, cap0=False, cap1=False)
    return c


def hand_layer(style, Hn, hand_pal):
    st = ARM_STYLES[style]
    c = B.blank()
    pal = hand_pal or st['hand']
    rx, ry = st['hand_r']
    pts = HD.ell(Hn[0], Hn[1], rx, ry)
    HD.shade(c, pts, pal, spec=False)
    return c
