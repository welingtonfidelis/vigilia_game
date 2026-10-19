// PRNG determinístico (mulberry32). O estado vive dentro do World para que
// save/load continue exatamente a mesma sequência.

export interface RngState {
  s: number;
}

export function seedRng(seed: number): RngState {
  return { s: seed >>> 0 || 0x9e3779b9 };
}

/** Float em [0, 1). */
export function next(r: RngState): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(r: RngState, min: number, max: number): number {
  return min + next(r) * (max - min);
}

/** Inteiro em [min, max]. */
export function int(r: RngState, min: number, max: number): number {
  return min + Math.floor(next(r) * (max - min + 1));
}

export function chance(r: RngState, p: number): boolean {
  return next(r) < p;
}

export function pick<T>(r: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick em lista vazia');
  return items[Math.floor(next(r) * items.length)]!;
}

export function weighted<T>(r: RngState, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  let roll = next(r) * total;
  for (const [item, w] of items) {
    roll -= Math.max(0, w);
    if (roll < 0) return item;
  }
  return items[items.length - 1]![0];
}

export function shuffle<T>(r: RngState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(next(r) * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}
