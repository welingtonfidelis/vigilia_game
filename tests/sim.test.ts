import { describe, expect, it } from 'vitest';
import {
  autoMayor,
  BALANCE,
  checksum,
  commands,
  createWorld,
  deserialize,
  citizenTaxesPerDay,
  festivalCost,
  guardSalaryPerDay,
  heroCapacity,
  honorFuneral,
  maybeSeasonalEvent,
  resolveSeasonalEvent,
  pensionPerDay,
  populationCap,
  runDays,
  runTicks,
  serialize,
  totalBuildingLevels,
  dayOf,
  DAYS_PER_SEASON,
  DAYS_PER_YEAR,
  SAVE_VERSION,
  TICKS_PER_DAY,
} from '../src/sim/index.ts';
import { startCombat, combatTick } from '../src/sim/combat.ts';
import { addBond, createHero, getBond } from '../src/sim/hero.ts';
import { dailyEconomy } from '../src/sim/economy.ts';
import { citizenMood, dailyCitizens, syncCitizenRoster } from '../src/sim/citizens.ts';
import { defensePower, resolveRaid } from '../src/sim/raids.ts';
import { dailyPeople, epitaph, maybeInjure } from '../src/sim/people.ts';
import { scoreActivities, updateTownHeroes } from '../src/sim/town.ts';
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
    // A Fase B mexe no fluxo do RNG; o teto segue barrando espiral de mortes.
    expect(m.deaths / 10).toBeLessThan(12);
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

  // Campanha inteira: ~2 s aqui, mais de 5 s no servidor do GitHub; o prazo padrão não basta.
  it('semente 6 joga 30 anos sem ócio prolongado', () => {
    const world = createWorld(6);
    runDays(world, 30 * DAYS_PER_YEAR, bot);
    expect(world.metrics.longestIdleStreak).toBeLessThanOrEqual(4);
    expect(world.metrics.stalemates).toBe(0);
  }, 30_000);
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

