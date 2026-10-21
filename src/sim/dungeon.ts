// Geração de andares, inimigos, corrupção e estimativa de dificuldade.

import { ACTS } from '../data/acts.ts';
import { record } from './chronicle.ts';
import { BALANCE as B, TICKS_PER_HOUR } from './config.ts';
import { hasSpec } from './economy.ts';
import { hasTrait, heroStrength } from './hero.ts';
import { chance, int, pick, range, weighted } from './rng.ts';
import type { Affix, Combat, EnemyUnitDef, Hero, Party, Room, RoomKind, Unit, World } from './types.ts';

export const AFFIXES: Affix[] = ['veloz', 'vampirico', 'explosivo', 'couracado', 'feroz'];

export const isBossFloor = (floor: number): boolean => floor === B.floorsPerAct - 1;

export function floorPower(world: World, act: number, floor: number): number {
  return ACTS[act]!.power * (1 + B.floorPowerGrowth * floor) * (1 + world.acts[act]!.corruption / B.corruptionStatDivisor);
}

export function travelTicks(act: number, floor: number): number {
  const depth = act * B.floorsPerAct + floor;
  return Math.round((B.descendHours + B.descendHoursPerFloor * depth) * TICKS_PER_HOUR);
}

// ── Inimigos ──────────────────────────────────────────────────────────────

interface SpawnOpts {
  elite?: boolean;
  boss?: boolean;
  affixes?: Affix[];
  nameOverride?: string;
}

export function makeEnemy(world: World, combat: Combat, def: EnemyUnitDef, act: number, floor: number, opts: SpawnOpts = {}): Unit {
  const power = floorPower(world, act, floor);
  const actDef = ACTS[act]!;
  const eliteMult = opts.elite ? 2.5 : 1;
  const affixes = opts.affixes ?? [];
  const rewardMult = opts.boss ? 40 : opts.elite ? 3 : 1;
  const floorMult = 1 + 0.2 * floor;
  let atk = def.atk * power * (opts.elite ? 1.3 : 1);
  let defense = def.def + actDef.defBonus + (opts.elite ? 10 : 0);
  let interval = def.interval;
  if (affixes.includes('feroz')) atk *= 1.4;
  if (affixes.includes('couracado')) defense *= 1.5;
  if (affixes.includes('veloz')) interval = Math.max(5, Math.round(interval * 0.7));
  const hp = def.hp * power * eliteMult;
  const affixLabel = affixes.length ? ` ${affixes.map((a) => a[0]!.toUpperCase() + a.slice(1)).join(' ')}` : '';
  return {
    uid: combat.nextUid++,
    side: 'enemy',
    heroId: null,
    name: opts.nameOverride ?? `${def.name}${affixLabel}`,
    maxHp: hp,
    hp,
    atk,
    def: defense,
    interval,
    cd: int(world.rng, 1, interval),
    pierce: 0,
    crit: 0.05,
    role: null,
    tags: def.tags,
    affixes,
    elite: !!opts.elite,
    alive: true,
    fled: false,
    poisonTicks: 0,
    poisonDps: 0,
    xp: B.xpPerEnemy * Math.pow(actDef.power, 1.2) * floorMult * (opts.boss ? 30 : opts.elite ? 3 : 1),
    gold: B.goldPerEnemy * Math.pow(actDef.power, 0.9) * floorMult * rewardMult * range(world.rng, 0.8, 1.2),
    material: opts.boss || chance(world.rng, opts.elite ? 0.8 : B.materialChance) ? actDef.material : null,
  };
}

export function spawnRoom(world: World, combat: Combat, room: Room, act: number, floor: number): Unit[] {
  const actDef = ACTS[act]!;
  const units: Unit[] = [];
  if (room.kind === 'chefe') {
    units.push(makeEnemy(world, combat, actDef.boss, act, floor, { boss: true }));
    for (let i = 0; i < actDef.boss.adds; i++) units.push(makeEnemy(world, combat, actDef.enemies[0]!, act, floor));
    return units;
  }
  if (room.kind === 'elite') {
    const n = 1 + (act >= 2 ? 1 : 0);
    const affixes: Affix[] = [];
    while (affixes.length < n) {
      const a = pick(world.rng, AFFIXES);
      if (!affixes.includes(a)) affixes.push(a);
    }
    units.push(makeEnemy(world, combat, pick(world.rng, actDef.enemies), act, floor, { elite: true, affixes }));
    const extra = int(world.rng, 1, 2);
    for (let i = 0; i < extra; i++) units.push(makeEnemy(world, combat, pick(world.rng, actDef.enemies), act, floor));
    return units;
  }
  const count = int(world.rng, 2, 3) + (floor >= 2 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const def = pick(world.rng, actDef.enemies);
    units.push(makeEnemy(world, combat, def, act, floor));
    if (def.tags.includes('swarm') && chance(world.rng, 0.5)) units.push(makeEnemy(world, combat, def, act, floor));
  }
  return units;
}

// ── Andares ───────────────────────────────────────────────────────────────

function rollRoomKind(world: World, floor: number): RoomKind {
  return weighted<RoomKind>(world.rng, [
    ['matilha', 55],
    ['elite', floor >= 1 ? 15 : 5],
    ['bau', 10],
    ['santuario', 8],
    ['vazia', 7],
    ['prisioneiro', 3],
  ]);
}

