"""Folhas de frente dos heróis 32-bit (18 quadros de 48×64, mesma ordem da 16-bit).

0–3 parado (respiração do modelo), 4–7 correndo de frente, 8 acerto, 9–12 golpe,
13–17 morte. Tudo montado com as peças do modelo detalhado (hd24): as pernas e os
braços são separados, as armas são redesenhadas em qualquer ângulo (herois32_armas) e o
corpo inclina com RotSprite, com a luz das peças girada ao contrário.
"""
import math

import herois32_base as B
import herois32_armas as A
import hd24 as HD

W, H = B.W, B.H


# ── Montagem por peças ──────────────────────────────────────────────────

class Rig:
    """Um herói de frente: as peças do hd24 com nome, e o que cada braço segura."""

    def __init__(self, cls, g):
        self.cls, self.g = cls, g
        look = HD.guardiao_f if cls == 'guardiao' else HD.LOOKS[(cls, g)]
        layers = look()
        if cls == 'guardiao' and g == 'm':
            layers = [(fn, up) for fn, up in layers if fn.__name__ != 'braid']
        self.layers = layers
        self.names = [fn.__name__ for fn, _ in layers]
        self.cfg = CFG[cls]

    def pieces(self, t=0, light=0.0, hurt=False):
        """Lista (nome, camada crua, sobe_com_o_corpo). 'arms' e 'legs' vêm partidos
        em '.l' e '.r' (lado esquerdo e direito da tela)."""
        out = []
        with B.patched(light, hurt):
            for fn, up in self.layers:
                name = fn.__name__
                c = B.raw(fn, t)
                if name in ('arms', 'legs'):
                    out.append((name + '.l', B.keep(c, lambda x, y: x < 24), up))
                    out.append((name + '.r', B.keep(c, lambda x, y: x >= 24), up))
                else:
                    out.append((name, c, up))
        return out


def compose(pcs, bob=0, off=None, hide=(), before=None, after=None, mod=None):
    """Junta as peças contornadas uma a uma. off: nome → (dx, dy) a mais;
    before/after: nome → lista de camadas cruas desenhadas antes/depois daquela peça
    ('*' = antes de tudo / depois de tudo); mod: nome → função(camada) → camada."""
    off, before, after, mod = off or {}, before or {}, after or {}, mod or {}
    out = B.blank()

    def put(layer, dx=0, dy=0):
        B.paste(out, B.outlined(layer), dx, dy)
    for extra in before.get('*', []):
        put(extra)
    for name, c, up in pcs:
        for extra in before.get(name, []):
            put(extra)
        if name not in hide:
            if name in mod:
                c = mod[name](c)
            dx, dy = off.get(name, (0, 0))
            put(c, dx, dy + (bob if up else 0))
        for extra in after.get(name, []):
            put(extra)
    for extra in after.get('*', []):
        put(extra)
    return out


def lift_leg(c, lift, cut, dx=0):
    """Joelho erguido de frente: a parte de baixo da perna sobe `lift` px (some um
    trecho do meio) e o pé abre `dx` px."""
    if lift <= 0 and dx == 0:
        return c
    o = B.blank()
    for y in range(c.h):
        for x in range(c.w):
            v = c.px[y][x]
            if v is None:
                continue
            if y >= cut:
                o.p(x + dx, y - lift, v)
            elif y < cut - lift:
                o.p(x, y, v)
    return o


def squash_rows(c, y0, n):
    """Some com n linhas a partir de y0; o que está acima desce n (ajoelhar)."""
    o = B.blank()
    for y in range(c.h):
        for x in range(c.w):
            v = c.px[y][x]
            if v is None:
                continue
            if y >= y0 + n:
                o.p(x, y, v)
            elif y < y0:
                o.p(x, y + n, v)
    return o


def sway_rows(c, y0, dx):
    o = B.blank()
    for y in range(c.h):
        for x in range(c.w):
            v = c.px[y][x]
            if v is not None:
                o.p(x + (dx if y >= y0 else 0), y, v)
    return o


# ── Configuração por classe ─────────────────────────────────────────────
# arm_l/arm_r: peças que acompanham o braço da esquerda/direita da tela.
# weapon: peça da arma principal; hand: braço que a segura ('l' ou 'r').
# hip: altura do quadril; knee_cut: onde a perna dobra; kneel: faixa que some ao
# ajoelhar (y0, n).

