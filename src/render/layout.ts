// Planta da vila e para onde cada herói anda. Puro (sem Phaser) para dar para testar.

import { buildingLevel } from '../sim/index.ts';
import { JOB_BUILDING } from '../sim/citizens.ts';
import type { BuildingId, Citizen, Hero, Pet, PetSpecies, RetiredRole, World } from '../sim/index.ts';

/** Lado do tile no mundo: 16 px de arte × 2. */
export const TILE = 32;
export const COLS = 50;
export const ROWS = 40;
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
  casa: { tx: 15, ty: 20, tw: 7, th: 6 },
  campo: { tx: 29, ty: 20, tw: 9, th: 6 },
  ferreiro: { tx: 39, ty: 20, tw: 7, th: 6 },
};

/** Centro de cada lote em unidades do mundo. */
export const LOTS: Record<BuildingId, Lot> = Object.fromEntries(
  Object.entries(LOT_TILES).map(([id, r]) => [id, lotOf(r)]),
) as Record<BuildingId, Lot>;


export const PLAZA_TILES: TileRect = { tx: 20, ty: 15, tw: 10, th: 6 };
export const PLAZA = { x: 25 * TILE, y: 18 * TILE, r: 150 };

/** Lavradores se espalham pelo movimento da vila; o campo de treino é dos heróis. */
const LAVOR_ROUNDS: Point[] = [
  { x: PLAZA.x - 110, y: PLAZA.y + 80 },
  { x: PLAZA.x + 120, y: PLAZA.y - 50 },
  { x: 24 * TILE, y: 22 * TILE },
  { x: 24 * TILE, y: 12 * TILE },
  { x: 7 * TILE, y: 18 * TILE },
  { x: 38 * TILE, y: 18 * TILE },
];

/** Casinhas decorativas na borda sul: cada morador tem uma casa para onde volta à noite. */
export const HOME_LOTS: TileRect[] = [
  { tx: 8, ty: 28, tw: 4, th: 3 },
  { tx: 15, ty: 28, tw: 4, th: 3 },
  { tx: 29, ty: 28, tw: 4, th: 3 },
  { tx: 36, ty: 28, tw: 4, th: 3 },
  { tx: 44, ty: 28, tw: 4, th: 3 },
];

export interface Home {
  lot: TileRect;
  /** Ponto em frente à porta, onde o morador entra e some. */
  door: Point;
}

export const HOMES: Home[] = HOME_LOTS.map((lot) => ({
  lot,
  door: { x: (lot.tx + 1.5) * TILE, y: (lot.ty + lot.th) * TILE + 8 },
}));

/** Caminhos de terra da estrada de baixo até a porta de cada casa. */
export const HOME_PATHS: TileRect[] = HOME_LOTS.map((lot) => ({ tx: lot.tx + 1, ty: 27, tw: 2, th: 4 }));

/** Expansão sul: três lotes de moradia que o prefeito abre e constrói. */
export const EXPANSION_LOTS: TileRect[] = [
  { tx: 8, ty: 35, tw: 4, th: 3 },
  { tx: 15, ty: 35, tw: 4, th: 3 },
  { tx: 29, ty: 35, tw: 4, th: 3 },
];
export const EXPANSION_TILES: TileRect = { tx: 6, ty: 32, tw: 38, th: 7 };
export const EXPANSION_ROADS: TileRect[] = [
  { tx: 24, ty: 27, tw: 2, th: 9 },
  { tx: 8, ty: 33, tw: 23, th: 2 },
  { tx: 9, ty: 34, tw: 2, th: 1 },
  { tx: 16, ty: 34, tw: 2, th: 1 },
  { tx: 30, ty: 34, tw: 2, th: 1 },
];

export const citizenHome = (citizen: Citizen): Point => HOMES[Math.abs(citizen.id) % HOMES.length]!.door;

