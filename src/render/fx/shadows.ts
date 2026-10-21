// Sombras da vila (Fase 1 do visual 2.5D). Três peças:
//  · sombra projetada: a silhueta do próprio sprite, pintada de azul-noite, achatada e
//    deitada para o leste (luz alta vindo de oeste e da frente); serve a prédios, casas,
//    árvores e objetos parados. Na vista 3/4 a parte de trás do objeto já é coberta pelo
//    próprio sprite: sem a inclinação lateral, a sombra ficaria toda escondida;
//  · oclusão na base das paredes: uma faixa escura e suave onde o prédio encosta no chão;
//  · sombra suave de pé: elipse borrada para quem anda (heróis, moradores, bichos).
// As estáticas vão todas para uma camada só (ShadowLayer), desenhada uma vez e com a
// mesma opacidade: duas sombras sobrepostas não escurecem em dobro.

import Phaser from 'phaser';
import { alphaOf } from './alpha.ts';

export interface ProjectedShadow {
  /** Achatamento vertical da silhueta (0,4 = deitada no chão, atrás do objeto). */
  squash: number;
  /** Inclinação lateral: negativo joga o topo para a esquerda. */
  skew: number;
  /** Desfoque em pixels da arte (0 = borda dura). */
  blur: number;
}

export const DEFAULT_SHADOW: ProjectedShadow = { squash: 0.42, skew: 1.05, blur: 1 };

/** Cor da sombra: um azul quase preto, que conversa com a noite fria. */
export const SHADOW_COLOR = '#0a0c12';

interface ShadowTexture {
  key: string;
  /** Ponto da base do sprite dentro da textura da sombra (px da arte). */
  baseX: number;
  baseY: number;
}

const made = new Map<string, ShadowTexture>();

/**
 * Textura da sombra projetada de um quadro: silhueta pintada, achatada e inclinada,
 * com a base no mesmo ponto da base do sprite. Fica em cache por quadro e formato.
 */
