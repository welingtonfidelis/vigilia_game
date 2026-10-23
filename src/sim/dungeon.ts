// Abismo (M5): o nível, as passagens para dimensões geradas por semente, os inimigos de
// cada sala, a pressão do abismo e a estimativa de dificuldade que os grupos fazem.

import { BIOMES } from '../data/biomes.ts';
import { CLASSES } from '../data/classes.ts';
import { lordOf } from '../data/lords.ts';
import { DIM_RULE_IDS, rulesLabel } from '../data/rules.ts';
import { dayOf } from './calendar.ts';
import { listNames, record } from './chronicle.ts';
import { BALANCE as B, TICKS_PER_HOUR } from './config.ts';
import { EFFECTS, grade, hasSpec } from './economy.ts';
import { hasTrait, heroStrength } from './hero.ts';
import { chance, int, pick, range, seedRng, shuffle, weighted, type RngState } from './rng.ts';
import type { Affix, Combat, EnemyUnitDef, Hero, Party, Passage, Room, RoomKind, Spot, Unit, World } from './types.ts';
import { difficultyOf } from './difficulty.ts';

export const AFFIXES: Affix[] = ['veloz', 'vampirico', 'explosivo', 'couracado', 'feroz'];

// ── Força ─────────────────────────────────────────────────────────────────

/** Força dos monstros no nível do abismo: a tabela até o 6, depois cresce com o quadrado. */
export function levelPower(level: number): number {
  const table = B.levelPower;
  if (level <= table.length) return table[Math.max(1, level) - 1]!;
  return table[table.length - 1]! * (level / table.length) ** 2;
}

/**
 * Defesa somada aos monstros do nível. Para de crescer no nível 6: com a vida e o ataque
 * crescendo no quadrado, uma defesa sem teto alongaria as lutas até a fúria decidir tudo.
 */
export const levelDefBonus = (level: number): number => B.defBonusPerLevel * (Math.min(Math.max(1, level), B.defBonusMaxLevel) - 1);

/** Tier do saque de um nível do abismo (no andar 0): 2 por nível até o 6, depois 4. */
export function levelTier(level: number): number {
  const n = Math.max(1, level);
  const early = Math.min(n, B.tierEarlyLevels) - 1;
  return early * B.tierPerLevelEarly + Math.max(0, n - B.tierEarlyLevels) * B.tierPerLevelLate;
}

const threatOf = (def: EnemyUnitDef): number => def.hp * (1 + def.def / 100) * ((def.atk * 10) / def.interval);

/**
 * Normalização por bioma: os monstros de cada bioma ficam com a mesma ameaça média que os
 * das Catacumbas. O bioma muda o jeito da luta (couraça, enxame, retaguarda), não a força.
 */
export const BIOME_NORM: readonly number[] = (() => {
  const avg = (i: number) => BIOMES[i]!.enemies.reduce((s, e) => s + threatOf(e), 0) / BIOMES[i]!.enemies.length;
  const base = avg(0);
  return BIOMES.map((_, i) => Math.sqrt(base / avg(i)));
})();

/** Bioma de cada monstro (pelo id), para o invasor manter a normalização de casa. */
const BIOME_OF_ENEMY = new Map<string, number>(BIOMES.flatMap((b, i) => b.enemies.map((e) => [e.id, i] as [string, number])));

export function floorPower(world: World, spot: Spot): number {
  const pressure = passageOf(world, spot.passageId)?.pressure ?? 0;
  return levelPower(spot.level) * (1 + B.floorPowerGrowth * spot.floor) * (1 + pressure / B.pressureStatDivisor) * difficultyOf(world).enemy;
}

/** A pressão que a vila sente: a da passagem mais pressionada (0 sem passagem aberta). */
export function abyssPressure(world: World): number {
  return world.abyss.passages.reduce((max, p) => (p.sealed ? max : Math.max(max, p.pressure)), 0);
}

/** A passagem mais pressionada: é dela que sobe a incursão. */
export function worstPassage(world: World): Passage | undefined {
  return world.abyss.passages.reduce<Passage | undefined>((worst, p) => (!p.sealed && (!worst || p.pressure > worst.pressure) ? p : worst), undefined);
}

