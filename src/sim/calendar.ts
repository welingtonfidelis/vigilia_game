import { DAYS_PER_SEASON, DAYS_PER_YEAR, SEASONS, TICKS_PER_DAY, TICKS_PER_HOUR } from './config.ts';

export const dayOf = (tick: number): number => Math.floor(tick / TICKS_PER_DAY);
export const hourOf = (tick: number): number => Math.floor((tick % TICKS_PER_DAY) / TICKS_PER_HOUR);
export const yearOf = (day: number): number => Math.floor(day / DAYS_PER_YEAR) + 1;
export const seasonOf = (day: number): number => Math.floor((day % DAYS_PER_YEAR) / DAYS_PER_SEASON);
export const isNight = (tick: number): boolean => {
  const h = hourOf(tick);
  return h >= 22 || h < 6;
};

export function formatDate(tick: number): string {
  const day = dayOf(tick);
  return `Ano ${yearOf(day)} · ${SEASONS[seasonOf(day)]}, dia ${(day % DAYS_PER_SEASON) + 1}`;
}
