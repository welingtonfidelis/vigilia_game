// Onde o ouro dos heróis vai parar no fim do jogo (M4): provisões compradas a cada
// descida e obras pagas na vila (mecenato). Os dois não saturam: um se repete, o outro
// fica mais caro a cada nível.

import { WORK_IDS, WORKS } from '../data/works.ts';
import { record } from './chronicle.ts';
import { BALANCE as B } from './config.ts';
import { earn, level } from './economy.ts';
import { hasTrait } from './hero.ts';
import type { Hero, Party, Spot, WorkId, World } from './types.ts';

// ── Provisões ────────────────────────────────────────────────────────────

/** Preço da ração e das tochas por herói: cresce com a profundidade do andar-alvo. */
export const rationPrice = (spot: Pick<Spot, 'level' | 'floor'>): number =>
  Math.round(B.rationBase * Math.pow(1 + (Math.max(1, spot.level) - 1) * B.descendFloorsPerLevel + spot.floor, B.rationExp));

export const relicPrice = (spot: Pick<Spot, 'level' | 'floor'>): number => Math.round(rationPrice(spot) * B.relicPriceFraction);

/**
 * Ao partir, cada herói compra o que o ouro dele permite, guardando o resto para o
 * equipamento: ração se tiver folga (provisionReserve × o preço da ração); relíquia (com templo)
 * com a mesma folga, ou com metade dela se for Supersticioso ou Covarde.
 */
export function buyProvisions(world: World, party: Party, members: Hero[]): void {
  const ration = rationPrice(party);
  const relic = relicPrice(party);
  const temple = level(world, 'templo') >= 1;
  for (const h of members) {
    if (h.gold >= ration * B.provisionReserve) {
      h.gold -= ration;
      earn(world, ration * B.provisionTreasuryShare);
      (party.provisioned ??= []).push(h.id);
      h.stats.provisions = (h.stats.provisions ?? 0) + 1;
    }
    if (!temple) continue;
    const fearful = hasTrait(h, 'supersticioso') || hasTrait(h, 'covarde');
    if (h.gold >= ration * (fearful ? B.provisionReserve / 2 : B.provisionReserve)) {
      h.gold -= relic;
      earn(world, relic * B.provisionTreasuryShare);
      (party.relics ??= []).push(h.id);
    }
  }
}

export const isProvisioned = (party: Party | undefined, heroId: number): boolean => !!party?.provisioned?.includes(heroId);

export const carriesRelic = (party: Party | undefined, heroId: number): boolean => !!party?.relics?.includes(heroId);

// ── Mecenato ─────────────────────────────────────────────────────────────

export const workLevel = (world: World, id: WorkId): number => world.town.works?.[id]?.level ?? 0;

/** Níveis que ainda contam para o efeito (depois do 5º, é só glória). */
export const workEffectLevel = (world: World, id: WorkId): number => Math.min(B.workEffectCap, workLevel(world, id));

/** Preço do próximo nível da obra. */
export const workPrice = (world: World, id: WorkId): number => Math.round(B.workBasePrice * Math.pow(B.workPriceGrowth, workLevel(world, id)));

const ORDINAL = ['primeiro', 'segundo', 'terceiro', 'quarto', 'quinto', 'sexto', 'sétimo', 'oitavo', 'nono', 'décimo'];
const ordinal = (n: number, g: 'm' | 'f'): string => {
  const word = ORDINAL[n - 1];
  if (!word) return `${n}º`;
  return g === 'f' ? `${word.slice(0, -1)}a` : word;
};

/** A obra mais barata agora (todas sobem juntas devagar). */
export const cheapestWork = (world: World): WorkId =>
  WORK_IDS.reduce((best, id) => (workPrice(world, id) < workPrice(world, best) ? id : best));

/** O herói paga o próximo nível da obra; o efeito vale até o nível 5. */
export function fundWork(world: World, hero: Hero, id: WorkId): boolean {
  const price = workPrice(world, id);
  if (hero.gold < price) return false;
  hero.gold -= price;
  const works = (world.town.works ??= {});
  const work = (works[id] ??= { level: 0, patrons: [] });
  work.level++;
  work.patrons.push({ heroId: hero.id, level: work.level, tick: world.tick, price });
  if (id === 'estatua' && work.level <= B.workEffectCap) world.town.reputation = Math.min(100, world.town.reputation + 2);
  const def = WORKS[id];
  const which = `${def.gender === 'f' ? 'a' : 'o'} ${ordinal(work.level, def.gender)} ${def.noun} ${def.place}`;
  record(world, 'doacao', [hero.id], `${hero.name} pagou ${which}; o nome ${hero.gender === 'f' ? 'dela' : 'dele'} ficou gravado.`);
  return true;
}

/**
 * Uma vez por dia, quem juntou fortuna (mais de patronGold) paga uma obra. Quem gasta com o
 * equipamento quase nunca chega lá; quem guarda (o Ganancioso, os veteranos sem o que
 * comprar) acaba deixando o nome na vila.
 */
export function dailyPatronage(world: World): void {
  for (const hero of world.heroes) {
    if (hero.status !== 'town' || hero.gold < B.patronGold) continue;
    fundWork(world, hero, cheapestWork(world));
  }
}