export function travelTicks(spot: Spot): number {
  const depth = (Math.max(1, spot.level) - 1) * B.descendFloorsPerLevel + spot.floor;
  const tide = spot.rules.includes('mare') ? 1 : 0;
  return Math.round((B.descendHours + B.descendHoursPerFloor * depth + tide) * TICKS_PER_HOUR);
}

// ── Inimigos ──────────────────────────────────────────────────────────────

interface SpawnOpts {
  elite?: boolean;
  boss?: boolean;
  guardian?: boolean;
  affixes?: Affix[];
  nameOverride?: string;
}

export function makeEnemy(world: World, combat: Combat, def: EnemyUnitDef, spot: Spot, opts: SpawnOpts = {}): Unit {
  const home = BIOME_OF_ENEMY.get(def.id) ?? spot.biome;
  const power = floorPower(world, spot) * (opts.boss ? B.lordPower * lordOf(spot.lord ?? spot.level).power : (BIOME_NORM[home] ?? 1));
  const eliteMult = opts.guardian ? B.guardianHp : opts.elite ? 2.5 : 1;
  const affixes = opts.affixes ?? [];
  const rewardMult = opts.boss ? 40 : opts.guardian ? B.sealGoldPacks : opts.elite ? 3 : 1;
  const floorMult = 1 + 0.2 * spot.floor;
  const lp = levelPower(spot.level);
  let atk = def.atk * power * (opts.elite || opts.guardian ? 1.3 : 1) * (spot.rules.includes('calor') ? 1.2 : 1);
  let defense = def.def + levelDefBonus(spot.level) + (opts.elite || opts.guardian ? 10 : 0);
  let interval = def.interval * (spot.rules.includes('mare') ? 1.15 : 1);
  // Letalidade: fora o Senhor, mais ataque e menos vida na mesma proporção. A ameaça
  // (vida × dano) e a confiança ficam iguais; a luta fica mais curta e mais perigosa.
  if (!opts.boss) atk *= B.enemyLethality;
  if (affixes.includes('feroz')) atk *= 1.4;
  if (affixes.includes('couracado')) defense *= 1.5;
  if (affixes.includes('veloz')) interval *= 0.7;
  interval = Math.max(5, Math.round(interval));
  const hp = (def.hp * power * eliteMult) / (opts.boss ? 1 : B.enemyLethality);
  const affixLabel = affixes.length ? ` ${affixes.map((a) => a[0]!.toUpperCase() + a.slice(1)).join(' ')}` : '';
  const title = opts.guardian ? `${def.name} Guardião` : def.name;
  return {
    uid: combat.nextUid++,
    side: 'enemy',
    heroId: null,
    name: opts.nameOverride ?? `${title}${affixLabel}`,
    maxHp: hp,
    hp,
    atk,
    def: defense,
    interval,
    cd: int(world.rng, 1, interval),
    pierce: 0,
    crit: 0.05 * (spot.rules.includes('nevoa') ? 0.5 : 1),
    role: null,
    tags: opts.guardian ? [...def.tags, 'guardian'] : def.tags,
    affixes,
    elite: !!(opts.elite || opts.guardian),
    alive: true,
    fled: false,
    poisonTicks: 0,
    poisonDps: 0,
    xp: B.xpPerEnemy * Math.pow(lp, 1.2) * floorMult * (opts.boss ? 30 : opts.guardian ? 10 : opts.elite ? 3 : 1),
    gold: B.goldPerEnemy * Math.pow(lp, 0.9) * floorMult * rewardMult * range(world.rng, 0.8, 1.2) * (spot.rules.includes('calor') ? 1.3 : 1),
    material: opts.boss || opts.guardian || chance(world.rng, opts.elite ? 0.8 : B.materialChance) ? BIOMES[spot.biome]!.material : null,
  };
}

/** Afixos do Senhor por desafio: 1 até o nível 3, 2 depois (M5 F5). */
export const lordAffixCount = (level: number): number => (level <= B.lordAffixOneUntil ? 1 : 2);

