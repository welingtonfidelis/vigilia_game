import type { BossMech, EnemyUnitDef, MaterialId } from '../sim/types.ts';

export interface BossDef extends EnemyUnitDef {
  mech: BossMech;
  adds: number;
}

// Biomas das dimensões do abismo (M5): cenário, monstros, material e o Senhor ligado a
// cada um. A força vem do nível do abismo, não do bioma (src/sim/dungeon.ts). Os seis
// primeiros eram os atos fixos de antes e mantêm toda a arte (o índice escolhe a arte).

export interface BiomeDef {
  name: string;
  /** Nome com preposição: "das Catacumbas". */
  of: string;
  material: MaterialId;
  /** Nível do abismo a partir do qual o bioma pode aparecer numa passagem nova. */
  minLevel: number;
  enemies: EnemyUnitDef[];
  /** O Senhor do bioma (contrato do amuleto, M5 F2). */
  boss: BossDef;
}

export const MATERIAL_NAMES: Record<MaterialId, string> = {
  ossos: 'Ossos',
  ferroNegro: 'Ferro-negro',
  esporos: 'Esporos',
  perolas: 'Pérolas negras',
  brasas: 'Brasas',
  almas: 'Fragmentos de alma',
};

export const BIOMES: BiomeDef[] = [
  {
    name: 'Catacumbas',
    of: 'das Catacumbas',
    material: 'ossos',
    minLevel: 1,
    enemies: [
      { id: 'esqueleto', name: 'Esqueleto Rangente', hp: 55, atk: 7, def: 10, interval: 14, tags: [] },
      { id: 'rato', name: 'Rato-de-ossuário', hp: 30, atk: 5, def: 0, interval: 9, tags: ['swarm'] },
      { id: 'acolito', name: 'Acólito Caído', hp: 45, atk: 9, def: 5, interval: 16, tags: ['backline'] },
    ],
    boss: {
      id: 'guardiaoUrnas',
      name: 'O Guardião das Urnas',
      hp: 900,
      atk: 15,
      def: 30,
      interval: 16,
      tags: ['boss'],
      mech: 'invocar',
      adds: 2,
    },
  },
  {
    name: 'Minas Inundadas',
    of: 'das Minas Inundadas',
    material: 'ferroNegro',
    minLevel: 1,
    enemies: [
      { id: 'mineiro', name: 'Mineiro Afogado', hp: 60, atk: 8, def: 12, interval: 14, tags: [] },
      { id: 'enguia', name: 'Enguia de Breu', hp: 35, atk: 7, def: 2, interval: 8, tags: ['swarm'] },
      { id: 'golem', name: 'Golem de Ferro-negro', hp: 110, atk: 10, def: 45, interval: 20, tags: [] },
    ],
    boss: {
      id: 'couraca',
      name: 'A Couraça Submersa',
      hp: 1000,
      atk: 15,
      def: 140,
      interval: 18,
      tags: ['boss'],
      mech: 'couraca',
      adds: 2,
    },
  },
  {
    name: 'Jardim de Fungos',
    of: 'do Jardim de Fungos',
    material: 'esporos',
    minLevel: 2,
    enemies: [
      { id: 'esporento', name: 'Esporento', hp: 50, atk: 7, def: 8, interval: 13, tags: [] },
      { id: 'aranha', name: 'Aranha-de-micélio', hp: 40, atk: 9, def: 6, interval: 10, tags: ['backline'] },
      { id: 'brotado', name: 'Brotado', hp: 90, atk: 9, def: 15, interval: 16, tags: [] },
    ],
    boss: {
      id: 'maeBolor',
      name: 'A Mãe-Bolor',
      hp: 1000,
      atk: 13,
      def: 30,
      interval: 16,
      tags: ['boss'],
      mech: 'veneno',
      adds: 2,
    },
  },
  {
    name: 'Cidade Afogada',
    of: 'da Cidade Afogada',
    material: 'perolas',
    minLevel: 3,
    enemies: [
      { id: 'sacerdote', name: 'Sacerdote Afogado', hp: 50, atk: 10, def: 10, interval: 15, tags: ['backline'] },
      { id: 'sereia', name: 'Sereia de Lodo', hp: 45, atk: 8, def: 6, interval: 11, tags: [] },
      { id: 'cavaleiroSalobro', name: 'Cavaleiro Salobro', hp: 100, atk: 10, def: 30, interval: 15, tags: [] },
    ],
    boss: {
      id: 'arcebispo',
      name: 'O Arcebispo Sem Fôlego',
      hp: 1100,
      atk: 14,
      def: 35,
      interval: 16,
      tags: ['boss'],
      mech: 'maldicao',
      adds: 2,
    },
  },
  {
    name: 'Forja Abissal',
    of: 'da Forja Abissal',
    material: 'brasas',
    minLevel: 5,
    enemies: [
      { id: 'ferreiroCinzento', name: 'Ferreiro Cinzento', hp: 80, atk: 10, def: 25, interval: 15, tags: [] },
      { id: 'caoBrasa', name: 'Cão de Brasa', hp: 40, atk: 8, def: 5, interval: 8, tags: ['swarm'] },
      { id: 'escravoForja', name: 'Escravo da Forja', hp: 60, atk: 11, def: 10, interval: 14, tags: ['backline'] },
    ],
    boss: {
      id: 'martelo',
      name: 'O Martelo Que Não Dorme',
      hp: 1200,
      atk: 17,
      def: 40,
      interval: 15,
      tags: ['boss'],
      mech: 'retaguarda',
      adds: 2,
    },
  },
  {
    name: 'Coração do Abismo',
    of: 'do Coração do Abismo',
    material: 'almas',
    minLevel: 7,
    enemies: [
      { id: 'sombra', name: 'Sombra Faminta', hp: 55, atk: 10, def: 10, interval: 11, tags: [] },
      { id: 'lamento', name: 'Lamento', hp: 45, atk: 11, def: 5, interval: 14, tags: ['backline'] },
      { id: 'arauto', name: 'Arauto do Fundo', hp: 100, atk: 11, def: 30, interval: 16, tags: [] },
    ],
    boss: {
      id: 'aquiloQueVigia',
      name: 'Aquilo que Vigia',
      hp: 1400,
      atk: 16,
      def: 40,
      interval: 15,
      tags: ['boss'],
      mech: 'ecos',
      adds: 1,
    },
  },
];

