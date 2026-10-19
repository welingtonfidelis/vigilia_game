import type { BuildingId, MaterialId } from '../sim/types.ts';

export interface LevelCost {
  gold: number;
  materials?: Partial<Record<MaterialId, number>>;
}

export interface BuildingDef {
  id: BuildingId;
  name: string;
  gender: 'm' | 'f';
  blurb: string;
  startLevel: number;
  /** Custo para chegar a cada nível (índice 0 = nível 1). */
  costs: LevelCost[];
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  taverna: {
    id: 'taverna',
    name: 'Taverna',
    gender: 'f',
    blurb: 'Recrutas, diversão e ânimo. Mais recrutas por toque do berrante.',
    startLevel: 1,
    costs: [{ gold: 0 }, { gold: 350, materials: { ossos: 20 } }, { gold: 1100, materials: { ferroNegro: 25 } }],
  },
  estalagem: {
    id: 'estalagem',
    name: 'Estalagem',
    gender: 'f',
    blurb: 'Mais vagas para heróis e descanso melhor.',
    startLevel: 0,
    costs: [{ gold: 100 }, { gold: 380, materials: { ossos: 20 } }, { gold: 1200, materials: { ferroNegro: 25 } }],
  },
  ferreiro: {
    id: 'ferreiro',
    name: 'Ferreiro',
    gender: 'm',
    blurb: 'Armas e armaduras: libera 4 tiers de equipamento por nível.',
    startLevel: 0,
    costs: [{ gold: 120 }, { gold: 420, materials: { ossos: 25 } }, { gold: 1400, materials: { ferroNegro: 30 } }],
  },
  templo: {
    id: 'templo',
    name: 'Templo',
    gender: 'm',
    blurb: 'Fé, ânimo e cura mais rápida.',
    startLevel: 0,
    costs: [{ gold: 150 }, { gold: 400, materials: { ossos: 20 } }, { gold: 1300, materials: { esporos: 25 } }],
  },
  guilda: {
    id: 'guilda',
    name: 'Guilda',
    gender: 'f',
    blurb: 'Mais grupos simultâneos, contratos e doutrina.',
    startLevel: 0,
    costs: [{ gold: 140 }, { gold: 450, materials: { ossos: 25 } }, { gold: 1500, materials: { ferroNegro: 30 } }],
  },
  campo: {
    id: 'campo',
    name: 'Campo de treino',
    gender: 'm',
    blurb: 'Heróis ganham experiência sem descer.',
    startLevel: 0,
    costs: [{ gold: 160 }, { gold: 420, materials: { ossos: 20 } }, { gold: 1300, materials: { esporos: 25 } }],
  },
};

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

export const MAX_BUILDING_LEVEL = 3;