/** Afixos de elite pelo nível: 1 até o nível 2, 2 até o 5 e 3 depois. */
export const eliteAffixCount = (level: number): number => (level <= 2 ? 1 : level <= 5 ? 2 : 3);

/** O Senhor não explode: 8% da vida dele em cada herói mataria o grupo na hora da vitória. */
const LORD_AFFIXES: Affix[] = AFFIXES.filter((a) => a !== 'explosivo');

function rollAffixes(world: World, spot: Spot, n: number, pool: Affix[] = AFFIXES): Affix[] {
  const blood = spot.rules.includes('luaSangue') ? 2 : 1;
  const affixes: Affix[] = [];
  while (affixes.length < Math.min(n, pool.length)) {
    const a = weighted<Affix>(world.rng, pool.map((x) => [x, x === 'vampirico' ? blood : 1] as const));
    if (!affixes.includes(a)) affixes.push(a);
  }
  return affixes;
}

/** O mais forte do bioma vira o guardião da passagem. */
export const guardianDef = (biome: number): EnemyUnitDef =>
  BIOMES[biome]!.enemies.reduce((best, e) => (e.hp * e.atk > best.hp * best.atk ? e : best));

/** Biomas que podem mandar um invasor (os liberados no nível, menos o da casa). */
const invaderBiomes = (spot: Spot): number[] => availableBiomes(spot.level).filter((b) => b !== spot.biome);

export function spawnRoom(world: World, combat: Combat, room: Room, spot: Spot): Unit[] {
  const biome = BIOMES[spot.biome]!;
  const units: Unit[] = [];
  if (room.kind === 'chefe') {
    // O Senhor nunca luta igual: cada desafio sorteia os afixos dele (a confiança não sabe quais).
    const lord = lordOf(spot.lord ?? spot.level);
    units.push(makeEnemy(world, combat, lord, spot, { boss: true, affixes: rollAffixes(world, spot, lordAffixCount(spot.lord ?? spot.level), LORD_AFFIXES) }));
    for (let i = 0; i < lord.adds; i++) units.push(makeEnemy(world, combat, BIOMES[lord.biome]!.enemies[0]!, spot));
    return units;
  }
  if (room.kind === 'guardiao') {
    const affixes = rollAffixes(world, spot, spot.level < 5 ? 2 : 3);
    units.push(makeEnemy(world, combat, guardianDef(spot.biome), spot, { guardian: true, affixes }));
    for (let i = 0; i < B.guardianAdds; i++) units.push(makeEnemy(world, combat, pick(world.rng, biome.enemies), spot));
    return units;
  }
  if (room.kind === 'elite') {
    const affixes = rollAffixes(world, spot, eliteAffixCount(spot.level));
    units.push(makeEnemy(world, combat, pick(world.rng, biome.enemies), spot, { elite: true, affixes }));
    const extra = int(world.rng, 1, 2);
    for (let i = 0; i < extra; i++) units.push(makeEnemy(world, combat, pick(world.rng, biome.enemies), spot));
    return units;
  }
  const count = int(world.rng, 2, 3) + (spot.floor >= 2 ? 1 : 0);
  const invaders = spot.level >= B.invaderMinLevel ? invaderBiomes(spot) : [];
  const invaderAt = invaders.length > 0 && chance(world.rng, B.invaderChance) ? int(world.rng, 0, count - 1) : -1;
  for (let i = 0; i < count; i++) {
    const def = i === invaderAt ? pick(world.rng, BIOMES[pick(world.rng, invaders)]!.enemies) : pick(world.rng, biome.enemies);
    units.push(makeEnemy(world, combat, def, spot));
    if (def.tags.includes('swarm') && chance(world.rng, 0.5)) units.push(makeEnemy(world, combat, def, spot));
  }
  // Ecos: de vez em quando, um herói morto volta como eco no meio da matilha.
  if (spot.rules.includes('ecos') && chance(world.rng, 0.3)) {
    const fallen = world.heroes.filter((h) => h.status === 'dead');
    if (fallen.length > 0) {
      const lost = pick(world.rng, fallen);
      const echo = makeEnemy(world, combat, biome.enemies[0]!, spot, { nameOverride: `Eco de ${lost.name}` });
      units.push({ ...echo, maxHp: echo.maxHp * 1.5, hp: echo.hp * 1.5 });
    }
  }
  return units;
}

