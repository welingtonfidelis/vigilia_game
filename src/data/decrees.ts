import type { DecreeId } from '../sim/types.ts';

export interface DecreeDef {
  id: DecreeId;
  name: string;
  description: string;
  detail: string;
  /** Custo único para promulgar. */
  enactCost: number;
  /** Custo diário enquanto estiver ativo. */
  dailyCost: number;
  /** Multiplicador do imposto dos moradores (taxa de guerra). */
  taxMultiplier?: number;
  /** Multiplicador da defesa noturna (toque de recolher). */
  defenseMultiplier?: number;
  /** Humor perdido por dia enquanto o decreto estiver ativo. */
  citizenMoodPerDay?: number;
  /** Custo pago no enterro com honras. */
  funeralCost?: number;
  /** Luto aliviado em todos os heróis no enterro. */
  funeralGriefRelief?: number;
  /** Humor ganho pelos moradores no enterro. */
  funeralCitizenMood?: number;
}

export const DECREE_IDS: DecreeId[] = ['taxa-guerra', 'toque-recolher', 'funeral-honras'];

export const DECREES: Record<DecreeId, DecreeDef> = {
  'taxa-guerra': {
    id: 'taxa-guerra',
    name: 'Taxa de guerra',
    description: '+25% no imposto dos moradores.',
    detail: 'O tesouro respira, mas a vila paga com 0,5 de humor por dia.',
    enactCost: 20,
    dailyCost: 0,
    taxMultiplier: 1.25,
    citizenMoodPerDay: 0.5,
  },
  'toque-recolher': {
    id: 'toque-recolher',
    name: 'Toque de recolher',
    description: '+20% na defesa contra incursões.',
    detail: 'Guardas e milícia ficam de prontidão; a vila perde 0,7 de humor por dia.',
    enactCost: 15,
    dailyCost: 1,
    defenseMultiplier: 1.2,
    citizenMoodPerDay: 0.7,
  },
  'funeral-honras': {
    id: 'funeral-honras',
    name: 'Funeral com honras',
    description: 'Enterros pagos aliviam o luto e o humor da vila.',
    detail: 'Cada herói sepultado custa 25 de ouro, alivia 10 de luto de todos e dá +2 de humor aos moradores. Custa 1 de ouro por dia de fundo.',
    enactCost: 20,
    dailyCost: 1,
    funeralCost: 25,
    funeralGriefRelief: 10,
    funeralCitizenMood: 2,
  },
};
