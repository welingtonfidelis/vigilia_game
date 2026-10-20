// Os 6 prédios montados com tiles do Tiny Town: ruína (nível 0) e níveis 1–3.
// Cada desenho é um carimbo de linhas de tiles, encostado embaixo e centrado no lote.

import Phaser from 'phaser';
import type { BuildingId } from '../sim/index.ts';
import { ART_SCALE, T, WINDOW_TILES } from './assets.ts';
import type { TileRect } from './layout.ts';
import { TILE } from './layout.ts';

type Row = number[];
interface Prop {
  /** Índice do Tiny Town ou nome de quadro do 0x72 (frascos, caixotes). */
  frame: number | string;
  col: number;
  row: number;
  tint?: number;
}
interface Design {
  rows: Row[];
  /** Cor do telhado (tint), para distinguir prédios com as mesmas peças. */
  roofTint?: number;
  props?: Prop[];
  /** Brasa da forja: posição em tiles relativa ao lote. */
  forge?: { col: number; row: number };
}

interface Roof {
  tl: number;
  t: number;
  tr: number;
  bl: number;
  b: number;
  br: number;
  dormer: number;
}
interface Wall {
  l: number;
  m: number;
  gap: number;
  r: number;
  win: number;
  door: number;
}

const roof = (r: Roof, w: number, dormers: number[] = []): Row[] => [
  [r.tl, ...Array.from({ length: w - 2 }, (_, i) => (dormers.includes(i + 1) ? r.dormer : r.t)), r.tr],
  [r.bl, ...Array.from({ length: w - 2 }, () => r.b), r.br],
];

const wall = (m: Wall, pattern: string): Row =>
  [...pattern].map((c) => ({ l: m.l, m: m.m, w: m.win, d: m.door, g: m.gap, r: m.r })[c] ?? -1);

const tower = (w: number, height: number): Row[] => {
  const mid = Math.floor(w / 2);
  const line = (frame: number): Row => Array.from({ length: w }, (_, i) => (i === mid ? frame : -1));
  return [line(T.roofGray.gable), ...Array.from({ length: height }, () => line(T.slit))];
};

const N = -1;

