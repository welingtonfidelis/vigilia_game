// Chão pintado da vila (Fase 3 do visual 2.5D). Em vez de colar tiles de terra em
// blocos, pinta pixel a pixel na resolução da arte (16 px por tile):
//  · terra e trilha com borda irregular: a máscara de tiles é borrada e cortada com
//    ruído, então as quinas arredondam e a grama entra e sai da estrada;
//  · contorno escuro na beira da terra, tufos de grama invadindo, pedrinhas soltas;
//  · marcas de carroça na estrada da estalagem e chão queimado em volta da fogueira;
//  · a fonte termal num rebaixo úmido, com barranco do lado de cima;
//  · os paredões de rocha e as escadarias de pedra dos três níveis (relief.ts).
// Pinta uma vez ao abrir a vila (dezenas de ms) e vira uma textura única.

import Phaser from 'phaser';
import { ART_SCALE } from './assets.ts';
import { AUTUMN, dirtMask, pathMask } from './ground.ts';
import { COLS, LANDMARKS, ROWS, THERMAL_TILES, TILE } from './layout.ts';
import { PACK_TILES } from './pack.ts';
import { CLIFFS, cliffTop, inCliff, stairAt } from './relief.ts';
import { DEPTH, seeded } from './town.ts';
import { PILOT32 } from './pilot32.ts';

/** Lado do tile na arte. */
const T = 16;
const W = COLS * T;
const H = ROWS * T;

type RGB = [number, number, number];

interface Pixels {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

function pixelsOf(scene: Phaser.Scene, key: string): Pixels {
  const src = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  ctx.canvas.width = src.width;
  ctx.canvas.height = src.height;
  ctx.drawImage(src, 0, 0);
  return { w: src.width, h: src.height, data: ctx.getImageData(0, 0, src.width, src.height).data };
}

/** Hash de dois inteiros → [0, 1) (enfeite; não toca no RNG do núcleo). */
function h2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul(y + 0x7f4a7c15, 0x85ebca77) ^ Math.imul(seed + 1, 0xc2b2ae3d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** Ruído de valor em 2D, suave entre os inteiros. */
function noise2(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = h2(xi, yi, seed) * (1 - sx) + h2(xi + 1, yi, seed) * sx;
  const b = h2(xi, yi + 1, seed) * (1 - sx) + h2(xi + 1, yi + 1, seed) * sx;
  return a * (1 - sy) + b * sy;
}

/** Borrão de caixa separável (com a borda do mapa repetida: a estrada continua). */
function boxBlur(src: Float32Array, r: number): Float32Array {
  const tmp = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  const n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += src[y * W + Math.min(W - 1, Math.max(0, k))]!;
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = sum / n;
      sum += src[y * W + Math.min(W - 1, x + r + 1)]! - src[y * W + Math.max(0, x - r)]!;
    }
  }
  for (let x = 0; x < W; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[Math.min(H - 1, Math.max(0, k)) * W + x]!;
    for (let y = 0; y < H; y++) {
      out[y * W + x] = sum / n;
      sum += tmp[Math.min(H - 1, y + r + 1) * W + x]! - tmp[Math.max(0, y - r) * W + x]!;
    }
  }
  return out;
}

/** Máscara de tiles → campo 0..1 por pixel, com as quinas arredondadas. */
function field(tiles: boolean[][], r: number): Float32Array {
  const bin = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = tiles[Math.floor(y / T)]!;
    for (let x = 0; x < W; x++) if (row[Math.floor(x / T)]) bin[y * W + x] = 1;
  }
  return boxBlur(boxBlur(bin, r), r);
}

class Canvas {
  readonly data = new Uint8ClampedArray(W * H * 4);

  get(x: number, y: number): RGB {
    const i = (y * W + x) * 4;
    return [this.data[i]!, this.data[i + 1]!, this.data[i + 2]!];
  }

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = 255;
  }

  /** Multiplica o pixel (escurece ou clareia). */
  shade(x: number, y: number, k: number): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    this.data[i] = this.data[i]! * k;
    this.data[i + 1] = this.data[i + 1]! * k;
    this.data[i + 2] = this.data[i + 2]! * k;
  }

  mix(x: number, y: number, c: RGB, a: number): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    this.data[i] = this.data[i]! + (c[0] - this.data[i]!) * a;
    this.data[i + 1] = this.data[i + 1]! + (c[1] - this.data[i + 1]!) * a;
    this.data[i + 2] = this.data[i + 2]! + (c[2] - this.data[i + 2]!) * a;
  }
}

