// Desejos dos heróis (M6 F1). De vez em quando um herói pede algo da vida dele: as coisas do
// pai nos restos, uma lápide para o amigo, descer com alguém. O prefeito atende pelo que já
// existe no jogo (contrato, conversa, festa, presente); o resto da campanha segue igual.
// Os sorteios saem de um RNG do dia, sem mexer no RNG do núcleo.

import { WISHES, type WishText } from '../data/wishes.ts';
import { dayOf } from './calendar.ts';
import { floorLabel, record } from './chronicle.ts';
import { BALANCE as B } from './config.ts';
import { passageOf, spotOf } from './dungeon.ts';
import { addBond, gainXp, getBond, hasTrait, xpToNext } from './hero.ts';
import { dayRng, int, next, weighted } from './rng.ts';
import { activeHeroes } from './town.ts';
import type { Hero, Wish, WishId, World } from './types.ts';

/** O que aconteceu no jogo que pode cumprir um desejo. */
export type WishEvent =
  | { kind: 'conversa'; heroId: number }
  | { kind: 'presente'; heroId: number }
  | { kind: 'festa' }
  | { kind: 'restos'; deadId: number }
  | { kind: 'lapide'; deadId: number }
  | { kind: 'selou'; heroIds: number[] }
  | { kind: 'partida'; heroIds: number[] }
  | { kind: 'volta'; heroIds: number[] };

const heroById = (world: World, id: number | null): Hero | undefined => (id === null ? undefined : world.heroes.find((h) => h.id === id));
const isActive = (h: Hero | undefined): boolean => !!h && (h.status === 'town' || h.status === 'expedition');

/** Os restos de um herói ainda no abismo (com alguma peça para trazer de volta). */
const remainsOf = (world: World, deadId: number) => world.remains.find((r) => r.heroId === deadId && (r.items?.length ?? 0) > 0);

/** Os desejos que cabem neste herói agora, com o alvo de cada um. */
function candidates(world: World, hero: Hero): { id: WishId; targetId: number | null }[] {
  const out: { id: WishId; targetId: number | null }[] = [];
  const today = dayOf(world.tick);
  for (const pid of hero.parents) {
    const parent = heroById(world, pid);
    if (parent?.status === 'dead' && remainsOf(world, pid)) out.push({ id: 'herdeiro', targetId: pid });
  }
  const mourned = heroById(world, hero.griefFor);
  if (mourned?.status === 'dead' && !mourned.honoredGrave && hero.grief > 15) out.push({ id: 'lapide', targetId: mourned.id });
  const others = activeHeroes(world).filter((h) => h.id !== hero.id);
  const friend = others.find((h) => getBond(world, hero.id, h.id) >= 50);
  const rival = others.find((h) => getBond(world, hero.id, h.id) <= -30);
  if (friend ?? rival) out.push({ id: 'juntos', targetId: (friend ?? rival)!.id });
  const newParent = others.find(
    (h) => getBond(world, hero.id, h.id) >= 40 && world.children.some((c) => c.parents.includes(h.id) && today - c.bornDay <= 60),
  );
  if (newParent) out.push({ id: 'padrinho', targetId: newParent.id });
  out.push({ id: 'festa', targetId: null });
  if ((world.town.arsenal ?? []).length > 0) out.push({ id: 'peca', targetId: null });
  if (world.abyss.passages.some((p) => !p.sealed)) out.push({ id: 'selar', targetId: null });
  const veteran = others.find((h) => hasTrait(h, 'veterano'));
  if (hero.stats.expeditions < 5 && veteran) out.push({ id: 'veterano', targetId: veteran.id });
  const buddy = others.find((h) => getBond(world, hero.id, h.id) >= 30);
  if (hasTrait(hero, 'traumatizado') && buddy) out.push({ id: 'superar', targetId: buddy.id });
  return out;
}

/** Alvo padrão de um desejo dado por uma audiência (o amigo, o veterano). */
function defaultTarget(world: World, hero: Hero, id: WishId): number | null | undefined {
  return candidates(world, hero).find((c) => c.id === id)?.targetId;
}

