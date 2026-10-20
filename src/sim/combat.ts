// Combate automático em tempo real (1 tick = 0,1 s). Determinístico pela semente.

import { ACTS } from '../data/acts.ts';
import { CLASSES } from '../data/classes.ts';
import { byWhom, record, floorLabel, g, heroLabel } from './chronicle.ts';
import { BALANCE as B, TICKS_PER_SECOND } from './config.ts';
import { makeEnemy, spawnRoom } from './dungeon.ts';
import { epitaph, maybeInjure, widow } from './people.ts';
import { addBond, fleeThreshold, getBond, hasTrait, heroStats, promote, revealTrait } from './hero.ts';
import { chance, int, pick, range, shuffle, weighted } from './rng.ts';
import type { Combat, Hero, Party, Room, Unit, World } from './types.ts';

export type CombatResult = 'andamento' | 'vitoria' | 'retirada' | 'massacre';

const heroOf = (world: World, unit: Unit): Hero | undefined =>
  unit.heroId === null ? undefined : world.heroes.find((h) => h.id === unit.heroId);

const activeHeroUnits = (c: Combat): Unit[] => c.units.filter((u) => u.side === 'hero' && u.alive && !u.fled);
const aliveEnemies = (c: Combat): Unit[] => c.units.filter((u) => u.side === 'enemy' && u.alive);

function heroUnit(world: World, combat: Combat, hero: Hero): Unit {
  const s = heroStats(world, hero);
  return {
    uid: combat.nextUid++,
    side: 'hero',
    heroId: hero.id,
    name: hero.name,
    maxHp: s.maxHp,
    hp: Math.min(hero.hp, s.maxHp),
    atk: s.atk,
    def: s.def,
    interval: s.interval,
    cd: int(world.rng, 1, s.interval),
    pierce: s.pierce,
    crit: s.crit,
    role: CLASSES[hero.classId].role,
    tags: [],
    affixes: [],
    elite: false,
    alive: true,
    fled: false,
    poisonTicks: 0,
    poisonDps: 0,
    xp: 0,
    gold: 0,
    material: null,
  };
}

export function startCombat(world: World, party: Party, room: Room): Combat {
  const combat: Combat = {
    units: [],
    ticks: 0,
    enraged: false,
    isBoss: room.kind === 'chefe',
    bossMech: room.kind === 'chefe' ? ACTS[party.act]!.boss.mech : null,
    mechCd: 60,
    echoesSpawned: false,
    nextUid: 1,
  };
  for (const id of party.memberIds) {
    const hero = world.heroes.find((h) => h.id === id);
    if (hero && hero.status === 'expedition') combat.units.push(heroUnit(world, combat, hero));
  }
  combat.units.push(...spawnRoom(world, combat, room, party.act, party.floor));
  return combat;
}

/** Devolve a vida do combate para os heróis (chamado ao fim do combate). */
export function syncHeroes(world: World, combat: Combat): void {
  for (const u of combat.units) {
    const hero = heroOf(world, u);
    if (hero && u.alive) hero.hp = Math.max(1, u.hp);
  }
}

// ── Laço principal ────────────────────────────────────────────────────────