/** Cores da beira de terra, dos tufos e das pedras (paleta do pack). */
const RIM: RGB = [44, 30, 22];
const TUFT: [RGB, RGB, RGB] = [
  [49, 75, 46],
  [74, 106, 58],
  [112, 146, 84],
];
const PEBBLE: [RGB, RGB] = [
  [85, 74, 64],
  [128, 116, 102],
];
const LIP: [RGB, RGB, RGB] = [
  [126, 158, 92],
  [86, 118, 66],
  [52, 38, 28],
];
const STONE = { nose: [172, 172, 170] as RGB, tread: [148, 148, 150] as RGB, tread2: [128, 128, 134] as RGB, riser: [96, 96, 104] as RGB, riser2: [76, 76, 86] as RGB, joint: [56, 56, 64] as RGB };
const MOSS: RGB = [70, 98, 56];

export function buildGround(scene: Phaser.Scene): boolean[][] {
  const mask = dirtMask();
  const paths = pathMask();
  const sheet = pixelsOf(scene, 'tile/town/terrain');
  const autumn = [0, 1, 2, 3].map((i) => pixelsOf(scene, `tile/town/autumn-grass-${i}`));
  const tileRGB = (name: string, u: number, v: number): RGB => {
    const cell = PACK_TILES[name]!;
    const i = ((cell[1] * T + v) * sheet.w + cell[0] * T + u) * 4;
    return [sheet.data[i]!, sheet.data[i + 1]!, sheet.data[i + 2]!];
  };
  const c = new Canvas();

  // 1. Grama em toda parte (mesma sorte de antes nos tiles que já eram grama).
  const rnd = seeded(7);
  const grassOf: string[] = new Array(COLS * ROWS);
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      let name: string;
      if (mask[ty]![tx]) name = `grass-${Math.floor(h2(tx, ty, 3) * 4)}`;
      else {
        const r = rnd();
        name = r < 0.06 ? 'grass-flowers' : `grass-${Math.floor(rnd() * 4)}`;
      }
      grassOf[ty * COLS + tx] = name;
      const flip = h2(tx, ty, 5) < 0.5;
      for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) c.set(tx * T + u, ty * T + v, tileRGB(name, flip ? T - 1 - u : u, v));
    }
  }
  for (const f of AUTUMN) {
    for (let ty = f.ty; ty < f.ty + f.th; ty++) {
      for (let tx = f.tx; tx < f.tx + f.tw; tx++) {
        if (mask[ty]?.[tx]) continue;
        const src = autumn[Math.floor(rnd() * autumn.length)]!;
        for (let v = 0; v < T; v++) {
          for (let u = 0; u < T; u++) {
            const i = (v * src.w + u) * 4;
            c.set(tx * T + u, ty * T + v, [src.data[i]!, src.data[i + 1]!, src.data[i + 2]!]);
          }
        }
      }
    }
  }

  // 2. Terra e trilha com borda orgânica.
  const dirtF = field(mask, 4);
  const pathF = field(paths, 3);
  const isDirt = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const n = noise2(x / 5, y / 5, 1) * 0.65 + noise2(x / 2, y / 2, 2) * 0.35;
      if (dirtF[i]! + (n - 0.5) * 0.55 > 0.5) isDirt[i] = 1;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!isDirt[i]) continue;
      const tx = Math.floor(x / T);
      const ty = Math.floor(y / T);
      const n = noise2(x / 4, y / 4, 7);
      const trail = pathF[i]! + (n - 0.5) * 0.5 > 0.5;
      const pick = h2(tx, ty, trail ? 11 : 13);
      const name = trail ? (pick < 0.5 ? 'trail' : 'trail-c') : pick < 0.5 ? 'dirt' : 'dirt-c';
      const u = h2(tx, ty, 17) < 0.5 ? x % T : T - 1 - (x % T);
      const v = h2(tx, ty, 19) < 0.5 ? y % T : T - 1 - (y % T);
      const k = 1 + (noise2(x / 24, y / 24, 23) - 0.5) * 0.14;
      const col = tileRGB(name, u, v);
      c.set(x, y, [col[0] * k, col[1] * k, col[2] * k]);
    }
  }
  const dirtAt = (x: number, y: number): boolean => x < 0 || y < 0 || x >= W || y >= H || isDirt[y * W + x] === 1;
  // Contorno da beira (mais forte em cima, onde a grama faz sombra) e grama da borda mais viva.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!isDirt[y * W + x]) {
        if (dirtAt(x, y + 1) && h2(x, y, 29) < 0.6) c.shade(x, y, 1.08);
        continue;
      }
      const n = !dirtAt(x, y - 1);
      if (n || !dirtAt(x - 1, y) || !dirtAt(x + 1, y) || !dirtAt(x, y + 1)) c.mix(x, y, RIM, n ? 0.62 : 0.45);
      else if (!dirtAt(x, y - 2)) c.shade(x, y, 0.88);
    }
  }
  // Tufos de grama entrando na terra e pedrinhas soltas.
  for (let y = 2; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!isDirt[i]) continue;
      const r = h2(x, y, 31);
      if (dirtF[i]! < 0.82 && r < 0.03) {
        c.set(x, y, TUFT[0]);
        c.set(x, y - 1, TUFT[1]);
        if (r < 0.018) c.set(x - 1, y - 1, TUFT[1]);
        c.set(x + (r < 0.012 ? 1 : 0), y - 2, TUFT[2]);
      } else if (r > 0.9945) {
        c.set(x, y, PEBBLE[0]);
        c.set(x + 1, y, PEBBLE[1]);
        c.shade(x, y + 1, 0.78);
      }
    }
  }

  // 3. Marcas de carroça na estrada de baixo, saindo da carroça parada na estalagem.
  const rutY = 26 * T + 9;
  for (let x = 128; x < 400; x++) {
    const fade = Math.min(1, (400 - x) / 120);
    const y0 = Math.round(rutY + Math.sin(x / 37) * 1.6);
    for (const dy of [0, 7]) {
      if (!dirtAt(x, y0 + dy) || h2(x, dy, 37) > 0.25 + 0.75 * fade) continue;
      c.shade(x, y0 + dy, 0.74);
      c.shade(x, y0 + dy + 1, 1.1);
    }
  }

  // 4. Chão queimado em volta da fogueira: cinza e carvão.
  const fire = { x: LANDMARKS.fogueira.x / ART_SCALE, y: LANDMARKS.fogueira.y / ART_SCALE - 3 };
  for (let y = Math.floor(fire.y - 18); y < fire.y + 18; y++) {
    for (let x = Math.floor(fire.x - 22); x < fire.x + 22; x++) {
      const d = Math.hypot((x - fire.x) / 22, (y - fire.y) / 15);
      if (d >= 1) continue;
      const k = (1 - d) ** 1.4 * (0.75 + 0.5 * noise2(x / 3, y / 3, 41));
      c.shade(x, y, 1 - 0.45 * Math.min(1, k));
      const r = h2(x, y, 43);
      if (d < 0.7 && r < 0.07) c.set(x, y, [92, 88, 84]);
      else if (d < 0.55 && r > 0.97) c.set(x, y, [30, 24, 20]);
    }
  }

  // 5. Fonte termal num rebaixo úmido: chão mais escuro, barranco em cima, beirada embaixo.
  const pool = { x: ((THERMAL_TILES.tx + THERMAL_TILES.tw / 2) * TILE) / ART_SCALE, y: ((THERMAL_TILES.ty + THERMAL_TILES.th) * TILE) / ART_SCALE - 26, rx: 64, ry: 30 };
  for (let y = Math.floor(pool.y - pool.ry - 2); y < pool.y + pool.ry + 3; y++) {
    for (let x = Math.floor(pool.x - pool.rx - 2); x < pool.x + pool.rx + 3; x++) {
      const d = Math.hypot((x - pool.x) / pool.rx, (y - pool.y) / pool.ry) + (noise2(x / 4, y / 4, 47) - 0.5) * 0.08;
      if (d > 1.02) continue;
      if (d > 0.94) {
        // Beirada: barranco escuro do lado de cima (a parede que olha para a câmera), lábio claro embaixo.
        if (y < pool.y) c.mix(x, y, [40, 32, 26], 0.5);
        else c.shade(x, y, 1.12);
      } else {
        c.shade(x, y, 0.84 - 0.08 * (1 - d));
        if (y < pool.y && d > 0.84) c.shade(x, y, 0.85);
      }
    }
  }

  // 6. Paredões de rocha e escadarias. O platô do cemitério, o mais alto, pega um pouco
  // mais de luz.
  const terrace = CLIFFS.find((cl) => cl.id === 'cemiterio');
  if (terrace) {
    for (let x = 0; x < W; x++) {
      if (!inCliff(terrace, x * ART_SCALE + 1)) continue;
      const top = Math.round(cliffTop(terrace, x * ART_SCALE + 1) / ART_SCALE);
      for (let y = 0; y < top; y++) c.shade(x, y, 1.06);
    }
  }
  for (const cliff of CLIFFS) paintCliff(c, cliff);

  // 7. Tufinhos e flores soltos no gramado (fora da rocha e da terra).
  const detail = seeded(41);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(detail() * W);
    const y = Math.floor(detail() * H);
    const kind = detail();
    if (isDirt[y * W + x] || onRock(x, y)) continue;
    if (kind < 0.62) {
      c.set(x, y, kind < 0.3 ? [49, 75, 50] : [84, 115, 74]);
      if (kind > 0.42) c.set(x + 1, y - 1, [128, 148, 90]);
    } else {
      c.set(x, y, [214, 185, 120]);
      c.set(x - 1, y + 1, [139, 157, 92]);
    }
  }

  // Piloto 32-bit (?arte=32): o chão vai ao dobro de pixels, com grão novo.
  const k = PILOT32 ? 2 : 1;
  const canvas = document.createElement('canvas');
  canvas.width = W * k;
  canvas.height = H * k;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(new ImageData(PILOT32 ? hiresGround(c.data) : c.data, W * k, H * k), 0, 0);
  const key = 'ground/painted';
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  scene.add.image(0, 0, key).setOrigin(0, 0).setScale(ART_SCALE / k).setDepth(DEPTH.ground);
  return mask;
}

