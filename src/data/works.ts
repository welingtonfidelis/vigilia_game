// Obras do mecenato (M4): heróis ricos pagam, a vila ganha, o nome deles fica.

import type { WorkId } from '../sim/types.ts';

export interface WorkDef {
  id: WorkId;
  name: string;
  /** "o terceiro vitral do templo": o nome no plural/singular para a crônica. */
  noun: string;
  gender: 'm' | 'f';
  place: string;
  effect: string;
}

export const WORKS: Record<WorkId, WorkDef> = {
  estatua: { id: 'estatua', name: 'Estátua', noun: 'estátua', gender: 'f', place: 'da praça', effect: '+2 de reputação' },
  vitral: { id: 'vitral', name: 'Vitral', noun: 'vitral', gender: 'm', place: 'do templo', effect: 'a fé dos heróis cai 5% mais devagar' },
  fonte: { id: 'fonte', name: 'Fonte', noun: 'fonte', gender: 'f', place: 'da praça', effect: '+1 de humor dos moradores' },
  muro: { id: 'muro', name: 'Muro dos nomes', noun: 'trecho do muro dos nomes', gender: 'm', place: 'do memorial', effect: 'o luto passa 5% mais rápido' },
};

export const WORK_IDS = Object.keys(WORKS) as WorkId[];
