// Planta da vila e para onde cada herói anda. Puro (sem Phaser) para dar para testar.

import { buildingLevel } from '../sim/index.ts';
import type { BuildingId, Hero, World } from '../sim/index.ts';

/** Lado do tile no mundo: 16 px de arte × 2. */
export const TILE = 32;
export const COLS = 50;
export const ROWS = 32;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

export interface Point {
  x: number;
  y: number;
}

export interface Lot extends Point {
  w: number;
  h: number;
}

/** Retângulo em tiles. */
export interface TileRect {
  tx: number;
  ty: number;
  tw: number;
  th: number;
}

const lotOf = (r: TileRect): Lot => ({ x: (r.tx + r.tw / 2) * TILE, y: (r.ty + r.th / 2) * TILE, w: r.tw * TILE, h: r.th * TILE });

/** Lotes em tiles. O prédio fica encostado na borda de baixo, com a porta no centro. */
export const LOT_TILES: Record<BuildingId, TileRect> = {
  templo: { tx: 7, ty: 9, tw: 7, th: 6 },
  taverna: { tx: 15, ty: 9, tw: 7, th: 6 },
  guilda: { tx: 29, ty: 9, tw: 7, th: 6 },
  estalagem: { tx: 8, ty: 20, tw: 7, th: 6 },
  campo: { tx: 29, ty: 20, tw: 9, th: 6 },
  ferreiro: { tx: 39, ty: 20, tw: 7, th: 6 },
};

/** Centro de cada lote em unidades do mundo. */
export const LOTS: Record<BuildingId, Lot> = Object.fromEntries(
  Object.entries(LOT_TILES).map(([id, r]) => [id, lotOf(r)]),
) as Record<BuildingId, Lot>;

export const PLAZA_TILES: TileRect = { tx: 20, ty: 15, tw: 10, th: 6 };
export const PLAZA = { x: 25 * TILE, y: 18 * TILE, r: 150 };
export const ABYSS_EDGE_Y = 6 * TILE;

/** Estradas de terra (no mínimo 2 tiles de largura, para o autotile ter borda dos dois lados). */
export const ROADS: TileRect[] = [
  PLAZA_TILES,
  { tx: 3, ty: 17, tw: 45, th: 2 }, // estrada de cima: berrante ↔ cemitério
  { tx: 8, ty: 26, tw: 38, th: 2 }, // estrada de baixo: estalagem, campo, ferreiro
  { tx: 24, ty: 7, tw: 2, th: 8 }, // praça → abismo (a abadia ocupa a linha 6)
  { tx: 24, ty: 21, tw: 2, th: 11 }, // praça → portão
  { tx: 9, ty: 15, tw: 3, th: 2 }, // porta do templo
  { tx: 17, ty: 15, tw: 3, th: 2 }, // porta da taverna
  { tx: 31, ty: 15, tw: 3, th: 2 }, // porta da guilda
  { tx: 42, ty: 14, tw: 3, th: 3 }, // portão do cemitério
  { tx: 2, ty: 16, tw: 3, th: 3 }, // pé da torre do berrante
];

/** Cemitério cercado (em tiles) e a grade das covas lá dentro. */
export const CEMETERY_TILES: TileRect = { tx: 39, ty: 7, tw: 10, th: 7 };
export const CEMETERY = { x: 40.5 * TILE + 8, y: 8.5 * TILE + 12, cols: 6, dx: 48, dy: 44 };

export type Landmark = 'berrante' | 'quadro' | 'cofre' | 'abismo' | 'cemiterio' | 'portao' | 'fogueira';

export const LANDMARKS: Record<Landmark, Point> = {
  berrante: { x: 3.5 * TILE, y: 13 * TILE },
  quadro: { x: 28.5 * TILE, y: 16 * TILE },
  cofre: { x: 25 * TILE, y: 18.5 * TILE },
  abismo: { x: 25 * TILE, y: 6.5 * TILE },
  cemiterio: { x: 43.5 * TILE, y: 14 * TILE },
  portao: { x: 25 * TILE, y: WORLD_H - 12 },
  fogueira: { x: 19.5 * TILE, y: 22.5 * TILE },
};

export const door = (id: BuildingId): Point => {
  const lot = LOTS[id];
  return { x: lot.x, y: lot.y + lot.h / 2 + TILE / 2 };
};

