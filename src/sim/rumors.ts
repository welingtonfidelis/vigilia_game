// Rumores da próxima passagem (M6 F2). Quando a guilda tem vaga para uma passagem nova, ela traz
// três rumores: o bioma, uma das regras e uma frase. Cada rumor guarda a semente da passagem, e
// quem abrir a próxima abre a do rumor marcado (o primeiro, se o prefeito não marcar nenhum).
// Os três têm o mesmo tamanho (os andares só dependem do nível), então só muda o sabor.

import { BIOME_RUMORS, RULE_RUMORS } from '../data/rumors.ts';
import { BALANCE as B } from './config.ts';
import { generatePassage } from './dungeon.ts';
import { dayRng, next } from './rng.ts';
import type { Rumor, RumorBoard, World } from './types.ts';

/** Os rumores de agora: refeitos a cada passagem aberta e a cada nível do abismo. */
export function rumorBoard(world: World): RumorBoard {
  const key = world.metrics.passagesOpened;
  const level = world.abyss.level;
  const current = world.abyss.rumors;
  if (current && current.key === key && current.level === level) return current;
  const r = dayRng(world.seed, key, 500 + level);
  const pool = Array.from({ length: 12 }, () => {
    const seed = 1 + Math.floor(next(r) * 0x7ffffffe);
    const p = generatePassage(0, seed, level, 0);
    return { seed, biome: p.biome, rule: p.rules[0] ?? null };
  });
  // Biomas diferentes quando der; se o nível só tem um ou dois, repete.
  const list: Rumor[] = [];
  for (const distinct of [true, false]) {
    for (const c of pool) {
      if (list.length >= B.rumorCount) break;
      if (list.some((x) => x.seed === c.seed || (distinct && x.biome === c.biome))) continue;
      list.push({ ...c, text: c.rule ? RULE_RUMORS[c.rule] : (BIOME_RUMORS[c.biome] ?? BIOME_RUMORS[0]!) });
    }
  }
  world.abyss.rumors = { key, level, list, marked: 0 };
  return world.abyss.rumors;
}

/** O prefeito marca no mapa da guilda o rumor que a próxima passagem segue. */
export function markRumor(world: World, index: number): { ok: true } | { ok: false; reason: string } {
  const board = rumorBoard(world);
  if (index < 0 || index >= board.list.length) return { ok: false, reason: 'Esse rumor não existe.' };
  board.marked = index;
  return { ok: true };
}

/** A semente da próxima passagem: a do rumor marcado. */
export function takeRumorSeed(world: World): number {
  const board = rumorBoard(world);
  return (board.list[board.marked] ?? board.list[0]!).seed;
}
