// Vida na vila: necessidades, IA de utilidade e efeitos das atividades.

import { record, g, heroLabel } from './chronicle.ts';
import { dayOf, isNight } from './calendar.ts';
import { BALANCE as B, DAYS_PER_YEAR, TICKS_PER_HOUR } from './config.ts';
import {
  drinkPrice,
  heroCapacity,
  level,
  maxGearTier,
  restEnergyGain,
  restHpGain,
  restPrice,
  trainPrice,
} from './economy.ts';
import {
  addBond,
  ageYears,
  createHero,
  gainXp,
  hasTrait,
  heroStats,
  moraleBaseline,
  temperament,
  traitMult,
  xpToNext,
  maxLevel,
} from './hero.ts';
import { forgePrice, retireHero, roleCount } from './people.ts';
import { pick, range } from './rng.ts';
import type { ActivityKind, Hero, World } from './types.ts';

const DURATION_HOURS: Record<ActivityKind, number> = {
  chegando: 1,
  descansar: 8,
  beber: 2,
  rezar: 2,
  comprar: 1,
  treinar: 4,
  tumulo: 1,
  socializar: 1,
  vagar: 1,
  aguardar: 2,
  tratar: 6,
};

export const townHeroes = (world: World): Hero[] => world.heroes.filter((h) => h.status === 'town');
export const activeHeroes = (world: World): Hero[] =>
  world.heroes.filter((h) => h.status === 'town' || h.status === 'expedition');

const clamp = (v: number, min = 0, max = 100): number => Math.max(min, Math.min(max, v));

// ── Chegadas ──────────────────────────────────────────────────────────────

export function processArrivals(world: World): void {
  const town = world.town;
  if (town.arrivals.length === 0) return;
  const due = town.arrivals.filter((a) => a.at <= world.tick);
  if (due.length === 0) return;
  town.arrivals = town.arrivals.filter((a) => a.at > world.tick);
  for (const arrival of due) {
    if (activeHeroes(world).length >= heroCapacity(world)) continue;
    const hero = createHero(world, arrival.free ? { rankCap: 'C' } : {});
    hero.activity = { kind: 'chegando', startedAt: world.tick, endsAt: world.tick + TICKS_PER_HOUR };
    world.metrics.recruits++;
    const how = arrival.free ? 'chegou sem ser chamad' + g(hero, 'o', 'a') + ', procurando abrigo' : 'atendeu ao berrante';
    record(world, 'chegada', [hero.id], `${heroLabel(hero)} ${how}.`);
  }
}

// ── Necessidades (de hora em hora) ────────────────────────────────────────

export function hourlyTown(world: World): void {
  for (const hero of townHeroes(world)) {
    const resting = hero.activity?.kind === 'descansar';
    if (!resting) hero.needs.energy = clamp(hero.needs.energy - B.needDecayPerHour.energy);
    hero.needs.fun = clamp(hero.needs.fun - B.needDecayPerHour.fun * traitMult(hero, 'funDecay'));
    hero.needs.faith = clamp(hero.needs.faith - B.needDecayPerHour.faith * traitMult(hero, 'faithDecay'));
    const maxHp = heroStats(world, hero).maxHp;
    hero.hp = Math.min(maxHp, hero.hp + maxHp * B.passiveRegenPerHour);
    const base = moraleBaseline(hero);
    if (hero.morale < base) hero.morale = Math.min(base, hero.morale + B.moraleDriftPerHour);
    else if (hero.morale > base) hero.morale = Math.max(base, hero.morale - B.moraleDriftPerHour / 2);
  }
}

// ── Diário ────────────────────────────────────────────────────────────────

export function dailyTown(world: World): void {
  for (const hero of activeHeroes(world)) {
    if (hero.grief > 0) {
      hero.grief = Math.max(0, hero.grief - 3);
      if (hero.grief === 0) hero.griefFor = null;
    }
    if (hero.status !== 'town') continue;

    if (hasTrait(hero, 'ganancioso') && world.town.lootTax > 0.25) hero.loyalty = clamp(hero.loyalty - 1);
    hero.lowMoraleDays = hero.morale < 20 ? hero.lowMoraleDays + 1 : 0;
    const fedUp = hero.lowMoraleDays >= B.leaveAfterLowDays || hero.loyalty < 15;
    if (fedUp && !hasTrait(hero, 'leal')) {
      leaveTown(world, hero);
      continue;
    }
    if (dayOf(world.tick) % DAYS_PER_YEAR === 0) {
      const age = ageYears(world, hero);
      if (age >= B.retireAge && range(world.rng, 0, 1) < 0.3) retireHero(world, hero, `aos ${age} anos`);
      else if (hero.scars.length >= 3 && range(world.rng, 0, 1) < 0.5) retireHero(world, hero, 'por causa das cicatrizes');
    }
  }
}

