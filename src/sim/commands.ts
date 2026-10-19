// Alavancas do prefeito. Toda interação do jogador passa por aqui.

import { ACTS } from '../data/acts.ts';
import { BUILDINGS } from '../data/buildings.ts';
import { dayOf } from './calendar.ts';
import { record, floorLabel, heroLabel } from './chronicle.ts';
import { BALANCE as B, TICKS_PER_HOUR } from './config.ts';
import { canAfford, heroCapacity, hornCost, level, nextLevelCost, pay, recruitsPerHorn } from './economy.ts';
import { getBond } from './hero.ts';
import { activeHeroes } from './town.ts';
import { int } from './rng.ts';
import type { BuildingId, Doctrine, World } from './types.ts';

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
