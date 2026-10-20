// Alavancas do prefeito. Toda interação do jogador passa por aqui.

import { ACTS } from '../data/acts.ts';
import { BUILDINGS } from '../data/buildings.ts';
import { dayOf } from './calendar.ts';
import { record, floorLabel, heroLabel } from './chronicle.ts';
import { BALANCE as B, TICKS_PER_HOUR } from './config.ts';
import { canAfford, heroCapacity, hornCost, level, maxGearTier, nextLevelCost, pay, recruitsPerHorn } from './economy.ts';
import { getBond, hasTrait, revealTrait } from './hero.ts';
import { defaultRole, forgePrice, retireHero, ROLE_NAMES } from './people.ts';
import { activeHeroes, townHeroes } from './town.ts';
import { chance, int } from './rng.ts';
import type { BuildingId, Doctrine, GiftKind, Hero, RetiredRole, World } from './types.ts';

export type CommandResult = { ok: true } | { ok: false; reason: string };

const fail = (reason: string): CommandResult => ({ ok: false, reason });
const OK: CommandResult = { ok: true };

export function blowHorn(world: World): CommandResult {
  const town = world.town;
  const today = dayOf(world.tick);
  if (today < town.hornReadyDay) return fail('O berrante ainda ecoa: espere alguns dias.');
  const free = town.hornUses === 0;
  const cost = free ? 0 : hornCost(world);
  if (town.treasury < cost) return fail(`Faltam ${Math.ceil(cost - town.treasury)} de ouro.`);
  const room = heroCapacity(world) - activeHeroes(world).length - town.arrivals.length;
  if (room <= 0) return fail('Não há vagas: amplie a estalagem.');
  town.treasury -= cost;
  town.hornUses++;
  town.hornReadyDay = today + B.hornCooldownDays;
  const count = Math.min(room, recruitsPerHorn(world));
  for (let i = 0; i < count; i++) {
    town.arrivals.push({ at: world.tick + int(world.rng, 1, 6) * TICKS_PER_HOUR, free: false });
  }
  record(world, 'berrante', [], `O prefeito tocou o berrante. ${count} aventureiros responderam ao chamado.`);
  return OK;
}

export function build(world: World, id: BuildingId): CommandResult {
  const cost = nextLevelCost(world, id);
  if (!cost) return fail('Já está no nível máximo.');
  if (!canAfford(world, cost)) return fail('Recursos insuficientes.');
  pay(world, cost);
  world.town.buildings[id]++;
  const lvl = level(world, id);
  const { name, gender } = BUILDINGS[id];
  const article = gender === 'm' ? 'O' : 'A';
  const rebuilt = gender === 'm' ? 'reconstruído' : 'reconstruída';
  record(world, 'construcao', [], lvl === 1 ? `${article} ${name.toLowerCase()} foi ${rebuilt}.` : `${article} ${name.toLowerCase()} chegou ao nível ${lvl}.`);
  return OK;
}

export function postContract(world: World, act: number, floor: number, reward: number): CommandResult {
  if (level(world, 'guilda') < 1) return fail('Reconstrua a guilda para postar contratos.');
  if (!world.acts[act]?.unlocked) return fail('Esse ato ainda não foi aberto.');
  if (world.acts[act]!.conquered[floor]) return fail('Esse andar já foi conquistado.');
  if (world.town.contracts.length >= level(world, 'guilda')) return fail('O quadro está cheio.');
  if (world.town.treasury < reward) return fail('O tesouro não cobre a recompensa.');
  world.town.treasury -= reward;
  world.town.contracts.push({ id: world.nextId++, act, floor, reward, postedTick: world.tick, takenBy: null });
  record(world, 'contrato', [], `Novo contrato no quadro: conquistar o ${floorLabel(act, floor)} por ${reward} de ouro.`);
  return OK;
}

export function cancelContract(world: World, id: number): CommandResult {
  const contract = world.town.contracts.find((c) => c.id === id);
  if (!contract) return fail('Contrato não encontrado.');
  if (contract.takenBy !== null) return fail('Um grupo já está atrás desse contrato.');
  world.town.contracts = world.town.contracts.filter((c) => c.id !== id);
  world.town.treasury += contract.reward;
  return OK;
}

export function recall(world: World, partyId: number): CommandResult {
  const party = world.parties.find((p) => p.id === partyId);
  if (!party) return fail('Grupo não encontrado.');
  if (party.phase === 'voltando') return fail('O grupo já está voltando.');
  if (party.recallRequested) return fail('O sino já tocou.');
  party.recallRequested = true;
  world.town.reputation = Math.max(0, world.town.reputation - 1);
  return OK;
}

