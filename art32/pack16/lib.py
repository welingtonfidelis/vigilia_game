"""Mini biblioteca de pixel art para o pack Vigilia (PNG 1x, sem anti-alias)."""
from PIL import Image
import math
import math

PAL = {
    'noite': (7, 6, 10), 'ol': (23, 18, 15), 'wd0': (42, 30, 22), 'wd1': (90, 62, 42),
    'wd2': (138, 98, 58), 'fe0': (42, 42, 48), 'st1': (106, 112, 120), 'st2': (154, 163, 171),
    'sk1': (224, 176, 136), 'sk0': (176, 128, 96), 'hbr': (106, 68, 34), 'hbl': (216, 176, 96),
    'gr0': (58, 90, 58), 'gr1': (90, 122, 74), 'rd1': (138, 58, 58), 'rd2': (176, 74, 74),
    'bl1': (58, 90, 138), 'bl2': (74, 122, 200), 'pu': (90, 74, 106), 'wa1': (47, 122, 120),
    'wa2': (122, 200, 192), 'au1': (200, 160, 80), 'au2': (233, 192, 73), 'bone': (232, 224, 208),
    'cloth': (170, 182, 192), 'lea': (106, 74, 42), 'me': (74, 84, 96), 'grass': (74, 106, 58),
    'aby': (106, 42, 138), 'ember': (255, 138, 42), 'blood': (154, 42, 42), 'white': (250, 246, 234),
    # extras (desvio justificado: sombras de telhado, pele escura, abismo doentio, palha)
    'rd0': (96, 38, 40), 'bl0': (38, 56, 92), 'aby0': (48, 20, 70), 'sick': (122, 150, 64),
    'skd1': (156, 104, 72), 'skd0': (112, 72, 50), 'gr2': (112, 146, 84), 'au0': (150, 112, 52),
    'pu2': (130, 104, 150), 'st0': (78, 82, 92), 'plaster': (204, 192, 168), 'plaster0': (160, 146, 124), 'wa0': (30, 84, 86),
}
EXTRAS = ['wa0', 'rd0', 'bl0', 'aby0', 'sick', 'skd1', 'skd0', 'gr2', 'au0', 'pu2', 'st0', 'plaster', 'plaster0']


def hsh(x, y, s=0):
    n = (x * 374761393 + y * 668265263 + s * 1442695041) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


class C:
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.px = [[None] * w for _ in range(h)]

    def ok(s, x, y):
        return 0 <= x < s.w and 0 <= y < s.h

    def p(s, x, y, c):
        x, y = int(x), int(y)
        if s.ok(x, y):
            s.px[y][x] = c

    def g(s, x, y):
        return s.px[y][x] if s.ok(x, y) else None

    def r(s, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                s.p(xx, yy, c)

    def hl(s, x, y, w, c):
        s.r(x, y, w, 1, c)

    def vl(s, x, y, h, c):
        s.r(x, y, 1, h, c)

    def frame(s, x, y, w, h, c):
        s.hl(x, y, w, c); s.hl(x, y + h - 1, w, c); s.vl(x, y, h, c); s.vl(x + w - 1, y, h, c)

    def disk(s, cx, cy, rad, c):
        for yy in range(int(cy - rad - 1), int(cy + rad + 2)):
            for xx in range(int(cx - rad - 1), int(cx + rad + 2)):
                if (xx - cx) ** 2 + (yy - cy) ** 2 <= rad * rad:
                    s.p(xx, yy, c)

    def ell(s, cx, cy, rx, ry, c):
        for yy in range(int(cy - ry - 1), int(cy + ry + 2)):
            for xx in range(int(cx - rx - 1), int(cx + rx + 2)):
                if ((xx - cx) / max(rx, .01)) ** 2 + ((yy - cy) / max(ry, .01)) ** 2 <= 1.0:
                    s.p(xx, yy, c)

    def line(s, x0, y0, x1, y1, c):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for i in range(n):
            t = i / max(n - 1, 1)
            s.p(round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), c)

    def tmpl(s, rows, cmap, ox=0, oy=0, flip=False):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch == '.' or ch == ' ':
                    continue
                c = cmap.get(ch, ch)
                if c is None:
                    continue
                x = (len(row) - 1 - i) if flip else i
                if c == '_':
                    s.p(ox + x, oy + j, None)
                else:
                    s.p(ox + x, oy + j, c)

    def outline(s, c='ol', diag=False):
        add = []
        for y in range(s.h):
            for x in range(s.w):
                if s.px[y][x] is None:
                    nb = [(1, 0), (-1, 0), (0, 1), (0, -1)]
                    if diag:
                        nb += [(1, 1), (-1, -1), (1, -1), (-1, 1)]
                    for dx, dy in nb:
                        v = s.g(x + dx, y + dy)
                        if v is not None and v != c:
                            add.append((x, y)); break
        for x, y in add:
            s.px[y][x] = c

    def paste(s, o, ox, oy):
        for y in range(o.h):
            for x in range(o.w):
                v = o.px[y][x]
                if v is not None:
                    s.p(ox + x, oy + y, v)

    def img(s):
        im = Image.new('RGBA', (s.w, s.h), (0, 0, 0, 0))
        pp = im.load()
        for y in range(s.h):
            for x in range(s.w):
                v = s.px[y][x]
                if v is not None:
                    pp[x, y] = PAL[v] if len(PAL[v]) == 4 else PAL[v] + (255,)
        return im

    def save(s, path):
        s.img().save(path)


