// Chão da vila em tiles: onde há terra (estradas e terreiros), florestas e a peça certa
// de cada canto. Puro (sem Phaser) para dar para testar no Node.

import { T } from './assets.ts';
import { COLS, HOME_PATHS, LOT_TILES, ROADS, ROWS, THERMAL_PATH, THERMAL_YARD, type TileRect } from './layout.ts';

export const inRect = (r: TileRect, x: number, y: number): boolean => x >= r.tx && x < r.tx + r.tw && y >= r.ty && y < r.ty + r.th;

/** Abismo: linha (em tiles) onde o chão acaba, por coluna. */
export const ABYSS_ROWS = 6;

export const FORESTS: TileRect[] = [
  { tx: 0, ty: 7, tw: 2, th: 25 },
  { tx: 48, ty: 14, tw: 2, th: 18 },
  { tx: 2, ty: 29, tw: 5, th: 3 },
  { tx: 9, ty: 29, tw: 6, th: 3 },
  { tx: 30, ty: 29, tw: 8, th: 3 },
  { tx: 44, ty: 29, tw: 4, th: 3 },
];
export const AUTUMN: TileRect[] = [
  { tx: 2, ty: 7, tw: 3, th: 3 },
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
  const areas = [...ROADS, THERMAL_PATH, THERMAL_YARD, ...HOME_PATHS, ...yards()];
  return Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => areas.some((r) => inRect(r, x, y))));
}

/** Escolhe a peça de terra pela vizinhança (fora do mapa conta como terra: a estrada continua). */
export function dirtTile(mask: boolean[][], x: number, y: number): number {
  const d = (dx: number, dy: number): boolean => {
    const yy = y + dy;
    const xx = x + dx;
    if (yy < 0 || yy >= ROWS || xx < 0 || xx >= COLS) return true;
    return mask[yy]![xx]!;
  };
  const n = d(0, -1);
  const s = d(0, 1);
  const e = d(1, 0);
  const w = d(-1, 0);
  if (!n && !w) return T.dirtTL;
  if (!n && !e) return T.dirtTR;
  if (!s && !w) return T.dirtBL;
  if (!s && !e) return T.dirtBR;
  if (!n) return T.dirtT;
  if (!s) return T.dirtB;
  if (!w) return T.dirtL;
  if (!e) return T.dirtR;
  if (!d(-1, -1)) return T.dirtInNW;
  if (!d(1, -1)) return T.dirtInNE;
  if (!d(1, 1)) return T.dirtInSE;
  if (!d(-1, 1)) return T.dirtInSW;
  return T.dirt;
}
