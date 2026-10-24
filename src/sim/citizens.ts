// Cidadãos (M3): moradores nomeados que dão vida à vila, pagam impostos pelo humor
// e são os primeiros a sentir uma incursão. A população total continua em Town.population;
// os cidadãos são a parte visível e lembrada dela.

import { abyssPressure } from './dungeon.ts';
import { NAMES_F, NAMES_M } from '../data/names.ts';
import { dayOf } from './calendar.ts';
import { record } from './chronicle.ts';
import { BALANCE as B } from './config.ts';
import { decreeCitizenMoodPenalty } from './decrees.ts';
import { grade } from './economy.ts';
import { chance, int, pick } from './rng.ts';
import type { BuildingId, Citizen, CitizenJob, Gender, World } from './types.ts';

export const JOB_NAMES: Record<CitizenJob, { m: string; f: string }> = {
  lavrador: { m: 'lavrador', f: 'lavradora' },
  pedreiro: { m: 'pedreiro', f: 'pedreira' },
  copeiro: { m: 'copeiro', f: 'copeira' },
  ferreiro: { m: 'ferreiro', f: 'ferreira' },
  acolito: { m: 'acólito', f: 'acólita' },
  guarda: { m: 'guarda', f: 'guarda' },
};

/** Prédio onde o ofício acontece (null = praça/portão). */
export const JOB_BUILDING: Record<CitizenJob, BuildingId | null> = {
  lavrador: null,
  pedreiro: 'casa',
  copeiro: 'taverna',
  ferreiro: 'ferreiro',
  acolito: 'templo',
  guarda: null,
};

export const JOB_ORDER: CitizenJob[] = ['guarda', 'copeiro', 'ferreiro', 'acolito', 'pedreiro', 'lavrador'];

const clamp = (v: number, min = 0, max = 100): number => Math.max(min, Math.min(max, v));

const number = (n: number): string => String(Math.max(1, Math.round(n)));

function citizenName(world: World, gender: Gender, salt = 0): string {
  const used = new Set<string>([
    ...world.heroes.map((h) => h.name.replace(/ [IVX]+$/, '')),
    ...world.citizens.map((c) => c.name.replace(/ [IVX]+$/, '')),
    ...world.children.map((c) => c.name.replace(/ [IVX]+$/, '')),
  ]);
  const pool = gender === 'm' ? NAMES_M : NAMES_F;
  const fresh = pool.filter((n) => !used.has(n));
  if (fresh.length > 0) return pick(world.rng, fresh);
  const base = pool[(world.nextId + salt) % pool.length]!;
  return `${base} ${['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][world.nextId % 8]}`;
}

export function createCitizen(world: World, job: CitizenJob = 'lavrador'): Citizen {
  const gender: Gender = chance(world.rng, 0.5) ? 'm' : 'f';
  const citizen: Citizen = {
    id: world.nextId++,
    name: citizenName(world, gender),
    gender,
    job,
    happiness: int(world.rng, 50, 70),
    workplace: JOB_BUILDING[job],
    arrivedDay: dayOf(world.tick),
  };
  world.citizens.push(citizen);
  return citizen;
}

/** Quantos guardas a vila mantém segundo o tamanho da população. */
export const guardTarget = (world: World): number =>
  Math.min(B.citizenGuardMax, Math.max(1, Math.floor(world.citizens.length / B.citizenGuardPerPop)));

/** Vagas de trabalho abertas pelos prédios (mais os guardas da milícia). */
function jobSlots(world: World): CitizenJob[] {
  const slots: CitizenJob[] = [];
  for (let i = 0; i < guardTarget(world); i++) slots.push('guarda');
  const buildings: [CitizenJob, BuildingId][] = [
    ['copeiro', 'taverna'],
    ['ferreiro', 'ferreiro'],
    ['acolito', 'templo'],
    ['pedreiro', 'casa'],
  ];
  for (const [job, id] of buildings) {
    if (world.town.buildings[id] > 0) slots.push(job);
  }
  return slots;
}

/** Redistribui os ofícios conforme os prédios e o número de guardas. */
export function refreshJobs(world: World): void {
  const slots = jobSlots(world);
  const citizens = [...world.citizens].sort((a, b) => a.id - b.id);
  citizens.forEach((citizen, i) => {
    citizen.job = slots[i] ?? 'lavrador';
    citizen.workplace = JOB_BUILDING[citizen.job];
  });
}

