import { describe, expect, it } from 'vitest';
import { ACTS } from '../src/data/acts.ts';
import { MONSTERS } from '../src/render/assets.ts';

describe('conteúdo de Valdora — Catacumbas', () => {
  it('inclui a Aranha Ossária no primeiro ato sem remover inimigos existentes', () => {
    const enemies = ACTS[0]!.enemies;
    expect(enemies.map((enemy) => enemy.id)).toContain('aranhaOssaria');
    expect(enemies.find((enemy) => enemy.id === 'aranhaOssaria')).toMatchObject({
      name: 'Aranha Ossária',
      hp: 38,
      atk: 8,
      def: 4,
      tags: ['backline'],
    });
    expect(enemies.length).toBe(4);
  });

  it('usa arte já presente no pack de Vigília', () => {
    expect(MONSTERS.aranhaOssaria).toMatchObject({
      asset: 'char/monster/aranha',
      frameSize: [32, 24],
    });
  });
});