/**
 * Chão no dobro de pixels (piloto 32-bit): amplia suavizando as diagonais (Scale2x) e
 * põe grão do tamanho do pixel novo: pontas de capim na grama, pedrinhas e torrões na
 * terra, variação na rocha.
 */
function hiresGround(src: Uint8ClampedArray): Uint8ClampedArray<ArrayBuffer> {
  const W2 = W * 2;
  const H2 = H * 2;
  const out = new Uint8ClampedArray(W2 * H2 * 4);
  const idx = (x: number, y: number): number => (Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4;
  const same = (a: number, b: number): boolean => src[a] === src[b] && src[a + 1] === src[b + 1] && src[a + 2] === src[b + 2];
  const put = (x: number, y: number, from: number): void => {
    const o = (y * W2 + x) * 4;
    out[o] = src[from]!;
    out[o + 1] = src[from + 1]!;
    out[o + 2] = src[from + 2]!;
    out[o + 3] = 255;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = idx(x, y);
      const a = idx(x, y - 1);
      const b = idx(x + 1, y);
      const c = idx(x - 1, y);
      const d = idx(x, y + 1);
      put(2 * x, 2 * y, same(c, a) && !same(c, d) && !same(a, b) ? a : p);
      put(2 * x + 1, 2 * y, same(a, b) && !same(a, c) && !same(b, d) ? b : p);
      put(2 * x, 2 * y + 1, same(d, c) && !same(d, b) && !same(c, a) ? c : p);
      put(2 * x + 1, 2 * y + 1, same(b, d) && !same(b, a) && !same(d, c) ? d : p);
    }
  }
  for (let y = 0; y < H2; y++) {
    for (let x = 0; x < W2; x++) {
      const o = (y * W2 + x) * 4;
      const r = out[o]!;
      const g = out[o + 1]!;
      const b = out[o + 2]!;
      const n = h2(x, y, 61);
      let k = 1;
      if (g > r + 8 && g > b) {
        // Grama: tom miúdo e umas pontas de capim (claro em cima, sombra embaixo).
        k = 0.93 + 0.14 * n;
        if (n > 0.965 && y + 1 < H2) {
          k = 1.28;
          const below = o + W2 * 4;
          out[below] = out[below]! * 0.8;
          out[below + 1] = out[below + 1]! * 0.8;
          out[below + 2] = out[below + 2]! * 0.8;
        }
      } else if (r > g && g > b && r - b > 24) {
        // Terra: grão, pedrinha clara e torrão escuro.
        k = 0.95 + 0.1 * n;
        if (n < 0.035) k = 0.78;
        else if (n > 0.982) k = 1.22;
      } else if (Math.abs(r - g) < 14 && Math.abs(g - b) < 16) {
        k = 0.94 + 0.12 * n;
      }
      if (k !== 1) {
        out[o] = r * k;
        out[o + 1] = g * k;
        out[o + 2] = b * k;
      }
    }
  }
  return out;
}