/** Quem fica acordado: copeiros da taverna e alguns noctívagos. */
export const isNightOwl = (citizen: Citizen): boolean =>
  citizen.job === 'copeiro' || Math.abs(citizen.id) % 9 === 0;
export const ABYSS_EDGE_Y = 0;

/** Estradas de terra (no mínimo 2 tiles de largura, para o autotile ter borda dos dois lados). */
export const ROADS: TileRect[] = [
  PLAZA_TILES,
  { tx: 3, ty: 17, tw: 45, th: 2 }, // estrada de cima
  { tx: 24, ty: 7, tw: 2, th: 11 }, // entrada central → estrada de cima
  ...EXPANSION_ROADS,
  { tx: 8, ty: 26, tw: 38, th: 2 }, // estrada de baixo: estalagem, campo, ferreiro
  { tx: 24, ty: 21, tw: 2, th: 11 }, // praça → portão
  { tx: 9, ty: 15, tw: 3, th: 2 }, // porta do templo
  { tx: 17, ty: 15, tw: 3, th: 2 }, // porta da taverna
  { tx: 31, ty: 15, tw: 3, th: 2 }, // porta da guilda
];

/** Cemitério cercado (em tiles) e a grade das covas lá dentro. */
export const CEMETERY_TILES: TileRect = { tx: 1, ty: 0, tw: 12, th: 6 };
export const CEMETERY = { x: 3 * TILE, y: 1.5 * TILE, cols: 9, dx: 32, dy: 26, rows: 5 };

/** Covas que cabem dentro da cerca; quando lota, a nova toma o lugar da mais antiga. */
export const GRAVE_SLOTS = CEMETERY.cols * CEMETERY.rows;

/** Fonte termal no lugar do antigo portão: a água quente que sobe do abismo. */
export const THERMAL_TILES: TileRect = { tx: 23, ty: 27, tw: 5, th: 4 };
/** Terreiro de terra em volta da fonte, encostado na estrada de baixo. */
export const THERMAL_YARD: TileRect = { tx: 22, ty: 26, tw: 7, th: 6 };
export const THERMAL_PATH: TileRect = { tx: 24, ty: 25, tw: 2, th: 2 };

/** Terreiro e trilha da caverna no canto direito, no pé do paredão. */
export const CAVE_PATH: TileRect = { tx: 43, ty: 15, tw: 2, th: 3 };

export type Landmark = 'berrante' | 'quadro' | 'cofre' | 'abismo' | 'cemiterio' | 'portao' | 'fogueira' | 'termas';

/** Portão de paliçada: é a entrada da vila, no alto do mapa (norte), ao centro. */
export const HORN_TOWER: TileRect = { tx: 22, ty: 1, tw: 5, th: 6 };
/** Torrinha do berrante, ao lado direito do portão. */
export const HORN_STAND: TileRect = { tx: 28, ty: 1, tw: 4, th: 6 };

export const LANDMARKS: Record<Landmark, Point> = {
  // Ao pé da torrinha (é onde o prefeito para para tocar).
  berrante: { x: (HORN_STAND.tx + HORN_STAND.tw / 2) * TILE, y: (HORN_STAND.ty + HORN_STAND.th) * TILE + 14 },
  quadro: { x: 28.5 * TILE, y: 16 * TILE },
  cofre: { x: 25 * TILE, y: 18.5 * TILE },
  abismo: { x: 45 * TILE, y: 14.5 * TILE },
  // Logo depois do portãozinho, já dentro da cerca (o cemitério fica num platô acima da vila).
  cemiterio: { x: 5.5 * TILE, y: 5.4 * TILE },
  portao: { x: (HORN_TOWER.tx + HORN_TOWER.tw / 2) * TILE, y: (HORN_TOWER.ty + HORN_TOWER.th) * TILE - 10 },
  fogueira: { x: 21.5 * TILE, y: 20.5 * TILE },
  termas: { x: (THERMAL_TILES.tx + THERMAL_TILES.tw / 2) * TILE, y: (THERMAL_TILES.ty + THERMAL_TILES.th) * TILE + 8 },
};

