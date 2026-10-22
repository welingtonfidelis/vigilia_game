// Arte 16-bit e 32-bit. A preferência "Arte" do menu escolhe; cada peça do pack que já
// tem versão 32-bit (src/render/pack32.ts, gerado por `npm run pack32`) aparece com o dobro
// de pixels em meia escala, e as outras seguem em 16-bit. Colisão, sombras, janelas acesas
// e rótulos sempre leem a peça 16-bit, que tem o mesmo enquadramento.

import type Phaser from 'phaser';
import { ART_SCALE } from './assets.ts';
import { PACK_ASSETS, PACK_BASE, packAsset, packUrl, type PackAsset } from './pack.ts';
import { FILES32, PACK32 } from './pack32.ts';

export type ArtMode = '16' | '32';

let mode: ArtMode = '16';
export const artMode = (): ArtMode => mode;
export const setArtMode = (m: ArtMode): void => {
  mode = m;
};

/** Chave de textura da versão 32-bit de uma peça (ou de um overlay "-lights"). */
export const hiKey = (key: string): string => `p32/${key}`;

/** A peça tem versão 32-bit e o modo é 32-bit. */
export const isHi = (id: string): boolean => mode === '32' && id in PACK32;

/** Folha de quadros (personagens, efeitos, cercas) ou imagem única. */
export function isSheet(a: PackAsset): boolean {
  return a.type === 'character' || a.type === 'fx' || a.id === 'tile/town/cemetery-fence' || a.id === 'tile/town/wood-fence';
}

/** Tamanho do quadro na 16-bit (tiles das cercas têm 16×16). */
export function frameOf(a: PackAsset): [number, number] {
  if (a.type === 'tileset') return [16, 16];
  return (a.frameSize ?? a.size ?? [16, 16]) as [number, number];
}

/** Carrega as versões 32-bit (só no modo 32-bit; o resto da cena usa a 16-bit como sempre). */
export function preload32(load: Phaser.Loader.LoaderPlugin, textures: Phaser.Textures.TextureManager): void {
  if (mode !== '32') return;
  for (const [id, e] of Object.entries(PACK32)) {
    const a = packAsset(id);
    const key = hiKey(id);
    if (!a || textures.exists(key)) continue;
    if (isSheet(a)) {
      const [fw, fh] = frameOf(a);
      load.spritesheet(key, packUrl(e.file), { frameWidth: fw * 2, frameHeight: fh * 2 });
    } else {
      load.image(key, packUrl(e.file));
    }
    if (e.lights && !textures.exists(hiKey(`${id}-lights`))) load.image(hiKey(`${id}-lights`), packUrl(e.lights));
  }
}

/** Animações das folhas 32-bit, com os mesmos nomes e quadros da 16-bit (prefixo p32/). */
export function registerAnims32(scene: Phaser.Scene): void {
  if (mode !== '32') return;
  for (const a of PACK_ASSETS) {
    const key = hiKey(a.id);
    if (!scene.textures.exists(key)) continue;
    for (const [name, anim] of Object.entries(a.animations ?? {})) {
      if (scene.anims.exists(`${key}:${name}`)) continue;
      scene.anims.create({ key: `${key}:${name}`, frames: anim.frames.map((frame) => ({ key, frame })), frameRate: anim.fps, repeat: name === 'hit' ? 0 : -1 });
    }
    if (a.type === 'fx' && a.frames && !scene.anims.exists(key)) {
      scene.anims.create({ key, frames: Array.from({ length: a.frames }, (_, i) => ({ key, frame: i })), frameRate: a.fps ?? 8, repeat: -1 });
    }
  }
}

/**
 * Mostra a peça `key` na imagem: a versão 32-bit em meia escala quando ela existe neste
 * modo, senão a de sempre. `scale` é a escala da arte 16-bit. Vale para "-lights" também.
 */
export function showArt<T extends Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>(image: T, key: string, scale = ART_SCALE, frame?: string | number): T {
  const hi = hiKey(key);
  if (mode === '32' && image.scene.textures.exists(hi)) return image.setTexture(hi, frame).setScale(scale / 2) as T;
  return image.setTexture(key, frame).setScale(scale) as T;
}

/** Toca uma animação do pack (ou do efeito) na versão do modo atual. */
export function playArt(sprite: Phaser.GameObjects.Sprite, id: string, anim?: string): Phaser.GameObjects.Sprite {
  const name = anim ? `${id}:${anim}` : id;
  const hi = hiKey(name);
  return sprite.play(mode === '32' && sprite.scene.anims.exists(hi) ? hi : name, true);
}

/** Visual de um personagem do pack (folha e animações) no modo atual. */
export interface CharVisual {
  texture: string;
  /** Prefixo das animações: `${anim}:idle`, `${anim}:run`… */
  anim: string;
  /** Folha 32-bit: o dobro de pixels, mostrada em meia escala. */
  hires: boolean;
}

export function charVisual(scene: Phaser.Scene, id: string): CharVisual {
  const hi = hiKey(id);
  if (mode === '32' && scene.textures.exists(hi)) return { texture: hi, anim: hi, hires: true };
  return { texture: id, anim: id, hires: false };
}

/** Endereço da peça para a interface em DOM e o corredor (32-bit quando existe neste modo). */
export function artFile(id: string, file16: string): { file: string; hires: boolean } {
  const e = mode === '32' ? PACK32[id] : undefined;
  return e ? { file: e.file, hires: true } : { file: file16, hires: false };
}

/**
 * Endereço de uma imagem do pack para a interface em DOM: a 32-bit quando existe neste
 * modo. Quem mostra mantém o tamanho na tela (largura, altura e background-size da 16-bit),
 * e a tela de densidade 2× mostra o detalhe.
 */
export function hiUrl(url: string): string {
  if (mode !== '32' || !url.startsWith(PACK_BASE)) return url;
  const file = url.slice(PACK_BASE.length);
  if (!file.startsWith('export/')) return url;
  const hi = `export32/${file.slice('export/'.length)}`;
  return FILES32.has(hi) ? `${PACK_BASE}${hi}` : url;
}

/**
 * Atributos de `<img>` para uma imagem do pack. A 32-bit vai sozinha num srcset "2x": o
 * navegador a usa em qualquer tela e lhe dá o tamanho natural da 16-bit.
 */
export function imgSrc(url: string): { src: string } | { srcset: string } {
  const hi = hiUrl(url);
  return hi === url ? { src: url } : { srcset: `${hi} 2x` };
}
