// Raízes da UI: o HUD (acima do mapa) e a camada sobre o mapa (painéis, avisos, objetivos).

import { useEffect, useState } from 'preact/hooks';
import { activeHeroes, formatDate, heroCapacity, isNight, MATERIAL_NAMES } from '../sim/index.ts';
import type { MaterialId } from '../sim/index.ts';
import { SPEEDS, type Session } from '../game/session.ts';
import { GameContext, LinkedText, useGame } from './components.tsx';
import { EnergyCandles } from './Energy.tsx';
import { clockOf, fmt } from './format.ts';
import { IconAbyss, IconBone, IconBook, IconCoin, IconMenu, IconMoon, IconMute, IconPause, IconPeople, IconShield, IconSound, IconSun } from './icons.tsx';
import { objectives } from './objectives.ts';
import { ChroniclePanel } from './panels/ChroniclePanel.tsx';
import { DungeonPanel } from './panels/DungeonPanel.tsx';
import { HeroPanel } from './panels/HeroPanel.tsx';
import { ActEndPanel, CampaignEndPanel, MemorialPanel, MenuPanel, RosterPanel, WelcomePanel } from './panels/PeoplePanels.tsx';
import { BoardPanel, BuildingPanel, CofferPanel, HornPanel } from './panels/TownPanels.tsx';
import type { Panel, UiStore } from './store.ts';

/** Redesenha quando o mundo (no máximo ~8×/s) ou o estado da tela muda. */
function useLive(session: Session, ui: UiStore): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    let seen = -1;
    const timer = window.setInterval(() => {
      if (session.rev !== seen) {
        seen = session.rev;
        setTick((t) => t + 1);
      }
    }, 125);
    const off = ui.subscribe(() => setTick((t) => t + 1));
    return () => {
      window.clearInterval(timer);
      off();
    };
  }, [session, ui]);
}

export function HudRoot(props: { session: Session; ui: UiStore }) {
  useLive(props.session, props.ui);
  return (
    <GameContext.Provider value={{ session: props.session, ui: props.ui }}>
      <Hud />
    </GameContext.Provider>
  );
}

export function OverlayRoot(props: { session: Session; ui: UiStore }) {
  useLive(props.session, props.ui);
  return (
    <GameContext.Provider value={{ session: props.session, ui: props.ui }}>
      <Objectives />
      <Toasts />
      <Prompt />
      <Nav />
      <PanelHost />
    </GameContext.Provider>
  );
}

function Hud() {
  const { world, session, ui } = useGame();
  const muted = ui.prefs.muted;
  const town = world.town;
  const mats = (Object.keys(town.materials) as MaterialId[]).filter((m, i) => town.materials[m] > 0 || world.acts[i]?.unlocked);
  return (
    <div class="hud-bar">
      <span class="brand">Vigília</span>
      <span class="hud-item gold" title="Tesouro da vila">
        <IconCoin /> {fmt(town.treasury)}
      </span>
      <span class="hud-item date" title={formatDate(world.tick)}>
        {isNight(world.tick) ? <IconMoon /> : <IconSun />}
        <span class="date-long">{formatDate(world.tick)}</span>
        <span class="date-short">{formatDate(world.tick).replace(/^Ano (\d+) · .+, dia (\d+)$/, 'A$1 · dia $2')}</span> · {clockOf(world.tick)}
      </span>
      <span class="hud-item pop" title="População">
        <IconPeople /> {fmt(town.population)}
      </span>
      <span class="hud-item" title="Heróis na vila / vagas">
        <IconShield /> {activeHeroes(world).length}/{heroCapacity(world)}
      </span>
      <span class="hud-item energy">
        <EnergyCandles energy={town.mayorEnergy} />
      </span>
      {mats.map((m) => (
        <span key={m} class="hud-item mat" title={MATERIAL_NAMES[m]}>
          <IconBone /> {town.materials[m]}
        </span>
      ))}
      <button
        class={`hud-mute${muted ? ' off' : ''}`}
        onClick={() => ui.setPrefs({ muted: !muted })}
        aria-pressed={muted}
        title={muted ? 'Ligar o som (N)' : 'Desligar o som (N)'}
      >
        {muted ? <IconMute /> : <IconSound />}
      </button>
      <span class="speed" role="group" aria-label="Velocidade">
        <button class={`spd${session.paused ? ' active' : ''}`} onClick={() => session.togglePause()} aria-pressed={session.paused} title="Pausa (Espaço)">
          <IconPause />
        </button>
        {SPEEDS.map((s) => (
          <button key={s} class={`spd${!session.paused && session.speed === s ? ' active' : ''}`} onClick={() => session.setSpeed(s)} title={`Velocidade ${s}×`}>
            {s}×
          </button>
        ))}
      </span>
    </div>
  );
}

