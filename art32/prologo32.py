"""Peças do prólogo animado em 16 e 32-bit, e o índice src/render/pack-prologo.ts.

A abadia da Ordem da Candeia inteira (com o overlay "-lights") e em ruína lá no fundo, o
penhasco que se repete de lado e a borda quebrada, o olho do abismo (4 quadros), o monge com a
vela (2 quadros) e a lua. Usa o Piece, as paletas e os traços de historias32.py: cada peça é
desenhada uma vez em unidades 16-bit e sai nas duas escalas.

Uso: python3 -I art32/prologo32.py [--preview PASTA] [--dry]
  --dry    só as prévias (não grava no pack nem no índice)
"""
import json
import math
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

import historias32 as H  # noqa: E402
from historias32 import (  # noqa: E402
    BRONZE, CHUMBO, FOGO, GLASS, IRON, LIT, LUZ16, MADEIRA, OL, OURO, SLATE, Piece, ball, beam, cyl, poly, seg, strata,
)

L, K, A = H.L, H.K, H.A

# Pedra da abadia: cinza mais fria que a das casas da vila.
PEDRA = [(46, 50, 62), (70, 76, 90), (98, 104, 118), (130, 136, 150), (166, 172, 186)]
# A mesma pedra depois da queda: mais escura e encardida.
PEDRA_R = [L.mul(L.mix(c, (60, 52, 64), 0.25), 0.82) for c in PEDRA]
VAZIO = K.VOID
VIOLETA = A.VIOLET + [(176, 120, 220), (226, 186, 250)]           # o brilho dos fungos do abismo
VITRAL_DIA = [(70, 24, 30), (24, 34, 70), (70, 52, 18), (28, 52, 34)]
VELA = [(236, 150, 64), (255, 190, 100), (255, 222, 140)]          # vitrais acesos: luz de vela
BASE_Y = 108                                                        # base de pedra: linhas 108 a 111
NAVE_Y = 72              # topo da parede da nave (o beiral fica logo acima)
RIDGE_Y = 46             # cumeeira da nave
APEX_Y = 30              # ponta da empena do transepto
GABLE_Y = 62             # pé da empena (cornija)
ROSE_Y = 52              # centro da rosácea


# ── Abadia ────────────────────────────────────────────────────────────────

def pointed(p: Piece, gx, gy, gw, gh, pal=PEDRA, ruined=False, seed=0, lead=True):
    """Janela de arco quebrado: moldura de pedra, vidro escuro com chumbo na 32-bit e aceso no
    overlay; na ruína, o vão escuro com um caco de caixilho."""
    s = p.s
    cy = gy + gw * 0.87

    def inside(u, v, grow=0.0):
        if not (gx - grow <= u < gx + gw + grow and gy - 2 * grow <= v < gy + gh + grow):
            return False
        if v < cy:
            return math.hypot(u - (gx + gw), v - cy) <= gw + grow and math.hypot(u - gx, v - cy) <= gw + grow
        return True

    X0, Y0 = round(gx * s), round(gy * s)
    for X, Y, u, v in p.each(gx - 1, gy - 3, gw + 2, gh + 4):
        if inside(u, v):
            if ruined:
                col = VAZIO[1] if (u - gx) + (v - gy) * 0.2 > 1.2 else VAZIO[2]
                if s == 2 and v > gy + gh - 2 and L.hsh(X, Y, seed) < 0.4:
                    col = PEDRA_R[1]                                   # entulho no peitoril
                p.put(X, Y, col)
                continue
            lx, ly = X - X0, Y - Y0
            if s == 2 and lead and ((lx + ly) % 4 == 0 or (lx - ly) % 4 == 0):
                p.put(X, Y, CHUMBO)
                continue
            t = ((u - gx) / gw + (v - gy) / gh) / 2
            col = L.mix(GLASS[2], GLASS[0], t)
            if s == 1 and (u - gx) + (v - gy) * 0.3 < 1.4:
                col = GLASS[2]
            if s == 2 and 1 <= lx - ly * 0.6 <= 2 and v < gy + gh * 0.5:
                col = GLASS[3]
            p.put(X, Y, col)
            p.glow(X, Y, H.lit_color(p, X, Y, u, v, gx + gw / 2, gy + gh * 0.6, gw * 0.7, gh * 0.6, seed))
        elif inside(u, v, 1.0):
            col = pal[3] if u < gx + gw / 2 else pal[2]
            if v >= gy + gh:
                col = pal[1]
            if s == 2 and not inside(u, v, 0.5):
                col = L.mul(col, 0.86)
            p.put(X, Y, col)
    if not ruined:
        for X, Y, u, v in p.each(gx, gy + round(gh * 0.55), gw, 1):
            p.put(X, Y, pal[2])                                        # travessa de pedra
            p.lt.pop((X, Y), None)


