"""Ícones 32-bit da interface: armas das classes, armadura e amuleto (24×24 → 48×48).

Cada ícone repete o enquadramento do 16-bit (mesma diagonal, mesmo canto), com metal de
4–6 tons e brilho, veio na madeira, couro enrolado, pedra lapidada."""
from __future__ import annotations

import math

from interface32_base import (
    AMETHYST, BLUE, FIRE, GOLD, IRON, LEATHER5, RED, STEEL, WOOD6,
    Canvas, Seg, edges, ellipse, noise, outline, poly, rect,
)

S = 48


def clamp(i: int, n: int) -> int:
    return max(0, min(n - 1, i))


# ── Peças reaproveitadas ─────────────────────────────────────────────────

def wood(c: Canvas, seg: Seg, hw, t0=0.0, t1=None, seed=0, pal=WOOD6) -> None:
    """Cabo de madeira: luz do lado de cima/esquerda, veio correndo ao longo."""
    for (x, y), (t, s) in seg.band(hw, t0, t1).items():
        v = (s + 1) / 2
        i = 1 + int(v * 3.999)
        if s > 0.72:
            i = 4
        if s < -0.7:
            i = 1
        g = noise(t * seg.L / 3.0, (s + 1) * 2.2, seed, 1.0)
        if 0.18 < v < 0.8 and g < 0.3:
            i -= 1
        c.p(x, y, pal[clamp(i, len(pal))])


def leather_wrap(c: Canvas, seg: Seg, hw, t0, t1, pitch=3.0, pal=LEATHER5) -> None:
    """Tira de couro enrolada em diagonal sobre o cabo."""
    for (x, y), (t, s) in seg.band(hw, t0, t1).items():
        v = (s + 1) / 2
        k = (t * seg.L + s * hw * 0.9) % pitch
        i = 1 + int(v * 2.999)
        if k < 0.9:
            i = 0 if v < 0.5 else 1
        elif k < 1.8 and v > 0.4:
            i += 1
        c.p(x, y, pal[clamp(i, len(pal))])


def steel_blade(c: Canvas, seg: Seg, hw, t0=0.0, t1=None, fuller=False) -> None:
    """Lâmina: fio de cima claro, chanfro, aresta/sulco no meio, lado de baixo escuro."""
    for (x, y), (t, s) in seg.band(hw, t0, t1).items():
        if s > 0.6:
            col = STEEL[5]
        elif s > 0.05:
            col = STEEL[4]
        elif s > -0.35:
            col = STEEL[2] if fuller else STEEL[5]
        elif s > -0.75:
            col = STEEL[3]
        else:
            col = STEEL[2]
        c.p(x, y, col)


def ring(c: Canvas, seg: Seg, hw, t0, t1, pal=GOLD) -> None:
    """Anel/virola em volta do cabo: claro em cima, escuro embaixo."""
    for (x, y), (t, s) in seg.band(hw, t0, t1).items():
        f = (t * seg.L - t0) / max(0.01, t1 - t0)
        i = 2 + int((s + 1) * 1.2)
        if f < 0.34:
            i += 1
        elif f > 0.7:
            i -= 1
        c.p(x, y, pal[clamp(i, len(pal) - 1)])


# ── Amuleto ──────────────────────────────────────────────────────────────