// ── Passagens ─────────────────────────────────────────────────────────────

/** Andares de uma passagem do nível: 3 no nível 1, um a mais a cada 3 níveis, até 6. */
export const passageFloors = (level: number): number =>
  Math.min(B.passageFloorsMax, B.passageFloorsBase + Math.floor((Math.max(1, level) - 1) / B.passageFloorsEvery));

/** Biomas que uma passagem nova pode sortear no nível. */
export const availableBiomes = (level: number): number[] => BIOMES.flatMap((b, i) => (b.minLevel <= level ? [i] : []));

/** Regras de uma passagem: nenhuma ou 1 até o nível 4, 1 ou 2 até o 9 e 2 depois. */
function ruleCount(r: RngState, level: number): number {
  if (level <= 4) return chance(r, 0.5) ? 1 : 0;
  if (level <= 9) return int(r, 1, 2);
  return 2;
}

/** O mundo de uma passagem sai inteiro da semente: mesma semente, mesmo mundo. */
export function generatePassage(id: number, seed: number, level: number, day: number): Passage {
  const r = seedRng(seed);
  const biome = pick(r, availableBiomes(level));
  const rules = shuffle(r, [...DIM_RULE_IDS]).slice(0, ruleCount(r, level));
  const floors = passageFloors(level);
  return {
    id,
    seed,
    level,
    biome,
    rules,
    floors,
    discovered: false,
    openedDay: day,
    closesDay: day + B.passageDays,
    conquered: Array.from({ length: floors }, () => false),
    maps: Array.from({ length: floors }, () => null),
    sealed: false,
    pressure: B.pressureStart,
  };
}

/** Abre uma passagem nova no nível atual. Ninguém sabe o que há nela até entrar. */
export function openPassage(world: World): Passage {
  const seed = int(world.rng, 1, 0x7fffffff);
  const passage = generatePassage(world.nextId++, seed, world.abyss.level, dayOf(world.tick));
  world.abyss.passages.push(passage);
  world.metrics.passagesOpened++;
  return passage;
}

export const passageOf = (world: World, id: number): Passage | undefined => world.abyss.passages.find((p) => p.id === id);

/** Passagens que ainda recebem grupos (as seladas só esperam o último sair). */
export const openPassages = (world: World): Passage[] => world.abyss.passages.filter((p) => !p.sealed);

/** Quantas passagens a guilda consegue acompanhar ao mesmo tempo. */
export const passageCapacity = (world: World): number => EFFECTS.parties(grade(world, 'guilda'));

export const isGuardianFloor = (passage: Passage, floor: number): boolean => floor === passage.floors - 1;

/** O lugar de um andar da passagem, como o grupo leva. */
export const spotOf = (passage: Passage, floor: number): Spot => ({
  passageId: passage.id,
  level: passage.level,
  biome: passage.biome,
  rules: [...passage.rules],
  floor,
});

function rollRoomKind(r: RngState, passage: Passage, floor: number): RoomKind {
  const greed = passage.rules.includes('ganancia') ? 1.5 : 1;
  return weighted<RoomKind>(r, [
    ['matilha', 55],
    ['elite', (floor >= 1 ? 15 : 5) * greed],
    ['bau', 10 * greed],
    ['santuario', 8],
    ['vazia', 7],
    ['prisioneiro', 3],
    ['mercador', floor >= 1 ? 3 : 0],
    ['armadilha', floor >= 1 ? 6 : 0],
  ]);
}

/** Salas de um andar. O mapa persistente sai da semente da passagem; a refeita, do mundo. */
export function generateRooms(r: RngState, passage: Passage, floor: number): Room[] {
  const guardian = isGuardianFloor(passage, floor);
  const count = guardian ? 4 : 4 + floor + int(r, 0, 2);
  const rooms: Room[] = [];
  for (let i = 0; i < count; i++) rooms.push({ kind: rollRoomKind(r, passage, floor), cleared: false, remainsOf: null });
  if (guardian) rooms.push({ kind: 'guardiao', cleared: false, remainsOf: null });
  return rooms;
}

