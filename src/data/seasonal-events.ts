import type { SeasonalEventId } from '../sim/types.ts';

export interface SeasonalChoiceDef {
  id: string;
  label: string;
  detail: string;
  cost: number;
}

export interface SeasonalEventDef {
  id: SeasonalEventId;
  title: string;
  intro: string;
  choices: SeasonalChoiceDef[];
}

/** Primavera, Verão, Outono, Inverno. Verão fica sem evento nesta primeira fatia. */
export const SEASON_EVENTS: (SeasonalEventId | null)[] = ['caravana', null, 'festival-colheita', 'cobrador'];

export const SEASONAL_EVENTS: Record<SeasonalEventId, SeasonalEventDef> = {
  caravana: {
    id: 'caravana',
    title: 'Caravana de mercadores',
    intro: 'Uma caravana de estradas cinzentas para na praça. Os mercadores têm materiais do abismo e uma relíquia antiga.',
    choices: [
      {
        id: 'materiais',
        label: 'Comprar materiais',
        detail: 'Custa 40 de ouro. Cada ato aberto recebe 6 materiais.',
        cost: 40,
      },
      {
        id: 'reliquia',
        label: 'Comprar a relíquia',
        detail: 'Custa 60 de ouro. Todos os heróis ativos ganham ânimo e lealdade; a vila ganha reputação.',
        cost: 60,
      },
      { id: 'recusar', label: 'Deixar a caravana seguir', detail: 'Sem custo. A vila não perde nem ganha nada.', cost: 0 },
    ],
  },
  'festival-colheita': {
    id: 'festival-colheita',
    title: 'Festival da colheita',
    intro: 'É outono. Os celeiros estão cheios e a vila espera uma festa — ou uma desculpa para economizar.',
    choices: [
      {
        id: 'financiar',
        label: 'Financiar o festival',
        detail: 'Custa 50 de ouro. Moradores e heróis ganham ânimo, e a vila ganha reputação.',
        cost: 50,
      },
      { id: 'poupar', label: 'Poupar o ouro', detail: 'Sem custo. Os moradores ficam decepcionados.', cost: 0 },
    ],
  },
  cobrador: {
    id: 'cobrador',
    title: 'O cobrador do rei',
    intro: 'Um cobrador do rei chega no inverno com um selo e uma conta antiga. Ele não pede duas vezes.',
    choices: [
      {
        id: 'pagar',
        label: 'Pagar a conta',
        detail: 'Custa 80 de ouro. A vila mantém a reputação e os heróis confiam no prefeito.',
        cost: 80,
      },
      {
        id: 'negociar',
        label: 'Negociar o valor',
        detail: 'Custa 40 de ouro. A vila perde um pouco de reputação e os moradores resmungam.',
        cost: 40,
      },
      { id: 'recusar', label: 'Recusar o pagamento', detail: 'Sem custo imediato. Reputação, lealdade e humor caem.', cost: 0 },
    ],
  },
};
