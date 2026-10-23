"""Peças do M6 (Histórias sem fim) em 16 e 32-bit, e o índice src/render/pack-historias.ts.

F1: a mesa de audiências da praça, o balão de desejo sobre o herói e as flores da lápide nova.
F5: o Salão das Lendas (prédio só de aparência, níveis 1 a 3, com o overlay "-lights") e o
pedestal das estátuas do pátio.

Uso: python3 -I art32/historias32.py [--preview PASTA] [--dry]
  --dry    só as prévias (não grava no pack nem no índice)
"""
import functools
import json
import math
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

import lib32 as L  # noqa: E402
import predios32_kit as K  # noqa: E402

OL = (23, 18, 15)
WOOD = [(42, 30, 22), (90, 62, 42), (138, 98, 58), (150, 112, 52)]
PARCH = [(150, 120, 80), (196, 170, 120), (226, 206, 160), (240, 228, 196)]
INK = (30, 26, 36)
WAX = [(196, 180, 150), (232, 220, 190)]
FLAME = [(214, 110, 40), (255, 200, 90), (255, 240, 190)]
GOLD = [(150, 104, 36), (233, 185, 73), (250, 226, 140)]
BUBBLE = [(196, 186, 160), (240, 232, 210)]
LEAF = [(46, 74, 40), (70, 110, 60), (104, 146, 78)]
PETAL = {'r': [(130, 40, 40), (190, 70, 60)], 'y': [(176, 130, 40), (230, 190, 80)], 'w': [(190, 186, 176), (236, 232, 222)]}


class Piece:
    """Peça em unidades 16-bit (w16 × h16), desenhada na escala s (1 = 16-bit, 2 = 32-bit)."""

    def __init__(self, w16: int, h16: int, s: int):
        self.s = s
        self.w16 = w16
        self.c = L.Canvas(w16 * s, h16 * s)
        self.lt: dict[tuple[int, int], tuple[int, int, int]] = {}   # luzes acesas (pixels de saída)

    def rect(self, x, y, w, h, col):
        s = self.s
        self.c.rect(round(x * s), round(y * s), max(1, round(w * s)), max(1, round(h * s)), col)

    def dot(self, x, y, col):
        self.rect(x, y, 1, 1, col)

    def fine(self, X, Y, col):
        """Pixel só da 32-bit (coordenadas da escala 2)."""
        if self.s == 2:
            self.c.p(X, Y, col)

    def each(self, x, y, w, h):
        """Pixels de saída de um retângulo em unidades 16-bit: (X, Y, u, v), com u, v o centro
        do pixel em unidades 16-bit (serve para recortar formas iguais nas duas escalas)."""
        s = self.s
        for Y in range(round(y * s), round((y + h) * s)):
            for X in range(round(x * s), round((x + w) * s)):
                yield X, Y, (X + 0.5) / s, (Y + 0.5) / s

    def put(self, X, Y, col):
        self.c.p(X, Y, col)

    def get(self, X, Y):
        return self.c.g(X, Y)

    def shade(self, x, y, w, h, k):
        """Escurece (k < 1) ou clareia o que já está pintado no retângulo (unidades 16-bit)."""
        for X, Y, _, _ in self.each(x, y, w, h):
            self.c.shade(X, Y, k)

    def glow(self, X, Y, col):
        """Acende um pixel de saída no overlay de luzes."""
        if 0 <= X < self.c.w and 0 <= Y < self.c.h:
            self.lt[(X, Y)] = tuple(col[:3])

    def image(self) -> Image.Image:
        self.c.outline(OL)
        return self.c.image()

    def lights(self) -> Image.Image:
        """Overlay "-lights": o vidro aceso opaco; na 16-bit, com o halo do pack (alfa 70 e 30
        nos dois anéis em volta), como nos building-*-lights.png; na 32-bit, só o vidro."""
        im = Image.new('RGBA', (self.c.w, self.c.h), (0, 0, 0, 0))
        px = im.load()
        if self.s == 1:
            halo: dict[tuple[int, int], int] = {}
            for (X, Y) in self.lt:
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        q = (X + dx, Y + dy)
                        if q in self.lt:
                            continue
                        a = 70 if max(abs(dx), abs(dy)) == 1 else 30
                        halo[q] = max(halo.get(q, 0), a)
            for (X, Y), a in halo.items():
                if 0 <= X < self.c.w and 0 <= Y < self.c.h:
                    px[X, Y] = HALO16 + (a,)
        for (X, Y), col in self.lt.items():
            px[X, Y] = col + (255,)
        return im


def mesa(s: int) -> Image.Image:
    """Mesa de audiências (32 × 24): tampo em 3/4, pernas, pergaminho aberto, tinteiro com pena e vela."""
    p = Piece(32, 24, s)
    # Pernas e travessa (atrás do tampo).
    for x in (4, 26):
        p.rect(x, 13, 2, 10, WOOD[0])
        p.rect(x, 13, 1, 10, WOOD[1])
    p.rect(6, 18, 20, 1, WOOD[0])
    # Tampo: face de cima clara, borda da frente mais escura.
    p.rect(2, 8, 28, 4, WOOD[2])
    p.rect(2, 8, 28, 1, WOOD[3])
    p.rect(2, 12, 28, 2, WOOD[1])
    p.rect(2, 13, 28, 1, WOOD[0])
    for x in (9, 16, 23):
        p.rect(x, 9, 1, 3, WOOD[1])
    for X in range(6, 58, 7):
        p.fine(X, 19, WOOD[1])
        p.fine(X + 3, 21, WOOD[1])
    # Pergaminho aberto, com as pontas enroladas.
    p.rect(8, 7, 11, 3, PARCH[2])
    p.rect(8, 7, 11, 1, PARCH[3])
    p.rect(7, 6, 1, 4, PARCH[1])
    p.rect(19, 6, 1, 4, PARCH[1])
    p.rect(7, 9, 1, 1, PARCH[0])
    p.rect(19, 9, 1, 1, PARCH[0])
    for X in range(18, 37, 2):
        p.fine(X, 16, PARCH[0])
    for X in range(18, 33, 3):
        p.fine(X, 18, PARCH[0])
    # Tinteiro e pena.
    p.rect(21, 7, 2, 2, INK)
    p.fine(42, 14, (70, 66, 86))
    p.rect(22, 3, 1, 4, BUBBLE[1])
    p.dot(23, 2, BUBBLE[1])
    p.dot(23, 3, BUBBLE[0])
    # Vela acesa.
    p.rect(26, 4, 2, 4, WAX[1])
    p.rect(27, 4, 1, 4, WAX[0])
    p.rect(25, 7, 4, 1, GOLD[0])
    p.dot(26, 2, FLAME[0])
    p.dot(26, 3, FLAME[1])
    p.fine(53, 4, FLAME[2])
    p.fine(53, 5, FLAME[2])
    return p.image()