export const door = (id: BuildingId): Point => {
  const lot = LOTS[id];
  return { x: lot.x, y: lot.y + lot.h / 2 + TILE / 2 };
};

/** Lugar da cova de número `index` (na ordem das mortes): as vagas giram dentro da cerca. */
export function gravePoint(index: number): Point {
  const slot = index % GRAVE_SLOTS;
  return {
    x: CEMETERY.x + (slot % CEMETERY.cols) * CEMETERY.dx,
    y: CEMETERY.y + Math.floor(slot / CEMETERY.cols) * CEMETERY.dy,
  };
}

/** Ordem das covas: por data da morte, depois por id. */
export function graveOrder(world: World): Hero[] {
  return world.heroes
    .filter((h) => h.status === 'dead')
    .sort((a, b) => (a.death?.tick ?? 0) - (b.death?.tick ?? 0) || a.id - b.id);
}

/**
 * Covas que estão no chão agora: as GRAVE_SLOTS mais recentes, com o número de cada uma
 * na ordem das mortes. Os mais antigos seguem no Memorial.
 */
export function standingGraves(world: World): { hero: Hero; index: number }[] {
  const order = graveOrder(world);
  const first = Math.max(0, order.length - GRAVE_SLOTS);
  return order.slice(first).map((hero, i) => ({ hero, index: first + i }));
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

/** Onde cada aposentado trabalha (de pé ao lado da porta, fora da fila de quem visita). */
export const ROLE_PLACE: Record<RetiredRole, BuildingId> = {
  mentor: 'campo',
  ferreiro: 'ferreiro',
  contador: 'taverna',
  curandeiro: 'casa',
};

/** Lugar de tratamento: Casa de cura, senão a estalagem, senão a fogueira. */
export function healerPlace(world: World): BuildingId | null {
  if (buildingLevel(world, 'casa') >= 1) return 'casa';
  if (buildingLevel(world, 'estalagem') >= 1) return 'estalagem';
  return null;
}

export function workSpot(world: World, role: RetiredRole): Point {
  const place = role === 'curandeiro' ? (healerPlace(world) ?? 'casa') : ROLE_PLACE[role];
  const d = door(place);
  return { x: d.x + 56, y: d.y - 6 };
}

export function heroDestination(world: World, hero: Hero, graveIndex: (heroId: number) => number | null): Destination {
  if (hero.status === 'expedition') return at('abismo', 'abismo', LANDMARKS.abismo, true);
  if (hero.status === 'retired' && hero.retiredRole) {
    return at(`funcao:${hero.retiredRole}`, ROLE_PLACE[hero.retiredRole], workSpot(world, hero.retiredRole));
  }
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
    case 'tratar': {
      const place = healerPlace(world);
      return place ? at(`tratar:${place}`, place, { x: door(place).x - 40, y: door(place).y }) : at('fogueira', 'fogueira', LANDMARKS.fogueira);
    }
    case 'termas':
      return at('termas', 'termas', LANDMARKS.termas);
    case 'beber':
      return at('taverna', 'taverna', door('taverna'));
    case 'rezar':
      return at('templo', 'templo', door('templo'));
    case 'comprar':
    case 'joias':
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

/** Onde um morador passa o dia ou a noite (visual; o núcleo não guarda posição). */
export function citizenSpot(world: World, citizen: Citizen, hour: number, day: number): Point {
  const h = hash(citizen.id, day * 24 + hour);
  const ox = ((h & 0xff) / 255 - 0.5) * 90;
  const oy = (((h >>> 8) & 0xff) / 255 - 0.5) * 46;
  const night = hour >= 21 || hour < 6;
  if (night) {
    if (citizen.job === 'guarda') return { x: LANDMARKS.portao.x + ox * 0.6, y: LANDMARKS.portao.y - 34 + oy * 0.4 };
    if (isNightOwl(citizen)) {
      const guest = buildingLevel(world, 'taverna') >= 1 ? door('taverna') : LANDMARKS.fogueira;
      return { x: guest.x + ox * 0.7, y: guest.y + oy * 0.6 };
    }
    // Ponto fixo na porta: se mudasse a cada hora, o morador reapareceria para
    // andar dois pixels e sumir de novo.
    const home = citizenHome(citizen);
    const hh = hash(citizen.id, 4242);
    return { x: home.x + ((hh & 0xff) / 255 - 0.5) * 18, y: home.y + (((hh >>> 8) & 0xff) / 255 - 0.5) * 8 };
  }
  if (citizen.job === 'guarda') return { x: LANDMARKS.portao.x + ox * 0.6, y: LANDMARKS.portao.y - 34 + oy * 0.4 };
  if (hour >= 11 && hour <= 13 && citizen.id % 4 === 0) return { x: PLAZA.x + ox, y: PLAZA.y + oy };
  // Lavradores não têm prédio: circulam entre praça, estradas e fonte.
  if (citizen.job === 'lavrador') {
    const round = LAVOR_ROUNDS[Math.abs(citizen.id) % LAVOR_ROUNDS.length]!;
    return { x: round.x + ox, y: round.y + oy };
  }
  const place = JOB_BUILDING[citizen.job];
  if (place && buildingLevel(world, place) > 0) {
    const d = door(place);
    return { x: d.x + ox, y: d.y + oy };
  }
  // Sem o prédio do ofício, o morador fica na praça.
  return { x: PLAZA.x + ox, y: PLAZA.y + oy };
}

/** Lugares de cão (praça, portas movimentadas, fogueira) e de gato (poço, sacos, portas quietas). */
const PET_SPOTS: Record<PetSpecies, () => Point[]> = {
  cao: () => [PLAZA, door('taverna'), door('campo'), LANDMARKS.fogueira, { x: LANDMARKS.quadro.x, y: LANDMARKS.quadro.y + 56 }],
  gato: () => [{ x: 21 * TILE + 16, y: 16.6 * TILE }, door('estalagem'), door('templo'), { x: 14 * TILE, y: 15.4 * TILE }, { x: PLAZA.x + 60, y: PLAZA.y - 40 }],
};

/**
 * Onde um cão ou gato está agora (visual): troca de lugar a cada 3 horas; à noite o cão
 * dorme perto da fogueira e o gato na porta de uma casa.
 */
export function petSpot(pet: Pet, hour: number, day: number): Point {
  const h = hash(pet.id * 7919 + (pet.species === 'gato' ? 13 : 0), day * 8 + Math.floor(hour / 3));
  const ox = ((h & 0xff) / 255 - 0.5) * 70;
  const oy = (((h >>> 8) & 0xff) / 255 - 0.5) * 28;
  if (hour >= 21 || hour < 6) {
    if (pet.species === 'cao') return { x: LANDMARKS.fogueira.x + 34 + (pet.id % 3) * 14, y: LANDMARKS.fogueira.y + 16 };
    const home = HOMES[pet.id % HOMES.length]!.door;
    return { x: home.x + 22, y: home.y - 4 };
  }
  const spots = PET_SPOTS[pet.species]();
  const spot = spots[(h >>> 16) % spots.length]!;
  return { x: spot.x + ox, y: spot.y + 12 + oy };
}

/** Vaga numa fila diante de um lugar: até 5 lado a lado, depois outra fileira atrás. */
export function slotOffset(index: number): Point {
  const row = Math.floor(index / 5);
  const col = index % 5;
  const spread = [0, -1, 1, -2, 2][col]!;
  // Vizinhos ficam meio passo à frente para os nomes não se sobreporem.
  return { x: spread * 34 + (row % 2) * 17, y: row * 34 + (Math.abs(spread) % 2) * 16 };
}
