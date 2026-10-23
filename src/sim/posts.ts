// Cargos e títulos da vila (M6 F4). O prefeito nomeia o capitão da guarda, o mestre da guilda e
// o campeão da vila, entre heróis e aposentados. Os cargos valem fora da masmorra: quem desce
// deixa o efeito vago até voltar. A primavera abre a revisão do ano; fora dela, só dá para
// preencher o cargo vazio. Os títulos honoríficos saem dos feitos e não têm efeito.

import { RANKS } from '../data/classes.ts';
import { dayOf, seasonOf } from './calendar.ts';
import { g, record } from './chronicle.ts';
import { BALANCE as B } from './config.ts';
import { addBond } from './hero.ts';
import { townHeroes } from './town.ts';
import type { Hero, PostId, World } from './types.ts';

export type PostResult = { ok: true } | { ok: false; reason: string };

export const POST_IDS: readonly PostId[] = ['capitao', 'mestre', 'campeao'];

export const POSTS: Record<PostId, { name: (h?: Hero) => string; effect: string; who: string }> = {
  capitao: {
    name: () => 'Capitão da guarda',
    effect: `+${Math.round(B.captainDefense * 100)}% na defesa das incursões; os guardas ficam mais contentes.`,
    who: 'Herói na vila ou aposentado.',
  },
  mestre: {
    name: (h) => (h?.gender === 'f' ? 'Mestra da guilda' : 'Mestre da guilda'),
    effect: `Recrutas chegam com +${B.masterLoyalty} de lealdade.`,
    who: 'Herói de rank B ou acima, ou aposentado.',
  },
  campeao: {
    name: (h) => (h?.gender === 'f' ? 'Campeã da vila' : 'Campeão da vila'),
    effect: 'Cargo de honra: ânimo para quem venceu e o nome na crônica da vila.',
    who: 'Quem vence o torneio da estação (ou alguém nomeado, se ainda não houve torneio).',
  },
};

const heroById = (world: World, id: number | undefined): Hero | undefined => (id === undefined ? undefined : world.heroes.find((h) => h.id === id));

/** Quem está no cargo (vivo e na vila, aposentado ou descendo). */
export function holderOf(world: World, post: PostId): Hero | undefined {
  const h = heroById(world, world.town.posts?.[post]);
  return h && (h.status === 'town' || h.status === 'expedition' || h.status === 'retired') ? h : undefined;
}

/** O cargo vale agora: o titular está na vila ou aposentado (quem desce deixa vago até voltar). */
export function postActive(world: World, post: PostId): boolean {
  const h = holderOf(world, post);
  return !!h && (h.status === 'town' || h.status === 'retired');
}

/** Pode assumir o cargo? (null = pode) */
export function postBlocker(world: World, post: PostId, hero: Hero): string | null {
  if (hero.status !== 'town' && hero.status !== 'retired') return `${hero.name} precisa estar na vila.`;
  if (post === 'mestre' && hero.status !== 'retired' && RANKS.indexOf(hero.rank) < RANKS.indexOf('B')) return 'O mestre da guilda precisa de rank B ou acima.';
  if (POST_IDS.some((p) => p !== post && world.town.posts?.[p] === hero.id)) return `${hero.name} já tem outro cargo.`;
  return null;
}

/** A revisão dos cargos: a primavera inteira. */
export const reviewOpen = (world: World): boolean => seasonOf(dayOf(world.tick)) === 0;

/** O prefeito nomeia alguém para o cargo. */
export function appoint(world: World, post: PostId, heroId: number, reason = 'nomeação do prefeito'): PostResult {
  const hero = heroById(world, heroId);
  if (!hero) return { ok: false, reason: 'Esse herói não existe.' };
  const blocked = postBlocker(world, post, hero);
  if (blocked) return { ok: false, reason: blocked };
  const current = holderOf(world, post);
  if (current?.id === hero.id) return { ok: false, reason: `${hero.name} já está no cargo.` };
  if (current && post !== 'campeao' && !reviewOpen(world)) return { ok: false, reason: 'A troca de cargos é na primavera; fora dela, só dá para preencher um cargo vago.' };
  const posts = (world.town.posts ??= {});
  if (current) current.loyalty = Math.max(0, current.loyalty - B.postReplacedLoyalty);
  posts[post] = hero.id;
  // Ciúme: quem tinha rank igual ou maior e ficou de fora.
  if (reason === 'nomeação do prefeito') {
    for (const other of townHeroes(world)) {
      if (other.id === hero.id || RANKS.indexOf(other.rank) < RANKS.indexOf(hero.rank)) continue;
      addBond(world, other, hero, -B.postJealousy);
    }
  }
  if (post === 'campeao') hero.morale = Math.min(100, hero.morale + B.championMorale);
  const title = POSTS[post].name(hero);
  const was = current ? ` no lugar de ${current.name}` : '';
  record(world, 'cargo', current ? [hero.id, current.id] : [hero.id], `${hero.name} agora é ${title.toLowerCase()}${was} (${reason}).`);
  return { ok: true };
}

/** Todo dia: a primavera avisa a revisão; o capitão na vila alegra os guardas. */
export function dailyPosts(world: World): void {
  const day = dayOf(world.tick);
  if (seasonOf(day) === 0 && day % 10 === 0 && Object.keys(world.town.posts ?? {}).length > 0) {
    record(world, 'cargo', [], 'A primavera chegou: é a hora de rever os cargos da vila.');
  }
  if (postActive(world, 'capitao')) {
    for (const c of world.citizens) if (c.job === 'guarda') c.happiness = Math.min(100, c.happiness + 1);
  }
}

/** Títulos honoríficos, dos feitos (sem efeito no jogo). */
export function heroTitles(hero: Hero): string[] {
  const out: string[] = [];
  const has = (kind: Hero['deeds'][number]['kind']) => hero.deeds.some((d) => d.kind === kind);
  // O feito 'chefe' também vale o golpe final num guardião; o Senhor vencido é o "derrotou …".
  if (hero.deeds.some((d) => d.kind === 'chefe' && d.text.startsWith('derrotou '))) out.push('Mata-Senhor');
  if (has('nemesis')) out.push(g(hero, 'Vingador', 'Vingadora'));
  if (has('ultimoDePe')) out.push(g(hero, 'Último de Pé', 'Última de Pé'));
  const wins = hero.stats.tournaments ?? 0;
  if (wins > 0) out.push(`${g(hero, 'Campeão', 'Campeã')} do torneio${wins > 1 ? ` ×${wins}` : ''}`);
  if ((hero.stats.defended ?? 0) >= 3) out.push('Escudo da Vila');
  return out;
}

/** Os cargos de um herói (para a ficha). */
export const postsOf = (world: World, hero: Hero): string[] =>
  POST_IDS.filter((p) => world.town.posts?.[p] === hero.id).map((p) => POSTS[p].name(hero));
