"""Cães e gatos 32-bit do Vigília, de perfil (olhando para a direita), 9 quadros de 32×32:
0–1 parado (respira e abana o rabo), 2–5 andando (patas em diagonal), 6 sentado,
7 feliz (sentado, rabo abanando; o cão de língua de fora, o gato de olhos fechados),
8 dormindo (enrolado). Chão em y = 29, como a 16-bit (y = 14) ampliada.

Montados por peças como as pessoas: patas de trás (mais escuras), rabo, corpo+cabeça numa
peça só (pelo contínuo), patas da frente e a orelha por cima, cada uma com o seu contorno.
"""
from __future__ import annotations

import math

from gente32_base import (Rig, OL, mix, mul, hsh, ell, rect, trap, rows_of, stroke, bez, shade, shade_cyl,
                          EYE, WHITE, RED)

PW = PH = 32
GROUND = 29

PETS = [('cao', 'caramelo'), ('cao', 'preto'), ('cao', 'malhado'), ('cao', 'cinza'),
        ('gato', 'laranja'), ('gato', 'preto'), ('gato', 'cinza'), ('gato', 'branco')]

GREYF = [(46, 50, 58), (72, 76, 86), (100, 106, 116), (134, 142, 152), (170, 178, 188)]
COATS = {
    ('cao', 'caramelo'): dict(fur=[(66, 42, 26), (100, 70, 42), (136, 96, 58), (174, 130, 76), (210, 168, 96)],
                              muzzle=[(150, 132, 104), (196, 180, 150), (226, 214, 186)],
                              ear=[(46, 30, 20), (72, 48, 32), (98, 68, 44)]),
    ('cao', 'preto'): dict(fur=[(8, 8, 10), (20, 20, 26), (36, 36, 44), (56, 58, 68), (84, 88, 100)],
                           muzzle=[(36, 36, 44), (58, 60, 70), (84, 88, 100)],
                           ear=[(6, 6, 8), (16, 16, 20), (30, 30, 36)]),
    ('cao', 'malhado'): dict(fur=[(140, 128, 108), (184, 174, 154), (226, 218, 200), (242, 236, 222), (252, 250, 242)],
                             muzzle=[(184, 174, 154), (226, 218, 200), (246, 242, 230)],
                             ear=[(52, 34, 22), (84, 58, 38), (114, 82, 54)],
                             spots=[(62, 42, 26), (90, 62, 42), (120, 86, 56)]),
    ('cao', 'cinza'): dict(fur=GREYF, muzzle=[(120, 128, 138), (160, 168, 178), (196, 202, 210)],
                           ear=[(40, 42, 50), (60, 64, 72), (84, 88, 98)]),
    ('gato', 'laranja'): dict(fur=[(108, 70, 28), (150, 110, 50), (198, 156, 76), (226, 190, 98), (244, 216, 136)],
                              stripe=[(128, 88, 38), (150, 110, 50)], eye=[(86, 120, 64), (140, 176, 96)],
                              inner=(196, 130, 110)),
    ('gato', 'preto'): dict(fur=[(6, 6, 8), (18, 18, 22), (34, 34, 42), (54, 56, 66), (82, 86, 98)],
                            stripe=None, eye=[(196, 150, 50), (240, 200, 80)], inner=(70, 46, 50)),
    ('gato', 'cinza'): dict(fur=GREYF, stripe=[(56, 60, 68), (72, 76, 86)], eye=[(196, 150, 50), (240, 200, 80)],
                            inner=(150, 118, 118)),
    ('gato', 'branco'): dict(fur=[(140, 128, 110), (186, 176, 158), (228, 220, 204), (244, 238, 226), (252, 250, 244)],
                             stripe=None, eye=[(70, 150, 146), (122, 200, 192)], inner=(214, 150, 146)),
}
NOSE_DOG = (18, 14, 16)
NOSE_CAT = (164, 92, 92)
TONGUE = [(150, 60, 70), (206, 100, 108)]


def dark(pal, k=0.72):
    return [mul(c, k) for c in pal]


