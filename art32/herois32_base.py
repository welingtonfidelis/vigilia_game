"""Base dos heróis 32-bit: grade de peças do hd24, rotação limpa e desenho procedural.

As peças dos modelos detalhados (art32/pack16/hd24.py) desenham numa grade de chaves de
paleta (lib.C). Aqui ficam as ferramentas para animar essas peças sem ampliar nada:
  · copiar, cortar, deslocar e contornar camadas;
  · RotSprite (Scale2x três vezes + amostra no centro) para inclinar o corpo sem
    quebrar as linhas, com a luz das peças girada ao contrário para continuar vindo de
    cima-esquerda depois do giro;
  · membros e armas desenhados em coordenadas locais (u ao longo da peça, v de lado), com
    sombreamento pela normal: a arma gira em qualquer ângulo sem serrilhar;
  · rastro do golpe, faísca de impacto, clarão de acerto e poeira.
"""
import contextlib
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
for _p in (os.path.join(HERE, 'pack16'), HERE):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import hd24 as HD  # noqa: E402
from lib import C, PAL, hsh  # noqa: E402

W, H = HD.W, HD.H

# A fórmula de hd24.shade (v = −(n·l)) com l = (−0.6, −0.8) acende o lado de baixo-direita,
# ao contrário do que dizem o docstring do hd24, o README e os brilhos feitos à mão das
# peças (quilha clara à esquerda, borda esquerda do escudo clara). Aqui a luz é virada só
# em tempo de execução (o arquivo do hd24 não muda): tudo dos heróis 32-bit fica com luz
# de cima-esquerda, como as outras peças 32-bit.
_HD_SHADE = HD.shade


def _shade_top_left(c, mask, pal, lx=-0.6, ly=-0.8, spec=True):
    _HD_SHADE(c, mask, pal, -lx, -ly, spec)


if getattr(HD.shade, '__name__', '') != '_shade_top_left':
    HD.shade = _shade_top_left
LIGHT = (0.6, 0.8)          # vetor da fórmula v = −(n·l): luz de cima-esquerda

# tons extras (rastro, clarão, sangue, fumaça)
PAL.update({
    'fx0': (150, 156, 168), 'fx1': (198, 206, 214), 'fx2': (232, 236, 240), 'fx3': (255, 255, 255),
    'bl0': (90, 20, 24), 'bl1': (140, 30, 34), 'du0': (92, 84, 72), 'du1': (128, 118, 100), 'du2': (166, 156, 136),
    'ho0': (176, 140, 60), 'ho1': (240, 210, 120), 'ho2': (255, 244, 196),
})


# ── grade ────────────────────────────────────────────────────────────────

def blank(w=W, h=H):
    return C(w, h)


def copy(c):
    o = C(c.w, c.h)
    o.px = [row[:] for row in c.px]
    return o


def raw(fn, t=0):
    c = C(W, H)
    fn(c, t)
    return c


def outlined(c, col='ol'):
    o = copy(c)
    o.outline(col)
    return o


def paste(dst, src, dx=0, dy=0):
    for y in range(src.h):
        row = src.px[y]
        for x in range(src.w):
            v = row[x]
            if v is not None:
                dst.p(x + dx, y + dy, v)


def shifted(c, dx, dy):
    o = C(c.w, c.h)
    paste(o, c, dx, dy)
    return o


def keep(c, fn):
    """Só os pixels (x, y) em que fn(x, y) é verdadeiro."""
    o = C(c.w, c.h)
    for y in range(c.h):
        for x in range(c.w):
            if c.px[y][x] is not None and fn(x, y):
                o.px[y][x] = c.px[y][x]
    return o


def bbox(c):
    pts = [(x, y) for y in range(c.h) for x in range(c.w) if c.px[y][x] is not None]
    if not pts:
        return None
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def recolor(c, mapping, region=None):
    for y in range(c.h):
        for x in range(c.w):
            v = c.px[y][x]
            if v in mapping and (region is None or region(x, y)):
                c.px[y][x] = mapping[v]


