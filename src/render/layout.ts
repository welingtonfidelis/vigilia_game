// Planta da vila e para onde cada herói anda. Puro (sem Phaser) para dar para testar.

import { buildingLevel } from '../sim/index.ts';
import type { BuildingId, Hero, World } from '../sim/index.ts';

export const WORLD_W = 1600;
export const WORLD_H = 1000;

export interface Point {
  x: number;
  y: number;
}

export interface Lot extends Point {
  w: number;
  h: number;
}

/** Centro de cada lote. A porta fica na borda de baixo. */
export const LOTS: Record<BuildingId, Lot> = {
  templo: { x: 520, y: 330, w: 220, h: 170 },
  taverna: { x: 360, y: 590, w: 230, h: 170 },
  estalagem: { x: 560, y: 830, w: 230, h: 160 },
  guilda: { x: 1090, y: 330, w: 220, h: 170 },
  ferreiro: { x: 1250, y: 590, w: 210, h: 160 },
  campo: { x: 1060, y: 840, w: 250, h: 150 },
};

export const PLAZA = { x: 800, y: 560, r: 150 };
export const ABYSS_EDGE_Y = 200;

export type Landmark = 'berrante' | 'quadro' | 'cofre' | 'abismo' | 'cemiterio' | 'portao' | 'fogueira';

export const LANDMARKS: Record<Landmark, Point> = {
  berrante: { x: 130, y: 400 },
  quadro: { x: 905, y: 455 },
  cofre: { x: 800, y: 560 },
  abismo: { x: 800, y: 190 },
  cemiterio: { x: 1440, y: 300 },
  portao: { x: 800, y: 985 },
  fogueira: { x: 690, y: 655 },
};

/** Área das covas: grade crescendo para baixo a partir do canto do cemitério. */
export const CEMETERY = { x: 1355, y: 240, cols: 4, dx: 52, dy: 46 };

export const door = (id: BuildingId): Point => {
  const lot = LOTS[id];
  return { x: lot.x, y: lot.y + lot.h / 2 + 18 };
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
