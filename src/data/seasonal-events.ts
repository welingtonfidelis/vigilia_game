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
export const SEASON_EVENTS: SeasonalEventId[][] = [
  ['caravana'],
  ['peste', 'eclipse'],
  ['festival-colheita'],
  ['cobrador', 'visita-lendaria'],
];

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
  peste: {
    id: 'peste',
    title: 'Peste na vila',
    intro: 'Uma febre cinzenta atravessa as casas. O boticário pede decisões rápidas antes que o inverno feche as estradas.',
    choices: [
      {
        id: 'tratar',
        label: 'Pagar o tratamento',
        detail: 'Custa 60 de ouro. Os doentes melhoram e a vila recupera o ânimo.',
        cost: 60,
      },
      {
        id: 'quarentena',
        label: 'Fechar as casas',
        detail: 'Custa 20 de ouro. A peste para, mas os moradores se sentem isolados.',
        cost: 20,
      },
      { id: 'ignorar', label: 'Deixar passar', detail: 'Sem custo. A peste se espalha e o humor despenca.', cost: 0 },
    ],
  },
  eclipse: {
    id: 'eclipse',
    title: 'Eclipse sobre o abismo',
    intro: 'O sol some atrás da lua e o abismo responde. Uma onda de corrupção sobe pelos andares.',
    choices: [
      {
        id: 'conter',
        label: 'Conter a maré',
        detail: 'Custa 40 de ouro. Os heróis seguram a corrupção nos atos abertos, mas se desgastam.',
        cost: 40,
      },
      {
        id: 'rezar',
        label: 'Rezar no templo',
        detail: 'Sem custo. O povo se acalma, mas a corrupção avança.',
        cost: 0,
      },
      { id: 'observar', label: 'Observar o eclipse', detail: 'Sem custo. A corrupção dispara e os heróis perdem ânimo.', cost: 0 },
    ],
  },
  'visita-lendaria': {
    id: 'visita-lendaria',
    title: 'A lenda que voltou',
    intro: 'Uma heroína de outra era chega à vila. Ela não vai descer com vocês, mas pode deixar uma lição.',
    choices: [
      {
        id: 'hospedar',
        label: 'Hospedar a lenda',
        detail: 'Custa 80 de ouro. A vila ganha reputação e os heróis se inspiram.',
        cost: 80,
      },
      {
        id: 'ouvir',
        label: 'Ouvir suas histórias',
        detail: 'Sem custo. Os heróis ganham lealdade e ânimo.',
        cost: 0,
      },
      { id: 'recusar', label: 'Recusar a visita', detail: 'Sem custo. A vila perde prestígio.', cost: 0 },
    ],
  },
};
