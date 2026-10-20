// Liga o som ao jogo: destrava no primeiro gesto (regra dos navegadores), toca os
// efeitos que o diretor escolhe, mantém música e ambiente no clima do mundo e
// silencia com a aba oculta.

import type { Session } from '../game/session.ts';
import type { UiStore } from '../ui/store.ts';
import { AmbiencePlayer } from './ambience.ts';
import { CuePlanner, cuesFor, moodOf } from './director.ts';
import { AudioEngine, type Levels } from './engine.ts';
import { MusicPlayer } from './music.ts';
import { SFX, type SfxName } from './sfx.ts';

export interface AudioHandle {
  engine: AudioEngine;
  play: (sfx: SfxName, delay?: number) => void;
  /** Para depuração: o tocador de música (null até destravar). */
  music: () => MusicPlayer | null;
}

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

  installUnlock(window, () => document.hidden, () => {
    if (!engine.unlock() || !engine.ctx) return;
    engine.setLevels(levels());
    if (!music) {
      music = new MusicPlayer(engine.ctx, engine.out('music')!);
      ambience = new AmbiencePlayer(engine.ctx, engine.out('ambient')!);
    }
  });

  const play = (sfx: SfxName, delay = 0) => {
    const ctx = engine.ctx;
    const out = engine.out('sfx');
    if (!ctx || !out || !engine.running || ui.prefs.muted) return;
    SFX[sfx](ctx, out, ctx.currentTime + 0.02 + delay);
  };

  session.subscribe((event) => {
    for (const p of planner.plan(cuesFor(event), performance.now())) play(p.sfx, p.delay);
  });

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
    if (!engine.running || !music || !ambience || ui.prefs.muted) return;
    const now = performance.now();
    if (now - lastMood >= MOOD_MS) {
      lastMood = now;
      const mood = moodOf(session.world);
      music.setMode(mood.mode);
      ambience.setMood(mood);
    }
    music.schedule();
    ambience.schedule();
  }, SCHEDULE_MS);

  document.addEventListener('visibilitychange', () => (document.hidden ? engine.suspend() : engine.resume()));

  return { engine, play, music: () => music };
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
