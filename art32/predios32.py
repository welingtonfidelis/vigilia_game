"""Prédios 32-bit do Vigília: gera todas as peças da categoria "predios" do inventário.

Os desenhos ficam em predios32_<prédio>.py (sobre o kit predios32_kit.py); este arquivo
junta tudo, grava em export32/ (com o overlay "-lights") e, se pedir, monta folhas de
prévia com a 16-bit ampliada, a 32-bit e a 32-bit à noite.
Uso: python3 -I art32/predios32.py [--preview PASTA] [filtro ...]
A taverna nível 3 é o piloto de taverna32.py e não é refeita aqui.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib32  # noqa: E402
import predios32_kit as kit  # noqa: E402

MODULES = ['predios32_taverna', 'predios32_templo', 'predios32_guilda', 'predios32_estalagem',
           'predios32_casa', 'predios32_ferreiro', 'predios32_campo', 'predios32_house']


def pieces(filt=()) -> dict:
    """Junta os PIECES dos módulos (só os que o filtro pede, se houver filtro)."""
    out = {}
    for m in MODULES:
        name = m.split('_', 1)[1]
        if filt and not any(name in f for f in filt):
            continue
        try:
            mod = __import__(m)
        except ModuleNotFoundError as e:
            if e.name == m:
                continue
            raise
        out.update(mod.PIECES)
    return out


def main(argv: list[str]) -> None:
    prev_dir = None
    if '--preview' in argv:
        i = argv.index('--preview')
        prev_dir = argv[i + 1]
        argv = argv[:i] + argv[i + 2:]
        os.makedirs(prev_dir, exist_ok=True)
    filt = argv
    inv = {e['id']: e for e in lib32.inventory('predios')}
    fns = pieces(filt)
    rows = []
    for pid, fn in fns.items():
        if filt and not any(f in pid for f in filt):
            continue
        e = inv[pid]
        c, lt = fn()
        img = c.image()
        lit = lt.image() if lt is not None else kit.blank(e['lights'])
        lib32.save32(img, e['file'])
        if e.get('lights'):
            lib32.save32(lit, e['lights'])
        print(f'{pid:30s} → {lib32.path32(e["file"])[len(lib32.ROOT) + 1:]}  {kit.check(e["file"], img, lit, e.get("lights"))}')
        if prev_dir:
            row = kit.preview_row(e['file'], img, lit)
            name = pid.replace('building/', '').replace('/', '-')
            lib32.preview([row], os.path.join(prev_dir, f'{name}.png'), scale=2)
            rows.append(row)
    missing = [k for k in inv if k not in fns and k != 'building/taverna/level-3']
    if missing and not filt:
        print('sem gerador:', ', '.join(missing))


if __name__ == '__main__':
    main(sys.argv[1:])
