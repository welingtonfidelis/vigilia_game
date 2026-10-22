// Dificuldade do mundo: a tabela fica em src/data/difficulty.ts; aqui, o acesso a ela e o
// arredondamento dos custos, para a regra e a tela mostrarem o mesmo número.

import { DIFFICULTIES, type DifficultyDef } from '../data/difficulty.ts';
import type { World } from './types.ts';

/** Multiplicadores da dificuldade do mundo (save antigo sem o campo: Normal). */
export const difficultyOf = (world: World): DifficultyDef => DIFFICULTIES[world.difficulty ?? 'normal'];

/** Um custo em ouro do prefeito já com a dificuldade (arredondado; zero continua zero). */
export const scaledCost = (world: World, gold: number): number => (gold <= 0 ? 0 : Math.max(1, Math.round(gold * difficultyOf(world).costs)));
