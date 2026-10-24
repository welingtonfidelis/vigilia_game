import { render } from 'preact';
import { createWorld, runTicks, autoMayor, TICKS_PER_DAY, BIOMES, LORD_LEVELS } from './sim/index.ts';
import type { ChronicleEntry } from './sim/index.ts';
import { Session } from './game/session.ts';
import { browserStore, loadPrefs, loadWorld, saveWorld, savePrefs } from './game/storage.ts';
import { startAudio } from './audio/index.ts';
import { startCalls } from './ui/calls.ts';
import { lanes } from './render/lane/lanes.ts';
import { startRenderer, switchArt } from './render/game.ts';
import { setArtMode } from './render/art32.ts';
import { isTyping } from './render/keys.ts';
import { HudRoot, OverlayRoot } from './ui/App.tsx';
import { UiStore, type Tone } from './ui/store.ts';
import './ui/style.css';

const store = browserStore();
const ui = new UiStore();
ui.prefs = loadPrefs(store);
setArtMode(ui.prefs.art);

const loaded = loadWorld(store);
const session = new Session(loaded.ok ? loaded.world : createWorld(Math.floor(Math.random() * 1_000_000)));
if (!loaded.ok) ui.open({ kind: 'welcome', oldSave: loaded.old === true });
if (!loaded.ok && loaded.broken) ui.toast(loaded.reason, 'bad');

// ── Avisos a partir da crônica ─────────────────────────────────────────────

const TOAST_TONES: Partial<Record<ChronicleEntry['kind'], Tone>> = {
  morte: 'bad',
  vinganca: 'bad',
  fuga: 'warn',
  luto: 'grief',
  tumulo: 'grief',
  restos: 'grief',
  conquista: 'gold',
  passagem: 'gold',
  amuleto: 'gold',
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
  decreto: 'info',
  evento: 'info',
  lesao: 'warn',
  cicatriz: 'grief',
  casamento: 'good',
  nascimento: 'good',
  maioridade: 'gold',
  prefeito: 'info',
  funcao: 'info',
  festival: 'good',
  doacao: 'gold',
  cidadao: 'info',
  incursao: 'bad',
  desejo: 'info',
  nemesis: 'bad',
  encontro: 'info',
  // O torneio avisa pelas chamadas (sem contar quem venceu); os cargos, pela crônica.
  cargo: 'info',
  casa: 'gold',
};

// Um Senhor caiu: pausa e mostra a tela (o último fecha a campanha).
let lordsSeen = session.world.metrics.bossKills.length;

session.subscribe((event) => {
  if (event.type === 'reset') {
    lordsSeen = session.world.metrics.bossKills.length;
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
  const kills = session.world.metrics.bossKills;
  if (kills.length > lordsSeen) {
    lordsSeen = kills.length;
    const last = kills[kills.length - 1]!;
    session.setPaused(true);
    ui.open(last.level % LORD_LEVELS === 0 && session.world.endedTick !== null && last.level === LORD_LEVELS ? { kind: 'campaignEnd' } : { kind: 'lordEnd', level: last.level });
  }
});

// ── Preferências ───────────────────────────────────────────────────────────

const applyScale = () => document.documentElement.style.setProperty('--ui-scale', String(ui.prefs.uiScale));
applyScale();
let lastPrefs = JSON.stringify(ui.prefs);
let lastArt = ui.prefs.art;
ui.subscribe(() => {
  const now = JSON.stringify(ui.prefs);
  if (now === lastPrefs) return;
  lastPrefs = now;
  savePrefs(store, ui.prefs);
  applyScale();
  if (ui.prefs.art !== lastArt) {
    lastArt = ui.prefs.art;
    switchArt(renderer, session, ui, ui.prefs.art);
  }
});

const saveNow = () => {
  if (ui.prefs.autosave) saveWorld(store, session.world);
};
// Aba em segundo plano: o Phaser para o laço e, com ele, o tempo do jogo (o padrão).
// Com a preferência ligada, um relógio de 1 s segue rodando o núcleo pelo tempo real
// que passou; o navegador pode espaçar esse relógio, e a volta recupera o atraso.
let background: number | null = null;
let backgroundAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveNow();
    if (ui.prefs.runInBackground && background === null) {
      backgroundAt = performance.now();
      background = window.setInterval(() => {
        const now = performance.now();
        session.catchUp(now - backgroundAt);
        backgroundAt = now;
      }, 1000);
    }
    return;
  }
  if (background !== null) {
    window.clearInterval(background);
    background = null;
    session.catchUp(performance.now() - backgroundAt);
  }
});
window.addEventListener('pagehide', saveNow);

// ── Atalhos ────────────────────────────────────────────────────────────────

window.addEventListener(
  'keydown',
  (e) => {
    if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    // Decisão pendente: o diálogo exige uma escolha; nada de trocar de painel por atalho.
    const deciding = ui.panel?.kind === 'event';
    const toggle = (kind: 'dungeon' | 'roster' | 'chronicle' | 'village' | 'audiences' | 'hall') => {
      if (!deciding) ui.panel?.kind === kind ? ui.close() : ui.open({ kind });
    };
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
        if (ui.panel && !deciding) ui.close();
        break;
      case 'KeyG':
        if (!deciding) ui.watch(session.world);
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
      case 'KeyL':
        toggle('hall');
        break;
      case 'KeyV':
        toggle('village');
        break;
      case 'KeyP':
        toggle('audiences');
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
lanes.start({ world: () => session.world, speed: () => session.speed, paused: () => session.paused, sound: (name) => audio.combat(name) });
startCalls(session, ui);

// Atalhos de depuração para testar sem esperar (só em desenvolvimento).
if (import.meta.env.DEV) {
  Object.assign(window, {
    vigilia: {
      session,
      ui,
      renderer,
      audio,
      lanes,
      BIOMES,
      advance: (ticks: number) => session.advance(ticks),
      /** Atalho de teste (M5 F1): muda o nível do abismo sem o amuleto. */
      abyssLevel: (n: number) => {
        session.world.abyss.level = Math.max(1, Math.round(n));
        return session.world.abyss.level;
      },
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
