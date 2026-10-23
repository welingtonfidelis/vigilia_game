// Combate automático em tempo real (1 tick = 0,1 s). Determinístico pela semente.

import { BIOMES } from '../data/biomes.ts';
import { lordOf } from '../data/lords.ts';
import { CLASSES } from '../data/classes.ts';
import { byWhom, record, floorLabel, g, heroLabel } from './chronicle.ts';
import { BALANCE as B, TICKS_PER_SECOND } from './config.ts';
import { makeEnemy, spawnRoom } from './dungeon.ts';
import { epitaph, maybeInjure, widow } from './people.ts';
import { addBond, fleeLimit, getBond, hasTrait, heroStats, promote, revealTrait } from './hero.ts';
import { affixCount, takeItems } from './items.ts';
import { chance, int, pick, range, shuffle, weighted } from './rng.ts';
import type { BossMech, Combat, CombatEvent, Hero, Party, Room, Unit, World } from './types.ts';

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
    lifesteal: Math.min(B.lifestealCap, B.affixLifesteal * affixCount(hero, 'sanguessuga')),
  };
}

export function startCombat(world: World, party: Party, room: Room): Combat {
  const combat: Combat = {
    units: [],
    ticks: 0,
    enraged: false,
    // O guardião da passagem luta com o fôlego de chefe (fúria mais tardia), sem mecânica.
    isBoss: room.kind === 'chefe' || room.kind === 'guardiao',
    bossMech: room.kind === 'chefe' ? lordOf(party.lord ?? party.level).mech : null,
    mechCd: 60,
    echoesSpawned: false,
    nextUid: 1,
  };
  for (const id of party.memberIds) {
    const hero = world.heroes.find((h) => h.id === id);
    if (hero && hero.status === 'expedition') combat.units.push(heroUnit(world, combat, hero));
  }
  // Regras da dimensão que pesam nos heróis: névoa corta o crítico, maré deixa todos lentos.
  for (const u of combat.units) {
    if (party.rules.includes('nevoa')) u.crit *= 0.5;
    if (party.rules.includes('mare')) u.interval = Math.round(u.interval * 1.15);
  }
  combat.units.push(...spawnRoom(world, combat, room, party));
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
    // Encantado pelo canto: perde a vez.
    if (u.charmedUntil !== undefined && c.ticks < u.charmedUntil) continue;
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
        const silenced = c.silenceUntil !== undefined && c.ticks < c.silenceUntil;
        const quiet = party.rules.includes('silencio') ? 0.6 : 1;
        const heal = atk * B.healMult * enrageHealFactor(c) * (silenced ? 0.5 : 1) * quiet;
        const before = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + heal);
        target.poisonTicks = 0;
        logEvent(c, 'heal', u, target, target.hp - before, false);
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

/**
 * Quanto a cura rende: na fúria cai pela metade e continua caindo com o tempo, para a
 * luta terminar (um grupo de curandeiros não segura a fúria para sempre).
 */
function enrageHealFactor(c: Combat): number {
  if (!c.enraged) return 1;
  const secs = (c.ticks - (c.isBoss ? B.bossEnrageTicks : B.enrageTicks)) / TICKS_PER_SECOND;
  return B.enrageHealMult * Math.max(0.2, 1 - B.enrageHealDecayPerSecond * secs);
}

