// Códex do Salão das Lendas (M6 F5). A guilda anota o que vê e o que abate no abismo, e cada
// entrada se abre aos poucos: o monstro visto (silhueta e nome), com 10 abates (vida, ataque e
// o hábito) e com 50 (a história); o Senhor visto, vencido e vencido sem baixas. Os lugares, as
// regras, as lendárias e os mistérios abrem na primeira vez. Só registro: nada aqui mexe no jogo.

import { BIOMES } from '../data/biomes.ts';
import { LEGENDARY_TITLES } from '../data/items.ts';
import { LORD_LEVELS, lordOf } from '../data/lords.ts';
import { BALANCE as B } from './config.ts';
import type { Codex, Combat, Item, MysteryId, Party, Unit, World } from './types.ts';

const MONSTER_IDS = new Set(BIOMES.flatMap((b) => b.enemies.map((e) => e.id)));

/** O códex do mundo (o save antigo começa vazio e é preenchido por backfillCodex). */
export function codexOf(world: World): Codex {
  return (world.codex ??= { monsters: {}, lords: {}, biomes: [], rules: [], legendaries: [], mysteries: [] });
}

const isEcho = (u: Unit): boolean => u.name.startsWith('Eco de ');

export function noteMystery(world: World, id: MysteryId): void {
  const c = codexOf(world);
  if (!c.mysteries.includes(id)) c.mysteries.push(id);
}

function noteLordStage(world: World, level: number, stage: number): void {
  const c = codexOf(world);
  const id = lordOf(level).id;
  c.lords[id] = Math.max(c.lords[id] ?? 0, stage);
  if (level > LORD_LEVELS) noteMystery(world, 'retorno');
}

/** Começo de uma luta (e os reforços que chegam no meio): o lugar, as regras e quem apareceu. */
export function noteCombat(world: World, party: Party, combat: Combat): void {
  const c = codexOf(world);
  if (!c.biomes.includes(party.biome)) c.biomes.push(party.biome);
  for (const r of party.rules) if (!c.rules.includes(r)) c.rules.push(r);
  if (party.lord === undefined) {
    noteMystery(world, 'passagens');
    if (party.rules.length === 0) noteMystery(world, 'calmaria');
  } else noteMystery(world, 'contrato');
  for (const u of combat.units) {
    if (u.side !== 'enemy' || !u.alive) continue;
    if (isEcho(u)) {
      noteMystery(world, 'ecos');
      continue;
    }
    if (u.tags.includes('boss') && party.lord !== undefined) {
      noteLordStage(world, party.lord, 1);
      continue;
    }
    if (u.nemesisId !== undefined) noteMystery(world, 'nemesis');
    if (u.elite && !u.tags.includes('guardian')) noteMystery(world, 'elites');
    if (u.defId && MONSTER_IDS.has(u.defId)) c.monsters[u.defId] ??= 0;
  }
}

/** Um monstro caiu: conta para o tipo dele (os ecos e o Senhor ficam de fora). */
export function noteKill(world: World, unit: Unit): void {
  if (unit.side !== 'enemy' || isEcho(unit) || !unit.defId || !MONSTER_IDS.has(unit.defId)) return;
  const c = codexOf(world);
  c.monsters[unit.defId] = (c.monsters[unit.defId] ?? 0) + 1;
}

/** O Senhor do nível caiu; sem baixas, a entrada abre o último passo. */
export function noteLordDefeat(world: World, level: number, flawless: boolean): void {
  noteLordStage(world, level, flawless ? 3 : 2);
}

/** Nome-base da lendária ("Maré Negra II" é a mesma entrada de "Maré Negra"). */
export const legendaryBase = (title: string): string => LEGENDARY_TITLES.find((t) => title === t || title.startsWith(`${t} `)) ?? title;

export function noteLegendary(world: World, item: Item): void {
  if (item.rarity !== 'lendaria' || !item.title) return;
  const c = codexOf(world);
  const base = legendaryBase(item.title);
  if (!c.legendaries.includes(base)) c.legendaries.push(base);
}

/** Estágio de um monstro: 0 desconhecido, 1 visto, 2 hábito (10 abates), 3 história (50). */
export function monsterStage(c: Codex, id: string): number {
  const kills = c.monsters[id];
  if (kills === undefined) return 0;
  return kills >= B.codexStoryKills ? 3 : kills >= B.codexHabitKills ? 2 : 1;
}

/** A página do bioma está completa: os três monstros com a história aberta e o Senhor vencido. */
export function biomePageComplete(c: Codex, biome: number): boolean {
  const def = BIOMES[biome]!;
  return def.enemies.every((e) => monsterStage(c, e.id) >= 3) && (c.lords[def.boss.id] ?? 0) >= 2;
}

/** Entradas abertas (ao menos o primeiro passo) e o total possível, para o painel. */
export function codexProgress(c: Codex): { open: number; total: number } {
  const monsters = BIOMES.flatMap((b) => b.enemies);
  const open =
    c.biomes.length +
    monsters.filter((e) => c.monsters[e.id] !== undefined).length +
    Object.keys(c.lords).length +
    c.rules.length +
    c.legendaries.length +
    c.mysteries.length;
  const total = BIOMES.length + monsters.length + BIOMES.length + 8 + LEGENDARY_TITLES.length + 8;
  return { open, total };
}

/**
 * Save de antes da F5: o códex nasce com o que dá para saber. Os biomas e os Senhores pelos
 * Senhores vencidos e pelas passagens abertas, as lendárias pelas peças que existem, e os
 * monstros desses biomas como vistos. Os abates de cada tipo não ficaram guardados: contam
 * daqui em diante.
 */
export function backfillCodex(world: World, items: Item[]): void {
  if (world.codex) return;
  const c = codexOf(world);
  for (const k of world.metrics.bossKills) {
    noteLordDefeat(world, k.level, false);
    const biome = lordOf(k.level).biome;
    if (!c.biomes.includes(biome)) c.biomes.push(biome);
  }
  for (const p of world.abyss.passages) if (!c.biomes.includes(p.biome)) c.biomes.push(p.biome);
  for (const b of c.biomes) for (const e of BIOMES[b]!.enemies) c.monsters[e.id] ??= 0;
  for (const item of items) noteLegendary(world, item);
  if (world.metrics.bossKills.length > 0) noteMystery(world, 'contrato');
  if (c.biomes.length > 0) noteMystery(world, 'passagens');
  if ((world.abyss.nemeses?.length ?? 0) > 0) noteMystery(world, 'nemesis');
  if (world.abyss.level > LORD_LEVELS) noteMystery(world, 'retorno');
}
