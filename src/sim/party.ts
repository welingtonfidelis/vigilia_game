// Formação autônoma de grupos e escolha do andar.

import { CLASSES } from '../data/classes.ts';
import { RANKS } from '../data/classes.ts';
import { record, floorLabel, listNames } from './chronicle.ts';
import { TICKS_PER_HOUR } from './config.ts';
import { abyssPressure, confidence, mysteryConfidence, openPassage, openPassages, passageCapacity, passageOf, spotOf, travelTicks } from './dungeon.ts';
import { maxParties, maxPartySize } from './economy.ts';
import { getBond, hasTrait, traitSum } from './hero.ts';
import { townHeroes } from './town.ts';
import { buyProvisions } from './patronage.ts';
import type { Hero, Party, Spot, World } from './types.ts';

export const busyParties = (world: World): Party[] => world.parties.filter((p) => p.phase !== 'voltando');

const role = (h: Hero) => CLASSES[h.classId].role;

function candidateScore(world: World, members: Hero[], c: Hero): number {
  let score = members.reduce((s, m) => s + getBond(world, m.id, c.id), 0) / members.length / 100;
  if (members.some((m) => getBond(world, m.id, c.id) <= -40)) score -= 1;
  const roles = members.map(role);
  const r = role(c);
  if (r === 'tank' && !roles.includes('tank')) score += 0.6;
  else if (r === 'healer' && !roles.includes('healer')) score += 0.7;
  else if (roles.includes(r)) score -= 0.2;
  const rankGap = Math.abs(RANKS.indexOf(c.rank) - RANKS.indexOf(members[0]!.rank));
  const avgLevel = members.reduce((s, m) => s + m.level, 0) / members.length;
  score -= 0.1 * rankGap + 0.06 * Math.abs(c.level - avgLevel);
  if (hasTrait(c, 'sociavel')) score += 0.1;
  return score;
}

/** Roda de hora em hora: heróis aguardando no quadro se juntam em grupos. */
export function formParties(world: World): void {
  let slots = maxParties(world) - busyParties(world).length;
  if (slots <= 0) return;
  let pool = townHeroes(world)
    .filter((h) => h.activity?.kind === 'aguardar' && h.lfgSince !== null)
    .sort((a, b) => a.lfgSince! - b.lfgSince! || a.id - b.id);
  const size = maxPartySize(world);
  while (slots > 0 && pool.length > 0) {
    const leader = pool[0]!;
    const waitedHours = (world.tick - leader.lfgSince!) / TICKS_PER_HOUR;
    // Quanto mais alguém espera no quadro, menos exigentes os outros ficam:
    // um novato acaba "adotado" por veteranos (e o grupo escolhe um andar mais leve por causa dele).
    const tolerance = -0.5 - 0.1 * waitedHours;
    const members = [leader];
    let rest = pool.slice(1);
    while (members.length < size && rest.length > 0) {
      let best: Hero | null = null;
      let bestScore = tolerance;
      for (const c of rest) {
        const s = candidateScore(world, members, c);
        if (s > bestScore) {
          bestScore = s;
          best = c;
        }
      }
      if (!best) break;
      members.push(best);
      rest = rest.filter((h) => h !== best);
    }
    const ready = members.length >= 3 || (members.length === 2 && waitedHours >= 12) || (members.length === 1 && waitedHours >= 36);
    if (!ready) {
      // Esse líder ainda não fecha grupo; os demais não precisam esperar por ele.
      pool = pool.slice(1);
      continue;
    }
    depart(world, members);
    slots--;
    pool = pool.filter((h) => !members.includes(h));
  }
}

export interface Target {
  /** Andar de uma passagem conhecida, ou null para abrir uma passagem nova. */
  spot: Spot | null;
  contractId: number | null;
  confidence: number;
}

/** Profundidade para comparar opções: nível, andar; a passagem nova fica logo acima do andar 1. */
const depthOf = (world: World, t: Target): number => (t.spot ? t.spot.level * 10 + t.spot.floor : world.abyss.level * 10 + 0.5);

