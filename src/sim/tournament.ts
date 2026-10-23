// Torneio da estação (M6 F4). No último dia de cada estação, com o campo de treino de pé, a chave
// sai de manhã com os heróis de maior nível que estão na vila (o Bravo entra primeiro, o Covarde
// fica de fora). O prefeito dá o palpite até a tarde, quando os duelos acontecem: herói contra
// herói, até um cair a 20% da vida. Ninguém se fere e não há ouro em jogo. Os golpes ficam
// guardados para a tela rever, e os sorteios saem de um RNG do dia.

import { dayOf, hourOf, seasonOf, yearOf } from './calendar.ts';
import { listNames, record } from './chronicle.ts';
import { BALANCE as B, SEASONS, TICKS_PER_HOUR } from './config.ts';
import { level } from './economy.ts';
import { addBond, getBond, hasTrait, heroStats } from './hero.ts';
import { appoint } from './posts.ts';
import { dayRng, int, next, range } from './rng.ts';
import { townHeroes } from './town.ts';
import type { CombatEvent, Duel, Hero, World } from './types.ts';

export type TournamentResult = { ok: true } | { ok: false; reason: string };

const metrics = (world: World) => (world.metrics.tournaments ??= { held: 0, guessed: 0 });

/** O torneio de hoje (null se não há, ou se já é de outro dia). */
export function todaysTournament(world: World) {
  const t = world.town.tournament;
  return t && t.day === dayOf(world.tick) ? t : null;
}

/** O herói está na chave de hoje e as lutas ainda não aconteceram: não desce. */
export function inTournament(world: World, heroId: number): boolean {
  const t = todaysTournament(world);
  return !!t && t.duels.length === 0 && t.entrants.includes(heroId);
}

/** Ordem da chave: o melhor contra o pior, como em todo torneio. */
const SEEDS: Record<number, number[]> = { 8: [0, 7, 3, 4, 1, 6, 2, 5], 4: [0, 3, 1, 2] };

/** Roda de hora em hora: a chave de manhã, os duelos à tarde. */
export function hourlyTournament(world: World): void {
  const day = dayOf(world.tick);
  if (day % 10 !== 9) return;
  const hour = hourOf(world.tick);
  if (hour === B.tournamentAnnounceHour) announce(world, day);
  else if (hour === B.tournamentFightHour) fight(world);
}

function announce(world: World, day: number): void {
  if (level(world, 'campo') < 1) return;
  const eligible = townHeroes(world)
    .filter((h) => !h.injury && !hasTrait(h, 'covarde'))
    .sort((a, b) => Number(hasTrait(b, 'bravo')) - Number(hasTrait(a, 'bravo')) || b.level - a.level || a.id - b.id);
  const size = eligible.length >= B.tournamentSize ? B.tournamentSize : eligible.length >= 4 ? 4 : 0;
  if (size === 0) return;
  const top = eligible.slice(0, size);
  const entrants = SEEDS[size]!.map((i) => top[i]!.id);
  world.town.tournament = { day, startTick: world.tick + (B.tournamentFightHour - B.tournamentAnnounceHour) * TICKS_PER_HOUR, entrants, favorite: null, duels: [], championId: null };
  record(world, 'torneio', entrants, `Hoje às ${B.tournamentFightHour}h, torneio no campo de treino: ${listNames(top)}. O prefeito pode dar o palpite (P).`);
}

