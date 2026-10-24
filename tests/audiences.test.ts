import { describe, expect, it } from 'vitest';
import { commands, createWorld, deserialize, guardDefense, runDays, runTicks, serialize, TICKS_PER_DAY, TICKS_PER_HOUR } from '../src/sim/index.ts';
import type { Hero, Petition, World } from '../src/sim/index.ts';
import { BALANCE as B } from '../src/sim/config.ts';
import { PETITIONS } from '../src/data/petitions.ts';
import { WISHES } from '../src/data/wishes.ts';
import { answerPetition, choiceGold, effectSummary, morningAudiences, petitionDayTax, textOf } from '../src/sim/audiences.ts';
import { grantWish, wishPairBonus } from '../src/sim/wishes.ts';
import { createHero } from '../src/sim/hero.ts';
import { dayOf } from '../src/sim/calendar.ts';

/** Avança até as 8h do próximo dia (a hora das audiências). */
function toMorning(world: World): void {
  const hour = Math.floor((world.tick % TICKS_PER_DAY) / TICKS_PER_HOUR);
  const ticks = (((8 - hour + 24) % 24) || 24) * TICKS_PER_HOUR - (world.tick % TICKS_PER_HOUR);
  runTicks(world, ticks);
}

function heroInTown(world: World): Hero {
  const h = createHero(world);
  h.status = 'town';
  return h;
}

/** Petição posta à mão na mesa. */
function put(world: World, p: Omit<Petition, 'id' | 'day' | 'untilDay'>): Petition {
  const today = dayOf(world.tick);
  world.town.petitionSeq = (world.town.petitionSeq ?? 0) + 1;
  const petition: Petition = { id: world.town.petitionSeq, day: today, untilDay: today + B.petitionDays - 1, ...p };
  (world.town.petitions ??= []).push(petition);
  return petition;
}

