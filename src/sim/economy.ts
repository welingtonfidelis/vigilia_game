import { BIOMES } from '../data/biomes.ts';
import { abyssPressure, levelTier } from './dungeon.ts';
import { BUILDING_IDS, BUILDINGS, type LevelCost } from '../data/buildings.ts';
import { SPEC_DEFS } from '../data/specs.ts';
import { record } from './chronicle.ts';
import { citizenMood } from './citizens.ts';
import { BALANCE as B } from './config.ts';
import { decreeDailyCost, decreeTaxMultiplier } from './decrees.ts';
import type { BuildingId, EarnKind, ItemSlot, MaterialId, SpecId, SpendKind, World } from './types.ts';
import { scaledCost } from './difficulty.ts';

/** O nível construído (o do painel, da arte e do custo). Os efeitos usam o nível efetivo, `level`. */
export const builtLevel = (world: World, id: BuildingId): number => world.town.buildings[id];

/** Teto dos prédios: 10 na campanha; no pós-jogo, sem teto. */
export const maxBuildingLevel = (world: World): number => (world.endedTick === null ? B.buildingMaxLevel : Infinity);

/** Conservação do prédio, de 0 a 100. */
export const careOf = (world: World, id: BuildingId): number => world.town.care?.[id] ?? 100;

/** Tick em que o conserto termina (undefined = sem obra). */
export const repairOf = (world: World, id: BuildingId): number | undefined => world.town.repairs?.[id];

/** Quanto o prédio rende pela conservação: tudo, 80% (gasto ou em obra) ou 50% (quebrado). */
export function careFactor(world: World, id: BuildingId): number {
  if (repairOf(world, id) !== undefined) return B.careRepairFactor;
  const care = careOf(world, id);
  return care >= B.careWorn ? 1 : care >= B.careBroken ? B.careWornFactor : B.careBrokenFactor;
}

/** O nível que vale para os limiares (encomendas, bancada, caminhos): o construído vezes o rendimento, nunca abaixo de 1. */
export const level = (world: World, id: BuildingId): number => {
  const n = builtLevel(world, id);
  return n <= 0 ? 0 : Math.max(1, Math.floor(n * careFactor(world, id) + 1e-9));
};

/** Curva dos efeitos: o nível 1 vale 1 e cada nível a mais vale `buildingGradeStep`. */
export const gradeOfLevel = (n: number): number => (n <= 0 ? 0 : 1 + B.buildingGradeStep * (n - 1));

/** O grau que vale para os efeitos contínuos, já com a conservação. */
export const grade = (world: World, id: BuildingId): number => gradeOfLevel(builtLevel(world, id)) * (builtLevel(world, id) > 0 ? careFactor(world, id) : 1);

/** A especialização escolhida no nível 3 (undefined = nenhuma ainda). */
export const specOf = (world: World, id: BuildingId): SpecId | undefined => world.town.specs?.[id];

/** O caminho está ativo: foi o escolhido no nível 3, ou o prédio chegou ao nível 7 e ganhou os dois. */
export function hasSpec(world: World, spec: SpecId): boolean {
  const id = SPEC_DEFS[spec].building;
  if (specOf(world, id) === spec) return true;
  return specOf(world, id) !== undefined && level(world, id) >= B.secondSpecLevel;
}

export const totalBuildingLevels = (world: World): number =>
  BUILDING_IDS.reduce((sum, id) => sum + world.town.buildings[id], 0);

/** Material dos níveis altos, pela faixa: pérolas (4–5), brasas (6–7), almas (8–9) e almas com brasas do 10 em diante. */
function bandMaterials(n: number, qty: number): Partial<Record<MaterialId, number>> {
  if (n <= 5) return { perolas: qty };
  if (n <= 7) return { brasas: qty };
  if (n <= 9) return { almas: qty };
  return { almas: qty, brasas: Math.ceil(qty / 2) };
}

