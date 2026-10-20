// Paleta da vila: escura, com luzes quentes (vila acolhedora × abismo).

import type { ClassId, Rank } from '../sim/index.ts';

export const C = {
  grass: 0x2c3824,
  grassLight: 0x3a4a2c,
  grassDark: 0x222c1c,
  dirt: 0x6b5638,
  dirtEdge: 0x54432b,
  cobble: 0x6e6a5e,
  cobbleDark: 0x58554b,
  stone: 0x8a857a,
  stoneDark: 0x5f5b52,
  wood: 0x7a5232,
  woodDark: 0x553820,
  ink: 0x14110e,
  abyss: 0x07060a,
  abyssGlow: 0x6a2a8a,
  warm: 0xffc46b,
  fire: 0xff8a2a,
  gold: 0xe9b949,
  goldDark: 0xa87a22,
  pine: 0x1e3a2a,
  pineDark: 0x152a1e,
  leaf: 0x2f4f2a,
  night: 0x0b0f24,
};

export const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

export const CLASS_COLORS: Record<ClassId, { main: number; dark: number; accent: number }> = {
  guardiao: { main: 0x4a6a8a, dark: 0x33495f, accent: 0xa9b6c2 },
  clerigo: { main: 0xe4dcc6, dark: 0xb5ab93, accent: 0xd8a63c },
  selvagem: { main: 0x7a4a2a, dark: 0x55321c, accent: 0xb08a5a },
  lanceiro: { main: 0x3f6b4a, dark: 0x2b4a33, accent: 0xc9c2b0 },
  piromante: { main: 0xa8402a, dark: 0x74281a, accent: 0xffb030 },
  arqueiro: { main: 0x55702f, dark: 0x3a4d20, accent: 0x9a6a3a },
};

export const RANK_COLORS: Record<Rank, number> = {
  E: 0x8a8a8a,
  D: 0x6aa84f,
  C: 0x4a86c8,
  B: 0x9a5ac8,
  A: 0xe08a2a,
  S: 0xf0c040,
};

export const SKIN = [0xf1c9a5, 0xe0ac80, 0xc68a5c, 0x9a6440, 0x704a2e];
export const HAIR = [0x2b1d14, 0x4a2f1b, 0x7a4a22, 0xb07a3a, 0xd9b56a, 0x8a8a8a, 0x5a1f12];