describe('audiências da manhã (M6 F1)', () => {
  it('chega uma petição a cada 4 manhãs, em média, e nunca mais de 3 na mesa', () => {
    const world = createWorld(11);
    for (let d = 0; d < 160; d++) {
      runDays(world, 1);
      expect((world.town.petitions ?? []).length).toBeLessThanOrEqual(B.petitionMaxOpen);
    }
    const asked = world.metrics.audiences?.asked ?? 0;
    expect(asked).toBeGreaterThan(18);
    expect(asked).toBeLessThan(60);
    // Sem resposta, tudo expira no prazo.
    expect(world.metrics.audiences!.expired).toBeGreaterThan(asked - B.petitionMaxOpen - 1);
  });

  it('o sorteio das audiências não mexe no RNG do núcleo', () => {
    const world = createWorld(12);
    toMorning(world);
    const before = world.rng.s;
    morningAudiences(world);
    expect(world.rng.s).toBe(before);
  });

  it('a resposta muda o humor, cobra o ouro simbólico e some da mesa', () => {
    const world = createWorld(13);
    const [a, b] = world.citizens;
    a!.job = 'lavrador';
    b!.job = 'lavrador';
    a!.happiness = 50;
    b!.happiness = 50;
    const p = put(world, { defId: 'cerca', asker: { kind: 'morador', id: a!.id }, other: { kind: 'morador', id: b!.id }, building: null });
    expect(textOf(world, p).quem).toBe(a!.name);
    expect(answerPetition(world, p.id, 'quem').ok).toBe(true);
    expect(a!.happiness).toBe(58);
    expect(b!.happiness).toBe(42);
    expect(world.town.petitions).toHaveLength(0);

    // Resposta paga: o preço é meio dia de imposto.
    world.town.treasury = 1000;
    const q = put(world, { defId: 'abrigo', asker: { kind: 'morador', id: a!.id }, other: null, building: null });
    const choice = PETITIONS.find((d) => d.id === 'abrigo')!.choices.find((c) => c.id === 'estalagem')!;
    const gold = choiceGold(world, choice);
    expect(gold).toBe(Math.max(1, Math.round(0.5 * petitionDayTax(world))));
    expect(answerPetition(world, q.id, 'estalagem').ok).toBe(true);
    expect(world.town.treasury).toBe(1000 - gold);
    expect(world.metrics.spent.audiencia).toBe(gold);
  });

  it('resposta que gasta energia não sai sem energia', () => {
    const world = createWorld(14);
    const h = heroInTown(world);
    const rival = heroInTown(world);
    const p = put(world, { defId: 'covardia', asker: { kind: 'heroi', id: h.id }, other: { kind: 'heroi', id: rival.id }, building: null });
    world.town.mayorEnergy = 0;
    expect(answerPetition(world, p.id, 'conversar').ok).toBe(false);
    world.town.mayorEnergy = 2;
    expect(answerPetition(world, p.id, 'conversar').ok).toBe(true);
    expect(world.town.mayorEnergy).toBe(1);
  });

  it('o resumo diz o que cada resposta muda', () => {
    const world = createWorld(15);
    const [a, b] = world.citizens;
    const p = put(world, { defId: 'cerca', asker: { kind: 'morador', id: a!.id }, other: { kind: 'morador', id: b!.id }, building: null });
    const def = PETITIONS.find((d) => d.id === 'cerca')!;
    expect(effectSummary(world, p, def.choices[0]!.effects)).toEqual([`${a!.name} fica contente`, `${b!.name} fica ${b!.gender === 'f' ? 'chateada' : 'chateado'}`]);
  });

  it('a folga do guarda tira ele da defesa daquela noite', () => {
    const world = createWorld(16);
    const guard = world.citizens[0]!;
    guard.job = 'guarda';
    const before = guardDefense(world);
    const p = put(world, { defId: 'folga-guarda', asker: { kind: 'morador', id: guard.id }, other: null, building: null });
    expect(answerPetition(world, p.id, 'folga').ok).toBe(true);
    expect(guardDefense(world)).toBe(before - 8);
    runDays(world, 1);
    expect(guardDefense(world)).toBeGreaterThanOrEqual(before - 8);
    world.town.guardLeaveDay = -1;
    expect(guardDefense(world)).toBeGreaterThanOrEqual(0);
  });

  it('todo modelo tem resposta segura, respostas distintas e textos sem buraco', () => {
    for (const def of PETITIONS) {
      expect(def.choices.filter((c) => c.bot).length).toBe(1);
      expect(new Set(def.choices.map((c) => c.id)).size).toBe(def.choices.length);
      const t = { quem: 'Ana', outro: 'Bram', predio: 'Taverna', oficio: 'lavradora', g: (_w: 'quem' | 'outro', m: string) => m };
      expect(def.text(t)).not.toMatch(/undefined|\$\{/);
      for (const c of def.choices) expect(c.label(t)).not.toMatch(/undefined|\$\{/);
    }
    expect(PETITIONS.length).toBeGreaterThanOrEqual(30);
  });
});

describe('desejos dos heróis (M6 F1)', () => {
  it('a festa cumpre o desejo: lealdade, ânimo e crônica', () => {
    const world = createWorld(21);
    world.town.treasury = 1e5;
    const h = heroInTown(world);
    h.loyalty = 50;
    h.morale = 50;
    expect(grantWish(world, h, 'festa', null)).toBe(true);
    expect(commands.holdFestival(world).ok).toBe(true);
    expect(h.wish).toBeNull();
    expect(h.loyalty).toBeGreaterThanOrEqual(50 + B.wishLoyalty);
    expect(world.chronicle.at(-1)!.kind).toBe('desejo');
    expect(world.metrics.wishes).toEqual({ made: 1, done: 1, failed: 0 });
  });

  it('desejo esquecido passa do prazo e tira ânimo', () => {
    const world = createWorld(22);
    const h = heroInTown(world);
    grantWish(world, h, 'festa', null);
    const until = h.wish!.untilDay;
    h.morale = 80;
    runDays(world, until - dayOf(world.tick) + 1);
    expect(h.wish ?? null).toBeNull();
    expect(world.metrics.wishes!.failed).toBe(1);
  });

  it('conversar com os dois no mesmo dia apresenta o par, e descer junto cumpre', () => {
    const world = createWorld(23);
    const a = heroInTown(world);
    const b = heroInTown(world);
    world.town.mayorEnergy = 4;
    expect(grantWish(world, a, 'juntos', b.id)).toBe(true);
    expect(commands.talk(world, a.id).ok).toBe(true);
    expect(wishPairBonus(a, b)).toBe(0);
    expect(commands.talk(world, b.id).ok).toBe(true);
    expect(a.wish!.paired).toBe(true);
    expect(wishPairBonus(a, b)).toBe(B.wishPairBonus);
  });

  it('a lápide nova cumpre o desejo de quem ficou, uma vez só', () => {
    const world = createWorld(24);
    world.town.treasury = 1000;
    const h = heroInTown(world);
    const dead = createHero(world);
    dead.status = 'dead';
    h.griefFor = dead.id;
    h.grief = 60;
    expect(grantWish(world, h, 'lapide', dead.id)).toBe(true);
    expect(commands.honorGrave(world, dead.id).ok).toBe(true);
    expect(dead.honoredGrave).toBe(true);
    expect(h.wish).toBeNull();
    expect(h.grief).toBeLessThanOrEqual(30);
    expect(commands.honorGrave(world, dead.id).ok).toBe(false);
  });

  it('a criança que treinou no campo chega à maioridade um nível à frente', () => {
    const world = createWorld(25);
    const mom = heroInTown(world);
    const child = { id: world.nextId++, name: 'Tito', gender: 'm' as const, parents: [mom.id, mom.id] as [number, number], bornDay: -16 * 160, trait: 'bravo' as const, classId: 'guardiao' as const, heirloom: null, apprentice: true };
    world.children.push(child);
    runDays(world, 1);
    const grown = world.heroes.find((h) => h.name === 'Tito');
    expect(grown?.level).toBe(2);
  });

  it('todo desejo tem textos sem buraco', () => {
    const t = { quem: 'Ana', alvo: 'Bram', onde: 'no andar 2 das Catacumbas', g: (_w: 'quem' | 'alvo', m: string) => m };
    for (const w of Object.values(WISHES)) for (const f of [w.text, w.how, w.done]) expect(f(t)).not.toMatch(/undefined|\$\{/);
  });

  it('petições e desejos sobrevivem ao save', () => {
    const world = createWorld(26);
    const h = heroInTown(world);
    grantWish(world, h, 'festa', null);
    runDays(world, 3);
    const back = deserialize(serialize(world));
    expect(back.heroes.find((x) => x.id === h.id)!.wish).toEqual(h.wish);
    expect(back.town.petitions).toEqual(world.town.petitions);
    expect(serialize(back)).toBe(serialize(world));
  });
});
