import { describe, expect, it } from 'vitest';
import { createWorld, fleeLimit } from '../src/sim/index.ts';
import type { Party } from '../src/sim/index.ts';
import { addTrait, createHero } from '../src/sim/hero.ts';
import { buyProvisions, cheapestWork, dailyPatronage, fundWork, rationPrice, relicPrice, workPrice } from '../src/sim/patronage.ts';

const party = (act: number, floor: number): Party =>
  ({ id: 900, act, floor, memberIds: [], startMemberIds: [], moments: [], loot: { gold: 0, materials: {}, xp: 0 } }) as unknown as Party;

describe('provisões (9.4)', () => {
  it('o preço cresce com a profundidade e a relíquia custa metade', () => {
    expect(rationPrice(0, 0)).toBeLessThan(rationPrice(2, 1));
    expect(rationPrice(5, 3)).toBeGreaterThan(rationPrice(3, 3));
    expect(relicPrice(3, 2)).toBe(Math.round(rationPrice(3, 2) * 0.5));
  });

  it('cada um compra o que o ouro deixa, guardando reserva; o medroso compra relíquia antes', () => {
    const world = createWorld(31);
    world.town.buildings.templo = 1;
    const [rich, poor, fearful] = [createHero(world), createHero(world), createHero(world)];
    const p = party(2, 1);
    const ration = rationPrice(2, 1);
    rich.gold = ration * 10;
    poor.gold = ration;
    fearful.traits = [];
    addTrait(world, fearful, 'supersticioso', 'teste');
    fearful.gold = ration * 2;
    buyProvisions(world, p, [rich, poor, fearful]);
    expect(p.provisioned).toEqual([rich.id]);
    expect(p.relics).toEqual([rich.id, fearful.id]);
    expect(rich.stats.provisions).toBe(1);
    expect(poor.gold).toBe(ration);
  });

  it('a relíquia baixa o limiar de fuga na descida', () => {
    const world = createWorld(32);
    const hero = createHero(world);
    const before = fleeLimit(world, hero);
    const p = party(0, 0);
    p.relics = [hero.id];
    world.parties.push(p);
    hero.partyId = p.id;
    expect(fleeLimit(world, hero)).toBe(before - 5);
  });
});

describe('mecenato (9.4)', () => {
  it('cada nível custa mais; a estátua dá reputação até o 5º nível', () => {
    const world = createWorld(33);
    const hero = createHero(world);
    hero.gold = 1e9;
    const first = workPrice(world, 'estatua');
    const rep = world.town.reputation;
    for (let i = 0; i < 7; i++) expect(fundWork(world, hero, 'estatua')).toBe(true);
    expect(workPrice(world, 'estatua')).toBeGreaterThan(first * 20);
    expect(world.town.reputation).toBe(Math.min(100, rep + 10));
    expect(world.chronicle.at(-1)?.text).toMatch(/sétima estátua da praça/);
  });

  it('só paga obra quem tem fortuna e o equipamento em dia; escolhe a mais barata', () => {
    const world = createWorld(34);
    const hero = createHero(world);
    hero.status = 'town';
    hero.gold = 100;
    dailyPatronage(world);
    expect(world.town.works ?? {}).toEqual({});
    hero.gold = 50000;
    world.town.buildings.ferreiro = 0;
    const patron = createHero(world);
    patron.gold = 1e6;
    fundWork(world, patron, 'estatua');
    const cheapest = cheapestWork(world);
    expect(cheapest).not.toBe('estatua');
    dailyPatronage(world);
    expect(world.town.works?.[cheapest]?.level).toBe(1);
  });
});
