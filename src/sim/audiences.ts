// Audiências da manhã (M6 F1). Todo dia às 8h chegam de 0 a 2 petições de moradores e heróis
// com nome; cada uma vale por 2 dias e, sem resposta, expira com a consequência mais branda.
// O ouro é simbólico (dias do imposto dos moradores) e os sorteios saem de um RNG do dia, sem
// mexer no RNG do núcleo.

import { BUILDINGS } from '../data/buildings.ts';
import { PETITIONS, PETITION_BY_ID, type AskerSpec, type OtherSpec, type PetitionChoiceDef, type PetitionDef, type PetitionEffect, type PetitionText, type Who } from '../data/petitions.ts';
import { dayOf, seasonOf } from './calendar.ts';
import { record } from './chronicle.ts';
import { BALANCE as B } from './config.ts';
import { JOB_NAMES, leaveCitizen, syncCitizenRoster } from './citizens.ts';
import { abyssPressure } from './dungeon.ts';
import { citizenTaxesPerDay, earn, level, populationCap, spend } from './economy.ts';
import { addBond, getBond, hasTrait, revealTrait } from './hero.ts';
import { dayRng, next, weighted } from './rng.ts';
import { townHeroes } from './town.ts';
import { grantWish } from './wishes.ts';
import type { ChronicleKind, Citizen, Hero, Petition, PetitionPerson, World } from './types.ts';

export type AudienceResult = { ok: true } | { ok: false; reason: string };

const clamp = (v: number): number => Math.max(0, Math.min(100, v));

/** O ouro simbólico: um dia do imposto dos moradores. */
export const petitionDayTax = (world: World): number => Math.max(B.petitionDayTaxMin, citizenTaxesPerDay(world));

/** Ouro que a resposta custa. */
export const choiceGold = (world: World, choice: PetitionChoiceDef): number =>
  choice.cost ? Math.max(1, Math.round(choice.cost * petitionDayTax(world))) : 0;

// ── Quem é quem ─────────────────────────────────────────────────────────

type Person = { kind: 'morador'; c: Citizen } | { kind: 'heroi'; h: Hero } | { kind: 'crianca'; name: string; gender: 'm' | 'f'; id: number };

function personOf(world: World, p: PetitionPerson | null): Person | null {
  if (!p) return null;
  if (p.kind === 'morador') {
    const c = world.citizens.find((x) => x.id === p.id);
    return c ? { kind: 'morador', c } : null;
  }
  if (p.kind === 'crianca') {
    const c = world.children.find((x) => x.id === p.id);
    return c ? { kind: 'crianca', name: c.name, gender: c.gender, id: c.id } : null;
  }
  const h = world.heroes.find((x) => x.id === p.id);
  return h ? { kind: 'heroi', h } : null;
}

const nameOf = (p: Person | null): string => (!p ? '' : p.kind === 'morador' ? p.c.name : p.kind === 'heroi' ? p.h.name : p.name);
const genderOf = (p: Person | null): 'm' | 'f' => (!p ? 'm' : p.kind === 'morador' ? p.c.gender : p.kind === 'heroi' ? p.h.gender : p.gender);

/** Dias desde a última entrada da crônica deste tipo (Infinity se não houver). */
function daysSince(world: World, kind: ChronicleKind, heroId?: number): number {
  const today = dayOf(world.tick);
  for (let i = world.chronicle.length - 1; i >= 0; i--) {
    const e = world.chronicle[i]!;
    const days = today - dayOf(e.tick);
    if (days > 40) break;
    if (e.kind === kind && (heroId === undefined || e.heroIds.includes(heroId))) return days;
  }
  return Infinity;
}

function heroTag(world: World, h: Hero, tag: NonNullable<Extract<AskerSpec, { kind: 'heroi' }>['tag']>): boolean {
  const today = dayOf(world.tick);
  switch (tag) {
    case 'pai':
      return world.children.some((c) => c.parents.includes(h.id));
    case 'luto':
      return h.grief > 20 && h.griefFor !== null && world.heroes.some((x) => x.id === h.griefFor && x.status === 'dead');
    case 'novato':
      return h.stats.expeditions < 4;
    case 'rico':
      return h.gold >= 1500;
    case 'casado':
      return h.partnerId !== null;
    case 'recemCasado':
      return h.partnerId !== null && daysSince(world, 'casamento', h.id) <= 10;
    case 'recemPai':
      return world.children.some((c) => c.parents.includes(h.id) && today - c.bornDay <= 20);
  }
}