def amulet() -> Canvas:
    c = Canvas(S, S)
    # Corrente: elos alternando de frente (anel) e de lado (barra), de cada lado.
    for side in (0, 1):
        ax, ay, bx, by = 11.0, 4.0, 19.8, 21.0
        if side:
            ax, bx = S - ax, S - bx
        n = 7
        for k in range(n):
            f = k / (n - 1)
            cx, cy = ax + (bx - ax) * f, ay + (by - ay) * f
            if k % 2 == 0:
                outer = ellipse(cx, cy, 1.6, 2.0)
                for (x, y) in outer:
                    dx, dy = x + 0.5 - cx, y + 0.5 - cy
                    col = GOLD[3]
                    if dx < -0.4 or dy < -0.9:
                        col = GOLD[4]
                    if dx > 0.4 and dy > -0.4:
                        col = GOLD[2]
                    c.p(x, y, col)
                c.p(int(cx), int(cy), GOLD[0])
            else:
                for j in (-1, 0, 1):
                    c.p(int(cx + 0.1), int(cy) + j, GOLD[2] if j else GOLD[3])
    # Argola e capa do pingente.
    for (x, y) in ellipse(24, 21.6, 3.3, 2.6):
        dx, dy = x + 0.5 - 24, y + 0.5 - 21.6
        c.p(x, y, GOLD[4] if dx + dy < -1.2 else GOLD[3] if dx + dy < 1.0 else GOLD[2])
    for (x, y) in ellipse(24, 21.6, 1.5, 0.8):
        c.p(x, y, GOLD[0])
    cap = poly([(19.5, 23.5), (28.5, 23.5), (31, 27), (17, 27)])
    # Pingente em gota (mais largo em cima, bico embaixo).
    cx, cy = 24.0, 34.0
    body = set()
    for y in range(22, 46):
        for x in range(10, 38):
            v = (y + 0.5 - cy) / 10.0
            u = (x + 0.5 - cx) / (10.2 * (1 - 0.24 * max(0.0, v) ** 1.5))
            if u * u + v * v <= 1.0:
                body.add((x, y))
    inner = set()
    for (x, y) in body:
        v = (y + 0.5 - cy) / 7.0
        u = (x + 0.5 - cx) / (7.1 * (1 - 0.24 * max(0.0, v) ** 1.5))
        if u * u + v * v <= 1.0:
            inner.add((x, y))
    for (x, y) in body - inner:
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        d = math.hypot(dx, dy) or 1
        lit = -(dx * 0.6 + dy * 0.8) / d               # 1 = virado para a luz
        v = (y + 0.5 - cy) / 10.0
        r = (dx / (10.2 * (1 - 0.24 * max(0.0, v) ** 1.5))) ** 2 + v * v
        r = math.sqrt(r)                               # 0.7 dentro … 1 fora
        rr = (r - 0.7) / 0.3
        b = 0.52 + 0.42 * lit * (2 * rr - 1) + 0.14 * (1 - abs(2 * rr - 1))
        c.p(x, y, GOLD[clamp(1 + int(b * 3.6), 5)])
    # Contas de granulação no meio do aro.
    for k in range(14):
        a = k / 14 * 2 * math.pi + 0.2
        r = 0.85
        bx = cx + math.cos(a) * 10.2 * r * (1 - 0.13 * max(0.0, math.sin(a) * r))
        by = cy + math.sin(a) * 10.0 * r
        x, y = int(bx), int(by)
        if (x, y) in body - inner:
            c.p(x, y, GOLD[4] if math.cos(a) * 0.6 + math.sin(a) * 0.8 < 0.3 else GOLD[3])
            if (x + 1, y + 1) in body - inner:
                c.p(x + 1, y + 1, GOLD[1])
    # Engaste (linha escura) e a ametista lapidada.
    for (x, y) in inner:
        c.p(x, y, GOLD[0])
    gem = ellipse(24, 33.6, 6.2, 7.3)
    gem &= inner
    gx, gy = 24.0, 33.6
    for (x, y) in gem:
        u, v = (x + 0.5 - gx) / 6.2, (y + 0.5 - gy) / 7.3
        r = math.hypot(u, v)
        b = 0.56 - 0.4 * (u * 0.6 + v * 0.8) - 0.3 * r * r
        i = 1 + int(b * 4.0)
        table = abs(u) < 0.5 and abs(v) < 0.5 and abs(u) + abs(v) < 0.7
        if table:
            i = 4 if u + v < -0.2 else 3
        elif abs(abs(u) - abs(v)) < 0.13 and r < 0.9:
            i -= 1                                     # aresta das facetas
        if r > 0.86:
            i = 1 if u + v < 0.6 else i
        # Luz que atravessa a pedra: o fundo de baixo/direita acende.
        if 0.5 < u + v and 0.55 < r < 0.95:
            i = max(i, 4)
        c.p(x, y, AMETHYST[clamp(i, 6)])
    for (x, y) in ((21, 30), (22, 30), (21, 31)):
        c.p(x, y, AMETHYST[6])
    c.p(23, 31, AMETHYST[5])
    c.p(26, 38, AMETHYST[5])
    # Garras do engaste nas quatro diagonais.
    for (px, py) in ((19, 28), (28, 28), (19, 38), (28, 38)):
        c.p(px, py, GOLD[4] if px < 24 else GOLD[3])
        c.p(px + (1 if px < 24 else -1), py + (1 if py < 33 else -1), GOLD[2])
    for (x, y) in cap:
        dx = x + 0.5 - 24
        col = GOLD[3]
        if y == 23:
            col = GOLD[4]
        elif y == 26:
            col = GOLD[1]
        elif dx > 3.5:
            col = GOLD[2]
        elif dx < -3.5:
            col = GOLD[4]
        c.p(x, y, col)
    for x in range(19, 29, 2):
        c.p(x, 25, GOLD[4] if x < 24 else GOLD[3])
        c.p(x + 1, 25, GOLD[1])
    outline(c)
    return c