/** Dá um desejo ao herói (do sorteio ou de uma audiência). Devolve false se ele já tem um ou o desejo não cabe. */
export function grantWish(world: World, hero: Hero, id: WishId, targetId?: number | null): boolean {
  if (hero.wish || !isActive(hero)) return false;
  const target = targetId !== undefined ? targetId : defaultTarget(world, hero, id);
  if (target === undefined) return false;
  const today = dayOf(world.tick);
  const r = dayRng(world.seed, today, 300 + hero.id);
  const [min, max] = B.wishDays;
  hero.wish = { id, targetId: target, sinceDay: today, untilDay: today + int(r, min, max) };
  const wishes = (world.metrics.wishes ??= { made: 0, done: 0, failed: 0 });
  wishes.made++;
  return true;
}

/** Uma vez por semana, um herói sem desejo ganha um, até cerca de 10% dos heróis terem. */
export function weeklyWishes(world: World): void {
  const today = dayOf(world.tick);
  if (today % 7 !== 3) return;
  const heroes = activeHeroes(world);
  const open = heroes.filter((h) => h.wish).length;
  if (open >= Math.max(1, Math.round(heroes.length * B.wishShare))) return;
  const r = dayRng(world.seed, today, 200);
  const free = heroes.filter((h) => !h.wish);
  if (free.length === 0) return;
  const hero = free[Math.floor(next(r) * free.length)]!;
  const options = candidates(world, hero);
  if (options.length === 0) return;
  const pick = weighted(r, options.map((o) => [o, WISHES[o.id].weight] as const));
  grantWish(world, hero, pick.id, pick.targetId);
}

/** Todo dia: desejo vencido tira ânimo; desejo de alvo que já não existe some. */
export function dailyWishes(world: World): void {
  const today = dayOf(world.tick);
  for (const hero of world.heroes) {
    const wish = hero.wish;
    if (!wish) continue;
    if (!isActive(hero)) {
      hero.wish = null;
      continue;
    }
    const target = heroById(world, wish.targetId);
    const needsLivingTarget = wish.id === 'juntos' || wish.id === 'padrinho' || wish.id === 'veterano' || wish.id === 'superar';
    if (needsLivingTarget && !isActive(target) && target?.status !== 'retired') {
      hero.wish = null;
      continue;
    }
    if (wish.id === 'herdeiro' && wish.targetId !== null && !remainsOf(world, wish.targetId)) {
      // Alguém trouxe os restos sem o desejo ter sido notado (ou o abismo os levou): passa.
      hero.wish = null;
      continue;
    }
    if (today <= wish.untilDay) continue;
    hero.wish = null;
    hero.morale = Math.max(0, hero.morale - B.wishFailMorale);
    (world.metrics.wishes ??= { made: 0, done: 0, failed: 0 }).failed++;
    record(world, 'desejo', [hero.id], `${hero.name} desistiu de pedir: ${wishTextFor(world, hero, wish).toLowerCase()}`);
  }
}

/** Avisa os desejos de algo que aconteceu no jogo. */
export function noteWish(world: World, event: WishEvent): void {
  const today = dayOf(world.tick);
  for (const hero of world.heroes) {
    const wish = hero.wish;
    if (!wish || !isActive(hero)) continue;
    switch (event.kind) {
      case 'conversa': {
        if (wish.id === 'padrinho' && event.heroId === wish.targetId) fulfil(world, hero);
        if (wish.id !== 'juntos' && wish.id !== 'veterano' && wish.id !== 'superar') break;
        if (event.heroId !== hero.id && event.heroId !== wish.targetId) break;
        // Conversou com os dois no mesmo dia: o par está apresentado.
        if (wish.talkedDay === today && wish.talkedId !== event.heroId) {
          if (wish.id === 'veterano') fulfil(world, hero);
          else wish.paired = true;
        } else {
          wish.talkedDay = today;
          wish.talkedId = event.heroId;
        }
        break;
      }
      case 'presente':
        if (wish.id === 'peca' && event.heroId === hero.id) fulfil(world, hero);
        break;
      case 'festa':
        if (wish.id === 'festa' && hero.status === 'town') fulfil(world, hero);
        break;
      case 'restos':
        if (wish.id === 'herdeiro' && wish.targetId === event.deadId) fulfil(world, hero);
        break;
      case 'lapide':
        if (wish.id === 'lapide' && wish.targetId === event.deadId) fulfil(world, hero);
        break;
      case 'selou':
        if (wish.id === 'selar' && event.heroIds.includes(hero.id)) fulfil(world, hero);
        break;
      case 'partida':
        if (wish.id === 'juntos' && event.heroIds.includes(hero.id) && wish.targetId !== null && event.heroIds.includes(wish.targetId)) fulfil(world, hero);
        break;
      case 'volta':
        if (wish.id === 'superar' && event.heroIds.includes(hero.id) && wish.targetId !== null && event.heroIds.includes(wish.targetId)) fulfil(world, hero);
        break;
    }
  }
}

