import { describe, expect, it } from 'vitest';
import {
  autoMayor,
  checksum,
  commands,
  createWorld,
  deserialize,
  runDays,
  runTicks,
  serialize,
  DAYS_PER_YEAR,
  TICKS_PER_DAY,
} from '../src/sim/index.ts';
import { startCombat, combatTick } from '../src/sim/combat.ts';
import { createHero } from '../src/sim/hero.ts';
import { formParties } from '../src/sim/party.ts';
import type { Party, World } from '../src/sim/index.ts';

const bot = { onHour: autoMayor };

describe('determinismo e save', () => {
  it('a mesma semente gera o mesmo mundo', () => {
    const a = createWorld(42);
    const b = createWorld(42);
    runDays(a, 60, bot);
    runDays(b, 60, bot);
    expect(checksum(a)).toBe(checksum(b));
  });

  it('sementes diferentes geram mundos diferentes', () => {
    const a = createWorld(1);
    const b = createWorld(2);
    runDays(a, 20, bot);
    runDays(b, 20, bot);
    expect(checksum(a)).not.toBe(checksum(b));
  });

  it('salvar e carregar no meio continua exatamente igual', () => {
    const straight = createWorld(7);
    runDays(straight, 120, bot);

    const split = createWorld(7);
    runDays(split, 50, bot);
    runTicks(split, 137, bot); // salva no meio de um dia, possivelmente no meio de um combate
    const loaded = deserialize(serialize(split));
    runTicks(loaded, 120 * TICKS_PER_DAY - 50 * TICKS_PER_DAY - 137, bot);

    expect(checksum(loaded)).toBe(checksum(straight));
  });

  it('recusa save de versão futura', () => {
    const world = createWorld(1);
    const json = serialize({ ...world, version: 999 });
    expect(() => deserialize(json)).toThrow(/versão/);
  });
});

