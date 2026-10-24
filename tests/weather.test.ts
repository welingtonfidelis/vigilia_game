import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/index.ts';
import { DAYS_PER_SEASON, DAYS_PER_YEAR } from '../src/sim/config.ts';
import { snowCover, weatherOn } from '../src/sim/weather.ts';

const SUMMER = DAYS_PER_SEASON;
const WINTER = 3 * DAYS_PER_SEASON;

describe('clima das estações (M6 F6)', () => {
  it('o mesmo dia dá o mesmo clima, e cada estação tem o seu', () => {
    const a = createWorld(111);
    const b = createWorld(111);
    for (let d = 0; d < 2 * DAYS_PER_YEAR; d++) expect(weatherOn(a, d)).toBe(weatherOn(b, d));
    const kinds = (from: number) => new Set(Array.from({ length: 30 }, (_, i) => weatherOn(a, from + i * DAYS_PER_YEAR + (i % DAYS_PER_SEASON))));
    expect([...kinds(0)].every((k) => k === 'limpo' || k === 'garoa')).toBe(true);
    expect([...kinds(WINTER)].every((k) => ['limpo', 'neve', 'nevasca'].includes(k))).toBe(true);
    expect(kinds(2 * DAYS_PER_SEASON).has('vento')).toBe(true);
  });

  it('o dia da tempestade e o da geada seguem a ordem dos eventos de cada ano', () => {
    const world = createWorld(112);
    // Verão do ano 3 (terceiro da lista) é tempestade; o do ano 1, não.
    expect(weatherOn(world, 2 * DAYS_PER_YEAR + SUMMER)).toBe('tempestade');
    expect(weatherOn(world, SUMMER)).not.toBe('tempestade');
    expect(weatherOn(world, 2 * DAYS_PER_YEAR + WINTER)).toBe('nevasca');
  });

  it('a neve acumula no inverno e derrete nos três primeiros dias da primavera', () => {
    const world = createWorld(113);
    const lastWinter = DAYS_PER_YEAR - 1;
    expect(snowCover(world, SUMMER + 3)).toBe(0);
    // Ano 3: o inverno abre com a geada (nevasca), então há neve no chão.
    const y3 = 2 * DAYS_PER_YEAR;
    expect(snowCover(world, y3 + WINTER)).toBeGreaterThan(0);
    const end = snowCover(world, y3 + lastWinter);
    const spring = y3 + DAYS_PER_YEAR;
    expect(snowCover(world, spring)).toBeCloseTo(end * (2 / 3));
    expect(snowCover(world, spring + 2)).toBe(0);
  });
});

describe('agenda da praça (M6 F6)', () => {
  it('feira no 3º e no 8º dia da estação; bardo só em noite sem chuva nem neve', async () => {
    const { bardNight, marketDay } = await import('../src/sim/weather.ts');
    const world = createWorld(114);
    expect([0, 1, 2, 3, 7, 9].map((d) => marketDay(5 * DAYS_PER_SEASON + d))).toEqual([false, false, true, false, true, false]);
    let nights = 0;
    for (let d = 0; d < 4 * DAYS_PER_YEAR; d++) {
      if (!bardNight(world, d)) continue;
      nights++;
      expect(['limpo', 'vento']).toContain(weatherOn(world, d));
    }
    expect(nights).toBeGreaterThan(10);
    expect(nights).toBeLessThan(4 * DAYS_PER_YEAR * 0.25);
  });
});
