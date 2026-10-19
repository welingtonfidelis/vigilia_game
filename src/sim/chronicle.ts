import { ACTS } from '../data/acts.ts';
import { CLASSES } from '../data/classes.ts';
import type { ChronicleKind, Hero, World } from './types.ts';

export function record(world: World, kind: ChronicleKind, heroIds: number[], text: string): void {
  world.chronicle.push({ tick: world.tick, kind, heroIds, text });
}

/** Concordância de gênero: g(h, 'o', 'a'). */
export const g = (hero: Hero, m: string, f: string): string => (hero.gender === 'm' ? m : f);

export const className = (hero: Hero): string => CLASSES[hero.classId].name[hero.gender];

export const heroLabel = (hero: Hero): string => `${hero.name} (${className(hero)} ${hero.rank})`;

export const floorLabel = (act: number, floor: number): string => `andar ${floor + 1} ${ACTS[act]!.of}`;

export function listNames(heroes: Hero[]): string {
  const names = heroes.map((h) => h.name);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}
