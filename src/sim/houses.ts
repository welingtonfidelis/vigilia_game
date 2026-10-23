// Casas das famílias (M6 F5). Quem casa e tem filho funda uma casa, com sobrenome sorteado; os
// filhos e os netos levam o nome, e quem casa com alguém da casa passa a ser dela. Se os dois
// já vêm de casas diferentes, a criança fica na mais antiga. A casa junta feitos (três gerações
// no abismo, um Senhor por geração, vinte anos sem baixas), que dão reputação e erguem o
// estandarte dela no Salão das Lendas. Nada disso mexe no combate nem no ouro.

import { CREST_SYMBOLS, CREST_TINCTURES, HOUSE_DEEDS, HOUSE_SURNAMES } from '../data/houses.ts';
import { dayOf } from './calendar.ts';
import { record } from './chronicle.ts';
import { BALANCE as B, DAYS_PER_YEAR, TICKS_PER_DAY } from './config.ts';
import { stableRoll } from './rng.ts';
import type { Child, Hero, House, HouseDeedId, World } from './types.ts';

export type HouseResult = { ok: true } | { ok: false; reason: string };

export const housesOf = (world: World): House[] => (world.houses ??= []);

export const houseById = (world: World, id: number | null | undefined): House | undefined =>
  id === null || id === undefined ? undefined : housesOf(world).find((h) => h.id === id);

export const houseOfHero = (world: World, hero: Hero | Child): House | undefined => houseById(world, hero.houseId);

/** "Heitor Valente": o nome com o da casa (quem não tem casa fica só com o nome). */
export function fullName(world: World, hero: Hero | Child): string {
  const house = houseOfHero(world, hero);
  return house ? `${hero.name} ${house.name}` : hero.name;
}

/** Os heróis da casa, de qualquer status (vivos, aposentados, mortos, partidos). */
export const houseMembers = (world: World, house: House): Hero[] => world.heroes.filter((h) => h.houseId === house.id);

/** Brasão sorteado: metal sobre cor ou cor sobre metal, como manda a heráldica. */
function rollCrest(world: World, seq: number): House['crest'] {
  const field = Math.floor(stableRoll(world.seed, seq, 701) * CREST_TINCTURES.length);
  const fieldMetal = CREST_TINCTURES[field]!.metal;
  const charges = CREST_TINCTURES.map((t, i) => (t.metal !== fieldMetal ? i : -1)).filter((i) => i >= 0);
  const charge = charges[Math.floor(stableRoll(world.seed, seq, 702) * charges.length)]!;
  const symbol = Math.floor(stableRoll(world.seed, seq, 703) * CREST_SYMBOLS.length);
  return { field, charge, symbol };
}

function foundHouse(world: World, a: Hero, b: Hero, tick: number): House {
  const seq = (world.houseSeq ?? 0) + 1;
  world.houseSeq = seq;
  const taken = new Set(housesOf(world).map((h) => h.name));
  const free = HOUSE_SURNAMES.filter((n) => !taken.has(n));
  const name = free.length > 0 ? free[Math.floor(stableRoll(world.seed, seq, 700) * free.length)]! : `${HOUSE_SURNAMES[seq % HOUSE_SURNAMES.length]} ${seq}`;
  const house: House = { id: seq, name, foundedTick: tick, founders: [a.id, b.id], crest: rollCrest(world, seq), deeds: [] };
  housesOf(world).push(house);
  a.houseId = house.id;
  b.houseId = house.id;
  return house;
}

/**
 * A casa de quem nasce do casal: a de um dos pais (a mais antiga, se os dois têm), e quem
 * casou de fora passa a ser dela; sem casa nenhuma, o casal funda uma.
 */
export function houseForBirth(world: World, a: Hero, b: Hero, tick = world.tick): { house: House; founded: boolean } {
  const existing = [houseById(world, a.houseId), houseById(world, b.houseId)].filter((h): h is House => !!h).sort((x, y) => x.id - y.id)[0];
  if (existing) {
    for (const p of [a, b]) if (p.houseId === null || p.houseId === undefined) p.houseId = existing.id;
    return { house: existing, founded: false };
  }
  return { house: foundHouse(world, a, b, tick), founded: true };
}

/** Nascimento (chamado por people.ts): a criança entra na casa, e a fundação vai para a crônica. */
export function birthIntoHouse(world: World, child: Child, a: Hero, b: Hero): void {
  const { house, founded } = houseForBirth(world, a, b);
  child.houseId = house.id;
  if (founded) record(world, 'casa', [a.id, b.id], `Com ${child.name}, ${a.name} e ${b.name} fundaram a casa ${house.name}.`);
}