/** Pixel da arte dentro da rocha de algum paredão (ou dos degraus). */
function onRock(x: number, y: number): boolean {
  const wx = x * ART_SCALE + 1;
  return CLIFFS.some((cl) => {
    const top = cliffTop(cl, wx) / ART_SCALE;
    return y >= top - 1 && y < top + cl.height / ART_SCALE + 1;
  });
}

/** Rocha do paredão (marrom acinzentado, como na referência): luz, meio, sombra, fenda. */
const ROCK: { hi: RGB; mid: RGB; lo: RGB; deep: RGB; crack: RGB } = {
  hi: [146, 122, 98],
  mid: [108, 90, 74],
  lo: [74, 62, 54],
  deep: [50, 42, 38],
  crack: [32, 27, 25],
};

const lerp3 = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Grade das pedras da parede: uma semente por célula, sorteada dentro dela. */
const ROCK_CW = 14;
const ROCK_CH = 15;

/**
 * Pedra da parede que cobre o ponto (x, r) (r = linha abaixo da borda): diagrama de
 * Voronoi com células mais largas que altas, como blocos de rocha. Devolve a pedra, o
 * quanto o ponto está perto da borda dela e de que lado da pedra ele fica.
 */
function rockAt(x: number, r: number, seed: number): { id: number; edge: number; dx: number; dy: number } {
  const gx = Math.floor(x / ROCK_CW);
  const gy = Math.floor(r / ROCK_CH);
  let d1 = Infinity;
  let d2 = Infinity;
  let id = 0;
  let dx = 0;
  let dy = 0;
  for (let j = gy - 1; j <= gy + 1; j++) {
    for (let i = gx - 1; i <= gx + 1; i++) {
      const sx = (i + 0.15 + 0.7 * h2(i, j, seed)) * ROCK_CW;
      const sy = (j + 0.15 + 0.7 * h2(i, j, seed + 1)) * ROCK_CH;
      const ex = (x - sx) / ROCK_CW;
      const ey = (r - sy) / ROCK_CH;
      const d = Math.hypot(ex, ey * 0.8);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = i * 7919 + j;
        dx = ex;
        dy = ey;
      } else if (d < d2) d2 = d;
    }
  }
  return { id, edge: (d2 - d1) * ROCK_CW, dx, dy };
}