# ── Armadura (peitoral) ──────────────────────────────────────────────────

def armor() -> Canvas:
    c = Canvas(S, S)
    # Silhueta do 16-bit em dobro, com os ombros arredondados e o decote em U.
    spans = {10: [(15, 17), (30, 32)], 11: [(13, 19), (28, 34)], 12: [(12, 20), (27, 35)],
             13: [(11, 20), (27, 36)], 14: [(10, 37)], 15: [(10, 37)], 16: [(10, 37)],
             17: [(10, 37)], 18: [(11, 36)], 19: [(12, 35)]}
    for y in range(20, 30):
        spans[y] = [(14, 33)]
    spans.update({30: [(15, 32)], 31: [(16, 31)], 32: [(16, 31)], 33: [(17, 30)]})
    body = {(x, y) for y, ss in spans.items() for a, b in ss for x in range(a, b + 1)}
    body -= ellipse(24, 11.2, 5.6, 4.6)
    for (x, y) in body:
        # Volume de barril: luz à esquerda do meio, sombra na borda direita.
        u = (x + 0.5 - 22.0) / 12.0
        b = 0.64 - 0.5 * abs(u) ** 1.5 - (0.16 if u > 0 else 0.0) - 0.008 * (y - 14)
        c.p(x, y, STEEL[clamp(1 + int(b * 5.2), 6)])
    # Quilha central: aresta clara à esquerda, sombra à direita.
    for y in range(18, 28):
        c.p(23, y, STEEL[5])
        c.p(24, y, STEEL[2])
    # Gola virada com friso de ouro seguindo o decote.
    for x in range(17, 31):
        ys = [y for y in range(10, 20) if (x, y) in body and (x, y - 1) not in body]
        if not ys:
            continue
        y = ys[0]
        c.p(x, y, GOLD[4] if x < 24 else GOLD[3])
        c.p(x, y + 1, GOLD[2] if x < 26 else GOLD[1])
        c.p(x, y + 2, STEEL[1] if 19 <= x <= 28 else c.g(x, y + 2))
    # Ombreiras: cúpula com uma lâmina e friso dourado na borda de baixo.
    for side in (0, 1):
        cx = 15.2 if side == 0 else 32.8
        cap = ellipse(cx, 14.4, 5.9, 4.6) & body
        for (x, y) in cap:
            dx, dy = (x + 0.5 - cx) / 5.9, (y + 0.5 - 14.4) / 4.6
            b = 0.6 - 0.35 * dx - 0.45 * dy - (0.15 if side else 0)
            c.p(x, y, STEEL[clamp(1 + int(b * 5.4), 7)])
        for (x, y), (t, l, bt, r) in edges(cap).items():
            if bt:
                c.p(x, y, GOLD[3] if side == 0 else GOLD[2])
                if (x, y + 1) in body:
                    c.p(x, y + 1, STEEL[1])
            elif t and (x, y - 1) not in body:
                c.p(x, y, STEEL[6] if side == 0 else STEEL[4])
        # Junta da lâmina: arco escuro com luz logo abaixo.
        for (x, y) in cap:
            if (x, y + 3) in cap and (x, y + 4) not in cap and (x, y - 1) in cap:
                c.p(x, y, STEEL[1])
                c.p(x, y + 1, STEEL[5] if side == 0 else STEEL[4])
        rx = 14 if side == 0 else 33
        c.p(rx, 12, STEEL[6] if side == 0 else STEEL[5])
        c.p(rx + 1, 13, STEEL[2])
    # Emblema no peito: sol pequeno de ouro.
    for (x, y) in ellipse(24, 22.5, 2.2, 2.2):
        c.p(x, y, GOLD[4] if x < 24 and y < 22 else GOLD[3] if x + y < 47 else GOLD[2])
    for (x, y) in ((24, 19), (24, 26), (20, 22), (21, 22), (27, 22), (28, 22)):
        c.p(x, y, GOLD[3] if x < 24 or y < 22 else GOLD[2])
    c.p(23, 22, GOLD[5])
    # Cinto dourado com fivela.
    for x in range(14, 34):
        c.p(x, 28, GOLD[4] if x < 24 else GOLD[3])
        c.p(x, 29, GOLD[2] if x < 28 else GOLD[1])
    for (x, y) in rect(22, 27, 4, 4):
        c.p(x, y, GOLD[4] if (x, y) in ((22, 27), (23, 27), (22, 28)) else GOLD[3])
    for (x, y) in ((23, 28), (24, 28), (23, 29), (24, 29)):
        c.p(x, y, GOLD[0])
    # Faldão: lâmina de aço embaixo do cinto, com rebites.
    for x in range(15, 33):
        if (x, 30) in body:
            c.p(x, 30, STEEL[1])
        c.p(x, 31, STEEL[5] if x < 22 else STEEL[4] if x < 27 else STEEL[3])
        if (x, 33) in body:
            c.p(x, 33, STEEL[1])
    for x in (18, 23, 28):
        c.p(x, 32, STEEL[5])
        c.p(x + 1, 32, STEEL[1])
    # Rebites discretos dos lados do peito.
    for (x, y) in ((16, 22), (16, 25), (31, 22), (31, 25)):
        c.p(x, y, STEEL[5] if x < 24 else STEEL[4])
        c.p(x + 1, y + 1, STEEL[1])
    outline(c)
    return c