def limb(c, top, bottom, x_top, x_bot, w, pal, paw=None, knee=0):
    """Pata: afina do quadril para baixo, joelho/jarrete opcional e a patinha virada para frente."""
    pts = []
    for y in range(top, bottom):
        t = (y - top) / max(1, bottom - top)
        x = x_top + (x_bot - x_top) * t + knee * math.sin(t * math.pi)
        ww = w if t < 0.45 else max(2, w - 1)
        pts += [(round(x) + d, y) for d in range(ww)]
    shade(c, pts, pal, spec=False, bias=0.05)
    xb = round(x_bot)
    if paw:
        for d in range(w + 1):
            c.p(xb + d, bottom, paw[2] if d == 0 else paw[1])
        c.p(xb + w, bottom, paw[0])
        c.p(xb + w - 1, bottom - 1, paw[1]) if c.g(xb + w - 1, bottom - 1) is None else None
    return pts


def tail_pts(path, r0, r1):
    return stroke(path, r0, r1)


# ── Cão ───────────────────────────────────────────────────────────────────

def dog_frame(coat, frame):
    P = COATS[('cao', coat)]
    fur, muz, ear = P['fur'], P['muzzle'], P['ear']
    spots = P.get('spots')
    R = Rig(PW, PH)
    if frame <= 5:
        return dog_stand(R, fur, muz, ear, spots, frame)
    if frame in (6, 7):
        return dog_sit(R, fur, muz, ear, spots, happy=(frame == 7))
    return dog_sleep(R, fur, muz, ear, spots)


def dog_stand(R, fur, muz, ear, spots, frame):
    walk = frame >= 2
    k = frame - 2 if walk else 0
    bob = [0, 1, 0, 1][k] if walk else 0
    breath = 1 if frame == 1 else 0

    # patas: pares em diagonal (frente-perto com trás-longe)
    def foot(phase):
        if not walk:
            return 0.0, 0
        ph = phase + k * math.pi / 2
        return 2.4 * math.cos(ph), round(2 * max(0.0, -math.sin(ph)))
    fa, la = foot(0.0)                  # frente perto / trás longe
    fb, lb = foot(math.pi)              # frente longe / trás perto
    fdark = dark(fur, 0.68)

    def far_legs(c):
        limb(c, 20 + bob, GROUND - lb, 21.5, 21.5 + fb, 3, fdark, paw=dark(fur, 0.6))
        limb(c, 21 + bob, GROUND - la, 11.5, 11 + fa, 3, fdark, paw=dark(fur, 0.6), knee=-1)
    R.part(far_legs)

    def tail(c):
        wag = [0, 2][frame % 2] if not walk else [0, 1, 0, -1][k]
        path = bez((8, 15 + bob), (3 - wag * 0.5, 12 + bob), (3 + wag, 5 + bob), 14)
        pts = tail_pts(path, 1.5, 0.8)
        shade(c, pts, fur, spec=False)
        for (x, y) in path[-3:]:
            c.p(round(x), round(y), fur[3] if spots is None else fur[4])
    R.part(tail)

    def body(c):
        dog_body(c, fur, muz, spots, bob, breath, head_dy=bob)
    R.part(body)

    def near_legs(c):
        thigh = ell(10, 20 + bob, 3.6, 3.4)
        shade(c, thigh, fur, spec=False, box=(5, 15 + bob, 15, 24 + bob))
        limb(c, 21 + bob, GROUND - lb, 8.5, 8 + fb, 3, fur, paw=fur, knee=-1.2)
        limb(c, 20 + bob, GROUND - la, 18.5, 19 + fa, 3, fur, paw=fur)
        if spots is None:
            c.p(19 + round(fa), GROUND - la - 1, muz[1])
    R.part(near_legs)

    def p_ear(c):
        dog_ear(c, ear, 0, bob)
    R.part(p_ear)
    return R.build()


