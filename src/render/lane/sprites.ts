// Sprites do corredor em canvas: carrega as folhas do pack (em linha, com animações
// nomeadas) e sabe qual quadro desenhar. No modo 32-bit a folha tem o dobro de pixels:
// o recorte e o tamanho na tela continuam nas medidas da 16-bit, e `density` diz quantos
// pixels da folha valem um.

import type { Hero, Party, Unit, World } from '../../sim/index.ts';
import { monsterBase } from '../assets.ts';
import { artFile } from '../art32.ts';
import { heroSpriteId, packAsset, packUrl } from '../pack.ts';
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
  /** Pixels da folha por pixel da 16-bit (2 na folha 32-bit). */
  density(anim: Anim): number;
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
  const art = (anim: Anim) => (useWalk(anim) ? artFile(walkId!, walk!.file) : artFile(id, asset.file));
  return {
    sheet: (anim) => packUrl(art(anim).file),
    density: (anim) => (art(anim).hires ? 2 : 1),
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

export function heroSource(hero: Hero): SpriteSource | null {
  const id = heroSpriteId(hero.classId, hero.gender);
  return packSprite(id, `${id}/walk`);
}

/** Monstro com a variante de profundidade do andar, a do guardião e a fase 2 dos Senhores. */
export function enemySource(world: World, party: Party, unit: Unit): SpriteSource | null {
  // Duelo do torneio (M6 F6): o adversário é um herói, com a folha dele (sem o tom de eco).
  if (unit.tags.includes('duelo')) {
    const rival = world.heroes.find((h) => h.id === unit.heroId);
    if (rival) return heroSource(rival);
  }
  const look = monsterBase(world, unit, party.biome);
  if (look.ghost) {
    // Eco de herói morto: a folha do próprio herói, em tom fantasma.
    const sprite = packSprite(look.asset, `${look.asset}/walk`);
    return sprite && { ...sprite, ghost: true };
  }
  let id = look.asset;
  if (unit.tags.includes('boss')) {
    if (unit.hp <= unit.maxHp * 0.5 && packAsset(`${id}-phase2`)) id = `${id}-phase2`;
  } else if ((unit.tags.includes('guardian') || party.floor >= 2) && packAsset(`${id}-core`)) {
    // O guardião da passagem usa a variante mais marcada do monstro, em qualquer andar.
    id = `${id}-core`;
  } else if (party.floor >= 1 && packAsset(`${id}-deep`)) {
    id = `${id}-deep`;
  }
  return packSprite(id);
}