/** Semente do mapa de um andar: a mesma passagem dá sempre o mesmo andar. */
export const floorRng = (passage: Passage, floor: number): RngState => seedRng((passage.seed ^ Math.imul(floor + 1, 0x9e3779b1)) >>> 0);

/** Id de passagem do covil de um Senhor (não existe na lista de passagens). */
export const LAIR_ID = -1;

/** O covil do Senhor do nível: o bioma dele, no fundo do abismo (o andar mais fundo do nível). */
export function lairSpot(level: number): Spot {
  return { passageId: LAIR_ID, level, biome: lordOf(level).biome, rules: [], floor: passageFloors(level) - 1, lord: level };
}

/** Salas do covil: as guardas (elites) e o Senhor no fim. */
export const lairRooms = (): Room[] => [
  ...Array.from({ length: B.lordGuards }, (): Room => ({ kind: 'elite', cleared: false, remainsOf: null })),
  { kind: 'chefe', cleared: false, remainsOf: null },
];

export function partyRooms(world: World, party: Party): Room[] {
  if (!party.persistent) return party.rooms;
  return passageOf(world, party.passageId)?.maps[party.floor] ?? party.rooms;
}

/** Prepara as salas ao chegar no andar: mapa persistente ou salas novas, mais restos de heróis caídos. */
export function enterFloor(world: World, party: Party, heroes: Hero[]): Room[] {
  // Covil do Senhor: as salas vieram prontas no contrato.
  if (party.lord) {
    party.persistent = false;
    party.roomIndex = Math.max(0, party.rooms.findIndex((r) => !r.cleared));
    return party.rooms;
  }
  const passage = passageOf(world, party.passageId);
  if (!passage) {
    party.persistent = false;
    party.rooms = [];
    return party.rooms;
  }
  if (!passage.discovered) {
    passage.discovered = true;
    const biome = BIOMES[passage.biome]!;
    const rules = passage.rules.length ? `, sob ${rulesLabel(passage.rules)}` : ', em Calmaria';
    record(world, 'passagem', party.memberIds, `${listNames(heroes)} abriram passagem para ${biome.name}${rules} (nível ${passage.level} do abismo).`);
  }
  // O Curioso puxa o grupo para um desvio quando o andar é traçado: um baú ou um elite a mais.
  const detour = (rooms: Room[]): Room[] => {
    if (!heroes.some((h) => hasTrait(h, 'curioso'))) return rooms;
    const at = int(world.rng, 0, rooms.length - (isGuardianFloor(passage, party.floor) ? 1 : 0));
    rooms.splice(at, 0, { kind: chance(world.rng, 0.6) ? 'bau' : 'elite', cleared: false, remainsOf: null });
    return rooms;
  };
  let rooms: Room[];
  if (!passage.conquered[party.floor]) {
    party.persistent = true;
    passage.maps[party.floor] ??= detour(generateRooms(floorRng(passage, party.floor), passage, party.floor));
    rooms = passage.maps[party.floor]!;
  } else {
    party.persistent = false;
    party.rooms = detour(generateRooms(world.rng, passage, party.floor));
    rooms = party.rooms;
  }
  const first = rooms.findIndex((r) => !r.cleared);
  for (const rem of world.remains) {
    if (rem.passageId !== party.passageId || rem.floor !== party.floor) continue;
    if (rooms.some((r) => r.kind === 'restos' && r.remainsOf === rem.heroId && !r.cleared)) continue;
    const at = first < 0 ? rooms.length : int(world.rng, first, Math.max(first, rooms.length - (isGuardianFloor(passage, party.floor) ? 1 : 0)));
    rooms.splice(at, 0, { kind: 'restos', cleared: false, remainsOf: rem.heroId });
  }
  party.roomIndex = Math.max(0, rooms.findIndex((r) => !r.cleared));
  return rooms;
}

// ── Pressão do abismo e fechamento das passagens ─────────────────────────

