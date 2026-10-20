// Cores próprias da vila (a arte vem dos pacotes; aqui só o que é marcação do jogo).

import type { Rank } from '../sim/index.ts';

export const RANK_COLORS: Record<Rank, number> = {
  E: 0x8a8a8a,
  D: 0x6aa84f,
  C: 0x4a86c8,
  B: 0x9a5ac8,
  A: 0xe08a2a,
  S: 0xf0c040,
};
