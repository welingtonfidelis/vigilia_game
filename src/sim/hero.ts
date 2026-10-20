import { CLASS_IDS, CLASSES, RANK_MAX_LEVEL, RANK_MULT, RANKS } from '../data/classes.ts';
import { NAMES_F, NAMES_M } from '../data/names.ts';
import { EXCLUSIVE_TRAITS, INNATE_TRAITS, TRAITS, type TraitDef } from '../data/traits.ts';
import { dayOf } from './calendar.ts';
import { record, g, heroLabel, className } from './chronicle.ts';
import { BALANCE as B, DAYS_PER_YEAR } from './config.ts';
import { chance, int, next, pick, range, weighted } from './rng.ts';
import type { Doctrine, Hero, InjuryKind, Rank, TraitId, World } from './types.ts';

export interface HeroStats {
  maxHp: number;
  atk: number;
  def: number;
  interval: number;
  pierce: number;
  crit: number;
}

export const hasTrait = (hero: Hero, id: TraitId): boolean => hero.traits.some((t) => t.id === id);

/** Soma um campo numérico de todos os traços (ocultos também têm efeito). */
export function traitSum(hero: Hero, key: keyof TraitDef): number {
  let sum = 0;
  for (const t of hero.traits) {
    const v = TRAITS[t.id][key];
    if (typeof v === 'number') sum += v;
  }
  return sum;
}

export function traitMult(hero: Hero, key: keyof TraitDef): number {
  let mult = 1;
  for (const t of hero.traits) {
    const v = TRAITS[t.id][key];
    if (typeof v === 'number') mult *= v;
  }
  return mult;
}

export const ageYears = (world: World, hero: Hero): number =>
  Math.floor((dayOf(world.tick) - hero.bornDay) / DAYS_PER_YEAR);

export function heroStats(world: World, hero: Hero): HeroStats {
  const c = CLASSES[hero.classId];
  const rm = RANK_MULT[hero.rank];
  const lv = hero.level - 1;
  const age = ageYears(world, hero);
  const decline = age > B.declineAge ? Math.max(0.6, 1 - 0.02 * (age - B.declineAge)) : 1;
  const hurt = woundEffects(hero);
  return {
    maxHp: Math.round(c.hp * (1 + B.levelHpGrowth * lv) * rm * (1 + B.armorHpPerTier * hero.gear.armor) * decline * hurt.hp),
    atk: c.atk * (1 + B.levelAtkGrowth * lv) * rm * (1 + B.weaponAtkPerTier * hero.gear.weapon) * decline * hurt.atk,
    def: c.def * (1 + B.levelDefGrowth * lv) * rm + B.armorDefPerTier * hero.gear.armor,
    interval: Math.round(c.interval * hurt.interval),
    pierce: c.pierce,
    crit: c.crit * hurt.crit,
  };
}

/** Penalidade de cada lesão (aberta) e da cicatriz que ela pode deixar. */
export const WOUNDS: Record<InjuryKind, { name: string; injury: Partial<WoundMults>; scar: Partial<WoundMults> }> = {
  braco: { name: 'braço', injury: { atk: 0.85 }, scar: { atk: 0.95 } },
  perna: { name: 'perna', injury: { interval: 1.15 }, scar: { interval: 1.05 } },
  olho: { name: 'olho', injury: { atk: 0.92, crit: 0.5 }, scar: { crit: 0.8 } },
  costelas: { name: 'costelas', injury: { hp: 0.85 }, scar: { hp: 0.95 } },
};

interface WoundMults {
  hp: number;
  atk: number;
  interval: number;
  crit: number;
}

export function woundEffects(hero: Hero): WoundMults {
  const out: WoundMults = { hp: 1, atk: 1, interval: 1, crit: 1 };
  const apply = (m: Partial<WoundMults>) => {
    for (const k of Object.keys(m) as (keyof WoundMults)[]) out[k] *= m[k]!;
  };
  if (hero.injury) apply(WOUNDS[hero.injury.kind].injury);
  for (const scar of hero.scars) apply(WOUNDS[scar].scar);
  return out;
}

export const maxLevel = (hero: Hero): number => RANK_MAX_LEVEL[hero.rank];

export const xpToNext = (level: number): number => Math.round(B.xpBase * Math.pow(level, B.xpExp));

export function moraleBaseline(hero: Hero): number {
  return Math.max(10, Math.min(100, B.baseMorale + traitSum(hero, 'moraleBase') - hero.grief / 2));
}