function fulfil(world: World, hero: Hero): void {
  const wish = hero.wish;
  if (!wish) return;
  const target = heroById(world, wish.targetId);
  hero.loyalty = Math.min(100, hero.loyalty + B.wishLoyalty);
  hero.morale = Math.min(100, hero.morale + B.wishMorale);
  switch (wish.id) {
    case 'herdeiro':
      hero.deeds.push({ tick: world.tick, kind: 'desejo', text: `trouxe para casa as coisas de ${target?.name ?? 'quem perdeu'}` });
      break;
    case 'lapide':
      hero.grief = Math.max(0, hero.grief - 30);
      break;
    case 'juntos':
    case 'superar':
      if (target && isActive(target)) addBond(world, hero, target, 10);
      if (wish.id === 'superar' && next(dayRng(world.seed, dayOf(world.tick), 400 + hero.id)) < B.wishHealTrauma) {
        hero.traits = hero.traits.filter((t) => t.id !== 'traumatizado');
      }
      break;
    case 'padrinho':
      if (target) {
        addBond(world, hero, target, 15);
        const partner = heroById(world, target.partnerId);
        if (partner && partner.status !== 'dead') addBond(world, hero, partner, 10);
      }
      break;
    case 'veterano':
      if (target) {
        addBond(world, hero, target, 10);
        gainXp(world, hero, xpToNext(hero.level) * B.wishVeteranXp);
      }
      break;
    case 'selar':
      hero.deeds.push({ tick: world.tick, kind: 'desejo', text: 'realizou o sonho de selar uma passagem' });
      break;
    case 'festa':
    case 'peca':
      break;
  }
  record(world, 'desejo', target ? [hero.id, target.id] : [hero.id], WISHES[wish.id].done(wishText(world, hero, wish)));
  hero.wish = null;
  (world.metrics.wishes ??= { made: 0, done: 0, failed: 0 }).done++;
}

/** O par apresentado pelo prefeito se procura no quadro (soma na escolha do companheiro). */
export function wishPairBonus(a: Hero, b: Hero): number {
  const pairs = (h: Hero, other: Hero) => h.wish?.paired === true && h.wish.targetId === other.id;
  return pairs(a, b) || pairs(b, a) ? B.wishPairBonus : 0;
}

/** Os nomes que o texto do desejo usa. */
export function wishText(world: World, hero: Hero, wish: Wish): WishText {
  const target = heroById(world, wish.targetId);
  let onde = '';
  if (wish.id === 'herdeiro' && wish.targetId !== null) {
    const rem = remainsOf(world, wish.targetId);
    const passage = rem ? passageOf(world, rem.passageId) : undefined;
    onde = passage && rem ? `no ${floorLabel(spotOf(passage, rem.floor))}` : 'no abismo';
  }
  return {
    quem: hero.name,
    alvo: target?.name ?? '',
    onde,
    g: (who, m, f) => ((who === 'quem' ? hero : target)?.gender === 'f' ? f : m),
  };
}

/** O desejo por extenso ("Uma lápide digna para Bram."). */
export const wishTextFor = (world: World, hero: Hero, wish: Wish): string => WISHES[wish.id].text(wishText(world, hero, wish));