/** Desenhos por prédio e nível. Colunas de props contam a partir da borda esquerda do lote. */
const DESIGNS: Record<BuildingId, Design[]> = {
  taverna: [
    { rows: [[T.wood.l, N, T.wood.gap, T.wood.m, T.wood.r]], props: [{ frame: T.log, col: 1, row: 4 }, { frame: T.sack, col: 5, row: 4 }] },
    { rows: [...roof(T.roofRed, 3), wall(T.wood, 'ldr')], props: [{ frame: T.sign, col: 5, row: 5 }, { frame: T.sack, col: 1, row: 5 }] },
    { rows: [...roof(T.roofRed, 5, [2]), wall(T.wood, 'lwdwr')], props: [{ frame: T.sign, col: 6, row: 5 }, { frame: T.bucket, col: 0, row: 5 }] },
    {
      rows: [...roof(T.roofRed, 5, [1, 3]), wall(T.wood, 'lwwwr'), wall(T.wood, 'lwdwr')],
      props: [{ frame: T.sign, col: 6, row: 5 }, { frame: T.hay, col: 0, row: 5 }, { frame: T.sack, col: 0, row: 4 }],
    },
  ],
  estalagem: [
    { rows: [[T.wood.l, T.wood.m, N, T.wood.gap, N, T.wood.r]], props: [{ frame: T.log, col: 2, row: 4 }] },
    { rows: [...roof(T.roofGray, 5), wall(T.wood, 'lwdwr')], props: [{ frame: T.hay, col: 6, row: 5 }] },
    { rows: [...roof(T.roofGray, 5, [2]), wall(T.wood, 'lwwwr'), wall(T.wood, 'lwdwr')], props: [{ frame: T.hay, col: 6, row: 5 }] },
    {
      rows: [...roof(T.roofGray, 7, [2, 4]), wall(T.wood, 'lwwwwwr'), wall(T.wood, 'lwwdwwr')],
      props: [],
    },
  ],
  ferreiro: [
    { rows: [[T.stone.l, T.stone.m, N, T.stone.r]], props: [{ frame: T.stoneBlock, col: 5, row: 5 }, { frame: T.log, col: 1, row: 4 }] },
    { rows: [...roof(T.roofGray, 3), wall(T.stone, 'ldr')], props: [{ frame: T.stoneBlock, col: 5, row: 5 }, { frame: T.hammer, col: 6, row: 5 }], forge: { col: 1, row: 5 } },
    {
      rows: [...roof(T.roofGray, 5), wall(T.stone, 'lwdwr')],
      props: [{ frame: T.stoneBlock, col: 6, row: 5 }, { frame: T.hammer, col: 6, row: 4 }, { frame: T.pickaxe, col: 0, row: 4 }],
      forge: { col: 0, row: 5 },
    },
    {
      rows: [...roof(T.roofGray, 5, [2]), wall(T.stone, 'lwwwr'), wall(T.stone, 'lwdwr')],
      props: [{ frame: T.stoneBlock, col: 6, row: 5 }, { frame: T.hammer, col: 6, row: 4 }, { frame: T.axe, col: 0, row: 4 }, { frame: T.bucket, col: 0, row: 3 }],
      forge: { col: 0, row: 5 },
    },
  ],
  templo: [
    { rows: [[T.stone.l, T.stone.win, N, T.stone.gap, T.stone.r]], props: [{ frame: T.stoneBlock, col: 5, row: 4 }] },
    { rows: [...tower(3, 1), ...roof(T.roofGray, 3), wall(T.stone, 'ldr')] },
    { rows: [...tower(5, 2), ...roof(T.roofGray, 5), wall(T.stone, 'lwdwr')] },
    { rows: [...tower(5, 3), ...roof(T.roofGray, 5), wall(T.stone, 'lwwwr'), wall(T.stone, 'lwdwr')] },
  ],
  guilda: [
    { rows: [[T.stone.l, N, T.stone.m, T.stone.gap, T.stone.r]], props: [{ frame: T.log, col: 5, row: 4 }] },
    { rows: [...roof(T.roofRed, 3), wall(T.stone, 'ldr')], props: [{ frame: T.sign, col: 5, row: 5 }] },
    { rows: [...roof(T.roofRed, 5, [2]), wall(T.stone, 'lwdwr')], props: [{ frame: T.sign, col: 6, row: 5 }] },
    { rows: [...roof(T.roofRed, 7, [2, 4]), wall(T.stone, 'lwwwwwr'), wall(T.stone, 'lwwdwwr')] },
  ],
  casa: [
    { rows: [[T.wood.l, N, T.wood.gap, N, T.wood.r]], props: [{ frame: T.sack, col: 1, row: 4 }, { frame: T.log, col: 5, row: 4 }] },
    {
      rows: [...roof(T.roofGray, 3), wall(T.wood, 'ldr')],
      roofTint: 0xa8d0b0,
      props: [{ frame: 'flask_big_red', col: 5, row: 5 }, { frame: T.sprout, col: 1, row: 5 }],
    },
    {
      rows: [...roof(T.roofGray, 5, [2]), wall(T.wood, 'lwdwr')],
      roofTint: 0xa8d0b0,
      props: [{ frame: 'flask_big_red', col: 6, row: 5 }, { frame: 'flask_big_green', col: 6, row: 4 }, { frame: T.sprout, col: 0, row: 5 }],
    },
    {
      rows: [...roof(T.roofGray, 5, [1, 3]), wall(T.wood, 'lwwwr'), wall(T.wood, 'lwdwr')],
      roofTint: 0xa8d0b0,
      props: [
        { frame: 'flask_big_red', col: 6, row: 5 },
        { frame: 'flask_big_green', col: 6, row: 4 },
        { frame: T.well, col: 0, row: 5 },
        { frame: T.sprout, col: 0, row: 4 },
        { frame: T.mushrooms, col: 6, row: 3 },
      ],
    },
  ],
  campo: [
    {
      rows: [],
      props: [
        { frame: T.fenceL, col: 1, row: 1 },
        { frame: T.fenceR, col: 2, row: 1 },
        { frame: T.fenceV, col: 1, row: 3 },
        { frame: T.fenceL, col: 5, row: 5 },
        { frame: T.fenceR, col: 6, row: 5 },
        { frame: T.hay, col: 4, row: 3 },
      ],
    },
    { rows: [], props: [{ frame: T.target, col: 3, row: 3 }, { frame: T.hay, col: 6, row: 3 }] },
    { rows: [], props: [{ frame: T.target, col: 3, row: 3 }, { frame: T.target, col: 5, row: 2 }, { frame: T.hay, col: 6, row: 4 }] },
    {
      rows: [],
      props: [
        { frame: T.target, col: 3, row: 3 },
        { frame: T.target, col: 5, row: 2 },
        { frame: T.shelf, col: 2, row: 2 },
        { frame: T.hut, col: 6, row: 4 },
        { frame: T.hay, col: 6, row: 3 },
      ],
    },
  ],
};

