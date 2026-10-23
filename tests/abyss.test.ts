import { describe, expect, it } from 'vitest';
import { autoMayor, BIOMES, commands, createWorld, runDays, TICKS_PER_DAY, TICKS_PER_HOUR } from '../src/sim/index.ts';
import type { Combat, DimRuleId, Party, Passage, Spot, World } from '../src/sim/index.ts';
import { BALANCE as B } from '../src/sim/config.ts';
import {
  abyssPressure,
  availableBiomes,
  BIOME_NORM,
  closePassages,
  dailyPressure,
  floorRng,
  generatePassage,
  generateRooms,
  isGuardianFloor,
  makeEnemy,
  openPassage,
  passageFloors,
  spawnRoom,
  spotOf,
  travelTicks,
} from '../src/sim/dungeon.ts';
import { chooseTarget } from '../src/sim/party.ts';
import { createHero } from '../src/sim/hero.ts';

const combat = (): Combat => ({ units: [], ticks: 0, enraged: false, isBoss: false, bossMech: null, mechCd: 0, echoesSpawned: false, nextUid: 1 });
const spot = (rules: DimRuleId[] = [], over: Partial<Spot> = {}): Spot => ({ passageId: -1, level: 1, biome: 0, rules, floor: 0, ...over });

describe('abismo das dimensões: gerador', () => {
  it('mesma semente, mesmo mundo: bioma, regras, andares e salas', () => {
    const a = generatePassage(1, 12345, 6, 0);
    const b = generatePassage(2, 12345, 6, 0);
    expect({ biome: a.biome, rules: a.rules, floors: a.floors }).toEqual({ biome: b.biome, rules: b.rules, floors: b.floors });
    for (let f = 0; f < a.floors; f++) expect(generateRooms(floorRng(a, f), a, f)).toEqual(generateRooms(floorRng(b, f), b, f));
    const other = generatePassage(3, 54321, 6, 0);
    const differs = other.biome !== a.biome || other.rules.join() !== a.rules.join() || generateRooms(floorRng(other, 0), other, 0).length !== generateRooms(floorRng(a, 0), a, 0).length;
    expect(differs).toBe(true);
  });

  it('andares por nível: 3 no nível 1, um a mais a cada 3 níveis, até 6', () => {
    expect(passageFloors(1)).toBe(3);
    expect(passageFloors(3)).toBe(3);
    expect(passageFloors(4)).toBe(4);
    expect(passageFloors(7)).toBe(5);
    expect(passageFloors(10)).toBe(6);
    expect(passageFloors(40)).toBe(6);
  });

  it('os biomas se abrem com o nível, e a passagem nova só sorteia os liberados', () => {
    expect(availableBiomes(1)).toEqual([0, 1]);
    expect(availableBiomes(7)).toEqual([0, 1, 2, 3, 4, 5]);
    for (let seed = 1; seed < 60; seed++) expect(availableBiomes(1)).toContain(generatePassage(seed, seed * 7919, 1, 0).biome);
  });

  it('o último andar termina no guardião da passagem', () => {
    const p = generatePassage(1, 99, 4, 0);
    const last = p.floors - 1;
    expect(isGuardianFloor(p, last)).toBe(true);
    expect(generateRooms(floorRng(p, last), p, last).at(-1)!.kind).toBe('guardiao');
    expect(generateRooms(floorRng(p, 0), p, 0).some((r) => r.kind === 'guardiao')).toBe(false);
  });

  it('cada bioma tem a mesma ameaça média: o bioma muda o jeito, não a força', () => {
    for (let i = 0; i < BIOMES.length; i++) {
      const avg = BIOMES[i]!.enemies.reduce((s, e) => s + e.hp * (1 + e.def / 100) * ((e.atk * 10) / e.interval), 0) / BIOMES[i]!.enemies.length;
      const base = BIOMES[0]!.enemies.reduce((s, e) => s + e.hp * (1 + e.def / 100) * ((e.atk * 10) / e.interval), 0) / BIOMES[0]!.enemies.length;
      expect(avg * BIOME_NORM[i]! ** 2).toBeCloseTo(base, 3);
    }
  });
});