export function setDoctrine(world: World, doctrine: Doctrine): CommandResult {
  if (level(world, 'guilda') < 1) return fail('Reconstrua a guilda para definir a doutrina.');
  world.town.doctrine = doctrine;
  return OK;
}

export function setLootTax(world: World, rate: number): CommandResult {
  if (rate < 0 || rate > 0.5) return fail('O imposto vai de 0% a 50%.');
  world.town.lootTax = rate;
  return OK;
}

export function sponsor(world: World, heroId: number, amount: number): CommandResult {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero || (hero.status !== 'town' && hero.status !== 'expedition')) return fail('Herói indisponível.');
  if (world.town.treasury < amount) return fail('Ouro insuficiente.');
  world.town.treasury -= amount;
  hero.gold += amount;
  hero.loyalty = Math.min(100, hero.loyalty + Math.min(20, amount / 5));
  record(world, 'contrato', [hero.id], `O prefeito patrocinou ${heroLabel(hero)} com ${amount} de ouro.`);
  return OK;
}

/** Dispensa um herói da vila. Os amigos dele não gostam. */
export function dismiss(world: World, heroId: number): CommandResult {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero || hero.status !== 'town') return fail('Só dá para dispensar quem está na vila.');
  hero.status = 'left';
  hero.activity = null;
  hero.lfgSince = null;
  world.metrics.left++;
  for (const other of activeHeroes(world)) {
    const bond = getBond(world, hero.id, other.id);
    other.loyalty = Math.max(0, other.loyalty - (bond > 30 ? 6 : 1));
    if (bond > 30) other.morale = Math.max(0, other.morale - 10);
  }
  record(world, 'dispensa', [hero.id], `O prefeito dispensou ${heroLabel(hero)}, que deixou a vila depois de ${hero.stats.expeditions} expedições.`);
  return OK;
}

/** Recompensa sugerida para um contrato, proporcional ao perigo do andar. */
export const suggestedReward = (act: number, floor: number): number =>
  Math.round(30 * ACTS[act]!.power * (1 + 0.3 * floor));

// ── Prefeito e pessoas (M2) ─────────────────────────────────────────────

function heroInTown(world: World, heroId: number): Hero | string {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero) return 'Herói não encontrado.';
  if (hero.status !== 'town') return `${hero.name} não está na vila agora.`;
  return hero;
}

function spendEnergy(world: World, cost: number): string | null {
  if (world.town.mayorEnergy < cost) return 'O prefeito já está sem energia hoje. Amanhã tem mais.';
  world.town.mayorEnergy -= cost;
  return null;
}

/** Conversa com um herói: +lealdade e +ânimo; às vezes ele se abre e revela o traço oculto. */
export function talk(world: World, heroId: number): CommandResult {
  const hero = heroInTown(world, heroId);
  if (typeof hero === 'string') return fail(hero);
  const today = dayOf(world.tick);
  if (hero.lastTalkDay === today) return fail(`Já conversou com ${hero.name} hoje.`);
  const noEnergy = spendEnergy(world, 1);
  if (noEnergy) return fail(noEnergy);
  hero.lastTalkDay = today;
  const gain = B.talkLoyalty + (hasTrait(hero, 'leal') ? 3 : 0) - (hasTrait(hero, 'ganancioso') ? 3 : 0);
  hero.loyalty = Math.min(100, hero.loyalty + gain);
  hero.morale = Math.min(100, hero.morale + 5);
  const hidden = hero.traits.find((t) => !t.revealed);
  if (hidden && chance(world.rng, 0.25)) revealTrait(world, hero, hidden.id, `Conversando com o prefeito, ${hero.name} se abriu.`);
  return OK;
}

export const giftPrice = (world: World, heroId: number, kind: GiftKind): number => {
  if (kind !== 'arma') return B.giftPrice[kind];
  const hero = world.heroes.find((h) => h.id === heroId);
  return hero ? forgePrice(world, hero.gear.weapon + 1) : 0;
};

