import { describe, expect, it } from 'vitest';
import { autoMayor, commands, createWorld, deserialize, heroStats, runDays, serialize, DAYS_PER_YEAR } from '../src/sim/index.ts';
import type { Combat, CombatEvent, Hero, Party, Unit, World } from '../src/sim/index.ts';
import { BALANCE as B } from '../src/sim/config.ts';
import { ENCOUNTERS } from '../src/data/encounters.ts';
import { startCombat } from '../src/sim/combat.ts';
import { generateRooms, openPassage, spotOf } from '../src/sim/dungeon.ts';
import { resolveEncounter, startEncounter, waitingAdvice } from '../src/sim/encounters.ts';
import { addTrait, createHero } from '../src/sim/hero.ts';
import { seedRng } from '../src/sim/rng.ts';
import { highlightsFor, recordFights } from '../src/render/lane/replay.ts';

function expedition(world: World, n = 3): { party: Party; heroes: Hero[] } {
  const passage = openPassage(world);
  const heroes = Array.from({ length: n }, () => {
    const h = createHero(world);
    h.status = 'expedition';
    h.loyalty = 100;
    h.traits = [];
    return h;
  });
  const party = {
    id: 50, memberIds: heroes.map((h) => h.id), startMemberIds: heroes.map((h) => h.id), ...spotOf(passage, 0), phase: 'explorando',
    phaseEndsAt: 0, persistent: false, rooms: [], roomIndex: 0, retreating: false, combat: null, loot: { gold: 0, materials: {}, xp: 0 },
    contractId: null, rescued: 0, dead: [], recallRequested: false, outcome: null, startedTick: 0, confidence: 1, moments: [],
  } as unknown as Party;
  world.parties.push(party);
  return { party, heroes };
}

