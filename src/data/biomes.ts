import type { BossMech, EnemyUnitDef, MaterialId } from '../sim/types.ts';

export interface BossDef extends EnemyUnitDef {
  mech: BossMech;
  adds: number;
}

// Biomas das dimensões do abismo (M5): cenário, monstros, material e o Senhor ligado a
// cada um. A força vem do nível do abismo, não do bioma (src/sim/dungeon.ts). Os seis
// primeiros eram os atos fixos de antes e mantêm toda a arte (o índice escolhe a arte); os
// quatro últimos são as dimensões fundas dos Senhores 6 a 9 (M5 F6).

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
  // Dimensões mais fundas (M5 F6): uma por Senhor dos níveis 6 a 9, cada uma de uma família
  // de material de sempre. Arte própria (numerais VII a X no corredor).
  {
    name: 'Colmeia Pálida',
    of: 'da Colmeia Pálida',
    material: 'esporos',
    minLevel: 6,
    enemies: [
      { id: 'zangao', name: 'Zangão de Quitina', hp: 55, atk: 9, def: 15, interval: 13, tags: [] },
      { id: 'mariposa', name: 'Mariposa Pálida', hp: 35, atk: 8, def: 2, interval: 8, tags: ['swarm'] },
      { id: 'casulo', name: 'Casulo Vivo', hp: 110, atk: 9, def: 35, interval: 18, tags: [] },
    ],
    boss: {
      id: 'rainhaEsporos',
      name: 'A Rainha dos Esporos',
      hp: 1100,
      atk: 15,
      def: 30,
      interval: 14,
      tags: ['boss'],
      mech: 'colmeia',
      adds: 2,
    },
  },
  {
    name: 'Fossa Cantante',
    of: 'da Fossa Cantante',
    material: 'perolas',
    minLevel: 7,
    enemies: [
      { id: 'peixeLanterna', name: 'Peixe-lanterna', hp: 45, atk: 10, def: 5, interval: 14, tags: ['backline'] },
      { id: 'aguaViva', name: 'Água-viva Abissal', hp: 35, atk: 7, def: 0, interval: 9, tags: ['swarm'] },
      { id: 'caranguejo', name: 'Caranguejo de Casco Negro', hp: 105, atk: 10, def: 40, interval: 18, tags: [] },
    ],
    boss: {
      id: 'coroSubmerso',
      name: 'O Coro Submerso',
      hp: 1200,
      atk: 15,
      def: 25,
      interval: 15,
      tags: ['boss'],
      mech: 'canto',
      adds: 2,
    },
  },
  {
    name: 'Cidadela de Engrenagens',
    of: 'da Cidadela de Engrenagens',
    material: 'ferroNegro',
    minLevel: 8,
    enemies: [
      { id: 'automato', name: 'Autômato Sentinela', hp: 70, atk: 10, def: 25, interval: 15, tags: [] },
      { id: 'aranhaEngrenagem', name: 'Aranha de Engrenagem', hp: 35, atk: 8, def: 10, interval: 9, tags: ['swarm'] },
      { id: 'fornalha', name: 'Fornalha Ambulante', hp: 110, atk: 11, def: 35, interval: 19, tags: [] },
    ],
    boss: {
      id: 'colosso',
      name: 'O Colosso de Ferro-negro',
      hp: 1300,
      atk: 17,
      def: 45,
      interval: 17,
      tags: ['boss'],
      mech: 'placas',
      adds: 2,
    },
  },
  {
    name: 'Deserto de Ossos',
    of: 'do Deserto de Ossos',
    material: 'ossos',
    minLevel: 9,
    enemies: [
      { id: 'mumia', name: 'Múmia Errante', hp: 60, atk: 10, def: 12, interval: 15, tags: [] },
      { id: 'chacal', name: 'Chacal de Ossos', hp: 38, atk: 8, def: 4, interval: 8, tags: ['swarm'] },
      { id: 'escorpiao', name: 'Escorpião Gigante', hp: 100, atk: 12, def: 30, interval: 16, tags: [] },
    ],
    boss: {
      id: 'reiOssuarios',
      name: 'O Rei dos Ossuários',
      hp: 1250,
      atk: 16,
      def: 35,
      interval: 15,
      tags: ['boss'],
      mech: 'exercito',
      adds: 2,
    },
  },
];
