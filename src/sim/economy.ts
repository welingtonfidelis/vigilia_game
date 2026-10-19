import { ACTS } from '../data/acts.ts';
import { BUILDING_IDS, BUILDINGS, MAX_BUILDING_LEVEL, type LevelCost } from '../data/buildings.ts';
import { record } from './chronicle.ts';
import { BALANCE as B } from './config.ts';
import type { BuildingId, MaterialId, World } from './types.ts';

export const level = (world: World, id: BuildingId): number => world.town.buildings[id];

export const totalBuildingLevels = (world: World): number =>
  BUILDING_IDS.reduce((sum, id) => sum + world.town.buildings[id], 0);

export function nextLevelCost(world: World, id: BuildingId): LevelCost | null {
  const lvl = level(world, id);
  if (lvl >= MAX_BUILDING_LEVEL) return null;
  return BUILDINGS[id].costs[lvl] ?? null;
}

export function canAfford(world: World, cost: LevelCost): boolean {
  if (world.town.treasury < cost.gold) return false;
  for (const [mat, qty] of Object.entries(cost.materials ?? {}) as [MaterialId, number][]) {
    if (world.town.materials[mat] < qty) return false;
  }
  return true;
}

export function pay(world: World, cost: LevelCost): void {
  world.town.treasury -= cost.gold;
  for (const [mat, qty] of Object.entries(cost.materials ?? {}) as [MaterialId, number][]) {
    world.town.materials[mat] -= qty;
  }
}

// ── Efeitos dos prédios ───────────────────────────────────────────────────

export const heroCapacity = (world: World): number => 6 + 4 * level(world, 'estalagem');
export const maxParties = (world: World): number => 1 + level(world, 'guilda');
export const maxPartySize = (world: World): number => (level(world, 'guilda') >= 2 ? 5 : 4);
export const maxGearTier = (world: World): number => 4 * level(world, 'ferreiro');
export const restHpGain = (world: World): number => [0.25, 0.4, 0.55, 0.7][level(world, 'estalagem')]!;
export const restEnergyGain = (world: World): number => [35, 45, 55, 65][level(world, 'estalagem')]!;
export const recruitsPerHorn = (world: World): number => B.hornRecruits + Math.max(0, level(world, 'taverna') - 1);

// ── Preços ────────────────────────────────────────────────────────────────

export const gearPrice = (tier: number): number => Math.round(B.gearBasePrice * Math.pow(B.gearPriceGrowth, tier - 1));
export const drinkPrice = (world: World): number => B.drinkPrice + level(world, 'taverna');
export const restPrice = (world: World): number => level(world, 'estalagem');
export const trainPrice = (world: World): number => B.trainPrice * level(world, 'campo');

export function hornCost(world: World): number {
  return Math.min(B.hornMaxCost, Math.round(B.hornBaseCost * (1 + B.hornCostGrowth * world.town.hornUses)));
}

// ── Diário ────────────────────────────────────────────────────────────────

export function populationCap(world: World): number {
  return B.startPopulation + B.populationPerBuildingLevel * totalBuildingLevels(world);
}

export function dailyEconomy(world: World): void {
  const town = world.town;
  const corruption = averageCorruption(world);
  const cap = populationCap(world);
  if (corruption < 60) {
    town.population += Math.max(0, (cap - town.population) * 0.05);
  } else {
    town.population = Math.max(B.startPopulation / 2, town.population * 0.98);
    const lastAlarm = world.chronicle.findLast((e) => e.kind === 'corrupcao');
    if (corruption >= 80 && (!lastAlarm || world.tick - lastAlarm.tick > 10 * 480)) {
      record(world, 'corrupcao', [], 'A corrupção do abismo assusta a vila: famílias fazem as malas.');
    }
  }
  town.treasury += town.population * B.citizenTaxPerDay;
  town.treasury -= totalBuildingLevels(world) * B.upkeepPerLevelPerDay;
  if (town.treasury < 0) town.treasury = 0;
}

export function averageCorruption(world: World): number {
  const open = world.acts.filter((a) => a.unlocked);
  if (open.length === 0) return 0;
  return open.reduce((s, a) => s + a.corruption, 0) / open.length;
}

export function materialOf(act: number): MaterialId {
  return ACTS[act]!.material;
}