/** Presente pago pelo tesouro. Cada temperamento prefere uma coisa. */
export function gift(world: World, heroId: number, kind: GiftKind): CommandResult {
  const hero = heroInTown(world, heroId);
  if (typeof hero === 'string') return fail(hero);
  if (kind === 'arma' && hero.gear.weapon + 1 > maxGearTier(world)) return fail('O ferreiro ainda não forja uma arma melhor que a dele.');
  const price = giftPrice(world, heroId, kind);
  if (world.town.treasury < price) return fail(`Faltam ${Math.ceil(price - world.town.treasury)} de ouro.`);
  const noEnergy = spendEnergy(world, 1);
  if (noEnergy) return fail(noEnergy);
  world.town.treasury -= price;
  let what: string;
  switch (kind) {
    case 'bebida': {
      const fan = hasTrait(hero, 'beberrao');
      hero.needs.fun = Math.min(100, hero.needs.fun + 40);
      hero.morale = Math.min(100, hero.morale + (fan ? 25 : 10));
      hero.loyalty = Math.min(100, hero.loyalty + (fan ? 8 : 4));
      what = 'uma rodada na taverna';
      break;
    }
    case 'reliquia': {
      const fan = hasTrait(hero, 'devoto');
      hero.needs.faith = Math.min(100, hero.needs.faith + 50);
      hero.morale = Math.min(100, hero.morale + (fan ? 20 : 10));
      hero.loyalty = Math.min(100, hero.loyalty + (fan ? 12 : 6));
      hero.grief = Math.max(0, hero.grief - 20);
      what = 'uma relíquia do templo';
      break;
    }
    case 'arma': {
      hero.gear.weapon++;
      hero.loyalty = Math.min(100, hero.loyalty + (hasTrait(hero, 'ganancioso') ? 15 : 10));
      what = 'uma arma nova da forja';
      break;
    }
  }
  record(world, 'prefeito', [hero.id], `O prefeito presenteou ${hero.name} com ${what}.`);
  return OK;
}

/** Consola quem está de luto. */
export function comfort(world: World, heroId: number): CommandResult {
  const hero = heroInTown(world, heroId);
  if (typeof hero === 'string') return fail(hero);
  if (hero.grief <= 0) return fail(`${hero.name} não está de luto.`);
  const noEnergy = spendEnergy(world, 1);
  if (noEnergy) return fail(noEnergy);
  hero.grief = Math.max(0, hero.grief - B.consoleGrief);
  hero.morale = Math.min(100, hero.morale + 10);
  hero.loyalty = Math.min(100, hero.loyalty + 5);
  const lost = world.heroes.find((h) => h.id === hero.griefFor);
  record(world, 'prefeito', [hero.id], `O prefeito sentou com ${hero.name} para falar de ${lost?.name ?? 'quem se foi'}.`);
  if (hero.grief === 0) hero.griefFor = null;
  return OK;
}

/** Discurso na praça: ânimo e lealdade para todos que estão na vila. */
export function speech(world: World): CommandResult {
  const today = dayOf(world.tick);
  if (world.town.speechDay === today) return fail('O prefeito já discursou hoje.');
  const listeners = townHeroes(world);
  if (listeners.length === 0) return fail('Não há ninguém na vila para ouvir.');
  const noEnergy = spendEnergy(world, 2);
  if (noEnergy) return fail(noEnergy);
  world.town.speechDay = today;
  for (const h of listeners) {
    h.morale = Math.min(100, h.morale + B.speechMorale + (hasTrait(h, 'covarde') ? 6 : 0));
    h.loyalty = Math.min(100, h.loyalty + 3);
  }
  record(world, 'prefeito', listeners.map((h) => h.id), `O prefeito subiu num barril na praça e falou do abismo. ${listeners.length} heróis ouviram.`);
  return OK;
}

export function rename(world: World, heroId: number, name: string): CommandResult {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero) return fail('Herói não encontrado.');
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length < 2 || clean.length > 20) return fail('O nome precisa ter de 2 a 20 letras.');
  if (clean === hero.name) return OK;
  const before = hero.name;
  hero.name = clean;
  record(world, 'prefeito', [hero.id], `${before} agora atende por ${clean}.`);
  return OK;
}

/** Aposentadoria honrosa: o herói fica na vila com uma função (ao contrário de dispensar). */
export function retire(world: World, heroId: number, role?: RetiredRole): CommandResult {
  const hero = heroInTown(world, heroId);
  if (typeof hero === 'string') return fail(hero);
  retireHero(world, hero, 'com honras, por decisão do prefeito', role ?? defaultRole(hero, world));
  return OK;
}

export function assignRole(world: World, heroId: number, role: RetiredRole): CommandResult {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero || hero.status !== 'retired') return fail('Só aposentados têm função na vila.');
  if (hero.retiredRole === role) return OK;
  hero.retiredRole = role;
  const r = ROLE_NAMES[role];
  record(world, 'funcao', [hero.id], `${hero.name} agora é ${r[hero.gender]} ${r.where}.`);
  return OK;
}