export function dailyPressure(world: World): void {
  const rise = B.pressurePerDay * difficultyOf(world).corruption;
  for (const passage of openPassages(world)) {
    const before = passage.pressure;
    passage.pressure = Math.min(100, passage.pressure + rise);
    if (before < B.pressureReoccupy && passage.pressure >= B.pressureReoccupy && passage.discovered) {
      record(world, 'corrupcao', [], `A pressão na passagem para ${BIOMES[passage.biome]!.name} passou do limite: os monstros voltam a ocupar salas já limpas.`);
    }
    if (passage.pressure < B.pressureReoccupy) continue;
    passage.maps.forEach((map, floor) => {
      if (!map || world.parties.some((p) => p.passageId === passage.id && p.floor === floor && p.persistent)) return;
      const cleared = map.filter((r) => r.cleared && r.kind !== 'guardiao' && r.kind !== 'restos');
      if (cleared.length > 0 && chance(world.rng, 0.3)) pick(world.rng, cleared).cleared = false;
    });
  }
  closePassages(world);
}

/**
 * Fecha as passagens seladas e as que passaram do prazo, assim que nenhum grupo estiver
 * nelas. Os restos que ficaram lá se perdem; os contratos voltam para o tesouro.
 */
export function closePassages(world: World): void {
  const day = dayOf(world.tick);
  for (const passage of [...world.abyss.passages]) {
    if (!passage.sealed && day < passage.closesDay) continue;
    if (world.parties.some((p) => p.passageId === passage.id)) continue;
    world.abyss.passages = world.abyss.passages.filter((p) => p !== passage);
    const biome = BIOMES[passage.biome]!;
    for (const rem of world.remains.filter((r) => r.passageId === passage.id)) {
      const lost = world.heroes.find((h) => h.id === rem.heroId);
      if (lost) record(world, 'restos', [lost.id], `A passagem para ${biome.name} se fechou com os restos de ${lost.name} do outro lado.`);
    }
    world.remains = world.remains.filter((r) => r.passageId !== passage.id);
    for (const contract of world.town.contracts.filter((c) => c.passageId === passage.id)) world.town.treasury += contract.reward;
    world.town.contracts = world.town.contracts.filter((c) => c.passageId !== passage.id);
    if (!passage.sealed && passage.discovered) record(world, 'passagem', [], `A passagem para ${biome.name} se fechou sozinha.`);
  }
}

export function reducePressure(world: World, passageId: number, amount: number): void {
  const passage = passageOf(world, passageId);
  if (!passage) return;
  // A Penitência do templo pesa mais na pressão a cada sala e andar limpos.
  passage.pressure = Math.max(0, passage.pressure - amount * (hasSpec(world, 'penitencia') ? B.specPenitenciaCorruption : 1));
}

// ── Estimativa de dificuldade (o que os heróis "acham" do andar) ─────────

function enemyStrength(def: EnemyUnitDef, power: number, defBonus: number): { ehp: number; dps: number } {
  return { ehp: def.hp * power * (1 + (def.def + defBonus) / 100), dps: (def.atk * power * 10) / def.interval };
}

/**
 * Confiança do grupo num andar: o poder dele contra o das matilhas e, no último andar,
 * contra o guardião. Sem `passage`, é um mundo ainda desconhecido (andares padrão).
 */