export function combatTick(world: World, party: Party): CombatResult {
  const c = party.combat!;
  c.ticks++;
  const enrageAt = c.isBoss ? B.bossEnrageTicks : B.enrageTicks;
  if (!c.enraged && c.ticks >= enrageAt) {
    c.enraged = true;
    party.moments.push('O combate se arrastou e os inimigos entraram em fúria.');
  }
  if (c.bossMech) bossMechanics(world, party, c);

  for (const u of c.units) {
    if (!u.alive || u.poisonTicks <= 0) continue;
    u.poisonTicks--;
    u.hp -= u.poisonDps / TICKS_PER_SECOND;
    if (u.hp <= 0) kill(world, party, c, u, null, 'veneno');
  }

  for (const u of c.units) {
    if (!u.alive || u.fled) continue;
    if (--u.cd > 0) continue;
    u.cd = u.interval;
    if (u.side === 'hero') heroAct(world, party, c, u);
    else enemyAct(world, party, c, u);
  }

  if (c.enraged && c.ticks % TICKS_PER_SECOND === 0) {
    for (const u of activeHeroUnits(c)) {
      const hero = heroOf(world, u)!;
      hero.morale = Math.max(0, hero.morale - 0.5);
    }
  }

  checkFlee(world, party, c);

  if (aliveEnemies(c).length === 0) return 'vitoria';
  if (activeHeroUnits(c).length === 0) {
    const survivors = c.units.some((u) => u.side === 'hero' && u.alive && party.memberIds.includes(u.heroId!));
    return survivors ? 'retirada' : 'massacre';
  }
  if (!party.retreating) {
    const hardCap = c.ticks >= B.hardCapTicks;
    if (hardCap) world.metrics.stalemates++;
    if (party.recallRequested || hardCap || shouldRetreat(world, party, c)) beginRetreat(world, party, c);
  }
  return 'andamento';
}

// ── Ações ─────────────────────────────────────────────────────────────────

function heroAct(world: World, party: Party, c: Combat, u: Unit): void {
  const hero = heroOf(world, u)!;
  const enemies = aliveEnemies(c);
  if (enemies.length === 0) return;
  let atk = u.atk * (hero.vengeful ? 1.35 : 1);

  switch (u.role) {
    case 'healer': {
      const allies = activeHeroUnits(c);
      const hurt = allies.filter((a) => a.hp / a.maxHp < B.healThreshold || a.poisonTicks > 0);
      if (hurt.length > 0) {
        const beloved = hurt.find((a) => a.heroId !== null && a.hp / a.maxHp < 0.6 && getBond(world, hero.id, a.heroId) > 50);
        const target = beloved ?? hurt.reduce((lo, a) => (a.hp / a.maxHp < lo.hp / lo.maxHp ? a : lo));
        const heal = atk * B.healMult * (c.enraged ? B.enrageHealMult : 1);
        target.hp = Math.min(target.maxHp, target.hp + heal);
        target.poisonTicks = 0;
        return;
      }
      atk *= 0.6;
      strike(world, party, c, u, pick(world.rng, enemies), atk);
      return;
    }
    case 'aoe': {
      const targets = shuffle(world.rng, [...enemies]).slice(0, 4);
      for (const t of targets) strike(world, party, c, u, t, atk * 0.65);
      return;
    }
    case 'bruiser': {
      const [first, second] = shuffle(world.rng, [...enemies]);
      strike(world, party, c, u, first!, atk);
      if (second && second.alive) strike(world, party, c, u, second, atk * 0.5);
      return;
    }
    case 'ranged': {
      const priority =
        enemies.find((e) => e.tags.includes('boss')) ??
        enemies.find((e) => e.elite) ??
        enemies.reduce((lo, e) => (e.hp < lo.hp ? e : lo));
      strike(world, party, c, u, priority, atk);
      return;
    }
    case 'melee':
      atk *= 1 + 0.8 * (1 - u.hp / u.maxHp);
      strike(world, party, c, u, pick(world.rng, enemies), atk);
      return;
    default:
      strike(world, party, c, u, pick(world.rng, enemies), atk);
  }
}

