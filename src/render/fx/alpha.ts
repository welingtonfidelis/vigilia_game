// Transparência das texturas carregadas (uma leitura por quadro de imagem, em cache).
// Serve à navegação (o que ocupa chão), às sombras projetadas e às luzes das janelas.

import Phaser from 'phaser';

/** Transparência de uma imagem (1 byte por pixel, 0 = vazio). */
export interface AlphaMask {
  w: number;
  h: number;
  alpha: ArrayLike<number>;
}

const caches = new WeakMap<Phaser.Textures.TextureManager, Map<string, AlphaMask>>();

/** Lê o alfa de um quadro de textura; null se a textura ainda não existe. */
export function alphaOf(textures: Phaser.Textures.TextureManager, key: string, frame?: string | number): AlphaMask | null {
  let cache = caches.get(textures);
  if (!cache) {
    cache = new Map();
    caches.set(textures, cache);
  }
  const id = `${key}#${frame ?? ''}`;
  const cached = cache.get(id);
  if (cached) return cached;
  if (!textures.exists(key)) return null;
  const f = textures.getFrame(key, frame);
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!f || !ctx) return null;
  ctx.canvas.width = f.cutWidth;
  ctx.canvas.height = f.cutHeight;
  ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
  const rgba = ctx.getImageData(0, 0, f.cutWidth, f.cutHeight).data;
  const alpha = new Uint8Array(f.cutWidth * f.cutHeight);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3]!;
  const mask = { w: f.cutWidth, h: f.cutHeight, alpha };
  cache.set(id, mask);
  return mask;
}

/**
 * Manchas opacas de uma imagem (componentes conexos), com centro e tamanho em pixels da
 * arte. Usado para achar as janelas acesas no overlay "-lights" de cada prédio.
 */
export function blobs(mask: AlphaMask, minPixels = 3): { x: number; y: number; w: number; h: number; n: number }[] {
  const seen = new Uint8Array(mask.w * mask.h);
  const out: { x: number; y: number; w: number; h: number; n: number }[] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || (mask.alpha[start] ?? 0) < 128) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % mask.w;
      const y = (i - x) / mask.w;
      n++;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= mask.w || ny >= mask.h) continue;
        const j = ny * mask.w + nx;
        if (seen[j] || (mask.alpha[j] ?? 0) < 128) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (n >= minPixels) out.push({ x: (x0 + x1 + 1) / 2, y: (y0 + y1 + 1) / 2, w: x1 - x0 + 1, h: y1 - y0 + 1, n });
  }
  return out;
}