CFG = {
    'guardiao': dict(arm_l=('arm', 'mace'), arm_r=('shield',), weapon='mace', hand='l', arm_piece='arm',
                     hip=42, knee_cut=50, kneel=(50, 9), shoulders={'l': (12.5, 29), 'r': (35, 29)}),
    'selvagem': dict(arm_l=('arms.l',), arm_r=('arms.r', 'axe'), weapon='axe', hand='r', arm_piece='arms.r',
                     hip=44, knee_cut=51, kneel=(50, 8), shoulders={'l': (12, 28), 'r': (36, 28)}),
    'lanceiro': dict(arm_l=('arms.l', 'shield'), arm_r=('arms.r', 'polearm'), weapon='polearm', hand='r', arm_piece='arms.r',
                     hip=44, knee_cut=51, kneel=(50, 8), shoulders={'l': (12, 27), 'r': (36, 27)}),
    'arqueiro': dict(arm_l=('arms.l', 'bow'), arm_r=('arms.r',), weapon='bow', hand='l', arm_piece='arms.l',
                     hip=44, knee_cut=51, kneel=(50, 8), shoulders={'l': (12, 27), 'r': (36, 27)}),
    'clerigo': dict(arm_l=('arms.l', 'lantern'), arm_r=('arms.r', 'hammer'), weapon='hammer', hand='r', arm_piece='arms.r',
                    hip=42, knee_cut=None, kneel=(46, 9), shoulders={'l': (12, 26), 'r': (36, 26)}, robe='robe'),
    'piromante': dict(arm_l=('arms.l', 'palm'), arm_r=('arms.r', 'staff'), weapon='staff', hand='r', arm_piece='arms.r',
                      hip=42, knee_cut=None, kneel=(46, 9), shoulders={'l': (12, 26), 'r': (36, 26)}, robe='robe'),
}


# ── Parado ──────────────────────────────────────────────────────────────

def idle(rig, t):
    return compose(rig.pieces(t), bob=[0, 0, 1, 1][t])


# ── Correndo de frente (4 quadros) ──────────────────────────────────────

RUN = [  # (ergue perna esq., ergue perna dir., sobe/desce o corpo, balanço do braço)
    (4, 0, -1, 1),
    (1, 0, 1, 0),
    (0, 4, -1, -1),
    (0, 1, 1, 0),
]


def shoe(x, y, flip=False):
    c = B.blank()
    HD.shade(c, HD.ell(x, y, 3.6, 2.2), ['le0', 'le1', 'le2'], spec=False)
    c.hl(x - 3, y + 1, 7, 'le0')
    return c


def run(rig, k):
    cfg = rig.cfg
    ll, lr, bob, sw = RUN[k]
    pcs = rig.pieces(k % 4)
    off = {}
    mod = {}
    for n in cfg['arm_l']:
        off[n] = (0, sw)
    for n in cfg['arm_r']:
        off[n] = (0, -sw)
    after = {}
    if 'legs.l' in rig_names(pcs):
        mod['legs.l'] = lambda c: lift_leg(c, ll, cfg['knee_cut'], -1 if ll > 2 else 0)
        mod['legs.r'] = lambda c: lift_leg(c, lr, cfg['knee_cut'], 1 if lr > 2 else 0)
    if cfg.get('robe'):
        sway = 1 if ll > lr else (-1 if lr > ll else 0)
        mod[cfg['robe']] = lambda c: sway_rows(c, 50, sway)
        # o pé da frente aparece sob a barra
        fx = 19 if ll > lr else (29 if lr > ll else None)
        if fx is not None:
            after.setdefault(cfg['robe'], []).append(shoe(fx, 61))
    if 'cape' in rig_names(pcs):
        off['cape'] = (sw, max(0, bob))
    return compose(pcs, bob=bob, off=off, mod=mod, after=after)


def rig_names(pcs):
    return [p[0] for p in pcs]


# ── Acerto ──────────────────────────────────────────────────────────────

HEADS = ('helm', 'crest', 'head', 'hood', 'braid')


WEAPON_PIECES = ('mace', 'axe', 'polearm', 'bow', 'hammer', 'staff', 'lantern', 'palm', 'quiver')