def desejo(s: int) -> Image.Image:
    """Balão de desejo (10 × 11) sobre a cabeça do herói: estrela dourada num balão claro."""
    p = Piece(10, 11, s)
    p.rect(1, 1, 8, 6, BUBBLE[1])
    p.rect(2, 0, 6, 1, BUBBLE[1])
    p.rect(2, 7, 6, 1, BUBBLE[1])
    p.rect(1, 6, 8, 1, BUBBLE[0])
    p.rect(2, 8, 2, 1, BUBBLE[1])
    p.rect(2, 9, 1, 1, BUBBLE[1])
    # Estrela de cinco pontas.
    p.dot(5, 1, GOLD[1])
    p.rect(4, 2, 3, 1, GOLD[1])
    p.rect(2, 3, 7, 1, GOLD[1])
    p.rect(3, 4, 5, 1, GOLD[1])
    p.dot(3, 5, GOLD[1])
    p.dot(7, 5, GOLD[1])
    p.rect(4, 5, 3, 1, GOLD[0])
    p.dot(5, 2, GOLD[2])
    p.fine(10, 3, GOLD[2])
    return p.image()


def flores(s: int) -> Image.Image:
    """Ramo de flores ao pé da lápide nova (14 × 8)."""
    p = Piece(14, 8, s)
    for x, h in ((3, 4), (5, 5), (7, 6), (9, 5), (11, 4)):
        p.rect(x, 8 - h, 1, h, LEAF[1])
    p.rect(2, 6, 10, 2, LEAF[0])
    p.rect(4, 5, 2, 1, LEAF[2])
    p.rect(9, 5, 2, 1, LEAF[2])
    for x, y, k in ((2, 3, 'r'), (5, 2, 'y'), (7, 1, 'w'), (9, 2, 'r'), (11, 3, 'y')):
        p.rect(x, y, 2, 2, PETAL[k][1])
        p.dot(x + 1, y + 1, PETAL[k][0])
    return p.image()



# ── Salão das Lendas (F5) ─────────────────────────────────────────────────
#
# Salão de pedra com a empena virada para a frente (o templo mostra o telhado de quatro águas
# pelo lado comprido), visto de cima como os outros prédios: as duas águas de ardósia aparecem
# como uma faixa em V acima da cornija da empena. O nível 1 é humilde e gasto; o 2 ganha um
# pórtico de duas colunas de calcário com frontão, braseiros e dois suportes de estandarte; o 3
# fica mais largo, com quatro colunas, cúpula de cobre sobre a cumeeira, rosácea de vitral no
# lugar do óculo, ouro no frontão, as portas abertas com luz dentro e quatro suportes.
# Tudo em unidades 16-bit; os materiais trabalham no pixel de saída (juntas e quinas de 1 px nas
# duas escalas, grão e chanfro só na 32-bit), então a 32-bit cobre a mesma silhueta.

STONE, SLATE, IRON, GLASS, MORTAR = L.STONE, L.ROOF_SLATE, L.IRON, L.GLASS, L.MORTAR
MADEIRA = L.WOOD                  # (o WOOD lá de cima é a rampa curta da mesa)
OURO = L.GOLD
FOGO = L.FIRE
TAPETE = L.CLOTH_RED
MOSS, LIT = K.MOSS, K.LIT
# Calcário claro do pórtico (mais quente e mais claro que a cantaria cinza do salão).
CALCARIO = [(86, 84, 82), (126, 122, 116), (164, 160, 150), (198, 194, 182), (226, 222, 210)]
# Cobre da cúpula, já esverdeado.
COBRE = [(26, 52, 48), (40, 80, 70), (60, 112, 94), (92, 146, 120), (142, 190, 162)]
BRONZE = [(64, 40, 22), (108, 70, 32), (156, 108, 46), (204, 156, 72), (240, 206, 128)]
# Vitral: (tom de dia, brilho à noite), as cores do templo.
VITRAL = [((70, 24, 30), (236, 104, 78)), ((24, 34, 70), (124, 150, 236)),
          ((28, 52, 34), (132, 206, 112)), ((70, 52, 18), (255, 206, 96))]
CHUMBO = (34, 34, 42)
# Luz da 16-bit: as cores dos building-*-lights.png do pack (vidro e halo).
LUZ16 = [(200, 160, 80), (233, 192, 73)]
HALO16 = (233, 192, 73)
# Interior aceso visto pela porta aberta (do fundo escuro ao meio claro).
DENTRO = [(54, 34, 22), (112, 68, 34), (176, 112, 52), (226, 164, 86), (250, 210, 140)]

CX = 56          # eixo de simetria (entre as colunas de pixel 55 e 56)
CHAO = 91        # primeira linha do rodapé; a parede vai até a 90
PORTA = (50, 74, 12, 15)          # x, y, largura e altura da porta (16-bit)

# Geometria de cada nível: parede x0..x1, topo da parede yt, ponta da empena ya, altura d da
# faixa do telhado, espessura cop da cornija inclinada.
NIVEIS = {
    1: dict(x0=28, x1=84, yt=62, ya=46, d=12, cop=2, janelas=36, oculo=(54, 2.6)),
    2: dict(x0=14, x1=98, yt=58, ya=35, d=14, cop=2, janelas=22, oculo=(43, 3.6),
            colunas=(42, 66), ent=(40, 72), frontao=8, suportes=(33,), braseiros=34),
    3: dict(x0=8, x1=104, yt=56, ya=30, d=13, cop=2, janelas=22, rosa=(39, 5.4),
            colunas=(36, 44, 64, 72), ent=(34, 78), frontao=11, suportes=(17, 31), braseiros=28),
}
for _g in NIVEIS.values():
    _half = (_g['x1'] - _g['x0']) / 2
    _g['k'] = (_g['yt'] - _g['cop'] - _g['ya']) / _half       # caimento da empena
    _g['ae'] = _half + 3                                          # beiral passa 3 px da parede
SUPORTE_Y = 64   # linha onde o pano do estandarte começa (o braço fica na de cima)


def strata(p: Piece, x, y, w, seq1, seq2):
    """Faixa horizontal com uma cor por linha de saída: seq1 na 16-bit, seq2 (o dobro de
    linhas) na 32-bit. 'sombra' escurece o que já está lá; None pula a linha."""
    seq = seq1 if p.s == 1 else seq2
    X0, X1, Y0 = round(x * p.s), round((x + w) * p.s), round(y * p.s)
    for i, col in enumerate(seq):
        for X in range(X0, X1):
            if col == 'sombra':
                p.c.shade(X, Y0 + i, 0.76)
            elif col is not None:
                p.put(X, Y0 + i, col)


def lit_color(p: Piece, X, Y, u, v, cx, cy, rx, ry, seed=0):
    """Cor do vidro aceso: na 16-bit, as duas cores do pack; na 32-bit, a rampa LIT (clara no meio)."""
    if p.s == 1:
        return LUZ16[1] if L.hsh(X, Y, seed + 5) < 0.2 else LUZ16[0]
    d = min(1.0, math.hypot((u - cx) / max(0.5, rx), (v - cy) / max(0.5, ry)))
    return L.mix(LIT[4], LIT[1], d)