describe('pessoas (M2)', () => {
  const dayStart = (world: World, day: number) => {
    world.tick = day * TICKS_PER_DAY;
  };

  it('energia do prefeito: uma conversa por herói por dia, e ela acaba e recarrega', () => {
    const world = createWorld(21);
    const heroes = [createHero(world), createHero(world), createHero(world), createHero(world), createHero(world)];
    const before = heroes[0]!.loyalty;
    expect(commands.talk(world, heroes[0]!.id)).toEqual({ ok: true });
    expect(heroes[0]!.loyalty).toBeGreaterThan(before);
    expect(commands.talk(world, heroes[0]!.id).ok).toBe(false); // mesmo dia
    for (const h of heroes.slice(1, 4)) commands.talk(world, h.id);
    expect(world.town.mayorEnergy).toBe(0);
    expect(commands.talk(world, heroes[4]!.id).ok).toBe(false); // sem energia
    dayStart(world, dayOf(world.tick) + 1);
    dailyPeople(world);
    expect(world.town.mayorEnergy).toBe(4);
  });

  it('presentes custam ouro e agradam mais a quem gosta; arma respeita o ferreiro', () => {
    const world = createWorld(22);
    const fan = createHero(world);
    fan.traits = [{ id: 'beberrao', revealed: true }];
    const plain = createHero(world);
    plain.traits = [{ id: 'leal', revealed: true }];
    fan.morale = plain.morale = 40;
    const gold = world.town.treasury;
    commands.gift(world, fan.id, 'bebida');
    commands.gift(world, plain.id, 'bebida');
    expect(world.town.treasury).toBe(gold - 20);
    expect(fan.morale).toBeGreaterThan(plain.morale);
    expect(commands.gift(world, plain.id, 'arma').ok).toBe(false); // ferreiro em ruína
  });

  it('consolar só com luto; discurso uma vez por dia', () => {
    const world = createWorld(23);
    const a = createHero(world);
    createHero(world);
    expect(commands.comfort(world, a.id).ok).toBe(false);
    a.grief = 60;
    expect(commands.comfort(world, a.id)).toEqual({ ok: true });
    expect(a.grief).toBeLessThan(60);
    expect(commands.speech(world)).toEqual({ ok: true });
    expect(commands.speech(world).ok).toBe(false);
  });

  it('renomear e aposentar com função', () => {
    const world = createWorld(24);
    const h = createHero(world);
    h.classId = 'guardiao';
    expect(commands.rename(world, h.id, 'X').ok).toBe(false);
    expect(commands.rename(world, h.id, '  Velho   Bram ')).toEqual({ ok: true });
    expect(h.name).toBe('Velho Bram');
    expect(commands.retire(world, h.id)).toEqual({ ok: true });
    expect(h.status).toBe('retired');
    expect(h.retiredRole).toBe('mentor');
    expect(commands.assignRole(world, h.id, 'ferreiro')).toEqual({ ok: true });
    expect(h.retiredRole).toBe('ferreiro');
  });

  it('lesão: herói por um fio se fere, não desce, perde atributo e sara com o tempo', () => {
    const world = createWorld(25);
    const heroes = Array.from({ length: 20 }, () => createHero(world));
    for (const h of heroes) maybeInjure(world, h, 0.05, 'do andar 1 das Catacumbas');
    const hurt = heroes.find((h) => h.injury);
    expect(hurt).toBeDefined();
    expect(heroes.filter((h) => h.injury).length).toBeLessThan(20); // é chance, não certeza
    const fine = heroes.find((h) => !h.injury)!;
    maybeInjure(world, fine, 0.5, 'x');
    expect(fine.injury).toBeNull(); // vida acima de 15%: nada
    const kinds = scoreActivities(world, hurt!).map(([k]) => k);
    expect(kinds).toContain('tratar');
    expect(kinds).not.toContain('aguardar');
    for (let d = 1; d <= 30 && hurt!.injury; d++) {
      dayStart(world, d);
      dailyPeople(world);
    }
    expect(hurt!.injury).toBeNull();
  });

  it('casamento, filho e maioridade: o filho herda traço e conhece os pais', () => {
    const world = createWorld(26);
    world.town.buildings.estalagem = 1;
    const [a, b] = [createHero(world), createHero(world)];
    addBond(world, a, b, 100);
    for (let s = 1; s <= 40 && a.partnerId === null; s++) {
      dayStart(world, s * DAYS_PER_SEASON);
      dailyPeople(world);
    }
    expect(a.partnerId).toBe(b.id);
    expect(b.partnerId).toBe(a.id);
    for (let s = 41; s <= 200 && world.children.length === 0; s++) {
      dayStart(world, s * DAYS_PER_SEASON);
      dailyPeople(world);
    }
    const child = world.children[0]!;
    expect(child.parents).toEqual(expect.arrayContaining([a.id, b.id]));
    child.bornDay = dayOf(world.tick) - 16 * DAYS_PER_YEAR;
    dailyPeople(world);
    const grown = world.heroes.find((h) => h.name === child.name && h.parents.length === 2)!;
    expect(grown).toBeDefined();
    expect(grown.traits[0]!.id).toBe(child.trait);
    expect(getBond(world, grown.id, a.id)).toBeGreaterThanOrEqual(60);
    expect(world.chronicle.some((e) => e.kind === 'maioridade')).toBe(true);
  });

  it('epitáfio conta o feito, como caiu e quem fica', () => {
    const world = createWorld(27);
    const [h, partner] = [createHero(world), createHero(world)];
    h.partnerId = partner.id;
    partner.partnerId = h.id;
    h.deeds.push({ tick: 1, kind: 'chefe', text: 'deu o golpe final no Guardião das Urnas' });
    h.status = 'dead';
    h.death = { tick: 1, where: 'andar 4 das Catacumbas', by: 'Esqueleto' };
    const text = epitaph(world, h);
    expect(text).toContain(h.name);
    expect(text).toContain('Guardião das Urnas');
    expect(text).toContain('andar 4 das Catacumbas');
    expect(text).toContain(`Deixa ${partner.name}`);
  });

  it('epitáfio sem erro de concordância', () => {
    const world = createWorld(30);
    const slayer = createHero(world);
    slayer.stats.kills = 104;
    slayer.deeds.push({ tick: 1, kind: 'matador', text: '100 inimigos abatidos' });
    slayer.status = 'dead';
    slayer.death = { tick: 1, where: 'andar 1 das Minas Inundadas', by: 'Golem' };
    expect(epitaph(world, slayer)).toContain('Abateu 104 inimigos.');
    const rookie = createHero(world);
    rookie.stats.expeditions = 1;
    rookie.stats.kills = 1;
    rookie.status = 'dead';
    rookie.death = { tick: 1, where: 'andar 1 das Catacumbas', by: 'Rato' };
    const text = epitaph(world, rookie);
    expect(text).toContain('1 descida, 1 inimigo abatido.');
    expect(text).not.toMatch(/\b1 descidas|\b1 inimigos/);
  });

  it('aposentados velhos morrem em paz e ganham epitáfio', () => {
    const world = createWorld(28);
    const old = createHero(world);
    commands.retire(world, old.id);
    old.bornDay = -80 * DAYS_PER_YEAR;
    for (let y = 1; y <= 40 && old.status !== 'dead'; y++) {
      dayStart(world, y * DAYS_PER_YEAR);
      dailyPeople(world);
    }
    expect(old.status).toBe('dead');
    expect(old.death?.by).toBe('velhice');
    expect(old.epitaph).toContain('velhice');
  });

  it('save da versão 1 carrega com os campos do M2 e epitáfio para os mortos', () => {
    const world = createWorld(29);
    runDays(world, 2 * DAYS_PER_YEAR, bot);
    const v1 = JSON.parse(serialize(world));
    v1.version = 1;
    delete v1.children;
    delete v1.town.mayorEnergy;
    delete v1.town.speechDay;
    delete v1.town.festivalDay;
    delete v1.town.popGrowth;
    delete v1.town.lastRaidDay;
    delete v1.town.buildings.casa;
    delete v1.citizens;
    delete v1.raids;
    for (const k of ['injuries', 'scars', 'marriages', 'births', 'comeOfAge', 'oldAgeDeaths', 'raids', 'citizenDeaths', 'citizensLeft']) delete v1.metrics[k];
    for (const h of v1.heroes) for (const k of ['injury', 'scars', 'partnerId', 'parents', 'retiredRole', 'lastTalkDay', 'epitaph']) delete h[k];
    const loaded = deserialize(JSON.stringify(v1));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.town.buildings.casa).toBe(0);
    expect(loaded.town.festivalDay).toBe(-1);
    expect(loaded.children).toEqual([]);
    expect(loaded.heroes.every((h) => Array.isArray(h.scars) && h.injury === null)).toBe(true);
    const dead = loaded.heroes.filter((h) => h.status === 'dead');
    expect(dead.every((h) => typeof h.epitaph === 'string' && h.epitaph.length > 0)).toBe(true);
    runDays(loaded, 30, bot); // e o jogo segue
    expect(loaded.metrics.stalemates).toBe(0);
  });
});

