import { describe, expect, it } from 'vitest';
import { commands, createWorld, deserialize, difficultyOf, DIFFICULTIES, expansionClearCost, festivalCost, hornCost, nextLevelCost, serialize } from '../src/sim/index.ts';
import { createHero, gainXp } from '../src/sim/hero.ts';
import { floorPower } from '../src/sim/dungeon.ts';

describe('dificuldade', () => {
  it('Normal é o balanceamento de sempre (tudo 1)', () => {
    const def = DIFFICULTIES.normal;
    expect([def.xp, def.gold, def.rarity, def.costs, def.enemy, def.corruption, def.raid]).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it('o novo jogo guarda a dificuldade', () => {
    const world = createWorld(5, 'dificil');
    expect(difficultyOf(world).id).toBe('dificil');
    expect(deserialize(serialize(world)).difficulty).toBe('dificil');
  });

  it('custos do prefeito seguem a dificuldade', () => {
    const facil = createWorld(7, 'facil');
    const normal = createWorld(7, 'normal');
    const dificil = createWorld(7, 'dificil');
    for (const cost of [hornCost, festivalCost, expansionClearCost]) {
      expect(cost(facil)).toBeLessThan(cost(normal));
      expect(cost(dificil)).toBeGreaterThan(cost(normal));
    }
    const lvl = (w: typeof normal) => nextLevelCost(w, 'taverna')!.gold;
    expect(lvl(dificil)).toBe(Math.round(lvl(normal) * DIFFICULTIES.dificil.costs));
  });

  it('experiência e força dos monstros seguem a dificuldade', () => {
    const xpOf = (difficulty: 'facil' | 'normal' | 'dificil') => {
      const world = createWorld(3, difficulty);
      const hero = createHero(world);
      hero.level = 1;
      hero.xp = 0;
      gainXp(world, hero, 10);
      return hero.xp + hero.level * 1000;
    };
    expect(xpOf('facil')).toBeGreaterThan(xpOf('normal'));
    expect(xpOf('dificil')).toBeLessThan(xpOf('normal'));
    const spot = { passageId: -1, level: 1, biome: 0, rules: [], floor: 0 };
    expect(floorPower(createWorld(3, 'facil'), spot)).toBeLessThan(floorPower(createWorld(3, 'normal'), spot));
  });

  it('dá para trocar no meio da campanha, e fica na crônica', () => {
    const world = createWorld(9);
    expect(commands.setDifficulty(world, 'facil').ok).toBe(true);
    expect(world.difficulty).toBe('facil');
    expect(world.chronicle.some((e) => e.text.includes('Fácil'))).toBe(true);
  });
});
