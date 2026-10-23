import { describe, expect, it } from 'vitest';
import { commands, createWorld, defensePower, deserialize, getBond, serialize, TICKS_PER_DAY, TICKS_PER_HOUR } from '../src/sim/index.ts';
import type { Hero, World } from '../src/sim/index.ts';
import { BALANCE as B } from '../src/sim/config.ts';
import { createHero } from '../src/sim/hero.ts';
import { epitaph } from '../src/sim/people.ts';
import { appoint, heroTitles, holderOf, postActive } from '../src/sim/posts.ts';
import { hourlyTournament, inTournament, todaysTournament } from '../src/sim/tournament.ts';
import { dailyMemories, processArrivals, scoreActivities } from '../src/sim/town.ts';
import { addBond } from '../src/sim/hero.ts';
import { dayOf, seasonOf } from '../src/sim/calendar.ts';

function townHero(world: World, rank: Hero['rank'] = 'B', level = 10): Hero {
  const h = createHero(world);
  h.status = 'town';
  h.rank = rank;
  h.level = level;
  h.injury = null;
  h.traits = [];
  return h;
}

/** Leva o relógio para a hora `hour` do dia `day`. */
const at = (world: World, day: number, hour: number) => (world.tick = day * TICKS_PER_DAY + hour * TICKS_PER_HOUR);

/** Um dia de primavera e um de verão. */
const SPRING = 40;
const SUMMER = 52;

describe('cargos da vila (M6 F4)', () => {
  it('quem pode cada cargo: mestre pede rank B, ninguém acumula, precisa estar na vila', () => {
    const world = createWorld(61);
    at(world, SPRING, 9);
    const low = townHero(world, 'C');
    const high = townHero(world, 'A');
    expect(appoint(world, 'mestre', low.id).ok).toBe(false);
    expect(appoint(world, 'mestre', high.id).ok).toBe(true);
    expect(appoint(world, 'capitao', high.id).ok).toBe(false);
    low.status = 'expedition';
    expect(appoint(world, 'capitao', low.id).ok).toBe(false);
  });

  it('ciúme de quem tinha rank igual ou maior; troca só na primavera, e quem sai perde lealdade', () => {
    const world = createWorld(62);
    at(world, SUMMER, 9);
    expect(seasonOf(dayOf(world.tick))).toBe(1);
    const a = townHero(world, 'B');
    const peer = townHero(world, 'A');
    const junior = townHero(world, 'D');
    expect(appoint(world, 'capitao', a.id).ok).toBe(true);
    expect(getBond(world, peer.id, a.id)).toBe(-B.postJealousy);
    expect(getBond(world, junior.id, a.id)).toBe(0);
    expect(appoint(world, 'capitao', peer.id).ok).toBe(false);
    at(world, SPRING, 9);
    a.loyalty = 50;
    expect(appoint(world, 'capitao', peer.id).ok).toBe(true);
    expect(a.loyalty).toBe(50 - B.postReplacedLoyalty);
    expect(holderOf(world, 'capitao')?.id).toBe(peer.id);
  });

  it('o capitão na vila soma defesa; descendo, o cargo fica sem efeito', () => {
    const world = createWorld(63);
    const cap = townHero(world, 'B');
    const base = defensePower(world);
    appoint(world, 'capitao', cap.id);
    expect(defensePower(world)).toBeCloseTo(base * (1 + B.captainDefense), -1);
    cap.status = 'expedition';
    expect(postActive(world, 'capitao')).toBe(false);
  });

  it('o mestre da guilda recebe os recrutas com lealdade a mais', () => {
    const world = createWorld(64);
    const master = townHero(world, 'A');
    appoint(world, 'mestre', master.id);
    world.town.arrivals.push({ at: world.tick, free: false });
    const before = world.heroes.length;
    processArrivals(world);
    const recruit = world.heroes[before]!;
    const plain = createWorld(64);
    plain.town.arrivals.push({ at: plain.tick, free: false });
    processArrivals(plain);
    expect(recruit.loyalty).toBeGreaterThan(plain.heroes.at(-1)!.loyalty);
  });

  it('títulos saem dos feitos e entram no epitáfio', () => {
    const world = createWorld(65);
    const h = townHero(world);
    h.gender = 'f';
    // O golpe final num guardião não faz Mata-Senhor.
    h.deeds.push({ tick: 0, kind: 'chefe', text: 'deu o golpe final no Guardião das Urnas' });
    expect(heroTitles(h)).toEqual([]);
    h.deeds.push({ tick: 0, kind: 'chefe', text: 'derrotou o Senhor das Cinzas' }, { tick: 0, kind: 'nemesis', text: 'vingou Bram' });
    h.stats.defended = 3;
    expect(heroTitles(h)).toEqual(['Mata-Senhor', 'Vingadora', 'Escudo da Vila']);
    h.status = 'dead';
    h.death = { tick: 0, where: 'andar 1 das Catacumbas', by: 'Esqueleto' };
    expect(epitaph(world, h)).toContain('Chamavam a de Mata-Senhor, Vingadora e Escudo da Vila.');
  });
});