/** Geração de cada herói da casa: os fundadores são a primeira; quem casou de fora fica na do par. */
export function generations(world: World, house: House): Map<number, number> {
  const members = houseMembers(world, house);
  const byId = new Map(members.map((h) => [h.id, h]));
  const gen = new Map<number, number>();
  const of = (h: Hero, depth = 0): number => {
    const known = gen.get(h.id);
    if (known !== undefined) return known;
    if (depth > 12) return 1;
    let g = 1;
    if (!house.founders.includes(h.id)) {
      const parents = h.parents.map((id) => byId.get(id)).filter((p): p is Hero => !!p);
      if (parents.length > 0) g = 1 + Math.max(...parents.map((p) => of(p, depth + 1)));
      else if (h.partnerId !== null && byId.has(h.partnerId) && byId.get(h.partnerId)!.parents.length > 0) g = of(byId.get(h.partnerId)!, depth + 1);
    }
    gen.set(h.id, g);
    return g;
  };
  for (const h of members) of(h);
  return gen;
}

function earnDeed(world: World, house: House, id: HouseDeedId): void {
  if (house.deeds.some((d) => d.id === id)) return;
  house.deeds.push({ id, tick: world.tick });
  world.town.reputation = Math.min(100, world.town.reputation + B.houseDeedReputation);
  const raised = house.deeds.length === 1 ? ' O estandarte da casa sobe no Salão das Lendas.' : '';
  record(world, 'casa', house.founders, `A casa ${house.name}: ${HOUSE_DEEDS[id].name.toLowerCase()}.${raised}`);
}

/** Uma vez por dia: confere os feitos de cada casa. */
export function dailyHouses(world: World): void {
  for (const house of housesOf(world)) {
    const members = houseMembers(world, house);
    if (members.length === 0) continue;
    const gen = generations(world, house);
    const went = (n: number) => members.some((h) => gen.get(h.id) === n && h.stats.expeditions > 0);
    if (went(1) && went(2) && went(3)) earnDeed(world, house, 'tresGeracoes');
    // Um Senhor por geração: toda geração que já pegou em armas tem alguém que venceu um Senhor (pelo menos duas).
    const adultGens = [...new Set(members.filter((h) => h.stats.expeditions > 0).map((h) => gen.get(h.id)!))];
    if (adultGens.length >= 2 && adultGens.every((n) => members.some((h) => gen.get(h.id) === n && h.deeds.some((d) => d.kind === 'chefe')))) {
      earnDeed(world, house, 'senhorPorGeracao');
    }
    // Vinte anos sem enterrar ninguém, e ainda com gente da casa descendo (casa só de aposentados não conta).
    const active = members.some((h) => (h.status === 'town' || h.status === 'expedition') && h.stats.expeditions > 0);
    const lastLoss = Math.max(house.foundedTick, ...members.map((h) => (h.status === 'dead' && h.death ? h.death.tick : -Infinity)));
    if (active && world.tick - lastLoss >= B.houseQuietYears * DAYS_PER_YEAR * TICKS_PER_DAY) earnDeed(world, house, 'vinteAnos');
  }
}

/** O prefeito dá outro nome à casa. */
export function renameHouse(world: World, id: number, name: string): HouseResult {
  const house = houseById(world, id);
  if (!house) return { ok: false, reason: 'Essa casa não existe.' };
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length < 2 || clean.length > 24) return { ok: false, reason: 'O nome da casa precisa ter de 2 a 24 letras.' };
  if (!/^[\p{L}][\p{L} '-]*$/u.test(clean)) return { ok: false, reason: 'Só letras, espaço, hífen e apóstrofo.' };
  if (clean === house.name) return { ok: false, reason: 'A casa já tem esse nome.' };
  if (housesOf(world).some((h) => h.id !== id && h.name.toLowerCase() === clean.toLowerCase())) return { ok: false, reason: 'Outra casa já tem esse nome.' };
  const old = house.name;
  house.name = clean;
  record(world, 'casa', house.founders, `Por decisão do prefeito, a casa ${old} passou a se chamar ${clean}.`);
  return { ok: true };
}

/**
 * Save de antes da F5: as famílias que já existem viram casas, na ordem dos nascimentos
 * (avós antes dos netos), fundadas no dia do primeiro filho. Sem crônica: é o passado.
 */
export function backfillHouses(world: World): void {
  if (world.houses) return;
  world.houses = [];
  const births: { parents: number[]; bornDay: number; target: Hero | Child }[] = [
    ...world.heroes.filter((h) => h.parents.length === 2).map((h) => ({ parents: h.parents, bornDay: h.bornDay, target: h as Hero | Child })),
    ...world.children.map((c) => ({ parents: [...c.parents], bornDay: c.bornDay, target: c as Hero | Child })),
  ].sort((x, y) => x.bornDay - y.bornDay || x.target.id - y.target.id);
  for (const b of births) {
    const pa = world.heroes.find((h) => h.id === b.parents[0]);
    const pb = world.heroes.find((h) => h.id === b.parents[1]);
    if (!pa || !pb) continue;
    const { house } = houseForBirth(world, pa, pb, Math.max(0, b.bornDay) * TICKS_PER_DAY);
    b.target.houseId = house.id;
  }
}

/** Anos de uma casa (para o painel). */
export const houseAge = (world: World, house: House): number => Math.floor((dayOf(world.tick) - Math.floor(house.foundedTick / TICKS_PER_DAY)) / DAYS_PER_YEAR);