def dog_head(c, fur, muz, spots, hx, hy, eye='open', tongue=False):
    """Cabeça de perfil: crânio, focinho claro, olho, sobrancelha, trufa e boca."""
    skull = ell(hx, hy, 4.6, 4.2)
    shade(c, skull, fur, spec=True, bias=0.05)
    snout = ell(hx + 4, hy + 3, 3, 2.2)
    shade(c, snout, muz, spec=True)
    if spots:
        for (x, y) in ell(hx, hy - 1, 2.2, 2.4):
            if c.g(x, y) is not None:
                c.p(x, y, spots[2] if x < hx + 0.5 else spots[1])
    ex, ey = round(hx + 2), round(hy)
    if eye == 'open':
        c.p(ex, ey - 1, fur[1]); c.p(ex + 1, ey - 1, fur[1])
        c.p(ex, ey, EYE); c.p(ex + 1, ey, EYE); c.p(ex, ey + 1, fur[1])
        c.p(ex + 1, ey, (64, 58, 60)) if False else None
    elif eye == 'happy':
        c.p(ex - 1, ey, EYE); c.p(ex, ey - 1, EYE); c.p(ex + 1, ey, EYE)
    else:
        c.p(ex - 1, ey, fur[0]); c.p(ex, ey + 1, fur[0]); c.p(ex + 1, ey + 1, fur[0])
    nx, ny = round(hx + 6), round(hy + 1)
    c.p(nx, ny, NOSE_DOG); c.p(nx + 1, ny, NOSE_DOG); c.p(nx + 1, ny + 1, NOSE_DOG); c.p(nx, ny + 1, NOSE_DOG)
    c.p(nx, ny, (92, 86, 92))
    my = round(hy + 4)
    for x in range(round(hx + 3), round(hx + 7)):
        c.p(x, my, muz[0])
    if tongue:
        for (x, y) in ((nx - 2, my), (nx - 1, my), (nx - 2, my + 1), (nx - 1, my + 1), (nx - 1, my + 2)):
            c.p(x, y, TONGUE[1] if y < my + 2 else TONGUE[0])
        c.p(nx - 3, my, OL)


def dog_body(c, fur, muz, spots, bob, breath, head_dy=0):
    b = bob
    torso = set(ell(19.5, 18.5 + b, 5, 5 + breath * 0.4)) | set(ell(10.5, 18 + b, 5, 4.6)) | set(rect(10, 14 + b, 10, 8))
    torso = sorted(torso)
    shade(c, torso, fur, spec=False, box=(5, 12 + b, 25, 24 + b), bias=0.05)
    # pescoço
    neck = [(x, y) for y in range(9 + head_dy, 18 + b) for x in range(18, 25)
            if x <= 24 - max(0, (y - 14 - b)) * 0.5]
    shade(c, neck, fur, spec=False, box=(16, 6, 27, 20))
    # peito claro
    for (x, y) in ell(22.5, 17 + b, 1.8, 3):
        c.p(x, y, muz[2] if y < 17 + b else muz[1])
    # barriga recolhida
    for x in range(12, 18):
        c.p(x, 23 + b, None)
        c.p(x, 22 + b, fur[1])
    if spots:
        for (x, y) in ell(13, 17 + b, 3, 2.4):
            c.p(x, y, spots[2] if y < 17 + b else spots[1])
    for x in range(11, 19):                              # luz no lombo
        c.p(x, 14 + b, fur[3])
    dog_head(c, fur, muz, spots, 23.5, 9 + head_dy)


