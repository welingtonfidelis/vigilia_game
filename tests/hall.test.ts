import { describe, expect, it } from 'vitest';
import { createWorld, deserialize, serialize, TICKS_PER_DAY } from '../src/sim/index.ts';
import type { Child, Combat, Hero, Party, Unit, World } from '../src/sim/index.ts';
import { BALANCE as B, DAYS_PER_YEAR } from '../src/sim/config.ts';
import { BIOMES } from '../src/data/biomes.ts';
import { LEGENDARY_TITLES } from '../src/data/items.ts';
import { biomePageComplete, codexOf, legendaryBase, monsterStage, noteCombat, noteKill, noteLegendary, noteLordDefeat } from '../src/sim/codex.ts';
import { createHero } from '../src/sim/hero.ts';
import { birthIntoHouse, dailyHouses, fullName, houseOfHero, housesOf, renameHouse } from '../src/sim/houses.ts';
import { hallLevel, hallStatues, legendsOf, togglePinStatue } from '../src/sim/hall.ts';
import { dailyPeople, epitaph } from '../src/sim/people.ts';

function hero(world: World, status: Hero['status'] = 'town'): Hero {
  const h = createHero(world);
  h.status = status;
  return h;
}

const enemy = (defId: string, extra: Partial<Unit> = {}): Unit =>
  ({ side: 'enemy', alive: true, defId, name: defId, tags: [], elite: false, affixes: [], ...extra }) as unknown as Unit;

const partyAt = (biome: number, rules: Party['rules'] = [], lord?: number): Party => ({ biome, rules, lord }) as unknown as Party;

function child(world: World, parents: [Hero, Hero], bornDay = 0): Child {
  const c = { id: world.nextId++, name: `Cria ${world.nextId}`, gender: 'f', parents: [parents[0].id, parents[1].id], bornDay, trait: 'bravo', classId: 'guardiao', heirloom: null } as Child;
  world.children.push(c);
  birthIntoHouse(world, c, parents[0], parents[1]);
  return c;
}

describe('códex do Salão (M6 F5)', () => {
  it('a luta anota o lugar, as regras, os monstros vistos e os mistérios; os abates abrem os passos', () => {
    const world = createWorld(91);
    const combat = { units: [enemy('esqueleto'), enemy('rato', { elite: true }), enemy('acolito', { name: 'Eco de Bram' })] } as unknown as Combat;
    noteCombat(world, partyAt(0, ['nevoa']), combat);
    const c = codexOf(world);
    expect(c.biomes).toEqual([0]);
    expect(c.rules).toEqual(['nevoa']);
    expect(monsterStage(c, 'esqueleto')).toBe(1);
    expect(monsterStage(c, 'acolito')).toBe(0);
    expect(c.mysteries).toEqual(expect.arrayContaining(['passagens', 'elites', 'ecos']));
    for (let i = 0; i < B.codexHabitKills; i++) noteKill(world, enemy('esqueleto'));
    expect(monsterStage(c, 'esqueleto')).toBe(2);
    for (let i = B.codexHabitKills; i < B.codexStoryKills; i++) noteKill(world, enemy('esqueleto'));
    expect(monsterStage(c, 'esqueleto')).toBe(3);
    // O eco não conta como o monstro que ele imita.
    noteKill(world, enemy('acolito', { name: 'Eco de Bram' }));
    expect(c.monsters.acolito).toBeUndefined();
  });

  it('o Senhor: visto, vencido e sem baixas; a página fecha com os três monstros e o Senhor', () => {
    const world = createWorld(92);
    const c = codexOf(world);
    noteCombat(world, partyAt(0, [], 1), { units: [enemy('guardiaoUrnas', { tags: ['boss'] })] } as unknown as Combat);
    expect(c.lords.guardiaoUrnas).toBe(1);
    expect(c.mysteries).toContain('contrato');
    for (const e of BIOMES[0]!.enemies) c.monsters[e.id] = B.codexStoryKills;
    expect(biomePageComplete(c, 0)).toBe(false);
    noteLordDefeat(world, 1, false);
    expect(biomePageComplete(c, 0)).toBe(true);
    noteLordDefeat(world, 1, true);
    expect(c.lords.guardiaoUrnas).toBe(3);
    // O retorno do ciclo é o mesmo Senhor, e abre o mistério.
    noteLordDefeat(world, 11, false);
    expect(c.lords.guardiaoUrnas).toBe(3);
    expect(c.mysteries).toContain('retorno');
  });

  it('a lendária repetida ("Maré Negra II") é a mesma entrada', () => {
    const world = createWorld(93);
    const title = LEGENDARY_TITLES[3]!;
    expect(legendaryBase(`${title} II`)).toBe(title);
    noteLegendary(world, { rarity: 'lendaria', title: `${title} II` } as never);
    noteLegendary(world, { rarity: 'rara', title: null } as never);
    expect(codexOf(world).legendaries).toEqual([title]);
  });
});