export function fleeThreshold(hero: Hero, doctrine: Doctrine): number {
  if (hero.vengeful) return -Infinity;
  const doc = doctrine === 'cautelosa' ? 10 : doctrine === 'agressiva' ? -5 : 0;
  return B.baseFleeThreshold + traitSum(hero, 'flee') + doc;
}

const RANK_WEIGHTS: Record<Rank, [number, number]> = {
  // [peso com reputação 0, variação a cada 10 de reputação]
  E: [30, -2.5],
  D: [30, -1.5],
  C: [22, 0.5],
  B: [12, 1.5],
  A: [5, 1.2],
  S: [1, 0.4],
};

export function rollRank(world: World, reputation: number, cap: Rank = 'S'): Rank {
  const capIdx = RANKS.indexOf(cap);
  const items = RANKS.filter((_, i) => i <= capIdx).map(
    (r) => [r, RANK_WEIGHTS[r][0] + (RANK_WEIGHTS[r][1] * reputation) / 10] as const,
  );
  return weighted(world.rng, items);
}

function rollTraits(world: World): TraitId[] {
  const chosen: TraitId[] = [];
  while (chosen.length < 3) {
    const t = pick(world.rng, INNATE_TRAITS);
    if (chosen.includes(t)) continue;
    const clash = EXCLUSIVE_TRAITS.some(
      ([a, b]) => (t === a && chosen.includes(b)) || (t === b && chosen.includes(a)),
    );
    if (!clash) chosen.push(t);
  }
  return chosen;
}

const NUMERALS = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

/** Nomes não se repetem enquanto houver opção; depois ganham numeral ("Ursula II"). */
function uniqueName(world: World, gender: 'm' | 'f'): string {
  const pool = gender === 'm' ? NAMES_M : NAMES_F;
  const used = new Map<string, number>();
  for (const h of world.heroes) {
    const base = h.name.replace(/ [IVX]+$/, '');
    used.set(base, (used.get(base) ?? 0) + 1);
  }
  const fresh = pool.filter((n) => !used.has(n));
  if (fresh.length > 0) return pick(world.rng, fresh);
  const base = pick(world.rng, pool);
  const n = used.get(base) ?? 0;
  return `${base}${NUMERALS[Math.min(n, NUMERALS.length - 1)]}`;
}

export function createHero(world: World, opts: { rankCap?: Rank } = {}): Hero {
  const gender = chance(world.rng, 0.5) ? 'm' : 'f';
  const name = uniqueName(world, gender);
  const today = dayOf(world.tick);
  const traits = rollTraits(world);
  const hero: Hero = {
    id: world.nextId++,
    name,
    gender,
    classId: pick(world.rng, CLASS_IDS),
    rank: rollRank(world, world.town.reputation, opts.rankCap),
    level: 1,
    xp: 0,
    bornDay: today - int(world.rng, 18, 34) * DAYS_PER_YEAR - int(world.rng, 0, DAYS_PER_YEAR - 1),
    arrivedDay: today,
    traits: traits.map((id, i) => ({ id, revealed: i < 2 })),
    status: 'town',
    hp: 0,
    morale: 0,
    loyalty: 0,
    needs: { energy: range(world.rng, 60, 90), fun: range(world.rng, 40, 80), faith: range(world.rng, 40, 80) },
    gold: int(world.rng, 5, 15),
    gear: { weapon: 0, armor: 0 },
    grief: 0,
    griefFor: null,
    vengeful: false,
    activity: null,
    lfgSince: null,
    partyId: null,
    lowMoraleDays: 0,
    deeds: [],
    stats: { expeditions: 0, kills: 0, floorsConquered: 0, bossKills: 0, fled: 0, alliesLost: 0 },
    death: null,
    injury: null,
    scars: [],
    partnerId: null,
    parents: [],
    retiredRole: null,
    lastTalkDay: -1,
    epitaph: null,
  };
  hero.hp = heroStats(world, hero).maxHp;
  hero.morale = moraleBaseline(hero);
  hero.loyalty = Math.min(100, B.startLoyalty + traitSum(hero, 'loyalty'));
  // Começa experiente quando a vila já é renomada (heróis mais fortes chegam).
  const startLevel = Math.min(maxLevel(hero), 1 + Math.floor((world.town.reputation / 100) * 6 * next(world.rng)));
  for (let l = 1; l < startLevel; l++) levelUp(world, hero, false);
  hero.hp = heroStats(world, hero).maxHp;
  world.heroes.push(hero);
  return hero;
}

