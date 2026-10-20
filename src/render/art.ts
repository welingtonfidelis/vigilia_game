// Arte placeholder gerada em código (formas e cores). Nada de imagem externa.

import Phaser from 'phaser';
import { CLASS_IDS } from '../sim/index.ts';
import type { ActivityKind, ClassId } from '../sim/index.ts';
import { C, CLASS_COLORS } from './palette.ts';

type G = Phaser.GameObjects.Graphics;

export const BODY_W = 32;
export const BODY_H = 44;
/** Altura do centro da cabeça acima dos pés. */
export const HEAD_Y = -30;

export const ICON_KINDS: ActivityKind[] = ['descansar', 'beber', 'rezar', 'comprar', 'treinar', 'tumulo', 'socializar', 'aguardar'];
export const HAIR_STYLES = 3;

export function makeTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const bake = (key: string, w: number, h: number, draw: (g: G) => void) => {
    g.clear();
    draw(g);
    g.generateTexture(key, w, h);
  };

  bake('shadow', 24, 10, (g) => {
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(12, 5, 22, 8);
  });
  bake('ring', 40, 18, (g) => {
    g.lineStyle(2, C.warm, 1);
    g.strokeEllipse(20, 9, 34, 13);
  });
  for (const cls of CLASS_IDS) {
    bake(`body-${cls}`, BODY_W, BODY_H, (g) => drawBody(g, cls));
    bake(`hat-${cls}`, 22, 20, (g) => drawHat(g, cls));
  }
  bake('body-mayor', BODY_W, BODY_H, drawMayor);
  bake('hat-mayor', 26, 20, (g) => {
    g.fillStyle(0x1b1a22);
    g.fillEllipse(13, 13, 24, 6);
    g.fillRoundedRect(7, 2, 12, 11, 2);
    g.fillStyle(C.goldDark);
    g.fillRect(7, 9, 12, 2);
  });
  bake('head', 14, 14, (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(7, 7, 6);
  });
  for (let i = 0; i < HAIR_STYLES; i++) bake(`hair-${i}`, 18, 16, (g) => drawHair(g, i));
  for (const kind of ICON_KINDS) bake(`icon-${kind}`, 24, 22, (g) => drawIcon(g, kind));

  bake('pine', 44, 70, drawPine);
  bake('oak', 54, 58, drawOak);
  bake('rock', 24, 16, (g) => {
    g.fillStyle(C.stoneDark);
    g.fillEllipse(12, 10, 22, 11);
    g.fillStyle(C.stone);
    g.fillEllipse(10, 8, 15, 7);
  });
  bake('bush', 28, 18, (g) => {
    g.fillStyle(C.grassDark);
    g.fillCircle(8, 11, 7);
    g.fillCircle(19, 11, 8);
    g.fillStyle(C.leaf);
    g.fillCircle(10, 8, 6);
    g.fillCircle(18, 8, 6);
  });
  bake('tuft', 10, 7, (g) => {
    g.lineStyle(1, C.grassLight, 1);
    g.lineBetween(2, 7, 1, 1);
    g.lineBetween(5, 7, 5, 0);
    g.lineBetween(8, 7, 9, 2);
  });
  bake('grave', 22, 30, (g) => {
    g.fillStyle(C.stoneDark);
    g.fillRoundedRect(3, 2, 16, 24, { tl: 8, tr: 8, bl: 1, br: 1 });
    g.fillStyle(C.stone);
    g.fillRoundedRect(4, 3, 13, 22, { tl: 7, tr: 7, bl: 1, br: 1 });
    g.fillStyle(C.stoneDark);
    g.fillRect(10, 7, 2, 10);
    g.fillRect(7, 10, 8, 2);
    g.fillStyle(0x3a2e22);
    g.fillRect(1, 25, 20, 5);
  });
  bake('mound', 34, 14, (g) => {
    g.fillStyle(0x4a3826);
    g.fillEllipse(17, 8, 32, 11);
    g.fillStyle(0x5a4630);
    g.fillEllipse(15, 6, 22, 6);
  });
  bake('coin', 10, 6, (g) => {
    g.fillStyle(C.goldDark);
    g.fillEllipse(5, 3.5, 10, 5);
    g.fillStyle(C.gold);
    g.fillEllipse(5, 2.5, 9, 4);
  });
  bake('glow', 64, 64, (g) => {
    for (let r = 32; r > 0; r -= 2) {
      g.fillStyle(0xffffff, 0.06);
      g.fillCircle(32, 32, r);
    }
  });
  bake('spark', 6, 6, (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(3, 3, 2);
  });
  g.destroy();
}

