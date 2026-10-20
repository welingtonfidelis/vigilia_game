import { render } from 'preact';
import { createWorld, runTicks, autoMayor, TICKS_PER_DAY, ACTS } from './sim/index.ts';
import type { ChronicleEntry } from './sim/index.ts';
import { Session } from './game/session.ts';
import { browserStore, loadPrefs, loadWorld, saveWorld, savePrefs } from './game/storage.ts';
import { startAudio } from './audio/index.ts';
import { startRenderer } from './render/game.ts';
import { isTyping } from './render/keys.ts';
import { HudRoot, OverlayRoot } from './ui/App.tsx';
import { UiStore, type Tone } from './ui/store.ts';
import './ui/style.css';

const store = browserStore();
const ui = new UiStore();
ui.prefs = loadPrefs(store);

const loaded = loadWorld(store);
const session = new Session(loaded.ok ? loaded.world : createWorld(Math.floor(Math.random() * 1_000_000)));
if (!loaded.ok) ui.open({ kind: 'welcome' });

// ── Avisos a partir da crônica ─────────────────────────────────────────────

const TOAST_TONES: Partial<Record<ChronicleEntry['kind'], Tone>> = {
  morte: 'bad',
  vinganca: 'bad',
  fuga: 'warn',
  luto: 'grief',
  tumulo: 'grief',
  restos: 'grief',
  conquista: 'gold',
  chefe: 'gold',
  eco: 'bad',
  fim: 'gold',
  promocao: 'good',
  traco: 'info',
  vinculo: 'info',
  construcao: 'good',
  chegada: 'info',
  partida: 'info',
  retorno: 'info',
  resgate: 'good',
  partiuDaVila: 'warn',
  aposentadoria: 'info',
  corrupcao: 'warn',
  contrato: 'info',
  lesao: 'warn',
  cicatriz: 'grief',
  casamento: 'good',
  nascimento: 'good',
  maioridade: 'gold',
  prefeito: 'info',
  funcao: 'info',
};

let bossesSeen = new Set(session.world.acts.flatMap((a, i) => (a.bossDefeated ? [i] : [])));

session.subscribe((event) => {
  if (event.type === 'reset') {
    bossesSeen = new Set(session.world.acts.flatMap((a, i) => (a.bossDefeated ? [i] : [])));
    return;
  }
  if (event.type === 'day' && ui.prefs.autosave) {
    saveWorld(store, session.world);
    return;
  }
  if (event.type !== 'entries') return;
  for (const entry of event.entries) {
    const tone = TOAST_TONES[entry.kind];
    if (tone) ui.toast(entry.text, tone, entry.heroIds);
    if (entry.kind === 'morte' && ui.prefs.pauseOnDeath) session.setPaused(true);
  }
  session.world.acts.forEach((act, i) => {
    if (!act.bossDefeated || bossesSeen.has(i)) return;
    bossesSeen.add(i);
    session.setPaused(true);
    ui.open({ kind: 'actEnd', act: i });
  });
});

// ── Preferências ───────────────────────────────────────────────────────────

const applyScale = () => document.documentElement.style.setProperty('--ui-scale', String(ui.prefs.uiScale));
applyScale();
let lastPrefs = JSON.stringify(ui.prefs);
ui.subscribe(() => {
  const now = JSON.stringify(ui.prefs);
  if (now === lastPrefs) return;
  lastPrefs = now;
  savePrefs(store, ui.prefs);
  applyScale();
});

const saveNow = () => {
  if (ui.prefs.autosave) saveWorld(store, session.world);
};
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && saveNow());
window.addEventListener('pagehide', saveNow);

// ── Atalhos ────────────────────────────────────────────────────────────────

window.addEventListener(
  'keydown',
  (e) => {
    if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    const toggle = (kind: 'dungeon' | 'roster' | 'chronicle') => (ui.panel?.kind === kind ? ui.close() : ui.open({ kind }));
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        session.togglePause();
        break;
      case 'Digit1':
        session.setSpeed(1);
        break;
      case 'Digit2':
        session.setSpeed(2);
        break;
      case 'Digit3':
        session.setSpeed(4);
        break;
      case 'KeyE':
      case 'Enter':
        if (ui.prompt && !ui.panel) {
          e.preventDefault();
          ui.interact(ui.prompt.id);
        }
        break;
      case 'Escape':
        if (ui.panel) ui.close();
        break;
      case 'KeyM':
        toggle('dungeon');
        break;
      case 'KeyH':
        toggle('roster');
        break;
      case 'KeyC':
        toggle('chronicle');
        break;
      case 'KeyN':
        ui.setPrefs({ muted: !ui.prefs.muted });
        break;
    }
  },
  true,
);

// ── Montagem ───────────────────────────────────────────────────────────────

render(<HudRoot session={session} ui={ui} />, document.getElementById('hud')!);
render(<OverlayRoot session={session} ui={ui} />, document.getElementById('overlay')!);
const renderer = startRenderer(document.getElementById('game')!, session, ui);
const audio = startAudio(session, ui);

// Atalhos de depuração para testar sem esperar (só em desenvolvimento).
if (import.meta.env.DEV) {
  Object.assign(window, {
    vigilia: {
      session,
      ui,
      renderer,
      audio,
      ACTS,
      advance: (ticks: number) => session.advance(ticks),
      /** Roda N quadros do Phaser na mão (com a aba oculta o requestAnimationFrame para). */
      frames: (n: number, ms = 1000 / 60) => {
        const game = renderer.game;
        if (!game) return 'sem jogo';
        let t = performance.now();
        for (let i = 0; i < n; i++) game.step((t += ms), ms);
        return session.world.tick;
      },
      days: (n: number) => session.advance(Math.round(n * TICKS_PER_DAY)),
      /** Deixa o prefeito automático do balanceador jogar por N dias. */
      autoplay: (n: number) => {
        runTicks(session.world, Math.round(n * TICKS_PER_DAY), { onHour: autoMayor });
        session.advance(1);
      },
    },
  });
}
