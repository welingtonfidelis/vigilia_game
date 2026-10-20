import { ACTS } from '../data/acts.ts';
import { BUILDINGS, BUILDING_IDS } from '../data/buildings.ts';
import { BALANCE as B, SAVE_VERSION, START_HOUR, TICKS_PER_HOUR } from './config.ts';
import { seedRng } from './rng.ts';
import { seedCitizens } from './citizens.ts';
import type { BuildingId, MaterialId, Metrics, World } from './types.ts';

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

export function createWorld(seed: number): World {
  const buildings = Object.fromEntries(BUILDING_IDS.map((id) => [id, BUILDINGS[id].startLevel])) as Record<BuildingId, number>;
  const materials = Object.fromEntries(ACTS.map((a) => [a.material, 0])) as Record<MaterialId, number>;
  const world: World = {
    version: SAVE_VERSION,
    seed,
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
    },
    acts: ACTS.map((_, i) => ({
      unlocked: i === 0,
      corruption: i === 0 ? B.corruptionStart : 0,
      conquered: Array.from({ length: B.floorsPerAct }, () => false),
      maps: Array.from({ length: B.floorsPerAct }, () => null),
      bossDefeated: false,
    })),
    bonds: {},
    remains: [],
    chronicle: [],
    children: [],
    citizens: [],
    raids: [],
    pendingFugitives: [],
    metrics: emptyMetrics(),
    endedTick: null,
  };
  seedCitizens(world);
  return world;
}
