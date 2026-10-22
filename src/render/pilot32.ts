// Piloto 32-bit (caminho 1): com ?arte=32 no endereço, a vila troca algumas peças pela
// versão com o dobro de pixels (export/pilot32/): a taverna nível 3 redesenhada, o
// Guardião em 48×64 andando, enfeites e árvores da praça e o chão. Só a imagem muda:
// colisão, sombras, janelas acesas e a regra continuam lendo a arte de sempre, que tem
// o mesmo enquadramento (a versão 32-bit é o dobro, alinhada pelo pé).

import Phaser from 'phaser';
import { ART_SCALE } from './assets.ts';
import { PACK_BASE } from './pack.ts';

export const PILOT32 = typeof location !== 'undefined' && new URLSearchParams(location.search).get('arte') === '32';

const DIR = `${PACK_BASE}export/pilot32/`;
const PROPS = [
  'barrel', 'crate', 'lamp', 'lamp-lights', 'well', 'bucket', 'sacks', 'bench', 'coffer', 'board', 'logs', 'hay', 'cart',
  'campfire/on', 'tree/pine', 'tree/01', 'tree/autumn', 'tree/autumn-small', 'tree/dead', 'boulder/01', 'boulder/02', 'fern',
  'bush', 'reeds', 'crystal-corrupt-01', 'crystal-corrupt-02', 'bramble-corrupt', 'grave-broken', 'grave-leaning', 'fence-crooked',
];

/** Chave do pack → arquivo da versão 32-bit. */
const IMAGES: Record<string, string> = {
  'building/taverna/level-3': 'building-taverna-level-3.png',
  'building/taverna/level-3-lights': 'building-taverna-level-3-lights.png',
  ...Object.fromEntries(PROPS.map((p) => [`prop/${p}`, `prop-${p.replace('/', '-')}.png`])),
};

/** Herói com folha 32-bit: 48×64, 4 quadros parado e 8 andando. */
const HEROES: Record<string, string> = { 'char/hero/guerreiro/m': 'char-hero-guerreiro-m.png' };

const hiKey = (key: string): string => `p32/${key}`;

export function preloadPilot(load: Phaser.Loader.LoaderPlugin): void {
  if (!PILOT32) return;
  for (const [key, file] of Object.entries(IMAGES)) load.image(hiKey(key), DIR + file);
  for (const [key, file] of Object.entries(HEROES)) load.spritesheet(hiKey(key), DIR + file, { frameWidth: 48, frameHeight: 64 });
}

export function registerPilotAnims(scene: Phaser.Scene): void {
  if (!PILOT32) return;
  for (const key of Object.keys(HEROES)) {
    const tex = hiKey(key);
    if (!scene.textures.exists(tex) || scene.anims.exists(`${tex}:idle`)) continue;
    scene.anims.create({ key: `${tex}:idle`, frames: scene.anims.generateFrameNumbers(tex, { start: 0, end: 3 }), frameRate: 5, repeat: -1 });
    scene.anims.create({ key: `${tex}:run`, frames: scene.anims.generateFrameNumbers(tex, { start: 4, end: 11 }), frameRate: 14, repeat: -1 });
  }
}

/**
 * Mostra a peça `key` na imagem: a versão 32-bit (escala pela metade) quando o piloto
 * está ligado e ela existe, senão a de sempre. `scale` é a escala da arte de sempre.
 */
export function showArt<T extends Phaser.GameObjects.Image>(image: T, key: string, scale = ART_SCALE): T {
  const hi = hiKey(key);
  if (PILOT32 && image.scene.textures.exists(hi)) return image.setTexture(hi).setScale(scale / 2) as T;
  return image.setTexture(key).setScale(scale) as T;
}

/** Visual 32-bit de um herói (null = usa a folha de sempre). */
export function pilotHero(scene: Phaser.Scene, texture: string): { texture: string; idle: string; run: string } | null {
  const hi = hiKey(texture);
  if (!PILOT32 || !(texture in HEROES) || !scene.textures.exists(hi)) return null;
  return { texture: hi, idle: `${hi}:idle`, run: `${hi}:run` };
}