def rose_window(p: Piece, cx, cy, r, ruined=False, pal=PEDRA):
    """Rosácea: aro de pedra, doze raios de pedra e o miolo; o vidro escuro de dia (com um toque
    de cor) e aceso em luz de vela no overlay. Na ruína, só o aro, quebrado, com o vazio dentro e
    um toco de raio."""
    s = p.s
    for X, Y, u, v in p.each(cx - r - 1, cy - r - 1, 2 * r + 2, 2 * r + 2):
        dx, dy = u - cx, v - cy
        d = math.hypot(dx, dy)
        if d > r:
            continue
        ang = math.atan2(dy, dx)
        if d > r - 1.2:
            if ruined and (ang > 0.4 and ang < 1.3):
                continue                                               # pedaço do aro que caiu
            col = pal[4] if (dx < 0 and dy < 0.3 * r) else (pal[3] if dx < 0 or dy < 0 else pal[1])
            p.put(X, Y, col)
            continue
        if ruined:
            spoke = abs(((ang + math.pi) / (2 * math.pi) * 12 + 0.5) % 1.0 - 0.5) * d < 0.4 and d < r * 0.5 and dx < 0
            p.put(X, Y, pal[2] if spoke or d < 1.0 else VAZIO[1])
            continue
        spoke = abs(((ang + math.pi) / (2 * math.pi) * 12) % 1.0 - 0.5) * d * (2 * math.pi / 12) < (0.32 if s == 2 else 0.45)
        if d < 1.4 or spoke or (s == 2 and abs(d - r * 0.55) < 0.25):
            col = pal[3] if (dx + dy) < 0 else pal[2]
            p.put(X, Y, col)
            continue
        k = int(((ang + math.pi) / (2 * math.pi) * 12)) % 4
        day = L.mix(GLASS[1], VITRAL_DIA[k], 0.55)
        if s == 2 and dx + dy < -0.8 * d and d > r * 0.6:
            day = L.mix(day, GLASS[3], 0.4)
        p.put(X, Y, day)
        if s == 1:
            glow = LUZ16[1] if d < r * 0.55 else LUZ16[0]
        else:
            glow = L.mix(VELA[2], VELA[0], d / r)
            if k == 1:
                glow = L.mix(glow, (220, 120, 90), 0.3)
        p.glow(X, Y, glow)


