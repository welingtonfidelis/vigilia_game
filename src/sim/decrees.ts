// Decretos do prefeito (M3): políticas permanentes com custo e trade-off.
import { DECREES, DECREE_IDS, type DecreeDef } from '../data/decrees.ts';
import type { DecreeId, World } from './types.ts';

export { DECREES, DECREE_IDS, type DecreeDef };

export const hasDecree = (world: World, id: DecreeId): boolean => world.town.decrees.includes(id);

export const activeDecreeIds = (world: World): DecreeId[] => [...world.town.decrees];

export const activeDecreeDefs = (world: World): DecreeDef[] => world.town.decrees.map((id) => DECREES[id]);

/** Custo diário somado dos decretos ativos. */
export const decreeDailyCost = (world: World): number =>
  activeDecreeDefs(world).reduce((sum, def) => sum + def.dailyCost, 0);

/** Multiplicador do imposto dos moradores (taxa de guerra). */
export const decreeTaxMultiplier = (world: World): number =>
  hasDecree(world, 'taxa-guerra') ? DECREES['taxa-guerra'].taxMultiplier ?? 1 : 1;

/** Multiplicador da defesa noturna (toque de recolher). */
export const decreeDefenseMultiplier = (world: World): number =>
  hasDecree(world, 'toque-recolher') ? DECREES['toque-recolher'].defenseMultiplier ?? 1 : 1;

/** Humor diário perdido por causa dos decretos ativos. */
export const decreeCitizenMoodPenalty = (world: World): number =>
  activeDecreeDefs(world).reduce((sum, def) => sum + (def.citizenMoodPerDay ?? 0), 0);