describe('encontros nas salas (M6 F3)', () => {
  it('parte das salas vazias vira encontro, sem mudar quantas salas o andar tem', () => {
    const world = createWorld(51);
    const passage = openPassage(world);
    let encounters = 0;
    for (let s = 1; s <= 200; s++) {
      const rooms = generateRooms(seedRng(s), passage, 1);
      expect(rooms.length).toBeGreaterThanOrEqual(5);
      expect(rooms.length).toBeLessThanOrEqual(7);
      encounters += rooms.filter((r) => r.kind === 'encontro').length;
    }
    expect(encounters).toBeGreaterThan(10);
  });

  it('o grupo manda o corvo, espera o conselho e segue o prefeito quando é leal', () => {
    const world = createWorld(52);
    const { party, heroes } = expedition(world);
    startEncounter(world, party, heroes);
    expect(waitingAdvice(world, party)).toBe(true);
    const def = ENCOUNTERS.find((e) => e.id === party.encounter!.defId)!;
    const prudent = def.options.find((o) => o.kind === 'prudente')!;
    world.town.mayorEnergy = 0;
    expect(commands.adviseEncounter(world, party.id, prudent.id).ok).toBe(false);
    world.town.mayorEnergy = 2;
    expect(commands.adviseEncounter(world, party.id, 'nao-existe').ok).toBe(false);
    expect(commands.adviseEncounter(world, party.id, prudent.id).ok).toBe(true);
    expect(world.town.mayorEnergy).toBe(1);
    expect(commands.adviseEncounter(world, party.id, prudent.id).ok).toBe(false);
    expect(waitingAdvice(world, party)).toBe(false);
    resolveEncounter(world, party, heroes);
    expect(party.encounter).toBeNull();
    expect(world.metrics.encounters!.followed).toBe(1);
    expect(world.chronicle.at(-1)!.text).toContain('seguiram o conselho do prefeito');
  });

  it('sem conselho, o Curioso arrisca; a bênção vale nas lutas até o fim da descida', () => {
    const world = createWorld(53);
    const { party, heroes } = expedition(world);
    addTrait(world, heroes[0]!, 'curioso', '');
    party.encounter = { defId: 'altar-sangue', untilTick: world.tick, advice: null };
    const before = heroes.map((h) => h.hp);
    resolveEncounter(world, party, heroes);
    // Ousada no altar: o grupo sangra (com ou sem a bênção).
    expect(heroes.every((h, i) => h.hp < before[i]!)).toBe(true);
    party.boons = { atk: 1.1, def: 1 };
    const c = startCombat(world, party, { kind: 'vazia', cleared: false, remainsOf: null });
    const unit = c.units.find((u) => u.heroId === heroes[0]!.id)!;
    expect(unit.atk).toBeCloseTo(heroStats(world, heroes[0]!).atk * 1.1);
  });

  it('o Supersticioso passa longe', () => {
    const world = createWorld(54);
    const { party, heroes } = expedition(world);
    addTrait(world, heroes[1]!, 'supersticioso', '');
    party.encounter = { defId: 'sarcofago', untilTick: world.tick, advice: null };
    resolveEncounter(world, party, heroes);
    expect(world.chronicle.at(-1)!.text).toContain('deixar o morto em paz');
  });

  it('todo encontro tem uma opção ousada, uma prudente e textos sem buraco; nunca dá fragmento', () => {
    expect(ENCOUNTERS).toHaveLength(24);
    for (const e of ENCOUNTERS) {
      expect(e.options.some((o) => o.kind === 'ousada')).toBe(true);
      expect(e.options.some((o) => o.kind === 'prudente')).toBe(true);
      for (const o of e.options) for (const out of o.outcomes) expect(out.text('Ana')).not.toMatch(/undefined|\$\{/);
    }
    expect(JSON.stringify(ENCOUNTERS)).not.toContain('fragment');
  });

  it('a campanha anda com encontros, o prefeito automático aconselha e o save volta igual no meio da espera', () => {
    const world = createWorld(55);
    runDays(world, 3 * DAYS_PER_YEAR, { onHour: autoMayor });
    expect(world.metrics.encounters!.met).toBeGreaterThan(0);
    expect(world.metrics.encounters!.advised).toBeGreaterThan(0);
    const { party, heroes } = expedition(world);
    startEncounter(world, party, heroes);
    const back = deserialize(serialize(world));
    expect(back.parties.find((p) => p.id === party.id)!.encounter).toEqual(party.encounter);
    expect(B.encounterWaitTicks).toBeGreaterThan(100);
  });
});

describe('melhores momentos (M6 F3)', () => {
  it('guarda a luta com morte, com título, e corta o começo das lutas longas sem perder a vida certa', () => {
    const hero = { uid: 1, side: 'hero', heroId: 7, name: 'Bram', maxHp: 100, hp: 100, alive: true, tags: [] } as unknown as Unit;
    const foe = { uid: 2, side: 'enemy', heroId: null, name: 'Esqueleto', maxHp: 50, hp: 50, alive: true, tags: [] } as unknown as Unit;
    const combat = { units: [hero, foe], ticks: 0, log: [] as CombatEvent[] } as unknown as Combat;
    const party = { id: 77, phase: 'combate', combat, memberIds: [7], rooms: [], rules: [], passageId: 1, level: 1, biome: 0, floor: 0, roomIndex: 0 } as unknown as Party;
    const world = { parties: [party], heroes: [{ id: 7, name: 'Bram' }] } as unknown as World;
    recordFights(world);
    let n = 0;
    for (let i = 0; i < 300; i++) combat.log!.push({ n: ++n, t: i, kind: 'hit', from: 2, to: 1, amount: 0.2, crit: false, kill: false });
    combat.log!.push({ n: ++n, t: 300, kind: 'hit', from: 2, to: 1, amount: 100, crit: false, kill: true });
    recordFights(world);
    party.combat = null;
    party.phase = 'explorando';
    recordFights(world);
    const [best] = highlightsFor(77);
    expect(best!.title).toBe('A queda de Bram');
    expect(best!.events.length).toBeLessThanOrEqual(220);
    // A vida do começo do replay já conta os golpes cortados.
    expect(best!.units.find((u) => u.uid === 1)!.hp).toBeLessThan(100);
  });
});