def slate_roof(p: Piece, x0, x1, y0, y1, inset, pal=SLATE, seed=0):
    """Água comprida do telhado da nave, vista de frente: fiadas de ardósia deitadas (como no
    pack), a cumeeira em cima e o beiral; o lado direito é a empena vista de quina."""
    s = p.s
    for X, Y, u, v in p.each(x0, y0, x1 - x0 + inset, y1 - y0 + 1):
        t = (v - y0) / (y1 - y0)
        xr = x1 - inset + inset * t
        if u > xr:
            continue
        course, ly = Y // (3 * s), Y % (3 * s)
        off = int(L.hsh(course, 0, seed) * 4 * s)
        sx, slab = (X + off) % (4 * s), (X + off) // (4 * s)
        if s == 1:
            col = L.mix(pal[2], pal[3], 0.5) if ly == 0 else (pal[1] if ly == 1 else pal[0])
            if sx == 3 and ly < 2:
                col = pal[0]
        else:
            col = pal[0] if ly == 5 else (pal[3] if ly == 0 else (pal[1] if ly == 4 else pal[2]))
            if sx == 7 and ly < 5:
                col = pal[0]
            col = L.mul(col, 0.88 + 0.22 * L.hsh(slab, course, seed + 1))
        if u > xr - 1:
            col = pal[0]                                               # quina da empena
        if v < y0 + 1:
            col = pal[4] if (X // s) % 3 else pal[2]                   # cumeeira
        p.put(X, Y, col)


def buttress(p: Piece, x, top, bottom=BASE_Y, w=4, pal=PEDRA, pinnacle=True):
    """Contraforte: degraus que se afastam da parede, a face da frente clara à esquerda, o topo
    em rampa e um pináculo em ponta."""
    s = p.s
    for X, Y, u, v in p.each(x, top, w, bottom - top):
        lx = u - x
        col = pal[3] if lx < 1 else (pal[2] if lx < w - 1 else pal[1])
        if int(v - top) % 12 in (0,):
            col = pal[4] if lx < w - 1 else pal[2]                     # ressalto
        if s == 2 and int((v - top) * 2) % 6 == 5:
            col = L.mul(col, 0.8)                                       # junta
        p.put(X, Y, col)
    if pinnacle:
        poly(p, [(x, top), (x + w, top), (x + w / 2, top - 6)], pal[2])
        poly(p, [(x, top), (x + w / 2, top), (x + w / 2, top - 6)], pal[3])
        p.rect(x - 0.5 if s == 2 else x, top, w + (1 if s == 2 else 0), 1, pal[4])


def belfry_bell(p: Piece, cx, top):
    """Sino de bronze pendurado na viga, no escuro do campanário."""
    s = p.s
    p.rect(cx - 4, top, 8, 1, MADEIRA[1])
    for X, Y, u, v in p.each(cx - 4, top + 1, 8, 7):
        t = (v - top - 1) / 6
        half = 1.4 + 1.6 * t + (1.4 * (t - 0.7) / 0.3 if t > 0.7 else 0)
        if abs(u - cx) > half:
            continue
        b = 1 - abs((u - cx) / half + 0.35) * 0.9
        col = BRONZE[max(0, min(4, int(b * 5)))]
        if t > 0.86:
            col = BRONZE[3] if u < cx else BRONZE[1]
        p.put(X, Y, col)
    p.rect(cx - 0.5 if s == 2 else cx, top + 7, 1, 1, BRONZE[1])


def lantern(p: Piece, x, y):
    """Lampião de vela num braço de ferro, ao lado da porta (acende)."""
    s = p.s
    p.rect(x - 2, y, 3, 1, IRON[1])
    p.rect(x, y + 1, 3, 1, IRON[2])
    for X, Y, u, v in p.each(x, y + 2, 3, 3):
        hot = abs(u - (x + 1.5)) < 0.6
        p.put(X, Y, (255, 236, 190) if hot else (255, 196, 104))
        p.glow(X, Y, LUZ16[1] if s == 1 else (LIT[4] if hot else LIT[3]))
    p.rect(x, y + 5, 3, 1, IRON[1])
    p.dot(x + 1, y + 6, IRON[1])


def flame_finial(p: Piece, cx, top):
    """Remate em forma de chama de vela (a Ordem da Candeia), dourado."""
    s = p.s
    p.rect(cx - 0.5 if s == 2 else cx, top + 2, 1, 3, OURO[1])
    ball(p, cx, top + 1.4, 0.9, 1.4, OURO[1:])
    p.fine(round(cx * 2) - 1, top * 2 + 1, OURO[3])


def abadia_body(p: Piece, ruined=False):
    """A abadia inteira (128 × 112): torre à esquerda, nave comprida com contrafortes e janelas
    ogivais, o transepto com a rosácea, a porta e o lampião, e a base de pedra. Na ruína, as
    janelas viram vãos e nada acende (o resto é cortado depois)."""
    pal = PEDRA_R if ruined else PEDRA
    s = p.s
    # Base de pedra (as 4 linhas de baixo).
    for X, Y, u, v in p.each(4, BASE_Y, 120, 4):
        ly = Y - BASE_Y * s
        col = pal[4] if ly < s else (pal[1] if ly >= 4 * s - s else pal[2])
        if (u - 4) % 10 >= 10 - 1 / s and ly >= s:
            col = pal[1]
        p.put(X, Y, col)
    # Nave: parede, cornija do beiral e o telhado alto.
    H.ashlar(p, 30, NAVE_Y, 92, BASE_Y - NAVE_Y, pal=pal, bw=6, bh=3, seed=21)
    strata(p, 30, NAVE_Y - 1, 93, [pal[4], pal[1]], [pal[4], pal[3], pal[2], pal[1]])
    for x in range(32, 122, 4):
        p.dot(x, NAVE_Y + 1, pal[1])
    p.shade(30, NAVE_Y + 1, 92, 1, 0.75)
    if not ruined:
        slate_roof(p, 30, 120, RIDGE_Y, NAVE_Y - 2, 4, seed=22)
    # Contrafortes e janelas da nave.
    for x in (42, 56, 108):
        buttress(p, x, NAVE_Y + 6, pal=pal, pinnacle=not ruined)
    buttress(p, 118, NAVE_Y + 2, pal=pal, pinnacle=not ruined)
    for i, gx in enumerate((35, 49, 62, 102, 113)):
        pointed(p, gx, NAVE_Y + 9, 3, 15, pal=pal, ruined=ruined, seed=i)
    # Transepto (fachada com a rosácea): parede, empena alta, cornija, contrafortes de canto.
    H.ashlar(p, 66, APEX_Y, 36, BASE_Y - APEX_Y, pal=pal, bw=6, bh=3, seed=23,
             clip=lambda u, v: v >= APEX_Y + abs(u - 84) * (GABLE_Y - APEX_Y) / 18)
    if not ruined:
        for X, Y, u, v in p.each(64, APEX_Y - 4, 40, GABLE_Y - APEX_Y + 6):   # a capa da empena, com sombra
            a = abs(u - 84)
            edge = APEX_Y + a * (GABLE_Y - APEX_Y) / 18
            T = (v - edge) * s
            if 0 <= T < 2 * s and a <= 19:
                col = [pal[4], pal[3], pal[2], pal[1]][min(3, int(T / (2 * s) * 4))]
                p.put(X, Y, col if u < 84 else L.mul(col, 0.88))
            elif 2 * s <= T < 3 * s and a <= 18:
                p.c.shade(X, Y, 0.74)
        flame_finial(p, 84, APEX_Y - 5)
    strata(p, 66, GABLE_Y, 36, [pal[4], pal[1]], [pal[4], pal[3], pal[2], pal[1]])
    for x in (64, 100):
        buttress(p, x, GABLE_Y + 2, pal=pal, pinnacle=not ruined)
    rose_window(p, 84, ROSE_Y, 8, ruined=ruined, pal=pal)
    for gx in (72, 94):
        pointed(p, gx, GABLE_Y + 10, 3, 16, pal=pal, ruined=ruined, seed=gx)
    # Porta em arco quebrado com arquivolta, e o lampião.
    for X, Y, u, v in p.each(77, 90, 14, 18):
        cy = 94.5
        inner = (80 <= u < 88) and (v >= cy or (math.hypot(u - 88, v - cy) <= 8 and math.hypot(u - 80, v - cy) <= 8))
        outer = (78 <= u < 90) and (v >= cy - 0.5 or (math.hypot(u - 90, v - cy) <= 10.5 and math.hypot(u - 78, v - cy) <= 10.5))
        if inner:
            if ruined:
                p.put(X, Y, VAZIO[1])
            else:
                k = (X - 80 * s) % (2 * s)
                col = MADEIRA[3] if k == 0 else MADEIRA[2]
                if abs(u - 84) < 0.5 / s + 0.01:
                    col = MADEIRA[0]
                p.put(X, Y, col)
        elif outer:
            p.put(X, Y, pal[3] if u < 84 else pal[1])
    if not ruined:
        strata(p, 80, 101, 8, [IRON[2]], [IRON[3], IRON[1]])
        p.dot(83, 99, IRON[4])
        p.dot(85, 99, IRON[4])
        lantern(p, 91, 91)
        strata(p, 77, 107, 14, [pal[4]], [pal[4], pal[3]])
    # Torre: corpo, cornijas, janelas, campanário e a agulha.
    H.ashlar(p, 8, 22, 22, BASE_Y - 22, pal=pal, bw=6, bh=3, seed=24)
    for x in (6, 28):
        buttress(p, x, 46, w=3, pal=pal, pinnacle=False)
    for y in (58, 80):
        strata(p, 7, y, 24, [pal[4], pal[1]], [pal[4], pal[3], pal[2], pal[1]])
    pointed(p, 17.5, 85, 3, 15, pal=pal, ruined=ruined, seed=30)
    pointed(p, 17.5, 63, 3, 11, pal=pal, ruined=ruined, seed=31)
    pointed(p, 17.5, 43, 3, 9, pal=pal, ruined=ruined, seed=32)
    if not ruined:
        for X, Y, u, v in p.each(11, 23, 16, 14):                  # vão do campanário
            cy = 30
            if (12 <= u < 26) and v < 37 and (v >= cy or (math.hypot(u - 26, v - cy) <= 14 and math.hypot(u - 12, v - cy) <= 14)):
                p.put(X, Y, VAZIO[1] if v < 33 else VAZIO[2])
        belfry_bell(p, 19, 26)
        strata(p, 7, 37, 24, [pal[4], pal[1]], [pal[4], pal[3], pal[2], pal[1]])
        strata(p, 6, 21, 26, [pal[4], pal[2]], [pal[4], pal[3], pal[2], pal[1]])
        for X, Y, u, v in p.each(6, 3, 26, 18):                    # agulha de ardósia em escamas
            half = 0.8 + (v - 3) * (12.5 / 18)
            if abs(u - 19) > half:
                continue
            row = int((v - 3) * s // (2 * s))
            sx = (u + (1 if row % 2 else 0)) % 2
            col = SLATE[3] if u < 19 else SLATE[1]
            if int((v - 3) * s) % (2 * s) == 2 * s - 1:
                col = SLATE[0]
            elif s == 2 and sx < 0.5:
                col = L.mul(col, 0.88)
            p.put(X, Y, col)
        flame_finial(p, 19, 0.6)


def abadia(s: int):
    """Abadia da Ordem da Candeia (128 × 112), nas cores de dia como os prédios da vila: a cena
    tinge de azul-noite e põe o overlay de luzes (vitrais, rosácea e lampião) por cima."""
    p = Piece(128, 112, s)
    abadia_body(p)
    H.moss(p, 4, 100, 120, 12, amount=0.3, seed=25)
    return p.image(), p.lights()


def abadia_ruina(s: int) -> Image.Image:
    """A mesma abadia depois da queda, lá no fundo (128 × 96): a torre partida ao meio com o
    pedaço de cima tombado, o telhado afundado (só caibros e uma aba de ardósia), as paredes da
    nave em tocos, a rosácea vazia e rachada, montes de entulho e pintas de fungo violeta."""
    big = Piece(128, 112, s)
    abadia_body(big, ruined=True)

    def brk(u):
        # Altura (16-bit) até onde a parede ficou de pé, por coluna.
        j = 3 * math.sin(u * 0.9) + 2.4 * math.sin(u * 2.3 + 1) + 2 * L.noise(u, 0, 77, 1.6)
        if u < 32:
            return 64 + j * 0.6                                        # toco da torre
        if 64 <= u < 104:
            return 40 + abs(u - 76) * 0.9 + j                         # transepto (fica a rosácea)
        if any(abs(u - (b + 2)) < 2.5 for b in (42, 56, 108, 118)):
            return 72 + j * 0.6                                        # contrafortes aguentam mais
        return 84 + j
    for X, Y, u, v in big.each(0, 0, 128, 112):
        if v < brk(u):
            big.put(X, Y, None)
    big.lt.clear()
    s_ = s
    p = Piece(128, 96, s)
    p.c.paste(big.c, 0, -16 * s_)
    off = -16                                                          # 112 → 96: tudo sobe 16
    # O pedaço de cima da torre, tombado para a direita sobre a nave (cisalhado, não girado).
    top = Piece(128, 112, s)
    H.ashlar(top, 8, 22, 22, 42, pal=PEDRA_R, bw=6, bh=3, seed=24)
    for y in (37, 58):
        strata(top, 7, y, 24, [PEDRA_R[4], PEDRA_R[1]], [PEDRA_R[4], PEDRA_R[3], PEDRA_R[2], PEDRA_R[1]])
    for X, Y, u, v in top.each(11, 24, 16, 13):
        if 13 <= u < 25 and 26 <= v < 36:
            top.put(X, Y, VAZIO[1] if v < 33 else VAZIO[2])            # o vão do campanário, vazio
    for X, Y, u, v in top.each(0, 18, 40, 50):
        if v > 63 + 2 * math.sin(u * 1.7) or v < 25 + 3 * math.sin(u * 1.1 + 2) + (u - 8) * 0.15:
            top.put(X, Y, None)                                        # quebrado em cima e embaixo
    k = 0.34
    for Y in range(top.c.h):
        for X in range(top.c.w):
            c = top.c.px[Y][X]
            if c is None:
                continue
            u, v = (X + 0.5) / s, (Y + 0.5) / s
            nu = u + (63 - v) * k + 3                                  # apoiado no toco, tombando para a direita
            nv = v + off + 1
            p.put(round(nu * s - 0.5), round(nv * s - 0.5), c)
    # Caibros quebrados no lugar do telhado e uma aba de ardósia pendurada.
    for (x, a, b) in ((38, (36, 66), (46, 52)), (52, (50, 66), (60, 54)), (110, (108, 66), (100, 55)), (116, (116, 66), (122, 58))):
        seg(p, a[0], a[1] + off, b[0], b[1] + off, MADEIRA[1], 1.4)
        seg(p, a[0] - 0.4, a[1] + off, b[0] - 0.4, b[1] + off, MADEIRA[2], 0.6)
    poly(p, [(46, 52 + off), (60, 56 + off), (58, 62 + off), (44, 58 + off)], SLATE[1])
    for X, Y, u, v in p.each(44, 52 + off, 16, 10):
        if p.get(X, Y) == SLATE[1] and int(v * s) % (2 * s) == 0:
            p.put(X, Y, SLATE[2])
    # Montes de entulho na base.
    for i, (cx, w, h) in enumerate(((20, 18, 9), (46, 18, 8), (64, 12, 6), (98, 14, 7), (116, 14, 7))):
        for j in range(14):
            x = cx - w / 2 + L.hsh(i, j, 81) * w
            y = 107 + off - L.hsh(i, j + 9, 81) * h * (1 - abs(x - cx) / (w * 0.6 + 0.1))
            ball(p, x, y, 1.2 + L.hsh(i, j, 82) * 1.4, 1.0 + L.hsh(i, j, 83) * 0.9, PEDRA_R[1:])
    # Fungo violeta brilhando aqui e ali.
    spots = [(14, 86), (22, 88), (26, 58), (36, 82), (40, 86), (47, 84), (52, 89), (60, 88), (70, 44), (75, 62),
             (88, 38), (97, 70), (100, 86), (104, 88), (112, 84), (119, 62), (122, 88), (33, 76), (8, 80), (90, 60)]
    for i, (x, y) in enumerate(spots):
        if p.get(round(x * s), round(y * s)) is not None:
            p.dot(x, y, VIOLETA[5])
            if i % 2 == 0 and p.get(round((x + 1) * s), round(y * s)) is not None:
                p.dot(x + 1, y, VIOLETA[4])
            p.fine(x * 2 + 1, y * 2, VIOLETA[6])
            p.fine(x * 2, y * 2 + 1, VIOLETA[3])
    H.moss(p, 4, 76, 120, 20, amount=0.45, seed=26)
    return p.image()


# ── Penhasco ──────────────────────────────────────────────────────────────

ROCHA = [(14, 12, 16), (26, 24, 30), (40, 38, 46), (58, 56, 64), (80, 76, 82), (106, 100, 102), (132, 124, 122)]
GRAMA_P = [(26, 36, 28), (38, 52, 36), (54, 70, 44), (72, 90, 54)]
TERRA_P = [(30, 22, 18), (48, 36, 28), (68, 52, 38)]
RAIZ = [(40, 30, 22), (64, 48, 34), (90, 68, 46)]
P = 64                                                              # período do penhasco (repete de lado)


def cliff_rock(p: Piece):
    """O bloco de penhasco inteiro (64 × 64, opaco): chão de capim escuro e a beira de terra nas
    5 linhas de cima, a pedra em estratos deitados com rachas e duas raízes, escurecendo até
    quase preto embaixo. Tudo fecha a volta em x (período 64)."""
    s = p.s
    pn = lambda u, v, sd, sc: H.pnoise(u, v, sd, sc, period=P)     # noqa: E731
    for X, Y, u, v in p.each(0, 0, 64, 64):
        if v < 3:
            n = pn(u * 2, v, 1, 2)
            col = GRAMA_P[3] if v < 1 and n > 0.45 else (GRAMA_P[2] if n > 0.5 else GRAMA_P[1])
            if s == 2 and L.hsh(X % (P * s), Y, 2) < 0.08:
                col = GRAMA_P[3]
        elif v < 5:
            col = TERRA_P[2] if v < 4 else TERRA_P[1]
            if pn(u * 3, 0, 3, 2) > 0.7:
                col = GRAMA_P[1] if v < 4 else TERRA_P[0]               # tufo caindo pela beira
        else:
            # Estratos: bandas de 4 a 7 de altura, onduladas, com quina clara e base escura.
            w = v + 1.6 * pn(u * 0.7, 0, 5, 6) + 0.8 * pn(u * 2, 1, 6, 3)
            band = 0
            edges = [5]
            while edges[-1] < 70:
                edges.append(edges[-1] + 4 + int(L.hsh(len(edges), 0, 7) * 4))
            for i in range(len(edges) - 1):
                if edges[i] <= w < edges[i + 1]:
                    band, ly, bh = i, w - edges[i], edges[i + 1] - edges[i]
                    break
            depth = (v - 5) / 59
            dark = 0.2 + 0.8 * (1 - depth) ** 1.5
            k = 4.3 + 0.8 * (L.hsh(band, 1, 8) - 0.5) + 0.7 * (pn(u, v, 9, 4) - 0.5)
            if ly < 1 / s * (1 if s == 1 else 1.5):
                k += 1.4                                                # quina de cima do estrato
            elif ly > bh - 1:
                k -= 1.4                                                # sombra embaixo
            k = max(0.0, min(6.0, k * dark))
            col = ROCHA[int(k)]
        p.put(X, Y, col)
    # Rachas em zigue-zague (desenhadas três vezes para fechar a volta).
    for (x0, y0, ln) in ((14, 8, 18), (41, 22, 26), (58, 6, 12)):
        for dxp in (-P, 0, P):
            x = x0 + dxp
            for i in range(ln):
                xx = x + 1.6 * math.sin(i * 0.9 + x0) + i * 0.15
                for X, Y, u, v in p.each(math.floor(xx), y0 + i, 1, 1):
                    c = p.get(X, Y)
                    if c is not None:
                        p.put(X, Y, L.mul(c, 0.45))
                        if s == 2 and p.get(X + 1, Y) is not None:
                            p.put(X + 1, Y, L.mix(p.get(X + 1, Y), ROCHA[5], 0.25))
    # Duas raízes saindo da beira e descendo pela pedra.
    for (x0, ln, sway) in ((24, 13, 1.0), (50, 9, -0.8)):
        for dxp in (-P, 0, P):
            pts = [(x0 + dxp + sway * math.sin(i * 0.7) * 1.4, 4 + i) for i in range(ln)]
            for i in range(len(pts) - 1):
                seg(p, *pts[i], *pts[i + 1], RAIZ[1], 1.0)
            p.fine(round(pts[2][0] * 2) - 1, 14, RAIZ[2])


def penhasco(s: int) -> Image.Image:
    """Bloco de penhasco que se repete de lado (64 × 64, opaco)."""
    p = Piece(64, 64, s)
    cliff_rock(p)
    return p.c.image()


def borda(s: int) -> Image.Image:
    """A borda do abismo (64 × 64): o mesmo bloco, mas o lado direito quebrou. A beira de capim
    sobra um pouco por cima (aba), a pedra recua em degraus irregulares até embaixo, com a quebra
    clara de pedra nova, pedras soltas e raízes penduradas no vazio. A coluna da esquerda é a
    mesma do penhasco (os dois emendam)."""
    p = Piece(64, 64, s)
    cliff_rock(p)

    def edge(v):
        if v < 5:
            return 50 + 1.5 * math.sin(v * 2)
        return 46 - (v - 5) * 0.32 + 3.2 * math.sin(v * 0.55) + 2.2 * L.noise(0, v, 91, 1.6)
    for X, Y, u, v in p.each(0, 0, 64, 64):
        e = edge(v)
        if u >= e:
            p.put(X, Y, None)
        elif u >= e - 1 and v >= 5:
            p.put(X, Y, L.mix(p.get(X, Y), ROCHA[6], 0.45 * (1 - (v - 5) / 70)))   # pedra quebrada, clara
    # Raízes penduradas da aba e pedras soltas grudadas na quebra.
    for (x, ln) in ((49, 9), (52, 6), (47.5, 14)):
        for i in range(ln):
            p.dot(math.floor(x + 0.8 * math.sin(i * 0.8)), 5 + i, RAIZ[1] if i % 3 else RAIZ[2])
    for (y, r) in ((20, 1.8), (33, 1.5), (47, 2.0)):
        x = edge(y) + r * 0.6
        ball(p, x, y, r, r * 0.85, ROCHA[2:6])
    out = p.image()                                                     # contorno só do lado quebrado
    return out


# ── O olho do abismo ──────────────────────────────────────────────────────

CARNE = [(26, 8, 22), (46, 14, 34), (76, 22, 60), (110, 26, 64), (150, 36, 72), (190, 44, 96)]
VEIA = A.VEIN
IRIS_A = [(52, 24, 78), (104, 54, 140), (150, 40, 90), (200, 46, 70), (236, 90, 80)]
ANEL = [(214, 52, 128), (246, 128, 186), (255, 206, 228)]
ESCLERA = [(70, 40, 52), (110, 70, 80), (150, 110, 116)]


def olho_frame(s: int, f: int) -> Image.Image:
    """Um quadro do olho (96 × 48). f: 0 fechado, 1 meio aberto, 2 aberto, 3 aberto com a pupila
    fechando em fenda fina."""
    p = Piece(96, 48, s)
    cx, cy = 48, 24
    open_ = (0.0, 0.42, 1.0, 1.0)[f]
    pupil = (0, 2.2, 2.6, 0.9)[f]
    RX, RY = 46, 21                                                     # pálpebras (o contorno de fora)
    ex, ey = 38, 14 * open_                                             # a abertura

    def lid_out(u):
        t = (u - cx) / RX
        return RY * (1 - t * t) ** 0.85 if abs(t) < 1 else 0

    def eye_h(u):
        t = (u - cx) / ex
        return ey * (1 - t * t) ** 0.9 if abs(t) < 1 else 0

    for X, Y, u, v in p.each(1, 1, 94, 46):
        dy = v - cy
        lo = lid_out(u)
        if abs(dy) > lo or lo <= 0:
            continue
        eh = eye_h(u)
        slit_dy = dy - 0.15 * eh                                      # a fenda fica um pouco abaixo do meio
        if abs(slit_dy) < eh and eh > 0.6:
            # O globo: esclera escura, íris violeta→carmim com o anel aceso, pupila em fenda.
            d = math.hypot(u - cx, v - (cy + 0.6))
            if d < 11:
                t = d / 11
                col = IRIS_A[min(4, int((1 - t) * 4.99))] if t > 0.3 else IRIS_A[4]
                if 0.78 < t < 0.92:
                    col = ANEL[1] if (u - cx) + (v - cy) < 0 else ANEL[0]
                elif t >= 0.92:
                    col = IRIS_A[0]
                if abs(u - cx) < pupil * (1 - (abs(v - cy - 0.6) / 10.5) ** 2) and abs(v - cy - 0.6) < 10.5:
                    col = (8, 2, 8)
            else:
                dn = math.hypot((u - cx) / ex, (v - (cy + 1)) / max(eh * 1.15, 1.0))
                k = 1.05 - dn ** 1.3 - max(0.0, -slit_dy / max(eh, 1)) * 0.25
                col = ESCLERA[max(0, min(2, int(k * 3)))]
            if slit_dy < -eh + 2.2:
                col = L.mul(col, 0.55)                                 # sombra da pálpebra de cima
            p.put(X, Y, col)
            continue
        # Pálpebras de carne: dobras paralelas à borda, mais escuras na beira e para a direita.
        inner = max(eh, 0.0) + 0.15 * eh
        rel = (abs(slit_dy) - inner) / max(lo - inner, 0.5)              # 0 na beira da abertura, 1 na borda de fora
        rel = max(0.0, min(1.0, rel))
        fold = (rel * 4.2 + 0.25 * math.sin(u * 0.22 + (1 if dy > 0 else 0))) % 1.0
        b = 0.92 - 0.62 * rel - (u - cx) / 260 - (0.08 if dy > 0 else 0)
        if fold < (0.16 if s == 1 else 0.11) and 0.08 < rel < 0.9:
            b -= 0.3                                                    # dobra da pálpebra
        elif fold < 0.3 and 0.08 < rel < 0.9:
            b += 0.06                                                   # o lado claro da dobra
        col = CARNE[max(0, min(5, int(b * 6)))]
        if abs(slit_dy) < eh + 1.0 and eh > 0.6:
            col = CARNE[1]                                              # beira molhada da pálpebra
        if eh <= 0.6 and abs(slit_dy) < (1.0 if s == 1 else 0.75) and abs(u - cx) < ex * 0.98:
            col = (10, 2, 10)                                           # fechado: a fenda escura
        p.put(X, Y, col)
    # Veias: riscos finos que saem dos cantos (pela pálpebra e, aberto, pela esclera).
    veins = [((6, 24), (16, 20), (24, 22)), ((7, 25), (15, 29), (26, 27)), ((90, 24), (80, 19), (70, 22)),
             ((89, 25), (81, 30), (71, 27)), ((30, 9), (38, 13)), ((62, 39), (56, 35))]
    for path in veins:
        for a, b in zip(path, path[1:]):
            seg(p, *a, *b, VEIA[2] if p.s == 2 else VEIA[1], 0.6 if p.s == 2 else 0.9)
    if open_ > 0.9:
        for (x, y) in ((44, 19), (45, 19), (44, 20)):
            p.dot(x, y, (255, 236, 244) if (x, y) == (44, 19) else ANEL[2])   # brilho molhado
        p.fine(87, 37, (255, 255, 255))
    return p.image()


def olho(s: int) -> Image.Image:
    return L.sheet([olho_frame(s, f) for f in range(4)])


# ── O monge e a lua ───────────────────────────────────────────────────────

BUREL = [(34, 22, 16), (56, 38, 26), (82, 58, 38), (110, 80, 52)]
CORDA = [(150, 132, 96), (196, 180, 140)]


def monge_frame(s: int, f: int) -> Image.Image:
    """Monge da Ordem da Candeia de frente (16 × 24): hábito de burel com capuz, o rosto na sombra
    do capuz, cordão na cintura e a vela acesa diante do peito nas duas mãos. Os dois quadros
    só mudam a chama."""
    p = Piece(16, 24, s)
    # Hábito: alarga para baixo, dobras em pé, barra.
    for X, Y, u, v in p.each(2, 9, 12, 14):
        half = 3.6 + (v - 9) * 0.22
        if abs(u - 8) > half:
            continue
        nx = (u - 8) / half
        col = BUREL[2] if nx < -0.2 else (BUREL[1] if nx < 0.5 else BUREL[0])
        if s == 2 and abs(((u - 8) * 1.4) % 2 - 1) < 0.2 and v > 15:
            col = BUREL[0]                                              # dobra
        if v > 21.6:
            col = BUREL[1]
        p.put(X, Y, col)
    # Capuz pontudo e o vão escuro do rosto.
    poly(p, [(8, 1.4), (12, 6), (12.4, 10), (3.6, 10), (4, 6)], BUREL[2])
    for X, Y, u, v in p.each(3, 1, 10, 10):
        if p.get(X, Y) == BUREL[2] and u > 9.4:
            p.put(X, Y, BUREL[1])
    ball(p, 8, 6.8, 2.6, 2.4, [(10, 6, 6), (18, 10, 8)])
    p.rect(6, 8, 4, 1, (60, 38, 28))                                    # queixo na luz da vela
    # Cordão e a ponta pendurada.
    p.rect(4, 15, 8, 1, CORDA[0])
    p.rect(4, 15, 3, 1, CORDA[1])
    p.rect(10, 16, 1, 3, CORDA[0])
    # Mangas que se juntam no peito, as mãos em concha e a vela.
    poly(p, [(3.6, 10), (7.2, 12.4), (7.2, 15), (4, 15)], BUREL[2])
    poly(p, [(12.4, 10), (8.8, 12.4), (8.8, 15), (12, 15)], BUREL[1])
    p.rect(7, 10, 2, 4, (232, 222, 196))                                # vela
    p.rect(7, 10, 1, 4, (250, 246, 232))
    p.rect(6, 13, 1, 2, (196, 140, 100))                                # mãos dos dois lados
    p.rect(9, 13, 1, 2, (176, 120, 86))
    p.rect(7, 14, 2, 1, (156, 104, 72))
    p.dot(7, 9, (40, 30, 24))                                           # pavio
    # Chama: alta e reta no 0, baixa e torta no 1.
    if f == 0:
        p.rect(7, 7, 1, 2, FOGO[2])
        p.dot(7, 6, FOGO[1])
        p.fine(15, 16, FOGO[3])
        p.fine(15, 13, FOGO[3])
    else:
        p.dot(7, 8, FOGO[2])
        p.dot(8, 7, FOGO[1])
        p.fine(15, 17, FOGO[3])
        p.fine(16, 15, FOGO[2])
    p.rect(5, 22, 2, 1, BUREL[0])                                       # pontas dos pés
    p.rect(9, 22, 2, 1, BUREL[0])
    return p.image()


def monge(s: int) -> Image.Image:
    return L.sheet([monge_frame(s, f) for f in range(2)])


LUA = [(120, 128, 150), (160, 168, 188), (198, 204, 218), (226, 230, 238), (246, 248, 252)]


def lua(s: int) -> Image.Image:
    """Lua cheia (24 × 24): disco claro, sombreado azul-acinzentado embaixo à direita, mares
    escuros e umas crateras com a borda clara."""
    p = Piece(24, 24, s)
    ball(p, 12, 12, 10.5, 10.5, LUA, lo=0.55, gain=1.2)
    for (x, y, r) in ((8.5, 9, 2.6), (14, 13.5, 3.4), (9, 15.5, 1.6)):
        for X, Y, u, v in p.each(x - r, y - r, 2 * r + 1, 2 * r + 1):
            d = math.hypot((u - x) / r, (v - y) / (r * 0.85))
            if d <= 1 and p.get(X, Y) is not None:
                p.put(X, Y, L.mul(p.get(X, Y), 0.86))                   # mar
    for (x, y, r) in ((15.5, 7, 1.2), (6.5, 13, 1.0), (16, 17, 1.0), (11, 6, 0.8)):
        for X, Y, u, v in p.each(x - r - 1, y - r - 1, 2 * r + 2, 2 * r + 2):
            d = math.hypot(u - x, v - y)
            if d <= r and p.get(X, Y) is not None:
                p.put(X, Y, L.mul(p.get(X, Y), 0.8 if (u - x) + (v - y) < 0 else 0.92))
            elif r < d <= r + 0.6 and p.get(X, Y) is not None and (u - x) + (v - y) > 0:
                p.put(X, Y, LUA[4])                                     # borda clara da cratera
    return p.image()


# ── Índice ────────────────────────────────────────────────────────────────

PIECES = {
    'prologo/abadia': (abadia, 'export/png/prologo-abadia.png', 'building', {}),
    'prologo/abadia-ruina': (abadia_ruina, 'export/png/prologo-abadia-ruina.png', 'prop', {}),
    'prologo/penhasco': (penhasco, 'export/png/prologo-penhasco.png', 'prop', {'anchor': [0, 0]}),
    'prologo/borda': (borda, 'export/png/prologo-borda.png', 'prop', {'anchor': [0, 0]}),
    'prologo/olho': (olho, 'export/fx/prologo-olho.png', 'fx',
                     {'anchor': [0.5, 0.5], 'size': [96, 48], 'frameSize': [96, 48], 'sheetSize': [384, 48],
                      'frames': 4, 'fps': 4, 'columns': 4, 'rows': 1}),
    'prologo/monge': (monge, 'export/fx/prologo-monge.png', 'fx',
                      {'anchor': [0.5, 1], 'size': [16, 24], 'frameSize': [16, 24], 'sheetSize': [32, 24],
                       'frames': 2, 'fps': 4, 'columns': 2, 'rows': 1}),
    'prologo/lua': (lua, 'export/png/prologo-lua.png', 'prop', {'anchor': [0.5, 0.5]}),
}

INDEX = os.path.join(L.ROOT, 'src', 'render', 'pack-prologo.ts')


def main(argv):
    dry = '--dry' in argv
    prev = argv[argv.index('--preview') + 1] if '--preview' in argv else tempfile.mkdtemp(prefix='prologo32-')
    os.makedirs(prev, exist_ok=True)
    entries = []
    for pid, (fn, file, kind, extra) in PIECES.items():
        outs = {s: fn(s) for s in (1, 2)}
        imgs = {s: (o[0] if isinstance(o, tuple) else o) for s, o in outs.items()}
        lits = {s: o[1] for s, o in outs.items() if isinstance(o, tuple)}
        lights = file[:-len('.png')] + '-lights.png' if lits else None
        name = pid.replace('/', '-')
        for s, img in imgs.items():
            if not dry:
                out = L.path16(file) if s == 1 else L.path32(file)
                os.makedirs(os.path.dirname(out), exist_ok=True)
                img.save(out)
                if lights:
                    lits[s].save(L.path16(lights) if s == 1 else L.path32(lights))
            z = 8 // s
            img.resize((img.width * z, img.height * z), Image.NEAREST).save(os.path.join(prev, f'{name}-{s * 16}.png'))
            if lights:
                H.night(img, lits[s]).resize((img.width * z, img.height * z), Image.NEAREST).save(
                    os.path.join(prev, f'{name}-{s * 16}-noite.png'))
        w, h = imgs[1].size
        entry = {'id': pid, 'type': kind, 'file': file}
        if lights:
            entry['lights'] = lights
        entry.update({'anchor': extra.get('anchor', [0.5, 1]), 'size': extra.get('size', [w, h])})
        entry.update({k: v for k, v in extra.items() if k not in ('anchor', 'size')})
        entries.append(entry)
        print(f'{pid:24s} {w}×{h}  silhueta 32 × 16: IoU {H.iou(imgs[1], imgs[2]):.3f}')
    if not dry:
        body = json.dumps(entries, ensure_ascii=False, indent=2)
        with open(INDEX, 'w') as fh:
            fh.write(
                '// Gerado por art32/prologo32.py: as peças do prólogo animado, somadas ao índice do\n'
                '// pack em pack.ts. Não editar à mão.\n\n'
                "import type { PackAsset } from './pack.ts';\n\n"
                f'export const PACK_PROLOGO: PackAsset[] = {body};\n'
            )
    print(f'{len(entries)} peças; prévias em {prev}')


if __name__ == '__main__':
    main(sys.argv[1:])