function drawBody(g: G, cls: ClassId): void {
  const c = CLASS_COLORS[cls];
  const wood = C.wood;
  // Atrás do corpo
  if (cls === 'arqueiro') {
    g.fillStyle(0x5a3a20);
    g.fillRect(21, 18, 5, 13);
    g.fillStyle(0xd8d0b8);
    g.fillRect(21, 16, 1, 3);
    g.fillRect(24, 16, 1, 3);
  }
  // Pernas e botas
  g.fillStyle(0x2c2620);
  g.fillRect(11, 34, 4, 8);
  g.fillRect(17, 34, 4, 8);
  g.fillStyle(0x17120e);
  g.fillRect(10, 41, 5, 3);
  g.fillRect(17, 41, 5, 3);
  const robe = cls === 'clerigo' || cls === 'piromante';
  g.fillStyle(c.main);
  if (robe) g.fillRoundedRect(8, 22, 16, 21, { tl: 4, tr: 4, bl: 2, br: 2 });
  else g.fillRoundedRect(9, 22, 14, 14, 3);
  g.fillStyle(c.dark);
  g.fillRoundedRect(6, 23, 4, 10, 2);
  g.fillRoundedRect(22, 23, 4, 10, 2);
  if (!robe) {
    g.fillStyle(0x2a1d12);
    g.fillRect(9, 32, 14, 2);
  }
  switch (cls) {
    case 'guardiao':
      g.fillStyle(c.accent);
      g.fillRoundedRect(2, 23, 10, 13, { tl: 2, tr: 2, bl: 5, br: 5 });
      g.fillStyle(c.dark);
      g.fillRect(6, 25, 2, 9);
      g.fillRect(4, 28, 6, 2);
      g.fillStyle(0x9aa3ab);
      g.fillRect(9, 22, 14, 3);
      break;
    case 'clerigo':
      g.fillStyle(c.accent);
      g.fillRect(15, 25, 2, 8);
      g.fillRect(13, 27, 6, 2);
      g.lineStyle(2, wood, 1);
      g.lineBetween(27, 13, 27, 43);
      g.fillStyle(c.accent);
      g.fillCircle(27, 12, 3);
      break;
    case 'selvagem':
      g.fillStyle(c.accent);
      g.fillCircle(10, 23, 3.5);
      g.fillCircle(22, 23, 3.5);
      g.lineStyle(2, wood, 1);
      g.lineBetween(27, 19, 27, 38);
      g.fillStyle(0xa0a4a8);
      g.fillTriangle(27, 18, 31, 20, 27, 26);
      g.fillTriangle(27, 18, 24, 21, 27, 25);
      break;
    case 'lanceiro':
      g.lineStyle(2, wood, 1);
      g.lineBetween(27, 6, 27, 42);
      g.fillStyle(c.accent);
      g.fillTriangle(24.5, 7, 29.5, 7, 27, 0);
      g.fillStyle(0x8a2a2a);
      g.fillRect(26, 8, 2, 3);
      break;
    case 'piromante':
      g.fillStyle(0x3a1810);
      g.fillRect(8, 31, 16, 2);
      g.fillStyle(c.accent);
      g.fillCircle(27, 30, 4);
      g.fillStyle(0xffe680);
      g.fillCircle(27, 30, 2);
      break;
    case 'arqueiro':
      g.lineStyle(2, c.accent, 1);
      g.beginPath();
      g.arc(7, 28, 10, Math.PI * 0.62, Math.PI * 1.38, false);
      g.strokePath();
      g.lineStyle(1, 0xd8d0b8, 0.9);
      g.lineBetween(2.2, 19.2, 2.2, 36.8);
      break;
  }
}

function drawHat(g: G, cls: ClassId): void {
  const c = CLASS_COLORS[cls];
  switch (cls) {
    case 'guardiao':
      g.fillStyle(0x9aa3ab);
      g.fillRoundedRect(4, 4, 14, 11, { tl: 7, tr: 7, bl: 1, br: 1 });
      g.fillStyle(0x5c656d);
      g.fillRect(4, 12, 14, 2);
      g.fillRect(10, 4, 2, 9);
      break;
    case 'arqueiro':
      g.fillStyle(c.dark);
      g.fillRoundedRect(3, 3, 16, 14, { tl: 8, tr: 8, bl: 2, br: 2 });
      g.fillStyle(c.main);
      g.fillTriangle(11, 0, 6, 6, 16, 6);
      break;
    case 'piromante':
      g.fillStyle(c.dark);
      g.fillEllipse(11, 14, 20, 5);
      g.fillTriangle(5, 14, 17, 14, 13, 0);
      g.fillStyle(c.accent);
      g.fillRect(6, 12, 10, 2);
      break;
    case 'clerigo':
      g.fillStyle(c.accent);
      g.fillRect(5, 9, 12, 2);
      break;
    default:
      break;
  }
}

function drawHair(g: G, style: number): void {
  g.fillStyle(0xffffff);
  if (style === 0) {
    g.fillRoundedRect(3, 2, 12, 6, { tl: 6, tr: 6, bl: 0, br: 0 });
  } else if (style === 1) {
    g.fillRoundedRect(3, 2, 12, 6, { tl: 6, tr: 6, bl: 0, br: 0 });
    g.fillRect(2, 5, 3, 9);
    g.fillRect(13, 5, 3, 9);
  } else {
    g.fillCircle(5, 4, 3);
    g.fillCircle(9, 2.5, 3);
    g.fillCircle(13, 4, 3);
  }
}

