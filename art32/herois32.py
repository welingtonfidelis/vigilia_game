"""Heróis 32-bit: folhas de frente, caminhada de perfil e retratos de busto.

Gera, para cada herói em uso (char/hero2/<classe>/<m|f> e o Guardião, que no jogo usa o
id char/hero/guerreiro/m):
  · folha principal: 18 quadros de 48×64 (parado 0–3, correndo 4–7, acerto 8,
    golpe 9–12, morte 13–17), montada com as peças do modelo detalhado (hd24) —
    herois32_frente.py;
  · '/walk': 8 quadros de 48×64 de perfil para o corredor do abismo — herois32_perfil.py;
  · retrato de busto ui/portrait/hero/<classe>/<m|f> em 96×168 — herois32_retrato.py.
As antigas char/hero/<classe>/<m|f> de 16×28 estão fora de uso e ficam de fora.

Uso: python3 -I art32/herois32.py [pasta_da_prévia]
"""
import os
import sys
import tempfile

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, 'pack16')]

import lib32  # noqa: E402
import herois32_base as B  # noqa: E402
import herois32_frente as F  # noqa: E402
import herois32_perfil as P  # noqa: E402
import herois32_retrato as R  # noqa: E402

# id da folha principal → (classe do modelo, gênero)
HEROES = {
    'char/hero/guerreiro/m': ('guardiao', 'm'),
    'char/hero2/guardiao/f': ('guardiao', 'f'),
    'char/hero2/selvagem/m': ('selvagem', 'm'),
    'char/hero2/selvagem/f': ('selvagem', 'f'),
    'char/hero2/lanceiro/m': ('lanceiro', 'm'),
    'char/hero2/lanceiro/f': ('lanceiro', 'f'),
    'char/hero2/arqueiro/m': ('arqueiro', 'm'),
    'char/hero2/arqueiro/f': ('arqueiro', 'f'),
    'char/hero2/clerigo/m': ('clerigo', 'm'),
    'char/hero2/clerigo/f': ('clerigo', 'f'),
    'char/hero2/piromante/m': ('piromante', 'm'),
    'char/hero2/piromante/f': ('piromante', 'f'),
}


def finish(c):
    """Contorno do README: OL só na silhueta de fora; as linhas de dentro (o contorno de
    cada peça do hd24) viram a cor do material vizinho escurecida (lib32.thin_outline)."""
    return lib32.thin_outline(c.img())


def strip(images):
    return lib32.sheet(images)


def main(prev_dir):
    os.makedirs(prev_dir, exist_ok=True)
    inv = {e['id']: e for e in lib32.inventory('herois')}
    ui = {e['id']: e for e in lib32.inventory('interface')}
    done = []
    previews = []
    for hid, (cls, g) in HEROES.items():
        fr = [finish(f) for f in F.frames(cls, g)]
        e = inv[hid]
        assert e['frames'] == len(fr) == 18, hid
        out = lib32.save32(strip(fr), e['file'])
        done.append((hid, out))
        wk = [finish(f) for f in P.frames(cls, g)]
        ew = inv[hid + '/walk']
        assert ew['frames'] == len(wk) == 8, hid
        out = lib32.save32(strip(wk), ew['file'])
        done.append((hid + '/walk', out))
        tag = hid.replace('/', '-')
        B.grid_preview(fr + wk, os.path.join(prev_dir, f'{tag}.png'), cols=9, scale=3)
        previews.append((fr, wk))
    portraits = []
    for cls in ('guardiao', 'selvagem', 'lanceiro', 'arqueiro', 'clerigo', 'piromante'):
        for g in ('m', 'f'):
            pid = f'ui/portrait/hero/{cls}/{g}'
            img = finish(R.portrait(cls, g))
            out = lib32.save32(img, ui[pid]['file'])
            done.append((pid, out))
            portraits.append(img)
    B.grid_preview(portraits, os.path.join(prev_dir, 'retratos.png'), cols=6, scale=2)
    # visão geral: parado, correndo, acerto, golpe e morte de todos, e um quadro da caminhada
    over = []
    for fr, wk in previews:
        over += [fr[0], fr[5], fr[8], fr[10], fr[11], fr[13], fr[15], fr[17], wk[1]]
    B.grid_preview(over, os.path.join(prev_dir, 'herois-geral.png'), cols=9, scale=2)
    for hid, out in done:
        print(f'{hid:34s} → {os.path.relpath(out, lib32.ROOT)}')
    print(f'{len(done)} peças; prévias em {prev_dir}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'vigilia-art32-herois'))
