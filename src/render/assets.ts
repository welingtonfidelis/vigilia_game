// Assets de terceiros (CC0) e o mapeamento do jogo para eles. Sem Phaser: a UI em DOM
// também usa (retratos e monstros em CSS).
//   Kenney · Tiny Town ........ vila (tiles 16×16, folha 12×11 sem espaçamento)
//   0x72 · DungeonTileset II .. heróis, monstros, moedas e a masmorra

import type { ClassId, Gender } from '../sim/index.ts';
import { FRAMES_0X72, SHEET_0X72_SIZE } from './atlas0x72.ts';

const BASE = import.meta.env?.BASE_URL ?? '/';
export const TOWN_URL = `${BASE}assets/kenney-tiny-town/Tilemap/tilemap_packed.png`;
export const DUNGEON_URL = `${BASE}assets/0x72-dungeontileset-ii/0x72_DungeonTilesetII_v1.7.png`;

/** Cada pixel da arte vale 2 unidades do mundo (o tile de 16 px ocupa 32). */
export const ART_SCALE = 2;
export const TILE = 16 * ART_SCALE;

/** Índices da folha do Tiny Town (linha × 12 + coluna). */
export const T = {
  grass: 0,
  grassTuft: 1,
  grassFlower: 2,
  // Terra em 9 partes e cantos internos (a grama fica no canto indicado)
  dirtTL: 12,
  dirtT: 13,
  dirtTR: 14,
  dirtL: 24,
  dirt: 25,
  dirtR: 26,
  dirtBL: 36,
  dirtB: 37,
  dirtBR: 38,
  dirtInNW: 39,
  dirtInNE: 40,
  dirtInSE: 41,
  dirtInSW: 42,
  stones: 43,
  // Árvores (as altas ocupam 2 tiles: topo + base)
  autumnTop: 3,
  autumnBase: 15,
  pineTop: 4,
  pineBase: 16,
  bush: 5,
  sprout: 17,
  mushrooms: 29,
  autumnSmall: 27,
  pineSmall: 28,
  // Floresta em 9 partes
  forest: [6, 7, 8, 18, 19, 20, 30, 31, 32] as const,
  autumnForest: [9, 10, 11, 21, 22, 23, 33, 34, 35] as const,
  // Telhados: topo (esq, meio, dir), beiral (esq, meio, dir), água-furtada, empena
  roofGray: { tl: 48, t: 49, tr: 50, bl: 60, b: 61, br: 62, dormer: 51, gable: 63 },
  roofRed: { tl: 52, t: 53, tr: 54, bl: 64, b: 65, br: 66, dormer: 55, gable: 67 },
  // Paredes: borda esq, meio, vão aberto, borda dir, janela, porta
  wood: { l: 72, m: 73, gap: 74, r: 75, win: 84, door: 86 },
  stone: { l: 76, m: 77, gap: 78, r: 79, win: 88, door: 89 },
  // Cercas e madeira
  fenceL: 68,
  fenceM: 69,
  fenceR: 70,
  post: 71,
  fenceVTop: 47,
  fenceV: 59,
  logL: 80,
  logM: 81,
  logR: 82,
  sign: 83,
  frameTL: 44,
  frameT: 45,
  frameTR: 46,
  frameL: 56,
  frameR: 58,
  // Coisas
  hut: 92,
  hay: 93,
  hive: 94,
  target: 95,
  stoneBlock: 102,
  shelf: 103,
  well: 104,
  log: 106,
  sack: 107,
  pickaxe: 115,
  axe: 127,
  hammer: 128,
  bucket: 131,
  // Castelo (abadia na beira do abismo)
  battlementL: 99,
  battlementM: 100,
  battlementR: 101,
  archL: 111,
  archM: 112,
  archR: 113,
  gateL: 123,
  gateR: 124,
  slit: 125,
  brick: 126,
} as const;

/** Tiles que são janela (acendem à noite). */
export const WINDOW_TILES: ReadonlySet<number> = new Set([T.wood.win, T.stone.win, T.roofGray.dormer, T.roofRed.dormer, T.slit]);

// ── 0x72 ──────────────────────────────────────────────────────────────────

export type HeroBody = 'knight' | 'elf' | 'wizzard' | 'lizard' | 'dwarf';

export interface ClassLook {
  body: HeroBody;
  weapon: string | null;
}