# ── Arqueiro: arco e flecha ──────────────────────────────────────────────

def bow() -> Canvas:
    c = Canvas(S, S)
    top, bot, sx = 5.5, 43.5, 29.5
    # Corpo do arco: curva que sai da corda, abre até x≈39 e volta em recurva nas pontas.
    limb = {}
    for y in range(4, 45):
        f = (y + 0.5 - top) / (bot - top)
        if f < -0.02 or f > 1.02:
            continue
        bend = math.sin(math.pi * min(1.0, max(0.0, f))) ** 0.75
        xc = sx + 10.4 * bend - 2.2 * (1 - bend) ** 6
        hwid = 1.2 + 1.6 * bend
        for x in range(int(xc - hwid - 1), int(xc + hwid + 2)):
            d = (x + 0.5 - xc) / hwid
            if abs(d) <= 1.0:
                limb[(x, y)] = (d, f)
    for (x, y), (d, f) in limb.items():
        i = 3 if d < -0.2 else 2 if d < 0.5 else 1
        if d < -0.65:
            i = 4
        if 0.42 < f < 0.58:
            # Empunhadura de couro.
            k = (y + x) % 3
            c.p(x, y, LEATHER5[1 if k == 0 else 3 if d < 0 else 2])
            continue
        g = noise(y / 2.5, x, 3, 1.0)
        if g < 0.25 and -0.2 < d < 0.6:
            i -= 1
        c.p(x, y, WOOD6[clamp(i + 1, 6)])
    # Pontas de osso nas recurvas.
    for (x, y) in ((27, 5), (28, 5), (27, 6), (27, 42), (28, 43), (27, 43)):
        c.p(x, y, (222, 214, 196) if y < 24 else (190, 180, 160))
    # Corda: linha clara retinha.
    for y in range(6, 43):
        c.p(29, y, (232, 224, 204) if y % 5 else (196, 186, 164))
    # Flecha: haste, penas vermelhas, entalhe e ponta de aço.
    for x in range(9, 40):
        c.p(x, 24, WOOD6[5] if x % 6 else WOOD6[4])
        c.p(x, 25, WOOD6[3])
    for x in range(5, 8):
        c.p(x, 24, WOOD6[1])
        c.p(x, 25, WOOD6[0])
    c.p(8, 24, (222, 214, 196))
    c.p(8, 25, (190, 180, 160))
    for k, x in enumerate(range(6, 14)):
        h = 4 if x < 12 else 3 if x == 12 else 2
        for j in range(h):
            col = RED[4] if j == 0 else RED[3] if (x + j) % 2 else RED[2]
            if x == 13:
                col = RED[1]
            c.p(x - j + 1, 23 - j, col)
            c.p(x - j + 1, 26 + j, RED[2] if j == 0 else RED[1] if (x + j) % 2 else RED[2])
    # Faixa clara nas penas.
    for x in (9, 10):
        c.p(x - 1, 22, (232, 224, 204))
        c.p(x - 1, 27, (190, 180, 160))
    head = poly([(39, 20.2), (46.6, 24.9), (39, 29.8)])
    for (x, y) in head:
        if y < 24:
            col = STEEL[5] if (x, y - 1) not in head else STEEL[6]
        elif y == 24:
            col = STEEL[6]
        elif y == 25:
            col = STEEL[3]
        else:
            col = STEEL[2] if (x, y + 1) not in head else STEEL[3]
        c.p(x, y, col)
    for y in range(22, 28):
        c.p(39, y, WOOD6[1] if y in (22, 27) else GOLD[2])
    outline(c)
    return c


