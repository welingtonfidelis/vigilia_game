// Dificuldade: multiplicadores que a simulação aplica por cima do balanceamento.
// Normal é o jogo de sempre (tudo 1); Fácil e Difícil mexem no ritmo dos heróis, no
// ouro e nas peças do abismo, no que o prefeito paga e na pressão do abismo.

import type { Difficulty } from '../sim/types.ts';

export interface DifficultyDef {
  id: Difficulty;
  name: string;
  description: string;
  /** Experiência dos heróis (abismo e treino). */
  xp: number;
  /** Ouro do saque de cada expedição. */
  gold: number;
  /** Chance de peça rara e épica nos baús e nos elites. */
  rarity: number;
  /** Custos do prefeito: prédios, berrante, festa, decretos, eventos, encomendas e lotes. */
  costs: number;
  /** Força dos monstros nos andares. */
  enemy: number;
  /** Corrupção que os atos ganham por dia. */
  corruption: number;
  /** Força das incursões noturnas. */
  raid: number;
}

export const DIFFICULTY_IDS: readonly Difficulty[] = ['facil', 'normal', 'dificil'];

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  facil: {
    id: 'facil',
    name: 'Fácil',
    description: 'Heróis sobem de nível mais rápido, o abismo paga mais e solta mais peças raras, tudo custa menos e o abismo pressiona menos.',
    xp: 1.4,
    gold: 1.3,
    rarity: 1.5,
    costs: 0.8,
    enemy: 0.9,
    corruption: 0.8,
    raid: 0.8,
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    description: 'O equilíbrio pensado para a campanha.',
    xp: 1,
    gold: 1,
    rarity: 1,
    costs: 1,
    enemy: 1,
    corruption: 1,
    raid: 1,
  },
  dificil: {
    id: 'dificil',
    name: 'Difícil',
    description: 'Heróis demoram mais a subir, o abismo paga menos e solta menos peças raras, tudo custa mais e a pressão do abismo e as incursões apertam.',
    xp: 0.85,
    gold: 0.85,
    rarity: 0.65,
    costs: 1.25,
    enemy: 1,
    corruption: 1.15,
    raid: 1.25,
  },
};
