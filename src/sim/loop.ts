import { BUILDING_IDS } from '../data/buildings.ts';
import { TICKS_PER_DAY, TICKS_PER_HOUR } from './config.ts';
import { abyssPressure, dailyPressure } from './dungeon.ts';
import { dailyCare, finishRepairs } from './care.ts';
import { dailyEconomy, hornCost } from './economy.ts';
import { expeditionTick } from './expedition.ts';
import { maybeSeasonalEvent } from './events.ts';
import { morningAudiences } from './audiences.ts';
import { dayOf, hourOf } from './calendar.ts';
import { dailyWishes, weeklyWishes } from './wishes.ts';
import { dailyNemeses } from './nemesis.ts';
import { dailyPosts } from './posts.ts';
import { dailyHouses } from './houses.ts';
import { hourlyTournament } from './tournament.ts';
import { formParties } from './party.ts';
import { processForge, raiseLegendaries } from './items.ts';
import { dailyPatronage } from './patronage.ts';
import { dailyPets } from './pets.ts';
import { dailyPeople } from './people.ts';
import { dailyCitizens } from './citizens.ts';
import { maybeRaid } from './raids.ts';
import { int } from './rng.ts';
import { activeHeroes, dailyMemories, dailyTown, hourlyTown, processArrivals, townHeroes, updateTownHeroes } from './town.ts';
import type { World } from './types.ts';

export interface Hooks {
  /** Chamado no início de cada hora do jogo (o bot do balanceador usa isso). */
  onHour?: (world: World) => void;
}

export function step(world: World, hooks: Hooks = {}): void {
  world.tick++;
  if (world.tick % TICKS_PER_HOUR === 0) {
    if (hourOf(world.tick) === 8) morningAudiences(world);
    hooks.onHour?.(world);
    hourlyTown(world);
    finishRepairs(world);
    processForge(world);
    // A incursão acontece antes de os grupos partirem: quem está em casa defende.
    maybeRaid(world);
    // O torneio da estação (M6 F4): a chave sai antes de os grupos se formarem.
    hourlyTournament(world);
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
  dailyCare(world);
  raiseLegendaries(world);
  dailyPressure(world);
  dailyNemeses(world);
  dailyPosts(world);
  dailyTown(world);
  dailyMemories(world);
  dailyPatronage(world);
  dailyPets(world);
  dailyPeople(world);
  dailyHouses(world);
  dailyCitizens(world);
  dailyWishes(world);
  weeklyWishes(world);
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
  // Mais fundo alcançado: andares conquistados do nível atual (os níveis contam de 10 em 10).
  let deepest = (world.abyss.level - 1) * 10;
  for (const p of world.abyss.passages) p.conquered.forEach((c, f) => c && (deepest = Math.max(deepest, (p.level - 1) * 10 + f + 1)));
  world.metrics.daily.push({
    day: dayOf(world.tick),
    treasury: Math.round(world.town.treasury),
    heroGold: Math.round(heroes.reduce((s, h) => s + h.gold, 0)),
    roster: heroes.length,
    avgLevel: heroes.length ? +(heroes.reduce((s, h) => s + h.level, 0) / heroes.length).toFixed(1) : 0,
    deepest,
    population: Math.round(world.town.population),
    pressure: Math.round(abyssPressure(world)),
    level: world.abyss.level,
    buildings: +(BUILDING_IDS.reduce((s, id) => s + world.town.buildings[id], 0) / BUILDING_IDS.length).toFixed(2),
    care: Math.round(mean(BUILDING_IDS.filter((id) => world.town.buildings[id] > 0).map((id) => world.town.care[id]))),
  });
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 100;
}