function leaveTown(world: World, hero: Hero): void {
  hero.status = 'left';
  hero.activity = null;
  hero.lfgSince = null;
  world.metrics.left++;
  const why = hero.loyalty < 15 ? 'sem confiança no prefeito' : 'sem ânimo para continuar';
  record(world, 'partiuDaVila', [hero.id], `${heroLabel(hero)} juntou suas coisas e deixou a vila, ${why}.`);
}

// ── IA de utilidade ───────────────────────────────────────────────────────

export function updateTownHeroes(world: World): void {
  for (const hero of world.heroes) {
    if (hero.status !== 'town') continue;
    if (hero.activity && world.tick < hero.activity.endsAt) continue;
    if (hero.activity) finishActivity(world, hero);
    chooseActivity(world, hero);
  }
}

function affordableUpgrade(world: World, hero: Hero): 'weapon' | 'armor' | null {
  const cap = maxGearTier(world);
  const slot = hero.gear.weapon <= hero.gear.armor ? 'weapon' : 'armor';
  const tier = hero.gear[slot] + 1;
  if (tier > cap) return null;
  return hero.gold >= forgePrice(world, tier) ? slot : null;
}

function idlePartners(world: World, hero: Hero): Hero[] {
  return townHeroes(world).filter(
    (h) => h.id !== hero.id && h.activity !== null && (h.activity.kind === 'vagar' || h.activity.kind === 'socializar'),
  );
}

export function scoreActivities(world: World, hero: Hero): [ActivityKind, number][] {
  const stats = heroStats(world, hero);
  const hpFrac = hero.hp / stats.maxHp;
  const e = hero.needs.energy / 100;
  const night = isNight(world.tick);
  const scores: [ActivityKind, number][] = [];

  scores.push(['descansar', (1 - e) * 1.2 + (1 - hpFrac) * 1.6 + (night ? 0.9 : 0)]);
  // Lesionado não desce nem treina: trata a lesão (na Casa de cura, se houver).
  if (hero.injury) scores.push(['tratar', 1.5]);
  if (level(world, 'taverna') >= 1 && hero.gold >= drinkPrice(world)) {
    const mult = hasTrait(hero, 'beberrao') ? 1.4 : 1;
    scores.push(['beber', (1 - hero.needs.fun / 100) * mult + (hero.morale < 40 ? 0.3 : 0)]);
  }
  if (level(world, 'templo') >= 1) {
    const mult = hasTrait(hero, 'devoto') ? 1.6 : 1;
    scores.push(['rezar', (1 - hero.needs.faith / 100) * 0.8 * mult + hero.grief / 200]);
  }
  if (affordableUpgrade(world, hero)) scores.push(['comprar', 1.1]);
  if (!hero.injury && level(world, 'campo') >= 1 && hero.gold >= trainPrice(world) && hero.level < maxLevel(hero)) {
    scores.push(['treinar', 0.35]);
  }
  if (hero.grief > 10 && hero.griefFor !== null) scores.push(['tumulo', (hero.grief / 100) * 1.4]);
  if (idlePartners(world, hero).length > 0) scores.push(['socializar', hasTrait(hero, 'sociavel') ? 0.6 : 0.3]);
  scores.push(['vagar', 0.15]);
  if (!hero.injury && hpFrac >= 0.75 && e >= 0.5 && hero.morale >= 35) {
    let lfg = (0.6 + 0.5 * Math.min(hpFrac, e)) * traitMult(hero, 'lfg');
    if (hero.gold < 20) lfg += 0.3;
    if (hero.lfgSince !== null) lfg += 0.3;
    if (night) lfg *= 0.5;
    scores.push(['aguardar', lfg]);
  }
  return scores;
}

