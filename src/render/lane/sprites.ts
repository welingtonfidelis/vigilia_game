// Sprites do corredor em canvas: carrega as folhas e sabe qual quadro desenhar.
// Dois formatos: o pack do Vigília (folhas em linha com animações nomeadas) e a
// folha única do 0x72 (para ecos de heróis mortos e o que ainda não tem arte nova).

import type { Hero, Party, Unit, World } from '../../sim/index.ts';
import { animFrames, DUNGEON_URL, frameRect, heroSprite, monsterBase } from '../assets.ts';
import { packAsset, packUrl } from '../pack.ts';
import { WALK_SPEED } from './model.ts';

export type Anim = 'idle' | 'run' | 'attack' | 'hit' | 'death';

const images = new Map<string, HTMLImageElement>();

/** A imagem pronta para desenhar, ou null enquanto carrega. */
export function image(url: string): HTMLImageElement | null {
  let img = images.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    images.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export interface SpriteSource {
  /** Folha de onde sai o quadro desta animação. */
  sheet(anim: Anim): string;
  /** Tem caminhada de perfil própria (com o sobe-e-desce desenhado nela). */
  walks: boolean;
  /** Recorte [x, y, w, h] na folha para a animação no tempo `t` (s desde o início dela). */
  frame(anim: Anim, t: number): readonly [number, number, number, number];
  /** Quanto dura uma passada da animação (s). */
  duration(anim: Anim): number;
  /** Altura do corpo, para posicionar barra e números. */
  height: number;
  ghost: boolean;
}

/**
 * Folha do pack: uma linha de quadros e animações com quadros e fps. Com `walkId`,
 * a corrida vem da folha de perfil; o fps sai do `stride` (px por ciclo), para o
 * pé no chão acompanhar o passo normal do grupo.
 */
export function packSprite(id: string, walkId?: string): SpriteSource | null {
  const asset = packAsset(id);
  if (!asset) return null;
  const [w, h] = asset.frameSize ?? asset.size ?? [16, 16];
  const anims = asset.animations ?? {};
  const pick = (anim: Anim) => anims[anim] ?? (anim === 'run' ? anims.idle : undefined) ?? anims.idle ?? { frames: [0], fps: 1 };
  const walk = walkId ? packAsset(walkId) : undefined;
  const walkFrames = walk?.animations?.walk?.frames ?? [];
  const walkFps = walk?.stride ? (WALK_SPEED * walkFrames.length) / walk.stride : (walk?.animations?.walk?.fps ?? 10);
  const [ww, wh] = walk?.frameSize ?? [w, h];
  const useWalk = (anim: Anim): boolean => anim === 'run' && walkFrames.length > 0;
  return {
    sheet: (anim) => packUrl(useWalk(anim) ? walk!.file : asset.file),
    walks: walkFrames.length > 0,
    height: h,
    ghost: false,
    duration: (anim) => {
      const a = pick(anim);
      return a.frames.length / (a.fps || 1);
    },
    frame: (anim, t) => {
      if (useWalk(anim)) {
        const n = walkFrames.length;
        const i = ((Math.floor(t * walkFps) % n) + n) % n;
        return [(walkFrames[i] ?? 0) * ww, 0, ww, wh];
      }
      const a = pick(anim);
      const n = a.frames.length;
      const raw = Math.floor(t * (a.fps || 1));
      // Golpe, dano e morte tocam uma vez e param no último quadro.
      const i = anim === 'idle' || anim === 'run' ? ((raw % n) + n) % n : Math.min(n - 1, Math.max(0, raw));
      return [(a.frames[i] ?? 0) * w, 0, w, h];
    },
  };
}

/** Sprite do 0x72: só idle e corrida (4 quadros); o resto reaproveita o idle. */
export function x72Sprite(base: string, ghost = false): SpriteSource | null {
  const idle = animFrames(base, 'idle');
  const first = idle[0] ? frameRect(idle[0]) : null;
  if (!first) return null;
  const run = animFrames(base, 'run');
  return {
    sheet: () => DUNGEON_URL,
    walks: false,
    height: first[3],
    ghost,
    duration: () => 0.6,
    frame: (anim, t) => {
      const list = anim === 'run' && run.length ? run : idle;
      const name = list[Math.floor(t * 8) % list.length] ?? list[0]!;
      return frameRect(name) ?? first;
    },
  };
}

export function heroSource(hero: Hero): SpriteSource | null {
  const id = `char/hero/${hero.classId}/${hero.gender}`;
  return packSprite(id, `${id}/walk`) ?? x72Sprite(heroSprite(hero.classId, hero.gender));
}

/** Monstro com a variante de profundidade do andar e a fase 2 dos chefes. */
export function enemySource(world: World, party: Party, unit: Unit): SpriteSource | null {
  const look = monsterBase(world, unit, party.act);
  let id = look.asset;
  if (id) {
    if (unit.tags.includes('boss')) {
      if (unit.hp <= unit.maxHp * 0.5 && packAsset(`${id}-phase2`)) id = `${id}-phase2`;
    } else if (party.floor >= 2 && packAsset(`${id}-core`)) {
      id = `${id}-core`;
    } else if (party.floor >= 1 && packAsset(`${id}-deep`)) {
      id = `${id}-deep`;
    }
    const sprite = packSprite(id);
    if (sprite) return sprite;
  }
  return x72Sprite(look.base ?? 'skelet', look.ghost);
}

/** Quadro solto da folha do 0x72 (baú, moeda, flecha, caveira). */
export function x72Frame(name: string): readonly [number, number, number, number] | null {
  return frameRect(name);
}

export { DUNGEON_URL };