def to_image(c):
    return c.img()


# ── luz e rosto durante a renderização das peças ─────────────────────────

@contextlib.contextmanager
def patched(light_deg=0.0, hurt=False):
    """Gira a luz das peças (para continuar de cima-esquerda depois de um giro de
    light_deg graus no sentido da tela) e/ou fecha os olhos do rosto (hurt)."""
    orig_shade, orig_face = HD.shade, HD.face_hd
    a = math.radians(-light_deg)
    ca, sa = math.cos(a), math.sin(a)

    def shade(c, mask, pal, lx=-0.6, ly=-0.8, spec=True):
        orig_shade(c, mask, pal, lx * ca - ly * sa, lx * sa + ly * ca, spec)

    def face(*args, **kw):
        if hurt:
            kw['hurt'] = True
        return orig_face(*args, **kw)

    if light_deg:
        HD.shade = shade
    HD.face_hd = face
    try:
        yield
    finally:
        HD.shade, HD.face_hd = orig_shade, orig_face


# ── RotSprite ─────────────────────────────────────────────────────────────

def _scale2x(px, w, h):
    out = [[None] * (w * 2) for _ in range(h * 2)]

    def g(x, y):
        return px[y][x] if 0 <= x < w and 0 <= y < h else None
    for y in range(h):
        for x in range(w):
            P = px[y][x]
            A, B, Cc, D = g(x, y - 1), g(x + 1, y), g(x - 1, y), g(x, y + 1)
            if Cc == A and Cc != D and A != B:
                out[2 * y][2 * x] = A
            else:
                out[2 * y][2 * x] = P
            out[2 * y][2 * x + 1] = B if (A == B and A != Cc and B != D) else P
            out[2 * y + 1][2 * x] = Cc if (D == Cc and D != B and Cc != A) else P
            out[2 * y + 1][2 * x + 1] = D if (B == D and B != A and D != Cc) else P
    return out


def rotate(c, deg, pivot, to=None, w=W, h=H, scale=(1.0, 1.0)):
    """Gira a camada c em deg graus (positivo = horário na tela) em torno de pivot,
    que vai parar em `to`. RotSprite: 8× por Scale2x e amostra no centro do pixel.
    scale encurta a peça nos eixos dela antes do giro (escorço)."""
    bb = bbox(c)
    out = C(w, h)
    if bb is None:
        return out
    if to is None:
        to = pivot
    x0, y0, x1, y1 = bb
    x0, y0 = max(0, x0 - 1), max(0, y0 - 1)
    x1, y1 = min(c.w - 1, x1 + 1), min(c.h - 1, y1 + 1)
    sw, sh = x1 - x0 + 1, y1 - y0 + 1
    px = [c.px[y][x0:x1 + 1] for y in range(y0, y1 + 1)]
    big, bw, bh = px, sw, sh
    for _ in range(3):
        big = _scale2x(big, bw, bh)
        bw, bh = bw * 2, bh * 2
    if abs(deg % 90) < 1e-9 and scale == (1.0, 1.0):
        k = int(round(deg / 90)) % 4
        for y in range(h):
            for x in range(w):
                dx, dy = x - to[0], y - to[1]
                # inverso do giro horário de k·90°
                for _ in range(k):
                    dx, dy = dy, -dx
                sx, sy = pivot[0] + dx, pivot[1] + dy
                ix, iy = int(round(sx)) - x0, int(round(sy)) - y0
                if 0 <= ix < sw and 0 <= iy < sh:
                    v = px[iy][ix]
                    if v is not None:
                        out.px[y][x] = v
        return out
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    for y in range(h):
        for x in range(w):
            dx, dy = x + 0.5 - (to[0] + 0.5), y + 0.5 - (to[1] + 0.5)
            sx = (ca * dx + sa * dy) / scale[0] + pivot[0] + 0.5
            sy = (-sa * dx + ca * dy) / scale[1] + pivot[1] + 0.5
            bx, by = int(math.floor((sx - x0) * 8)), int(math.floor((sy - y0) * 8))
            if 0 <= bx < bw and 0 <= by < bh:
                v = big[by][bx]
                if v is not None:
                    out.px[y][x] = v
    return out


