import type { ClassId, Rank, Role } from '../sim/types.ts';

export interface ClassDef {
  id: ClassId;
  name: { m: string; f: string };
  role: Role;
  hp: number;
  atk: number;
  def: number;
  /** Ticks entre ações. */
  interval: number;
  /** Fração da defesa inimiga ignorada. */
  pierce: number;
  crit: number;
  blurb: string;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  guardiao: {
    id: 'guardiao',
    name: { m: 'Guardião', f: 'Guardiã' },
    role: 'tank',
    hp: 150,
    atk: 8,
    def: 32,
    interval: 12,
    pierce: 0,
    crit: 0.05,
    blurb: 'Atrai os golpes para si e segura a linha.',
  },
  clerigo: {
    id: 'clerigo',
    name: { m: 'Clérigo', f: 'Clériga' },
    role: 'healer',
    hp: 85,
    atk: 6,
    def: 12,
    interval: 14,
    pierce: 0,
    crit: 0.05,
    blurb: 'Cura quem está ferido, primeiro quem ama.',
  },
  selvagem: {
    id: 'selvagem',
    name: { m: 'Selvagem', f: 'Selvagem' },
    role: 'melee',
    hp: 110,
    atk: 12,
    def: 12,
    interval: 10,
    pierce: 0,
    crit: 0.1,
    blurb: 'Fica mais perigoso quanto mais sangra.',
  },
  lanceiro: {
    id: 'lanceiro',
    name: { m: 'Lanceiro', f: 'Lanceira' },
    role: 'bruiser',
    hp: 115,
    atk: 11,
    def: 20,
    interval: 12,
    pierce: 0.4,
    crit: 0.08,
    blurb: 'Atravessa dois inimigos e fura armaduras.',
  },
  piromante: {
    id: 'piromante',
    name: { m: 'Piromante', f: 'Piromante' },
    role: 'aoe',
    hp: 65,
    atk: 10,
    def: 5,
    interval: 18,
    pierce: 0.2,
    crit: 0.08,
    blurb: 'Fogo em área: ótimo contra hordas, frágil de perto.',
  },
  arqueiro: {
    id: 'arqueiro',
    name: { m: 'Arqueiro', f: 'Arqueira' },
    role: 'ranged',
    hp: 75,
    atk: 13,
    def: 8,
    interval: 11,
    pierce: 0.5,
    crit: 0.2,
    blurb: 'Caça elites e chefes de longe.',
  },
};

export const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

export const RANKS: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export const RANK_MULT: Record<Rank, number> = { E: 0.8, D: 0.9, C: 1, B: 1.1, A: 1.22, S: 1.35 };

export const RANK_MAX_LEVEL: Record<Rank, number> = { E: 10, D: 14, C: 18, B: 22, A: 26, S: 30 };
