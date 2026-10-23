import { describe, expect, it } from 'vitest';
import { autoMayor, commands, createWorld, deserialize, eventChoiceCost, runDays, SEASONAL_EVENTS, serialize, TICKS_PER_DAY, TICKS_PER_HOUR } from '../src/sim/index.ts';
import type { World } from '../src/sim/index.ts';
import { BALANCE as B } from '../src/sim/config.ts';
import { dailyCare, finishRepairs, repairCost, wear } from '../src/sim/care.ts';
import {
  careFactor,
  EFFECTS,
  grade,
  gradeOfLevel,
  hasSpec,
  heroCapacity,
  level,
  levelCost,
  maxBuildingLevel,
  maxGearTier,
  nextLevelCost,
  upgradeBlocker,
} from '../src/sim/economy.ts';
import { resolveRaid } from '../src/sim/raids.ts';

/** Mundo com tesouro e materiais de sobra, para testar as obras. */
function richWorld(seed = 1): World {
  const world = createWorld(seed);
  world.town.treasury = 1e7;
  for (const m of Object.keys(world.town.materials) as (keyof World['town']['materials'])[]) world.town.materials[m] = 1e5;
  return world;
}

describe('vila longa (M5 F4): níveis e curvas', () => {
  it('o efeito do antigo nível 3 chega entre o nível 4 e o 5', () => {
    expect(gradeOfLevel(1)).toBe(1);
    expect(gradeOfLevel(3)).toBeCloseTo(2.1);
    // Vagas: antes 6 + 4n (18 no nível 3); agora 17 no 4 e 19 no 5.
    expect(EFFECTS.heroSlots(gradeOfLevel(4))).toBeLessThan(18);
    expect(EFFECTS.heroSlots(gradeOfLevel(5))).toBeGreaterThan(18);
    expect(EFFECTS.restHp(gradeOfLevel(30))).toBe(B.restHpMax);
  });

  it('teto 10 na campanha; no pós-jogo os prédios seguem subindo', () => {
    const world = richWorld();
    world.town.buildings.ferreiro = 10;
    expect(maxBuildingLevel(world)).toBe(10);
    expect(nextLevelCost(world, 'ferreiro')).toBeNull();
    world.endedTick = world.tick;
    expect(nextLevelCost(world, 'ferreiro')).not.toBeNull();
    expect(commands.build(world, 'ferreiro').ok).toBe(true);
    expect(world.town.buildings.ferreiro).toBe(11);
  });

  it('o custo cresce em progressão geométrica, com o material da faixa', () => {
    expect(levelCost('ferreiro', 3)).toEqual({ gold: 1400, materials: { ferroNegro: 30 } });
    expect(levelCost('ferreiro', 5).gold / levelCost('ferreiro', 4).gold).toBeCloseTo(B.buildingCostGrowth, 2);
    expect(Object.keys(levelCost('ferreiro', 4).materials!)).toEqual(['perolas']);
    expect(Object.keys(levelCost('ferreiro', 6).materials!)).toEqual(['brasas']);
    expect(Object.keys(levelCost('ferreiro', 9).materials!)).toEqual(['almas']);
    expect(Object.keys(levelCost('ferreiro', 10).materials!).sort()).toEqual(['almas', 'brasas']);
  });

  it('o ferreiro forja 3n + 1, sem passar do que o abismo já mostrou', () => {
    const world = richWorld();
    world.abyss.level = 3;
    world.town.buildings.ferreiro = 2;
    expect(maxGearTier(world)).toBe(7);
    world.town.buildings.ferreiro = 8;
    expect(maxGearTier(world)).toBe(4 + B.forgeAbyssEdge);
    world.abyss.level = 10;
    expect(maxGearTier(world)).toBe(25);
  });

  it('no nível 7 o prédio ganha também o outro caminho', () => {
    const world = richWorld();
    world.town.buildings.estalagem = 2;
    expect(commands.build(world, 'estalagem', 'dormitorio').ok).toBe(true);
    expect(hasSpec(world, 'luxo')).toBe(false);
    for (let n = 4; n <= 7; n++) expect(commands.build(world, 'estalagem').ok).toBe(true);
    expect(hasSpec(world, 'dormitorio') && hasSpec(world, 'luxo')).toBe(true);
    expect(world.chronicle.at(-1)!.text).toMatch(/ganhou também o caminho Quartos de luxo/);
  });
});

