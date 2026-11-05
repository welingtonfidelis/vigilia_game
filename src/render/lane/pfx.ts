// Efeitos do pixelfx no corredor (github.com/patch-gg/pixelfx, MIT): bola de fogo, luz do
// clérigo, orbe dos monstros, crítico, moedas e cura. As folhas saem do tools/pfx.ts
// (npm run pfx), com o índice em pfx-index.ts.

import { packUrl } from '../pack.ts';
import { PFX, type PfxId } from './pfx-index.ts';
import { image } from './sprites.ts';

export type { PfxId };

/** Um pixel do pixelfx vale meio pixel da 16-bit: a mesma densidade da arte 32-bit. */
const SCALE = 0.5;

/** Os efeitos que qualquer corredor usa; os golpes de estágio e de monstro vêm sob demanda. */
const BASE: PfxId[] = ['fireball', 'smite', 'void-orb', 'crit-hit', 'coin-drop', 'healing-bloom'];

/** Carrega as folhas antes da primeira luta (sem isso, o primeiro efeito de cada uma some). */
export function preloadPfx(): void {
  for (const id of BASE) image(packUrl(PFX[id].file));
}

export const hasPfx = (id: string): id is PfxId => id in PFX;

/** Começa a carregar uma folha que vai ser usada (o golpe de um herói ou monstro que entrou). */
export function wantPfx(id: string | undefined): void {
  // O corredor também roda sem navegador (testes, simulação de fundo): aí não há o que carregar.
  if (id && hasPfx(id) && typeof Image !== 'undefined') image(packUrl(PFX[id].file));
}

/** Quanto dura um efeito de uma vez (s). */
export const pfxSeconds = (id: PfxId): number => PFX[id].frames / PFX[id].fps;

/** Quanto o efeito leva do primeiro quadro até acertar (s). */
export const pfxHit = (id: PfxId): number => PFX[id].hit;

/** Meio do desenho no primeiro quadro (o orbe voa pelo centro, não pelo ponto de apoio). */
const centers = new Map<PfxId, readonly [number, number]>();
function centerOf(id: PfxId, img: HTMLImageElement): readonly [number, number] {
  const known = centers.get(id);
  if (known) return known;
  const [w, h]: readonly [number, number] = PFX[id].frame;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0, w, h, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3]! > 160) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  const center = x1 >= x0 ? ([(x0 + x1) / 2, (y0 + y1) / 2] as const) : PFX[id].pivot;
  centers.set(id, center);
  return center;
}

/**
 * Desenha o quadro do tempo `t` com o ponto de apoio em (x, y), nas medidas da 16-bit do
 * corredor; `anchor: 'center'` usa o meio do desenho. Devolve false quando o efeito acabou.
 */
export function drawPfx(ctx: CanvasRenderingContext2D, id: PfxId, t: number, x: number, y: number, opts: { flip?: boolean; anchor?: 'pivot' | 'center' } = {}): boolean {
  const s = PFX[id];
  const n = Math.floor(t * s.fps);
  if (!s.loop && n >= s.frames) return false;
  const img = image(packUrl(s.file));
  if (!img) return true;
  const f = s.loop ? n % s.frames : n;
  const [w, h] = s.frame;
  const [px, py] = opts.anchor === 'center' ? centerOf(id, img) : s.pivot;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (opts.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, (f % s.cols) * w, Math.floor(f / s.cols) * h, w, h, -px * SCALE, -py * SCALE, w * SCALE, h * SCALE);
  ctx.restore();
  return true;
}
