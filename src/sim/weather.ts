// Clima do dia (M6 F6). Sai da semente e do dia, sem estado no save, e não muda nada no jogo:
// é a cara da vila (chuva, neve, folhas, flores) e o que a data no topo diz. O dia do evento da
// tempestade (verão) é tempestade, e o da geada (inverno) é nevasca. A neve acumula no chão com
// os dias de neve do inverno e derrete nos três primeiros dias da primavera.

import { SEASON_EVENTS } from '../data/seasonal-events.ts';
import { seasonOf, yearOf } from './calendar.ts';
import { DAYS_PER_SEASON } from './config.ts';
import { stableRoll } from './rng.ts';
import type { World } from './types.ts';

export type WeatherKind = 'limpo' | 'garoa' | 'chuva' | 'tempestade' | 'vento' | 'neve' | 'nevasca';

export const WEATHER_NAMES: Record<WeatherKind, string> = {
  limpo: 'tempo limpo',
  garoa: 'garoa',
  chuva: 'chuva',
  tempestade: 'tempestade',
  vento: 'vento',
  neve: 'neve',
  nevasca: 'nevasca',
};

/** Evento da estação que cai neste dia (o primeiro da estação), pela ordem fixa de cada ano. */
function eventOn(day: number): string | null {
  if (day <= 0 || day % DAYS_PER_SEASON !== 0) return null;
  const pool = SEASON_EVENTS[seasonOf(day)] ?? [];
  return pool.length ? (pool[(yearOf(day) - 1) % pool.length] ?? null) : null;
}

export function weatherOn(world: World, day: number): WeatherKind {
  const ev = eventOn(day);
  if (ev === 'tempestade') return 'tempestade';
  if (ev === 'geada') return 'nevasca';
  const r = stableRoll(world.seed, day, 1100);
  switch (seasonOf(day)) {
    case 0:
      return r < 0.25 ? 'garoa' : 'limpo';
    case 1:
      return r < 1 / 3 ? 'chuva' : 'limpo';
    case 2:
      return r < 0.25 ? 'chuva' : 'vento';
    default:
      return r < 1 / 6 ? 'nevasca' : r < 0.5 ? 'neve' : 'limpo';
  }
}

/** Neve no chão (0 a 1) no fim do dia. */
export function snowCover(world: World, day: number): number {
  const season = seasonOf(day);
  const inSeason = day % DAYS_PER_SEASON;
  if (season === 3) {
    let cover = 0;
    for (let d = day - inSeason; d <= day; d++) {
      const w = weatherOn(world, d);
      cover = Math.max(0, Math.min(1, cover + (w === 'nevasca' ? 0.5 : w === 'neve' ? 0.25 : -0.08)));
    }
    return cover;
  }
  // Começo da primavera: a neve do fim do inverno derrete em três dias.
  if (season === 0 && inSeason < 3 && day > 0) return snowCover(world, day - inSeason - 1) * (1 - (inSeason + 1) / 3);
  return 0;
}

// ── Agenda da praça (M6 F6) ────────────────────────────────────────────────
// Feira ao ar livre no 3º e no 8º dia de cada estação, das 8h às 17h; bardo em uma de cada
// quatro noites sem chuva nem neve, das 19h às 23h. Só aparência, como o clima.

export const MARKET_HOURS: [number, number] = [8, 17];
export const BARD_HOURS: [number, number] = [19, 23];

export const marketDay = (day: number): boolean => {
  const d = day % DAYS_PER_SEASON;
  return d === 2 || d === 7;
};

export function bardNight(world: World, day: number): boolean {
  const w = weatherOn(world, day);
  if (w !== 'limpo' && w !== 'vento') return false;
  return stableRoll(world.seed, day, 1200) < 0.25;
}
