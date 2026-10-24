// Salão das Lendas (M6 F5): o prédio que guarda o códex, as casas e os troféus. Os níveis são
// só de aparência e sobem com as lendas da vila (cada Senhor vencido, página de bioma completa
// e feito de casa conta 1), sem preço nem manutenção. Na frente, as estátuas de quem deu o golpe
// final num Senhor: 2, 4 ou 6 pedestais pelo nível; cheios, a mais nova entra no lugar da mais
// antiga, menos as que o prefeito fixou.

import { BIOMES } from '../data/biomes.ts';
import { lordOf } from '../data/lords.ts';
import { biomePageComplete, codexOf } from './codex.ts';
import { dayOf } from './calendar.ts';
import { BALANCE as B } from './config.ts';
import { housesOf } from './houses.ts';
import type { Hero, World } from './types.ts';

export type HallResult = { ok: true } | { ok: false; reason: string };

export interface Legends {
  lords: number;
  pages: number;
  deeds: number;
  total: number;
}

export function legendsOf(world: World): Legends {
  const lords = world.metrics.bossKills.length;
  const codex = codexOf(world);
  const pages = BIOMES.filter((_, i) => biomePageComplete(codex, i)).length;
  const deeds = housesOf(world).reduce((n, h) => n + h.deeds.length, 0);
  return { lords, pages, deeds, total: lords + pages + deeds };
}

/** Nível do Salão (1 a 3), só de aparência. */
export function hallLevel(world: World): number {
  const n = legendsOf(world).total;
  return n >= B.hallLevel3Legends ? 3 : n >= B.hallLevel2Legends ? 2 : 1;
}

export const pedestalsOf = (level: number): number => B.hallPedestals[Math.max(0, Math.min(B.hallPedestals.length - 1, level - 1))]!;

/** Quem venceu um Senhor no golpe final, do mais recente ao mais antigo (cada herói uma vez). */
export function lordSlayers(world: World): { hero: Hero; level: number; day: number }[] {
  const seen = new Set<number>();
  const out: { hero: Hero; level: number; day: number }[] = [];
  for (const k of [...world.metrics.bossKills].reverse()) {
    const id = k.slayerId ?? slayerFromDeeds(world, k.level, k.day);
    if (id === undefined || seen.has(id)) continue;
    const hero = world.heroes.find((h) => h.id === id);
    if (!hero) continue;
    seen.add(id);
    out.push({ hero, level: k.level, day: k.day });
  }
  return out;
}

/** Save de antes da F5: o golpe final ficou só no feito do herói ("deu o golpe final no …"). */
function slayerFromDeeds(world: World, level: number, day: number): number | undefined {
  const name = lordOf(level).name.replace(/^(O|A) /, '');
  let best: { id: number; gap: number } | undefined;
  for (const h of world.heroes) {
    for (const d of h.deeds) {
      if (d.kind !== 'chefe' || !d.text.startsWith('deu o golpe final') || !d.text.includes(name)) continue;
      const gap = Math.abs(dayOf(d.tick) - day);
      if (gap <= 2 && (!best || gap < best.gap)) best = { id: h.id, gap };
    }
  }
  return best?.id;
}

/** As estátuas de agora: as fixadas primeiro, depois as mais recentes, até encher os pedestais. */
export function hallStatues(world: World): Hero[] {
  const slots = pedestalsOf(hallLevel(world));
  const slayers = lordSlayers(world).map((s) => s.hero);
  const pinned = (world.pinnedStatues ?? []).map((id) => slayers.find((h) => h.id === id)).filter((h): h is Hero => !!h);
  const rest = slayers.filter((h) => !pinned.includes(h));
  return [...pinned, ...rest].slice(0, slots);
}

/** O prefeito fixa (ou solta) a estátua de um herói. */
export function togglePinStatue(world: World, heroId: number): HallResult {
  const pins = (world.pinnedStatues ??= []);
  const i = pins.indexOf(heroId);
  if (i >= 0) {
    pins.splice(i, 1);
    return { ok: true };
  }
  if (!lordSlayers(world).some((s) => s.hero.id === heroId)) return { ok: false, reason: 'Só ganha estátua quem deu o golpe final num Senhor.' };
  const slots = pedestalsOf(hallLevel(world));
  if (pins.length >= slots) return { ok: false, reason: `Os ${slots} pedestais já estão fixados; solte um antes.` };
  pins.push(heroId);
  return { ok: true };
}