export function generateRooms(world: World, floor: number, curious: boolean): Room[] {
  const boss = isBossFloor(floor);
  const count = boss ? 4 : 4 + floor;
  const rooms: Room[] = [];
  for (let i = 0; i < count; i++) rooms.push({ kind: rollRoomKind(world, floor), cleared: false, remainsOf: null });
  if (curious) {
    const at = int(world.rng, 0, rooms.length);
    rooms.splice(at, 0, { kind: chance(world.rng, 0.6) ? 'bau' : 'elite', cleared: false, remainsOf: null });
  }
  if (boss) rooms.push({ kind: 'chefe', cleared: false, remainsOf: null });
  return rooms;
}

export function partyRooms(world: World, party: Party): Room[] {
  if (!party.persistent) return party.rooms;
  return world.acts[party.act]!.maps[party.floor] ?? party.rooms;
}

/** Prepara as salas ao chegar no andar: mapa persistente ou salas novas, mais restos de heróis caídos. */
export function enterFloor(world: World, party: Party, heroes: Hero[]): Room[] {
  const actState = world.acts[party.act]!;
  const curious = heroes.some((h) => hasTrait(h, 'curioso'));
  let rooms: Room[];
  if (!actState.conquered[party.floor]) {
    party.persistent = true;
    actState.maps[party.floor] ??= generateRooms(world, party.floor, curious);
    rooms = actState.maps[party.floor]!;
  } else {
    party.persistent = false;
    party.rooms = generateRooms(world, party.floor, curious);
    rooms = party.rooms;
  }
  const first = rooms.findIndex((r) => !r.cleared);
  for (const rem of world.remains) {
    if (rem.act !== party.act || rem.floor !== party.floor) continue;
    if (rooms.some((r) => r.kind === 'restos' && r.remainsOf === rem.heroId && !r.cleared)) continue;
    const at = first < 0 ? rooms.length : int(world.rng, first, Math.max(first, rooms.length - (isBossFloor(party.floor) ? 1 : 0)));
    rooms.splice(at, 0, { kind: 'restos', cleared: false, remainsOf: rem.heroId });
  }
  party.roomIndex = Math.max(0, rooms.findIndex((r) => !r.cleared));
  return rooms;
}

// ── Corrupção ─────────────────────────────────────────────────────────────

export function dailyCorruption(world: World): void {
  world.acts.forEach((act, i) => {
    if (!act.unlocked) return;
    const before = act.corruption;
    act.corruption = Math.min(100, act.corruption + B.corruptionPerDay * (act.bossDefeated ? 0.5 : 1));
    if (before < 70 && act.corruption >= 70) {
      record(world, 'corrupcao', [], `A corrupção ${ACTS[i]!.of} passou do limite: os monstros voltam a ocupar salas já limpas.`);
    }
    if (act.corruption < 70) return;
    act.maps.forEach((map, floor) => {
      if (!map || world.parties.some((p) => p.act === i && p.floor === floor && p.persistent)) return;
      const cleared = map.filter((r) => r.cleared && r.kind !== 'chefe');
      if (cleared.length > 0 && chance(world.rng, 0.3)) pick(world.rng, cleared).cleared = false;
    });
  });
}

export function reduceCorruption(world: World, act: number, amount: number): void {
  const a = world.acts[act]!;
  // A Penitência do templo pesa mais na corrupção a cada andar limpo.
  a.corruption = Math.max(0, a.corruption - amount * (hasSpec(world, 'penitencia') ? B.specPenitenciaCorruption : 1));
}

// ── Estimativa de dificuldade (o que os heróis "acham" do andar) ─────────

function enemyStrength(def: EnemyUnitDef, power: number, defBonus: number): { ehp: number; dps: number } {
  return { ehp: def.hp * power * (1 + (def.def + defBonus) / 100), dps: (def.atk * power * 10) / def.interval };
}

export function confidence(world: World, heroes: Hero[], act: number, floor: number): number {
  let ehp = 0;
  let dps = 0;
  const solo: number[] = [];
  for (const h of heroes) {
    const s = heroStrength(world, h);
    ehp += s.ehp;
    dps += s.dps;
    solo.push(Math.sqrt(s.ehp * s.dps));
  }
  const party = ehp * dps;
  // O grupo se preocupa com o elo mais fraco: um novato derruba a confiança de todos.
  const weakest = Math.min(...solo) / (solo.reduce((a, b) => a + b, 0) / solo.length);
  const actDef = ACTS[act]!;
  const power = floorPower(world, act, floor);
  const avg = actDef.enemies
    .map((e) => enemyStrength(e, power, actDef.defBonus))
    .reduce((s, e) => ({ ehp: s.ehp + e.ehp / actDef.enemies.length, dps: s.dps + e.dps / actDef.enemies.length }), { ehp: 0, dps: 0 });
  const packSize = 2.8 + (floor >= 2 ? 1 : 0);
  const pack = avg.ehp * packSize * avg.dps * packSize;
  const map = world.acts[act]!.maps[floor];
  const rooms = map ? map.filter((r) => !r.cleared && r.kind !== 'chefe').length : isBossFloor(floor) ? 4 : 4 + floor;
  let conf = Math.sqrt(party / (pack * Math.max(1, rooms) * 0.5));
  if (isBossFloor(floor)) {
    const boss = enemyStrength(actDef.boss, power, 0);
    const add = enemyStrength(actDef.enemies[0]!, power, actDef.defBonus);
    const bossFight = (boss.ehp + add.ehp * actDef.boss.adds) * (boss.dps + add.dps * actDef.boss.adds) * 2;
    const bossConf = Math.sqrt(party / bossFight);
    conf = Math.min(conf, rooms > 0 ? bossConf * 1.3 : bossConf);
  }
  // Viés de excesso de confiança: o grupo desce um degrau além do que aguenta.
  return conf * Math.sqrt(weakest) * B.confidenceBias;
}