function askers(world: World, spec: AskerSpec): PetitionPerson[] {
  if (spec.kind === 'morador') return world.citizens.filter((c) => !spec.job || c.job === spec.job).map((c) => ({ kind: 'morador', id: c.id }));
  if (spec.kind === 'aposentado') return world.heroes.filter((h) => h.status === 'retired').map((h) => ({ kind: 'heroi', id: h.id }));
  return townHeroes(world)
    .filter((h) => (!spec.trait || hasTrait(h, spec.trait)) && (!spec.tag || heroTag(world, h, spec.tag)))
    .map((h) => ({ kind: 'heroi', id: h.id }));
}

function others(world: World, spec: OtherSpec, asker: PetitionPerson): PetitionPerson[] {
  const askerHero = asker.kind === 'heroi' ? world.heroes.find((h) => h.id === asker.id) : undefined;
  switch (spec.kind) {
    case 'morador':
      return world.citizens.filter((c) => c.id !== asker.id && (!spec.job || c.job === spec.job)).map((c) => ({ kind: 'morador', id: c.id }));
    case 'heroi':
      return townHeroes(world)
        .filter((h) => h.id !== asker.id && (!spec.trait || hasTrait(h, spec.trait)))
        .filter((h) => {
          if (!spec.tag) return true;
          if (!askerHero) return false;
          const bond = getBond(world, askerHero.id, h.id);
          if (spec.tag === 'rival') return bond <= -20;
          if (spec.tag === 'amigo') return bond >= 40;
          if (spec.tag === 'veterano') return hasTrait(h, 'veterano');
          return askerHero.partnerId === h.id;
        })
        .map((h) => ({ kind: 'heroi', id: h.id }));
    case 'filho':
      return world.children
        .filter((c) => c.parents.includes(asker.id))
        .sort((a, b) => b.bornDay - a.bornDay)
        .map((c) => ({ kind: 'crianca', id: c.id }));
    case 'morto': {
      const dead = askerHero && world.heroes.find((h) => h.id === askerHero.griefFor && h.status === 'dead');
      return dead ? [{ kind: 'heroi', id: dead.id }] : [];
    }
  }
}

function fits(world: World, def: PetitionDef): boolean {
  if (def.building && level(world, def.building) < 1) return false;
  const today = dayOf(world.tick);
  switch (def.when) {
    case undefined:
      return true;
    case 'peste':
      return daysSince(world, 'evento') <= 20 && world.chronicle.findLast((e) => e.kind === 'evento')!.text.startsWith('Peste');
    case 'incursao':
      return world.town.lastRaidDay >= 0 && today - world.town.lastRaidDay <= 10;
    case 'luto':
      return daysSince(world, 'morte') <= 10;
    case 'casamento':
      return daysSince(world, 'casamento') <= 10;
    case 'nascimento':
      return daysSince(world, 'nascimento') <= 20;
    case 'verao':
      return seasonOf(today) === 1;
    case 'outono':
      return seasonOf(today) === 2;
    case 'inverno':
      return seasonOf(today) === 3;
    case 'pressao':
      return abyssPressure(world) >= 40;
    case 'bichos':
      return (world.town.pets ?? []).some((p) => p.species === 'cao');
  }
}

// ── A manhã ─────────────────────────────────────────────────────────────

/** Às 8h: as petições vencidas expiram e as novas chegam. */
export function morningAudiences(world: World): void {
  const today = dayOf(world.tick);
  const open = (world.town.petitions ??= []);
  for (const p of [...open]) {
    if (!personOf(world, p.asker)) open.splice(open.indexOf(p), 1);
    else if (today > p.untilDay) expire(world, p);
  }
  const r = dayRng(world.seed, today, 100);
  const count = weighted(r, B.petitionsPerMorning.map((w, n) => [n, w] as const));
  for (let n = 0; n < count && open.length < B.petitionMaxOpen; n++) {
    const busy = new Set(open.flatMap((p) => [p.defId, `${p.asker.kind}:${p.asker.id}`]));
    const pool = PETITIONS.filter((d) => !busy.has(d.id) && fits(world, d));
    for (let tries = 0; tries < 6 && pool.length > 0; tries++) {
      const def = weighted(r, pool.map((d) => [d, d.weight ?? 1] as const));
      pool.splice(pool.indexOf(def), 1);
      const asker = pickFree(r, askers(world, def.asker), busy);
      if (!asker) continue;
      let other: PetitionPerson | null = null;
      if (def.other) {
        other = pickFree(r, others(world, def.other, asker), new Set());
        if (!other) continue;
      }
      world.town.petitionSeq = (world.town.petitionSeq ?? 0) + 1;
      open.push({ id: world.town.petitionSeq, defId: def.id, asker, other, building: def.building ?? null, day: today, untilDay: today + B.petitionDays - 1 });
      (world.metrics.audiences ??= { asked: 0, answered: 0, expired: 0 }).asked++;
      break;
    }
  }
}

