"""Peças do M6 (Histórias sem fim) em 16 e 32-bit, e o índice src/render/pack-historias.ts.

F1: a mesa de audiências da praça, o balão de desejo sobre o herói e as flores da lápide nova.

Uso: python3 -I art32/historias32.py [--preview PASTA] [--dry]
  --dry    só as prévias (não grava no pack nem no índice)
"""
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

import lib32 as L  # noqa: E402

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
        self.c = L.Canvas(w16 * s, h16 * s)

    def rect(self, x, y, w, h, col):
        s = self.s
        self.c.rect(round(x * s), round(y * s), max(1, round(w * s)), max(1, round(h * s)), col)

    def dot(self, x, y, col):
        self.rect(x, y, 1, 1, col)

    def fine(self, X, Y, col):
        """Pixel só da 32-bit (coordenadas da escala 2)."""
        if self.s == 2:
            self.c.p(X, Y, col)

    def image(self) -> Image.Image:
        self.c.outline(OL)
        return self.c.image()


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


PIECES = {
    'prop/audiencia/mesa': (mesa, 'export/png/prop-audiencia-mesa.png', 'prop'),
    # Desenhado no mapa sobre o herói: entra como decalque (o tipo 'ui' é só do DOM).
    'ui/desejo': (desejo, 'export/ui/ui-desejo.png', 'decal'),
    'prop/tumulo/flores': (flores, 'export/png/prop-tumulo-flores.png', 'prop'),
}

INDEX = os.path.join(L.ROOT, 'src', 'render', 'pack-historias.ts')


def main(argv):
    dry = '--dry' in argv
    prev = argv[argv.index('--preview') + 1] if '--preview' in argv else tempfile.mkdtemp(prefix='historias32-')
    os.makedirs(prev, exist_ok=True)
    entries = []
    for pid, (fn, file, kind) in PIECES.items():
        imgs = {s: fn(s) for s in (1, 2)}
        for s, img in imgs.items():
            if not dry:
                out = L.path16(file) if s == 1 else L.path32(file)
                os.makedirs(os.path.dirname(out), exist_ok=True)
                img.save(out)
            img.resize((img.width * (8 // s), img.height * (8 // s)), Image.NEAREST).save(os.path.join(prev, f'{pid.replace("/", "-")}-{s * 16}.png'))
        w, h = imgs[1].size
        entries.append({'id': pid, 'type': kind, 'file': file, 'anchor': [0.5, 1], 'size': [w, h]})
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
