// Peças da vila longa (M5 F4), desenhadas aqui na grade da arte 16-bit e no tamanho da arte
// do nível de agora: o andaime do conserto e as marcas de desgaste (rachaduras, musgo e telhas
// faltando) de quando a conservação está baixa.

import Phaser from 'phaser';
import { alphaOf } from './fx/alpha.ts';

const OUTLINE = '#2a1a0e';
const WOOD = '#8a5a2b';
const WOOD_LIGHT = '#b07a3c';
const ROPE = '#d8c08a';
const CRACK = '#1a120c';
const MOSS = '#4e6834';
const MOSS_DARK = '#3a5228';
const STAIN = '#2e2219';
const HOLE = '#100c0a';

interface Bounds {
  w: number;
  h: number;
  left: number;
  right: number;
  top: number;
  opaque: (x: number, y: number) => boolean;
}

/** Tamanho da arte e o retângulo opaco dela (onde o prédio de fato está). */
function boundsOf(scene: Phaser.Scene, artKey: string): Bounds {
  const mask = alphaOf(scene.textures, artKey);
  const w = mask?.w ?? 112;
  const h = mask?.h ?? 96;
  const opaque = (x: number, y: number) => !!mask && x >= 0 && y >= 0 && x < w && y < h && (mask.alpha[y * w + x] ?? 0) >= 128;
  let left = w;
  let right = 0;
  let top = h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!opaque(x, y)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
    }
  }
  if (left > right) return { w, h, left: 8, right: w - 8, top: 8, opaque };
  return { w, h, left, right, top, opaque };
}

/** Hash pequeno e estável por pixel, para o desgaste sair sempre igual no mesmo prédio. */
function noise(x: number, y: number, salt: number): number {
  let n = Math.imul(x * 374761393 + y * 668265263 + salt * 2147483647, 1274126177);
  n ^= n >>> 13;
  n = Math.imul(n, 1103515245);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/**
 * Andaime na frente do prédio: postes, tábuas em dois ou três andares, escoras em X e uma
 * corda de içar. Fica sobre a arte, com a mesma origem (o pé do meio).
 */
export function scaffoldTexture(scene: Phaser.Scene, artKey: string): string {
  const key = `scaffold:${artKey}`;
  if (scene.textures.exists(key)) return key;
  const b = boundsOf(scene, artKey);
  const canvas = scene.textures.createCanvas(key, b.w, b.h)!;
  const ctx = canvas.context;
  const px = (x: number, y: number, color: string, w = 1, h = 1) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const left = b.left + 3;
  const right = b.right - 3;
  const ground = b.h - 1;
  // O andaime sobe até um quarto abaixo do topo do telhado.
  const top = Math.round(b.top + (ground - b.top) * 0.3);
  const span = Math.max(1, Math.round((right - left) / 22));
  const poles = Array.from({ length: span + 1 }, (_, i) => Math.round(left + ((right - left) * i) / span));
  const decks: number[] = [];
  for (let y = ground - 16; y > top + 4; y -= 18) decks.push(y);

  // Escoras em X entre os postes, de um piso ao outro.
  const floors = [ground, ...decks];
  for (let p = 0; p < poles.length - 1; p++) {
    for (let f = 0; f < floors.length - 1; f++) {
      if ((p + f) % 2 === 1) continue;
      const x0 = poles[p]! + 2;
      const x1 = poles[p + 1]! - 1;
      const y0 = floors[f]! - 1;
      const y1 = floors[f + 1]! + 3;
      const steps = Math.max(x1 - x0, 1);
      for (let s = 0; s <= steps; s++) {
        const x = x0 + s;
        const y = Math.round(y0 + ((y1 - y0) * s) / steps);
        px(x, y, WOOD);
        px(x, Math.round(y1 + ((y0 - y1) * s) / steps), WOOD);
      }
    }
  }
  // Postes: 2 px de madeira com a borda escura.
  for (const x of poles) {
    px(x - 1, top, OUTLINE, 4, ground - top + 1);
    px(x, top + 1, WOOD, 2, ground - top - 1);
    px(x, top + 1, WOOD_LIGHT, 1, ground - top - 1);
  }
  // Tábuas: 3 px, com uma linha clara em cima e as pontas passando dos postes.
  for (const y of decks) {
    px(left - 3, y - 1, OUTLINE, right - left + 7, 5);
    px(left - 2, y, WOOD, right - left + 5, 3);
    px(left - 2, y, WOOD_LIGHT, right - left + 5, 1);
    for (let x = left; x < right; x += 6) px(x, y + 1, OUTLINE);
  }
  // Corda de içar com um balde, pendurada do piso de cima.
  if (decks.length > 0) {
    const rx = poles[Math.min(1, poles.length - 1)]! + 6;
    const ry = decks[decks.length - 1]! + 4;
    px(rx, ry, ROPE, 1, Math.max(4, Math.round((ground - ry) * 0.55)));
    const by = ry + Math.max(4, Math.round((ground - ry) * 0.55));
    px(rx - 2, by, OUTLINE, 5, 4);
    px(rx - 1, by + 1, WOOD_LIGHT, 3, 2);
  }
  canvas.refresh();
  return key;
}

/**
 * Marcas de desgaste sobre o prédio: rachaduras escuras, musgo e manchas (`level` 1, gasto) e,
 * quebrado (`level` 2), mais marcas e buracos. Só pinta onde a arte é opaca.
 */
export function wearTexture(scene: Phaser.Scene, artKey: string, level: 1 | 2): string {
  const key = `wear${level}:${artKey}`;
  if (scene.textures.exists(key)) return key;
  const b = boundsOf(scene, artKey);
  const canvas = scene.textures.createCanvas(key, b.w, b.h)!;
  const ctx = canvas.context;
  const px = (x: number, y: number, color: string) => {
    if (!b.opaque(x, y)) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };
  const cracks = level === 1 ? 10 : 20;
  for (let c = 0; c < cracks; c++) {
    let x = Math.round(b.left + noise(c, 1, 7) * (b.right - b.left));
    let y = Math.round(b.top + 4 + noise(c, 2, 7) * (b.h - b.top - 10));
    const length = 5 + Math.round(noise(c, 3, 7) * (level === 1 ? 6 : 11));
    for (let s = 0; s < length; s++) {
      px(x, y, CRACK);
      // Rachadura grossa no começo, fina na ponta.
      if (s < length / 3) px(x + 1, y, CRACK);
      y += 1;
      x += noise(c, s, 11) < 0.35 ? -1 : noise(c, s, 11) > 0.65 ? 1 : 0;
    }
  }
  // Musgo e manchas de umidade perto do chão e nas beiradas.
  const moss = level === 1 ? 0.06 : 0.11;
  for (let y = b.top; y < b.h; y++) {
    for (let x = b.left; x <= b.right; x++) {
      if (!b.opaque(x, y)) continue;
      const edge = !b.opaque(x, y - 1) || y > b.h - 10;
      if (edge && noise(x, y, 3) < moss * 3) px(x, y, noise(x, y, 5) < 0.5 ? MOSS : MOSS_DARK);
      else if (noise(x, y, 9) < moss * 0.25) px(x, y, STAIN);
    }
  }
  // Quebrado: buracos de telha e de reboco (blocos escuros de 2×2).
  if (level === 2) {
    for (let i = 0; i < 16; i++) {
      const x = Math.round(b.left + 4 + noise(i, 4, 13) * (b.right - b.left - 8));
      const y = Math.round(b.top + 2 + noise(i, 5, 13) * (b.h - b.top) * 0.6);
      for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 2; dy++) px(x + dx, y + dy, HOLE);
    }
  }
  canvas.refresh();
  return key;
}

