"""Monstros e chefes 32-bit dos atos IV, V e VI do Vigília (e os retratos do painel).

Ato IV (Cidade Afogada): Sacerdote Afogado, Sereia de Lodo, Cavaleiro Salobro, O Arcebispo Sem Fôlego.
Ato V (Forja Abissal): Ferreiro Cinzento, Cão de Brasa, Escravo da Forja, O Martelo Que Não Dorme.
Ato VI (Coração do Abismo): Sombra Faminta, Lamento, Arauto do Fundo, Aquilo que Vigia.

Cada monstro grava a folha base e as variantes (-deep e -core; -phase2 nos chefes) em export32/,
com 19 quadros do dobro do tamanho da 16-bit, e o retrato 64×72 em export32/ui/portrait-monster/.
Desenhos em monstros32_b_iv.py, monstros32_b_v.py e monstros32_b_vi.py; base comum em
monstros32_b_base.py.

Uso: python3 -I art32/monstros32_b.py [ids...] [--preview PASTA]
"""
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

import lib32 as L  # noqa: E402
import monstros32_b_base as B  # noqa: E402
import monstros32_b_iv as A4  # noqa: E402
import monstros32_b_v as A5  # noqa: E402
import monstros32_b_vi as A6  # noqa: E402

MONSTERS = A4.MONSTERS + A5.MONSTERS + A6.MONSTERS


def stack(images, out, scale=2, bg=(60, 74, 56)):
    """Prévia: as folhas uma embaixo da outra, ampliadas."""
    w = max(i.width for i in images)
    h = sum(i.height + 4 for i in images)
    sh = Image.new('RGBA', (w, h), bg + (255,))
    y = 0
    for i in images:
        sh.alpha_composite(i, (0, y))
        y += i.height + 4
    sh.resize((w * scale, h * scale), Image.NEAREST).save(out)


def closeup(rows, fw, fh, picks, out, scale=4, bg=(60, 74, 56)):
    """Prévia de perto: alguns quadros de cada folha (parado, passada, golpe, acerto, morte)."""
    w = len(picks) * (fw + 4)
    h = len(rows) * (fh + 4)
    sh = Image.new('RGBA', (w, h), bg + (255,))
    for r, img in enumerate(rows):
        for k, i in enumerate(picks):
            sh.alpha_composite(img.crop((i * fw, 0, i * fw + fw, fh)), (k * (fw + 4), r * (fh + 4)))
    sh.resize((w * scale, h * scale), Image.NEAREST).save(out)


def main(argv):
    prev = os.path.join(tempfile.gettempdir(), 'vigilia-art32', 'monstros-b')
    if '--preview' in argv:
        i = argv.index('--preview')
        prev = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    only = set(argv)
    os.makedirs(prev, exist_ok=True)
    portraits = []
    for mon in MONSTERS:
        if only and mon.mid not in only:
            continue
        sheets = []
        base0 = None
        for mode in mon.modes():
            frames = mon.frames(mode)
            img = B.sheet_image(frames)
            out = L.save32(img, mon.file(mode))
            sheets.append(img)
            cov = B.coverage(mon, frames) if not mode else None
            if not mode:
                base0 = frames[0]
            print(f'char/{mon.kind}/{mon.mid}' + (f'-{mode}' if mode else ''), '→', os.path.relpath(out, L.ROOT),
                  f'(IoU 16-bit {cov:.2f})' if cov is not None else '')
        pimg = B.portrait(base0, mon.kind, mon.act, seed=len(mon.mid)).image()
        out = L.save32(pimg, mon.portrait_file())
        portraits.append(pimg)
        print(f'ui/portrait/{mon.kind}/{mon.mid}', '→', os.path.relpath(out, L.ROOT))
        fw, fh = mon.size
        stack(sheets, os.path.join(prev, f'{mon.stem}-folhas.png'), scale=2 if fw <= 64 else 1)
        closeup(sheets, fw, fh, [0, 2, 4, 6, 8, 10, 12, 13, 15, 17],
                os.path.join(prev, f'{mon.stem}-perto.png'), scale=4 if fw <= 48 else (3 if fw <= 64 else 2))
    if portraits:
        L.preview(portraits, os.path.join(prev, 'retratos.png'), scale=3)
    print('prévias em', prev)


if __name__ == '__main__':
    main(sys.argv[1:])