# ── Clérigo: maça flangeada ──────────────────────────────────────────────

def mace() -> Canvas:
    c = Canvas(S, S)
    seg = Seg(30.5, 20.0, 9.5, 43.0)
    wood(c, seg, 1.9, 0, seg.L - 4, seed=11)
    leather_wrap(c, seg, 2.05, seg.L - 12.5, seg.L - 3.2)
    # Remate do punho: anel de couro e pomo de ferro redondo.
    ring(c, seg, 2.3, seg.L - 3.6, seg.L - 2.0, pal=LEATHER5)
    for (x, y) in ellipse(9.2, 43.6, 2.5, 2.4):
        u, v = x + 0.5 - 9.2, y + 0.5 - 43.6
        c.p(x, y, STEEL[5] if u + v < -1.5 else STEEL[4] if u + v < 0.2 else STEEL[3] if u + v < 1.6 else STEEL[2])
    c.p(8, 42, STEEL[6])
    # Colar de ferro entre cabo e cabeça.
    ring(c, seg, 2.4, 0.2, 3.2, pal=GOLD)
    # Cabeça: ovo de aço com flanges, faixa de ouro com rebites.
    cx, cy = 32.0, 12.2
    head = ellipse(cx, cy, 9.0, 7.6)
    for (x, y) in head:
        u, v = (x + 0.5 - cx) / 9.0, (y + 0.5 - cy) / 7.6
        b = 0.58 - 0.42 * u - 0.32 * v - 0.25 * (u * u + v * v)
        i = 1 + int(b * 5.0)
        # Flanges: frisos verticais (aresta clara à esquerda, vinco escuro à direita).
        fx = (x + 0.5 - cx) / 3.2
        k = fx - math.floor(fx)
        if abs(u) < 0.9:
            if k < 0.2:
                i += 1
            elif k > 0.78:
                i -= 1
        c.p(x, y, STEEL[clamp(i, 6)])
    for x in range(23, 41):
        for y, col in ((12, None), (13, None)):
            if (x, y) in head:
                u = (x + 0.5 - cx) / 9.0
                if y == 12:
                    c.p(x, y, GOLD[4] if u < -0.2 else GOLD[3] if u < 0.45 else GOLD[2])
                else:
                    c.p(x, y, GOLD[2] if u < 0.3 else GOLD[1])
        if (x, 14) in head:
            c.p(x, 14, STEEL[1])
    for x in (26, 30, 34, 38):
        c.p(x, 12, GOLD[5] if x < 32 else GOLD[4])
        c.p(x, 13, GOLD[0])
    # Remate no topo e brilho.
    for (x, y) in ellipse(32, 5.2, 1.8, 1.3):
        c.p(x, y, GOLD[4] if x < 32 else GOLD[2])
    for (x, y) in ((27, 7), (28, 7), (26, 8), (27, 8), (26, 9)):
        c.p(x, y, STEEL[6] if (x, y) != (26, 9) else STEEL[5])
    # Base da cabeça: borda escura onde encosta no colar.
    for x in range(26, 37):
        if (x, 19) in head and (x, 20) not in head:
            c.p(x, 19, STEEL[1])
    outline(c)
    return c


# ── Guardião: espada e escudo ────────────────────────────────────────────

def heater(y: int) -> float:
    """Meia-largura do escudo por linha (centro em x = 34)."""
    table = {25: 6.0, 26: 7.2, 35: 7.6, 36: 7.0, 37: 6.2, 38: 5.2, 39: 4.2, 40: 3.2, 41: 2.0, 42: 1.0}
    if 27 <= y <= 34:
        return 8.0
    return table.get(y, 0.0)