def dog_ear(c, ear, dx, dy):
    """Orelha caída atrás do olho."""
    pts = [(x, y) for y in range(5 + dy, 13 + dy) for x in range(18 + dx, 23 + dx)
           if (x - 18 - dx) >= (y - 6 - dy) * 0.3 - 0.5 and (x - 18 - dx) <= 3.6 - max(0, y - 10 - dy) * 0.8]
    shade(c, pts, ear, spec=False)
    for y in range(6 + dy, 11 + dy):
        c.p(19 + dx + (y - 6 - dy) // 3, y, ear[2])


def dog_sit(R, fur, muz, ear, spots, happy):
    fdark = dark(fur, 0.68)

    def back(c):
        limb(c, 19, GROUND, 21.5, 21.5, 3, fdark, paw=dark(fur, 0.6))
    R.part(back)

    def tail(c):
        if happy:
            path = bez((9, 27), (3, 26), (2, 19), 12)
        else:
            path = bez((10, 28), (5, 29), (1, 27), 12)
        pts = tail_pts(path, 1.5, 0.9)
        shade(c, pts, fur, spec=False)
        for (x, y) in path[-3:]:
            c.p(round(x), round(y), fur[3] if spots is None else fur[4])
    R.part(tail)

    def body(c):
        torso = []
        for y in range(9, 28):
            a = round(18 - (y - 9) * 0.5)
            b = round(22 + min(y - 9, 6) * 0.25)
            torso += [(x, y) for x in range(a, b + 1)]
        shade(c, torso, fur, spec=False, box=(8, 6, 25, 29))
        for (x, y) in ell(21, 17, 1.8, 3.4):
            c.p(x, y, muz[2] if y < 17 else muz[1])
        dog_head(c, fur, muz, spots, 23.5, 6.5, eye='happy' if happy else 'open', tongue=happy)
    R.part(body)

    def haunch(c):
        pts = [p for p in ell(12.5, 24.5, 5.2, 4.6) if p[1] <= GROUND]
        shade(c, pts, fur, spec=False, box=(6, 19, 20, 30))
        for (x, y) in ((9, 22), (10, 21), (11, 21), (12, 20), (13, 20)):
            c.p(x, y, fur[3])
        if spots:
            for (x, y) in ell(13, 24, 3, 2.4):
                c.p(x, y, spots[2] if y < 24 else spots[1])
        for x in range(8, 18):
            c.p(x, GROUND, fur[1] if x % 3 else fur[0])
    R.part(haunch)

    def front(c):
        limb(c, 18, GROUND, 18.5, 18.5, 3, fur, paw=fur)
        for x in range(8, 14):                           # pata de trás dobrada
            c.p(x, GROUND, fur[2] if x < 11 else fur[1])
    R.part(front)

    def p_ear(c):
        dog_ear(c, ear, 0, -3 if not happy else -4)
    R.part(p_ear)
    return R.build()


def dog_sleep(R, fur, muz, ear, spots):
    def tail(c):
        path = bez((6, 25), (6, 29), (14, 28), 12)
        shade(c, tail_pts(path, 1.3, 0.9), fur, spec=False)
    R.part(tail)

    def body(c):
        loaf = [(x, y) for (x, y) in ell(15.5, 25, 10.5, 5) if y <= GROUND]
        shade(c, loaf, fur, spec=False, box=(4, 19, 28, 31))
        if spots:
            for (x, y) in ell(12, 24, 3.5, 2.2):
                c.p(x, y, spots[2] if y < 24 else spots[1])
        for x in range(6, 26):
            c.p(x, GROUND, fur[1])
        for x in range(8, 16):                           # lombo aceso
            c.p(x, 21, fur[3])
        for (x, y) in ((9, 26), (10, 25), (11, 25), (12, 25)):
            c.p(x, y, fur[1])                            # coxa
    R.part(body)

    def head(c):
        for x in range(21, 31):                          # patas da frente sob o queixo
            c.p(x, GROUND, muz[1] if x % 2 else muz[0])
            c.p(x, GROUND - 1, fur[2] if x < 28 else fur[1])
        dog_head(c, fur, muz, spots, 24, 23.5, eye='closed')
    R.part(head)

    def p_ear(c):
        pts = [(x, y) for y in range(20, 27) for x in range(19, 24) if x - 19 <= 3.5 - abs(y - 22.5) * 0.6]
        shade(c, pts, ear, spec=False)
    R.part(p_ear)
    return R.build()


# ── Gato ──────────────────────────────────────────────────────────────────

def cat_frame(coat, frame):
    P = COATS[('gato', coat)]
    R = Rig(PW, PH)
    if frame <= 5:
        return cat_stand(R, P, frame)
    if frame in (6, 7):
        return cat_sit(R, P, happy=(frame == 7))
    return cat_sleep(R, P)


def cat_head(c, P, cx, cy, eyes='open'):
    fur, inner = P['fur'], P['inner']
    # orelhas pontudas (a de trás mais escura)
    for (ax, base0, base1, pal) in ((cx - 2.5, cx - 4.5, cx - 0.5, dark(fur, 0.8)), (cx + 1.5, cx - 0.5, cx + 3.5, fur)):
        pts = []
        for y in range(round(cy - 7), round(cy - 2)):
            t = (y - (cy - 7)) / 5
            a = ax - 0.4 + (base0 - ax) * t
            b = ax + 0.4 + (base1 - ax) * t
            pts += [(x, y) for x in range(round(a), round(b) + 1)]
        shade(c, pts, pal, spec=False)
        for (x, y) in pts:
            if abs(x - ax) < 1 and cy - 6 < y < cy - 3:
                c.p(x, y, inner)
    skull = ell(cx, cy, 4.6, 4)
    shade(c, skull, fur, spec=True, bias=0.05)
    muzzle = ell(cx + 3.2, cy + 1.6, 2, 1.6)
    shade(c, muzzle, fur, spec=True, bias=0.15)
    if P.get('stripe'):
        st = P['stripe']
        for (x, y) in ((round(cx) - 1, round(cy) - 3), (round(cx), round(cy) - 3), (round(cx) - 2, round(cy) - 2),
                       (round(cx) + 1, round(cy) - 2)):
            c.p(x, y, st[0])
        c.p(round(cx) - 3, round(cy) + 1, st[1]); c.p(round(cx) - 2, round(cy) + 2, st[1])
    ex, ey = round(cx + 1), round(cy - 1)
    if eyes == 'open':
        c.p(ex, ey, P['eye'][1]); c.p(ex + 1, ey, EYE); c.p(ex, ey + 1, P['eye'][0]); c.p(ex + 1, ey + 1, P['eye'][0])
        c.p(ex, ey - 1, mul(fur[1], 0.9)); c.p(ex + 1, ey - 1, mul(fur[1], 0.9))
    else:
        c.p(ex, ey, EYE); c.p(ex + 1, ey - 1, EYE); c.p(ex + 2, ey, EYE)         # ^ contente
    nx, ny = round(cx + 4.6), round(cy + 0.6)
    c.p(nx, ny, NOSE_CAT); c.p(nx - 1, ny + 1, mul(fur[1], 0.8)); c.p(nx - 1, ny + 2, mul(fur[1], 0.6))


def cat_stand(R, P, frame):
    fur = P['fur']
    walk = frame >= 2
    k = frame - 2 if walk else 0
    bob = [0, 1, 0, 1][k] if walk else 0

    def foot(phase):
        if not walk:
            return 0.0, 0
        ph = phase + k * math.pi / 2
        return 2.4 * math.cos(ph), round(2 * max(0.0, -math.sin(ph)))
    fa, la = foot(0.0)
    fb, lb = foot(math.pi)
    fdark = dark(fur, 0.68)

    def far_legs(c):
        limb(c, 20 + bob, GROUND - lb, 20.5, 21 + fb, 3, fdark, paw=dark(fur, 0.6))
        limb(c, 20 + bob, GROUND - la, 10, 10.5 + fa, 3, fdark, paw=dark(fur, 0.6), knee=-1)
    R.part(far_legs)

    def tail(c):
        sway = [0, 1][frame % 2] if not walk else [0, 1, 0, -1][k]
        path = bez((9, 17 + bob), (5, 14 + bob), (6 + sway, 4 + bob), 16)
        path += bez(path[-1], (6 + sway, 1 + bob), (8 + sway * 2, 1 + bob), 4)[1:]
        pts = tail_pts(path, 1.3, 1.0)
        shade(c, pts, fur, spec=False)
        if P.get('stripe'):
            for i, (x, y) in enumerate(path):
                if i % 4 == 2:
                    c.p(round(x), round(y), P['stripe'][0]); c.p(round(x) + 1, round(y), P['stripe'][0])
    R.part(tail)

    def body(c):
        torso = sorted(set(ell(13, 19 + bob, 7.6, 3.8)) | set(ell(18.5, 18.5 + bob, 3.8, 4.2)))
        shade(c, torso, fur, spec=False, box=(5, 14 + bob, 23, 24 + bob), bias=0.05)
        neck = [(x, y) for y in range(12 + bob, 18 + bob) for x in range(18, 25)]
        shade(c, neck, fur, spec=False, box=(16, 10, 26, 20))
        if P.get('stripe'):
            for x0 in (9, 12, 15):
                for y in range(16 + bob, 21 + bob):
                    if c.g(x0 + (y - 16 - bob) // 3, y) is not None:
                        c.p(x0 + (y - 16 - bob) // 3, y, P['stripe'][0])
        for x in range(9, 17):
            c.p(x, 22 + bob, fur[1])
        cat_head(c, P, 24.5, 12 + bob)
    R.part(body)

    def near_legs(c):
        limb(c, 20 + bob, GROUND - la, 18, 18.5 + fa, 3, fur, paw=fur)
        limb(c, 20 + bob, GROUND - lb, 7.5, 8 + fb, 3, fur, paw=fur, knee=-1.2)
        if P.get('stripe'):
            for (x0, f, l) in ((18, fa, la), (7.5, fb, lb)):
                y = 25 - l
                c.p(round(x0 + f * 0.6), y, P['stripe'][1]); c.p(round(x0 + f * 0.6) + 1, y, P['stripe'][1])
    R.part(near_legs)
    return R.build()


def cat_sit(R, P, happy):
    fur = P['fur']

    def tail(c):
        if happy:
            path = bez((9, 27), (1, 26), (3, 15), 14) + bez((3, 15), (3, 12), (6, 12), 4)[1:]
        else:
            path = bez((9, 28), (2, 28), (2, 20), 14) + bez((2, 20), (2, 17), (4, 16), 4)[1:]
        shade(c, tail_pts(path, 1.3, 1.0), fur, spec=False)
        if P.get('stripe'):
            for i, (x, y) in enumerate(path):
                if i % 4 == 2:
                    c.p(round(x), round(y), P['stripe'][0]); c.p(round(x) + 1, round(y), P['stripe'][0])
    R.part(tail)

    def far(c):
        limb(c, 20, GROUND, 20.5, 20.5, 3, dark(fur, 0.68), paw=dark(fur, 0.6))
    R.part(far)

    def body(c):
        haunch = ell(13, 24, 5.5, 5.2)
        shade(c, haunch, fur, spec=False, box=(6, 17, 21, 30))
        chest = [(x, y) for (x, y) in ell(17.5, 19.5, 4, 8) if y <= 27]
        shade(c, chest, fur, spec=False, box=(11, 10, 23, 28))
        if P.get('stripe'):
            for (x0, y0) in ((10, 21), (12, 20), (14, 20)):
                for d in range(4):
                    c.p(x0 + d // 2, y0 + d, P['stripe'][0])
        for (x, y) in ((10, 25), (11, 24), (12, 23), (13, 23), (14, 23)):
            c.p(x, y, fur[1])
        for x in range(8, 19):
            c.p(x, GROUND, fur[1] if x % 3 else fur[0])
        cat_head(c, P, 20.5, 9, eyes='closed' if happy else 'open')
    R.part(body)

    def front(c):
        limb(c, 19, GROUND, 18, 18, 3, fur, paw=fur)
    R.part(front)
    return R.build()


def cat_sleep(R, P):
    fur = P['fur']

    def body(c):
        ball = [(x, y) for (x, y) in ell(15.5, 24.5, 10.5, 5.5) if y <= GROUND]
        shade(c, ball, fur, spec=False, box=(4, 18, 27, 31))
        if P.get('stripe'):
            for x0 in (9, 12, 15, 18):
                for y in range(20, 24):
                    c.p(x0 + (y - 20) // 2, y, P['stripe'][0])
        for x in range(6, 25):
            c.p(x, GROUND, fur[1])
    R.part(body)

    def head(c):
        cx, cy = 24.5, 23
        for (ax, b0, b1) in ((24.5, 22.5, 26.5),):
            pts = [(x, y) for y in range(17, 21) for x in range(round(ax - (y - 17) * 0.6), round(ax + (y - 17) * 0.6) + 1)]
            shade(c, pts, fur, spec=False)
            c.p(24, 19, P['inner'])
        skull = ell(cx, cy, 4.2, 3.6)
        shade(c, skull, fur, spec=True)
        c.p(25, 23, EYE); c.p(26, 23, EYE); c.p(27, 22, mul(fur[1], 0.8))          # olho fechado
        c.p(28, 24, NOSE_CAT)
        if P.get('stripe'):
            c.p(23, 20, P['stripe'][0]); c.p(24, 20, P['stripe'][0])
    R.part(head)

    def tail(c):
        path = bez((6, 24), (4, 29), (14, 28), 12) + bez((14, 28), (20, 28), (23, 27), 6)[1:]
        shade(c, tail_pts(path, 1.4, 1.1), fur, spec=False)
        if P.get('stripe'):
            for i, (x, y) in enumerate(path):
                if i % 4 == 2:
                    c.p(round(x), round(y), P['stripe'][0])
    R.part(tail)
    return R.build()


def pet_sheet(species, coat):
    """Os 9 quadros; desce 1 px para o pé encostar no fundo como na 16-bit (contorno em y = 31)."""
    from gente32_base import Canvas
    fn = dog_frame if species == 'cao' else cat_frame
    out = []
    for f in range(9):
        fr = fn(coat, f)
        sh = Canvas(PW, PH)
        sh.paste(fr, 0, 1)
        out.append(sh)
    return out
