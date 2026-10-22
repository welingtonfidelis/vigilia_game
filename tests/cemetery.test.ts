import { describe, expect, it } from 'vitest';
import { CEMETERY, CEMETERY_FENCE, CEMETERY_GROUND, CEMETERY_TILES, GRAVE_SLOTS, gravePoint, standingGraves, TILE } from '../src/render/layout.ts';
import { createWorld } from '../src/sim/index.ts';
import type { Hero } from '../src/sim/index.ts';

describe('cemitério da vila', () => {
  it('toda cova fica na terra, longe da cerca, e as vagas giram quando lota', () => {
    const g = CEMETERY_GROUND;
    for (let i = 0; i < GRAVE_SLOTS * 3; i++) {
      const p = gravePoint(i);
      // A lápide (24 de altura) começa abaixo do tile da cerca de cima; o montinho (6) acaba na terra.
      expect(p.y - 24).toBeGreaterThanOrEqual(CEMETERY_FENCE.top + TILE);
      expect(p.y + 6).toBeLessThanOrEqual(g.y + g.h);
      expect(p.y).toBeGreaterThan(g.y);
      expect(p.x - 10).toBeGreaterThan(g.x);
      expect(p.x + 10).toBeLessThan(g.x + g.w);
      expect(p.x).toBeLessThan((CEMETERY_TILES.tx + CEMETERY_TILES.tw - 1) * TILE);
    }
    expect(gravePoint(GRAVE_SLOTS)).toEqual(gravePoint(0));
    expect(gravePoint(CEMETERY.cols + 1)).not.toEqual(gravePoint(1));
  });

  it('a terra tem a mesma folga até a cerca em cima, embaixo e dos lados', () => {
    const g = CEMETERY_GROUND;
    // Nos lados: do poste (x 6–10 do tile de 16) até a terra.
    const side = g.x - (CEMETERY_TILES.tx * TILE + 10 * 2);
    // Em cima: da grade (linhas 2–13 do tile) até a terra; embaixo: da terra até a grade.
    const top = g.y - (CEMETERY_FENCE.top + 14 * 2);
    const bottom = CEMETERY_FENCE.bottom + 2 * 2 - (g.y + g.h);
    expect(top).toBe(side);
    expect(bottom).toBe(side);
  });

  it('com o cemitério cheio, ficam no chão só as covas mais recentes', () => {
    const world = createWorld(3);
    const template = world.heroes[0]!;
    world.heroes = Array.from({ length: GRAVE_SLOTS + 10 }, (_, i) => ({
      ...template,
      id: 1000 + i,
      name: `Morto ${i}`,
      status: 'dead',
      death: { tick: i * 10, where: 'abismo', cause: 'teste' },
    })) as unknown as Hero[];
    const standing = standingGraves(world);
    expect(standing).toHaveLength(GRAVE_SLOTS);
    expect(standing[0]!.index).toBe(10);
    expect(standing[0]!.hero.name).toBe('Morto 10');
    expect(standing.at(-1)!.hero.name).toBe(`Morto ${GRAVE_SLOTS + 9}`);
  });
});