describe('vila longa (M5 F4): conservação e conserto', () => {
  it('cai 0,25 por dia; abaixo de 50 rende 80%, abaixo de 25 rende metade e não sobe', () => {
    const world = richWorld();
    world.town.buildings.guilda = 5;
    dailyCare(world);
    expect(world.town.care.guilda).toBeCloseTo(100 - B.careDecayPerDay);
    world.town.care.guilda = 45;
    expect(careFactor(world, 'guilda')).toBe(B.careWornFactor);
    expect(level(world, 'guilda')).toBe(4);
    expect(grade(world, 'guilda')).toBeCloseTo(gradeOfLevel(5) * B.careWornFactor);
    expect(upgradeBlocker(world, 'guilda')).toBeNull();
    world.town.care.guilda = 20;
    expect(level(world, 'guilda')).toBe(2);
    expect(upgradeBlocker(world, 'guilda')).toMatch(/conserte/);
    expect(commands.build(world, 'guilda').ok).toBe(false);
  });

  it('em 0 o prédio perde um nível e volta a 50; a ruína volta inteira', () => {
    const world = richWorld();
    world.town.buildings.templo = 2;
    world.town.care.templo = 10;
    expect(wear(world, 'templo', 15)).toBe(true);
    expect(world.town.buildings.templo).toBe(1);
    expect(world.town.care.templo).toBe(B.careAfterCollapse);
    expect(wear(world, 'templo', 60)).toBe(true);
    expect(world.town.buildings.templo).toBe(0);
    expect(world.town.care.templo).toBe(100);
  });

  it('a crônica avisa quando o prédio passa de 50 para baixo', () => {
    const world = richWorld();
    world.town.care.taverna = 50.1;
    wear(world, 'taverna', 1);
    expect(world.chronicle.at(-1)!.text).toBe('A taverna está gasta: rende menos até um conserto.');
  });

  it('o conserto cobra pelo nível e pelo estrago, leva de 1 a 3 dias e devolve o prédio inteiro', () => {
    const world = richWorld();
    world.town.buildings.ferreiro = 6;
    world.town.care.ferreiro = 70;
    const light = repairCost(world, 'ferreiro')!;
    expect(light.days).toBe(1);
    expect(light.materials).toBeUndefined();
    world.town.care.ferreiro = 10;
    const heavy = repairCost(world, 'ferreiro')!;
    expect(heavy.days).toBe(3);
    expect(heavy.gold).toBeGreaterThan(light.gold * 2.5);
    expect(heavy.materials).toEqual({ brasas: 9 });
    world.town.buildings.ferreiro = 3;
    expect(repairCost(world, 'ferreiro')!.gold).toBeLessThan(heavy.gold);
    world.town.buildings.ferreiro = 6;

    const treasury = world.town.treasury;
    expect(commands.repair(world, 'ferreiro').ok).toBe(true);
    expect(world.town.treasury).toBe(treasury - heavy.gold);
    expect(commands.repair(world, 'ferreiro').ok).toBe(false);
    // Em obra: rende 80%, não se desgasta e não sobe de nível.
    expect(careFactor(world, 'ferreiro')).toBe(B.careRepairFactor);
    expect(upgradeBlocker(world, 'ferreiro')).toMatch(/conserto/);
    dailyCare(world);
    expect(world.town.care.ferreiro).toBe(10);
    world.tick += 3 * TICKS_PER_DAY - TICKS_PER_HOUR;
    finishRepairs(world);
    expect(world.town.repairs.ferreiro).toBeDefined();
    world.tick += TICKS_PER_HOUR;
    finishRepairs(world);
    expect(world.town.repairs.ferreiro).toBeUndefined();
    expect(world.town.care.ferreiro).toBe(100);
    expect(world.metrics.repairs).toBe(1);
  });

  it('melhorar deixa o prédio inteiro de novo', () => {
    const world = richWorld();
    world.town.buildings.campo = 4;
    world.town.care.campo = 30;
    expect(commands.build(world, 'campo').ok).toBe(true);
    expect(world.town.care.campo).toBe(100);
  });

  it('a incursão desgasta de 1 a 3 prédios, em vez de derrubar um nível', () => {
    const world = createWorld(43);
    for (const id of ['taverna', 'estalagem', 'ferreiro', 'templo'] as const) world.town.buildings[id] = 4;
    const raid = resolveRaid(world, { level: 6, pressure: 100, biome: 5, passageId: null });
    expect(raid.outcome).toBe('saque');
    expect(raid.hits.length).toBeGreaterThanOrEqual(2);
    expect(raid.hits.length).toBeLessThanOrEqual(3);
    for (const hit of raid.hits) {
      expect(hit.collapsed).toBe(false);
      expect(world.town.care[hit.id]).toBe(100 - hit.damage);
      expect(world.town.buildings[hit.id]).toBe(4);
    }
  });

  it('o prefeito automático manda consertar, e a manutenção aparece nas métricas', () => {
    const world = createWorld(5);
    runDays(world, 2 * 40, { onHour: autoMayor });
    world.town.care.taverna = 30;
    world.town.treasury += 500;
    runDays(world, 1, { onHour: autoMayor });
    expect(world.town.repairs.taverna).toBeDefined();
    expect(world.metrics.repairs).toBeGreaterThan(0);
    expect(world.metrics.maintenance).toBeGreaterThan(0);
    expect(world.metrics.spent.conserto).toBeGreaterThan(0);
    expect(world.metrics.treasuryIn).toBeGreaterThan(world.metrics.maintenance);
  }, 30_000);

  it('save da versão 11 sem os campos da F4 abre com os prédios inteiros', () => {
    const world = createWorld(2);
    const data = JSON.parse(serialize(world));
    delete data.town.care;
    delete data.town.repairs;
    delete data.metrics.spent;
    const loaded = deserialize(JSON.stringify(data));
    expect(loaded.town.care.taverna).toBe(100);
    expect(loaded.town.repairs).toEqual({});
    expect(heroCapacity(loaded)).toBe(heroCapacity(world));
  });
});

