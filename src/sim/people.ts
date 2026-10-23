// Pessoas (M2): lesões e cicatrizes, casamentos e filhos, aposentados com função,
// velhice e epitáfios. Tudo o que faz um herói virar alguém de quem a vila lembra.

import { CLASS_IDS, RANKS } from '../data/classes.ts';
import { NAMES_F, NAMES_M } from '../data/names.ts';
import { EXCLUSIVE_TRAITS, INNATE_TRAITS, TRAITS } from '../data/traits.ts';
import { dayOf } from './calendar.ts';
import { record, className, g, heroLabel, listNames } from './chronicle.ts';
import { BALANCE as B, DAYS_PER_SEASON, DAYS_PER_YEAR } from './config.ts';
import { DECREES, hasDecree } from './decrees.ts';
import { EFFECTS, gearPrice, grade, hasSpec, level, spend } from './economy.ts';
import { equip, heirloomFor, stash, takeItems } from './items.ts';
import { addBond, addTrait, ageYears, createHero, getBond, heroStats, rollRank, WOUNDS } from './hero.ts';
import { chance, int, pick } from './rng.ts';
import type { Child, Hero, InjuryKind, RetiredRole, World } from './types.ts';

const alive = (h: Hero) => h.status === 'town' || h.status === 'expedition';

// ── Aposentados com função ──────────────────────────────────────────────

export const ROLE_NAMES: Record<RetiredRole, { m: string; f: string; where: string }> = {
  mentor: { m: 'mentor', f: 'mentora', where: 'no campo de treino' },
  ferreiro: { m: 'ferreiro', f: 'ferreira', where: 'na forja' },
  contador: { m: 'contador de histórias', f: 'contadora de histórias', where: 'na taverna' },
  curandeiro: { m: 'curandeiro', f: 'curandeira', where: 'na Casa de cura' },
};

const CLASS_ROLE: Record<Hero['classId'], RetiredRole> = {
  guardiao: 'mentor',
  lanceiro: 'mentor',
  clerigo: 'curandeiro',
  arqueiro: 'ferreiro',
  selvagem: 'contador',
  piromante: 'contador',
};

/**
 * Função natural de cada classe quando o herói pendura as armas. Com o mundo em
 * mãos, se essa função já está cheia, vai para a mais desfalcada (a vila precisa).
 */
export function defaultRole(hero: Hero, world?: World): RetiredRole {
  const natural = CLASS_ROLE[hero.classId];
  if (!world || roleCount(world, natural) < B.roleCap) return natural;
  const roles = Object.keys(ROLE_NAMES) as RetiredRole[];
  return roles.reduce((best, r) => (roleCount(world, r) < roleCount(world, best) ? r : best), natural);
}

/** Quantos aposentados exercem a função (o efeito para de crescer em B.roleCap). */
export function roleCount(world: World, role: RetiredRole): number {
  const n = world.heroes.filter((h) => h.status === 'retired' && h.retiredRole === role).length;
  return Math.min(B.roleCap, n);
}

/** Preço na forja: cada ferreiro aposentado dá 10% de desconto (até B.roleCap). */
export const forgePrice = (world: World, tier: number): number =>
  Math.round(gearPrice(tier) * (1 - 0.1 * roleCount(world, 'ferreiro')));

export function retireHero(world: World, hero: Hero, reason: string, role: RetiredRole = defaultRole(hero, world)): void {
  // Quem pendura as armas deixa as peças no cofre da vila.
  for (const item of takeItems(hero)) stash(world, item);
  hero.status = 'retired';
  hero.activity = null;
  hero.lfgSince = null;
  hero.partyId = null;
  hero.retiredRole = role;
  world.metrics.retired++;
  const r = ROLE_NAMES[role];
  record(
    world,
    'aposentadoria',
    [hero.id],
    `${heroLabel(hero)} pendurou as armas ${reason}, depois de ${hero.stats.expeditions} expedições, e agora é ${r[hero.gender]} ${r.where}.`,
  );
}

// ── Lesões e cicatrizes ──────────────────────────────────────────────────

const INJURY_KINDS = Object.keys(WOUNDS) as InjuryKind[];

/** Chamado ao fim de um combate (ou de uma fuga) para quem saiu por um fio. */
export function maybeInjure(world: World, hero: Hero, hpFrac: number, where: string): void {
  if (hero.status === 'dead' || hero.injury || hpFrac >= B.injuryHpFrac) return;
  if (!chance(world.rng, B.injuryChance)) return;
  const kind = pick(world.rng, INJURY_KINDS);
  const days = int(world.rng, B.injuryDays[0], B.injuryDays[1]);
  hero.injury = { kind, daysLeft: days, total: days };
  world.metrics.injuries++;
  record(world, 'lesao', [hero.id], `${hero.name} voltou ${where} com ${injuryPhrase(kind)}. Vai levar uns ${days} dias para sarar.`);
}