export const CLASS_LOOK: Record<ClassId, ClassLook> = {
  guardiao: { body: 'knight', weapon: 'weapon_knight_sword' },
  selvagem: { body: 'lizard', weapon: 'weapon_axe' },
  lanceiro: { body: 'dwarf', weapon: 'weapon_spear' },
  arqueiro: { body: 'elf', weapon: 'weapon_bow' },
  clerigo: { body: 'wizzard', weapon: 'weapon_green_magic_staff' },
  piromante: { body: 'wizzard', weapon: 'weapon_red_magic_staff' },
};

export const heroSprite = (classId: ClassId, gender: Gender): string => `${CLASS_LOOK[classId].body}_${gender}`;

/** Nome da arma de classe, para a ficha (o desenho no mapa foi retirado). */
export const WEAPON_NAMES: Record<ClassId, string> = {
  guardiao: 'espada de cavaleiro',
  selvagem: 'machado de guerra',
  lanceiro: 'lança',
  arqueiro: 'arco',
  clerigo: 'cajado sagrado',
  piromante: 'cajado de fogo',
};

export const MAYOR_SPRITE = 'doc';

export interface MonsterLook {
  /** Fallback 0x72 para ecos de herói e casos sem arte nova. */
  base?: string;
  /** Asset ID do pack 1.7: char/monster/<id> ou char/boss/<id>. */
  asset?: string;
  frameSize?: [number, number];
  ghost?: boolean;
}

/** Inimigos de cada ato (por id em src/data/acts.ts) e o chefe. */
export const MONSTERS: Record<string, MonsterLook> = {
  esqueleto: { asset: 'char/monster/esqueleto', frameSize: [16, 16] },
  rato: { asset: 'char/monster/rato', frameSize: [16, 16] },
  acolito: { asset: 'char/monster/acolito', frameSize: [16, 23] },
  guardiaoUrnas: { asset: 'char/boss/guardiaoUrnas', frameSize: [32, 36] },
  mineiro: { asset: 'char/monster/mineiro', frameSize: [16, 23] },
  enguia: { asset: 'char/monster/enguia', frameSize: [16, 16] },
  golem: { asset: 'char/monster/golem', frameSize: [16, 23] },
  couraca: { asset: 'char/boss/couraca', frameSize: [32, 36] },
  esporento: { asset: 'char/monster/esporento', frameSize: [16, 16] },
  aranha: { asset: 'char/monster/aranha', frameSize: [16, 23] },
  brotado: { asset: 'char/monster/brotado', frameSize: [16, 16] },
  maeBolor: { asset: 'char/boss/maeBolor', frameSize: [32, 36] },
  sacerdote: { asset: 'char/monster/sacerdote', frameSize: [16, 23] },
  sereia: { asset: 'char/monster/sereia', frameSize: [16, 16] },
  cavaleiroSalobro: { asset: 'char/monster/cavaleiroSalobro', frameSize: [16, 23] },
  arcebispo: { asset: 'char/boss/arcebispo', frameSize: [32, 36] },
  ferreiroCinzento: { asset: 'char/monster/ferreiroCinzento', frameSize: [16, 23] },
  caoBrasa: { asset: 'char/monster/caoBrasa', frameSize: [16, 16] },
  escravoForja: { asset: 'char/monster/escravoForja', frameSize: [16, 23] },
  martelo: { asset: 'char/boss/martelo', frameSize: [32, 36] },
  sombra: { asset: 'char/monster/sombra', frameSize: [16, 23] },
  lamento: { asset: 'char/monster/lamento', frameSize: [16, 23] },
  arauto: { asset: 'char/monster/arauto', frameSize: [16, 23] },
  aquiloQueVigia: { asset: 'char/boss/aquiloQueVigia', frameSize: [32, 36] },
};

/** Quadros de uma animação (idle/run quando existe, senão a animação única). */
export function animFrames(base: string, kind: 'idle' | 'run'): string[] {
  const named = [0, 1, 2, 3].map((i) => `${base}_${kind}_anim_f${i}`);
  if (named.every((n) => n in FRAMES_0X72)) return named;
  const single = [0, 1, 2, 3].map((i) => `${base}_anim_f${i}`);
  return single.filter((n) => n in FRAMES_0X72);
}

export function frameRect(name: string): readonly [number, number, number, number] | null {
  return FRAMES_0X72[name] ?? null;
}

export { FRAMES_0X72, SHEET_0X72_SIZE };
