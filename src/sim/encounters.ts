// Encontros nas salas (M6 F3). O grupo acha algo (um sarcófago, um peregrino, um altar), manda
// um corvo à vila e espera o conselho do prefeito por um tempo. Com conselho, segue conforme a
// lealdade; sem ele, decide pelos traços: o Curioso arrisca, o Supersticioso e o Covarde passam
// longe. Os sorteios saem de um hash estável, fora do RNG do núcleo.

import { ENCOUNTERS, ENCOUNTER_BY_ID, type EncounterDef, type EncounterEffect, type EncounterOption } from '../data/encounters.ts';
import { floorLabel, record } from './chronicle.ts';
import { BALANCE as B } from './config.ts';
import { levelPower } from './dungeon.ts';
import { addTrait, hasTrait, heroStats, revealTrait } from './hero.ts';
import { commonItem, dropTier } from './items.ts';
import { stableRoll } from './rng.ts';
import type { Hero, Party, World } from './types.ts';

export type EncounterResult = { ok: true } | { ok: false; reason: string };

const metrics = (world: World) => (world.metrics.encounters ??= { met: 0, advised: 0, followed: 0 });

/** O encontro que o grupo achou: os do bioma pesam o dobro dos que aparecem em qualquer lugar. */
function pickEncounter(world: World, party: Party): EncounterDef {
  const pool = ENCOUNTERS.filter((e) => e.biome === null || e.biome === party.biome);
  const total = pool.reduce((s, e) => s + (e.biome === null ? 1 : 2), 0);
  let roll = stableRoll(world.seed, world.tick, 1000 + party.id) * total;
  for (const e of pool) {
    roll -= e.biome === null ? 1 : 2;
    if (roll < 0) return e;
  }
  return pool[pool.length - 1]!;
}

/** O grupo entrou numa sala de encontro: manda o corvo e espera. */
export function startEncounter(world: World, party: Party, heroes: Hero[]): void {
  const def = pickEncounter(world, party);
  party.encounter = { defId: def.id, untilTick: world.tick + B.encounterWaitTicks, advice: null };
  const room = party.rooms[party.roomIndex];
  if (room) room.encounter = def.id;
  metrics(world).met++;
  // A chegada do corvo é a chamada do abismo na tela; a crônica guarda o desfecho.
  party.moments.push(`${heroes[0]?.name ?? 'O grupo'} achou ${def.title.toLowerCase()} no ${floorLabel(party)} e mandou um corvo à vila.`);
}

/** O conselho do prefeito, que custa 1 de energia e chega antes de o grupo decidir. */
export function adviseEncounter(world: World, partyId: number, optionId: string): EncounterResult {
  const party = world.parties.find((p) => p.id === partyId);
  const e = party?.encounter;
  if (!party || !e) return { ok: false, reason: 'Esse grupo não está esperando conselho.' };
  if (e.advice) return { ok: false, reason: 'O corvo já voltou com o conselho.' };
  const def = ENCOUNTER_BY_ID.get(e.defId);
  if (!def?.options.some((o) => o.id === optionId)) return { ok: false, reason: 'Conselho inválido.' };
  if (world.town.mayorEnergy < B.encounterAdviceEnergy) return { ok: false, reason: 'O prefeito já está sem energia hoje. Amanhã tem mais.' };
  world.town.mayorEnergy -= B.encounterAdviceEnergy;
  e.advice = optionId;
  metrics(world).advised++;
  return { ok: true };
}

/** O grupo segue esperando? (o corvo ainda não voltou e o tempo não acabou) */
export const waitingAdvice = (world: World, party: Party): boolean => !!party.encounter && !party.encounter.advice && world.tick < party.encounter.untilTick;

/** Quem age pelo grupo: o Curioso, se houver; senão, o primeiro. */
const actor = (heroes: Hero[]): Hero | undefined => heroes.find((h) => hasTrait(h, 'curioso')) ?? heroes[0];

