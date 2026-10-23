// Nêmesis (M6 F2). O monstro comum que mata um herói e sai vivo da luta (o grupo foge, recua
// ou cai, ou ele mesmo some na névoa) pode ganhar nome e voltar em outras passagens, mais forte
// a cada herói que leva. É um encontro a mais numa sala de luta, nunca uma sala a mais, e o ouro
// dele é o de um monstro comum. Os sorteios dela saem de um hash estável, fora do RNG do núcleo.

import { BIOMES } from '../data/biomes.ts';
import { NEMESIS_NAMES } from '../data/nemesis.ts';
import { dayOf } from './calendar.ts';
import { floorLabel, listNames, record } from './chronicle.ts';
import { BALANCE as B } from './config.ts';
import { makeEnemy, openPassages, passageOf, spotOf } from './dungeon.ts';
import { getBond } from './hero.ts';
import { stableRoll } from './rng.ts';
import type { CombatResult } from './combat.ts';
import type { Combat, EnemyUnitDef, Hero, Nemesis, Party, Passage, Room, Spot, Unit, World } from './types.ts';

const ENEMY_DEFS = new Map<string, EnemyUnitDef>(BIOMES.flatMap((b) => b.enemies.map((e) => [e.id, e] as [string, EnemyUnitDef])));

const metrics = (world: World) => (world.metrics.nemeses ??= { born: 0, met: 0, kills: 0, fallen: 0 });

export const livingNemeses = (world: World): Nemesis[] => (world.abyss.nemeses ?? []).filter((n) => !n.fallen);

export const nemesisById = (world: World, id: number): Nemesis | undefined => (world.abyss.nemeses ?? []).find((n) => n.id === id);

/** Degrau da nêmesis: um por herói que ela levou, até o teto. */
export const nemesisStep = (n: Nemesis): number => Math.min(B.nemesisMaxStep, n.victims.length);

/** Quem ela levou, pelo nome ("Bram e Lia"). */
export function victimNames(world: World, n: Nemesis): string {
  const heroes = n.victims.map((id) => world.heroes.find((h) => h.id === id)).filter((h): h is Hero => !!h);
  return listNames(heroes);
}

/** Onde ela foi vista por último, para a tela ("andar 2 das Catacumbas"). */
export function nemesisWhere(world: World, n: Nemesis): string | null {
  const passage = n.passageId === null ? undefined : passageOf(world, n.passageId);
  return passage ? floorLabel(spotOf(passage, n.floor)) : null;
}

/** Só monstro comum vira nêmesis: nada de Senhor, guardião, eco nem morto levantado. */
const common = (u: Unit): boolean =>
  u.side === 'enemy' && !!u.defId && ENEMY_DEFS.has(u.defId) && !u.tags.some((t) => t === 'boss' || t === 'guardian' || t === 'risen') && !u.name.startsWith('Eco de');

// ── Na luta ─────────────────────────────────────────────────────────────

/** A nêmesis que mora neste andar e ainda não apareceu para este grupo nesta descida. */
export function nemesisFor(world: World, party: Party): Nemesis | undefined {
  if (party.lord) return undefined;
  return livingNemeses(world).find((n) => n.passageId === party.passageId && n.floor === party.floor && !(party.nemesisMet ?? []).includes(n.id));
}

/** Põe a nêmesis do andar numa sala de luta comum, no lugar de um monstro do bando. */
export function bringNemesis(world: World, party: Party, combat: Combat, room: Room): void {
  if (room.kind !== 'matilha' && room.kind !== 'elite') return;
  const n = nemesisFor(world, party);
  const def = n && ENEMY_DEFS.get(n.enemyId);
  if (!n || !def) return;
  const unit = makeEnemy(world, combat, def, party, { nameOverride: n.name });
  const mult = 1 + B.nemesisStepBonus * nemesisStep(n);
  unit.maxHp *= B.nemesisHp * mult;
  unit.hp = unit.maxHp;
  unit.atk *= B.nemesisAtk * mult;
  unit.tags = [...unit.tags, 'nemesis'];
  unit.nemesisId = n.id;
  const at = combat.units.findIndex((u) => u.side === 'enemy' && !u.elite);
  if (at >= 0) {
    unit.uid = combat.units[at]!.uid;
    combat.units[at] = unit;
  } else combat.units.push(unit);
  (party.nemesisMet ??= []).push(n.id);
  n.seenDay = dayOf(world.tick);
  metrics(world).met++;
  // O encontro fica nos momentos da expedição; o aviso na tela é a chamada do abismo (M6 F3).
  party.moments.push(`${n.name}, ${n.enemyName.toLowerCase()} que levou ${victimNames(world, n)}, apareceu no ${floorLabel(party)}.`);
}

/** Abaixo de um quarto da vida, o monstro que matou alguém nesta luta pode sumir na névoa. */
export function maybeFlee(world: World, party: Party, u: Unit): boolean {
  if (u.fleeTried || !u.alive || !u.kills?.length || !common(u)) return false;
  if (u.hp >= u.maxHp * B.nemesisFleeBelow) return false;
  u.fleeTried = true;
  if (stableRoll(world.seed, world.tick, 700 + u.uid) >= B.nemesisFleeChance) return false;
  u.alive = false;
  u.fled = true;
  party.moments.push(`${u.name} fugiu para a névoa, sangrando.`);
  return true;
}