def reoutline(c):
    """Refaz o contorno de fora (depois de um giro): tira o OL que encosta no vazio e
    contorna de novo; as linhas de dentro ficam."""
    o = copy(c)
    for y in range(c.h):
        for x in range(c.w):
            if c.px[y][x] == 'ol' and any(c.g(x + dx, y + dy) is None for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o.px[y][x] = None
    # pixels soltos de contorno que sobraram sozinhos
    for y in range(c.h):
        for x in range(c.w):
            if o.px[y][x] == 'ol' and all(o.g(x + dx, y + dy) in (None, 'ol') for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                o.px[y][x] = None
    o.outline()
    return o


def fit(c, w=W, h=H, bottom=62, cx=24, margin=1):
    """Põe o conteúdo de c (qualquer tamanho) num quadro w×h: base em `bottom`,
    centrado em cx sem passar da margem. Devolve (quadro, cabe)."""
    bb = bbox(c)
    out = C(w, h)
    if bb is None:
        return out, True
    x0, y0, x1, y1 = bb
    dx = round(cx - (x0 + x1) / 2)
    dx = max(margin - x0, min(w - 1 - margin - x1, dx))
    dy = bottom - y1
    paste(out, keep(c, lambda x, y: True), dx, dy)
    ok = (x1 - x0) <= w - 1 - 2 * margin and y0 + dy >= 0
    return out, ok


def rot_pt(p, deg, pivot, to=None):
    to = to or pivot
    a = math.radians(deg)
    dx, dy = p[0] - pivot[0], p[1] - pivot[1]
    return (to[0] + dx * math.cos(a) - dy * math.sin(a), to[1] + dx * math.sin(a) + dy * math.cos(a))


# ── sombreamento pela normal ───────────────────────────────────────────────

def tone(pal, nx, ny, spec=True, light=LIGHT, bias=0.15):
    v = -(nx * light[0] + ny * light[1]) * 0.7 + bias
    n = len(pal)
    i = max(0, min(n - 1, int((v + 1) / 2 * n + 0.15)))
    if not spec and i == n - 1:
        i = n - 2
    return pal[i]


class Prim:
    """Primitiva em coordenadas locais (u ao longo da peça, v de lado).

    test(u, v) diz se o ponto é da peça; nrm(u, v) dá a normal local (para a luz);
    color(u, v) pode forçar uma chave (fio de lâmina, anel); flat pinta chapado.
    bill: círculo que não sofre escorço (bola da maça)."""

    def __init__(self, test, nrm, ext, pal=None, spec=True, color=None, flat=None, bill=None):
        self.test, self.nrm, self.ext = test, nrm, ext
        self.pal, self.spec, self.color, self.flat, self.bill = pal, spec, color, flat, bill


def rod(u0, u1, hw, pal, **kw):
    return Prim(lambda u, v: u0 - 0.5 <= u <= u1 + 0.5 and abs(v) <= hw + 0.01,
                lambda u, v: (0.0, v / max(0.5, hw + 0.5)), [(u0, -hw), (u1, hw)], pal, **kw)


def box(u0, u1, v0, v1, pal, **kw):
    cu, cv = (u0 + u1) / 2, (v0 + v1) / 2
    ru, rv = max(0.5, (u1 - u0) / 2 + 0.5), max(0.5, (v1 - v0) / 2 + 0.5)
    return Prim(lambda u, v: u0 - 0.5 <= u <= u1 + 0.5 and v0 - 0.5 <= v <= v1 + 0.5,
                lambda u, v: ((u - cu) / ru, (v - cv) / rv), [(u0, v0), (u1, v1)], pal, **kw)


def mask(fn, u0, u1, v0, v1, pal, **kw):
    cu, cv = (u0 + u1) / 2, (v0 + v1) / 2
    ru, rv = max(0.5, (u1 - u0) / 2 + 0.5), max(0.5, (v1 - v0) / 2 + 0.5)
    return Prim(fn, lambda u, v: ((u - cu) / ru, (v - cv) / rv), [(u0, v0), (u1, v1)], pal, **kw)


def disk(cu, cv, r, pal, bill=False, **kw):
    if bill:
        return Prim(None, None, [(cu - r, cv - r), (cu + r, cv + r)], pal, bill=(cu, cv, r), **kw)
    return Prim(lambda u, v: (u - cu) ** 2 + (v - cv) ** 2 <= r * r + 0.3,
                lambda u, v: ((u - cu) / r, (v - cv) / r), [(cu - r, cv - r), (cu + r, cv + r)], pal, **kw)


def _inside(poly, x, y):
    n = len(poly)
    ins = False
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi:
            ins = not ins
        j = i
    return ins


def poly(pts, pal, **kw):
    us = [p[0] for p in pts]
    vs = [p[1] for p in pts]
    return mask(lambda u, v: _inside(pts, u, v), min(us), max(us), min(vs), max(vs), pal, **kw)


def draw_local(c, grip, ang_deg, prims, fs=1.0, light=LIGHT):
    """Desenha primitivas locais com origem em grip, eixo u no ângulo ang (0 = direita,
    90 = baixo) e u encurtado por fs (escorço). As últimas ficam por cima."""
    a = math.radians(ang_deg)
    U = (math.cos(a), math.sin(a))
    V = (-math.sin(a), math.cos(a))
    pts = []
    for pr in prims:
        for (u, v) in pr.ext:
            for (uu, vv) in ((u, v), (u, -v)):
                pts.append((grip[0] + U[0] * uu * fs + V[0] * vv, grip[1] + U[1] * uu * fs + V[1] * vv))
    if not pts:
        return
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    for y in range(int(min(ys)) - 3, int(max(ys)) + 4):
        for x in range(int(min(xs)) - 3, int(max(xs)) + 4):
            dx, dy = x - grip[0], y - grip[1]
            uw = dx * U[0] + dy * U[1]
            u = uw / fs
            v = dx * V[0] + dy * V[1]
            for pr in reversed(prims):
                if pr.bill is not None:
                    cu, cv, r = pr.bill
                    du, dv = uw - cu * fs, v - cv
                    if du * du + dv * dv > r * r + 0.3:
                        continue
                    nu, nv = du / r, dv / r
                else:
                    if not pr.test(u, v):
                        continue
                    nu, nv = pr.nrm(u, v)
                col = pr.color(u, v) if pr.color is not None else None
                if col is None:
                    col = pr.flat if pr.flat is not None else tone(
                        pr.pal, nu * U[0] + nv * V[0], nu * U[1] + nv * V[1], pr.spec, light)
                c.p(x, y, col)
                break


def limb(c, p0, p1, hw, pal, spec=True, cap0=True, cap1=True, light=LIGHT):
    """Segmento grosso (braço, perna, cabo) com sombra cilíndrica."""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(dx, dy) or 1.0
    ang = math.degrees(math.atan2(dy, dx))
    prims = [rod(0, L, hw, pal, spec=spec)]
    if cap0:
        prims.insert(0, disk(0, 0, hw, pal, spec=spec))
    if cap1:
        prims.insert(0, disk(L, 0, hw, pal, spec=spec))
    draw_local(c, p0, ang, prims, light=light)


def ball(c, cx, cy, r, pal, spec=True, light=LIGHT):
    for y in range(int(cy - r) - 1, int(cy + r) + 2):
        for x in range(int(cx - r) - 1, int(cx + r) + 2):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3:
                c.p(x, y, tone(pal, (x - cx) / r, (y - cy) / r, spec, light))


# ── efeitos ──────────────────────────────────────────────────────────────

def smear(c, pivot, r0, r1, a0, a1, keys=('fx0', 'fx1', 'fx2', 'fx3'), seed=1):
    """Rastro do golpe: faixa em arco entre os ângulos a0→a1 (graus), mais clara na
    borda de fora e rala na ponta de trás."""
    lo, hi = min(a0, a1), max(a0, a1)
    for y in range(c.h):
        for x in range(c.w):
            dx, dy = x - pivot[0], y - pivot[1]
            r = math.hypot(dx, dy)
            if not (r0 <= r <= r1):
                continue
            a = math.degrees(math.atan2(dy, dx))
            for k in (-360, 0, 360):
                if lo <= a + k <= hi:
                    a = a + k
                    break
            else:
                continue
            s = (a - a0) / (a1 - a0) if a1 != a0 else 1.0          # 0 = de onde veio, 1 = onde está
            thick = r0 + (r1 - r0) * (1 - 0.75 * (1 - s))
            if r < r1 - (thick - r0) - 0.01 and s < 0.98:
                continue
            if s < 0.35 and hsh(x, y, seed) > s / 0.35:
                continue
            q = (r - r0) / max(0.01, r1 - r0)
            c.p(x, y, keys[min(len(keys) - 1, int(q * len(keys)))])


def spark(c, x, y, size=4, keys=('fx3', 'fx2', 'g3'), diag=True):
    """Estrela de impacto: miolo claro e raios."""
    c.p(x, y, keys[0])
    for k in range(1, size + 1):
        col = keys[0] if k == 1 else (keys[1] if k < size else keys[2])
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            c.p(x + dx * k, y + dy * k, col)
        if diag and k <= size - 2:
            for dx, dy in ((1, 1), (-1, -1), (1, -1), (-1, 1)):
                c.p(x + dx * k, y + dy * k, keys[1] if k == 1 else keys[2])


def flash(c, side=1, depth=3, keys=None):
    """Clarão do acerto: o lado do golpe (side=1, direita) fica claro até depth px."""
    keys = keys or {}
    src = copy(c)
    for y in range(c.h):
        xs = [x for x in range(c.w) if src.px[y][x] not in (None, 'ol')]
        if not xs:
            continue
        edge = max(xs) if side > 0 else min(xs)
        for x in xs:
            d = (edge - x) if side > 0 else (x - edge)
            if d < depth:
                v = src.px[y][x]
                c.px[y][x] = 'fx3' if d == 0 else ('fx2' if d == 1 else 'fx1')


def dust(c, x, y, n=6, spread=10, seed=0):
    for i in range(n):
        dx = round((hsh(i, 1, seed) - 0.5) * 2 * spread)
        dy = -round(hsh(i, 2, seed) * 3)
        r = 1 + int(hsh(i, 3, seed) * 2)
        for yy in range(-r + 1, r):
            for xx in range(-r + 1, r):
                if abs(xx) + abs(yy) < r:
                    c.p(x + dx + xx, y + dy + yy, 'du2' if yy < 0 else 'du1')


def clip_report(c):
    """Pixels de cor (não contorno) na borda do quadro: sinal de que a peça foi cortada."""
    n = 0
    for y in range(c.h):
        for x in range(c.w):
            v = c.px[y][x]
            if v is not None and v != 'ol' and (x == 0 or y == 0 or x == c.w - 1 or (y == c.h - 1 and False)):
                n += 1
    return n


def grid_preview(images, out, cols=8, scale=4, bg=(60, 74, 56), gap=4):
    """Folha de conferência em grade (as peças ampliadas, sobre um fundo)."""
    from PIL import Image
    fw = max(i.width for i in images)
    fh = max(i.height for i in images)
    rows = (len(images) + cols - 1) // cols
    sh = Image.new('RGBA', (cols * (fw + gap) + gap, rows * (fh + gap) + gap), bg + (255,))
    for k, im in enumerate(images):
        x = gap + (k % cols) * (fw + gap)
        y = gap + (k // cols) * (fh + gap) + (fh - im.height)
        sh.alpha_composite(im.convert('RGBA'), (x, y))
    sh.resize((sh.width * scale, sh.height * scale), Image.NEAREST).save(out)
