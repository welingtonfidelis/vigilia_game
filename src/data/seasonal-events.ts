import type { SeasonalEventId } from '../sim/types.ts';

export interface SeasonalChoiceDef {
  id: string;
  label: string;
  detail: string;
  cost: number;
  /**
   * A escolha poupa os prédios de um desgaste (M5 F4): o preço passa a ser uma parte do
   * conserto que ela evita, para a escolha pesar também numa vila grande.
   */
  shields?: { damage: number; buildings: number };
}

export interface SeasonalEventDef {
  id: SeasonalEventId;
  title: string;
  intro: string;
  choices: SeasonalChoiceDef[];
}

/** Primavera, Verão, Outono, Inverno; cada estação gira pelos seus eventos, um por ano. */
export const SEASON_EVENTS: SeasonalEventId[][] = [
  ['caravana'],
  ['peste', 'eclipse', 'tempestade'],
  ['festival-colheita'],
  ['cobrador', 'visita-lendaria', 'geada'],
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
        detail: 'Custa 40 de ouro. A vila recebe 6 de cada material que o abismo já mostrou.',
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
    intro: 'O sol some atrás da lua e o abismo responde. Uma onda de pressão sobe pelas passagens.',
    choices: [
      {
        id: 'conter',
        label: 'Conter a maré',
        detail: 'Custa 40 de ouro. Os heróis seguram a pressão das passagens abertas, mas se desgastam.',
        cost: 40,
      },
      {
        id: 'rezar',
        label: 'Rezar no templo',
        detail: 'Sem custo. O povo se acalma, mas a pressão do abismo avança.',
        cost: 0,
      },
      { id: 'observar', label: 'Observar o eclipse', detail: 'Sem custo. A pressão do abismo dispara e os heróis perdem ânimo.', cost: 0 },
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
  tempestade: {
    id: 'tempestade',
    title: 'Tempestade de verão',
    intro: 'Nuvens pretas descem do desfiladeiro. O vento arranca telhas antes da primeira gota, e os telhados não vão aguentar todos.',
    choices: [
      {
        id: 'reforcar',
        label: 'Reforçar os telhados',
        detail: 'Os pedreiros amarram telhas e escoram paredes. A tempestade passa sem estrago.',
        cost: 40,
        shields: { damage: 15, buildings: 2 },
      },
      { id: 'abrigar', label: 'Abrigar a vila e esperar', detail: 'Sem custo. Dois prédios perdem 15 de conservação.', cost: 0 },
    ],
  },
  geada: {
    id: 'geada',
    title: 'A grande geada',
    intro: 'O inverno chega de uma vez. A água congela nas calhas e racha as pedras, e a lenha da vila não dá para todo mundo.',
    choices: [
      {
        id: 'lenha',
        label: 'Comprar lenha e palha',
        detail: 'As lareiras ficam acesas e as paredes aguentam o frio. Os moradores agradecem.',
        cost: 40,
        shields: { damage: 8, buildings: 7 },
      },
      { id: 'aguentar', label: 'Aguentar o frio', detail: 'Sem custo. Todos os prédios perdem 8 de conservação e os moradores reclamam.', cost: 0 },
    ],
  },
};