function levelUp(world: World, hero: Hero, announce: boolean): void {
  hero.level++;
  if (announce && hero.level % 5 === 0) {
    record(world, 'nivel', [hero.id], `${heroLabel(hero)} chegou ao nível ${hero.level}.`);
  }
}

export function gainXp(world: World, hero: Hero, amount: number): void {
  if (hero.level >= maxLevel(hero)) return;
  hero.xp += amount;
  while (hero.level < maxLevel(hero) && hero.xp >= xpToNext(hero.level)) {
    hero.xp -= xpToNext(hero.level);
    const before = heroStats(world, hero).maxHp;
    levelUp(world, hero, true);
    hero.hp += heroStats(world, hero).maxHp - before;
  }
  if (hero.level >= maxLevel(hero)) hero.xp = 0;
}

export function promote(world: World, hero: Hero, reason: string): boolean {
  const idx = RANKS.indexOf(hero.rank);
  if (idx >= RANKS.length - 1) return false;
  hero.rank = RANKS[idx + 1]!;
  world.metrics.rankUps++;
  record(world, 'promocao', [hero.id], `${hero.name} foi ${g(hero, 'promovido', 'promovida')} a rank ${hero.rank} ${reason}.`);
  return true;
}

export function revealTrait(world: World, hero: Hero, id: TraitId, how: string): void {
  const t = hero.traits.find((x) => x.id === id);
  if (!t || t.revealed) return;
  t.revealed = true;
  record(world, 'traco', [hero.id], `${how} A vila descobriu que ${hero.name} é ${TRAITS[id].name[hero.gender]}.`);
}

export function addTrait(world: World, hero: Hero, id: TraitId, why: string): void {
  if (hasTrait(hero, id)) return;
  hero.traits.push({ id, revealed: true });
  record(world, 'traco', [hero.id], `${why} ${hero.name} agora é ${TRAITS[id].name[hero.gender]}.`);
}

// ── Vínculos ──────────────────────────────────────────────────────────────

const bondKey = (a: number, b: number): string => (a < b ? `${a}:${b}` : `${b}:${a}`);

export const getBond = (world: World, a: number, b: number): number => world.bonds[bondKey(a, b)] ?? 0;

export function addBond(world: World, a: Hero, b: Hero, delta: number): void {
  if (a.id === b.id) return;
  const key = bondKey(a.id, b.id);
  const scaled = delta > 0 ? delta * Math.max(traitMult(a, 'affinityGain'), traitMult(b, 'affinityGain')) : delta;
  const before = world.bonds[key] ?? 0;
  const after = Math.max(-100, Math.min(100, before + scaled));
  world.bonds[key] = after;
  if (before < 60 && after >= 60) {
    const friends = a.gender === 'f' && b.gender === 'f' ? 'amigas inseparáveis' : 'amigos inseparáveis';
    record(world, 'vinculo', [a.id, b.id], `${a.name} e ${b.name} se tornaram ${friends}.`);
  } else if (before > -40 && after <= -40) {
    record(world, 'vinculo', [a.id, b.id], `${a.name} e ${b.name} viraram rivais.`);
  }
}

/** Compatibilidade de temperamento para conversas na vila (−1..1). */
export function temperament(a: Hero, b: Hero): number {
  let score = 0;
  const both = (id: TraitId) => hasTrait(a, id) && hasTrait(b, id);
  if (both('beberrao') || both('devoto') || both('bravo')) score += 0.5;
  if ((hasTrait(a, 'covarde') && hasTrait(b, 'bravo')) || (hasTrait(b, 'covarde') && hasTrait(a, 'bravo'))) score -= 0.5;
  if (both('ganancioso')) score -= 0.4;
  if (hasTrait(a, 'sociavel') || hasTrait(b, 'sociavel')) score += 0.3;
  return score;
}

/** Força de combate estimada (lei quadrática de Lanchester: vida efetiva × dano). */
export function heroStrength(world: World, hero: Hero): { ehp: number; dps: number } {
  const s = heroStats(world, hero);
  const hpFrac = hero.hp / s.maxHp;
  const ehp = s.maxHp * hpFrac * (1 + s.def / 100);
  const role = CLASSES[hero.classId].role;
  const dmg = role === 'healer' ? s.atk * B.healMult * 0.8 : role === 'aoe' ? s.atk * 2 : s.atk;
  return { ehp, dps: (dmg * 10) / s.interval };
}

export const describeHero = (hero: Hero): string =>
  `${heroLabel(hero)} nv${hero.level} · ${hero.traits.map((t) => (t.revealed ? TRAITS[t.id].name[hero.gender] : '?')).join(', ')}`;

export { className };