function enemyAct(world: World, party: Party, c: Combat, u: Unit): void {
  const heroes = activeHeroUnits(c);
  if (heroes.length === 0) return;
  const tank = heroes.find((h) => h.role === 'tank');
  const backline = u.tags.includes('backline') || (u.tags.includes('boss') && c.bossMech === 'retaguarda');
  let target: Unit;
  if (tank && chance(world.rng, backline ? 0.25 : B.tauntChance)) {
    target = tank;
  } else {
    // Quem está quase morto recua para trás da linha e fica menos exposto.
    target = weighted(
      world.rng,
      heroes.map((h) => {
        const rear = h.role === 'healer' || h.role === 'ranged' || h.role === 'aoe';
        const w = backline === rear ? 3 : 1;
        return [h, h.hp / h.maxHp < 0.25 ? w * 0.35 : w] as const;
      }),
    );
  }
  let atk = u.atk;
  if (c.enraged) {
    const enrageAt = c.isBoss ? B.bossEnrageTicks : B.enrageTicks;
    atk *= 1 + (B.enrageDamagePerSecond * (c.ticks - enrageAt)) / TICKS_PER_SECOND;
  }
  const dealt = strike(world, party, c, u, target, atk);
  if (u.affixes.includes('vampirico')) u.hp = Math.min(u.maxHp, u.hp + dealt * 0.3);
}

function strike(world: World, party: Party, c: Combat, attacker: Unit, target: Unit, base: number): number {
  if (!target.alive) return 0;
  const crit = chance(world.rng, attacker.crit) ? B.critMult : 1;
  const dmg = (base * range(world.rng, 0.85, 1.15) * crit * 100) / (100 + target.def * (1 - attacker.pierce));
  target.hp -= dmg;
  if (target.side === 'hero') {
    const hero = heroOf(world, target)!;
    if (target.hp / target.maxHp < 0.3) hero.morale = Math.max(0, hero.morale - (hasTrait(hero, 'bravo') ? 3 : 6));
  }
  if (target.hp <= 0) kill(world, party, c, target, attacker, attacker.name);
  return dmg;
}

// ── Mortes ────────────────────────────────────────────────────────────────

function kill(world: World, party: Party, c: Combat, unit: Unit, killer: Unit | null, by: string): void {
  if (!unit.alive) return;
  unit.alive = false;
  unit.hp = 0;
  if (unit.side === 'enemy') {
    party.loot.gold += unit.gold;
    party.loot.xp += unit.xp;
    if (unit.material) {
      const qty = unit.tags.includes('boss') ? 6 : 1;
      party.loot.materials[unit.material] = (party.loot.materials[unit.material] ?? 0) + qty;
    }
    const slayer = killer ? heroOf(world, killer) : undefined;
    if (slayer) {
      slayer.stats.kills++;
      if (slayer.stats.kills === 100) {
        slayer.deeds.push({ tick: world.tick, kind: 'matador', text: '100 inimigos abatidos' });
        if (chance(world.rng, 0.3)) promote(world, slayer, 'depois de abater o centésimo inimigo');
      }
    }
    for (const h of activeHeroUnits(c)) {
      const hero = heroOf(world, h)!;
      hero.morale = Math.min(100, hero.morale + (unit.tags.includes('boss') ? 30 : 2));
    }
    if (unit.tags.includes('boss') && slayer) {
      slayer.stats.bossKills++;
      const text = `deu o golpe final n${unit.name.startsWith('A ') ? 'a' : 'o'} ${unit.name.replace(/^(O|A) /, '')}`;
      slayer.deeds.push({ tick: world.tick, kind: 'chefe', text });
      party.moments.push(`${slayer.name} ${text}.`);
      if (chance(world.rng, 0.5)) promote(world, slayer, `depois de ${text.replace('deu', 'dar')}`);
    }
    if (unit.affixes.includes('explosivo')) {
      for (const h of activeHeroUnits(c)) {
        h.hp -= unit.maxHp * 0.08;
        if (h.hp <= 0) kill(world, party, c, h, unit, `a explosão de ${unit.name}`);
      }
    }
    return;
  }

  const hero = heroOf(world, unit)!;
  heroDies(world, party, hero, by);
  for (const ally of activeHeroUnits(c)) {
    const other = heroOf(world, ally)!;
    other.stats.alliesLost++;
    const bond = getBond(world, hero.id, other.id);
    if (hasTrait(other, 'vingativo') && !other.vengeful && bond >= 20) {
      other.vengeful = true;
      other.morale = Math.min(100, other.morale + 25);
      party.moments.push(`${other.name} jurou vingança por ${hero.name}.`);
      record(world, 'vinganca', [other.id, hero.id], `Ao ver ${hero.name} cair, ${other.name} entrou em fúria vingativa.`);
      revealTrait(world, other, 'vingativo', `${other.name} não recuou nem um passo depois que ${hero.name} caiu.`);
    } else {
      other.morale = Math.max(0, other.morale - (bond > 50 ? 25 : bond >= 10 ? 15 : 8));
    }
  }
}

