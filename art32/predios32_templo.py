"""Templo 32-bit: ruína e níveis 1, 2 e 3, em 224×192 (o dobro do pack 16-bit).

Mesma composição da 16-bit: capela de cantaria com telhado de ardósia; no nível 1 um
campanário de madeira em cima da cumeeira, nos níveis 2 e 3 a torre de pedra com o
sino de bronze e a agulha de escamas (no 2 com a cruz dourada), no 3 contrafortes e
estandartes roxos na frente das janelas do meio. As janelas em arco, de vitral com
chumbo, ficam onde o overlay 16-bit acende; o overlay 32-bit acende só o vidro.
A ruína é o nível 2 destruído: agulha rachada, torre desmoronando sobre o telhado,
ardósia caída, vitrais quebrados, porta arrombada, entulho e mato.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402

import lib32  # noqa: E402
from predios32_kit import (  # noqa: E402
    CLOTH_PURPLE, GLASS, GOLD, IRON, LIT, MOSS, ROOF_SLATE, SOOT, STONE, VOID, WOOD, Canvas, broken_beam,
    door, eave_shadow, hsh, layer, lerp, merge, mix, mul, new_pair, noise, plinth, roof, roof_hole, rubble,
    scorch, wall_ashlar, weeds,
)

W, H = 224, 192
BRONZE = [(64, 40, 22), (108, 70, 32), (156, 108, 46), (204, 156, 72), (240, 206, 128)]
VERDIGRIS = (72, 116, 98)
# Vitral: tom do vidro de dia (escuro) e brilho à noite, por cor.
STAINED = [((70, 24, 30), (236, 104, 78)), ((24, 34, 70), (124, 150, 236)),
           ((28, 52, 34), (132, 206, 112)), ((70, 52, 18), (255, 206, 96))]
LEAD = (34, 34, 42)


def clip_lights(lt: Canvas, lights_file: str) -> None:
    """Garante que nada acende fora das manchas do overlay 16-bit (ampliado 2×)."""
    a = Image.open(lib32.path16(lights_file)).convert('RGBA')
    p = a.load()
    for y in range(lt.h):
        for x in range(lt.w):
            if lt.px[y][x] is not None and p[x // 2, y // 2][3] == 0:
                lt.px[y][x] = None


def grime(c: Canvas, x0: int, y0: int, w: int, h: int, seed=0, k=0.6, moss=0.1):
    """Encardido de ruína: escurece em manchas, escorrido vertical e musgo."""
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            col = c.g(x, y)
            if col is None:
                continue
            n = noise(x * 0.6, y * 0.15, seed + 61, 3) * 0.5 + noise(x, y, seed + 62, 8) * 0.5
            if n > 0.55:
                col = mul(col, 1 - (n - 0.55) * k * 1.6)
            if hsh(x, y, seed + 63) < moss * (0.4 + (y - y0) / max(1, h)):
                col = mix(col, MOSS[1], 0.55)
            c.px[y][x] = col


def shade_all(c: Canvas, x0: int, y0: int, w: int, h: int, k: float):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            c.shade(x, y, k)


def crack(c: Canvas, x: int, y: int, length: int, seed=0, dx=0.35):
    """Racha na pedra: linha escura em zigue-zague com a borda de baixo clara."""
    fx = float(x)
    for i in range(length):
        fx += (hsh(i, 1, seed) - 0.5) * 1.6 + dx * (1 if hsh(i // 4, 2, seed) < 0.5 else -1) * 0.5
        xx, yy = round(fx), y + i
        if c.g(xx, yy) is None:
            continue
        c.p(xx, yy, mul(c.g(xx, yy), 0.35))
        if c.g(xx + 1, yy) is not None:
            c.p(xx + 1, yy, mix(c.g(xx + 1, yy), STONE[4], 0.3))


# ── Torre ─────────────────────────────────────────────────────────────────

def spire(c: Canvas, cx: float, top: int, base: int, hw_top: float, hw_base: float, pal=ROOF_SLATE, seed=0):
    """Agulha de ardósia em escamas (fiadas de 4, desencontradas); a face direita na sombra."""
    for y in range(top, base + 1):
        t = (y - top) / max(1, base - top)
        hw = lerp(hw_top, hw_base, t)
        xa, xb = math.ceil(cx - hw), math.floor(cx + hw)
        j = y - top
        row, ly = j // 4, j % 4
        off = 2 if row % 2 else 0
        for x in range(xa, xb + 1):
            sx = (x + off) % 4
            col = pal[2]
            if ly == 0:
                col = pal[3]
            elif ly == 3:
                col = pal[1] if sx in (1, 2) else pal[0]
            elif sx == 0:
                col = mix(pal[2], pal[3], 0.5)
            elif sx == 3:
                col = pal[1]
            col = mul(col, 0.9 + 0.2 * hsh((x + off) // 4, row, seed))
            if hsh((x + off) // 4, row, seed + 1) < 0.06 and ly in (1, 2):
                col = mix(col, (150, 150, 112), 0.4)        # líquen
            if x > cx:
                col = mul(col, 0.64)
            if x == xa:
                col = pal[4] if ly != 3 else pal[3]
            elif x == xb:
                col = pal[0]
            c.p(x, y, col)


def cross(c: Canvas, cx: int, top: int, bottom: int, arm_y: int, arm: int = 3, pal=GOLD, tilt=0):
    """Cruz de metal no topo (2 px de espessura): quina clara à esquerda e em cima."""
    for y in range(top, bottom + 1):
        sh = round((bottom - y) * tilt)
        c.p(cx + sh, y, pal[3] if y > top else pal[3])
        c.p(cx + 1 + sh, y, pal[1])
    for x in range(cx - arm, cx + arm + 2):
        sh = round((bottom - arm_y) * tilt)
        c.p(x + sh, arm_y, pal[3] if x < cx + 1 else pal[2])
        c.p(x + sh, arm_y + 1, pal[1] if x != cx else pal[2])
    c.p(cx + round((bottom - top) * tilt), top, pal[-1])
    # Esfera da base.
    c.p(cx - 1, bottom + 1, pal[1])
    c.p(cx, bottom + 1, pal[3])
    c.p(cx + 1, bottom + 1, pal[2])
    c.p(cx + 2, bottom + 1, pal[0])


def cornice(c: Canvas, x0: int, x1: int, y: int, pal=STONE, dentils=True):
    """Cornija: friso de pedra saliente com dentículos embaixo e sombra."""
    for x in range(x0, x1 + 1):
        k = (x - x0) % 6
        c.p(x, y, pal[4])
        c.p(x, y + 1, pal[3] if k else pal[2])
        c.p(x, y + 2, pal[1])
    if dentils:
        for x in range(x0 + 2, x1 - 1):
            c.p(x, y + 3, pal[2] if (x - x0) % 3 else pal[0])


def tower_body(c: Canvas, x0: int, x1: int, y0: int, y1: int, seed=0, pal=STONE):
    """Fuste da torre: cantaria miúda com cunhais claros alternados nas quinas."""
    w = x1 - x0 + 1
    wall_ashlar(c, x0, y0, w, y1 - y0 + 1, pal, seed=seed, bw=10, bh=6, moss_rows=0)
    # Cunhais: pedra comprida / curta alternando, um tom acima.
    for side in (0, 1):
        for row in range((y1 - y0 + 1) // 6 + 1):
            ya = y0 + row * 6
            bw = 7 if (row + side) % 2 == 0 else 4
            xa = x0 if side == 0 else x1 - bw + 1
            for y in range(ya, min(ya + 6, y1 + 1)):
                for x in range(xa, xa + bw):
                    ly, lx = y - ya, x - xa
                    col = pal[3]
                    if ly == 0:
                        col = pal[4]
                    elif ly == 5:
                        col = (44, 44, 50)
                    elif ly == 4:
                        col = pal[2]
                    elif (side == 0 and lx == bw - 1) or (side == 1 and lx == 0):
                        col = pal[2]
                    if side == 1:
                        col = mul(col, 0.82)
                    c.p(x, y, col)
    # A face pega luz da esquerda: escurece a borda direita.
    for y in range(y0, y1 + 1):
        for x in range(x1 - 2, x1 + 1):
            c.shade(x, y, 0.86)


def bell(c: Canvas, bx: int, by: int, pal=BRONZE, dark=False):
    """Sino de bronze de 8×8: coroa, bojo, faixa, boca aberta e badalo."""
    rows = [(3, 4), (2, 5), (1, 6), (1, 6), (1, 6), (0, 7), (0, 7)]
    if dark:
        pal = [mul(p, 0.55) for p in pal]
    for j, (a, b) in enumerate(rows):
        for i in range(a, b + 1):
            rel = (i - a) / max(1, b - a)
            col = pal[2]
            if rel < 0.25:
                col = pal[4] if j < 5 else pal[3]
            elif rel < 0.45:
                col = pal[3]
            elif rel > 0.8:
                col = pal[1]
            if j == 4:
                col = pal[1] if rel > 0.3 else pal[2]          # faixa decorada
            if j == 6:
                col = pal[3] if rel < 0.6 else pal[2]          # borda da boca
            if dark and hsh(bx + i, by + j, 5) < 0.3:
                col = mix(col, VERDIGRIS, 0.6)
            c.p(bx + i, by + j, col)
    c.p(bx + 3, by + 7, pal[0])
    c.p(bx + 4, by + 7, pal[0])
    c.p(bx + 3, by + 8, pal[1])


def belfry(c: Canvas, x0: int, y0: int, w: int, h: int, pal=STONE, dark_bell=False, bell_y=None):
    """Sineira: vão em arco com aduelas de pedra, cabeçalho de madeira e o sino pendurado."""
    cx = x0 + (w - 1) / 2
    r = w / 2
    acy = y0 + r

    def inside(x, y, grow=0.0):
        if x < x0 - grow or x > x0 + w - 1 + grow or y > y0 + h - 1:
            return False
        if y < acy:
            return math.hypot(x - cx, y - acy) <= r + grow - 0.1
        return True
    for y in range(y0 - 3, y0 + h):
        for x in range(x0 - 3, x0 + w + 3):
            if inside(x, y):
                c.p(x, y, VOID[0] if y < y0 + h * 0.45 else VOID[1])
            elif inside(x, y, 2.2) and y < acy + 1:
                a = math.atan2(y - acy, x - cx)
                seg = int((a + math.pi) / (math.pi / 6))
                col = pal[3] if seg % 2 else pal[2]
                if abs(x - cx) < 1.5 and y < y0:
                    col = pal[4]                                  # fecho
                if not inside(x, y, 1.2):
                    col = mul(col, 0.8)
                c.p(x, y, col)
            elif inside(x, y, 1.5):
                c.p(x, y, pal[3] if x < cx else pal[1])         # ombreiras
    # Cabeçalho (viga) e sino.
    yb = round(acy) - 1
    for x in range(x0 + 1, x0 + w - 1):
        c.p(x, yb, WOOD[3])
        c.p(x, yb + 1, WOOD[1])
    bell(c, round(cx - 3.5), bell_y if bell_y is not None else yb + 2, dark=dark_bell)
    # Peitoril.
    for x in range(x0 - 2, x0 + w + 2):
        c.p(x, y0 + h, pal[4])
        c.p(x, y0 + h + 1, pal[1])


# ── Janelas, porta, contrafortes, estandartes ─────────────────────────────

def chapel_window(c: Canvas, lt, gx: int, gy: int, gw: int, gh: int, *, transom=None, sill='wood',
                  broken=False, seed=0, surround=True):
    """Janela em arco pleno: aduelas de pedra, caixilho escuro, vitral em losangos de chumbo.

    Pinázio no meio e travessa em `transom` (linha y). As luzes acendem só os vidros.
    """
    cx = gx + (gw - 1) / 2
    r = gw / 2
    acy = gy + r

    def inside(x, y, grow=0.0):
        if x < gx - grow or x > gx + gw - 1 + grow or y > gy + gh - 1 + grow:
            return False
        if y < acy:
            return math.hypot(x - cx, y - acy) <= r + grow - 0.15
        return True
    mx = gx + gw // 2 - 1
    for y in range(gy - 5, gy + gh + 3):
        for x in range(gx - 5, gx + gw + 5):
            if inside(x, y):
                continue
            if inside(x, y, 1.0):
                c.p(x, y, WOOD[1] if (x < cx and y < gy + gh) else WOOD[0])
            elif surround and inside(x, y, 3.2) and y <= gy + gh:
                if y < acy:
                    a = math.atan2(y - acy, x - cx)
                    seg = int((a + math.pi) / (math.pi / 5))
                    col = STONE[3] if seg % 2 else STONE[2]
                    if abs(x - cx) < 1.6 and y < gy:
                        col = STONE[4]
                else:
                    col = STONE[3] if ((y - gy) // 5) % 2 == 0 else STONE[2]
                    if x > cx:
                        col = mul(col, 0.85)
                if not inside(x, y, 2.2):
                    col = mul(col, 0.78)
                c.p(x, y, col)
    for y in range(gy, gy + gh):
        for x in range(gx, gx + gw):
            if not inside(x, y):
                continue
            u, v = x - gx, y - gy
            lead = (u + v + 1) % 6 == 0 or (u - v + 60) % 6 == 0
            pane = ((u + v + 1) // 6, (u - v + 60) // 6)
            tint = None
            hp = hsh(pane[0], pane[1], seed + 7)
            if hp < 0.28:
                tint = STAINED[int(hsh(pane[0], pane[1], seed + 8) * 4)]
            t = (u / gw + v / gh) / 2
            col = mix(GLASS[2], GLASS[0], t)
            if tint:
                col = mix(col, tint[0], 0.55)
            if u - v * 0.5 in (1, 2) and v < gh * 0.55:
                col = mix(col, GLASS[3], 0.7)                    # reflexo
            if broken:
                col = VOID[1] if hsh(x, y, seed) > 0.22 else VOID[2]
                lead = lead and hsh(x, y, seed + 1) < 0.35
            if lead:
                col = LEAD
            c.p(x, y, col)
            if lt is not None and not broken and not lead:
                d = min(1.0, math.hypot((x - cx) / (gw * 0.75), (y - (gy + gh * 0.62)) / (gh * 0.62)))
                lc = mix(LIT[4], LIT[1], d)
                if tint:
                    lc = mix(lc, tint[1], 0.38)
                lt.p(x, y, lc)
    # Pinázio e travessa (pedra/madeira escura).
    for y in range(gy + int(r) - 2, gy + gh):
        if inside(mx, y):
            c.p(mx, y, WOOD[2])
            c.p(mx + 1, y, WOOD[1])
            if lt is not None:
                lt.p(mx, y, None)
                lt.p(mx + 1, y, None)
    if transom is not None:
        for x in range(gx, gx + gw):
            c.p(x, transom, WOOD[2])
            c.p(x, transom + 1, WOOD[0])
            if lt is not None:
                lt.p(x, transom, None)
                lt.p(x, transom + 1, None)
    if broken:
        for i in range(4):
            sx = gx + int(hsh(i, 3, seed) * (gw - 1))
            sy = gy + gh - 1 - int(hsh(i, 4, seed) * 3)
            c.p(sx, sy, GLASS[3])
            c.p(sx, sy - 1, mix(GLASS[2], STAINED[i % 4][0], 0.5))
        c.p(gx, gy + int(r), GLASS[3])
        c.p(gx + 1, gy + int(r) + 1, GLASS[2])
    if sill == 'wood':
        for x in range(gx - 2, gx + gw + 2):
            c.p(x, gy + gh, WOOD[4] if x < gx + gw else WOOD[3])
            c.p(x, gy + gh + 1, WOOD[2] if not broken or hsh(x, 0, seed) < 0.7 else WOOD[0])
    elif sill == 'stone':
        for x in range(gx - 3, gx + gw + 3):
            c.p(x, gy + gh, STONE[4])
            c.p(x, gy + gh + 1, STONE[2])


def voussoirs(c: Canvas, cx: float, cy: float, r0: float, r1: float, n: int = 9, pal=STONE):
    """Arco de aduelas sobre uma porta: cunhas alternadas e fecho claro no alto."""
    for y in range(int(cy - r1) - 1, int(cy) + 1):
        for x in range(int(cx - r1) - 1, int(cx + r1) + 2):
            d = math.hypot(x - cx, y - cy)
            if r0 <= d <= r1:
                a = math.atan2(y - cy, x - cx)          # -pi..0 na metade de cima
                seg = int((a + math.pi) / (math.pi / n))
                col = pal[3] if seg % 2 else pal[2]
                if seg == n // 2:
                    col = pal[4]
                if d > r1 - 1:
                    col = pal[1]
                elif d < r0 + 1:
                    col = mix(col, pal[4], 0.3)
                c.p(x, y, col)


def ruin_door(c: Canvas, x0: int, y0: int, w: int, h: int, arch: int, seed=0):
    """Porta dupla arrombada em arco: vão escuro, folha caída na diagonal, outra pendurada."""
    cx = x0 + (w - 1) / 2

    def in_door(x, y):
        if y < y0 + arch:
            return math.hypot((x - cx) / (w / 2), (y - (y0 + arch)) / arch) <= 1.0
        return True
    for y in range(y0 - 3, y0 + h):
        for x in range(x0 - 3, x0 + w + 3):
            if x0 <= x < x0 + w and y >= y0 and in_door(x, y):
                col = VOID[0] if y < y0 + h * 0.6 else VOID[1]
                if y > y0 + h - 4:
                    col = VOID[2]
                c.p(x, y, col)
            elif y >= y0 + arch - 1 or math.hypot((x - cx) / (w / 2 + 3), (y - (y0 + arch)) / (arch + 3)) <= 1.0:
                col = STONE[3] if x < cx else STONE[1]
                if x in (x0 - 3, x0 + w + 2):
                    col = STONE[0]
                c.p(x, y, col)
    # Folha esquerda arrancada, caída na diagonal até o chão.
    for i in range(h - 6):
        t = i / max(1, h - 7)
        x = round(lerp(x0 + 3, x0 + w - 7, t))
        y = y0 + arch // 2 + 2 + round(t * (h - arch // 2 - 4))
        for d in range(4):
            c.p(x + d, y, WOOD[3] if d == 0 else (WOOD[2] if d < 3 else WOOD[0]))
        if i % 9 == 4:
            c.p(x + 1, y, IRON[2])
    # Folha direita pendurada por uma dobradiça, rachada embaixo.
    for y in range(y0 + arch // 2, y0 + h - 6):
        for x in range(x0 + w - 5, x0 + w):
            if y > y0 + h - 14 and hsh(x, y // 3, seed) < 0.4:
                continue
            k = (x - (x0 + w - 5))
            c.p(x, y, WOOD[2] if k in (1, 2) else (WOOD[3] if k == 0 else WOOD[1]))
    c.rect(x0 + w - 6, y0 + arch + 2, 6, 1, IRON[2])
    for x in range(x0 + 2, x0 + w - 2, 3):
        if hsh(x, 9, seed) < 0.5:
            c.p(x, y0 + h - 1, WOOD[1])                          # lascas no chão


def buttress(c: Canvas, x0: int, x1: int, y0: int, y1: int, side: int, seed=0, pal=STONE):
    """Contraforte de pedra com capa inclinada e um ressalto com pingadeira no meio."""
    w = x1 - x0 + 1
    wall_ashlar(c, x0, y0, w, y1 - y0 + 1, pal, seed=seed, bw=5 if side < 0 else 6, bh=6, moss_rows=10)
    for x in range(x0, x1 + 1):
        k = (x - x0) / max(1, w - 1) if side < 0 else (x1 - x) / max(1, w - 1)   # 1 = lado de fora
        top = y0 + round((1 - k) * 0 + k * 3)
        for y in range(y0, top):
            c.p(x, y, None)
        c.p(x, top, pal[4])
        c.p(x, top + 1, pal[3])
        c.p(x, top + 2, pal[3] if x < x1 else pal[2])
        c.p(x, top + 3, pal[1])
    ym = y0 + (y1 - y0) // 2
    for x in range(x0, x1 + 1):
        c.p(x, ym, pal[4])
        c.p(x, ym + 1, pal[2])
        c.p(x, ym + 2, pal[0])
    for y in range(y0, y1 + 1):
        c.shade(x1, y, 0.75)
        if c.g(x0, y):
            c.p(x0, y, mix(c.g(x0, y), pal[4], 0.35))


def t_banner(c: Canvas, x: int, y: int, w: int, h: int, pal=CLOTH_PURPLE, seed=0, torn=False):
    """Estandarte do templo: vara com ponteiras douradas, dobras, franja e emblema no alto."""
    for xx in range(x - 2, x + w + 2):
        c.p(xx, y - 2, WOOD[3])
        c.p(xx, y - 1, WOOD[1])
    for gx_ in (x - 3, x + w + 2):
        c.p(gx_, y - 2, GOLD[3])
        c.p(gx_, y - 1, GOLD[1])
    tip = w // 2 + 1
    for yy in range(y, y + h):
        for xx in range(x, x + w):
            lx = xx - x
            if yy > y + h - tip and abs(xx - (x + (w - 1) / 2)) < (yy - (y + h - tip)) * 1.0:
                continue
            if torn and yy > y + h // 2 and hsh(xx, yy // 2, seed) < 0.16:
                continue
            col = pal[2]
            if lx == 0:
                col = pal[3]
            elif lx >= w - 2:
                col = pal[1]
            elif lx % 4 == 3:
                col = mix(pal[2], pal[1], 0.7)                # dobra
            elif lx % 4 == 1 and yy > y + 2:
                col = mix(pal[2], pal[3], 0.4)
            if yy == y:
                col = mul(pal[1], 0.8)                        # sombra da vara
            if yy in (y + 2, y + h - tip - 1) and 0 < lx < w - 1:
                col = GOLD[2] if lx % 2 else GOLD[1]          # galões
            c.p(xx, yy, col)
    # Losango dourado.
    cx, cy = x + (w - 1) // 2, y + 6
    for (dx, dy) in ((0, -2), (-1, -1), (1, -1), (-2, 0), (2, 0), (-1, 1), (1, 1), (0, 2), (1, 0), (-1, 0), (0, 1), (0, -1)):
        c.p(cx + dx, cy + dy, GOLD[2])
    c.p(cx, cy, GOLD[3])
    c.p(cx + 1, cy - 1, GOLD[3])
    c.p(cx + 1, cy + 1, GOLD[1])
    # Cruz bordada embaixo do losango.
    for dy in range(4, 10):
        c.p(cx, cy + dy, GOLD[1] if dy % 2 else GOLD[2])
    c.p(cx - 1, cy + 6, GOLD[1])
    c.p(cx + 1, cy + 6, GOLD[1])


def step(c: Canvas, x0: int, x1: int, y: int, pal=STONE):
    """Degrau de pedra na frente da porta."""
    for x in range(x0, x1 + 1):
        c.p(x, y, pal[4])
        c.p(x, y + 1, pal[3] if (x - x0) % 9 else pal[1])
        c.p(x, y + 2, pal[2] if (x - x0) % 9 else pal[1])
        c.p(x, y + 3, pal[1])


# ── Peças ─────────────────────────────────────────────────────────────────

def templo_1():
    """Nível 1: capelinha de cantaria, sineira de madeira na cumeeira, porta de tábua."""
    c, lt = new_pair(W, H)
    roof(c, 81, 133, (53, 39), (170, 184), (82, 47), (141, 177), 'slate', ROOF_SLATE, seed=21)
    # Sineira de madeira em cima da cumeeira: capa de ardósia, dois esteios, o sino no meio.
    for i, (a, b) in enumerate(((110, 115), (109, 116), (108, 117), (107, 118))):
        for x in range(a, b + 1):
            col = ROOF_SLATE[3] if x < 112 else ROOF_SLATE[1]
            if i == 3:
                col = ROOF_SLATE[0]
            if x == a:
                col = ROOF_SLATE[4]
            c.p(x, 69 + i, col)
    for y in range(73, 84):
        c.p(107, y, WOOD[3])
        c.p(108, y, WOOD[2])
        c.p(117, y, WOOD[2])
        c.p(118, y, WOOD[1])
        for x in range(109, 117):
            c.p(x, y, VOID[0] if y < 78 else VOID[1])
    for x in range(107, 119):
        c.p(x, 73, WOOD[3] if x < 117 else WOOD[2])
        c.p(x, 74, WOOD[1])
        c.p(x, 83, WOOD[3] if x < 117 else WOOD[2])
        c.p(x, 84, WOOD[0])
    bell(c, 108, 75)
    wall_ashlar(c, 47, 134, 130, 50, STONE, seed=22, bw=13, bh=7, moss_rows=9)
    eave_shadow(c, 47, 176, 134, 6)
    for gx in (64, 152):
        chapel_window(c, lt, gx, 140, 10, 20, transom=150, sill='wood', seed=gx)
    door(c, 101, 149, 22, 35, pal=WOOD, frame=STONE, pw=4, seed=23, step=False)
    plinth(c, 45, 184, 134, 6, STONE, seed=24)
    step(c, 96, 127, 184)
    c.outline()
    clip_lights(lt, 'export/png/building-templo-level-1-lights.png')
    return c, lt


def _tower_l2(c: Canvas, ruin: bool):
    """Torre do nível 2 (e da ruína): agulha, cruz, cornija, sineira e fuste até o telhado."""
    if ruin:
        cross(c, 111, 11, 21, 14, arm=2, pal=[(40, 30, 24), BRONZE[0], BRONZE[1], BRONZE[2], BRONZE[3]], tilt=0.22)
    else:
        cross(c, 111, 11, 21, 14, arm=2)
    spire(c, 111.5, 22, 39, 1.6, 14.5, ROOF_SLATE, seed=31)
    cornice(c, 95, 128, 40)
    tower_body(c, 97, 126, 44, 95, seed=32)
    belfry(c, 106, 48, 12, 14, dark_bell=ruin, bell_y=52)
    # Friso onde a torre encontra a cumeeira.
    for x in range(97, 127):
        c.p(x, 74, STONE[4])
        c.p(x, 75, STONE[2])
        c.p(x, 76, STONE[0])
    for x in range(97, 127):
        c.p(x, 95, mul(STONE[0], 0.8))


def templo_2():
    """Nível 2: torre de pedra com sineira de bronze e agulha de escamas, cruz dourada."""
    c, lt = new_pair(W, H)
    roof(c, 73, 129, (45, 27), (178, 196), (78, 32), (145, 191), 'slate', ROOF_SLATE, seed=41)
    _tower_l2(c, False)
    wall_ashlar(c, 35, 130, 154, 54, STONE, seed=42, bw=13, bh=7, moss_rows=9)
    eave_shadow(c, 35, 188, 130, 6)
    for gx in (56, 156):
        chapel_window(c, lt, gx, 136, 10, 24, transom=148, sill='wood', seed=gx)
    voussoirs(c, 111.5, 155.0, 15.5, 19.0, n=11)
    door(c, 99, 145, 26, 39, pal=WOOD, frame=STONE, double=True, arch=10, pw=4, seed=43, step=False)
    plinth(c, 33, 184, 158, 6, STONE, seed=44)
    step(c, 94, 129, 184)
    c.outline()
    clip_lights(lt, 'export/png/building-templo-level-2-lights.png')
    return c, lt


def templo_3():
    """Nível 3: torre alta, contrafortes, quatro janelas (duas atrás dos estandartes roxos)."""
    c, lt = new_pair(W, H)
    roof(c, 65, 121, (35, 15), (188, 208), (72, 20), (151, 203), 'slate', ROOF_SLATE, seed=51)
    # Torre: a agulha sai do quadro em cima, como na 16-bit.
    spire(c, 111.5, 0, 11, 6.2, 14.5, ROOF_SLATE, seed=52)
    cornice(c, 95, 128, 12)
    tower_body(c, 97, 126, 16, 89, seed=53)
    belfry(c, 106, 20, 12, 14, bell_y=24)
    # Nicho com cruz em relevo no fuste da torre.
    for y in range(40, 58):
        for x in range(106, 118):
            if y < 46 and math.hypot(x - 111.5, y - 46) > 6:
                continue
            c.p(x, y, mul(STONE[1], 0.9) if x > 108 else STONE[1])
    for y in range(43, 56):
        c.p(111, y, STONE[4])
        c.p(112, y, STONE[2])
    for x in range(108, 116):
        c.p(x, 47, STONE[4] if x < 112 else STONE[3])
        c.p(x, 48, STONE[2])
    for x in range(105, 119):
        c.p(x, 58, STONE[4])
        c.p(x, 59, STONE[1])
    for x in range(97, 127):
        c.p(x, 66, STONE[4])
        c.p(x, 67, STONE[2])
        c.p(x, 68, STONE[0])
        c.p(x, 89, mul(STONE[0], 0.8))
    wall_ashlar(c, 24, 122, 176, 62, STONE, seed=54, bw=13, bh=7, moss_rows=9)
    eave_shadow(c, 24, 199, 122, 6)
    # Contrafortes nas quinas, com a fresta de sombra junto da parede.
    buttress(c, 12, 21, 124, 189, -1, seed=55)
    buttress(c, 202, 211, 124, 189, 1, seed=56)
    for y in range(122, 190):
        for x in (22, 23, 200, 201):
            c.p(x, y, mul(STONE[0], 0.8) if x in (23, 200) else STONE[1])
    for gx in (36, 68, 148, 180):
        chapel_window(c, lt, gx, 128, 10, 24, transom=140, sill='wood', seed=gx)
    # Estandartes na frente das janelas do meio (apagam a luz onde cobrem).
    b = layer(c)
    t_banner(b, 68, 124, 10, 27, seed=1)
    t_banner(b, 146, 124, 10, 27, seed=2)
    for y in range(b.h):
        for x in range(b.w):
            if b.px[y][x] is not None:
                lt.p(x, y, None)
    merge(c, b, (2, 2, 0.6))
    voussoirs(c, 111.5, 152.0, 15.5, 19.5, n=11)
    door(c, 99, 145, 26, 39, pal=WOOD, frame=STONE, double=True, arch=10, pw=4, seed=57, step=False)
    plinth(c, 22, 184, 180, 6, STONE, seed=58)
    step(c, 94, 129, 185)
    c.outline()
    clip_lights(lt, 'export/png/building-templo-level-3-lights.png')
    return c, lt


def templo_ruin():
    """Ruína: o nível 2 depois do ataque — torre rachada e desabando, telhado aberto."""
    c, _ = new_pair(W, H)
    roof(c, 73, 129, (45, 27), (178, 196), (78, 32), (145, 191), 'slate', ROOF_SLATE, seed=41,
         missing=0.2, dirt=0.85)
    roof_hole(c, 56, 104, 13, 9, ROOF_SLATE, seed=61, rafters=[48, 55, 62])
    roof_hole(c, 166, 110, 11, 8, ROOF_SLATE, seed=62, rafters=[160, 168])
    _tower_l2(c, True)
    # Agulha partida do lado esquerdo e quina da torre desabada: vão escuro e caibros soltos.
    for y in range(26, 62):
        edge = 103 + (y - 26) * 0.25 + 4 * hsh(y // 3, 0, 63)
        if y > 40:
            edge -= (y - 40) * 0.55
        for x in range(90, 110):
            if x < edge and c.g(x, y) is not None:
                if x < 98 or (y < 40 and x < 100):
                    c.p(x, y, None)
                else:
                    c.p(x, y, VOID[0] if y < 44 else VOID[1])
        xe = int(edge)
        if c.g(xe, y) is not None and xe >= 98:
            c.p(xe, y, ROOF_SLATE[3] if y < 40 else STONE[3])
    broken_beam(c, 92, 45, 106, 31)
    broken_beam(c, 99, 54, 104, 41)
    for y in range(44, 62):
        if c.g(98, y) is not None:
            c.p(98, y, STONE[1])
    grime(c, 97, 40, 30, 56, seed=64, k=0.7, moss=0.06)
    crack(c, 120, 62, 26, seed=65)
    crack(c, 101, 66, 18, seed=66)
    scorch(c, 97, 40, 30, 40, seed=67, k=0.6)
    # Pedras da torre desmoronadas sobre o telhado.
    r = layer(c)
    rubble(r, 92, 100, 26, 10, STONE, seed=68)
    rubble(r, 133, 98, 20, 8, STONE, seed=69)
    merge(c, r, (1, 1, 0.7))
    wall_ashlar(c, 35, 130, 154, 54, STONE, seed=42, bw=13, bh=7, moss_rows=14)
    shade_all(c, 35, 130, 154, 54, 0.86)
    grime(c, 35, 130, 154, 54, seed=70, k=0.9, moss=0.1)
    eave_shadow(c, 35, 188, 130, 7)
    crack(c, 84, 131, 30, seed=71)
    crack(c, 140, 131, 22, seed=72)
    crack(c, 180, 140, 26, seed=73)
    for i, gx in enumerate((56, 156)):
        chapel_window(c, None, gx, 136, 10, 24, transom=148 if i else None, sill='wood', broken=True, seed=gx)
        scorch(c, gx - 6, 126, 22, 18, seed=80 + i, k=0.5)
    voussoirs(c, 111.5, 155.0, 15.5, 19.0, n=11)
    ruin_door(c, 99, 145, 26, 39, 10, seed=74)
    scorch(c, 92, 132, 40, 14, seed=75, k=0.55)
    plinth(c, 33, 184, 158, 6, STONE, seed=44)
    grime(c, 33, 184, 158, 6, seed=76, k=0.6, moss=0.15)
    # Entulho e mato na frente.
    r = layer(c)
    broken_beam(r, 30, 186, 58, 176, burnt=True)
    rubble(r, 46, 190, 40, 22, STONE, seed=81, extra=ROOF_SLATE)
    rubble(r, 82, 192, 30, 14, STONE, seed=82)
    rubble(r, 146, 188, 32, 16, STONE, seed=83, extra=ROOF_SLATE)
    rubble(r, 182, 190, 40, 20, STONE, seed=84)
    broken_beam(r, 150, 180, 176, 188, burnt=True)
    weeds(r, 30, 198, 184, seed=85, density=0.35, tall=7)
    merge(c, r, (1, 1, 0.7))
    c.outline()
    return c, None


PIECES = {
    'building/templo/ruin': templo_ruin,
    'building/templo/level-1': templo_1,
    'building/templo/level-2': templo_2,
    'building/templo/level-3': templo_3,
}