/**
 * Um paredão: capim no alto (com tufos pendurados), blocos de rocha com luz vindo de
 * cima e de oeste, fenda escura e pedregulho no pé, sombra no chão logo abaixo e, nas
 * escadas, degraus de pedra com muretas dos lados.
 */
function paintCliff(c: Canvas, cliff: (typeof CLIFFS)[number]): void {
  const h = Math.round(cliff.height / ART_SCALE);
  const seed = cliff.id === 'norte' ? 51 : cliff.id === 'praca' ? 53 : 57;
  for (let x = 0; x < W; x++) {
    const wx = x * ART_SCALE + 1;
    if (!inCliff(cliff, wx)) continue;
    const top = Math.round(cliffTop(cliff, wx) / ART_SCALE);
    const stair = stairAt(cliff, wx);
    // Sombra no chão ao pé da parede.
    for (let r = 0; r < 12; r++) c.shade(x, top + h + r, 1 - 0.45 * (1 - r / 12) ** 2);
    // Grama do alto um pouco mais clara junto da borda (a luz pega na quina).
    c.shade(x, top - 1, 1.12);
    c.shade(x, top - 2, 1.06);
    if (stair) {
      paintStairs(c, x, top, h, stair, seed);
      continue;
    }
    const hang = h2(x, 2, seed) > 0.45 ? 1 + Math.floor(h2(x, 3, seed) ** 1.5 * 6) : 0;
    const lipH = 3;
    for (let r = 0; r < h; r++) {
      const y = top + r;
      if (r < lipH) {
        c.set(x, y, LIP[Math.min(r, 1)]!);
        continue;
      }
      if (r < lipH + hang) {
        c.set(x, y, r === lipH + hang - 1 ? TUFT[0] : (r + x) % 3 === 0 ? TUFT[2] : TUFT[1]);
        continue;
      }
      // Faixa de terra entre o capim e a rocha, com raiz aparecendo.
      if (r < lipH + 3) {
        c.set(x, y, h2(x, y, seed + 4) < 0.12 ? [92, 70, 48] : r === lipH ? [56, 40, 30] : [72, 52, 38]);
        continue;
      }
      if (r >= h - 2) {
        c.set(x, y, r === h - 1 ? ROCK.crack : ROCK.deep);
        continue;
      }
      const rock = rockAt(x, r, seed);
      // Tom de cada pedra e luz geral: o alto da parede pega luz, o pé fica na sombra.
      const t = (r - lipH - 3) / (h - 5 - lipH);
      const tone = 0.84 + 0.26 * h2(rock.id, 3, seed);
      let col = t < 0.4 ? lerp3(ROCK.hi, ROCK.mid, t / 0.4) : lerp3(ROCK.mid, ROCK.lo, (t - 0.4) / 0.6);
      // Veio fino dentro da pedra (estrato), só em algumas.
      if (h2(rock.id, 9, seed) < 0.4 && Math.abs(rock.dy + 0.15 * rock.dx) < 0.05) col = lerp3(col, ROCK.lo, 0.5);
      if (rock.edge < 0.75) col = ROCK.crack;
      else if (rock.edge < 2.4) {
        // Borda da pedra: o lado de cima/esquerda acende, o de baixo/direita escurece.
        const lit = -rock.dx * 0.6 - rock.dy;
        col = lit > 0.15 ? lerp3(col, ROCK.hi, 0.55) : lit < -0.1 ? lerp3(col, ROCK.deep, 0.6) : col;
      }
      const k = tone * (0.95 + 0.1 * noise2(x / 2, y / 2, seed + 2));
      c.set(x, y, [col[0] * k, col[1] * k, col[2] * k]);
      if (t < 0.25 && rock.edge < 3 && h2(x, y, seed + 3) < 0.12) c.set(x, y, MOSS);
    }
    // Pedregulho caído no pé da parede.
    const pr = h2(x, 5, seed);
    if (pr < 0.12) {
      const py = top + h + Math.floor(h2(x, 6, seed) * 3);
      c.set(x, py, pr < 0.05 ? PEBBLE[1] : PEBBLE[0]);
      if (pr < 0.04) c.set(x + 1, py, PEBBLE[0]);
    }
  }
}