describe('vila longa (M5 F4): tempestade e geada', () => {
  it('sem proteção, a tempestade gasta dois prédios e a geada gasta todos', () => {
    const world = richWorld(8);
    for (const id of ['estalagem', 'ferreiro', 'templo'] as const) world.town.buildings[id] = 3;
    world.town.event = { id: 'tempestade', year: 3, season: 1, tick: world.tick };
    expect(commands.resolveSeasonalEvent(world, 'abrigar').ok).toBe(true);
    expect(Object.values(world.town.care).filter((c) => c === 85)).toHaveLength(2);
    world.town.event = { id: 'geada', year: 3, season: 3, tick: world.tick };
    expect(commands.resolveSeasonalEvent(world, 'aguentar').ok).toBe(true);
    const built = (['taverna', 'estalagem', 'ferreiro', 'templo'] as const).map((id) => world.town.care[id]);
    expect(built.every((c) => c <= 92)).toBe(true);
  });

  it('a proteção custa metade do conserto que evita, e cresce com a vila', () => {
    const small = richWorld(8);
    const big = richWorld(8);
    for (const id of Object.keys(big.town.buildings) as (keyof World['town']['buildings'])[]) big.town.buildings[id] = 8;
    const choice = SEASONAL_EVENTS.tempestade.choices[0]!;
    expect(eventChoiceCost(small, choice)).toBe(40);
    expect(eventChoiceCost(big, choice)).toBeGreaterThan(1000);
    big.town.event = { id: 'tempestade', year: 3, season: 1, tick: big.tick };
    const treasury = big.town.treasury;
    expect(commands.resolveSeasonalEvent(big, 'reforcar').ok).toBe(true);
    expect(big.town.treasury).toBe(treasury - eventChoiceCost(big, choice));
    expect(Object.values(big.town.care).every((c) => c === 100)).toBe(true);
  });
});