/** Um duelo: os dois batem no ritmo de cada um, até um cair a 20% da vida. */
function duel(world: World, a: Hero, b: Hero, round: number): Duel {
  const r = dayRng(world.seed, dayOf(world.tick), 2000 + a.id * 31 + b.id);
  const sa = heroStats(world, a);
  const sb = heroStats(world, b);
  const fighters = [
    { uid: 1, s: sa, hp: sa.maxHp, cd: int(r, 1, sa.interval) },
    { uid: 2, s: sb, hp: sb.maxHp, cd: int(r, 1, sb.interval) },
  ];
  const events: CombatEvent[] = [];
  let n = 0;
  let loser = -1;
  for (let t = 1; t <= B.tournamentMaxTicks && loser < 0; t++) {
    for (const [i, x] of fighters.entries()) {
      if (--x.cd > 0) continue;
      x.cd = x.s.interval;
      const y = fighters[1 - i]!;
      const crit = next(r) < x.s.crit;
      const dmg = (x.s.atk * range(r, 0.85, 1.15) * (crit ? B.critMult : 1) * 100) / (100 + y.s.def * (1 - Math.min(0.95, x.s.pierce)));
      y.hp -= dmg;
      events.push({ n: ++n, t, kind: 'hit', from: x.uid, to: y.uid, amount: dmg, crit, kill: false });
      if (y.hp <= y.s.maxHp * B.tournamentYield) {
        loser = 1 - i;
        break;
      }
    }
  }
  // Ninguém caiu no tempo: vence quem guardou mais vida.
  if (loser < 0) loser = fighters[0]!.hp / sa.maxHp < fighters[1]!.hp / sb.maxHp ? 0 : 1;
  return {
    round,
    a: a.id,
    b: b.id,
    winner: loser === 0 ? b.id : a.id,
    maxA: sa.maxHp,
    maxB: sb.maxHp,
    events: events.slice(-B.tournamentMaxEvents),
  };
}

function fight(world: World): void {
  const t = todaysTournament(world);
  if (!t || t.duels.length > 0) return;
  // Quem saiu da vila de manhã para cá fica de fora (a chave fecha em potência de 2).
  let current = t.entrants.map((id) => world.heroes.find((h) => h.id === id)).filter((h): h is Hero => !!h && h.status === 'town');
  if (current.length < 2) {
    world.town.tournament = null;
    return;
  }
  const size = current.length >= 8 ? 8 : current.length >= 4 ? 4 : 2;
  current = current.slice(0, size);
  let round = 1;
  while (current.length > 1) {
    const winners: Hero[] = [];
    for (let i = 0; i + 1 < current.length; i += 2) {
      const a = current[i]!;
      const b = current[i + 1]!;
      const d = duel(world, a, b, round);
      t.duels.push(d);
      const win = d.winner === a.id ? a : b;
      const lose = win === a ? b : a;
      // Perder para o rival dá raiva; perder bem, respeito.
      addBond(world, lose, win, getBond(world, lose.id, win.id) < 0 ? -B.tournamentGrudge : B.tournamentRespect);
      winners.push(win);
    }
    current = winners;
    round++;
  }
  const champion = current[0]!;
  t.championId = champion.id;
  champion.stats.tournaments = (champion.stats.tournaments ?? 0) + 1;
  const day = dayOf(world.tick);
  const season = SEASONS[seasonOf(day)]!.toLowerCase();
  champion.deeds.push({ tick: world.tick, kind: 'torneio', text: `venceu o torneio de ${season} do ano ${yearOf(day)}` });
  metrics(world).held++;
  const final = t.duels[t.duels.length - 1]!;
  const runnerUp = world.heroes.find((h) => h.id === (final.winner === final.a ? final.b : final.a));
  record(world, 'torneio', runnerUp ? [champion.id, runnerUp.id] : [champion.id], `${champion.name} venceu o torneio de ${season}${runnerUp ? `, derrotando ${runnerUp.name} na final` : ''}.`);
  if (t.favorite === champion.id) {
    world.town.reputation = Math.min(100, world.town.reputation + B.tournamentGuessReputation);
    metrics(world).guessed++;
    record(world, 'torneio', [champion.id], `O palpite do prefeito acertou: a vila comenta o olho bom para heróis.`);
  }
  appoint(world, 'campeao', champion.id, 'venceu o torneio');
}

/** O palpite do prefeito, antes das lutas. */
export function guessTournament(world: World, heroId: number): TournamentResult {
  const t = todaysTournament(world);
  if (!t || t.duels.length > 0) return { ok: false, reason: 'Não há torneio esperando palpite agora.' };
  if (!t.entrants.includes(heroId)) return { ok: false, reason: 'Esse herói não está na chave.' };
  t.favorite = heroId;
  return { ok: true };
}