describe('torneio da estação (M6 F4)', () => {
  function tournamentWorld(seed: number): { world: World; heroes: Hero[] } {
    const world = createWorld(seed);
    world.town.buildings.campo = 2;
    const heroes = Array.from({ length: 10 }, (_, i) => townHero(world, 'B', 10 + i));
    return { world, heroes };
  }

  it('a chave sai de manhã no último dia da estação, sem o Covarde nem quem está ferido', () => {
    const { world, heroes } = tournamentWorld(71);
    heroes[8]!.traits = [{ id: 'covarde', revealed: true }];
    heroes[7]!.injury = { kind: 'perna', daysLeft: 5, total: 10 };
    at(world, 9, B.tournamentAnnounceHour);
    hourlyTournament(world);
    const t = todaysTournament(world)!;
    expect(t.entrants).toHaveLength(B.tournamentSize);
    expect(t.entrants).not.toContain(heroes[8]!.id);
    expect(t.entrants).not.toContain(heroes[7]!.id);
    expect(inTournament(world, t.entrants[0]!)).toBe(true);
    // Em dia que não é o último da estação, nada.
    const other = tournamentWorld(72).world;
    at(other, 8, B.tournamentAnnounceHour);
    hourlyTournament(other);
    expect(todaysTournament(other)).toBeNull();
  });

  it('à tarde, 7 duelos até o campeão, que vira campeão da vila; o palpite certo dá reputação', () => {
    const { world } = tournamentWorld(73);
    at(world, 9, B.tournamentAnnounceHour);
    hourlyTournament(world);
    const t = todaysTournament(world)!;
    // Palpite em todos, um de cada vez, só para saber quem venceu numa cópia.
    const copy = deserialize(serialize(world));
    at(copy, 9, B.tournamentFightHour);
    hourlyTournament(copy);
    const champion = copy.town.tournament!.championId!;
    expect(commands.guessTournament(world, champion).ok).toBe(true);
    const rep = world.town.reputation;
    at(world, 9, B.tournamentFightHour);
    hourlyTournament(world);
    expect(t.duels).toHaveLength(7);
    expect(t.championId).toBe(champion);
    expect(t.duels.every((d) => d.events.length > 0 && d.events.every((e) => !e.kill))).toBe(true);
    expect(holderOf(world, 'campeao')?.id).toBe(champion);
    expect(world.town.reputation).toBeGreaterThan(rep);
    expect(world.heroes.find((h) => h.id === champion)!.stats.tournaments).toBe(1);
    expect(inTournament(world, champion)).toBe(false);
    expect(commands.guessTournament(world, champion).ok).toBe(false);
  });

  it('o torneio volta igual do save', () => {
    const { world } = tournamentWorld(74);
    at(world, 9, B.tournamentAnnounceHour);
    hourlyTournament(world);
    at(world, 9, B.tournamentFightHour);
    hourlyTournament(world);
    const back = deserialize(serialize(world));
    expect(back.town.tournament).toEqual(world.town.tournament);
  });
});

describe('visita por lembrança (pedido de 2026-10-23)', () => {
  it('sem luto, o herói às vezes quer visitar o túmulo de um velho companheiro; a família vem antes', () => {
    const tuned = B as unknown as Record<string, number>;
    const chance = tuned.memoryVisitChance!;
    tuned.memoryVisitChance = 1;
    try {
      const world = createWorld(81);
      const hero = townHero(world);
      const friend = townHero(world);
      const father = townHero(world);
      addBond(world, hero, friend, 70);
      friend.status = 'dead';
      father.status = 'dead';
      hero.parents = [father.id];
      hero.grief = 0;
      dailyMemories(world);
      expect(hero.visitGrave).toBe(father.id);
      expect(scoreActivities(world, hero)).toContainEqual(['tumulo', 0.6]);
      // Visitou há pouco: espera o intervalo.
      hero.visitGrave = null;
      hero.lastGraveVisit = dayOf(world.tick);
      dailyMemories(world);
      expect(hero.visitGrave ?? null).toBeNull();
    } finally {
      tuned.memoryVisitChance = chance;
    }
  });
});
