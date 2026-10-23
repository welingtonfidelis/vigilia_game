"""Biomas das dimensões fundas (M5 F6) em 16 e 32-bit: monstros e Senhores (folhas, variantes e
retratos), corredor, objetos, efeitos e o índice src/render/pack-dimensoes.ts.

Desenhos em dimensoes32_colmeia.py (VII), dimensoes32_fossa.py (VIII), dimensoes32_cidadela.py (IX)
e dimensoes32_deserto.py (X); base comum em dimensoes32_base.py.

Uso: python3 -I art32/dimensoes32.py [VII VIII IX X] [--only ids] [--preview PASTA] [--dry]
  --dry    só as prévias (não grava no pack nem no índice)
"""
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

import dimensoes32_base as D  # noqa: E402
import lib32 as L  # noqa: E402

MODULES = {'VII': 'dimensoes32_colmeia', 'VIII': 'dimensoes32_fossa', 'IX': 'dimensoes32_cidadela', 'X': 'dimensoes32_deserto'}


def closeup(rows, fw, fh, picks, out, scale=4, bg=(60, 74, 56)):
    w = len(picks) * (fw + 4)
    h = len(rows) * (fh + 4)
    sh = Image.new('RGBA', (w, h), bg + (255,))
    for r, img in enumerate(rows):
        for k, i in enumerate(picks):
            sh.alpha_composite(img.crop((i * fw, 0, i * fw + fw, fh)), (k * (fw + 4), r * (fh + 4)))
    sh.resize((w * scale, h * scale), Image.NEAREST).save(out)


def monsters(mod, prev, dry, only):
    entries = []
    for cls in mod.MONSTERS:
        if only and cls.mid not in only:
            entries += D.monster_entries(cls(1))
            continue
        for s in (1, 2):
            mon = cls(s)
            sheets = []
            base0 = None
            for mode in mon.modes():
                frames = mon.frames(mode)
                img = L.sheet([f.image() for f in frames])
                if not dry:
                    D.save(img, mon.file(mode), s)
                sheets.append(img)
                if not mode:
                    base0 = frames[0]
            por = D.portrait_s(base0, mon.kind, mon.act, s, seed=len(mon.mid)).image()
            if not dry:
                D.save(por, mon.portrait_file(), s)
            fw, fh = mon.size
            closeup(sheets, fw, fh, [0, 2, 4, 6, 8, 10, 12, 13, 15, 17], os.path.join(prev, f'{mon.stem}-{s * 16}.png'),
                    scale=(4 if s == 1 else 2) if fw <= 64 else 2)
            por.resize((por.width * (4 // s), por.height * (4 // s)), Image.NEAREST).save(os.path.join(prev, f'{mon.stem}-retrato-{s * 16}.png'))
            print(f'char/{mon.kind}/{mon.mid} {s * 16}-bit: {len(sheets)} folhas')
        entries += D.monster_entries(cls(1))
    return entries


def scenery(mod, act, prev, dry):
    entries = D.corridor_entries(act)
    low = act.lower()
    for s in (1, 2):
        pieces = mod.corridor(s)
        for layer, img in pieces.items():
            if not dry:
                D.save(img, f'export/corridor/corridor-{low}-{layer}.png', s)
        # prévia: entrada + parede a + arco + parede b, com chão e primeiro plano
        k = s
        W = (72 + 640) * k
        sh = Image.new('RGBA', (W, 192 * k), (5, 5, 7, 255))
        sh.alpha_composite(pieces['entry'], (0, 0))
        sh.alpha_composite(pieces['wall-a'], (72 * k, 0))
        sh.alpha_composite(pieces['wall-b'], (392 * k, 0))
        for x in range(0, W, pieces['floor'].width):
            sh.alpha_composite(pieces['floor'], (x, 128 * k))
        sh.alpha_composite(pieces['door'], (392 * k - 24 * k, 0))
        props = mod.props(s)
        for (pid, img, x16) in [(pid, img, x) for (pid, img), x in zip(props.items(), (150, 260, 470, 560))]:
            sh.alpha_composite(img, (x16 * k - img.width // 2, 150 * k - img.height))
        for x in range(0, W, pieces['fore'].width):
            sh.alpha_composite(pieces['fore'], (x, 160 * k))
        sh.resize((sh.width * (2 // s), sh.height * (2 // s)), Image.NEAREST).save(os.path.join(prev, f'corredor-{low}-{s * 16}.png'))
        for pid, img in props.items():
            if not dry:
                D.save(img, f'export/arena/props/prop-arena-{low}-{pid}.png', s)
    entries += [D.prop_entry(act, pid, (img.width, img.height)) for pid, img in mod.props(1).items()]
    if not dry:
        for kind in ('slash', 'impact'):
            D.recolor_fx(f'export/fx/fx-{kind}-v.png', f'export/fx/fx-{kind}-{low}.png', mod.FX_RAMP)
    entries += D.fx_entries(act)
    print(f'corredor/{act}: {len(D.corridor_entries(act))} peças, {len(mod.props(1))} objetos, 2 efeitos')
    return entries


def main(argv):
    prev = os.path.join(tempfile.gettempdir(), 'vigilia-art32', 'dimensoes')
    dry = '--dry' in argv
    argv = [a for a in argv if a != '--dry']
    only = set()
    if '--preview' in argv:
        i = argv.index('--preview')
        prev = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
    if '--only' in argv:
        i = argv.index('--only')
        only = set(argv[i + 1].split(','))
        argv = argv[:i] + argv[i + 2:]
    acts = argv or list(MODULES)
    os.makedirs(prev, exist_ok=True)
    index = {}
    for act in acts:
        mod = __import__(MODULES[act])
        entries = monsters(mod, prev, dry, only)
        if hasattr(mod, 'corridor') and not only:
            entries += scenery(mod, act, prev, dry)
        index[act] = entries
    if not dry and not only:
        D.write_index(index)
        print('índice:', os.path.relpath(D.INDEX, L.ROOT))
    print('prévias em', prev)


if __name__ == '__main__':
    main(sys.argv[1:])