function paintStairs(c: Canvas, x: number, top: number, h: number, stair: { x: number; w: number }, seed: number): void {
  const x0 = Math.round(stair.x / ART_SCALE);
  const x1 = Math.round((stair.x + stair.w) / ART_SCALE);
  const u = x - x0;
  const wall = u < 3 || x >= x1 - 3;
  const steps = Math.max(3, Math.round(h / 5));
  const stepH = h / steps;
  for (let r = 0; r < h; r++) {
    const y = top + r;
    if (wall) {
      // Mureta de pedra dos lados da escada: topo claro, face mais escura embaixo.
      const outer = u === 0 || x === x1 - 1;
      const k = 1 - 0.35 * (r / h);
      const base: RGB = r < 2 ? STONE.nose : outer ? STONE.riser2 : STONE.tread2;
      c.set(x, y, [base[0] * k, base[1] * k, base[2] * k]);
      if (r > 2 && (r + u * 3) % 7 === 0) c.set(x, y, STONE.joint);
      continue;
    }
    const k = Math.floor(r / stepH);
    const f = (r - k * stepH) / stepH;
    let col: RGB;
    if (f < 0.2) col = STONE.nose;
    else if (f < 0.42) col = STONE.tread;
    else if (f < 0.6) col = STONE.tread2;
    else col = f < 0.8 ? STONE.riser : STONE.riser2;
    // Pedra gasta no meio do degrau (onde todo mundo pisa) e juntas nas faces.
    const mid = 1 - Math.abs(u / (x1 - x0) - 0.5) * 2;
    const wear = f < 0.6 ? 1 + 0.06 * mid : 1;
    const n = 0.95 + 0.1 * h2(x, y, seed + 7);
    c.set(x, y, [col[0] * wear * n, col[1] * wear * n, col[2] * wear * n]);
    if (f >= 0.6 && (u + k * 5) % 9 === 0) c.set(x, y, STONE.joint);
    if (f < 0.6 && h2(x, y, seed + 9) < 0.03) c.set(x, y, MOSS);
  }
}
