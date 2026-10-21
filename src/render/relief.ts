// Relevo da vila (Fase 3 do visual 2.5D), no desenho da arte de referência: três níveis
// separados por paredões de rocha e ligados por escadarias de pedra.
//  · alto: cemitério, portão do berrante e a mata do norte;
//  · meio: templo, taverna e guilda no pé do primeiro paredão, a estrada de cima, a praça
//    e a boca da caverna, encravada na rocha;
//  · baixo: estalagem, casa de cura, campo, ferreiro, fonte termal e as casinhas.
// Os paredões são pintados no chão (terrain.ts); aqui fica só a geometria, pura para dar
// para testar: a borda de cima de cada paredão, a altura, as escadarias e o que bloqueia.

import type { Point, TileRect } from './layout.ts';

/** Escadaria: faixa em x (px do mundo) onde o paredão vira degraus. */
export interface Stair {
  x: number;
  w: number;
}

export interface Cliff {
  id: 'norte' | 'praca';
  /** Borda de cima (onde o nível de cima acaba), em px do mundo, da esquerda para a direita. */
  edge: Point[];
  /** Altura da parede de rocha, em px do mundo. */
  height: number;
  stairs: Stair[];
}

export const CLIFFS: Cliff[] = [
  {
    // Atrás do templo, da taverna e da guilda; à direita desce e a caverna fica no pé dele.
    id: 'norte',
    edge: [
      { x: -40, y: 300 },
      { x: 180, y: 296 },
      { x: 420, y: 302 },
      { x: 640, y: 297 },
      { x: 780, y: 300 },
      { x: 840, y: 300 },
      { x: 1000, y: 298 },
      { x: 1160, y: 304 },
      { x: 1230, y: 322 },
      { x: 1290, y: 356 },
      { x: 1340, y: 376 },
      { x: 1400, y: 382 },
      { x: 1640, y: 386 },
    ],
    height: 80,
    stairs: [
      { x: 150, w: 58 }, // portãozinho do cemitério
      { x: 762, w: 76 }, // estrada do berrante
    ],
  },
  {
    // Abaixo da estrada de cima; no meio contorna a praça (fogueira) e desce para a fonte.
    id: 'praca',
    edge: [
      { x: -40, y: 618 },
      { x: 300, y: 616 },
      { x: 540, y: 620 },
      { x: 585, y: 634 },
      { x: 620, y: 666 },
      { x: 660, y: 690 },
      { x: 700, y: 696 },
      { x: 900, y: 696 },
      { x: 940, y: 680 },
      { x: 970, y: 652 },
      { x: 1000, y: 628 },
      { x: 1060, y: 619 },
      { x: 1640, y: 620 },
    ],
    height: 80,
    stairs: [
      { x: 146, w: 60 }, // oeste, ao lado da estalagem
      { x: 758, w: 84 }, // praça → fonte termal
      { x: 1478, w: 56 }, // leste, depois do ferreiro
    ],
  },
];

/** Trilhas de terra que ligam o pé e o topo das escadarias laterais às estradas. */
export const STAIR_PATHS: TileRect[] = [
  { tx: 5, ty: 11, tw: 2, th: 6 }, // cemitério → estrada de cima
  { tx: 5, ty: 20, tw: 2, th: 7 }, // escada oeste → estrada de baixo
  { tx: 5, ty: 26, tw: 4, th: 2 },
  { tx: 46, ty: 19, tw: 2, th: 8 }, // escada leste → estrada de baixo
  { tx: 44, ty: 26, tw: 4, th: 2 },
];

/** Hash inteiro → [0, 1) (só enfeite; não toca no RNG do núcleo). */
function hash01(n: number, seed: number): number {
  let h = Math.imul(n ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul(seed + 0x9e3779b9, 0x85ebca77);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** Ruído suave em 1D (valor por inteiro, interpolação suave entre eles). */
export function noise1(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return hash01(i, seed) * (1 - s) + hash01(i + 1, seed) * s;
}

export function stairAt(cliff: Cliff, x: number, margin = 0): Stair | null {
  return cliff.stairs.find((s) => x >= s.x - margin && x < s.x + s.w + margin) ?? null;
}

/**
 * y da borda de cima do paredão em `x`: curva suave pelos pontos, com um tremido de
 * pedra que some perto das escadarias (degrau precisa de borda reta).
 */
export function cliffTop(cliff: Cliff, x: number): number {
  const pts = cliff.edge;
  let y = pts[pts.length - 1]!.y;
  if (x <= pts[0]!.x) y = pts[0]!.y;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      const s = (1 - Math.cos(t * Math.PI)) / 2;
      y = a.y + (b.y - a.y) * s;
      break;
    }
  }
  const seed = cliff.id === 'norte' ? 11 : 23;
  let wobble = (noise1(x / 26, seed) - 0.5) * 7 + (noise1(x / 9, seed + 1) - 0.5) * 3;
  // Perto da escada o tremido some aos poucos (14 px de cada lado).
  let near = Infinity;
  for (const s of cliff.stairs) near = Math.min(near, Math.max(s.x - x, x - (s.x + s.w), 0));
  wobble *= Math.min(1, near / 14);
  return y + wobble;
}

/** Ponto na parede de rocha de algum paredão (fora das escadas). */
export function onFace(x: number, y: number, pad = 0): boolean {
  return CLIFFS.some((c) => {
    if (stairAt(c, x)) return false;
    const top = cliffTop(c, x);
    return y >= top - pad && y < top + c.height + pad;
  });
}

/**
 * Células da grade de navegação que a parede ocupa: a célula bloqueia quando o centro
 * dela cai na rocha (com uma folga de 4 px em cima e embaixo, para ninguém ficar de pé
 * na quina). As colunas das escadas ficam livres.
 */
export function faceCells(cols: number, rows: number, cell: number): number[] {
  const out: number[] = [];
  for (const c of CLIFFS) {
    for (let cx = 0; cx < cols; cx++) {
      const x = (cx + 0.5) * cell;
      if (stairAt(c, x, -4)) continue;
      const top = cliffTop(c, x);
      for (let cy = 0; cy < rows; cy++) {
        const y = (cy + 0.5) * cell;
        if (y >= top + 4 && y <= top + c.height - 4) out.push(cy * cols + cx);
      }
    }
  }
  return out;
}