/** O custo base (sem a dificuldade) para chegar ao nível n. Os três primeiros vêm da tabela do prédio. */
export function levelCost(id: BuildingId, n: number): LevelCost {
  const table = BUILDINGS[id].costs;
  if (n <= table.length) return table[n - 1]!;
  const last = table[table.length - 1]!;
  const gold = Math.round(last.gold * Math.pow(B.buildingCostGrowth, n - table.length));
  return { gold, materials: bandMaterials(n, B.buildingMaterialBase + B.buildingMaterialStep * (n - 4)) };
}

/** O material que o conserto pede, o da faixa do nível do prédio. */
export function bandMaterial(id: BuildingId, n: number): MaterialId {
  const mats = Object.keys(levelCost(id, Math.max(2, n)).materials ?? { ossos: 1 }) as MaterialId[];
  return mats[0]!;
}

export function nextLevelCost(world: World, id: BuildingId): LevelCost | null {
  const lvl = builtLevel(world, id);
  if (lvl >= maxBuildingLevel(world)) return null;
  const cost = levelCost(id, lvl + 1);
  // O ouro segue a dificuldade; o material do abismo, não.
  return { ...cost, gold: scaledCost(world, cost.gold) };
}

/** Por que o prédio não pode subir agora (null = pode), fora o custo. */
export function upgradeBlocker(world: World, id: BuildingId): string | null {
  if (builtLevel(world, id) === 0) return null;
  if (repairOf(world, id) !== undefined) return 'Em conserto: espere a obra terminar.';
  if (careOf(world, id) < B.careBroken) return 'Conservação abaixo de 25: conserte antes de melhorar.';
  return null;
}

export function canAfford(world: World, cost: LevelCost): boolean {
  if (world.town.treasury < cost.gold) return false;
  for (const [mat, qty] of Object.entries(cost.materials ?? {}) as [MaterialId, number][]) {
    if (world.town.materials[mat] < qty) return false;
  }
  return true;
}

export function pay(world: World, cost: LevelCost, kind: SpendKind): void {
  spend(world, kind, cost.gold);
  for (const [mat, qty] of Object.entries(cost.materials ?? {}) as [MaterialId, number][]) {
    world.town.materials[mat] -= qty;
  }
}

/** Ouro que entra no tesouro, por origem (o balanceador mede o que entra e de onde vem). */
export function earn(world: World, gold: number, kind: EarnKind): void {
  world.town.treasury += gold;
  world.metrics.treasuryIn += gold;
  const earned = (world.metrics.earned ??= {});
  earned[kind] = (earned[kind] ?? 0) + gold;
}

/** Ouro que sai do tesouro, por destino (o balanceador mostra para onde vai). */
export function spend(world: World, kind: SpendKind, gold: number): void {
  world.town.treasury -= gold;
  const spent = (world.metrics.spent ??= {});
  spent[kind] = (spent[kind] ?? 0) + gold;
  if (kind === 'manutencao' || kind === 'conserto') world.metrics.maintenance += gold;
}

// ── Efeitos dos prédios ───────────────────────────────────────────────────

/**
 * Os efeitos por grau (g) e nível efetivo (e). A simulação usa com o prédio de agora; o
 * painel, com o nível seguinte, para mostrar o que muda.
 */
export const EFFECTS = {
  recruits: (g: number) => B.hornRecruits + Math.max(0, Math.round(g) - 1),
  drink: (g: number) => B.drinkPrice + Math.round(g),
  heroSlots: (g: number) => 6 + Math.round(4 * g),
  restHp: (g: number) => Math.min(B.restHpMax, 0.25 + 0.15 * g),
  restEnergy: (g: number) => Math.min(B.restEnergyMax, 35 + 10 * g),
  restPrice: (g: number) => Math.round(g),
  gearTier: (e: number) => (e > 0 ? 3 * e + 1 : 0),
  templeHeal: (g: number) => 0.05 * g,
  parties: (g: number) => 1 + Math.round(g),
  partySize: (e: number) => (e >= 3 ? 5 : 4),
  contracts: (g: number) => Math.round(g),
  trainPrice: (g: number) => Math.round(B.trainPrice * g),
  trainXp: (g: number) => 0.06 * g,
  healSpeed: (g: number) => 1 + 0.5 * g,
  scarChance: (g: number) => Math.max(0.05, B.scarChance - 0.1 * g),
};