const SNOW_TOP = '#eef3f8';
const SNOW_SHADE = '#c9d5e3';

/**
 * Neve no telhado (M6 F6): onde a arte tem o céu logo acima (a borda de cima do telhado, os
 * beirais e os peitoris), uma camada branca de dois pixels, a de baixo na sombra. Fica sobre a
 * arte, com a mesma origem; a cena acerta a transparência pela neve do dia.
 */
export function snowTexture(scene: Phaser.Scene, artKey: string): string {
  const key = `snow:${artKey}`;
  if (scene.textures.exists(key)) return key;
  const b = boundsOf(scene, artKey);
  const canvas = scene.textures.createCanvas(key, b.w, b.h)!;
  const ctx = canvas.context;
  for (let y = 1; y < b.h - 4; y++) {
    for (let x = b.left; x <= b.right; x++) {
      if (!b.opaque(x, y) || b.opaque(x, y - 1)) continue;
      // Só nas metades de cima (telhado e beirais), não no chão da arte.
      if (y > b.top + (b.h - b.top) * 0.7) continue;
      ctx.fillStyle = SNOW_TOP;
      ctx.fillRect(x, y, 1, 1);
      if (b.opaque(x, y + 1)) {
        ctx.fillStyle = noise(x, y, 31) < 0.5 ? SNOW_TOP : SNOW_SHADE;
        ctx.fillRect(x, y + 1, 1, 1);
      }
      if (b.opaque(x, y + 2) && noise(x, y, 37) < 0.35) {
        ctx.fillStyle = SNOW_SHADE;
        ctx.fillRect(x, y + 2, 1, 1);
      }
    }
  }
  canvas.refresh();
  return key;
}
