// Cães e gatos da vila: pelagens (cada uma com a sua folha de arte) e nomes.

import type { PetSpecies } from '../sim/types.ts';

export interface PetLookDef {
  /** Parte do id da arte: char/pet/<espécie>/<id>. */
  id: string;
  /** Como a crônica descreve ("um cão caramelo"). */
  coat: string;
}

export const PET_LOOKS: Record<PetSpecies, PetLookDef[]> = {
  cao: [
    { id: 'caramelo', coat: 'caramelo' },
    { id: 'preto', coat: 'preto' },
    { id: 'malhado', coat: 'malhado' },
    { id: 'cinza', coat: 'cinzento' },
  ],
  gato: [
    { id: 'laranja', coat: 'laranja rajado' },
    { id: 'preto', coat: 'preto' },
    { id: 'cinza', coat: 'cinza rajado' },
    { id: 'branco', coat: 'branco de manchas' },
  ],
};

export const PET_NAMES: Record<PetSpecies, string[]> = {
  cao: ['Bolinha', 'Pipoca', 'Caramelo', 'Trovão', 'Pingo', 'Farofa', 'Bidu', 'Tufão', 'Paçoca', 'Biscoito', 'Amora', 'Fumaça', 'Rabicó', 'Tição'],
  gato: ['Mimi', 'Frajola', 'Nina', 'Salem', 'Pituca', 'Lua', 'Chumbo', 'Nanquim', 'Bigode', 'Brasinha', 'Neblina', 'Tapioca', 'Zuzu', 'Cinzinha'],
};

export const PET_SPECIES_NAME: Record<PetSpecies, string> = { cao: 'cão', gato: 'gato' };