export function heroDies(world: World, party: Party, hero: Hero, by: string): void {
  hero.status = 'dead';
  hero.hp = 0;
  hero.activity = null;
  hero.death = { tick: world.tick, where: floorLabel(party.act, party.floor), by };
  party.memberIds = party.memberIds.filter((id) => id !== hero.id);
  party.dead.push(hero.id);
  world.metrics.deaths++;
  world.remains.push({ heroId: hero.id, act: party.act, floor: party.floor, gold: hero.gold });
  hero.gold = 0;
  hero.injury = null;
  hero.epitaph = epitaph(world, hero);
  widow(world, hero);
  party.moments.push(`${hero.name} tombou (${by}).`);
  record(
    world,
    'morte',
    [hero.id],
    `${heroLabel(hero)} tombou no ${floorLabel(party.act, party.floor)}, ${g(hero, 'abatido', 'abatida')} ${byWhom(by)}. ${
      hero.stats.expeditions === 0
        ? 'Era sua primeira descida.'
        : `Tinha ${hero.stats.expeditions} ${hero.stats.expeditions === 1 ? 'expedição' : 'expedições'} nas costas.`
    }`,
  );
}

// ── Fuga individual e retirada do grupo ───────────────────────────────────

function checkFlee(world: World, party: Party, c: Combat): void {
  for (const u of activeHeroUnits(c)) {
    const hero = heroOf(world, u)!;
    if (hero.morale >= fleeThreshold(hero, world.town.doctrine)) continue;
    if (activeHeroUnits(c).length === 1 && party.startMemberIds.length === 1) continue;
    partingStrikes(world, party, c, [u]);
    if (!u.alive) continue;
    u.fled = true;
    hero.stats.fled++;
    world.metrics.fled++;
    party.memberIds = party.memberIds.filter((id) => id !== hero.id);
    hero.hp = Math.max(1, u.hp);
    maybeInjure(world, hero, u.hp / u.maxHp, `do ${floorLabel(party.act, party.floor)}`);
    for (const id of party.memberIds) {
      const mate = world.heroes.find((h) => h.id === id);
      if (mate) addBond(world, hero, mate, -8);
    }
    party.moments.push(`${hero.name} perdeu a coragem e fugiu.`);
    record(world, 'fuga', [hero.id], `${heroLabel(hero)} perdeu a coragem e fugiu do ${floorLabel(party.act, party.floor)}.`);
    revealTrait(world, hero, 'covarde', `${hero.name} foi ${g(hero, 'o primeiro', 'a primeira')} a correr.`);
    world.pendingFugitives.push({ heroId: hero.id, act: party.act, floor: party.floor });
  }
}

function shouldRetreat(world: World, party: Party, c: Combat): boolean {
  const heroes = activeHeroUnits(c);
  if (party.startMemberIds.length >= 3 && heroes.length <= 1 && aliveEnemies(c).length > 1) return true;
  const avgHp = heroes.reduce((s, u) => s + u.hp / u.maxHp, 0) / heroes.length;
  const threshold = B.retreatHp[world.town.doctrine];
  return avgHp < threshold;
}