def hit(rig):
    """Acerto: o corpo recua para a esquerda, a cabeça joga para trás, os olhos fecham e
    o lado do golpe (direita) acende num clarão de 2 px; faíscas onde bateu."""
    pcs = rig.pieces(0, hurt=True)
    off = {}
    for name, c, up in pcs:
        if up:
            off[name] = (-2, 0)
        if name in HEADS:
            off[name] = (-3, 1)
    off['legs.r'] = (-1, 0)
    if 'cape' in rig_names(pcs):
        off['cape'] = (-1, 0)
    img = compose(pcs, bob=0, off=off)
    body = compose(pcs, bob=0, off=off, hide=set(WEAPON_PIECES))
    rim = B.copy(body)
    B.flash(rim, side=1, depth=2)
    for y in range(H):
        for x in range(W):
            if rim.px[y][x] != body.px[y][x] and img.px[y][x] == body.px[y][x]:
                img.px[y][x] = rim.px[y][x]
    # faíscas do golpe recebido, do lado direito, e um respingo
    bb = B.bbox(body)
    ex = min(46, bb[2] + 2)
    for (dx, dy, col) in ((0, 0, 'fx3'), (1, -2, 'fx2'), (1, 3, 'fx2'), (-1, -4, 'fx1'), (0, 5, 'fx1')):
        if img.g(ex + dx, 26 + dy) is None:
            img.p(ex + dx, 26 + dy, col)
    for (dx, dy) in ((1, 1), (2, 0)):
        if img.g(ex + dx, 30 + dy) is None:
            img.p(ex + dx, 30 + dy, 'bl1')
    return img


# ── Golpe ───────────────────────────────────────────────────────────────

def weapon_layer(rig, grip, ang, fs=1.0, t=0, extra=None):
    c = B.blank()
    cls = rig.cls
    if cls == 'guardiao':
        B.draw_local(c, grip, ang, A.mace(), fs)
    elif cls == 'selvagem':
        B.draw_local(c, grip, ang, A.axe(), fs)
    elif cls == 'lanceiro':
        B.draw_local(c, grip, ang, A.polearm(), fs)
    elif cls == 'clerigo':
        B.draw_local(c, grip, ang, A.hammer(), fs)
    elif cls == 'piromante':
        B.draw_local(c, grip, ang, A.staff(), fs)
    elif cls == 'arqueiro':
        kw = extra or {}
        B.draw_local(c, grip, ang, A.bow(**kw), fs)
    return c


def flame_layer(cx, base, h, t, seed=0.4):
    c = B.blank()
    HD.flame(c, cx, base, h, t, seed)
    return c


def attack(rig, k):
    """Quatro quadros: preparação, golpe, impacto, volta."""
    return ATTACKS[rig.cls](rig, k)


def _melee(rig, k, poses, t=0):
    """Golpe genérico com a arma no braço cfg['hand']: o braço é redesenhado do ombro
    até a empunhadura, a arma gira e a mão fica por cima do cabo."""
    cfg = rig.cfg
    P = poses[k]
    pcs = rig.pieces(t)
    bdx, bdy = P.get('body', (0, 0))
    off = {}
    for name, c, up in pcs:
        if up:
            off[name] = (bdx, bdy)
        if name in HEADS:
            off[name] = (bdx + P.get('head', (0, 0))[0], bdy + P.get('head', (0, 0))[1])
    side = cfg['hand']
    S = cfg['shoulders'][side]
    S = (S[0] + bdx, S[1] + bdy)
    grip, ang, fs = P['grip'], P['ang'], P.get('fs', 1.0)
    arm = A.arm_layer(rig.cls, S, grip, bend=P.get('bend', 1))
    hand = A.hand_layer(rig.cls, grip, P.get('hand_pal'))
    wpn = weapon_layer(rig, grip, ang, fs, t)
    hide = {cfg['weapon'], cfg['arm_piece']}
    before, after = {}, {}
    fx = B.blank()
    if P.get('smear'):
        B.smear(fx, *P['smear'])
    if P.get('front', True):
        after.setdefault('*', []).extend([wpn, arm, hand])
    else:
        before.setdefault('*', []).append(wpn)
        after.setdefault(cfg['arm_piece'], []).extend([arm, hand])
    img = compose(pcs, bob=0, off=off, hide=hide, before=before, after=after)
    if P.get('smear'):
        # o rastro fica por trás da arma e por cima do corpo
        for y in range(H):
            for x in range(W):
                v = fx.px[y][x]
                if v is not None and wpn.px[y][x] is None and arm.px[y][x] is None:
                    img.p(x, y, v)
    if P.get('spark'):
        B.spark(img, *P['spark'])
    if P.get('post'):
        P['post'](img)
    return img