def sword_shield() -> Canvas:
    c = Canvas(S, S)
    # Escudo (atrás da espada).
    cx = 34.0
    shield = {(x, y) for y in range(25, 43) for x in range(20, 46) if abs(x + 0.5 - cx) <= heater(y)}
    inner = {(x, y) for (x, y) in shield if all((x + dx, y + dy) in shield for dx in (-2, 0, 2) for dy in (-2, 0, 2))}
    mid = {(x, y) for (x, y) in shield if all((x + dx, y + dy) in shield for dx in (-1, 0, 1) for dy in (-1, 0, 1))}
    for (x, y) in shield - inner:
        u = x + 0.5 - cx
        outer = (x, y) not in mid
        if u < -3 or y < 27:
            col = GOLD[4] if outer else GOLD[3]
        elif u > 3 or y > 37:
            col = GOLD[2] if outer else GOLD[1]
        else:
            col = GOLD[3] if outer else GOLD[2]
        c.p(x, y, col)
    for (x, y) in inner:
        u, v = (x + 0.5 - cx) / 6.0, (y - 27) / 12.0
        bri = 0.62 - 0.32 * u - 0.32 * v
        i = 1 + int(bri * 4.4)
        c.p(x, y, BLUE[clamp(i, 6)])
    # Campo rebaixado: a borda faz sombra em cima/esquerda e reflete embaixo/direita.
    for (x, y), (t, l, b, r) in edges(inner).items():
        if t or l:
            c.p(x, y, BLUE[1])
        elif b or r:
            c.p(x, y, BLUE[4] if y < 37 else BLUE[3])
    # Divisa: cruz de prata do Guardião, com rebite no centro.
    for y in range(28, 39):
        c.p(33, y, STEEL[5] if y < 33 else STEEL[4])
        c.p(34, y, STEEL[3] if y < 33 else STEEL[2])
    for x in range(29, 39):
        if x not in (33, 34):
            c.p(x, 31, STEEL[5] if x < 34 else STEEL[4])
            c.p(x, 32, STEEL[3] if x < 34 else STEEL[2])
    c.p(33, 31, STEEL[6])
    # Espada em 45°: lâmina, guarda de ouro, punho de couro e pomo.
    blade = Seg(37.0, 5.0, 20.0, 22.0)
    steel_blade(c, blade, lambda f: 1.15 if f < 0.06 else 1.9 if f < 0.1 else 2.05, 0, blade.L, fuller=True)
    for (x, y), (t, s) in blade.band(0.5, 0, blade.L * 0.08).items():
        c.p(x, y, STEEL[6])
    grip = Seg(19.0, 23.0, 9.0, 33.0)
    leather_wrap(c, grip, 1.55, 1.0, grip.L, pitch=2.8)
    guard = Seg(12.5, 16.5, 25.5, 29.5)
    for (x, y), (t, s) in guard.band(1.35).items():
        i = 3 if s > 0.2 else 2
        if s > 0.7:
            i = 4
        if t < 0.1 or t > 0.9:
            i -= 1
        c.p(x, y, GOLD[clamp(i, 6)])
    for (x, y) in ellipse(19.2, 23.0, 1.8, 1.8):
        c.p(x, y, GOLD[4] if x + y < 41 else GOLD[2])
    c.p(18, 22, GOLD[5])
    for (x, y) in ellipse(8.0, 34.0, 2.6, 2.6):
        u, v = x + 0.5 - 8.0, y + 0.5 - 34.0
        c.p(x, y, GOLD[5] if u + v < -2.0 else GOLD[4] if u + v < -0.5 else GOLD[3] if u + v < 1.5 else GOLD[2])
    c.p(7, 33, GOLD[5])
    outline(c)
    return c


# ── Lanceiro: lança com borla vermelha ───────────────────────────────────