export const heroCapacity = (world: World): number => {
  const houses = world.town.expansion.houses.filter(Boolean).length;
  return EFFECTS.heroSlots(grade(world, 'estalagem')) + houses * B.expansionHouseHeroSlots + (hasSpec(world, 'dormitorio') ? 4 : 0);
};
export const maxParties = (world: World): number => EFFECTS.parties(grade(world, 'guilda')) + (hasSpec(world, 'mercenaria') ? 1 : 0);
export const maxPartySize = (world: World): number => (hasSpec(world, 'ordem') ? 6 : EFFECTS.partySize(level(world, 'guilda')));
/** Quantos contratos cabem no quadro da guilda. */
export const maxContracts = (world: World): number => (level(world, 'guilda') < 1 ? 0 : Math.max(1, EFFECTS.contracts(grade(world, 'guilda'))));
/**
 * O tier mais alto que o ferreiro forja: 3n + 1 pelo nível dele, sem passar do que o abismo já
 * mostrou (o tier do nível + `forgeAbyssEdge`). A especialização dá +1 no encaixe dela.
 */
export const maxGearTier = (world: World, slot?: ItemSlot): number =>
  Math.min(EFFECTS.gearTier(level(world, 'ferreiro')), levelTier(world.abyss.level) + B.forgeAbyssEdge) +
  ((slot === 'weapon' && hasSpec(world, 'laminas')) || (slot === 'armor' && hasSpec(world, 'couracas')) ? 1 : 0);
export const restHpGain = (world: World): number => EFFECTS.restHp(grade(world, 'estalagem')) + (hasSpec(world, 'luxo') ? B.specLuxoHp : 0);
export const restEnergyGain = (world: World): number => EFFECTS.restEnergy(grade(world, 'estalagem'));
export const recruitsPerHorn = (world: World): number => EFFECTS.recruits(grade(world, 'taverna'));

// ── Preços ────────────────────────────────────────────────────────────────

export const gearPrice = (tier: number): number => Math.round(B.gearBasePrice * Math.pow(B.gearPriceGrowth, tier - 1));
export const drinkPrice = (world: World): number =>
  EFFECTS.drink(grade(world, 'taverna')) + (hasSpec(world, 'apostas') ? B.specApostasExtraPrice : 0);
export const restPrice = (world: World): number => EFFECTS.restPrice(grade(world, 'estalagem'));
export const trainPrice = (world: World): number => EFFECTS.trainPrice(grade(world, 'campo'));

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
  const grades = BUILDING_IDS.reduce((sum, id) => sum + grade(world, id), 0);
  return B.startPopulation + Math.round(B.populationPerBuildingLevel * grades) + houses * B.expansionHouseCapacity;
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
  earn(world, citizenTaxesPerDay(world), 'imposto');
  spend(world, 'manutencao', totalBuildingLevels(world) * B.upkeepPerLevelPerDay);
  spend(world, 'pensao', pensionPerDay(world));
  spend(world, 'guarda', guardSalaryPerDay(world));
  spend(world, 'decreto', decreeDailyCost(world));
  // Casa de apostas: a mesa rende pelo número de heróis na vila.
  if (hasSpec(world, 'apostas')) earn(world, B.specApostasGoldPerHero * world.heroes.filter((h) => h.status === 'town').length, 'taverna');
  if (town.treasury < 0) town.treasury = 0;
}

export function materialOf(biome: number): MaterialId {
  return BIOMES[biome]!.material;
}