describe('economia da vila (Fase A)', () => {
  it('a festa custa ouro, levanta a vila e respeita a carência', () => {
    const world = createWorld(31);
    const a = createHero(world);
    const b = createHero(world);
    a.morale = b.morale = 40;
    a.loyalty = b.loyalty = 50;
    world.town.treasury = 5000;
    const cost = festivalCost(world);
    expect(commands.holdFestival(world)).toEqual({ ok: true });
    expect(world.town.treasury).toBe(5000 - cost);
    expect(a.morale).toBe(40 + BALANCE.festivalMorale);
    expect(b.loyalty).toBe(50 + BALANCE.festivalLoyalty);
    expect(world.town.reputation).toBe(BALANCE.festivalReputation);
    expect(world.chronicle.some((e) => e.kind === 'festival')).toBe(true);
    // Carência: a festa seguinte só depois de dez dias.
    expect(commands.holdFestival(world).ok).toBe(false);
    world.tick += BALANCE.festivalCooldownDays * TICKS_PER_DAY;
    expect(commands.holdFestival(world)).toEqual({ ok: true });
  });

  it('sem ouro ou sem herói na vila, a festa é recusada', () => {
    const world = createWorld(32);
    expect(commands.holdFestival(world).ok).toBe(false); // vila vazia
    createHero(world);
    world.town.treasury = 0;
    expect(commands.holdFestival(world).ok).toBe(false); // sem ouro
    expect(world.town.festivalDay).toBe(-1);
  });

  it('cada aposentado custa uma pensão por dia no tesouro', () => {
    const world = createWorld(33);
    const hero = createHero(world);
    expect(pensionPerDay(world)).toBe(0);
    commands.retire(world, hero.id);
    expect(pensionPerDay(world)).toBeCloseTo(BALANCE.pensionPerRetiredPerDay);
    const before = world.town.treasury;
    dailyEconomy(world);
    const tax = citizenTaxesPerDay(world);
    const expected =
      before +
      tax -
      totalBuildingLevels(world) * BALANCE.upkeepPerLevelPerDay -
      pensionPerDay(world) -
      guardSalaryPerDay(world);
    expect(world.town.treasury).toBeCloseTo(Math.max(0, expected), 5);
  });

  it('cada guarda custa um salário diário no tesouro', () => {
    const world = createWorld(37);
    const guards = world.citizens.filter((c) => c.job === 'guarda').length;
    expect(guards).toBeGreaterThan(0);
    expect(guardSalaryPerDay(world)).toBeCloseTo(guards * BALANCE.guardSalaryPerDay);
    const before = world.town.treasury;
    dailyEconomy(world);
    expect(world.town.treasury).toBeCloseTo(
      Math.max(0, before + citizenTaxesPerDay(world) - totalBuildingLevels(world) * BALANCE.upkeepPerLevelPerDay - pensionPerDay(world) - guardSalaryPerDay(world)),
      5,
    );
  });

  it('a taxa de guerra aumenta o imposto e custa humor', () => {
    const world = createWorld(38);
    const tax = citizenTaxesPerDay(world);
    expect(commands.toggleDecree(world, 'taxa-guerra')).toEqual({ ok: true });
    expect(world.town.decrees).toEqual(['taxa-guerra']);
    expect(citizenTaxesPerDay(world)).toBeCloseTo(tax * 1.25);
    const afterEnact = world.town.treasury;
    dailyEconomy(world);
    const expected =
      afterEnact +
      tax * 1.25 -
      totalBuildingLevels(world) * BALANCE.upkeepPerLevelPerDay -
      pensionPerDay(world) -
      guardSalaryPerDay(world);
    expect(world.town.treasury).toBeCloseTo(Math.max(0, expected), 5);
    const mood = citizenMood(world);
    dailyCitizens(world);
    expect(citizenMood(world)).toBeLessThan(mood);
  });

  it('o toque de recolher aumenta a defesa e limita a dois decretos', () => {
    const world = createWorld(39);
    const before = defensePower(world);
    expect(commands.toggleDecree(world, 'toque-recolher')).toEqual({ ok: true });
    expect(defensePower(world)).toBe(Math.round(before * 1.2));
    expect(commands.toggleDecree(world, 'funeral-honras').ok).toBe(true);
    expect(commands.toggleDecree(world, 'taxa-guerra').ok).toBe(false);
    expect(world.town.decrees.length).toBe(2);
  });

  it('funeral com honras gasta ouro, alivia o luto e levanta o humor', () => {
    const world = createWorld(40);
    const dead = createHero(world);
    const mourner = createHero(world);
    dead.status = 'dead';
    mourner.grief = 40;
    for (const c of world.citizens) c.happiness = 50;
    world.town.treasury = 100;
    expect(commands.toggleDecree(world, 'funeral-honras')).toEqual({ ok: true });
    const before = world.town.treasury;
    expect(honorFuneral(world, dead)).toBe(true);
    expect(world.town.treasury).toBe(before - 25);
    expect(mourner.grief).toBe(30);
    expect(world.citizens[0]!.happiness).toBe(52);
  });

  it('a virada de estação abre um evento sazonal e a escolha aplica o efeito', () => {
    const world = createWorld(47);
    world.tick = 2 * DAYS_PER_SEASON * TICKS_PER_DAY;
    maybeSeasonalEvent(world);
    expect(world.town.event?.id).toBe('festival-colheita');
    expect(world.chronicle.some((e) => e.kind === 'evento')).toBe(true);
    world.town.treasury = 1000;
    for (const c of world.citizens) c.happiness = 50;
    const before = world.town.treasury;
    expect(resolveSeasonalEvent(world, 'financiar')).toEqual({ ok: true });
    expect(world.town.treasury).toBe(before - 50);
    expect(world.town.event).toBeNull();
    expect(world.citizens[0]!.happiness).toBe(58);
  });

  it('peste, eclipse e visita lendária entram no rodízio sazonal', () => {
    const world = createWorld(53);
    world.town.event = { id: 'peste', year: 1, season: 1, tick: 0 };
    world.town.treasury = 100;
    for (const c of world.citizens) c.happiness = 50;
    const before = world.town.treasury;
    expect(resolveSeasonalEvent(world, 'tratar')).toEqual({ ok: true });
    expect(world.town.treasury).toBe(before - 60);
    expect(world.citizens[0]!.happiness).toBe(55);

    world.town.event = { id: 'eclipse', year: 1, season: 1, tick: 0 };
    const corruption = world.acts[0]!.corruption;
    expect(resolveSeasonalEvent(world, 'observar')).toEqual({ ok: true });
    expect(world.acts[0]!.corruption).toBeGreaterThan(corruption);

    world.town.event = { id: 'visita-lendaria', year: 2, season: 3, tick: 0 };
    world.town.treasury = 200;
    const reputation = world.town.reputation;
    expect(resolveSeasonalEvent(world, 'hospedar')).toEqual({ ok: true });
    expect(world.town.reputation).toBeGreaterThan(reputation);
  });

  it('a caravana troca ouro por materiais dos atos abertos', () => {
    const world = createWorld(48);
    world.tick = 0;
    world.town.event = { id: 'caravana', year: 1, season: 0, tick: 0 };
    world.town.treasury = 100;
    const bones = world.town.materials.ossos;
    expect(resolveSeasonalEvent(world, 'materiais')).toEqual({ ok: true });
    expect(world.town.treasury).toBe(60);
    expect(world.town.materials.ossos).toBe(bones + 6);
    expect(world.town.event).toBeNull();
  });

  it('a expansão sul abre lotes, constrói casas e aumenta a capacidade', () => {
    const world = createWorld(50);
    world.town.treasury = 500;
    const cap = populationCap(world);
    const heroes = heroCapacity(world);
    expect(commands.clearSouthExpansion(world)).toEqual({ ok: true });
    expect(world.town.expansion.cleared).toBe(true);
    expect(world.town.treasury).toBe(500 - BALANCE.expansionClearCost);
    expect(commands.buildExpansionHouse(world, 0)).toEqual({ ok: true });
    expect(world.town.expansion.houses[0]).toBe(true);
    expect(world.town.treasury).toBe(500 - BALANCE.expansionClearCost - BALANCE.expansionHouseCost);
    expect(populationCap(world)).toBe(cap + BALANCE.expansionHouseCapacity);
    expect(heroCapacity(world)).toBe(heroes + BALANCE.expansionHouseHeroSlots);
    expect(commands.buildExpansionHouse(world, 0).ok).toBe(false);
    expect(commands.buildExpansionHouse(world, 1)).toEqual({ ok: true });
    expect(world.town.expansion.houses.filter(Boolean)).toHaveLength(2);
  });



  it('a fonte termal cura vida, ânimo, luto e lesão', () => {
    const world = createWorld(36);
    const hero = createHero(world);
    hero.hp = 10;
    hero.morale = 20;
    hero.grief = 40;
    hero.injury = { kind: 'perna', daysLeft: 4, total: 10 };
    hero.activity = { kind: 'termas', startedAt: world.tick, endsAt: world.tick - 1 };
    updateTownHeroes(world);
    expect(hero.hp).toBeGreaterThan(10);
    expect(hero.morale).toBe(32);
    expect(hero.grief).toBe(32);
    expect(hero.injury!.daysLeft).toBeCloseTo(3.5);
  });

  it('quem tem fortuna deixa uma oferta no templo', () => {    const world = createWorld(34);
    const hero = createHero(world);
    hero.gold = 1000;
    const before = world.town.treasury;
    hero.activity = { kind: 'rezar', startedAt: world.tick, endsAt: world.tick - 1 };
    updateTownHeroes(world);
    expect(world.town.treasury - before).toBeGreaterThanOrEqual(50);
    expect(hero.gold).toBeLessThan(950);
    expect(world.chronicle.some((e) => e.kind === 'doacao')).toBe(true);
  });

  it('save da versão 2 ganha a data da festa ao carregar', () => {
    const world = createWorld(35);
    const v2 = JSON.parse(serialize(world));
    v2.version = 2;
    delete v2.town.festivalDay;
    delete v2.town.popGrowth;
    delete v2.town.lastRaidDay;
    delete v2.citizens;
    delete v2.raids;
    for (const k of ['raids', 'citizenDeaths', 'citizensLeft']) delete v2.metrics[k];
    const loaded = deserialize(JSON.stringify(v2));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.town.festivalDay).toBe(-1);
    expect(loaded.town.lastRaidDay).toBe(-1);
    expect(loaded.citizens.length).toBeGreaterThan(0);
  });
});


