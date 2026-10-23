import { describe, expect, it } from 'vitest';
import { createWorld, heroStats, maxLevel } from '../src/sim/index.ts';
import type { ClassId, Hero, Party, World } from '../src/sim/index.ts';
import { combatTick, startCombat, syncHeroes } from '../src/sim/combat.ts';
import { confidence, levelDefBonus, levelPower, levelTier, makeEnemy } from '../src/sim/dungeon.ts';
import { commonItem, equip } from '../src/sim/items.ts';
import { createHero } from '../src/sim/hero.ts';

const CLASSES: ClassId[] = ['guardiao', 'clerigo', 'arqueiro', 'piromante'];

/** Um grupo "bem cuidado" no nível do abismo: rank A, no teto de nível, com o equipamento do nível. */
function keptParty(world: World, level: number): Hero[] {
  world.abyss.level = level;
  return CLASSES.map((classId) => {
    const h = createHero(world);
    h.classId = classId;
    h.rank = 'A';
    h.level = maxLevel(world, h);
    h.status = 'expedition';
    h.traits = [{ id: 'bravo', revealed: true }];
    h.morale = 100;
    const tier = levelTier(level) + 1;
    equip(world, h, commonItem(world, 'weapon', tier, 'teste'));
    equip(world, h, commonItem(world, 'armor', tier, 'teste'));
    h.hp = heroStats(world, h).maxHp;
    return h;
  });
}

const spotAt = (level: number) => ({ passageId: -1, level, biome: 0, rules: [], floor: 0 });

/** Vence quantas matilhas, de N, com a vida de volta a cada luta. */
function winRate(level: number, fights: number): number {
  let wins = 0;
  for (let i = 0; i < fights; i++) {
    const world = createWorld(100 + i);
    const heroes = keptParty(world, level);
    const party = {
      id: 1, memberIds: heroes.map((h) => h.id), startMemberIds: heroes.map((h) => h.id), ...spotAt(level), phase: 'combate', phaseEndsAt: 0,
      persistent: false, rooms: [], roomIndex: 0, retreating: false, combat: null, loot: { gold: 0, materials: {}, xp: 0 }, contractId: null,
      rescued: 0, dead: [], recallRequested: false, outcome: null, startedTick: 0, confidence: 1, moments: [],
    } as Party;
    party.combat = startCombat(world, party, { kind: 'elite', cleared: false, remainsOf: null });
    let result = 'andamento';
    for (let t = 0; t < 4000 && result === 'andamento'; t++) result = combatTick(world, party);
    syncHeroes(world, party.combat);
    if (result === 'vitoria') wins++;
  }
  return wins / fights;
}

describe('escala sem fim (M5 F3)', () => {
  it('a força dos monstros cresce perto do quadrado do nível, e a defesa para no nível 6', () => {
    expect(levelPower(6)).toBeCloseTo(9.2);
    expect(levelPower(12) / levelPower(6)).toBeCloseTo(4, 1);
    expect(levelDefBonus(6)).toBe(levelDefBonus(30));
    expect(levelTier(1)).toBe(0);
    expect(levelTier(6)).toBe(10);
    expect(levelTier(10)).toBe(26);
  });

  it('o teto de nível dos heróis sobe com o nível do abismo', () => {
    const world = createWorld(3);
    const hero = createHero(world);
    hero.rank = 'S';
    expect(maxLevel(world, hero)).toBe(30);
    world.abyss.level = 10;
    expect(maxLevel(world, hero)).toBe(66);
  });

  it('um grupo bem cuidado acha a mesma chance nos níveis 6, 10, 20 e 30', () => {
    const at = (level: number) => {
      const world = createWorld(7);
      return confidence(world, keptParty(world, level), spotAt(level));
    };
    const base = at(6);
    for (const level of [10, 20, 30]) {
      const ratio = at(level) / base;
      expect(ratio, `nível ${level}`).toBeGreaterThan(0.6);
      expect(ratio, `nível ${level}`).toBeLessThan(1.6);
    }
  });

  it('nas lutas de verdade também: o elite do nível 30 cai como o do nível 6', () => {
    const early = winRate(6, 12);
    const late = winRate(30, 12);
    expect(early).toBeGreaterThan(0.5);
    expect(Math.abs(late - early)).toBeLessThanOrEqual(0.35);
  });

  it('no nível 30 do pós-jogo os números continuam finitos e legíveis', () => {
    const world = createWorld(9);
    const heroes = keptParty(world, 30);
    const stats = heroStats(world, heroes[0]!);
    expect(Number.isFinite(stats.maxHp) && stats.maxHp < 1e7).toBe(true);
    const enemy = makeEnemy(world, { units: [], ticks: 0, enraged: false, isBoss: false, bossMech: null, mechCd: 0, echoesSpawned: false, nextUid: 1 }, { id: 'x', name: 'x', hp: 100, atk: 10, def: 10, interval: 12, tags: [] }, spotAt(30));
    expect(Number.isFinite(enemy.maxHp) && enemy.maxHp < 1e7).toBe(true);
    expect(Number.isFinite(enemy.gold) && Number.isFinite(enemy.xp)).toBe(true);
  });

  it('recrutas chegam à altura do mundo: mais nível e equipamento quando o abismo já desceu', () => {
    const world = createWorld(11);
    world.abyss.level = 8;
    const hero = createHero(world);
    expect(hero.level).toBeGreaterThanOrEqual(1 + 3 * 7);
    expect(hero.gear.weapon).toBe(Math.floor(levelTier(8) * 0.5));
  });
});
