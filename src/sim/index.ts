// API pública do núcleo de simulação. A renderização (Phaser) e a UI só falam com isto.
export { createWorld } from './world.ts';
export { step, runTicks, runDays, type Hooks } from './loop.ts';
export * as commands from './commands.ts';
export { serialize, deserialize, checksum } from './save.ts';
export { autoMayor } from './bot.ts';
export { formatDate, dayOf, hourOf, yearOf } from './calendar.ts';
export { describeHero, heroStats } from './hero.ts';
export * from './config.ts';
export type * from './types.ts';
