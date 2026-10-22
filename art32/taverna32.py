"""Piloto 32-bit: a taverna (nível 3) redesenhada em 224×192, o dobro do pack 16-bit.

Mesma composição da arte de 112×96 (duas chaminés, telhado de telha em quatro águas,
andar de cima em enxaimel com quatro janelas, floreiras e estandartes, térreo de pedra
com porta em arco, placa da caneca e barris), mas com 4–5 tons por material, telhas e
pedras uma a uma, veio na madeira e reflexo no vidro. Luz de cima e da esquerda.
Uso: python3 -I art32/taverna32.py [prévia.png]"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402
from lib32 import save32  # noqa: E402

W, H = 224, 192
OL = (23, 18, 15)
ROOF = [(66, 24, 28), (100, 38, 40), (136, 56, 54), (168, 76, 68), (200, 108, 92)]
STONE = [(50, 52, 62), (76, 80, 90), (104, 110, 118), (134, 142, 150), (168, 176, 184)]
MORTAR = (44, 44, 50)
WOOD = [(34, 23, 17), (56, 38, 27), (86, 59, 40), (118, 83, 54), (150, 110, 72)]
PLASTER = [(146, 132, 108), (180, 166, 140), (204, 192, 168), (224, 214, 192)]
GREEN = [(30, 52, 34), (46, 78, 48), (68, 106, 62), (98, 138, 82)]
GOLD = [(112, 72, 30), (176, 124, 46), (233, 185, 73), (255, 226, 122)]
IRON = [(24, 24, 30), (42, 42, 50), (66, 68, 78), (104, 108, 120)]
GLASS = [(10, 12, 20), (18, 24, 38), (32, 42, 62), (62, 78, 104)]
FLOWER = [(196, 60, 60), (230, 190, 70), (232, 228, 214), (210, 120, 150)]
BANNER = [(74, 18, 28), (118, 30, 38), (164, 48, 50), (204, 76, 70)]


def hsh(x, y, s=0):
    n = (x * 374761393 + y * 668265263 + s * 1442695041) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def noise(x, y, s, scale):
    xi, yi = math.floor(x / scale), math.floor(y / scale)
    fx, fy = x / scale - xi, y / scale - yi
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = hsh(xi, yi, s) * (1 - sx) + hsh(xi + 1, yi, s) * sx
    b = hsh(xi, yi + 1, s) * (1 - sx) + hsh(xi + 1, yi + 1, s) * sx
    return a * (1 - sy) + b * sy


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def mul(c, k):
    return tuple(max(0, min(255, round(v * k))) for v in c[:3])


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def p(self, x, y, c):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h and c is not None:
            self.px[y][x] = tuple(c[:3])

    def g(self, x, y):
        return self.px[y][x] if 0 <= x < self.w and 0 <= y < self.h else None

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.p(xx, yy, c)

    def shade(self, x, y, k):
        c = self.g(x, y)
        if c:
            self.px[y][x] = mul(c, k)

    def image(self):
        im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0))
        for y in range(self.h):
            for x in range(self.w):
                if self.px[y][x]:
                    im.putpixel((x, y), self.px[y][x] + (255,))
        return im


# ── peças ────────────────────────────────────────────────────────────────

def bricks(c, x0, y0, w, h, ramp, bw=7, bh=4, seed=0, top_light=True):
    """Tijolo a tijolo, com junta escura, topo claro e base escura; tom por tijolo."""
    for y in range(y0, y0 + h):
        ly = y - y0
        row = ly // bh
        off = (bw // 2) if row % 2 else 0
        for x in range(x0, x0 + w):
            lx = x - x0 + off
            bx, by = lx % bw, ly % bh
            if by == bh - 1 or bx == bw - 1:
                c.p(x, y, MORTAR)
                continue
            tone = 0.9 + 0.2 * hsh(lx // bw, row, seed)
            col = ramp[2]
            if by == 0 and top_light:
                col = ramp[3]
            elif by == bh - 2:
                col = ramp[1]
            elif bx == 0:
                col = mix(ramp[2], ramp[3], 0.5)
            c.p(x, y, mul(col, tone * (0.96 + 0.08 * noise(x, y, seed + 1, 2))))


def chimney(c, x0, top, w, bottom):
    bricks(c, x0, top + 6, w, bottom - top - 6, STONE, bw=7, bh=4, seed=3)
    # Sombra do lado direito.
    for y in range(top + 6, bottom):
        for x in range(x0 + w - 3, x0 + w):
            c.shade(x, y, 0.78)
    # Capa da chaminé e boca escura.
    c.rect(x0 - 2, top, w + 4, 6, STONE[2])
    c.rect(x0 - 2, top, w + 4, 2, STONE[4])
    c.rect(x0 - 2, top + 5, w + 4, 1, STONE[0])
    c.rect(x0 + 3, top + 1, w - 6, 2, (20, 18, 20))


def roof(c, x0, y0, w, h, top_in):
    """Telhado de quatro águas: frente em telhas de 8×6 desencontradas, águas laterais mais escuras."""
    for j in range(h):
        y = y0 + j
        t = j / max(h - 1, 1)
        inset = round(top_in * (1 - t))
        side = round(inset * 0.35)
        for x in range(x0 + side, x0 + w - side):
            lx = x - x0
            front = x0 + inset <= x < x0 + w - inset
            course = j // 6
            ly = j % 6
            off = 4 if course % 2 else 0
            sx = (lx + off) % 8
            tile = (lx + off) // 8
            if ly == 0:
                col = ROOF[4] if t < 0.3 else ROOF[3]
            elif ly <= 3:
                col = mix(ROOF[3], ROOF[2], (ly - 1) / 2)
            elif ly == 4:
                col = ROOF[1]
            else:
                col = ROOF[0]
            # Junta e ponta arredondada de cada telha.
            if sx == 7 and 1 <= ly <= 4:
                col = ROOF[0]
            if ly >= 4 and sx in (0, 7):
                col = ROOF[0]
            k = 0.9 + 0.18 * hsh(tile, course, 11)
            col = mul(col, k)
            if hsh(tile, course, 12) < 0.05 and 1 <= ly <= 3:
                col = mix(col, GREEN[2], 0.55)  # telha com musgo
            if not front:
                col = mul(col, 0.72 if x < x0 + w / 2 else 0.55)
            c.p(x, y, col)
    # Cumeeira: telhas de capa, com brilho.
    c.rect(x0 + top_in - 2, y0 - 2, w - 2 * top_in + 4, 4, ROOF[2])
    c.rect(x0 + top_in - 2, y0 - 2, w - 2 * top_in + 4, 1, ROOF[4])
    for x in range(x0 + top_in - 2, x0 + w - top_in + 2, 6):
        c.p(x, y0 - 1, ROOF[0])
        c.p(x, y0, ROOF[0])
    # Beiral: borda escura e a sombra que ele joga na parede.
    c.rect(x0, y0 + h - 1, w, 1, OL)
    c.rect(x0, y0 + h - 2, w, 1, ROOF[0])


def timber_floor(c, x0, y0, w, h):
    """Enxaimel: postes a cada 28 px, travessa no meio, escoras nos painéis, reboco manchado."""
    posts = list(range(x0, x0 + w, 28)) + [x0 + w - 4]
    mid = y0 + h // 2 - 1
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            v = noise(x, y, 21, 5)
            col = mix(PLASTER[1], PLASTER[3], v)
            if hsh(x, y, 22) < 0.03:
                col = PLASTER[0]
            c.p(x, y, col)
    # Rachaduras finas no reboco.
    for k in range(10):
        cx = x0 + int(hsh(k, 1, 23) * w)
        cy = y0 + 4 + int(hsh(k, 2, 23) * (h - 8))
        for i in range(int(3 + hsh(k, 3, 23) * 5)):
            c.p(cx + i, cy + (i // 2) * (1 if hsh(k, 4, 23) < 0.5 else -1), PLASTER[0])

    def beam(x, y, bw, bh, vertical):
        for yy in range(y, y + bh):
            for xx in range(x, x + bw):
                a = (xx - x) if vertical else (yy - y)
                n = bw if vertical else bh
                col = WOOD[3] if a == 0 else (WOOD[1] if a == n - 1 else WOOD[2])
                along = yy if vertical else xx
                across = xx if vertical else yy
                if hsh(across, 0, 24) < 0.3 and noise(along, across, 25, 4) > 0.4 and 0 < a < n - 1:
                    col = WOOD[1]
                c.p(xx, yy, col)

    # Escoras em X nos painéis dos cantos e diagonais nos outros.
    for i, px in enumerate(posts[:-1]):
        nx = posts[i + 1]
        if (i % 2) == 0:
            for t in range(nx - px - 4):
                y = mid + 4 + round(t * (h - (mid - y0) - 8) / max(1, nx - px - 4))
                for d in range(3):
                    c.p(px + 4 + t, y + d - 1, WOOD[2] if d == 1 else (WOOD[3] if d == 0 else WOOD[1]))
    beam(x0, y0, w, 4, False)
    beam(x0, mid, w, 4, False)
    beam(x0, y0 + h - 4, w, 4, False)
    for px in posts:
        beam(px, y0, 4, h, True)
    # Pinos de madeira nas juntas.
    for px in posts:
        for yy in (y0 + 1, mid + 1, y0 + h - 3):
            c.p(px + 1, yy, WOOD[0])
            c.p(px + 2, yy + 1, WOOD[4])
    # Sombra do beiral nas primeiras linhas.
    for y in range(y0, y0 + 5):
        for x in range(x0, x0 + w):
            c.shade(x, y, 0.62 + 0.07 * (y - y0))


def window(c, cx, top, w, h, shutters=True, box=True, lights=None):
    x0 = cx - w // 2
    # Moldura.
    c.rect(x0 - 2, top - 2, w + 4, h + 4, WOOD[1])
    c.rect(x0 - 2, top - 2, w + 4, 1, WOOD[3])
    c.rect(x0 - 2, top - 2, 1, h + 4, WOOD[3])
    # Vidro com degradê, reflexo e cruzeta.
    for y in range(top, top + h):
        for x in range(x0, x0 + w):
            t = ((x - x0) / w + (y - top) / h) / 2
            col = mix(GLASS[2], GLASS[0], t)
            if 0 <= (x - x0) - (y - top) * 0.6 - 2 <= 1 and (y - top) < h / 2:
                col = GLASS[3]
            c.p(x, y, col)
            if lights is not None:
                lights.p(x, y, mix((255, 222, 140), (236, 150, 64), min(1, abs(t - 0.4) * 1.6)))
    mx, my = cx - 1, top + h // 2 - 1
    c.rect(mx, top, 2, h, WOOD[2])
    c.rect(x0, my, w, 2, WOOD[2])
    c.rect(mx, top, 1, h, WOOD[3])
    if lights is not None:
        for y in range(top, top + h):
            lights.p(mx, y, None)
            lights.px[y][mx] = None
            lights.px[y][mx + 1] = None
        for x in range(x0, x0 + w):
            lights.px[my][x] = None
            lights.px[my + 1][x] = None
    if shutters:
        for sx0 in (x0 - 9, x0 + w + 2):
            for y in range(top - 1, top + h + 1):
                for x in range(sx0, sx0 + 7):
                    lx = x - sx0
                    col = GREEN[1] if lx % 2 else GREEN[2]
                    if lx == 0:
                        col = GREEN[3]
                    if lx == 6:
                        col = GREEN[0]
                    if (y - top) in (2, h - 3):
                        col = GREEN[0]
                    c.p(x, y, col)
    if box:
        by = top + h + 2
        c.rect(x0 - 3, by, w + 6, 5, WOOD[2])
        c.rect(x0 - 3, by, w + 6, 1, WOOD[4])
        c.rect(x0 - 3, by + 4, w + 6, 1, WOOD[0])
        for i, x in enumerate(range(x0 - 2, x0 + w + 2, 3)):
            c.p(x, by - 1, GREEN[2])
            c.p(x + 1, by - 2, GREEN[3])
            c.p(x, by - 2, FLOWER[i % 4])
            c.p(x + 1, by - 3, mul(FLOWER[i % 4], 1.15))
        for i in range(4):
            c.p(x0 + 2 + i * 5, by + 5, GREEN[1])
            c.p(x0 + 2 + i * 5, by + 6, GREEN[0])


def stone_floor(c, x0, y0, w, h):
    """Térreo de cantaria: blocos de largura variada, chanfro claro em cima, musgo embaixo."""
    y = y0
    row = 0
    while y < y0 + h:
        bh = 7 if row % 2 == 0 else 6
        x = x0 - int(hsh(row, 0, 31) * 8)
        while x < x0 + w:
            bw = 10 + int(hsh(x, row, 32) * 8)
            tone = 0.88 + 0.22 * hsh(x, row, 33)
            for yy in range(y, min(y + bh, y0 + h)):
                for xx in range(max(x, x0), min(x + bw, x0 + w)):
                    ly, lx = yy - y, xx - x
                    if ly == bh - 1 or lx == bw - 1:
                        col = MORTAR
                    elif ly == 0:
                        col = STONE[4] if lx < bw - 3 else STONE[3]
                    elif lx == 0:
                        col = STONE[3]
                    elif ly == bh - 2 or lx == bw - 2:
                        col = STONE[1]
                    else:
                        col = mix(STONE[2], STONE[3], noise(xx, yy, 34, 2) * 0.6)
                    if col != MORTAR:
                        col = mul(col, tone)
                        if yy > y0 + h - 9 and hsh(xx, yy, 35) < 0.12:
                            col = mix(col, GREEN[1], 0.6)
                    c.p(xx, yy, col)
            x += bw
        y += bh
        row += 1


def door(c, cx, bottom, w, h):
    x0 = cx - w // 2
    top = bottom - h
    r = w // 2 + 4
    # Arco de pedra com aduelas e fecho.
    for y in range(top - 6, top + r):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x - cx, (y - (top + r - 2)) * 1.0)
            if r - 5 <= d <= r and y <= top + r - 2:
                ang = math.atan2(y - (top + r - 2), x - cx)
                seg = int((ang + math.pi) / (math.pi / 7))
                col = STONE[3] if seg % 2 else STONE[2]
                if d > r - 1:
                    col = STONE[1]
                c.p(x, y, col)
    c.rect(cx - 3, top - 6, 7, 6, STONE[4])
    c.rect(cx - 3, top - 1, 7, 1, STONE[1])
    # Folhas da porta: tábuas em pé com veio, ferragens e argola.
    for y in range(top, bottom):
        for x in range(x0, x0 + w):
            d = math.hypot(x - cx, (y - (top + r - 2)))
            if y < top + r - 2 and d > r - 5:
                continue
            lx = x - x0
            plank = lx % 5
            col = WOOD[2] if plank not in (0, 4) else (WOOD[3] if plank == 0 else WOOD[0])
            if hsh(lx // 5, y // 3, 41) < 0.2 and plank in (1, 2, 3):
                col = WOOD[1]
            if lx == w // 2 or lx == w // 2 - 1:
                col = WOOD[0]
            c.p(x, y, col)
    for yy in (top + 10, bottom - 12):
        c.rect(x0, yy, w, 2, IRON[2])
        c.rect(x0, yy, w, 1, IRON[3])
        for x in range(x0 + 2, x0 + w - 1, 5):
            c.p(x, yy, GOLD[2])
    for hx in (cx - 5, cx + 4):
        c.p(hx, bottom - 24, GOLD[3])
        c.p(hx, bottom - 23, GOLD[1])
    # Soleira.
    c.rect(x0 - 4, bottom, w + 8, 3, STONE[3])
    c.rect(x0 - 4, bottom, w + 8, 1, STONE[4])


def sign(c, x, y):
    c.rect(x, y, 20, 2, IRON[2])
    c.rect(x, y, 20, 1, IRON[3])
    c.p(x + 4, y + 2, IRON[1])
    c.p(x + 15, y + 2, IRON[1])
    bx, by = x + 2, y + 4
    c.rect(bx, by, 18, 16, WOOD[2])
    c.rect(bx, by, 18, 1, WOOD[4])
    c.rect(bx, by + 15, 18, 1, WOOD[0])
    c.rect(bx, by, 1, 16, WOOD[3])
    c.rect(bx + 17, by, 1, 16, WOOD[1])
    # Caneca dourada pintada.
    c.rect(bx + 5, by + 4, 7, 8, GOLD[2])
    c.rect(bx + 5, by + 4, 2, 8, GOLD[3])
    c.rect(bx + 10, by + 4, 2, 8, GOLD[1])
    c.rect(bx + 5, by + 3, 7, 2, (240, 236, 220))
    c.rect(bx + 12, by + 6, 2, 1, GOLD[1])
    c.rect(bx + 13, by + 6, 1, 4, GOLD[1])
    c.rect(bx + 12, by + 9, 2, 1, GOLD[1])


def lantern(c, x, y, lights):
    c.rect(x + 2, y - 4, 2, 4, IRON[1])
    c.rect(x, y, 6, 2, IRON[2])
    c.rect(x, y + 2, 6, 7, IRON[1])
    c.rect(x + 1, y + 3, 4, 5, (255, 200, 110))
    c.p(x + 1, y + 3, (255, 240, 200))
    c.rect(x, y + 9, 6, 1, IRON[2])
    for yy in range(y + 3, y + 8):
        for xx in range(x + 1, x + 5):
            lights.p(xx, yy, (255, 214, 130))


def barrel(c, x, bottom):
    h, w = 18, 14
    for y in range(bottom - h, bottom):
        t = (y - (bottom - h)) / h
        bulge = round(math.sin(t * math.pi) * 1.5)
        for xx in range(x - bulge, x + w + bulge):
            lx = (xx - x + bulge) / (w + 2 * bulge)
            col = WOOD[3] if lx < 0.3 else (WOOD[2] if lx < 0.75 else WOOD[1])
            if (xx - x) % 4 == 0:
                col = WOOD[1]
            c.p(xx, y, col)
    for hy in (bottom - h + 2, bottom - 4):
        for xx in range(x - 1, x + w + 1):
            c.p(xx, hy, IRON[2] if xx < x + w // 2 else IRON[1])
    c.rect(x + 1, bottom - h, w - 2, 1, WOOD[4])


def banner(c, x, y, h):
    c.rect(x - 1, y - 2, 10, 2, WOOD[2])
    for yy in range(y, y + h):
        for xx in range(x, x + 8):
            col = BANNER[2] if xx - x < 6 else BANNER[1]
            if xx == x:
                col = BANNER[3]
            if yy > y + h - 4 and abs(xx - (x + 3.5)) < (yy - (y + h - 4)) * 1.2:
                continue
            c.p(xx, yy, col)
    cx, cy = x + 3, y + h // 2 - 2
    for (dx, dy) in ((0, -2), (-2, 0), (2, 0), (0, 2), (0, 0)):
        c.p(cx + dx, cy + dy, GOLD[3] if (dx, dy) == (0, 0) else GOLD[2])


def outline(c):
    add = []
    for y in range(c.h):
        for x in range(c.w):
            if c.px[y][x] is not None:
                continue
            if any(c.g(x + dx, y + dy) not in (None, OL) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                add.append((x, y))
    for x, y in add:
        c.px[y][x] = OL


def taverna():
    c = Canvas(W, H)
    lights = Canvas(W, H)
    base = 186
    chimney(c, 24, 18, 18, 64)
    chimney(c, 182, 28, 16, 64)
    roof(c, 4, 36, 216, 66, 44)
    timber_floor(c, 12, 102, 200, 38)
    for cx in (30, 82, 142, 194):
        window(c, cx, 108, 18, 18, shutters=True, box=True, lights=lights)
    banner(c, 3, 106, 26)
    banner(c, 213, 106, 26)
    stone_floor(c, 14, 140, 196, base - 140)
    for cx in (34, 70, 160, 192):
        # Verga de pedra em cima e peitoril embaixo.
        c.rect(cx - 13, 145, 26, 4, STONE[3])
        c.rect(cx - 13, 145, 26, 1, STONE[4])
        c.rect(cx - 13, 148, 26, 1, STONE[1])
        window(c, cx, 151, 20, 18, shutters=False, box=False, lights=lights)
        c.rect(cx - 12, 171, 24, 3, STONE[3])
        c.rect(cx - 12, 171, 24, 1, STONE[4])
    door(c, 112, base, 30, 40)
    sign(c, 124, 146)
    lantern(c, 92, 152, lights)
    # Rodapé de pedra.
    c.rect(10, base, 204, 6, STONE[2])
    c.rect(10, base, 204, 1, STONE[4])
    c.rect(10, base + 5, 204, 1, STONE[0])
    barrel(c, 0, 191)
    barrel(c, 210, 191)
    outline(c)
    return c.image(), lights.image()


if __name__ == '__main__':
    img, lit = taverna()
    save32(img, 'export/png/building-taverna-level-3.png')
    save32(lit, 'export/png/building-taverna-level-3-lights.png')
    if len(sys.argv) > 1:
        prev = Image.new('RGBA', (W * 2 + 8, H), (60, 74, 56, 255))
        prev.alpha_composite(img, (0, 0))
        dark = Image.new('RGBA', img.size, (20, 26, 40, 150))
        night = Image.alpha_composite(img.copy(), Image.composite(dark, Image.new('RGBA', img.size, (0, 0, 0, 0)), img.split()[3]))
        night.alpha_composite(lit)
        prev.alpha_composite(night, (W + 8, 0))
        prev.resize((prev.width * 3, prev.height * 3), Image.NEAREST).save(sys.argv[1])
