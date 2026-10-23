import { describe, expect, it } from 'vitest';
import { BIOMES, createWorld, heroStats, lordOf, maxLevel, TICKS_PER_SECOND } from '../src/sim/index.ts';
import type { ClassId, Combat, Hero, Party, World } from '../src/sim/index.ts';
import { BALANCE as B } from '../src/sim/config.ts';
import { combatTick, startCombat } from '../src/sim/combat.ts';
import { lairSpot, levelTier } from '../src/sim/dungeon.ts';
import { createHero } from '../src/sim/hero.ts';
import { commonItem, equip } from '../src/sim/items.ts';

/** Grupo forte no covil do Senhor do nível, já na sala dele. */
function lair(level: number, seed = 3): { world: World; party: Party; c: Combat; heroes: Hero[] } {
  const world = createWorld(seed);
  world.abyss.level = level;
  const classes: ClassId[] = ['guardiao', 'clerigo', 'arqueiro', 'piromante', 'selvagem'];
  const heroes = classes.map((classId) => {
    const h = createHero(world);
    h.classId = classId;
    h.rank = 'A';
    h.level = maxLevel(world, h);
    h.status = 'expedition';
    h.traits = [{ id: 'bravo', revealed: true }];
    h.morale = 100;
    equip(world, h, commonItem(world, 'weapon', levelTier(level) + 4, 'teste'));
    equip(world, h, commonItem(world, 'armor', levelTier(level) + 4, 'teste'));
    h.hp = heroStats(world, h).maxHp;
    return h;
  });
  const party = {
    id: 1, memberIds: heroes.map((h) => h.id), startMemberIds: heroes.map((h) => h.id), ...lairSpot(level), lord: level, phase: 'combate',
    phaseEndsAt: 0, persistent: false, rooms: [], roomIndex: 2, retreating: false, combat: null, loot: { gold: 0, materials: {}, xp: 0 },
    contractId: null, rescued: 0, dead: [], recallRequested: false, outcome: null, startedTick: 0, confidence: 1, moments: [],
  } as unknown as Party;
  const c = startCombat(world, party, { kind: 'chefe', cleared: false, remainsOf: null });
  party.combat = c;
  return { world, party, c, heroes };
}

const boss = (c: Combat) => c.units.find((u) => u.tags.includes('boss'))!;
const run = (world: World, party: Party, ticks: number) => {
  for (let i = 0; i < ticks; i++) combatTick(world, party);
};

describe('dimensões fundas (M5 F6): biomas', () => {
  it('quatro biomas novos, um por Senhor dos níveis 6 a 9, com material de sempre', () => {
    expect(BIOMES.slice(6).map((b) => [b.name, b.minLevel, b.material])).toEqual([
      ['Colmeia Pálida', 6, 'esporos'],
      ['Fossa Cantante', 7, 'perolas'],
      ['Cidadela de Engrenagens', 8, 'ferroNegro'],
      ['Deserto de Ossos', 9, 'ossos'],
    ]);
    for (let level = 6; level <= 9; level++) {
      const lord = lordOf(level);
      expect(lord.biome).toBe(level);
      expect(lord.name).toBe(BIOMES[level]!.boss.name);
    }
  });
});

describe('dimensões fundas (M5 F6): Senhores', () => {
  it('a Rainha dos Esporos solta zangões, e com zangão vivo leva menos dano', () => {
    const { world, party, c } = lair(6);
    const drone = BIOMES[6]!.enemies[0]!.name;
    // Conta os zangões que já entraram na luta (os heróis matam rápido; o que importa é que ela solta).
    const drones = () => c.units.filter((u) => u.name.startsWith(drone)).length;
    const before = drones();
    run(world, party, 61);
    expect(drones()).toBeGreaterThan(before);
    // Mesmo golpe com e sem zangão: compara a vida perdida pela Rainha num tique de ataque do arqueiro.
    const hit = (withDrone: boolean) => {
      const t = lair(6, 9);
      if (!withDrone) for (const u of t.c.units) if (u.side === 'enemy' && !u.tags.includes('boss')) u.alive = false;
      const queen = boss(t.c);
      const archer = t.c.units.find((u) => u.role === 'ranged')!;
      for (const u of t.c.units) u.cd = 9999;
      archer.cd = 1;
      const hp = queen.hp;
      combatTick(t.world, t.party);
      return hp - queen.hp;
    };
    expect(hit(true)).toBeLessThan(hit(false) * (1 - B.lordHiveGuard) * 1.25);
  });

  it('o Coro Submerso encanta quem mais bate, que perde a vez', () => {
    const { world, party, c } = lair(7);
    run(world, party, 61);
    const heroes = c.units.filter((u) => u.side === 'hero' && u.alive);
    const charmed = heroes.filter((u) => (u.charmedUntil ?? 0) > c.ticks);
    expect(charmed).toHaveLength(1);
    expect(charmed[0]!.atk).toBe(Math.max(...heroes.map((u) => u.atk)));
    expect(charmed[0]!.charmedUntil! - c.ticks).toBeLessThanOrEqual(B.lordCharmSeconds * TICKS_PER_SECOND);
  });

  it('o Colosso começa blindado: as placas tomam o dano antes da vida', () => {
    const { world, party, c } = lair(8);
    combatTick(world, party);
    const colossus = boss(c);
    expect(c.plates).toBeCloseTo(colossus.maxHp * B.lordPlates);
    run(world, party, 20);
    expect(c.plates!).toBeLessThan(colossus.maxHp * B.lordPlates);
    expect(colossus.hp).toBe(colossus.maxHp);
  });

  it('o Rei dos Ossuários levanta quem cai, sem ouro e só uma vez', () => {
    const { world, party, c } = lair(9);
    for (let i = 0; i < 400 && !c.units.some((u) => u.tags.includes('risen')); i++) combatTick(world, party);
    const risen = c.units.filter((u) => u.tags.includes('risen'));
    expect(risen.length).toBeGreaterThan(0);
    expect(risen.every((u) => u.gold === 0 && u.xp === 0)).toBe(true);
    const count = c.units.length;
    for (const u of risen) {
      u.hp = 0;
      u.alive = false;
    }
    expect(c.units.length).toBe(count);
  });
});