describe('casas das famílias (M6 F5)', () => {
  it('o primeiro filho funda a casa; o segundo entra nela; a maioridade leva o nome', () => {
    const world = createWorld(94);
    const [a, b] = [hero(world), hero(world)];
    const first = child(world, [a, b]);
    const house = housesOf(world)[0]!;
    expect(first.houseId).toBe(house.id);
    expect(a.houseId).toBe(house.id);
    expect(world.chronicle.at(-1)!.text).toContain(`fundaram a casa ${house.name}`);
    child(world, [a, b]);
    expect(housesOf(world)).toHaveLength(1);
    // A criança cresce e pega em armas com o nome da casa.
    first.bornDay = -B.comingOfAgeYears * DAYS_PER_YEAR;
    world.tick = TICKS_PER_DAY;
    dailyPeople(world);
    const grown = world.heroes.find((h) => h.name === first.name)!;
    expect(grown.houseId).toBe(house.id);
    expect(fullName(world, grown)).toBe(`${grown.name} ${house.name}`);
  });

  it('quem casa com alguém de uma casa entra nela; com duas casas, a criança fica na mais antiga', () => {
    const world = createWorld(95);
    const [a, b, c, d] = [hero(world), hero(world), hero(world), hero(world)];
    child(world, [a, b]);
    child(world, [c, d]);
    const [older, newer] = housesOf(world);
    const heir = hero(world);
    heir.houseId = older!.id;
    const outsider = hero(world);
    const kid = child(world, [heir, outsider]);
    expect(kid.houseId).toBe(older!.id);
    expect(outsider.houseId).toBe(older!.id);
    const other = hero(world);
    other.houseId = newer!.id;
    expect(child(world, [other, heir]).houseId).toBe(older!.id);
  });

  it('feitos: três gerações no abismo e vinte anos sem baixas, com reputação', () => {
    const world = createWorld(96);
    const [a, b] = [hero(world), hero(world)];
    child(world, [a, b]);
    const house = housesOf(world)[0]!;
    const son = hero(world);
    son.houseId = house.id;
    son.parents = [a.id, b.id];
    const grandkid = hero(world);
    grandkid.houseId = house.id;
    grandkid.parents = [son.id, hero(world).id];
    for (const h of [a, son, grandkid]) h.stats.expeditions = 1;
    const rep = world.town.reputation;
    dailyHouses(world);
    expect(house.deeds.map((d) => d.id)).toEqual(['tresGeracoes']);
    expect(world.town.reputation).toBe(Math.min(100, rep + B.houseDeedReputation));
    world.tick = house.foundedTick + B.houseQuietYears * DAYS_PER_YEAR * TICKS_PER_DAY;
    dailyHouses(world);
    expect(house.deeds.map((d) => d.id)).toContain('vinteAnos');
  });

  it('o prefeito renomeia a casa; o epitáfio cita a casa', () => {
    const world = createWorld(97);
    const [a, b] = [hero(world), hero(world)];
    child(world, [a, b]);
    const house = houseOfHero(world, a)!;
    expect(renameHouse(world, house.id, 'x').ok).toBe(false);
    expect(renameHouse(world, house.id, 'Casa123').ok).toBe(false);
    expect(renameHouse(world, house.id, 'Alvacorte').ok).toBe(true);
    expect(house.name).toBe('Alvacorte');
    a.status = 'dead';
    a.death = { tick: 0, where: 'andar 1 das Catacumbas', by: 'Esqueleto' };
    expect(epitaph(world, a)).toContain('da casa Alvacorte');
  });
});

describe('Salão das Lendas (M6 F5)', () => {
  it('o nível sobe com as lendas e as estátuas são de quem deu o golpe final', () => {
    const world = createWorld(98);
    const slayers = [hero(world), hero(world), hero(world)];
    expect(hallLevel(world)).toBe(1);
    slayers.forEach((h, i) => world.metrics.bossKills.push({ level: i + 1, day: i * 10, slayerId: h.id, flawless: false }));
    expect(legendsOf(world).lords).toBe(3);
    // Dois pedestais no nível 1: os dois mais recentes.
    expect(hallStatues(world).map((h) => h.id)).toEqual([slayers[2]!.id, slayers[1]!.id]);
    expect(togglePinStatue(world, slayers[0]!.id).ok).toBe(true);
    expect(hallStatues(world).map((h) => h.id)).toEqual([slayers[0]!.id, slayers[2]!.id]);
    expect(togglePinStatue(world, hero(world).id).ok).toBe(false);
    for (let i = 0; i < B.hallLevel2Legends; i++) world.metrics.bossKills.push({ level: 4, day: 99 });
    expect(hallLevel(world)).toBe(2);
    expect(hallStatues(world)).toHaveLength(3);
  });

  it('save 11 de antes da F5 abre com o códex e as casas preenchidos', () => {
    const world = createWorld(99);
    const [a, b] = [hero(world), hero(world)];
    const kid = { id: world.nextId++, name: 'Ilda', gender: 'f', parents: [a.id, b.id], bornDay: 3, trait: 'bravo', classId: 'guardiao', heirloom: null } as Child;
    world.children.push(kid);
    world.metrics.bossKills.push({ level: 1, day: 50 });
    const old = JSON.parse(serialize(world)) as World;
    delete old.codex;
    delete old.houses;
    delete (old as { houseSeq?: number }).houseSeq;
    const back = deserialize(JSON.stringify(old));
    expect(back.codex!.lords.guardiaoUrnas).toBe(2);
    expect(back.codex!.biomes).toContain(0);
    expect(back.houses).toHaveLength(1);
    expect(back.children[0]!.houseId).toBe(back.houses![0]!.id);
    // E volta igual do save.
    expect(deserialize(serialize(back))).toEqual(back);
  });
});
