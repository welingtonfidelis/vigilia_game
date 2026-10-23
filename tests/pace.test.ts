import { describe, expect, it } from 'vitest';
import { CLASSES, commands, createWorld, heroStats, lordCandidates, lordConfidence, maxLevel, runTicks, TICKS_PER_DAY } from '../src/sim/index.ts';
import type { ClassId, Combat, Hero, Spot, World } from '../src/sim/index.ts';
import { BALANCE as B } from '../src/sim/config.ts';
import { BIOMES } from '../src/data/biomes.ts';
import { createHero, gainXp } from '../src/sim/hero.ts';
import { commonItem, equip } from '../src/sim/items.ts';
import { BIOME_NORM, floorPower, lairSpot, levelTier, lordAffixCount, makeEnemy, spawnRoom } from '../src/sim/dungeon.ts';
import { seedRng } from '../src/sim/rng.ts';

const combat = (): Combat => ({ units: [], ticks: 0, enraged: false, isBoss: false, bossMech: null, mechCd: 0, echoesSpawned: false, nextUid: 1 });

/** Grupo sintético de 5 (rank A) no nível do abismo, com uma fração do teto e equipamento do nível + borda. */
function team(world: World, level: number, frac: number, edge: number, classes: ClassId[] = ['guardiao', 'clerigo', 'arqueiro', 'piromante', 'guardiao']): Hero[] {
  world.abyss.level = level;
  world.town.buildings.guilda = 3;
  return classes.map((classId) => {
    const h = createHero(world);
    h.classId = classId;
    h.rank = 'A';
    h.level = Math.max(1, Math.round(maxLevel(world, h) * frac));
    h.status = 'town';
    h.activity = null;
    h.injury = null;
    h.traits = [{ id: 'bravo', revealed: true }];
    h.morale = 90;
    const tier = Math.max(0, levelTier(level) + edge);
    equip(world, h, commonItem(world, 'weapon', tier, 'teste'));
    equip(world, h, commonItem(world, 'armor', tier, 'teste'));
    h.hp = heroStats(world, h).maxHp;
    return h;
  });
}

/** Manda o grupo ao covil (várias sementes) e conta as vitórias. */
function lairWins(level: number, frac: number, edge: number, trials: number): { wins: number; conf: number } {
  let wins = 0;
  let conf = 0;
  for (let t = 0; t < trials; t++) {
    const world = createWorld(900 + t);
    const heroes = team(world, level, frac, edge);
    conf = lordConfidence(world, heroes, level);
    world.abyss.amulet = { level, readyTick: 0, inUse: false };
    world.rng = seedRng(4242 + t);
    commands.challengeLord(world, heroes.map((h) => h.id));
    for (let d = 0; d < 20 && world.parties.some((p) => p.lord !== undefined); d++) runTicks(world, TICKS_PER_DAY);
    if (world.metrics.bossKills.length > 0) wins++;
  }
  return { wins, conf };
}

describe('ritmo 5× (M5 F5): Senhores', () => {
  it('o Senhor sorteia afixos a cada desafio (1 até o nível 3, 2 depois), e nunca explode', () => {
    expect(lordAffixCount(3)).toBe(1);
    expect(lordAffixCount(4)).toBe(2);
    const world = createWorld(3);
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const lord = spawnRoom(world, combat(), { kind: 'chefe', cleared: false, remainsOf: null }, lairSpot(6))[0]!;
      expect(lord.affixes).toHaveLength(2);
      expect(lord.affixes).not.toContain('explosivo');
      seen.add(lord.affixes.join());
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it('a confiança contra o Senhor é honesta: o grupo folgado vence, o fraco cai', () => {
    const strong = lairWins(5, 1, 6, 4);
    const weak = lairWins(5, 0.35, -2, 4);
    expect(strong.conf).toBeGreaterThan(1.5);
    expect(strong.wins).toBe(4);
    expect(weak.conf).toBeLessThan(0.7);
    expect(weak.wins).toBe(0);
  }, 30_000);

  it('sem tanque e sem curandeiro a confiança cai; a guilda propõe os dois quando há', () => {
    const world = createWorld(5);
    const balanced = team(world, 4, 0.8, 1);
    const glass = team(createWorld(5), 4, 0.8, 1, ['piromante', 'arqueiro', 'piromante', 'arqueiro', 'piromante']);
    expect(lordConfidence(createWorld(5), glass, 4)).toBeLessThan(lordConfidence(world, balanced, 4) * 0.8);
    // A guilda: os quatro de dano na frente por força, mas o tanque e o curandeiro vão primeiro.
    const pool = createWorld(6);
    const heroes = team(pool, 4, 0.8, 3, ['piromante', 'arqueiro', 'piromante', 'arqueiro', 'piromante']);
    const [tank, healer] = team(pool, 4, 0.7, 1, ['guardiao', 'clerigo']);
    const proposal = lordCandidates(pool);
    expect(proposal.slice(0, 2).map((h) => CLASSES[h.classId].role)).toEqual(['tank', 'healer']);
    expect(proposal.map((h) => h.id)).toEqual(expect.arrayContaining([...heroes, tank!, healer!].map((h) => h.id)));
  });
});

describe('ritmo 5× (M5 F5): monstros e heróis', () => {
  it('letalidade: os monstros batem mais e aguentam menos, com a mesma ameaça; o Senhor não muda', () => {
    const world = createWorld(7);
    const spot: Spot = { passageId: -1, level: 3, biome: 0, rules: [], floor: 0 };
    const def = BIOMES[0]!.enemies[0]!;
    const unit = makeEnemy(world, combat(), def, spot);
    const power = floorPower(world, spot) * BIOME_NORM[0]!;
    expect(unit.atk).toBeCloseTo(def.atk * power * B.enemyLethality);
    expect(unit.maxHp).toBeCloseTo((def.hp * power) / B.enemyLethality);
    expect(unit.atk * unit.maxHp).toBeCloseTo(def.atk * def.hp * power ** 2);
    const boss = spawnRoom(world, combat(), { kind: 'chefe', cleared: false, remainsOf: null }, lairSpot(1))[0]!;
    expect(boss.maxHp / boss.atk).toBeGreaterThan(unit.maxHp / unit.atk);
  });

  it('a experiência segue o ritmo da campanha', () => {
    const world = createWorld(8);
    const hero = createHero(world);
    hero.level = 1;
    hero.xp = 0;
    gainXp(world, hero, 1);
    expect(hero.xp).toBeCloseTo(B.xpPace);
  });
});