function Objectives() {
  const { world, ui } = useGame();
  const [open, setOpen] = useState(() => window.innerWidth > 720);
  const list = objectives(world);
  if (list.length === 0 || (ui.panel && ui.panel.kind === 'welcome')) return null;
  return (
    <aside class={`objectives${open ? '' : ' closed'}`}>
      <button class="obj-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        Objetivos {open ? '▾' : '▸'}
      </button>
      {open && (
        <ul>
          {list.map((o) => (
            <li key={o.text} class={`obj-${o.horizon}`}>
              {o.text}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function Toasts() {
  const { ui } = useGame();
  useEffect(() => {
    if (ui.toasts.length === 0) return;
    const oldest = ui.toasts[ui.toasts.length - 1]!;
    const wait = Math.max(200, oldest.at + 6000 - Date.now());
    const t = window.setTimeout(() => ui.dismissToast(oldest.id), wait);
    return () => window.clearTimeout(t);
  }, [ui.toasts]);
  return (
    <div class="toasts" aria-live="polite">
      {ui.toasts.map((t) => (
        <div key={t.id} class={`toast ${t.tone}`} onClick={() => ui.dismissToast(t.id)}>
          <LinkedText text={t.text} heroIds={t.heroIds} />
        </div>
      ))}
    </div>
  );
}

function Prompt() {
  const { ui } = useGame();
  const prompt = ui.prompt;
  if (!prompt || ui.panel) return null;
  return (
    <button class="prompt" onClick={() => ui.interact(prompt.id)}>
      <kbd>E</kbd> {prompt.label}
    </button>
  );
}

function Nav() {
  const { world, ui } = useGame();
  const parties = world.parties.length;
  const fighting = world.parties.some((p) => p.phase === 'combate');
  const toggle = (kind: Panel['kind']) => () => (ui.panel?.kind === kind ? ui.close() : ui.open({ kind } as Panel));
  const active = (kind: Panel['kind']) => (ui.panel?.kind === kind ? ' active' : '');
  return (
    <nav class="nav" aria-label="Painéis">
      <button class={`nav-btn${active('dungeon')}`} onClick={toggle('dungeon')} title="O abismo (M)">
        <IconAbyss /> <span>Abismo</span>
        {parties > 0 && <b class={`badge${fighting ? ' hot' : ''}`}>{parties}</b>}
      </button>
      <button class={`nav-btn${active('roster')}`} onClick={toggle('roster')} title="Heróis (H)">
        <IconShield /> <span>Heróis</span>
      </button>
      <button class={`nav-btn${active('chronicle')}`} onClick={toggle('chronicle')} title="Crônica (C)">
        <IconBook /> <span>Crônica</span>
      </button>
      <button class={`nav-btn${active('menu')}`} onClick={toggle('menu')} title="Menu">
        <IconMenu /> <span>Menu</span>
      </button>
    </nav>
  );
}

function PanelHost() {
  const { ui } = useGame();
  const p = ui.panel;
  if (!p) return null;
  switch (p.kind) {
    case 'hero':
      return <HeroPanel key={p.heroId} heroId={p.heroId} />;
    case 'building':
      return <BuildingPanel key={p.id} id={p.id} />;
    case 'horn':
      return <HornPanel />;
    case 'board':
      return <BoardPanel />;
    case 'coffer':
      return <CofferPanel />;
    case 'dungeon':
      return <DungeonPanel />;
    case 'chronicle':
      return <ChroniclePanel />;
    case 'roster':
      return <RosterPanel />;
    case 'memorial':
      return <MemorialPanel />;
    case 'menu':
      return <MenuPanel />;
    case 'welcome':
      return <WelcomePanel />;
    case 'campaignEnd':
      return <CampaignEndPanel />;
    case 'actEnd':
      return <ActEndPanel act={p.act} />;
  }
}
