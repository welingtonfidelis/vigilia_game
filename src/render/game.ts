import Phaser from 'phaser';
import type { Session } from '../game/session.ts';
import type { UiStore } from '../ui/store.ts';
import { setArtMode, type ArtMode } from './art32.ts';
import { installKeys } from './keys.ts';
import { VillageScene } from './VillageScene.ts';

export interface Renderer {
  game: Phaser.Game | null;
}

/**
 * Sobe o Phaser quando o contêiner tiver tamanho. Com a aba oculta ou o layout
 * ainda sem altura, o WebGL falha ao criar os framebuffers de tamanho zero.
 */
export function startRenderer(parent: HTMLElement, session: Session, ui: UiStore): Renderer {
  installKeys();
  const handle: Renderer = { game: null };
  const boot = () => {
    if (handle.game || parent.clientWidth === 0 || parent.clientHeight === 0) return false;
    handle.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#0b0a0c',
      scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
      render: { pixelArt: true, roundPixels: true, antialias: false },
      input: { activePointers: 2 },
      // O som é nosso (src/audio); sem isto o Phaser abriria um segundo AudioContext.
      audio: { noAudio: true },
      banner: false,
      disableContextMenu: true,
      scene: [new VillageScene(session, ui)],
    });
    return true;
  };
  if (!boot()) {
    const observer = new ResizeObserver(() => {
      if (boot()) observer.disconnect();
    });
    observer.observe(parent);
  }
  return handle;
}

/**
 * Troca a arte (16-bit ↔ 32-bit) na hora: a cena da vila é refeita com as texturas do
 * modo novo. O mundo é da sessão, então nada do jogo se perde; o corredor e a interface
 * leem o modo a cada desenho.
 */
export function switchArt(handle: Renderer, session: Session, ui: UiStore, art: ArtMode): void {
  setArtMode(art);
  const game = handle.game;
  if (!game || !game.scene.getScene('village')) return;
  // Parar antes de remover: é no encerramento que a cena solta a sessão e a tela.
  game.scene.stop('village');
  game.scene.remove('village');
  game.scene.add('village', new VillageScene(session, ui), true);
}