def ashlar(p: Piece, x, y, w, h, pal=STONE, bw=8, bh=4, seed=0, clip=None):
    """Cantaria em blocos bw × bh (16-bit), desencontrados e presos à grade da peça, então dois
    trechos da mesma parede casam. Junta de 1 px nas duas escalas; na 32-bit, chanfro claro em
    cima e à esquerda, sombra embaixo, tom por bloco e grão."""
    s = p.s
    B, Hh = bw * s, bh * s
    mortar = pal[1] if s == 1 else L.mix(MORTAR, pal[1], 0.35)
    for X, Y, u, v in p.each(x, y, w, h):
        if clip and not clip(u, v):
            continue
        row = Y // Hh
        lx = X + (B // 2 if row % 2 else 0)
        bx, by = lx % B, Y % Hh
        if by == Hh - 1 or bx == B - 1:
            p.put(X, Y, mortar)
            continue
        t = L.hsh(lx // B, row, seed)
        if s == 1:
            col = L.mix(pal[3], pal[4], 0.4) if by == 0 else pal[2]
            if t < 0.14:
                col = L.mul(col, 0.9)
            elif t > 0.9:
                col = L.mul(col, 1.06)
        else:
            if by == 0:
                col = pal[4] if bx < B - 3 else pal[3]
            elif bx == 0:
                col = L.mix(pal[2], pal[3], 0.6)
            elif by == Hh - 2:
                col = pal[1]
            elif bx == B - 2:
                col = L.mix(pal[1], pal[2], 0.5)
            else:
                col = L.mix(pal[2], pal[3], L.noise(X, Y, seed + 4, 2) * 0.5)
            col = L.mul(col, (0.9 + 0.18 * t) * (0.97 + 0.06 * L.noise(X, Y, seed + 5, 3)))
            if L.hsh(X, Y, seed + 6) < 0.02:
                col = L.mul(col, 0.82)                       # pinta na pedra
        p.put(X, Y, col)


def quoins(p: Piece, x, y0, y1, side, pal=STONE):
    """Cunhais: blocos mais claros na quina, alternando longo (5) e curto (3). side -1: quina
    esquerda começando em x; +1: quina direita terminando em x."""
    s = p.s
    mortar = pal[1] if s == 1 else L.mix(MORTAR, pal[1], 0.35)
    for i, y in enumerate(range(y0, y1, 4)):
        w, h = (5 if i % 2 == 0 else 3), min(4, y1 - y)
        bx = x if side < 0 else x - w
        X0, Y0, W, H = round(bx * s), round(y * s), round(w * s), round(h * s)
        for X, Y, u, v in p.each(bx, y, w, h):
            lx, ly = X - X0, Y - Y0
            inner = lx == W - 1 if side < 0 else lx == 0
            if (ly == H - 1 and h == 4) or inner:
                col = mortar
            elif ly == 0:
                col = pal[4]
            elif s == 2 and ly == H - 2:
                col = pal[2]
            elif s == 2 and (lx == 0 if side < 0 else lx == 1):
                col = pal[4]
            else:
                col = L.mix(pal[3], pal[2], 0.3)
            if s == 2:
                col = L.mul(col, 0.97 + 0.06 * L.noise(X, Y, 11, 2))
            p.put(X, Y, col)


def socle(p: Piece, x, y, w, h=4, pal=STONE, seed=0):
    """Rodapé saliente: lajes compridas com o topo claro, a face e a base escura."""
    s = p.s
    Y0, H = round(y * s), round(h * s)
    for X, Y, u, v in p.each(x, y, w, h):
        ly = Y - Y0
        slab = int((u - x) // 9)
        joint = (u - x) % 9 >= 9 - 1 / s
        if ly == 0:
            col = pal[4]
        elif s == 2 and ly == 1:
            col = pal[3]
        elif ly == H - 1:
            col = pal[1]
        elif joint:
            col = pal[1]
        else:
            col = pal[2] if s == 1 else L.mix(pal[2], pal[3], 0.3)
        if s == 2:
            col = L.mul(col, (0.92 + 0.14 * L.hsh(slab, 3, seed)) * (0.97 + 0.06 * L.noise(X, Y, seed + 7, 2)))
        p.put(X, Y, col)
    if s == 1:
        for X in (round(x), round(x + w) - 1):
            for Y in range(Y0 + 1, Y0 + H):
                p.put(X, Y, pal[3] if X == round(x) else pal[1])


def moss(p: Piece, x, y, w, h, amount=0.5, seed=0):
    """Musgo em manchas (o ruído é em unidades 16-bit, as manchas caem no mesmo lugar nas duas
    escalas), mais denso perto do chão."""
    for X, Y, u, v in p.each(x, y, w, h):
        c = p.get(X, Y)
        if c is None or c == OL:
            continue
        f = (v - y) / h
        n = L.noise(u * 0.7, v * 1.2, seed, 2.6)
        if n * (0.25 + 0.75 * f * f) > 1 - amount * 0.55:
            k = L.hsh(X, Y, seed + 1)
            col = MOSS[2] if k < 0.45 else MOSS[1]
            if p.s == 2 and k > 0.85:
                col = MOSS[3]
            p.put(X, Y, L.mix(c, col, 0.75))


def walls(p: Piece, g, seed=0):
    """Parede e empena numa peça só, cunhais, a cinta na base da empena e o rodapé."""
    x0, x1, yt, ya, k = g['x0'], g['x1'], g['yt'], g['ya'], g['k']
    ashlar(p, x0, ya, x1 - x0, CHAO - ya, seed=seed, clip=lambda u, v: v >= ya + abs(u - CX) * k)
    q0 = yt + (-yt) % 4 + 4
    quoins(p, x0, q0, CHAO, -1)
    quoins(p, x1, q0, CHAO, +1)
    strata(p, x0 - 1, yt, x1 - x0 + 2, [STONE[4], STONE[2], 'sombra'],
           [STONE[4], STONE[3], STONE[3], STONE[1], 'sombra', 'sombra'])
    socle(p, x0 - 2, CHAO, x1 - x0 + 4, 4, seed=seed)


def roof(p: Piece, g, pal=SLATE, seed=0, lichen=0.0):
    """Telhado de duas águas com a empena para a frente, visto de cima: cada água é uma faixa
    de altura d acima da beira da empena (a da esquerda na luz, a da direita na sombra). As
    fiadas de ardósia correm deitadas, como nas águas laterais dos outros prédios do pack, e a
    cumeeira sobe no eixo. Depois, a cornija de pedra inclinada da empena e a sombra dela."""
    s = p.s
    ya, k, ae, d, cop = g['ya'], g['k'], g['ae'], g['d'], g['cop']
    ch, sw = 3 * s, 4 * s                      # altura da fiada e largura da placa
    for X, Y, u, v in p.each(CX - ae, ya - d - 1, 2 * ae, ae * k + d + 2):
        a = abs(u - CX)
        if a > ae:
            continue
        t = ya + a * k - v
        if not 0 < t <= d:
            continue
        right = u > CX
        if a < 1:
            # Cumeeira: capa clara à esquerda, escura à direita, emendas.
            inner = a * s < 1
            col = (pal[4] if inner else pal[3]) if not right else (pal[1] if inner else pal[0])
            if int(t * s) % (3 * s) == 0:
                col = L.mul(col, 0.78)
            p.put(X, Y, col)
            continue
        course, ly = Y // ch, Y % ch
        off = int(L.hsh(course, 0, seed) * sw)
        sx, slab = (X + off) % sw, (X + off) // sw
        tone = L.hsh(slab, course, seed + 3)
        if s == 1:
            # Na 16-bit, escuro como as ardósias do pack, com a fiada riscada em cima.
            col = L.mix(pal[2], pal[3], 0.5) if ly == 0 else (pal[1] if ly == 1 else pal[0])
            if sx == sw - 1 and ly < 2:
                col = pal[0]
            if tone < 0.22 and ly == 0:
                col = pal[2]
        else:
            if ly == ch - 1:
                col = pal[0]
            elif ly == 0:
                col = pal[3] if sx < sw - 2 else pal[2]
            elif ly == ch - 2:
                col = pal[1]
            else:
                col = L.mix(pal[2], pal[3], 0.35) if sx < 2 else pal[2]
            if sx == sw - 1 and ly < ch - 1:
                col = pal[1] if ly == 0 else pal[0]
            col = L.mul(col, 0.86 + 0.24 * tone)
        if lichen and L.hsh(slab, course, seed + 9) < lichen and 0 < ly < ch - 1 and sx < sw - 1:
            col = L.mix(col, (150, 150, 112), 0.4)            # líquen
        if right:
            col = L.mul(col, 0.66)
        p.put(X, Y, col)
    for X, Y, u, v in p.each(CX - ae, ya - 1, 2 * ae, ae * k + cop + 3):
        a = abs(u - CX)
        if a > ae:
            continue
        TT = (v - (ya + a * k)) * s
        if 0 <= TT < cop * s:
            i = min(3, int(TT / (cop * s) * 4))
            col = [STONE[4], STONE[3], STONE[2], STONE[1]][i]
            if (a * s) % (7 * s) < 1 and i > 0:
                col = STONE[1]                                  # junta entre as pedras
            if u > CX:
                col = L.mul(col, 0.88)
            p.put(X, Y, col)
        elif cop * s <= TT < (cop + 1) * s:
            p.c.shade(X, Y, 0.74)                               # sombra da cornija


def oculus(p: Piece, cy, r):
    """Óculo da empena: aro de pedra e o vão escuro (o salão não acende aí)."""
    for X, Y, u, v in p.each(CX - r - 1, cy - r - 1, 2 * r + 2, 2 * r + 2):
        d = math.hypot(u - CX, v - cy)
        if d <= r - 1:
            col = K.VOID[1] if (u - CX) + (v - cy) > -0.5 * r else K.VOID[2]
            p.put(X, Y, col)
        elif d <= r:
            p.put(X, Y, STONE[4] if (u < CX and v < cy + 0.5 * r) else STONE[1])


def rose(p: Piece, cy, r):
    """Rosácea de vitral: aro de pedra, miolo de ouro, oito pétalas alternando vermelho e azul
    e, por fora, uma coroa de vidros alternando ouro e verde; na 32-bit, chumbo nos raios e no
    anel do meio. Acende com a cor de cada vidro."""
    s = p.s
    mid = 2.7                                                     # raio do anel entre as zonas
    for X, Y, u, v in p.each(CX - r - 1, cy - r - 1, 2 * r + 2, 2 * r + 2):
        dx, dy = u - CX, v - cy
        d = math.hypot(dx, dy)
        if d > r:
            continue
        if d > r - 1:
            col = STONE[4] if (dx < 0 and dy < 0.3 * r) else (STONE[3] if dx < 0 or dy < 0 else STONE[1])
            if s == 2 and d > r - 0.5:
                col = L.mul(col, 0.8)
            p.put(X, Y, col)
            continue
        if d < 1.3:
            p.put(X, Y, OURO[3] if dx < 0 and dy < 0 else OURO[2])
            continue
        inner = d < mid
        ang = math.atan2(dy, dx) + (math.pi / 8 if inner else 0)
        sec = int((ang % (2 * math.pi)) / (2 * math.pi) * 8)
        lead = False
        if s == 2:
            off = (ang % (math.pi / 4)) - math.pi / 8            # 0 no meio da pétala
            edge = abs(abs(off) - math.pi / 8) * d                # distância ao raio em 16-bit
            lead = edge < 0.28 or abs(d - mid) < 0.26
        if lead:
            p.put(X, Y, CHUMBO)
            continue
        day, night = VITRAL[(0, 1)[sec % 2]] if inner else VITRAL[(3, 2)[sec % 2]]
        col = L.mix(day, night, 0.3 if inner else 0.24)
        if s == 2 and dx + dy < -0.9 * d and d > 3.2:
            col = L.mix(col, GLASS[3], 0.45)                     # reflexo
        p.put(X, Y, col)
        if s == 2:
            p.glow(X, Y, L.mix(night, (255, 240, 200), 0.25 * (1 - d / r)))
        else:
            p.glow(X, Y, night)


def lancet(p: Piece, gx, gy, gw=3, gh=12, seed=0):
    """Janela estreita e alta de arco quebrado: moldura de pedra, vidro escuro (chumbo em
    losango na 32-bit), travessa de ferro e peitoril; o vidro acende no overlay."""
    s = p.s
    cy = gy + gw * 0.87

    def inside(u, v, grow=0.0):
        if not (gx - grow <= u < gx + gw + grow and gy - 2 * grow <= v < gy + gh + grow):
            return False
        if v < cy:
            return math.hypot(u - (gx + gw), v - cy) <= gw + grow and math.hypot(u - gx, v - cy) <= gw + grow
        return True

    bar = gy + round(gh * 0.58)
    X0, Y0 = round(gx * s), round(gy * s)
    for X, Y, u, v in p.each(gx - 1, gy - 3, gw + 2, gh + 3):
        if inside(u, v):
            lx, ly = X - X0, Y - Y0
            if bar <= v < bar + (1 if s == 1 else 0.5):
                p.put(X, Y, IRON[2] if s == 1 or u < gx + gw / 2 else IRON[1])
                continue
            t = ((u - gx) / gw + (v - gy) / gh) / 2
            col = L.mix(GLASS[2], GLASS[0], t) if s == 2 else (GLASS[2] if (u - gx) + (v - gy) * 0.3 < 1.5 else GLASS[1])
            if s == 2 and ((lx + ly) % 4 == 0 or (lx - ly) % 4 == 0):
                p.put(X, Y, CHUMBO)
                continue
            if s == 2 and 1 <= lx - ly * 0.6 <= 2 and v < gy + gh * 0.5:
                col = GLASS[3]
            p.put(X, Y, col)
            p.glow(X, Y, lit_color(p, X, Y, u, v, gx + gw / 2, gy + gh * 0.6, gw * 0.7, gh * 0.6, seed))
        elif inside(u, v, 1.0):
            col = STONE[3] if u < gx + gw / 2 else STONE[2]
            if v >= gy + gh:
                col = STONE[1]
            if s == 2 and not inside(u, v, 0.5):
                col = L.mul(col, 0.86)
            p.put(X, Y, col)
    # Peitoril saliente e a sombra dele.
    strata(p, gx - 2, gy + gh + 1, gw + 4, [STONE[4], 'sombra'], [STONE[4], STONE[3], 'sombra', None])


def door_frame(p: Piece, gold=False):
    """Umbrais de pedra e o lintel pesado com a placa entalhada (no nível 3, letras de ouro)."""
    s = p.s
    x, y, w, h = PORTA
    for jx, lit in ((x - 2, True), (x + w, False)):
        for X, Y, u, v in p.each(jx, y - 1, 2, h + 1):
            lx = X - round(jx * s)
            col = (STONE[4] if lx == 0 else STONE[3]) if lit else (STONE[2] if lx == 0 else STONE[1])
            if (Y - round(y * s)) % (5 * s) == 5 * s - 1:
                col = L.mul(col, 0.7)                            # junta entre as pedras
            p.put(X, Y, col)
    lx0, lw, ly0 = x - 3, w + 6, y - 5
    strata(p, lx0, ly0, lw, [STONE[4], STONE[3], STONE[3], STONE[3], STONE[1]],
           [STONE[4], STONE[4], STONE[3], STONE[3], STONE[3], STONE[3], STONE[3], STONE[3], STONE[2], STONE[1]])
    strata(p, lx0, ly0 + 5, lw, ['sombra'], ['sombra', 'sombra'])
    if s == 2:
        for Y in range(round(ly0 * 2), round((ly0 + 5) * 2)):
            p.put(round(lx0 * 2), Y, STONE[4])
            p.put(round((lx0 + lw) * 2) - 1, Y, STONE[1])
    # Placa: retângulo rebaixado com duas linhas de letras.
    px0, pw, py0 = x + 1, w - 2, ly0 + 1
    for X, Y, u, v in p.each(px0, py0, pw, 3):
        lx, ly = X - round(px0 * s), Y - round(py0 * s)
        W, H = round(pw * s), round(3 * s)
        if ly == 0 or lx == 0:
            col = STONE[1]                                       # sombra da borda do rebaixo
        elif ly == H - 1 or lx == W - 1:
            col = STONE[4]
        else:
            col = L.mix(STONE[3], STONE[2], 0.4)
            if s == 1:
                letter = ly == 1 and lx % 2 == 1 and lx not in (5,)
            else:
                line = ly in (2, 3) or ly in (5,) and lx < W - 6
                letter = line and 2 <= lx <= W - 3 and L.hsh(lx // 2, ly // 3, 31) < 0.62 and lx % 3 != 0
            if letter:
                col = (OURO[2] if (s == 1 or ly in (2, 5)) else OURO[1]) if gold else STONE[0]
        p.put(X, Y, col)


def door(p: Piece, seed=0):
    """Porta dupla de tábuas pesadas com duas cintas de ferro cravejadas e argolas."""
    s = p.s
    x, y, w, h = PORTA
    X0, Y0, W = round(x * s), round(y * s), w * s
    half, pw = W // 2, 3 * s
    for X, Y, u, v in p.each(x, y, w, h):
        lx, ly = X - X0, Y - Y0
        if lx == half - 1 or (s == 2 and lx == half):
            col = MADEIRA[0]
        else:
            lx2 = lx if lx < half else lx - half
            kk = lx2 % pw
            col = MADEIRA[3] if kk == 0 else (MADEIRA[1] if kk == pw - 1 else MADEIRA[2])
            if s == 2 and 0 < kk < pw - 1 and L.hsh(lx2 // pw + (7 if lx >= half else 0), (Y + lx) // 5, seed + 41) < 0.25:
                col = MADEIRA[1]
        p.put(X, Y, col)
    for by in (y + 3, y + h - 4):
        strata(p, x, by, w, [IRON[2]], [IRON[3], IRON[1]])
        if s == 2:
            for X in range(X0 + 2, X0 + W - 1, 4):
                if X not in (X0 + half - 1, X0 + half):
                    p.fine(X, by * 2, IRON[4])
    # Argolas no meio.
    ry = y + h // 2
    if s == 1:
        p.dot(x + w // 2 - 2, ry, IRON[4])
        p.dot(x + w // 2 + 1, ry, IRON[4])
    else:
        for cx in (X0 + half - 4, X0 + half + 3):
            for dx, dy, col in ((-1, 0, IRON[4]), (1, 0, IRON[2]), (0, 1, IRON[2]), (0, -1, IRON[4]), (0, 0, MADEIRA[0])):
                p.fine(cx + dx, ry * 2 + dy, col)
    p.shade(x, y, w, 1, 0.66)                                    # sombra do lintel


def open_door(p: Piece):
    """Portas abertas para dentro: as folhas de lado nas bordas do vão e o salão aceso lá dentro,
    com a passadeira vermelha até a soleira."""
    s = p.s
    x, y, w, h = PORTA
    for X, Y, u, v in p.each(x, y, w, h):
        lx, ly = u - x, v - y
        if lx < 2 or lx > w - 2:
            # Folha aberta, vista quase de lado, na sombra.
            col = MADEIRA[2] if lx < 2 else MADEIRA[1]
            if s == 2 and (X % 3 == 0):
                col = MADEIRA[1] if lx < 2 else MADEIRA[0]
            if ly < 1:
                col = MADEIRA[0]
            p.put(X, Y, col)
            continue
        floor = h * 0.6                                         # onde a parede do fundo encontra o chão
        core = 1 - min(1.0, abs(u - CX) / (w / 2 - 1.5))
        if ly < 1:
            col = DENTRO[0]
        elif ly < floor:
            col = DENTRO[min(4, 2 + round(core * 1.4 + (ly - 1) / floor * 0.6))]
        else:
            col = DENTRO[2] if core < 0.6 else DENTRO[3]
        hw = 0.5 + (ly - floor) * 0.3
        carpet = ly >= floor and abs(u - CX) < hw
        if carpet:
            col = TAPETE[1] if s == 1 else (OURO[1] if abs(u - CX) > hw - 0.5 else TAPETE[2])
        p.put(X, Y, col)
        if ly >= 1:
            if s == 1:
                lc = (196, 96, 64) if carpet else (LUZ16[1] if core > 0.5 else LUZ16[0])
            else:
                lc = L.mix(LIT[4], LIT[1], min(1.0, (1 - core) * 0.9 + max(0.0, ly - floor) / h))
                if carpet:
                    lc = L.mix(lc, (220, 90, 70), 0.55)
            p.glow(X, Y, lc)


def steps(p: Piece, y, spans, pal=STONE):
    """Degraus: (x0, x1) por degrau, de cima para baixo; cada um é piso claro e espelho."""
    for i, (a, b) in enumerate(spans):
        strata(p, a, y + 2 * i, b - a, [pal[4], pal[2]], [pal[4], pal[3], pal[2], pal[1]])
        if p.s == 2:
            for Y in range(round((y + 2 * i) * 2) + 1, round((y + 2 * i) * 2) + 4):
                p.put(round(a * 2), Y, pal[3])
                p.put(round(b * 2) - 1, Y, pal[1])


def column(p: Piece, x, ytop, ybot, pal=CALCARIO):
    """Coluna de calcário: capitel (ábaco e equino), fuste redondo com caneluras na 32-bit e
    base; o fuste de 4 px pega a luz à esquerda."""
    s = p.s
    strata(p, x - 1, ytop, 6, [pal[4]], [pal[4], pal[3]])
    strata(p, x - 1, ytop + 1, 6, [pal[2]], [pal[3], pal[1]])
    seq = [pal[3], pal[4], pal[2], pal[1]] if s == 1 else [pal[3], pal[4], pal[4], pal[3], pal[2], pal[2], pal[1], pal[0]]
    X0 = round(x * s)
    for X, Y, u, v in p.each(x, ytop + 2, 4, ybot - ytop - 4):
        col = seq[X - X0]
        if s == 2 and X - X0 in (2, 5):
            col = L.mul(col, 0.86)
        p.put(X, Y, col)
    p.shade(x, ytop + 2, 4, 1, 0.8)
    strata(p, x - 1, ybot - 2, 6, [pal[3]], [pal[4], pal[2]])
    strata(p, x - 1, ybot - 1, 6, [pal[2]], [pal[3], pal[1]])


def portico(p: Piece, g, gold=False):
    """Pórtico: sombra do alpendre na fachada, colunas, entablamento (cornija, dentículos e
    arquitrave), frontão com o tímpano recuado e uma coroa de louros em relevo (de ouro no
    nível 3, com acrotérios), e o piso com os degraus."""
    s = p.s
    pal = CALCARIO
    ex0, ex1 = g['ent']
    ye, ph = 59, g['frontao']
    cols = g['colunas']
    # Alpendre: a fachada atrás das colunas fica na sombra (mais escura em cima).
    p.shade(ex0, ye + 5, ex1 - ex0, 2, 0.6)
    p.shade(ex0, ye + 7, ex1 - ex0, 2, 0.75)
    p.shade(ex0, ye + 9, ex1 - ex0, 89 - ye - 9, 0.88)
    for x in cols:
        p.shade(x + 4, ye + 7, 2, 89 - ye - 7, 0.72)            # sombra de cada coluna
    for x in cols:
        column(p, x, ye + 5, 89)
    # Entablamento.
    dent = 'd'
    rows1 = [pal[4], pal[3], dent, pal[3], pal[1]]
    rows2 = [OURO[3] if gold else pal[4], OURO[2] if gold else pal[4], pal[3], pal[2], dent, dent, pal[3], pal[3], pal[2], pal[1]]
    seq = rows1 if s == 1 else rows2
    X0, X1 = round((ex0 - 1) * s), round((ex1 + 1) * s)
    for i, col in enumerate(seq):
        Y = round(ye * s) + i
        for X in range(X0 + (0 if i < 2 * s else s), X1 - (0 if i < 2 * s else s)):
            c = col
            if col == dent:
                c = pal[1] if (X // s) % 2 else pal[3]
                if gold and s == 2 and (X // 2) % 4 == 0:
                    c = OURO[2]
            p.put(X, Y, c)
    if gold and s == 1:
        for X in range(X0, X1):
            p.put(X, round(ye * s), OURO[2])
    # Frontão.
    half = (ex1 - ex0) / 2 + 1
    top = ye - ph
    for X, Y, u, v in p.each(ex0 - 1, top, ex1 - ex0 + 2, ph):
        a = abs(u - CX)
        edge = top + a * ph / half
        if v < edge:
            continue
        T = (v - edge) * s
        if T < 2 * s:
            i = min(3, int(T / (2 * s) * 4))
            col = [pal[4], pal[3], pal[2], pal[1]][i]
            if gold and i == 0:
                col = OURO[3] if u < CX else OURO[2]
            elif gold and i == 1 and s == 2:
                col = OURO[1]
            if u > CX:
                col = L.mul(col, 0.9)
        elif T < 3 * s:
            col = L.mul(pal[1], 0.92)                              # sombra da cornija no tímpano
        else:
            col = L.mix(pal[1], pal[2], 0.55)
            if s == 2:
                col = L.mul(col, 0.96 + 0.06 * L.noise(X, Y, 23, 2))
        p.put(X, Y, col)
    # Coroa de louros no tímpano: dois ramos que sobem do laço embaixo, aberta em cima.
    wy = ye - ph * 0.36
    wr = min(2.6, ph * 0.3)
    leaf = (OURO[2], OURO[3], OURO[1]) if gold else (pal[3], pal[4], pal[1])
    for X, Y, u, v in p.each(CX - wr - 1, wy - wr - 1, 2 * wr + 2, 2 * wr + 2):
        d = math.hypot(u - CX, v - wy)
        if wr - (1.0 if s == 1 else 0.9) <= d <= wr and not (v < wy - wr * 0.45 and abs(u - CX) < 1.0):
            col = leaf[1] if u < CX else leaf[0]
            if s == 2 and L.hsh(X, Y, 7) < 0.3:
                col = leaf[2]
            p.put(X, Y, col)
    if s == 2:
        for X, Y in ((CX * 2 - 1, round((wy + wr) * 2)), (CX * 2, round((wy + wr) * 2))):
            p.put(X, Y, leaf[2])                                  # o laço
    if gold:
        # Acrotérios: palmeta na ponta e nos dois cantos do frontão.
        p.rect(CX - 1, top - 2, 2, 2, OURO[2])
        p.dot(CX - 1, top - 2, OURO[3])
        p.fine(CX * 2 - 1, (top - 3) * 2 + 1, OURO[3])
        p.fine(CX * 2, (top - 3) * 2 + 1, OURO[2])
        for ax in (ex0 - 1, ex1 - 1):
            p.rect(ax, ye - 2, 2, 2, OURO[2])
            p.dot(ax, ye - 2, OURO[3])
    # Piso do pórtico e degraus.
    steps(p, 89, [(ex0, ex1), (ex0 - 2, ex1 + 2), (ex0 - 4, ex1 + 4)], pal=pal)


def brazier(p: Piece, cx, base=94):
    """Braseiro de ferro num pé curto: bacia com brasas e chama; a chama acende no overlay.
    cx: coluna de pixel do meio (16-bit)."""
    s = p.s
    p.rect(cx, base - 4, 1, 4, IRON[2])
    p.rect(cx - 2, base, 5, 1, IRON[1])
    p.dot(cx - 1, base - 1, IRON[2])
    p.dot(cx + 1, base - 1, IRON[1])
    p.rect(cx - 3, base - 7, 7, 1, IRON[3])
    p.rect(cx - 2, base - 6, 5, 1, IRON[2])
    p.rect(cx - 1, base - 5, 3, 1, IRON[1])
    p.dot(cx - 3, base - 7, IRON[4])
    if s == 2:
        for dx in range(-5, 7, 3):
            p.fine(cx * 2 + dx, (base - 6) * 2, IRON[4])
        p.fine(cx * 2, (base - 4) * 2, IRON[3])
    # Chama: (linha relativa à base, x0, x1, cor) do contorno para o miolo.
    flame = [
        (-8, cx - 2, cx + 3, FOGO[1]), (-8, cx - 1, cx + 2, FOGO[2]),
        (-9, cx - 2, cx + 2, FOGO[1]), (-9, cx - 1, cx + 1, FOGO[2]), (-9, cx, cx + 1, FOGO[3]),
        (-10, cx - 1, cx + 2, FOGO[1]), (-10, cx, cx + 1, FOGO[2]),
        (-11, cx, cx + 1, FOGO[1]),
        (-12, cx - 1, cx, FOGO[1]),
    ]
    for dy, a, b, col in flame:
        p.rect(a, base + dy, b - a, 1, col)
        for X, Y, _, _ in p.each(a, base + dy, b - a, 1):
            p.glow(X, Y, col if s == 2 else (LUZ16[1] if col != FOGO[1] else (236, 150, 64)))
    if s == 2:
        # Línguas de fogo mais finas e as brasas na borda da bacia.
        for X, Y, col in ((cx * 2 + 3, (base - 11) * 2, FOGO[1]), (cx * 2 + 3, (base - 11) * 2 + 1, FOGO[2]),
                          (cx * 2 - 3, (base - 10) * 2, FOGO[1]), (cx * 2 + 1, (base - 9) * 2 - 1, FOGO[3])):
            p.fine(X, Y, col)
            p.glow(X, Y, col)
        for X in range(cx * 2 - 4, cx * 2 + 6, 2):
            p.fine(X, (base - 7) * 2, FOGO[1])
            p.glow(X, (base - 7) * 2, FOGO[1])


def bracket(p: Piece, hx, side):
    """Suporte de estandarte vazio (braço curto de ferro): chapa na parede do lado de fora,
    braço deitado na linha SUPORTE_Y - 1 e a ponta virada para cima. O jogo pendura o pano
    (6 × 10 na 16-bit) em hx - 3 .. hx + 2, de SUPORTE_Y para baixo. side -1: chapa à esquerda."""
    s = p.s
    hy = SUPORTE_Y
    left = hx if side < 0 else 112 - hx                          # desenha o da esquerda e espelha

    def r16(x, y, w, h, col):
        p.rect(x if side < 0 else 112 - x - w, y, w, h, col)

    def f32(X, Y, col):
        p.fine(X if side < 0 else 223 - X, Y, col)

    # Sombra do braço e da chapa na parede (para baixo e para a direita).
    for X, Y, u, v in p.each(left - 4, hy, 8, 1):
        p.c.shade(X if side < 0 else p.c.w - 1 - X, Y, 0.78)
    r16(left - 5, hy - 3, 1, 5, IRON[2])                          # chapa
    r16(left - 4, hy - 1, 8, 1, IRON[1])                          # braço
    r16(left - 4, hy, 1, 1, IRON[1])                              # mão-francesa
    r16(left + 3, hy - 2, 1, 1, IRON[2])                          # ponta virada para cima
    if s == 1:
        r16(left - 5, hy - 3, 1, 1, IRON[3])
        return
    # 32-bit: ferro escuro (o claro some na pedra), quina de cima com brilho, rebites.
    P = (left - 5) * 2
    for Y in range((hy - 3) * 2, (hy + 2) * 2):
        f32(P, Y, IRON[2])
        f32(P + 1, Y, IRON[0])
    for Y in ((hy - 3) * 2 + 1, (hy + 1) * 2):
        f32(P, Y, IRON[4])                                        # rebites
    for X in range((left - 4) * 2, (left + 4) * 2):
        f32(X, (hy - 1) * 2, IRON[2] if X % 3 else IRON[3])
        f32(X, (hy - 1) * 2 + 1, IRON[0])
    for i in range(5):                                            # mão-francesa em diagonal
        f32(P + 2 + i, hy * 2 + 3 - i, IRON[1])
        f32(P + 2 + i, hy * 2 + 4 - i, IRON[0])
    T = (left + 3) * 2 + 1
    for X, Y, col in ((T, (hy - 1) * 2 - 1, IRON[1]), (T, (hy - 1) * 2 - 2, IRON[2]), (T - 1, (hy - 1) * 2 - 3, IRON[3]),
                      (T - 2, (hy - 1) * 2 - 2, IRON[1]), (T, (hy - 1) * 2, IRON[3])):
        f32(X, Y, col)


def dome(p: Piece, g, gold=True):
    """Cúpula de cobre sobre a cumeeira: tambor de cantaria (que pega a luz à esquerda) com três
    janelinhas acesas, cornija, calota com nervuras de ouro e o remate (orbe e agulha)."""
    s = p.s
    r, yd = 10, g['ya'] - 15

    def foot(u):
        # Pé do tambor: a frente do cilindro, um pouco mais baixa no meio.
        return yd + 9 + math.sqrt(max(0.0, 1 - ((u - CX) / r) ** 2))

    # Sombra do tambor no telhado: embaixo dele e na água da direita.
    for X, Y, u, v in p.each(CX - r, yd, 2 * r + 2, 13):
        if p.get(X, Y) is None:
            continue
        a = u - CX
        if (a > r and v < foot(CX + r) + 1.5) or (abs(a) <= r and foot(u) <= v < foot(u) + 1):
            p.c.shade(X, Y, 0.62)
    for X, Y, u, v in p.each(CX - r, yd, 2 * r, 12):
        if v >= foot(u):
            continue
        if v >= foot(u) - 1 / s:
            p.put(X, Y, CHUMBO if s == 2 else STONE[0])          # rufo de chumbo no pé do tambor
            continue
        if s == 2 and v >= foot(u) - 1:
            p.put(X, Y, L.mul(STONE[3], 1.08 - 0.4 * (u - CX + r) / (2 * r)))
            continue
        nx = (u - CX) / r
        row = int((v - yd) * s // (3 * s))
        bx = (u * s + (2 * s if row % 2 else 0)) % (5 * s)
        if int((v - yd) * s) % (3 * s) == 3 * s - 1 or bx >= 5 * s - 1:
            col = STONE[1]
        else:
            col = STONE[3] if int((v - yd) * s) % (3 * s) == 0 else STONE[2]
        lum = 1.12 - 0.42 * (nx + 1) / 2 - (0.12 if abs(nx) > 0.85 else 0)
        col = L.mul(col, lum)
        p.put(X, Y, col)
    # Janelinhas do tambor (arco em cima), acesas.
    for wx in (CX - 7, CX - 1, CX + 5):
        for X, Y, u, v in p.each(wx, yd + 2, 2, 5):
            if v < yd + 2.5 and s == 2 and (X % 2 == (0 if u < wx + 1 else 1)):
                continue
            p.put(X, Y, GLASS[1])
            p.glow(X, Y, lit_color(p, X, Y, u, v, wx + 1, yd + 5, 1.2, 2.5, 3))
        p.rect(wx - 1, yd + 7, 4, 1, STONE[4])
    # Cornija do tambor.
    strata(p, CX - r - 1, yd - 1, 2 * r + 2, [STONE[4]], [STONE[4], STONE[2]])
    # Calota.
    ry = 9.5
    for X, Y, u, v in p.each(CX - r, yd - 10, 2 * r, 9):
        nx, ny = (u - CX) / (r - 0.3), (v - (yd - 1)) / ry
        if nx * nx + ny * ny > 1:
            continue
        nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
        dot = -0.55 * nx - 0.6 * ny + 0.58 * nz
        i = max(0, min(4, int((dot + 0.15) / 1.15 * 5)))
        col = COBRE[i]
        q = nx / math.sqrt(max(1e-3, 1 - ny * ny))
        for lon in (-0.62, 0.0, 0.62):
            if abs(q - lon) < (0.05 if s == 2 else 0.06):
                col = (OURO[3] if i >= 3 else OURO[2] if i >= 1 else OURO[1]) if gold else COBRE[min(4, i + 1)]
        if s == 2 and col == COBRE[i] and L.hsh(X, Y, 17) < 0.06:
            col = COBRE[min(4, i + 1)]                            # pátina
        p.put(X, Y, col)
    # Remate: orbe e agulha de ouro.
    p.rect(CX - 1, yd - 12, 2, 2, OURO[2])
    p.dot(CX - 1, yd - 12, OURO[3])
    p.rect(CX - 1, yd - 13, 1, 1, OURO[1])
    p.fine(CX * 2 - 1, (yd - 13) * 2 - 1, OURO[3])
    p.fine(CX * 2 - 1, (yd - 13) * 2 - 2, OURO[2])


def salao(level: int, s: int):
    """Salão das Lendas, nível 1 a 3 (112 × 96): devolve a peça e o overlay "-lights"."""
    g = NIVEIS[level]
    p = Piece(112, 96, s)
    x0, x1 = g['x0'], g['x1']
    walls(p, g, seed=level)
    roof(p, g, lichen=0.14 if level == 1 else 0.04, seed=level)
    if 'oculo' in g:
        oculus(p, *g['oculo'])
    # Janelas estreitas e altas, uma de cada lado.
    gx = g['janelas']
    for i, x in enumerate((gx, 112 - gx - 3)):
        lancet(p, x, 70, seed=i)
    door_frame(p, gold=level == 3)
    if level == 3:
        open_door(p)
    else:
        door(p, seed=level)
    if level == 1:
        steps(p, 89, [(47, 65), (45, 67), (43, 69)])
        moss(p, x0 - 2, 80, x1 - x0 + 4, 15, amount=0.75, seed=5)
        # Pedras gastas: umas manchas escuras e uma racha perto da quina da direita.
        for X, Y, u, v in p.each(x0, g['yt'], x1 - x0, CHAO - g['yt']):
            c = p.get(X, Y)
            if c and L.noise(u * 0.8, v * 0.3, 41, 3) > 0.74:
                p.put(X, Y, L.mul(c, 0.88))
        crack = [(77, 64), (77, 65), (76, 66), (76, 67), (77, 68), (77, 69), (78, 70), (78, 71), (77, 72)]
        for cx, cy in crack:
            for X, Y, u, v in p.each(cx, cy, 1, 1):
                if s == 1 or X % 2 == (0 if cy % 2 else 1):
                    p.put(X, Y, L.mul(p.get(X, Y), 0.45))
                    if s == 2 and p.get(X + 1, Y):
                        p.put(X + 1, Y, L.mix(p.get(X + 1, Y), STONE[4], 0.35))
    else:
        moss(p, x0 - 2, 86, x1 - x0 + 4, 9, amount=0.45, seed=5)
        portico(p, g, gold=level == 3)
        for hx in g['suportes']:
            bracket(p, hx, -1)
            bracket(p, 112 - hx, +1)
        b = g['braseiros']
        brazier(p, b)
        brazier(p, 111 - b)
    if level == 3:
        rose(p, *g['rosa'])
        dome(p, g)
    return p.image(), p.lights()


def pedestal(s: int) -> Image.Image:
    """Pedestal das estátuas (14 × 10): plinto quadrado de calcário (o do pórtico) com o topo liso
    e vazio nas linhas 1 e 2 (o jogo desenha a estátua em cima), o dado no meio com uma
    plaquinha de bronze gravada e a base. Calcário claro para a estátua cinza se destacar."""
    pal = CALCARIO
    p = Piece(14, 10, s)
    # Topo (face de cima, linhas 1 e 2) e a borda da frente do capitel (linha 3).
    strata(p, 1, 1, 12, [pal[4], pal[3]], [pal[4], pal[4], pal[4], pal[3]])
    strata(p, 1, 3, 12, [pal[2]], [pal[3], pal[1]])
    # Dado, 1 px mais estreito de cada lado, com a sombra do capitel em cima.
    X0 = round(2 * s)
    for X, Y, u, v in p.each(2, 4, 10, 3):
        lx = X - X0
        col = pal[3] if lx < s else (pal[1] if lx >= 9 * s else pal[2])
        if s == 2:
            col = L.mul(col, 0.97 + 0.06 * L.noise(X, Y, 3, 2))
        p.put(X, Y, col)
    p.shade(2, 4, 10, 1 if s == 1 else 0.5, 0.78)
    # Base (linhas 7 e 8).
    strata(p, 1, 7, 12, [pal[3], pal[1]], [pal[4], pal[3], pal[2], pal[1]])
    if s == 2:
        for Y in range(2, 8):
            p.fine(2, Y, pal[4])
        for Y in (2, 3, 14, 15):
            p.fine(25, Y, pal[2])
    # Plaquinha de bronze (4 × 2) com a gravação.
    p.rect(5, 5, 4, 2, BRONZE[2])
    if s == 1:
        p.rect(5, 5, 4, 1, BRONZE[3])
        p.dot(8, 6, BRONZE[1])
        p.dot(6, 6, BRONZE[1])
    else:
        for X in range(10, 18):
            p.fine(X, 10, BRONZE[3])
            p.fine(X, 13, BRONZE[1])
        for Y in range(10, 14):
            p.fine(17, Y, BRONZE[1])
        p.fine(10, 10, BRONZE[4])
        for X in (11, 12, 14, 15):
            p.fine(X, 11, BRONZE[1])                              # o nome gravado
        for X in (12, 13, 14):
            p.fine(X, 12, BRONZE[1])
    return p.image()


PIECES = {
    'prop/audiencia/mesa': (mesa, 'export/png/prop-audiencia-mesa.png', 'prop'),
    # Desenhado no mapa sobre o herói: entra como decalque (o tipo 'ui' é só do DOM).
    'ui/desejo': (desejo, 'export/ui/ui-desejo.png', 'decal'),
    'prop/tumulo/flores': (flores, 'export/png/prop-tumulo-flores.png', 'prop'),
    # F5: o salão devolve (peça, overlay de luzes); o overlay vai para "<arquivo>-lights.png".
    'building/salao/level-1': (functools.partial(salao, 1), 'export/png/building-salao-level-1.png', 'building'),
    'building/salao/level-2': (functools.partial(salao, 2), 'export/png/building-salao-level-2.png', 'building'),
    'building/salao/level-3': (functools.partial(salao, 3), 'export/png/building-salao-level-3.png', 'building'),
    'prop/salao/pedestal': (pedestal, 'export/png/prop-salao-pedestal.png', 'prop'),
}

INDEX = os.path.join(L.ROOT, 'src', 'render', 'pack-historias.ts')


def night(img: Image.Image, lit: Image.Image) -> Image.Image:
    """Prévia da noite: a peça escurecida e o overlay aceso por cima (como no jogo)."""
    dark = Image.new('RGBA', img.size, (20, 26, 40, 150))
    out = Image.alpha_composite(img, Image.composite(dark, Image.new('RGBA', img.size, (0, 0, 0, 0)), img.split()[3]))
    out.alpha_composite(lit)
    return out


def iou(a: Image.Image, b: Image.Image) -> float:
    """Silhueta da 32-bit contra a 16-bit ampliada (1 = o mesmo lugar)."""
    pa, pb = a.resize(b.size, Image.NEAREST).load(), b.load()
    both = some = 0
    for y in range(b.height):
        for x in range(b.width):
            A, B = pa[x, y][3] > 0, pb[x, y][3] > 0
            both += A and B
            some += A or B
    return both / max(1, some)


def main(argv):
    dry = '--dry' in argv
    prev = argv[argv.index('--preview') + 1] if '--preview' in argv else tempfile.mkdtemp(prefix='historias32-')
    os.makedirs(prev, exist_ok=True)
    entries = []
    for pid, (fn, file, kind) in PIECES.items():
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
                night(img, lits[s]).resize((img.width * z, img.height * z), Image.NEAREST).save(
                    os.path.join(prev, f'{name}-{s * 16}-noite.png'))
        w, h = imgs[1].size
        entry = {'id': pid, 'type': kind, 'file': file}
        if lights:
            entry['lights'] = lights
        entry.update({'anchor': [0.5, 1], 'size': [w, h]})
        entries.append(entry)
        print(f'{pid:28s} {w}×{h}  silhueta 32 × 16: IoU {iou(imgs[1], imgs[2]):.3f}')
    if not dry:
        body = json.dumps(entries, ensure_ascii=False, indent=2)
        with open(INDEX, 'w') as fh:
            fh.write(
                '// Gerado por art32/historias32.py: as peças do M6 (Histórias sem fim), somadas ao\n'
                '// índice do pack em pack.ts. Não editar à mão.\n\n'
                "import type { PackAsset } from './pack.ts';\n\n"
                f'export const PACK_HISTORIAS: PackAsset[] = {body};\n'
            )
    print(f'{len(entries)} peças; prévias em {prev}')


if __name__ == '__main__':
    main(sys.argv[1:])
