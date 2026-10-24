import { BIOMES } from '../data/biomes.ts';
import { BUILDINGS, BUILDING_IDS } from '../data/buildings.ts';
import { BALANCE as B, SAVE_VERSION, START_HOUR, TICKS_PER_HOUR } from './config.ts';
import { seedRng } from './rng.ts';
import { seedCitizens } from './citizens.ts';
import type { BuildingId, Difficulty, MaterialId, Metrics, World } from './types.ts';

export function emptyMetrics(): Metrics {
  return {
    recruits: 0,
    deaths: 0,
    left: 0,
    retired: 0,
    expeditions: 0,
    expeditionsAtDayStart: 0,
    outcomes: { conquista: 0, retirada: 0, chamado: 0, massacre: 0, cansaco: 0, fuga: 0 },
    fled: 0,
    stalemates: 0,
    roomsCleared: 0,
    floorsConquered: 0,
    passagesOpened: 0,
    treasuryIn: 0,
    maintenance: 0,
    repairs: 0,
    spent: {},
    passagesSealed: 0,
    lordFailures: 0,
    rankUps: 0,
    bossKills: [],
    idleDays: 0,
    longestIdleStreak: 0,
    idleStreak: 0,
    goldLooted: 0,
    injuries: 0,
    scars: 0,
    marriages: 0,
    births: 0,
    comeOfAge: 0,
    oldAgeDeaths: 0,
    raids: 0,
    citizenDeaths: 0,
    citizensLeft: 0,
    byConfidence: {},
    daily: [],
  };
}

export function createWorld(seed: number, difficulty: Difficulty = 'normal'): World {
  const buildings = Object.fromEntries(BUILDING_IDS.map((id) => [id, BUILDINGS[id].startLevel])) as Record<BuildingId, number>;
  const materials = Object.fromEntries(BIOMES.map((b) => [b.material, 0])) as Record<MaterialId, number>;
  const world: World = {
    version: SAVE_VERSION,
    seed,
    difficulty,
    rng: seedRng(seed),
    tick: START_HOUR * TICKS_PER_HOUR,
    nextId: 1,
    heroes: [],
    parties: [],
    town: {
      treasury: B.startTreasury,
      buildings,
      population: B.startPopulation,
      lootTax: B.lootTax,
      reputation: 0,
      doctrine: 'equilibrada',
      hornReadyDay: 0,
      hornUses: 0,
      materials,
      arrivals: [],
      contracts: [],
      emptySinceDay: null,
      mayorEnergy: B.mayorEnergy,
      speechDay: -1,
      festivalDay: -1,
      popGrowth: 0,
      lastRaidDay: -1,
      decrees: [],
      event: null,
      lastEventKey: '',
      expansion: { cleared: false, houses: [false, false, false] },
      arsenal: [],
      forge: [],
      specs: {},
      care: Object.fromEntries(Object.keys(buildings).map((id) => [id, 100])) as Record<BuildingId, number>,
      repairs: {},
    },
    abyss: { level: 1, passages: [], fragments: 0, amulet: null, bought: 0 },
    bonds: {},
    remains: [],
    chronicle: [],
    children: [],
    citizens: [],
    raids: [],
    pendingFugitives: [],
    metrics: emptyMetrics(),
    endedTick: null,
    codex: { monsters: {}, lords: {}, biomes: [], rules: [], legendaries: [], mysteries: [] },
    houses: [],
  };
  seedCitizens(world);
  return world;
}