# grip = empunhadura (onde a mão fica), ang = direção do cabo para a cabeça da arma,
# fs = escorço, front = arma por cima do corpo, smear = (pivô, r0, r1, ângulo de, até).
GUARDIAO_ATK = [
    dict(body=(-1, 0), grip=(9, 15), ang=-115, bend=-1, front=False),
    dict(body=(0, -1), grip=(15, 11), ang=-20, bend=-1, smear=((15, 11), 9, 14, -110, -25)),
    dict(body=(1, 0), grip=(25, 35), ang=15, bend=-1, spark=(42, 39, 5), smear=((25, 35), 9, 14, -75, 10)),
    dict(body=(0, 0), grip=(14, 41), ang=75, bend=1),
]

SELVAGEM_ATK = [
    dict(body=(-1, 0), grip=(36, 31), ang=-112, fs=0.7, bend=1, front=False),
    dict(body=(0, -1), grip=(31, 15), ang=-18, fs=0.42, bend=-1, smear=((31, 15), 11, 15, -112, -22)),
    dict(body=(1, 1), grip=(31, 38), ang=55, fs=0.6, bend=-1, spark=(43, 58, 5), smear=((31, 38), 17, 22, -50, 48)),
    dict(body=(0, 0), grip=(37, 42), ang=-72, fs=0.85, bend=1),
]

LANCEIRO_ATK = [
    dict(body=(-1, 1), grip=(39, 50), ang=-97, fs=0.9, bend=1),
    dict(body=(1, -1), grip=(37, 39), ang=-81, fs=0.85, bend=-1),
    dict(body=(2, -1), grip=(36, 38), ang=-79, fs=0.85, bend=-1, spark=(43, 5, 4)),
    dict(body=(0, 0), grip=(38, 44), ang=-87, fs=0.95, bend=1),
]

CLERIGO_ATK = [
    dict(body=(-1, 0), grip=(36, 28), ang=-108, fs=0.8, bend=1, front=False),
    dict(body=(0, -1), grip=(35, 22), ang=-58, fs=0.5, bend=-1, smear=((35, 22), 14, 18, -105, -62)),
    dict(body=(1, 1), grip=(32, 38), ang=60, fs=0.6, bend=-1, smear=((32, 38), 15, 20, -55, 55)),
    dict(body=(0, 0), grip=(37, 42), ang=-75, fs=0.95, bend=1),
]


def guardiao_atk(rig, k):
    return _melee(rig, k, GUARDIAO_ATK)


def selvagem_atk(rig, k):
    return _melee(rig, k, SELVAGEM_ATK)


def lanceiro_atk(rig, k):
    P = dict(LANCEIRO_ATK[k])
    if k == 1:
        # estocada: riscos de velocidade ao longo do cabo
        def post(img):
            for i, (x, y) in enumerate(((44, 2), (45, 8), (43, 13))):
                for j in range(3):
                    if img.g(x, y + j) is None:
                        img.p(x, y + j, 'fx2' if j else 'fx3')
        P['post'] = post
    poses = list(LANCEIRO_ATK)
    poses[k] = P
    return _melee(rig, k, poses)


def clerigo_atk(rig, k):
    poses = [dict(p) for p in CLERIGO_ATK]
    if k == 2:
        def post(img):
            # clarão sagrado na cabeça do martelo
            hx, hy = 42, 57
            for r, col in ((5, 'ho0'), (3, 'ho1'), (1, 'ho2')):
                for a in range(0, 360, 45):
                    x = round(hx + math.cos(math.radians(a)) * r)
                    y = round(hy + math.sin(math.radians(a)) * r)
                    if 0 <= x < W and 0 <= y < H:
                        img.p(x, y, col)
            B.spark(img, hx, hy, 4, keys=('ho2', 'ho1', 'ho0'))
        poses[2]['post'] = post
    return _melee(rig, k, poses)


