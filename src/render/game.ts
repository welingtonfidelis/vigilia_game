import Phaser from 'phaser';
import type { Session } from '../game/session.ts';
import type { UiStore } from '../ui/store.ts';
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
      render: { antialias: true, pixelArt: false, roundPixels: false },
      input: { activePointers: 2 },
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