function beginRetreat(world: World, party: Party, c: Combat): void {
  party.retreating = true;
  const leaving: Unit[] = [];
  for (const u of activeHeroUnits(c)) {
    const hero = heroOf(world, u)!;
    if (hero.vengeful) {
      party.moments.push(`${hero.name} se recusou a recuar.`);
      continue;
    }
    leaving.push(u);
  }
  partingStrikes(world, party, c, leaving);
  for (const u of leaving) if (u.alive) u.fled = true;
  party.moments.push(party.recallRequested ? 'O sino da vila tocou e o grupo recuou.' : 'O grupo bateu em retirada.');
}

function partingStrikes(world: World, party: Party, c: Combat, leaving: Unit[]): void {
  if (leaving.length === 0) return;
  for (const e of aliveEnemies(c)) {
    if (!chance(world.rng, B.partingStrikeChance)) continue;
    const target = pick(world.rng, leaving.filter((u) => u.alive));
    if (target) strike(world, party, c, e, target, e.atk);
    if (!leaving.some((u) => u.alive)) return;
  }
}

// ── Mecânicas de chefe ────────────────────────────────────────────────────

function bossMechanics(world: World, party: Party, c: Combat): void {
  const boss = c.units.find((u) => u.tags.includes('boss'));
  if (!boss || !boss.alive) return;
  const actDef = ACTS[party.act]!;
  if (c.bossMech === 'ecos' && !c.echoesSpawned && (c.ticks === 1 || boss.hp < boss.maxHp / 2)) {
    if (boss.hp < boss.maxHp / 2) c.echoesSpawned = true;
    spawnEchoes(world, party, c);
  }
  if (--c.mechCd > 0) return;
  switch (c.bossMech) {
    case 'invocar': {
      c.mechCd = 80;
      if (aliveEnemies(c).length < 7) {
        for (let i = 0; i < 2; i++) c.units.push(makeEnemy(world, c, actDef.enemies[0]!, party.act, party.floor));
      }
      break;
    }
    case 'veneno': {
      c.mechCd = 50;
      for (const h of activeHeroUnits(c)) {
        h.poisonTicks = 8 * TICKS_PER_SECOND;
        h.poisonDps = h.maxHp * 0.02;
      }
      break;
    }
    case 'maldicao': {
      c.mechCd = 60;
      const cleric = activeHeroUnits(c).some((u) => u.role === 'healer');
      for (const u of activeHeroUnits(c)) {
        const hero = heroOf(world, u)!;
        if (hasTrait(hero, 'devoto')) continue;
        hero.morale = Math.max(0, hero.morale - (cleric ? 4 : 8));
      }
      break;
    }
    case 'retaguarda': {
      c.mechCd = 100;
      for (const h of activeHeroUnits(c)) strike(world, party, c, boss, h, boss.atk * 0.5);
      break;
    }
    default:
      c.mechCd = 9999;
  }
}

function spawnEchoes(world: World, party: Party, c: Combat): void {
  const fallen = world.heroes
    .filter((h) => h.status === 'dead')
    .sort((a, b) => b.level - a.level || a.id - b.id)
    .slice(0, 6);
  const actDef = ACTS[party.act]!;
  for (let i = 0; i < 2; i++) {
    if (fallen.length === 0) {
      c.units.push(makeEnemy(world, c, actDef.enemies[0]!, party.act, party.floor));
      continue;
    }
    const lost = fallen.splice(int(world.rng, 0, fallen.length - 1), 1)[0]!;
    const s = heroStats(world, lost);
    const power = 1.2;
    c.units.push({
      ...makeEnemy(world, c, actDef.enemies[0]!, party.act, party.floor, { nameOverride: `Eco de ${lost.name}` }),
      maxHp: s.maxHp * power * 2,
      hp: s.maxHp * power * 2,
      atk: s.atk * power,
      def: s.def,
      interval: s.interval,
    });
    party.moments.push(`Aquilo que Vigia ergueu o eco de ${lost.name}.`);
    record(world, 'eco', [lost.id, ...party.memberIds], `No fundo do abismo, o eco de ${lost.name} se ergueu contra os próprios amigos.`);
  }
}