export function projectedShadowTexture(
  scene: Phaser.Scene,
  key: string,
  frame: string | number | undefined,
  shape: ProjectedShadow = DEFAULT_SHADOW,
): ShadowTexture | null {
  const id = `${key}#${frame ?? ''}#shadow:${shape.squash}:${shape.skew}:${shape.blur}`;
  const cached = made.get(id);
  if (cached && scene.textures.exists(cached.key)) return cached;
  if (!scene.textures.exists(key)) return null;
  const f = scene.textures.getFrame(key, frame);
  if (!f) return null;
  const w = f.cutWidth;
  const h = f.cutHeight;
  const pad = Math.ceil(shape.blur * 3) + 1;
  const lean = Math.abs(shape.skew) * shape.squash * h;
  const cw = Math.ceil(w + lean) + pad * 2;
  const ch = Math.ceil(h * shape.squash) + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // Para x' = x + k·(h − y) e y' = squash·y: a base (y = h) fica no lugar e o topo
  // se inclina k·h para o lado; k < 0 joga para a esquerda.
  const k = shape.skew * shape.squash;
  const offsetX = pad + (k < 0 ? lean : 0);
  ctx.setTransform(1, 0, -k, shape.squash, offsetX + k * h, pad);
  if (shape.blur > 0) ctx.filter = `blur(${shape.blur}px)`;
  ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, w, h, 0, 0, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = SHADOW_COLOR;
  ctx.fillRect(0, 0, cw, ch);
  const texKey = `shadow/${id}`;
  if (scene.textures.exists(texKey)) scene.textures.remove(texKey);
  scene.textures.addCanvas(texKey, canvas);
  scene.textures.get(texKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
  const out = { key: texKey, baseX: offsetX + w / 2, baseY: pad + h * shape.squash };
  made.set(id, out);
  return out;
}

/** Faixa escura e borrada para a base das paredes (oclusão de ambiente). */
export function aoStripTexture(scene: Phaser.Scene): string {
  const key = 'shadow/ao-strip';
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 8, 0, 32, 8, 32);
  g.addColorStop(0, 'rgba(10,12,18,1)');
  g.addColorStop(0.55, 'rgba(10,12,18,0.75)');
  g.addColorStop(1, 'rgba(10,12,18,0)');
  ctx.setTransform(1, 0, 0, 0.25, 0, 6);
  ctx.fillStyle = g;
  ctx.fillRect(0, -24, 64, 64);
  scene.textures.addCanvas(key, canvas);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/** Elipse borrada de pé (sombra de quem anda): mais suave que a mancha de pixel. */
export function softFootShadowTexture(scene: Phaser.Scene): string {
  const key = 'shadow/foot';
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 12;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 6, 0, 16, 6, 16);
  g.addColorStop(0, 'rgba(10,12,18,0.55)');
  g.addColorStop(0.6, 'rgba(10,12,18,0.35)');
  g.addColorStop(1, 'rgba(10,12,18,0)');
  ctx.setTransform(1, 0, 0, 0.375, 0, 0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  scene.textures.addCanvas(key, canvas);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/** Quem projeta sombra na camada: a textura e o pé (origem 0,5;1) no mundo. */
export interface Caster {
  key: string;
  frame?: string | number;
  x: number;
  y: number;
  /** Escala do sprite no mundo (a arte do pack vai a 2×). */
  scale: number;
  shape?: ProjectedShadow;
  /** Oclusão na base: largura da faixa em px do mundo (0 = sem faixa). */
  ao?: number;
}

/**
 * Camada de sombras estáticas: uma RenderTexture do tamanho do mundo, logo acima do chão
 * e abaixo de tudo que fica de pé. Cada grupo (o cenário, um prédio, o mato do sul) é
 * guardado à parte; mudar um grupo redesenha a camada inteira (só acontece quando um
 * prédio sobe de nível ou o mato é limpo).
 */
export class ShadowLayer {
  private readonly scene: Phaser.Scene;
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly groups = new Map<string, Caster[]>();
  private readonly stamp: Phaser.GameObjects.Image;
  private dirty = false;

  /** `alpha` é a força da sombra (opacidade da camada inteira). */
  constructor(scene: Phaser.Scene, width: number, height: number, depth: number, alpha = 0.5) {
    this.scene = scene;
    this.rt = scene.add.renderTexture(0, 0, width, height).setOrigin(0, 0).setDepth(depth).setAlpha(alpha);
    this.stamp = scene.make.image({ x: 0, y: 0, key: '__WHITE', add: false });
  }

  set(group: string, casters: Caster[]): void {
    this.groups.set(group, casters);
    this.dirty = true;
  }

  /** Redesenha se algum grupo mudou (chamar uma vez por quadro). */
  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.rt.clear();
    this.rt.beginDraw();
    for (const casters of this.groups.values()) {
      for (const c of casters) this.drawCaster(c);
    }
    this.rt.endDraw();
  }

  private drawCaster(c: Caster): void {
    const tex = projectedShadowTexture(this.scene, c.key, c.frame, c.shape ?? DEFAULT_SHADOW);
    if (tex) {
      const img = this.scene.textures.get(tex.key).getSourceImage() as { width: number; height: number };
      this.stamp
        .setTexture(tex.key)
        .setOrigin(tex.baseX / img.width, tex.baseY / img.height)
        .setScale(c.scale)
        .setAlpha(1);
      this.rt.batchDraw(this.stamp, Math.round(c.x), Math.round(c.y));
    }
    if (c.ao && c.ao > 0) {
      // Centro da faixa logo abaixo da base: a metade de baixo escurece o chão na frente
      // da parede; a de cima some atrás da fachada.
      this.stamp.setTexture(aoStripTexture(this.scene)).setOrigin(0.5, 0.5).setScale((c.ao * 1.08) / 64, 1.5).setAlpha(1);
      this.rt.batchDraw(this.stamp, Math.round(c.x), Math.round(c.y + 1));
    }
  }

  /** Largura opaca da última linha da arte (para a faixa de oclusão), em px do mundo. */
  static baseWidth(scene: Phaser.Scene, key: string, scale: number, frame?: string | number): number {
    const mask = alphaOf(scene.textures, key, frame);
    if (!mask) return 0;
    for (let y = mask.h - 1; y >= Math.max(0, mask.h - 6); y--) {
      let x0 = -1, x1 = -1;
      for (let x = 0; x < mask.w; x++) {
        if ((mask.alpha[y * mask.w + x] ?? 0) >= 128) {
          if (x0 < 0) x0 = x;
          x1 = x;
        }
      }
      if (x0 >= 0) return (x1 - x0 + 1) * scale;
    }
    return 0;
  }
}