/** Cerca do campo de treino (níveis 1–3): retângulo com porteira no meio de baixo. */
function fence(lot: TileRect): Prop[] {
  const out: Prop[] = [];
  const left = 1;
  const right = lot.tw - 2;
  const gate = Math.floor(lot.tw / 2);
  for (let c = left; c <= right; c++) {
    out.push({ frame: c === left ? T.fenceL : c === right ? T.fenceR : T.fenceM, col: c, row: 1 });
    if (c >= gate - 1 && c <= gate + 1) continue;
    out.push({ frame: c === left || c === gate + 2 ? T.fenceL : c === right || c === gate - 2 ? T.fenceR : T.fenceM, col: c, row: lot.th - 1 });
  }
  for (const c of [left, right]) for (let r = 2; r < lot.th - 1; r++) out.push({ frame: r === 2 ? T.fenceVTop : T.fenceV, col: c, row: r });
  return out;
}

const RUIN_TINT = 0x8a7c70;
const ROOF_TILES: ReadonlySet<number> = new Set([...Object.values(T.roofGray), ...Object.values(T.roofRed)]);

/**
 * Desenha o prédio no contêiner (origem no canto de cima do lote) e acende janelas
 * na camada de luz. Devolve as posições das janelas (para o brilho noturno).
 */
export function drawBuilding(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  lights: Phaser.GameObjects.Graphics,
  id: BuildingId,
  level: number,
  lot: TileRect,
): void {
  container.removeAll(true);
  lights.clear();
  const design = DESIGNS[id][Math.max(0, Math.min(3, level))]!;
  const ruin = level <= 0;
  const place = (frame: number | string, col: number, row: number, tint?: number) => {
    const img =
      typeof frame === 'string'
        ? scene.add.image(col * TILE + TILE / 2, (row + 1) * TILE, 'dungeon', frame).setOrigin(0.5, 1).setScale(ART_SCALE)
        : scene.add.image(col * TILE, (row + 1) * TILE, 'town', frame).setOrigin(0, 1).setScale(ART_SCALE);
    if (tint !== undefined) img.setTint(tint);
    else if (ruin) img.setTint(RUIN_TINT);
    container.add(img);
    if (!ruin && typeof frame === 'number' && WINDOW_TILES.has(frame)) {
      const x = col * TILE;
      const y = row * TILE;
      lights.fillStyle(0xffc46b, 0.85);
      lights.fillRect(x + 10, y + 8, 12, 14);
      lights.fillStyle(0xffc46b, 0.16);
      lights.fillCircle(x + 16, y + 16, 22);
    }
  };
  const width = Math.max(0, ...design.rows.map((r) => r.length));
  const left = Math.floor((lot.tw - width) / 2);
  const top = lot.th - design.rows.length;
  design.rows.forEach((row, r) =>
    row.forEach((frame, c) => frame >= 0 && place(frame, left + c, top + r, design.roofTint !== undefined && ROOF_TILES.has(frame) ? design.roofTint : undefined)),
  );
  if (id === 'campo' && level > 0) for (const p of fence(lot)) place(p.frame, p.col, p.row);
  for (const p of design.props ?? []) place(p.frame, p.col, p.row, p.tint);
  if (design.forge && !ruin) {
    const x = design.forge.col * TILE + TILE / 2;
    const y = design.forge.row * TILE + TILE / 2;
    const brick = scene.add.image(design.forge.col * TILE, (design.forge.row + 1) * TILE, 'town', T.brick).setOrigin(0, 1).setScale(ART_SCALE);
    container.add(brick);
    lights.fillStyle(0xff8a2a, 1);
    lights.fillRect(x - 8, y + 2, 16, 8);
    lights.fillStyle(0xff8a2a, 0.22);
    lights.fillCircle(x, y + 6, 30);
  }
}