const injuryPhrase = (kind: InjuryKind): string =>
  ({ braco: 'o braço quebrado', perna: 'a perna rasgada', olho: 'um corte no olho', costelas: 'as costelas partidas' })[kind];

/** Quanto a lesão melhora por dia: Casa de cura e curandeiros aposentados aceleram. */
export function recoveryPerDay(world: World): number {
  return (EFFECTS.healSpeed(grade(world, 'casa')) + 0.5 * roleCount(world, 'curandeiro')) * (hasSpec(world, 'cirurgia') ? 2 : 1);
}

function healInjuries(world: World): void {
  const perDay = recoveryPerDay(world);
  for (const hero of world.heroes) {
    if (!hero.injury || !alive(hero)) continue;
    hero.injury.daysLeft -= perDay;
    if (hero.injury.daysLeft > 0) continue;
    const kind = hero.injury.kind;
    hero.injury = null;
    // Com Cirurgia na Casa de cura, lesão nenhuma vira cicatriz.
    const scarChance = hasSpec(world, 'cirurgia') ? 0 : EFFECTS.scarChance(grade(world, 'casa'));
    if (!chance(world.rng, scarChance)) continue;
    hero.scars.push(kind);
    world.metrics.scars++;
    record(world, 'cicatriz', [hero.id], `${hero.name} sarou, mas ${scarPhrase(kind, hero)}.`);
    if (hero.scars.length === 2) addTrait(world, hero, 'marcado', `Duas cicatrizes depois,`);
  }
}

const scarPhrase = (kind: InjuryKind, hero: Hero): string =>
  ({
    braco: 'o braço nunca mais foi o mesmo',
    perna: `ficou mancando de leve`,
    olho: `ficou com uma cicatriz sobre o olho e mira um pouco pior`,
    costelas: `sente as costelas quando respira fundo`,
  })[kind] + (hero.scars.length > 1 ? ` (é a ${hero.scars.length}ª cicatriz)` : '');

// ── Casamentos e filhos ──────────────────────────────────────────────────

function marriages(world: World): void {
  const single = world.heroes.filter((h) => alive(h) && h.partnerId === null);
  for (let i = 0; i < single.length; i++) {
    const a = single[i]!;
    if (a.partnerId !== null) continue;
    for (let j = i + 1; j < single.length; j++) {
      const b = single[j]!;
      if (b.partnerId !== null || getBond(world, a.id, b.id) < B.marriageBond) continue;
      if (!chance(world.rng, B.marriageChancePerSeason)) continue;
      a.partnerId = b.id;
      b.partnerId = a.id;
      addBond(world, a, b, 10);
      a.loyalty = Math.min(100, a.loyalty + 5);
      b.loyalty = Math.min(100, b.loyalty + 5);
      world.metrics.marriages++;
      record(world, 'casamento', [a.id, b.id], `${a.name} e ${b.name} se casaram na taverna, com a vila inteira de testemunha.`);
      break;
    }
  }
}

function births(world: World): void {
  if (level(world, 'estalagem') < 1) return;
  for (const a of world.heroes) {
    if (!alive(a) || a.partnerId === null || a.partnerId < a.id) continue;
    const b = world.heroes.find((h) => h.id === a.partnerId);
    if (!b || !alive(b)) continue;
    const kids = world.children.filter((c) => c.parents.includes(a.id) && c.parents.includes(b.id)).length;
    const grown = world.heroes.filter((h) => h.parents.includes(a.id) && h.parents.includes(b.id)).length;
    if (kids + grown >= 2 || !chance(world.rng, B.birthChancePerSeason)) continue;
    const gender = chance(world.rng, 0.5) ? 'm' : 'f';
    const parent = pick(world.rng, [a, b]);
    const traits = parent.traits.filter((t) => TRAITS[t.id].innate);
    const child: Child = {
      id: world.nextId++,
      name: childName(world, gender),
      gender,
      parents: [a.id, b.id],
      bornDay: dayOf(world.tick),
      trait: traits.length ? pick(world.rng, traits).id : pick(world.rng, INNATE_TRAITS),
      classId: chance(world.rng, 0.6) ? pick(world.rng, [a, b]).classId : pick(world.rng, CLASS_IDS),
      heirloom: heirloomFor(world, a, b),
    };
    world.children.push(child);
    world.metrics.births++;
    const verb = a.gender === b.gender ? 'adotaram' : 'tiveram';
    record(world, 'nascimento', [a.id, b.id], `${a.name} e ${b.name} ${verb} ${gender === 'm' ? 'um menino' : 'uma menina'}: ${child.name}.`);
  }
}

