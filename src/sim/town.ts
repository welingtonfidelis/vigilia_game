// Vida na vila: necessidades, IA de utilidade e efeitos das atividades.

import { record, g, heroLabel } from './chronicle.ts';
import { dayOf, isNight } from './calendar.ts';
import { BALANCE as B, DAYS_PER_YEAR, TICKS_PER_HOUR } from './config.ts';
import {
  drinkPrice,
  earn,
  EFFECTS,
  grade,
  hasSpec,
  heroCapacity,
  level,
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
import { benchOffer, nextTierWorth, upgradeTier, useBench } from './items.ts';
import { workEffectLevel } from './patronage.ts';
import { chance, pick, range } from './rng.ts';
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
  termas: 3,
  joias: 2,
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
    // O vitral do templo segura a fé um pouco mais.
    const glass = 1 - 0.05 * workEffectLevel(world, 'vitral');
    hero.needs.faith = clamp(hero.needs.faith - B.needDecayPerHour.faith * traitMult(hero, 'faithDecay') * glass);
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
      // O muro dos nomes ajuda o luto a passar.
      hero.grief = Math.max(0, hero.grief - 3 * (1 + 0.05 * workEffectLevel(world, 'muro')));
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

/**
 * O encaixe que o herói melhoraria agora com o próprio ouro: o mais fraco primeiro, e só
 * se o tier novo valer mais que a peça que ele já tem (uma rara não troca por comum igual).
 */
function affordableUpgrade(world: World, hero: Hero): 'weapon' | 'armor' | null {
  const order: ('weapon' | 'armor')[] = hero.gear.weapon <= hero.gear.armor ? ['weapon', 'armor'] : ['armor', 'weapon'];
  for (const slot of order) {
    const tier = nextTierWorth(world, hero, slot);
    if (tier !== null && hero.gold >= forgePrice(world, tier)) return slot;
  }
  return null;
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
  // A fonte termal é grátis e boa para quem voltou machucado, sem ânimo ou de luto.
  // Só entra na conta quando o herói precisa: saudável, ele prefere descer ou esperar.
  if (hpFrac < 0.8 || hero.morale < 50 || hero.grief > 20 || hero.injury) {
    const thermal =
      0.5 + (1 - hpFrac) * 1.2 + (1 - hero.morale / 100) * 0.5 + hero.grief / 200 + (hero.injury ? 0.4 : 0) + (night ? 0.2 : 0);
    scores.push(['termas', thermal]);
  }
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
  const upgrade = affordableUpgrade(world, hero);
  if (upgrade) scores.push(['comprar', 1.1]);
  // Com o tier comum em dia e ouro sobrando, o herói leva a peça ao joalheiro.
  else if (benchOffer(world, hero)) scores.push(['joias', 0.9]);
  if (!hero.injury && level(world, 'campo') >= 1 && hero.gold >= trainPrice(world) && hero.level < maxLevel(world, hero)) {
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
  const maxHp = heroStats(world, hero).maxHp;
  switch (act.kind) {
    case 'descansar': {
      const price = restPrice(world);
      const paid = hero.gold >= price;
      if (paid) {
        hero.gold -= price;
        earn(world, price, 'descanso');
      }
      const hpGain = paid ? restHpGain(world) : 0.25;
      hero.needs.energy = clamp(hero.needs.energy + (paid ? restEnergyGain(world) : 35));
      hero.hp = Math.min(maxHp, hero.hp + maxHp * (hpGain + EFFECTS.templeHeal(grade(world, 'templo'))));
      if (paid && hasSpec(world, 'luxo')) hero.morale = clamp(hero.morale + 5);
      break;
    }
    case 'beber': {
      const price = drinkPrice(world);
      hero.gold -= price;
      // Na casa de apostas a mesa fica com tudo; na cervejaria a bebida rende o dobro.
      earn(world, price * (hasSpec(world, 'apostas') ? 1 : 0.7), 'taverna');
      const brew = hasSpec(world, 'cervejaria') ? 2 : 1;
      hero.needs.fun = clamp(hero.needs.fun + 35 * brew);
      hero.morale = clamp(hero.morale + ((hasTrait(hero, 'beberrao') ? 20 : 10) + 5 * roleCount(world, 'contador')) * brew);
      for (const other of townHeroes(world)) {
        if (other.id !== hero.id && other.activity?.kind === 'beber') addBond(world, hero, other, 1 + 3 * temperament(hero, other));
      }
      break;
    }
    case 'rezar': {
      // Quem juntou fortuna deixa uma oferta no altar: é o ouro dos heróis voltando para a vila.
      const tithe = hero.gold > B.templeTitheFrom ? Math.floor(hero.gold * B.templeTithe) : 0;
      const gift = Math.min(hero.gold, B.donation + tithe);
      hero.gold -= gift;
      earn(world, gift, 'oferenda');
      const light = hasSpec(world, 'luz') ? 2 : 1;
      hero.needs.faith = clamp(hero.needs.faith + 40 * light);
      hero.morale = clamp(hero.morale + (hasTrait(hero, 'devoto') ? 15 : 5));
      hero.grief = Math.max(0, hero.grief - 10 * light);
      if (gift >= 50) {
        record(world, 'doacao', [hero.id], `${hero.name} deixou ${gift} de ouro no templo e acendeu uma vela por quem ficou no abismo.`);
      }
      break;
    }
    case 'comprar': {
      const slot = affordableUpgrade(world, hero);
      if (!slot) break;
      const price = forgePrice(world, nextTierWorth(world, hero, slot)!);
      hero.gold -= price;
      upgradeTier(world, hero, slot, 'comprado na forja da vila');
      earn(world, price * B.gearMargin, 'forja');
      break;
    }
    case 'joias': {
      const offer = benchOffer(world, hero);
      if (offer) useBench(world, hero, offer);
      break;
    }
    case 'treinar': {
      const price = trainPrice(world);
      hero.gold -= price;
      earn(world, price * 0.5, 'treino');
      const discipline = hasSpec(world, 'disciplina') ? B.specDisciplinaXp : 1;
      gainXp(world, hero, xpToNext(hero.level) * EFFECTS.trainXp(grade(world, 'campo')) * (1 + 0.5 * roleCount(world, 'mentor')) * discipline);
      hero.needs.energy = clamp(hero.needs.energy - 10);
      if (hasSpec(world, 'arena')) {
        // Arena: luta entre heróis com plateia e apostas; às vezes alguém sai machucado.
        hero.needs.fun = clamp(hero.needs.fun + 30);
        earn(world, B.specArenaGold, 'treino');
        if (!hero.injury && chance(world.rng, B.specArenaInjury)) {
          hero.injury = { kind: 'braco', daysLeft: 1.5, total: 1.5 };
          record(world, 'lesao', [hero.id], `${hero.name} torceu o braço numa luta da arena.`);
        }
      }
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
      hero.grief = Math.max(0, hero.grief - 25 * (hasSpec(world, 'luz') ? 2 : 1));
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
      if (hero.injury) hero.injury.daysLeft -= 0.25 * (1 + grade(world, 'casa'));
      const fee = Math.min(hero.gold, level(world, 'casa') > 0 ? 2 : 0);
      hero.gold -= fee;
      earn(world, fee, 'cura');
      hero.morale = clamp(hero.morale + 3);
      break;
    }
    case 'termas': {
      hero.hp = Math.min(maxHp, hero.hp + maxHp * 0.2);
      hero.morale = clamp(hero.morale + 12);
      hero.needs.energy = clamp(hero.needs.energy + 12);
      hero.needs.fun = clamp(hero.needs.fun + 8);
      hero.grief = Math.max(0, hero.grief - 8);
      if (hero.injury) hero.injury.daysLeft = Math.max(0, hero.injury.daysLeft - 0.5);
      break;
    }
    case 'chegando':
    case 'vagar':
    case 'aguardar':
      break;
  }
}
