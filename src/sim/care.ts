// Conservação dos prédios (M5 F4): o desgaste de todo dia, o estrago das incursões e da
// geada, a perda de nível quando a conservação chega a 0 e o conserto mandado pelo prefeito.

import { BUILDINGS, BUILDING_IDS, type LevelCost } from '../data/buildings.ts';
import { record } from './chronicle.ts';
import { refreshJobs } from './citizens.ts';
import { BALANCE as B } from './config.ts';
import { scaledCost } from './difficulty.ts';
import { bandMaterial, builtLevel, careOf, levelCost, repairOf } from './economy.ts';
import type { BuildingId, World } from './types.ts';

/** "O ferreiro", "A taverna". */
export const theBuilding = (id: BuildingId): string => `${BUILDINGS[id].gender === 'm' ? 'O' : 'A'} ${BUILDINGS[id].name.toLowerCase()}`;
/** A palavra no gênero do prédio: byGender(id, 'gasto', 'gasta'). */
export const byGender = (id: BuildingId, m: string, f: string): string => (BUILDINGS[id].gender === 'm' ? m : f);

/**
 * Tira conservação do prédio. Ao passar de 50 para baixo, a crônica avisa; em 0, o prédio
 * perde um nível e volta a 50 (a ruína volta inteira, pronta para reconstruir).
 * Devolve true se o prédio perdeu o nível.
 */
export function wear(world: World, id: BuildingId, amount: number): boolean {
  const n = builtLevel(world, id);
  if (n <= 0 || amount <= 0) return false;
  const before = careOf(world, id);
  const after = before - amount;
  if (after > 0) {
    world.town.care[id] = after;
    if (before >= B.careWorn && after < B.careWorn) {
      record(world, 'construcao', [], `${theBuilding(id)} está ${byGender(id, 'gasto', 'gasta')}: rende menos até um conserto.`);
    }
    return false;
  }
  world.town.buildings[id] = n - 1;
  world.town.care[id] = n - 1 > 0 ? B.careAfterCollapse : 100;
  // Ruína não tem obra de conserto: o andaime cai junto.
  if (n - 1 === 0) delete world.town.repairs[id];
  refreshJobs(world);
  record(
    world,
    'construcao',
    [],
    n - 1 === 0 ? `${theBuilding(id)} desabou de tão ${byGender(id, 'gasto', 'gasta')}: voltou à ruína.` : `${theBuilding(id)} cedeu com o desgaste e voltou ao nível ${n - 1}.`,
  );
  return true;
}

/** O desgaste de cada dia; prédio em obra não se desgasta. */
export function dailyCare(world: World): void {
  for (const id of BUILDING_IDS) {
    if (repairOf(world, id) !== undefined) continue;
    wear(world, id, B.careDecayPerDay);
  }
}

/** O conserto que termina nesta hora devolve o prédio inteiro. */
export function finishRepairs(world: World): void {
  for (const id of BUILDING_IDS) {
    const ready = repairOf(world, id);
    if (ready === undefined || world.tick < ready) continue;
    delete world.town.repairs[id];
    world.town.care[id] = 100;
    record(world, 'construcao', [], `${theBuilding(id)} saiu do conserto ${byGender(id, 'novo', 'nova')} em folha.`);
  }
}

/** O ouro do conserto de um estrago no prédio de agora (com a dificuldade). */
export function repairGold(world: World, id: BuildingId, damage: number): number {
  const n = builtLevel(world, id);
  const value = Math.max(levelCost(id, n).gold, levelCost(id, 2).gold / 2);
  return scaledCost(world, Math.max(5, Math.round((value * B.repairCostFraction * damage) / 100)));
}

export interface RepairCost extends LevelCost {
  days: number;
}

/**
 * O conserto: ouro proporcional ao valor do nível e ao estrago (com a dificuldade), material
 * da faixa do nível acima de 40 de estrago e de 1 a 3 dias de obra. null = nada a consertar.
 */
export function repairCost(world: World, id: BuildingId): RepairCost | null {
  const n = builtLevel(world, id);
  const damage = 100 - careOf(world, id);
  if (n <= 0 || damage < 1) return null;
  const gold = repairGold(world, id, damage);
  const days = 1 + Math.floor(damage / B.repairDaysPer);
  if (damage <= B.repairMaterialFrom) return { gold, days };
  return { gold, days, materials: { [bandMaterial(id, n)]: Math.ceil(damage / 10) } };
}