def piromante_atk(rig, k):
    """Conjura: a chama da palma cresce, o cajado avança e a bola de fogo estoura."""
    cfg = rig.cfg
    pcs = rig.pieces(k)
    poses = [
        dict(body=(-1, 0), grip=(40, 42), ang=-92, palm=(14, 36), flame=12),
        dict(body=(0, 0), grip=(38, 40), ang=-82, palm=(22, 34), flame=15),
        dict(body=(1, 0), grip=(37, 40), ang=-78, palm=(24, 35), flame=8, burst=True),
        dict(body=(0, 0), grip=(40, 44), ang=-88, palm=(14, 40), flame=10),
    ]
    P = poses[k]
    bdx, bdy = P['body']
    off = {}
    for name, c, up in pcs:
        if up:
            off[name] = (bdx, bdy)
    sl = cfg['shoulders']['l']
    sr = cfg['shoulders']['r']
    arm_r = A.arm_layer('piromante', (sr[0] + bdx, sr[1] + bdy), P['grip'], bend=1)
    hand_r = A.hand_layer('piromante', P['grip'], HD.SKIN if rig.g == 'f' else ['k0', 'k0', 'k1', 'k1'])
    arm_l = A.arm_layer('piromante', (sl[0] + bdx, sl[1] + bdy), P['palm'], bend=-1)
    hand_l = A.hand_layer('piromante', P['palm'], HD.SKIN if rig.g == 'f' else ['k0', 'k0', 'k1', 'k1'])
    staff = weapon_layer(rig, P['grip'], P['ang'], 1.0)
    fb = A.staff_flame_base(P['grip'], P['ang'])
    fl = flame_layer(round(fb[0]), round(fb[1]), P['flame'], k, 0.4)
    palm_fl = flame_layer(P['palm'][0], P['palm'][1], 8 + (4 if k in (0, 1) else 0), k + 2, 1.7)
    hide = {'staff', 'arms.l', 'arms.r', 'palm'}
    after = {'*': [staff, fl, arm_r, hand_r, arm_l, hand_l, palm_fl]}
    img = compose(pcs, bob=0, off=off, hide=hide, after=after)
    if P.get('burst'):
        # a bola de fogo sai do cajado para o alvo
        cx, cy = min(41, round(fb[0]) + 1), max(6, round(fb[1]) - 4)
        ballc = B.blank()
        for y in range(cy - 5, cy + 6):
            for x in range(cx - 5, cx + 6):
                d = math.hypot(x - cx, y - cy)
                if d <= 4.6:
                    ballc.p(x, y, 'f3' if d < 1.8 else ('f2' if d < 3.2 else 'f1'))
        for (dx, dy) in ((-6, 0), (-5, -3), (-5, 3), (-8, 1)):
            ballc.p(cx + dx, cy + dy, 'f1')
            ballc.p(cx + dx - 1, cy + dy, 'f0')
        B.paste(img, B.outlined(ballc))
        for (dx, dy) in ((6, -3), (6, 3), (5, 0)):
            if img.g(cx + dx, cy + dy) is None:
                img.p(cx + dx, cy + dy, 'f2')
    return img


