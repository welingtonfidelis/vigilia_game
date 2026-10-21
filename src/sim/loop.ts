import { dayOf } from './calendar.ts';
import { BALANCE as B, TICKS_PER_DAY, TICKS_PER_HOUR } from './config.ts';
import { dailyCorruption } from './dungeon.ts';
import { dailyEconomy, hornCost } from './economy.ts';
import { expeditionTick } from './expedition.ts';
import { maybeSeasonalEvent } from './events.ts';
import { formParties } from './party.ts';
import { processForge } from './items.ts';
import { dailyPatronage } from './patronage.ts';
import { dailyPeople } from './people.ts';
import { dailyCitizens } from './citizens.ts';
import { maybeRaid } from './raids.ts';
import { int } from './rng.ts';
import { activeHeroes, dailyTown, hourlyTown, processArrivals, townHeroes, updateTownHeroes } from './town.ts';
import type { World } from './types.ts';

export interface Hooks {
  /** Chamado no início de cada hora do jogo (o bot do balanceador usa isso). */
  onHour?: (world: World) => void;
}

export function step(world: World, hooks: Hooks = {}): void {
  world.tick++;
  if (world.tick % TICKS_PER_HOUR === 0) {
    hooks.onHour?.(world);
    hourlyTown(world);
    processForge(world);
    // A incursão acontece antes de os grupos partirem: quem está em casa defende.
    maybeRaid(world);
    formParties(world);
  }
  if (world.tick % TICKS_PER_DAY === 0) daily(world);
  processArrivals(world);
  updateTownHeroes(world);
  expeditionTick(world);
}

export function runTicks(world: World, ticks: number, hooks: Hooks = {}): void {
  for (let i = 0; i < ticks; i++) step(world, hooks);
}

export function runDays(world: World, days: number, hooks: Hooks = {}): void {
  runTicks(world, days * TICKS_PER_DAY, hooks);
}

function daily(world: World): void {
  dailyEconomy(world);
  dailyCorruption(world);
  dailyTown(world);
  dailyPatronage(world);
  dailyPeople(world);
  dailyCitizens(world);
  strayArrivals(world);
  trackIdle(world);
  sample(world);
  maybeSeasonalEvent(world);
}

/** Rede de segurança: uma vila sem heróis e sem ouro recebe andarilhos de graça. */
function strayArrivals(world: World): void {
  const town = world.town;
  const today = dayOf(world.tick);
  const stranded = activeHeroes(world).length < 3 && town.arrivals.length === 0 && town.treasury < hornCost(world);
  if (!stranded) {
    town.emptySinceDay = null;
    return;
  }
  town.emptySinceDay ??= today;
  if (today - town.emptySinceDay < 3) return;
  for (let i = 0; i < 2; i++) town.arrivals.push({ at: world.tick + int(world.rng, 2, 10) * TICKS_PER_HOUR, free: true });
  town.emptySinceDay = null;
}

function trackIdle(world: World): void {
  const m = world.metrics;
  const started = m.expeditions - m.expeditionsAtDayStart;
  m.expeditionsAtDayStart = m.expeditions;
  const idle = started === 0 && world.parties.length === 0 && townHeroes(world).length >= 2;
  if (idle) {
    m.idleDays++;
    m.idleStreak++;
    m.longestIdleStreak = Math.max(m.longestIdleStreak, m.idleStreak);
  } else {
    m.idleStreak = 0;
  }
}

function sample(world: World): void {
  const heroes = activeHeroes(world);
  let deepest = 0;
  world.acts.forEach((act, a) => act.conquered.forEach((c, f) => c && (deepest = Math.max(deepest, a * B.floorsPerAct + f + 1))));
  world.metrics.daily.push({
    day: dayOf(world.tick),
    treasury: Math.round(world.town.treasury),
    heroGold: Math.round(heroes.reduce((s, h) => s + h.gold, 0)),
    roster: heroes.length,
    avgLevel: heroes.length ? +(heroes.reduce((s, h) => s + h.level, 0) / heroes.length).toFixed(1) : 0,
    deepest,
    population: Math.round(world.town.population),
    corruption: world.acts.map((a) => Math.round(a.corruption)),
  });
}
