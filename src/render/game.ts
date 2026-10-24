import Phaser from 'phaser';
import type { Session } from '../game/session.ts';
import type { UiStore } from '../ui/store.ts';
import { setArtMode, type ArtMode } from './art32.ts';
import { installKeys } from './keys.ts';
import { PROLOGUE_SCENE, PrologueScene } from './PrologueScene.ts';
import { VillageScene } from './VillageScene.ts';

export interface Renderer {
  game: Phaser.Game | null;
}

/**
 * Densidade da tela (de 1 a 2): o canvas da vila tem esse tanto de pixels por pixel de CSS e
 * aparece no tamanho de CSS. Na tela Retina, o pixel da arte 32-bit cai em pixels inteiros da
 * tela em vez de 1,5 (as linhas finas ficavam com espessura irregular). Acima de 2, o custo de
 * preencher o canvas no celular não compensa.
 */
export const screenDensity = (): number => Math.min(2, Math.max(1, window.devicePixelRatio || 1));

/**
 * Sobe o Phaser quando o contêiner tiver tamanho. Com a aba oculta ou o layout
 * ainda sem altura, o WebGL falha ao criar os framebuffers de tamanho zero.
 */
export function startRenderer(parent: HTMLElement, session: Session, ui: UiStore): Renderer {
  installKeys();
  const handle: Renderer = { game: null };
  const boot = () => {
    if (handle.game || parent.clientWidth === 0 || parent.clientHeight === 0) return false;
    const density = screenDensity();
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#0b0a0c',
      // Sem o modo RESIZE (ele iguala o canvas ao CSS): o tamanho acompanha o contêiner aqui embaixo.
      scale: { mode: Phaser.Scale.NONE, width: Math.round(parent.clientWidth * density), height: Math.round(parent.clientHeight * density), zoom: 1 / density },
      render: { pixelArt: true, roundPixels: true, antialias: false },
      input: { activePointers: 2 },
      // O som é nosso (src/audio); sem isto o Phaser abriria um segundo AudioContext.
      audio: { noAudio: true },
      banner: false,
      disableContextMenu: true,
      scene: [new VillageScene(session, ui)],
    });
    handle.game = game;
    game.events.once(Phaser.Core.Events.READY, () => game.scale.setZoom(1 / density));
    // Contêiner mudou de tamanho (ou a janela foi para outra tela): canvas novo, na densidade de agora.
    new ResizeObserver(() => {
      if (parent.clientWidth === 0 || parent.clientHeight === 0) return;
      const d = screenDensity();
      const w = Math.round(parent.clientWidth * d);
      const h = Math.round(parent.clientHeight * d);
      if (game.scale.width !== w || game.scale.height !== h) game.scale.resize(w, h);
      if (game.scale.zoom !== 1 / d) game.scale.setZoom(1 / d);
    }).observe(parent);
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

/**
 * Abre o prólogo animado por cima da vila (§9.7 do doc). Espera a vila terminar de carregar:
 * a cena do prólogo usa as texturas e as animações dela.
 */
export function launchPrologue(handle: Renderer, ui: UiStore): void {
  const run = (): boolean => {
    const game = handle.game;
    const village = game?.scene.getScene('village');
    if (!game || !village || !village.sys.isActive()) return false;
    if (game.scene.getScene(PROLOGUE_SCENE)) game.scene.start(PROLOGUE_SCENE);
    else game.scene.add(PROLOGUE_SCENE, new PrologueScene(ui), true);
    return true;
  };
  if (run()) return;
  const timer = window.setInterval(() => {
    if (run()) window.clearInterval(timer);
  }, 100);
}
