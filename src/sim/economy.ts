import { BIOMES } from '../data/biomes.ts';
import { abyssPressure } from './dungeon.ts';
import { BUILDING_IDS, BUILDINGS, MAX_BUILDING_LEVEL, type LevelCost } from '../data/buildings.ts';
import { record } from './chronicle.ts';
import { citizenMood } from './citizens.ts';
import { BALANCE as B } from './config.ts';
import { decreeDailyCost, decreeTaxMultiplier } from './decrees.ts';
import type { BuildingId, ItemSlot, MaterialId, SpecId, World } from './types.ts';
import { scaledCost } from './difficulty.ts';

export const level = (world: World, id: BuildingId): number => world.town.buildings[id];

/** A especialização escolhida no nível 3 (undefined = nenhuma ainda). */
export const specOf = (world: World, id: BuildingId): SpecId | undefined => world.town.specs?.[id];

export const hasSpec = (world: World, spec: SpecId): boolean => Object.values(world.town.specs ?? {}).includes(spec);

export const totalBuildingLevels = (world: World): number =>
  BUILDING_IDS.reduce((sum, id) => sum + world.town.buildings[id], 0);

export function nextLevelCost(world: World, id: BuildingId): LevelCost | null {
  const lvl = level(world, id);
  if (lvl >= MAX_BUILDING_LEVEL) return null;
  const cost = BUILDINGS[id].costs[lvl];
  // O ouro segue a dificuldade; o material do abismo, não.
  return cost ? { ...cost, gold: scaledCost(world, cost.gold) } : null;
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

export const heroCapacity = (world: World): number => {
  const houses = world.town.expansion.houses.filter(Boolean).length;
  return 6 + 4 * level(world, 'estalagem') + houses * B.expansionHouseHeroSlots + (hasSpec(world, 'dormitorio') ? 4 : 0);
};
export const maxParties = (world: World): number => 1 + level(world, 'guilda') + (hasSpec(world, 'mercenaria') ? 1 : 0);
export const maxPartySize = (world: World): number => (hasSpec(world, 'ordem') ? 6 : level(world, 'guilda') >= 2 ? 5 : 4);
/** O tier mais alto que o ferreiro forja; a especialização dá +1 no encaixe dela. */
export const maxGearTier = (world: World, slot?: ItemSlot): number =>
  4 * level(world, 'ferreiro') + ((slot === 'weapon' && hasSpec(world, 'laminas')) || (slot === 'armor' && hasSpec(world, 'couracas')) ? 1 : 0);
export const restHpGain = (world: World): number => [0.25, 0.4, 0.55, 0.7][level(world, 'estalagem')]! + (hasSpec(world, 'luxo') ? B.specLuxoHp : 0);
export const restEnergyGain = (world: World): number => [35, 45, 55, 65][level(world, 'estalagem')]!;
export const recruitsPerHorn = (world: World): number => B.hornRecruits + Math.max(0, level(world, 'taverna') - 1);

// ── Preços ────────────────────────────────────────────────────────────────

export const gearPrice = (tier: number): number => Math.round(B.gearBasePrice * Math.pow(B.gearPriceGrowth, tier - 1));
export const drinkPrice = (world: World): number =>
  B.drinkPrice + level(world, 'taverna') + (hasSpec(world, 'apostas') ? B.specApostasExtraPrice : 0);
export const restPrice = (world: World): number => level(world, 'estalagem');
export const trainPrice = (world: World): number => B.trainPrice * level(world, 'campo');

export function hornCost(world: World): number {
  return scaledCost(world, Math.min(B.hornMaxCost, Math.round(B.hornBaseCost * (1 + B.hornCostGrowth * world.town.hornUses))));
}

/** Limpar a floresta do distrito sul e erguer cada casa (já com a dificuldade). */
export const expansionClearCost = (world: World): number => scaledCost(world, B.expansionClearCost);
export const expansionHouseCost = (world: World): number => scaledCost(world, B.expansionHouseCost);

/** Pensão diária dos aposentados: o tesouro sustenta quem já pendurou as armas. */
export function pensionPerDay(world: World): number {
  return world.heroes.filter((h) => h.status === 'retired').length * B.pensionPerRetiredPerDay;
}

/** Quantos guardas a milícia mantém hoje. */
export const guardCount = (world: World): number => world.citizens.filter((c) => c.job === 'guarda').length;

/** Salário diário da milícia; o tesouro paga a defesa antes de qualquer outra coisa. */
export const guardSalaryPerDay = (world: World): number => guardCount(world) * B.guardSalaryPerDay;

/** Imposto diário dos moradores, já com humor e taxa de guerra. */
export const citizenTaxesPerDay = (world: World): number =>
  world.town.population * B.citizenTaxPerDay * (0.8 + (B.citizenTaxMood * citizenMood(world)) / 100) * decreeTaxMultiplier(world);

/** A festa cresce com a população: mais gente, mais mesa, mais ouro. */
export function festivalCost(world: World): number {
  return scaledCost(world, Math.round(B.festivalBaseCost + B.festivalCostPerCitizen * world.town.population));
}

// ── Diário ────────────────────────────────────────────────────────────────

export function populationCap(world: World): number {
  const houses = world.town.expansion.houses.filter(Boolean).length;
  return B.startPopulation + B.populationPerBuildingLevel * totalBuildingLevels(world) + houses * B.expansionHouseCapacity;
}

export function dailyEconomy(world: World): void {
  const town = world.town;
  town.population = Math.round(town.population);
  const corruption = abyssPressure(world);
  const cap = populationCap(world);
  if (corruption < 60) {
    // Crescimento em moradores inteiros: o acumulador guarda a fração entre dias.
    town.popGrowth += Math.max(0, cap - town.population) * 0.05;
    const room = Math.max(0, Math.ceil(cap - town.population));
    const add = Math.min(Math.floor(town.popGrowth), room);
    if (add > 0) {
      town.population = Math.min(cap, town.population + add);
      town.popGrowth -= add;
    } else {
      town.popGrowth = Math.min(town.popGrowth, 0.999);
    }
  } else {
    const loss = Math.max(1, Math.round(town.population * 0.02));
    town.population = Math.max(B.startPopulation / 2, town.population - loss);
    town.popGrowth = 0;
    const lastAlarm = world.chronicle.findLast((e) => e.kind === 'corrupcao');
    if (corruption >= 80 && (!lastAlarm || world.tick - lastAlarm.tick > 10 * 480)) {
      record(world, 'corrupcao', [], 'A pressão do abismo assusta a vila: famílias fazem as malas.');
    }
  }
  // O humor dos moradores regula quanto eles pagam; a taxa de guerra soma.
  town.treasury += citizenTaxesPerDay(world);
  town.treasury -= totalBuildingLevels(world) * B.upkeepPerLevelPerDay;
  town.treasury -= pensionPerDay(world);
  town.treasury -= guardSalaryPerDay(world);
  town.treasury -= decreeDailyCost(world);
  // Casa de apostas: a mesa rende pelo número de heróis na vila.
  if (hasSpec(world, 'apostas')) town.treasury += B.specApostasGoldPerHero * world.heroes.filter((h) => h.status === 'town').length;
  if (town.treasury < 0) town.treasury = 0;
}

export function materialOf(biome: number): MaterialId {
  return BIOMES[biome]!.material;
}
