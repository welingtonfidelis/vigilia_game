"""Efeitos pequenos da vila em 32-bit, em folhas de quadros com o dobro de cada quadro e a
mesma quantidade e ordem: fogo (6 quadros de 32×32), faísca (4 de 16×16) e vapor (8 de
64×64). Sem contorno, como na 16-bit; alfa só 0 ou 255.
"""
from __future__ import annotations

import math

from vila32_base import K, hsh, noise

# Fogo em 4 tons: vermelho-escuro por fora, laranja, amarelo e o miolo claro.
FIRE4 = [(168, 52, 44), (246, 122, 40), (252, 192, 74), (255, 242, 186)]
STEAM = [(110, 118, 128), (150, 160, 172), (196, 204, 212), (244, 242, 234)]


def fire_frame(k: int, n: int = 6) -> K:
    c = K(32, 32)
    ph = 2 * math.pi * k / n
    base = 32
    tongues = [
        (16.0 + math.sin(ph) * 1.6, 5 + 2.0 * math.sin(2 * ph + 1.0), 10.5, 2.6, ph),
        (9.5 + math.sin(ph + 2.0), 14 + 2.0 * math.sin(ph + 0.5), 5.5, -1.8, ph + 1.7),
        (22.5 + math.sin(ph + 4.0), 12 + 2.0 * math.cos(ph + 0.3), 5.5, 1.8, ph + 3.1),
    ]
    field = {}
    for (cx, top, hw, sw, p) in tongues:
        top = int(round(top))
        for y in range(top, base):
            t = (base - y) / (base - top)
            sway = math.sin(t * 3.6 + p) * sw * t
            half = max(0.5, hw * (1 - t) ** 0.7)
            for x in range(32):
                d = abs(x + 0.5 - (cx + sway)) / half
                if d > 1:
                    continue
                v = (1 - d) * 0.75 + (1 - t) * 0.65 - 0.2
                field[(x, y)] = max(field.get((x, y), -1.0), v)
    for (x, y), v in field.items():
        # A textura sobe com os quadros (o ruído anda para cima).
        f = noise(x * 1.0, y + k * 3.0, 31, 3)
        if v < 0.3 and f > 0.62:
            continue
        v += (f - 0.5) * 0.18
        col = FIRE4[0] if v < 0.3 else FIRE4[1] if v < 0.58 else FIRE4[2] if v < 0.88 else FIRE4[3]
        c.p(x, y, col)
    # Lingua solta acima da chama em alguns quadros.
    if k % 3 == 1:
        bx, by = 15 + int(math.sin(ph) * 2), 2 + k % 2
        for (dx, dy, i) in ((0, 0, 0), (1, 0, 0), (0, 1, 1), (1, 1, 0), (0, 2, 0)):
            c.p(bx + dx, by + dy, FIRE4[i])
    return c


def fire_sheet() -> K:
    sh = K(32 * 6, 32)
    for k in range(6):
        sh.paste(fire_frame(k), 32 * k, 0)
    return sh


def spark_sheet() -> K:
    """Faísca: estalo (cruz clara), estouro (riscos em X), brasas se abrindo e sumindo."""
    sh = K(16 * 4, 16)
    Y, O, W, D = (250, 196, 74), (246, 132, 42), (255, 246, 210), (184, 82, 36)
    # 0: ponto quente com braços curtos.
    f = [(7, 7, W), (8, 7, W), (7, 8, W), (8, 8, Y), (6, 7, Y), (9, 8, Y), (7, 6, Y), (8, 9, Y), (5, 7, O), (10, 8, O), (7, 5, O), (8, 10, O)]
    for x, y, col in f:
        sh.p(x, y, col)
    # 1: estouro em X, riscos de 3 px saindo do miolo.
    ox = 16
    sh.p(ox + 7, 7, W)
    sh.p(ox + 8, 8, Y)
    for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        for i, col in ((2, Y), (3, Y), (4, O)):
            sh.p(ox + 7 + (sx * i if sx < 0 else sx * i + 1), 7 + (sy * i if sy < 0 else sy * i + 1), col)
    # 2: quatro brasas abertas (2 px, miolo amarelo).
    ox = 32
    for x, y in ((2, 2), (12, 2), (2, 12), (12, 12)):
        sh.p(ox + x, y, Y)
        sh.p(ox + x + 1, y, O)
        sh.p(ox + x, y + 1, O)
        sh.p(ox + x + 1, y + 1, D)
    # 3: duas brasas sumindo, bem longe.
    ox = 48
    sh.p(ox + 0, 7, O)
    sh.p(ox + 1, 7, D)
    sh.p(ox + 14, 8, D)
    sh.p(ox + 15, 9, O)
    return sh


def puff(c: K, cx: float, cy: float, r: float, tone: float, seed: int, broken: float) -> None:
    """Novelo de vapor: bolinha com luz de cima-esquerda; quanto mais alto, mais ralo."""
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            dx, dy = (x + 0.5 - cx) / r, (y + 0.5 - cy) / r
            d2 = dx * dx + dy * dy
            if d2 > 1 or not (0 <= x < c.w and 0 <= y < c.h):
                continue
            if broken and hsh(x, y, seed) < broken * (0.4 + d2):
                continue
            v = tone + (-dx * 0.5 - dy * 0.7) * 0.35 + (1 - d2) * 0.15
            i = 0 if v < 0.3 else 1 if v < 0.55 else 2 if v < 0.8 else 3
            c.p(x, y, STEAM[i])


def steam_frame(k: int, n: int = 8) -> K:
    """Coluna de vapor que sobe: novelos nascem brancos embaixo, sobem, crescem, ficam
    cinza e se desfazem no alto; o quadro k é o mesmo movimento um oitavo adiante, então a
    folha fecha o laço."""
    c = K(64, 64)
    N = 12
    for j in range(N):
        t = ((j + k / n * (N / 8)) / N) % 1.0  # 0 embaixo, 1 no alto
        y = 61 - t * 52
        x = 32 + math.sin(t * 4.0 + 0.8) * (1.0 + 4.0 * t) + (hsh(j, 0, 202) - 0.5) * (2 + 4 * t) + math.sin(2 * math.pi * k / n + t * 3) * 1.8 * t
        r = 2.4 + 4.6 * t
        tone = 0.98 - 0.62 * t
        broken = max(0.0, (t - 0.4) * 1.3)
        puff(c, x, y, r, tone, 200 + j * 7 + k, broken)
        # Novelinhos de lado, que quebram o colar de bolas.
        for q in range(2):
            ox = (hsh(j, q + 1, 203) - 0.5) * (4 + 8 * t)
            oy = (hsh(j, q + 3, 203) - 0.5) * 4
            puff(c, x + ox, y + oy, r * (0.5 + 0.3 * hsh(j, q, 204)), tone - 0.08, 210 + j * 3 + q, broken + 0.1)
    return c


def steam_sheet() -> K:
    sh = K(64 * 8, 64)
    for k in range(8):
        sh.paste(steam_frame(k), 64 * k, 0)
    return sh
