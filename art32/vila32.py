"""Vila em 32-bit: enfeites, natureza, tiles do chão e efeitos pequenos (inventário "vila").

Desenha cada peça do zero (geradores em vila32_props, vila32_nature, vila32_big,
vila32_terrain e vila32_fx; base em vila32_base) e grava em export32/ com lib32.save32,
que confere o dobro exato da 16-bit. Folhas de quadros mantêm a quantidade, a ordem e a
âncora dos quadros; o tileset do terreno mantém os tiles nos mesmos lugares da grade.

Uso: python3 -I art32/vila32.py [pasta-das-prévias]
(com a pasta, grava também folhas de conferência: a 16-bit ampliada ao lado da 32-bit)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402

import vila32_big as BIG  # noqa: E402
import vila32_fx as FX  # noqa: E402
import vila32_nature as NAT  # noqa: E402
import vila32_props as PROPS  # noqa: E402
import vila32_terrain as TER  # noqa: E402
from lib32 import inventory, save32  # noqa: E402
from vila32_base import iou, load16, pair_preview, up2  # noqa: E402

# id do inventário → gerador (devolve K, ou (K, K-das-luzes)).
PIECES = {
    'tile/town/terrain': TER.terrain,
    'prop/thermal/basin': BIG.thermal_basin,
    'prop/thermal/basin-empty': BIG.thermal_basin_empty,
    'prop/thermal/water': BIG.thermal_water,
    'prop/thermal/bench': PROPS.thermal_bench,
    'prop/coffer': PROPS.coffer,
    'prop/board': PROPS.board,
    'prop/campfire/off': PROPS.campfire_off,
    'prop/campfire/on': PROPS.campfire_on,
    'prop/tree/01': NAT.tree_01,
    'prop/tree/dead': NAT.tree_dead,
    'prop/abyss/cave': BIG.abyss_cave,
    'prop/tree/pine': NAT.tree_pine,
    'prop/boulder/01': NAT.boulder_01,
    'prop/boulder/02': NAT.boulder_02,
    'decal/grave': NAT.decal_grave,
    'decal/sign': NAT.decal_sign,
    'decal/banner': NAT.decal_banner,
    'decal/rubble': NAT.decal_rubble,
    'fx/steam': FX.steam_sheet,
    'fx/fire': FX.fire_sheet,
    'fx/spark': FX.spark_sheet,
    'tile/town/cemetery-fence': lambda: TER.fence_sheet('cemetery'),
    'tile/town/wood-fence': lambda: TER.fence_sheet('wood'),
    'prop/well': PROPS.well,
    'prop/hay': PROPS.hay,
    'prop/sacks': PROPS.sacks,
    'prop/bucket': PROPS.bucket,
    'prop/logs': PROPS.logs,
    'prop/barrel': PROPS.barrel,
    'prop/crate': PROPS.crate,
    'tile/town/autumn-grass-0': lambda: TER.autumn_grass(0),
    'tile/town/autumn-grass-1': lambda: TER.autumn_grass(1),
    'tile/town/autumn-grass-2': lambda: TER.autumn_grass(2),
    'tile/town/autumn-grass-3': lambda: TER.autumn_grass(3),
    'prop/tree/autumn': NAT.tree_autumn,
    'prop/tree/autumn-small': NAT.tree_autumn_small,
    'prop/bench': PROPS.bench,
    'prop/cart': PROPS.cart,
    'prop/lamp': PROPS.lamp,
    'prop/crystal-corrupt-01': NAT.crystal_corrupt_01,
    'prop/crystal-corrupt-02': NAT.crystal_corrupt_02,
    'prop/bramble-corrupt': NAT.bramble_corrupt,
    'prop/grave-broken': NAT.grave_broken,
    'prop/grave-leaning': NAT.grave_leaning,
    'prop/fence-crooked': NAT.fence_crooked,
    'prop/fern': NAT.fern,
    'prop/bush': NAT.bush,
    'prop/reeds': NAT.reeds,
    'prop/gate/open': BIG.gate_open,
    'prop/horn-stand': BIG.horn_stand,
}

# Fora de uso no jogo (o portão com berrante virou portão + torrinha separados).
SKIP = {'prop/gate-horn/open', 'prop/gate-horn/closed'}

GROUPS = [
    ('enfeites-1', ['prop/barrel', 'prop/crate', 'prop/bucket', 'prop/sacks', 'prop/hay', 'prop/thermal/bench', 'prop/lamp', 'prop/bench']),
    ('enfeites-2', ['prop/coffer', 'prop/board', 'prop/logs', 'prop/well', 'prop/cart']),
    ('enfeites-3', ['prop/campfire/off', 'prop/campfire/on', 'decal/grave', 'decal/sign', 'decal/banner', 'decal/rubble']),
    ('natureza-1', ['prop/tree/01', 'prop/tree/dead', 'prop/tree/pine', 'prop/tree/autumn', 'prop/tree/autumn-small']),
    ('natureza-2', ['prop/boulder/01', 'prop/boulder/02', 'prop/bush', 'prop/fern', 'prop/reeds', 'prop/grave-broken', 'prop/grave-leaning']),
    ('natureza-3', ['prop/crystal-corrupt-01', 'prop/crystal-corrupt-02', 'prop/bramble-corrupt', 'prop/fence-crooked']),
    ('grandes-1', ['prop/thermal/basin', 'prop/thermal/basin-empty', 'prop/thermal/water']),
    ('grandes-2', ['prop/abyss/cave', 'prop/gate/open', 'prop/horn-stand']),
]


def stack(rows, scale, out, bg=(60, 74, 56)):
    """Folha de prévia com linhas (cada linha é uma imagem já montada)."""
    W = max(r.width for r in rows)
    H = sum(r.height + 6 for r in rows)
    sh = Image.new('RGBA', (W, H), bg + (255,))
    y = 0
    for r in rows:
        sh.alpha_composite(r, (0, y))
        y += r.height + 6
    sh.resize((W * scale, H * scale), Image.NEAREST).save(out)


def night(img, lit):
    dark = Image.new('RGBA', img.size, (20, 26, 40, 150))
    n = Image.alpha_composite(img.copy(), Image.composite(dark, Image.new('RGBA', img.size, (0, 0, 0, 0)), img.split()[3]))
    n.alpha_composite(lit)
    return n


def main(prev_dir=None):
    inv = {it['id']: it for it in inventory('vila')}
    done, left = {}, []
    for pid, it in inv.items():
        if pid in SKIP:
            left.append((pid, 'fora de uso no jogo (pedido para ignorar)'))
            continue
        fn = PIECES.get(pid)
        if fn is None:
            left.append((pid, 'sem gerador'))
            continue
        r = fn()
        img, lit = (r[0].image(), r[1].image()) if isinstance(r, tuple) else (r.image(), None)
        save32(img, it['file'])
        if lit is not None:
            save32(lit, it['lights'])
        done[pid] = (it, img, lit)
        print(f"{pid:32s} {it['file']:42s} {img.size[0]}×{img.size[1]}  IoU {iou(img, it['file']):.2f}")
    for pid, why in left:
        print(f'fora: {pid} ({why})')
    if not prev_dir:
        return done
    os.makedirs(prev_dir, exist_ok=True)
    for name, ids in GROUPS:
        pair_preview([(done[i][0]['file'], done[i][1]) for i in ids], os.path.join(prev_dir, f'vila-{name}.png'), 4)
    # Lampião de noite (com o overlay de luz).
    it, img, lit = done['prop/lamp']
    lit16 = load16(it['lights'])
    stack([_row([up2(night(load16(it['file']), lit16)), night(img, lit), up2(lit16), lit])], 6, os.path.join(prev_dir, 'vila-lampiao-noite.png'), (30, 36, 44))
    # Terreno: a 16-bit ampliada e a 32-bit lado a lado.
    t16 = up2(load16('export/tiles/town-terrain.png'))
    stack([_row([t16, done['tile/town/terrain'][1]])], 3, os.path.join(prev_dir, 'vila-terreno.png'), (255, 0, 255))
    # Cercas, grama de outono e efeitos.
    rows = []
    for pid in ('tile/town/cemetery-fence', 'tile/town/wood-fence', 'fx/fire', 'fx/spark', 'fx/steam'):
        it, img, _ = done[pid]
        rows += [up2(load16(it['file'])), img]
    rows.append(_row([up2(load16(done[f'tile/town/autumn-grass-{k}'][0]['file'])) for k in range(4)] + [done[f'tile/town/autumn-grass-{k}'][1] for k in range(4)]))
    stack(rows, 3, os.path.join(prev_dir, 'vila-cercas-fx-outono.png'))
    return done


def _row(ims, gap=6):
    W = sum(i.width + gap for i in ims)
    H = max(i.height for i in ims)
    r = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x = 0
    for i in ims:
        r.alpha_composite(i.convert('RGBA'), (x, H - i.height))
        x += i.width + gap
    return r


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
