import { describe, expect, it } from 'vitest';
import { BIOME_PALETTE, BOSS_STRIKE, CLASS_ATTACKS, MONSTER_STYLE, STYLE_STRIKE, stageOf, styleFx, type MonsterStyle } from '../src/data/attacks.ts';
import { PFX } from '../src/render/lane/pfx-index.ts';
import { BIOMES, CLASS_IDS } from '../src/sim/index.ts';

const inIndex = (id: string | undefined): boolean => id === undefined || id in PFX;

describe('ataques que mudam com o nível (§9.9)', () => {
  it('os estágios mudam no 15 e no 35', () => {
    expect([1, 14, 15, 34, 35, 80].map(stageOf)).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('cada classe tem três estágios com nomes, e todo efeito citado existe', () => {
    for (const id of CLASS_IDS) {
      const stages = CLASS_ATTACKS[id];
      expect(stages, id).toHaveLength(3);
      expect(new Set(stages.map((s) => s.name)).size, `${id}: nomes repetidos`).toBe(3);
      for (const s of stages) {
        for (const st of [s.hit, s.hurt, s.heal, ...(s.crit ?? [])]) expect(inIndex(st?.fx), `${id} ${s.name}: ${st?.fx}`).toBe(true);
        expect(inIndex(s.projectile), `${id} ${s.name}: ${s.projectile}`).toBe(true);
      }
    }
  });
});

describe('golpes dos monstros (§9.9)', () => {
  it('todo monstro corpo a corpo dos 10 biomas tem estilo, e a retaguarda fica com o orbe', () => {
    for (const biome of BIOMES) {
      for (const e of biome.enemies) {
        const back = e.tags?.includes('backline') ?? false;
        expect(MONSTER_STYLE[e.id] !== undefined, `${biome.name}: ${e.id}`).toBe(!back);
      }
    }
  });

  it('todo chefe tem golpe próprio, e as folhas de estilo e chefe existem nos 10 biomas', () => {
    expect(BIOME_PALETTE).toHaveLength(BIOMES.length);
    BIOMES.forEach((biome, b) => {
      expect(inIndex(BOSS_STRIKE[biome.boss.id]?.fx) && BOSS_STRIKE[biome.boss.id] !== undefined, biome.boss.id).toBe(true);
      for (const style of Object.keys(STYLE_STRIKE) as MonsterStyle[]) expect(styleFx(style, b) in PFX, styleFx(style, b)).toBe(true);
    });
  });
});