function childName(world: World, gender: 'm' | 'f'): string {
  const used = new Set([...world.heroes.map((h) => h.name), ...world.children.map((c) => c.name)]);
  const pool = (gender === 'm' ? NAMES_M : NAMES_F).filter((n) => !used.has(n));
  return pool.length ? pick(world.rng, pool) : `${pick(world.rng, gender === 'm' ? NAMES_M : NAMES_F)} ${['II', 'III', 'IV'][int(world.rng, 0, 2)]}`;
}

export const childAge = (world: World, child: Child): number => Math.floor((dayOf(world.tick) - child.bornDay) / DAYS_PER_YEAR);

function comingOfAge(world: World): void {
  const ready = world.children.filter((c) => childAge(world, c) >= B.comingOfAgeYears);
  if (ready.length === 0) return;
  world.children = world.children.filter((c) => !ready.includes(c));
  for (const child of ready) {
    const parents = child.parents.map((id) => world.heroes.find((h) => h.id === id)).filter((h): h is Hero => !!h);
    const hero = createHero(world);
    hero.name = child.name;
    hero.gender = child.gender;
    hero.classId = child.classId;
    hero.bornDay = child.bornDay;
    hero.parents = [...child.parents];
    // Quem treinou no campo com a bênção do prefeito (audiência) chega um nível à frente.
    hero.level = child.apprentice ? 2 : 1;
    hero.xp = 0;
    if (child.heirloom) equip(world, hero, child.heirloom);
    // Cresceu ouvindo histórias do abismo: o talento fica perto do melhor dos pais.
    const bestIdx = parents.reduce((top, p) => Math.max(top, RANKS.indexOf(p.rank)), 0);
    const rolled = RANKS.indexOf(rollRank(world, Math.min(100, world.town.reputation + 20)));
    hero.rank = RANKS[Math.max(rolled, bestIdx - 1)]!;
    const clash = (id: string) => EXCLUSIVE_TRAITS.some(([x, y]) => (x === id && y === child.trait) || (y === id && x === child.trait));
    const others = hero.traits.filter((t) => t.id !== child.trait && !clash(t.id)).slice(0, 2);
    hero.traits = [{ id: child.trait, revealed: true }, ...others];
    hero.hp = heroStats(world, hero).maxHp;
    for (const p of parents) if (alive(p) || p.status === 'retired') addBond(world, hero, p, 60);
    world.metrics.comeOfAge++;
    world.metrics.recruits++;
    const lost = parents.filter((p) => p.status === 'dead');
    const memory = lost.length ? ` Carrega a arma de ${listNames(lost)}, que o abismo levou.` : '';
    record(
      world,
      'maioridade',
      [hero.id, ...child.parents],
      `${child.name}, ${g(hero, 'filho', 'filha')} de ${listNames(parents)}, completou ${B.comingOfAgeYears} anos e pegou em armas como ${className(hero)}.${memory}`,
    );
  }
}

/** Enterro com honras: política que gasta ouro para aliviar o luto da vila. */
export function honorFuneral(world: World, dead: Hero): boolean {
  if (!hasDecree(world, 'funeral-honras')) return false;
  const def = DECREES['funeral-honras'];
  const cost = def.funeralCost ?? 0;
  if (world.town.treasury < cost) return false;
  spend(world, 'funeral', cost);
  const relief = def.funeralGriefRelief ?? 0;
  for (const hero of world.heroes) {
    if (hero.status !== 'dead' && hero.grief > 0) hero.grief = Math.max(0, hero.grief - relief);
  }
  const mood = def.funeralCitizenMood ?? 0;
  for (const citizen of world.citizens) citizen.happiness = Math.min(100, citizen.happiness + mood);
  record(world, 'decreto', [dead.id], `A vila sepultou ${heroLabel(dead)} com honras. O luto pesa menos e os moradores agradecem.`);
  return true;
}

// ── Velhice ──────────────────────────────────────────────────────────────

function oldAge(world: World): void {
  for (const hero of world.heroes) {
    if (hero.status !== 'retired' || ageYears(world, hero) < B.oldAgeYears) continue;
    if (!chance(world.rng, B.oldAgeDeathChance)) continue;
    hero.status = 'dead';
    hero.death = { tick: world.tick, where: 'na vila', by: 'velhice' };
    world.metrics.oldAgeDeaths++;
    hero.epitaph = epitaph(world, hero);
    record(world, 'morte', [hero.id], `${heroLabel(hero)} morreu em paz aos ${ageYears(world, hero)} anos, cercad${g(hero, 'o', 'a')} pelos amigos.`);
    for (const friend of world.heroes) {
      const bond = getBond(world, friend.id, hero.id);
      if (friend.id === hero.id || !alive(friend) || bond < 30) continue;
      friend.grief = Math.min(100, friend.grief + bond * 0.5);
      friend.griefFor = hero.id;
    }
    widow(world, hero);
    honorFuneral(world, hero);
  }
}