/** O grupo decide: o conselho (conforme a lealdade) ou os traços. */
function choose(world: World, party: Party, heroes: Hero[], def: EncounterDef): EncounterOption {
  const byKind = (kind: EncounterOption['kind']) => def.options.find((o) => o.kind === kind) ?? def.options[0]!;
  const advice = party.encounter?.advice ? def.options.find((o) => o.id === party.encounter!.advice) : undefined;
  if (advice) {
    const loyalty = heroes.reduce((s, h) => s + h.loyalty, 0) / Math.max(1, heroes.length);
    if (stableRoll(world.seed, world.tick, 1100 + party.id) < B.encounterFollowBase + loyalty / 150) {
      metrics(world).followed++;
      return advice;
    }
  }
  if (heroes.some((h) => hasTrait(h, 'curioso'))) return byKind('ousada');
  if (heroes.some((h) => hasTrait(h, 'supersticioso') || hasTrait(h, 'covarde'))) return byKind('prudente');
  return stableRoll(world.seed, world.tick, 1200 + party.id) < 0.5 ? byKind('ousada') : byKind('prudente');
}

/** Resolve o encontro: escolhe, sorteia o desfecho e aplica. */
export function resolveEncounter(world: World, party: Party, heroes: Hero[]): void {
  const def = party.encounter ? ENCOUNTER_BY_ID.get(party.encounter.defId) : undefined;
  if (!def) {
    party.encounter = null;
    return;
  }
  const option = choose(world, party, heroes, def);
  const total = option.outcomes.reduce((s, o) => s + o.weight, 0);
  let roll = stableRoll(world.seed, world.tick, 1300 + party.id) * total;
  const outcome = option.outcomes.find((o) => (roll -= o.weight) < 0) ?? option.outcomes[option.outcomes.length - 1]!;
  const who = actor(heroes);
  for (const e of outcome.effects) apply(world, party, heroes, who, e);
  const advised = party.encounter?.advice;
  const heeded = advised === option.id ? ' (seguiram o conselho do prefeito)' : advised ? ' (não seguiram o conselho do prefeito)' : '';
  const text = `${def.title}: ${option.label.toLowerCase()}${heeded}. ${outcome.text(who?.name ?? 'O grupo')}`;
  party.moments.push(text);
  record(world, 'encontro', party.memberIds, text);
  party.encounter = null;
}

function apply(world: World, party: Party, heroes: Hero[], who: Hero | undefined, e: EncounterEffect): void {
  switch (e[0]) {
    case 'bencao': {
      const boons = (party.boons ??= { atk: 1, def: 1 });
      boons[e[1]] *= 1 + e[2];
      break;
    }
    case 'vida':
      for (const h of heroes) {
        const max = heroStats(world, h).maxHp;
        h.hp = Math.max(1, Math.min(max, h.hp + max * e[1]));
      }
      break;
    case 'animo':
      for (const h of heroes) h.morale = Math.max(0, Math.min(100, h.morale + e[1]));
      break;
    case 'resgate':
      party.rescued++;
      break;
    case 'traco': {
      const hidden = who?.traits.find((t) => !t.revealed);
      if (who && hidden) revealTrait(world, who, hidden.id, `Num encontro no abismo, ${who.name} se mostrou.`);
      break;
    }
    case 'adquire':
      if (who) addTrait(world, who, e[1], `Depois de um encontro no ${floorLabel(party)},`);
      break;
    case 'peca': {
      const slot = stableRoll(world.seed, world.tick, 1400 + party.id) < 0.5 ? 'weapon' : 'armor';
      (party.loot.items ??= []).push(commonItem(world, slot, dropTier(world, party, slot), `achado num encontro no ${floorLabel(party)}`));
      break;
    }
    case 'ouro':
      // O ouro de um baú comum do andar (a mesma conta da sala de baú).
      party.loot.gold += B.goldPerEnemy * Math.pow(levelPower(party.level), 0.9) * (1 + 0.2 * party.floor) * 6;
      break;
  }
}

/** O encontro de agora, para a tela. */
export const encounterOf = (party: Party): EncounterDef | undefined => (party.encounter ? ENCOUNTER_BY_ID.get(party.encounter.defId) : undefined);
