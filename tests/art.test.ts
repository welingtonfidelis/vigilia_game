import { describe, expect, it } from 'vitest';
import { BIOMES, BUILDING_IDS, CLASS_IDS } from '../src/sim/index.ts';
import { MONSTERS } from '../src/render/assets.ts';
import { heroSpriteId, PACK_ASSETS } from '../src/render/pack.ts';
import { PACK32 } from '../src/render/pack32.ts';
import { dirtMask } from '../src/render/ground.ts';
import { COLS, door, LANDMARKS, ROWS, TILE, WORLD_H, WORLD_W } from '../src/render/layout.ts';

describe('pack de arena 1.9', () => {
  it('cobre os seis atos, os quatro andares e as variantes de chefe', () => {
    const ids = new Set(PACK_ASSETS.map((a) => a.id));
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    for (const r of romans) {
      for (let floor = 1; floor <= 4; floor++) expect(ids.has(`arena/${r}/back-${floor}`), `${r} back-${floor}`).toBe(true);
      expect(ids.has(`arena/${r}/floor`), `${r} floor`).toBe(true);
      expect(ids.has(`arena/${r}/fore`), `${r} fore`).toBe(true);
      expect(ids.has(`prop/arena/${r}/boss-gate`), `${r} boss gate`).toBe(true);
    }
    for (const act of BIOMES) {
      expect(ids.has(`char/boss/${act.boss.id}-phase2`), act.boss.id).toBe(true);
      for (const e of act.enemies) {
        expect(ids.has(`char/monster/${e.id}-deep`), `${e.id} deep`).toBe(true);
        expect(ids.has(`char/monster/${e.id}-core`), `${e.id} core`).toBe(true);
      }
    }
  });
});

describe('arte própria', () => {
  const ids = new Set(PACK_ASSETS.map((a) => a.id));
  const byId = new Map(PACK_ASSETS.map((a) => [a.id, a]));

  it('toda classe, nos dois gêneros, tem folha no pack com quadros parado e correndo', () => {
    for (const cls of CLASS_IDS) {
      for (const gender of ['m', 'f'] as const) {
        const id = heroSpriteId(cls, gender);
        const anims = byId.get(id)?.animations;
        expect(anims?.idle, id).toBeDefined();
        expect(anims?.run, id).toBeDefined();
      }
    }
    expect(byId.get('char/mayor')?.animations?.run).toBeDefined();
  });

  it('todo monstro e todo Senhor dos 6 biomas tem uma folha com quadros', () => {
    for (const biome of BIOMES) {
      for (const id of [...biome.enemies.map((e) => e.id), biome.boss.id]) {
        const look = MONSTERS[id];
        expect(look, id).toBeDefined();
        expect(ids.has(look!.asset), id).toBe(true);
        expect(look!.frameSize, id).toHaveLength(2);
      }
    }
  });

  it('nenhuma peça vem de pack de terceiros', () => {
    for (const a of PACK_ASSETS) expect(a.file, a.id).not.toMatch(/kenney|0x72|tiny-town|dungeontileset/i);
    for (const e of Object.values(PACK32)) expect(e.file).toMatch(/^export32\//);
  });

  it('a peça 32-bit de cada id tem par 16-bit no pack', () => {
    for (const id of Object.keys(PACK32)) expect(ids.has(id), id).toBe(true);
  });
});

describe('vila em tiles', () => {
  it('estradas têm pelo menos 2 tiles de largura (o autotile precisa de borda dos dois lados)', () => {
    const mask = dirtMask();
    const at = (x: number, y: number) => (y < 0 || y >= ROWS || x < 0 || x >= COLS ? true : mask[y]![x]!);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!mask[y]![x]) continue;
        expect(at(x, y - 1) || at(x, y + 1), `terra solta na vertical em ${x},${y}`).toBe(true);
        expect(at(x - 1, y) || at(x + 1, y), `terra solta na horizontal em ${x},${y}`).toBe(true);
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