describe('vila e incursões (M3)', () => {
  it('a vila começa com moradores nomeados, ofícios e humor', () => {
    const world = createWorld(40);
    expect(world.citizens.length).toBe(BALANCE.citizenStart);
    expect(world.citizens.every((c) => c.name.length > 0 && c.job)).toBe(true);
    expect(world.citizens.some((c) => c.job === 'guarda')).toBe(true);
    expect(citizenMood(world)).toBeGreaterThan(40);
    expect(world.town.population).toBe(10);
  });

  it('a população cresce e ganha moradores nomeados até o teto do elenco', () => {
    const world = createWorld(41);
    world.town.population = 100;
    syncCitizenRoster(world);
    expect(world.citizens.length).toBe(BALANCE.citizenRoster);
    expect(world.citizens.filter((c) => c.job === 'guarda').length).toBeGreaterThan(1);
    dailyCitizens(world);
    expect(world.citizens.length).toBe(BALANCE.citizenRoster);
  });

  it('heróis fortes em casa repelem a incursão sem dano', () => {
    const world = createWorld(42);
    for (let i = 0; i < 6; i++) {
      const hero = createHero(world);
      hero.level = 30;
      hero.rank = 'S';
      hero.hp = 9999;
      hero.status = 'town';
    }
    const before = world.town.population;
    expect(defensePower(world)).toBeGreaterThan(100);
    const raid = resolveRaid(world, 0, 60);
    expect(raid.outcome).toBe('repelido');
    expect(raid.citizenLoss).toBe(0);
    expect(raid.goldLost).toBe(0);
    expect(world.town.population).toBe(before);
    expect(world.chronicle.some((e) => e.kind === 'incursao')).toBe(true);
  });

  it('uma vila sem defesa é saqueada: prédio cai, moradores morrem e ouro some', () => {
    const world = createWorld(43);
    world.town.treasury = 1000;
    const raid = resolveRaid(world, 5, 100);
    expect(raid.outcome).toBe('saque');
    expect(raid.power).toBeGreaterThan(raid.defense);
    expect(world.town.treasury).toBeLessThan(1000);
    expect(world.town.population).toBeLessThan(10);
    expect(world.raids).toHaveLength(1);
    expect(world.metrics.raids).toBe(1);
    expect(world.metrics.citizenDeaths).toBeGreaterThan(0);
    expect(world.chronicle.some((e) => e.kind === 'incursao')).toBe(true);
  });

  it('save v7 carrega na versão atual', () => {
    const world = createWorld(51);
    const v7 = JSON.parse(serialize(world));
    v7.version = 7;
    const loaded = deserialize(JSON.stringify(v7));
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it('save v6 ganha a expansão sul vazia ao carregar', () => {
    const world = createWorld(49);
    const v6 = JSON.parse(serialize(world));
    v6.version = 6;
    delete v6.town.expansion;
    const loaded = deserialize(JSON.stringify(v6));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.town.expansion).toEqual({ cleared: false, houses: [false, false, false] });
  });

  it('save v5 ganha evento sazonal vazio ao carregar', () => {
    const world = createWorld(46);
    const v5 = JSON.parse(serialize(world));
    v5.version = 5;
    delete v5.town.event;
    delete v5.town.lastEventKey;
    const loaded = deserialize(JSON.stringify(v5));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.town.event).toBeNull();
    expect(loaded.town.lastEventKey).toBe('');
  });

  it('save v4 ganha a lista de decretos ao carregar', () => {
    const world = createWorld(45);
    const v4 = JSON.parse(serialize(world));
    v4.version = 4;
    delete v4.town.decrees;
    const loaded = deserialize(JSON.stringify(v4));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.town.decrees).toEqual([]);
  });

  it('save v3 ganha moradores e campos de incursão ao carregar', () => {
    const world = createWorld(44);
    const v3 = JSON.parse(serialize(world));
    v3.version = 3;
    delete v3.citizens;
    delete v3.raids;
    delete v3.town.popGrowth;
    delete v3.town.lastRaidDay;
    for (const k of ['raids', 'citizenDeaths', 'citizensLeft']) delete v3.metrics[k];
    const loaded = deserialize(JSON.stringify(v3));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.citizens.length).toBe(BALANCE.citizenStart);
    expect(loaded.raids).toEqual([]);
    expect(loaded.town.lastRaidDay).toBe(-1);
  });
});

describe('registro de golpes do combate (para a tela)', () => {
  it('registra quem atacou quem, com teto, mortes marcadas e uids válidos', () => {
    const world = createWorld(41);
    let checked = 0;
    for (let i = 0; i < 40 * TICKS_PER_DAY && checked < 3; i++) {
      runTicks(world, 1, bot);
      for (const party of world.parties) {
        const c = party.combat;
        if (!c || !c.log || c.log.length < 10) continue;
        const uids = new Set(c.units.map((u) => u.uid));
        expect(c.log.length).toBeLessThanOrEqual(40);
        for (const e of c.log) {
          expect(uids.has(e.from)).toBe(true);
          expect(uids.has(e.to)).toBe(true);
          expect(['hit', 'heal', 'blast']).toContain(e.kind);
          if (e.kill) expect(c.units.find((u) => u.uid === e.to)!.alive).toBe(false);
        }
        const ns = c.log.map((e) => e.n);
        expect([...ns].sort((a, b) => a - b)).toEqual(ns);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