describe('abismo das dimensões: regras', () => {
  const world = createWorld(7);
  const def = BIOMES[0]!.enemies[0]!;

  it('névoa corta o crítico pela metade', () => {
    expect(makeEnemy(world, combat(), def, spot(['nevoa'])).crit).toBeCloseTo(makeEnemy(world, combat(), def, spot()).crit / 2);
  });

  it('maré deixa a descida 1 hora mais longa e os monstros mais lentos', () => {
    expect(travelTicks(spot(['mare'])) - travelTicks(spot())).toBe(TICKS_PER_HOUR);
    expect(makeEnemy(world, combat(), def, spot(['mare'])).interval).toBeGreaterThan(makeEnemy(world, combat(), def, spot()).interval);
  });

  it('calor da forja deixa os monstros mais fortes', () => {
    expect(makeEnemy(world, combat(), def, spot(['calor'])).atk).toBeCloseTo(makeEnemy(world, combat(), def, spot()).atk * 1.2);
  });

  it('ganância traz mais baús e elites', () => {
    const count = (rules: DimRuleId[]) => {
      let n = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const p = { ...generatePassage(seed, seed, 1, 0), rules };
        n += generateRooms(floorRng(p, 1), p, 1).filter((r) => r.kind === 'bau' || r.kind === 'elite').length;
      }
      return n;
    };
    expect(count(['ganancia'])).toBeGreaterThan(count([]) * 1.2);
  });

  it('lua de sangue faz o elite vampírico aparecer mais', () => {
    const vampires = (rules: DimRuleId[]) => {
      const w = createWorld(11);
      let n = 0;
      for (let i = 0; i < 300; i++) n += spawnRoom(w, combat(), { kind: 'elite', cleared: false, remainsOf: null }, spot(rules)).filter((u) => u.affixes.includes('vampirico')).length;
      return n;
    };
    expect(vampires(['luaSangue'])).toBeGreaterThan(vampires([]) * 1.3);
  });

  it('ecos trazem heróis mortos de volta no meio das matilhas', () => {
    const w = createWorld(13);
    const lost = createHero(w);
    lost.status = 'dead';
    let echoes = 0;
    for (let i = 0; i < 100; i++) echoes += spawnRoom(w, combat(), { kind: 'matilha', cleared: false, remainsOf: null }, spot(['ecos'])).filter((u) => u.name === `Eco de ${lost.name}`).length;
    expect(echoes).toBeGreaterThan(10);
    let none = 0;
    for (let i = 0; i < 100; i++) none += spawnRoom(w, combat(), { kind: 'matilha', cleared: false, remainsOf: null }, spot()).filter((u) => u.name.startsWith('Eco de')).length;
    expect(none).toBe(0);
  });

  it('o guardião é o mais forte do bioma, com afixos e acólitos', () => {
    const units = spawnRoom(createWorld(3), combat(), { kind: 'guardiao', cleared: false, remainsOf: null }, spot([], { biome: 1 }));
    const guardian = units[0]!;
    expect(guardian.tags).toContain('guardian');
    expect(guardian.affixes.length).toBe(2);
    expect(guardian.name).toMatch(/^Golem de Ferro-negro Guardião/);
    expect(units).toHaveLength(1 + B.guardianAdds);
  });
});

describe('abismo das dimensões: passagens e pressão', () => {
  function withPassage(): { world: World; passage: Passage } {
    const world = createWorld(21);
    const passage = openPassage(world);
    passage.discovered = true;
    return { world, passage };
  }

  it('a pressão é de cada passagem e a vila sente a maior', () => {
    const { world, passage } = withPassage();
    const other = openPassage(world);
    passage.pressure = 40;
    other.pressure = 70;
    expect(abyssPressure(world)).toBe(70);
    other.sealed = true;
    expect(abyssPressure(world)).toBe(40);
    dailyPressure(world);
    expect(passage.pressure).toBeGreaterThan(40);
  });

  it('a passagem fecha no prazo; os restos se perdem e o contrato volta ao tesouro', () => {
    const { world, passage } = withPassage();
    world.town.buildings.guilda = 1;
    const hero = createHero(world);
    hero.status = 'dead';
    world.remains.push({ heroId: hero.id, passageId: passage.id, floor: 0, gold: 5 });
    expect(commands.postContract(world, passage.id, 0, 40).ok).toBe(true);
    const treasury = world.town.treasury;
    world.tick += (B.passageDays + 1) * TICKS_PER_DAY;
    closePassages(world);
    expect(world.abyss.passages).toHaveLength(0);
    expect(world.remains).toHaveLength(0);
    expect(world.town.contracts).toHaveLength(0);
    expect(world.town.treasury).toBe(treasury + 40);
    expect(world.chronicle.some((e) => e.text.includes(`restos de ${hero.name}`))).toBe(true);
  });

  it('passagem selada só fecha depois que o grupo sai dela', () => {
    const { world, passage } = withPassage();
    passage.sealed = true;
    world.parties.push({ ...spotOf(passage, passage.floors - 1), id: 5, phase: 'voltando' } as unknown as Party);
    closePassages(world);
    expect(world.abyss.passages).toHaveLength(1);
    world.parties = [];
    closePassages(world);
    expect(world.abyss.passages).toHaveLength(0);
  });

  it('sem passagem aberta, o grupo desce para abrir uma nova; com a guilda cheia, volta às conhecidas', () => {
    const world = createWorld(5);
    const heroes = [createHero(world), createHero(world), createHero(world)];
    expect(chooseTarget(world, heroes).spot).toBeNull();
    const passage = openPassage(world);
    passage.discovered = true;
    // Guilda em ruína: cabe uma passagem só, e ela já está aberta.
    const target = chooseTarget(world, heroes);
    expect(target.spot?.passageId).toBe(passage.id);
  });

  it('em vários anos de campanha, passagens se abrem, se revelam e se selam', () => {
    const world = createWorld(9);
    runDays(world, 120, { onHour: autoMayor });
    expect(world.metrics.passagesOpened).toBeGreaterThan(0);
    expect(world.metrics.passagesSealed).toBeGreaterThan(0);
    expect(world.chronicle.some((e) => e.kind === 'passagem' && e.text.includes('abriram passagem para'))).toBe(true);
  }, 30_000);
});