export function confidence(world: World, heroes: Hero[], spot: Spot, passage?: Passage): number {
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
  const biome = BIOMES[spot.biome]!;
  const power = floorPower(world, spot) * BIOME_NORM[spot.biome]!;
  const defBonus = levelDefBonus(spot.level);
  const avg = biome.enemies
    .map((e) => enemyStrength(e, power, defBonus))
    .reduce((s, e) => ({ ehp: s.ehp + e.ehp / biome.enemies.length, dps: s.dps + e.dps / biome.enemies.length }), { ehp: 0, dps: 0 });
  const packSize = 2.8 + (spot.floor >= 2 ? 1 : 0);
  const pack = avg.ehp * packSize * avg.dps * packSize;
  const guardianFloor = passage ? isGuardianFloor(passage, spot.floor) : spot.floor === passageFloors(spot.level) - 1;
  const map = passage?.maps[spot.floor];
  const rooms = map ? map.filter((r) => !r.cleared && r.kind !== 'guardiao').length : guardianFloor ? 4 : 5 + spot.floor;
  let conf = Math.sqrt(party / (pack * Math.max(1, rooms) * 0.5));
  if (guardianFloor) {
    const g = guardianDef(spot.biome);
    const boss = enemyStrength(g, power * B.guardianHp, defBonus + 10);
    boss.dps *= 1.3;
    const fight = (boss.ehp + avg.ehp * B.guardianAdds) * (boss.dps + avg.dps * B.guardianAdds) * 2;
    const guardConf = Math.sqrt(party / fight);
    conf = Math.min(conf, rooms > 0 ? guardConf * 1.3 : guardConf);
  }
  // Viés de excesso de confiança: o grupo desce um degrau além do que aguenta.
  return conf * Math.sqrt(weakest) * B.confidenceBias;
}

/** Confiança numa passagem nova: a média dos biomas possíveis, com o desconto do mistério. */
export function mysteryConfidence(world: World, heroes: Hero[]): number {
  const level = world.abyss.level;
  const biomes = availableBiomes(level);
  const total = biomes.reduce((s, biome) => s + confidence(world, heroes, { passageId: -1, level, biome, rules: [], floor: 0 }), 0);
  return (total / biomes.length) * B.mysteryConfidence;
}

/**
 * Confiança de um grupo contra o Senhor do nível: as guardas e a luta com o Senhor e os
 * acólitos dele. A guilda usa para propor o grupo; o prefeito automático, para decidir.
 */
export function lordConfidence(world: World, heroes: Hero[], level: number): number {
  if (heroes.length === 0) return 0;
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
  const weakest = Math.min(...solo) / (solo.reduce((a, b) => a + b, 0) / solo.length);
  const spot = lairSpot(level);
  const lord = lordOf(level);
  const biome = BIOMES[lord.biome]!;
  const power = floorPower(world, spot);
  const defBonus = levelDefBonus(level);
  const boss = enemyStrength(lord, power * B.lordPower * lord.power, defBonus);
  const add = enemyStrength(biome.enemies[0]!, power * BIOME_NORM[lord.biome]!, defBonus);
  const fight = (boss.ehp + add.ehp * lord.adds) * (boss.dps + add.dps * lord.adds) * 2;
  // As guardas cansam o grupo antes: a confiança cai um pouco por sala.
  const guards = 1 + 0.1 * B.lordGuards;
  // Sem quem segure a linha ou sem quem cure, o covil pesa mais do que os números dizem.
  const roles = new Set(heroes.map((h) => CLASSES[h.classId].role));
  const lineup = (roles.has('tank') ? 1 : B.lordMissingRole) * (roles.has('healer') ? 1 : B.lordMissingRole);
  // A escala acerta a conta com a luta de verdade: confiança 1 é perto de metade de chance.
  return (Math.sqrt(party / fight) / guards / lord.threat) * lineup * Math.sqrt(weakest) * B.confidenceBias * B.lordConfidenceScale;
}

/**
 * Quem a guilda propõe para o contrato do Senhor: os mais fortes disponíveis, com um tanque e
 * um curandeiro na frente da lista quando há um à altura (pelo menos metade da força do melhor).
 */
export function lordCandidates(world: World): Hero[] {
  const ranked = world.heroes
    .filter((h) => h.status === 'town' && !h.injury && h.activity?.kind !== 'chegando')
    .map((h) => {
      const s = heroStrength(world, h);
      return { h, power: Math.sqrt(s.ehp * s.dps) };
    })
    .sort((a, b) => b.power - a.power || a.h.id - b.h.id);
  const top = ranked[0]?.power ?? 0;
  const lead = (['tank', 'healer'] as const).flatMap((r) => ranked.find((x) => CLASSES[x.h.classId].role === r && x.power >= top * 0.5) ?? []);
  return [...lead, ...ranked.filter((x) => !lead.includes(x))].map((x) => x.h);
}