def arqueiro_atk(rig, k):
    """Puxa a corda e solta: o arco passa para a frente, do lado do alvo."""
    cfg = rig.cfg
    pcs = rig.pieces(0)
    skin = HD.SKIN if rig.g == 'm' else HD.SKIND
    poses = [
        dict(body=(0, 0), bow=(36, 34), ang=-92, draw=3, arrow=True, pull=(30, 33), lift=(0, 0)),
        dict(body=(-1, 0), bow=(39, 31), ang=-90, draw=13, arrow=True, pull=(25, 30), lift=(0, 0)),
        dict(body=(-1, 0), bow=(39, 31), ang=-88, draw=0, arrow=False, pull=(16, 27), lift=(0, 0), lines=True),
        dict(body=(0, 0), bow=(30, 38), ang=-100, draw=0, arrow=False, pull=(16, 42), lift=(0, 0)),
    ]
    P = poses[k]
    bdx, bdy = P['body']
    off = {}
    for name, c, up in pcs:
        if up:
            off[name] = (bdx, bdy)
    sl = cfg['shoulders']['l']
    sr = cfg['shoulders']['r']
    # braço do arco: o da direita da tela, esticado para o alvo
    grip = P['bow']
    bow_c = weapon_layer(rig, grip, P['ang'], 1.0, extra=dict(draw=P['draw'], arrow=P['arrow']))
    arm_b = A.arm_layer('arqueiro', (sr[0] + bdx, sr[1] + bdy), (grip[0] - 1, grip[1]), bend=1, bracer=True)
    hand_b = A.hand_layer('arqueiro', (grip[0] - 1, grip[1]), skin)
    arm_p = A.arm_layer('arqueiro', (sl[0] + bdx, sl[1] + bdy), P['pull'], bend=1)
    hand_p = A.hand_layer('arqueiro', P['pull'], skin)
    hide = {'bow', 'arms.l', 'arms.r'}
    after = {'*': [arm_b, bow_c, hand_b, arm_p, hand_p]}
    img = compose(pcs, bob=0, off=off, hide=hide, after=after)
    if P.get('lines'):
        for (x0, y0, n) in ((40, 30, 7), (42, 27, 5), (41, 33, 4)):
            for i in range(n):
                if img.g(x0 + i, y0) is None:
                    img.p(x0 + i, y0, 'fx3' if i > n - 3 else 'fx1')
    return img


ATTACKS = {'guardiao': guardiao_atk, 'selvagem': selvagem_atk, 'lanceiro': lanceiro_atk,
           'arqueiro': arqueiro_atk, 'clerigo': clerigo_atk, 'piromante': piromante_atk}


# ── Morte (cambaleia e cai) ─────────────────────────────────────────────
# A arma grande fica do lado de longe (em cima) quando o corpo deita; a pequena do
# lado de perto (embaixo). FAR/NEAR: peça → como desenhar deitada.

FAR = {'selvagem': 'axe', 'lanceiro': 'polearm', 'clerigo': 'hammer', 'piromante': 'staff'}
NEAR = {'arqueiro': 'bow', 'clerigo': 'lantern'}


def _lying_weapon(rig, name, length_room):
    """Arma deitada no chão, na horizontal, em camada própria (crua)."""
    c = B.blank(96, 96)
    if name == 'axe':
        B.draw_local(c, (60, 48), 180, A.axe(), 0.78)
    elif name == 'polearm':
        B.draw_local(c, (62, 48), 180, A.polearm(), 0.66)
    elif name == 'hammer':
        B.draw_local(c, (58, 48), 180, A.hammer(), 0.9)
    elif name == 'staff':
        B.draw_local(c, (62, 48), 180, A.staff(), 0.72)
    elif name == 'bow':
        B.draw_local(c, (48, 48), 0, A.bow(), 0.78)
    elif name == 'lantern':
        A.lantern_draw(c, 46, 40, lit=False)
        c = B.rotate(c, 90, (46, 48), (48, 48), 96, 96)
    return c


def _body_layers(rig, light, hide=()):
    pcs = rig.pieces(0, light=light, hurt=True)
    if rig.cls == 'piromante':
        for name, c, up in pcs:
            if name == 'hood':
                B.recolor(c, {'f1': 'p0', 'f2': 'p0', 'f3': 'p0'}, lambda x, y: 13 <= y <= 17)
    return pcs


