// Eventos sazonais (M3): uma escolha por estação, com custo e consequência.
import { BIOMES } from '../data/biomes.ts';
import { availableBiomes } from './dungeon.ts';
import { SEASONAL_EVENTS, SEASON_EVENTS } from '../data/seasonal-events.ts';
import { DAYS_PER_SEASON } from './config.ts';
import { dayOf, seasonOf, yearOf } from './calendar.ts';
import { record } from './chronicle.ts';
import type { CommandResult } from './commands.ts';
import type { World } from './types.ts';
import { scaledCost } from './difficulty.ts';

const fail = (reason: string): CommandResult => ({ ok: false, reason });
const OK: CommandResult = { ok: true };

const bump = (value: number, delta: number, max = 100): number => Math.max(0, Math.min(max, value + delta));

/** Cria o evento da estação na virada, se houver e se nenhum estiver pendente. */
export function maybeSeasonalEvent(world: World): void {
  const day = dayOf(world.tick);
  if (day === 0 || day % DAYS_PER_SEASON !== 0) return;
  const year = yearOf(day);
  const season = seasonOf(day);
  const key = `${year}:${season}`;
  if (world.town.lastEventKey === key) return;
  if (world.town.event) return;
  const pool = SEASON_EVENTS[season] ?? [];
  const id = pool.length ? pool[(year - 1) % pool.length] ?? null : null;
  if (!id) {
    world.town.lastEventKey = key;
    return;
  }
  world.town.event = { id, year, season, tick: world.tick };
  world.town.lastEventKey = key;
  const def = SEASONAL_EVENTS[id];
  record(world, 'evento', [], `${def.title}: ${def.intro}`);
}

/** Custo de uma escolha de evento, já com a dificuldade. */
export const eventChoiceCost = (world: World, cost: number): number => scaledCost(world, cost);

/** Resolve a escolha do evento pendente. */
export function resolveSeasonalEvent(world: World, choiceId: string): CommandResult {
  const pending = world.town.event;
  if (!pending) return fail('Nenhum evento sazonal pendente.');
  const def = SEASONAL_EVENTS[pending.id];
  const choice = def.choices.find((c) => c.id === choiceId);
  if (!choice) return fail('Escolha inválida para este evento.');
  const cost = eventChoiceCost(world, choice.cost);
  if (world.town.treasury < cost) return fail(`Faltam ${Math.ceil(cost - world.town.treasury)} de ouro.`);
  world.town.treasury -= cost;
  const heroes = world.heroes.filter((h) => h.status === 'town' || h.status === 'expedition');

  const applyMood = (heroDelta: number, citizenDelta: number): void => {
    for (const hero of heroes) {
      hero.morale = bump(hero.morale, heroDelta);
      hero.loyalty = bump(hero.loyalty, heroDelta);
    }
    for (const citizen of world.citizens) citizen.happiness = bump(citizen.happiness, citizenDelta);
  };

  switch (`${pending.id}:${choice.id}`) {
    case 'caravana:materiais': {
      // Material de cada bioma que o nível do abismo já abriu.
      for (const b of availableBiomes(world.abyss.level)) world.town.materials[BIOMES[b]!.material] += 6;
      for (const citizen of world.citizens) citizen.happiness = bump(citizen.happiness, 2);
      break;
    }
    case 'caravana:reliquia':
      applyMood(8, 2);
      world.town.reputation = bump(world.town.reputation, 4);
      break;
    case 'caravana:recusar':
      break;
    case 'festival-colheita:financiar':
      applyMood(8, 8);
      world.town.reputation = bump(world.town.reputation, 3);
      break;
    case 'festival-colheita:poupar':
      for (const citizen of world.citizens) citizen.happiness = bump(citizen.happiness, -3);
      break;
    case 'cobrador:pagar':
      world.town.reputation = bump(world.town.reputation, 5);
      for (const hero of heroes) hero.loyalty = bump(hero.loyalty, 3);
      break;
    case 'cobrador:negociar':
      world.town.reputation = bump(world.town.reputation, -2);
      for (const citizen of world.citizens) citizen.happiness = bump(citizen.happiness, -3);
      break;
    case 'cobrador:recusar':
      world.town.reputation = bump(world.town.reputation, -6);
      for (const hero of heroes) hero.loyalty = bump(hero.loyalty, -4);
      for (const citizen of world.citizens) citizen.happiness = bump(citizen.happiness, -6);
      break;
    case 'peste:tratar':
      applyMood(2, 5);
      break;
    case 'peste:quarentena':
      for (const citizen of world.citizens) citizen.happiness = bump(citizen.happiness, -3);
      break;
    case 'peste:ignorar':
      for (const citizen of world.citizens) citizen.happiness = bump(citizen.happiness, -8);
      applyMood(-2, 0);
      break;
    case 'eclipse:conter':
      for (const p of world.abyss.passages) p.pressure = Math.max(0, p.pressure - 4);
      for (const hero of heroes) hero.morale = bump(hero.morale, -3);
      break;
    case 'eclipse:rezar':
      for (const citizen of world.citizens) citizen.happiness = bump(citizen.happiness, 3);
      for (const p of world.abyss.passages) p.pressure = Math.min(100, p.pressure + 2);
      break;
    case 'eclipse:observar':
      for (const p of world.abyss.passages) p.pressure = Math.min(100, p.pressure + 7);
      for (const hero of heroes) hero.morale = bump(hero.morale, -6);
      break;
    case 'visita-lendaria:hospedar':
      applyMood(6, 6);
      world.town.reputation = bump(world.town.reputation, 6);
      break;
    case 'visita-lendaria:ouvir':
      applyMood(4, 3);
      break;
    case 'visita-lendaria:recusar':
      world.town.reputation = bump(world.town.reputation, -3);
      break;
    default:
      return fail('Efeito de evento não implementado.');
  }
  world.town.event = null;
  record(world, 'evento', [], `${def.title}: ${choice.label}. ${choice.detail}`);
  return OK;
}
