// Chão da vila em tiles: onde há terra (estradas e terreiros), florestas e a peça certa
// de cada canto. Puro (sem Phaser) para dar para testar no Node.

import { CAVE_PATH, CEMETERY_TILES, COLS, EXPANSION_LOTS, HOME_PATHS, LOT_TILES, ROADS, ROWS, THERMAL_PATH, THERMAL_YARD, type TileRect } from './layout.ts';
import { STAIR_PATHS } from './relief.ts';

export const inRect = (r: TileRect, x: number, y: number): boolean => x >= r.tx && x < r.tx + r.tw && y >= r.ty && y < r.ty + r.th;

/** Abismo: linha (em tiles) onde o chão acaba, por coluna. */
export const FORESTS: TileRect[] = [
  { tx: 0, ty: 7, tw: 2, th: 25 },
  { tx: 48, ty: 14, tw: 2, th: 18 },
  { tx: 36, ty: 0, tw: 14, th: 8 },
  { tx: 40, ty: 9, tw: 9, th: 5 }, // capoeira em volta da caverna
  { tx: 2, ty: 29, tw: 5, th: 3 },
  { tx: 9, ty: 29, tw: 6, th: 3 },
  { tx: 30, ty: 29, tw: 8, th: 3 },
  { tx: 44, ty: 29, tw: 4, th: 3 },
];
export const AUTUMN: TileRect[] = [
  { tx: 36, ty: 7, tw: 3, th: 2 },
  { tx: 15, ty: 29, tw: 3, th: 3 },
];

/** Terreiro de terra embaixo de cada lote (encosta na estrada pela porta). */
function yards(): TileRect[] {
  return Object.entries(LOT_TILES).map(([id, r]) =>
    id === 'campo' ? { tx: r.tx + 1, ty: r.ty + 1, tw: r.tw - 2, th: r.th - 1 } : { tx: r.tx + 1, ty: r.ty + 2, tw: r.tw - 2, th: r.th - 2 },
  );
}

export function dirtMask(): boolean[][] {
  const cemeteryGround = {
    tx: CEMETERY_TILES.tx + 1,
    ty: CEMETERY_TILES.ty + 1,
    tw: CEMETERY_TILES.tw - 2,
    th: CEMETERY_TILES.th,
  };
  const areas = [...ROADS, ...STAIR_PATHS, THERMAL_PATH, THERMAL_YARD, CAVE_PATH, ...HOME_PATHS, ...EXPANSION_LOTS, ...yards(), cemeteryGround];
  return Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => areas.some((r) => inRect(r, x, y))));
}

/** Estradas/trilhas (recebem o autotile de trilha; os terreiros ficam em terra). */
export function pathMask(): boolean[][] {
  const areas = [...ROADS, ...STAIR_PATHS, THERMAL_PATH, CAVE_PATH, ...HOME_PATHS];
  return Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => areas.some((r) => inRect(r, x, y))));
}