export function chooseTarget(world: World, members: Hero[]): Target {
  const need = { cautelosa: 1.25, equilibrada: 1.0, agressiva: 0.8 }[world.town.doctrine] + members.reduce((s, h) => s + traitSum(h, 'daring'), 0);
  const taken = new Set(world.parties.filter((p) => p.persistent && p.phase !== 'voltando').map((p) => `${p.passageId}:${p.floor}`));
  const options: Target[] = [];
  for (const passage of openPassages(world)) {
    for (let f = 0; f < passage.floors; f++) {
      if (f > 0 && !passage.conquered[f - 1]) break;
      if (!passage.conquered[f] && taken.has(`${passage.id}:${f}`)) continue;
      const spot = spotOf(passage, f);
      options.push({ spot, contractId: null, confidence: confidence(world, members, spot, passage) });
    }
  }
  if (openPassages(world).length < passageCapacity(world)) {
    options.push({ spot: null, contractId: null, confidence: mysteryConfidence(world, members) });
  }
  if (options.length === 0) return { spot: null, contractId: null, confidence: mysteryConfidence(world, members) };
  for (const contract of world.town.contracts) {
    if (contract.takenBy !== null) continue;
    const opt = options.find((o) =>
      contract.passageId === null ? o.spot === null : o.spot?.passageId === contract.passageId && o.spot.floor === contract.floor,
    );
    if (opt && opt.confidence >= need - 0.25) return { ...opt, contractId: contract.id };
  }
  const bold = options.filter((o) => o.confidence >= need);
  // Uma passagem muito pressionada ameaça a vila: quem pode, desce nela para conter.
  if (abyssPressure(world) >= 60) {
    const pressure = (t: Target) => (t.spot ? (passageOf(world, t.spot.passageId)?.pressure ?? 0) : 0);
    const urgent = bold.filter((o) => pressure(o) >= 60);
    if (urgent.length > 0) return urgent.reduce((a, b) => (pressure(b) > pressure(a) || (pressure(b) === pressure(a) && depthOf(world, b) > depthOf(world, a)) ? b : a));
  }
  if (bold.length > 0) return bold.reduce((a, b) => (depthOf(world, b) > depthOf(world, a) ? b : a));
  return options.reduce((a, b) => (b.confidence > a.confidence ? b : a));
}

function depart(world: World, members: Hero[]): void {
  const target = chooseTarget(world, members);
  // Passagem nova: o mundo já existe na semente, mas só se revela quando o grupo entra.
  const opened = target.spot === null;
  const spot = target.spot ?? spotOf(openPassage(world), 0);
  const party: Party = {
    id: world.nextId++,
    memberIds: members.map((h) => h.id),
    startMemberIds: members.map((h) => h.id),
    ...spot,
    phase: 'descendo',
    phaseEndsAt: world.tick + travelTicks(spot),
    persistent: false,
    rooms: [],
    roomIndex: 0,
    retreating: false,
    combat: null,
    loot: { gold: 0, materials: {}, xp: 0 },
    contractId: target.contractId,
    opened,
    rescued: 0,
    dead: [],
    recallRequested: false,
    outcome: null,
    startedTick: world.tick,
    confidence: target.confidence,
    moments: [],
  };
  if (target.contractId !== null) {
    const contract = world.town.contracts.find((c) => c.id === target.contractId)!;
    contract.takenBy = party.id;
  }
  const veterans = members.filter((h) => hasTrait(h, 'veterano')).length;
  for (const h of members) {
    h.status = 'expedition';
    h.partyId = party.id;
    h.activity = null;
    h.lfgSince = null;
    h.vengeful = false;
    h.morale = Math.min(100, h.morale + 5 * veterans);
  }
  buyProvisions(world, party, members);
  world.parties.push(party);
  world.metrics.expeditions++;
  const why = target.contractId !== null ? ' atrás do contrato do prefeito' : '';
  const where = opened ? 'uma passagem que ninguém conhece' : `o ${floorLabel(spot)}`;
  record(world, 'partida', party.memberIds, `${listNames(members)} desceram rumo a ${where}${why}.`);
}
