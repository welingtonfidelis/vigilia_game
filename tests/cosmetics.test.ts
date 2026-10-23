import { describe, expect, it } from 'vitest';
import { createWorld, deserialize, serialize } from '../src/sim/index.ts';
import type { World } from '../src/sim/index.ts';
import { BIOMES } from '../src/data/biomes.ts';
import { DECOR, DECOR_BY_ID, DECOR_POINTS, STREETS } from '../src/data/decor.ts';
import { CREST_TINCTURES } from '../src/data/houses.ts';
import { BALANCE as B } from '../src/sim/config.ts';
import { codexOf } from '../src/sim/codex.ts';
import { decorBlocker, decorOf, placeDecor, renameStreet, setBanner, setBust, streetName, villageBanner } from '../src/sim/cosmetics.ts';
import { crestReadable } from '../src/sim/houses.ts';
import { createHero } from '../src/sim/hero.ts';
import { DECOR_SPOTS, LANDMARKS } from '../src/render/layout.ts';

const metal = CREST_TINCTURES.findIndex((t) => t.metal);
const otherMetal = CREST_TINCTURES.findIndex((t, i) => t.metal && i !== metal);
const color = CREST_TINCTURES.findIndex((t) => !t.metal);

describe('cosmética da vila (M6 F6)', () => {
  it('o estandarte sai da semente legível; o prefeito troca seguindo metal sobre cor', () => {
    const world = createWorld(101);
    expect(crestReadable(villageBanner(world))).toBe(true);
    expect(villageBanner(world)).toEqual(villageBanner(createWorld(101)));
    expect(setBanner(world, { field: metal, charge: otherMetal, symbol: 0 }).ok).toBe(false);
    expect(setBanner(world, { field: color, charge: metal, symbol: 3 }).ok).toBe(true);
    expect(villageBanner(world)).toEqual({ field: color, charge: metal, symbol: 3 });
  });

  it('enfeites: os livres desde o começo; o resto pelos feitos, com ouro simbólico', () => {
    const world = createWorld(102);
    world.town.treasury = 100;
    expect(DECOR_POINTS).toBe(DECOR_SPOTS.length);
    expect(DECOR.every((d) => d.cost <= 50)).toBe(true);
    expect(placeDecor(world, 0, 'banco').ok).toBe(true);
    expect(placeDecor(world, 1, 'canteiro').ok).toBe(true);
    expect(world.town.treasury).toBe(100 - DECOR_BY_ID.get('canteiro')!.cost);
    expect(world.metrics.spent?.enfeite).toBe(DECOR_BY_ID.get('canteiro')!.cost);
    // Poço pede 3 lendas.
    expect(placeDecor(world, 2, 'poco').ok).toBe(false);
    for (let i = 0; i < 3; i++) world.metrics.bossKills.push({ level: i + 1, day: i });
    expect(decorBlocker(world, DECOR_BY_ID.get('poco')!)).toBeNull();
    expect(decorBlocker(world, DECOR_BY_ID.get('estandarteSenhor')!)).toBeNull();
    world.town.treasury = 5;
    expect(placeDecor(world, 2, 'poco').ok).toBe(false);
    world.town.treasury = 100;
    expect(placeDecor(world, 2, 'poco').ok).toBe(true);
    // O enfeite do bioma sai da página completa do bestiário.
    const urna = DECOR_BY_ID.get('urna')!;
    expect(decorBlocker(world, urna)).not.toBeNull();
    const c = codexOf(world);
    for (const e of BIOMES[0]!.enemies) c.monsters[e.id] = B.codexStoryKills;
    c.lords[BIOMES[0]!.boss.id] = 2;
    expect(decorBlocker(world, urna)).toBeNull();
    expect(placeDecor(world, 0, null).ok).toBe(true);
    expect(decorOf(world)[0]).toBeNull();
    expect(placeDecor(world, DECOR_POINTS, 'banco').ok).toBe(false);
  });

  it('nomes de ruas: com validação, sem repetir, e a crônica conta', () => {
    const world = createWorld(103);
    expect(streetName(world, 'praca')).toBe(STREETS[0]!.name);
    expect(renameStreet(world, 'praca', 'ab').ok).toBe(false);
    expect(renameStreet(world, 'praca', STREETS[1]!.name).ok).toBe(false);
    expect(renameStreet(world, 'estradaBaixo', 'Rua do Bram').ok).toBe(true);
    expect(streetName(world, 'estradaBaixo')).toBe('Rua do Bram');
    expect(world.chronicle.at(-1)!.text).toContain('passou a se chamar Rua do Bram');
  });

  it('o busto do memorial é de um herói caído', () => {
    const world = createWorld(104);
    const alive = createHero(world);
    alive.status = 'town';
    expect(setBust(world, alive.id).ok).toBe(false);
    alive.status = 'dead';
    expect(setBust(world, alive.id).ok).toBe(true);
    expect(world.town.bust).toBe(alive.id);
    expect(setBust(world, null).ok).toBe(true);
  });

  it('o save guarda a cosmética, e o save 11 sem ela abre igual', () => {
    const world = createWorld(105);
    setBanner(world, { field: color, charge: metal, symbol: 5 });
    placeDecor(world, 3, 'lampiao');
    renameStreet(world, 'ruaPortao', 'Rua da Vigília');
    const back = deserialize(serialize(world));
    expect(back.town.banner).toEqual(world.town.banner);
    expect(back.town.decor![3]).toBe('lampiao');
    expect(streetName(back, 'ruaPortao')).toBe('Rua da Vigília');
    const old = JSON.parse(serialize(createWorld(106))) as World;
    expect(() => deserialize(JSON.stringify(old))).not.toThrow();
    expect(LANDMARKS.paco.y).toBeGreaterThan(0);
  });
});