export function gravePoint(index: number): Point {
  return {
    x: CEMETERY.x + (index % CEMETERY.cols) * CEMETERY.dx,
    y: CEMETERY.y + Math.floor(index / CEMETERY.cols) * CEMETERY.dy,
  };
}

/** Ordem das covas: por data da morte, depois por id. */
export function graveOrder(world: World): Hero[] {
  return world.heroes
    .filter((h) => h.status === 'dead')
    .sort((a, b) => (a.death?.tick ?? 0) - (b.death?.tick ?? 0) || a.id - b.id);
}

export type PlaceKey = BuildingId | Landmark | 'praca' | 'heroi' | 'cova';

export interface Destination {
  /** Heróis com a mesma chave dividem o lugar em fila (sem se empilhar). */
  key: string;
  place: PlaceKey;
  point: Point;
  /** Ao chegar, o herói some (entrou no abismo ou foi embora da vila). */
  hide: boolean;
  /** Para "socializar": anda até onde o outro herói estiver. */
  followHeroId?: number;
}

/** Hash inteiro estável (para escolher pontos de passeio sem usar o RNG do núcleo). */
export function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

export function wanderPoint(heroId: number, seed: number): Point {
  const h = hash(heroId, seed);
  const angle = ((h & 0xffff) / 0x10000) * Math.PI * 2;
  const radius = PLAZA.r * (0.55 + ((h >>> 16) / 0x10000) * 0.45);
  return { x: Math.round(PLAZA.x + Math.cos(angle) * radius), y: Math.round(PLAZA.y + Math.sin(angle) * radius * 0.7) };
}

const at = (key: string, place: PlaceKey, point: Point, hide = false): Destination => ({ key, place, point, hide });

export function heroDestination(world: World, hero: Hero, graveIndex: (heroId: number) => number | null): Destination {
  if (hero.status === 'expedition') return at('abismo', 'abismo', LANDMARKS.abismo, true);
  if (hero.status === 'left' || hero.status === 'retired' || hero.status === 'dead') {
    return at('portao', 'portao', LANDMARKS.portao, true);
  }
  const activity = hero.activity;
  if (!activity) return at('praca', 'praca', wanderPoint(hero.id, 0));
  switch (activity.kind) {
    case 'chegando':
      return at(`chegada:${hero.id}`, 'praca', wanderPoint(hero.id, activity.startedAt));
    case 'vagar':
      return at(`vagar:${hero.id}`, 'praca', wanderPoint(hero.id, activity.startedAt));
    case 'descansar':
      return buildingLevel(world, 'estalagem') >= 1
        ? at('estalagem', 'estalagem', door('estalagem'))
        : at('fogueira', 'fogueira', LANDMARKS.fogueira);
    case 'beber':
      return at('taverna', 'taverna', door('taverna'));
    case 'rezar':
      return at('templo', 'templo', door('templo'));
    case 'comprar':
      return at('ferreiro', 'ferreiro', door('ferreiro'));
    case 'treinar':
      return at('campo', 'campo', door('campo'));
    case 'aguardar':
      return at('quadro', 'quadro', { x: LANDMARKS.quadro.x, y: LANDMARKS.quadro.y + 40 });
    case 'tumulo': {
      const idx = hero.griefFor === null ? null : graveIndex(hero.griefFor);
      if (idx === null) return at('cemiterio', 'cemiterio', LANDMARKS.cemiterio);
      const grave = gravePoint(idx);
      return at(`cova:${idx}`, 'cova', { x: grave.x, y: grave.y + 24 });
    }
    case 'socializar': {
      const point = wanderPoint(hero.id, activity.startedAt);
      return activity.targetId !== undefined
        ? { ...at(`conversa:${hero.id}`, 'heroi', point), followHeroId: activity.targetId }
        : at(`vagar:${hero.id}`, 'praca', point);
    }
  }
}

/** Vaga numa fila diante de um lugar: até 5 lado a lado, depois outra fileira atrás. */
export function slotOffset(index: number): Point {
  const row = Math.floor(index / 5);
  const col = index % 5;
  const spread = [0, -1, 1, -2, 2][col]!;
  // Vizinhos ficam meio passo à frente para os nomes não se sobreporem.
  return { x: spread * 34 + (row % 2) * 17, y: row * 34 + (Math.abs(spread) % 2) * 16 };
}