function drawMayor(g: G): void {
  g.fillStyle(0x17120e);
  g.fillRect(10, 41, 5, 3);
  g.fillRect(17, 41, 5, 3);
  g.fillStyle(0x24222e);
  g.fillRoundedRect(8, 22, 16, 21, { tl: 4, tr: 4, bl: 1, br: 1 });
  g.fillStyle(0x34303f);
  g.fillRoundedRect(6, 23, 4, 11, 2);
  g.fillRoundedRect(22, 23, 4, 11, 2);
  g.fillStyle(0x6a1f24);
  g.fillRect(15, 23, 2, 19);
  // Corrente do cargo
  g.lineStyle(1.5, C.gold, 1);
  g.beginPath();
  g.arc(16, 22, 6, Math.PI * 0.15, Math.PI * 0.85, false);
  g.strokePath();
  g.fillStyle(C.gold);
  g.fillCircle(16, 28.5, 1.6);
  // Lanterna
  g.lineStyle(1, 0x3a3428, 1);
  g.lineBetween(27, 31, 27, 34);
  g.fillStyle(0x3a3428);
  g.fillRect(25, 34, 5, 7);
  g.fillStyle(C.warm);
  g.fillRect(26, 35, 3, 5);
}

function drawIcon(g: G, kind: ActivityKind): void {
  g.fillStyle(0xf4ecd8, 0.95);
  g.fillRoundedRect(1, 1, 22, 16, 5);
  g.fillTriangle(9, 16, 15, 16, 12, 21);
  const ink = 0x2a2420;
  switch (kind) {
    case 'descansar':
      g.lineStyle(2, 0x3a4a7a, 1);
      g.strokePoints([new Phaser.Math.Vector2(5, 5), new Phaser.Math.Vector2(11, 5), new Phaser.Math.Vector2(5, 12), new Phaser.Math.Vector2(11, 12)]);
      g.lineStyle(1.5, 0x3a4a7a, 1);
      g.strokePoints([new Phaser.Math.Vector2(14, 6), new Phaser.Math.Vector2(18, 6), new Phaser.Math.Vector2(14, 10), new Phaser.Math.Vector2(18, 10)]);
      break;
    case 'beber':
      g.fillStyle(0xc98a2a);
      g.fillRect(8, 6, 7, 8);
      g.fillStyle(0xffffff);
      g.fillRect(7, 4, 9, 3);
      g.lineStyle(1.5, 0xc98a2a, 1);
      g.strokeRect(15, 8, 3, 4);
      break;
    case 'rezar':
      g.fillStyle(C.goldDark);
      g.fillRect(11, 3, 2, 11);
      g.fillRect(8, 6, 8, 2);
      break;
    case 'comprar':
      g.fillStyle(C.goldDark);
      g.fillCircle(12, 9, 5);
      g.fillStyle(C.gold);
      g.fillCircle(12, 8.5, 4);
      g.fillStyle(C.goldDark);
      g.fillRect(11, 6, 2, 5);
      break;
    case 'treinar':
      g.lineStyle(2, 0x8a9198, 1);
      g.lineBetween(7, 13, 16, 4);
      g.lineStyle(2, 0x6a4422, 1);
      g.lineBetween(6, 9, 11, 14);
      break;
    case 'tumulo':
      g.fillStyle(0x4a7ac8);
      g.fillTriangle(12, 3, 8.5, 9, 15.5, 9);
      g.fillCircle(12, 10, 3.6);
      break;
    case 'socializar':
      g.fillStyle(ink);
      g.fillCircle(7, 9, 1.8);
      g.fillCircle(12, 9, 1.8);
      g.fillCircle(17, 9, 1.8);
      break;
    case 'aguardar':
      g.lineStyle(1.5, ink, 1);
      g.lineBetween(9, 3, 9, 15);
      g.fillStyle(0x8a2a2a);
      g.fillTriangle(9.5, 3.5, 17, 6.5, 9.5, 9.5);
      break;
    default:
      break;
  }
}

function drawPine(g: G): void {
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(22, 66, 30, 8);
  g.fillStyle(0x3a2818);
  g.fillRect(19, 54, 6, 12);
  const tiers: [number, number, number][] = [
    [22, 40, 20],
    [22, 28, 16],
    [22, 16, 12],
  ];
  for (const [x, y, half] of tiers) {
    g.fillStyle(C.pineDark);
    g.fillTriangle(x - half - 1, y + 18, x + half + 1, y + 18, x, y - 6);
    g.fillStyle(C.pine);
    g.fillTriangle(x - half + 2, y + 16, x + half - 6, y + 16, x - 1, y - 4);
  }
}

function drawOak(g: G): void {
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(27, 54, 36, 8);
  g.fillStyle(0x3a2818);
  g.fillRect(24, 34, 7, 20);
  g.fillStyle(C.grassDark);
  g.fillCircle(16, 26, 13);
  g.fillCircle(38, 26, 13);
  g.fillCircle(27, 16, 15);
  g.fillStyle(C.leaf);
  g.fillCircle(19, 22, 10);
  g.fillCircle(34, 21, 10);
  g.fillCircle(26, 13, 10);
}