function pickFree(r: ReturnType<typeof dayRng>, list: PetitionPerson[], busy: Set<string>): PetitionPerson | null {
  const free = list.filter((p) => !busy.has(`${p.kind}:${p.id}`));
  return free.length ? free[Math.floor(next(r) * free.length)]! : null;
}

function expire(world: World, p: Petition): void {
  const def = PETITION_BY_ID.get(p.defId);
  if (def) applyEffects(world, p, def.expire);
  remove(world, p);
  (world.metrics.audiences ??= { asked: 0, answered: 0, expired: 0 }).expired++;
  log(world, `${textOf(world, p).quem} esperou e o prefeito não ouviu.`);
}

const remove = (world: World, p: Petition): void => {
  const open = world.town.petitions ?? [];
  const i = open.findIndex((x) => x.id === p.id);
  if (i >= 0) open.splice(i, 1);
};

function log(world: World, text: string): void {
  const list = (world.town.petitionLog ??= []);
  list.unshift({ day: dayOf(world.tick), text });
  if (list.length > 8) list.length = 8;
}

// ── Responder ───────────────────────────────────────────────────────────

/** Por que a resposta não dá agora (null = dá). */
export function choiceBlocker(world: World, choice: PetitionChoiceDef): string | null {
  if ((choice.energy ?? 0) > world.town.mayorEnergy) return 'Falta energia ao prefeito hoje.';
  const gold = choiceGold(world, choice);
  if (gold > world.town.treasury) return `Faltam ${Math.ceil(gold - world.town.treasury)} de ouro.`;
  return null;
}

export function answerPetition(world: World, petitionId: number, choiceId: string): AudienceResult {
  const p = (world.town.petitions ?? []).find((x) => x.id === petitionId);
  if (!p) return { ok: false, reason: 'Essa petição já não está na mesa.' };
  const def = PETITION_BY_ID.get(p.defId);
  const choice = def?.choices.find((c) => c.id === choiceId);
  if (!def || !choice) return { ok: false, reason: 'Resposta inválida.' };
  if (!personOf(world, p.asker)) {
    remove(world, p);
    return { ok: false, reason: 'Quem pediu já não está na vila.' };
  }
  const blocked = choiceBlocker(world, choice);
  if (blocked) return { ok: false, reason: blocked };
  world.town.mayorEnergy -= choice.energy ?? 0;
  const gold = choiceGold(world, choice);
  if (gold > 0) spend(world, 'audiencia', gold);
  const t = textOf(world, p);
  applyEffects(world, p, choice.effects);
  remove(world, p);
  (world.metrics.audiences ??= { asked: 0, answered: 0, expired: 0 }).answered++;
  log(world, `${t.quem}: ${choice.label(t)}.`);
  return { ok: true };
}

function applyEffects(world: World, p: Petition, effects: readonly PetitionEffect[]): void {
  const asker = personOf(world, p.asker);
  const other = personOf(world, p.other);
  const targets = (who: Who): Person[] => {
    if (who === 'quem') return asker ? [asker] : [];
    if (who === 'outro') return other ? [other] : [];
    if (who === 'moradores') return world.citizens.map((c) => ({ kind: 'morador', c }));
    return townHeroes(world).map((h) => ({ kind: 'heroi', h }));
  };
  const heroes = (who: Who): Hero[] => targets(who).flatMap((x) => (x.kind === 'heroi' && x.h.status !== 'dead' ? [x.h] : []));
  for (const e of effects) {
    switch (e[0]) {
      case 'humor':
        for (const x of targets(e[1])) {
          if (x.kind === 'morador') x.c.happiness = clamp(x.c.happiness + e[2]);
          else if (x.kind === 'heroi' && x.h.status !== 'dead') x.h.morale = clamp(x.h.morale + e[2]);
        }
        break;
      case 'lealdade':
        for (const h of heroes(e[1])) h.loyalty = clamp(h.loyalty + e[2]);
        break;
      case 'laco':
        if (asker?.kind === 'heroi' && other?.kind === 'heroi') addBond(world, asker.h, other.h, e[1]);
        break;
      case 'reputacao':
        world.town.reputation = clamp(world.town.reputation + e[1]);
        break;
      case 'ouro':
        earn(world, Math.round(e[1] * petitionDayTax(world)), 'audiencia');
        break;
      case 'luto':
        for (const h of heroes(e[1])) h.grief = Math.max(0, h.grief - e[2]);
        break;
      case 'traco':
        for (const h of heroes(e[1])) {
          const hidden = h.traits.find((t) => !t.revealed);
          if (hidden) revealTrait(world, h, hidden.id, `Numa conversa a pedido de um morador, ${h.name} se abriu.`);
        }
        break;
      case 'aprendiz': {
        const child = other?.kind === 'crianca' ? world.children.find((c) => c.id === other.id) : undefined;
        if (child) {
          child.apprentice = true;
          record(world, 'audiencia', child.parents, `${child.name} começou a treinar no campo, com a bênção do prefeito.`);
        }
        break;
      }
      case 'morador':
        world.town.population = Math.min(populationCap(world), world.town.population + e[1]);
        syncCitizenRoster(world);
        break;
      case 'partir':
        if (asker?.kind === 'morador') leaveCitizen(world, asker.c, 'com medo do abismo, depois de falar com o prefeito');
        break;
      case 'folga': {
        const guard = targets(e[1])[0];
        if (guard?.kind === 'morador' && guard.c.job === 'guarda') world.town.guardLeaveDay = dayOf(world.tick);
        break;
      }
      case 'desejo':
        if (asker?.kind === 'heroi') grantWish(world, asker.h, e[1], other?.kind === 'heroi' ? other.h.id : undefined);
        break;
    }
  }
}