function enemyAct(world: World, party: Party, c: Combat, u: Unit): void {
  const heroes = activeHeroUnits(c);
  if (heroes.length === 0) return;
  const tank = heroes.find((h) => h.role === 'tank');
  const backline = u.tags.includes('backline') || (u.tags.includes('boss') && c.bossMech === 'retaguarda');
  let target: Unit;
  const hunter = u.tags.includes('boss') && c.phase2 && c.bossMech === 'retaguarda';
  if (hunter) {
    // Fase 2 do Martelo: vai atrás de quem tem menos vida.
    target = heroes.reduce((lo, h) => (h.hp / h.maxHp < lo.hp / lo.maxHp ? h : lo));
  } else if (tank && chance(world.rng, backline ? 0.25 : B.tauntChance)) {
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
  let pierce = 0;
  if (c.enraged) {
    const enrageAt = c.isBoss ? B.bossEnrageTicks : B.enrageTicks;
    const secs = (c.ticks - enrageAt) / TICKS_PER_SECOND;
    atk *= 1 + B.enrageDamagePerSecond * secs;
    // Na fúria a armadura vai deixando de segurar: sem isso, um grupo de curandeiros
    // bem equipado empata com o chefe.
    pierce = B.enragePiercePerSecond * secs;
  }
  const dealt = strike(world, party, c, u, target, atk, pierce);
  if (u.affixes.includes('vampirico')) u.hp = Math.min(u.maxHp, u.hp + dealt * 0.3);
  // Fase 2 da Couraça: o golpe pega um segundo herói.
  if (u.tags.includes('boss') && c.phase2 && c.bossMech === 'couraca') {
    const other = activeHeroUnits(c).filter((h) => h !== target);
    if (other.length > 0) strike(world, party, c, u, pick(world.rng, other), atk * B.phase2SecondHit, pierce);
  }
}

/** Guarda o golpe para a tela (no máximo os últimos LOG_SIZE). */
const LOG_SIZE = 40;

function logEvent(c: Combat, kind: CombatEvent['kind'], from: Unit, to: Unit, amount: number, crit: boolean): CombatEvent {
  const log = (c.log ??= []);
  const event: CombatEvent = { n: (c.seq = (c.seq ?? 0) + 1), t: c.ticks, kind, from: from.uid, to: to.uid, amount, crit, kill: false };
  log.push(event);
  if (log.length > LOG_SIZE) log.splice(0, log.length - LOG_SIZE);
  return event;
}

function strike(world: World, party: Party, c: Combat, attacker: Unit, target: Unit, base: number, pierceBonus = 0): number {
  if (!target.alive) return 0;
  const crit = chance(world.rng, attacker.crit) ? B.critMult : 1;
  const pierce = Math.min(0.95, attacker.pierce + pierceBonus);
  let dmg = (base * range(world.rng, 0.85, 1.15) * crit * 100) / (100 + target.def * (1 - pierce));
  if (target.tags.includes('boss') && c.bossMech) dmg = lordGuard(c, attacker, dmg);
  target.hp -= dmg;
  // Sanguessuga: parte do golpe volta como vida para quem bateu. Na fúria, como a cura,
  // rende menos (senão a luta não acaba).
  if (attacker.lifesteal && attacker.alive) {
    const steal = attacker.lifesteal * enrageHealFactor(c);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + dmg * steal);
  }
  const event = logEvent(c, 'hit', attacker, target, dmg, crit > 1);
  if (target.side === 'hero') {
    const hero = heroOf(world, target)!;
    if (target.hp / target.maxHp < 0.3) hero.morale = Math.max(0, hero.morale - (hasTrait(hero, 'bravo') ? 3 : 6));
  }
  if (target.hp <= 0) {
    event.kill = true;
    kill(world, party, c, target, attacker, attacker.name);
  }
  return dmg;
}

// ── Mortes ────────────────────────────────────────────────────────────────