describe('critérios do M0', () => {
  it.each([1, 2, 3, 4, 5])('semente %i: 10 anos sem impasse nem ócio prolongado', (seed) => {
    const world = createWorld(seed);
    runDays(world, 10 * DAYS_PER_YEAR, bot);
    const m = world.metrics;
    expect(m.stalemates).toBe(0);
    expect(m.longestIdleStreak).toBeLessThanOrEqual(4);
    expect(m.bossKills.length).toBeGreaterThanOrEqual(2);
    expect(m.deaths / 10).toBeLessThan(10);
    const last = m.daily[m.daily.length - 1]!;
    expect(last.roster).toBeGreaterThan(5);
    expect(Number.isFinite(world.town.treasury)).toBe(true);
    expect(world.town.treasury).toBeGreaterThanOrEqual(0);
  });

  it('todo herói tem estado consistente', () => {
    const world = createWorld(9);
    runDays(world, 3 * DAYS_PER_YEAR, bot);
    for (const h of world.heroes) {
      if (h.status === 'dead') {
        expect(h.death).not.toBeNull();
        expect(h.partyId === null || !world.parties.some((p) => p.memberIds.includes(h.id))).toBe(true);
      }
      if (h.status === 'expedition') {
        expect(world.parties.some((p) => p.id === h.partyId && p.memberIds.includes(h.id))).toBe(true);
      }
      expect(h.morale).toBeGreaterThanOrEqual(0);
      expect(h.morale).toBeLessThanOrEqual(100);
      expect(h.gold).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('formação de grupos', () => {
  it('um novato esperando no quadro não trava os veteranos (regressão: 39 dias de ócio)', () => {
    const world = createWorld(11);
    world.town.buildings.guilda = 1;
    const rookie = createHero(world);
    rookie.level = 1;
    const veterans = [createHero(world), createHero(world), createHero(world), createHero(world)];
    for (const v of veterans) {
      v.level = 25;
      v.rank = 'S';
    }
    rookie.activity = { kind: 'aguardar', startedAt: world.tick, endsAt: world.tick + 999 };
    rookie.lfgSince = world.tick - 20; // o mais antigo da fila
    for (const v of veterans) {
      v.activity = { kind: 'aguardar', startedAt: world.tick, endsAt: world.tick + 999 };
      v.lfgSince = world.tick;
    }
    formParties(world);
    expect(world.parties.length).toBeGreaterThan(0);
  });

  it('semente 6 joga 30 anos sem ócio prolongado', () => {
    const world = createWorld(6);
    runDays(world, 30 * DAYS_PER_YEAR, bot);
    expect(world.metrics.longestIdleStreak).toBeLessThanOrEqual(4);
    expect(world.metrics.stalemates).toBe(0);
  });
});

describe('combate', () => {
  function soloParty(world: World, heroIds: number[]): Party {
    for (const id of heroIds) world.heroes.find((h) => h.id === id)!.status = 'expedition';
    return {
      id: 999,
      memberIds: [...heroIds],
      startMemberIds: [...heroIds],
      act: 0,
      floor: 3,
      phase: 'combate',
      phaseEndsAt: 0,
      persistent: false,
      rooms: [],
      roomIndex: 0,
      retreating: false,
      combat: null,
      loot: { gold: 0, materials: {}, xp: 0 },
      contractId: null,
      rescued: 0,
      dead: [],
      recallRequested: false,
      outcome: null,
      startedTick: 0,
      confidence: 1,
      moments: [],
    };
  }

  it('uma clériga sozinha contra o chefe nunca trava o jogo (o loop infinito do jam)', () => {
    const world = createWorld(3);
    const cleric = createHero(world);
    cleric.classId = 'clerigo';
    cleric.level = 30;
    cleric.rank = 'S';
    cleric.gear = { weapon: 0, armor: 12 };
    cleric.hp = 99999;
    cleric.morale = 100;
    cleric.traits = [{ id: 'bravo', revealed: true }];
    const party = soloParty(world, [cleric.id]);
    party.combat = startCombat(world, party, { kind: 'chefe', cleared: false, remainsOf: null });
    let result = 'andamento';
    let ticks = 0;
    while (result === 'andamento' && ticks < 5000) {
      result = combatTick(world, party);
      ticks++;
    }
    expect(result).not.toBe('andamento');
    expect(ticks).toBeLessThan(5000);
  });

  it('o sino de retirada tira o grupo do combate', () => {
    const world = createWorld(4);
    const heroes = [createHero(world), createHero(world), createHero(world)];
    for (const h of heroes) h.traits = [{ id: 'leal', revealed: true }];
    const party = soloParty(world, heroes.map((h) => h.id));
    party.combat = startCombat(world, party, { kind: 'chefe', cleared: false, remainsOf: null });
    party.recallRequested = true;
    let result = 'andamento';
    for (let i = 0; i < 400 && result === 'andamento'; i++) result = combatTick(world, party);
    expect(party.retreating).toBe(true);
    expect(result).not.toBe('andamento');
  });
});

describe('comandos do prefeito', () => {
  it('o primeiro berrante é grátis e traz recrutas', () => {
    const world = createWorld(1);
    const before = world.town.treasury;
    expect(commands.blowHorn(world)).toEqual({ ok: true });
    expect(world.town.treasury).toBe(before);
    expect(world.town.arrivals.length).toBeGreaterThan(0);
    expect(commands.blowHorn(world).ok).toBe(false); // recarga
  });

  it('construir cobra e sobe o nível; sem ouro, recusa', () => {
    const world = createWorld(1);
    expect(commands.build(world, 'estalagem')).toEqual({ ok: true });
    expect(world.town.buildings.estalagem).toBe(1);
    world.town.treasury = 0;
    expect(commands.build(world, 'ferreiro').ok).toBe(false);
  });

  it('contrato exige guilda, separa a recompensa e devolve ao cancelar', () => {
    const world = createWorld(1);
    expect(commands.postContract(world, 0, 0, 50).ok).toBe(false);
    world.town.buildings.guilda = 1;
    const before = world.town.treasury;
    expect(commands.postContract(world, 0, 0, 50)).toEqual({ ok: true });
    expect(world.town.treasury).toBe(before - 50);
    const id = world.town.contracts[0]!.id;
    expect(commands.cancelContract(world, id)).toEqual({ ok: true });
    expect(world.town.treasury).toBe(before);
  });

  it('dispensar só funciona na vila', () => {
    const world = createWorld(1);
    const hero = createHero(world);
    expect(commands.dismiss(world, hero.id)).toEqual({ ok: true });
    expect(hero.status).toBe('left');
    expect(commands.dismiss(world, hero.id).ok).toBe(false);
  });
});

describe('crônica', () => {
  it('registra mortes, conquistas e chegadas com datas', () => {
    const world = createWorld(5);
    runDays(world, 2 * DAYS_PER_YEAR, bot);
    const kinds = new Set(world.chronicle.map((e) => e.kind));
    for (const k of ['chegada', 'partida', 'retorno', 'conquista', 'chefe']) expect(kinds.has(k as never)).toBe(true);
    expect(world.chronicle.every((e) => e.text.length > 0 && !e.text.includes('undefined'))).toBe(true);
  });
});
