import { describe, expect, it } from 'vitest';
import { ACTS, BUILDING_IDS, CLASS_IDS } from '../src/sim/index.ts';
import { animFrames, CLASS_LOOK, frameRect, heroSprite, MAYOR_SPRITE, MONSTERS, T, WINDOW_TILES } from '../src/render/assets.ts';
import { dirtMask, dirtTile } from '../src/render/ground.ts';
import { COLS, door, LANDMARKS, ROWS, TILE, WORLD_H, WORLD_W } from '../src/render/layout.ts';

const TOWN_TILES = 132;

describe('sprites do 0x72', () => {
  it('toda classe, nos dois gêneros, tem quadros parado e correndo (e a arma existe)', () => {
    for (const cls of CLASS_IDS) {
      for (const gender of ['m', 'f'] as const) {
        const base = heroSprite(cls, gender);
        expect(animFrames(base, 'idle'), base).toHaveLength(4);
        expect(animFrames(base, 'run'), base).toHaveLength(4);
      }
      const weapon = CLASS_LOOK[cls].weapon;
      if (weapon) expect(frameRect(weapon), weapon).not.toBeNull();
    }
    expect(animFrames(MAYOR_SPRITE, 'run')).toHaveLength(4);
  });

  it('todo inimigo e todo chefe dos 6 atos tem um monstro com quadros', () => {
    for (const act of ACTS) {
      for (const id of [...act.enemies.map((e) => e.id), act.boss.id]) {
        const look = MONSTERS[id];
        expect(look, id).toBeDefined();
        expect(look!.asset, id).toBeTruthy();
        expect(look!.frameSize, id).toHaveLength(2);
      }
    }
  });

  it('os quadros cabem na folha de 512×512', () => {
    for (const name of ['coin_anim_f0', 'chest_full_open_anim_f0', 'floor_stairs', 'column', 'edge_down', 'big_demon_idle_anim_f3']) {
      const r = frameRect(name)!;
      expect(r[0] + r[2]).toBeLessThanOrEqual(512);
      expect(r[1] + r[3]).toBeLessThanOrEqual(512);
    }
  });
});

describe('vila em tiles', () => {
  it('todo índice do Tiny Town usado existe na folha 12×11', () => {
    const used: number[] = [];
    const walk = (v: unknown) => {
      if (typeof v === 'number') used.push(v);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(T);
    used.push(...WINDOW_TILES);
    for (const i of used) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(TOWN_TILES);
    }
  });

  it('estradas têm pelo menos 2 tiles de largura (o autotile precisa de borda dos dois lados)', () => {
    const mask = dirtMask();
    const at = (x: number, y: number) => (y < 0 || y >= ROWS || x < 0 || x >= COLS ? true : mask[y]![x]!);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!mask[y]![x]) continue;
        expect(at(x, y - 1) || at(x, y + 1), `terra solta na vertical em ${x},${y}`).toBe(true);
        expect(at(x - 1, y) || at(x + 1, y), `terra solta na horizontal em ${x},${y}`).toBe(true);
        expect(dirtTile(mask, x, y)).toBeLessThan(TOWN_TILES);
      }
    }
  });

  it('a porta de cada prédio e os marcos ficam em chão de terra dentro do mapa', () => {
    const mask = dirtMask();
    const onDirt = (p: { x: number; y: number }) => mask[Math.floor(p.y / TILE)]?.[Math.floor(p.x / TILE)] === true;
    for (const id of BUILDING_IDS) expect(onDirt(door(id)), id).toBe(true);
    for (const key of ['quadro', 'cofre', 'cemiterio'] as const) {
      const p = LANDMARKS[key];
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(WORLD_W);
      expect(p.y).toBeLessThan(WORLD_H);
    }
    expect(onDirt({ x: LANDMARKS.quadro.x, y: LANDMARKS.quadro.y + 40 })).toBe(true);
  });
});