function kill(world: World, party: Party, c: Combat, unit: Unit, killer: Unit | null, by: string): void {
  if (!unit.alive) return;
  unit.alive = false;
  unit.hp = 0;
  if (unit.side === 'enemy' && c.bossMech === 'exercito') raiseFallen(world, party, c, unit);
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
        const blast = logEvent(c, 'blast', unit, h, unit.maxHp * 0.08, false);
        if (h.hp <= 0) {
          blast.kill = true;
          kill(world, party, c, h, unit, `a explosão de ${unit.name}`);
        }
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
  hero.death = { tick: world.tick, where: floorLabel(party), by };
  party.memberIds = party.memberIds.filter((id) => id !== hero.id);
  party.dead.push(hero.id);
  world.metrics.deaths++;
  // As peças ficam com o corpo: voltam com quem achar os restos. No covil do Senhor não há
  // resgate: o que o herói levava fica lá embaixo.
  const items = takeItems(hero);
  if (!party.lord) world.remains.push({ heroId: hero.id, passageId: party.passageId, floor: party.floor, gold: hero.gold, items });
  hero.gold = 0;
  hero.injury = null;
  hero.epitaph = epitaph(world, hero);
  widow(world, hero);
  party.moments.push(`${hero.name} tombou (${by}).`);
  record(
    world,
    'morte',
    [hero.id],
    `${heroLabel(hero)} tombou no ${floorLabel(party)}, ${g(hero, 'abatido', 'abatida')} ${byWhom(by)}. ${
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
    if (hero.morale >= fleeLimit(world, hero)) continue;
    if (activeHeroUnits(c).length === 1 && party.startMemberIds.length === 1) continue;
    partingStrikes(world, party, c, [u]);
    if (!u.alive) continue;
    u.fled = true;
    hero.stats.fled++;
    world.metrics.fled++;
    party.memberIds = party.memberIds.filter((id) => id !== hero.id);
    hero.hp = Math.max(1, u.hp);
    maybeInjure(world, hero, u.hp / u.maxHp, `do ${floorLabel(party)}`);
    for (const id of party.memberIds) {
      const mate = world.heroes.find((h) => h.id === id);
      if (mate) addBond(world, hero, mate, -8);
    }
    party.moments.push(`${hero.name} perdeu a coragem e fugiu.`);
    record(world, 'fuga', [hero.id], `${heroLabel(hero)} perdeu a coragem e fugiu do ${floorLabel(party)}.`);
    revealTrait(world, hero, 'covarde', `${hero.name} foi ${g(hero, 'o primeiro', 'a primeira')} a correr.`);
    const { passageId, level, biome, rules, floor, lord } = party;
    world.pendingFugitives.push({ heroId: hero.id, spot: { passageId, level, biome, rules: [...rules], floor, ...(lord ? { lord } : {}) } });
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

/** O que cada chefe faz ao entrar na segunda fase (abaixo de 50% de vida). */
const PHASE2_TEXT: Record<BossMech, (name: string) => string> = {
  invocar: (n) => `${n} quebrou as próprias urnas.`,
  couraca: (n) => `${n} endureceu a couraça.`,
  veneno: (n) => `${n} fez o jardim brotar.`,
  maldicao: (n) => `${n} começou a rezar ao contrário.`,
  retaguarda: (n) => `${n} passou a caçar os feridos.`,
  ecos: (n) => `${n} abriu o olho.`,
  colmeia: (n) => `${n} subiu para o alto do ninho.`,
  canto: (n) => `${n} cantou mais alto.`,
  placas: (n) => `${n} superaqueceu e as placas caíram.`,
  exercito: (n) => `${n} chamou o exército inteiro.`,
};

function enterPhase2(world: World, party: Party, c: Combat, boss: Unit): void {
  c.phase2 = true;
  const actDef = BIOMES[party.biome]!;
  if (c.bossMech === 'couraca') boss.def *= 1.5;
  // O Colosso superaquece: sem placas e com a defesa pela metade, mas solta vapor.
  if (c.bossMech === 'placas') {
    c.plates = 0;
    c.platesAt = undefined;
    boss.def *= 0.5;
  }
  // O Rei dos Ossuários: cada golpe cura, e dois esqueletos levantam na hora.
  if (c.bossMech === 'exercito') {
    boss.lifesteal = B.lordArmyLifesteal;
    for (let i = 0; i < 2; i++) c.units.push(risenSkeleton(world, party, c));
  }
  if (c.bossMech === 'veneno') {
    const sprout = actDef.enemies.find((e) => e.id === 'brotado') ?? actDef.enemies[actDef.enemies.length - 1]!;
    for (let i = 0; i < 2; i++) c.units.push(makeEnemy(world, c, sprout, party));
  }
  if (c.bossMech) party.moments.push(PHASE2_TEXT[c.bossMech](lordOf(party.lord ?? party.level).name));
}

function bossMechanics(world: World, party: Party, c: Combat): void {
  const boss = c.units.find((u) => u.tags.includes('boss'));
  if (!boss || !boss.alive) return;
  const actDef = BIOMES[party.biome]!;
  if (!c.phase2 && boss.hp < boss.maxHp / 2) enterPhase2(world, party, c, boss);
  // Fase 2 de Aquilo que Vigia: o olhar drena o ânimo de todos aos poucos.
  if (c.phase2 && c.bossMech === 'ecos' && c.ticks % TICKS_PER_SECOND === 0) {
    for (const u of activeHeroUnits(c)) {
      const hero = heroOf(world, u)!;
      hero.morale = Math.max(0, hero.morale - (hasTrait(hero, 'devoto') ? 0.5 : 1));
    }
  }
  if (c.bossMech === 'ecos' && !c.echoesSpawned && (c.ticks === 1 || boss.hp < boss.maxHp / 2)) {
    if (boss.hp < boss.maxHp / 2) c.echoesSpawned = true;
    spawnEchoes(world, party, c);
  }
  // As placas do Colosso: inteiras desde o começo; se o grupo não quebra a tempo, voltam
  // inteiras; quebradas, voltam um tempo depois.
  if (c.bossMech === 'placas' && !c.phase2) {
    const full = boss.maxHp * B.lordPlates;
    if (c.plates === undefined) {
      c.plates = full;
      c.platesAt = c.ticks + B.lordPlatesHold * TICKS_PER_SECOND;
    } else if (c.platesAt !== undefined && c.ticks >= c.platesAt) {
      c.plates = full;
      c.platesAt = c.ticks + B.lordPlatesHold * TICKS_PER_SECOND;
    }
  }
  if (--c.mechCd > 0) return;
  switch (c.bossMech) {
    case 'invocar': {
      c.mechCd = c.phase2 ? 60 : 80;
      const count = c.phase2 ? B.phase2Summons : 2;
      if (aliveEnemies(c).length < (c.phase2 ? 9 : 7)) {
        for (let i = 0; i < count; i++) c.units.push(makeEnemy(world, c, actDef.enemies[0]!, party));
      }
      // Fase 2: as urnas estouram a cada invocação.
      if (c.phase2) for (const h of activeHeroUnits(c)) strike(world, party, c, boss, h, boss.atk * B.phase2UrnBlast);
      break;
    }
    case 'veneno': {
      c.mechCd = c.phase2 ? 35 : 50;
      for (const h of activeHeroUnits(c)) {
        h.poisonTicks = 8 * TICKS_PER_SECOND;
        h.poisonDps = h.maxHp * 0.02;
      }
      break;
    }
    case 'maldicao': {
      c.mechCd = c.phase2 ? 40 : 60;
      // Fase 2: depois de cada maldição, as curas rendem metade por 6 s.
      if (c.phase2) c.silenceUntil = c.ticks + 6 * TICKS_PER_SECOND;
      const cleric = activeHeroUnits(c).some((u) => u.role === 'healer');
      for (const u of activeHeroUnits(c)) {
        const hero = heroOf(world, u)!;
        if (hasTrait(hero, 'devoto')) continue;
        hero.morale = Math.max(0, hero.morale - (cleric ? 4 : 8));
      }
      break;
    }
    case 'retaguarda': {
      c.mechCd = c.phase2 ? 60 : 100;
      for (const h of activeHeroUnits(c)) strike(world, party, c, boss, h, boss.atk * 0.5);
      break;
    }
    case 'colmeia': {
      c.mechCd = c.phase2 ? 60 : 90;
      const count = c.phase2 ? 3 : 2;
      if (aliveEnemies(c).length < (c.phase2 ? 9 : 7)) {
        for (let i = 0; i < count; i++) c.units.push(makeEnemy(world, c, actDef.enemies[0]!, party));
      }
      break;
    }
    case 'canto': {
      c.mechCd = c.phase2 ? 90 : 120;
      // Encanta quem mais bate (dois na fase 2); na fase 2 o canto também cura o Coro.
      const charmed = [...activeHeroUnits(c)].sort((a, b) => b.atk - a.atk || a.uid - b.uid).slice(0, c.phase2 ? 2 : 1);
      for (const h of charmed) h.charmedUntil = c.ticks + B.lordCharmSeconds * TICKS_PER_SECOND;
      if (c.phase2) boss.hp = Math.min(boss.maxHp, boss.hp + boss.maxHp * B.lordSongHeal);
      break;
    }
    case 'placas': {
      c.mechCd = c.phase2 ? 80 : 9999;
      // Fase 2: jatos de vapor em todos.
      if (c.phase2) for (const h of activeHeroUnits(c)) strike(world, party, c, boss, h, boss.atk * B.lordSteam);
      break;
    }
    default:
      c.mechCd = 9999;
  }
}

/**
 * O que protege o Senhor do golpe: os zangões da Rainha (e o alto do ninho, longe do corpo a
 * corpo, na fase 2) e as placas do Colosso, que absorvem o dano antes da vida.
 */
function lordGuard(c: Combat, attacker: Unit, dmg: number): number {
  if (c.bossMech === 'colmeia') {
    const drone = BIOMES.find((b) => b.boss.mech === 'colmeia')!.enemies[0]!.name;
    if (c.units.some((u) => u.alive && u.side === 'enemy' && u.name.startsWith(drone))) dmg *= 1 - B.lordHiveGuard;
    if (c.phase2 && (attacker.role === 'melee' || attacker.role === 'bruiser' || attacker.role === 'tank')) dmg *= 0.5;
  }
  if (c.bossMech === 'placas' && c.plates && c.plates > 0) {
    const absorbed = Math.min(c.plates, dmg);
    c.plates -= absorbed;
    dmg -= absorbed;
    // Quebradas: voltam depois de um tempo, e o grupo tem a janela para bater na vida.
    if (c.plates <= 0) c.platesAt = c.ticks + B.lordPlatesBroken * TICKS_PER_SECOND;
  }
  return dmg;
}

/** Esqueleto que o Rei dos Ossuários levanta: sem ouro, sem experiência e não levanta de novo. */
function risenSkeleton(world: World, party: Party, c: Combat): Unit {
  const unit = makeEnemy(world, c, BIOMES[0]!.enemies[0]!, party);
  return { ...unit, tags: [...unit.tags, 'risen'], gold: 0, xp: 0, material: null };
}

/** Exército do Rei: quem cai do lado dele pode levantar como esqueleto (uma vez cada). */
function raiseFallen(world: World, party: Party, c: Combat, unit: Unit): void {
  if (unit.tags.includes('boss') || unit.tags.includes('risen')) return;
  const king = c.units.find((u) => u.tags.includes('boss') && u.alive);
  if (!king || !chance(world.rng, c.phase2 ? B.lordRaisePhase2 : B.lordRaise)) return;
  c.units.push(risenSkeleton(world, party, c));
}

function spawnEchoes(world: World, party: Party, c: Combat): void {
  const fallen = world.heroes
    .filter((h) => h.status === 'dead')
    .sort((a, b) => b.level - a.level || a.id - b.id)
    .slice(0, 6);
  const actDef = BIOMES[party.biome]!;
  for (let i = 0; i < 2; i++) {
    if (fallen.length === 0) {
      c.units.push(makeEnemy(world, c, actDef.enemies[0]!, party));
      continue;
    }
    const lost = fallen.splice(int(world.rng, 0, fallen.length - 1), 1)[0]!;
    const s = heroStats(world, lost);
    const power = 1.2;
    c.units.push({
      ...makeEnemy(world, c, actDef.enemies[0]!, party, { nameOverride: `Eco de ${lost.name}` }),
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