export function citizenMood(world: World): number {
  if (world.citizens.length === 0) return 60;
  return world.citizens.reduce((sum, c) => sum + c.happiness, 0) / world.citizens.length;
}

/** Cria moradores até a vila ter um nomeado para cada fatia da população. */
export function syncCitizenRoster(world: World, announce = true): void {
  const target = Math.min(B.citizenRoster, Math.max(B.citizenStart, Math.round(world.town.population / B.citizenPerPop)));
  const before = world.citizens.length;
  while (world.citizens.length < target) createCitizen(world);
  // Se a população encolheu (corrupção/incursão), os mais infelizes também vão embora.
  if (world.citizens.length > target) {
    const extra = [...world.citizens].sort((a, b) => a.happiness - b.happiness || a.id - b.id).slice(0, world.citizens.length - target);
    const ids = new Set(extra.map((c) => c.id));
    world.citizens = world.citizens.filter((c) => !ids.has(c.id));
    world.metrics.citizensLeft += extra.length;
    if (announce) record(world, 'cidadao', [], `${citizenNames(extra)} deixaram a vila: a população encolheu.`);
  }
  refreshJobs(world);
  if (!announce || world.citizens.length === before) return;
  for (const citizen of world.citizens.slice(before)) {
    const job = JOB_NAMES[citizen.job][citizen.gender];
    record(world, 'cidadao', [], `${citizen.name}, ${job}, se mudou para a vila. Agora são ${number(world.town.population)} moradores.`);
  }
}

/** Migração: gera o elenco visível sem escrever na crônica. */
export function seedCitizens(world: World, target: number = B.citizenStart): void {
  while (world.citizens.length < target) createCitizen(world);
  refreshJobs(world);
}

export function dailyCitizens(world: World): void {
  // A pressão do abismo pesa no humor da vila.
  const corruption = abyssPressure(world);
  const houses = world.town.expansion.houses.filter(Boolean).length;
  const base = clamp(
    B.citizenHappinessBase +
      2 * grade(world, 'estalagem') +
      2 * grade(world, 'templo') +
      2 * houses +
      Math.min(B.workEffectCap, world.town.works?.fonte?.level ?? 0) -
      corruption * 0.25,
    15,
    90,
  );
  const decreePenalty = decreeCitizenMoodPenalty(world);
  for (const citizen of [...world.citizens]) {
    citizen.happiness = clamp(citizen.happiness + (base - citizen.happiness) * 0.15 - decreePenalty);
    if (citizen.happiness >= B.citizenLeaveBelow) continue;
    if (!chance(world.rng, B.citizenLeaveChance)) continue;
    leaveCitizen(world, citizen, 'sem ânimo para viver à beira do abismo');
  }
  syncCitizenRoster(world);
  refreshJobs(world);
}

/** Festa na praça: os moradores também sentem. */
export function festivalCitizens(world: World, amount = 12): void {
  for (const citizen of world.citizens) citizen.happiness = clamp(citizen.happiness + amount);
}

export function leaveCitizen(world: World, citizen: Citizen, why: string): void {
  world.citizens = world.citizens.filter((c) => c.id !== citizen.id);
  world.town.population = Math.max(0, world.town.population - 1);
  world.metrics.citizensLeft++;
  record(world, 'cidadao', [], `${citizen.name} ${why === 'na incursão' ? 'pereceu' : 'deixou a vila'} ${why}.`);
}

/** Mortes/desaparecimentos de moradores numa incursão; devolve quem ficou pelo caminho. */
export function raidCitizenLoss(world: World, count: number): Citizen[] {
  if (count <= 0) return [];
  const lost = [...world.citizens].sort((a, b) => a.happiness - b.happiness || a.id - b.id).slice(0, count);
  const ids = new Set(lost.map((c) => c.id));
  world.citizens = world.citizens.filter((c) => !ids.has(c.id));
  world.town.population = Math.max(0, world.town.population - count);
  world.metrics.citizenDeaths += count;
  refreshJobs(world);
  return lost;
}

/** Poder dos guardas da milícia na defesa da vila. */
export const guardDefense = (world: World): number => {
  const guards = world.citizens.filter((c) => c.job === 'guarda').length;
  // O guarda de folga (audiência) não defende naquela noite.
  const leave = world.town.guardLeaveDay === dayOf(world.tick) && guards > 0 ? 1 : 0;
  return (guards - leave) * 8;
};

/** Lista "Fulano, ofício" para a crônica. */
export function citizenNames(citizens: Citizen[]): string {
  const names = citizens.map((c) => c.name);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}