SHADE_DOWN = {
    'wd2': 'wd1', 'wd1': 'wd0', 'wd0': 'ol', 'st2': 'st1', 'st1': 'st0', 'st0': 'fe0', 'rd2': 'rd1',
    'rd1': 'rd0', 'rd0': 'wd0', 'bl2': 'bl1', 'bl1': 'bl0', 'au2': 'au1', 'au1': 'au0', 'au0': 'wd1',
    'plaster': 'plaster0', 'plaster0': 'st0', 'me': 'fe0', 'gr1': 'gr0', 'gr2': 'gr1', 'cloth': 'st1',
    'bone': 'plaster0', 'lea': 'wd0', 'wa2': 'wa1', 'pu2': 'pu', 'pu': 'fe0', 'hbl': 'au1', 'hbr': 'wd0',
}


def darker(c):
    return SHADE_DOWN.get(c, c)


def rockcell(x, y, s=10, seed=0, dark=False):
    """Rocha natural: celulas de Voronoi com luz de cima/esquerda e fendas escuras."""
    gx, gy = x // s, y // s
    pts = []
    for j in range(gy - 1, gy + 2):
        for i in range(gx - 1, gx + 2):
            px = i * s + hsh(i, j, seed) * s
            py = j * s + hsh(i, j, seed + 1) * s
            pts.append(((x - px) ** 2 + (y - py) ** 2, px, py, i, j))
    pts.sort()
    d1, px, py, ci, cj = pts[0]
    d2 = pts[1][0]
    if math.sqrt(d2) - math.sqrt(d1) < 1.1:
        return 'fe0'
    v = (-(x - px) - (y - py)) / s
    tone = hsh(ci, cj, seed + 2)
    if dark or tone < 0.3:
        hi, mid, lo = 'st1', 'st0', 'fe0'
    else:
        hi, mid, lo = 'st2', 'st1', 'st0'
    if v > 0.35:
        return hi
    if v < -0.35:
        return lo
    if hsh(x, y, seed + 3) < 0.04:
        return lo
    return mid


def cellrock(x, y, s=8, seed=0, pal=('wd2', 'wd1', 'wd0', 'ol')):
    """Rocha em celulas com paleta escolhida (hi, mid, lo, fenda)."""
    hi, mid, lo, crack = pal
    gx, gy = x // s, y // s
    pts = []
    for j in range(gy - 1, gy + 2):
        for i in range(gx - 1, gx + 2):
            px = i * s + hsh(i, j, seed) * s
            py = j * s + hsh(i, j, seed + 1) * s
            pts.append(((x - px) ** 2 + (y - py) ** 2, px, py))
    pts.sort()
    d1, px, py = pts[0]
    if math.sqrt(pts[1][0]) - math.sqrt(d1) < 1.0:
        return crack
    v = (-(x - px) * 0.6 - (y - py)) / s
    if v > 0.3:
        return hi
    if v < -0.4:
        return lo
    return mid