function chooseActivity(world: World, hero: Hero): void {
  let best: ActivityKind = 'vagar';
  let bestScore = -Infinity;
  for (const [kind, score] of scoreActivities(world, hero)) {
    const s = score + range(world.rng, 0, 0.25);
    if (s > bestScore) {
      bestScore = s;
      best = kind;
    }
  }
  let targetId: number | undefined;
  if (best === 'socializar') targetId = pick(world.rng, idlePartners(world, hero)).id;
  hero.activity = {
    kind: best,
    startedAt: world.tick,
    endsAt: world.tick + DURATION_HOURS[best] * TICKS_PER_HOUR,
    ...(targetId !== undefined ? { targetId } : {}),
  };
  if (best === 'aguardar') hero.lfgSince ??= world.tick;
  else hero.lfgSince = null;
}

function finishActivity(world: World, hero: Hero): void {
  const act = hero.activity!;
  const town = world.town;
  const maxHp = heroStats(world, hero).maxHp;
  switch (act.kind) {
    case 'descansar': {
      const price = restPrice(world);
      const paid = hero.gold >= price;
      if (paid) {
        hero.gold -= price;
        town.treasury += price;
      }
      const hpGain = paid ? restHpGain(world) : 0.25;
      hero.needs.energy = clamp(hero.needs.energy + (paid ? restEnergyGain(world) : 35));
      hero.hp = Math.min(maxHp, hero.hp + maxHp * (hpGain + 0.05 * level(world, 'templo')));
      break;
    }
    case 'beber': {
      const price = drinkPrice(world);
      hero.gold -= price;
      town.treasury += price * 0.7;
      hero.needs.fun = clamp(hero.needs.fun + 35);
      hero.morale = clamp(hero.morale + (hasTrait(hero, 'beberrao') ? 20 : 10) + 5 * roleCount(world, 'contador'));
      for (const other of townHeroes(world)) {
        if (other.id !== hero.id && other.activity?.kind === 'beber') addBond(world, hero, other, 1 + 3 * temperament(hero, other));
      }
      break;
    }
    case 'rezar': {
      const gift = Math.min(hero.gold, B.donation);
      hero.gold -= gift;
      town.treasury += gift;
      hero.needs.faith = clamp(hero.needs.faith + 40);
      hero.morale = clamp(hero.morale + (hasTrait(hero, 'devoto') ? 15 : 5));
      hero.grief = Math.max(0, hero.grief - 10);
      break;
    }
    case 'comprar': {
      const slot = affordableUpgrade(world, hero);
      if (!slot) break;
      const price = forgePrice(world, hero.gear[slot] + 1);
      hero.gold -= price;
      hero.gear[slot]++;
      town.treasury += price * B.gearMargin;
      if (slot === 'armor') hero.hp = Math.min(heroStats(world, hero).maxHp, hero.hp + (heroStats(world, hero).maxHp - maxHp));
      break;
    }
    case 'treinar': {
      const price = trainPrice(world);
      hero.gold -= price;
      town.treasury += price * 0.5;
      gainXp(world, hero, xpToNext(hero.level) * 0.06 * level(world, 'campo') * (1 + 0.5 * roleCount(world, 'mentor')));
      hero.needs.energy = clamp(hero.needs.energy - 10);
      break;
    }
    case 'tumulo': {
      const lost = world.heroes.find((h) => h.id === hero.griefFor);
      if (lost && hero.grief >= 40) {
        record(
          world,
          'tumulo',
          [hero.id, lost.id],
          `${hero.name} visitou o túmulo de ${lost.name} e ficou um tempo em silêncio.`,
        );
      }
      hero.grief = Math.max(0, hero.grief - 25);
      hero.morale = clamp(hero.morale + 5);
      break;
    }
    case 'socializar': {
      const other = world.heroes.find((h) => h.id === act.targetId);
      if (other && other.status === 'town') addBond(world, hero, other, 1 + 4 * temperament(hero, other) + range(world.rng, -2, 2));
      hero.needs.fun = clamp(hero.needs.fun + 10);
      break;
    }
    case 'tratar': {
      if (hero.injury) hero.injury.daysLeft -= 0.25 * (1 + level(world, 'casa'));
      const fee = Math.min(hero.gold, level(world, 'casa') > 0 ? 2 : 0);
      hero.gold -= fee;
      town.treasury += fee;
      hero.morale = clamp(hero.morale + 3);
      break;
    }
    case 'chegando':
    case 'vagar':
    case 'aguardar':
      break;
  }
}