def spear() -> Canvas:
    c = Canvas(S, S)
    seg = Seg(41.6, 3.6, 7.6, 44.0)
    L = seg.L
    head_len = 15.0

    def leaf(f):
        t = f * L
        if t > head_len:
            return 0
        if t < 9.5:
            return 0.4 + 3.0 * math.sin(t / 9.5 * math.pi / 2)
        return 3.4 - 1.6 * (t - 9.5) / (head_len - 9.5)

    for (x, y), (t, s) in seg.band(leaf, 0, head_len).items():
        if abs(s) < 0.22:
            col = STEEL[6] if t * L < 9 else STEEL[5]
        elif s > 0.7:
            col = STEEL[5]
        elif s > 0:
            col = STEEL[4]
        elif s > -0.7:
            col = STEEL[2]
        else:
            col = STEEL[1]
        c.p(x, y, col)
    # Alvado (encaixe) de ferro com dois anéis.
    for (x, y), (t, s) in seg.band(1.75, head_len, head_len + 4.5).items():
        tl = t * L - head_len
        i = 4 if s > 0.3 else 3 if s > -0.4 else 2
        if 1.4 < tl < 2.4:
            i -= 2
        c.p(x, y, STEEL[clamp(i, 7)])
    wood(c, seg, 1.85, head_len + 4.5, L - 3.6, seed=5)
    # Ponteira de ferro.
    for (x, y), (t, s) in seg.band(1.8, L - 3.6, L).items():
        c.p(x, y, STEEL[4] if s > 0.2 else STEEL[2])
    # Borla vermelha: nó no cabo e franja caindo.
    knot_t = (head_len + 6.0) / L
    kx, ky = seg.ax + seg.ux * knot_t * L, seg.ay + seg.uy * knot_t * L
    for (x, y), (t, s) in seg.band(2.2, head_len + 4.6, head_len + 7.6).items():
        c.p(x, y, RED[4] if s > 0.3 else RED[3] if s > -0.4 else RED[2])
    for j, dx in enumerate(range(-4, 2)):
        n = (7, 9, 8, 10, 8, 6)[j]
        for k in range(n):
            x = int(kx + dx - k * 0.1 * (1 - dx))
            y = int(ky + 1 + k)
            col = (RED[3], RED[2], RED[4], RED[3], RED[2], RED[3])[j]
            if k < 2:
                col = RED[4] if j % 2 == 0 else RED[3]
            if k >= n - 2:
                col = RED[1] if k == n - 1 else RED[2]
            c.p(x, y, col)
    outline(c)
    return c


# ── Piromante: cajado com orbe de fogo ───────────────────────────────────

def staff() -> Canvas:
    c = Canvas(S, S)
    seg = Seg(31.0, 18.5, 9.6, 45.5)
    wood(c, seg, 1.9, 0, seg.L - 2.5, seed=21)
    for (x, y), (t, s) in seg.band(1.8, seg.L - 2.5, seg.L).items():
        c.p(x, y, GOLD[3] if s > 0 else GOLD[1])
    ring(c, seg, 2.2, 6.0, 8.2, pal=GOLD)
    # Orbe: anel escuro por fora, fogo girando por dentro, miolo claro em cima/esquerda.
    ox, oy, r = 37.0, 12.3, 7.6
    orb = ellipse(ox, oy, r, r)
    for (x, y) in orb:
        dx, dy = x + 0.5 - ox, y + 0.5 - oy
        d = math.hypot(dx, dy) / r
        a = math.atan2(dy, dx)
        swirl = math.sin(a * 2 + d * 6.5) * 0.5 + 0.5
        core = math.hypot(dx + 1.6, dy + 1.8) / r
        heat = 1.05 - core * 1.05 + 0.22 * swirl
        i = 1 + int(heat * 5.2)
        if d > 0.86:
            i = min(i, 2) if (dx + dy) > -2 else min(i, 3)
        c.p(x, y, FIRE[clamp(i, 7)])
    for (x, y) in ((34, 9), (35, 9), (34, 10)):
        c.p(x, y, FIRE[6])
    c.p(41, 16, FIRE[5])
    # Berço de bronze: três garras curvas abraçando o orbe por baixo.
    cradle = {}
    for (x, y) in ellipse(ox, oy, r + 1.7, r + 1.7) - orb:
        a = math.degrees(math.atan2(y + 0.5 - oy, x + 0.5 - ox))
        if any(lo <= a <= hi for lo, hi in ((24, 62), (100, 152), (170, 204))):
            cradle[(x, y)] = a
    for (x, y), a in cradle.items():
        lit = -(math.cos(math.radians(a)) * 0.6 + math.sin(math.radians(a)) * 0.8)
        i = 3 if lit > 0.0 else 2 if lit > -0.7 else 1
        c.p(x, y, GOLD[i])
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) in orb:
                c.p(x + dx, y + dy, FIRE[0])
    for a in (26, 168, 202):
        x = int(ox + math.cos(math.radians(a)) * (r + 1.0))
        y = int(oy + math.sin(math.radians(a)) * (r + 1.0))
        c.p(x, y, GOLD[4])
    outline(c)
    return c


