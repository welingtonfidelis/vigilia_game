// Estátuas do Salão das Lendas (M6 F5): o primeiro quadro do herói (parado, de frente) refeito em
// pedra. A luz de cada pixel vira um dos tons da pedra, então a estátua é aquele herói, de
// classe e gênero, sem arte nova. A textura fica guardada por modelo de herói e por modo de arte.

import Phaser from 'phaser';
import { artMode, hiKey } from './art32.ts';

/** Do escuro para o claro: granito velho, com um pouco de musgo nas sombras. */
const STONE: [number, number, number][] = [
  [52, 54, 50],
  [86, 86, 80],
  [122, 120, 110],
  [158, 154, 142],
  [196, 192, 178],
];

/** Textura da estátua de um herói e a escala para desenhar no mundo (a 32-bit tem o dobro de pixels). */
export function statueTexture(scene: Phaser.Scene, heroKey: string, worldScale: number): { key: string; scale: number } {
  const hi = artMode() === '32' && scene.textures.exists(hiKey(heroKey));
  const src = hi ? hiKey(heroKey) : heroKey;
  const scale = hi ? worldScale / 2 : worldScale;
  const key = `statue:${src}`;
  if (scene.textures.exists(key)) return { key, scale };
  const frame = scene.textures.getFrame(src, 0) ?? scene.textures.getFrame(src);
  if (!frame) return { key: '__DEFAULT', scale };
  const w = frame.cutWidth;
  const h = frame.cutHeight;
  const canvas = scene.textures.createCanvas(key, w, h)!;
  const ctx = canvas.context;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frame.source.image as CanvasImageSource, frame.cutX, frame.cutY, w, h, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 128) {
      d[i + 3] = 0;
      continue;
    }
    // Luminância percebida, puxada para o meio: a pedra tem pouco contraste.
    const l = (0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!) / 255;
    const t = Math.min(STONE.length - 1, Math.max(0, Math.round((0.2 + l * 0.75) * (STONE.length - 1))));
    const [r, g, b] = STONE[t]!;
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  canvas.refresh();
  return { key, scale };
}