def death(rig, k):
    """13 cambaleia, 14 de joelhos, 15 tombando, 16 no chão (poeira), 17 imóvel."""
    cfg = rig.cfg
    hip = cfg['hip']
    ky, kn = cfg['kneel']
    far, near = FAR.get(rig.cls), NEAR.get(rig.cls)
    robe = cfg.get('robe')

    if k == 0:
        # cambaleia: o tronco pende para trás (esquerda) e um pé recua
        ang = -9
        pcs = _body_layers(rig, ang)
        lower_names = {'legs.l', 'legs.r'} | ({robe} if robe else set())
        if robe:
            whole = compose(pcs)
            rot = B.rotate(whole, -7, (24, 62), (25, 62))
            return B.reoutline(rot)
        upper = compose(pcs, hide=lower_names | ({'cape'} if 'cape' in rig.names else set()))
        cape = compose([p for p in pcs if p[0] == 'cape'])
        legs = compose([p for p in pcs if p[0] in lower_names], off={'legs.l': (-2, 0)})
        out = B.blank()
        B.paste(out, B.rotate(cape, ang, (24, hip + 4), (23, hip + 4)))
        B.paste(out, legs)
        B.paste(out, B.rotate(upper, ang, (24, hip + 4), (23, hip + 4)))
        return B.reoutline(out)

    if k == 1:
        # de joelhos: as pernas dobram (some a canela), a arma ainda na mão
        whole = compose(_body_layers(rig, 0))
        kneel = squash_rows(whole, ky, kn)
        return kneel

    hide = set(x for x in (far, near) if x)
    if rig.cls == 'piromante':
        hide.add('palm')                       # a chama da palma apaga
    if k == 2:
        # tombando: o tronco gira -55° sobre o quadril ajoelhado
        ang = -55
        pcs = _body_layers(rig, ang)
        whole = squash_rows(compose(pcs, hide=hide), ky, kn)
        cut = hip + kn + 2
        upper = B.keep(whole, lambda x, y: y < cut)
        lower = B.keep(whole, lambda x, y: y >= cut)
        big = B.blank(96, 96)
        if far:
            wl = _lying_weapon(rig, far, 0)
            B.paste(big, B.outlined(wl), -8, -6)
        B.paste(big, B.shifted(lower, 24, 0))
        B.paste(big, B.reoutline(B.rotate(upper, ang, (24, cut), (48, cut), 96, 96, scale=(0.9, 1.0))))
        if near:
            wl = _lying_weapon(rig, near, 0)
            B.paste(big, B.outlined(wl), -4, 11 + (cut - 48) + 4)
        out, _ = B.fit(big, cx=22)
        return out

    # 16–17: deitado de costas, cabeça à esquerda; pernas dobradas (escorço)
    pcs = _body_layers(rig, -90)
    whole = compose(pcs, hide=hide)
    if 'shield' in rig.names and rig.cls == 'guardiao':
        # o braço do escudo cai aberto: o escudo sai um pouco de cima do peito
        whole = compose(pcs, hide=hide, off={'shield': (3, 0)})
    cut = hip + 1
    upper = B.keep(whole, lambda x, y: y < cut)
    lower = B.keep(whole, lambda x, y: y >= cut)
    for su in (0.86, 0.82, 0.78, 0.74):
        big = B.blank(96, 96)
        P = (64, 56)
        # deitado no chão, a largura dos ombros vira profundidade: encurta (escorço)
        up_r = B.rotate(upper, -90, (24, cut), P, 96, 96, scale=(0.78, su))
        lo_r = B.rotate(lower, -90, (24, cut), P, 96, 96, scale=(0.78, 0.5))
        if far:
            wl = _lying_weapon(rig, far, 0)
            bbu = B.bbox(up_r)
            bbw = B.bbox(wl)
            dx = round((bbu[0] + 2) - bbw[0])
            dy = round((bbu[1] + 3) - (bbw[1] + bbw[3]) / 2)
            B.paste(big, B.outlined(wl), dx, dy)
        B.paste(big, B.reoutline(lo_r))
        B.paste(big, B.reoutline(up_r))
        if near:
            wl = _lying_weapon(rig, near, 0)
            bbu = B.bbox(up_r)
            bbw = B.bbox(wl)
            dx = round((bbu[0] + 4) - bbw[0]) if near == 'bow' else round(bbu[0] + 2 - bbw[0])
            dy = round(bbu[3] - bbw[3] + 1)
            B.paste(big, B.outlined(wl), dx, dy)
        out, ok = B.fit(big, bottom=62 if k == 4 else 61)
        if ok:
            break
    if k == 3:
        B.dust(out, 12, 62, n=4, spread=6, seed=3)
        B.dust(out, 36, 62, n=4, spread=6, seed=5)
    return out


# ── Folha ───────────────────────────────────────────────────────────────

def frames(cls, g):
    rig = Rig(cls, g)
    out = [idle(rig, t) for t in range(4)]
    out += [run(rig, k) for k in range(4)]
    out.append(hit(rig))
    out += [attack(rig, k) for k in range(4)]
    out += [death(rig, k) for k in range(5)]
    return out


def sheet(cls, g):
    fr = frames(cls, g)
    sh = B.blank(W * len(fr), H)
    for i, f in enumerate(fr):
        B.paste(sh, f, i * W, 0)
    return sh, fr