# ── Selvagem: machado ────────────────────────────────────────────────────

def axe() -> Canvas:
    c = Canvas(S, S)
    seg = Seg(31.6, 12.0, 11.6, 44.0)
    wood(c, seg, 1.9, 0, seg.L - 3, seed=31)
    leather_wrap(c, seg, 2.15, seg.L - 13.0, seg.L - 3.0, pitch=3.2)
    for (x, y), (t, s) in seg.band(2.0, seg.L - 3, seg.L).items():
        c.p(x, y, STEEL[3] if s > 0 else STEEL[1])
    # Lâmina barbada à direita do olho: fio em arco, barba descendo, recorte côncavo junto ao cabo.
    ax_, ay_, R = 28.6, 8.6, 13.6
    bx_, by_, r = 31.0, 17.4, 7.0
    blade = set()
    for y in range(0, 18):
        for x in range(33, 46):
            px, py = x + 0.5, y + 0.5
            top = max(1.6, 5.0 - 0.62 * (px - 33))
            if py < top:
                continue
            if (px - ax_) ** 2 + (py - ay_) ** 2 > R * R:
                continue
            if (px - bx_) ** 2 + (py - by_) ** 2 < r * r:
                continue
            blade.add((x, y))
    for (x, y) in blade:
        px, py = x + 0.5, y + 0.5
        de = R - math.hypot(px - ax_, py - ay_)        # distância até o fio
        dt = py - (5.0 - 0.62 * (px - 33))             # distância até a aresta de cima
        i = 4 if py < 6 else 3 if py < 10 else 2
        if dt < 1.0:
            i = 5
        if de < 1.5:
            i = 6 if py < 9 else 5                     # fio afiado
        elif de < 3.0:
            i = 1                                      # chanfro escuro antes do fio
        c.p(x, y, STEEL[clamp(i, 7)])
    for (x, y), (t, l, b, r_) in edges(blade).items():
        if b and not r_ and math.hypot(x + 0.5 - ax_, y + 0.5 - ay_) < R - 1.6:
            c.p(x, y, STEEL[1])
    # Furo em meia-lua na lâmina e duas lascas no fio.
    for (x, y) in ((36, 7), (37, 7), (36, 8), (36, 9), (37, 9)):
        c.p(x, y, STEEL[0])
    c.p(37, 8, STEEL[2])
    for (x, y) in ((41, 10), (40, 4)):
        if (x, y) in blade:
            c.p(x, y, STEEL[2])
    # Ponta de trás (espigão) à esquerda do olho.
    spike = poly([(29.0, 6.4), (29.0, 11.0), (24.4, 8.9)])
    for (x, y) in spike:
        c.p(x, y, STEEL[4] if y < 8 else STEEL[3] if y < 9 else STEEL[2])
    # Olho: alvado de ferro com rebites.
    for (x, y) in rect(29, 4, 5, 10):
        u = x - 29
        c.p(x, y, IRON[4] if u < 2 else IRON[3] if u < 4 else IRON[2])
    for x in range(29, 34):
        c.p(x, 4, STEEL[5] if x < 31 else STEEL[4])
        c.p(x, 13, IRON[1])
    for (x, y) in ((30, 6), (30, 10)):
        c.p(x, y, STEEL[6])
        c.p(x + 1, y + 1, IRON[0])
    # Amarração de couro embaixo do olho.
    for (x, y), (t, s) in seg.band(2.25, 2.4, 6.2).items():
        k = (t * seg.L) % 1.8
        c.p(x, y, LEATHER5[3] if k < 0.9 and s > -0.3 else LEATHER5[1])
    outline(c)
    return c


ICONS = {
    'export/ui/ui-icon-amulet.png': amulet,
    'export/ui/ui-icon-armor.png': armor,
    'export/ui/ui-icon-weapon-arqueiro.png': bow,
    'export/ui/ui-icon-weapon-clerigo.png': mace,
    'export/ui/ui-icon-weapon-guardiao.png': sword_shield,
    'export/ui/ui-icon-weapon-lanceiro.png': spear,
    'export/ui/ui-icon-weapon-piromante.png': staff,
    'export/ui/ui-icon-weapon-selvagem.png': axe,
}