/** A nêmesis caiu: feito para quem deu o golpe, alívio para quem chorava as vítimas. */
export function nemesisFalls(world: World, party: Party, unit: Unit, slayer: Hero | undefined): void {
  const n = unit.nemesisId === undefined ? undefined : nemesisById(world, unit.nemesisId);
  if (!n || n.fallen) return;
  n.fallen = { day: dayOf(world.tick), by: slayer?.id ?? null };
  n.passageId = null;
  metrics(world).fallen++;
  const victims = victimNames(world, n);
  if (slayer) slayer.deeds.push({ tick: world.tick, kind: 'nemesis', text: `vingou ${victims}, derrubando ${n.name}` });
  for (const id of party.memberIds) {
    const h = world.heroes.find((x) => x.id === id);
    if (!h || !n.victims.some((v) => related(world, h, v))) continue;
    h.morale = Math.min(100, h.morale + 15);
    h.grief = Math.max(0, h.grief - 20);
  }
  // Caçadas que ninguém pegou voltam ao tesouro (a de quem a derrubou se cumpre na volta).
  for (const contract of world.town.contracts.filter((x) => x.nemesisId === n.id && x.takenBy === null)) world.town.treasury += contract.reward;
  world.town.contracts = world.town.contracts.filter((x) => x.nemesisId !== n.id || x.takenBy !== null);
  const by = slayer ? `${slayer.name} derrubou` : 'Caiu';
  record(world, 'nemesis', slayer ? [slayer.id, ...n.victims] : n.victims, `${by} ${n.name}, que tinha levado ${victims}. A vila respira.`);
}

/**
 * Ao fim da luta: quem matou e saiu vivo pode virar nêmesis (até o teto de vivas); a nêmesis
 * que matou de novo sobe de degrau.
 */
export function nemesisAfterCombat(world: World, c: Combat, result: CombatResult): void {
  for (const u of c.units) {
    if (u.side !== 'enemy' || !u.kills?.length) continue;
    const n = u.nemesisId === undefined ? undefined : nemesisById(world, u.nemesisId);
    if (n) {
      if (n.fallen) continue;
      n.victims.push(...u.kills.filter((id) => !n.victims.includes(id)));
      metrics(world).kills += u.kills.length;
      continue;
    }
    const survived = u.fled || (u.alive && result !== 'vitoria');
    if (!survived || !common(u) || livingNemeses(world).length >= B.nemesisMax) continue;
    if (stableRoll(world.seed, world.tick, 600 + u.uid) >= B.nemesisBirthChance) continue;
    born(world, u);
  }
}

function born(world: World, u: Unit): void {
  const def = ENEMY_DEFS.get(u.defId!)!;
  const taken = new Set(livingNemeses(world).map((n) => n.name));
  const free = NEMESIS_NAMES.filter((name) => !taken.has(name));
  const seq = (world.abyss.nemesisSeq ?? 0) + 1;
  world.abyss.nemesisSeq = seq;
  const name = free[Math.floor(stableRoll(world.seed, seq, 650) * free.length)] ?? `${NEMESIS_NAMES[0]} ${seq}`;
  const nemesis: Nemesis = {
    id: seq,
    name,
    enemyId: def.id,
    enemyName: def.name,
    bornDay: dayOf(world.tick),
    victims: [...u.kills!],
    // Some na névoa: volta numa passagem que ainda vai abrir.
    passageId: null,
    floor: 0,
    seenDay: dayOf(world.tick),
    fallen: null,
  };
  (world.abyss.nemeses ??= []).push(nemesis);
  metrics(world).born++;
  metrics(world).kills += nemesis.victims.length;
  record(
    world,
    'nemesis',
    nemesis.victims,
    `Depois de levar ${victimNames(world, nemesis)}, a criatura escapou da luta (${def.name}). Na taverna, ela já tem nome: ${name}.`,
  );
}

// ── Fora da luta ────────────────────────────────────────────────────────

/** Passagem nova: uma nêmesis sem lugar pode se mudar para ela, num andar antes do guardião. */
export function nemesisMigrate(world: World, passage: Passage): void {
  if (livingNemeses(world).some((n) => n.passageId === passage.id)) return;
  for (const n of livingNemeses(world)) {
    if (n.passageId !== null) continue;
    if (stableRoll(world.seed, passage.id, 800 + n.id) >= B.nemesisMigrateChance) continue;
    n.passageId = passage.id;
    n.floor = Math.floor(stableRoll(world.seed, passage.id, 900 + n.id) * Math.max(1, passage.floors - 1));
    return;
  }
}

/** Todo dia: a nêmesis de uma passagem que fechou some na névoa até outra abrir. */
export function dailyNemeses(world: World): void {
  const open = new Set(openPassages(world).map((p) => p.id));
  for (const n of livingNemeses(world)) {
    if (n.passageId === null || open.has(n.passageId)) continue;
    n.passageId = null;
  }
}

/** Parentes e amigos de quem ela levou querem descer onde ela foi vista. */
function related(world: World, hero: Hero, victimId: number): boolean {
  if (hero.id === victimId) return false;
  const victim = world.heroes.find((h) => h.id === victimId);
  if (!victim) return false;
  return hero.partnerId === victimId || hero.parents.includes(victimId) || victim.parents.includes(hero.id) || getBond(world, hero.id, victimId) >= 40;
}

/** O lugar da nêmesis que alguém do grupo quer caçar (null = ninguém quer caçar nada). */
export function huntSpot(world: World, members: Hero[]): Pick<Spot, 'passageId' | 'floor'> | null {
  for (const n of livingNemeses(world)) {
    if (n.passageId === null) continue;
    if (members.some((h) => n.victims.some((v) => related(world, h, v)))) return { passageId: n.passageId, floor: n.floor };
  }
  return null;
}