// ── Para a tela ─────────────────────────────────────────────────────────

/** Os nomes que o texto da petição usa. */
export function textOf(world: World, p: Petition): PetitionText {
  const asker = personOf(world, p.asker);
  const other = personOf(world, p.other);
  return {
    quem: nameOf(asker) || 'Alguém',
    outro: nameOf(other),
    predio: p.building ? BUILDINGS[p.building].name : '',
    oficio: asker?.kind === 'morador' ? JOB_NAMES[asker.c.job][asker.c.gender] : '',
    g: (who, m, f) => (genderOf(who === 'quem' ? asker : other) === 'f' ? f : m),
  };
}

/** O que a resposta muda, em frases curtas ("Lia fica contente", "reputação +1"). */
export function effectSummary(world: World, p: Petition, effects: readonly PetitionEffect[]): string[] {
  const t = textOf(world, p);
  const who = (w: Who): string => (w === 'quem' ? t.quem : w === 'outro' ? t.outro : w === 'moradores' ? 'os moradores' : 'os heróis na vila');
  const plural = (w: Who) => w === 'moradores' || w === 'herois';
  const ofWho = (w: Who): string => (w === 'moradores' ? 'dos moradores' : w === 'herois' ? 'dos heróis na vila' : `de ${who(w)}`);
  const out: string[] = [];
  for (const e of effects) {
    switch (e[0]) {
      case 'humor': {
        const w = e[1];
        const upset = w === 'quem' || w === 'outro' ? t.g(w, 'chateado', 'chateada') : 'chateados';
        out.push(`${who(w)} ${plural(w) ? 'ficam' : 'fica'} ${e[2] > 0 ? (plural(w) ? 'contentes' : 'contente') : upset}`);
        break;
      }
      case 'lealdade':
        out.push(`${e[2] > 0 ? 'mais' : 'menos'} lealdade ${ofWho(e[1])}`);
        break;
      case 'laco':
        out.push(e[1] > 0 ? `${t.quem} e ${t.outro} se aproximam` : `${t.quem} e ${t.outro} se afastam`);
        break;
      case 'reputacao':
        out.push(`reputação ${e[1] > 0 ? '+' : '−'}${Math.abs(e[1])}`);
        break;
      case 'ouro':
        out.push(`+${Math.round(e[1] * petitionDayTax(world))} de ouro`);
        break;
      case 'luto':
        out.push(`alivia o luto ${ofWho(e[1])}`);
        break;
      case 'traco':
        out.push(`pode revelar quem ${t.outro} é`);
        break;
      case 'aprendiz':
        out.push(`${t.outro} chega aos 16 com um nível a mais`);
        break;
      case 'morador':
        out.push('a vila ganha um morador');
        break;
      case 'partir':
        out.push(`${t.quem} vai embora`);
        break;
      case 'folga':
        out.push('um guarda a menos esta noite');
        break;
      case 'desejo':
        out.push(`${t.quem} ganha um desejo`);
        break;
    }
  }
  return out;
}

/** O prefeito automático responde tudo pela resposta mais segura (para o balanceador). */
export function autoAnswer(world: World): void {
  for (const p of [...(world.town.petitions ?? [])]) {
    const def = PETITION_BY_ID.get(p.defId);
    const choice = def?.choices.find((c) => c.bot) ?? def?.choices[0];
    if (choice && !choiceBlocker(world, choice)) answerPetition(world, p.id, choice.id);
  }
}
