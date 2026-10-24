// Liga o som ao jogo: destrava no primeiro gesto (regra dos navegadores), toca os
// efeitos que o diretor escolhe, mantém música e ambiente no clima do mundo e
// silencia com a aba oculta. Acompanhando uma dungeon, a vila some e entra o abismo:
// música da masmorra, ambiente de caverna e os golpes do corredor.

import type { Session } from '../game/session.ts';
import type { LaneSound } from '../render/lane/renderer.ts';
import type { UiStore } from '../ui/store.ts';
import { AmbiencePlayer } from './ambience.ts';
import { CuePlanner, cuesFor, cuesInScene, dungeonMood, moodOf, prologueMood } from './director.ts';
import { AudioEngine, type Levels } from './engine.ts';
import { MusicPlayer } from './music.ts';
import { SFX, type SfxName } from './sfx.ts';

export interface AudioHandle {
  engine: AudioEngine;
  play: (sfx: SfxName, delay?: number) => void;
  /** Golpe no corredor que está na tela. */
  combat: (sound: LaneSound) => void;
  /** Para depuração: o tocador de música (null até destravar). */
  music: () => MusicPlayer | null;
}

const LANE_SFX: Record<LaneSound, SfxName> = {
  slash: 'slash',
  crit: 'crit',
  shot: 'shot',
  fire: 'fireShot',
  holy: 'holy',
  dark: 'darkShot',
  kill: 'kill',
  heal: 'heal',
  blast: 'blast',
};

/** Intervalo mínimo entre dois golpes iguais (ms) e teto de golpes por segundo. */
const LANE_GAP_MS = 70;
const LANE_PER_SECOND = 10;

const SCHEDULE_MS = 50;
const MOOD_MS = 500;

export function startAudio(session: Session, ui: UiStore): AudioHandle {
  const engine = new AudioEngine();
  const planner = new CuePlanner();
  let music: MusicPlayer | null = null;
  let ambience: AmbiencePlayer | null = null;

  const levels = (): Levels => ({
    muted: ui.prefs.muted,
    master: ui.prefs.masterVolume,
    music: ui.prefs.musicVolume,
    ambient: ui.prefs.ambientVolume,
    sfx: ui.prefs.sfxVolume,
  });

  // Música e ambiente guardam nós do contexto: num contexto novo, nascem de novo.
  let playersGen = -1;
  const ensurePlayers = () => {
    if (!engine.ctx || playersGen === engine.generation) return;
    music = new MusicPlayer(engine.ctx, engine.out('music')!);
    ambience = new AmbiencePlayer(engine.ctx, engine.out('ambient')!);
    playersGen = engine.generation;
  };

  installUnlock(window, () => document.hidden, () => {
    if (!engine.wake()) return;
    engine.setLevels(levels());
    ensurePlayers();
  });

  const play = (sfx: SfxName, delay = 0) => {
    const ctx = engine.ctx;
    const out = engine.out('sfx');
    if (!ctx || !out || !engine.running || ui.prefs.muted) return;
    SFX[sfx](ctx, out, ctx.currentTime + 0.02 + delay);
  };

  const watching = (): boolean => ui.panel?.kind === 'battle';
  session.subscribe((event) => {
    const cues = cuesInScene(cuesFor(event), watching() ? 'masmorra' : 'vila');
    for (const p of planner.plan(cues, performance.now())) play(p.sfx, p.delay);
  });

  const laneLast = new Map<SfxName, number>();
  let laneWindow: number[] = [];
  const combat = (sound: LaneSound): void => {
    if (!watching()) return;
    const sfx = LANE_SFX[sound];
    const now = performance.now();
    laneWindow = laneWindow.filter((t) => now - t < 1000);
    if (laneWindow.length >= LANE_PER_SECOND || now - (laneLast.get(sfx) ?? -1e9) < LANE_GAP_MS) return;
    laneLast.set(sfx, now);
    laneWindow.push(now);
    play(sfx);
  };

  // Botões da interface fazem um tique; abrir um painel, um sopro.
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as Element | null;
      if (target?.closest?.('button')) play('click');
    },
    true,
  );
  let lastPanel = ui.panel?.kind ?? null;
  ui.subscribe(() => {
    const kind = ui.panel?.kind ?? null;
    if (kind && kind !== lastPanel) play('open');
    lastPanel = kind;
    engine.setLevels(levels());
  });

  let lastMood = 0;
  window.setInterval(() => {
    if (!document.hidden) engine.watch();
    if (!engine.running || !music || !ambience || ui.prefs.muted) return;
    const now = performance.now();
    if (now - lastMood >= MOOD_MS) {
      lastMood = now;
      const panel = ui.panel;
      const mood = ui.prologue ? prologueMood(session.world, ui.prologue.shot) : panel?.kind === 'battle' ? dungeonMood(session.world, session.world.parties.slice(0, 3).map((p) => p.id)) : moodOf(session.world);
      // Clima desligado no Menu: sem chuva nem trovão no ambiente.
      if (ui.prefs.weather === 'desligado') mood.weather = 'limpo';
      music.setMode(mood.mode);
      ambience.setMood(mood);
    }
    music.schedule();
    ambience.schedule();
  }, SCHEDULE_MS);

  // Ao voltar para o app, tenta retomar sozinho; se o navegador exigir um toque
  // (Safari do iPhone), avisa o jogador.
  let hint = 0;
  document.addEventListener('visibilitychange', () => {
    window.clearTimeout(hint);
    if (document.hidden) {
      engine.sleep();
      return;
    }
    engine.resumeQuietly();
    hint = window.setTimeout(() => {
      if (!document.hidden && engine.needsGesture && !ui.prefs.muted) ui.toast('Toque na tela para religar o som.', 'info');
    }, 800);
  });

  return { engine, play, combat, music: () => music };
}

/**
 * Gestos que os navegadores aceitam para liberar o áudio. No celular o toque só
 * conta quando o dedo sai da tela (pointerup/touchend); pointerdown só vale para
 * mouse. Os ouvintes ficam ligados para sempre: depois de uma ligação, de trocar
 * de app ou da aba oculta, o próximo toque religa o som.
 */
export const ACTIVATION_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

export function installUnlock(target: EventTarget, hidden: () => boolean, wake: () => void): () => void {
  const handler = () => {
    if (!hidden()) wake();
  };
  for (const type of ACTIVATION_EVENTS) target.addEventListener(type, handler, { capture: true, passive: true });
  return () => {
    for (const type of ACTIVATION_EVENTS) target.removeEventListener(type, handler, { capture: true });
  };
}