/** Quem perde o cônjuge fica de luto máximo e volta a estar livre. */
export function widow(world: World, dead: Hero): void {
  if (dead.partnerId === null) return;
  const partner = world.heroes.find((h) => h.id === dead.partnerId);
  dead.partnerId = null;
  if (!partner || partner.status === 'dead') return;
  partner.partnerId = null;
  partner.grief = 100;
  partner.griefFor = dead.id;
  partner.morale = Math.max(0, partner.morale - 25);
}

// ── Epitáfio ─────────────────────────────────────────────────────────────

const TRAIT_EPITAPH: Partial<Record<string, string>> = {
  covarde: 'Teve medo, e desceu mesmo assim.',
  bravo: 'Nunca deu um passo atrás.',
  vingativo: 'Não deixou nenhuma morte sem resposta.',
  ganancioso: 'Contava moedas até no escuro.',
  leal: 'Nunca abandonou a vila.',
  curioso: 'Abriu todas as portas que encontrou.',
  beberrao: 'A taverna guarda o seu lugar.',
  devoto: 'Rezou até o fim.',
  supersticioso: 'Nunca tocou num santuário.',
  sociavel: 'Não havia quem não fosse seu amigo.',
  veterano: 'Viu mais do abismo que qualquer um.',
  traumatizado: 'Carregou os mortos dos outros.',
  marcado: 'Cada cicatriz, uma história.',
};

const DEED_PRIORITY = ['chefe', 'nemesis', 'ultimoDePe', 'desejo', 'conquista', 'matador'] as const;

export function epitaph(world: World, hero: Hero): string {
  const parts = [`Aqui jaz ${hero.name}, ${className(hero)} de rank ${hero.rank}.`];
  const deed = DEED_PRIORITY.map((k) => hero.deeds.findLast((d) => d.kind === k)).find((d) => d);
  const pronoun = g(hero, 'Ele', 'Ela');
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (deed?.kind === 'matador') parts.push(`Abateu ${plural(hero.stats.kills, 'inimigo', 'inimigos')}.`);
  else if (deed) parts.push(`${pronoun} ${deed.text}.`);
  else if (hero.stats.expeditions > 0) {
    parts.push(`${plural(hero.stats.expeditions, 'descida', 'descidas')}, ${plural(hero.stats.kills, 'inimigo abatido', 'inimigos abatidos')}.`);
  } else parts.push('Caiu antes de ter tempo de virar lenda.');
  if (hero.death?.by === 'velhice') parts.push(`Morreu de velhice, aos ${ageYears(world, hero)} anos.`);
  else if (hero.death) parts.push(`Caiu no ${hero.death.where}.`);
  const traits = hero.traits.filter((t) => t.revealed && TRAIT_EPITAPH[t.id]);
  if (traits.length) parts.push(TRAIT_EPITAPH[traits[traits.length - 1]!.id]!);
  const partner = hero.partnerId !== null ? world.heroes.find((h) => h.id === hero.partnerId) : undefined;
  const kids = world.heroes.filter((h) => h.parents.includes(hero.id)).length + world.children.filter((c) => c.parents.includes(hero.id)).length;
  if (partner && partner.status !== 'dead') {
    parts.push(`Deixa ${partner.name}${kids ? ` e ${kids === 1 ? 'um filho' : `${kids} filhos`}` : ''}.`);
  } else {
    const mourner = world.heroes
      .filter((h) => h.id !== hero.id && h.status !== 'dead' && h.status !== 'left')
      .map((h) => [h, getBond(world, h.id, hero.id)] as const)
      .filter(([, bond]) => bond >= 40)
      .sort((x, y) => y[1] - x[1])[0];
    if (mourner) parts.push(`Chorad${g(hero, 'o', 'a')} por ${mourner[0].name}.`);
  }
  return parts.join(' ');
}

// ── Diário ───────────────────────────────────────────────────────────────

export function dailyPeople(world: World): void {
  world.town.mayorEnergy = B.mayorEnergy;
  healInjuries(world);
  const day = dayOf(world.tick);
  if (day % DAYS_PER_SEASON === 0) {
    marriages(world);
    births(world);
  }
  comingOfAge(world);
  if (day % DAYS_PER_YEAR === 0) oldAge(world);
}
