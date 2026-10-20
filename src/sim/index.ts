// API pública do núcleo de simulação. A renderização (Phaser) e a UI só falam com isto.
export { createWorld } from './world.ts';
export { step, runTicks, runDays, type Hooks } from './loop.ts';
export * as commands from './commands.ts';
export type { CommandResult } from './commands.ts';
export { serialize, deserialize, checksum } from './save.ts';
export { autoMayor } from './bot.ts';
export { JOB_NAMES, JOB_ORDER, citizenMood, guardDefense, guardTarget } from './citizens.ts';
export { defensePower, raidPower, resolveRaid, threatOf, maybeRaid, type Threat } from './raids.ts';
export { formatDate, dayOf, hourOf, yearOf, seasonOf, isNight } from './calendar.ts';
export { describeHero, heroStats, type HeroStats } from './hero.ts';
export * from './config.ts';
export type * from './types.ts';

// Consultas somente-leitura para a tela. Nenhuma delas muda o mundo.
export {
  averageCorruption,
  canAfford,
  festivalCost,
  gearPrice,
  heroCapacity,
  hornCost,
  level as buildingLevel,
  maxGearTier,
  maxParties,
  maxPartySize,
  nextLevelCost,
  pensionPerDay,
  populationCap,
  recruitsPerHorn,
  totalBuildingLevels,
} from './economy.ts';
export { ageYears, className, fleeThreshold, getBond, maxLevel, moraleBaseline, xpToNext } from './hero.ts';
export { activeHeroes, townHeroes } from './town.ts';
export { busyParties } from './party.ts';
export { floorPower, isBossFloor, partyRooms, travelTicks } from './dungeon.ts';
export { byWhom, floorLabel, heroLabel } from './chronicle.ts';
// Pessoas (M2): funções dos aposentados, recuperação, filhos e penalidades de lesão.
export { childAge, defaultRole, forgePrice, recoveryPerDay, roleCount, ROLE_NAMES } from './people.ts';
export { WOUNDS, woundEffects } from './hero.ts';

// Dados do jogo (nomes, custos, descrições).
export { ACTS, ACT_COUNT, MATERIAL_NAMES, type ActDef } from '../data/acts.ts';
export { BUILDINGS, BUILDING_IDS, MAX_BUILDING_LEVEL, type BuildingDef, type LevelCost } from '../data/buildings.ts';
export { CLASSES, CLASS_IDS, RANKS, RANK_MAX_LEVEL, type ClassDef } from '../data/classes.ts';
export { TRAITS, type TraitDef } from '../data/traits.ts';
