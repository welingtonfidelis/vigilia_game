import { describe, expect, it } from 'vitest';
import { CEMETERY, CEMETERY_TILES, GRAVE_SLOTS, gravePoint, standingGraves, TILE } from '../src/render/layout.ts';
import { createWorld } from '../src/sim/index.ts';
import type { Hero } from '../src/sim/index.ts';

describe('cemitério da vila', () => {
  it('toda cova fica dentro da cerca, e as vagas giram quando lota', () => {
    const bottomFence = (CEMETERY_TILES.ty + CEMETERY_TILES.th) * TILE;
    for (let i = 0; i < GRAVE_SLOTS * 3; i++) {
      const p = gravePoint(i);
      expect(p.y + 26).toBeLessThanOrEqual(bottomFence);
      expect(p.x).toBeLessThan((CEMETERY_TILES.tx + CEMETERY_TILES.tw - 1) * TILE);
    }
    expect(gravePoint(GRAVE_SLOTS)).toEqual(gravePoint(0));
    expect(gravePoint(CEMETERY.cols + 1)).not.toEqual(gravePoint(1));
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
