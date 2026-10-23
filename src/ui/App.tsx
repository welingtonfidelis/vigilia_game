// Raízes da UI: o HUD (acima do mapa) e a camada sobre o mapa (painéis, avisos, objetivos).

import { useEffect, useRef, useState } from 'preact/hooks';
import { abyssPressure, activeHeroes, BALANCE, BIOMES, dayOf, formatDate, heroCapacity, isNight, MATERIAL_NAMES, petitionText } from '../sim/index.ts';
import type { MaterialId } from '../sim/index.ts';
import { SPEEDS, type Session } from '../game/session.ts';
import { GameContext, LinkedText, useGame } from './components.tsx';
import { EnergyCandles } from './Energy.tsx';
import { clockOf, fmt, knownMaterials } from './format.ts';
import { IconAbyss, IconBook, IconHouse, IconMenu, IconMoon, IconMute, IconPause, IconScroll, IconShield, IconSound, IconSun, MaterialIcon, PackIcon } from './icons.tsx';
import { objectives } from './objectives.ts';
import { ChroniclePanel } from './panels/ChroniclePanel.tsx';
import { EventPanel } from './panels/EventPanel.tsx';
import { BattlePanel } from './panels/BattlePanel.tsx';
import { DungeonPanel } from './panels/DungeonPanel.tsx';
import { HeroPanel } from './panels/HeroPanel.tsx';
import { VillagePanel } from './panels/VillagePanel.tsx';
import { CampaignEndPanel, MemorialPanel, MenuPanel, RosterPanel, WelcomePanel } from './panels/PeoplePanels.tsx';
import { AmuletPanel, LordEndPanel } from './panels/AmuletPanels.tsx';
import { AudiencesPanel } from './panels/AudiencesPanel.tsx';
import { TournamentPanel } from './panels/TournamentPanel.tsx';
import { BoardPanel, BuildingPanel, CofferPanel, HornPanel, ThermalPanel } from './panels/TownPanels.tsx';
import { DISMISSIBLE, type Panel, type UiStore } from './store.ts';

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
      <WatchButton />
      <Nav />
      <PanelHost />
    </GameContext.Provider>
  );
}

function Hud() {
  const { world, session, ui } = useGame();
  const muted = ui.prefs.muted;
  const town = world.town;
  const mats = knownMaterials(world);
  // Evento sazonal pendente: abre o painel e pausa a simulação até a escolha.
  useEffect(() => {
    if (!world.town.event) return;
    if (ui.panel?.kind !== 'event') ui.open({ kind: 'event' });
    if (!session.paused) session.setPaused(true);
  }, [world.town.event, ui.rev, session]);

  return (
    <div class="hud-bar">
      <span class="brand">Vigília</span>
      <span class="hud-item gold" title="Tesouro da vila">
        <PackIcon name="resource-gold" /> {fmt(town.treasury)}
      </span>
      <span class="hud-item date" title={formatDate(world.tick)}>
        {isNight(world.tick) ? <IconMoon /> : <IconSun />}
        <span class="date-long">{formatDate(world.tick)}</span>
        <span class="date-short">{formatDate(world.tick).replace(/^Ano (\d+) · .+, dia (\d+)$/, 'A$1 · dia $2')}</span> · {clockOf(world.tick)}
      </span>
      <span class="hud-item pop" title="População">
        <PackIcon name="resource-population" /> {fmt(town.population)}
      </span>
      <span class="hud-item" title="Heróis na vila / vagas">
        <PackIcon name="resource-heroes" /> {activeHeroes(world).length}/{heroCapacity(world)}
      </span>
      <EnergyCount energy={town.mayorEnergy} />
      {mats.map((m) => (
        <MaterialCount key={m} id={m} count={town.materials[m]} />
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

/** As velas do prefeito no topo, com a dica do que a energia faz (passar o mouse ou tocar). */
function EnergyCount(props: { energy: number }) {
  const max = BALANCE.mayorEnergy;
  const left = Math.max(0, Math.floor(props.energy));
  return (
    <button type="button" class="hud-item energy hud-tipped" aria-label={`Energia do prefeito: ${left} de ${max}`}>
      <EnergyCandles energy={props.energy} />
      <span class="hud-tip" role="tooltip">
        <strong>Energia do prefeito</strong>
        <span>
          {left} de {max} velas hoje. Voltam todas à meia-noite.
        </span>
        <span>
          Conversar, presentear e consolar: 1. Discursar na praça: 2. Aconselhar um grupo pelo corvo: {BALANCE.encounterAdviceEnergy}. Algumas respostas das
          audiências também gastam.
        </span>
      </span>
    </button>
  );
}

/** Biomas de onde sai cada material (o mesmo material pode vir de mais de um). */
const MATERIAL_SOURCES = (id: MaterialId): string => {
  const names = BIOMES.filter((b) => b.material === id).map((b) => b.name);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : (names[0] ?? 'o abismo');
};

/** Contador de um material no topo, com ícone próprio e dica ao passar o mouse ou tocar. */
function MaterialCount(props: { id: MaterialId; count: number }) {
  const name = MATERIAL_NAMES[props.id];
  return (
    <button type="button" class="hud-item mat" aria-label={`${name}: ${props.count}`}>
      <MaterialIcon id={props.id} /> {props.count}
      <span class="hud-tip" role="tooltip">
        <strong>{name}</strong>
        <span>{props.count} no Cofre.</span>
        <span>Vem do abismo: {MATERIAL_SOURCES(props.id)}.</span>
        <span>Serve para subir os prédios e para encomendar peças na forja.</span>
      </span>
    </button>
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
    // Chamadas do abismo (com "Assistir") ficam mais tempo na tela.
    const wait = Math.max(200, oldest.at + (oldest.watch ? 12000 : 6000) - Date.now());
    const t = window.setTimeout(() => ui.dismissToast(oldest.id), wait);
    return () => window.clearTimeout(t);
  }, [ui.toasts]);
  return (
    <div class="toasts" aria-live="polite">
      {ui.toasts.map((t) => (
        <div key={t.id} class={`toast ${t.tone}`} onClick={() => ui.dismissToast(t.id)}>
          <LinkedText text={t.text} heroIds={t.heroIds} />
          {t.watch && (
            <button
              class="btn small toast-watch"
              onClick={(e) => {
                e.stopPropagation();
                ui.dismissToast(t.id);
                ui.open(t.watch!);
              }}
            >
              {t.watch.kind === 'battle' || t.watch.kind === 'tournament' ? 'Assistir' : 'Abrir'}
            </button>
          )}
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

/** Atalho para acompanhar as dungeons sem passar pelo Abismo (tecla G). */
function WatchButton() {
  const { world, ui } = useGame();
  const parties = world.parties.length;
  // Com um painel aberto o botão sairia por cima dele: some até o painel fechar.
  if (parties === 0 || ui.panel) return null;
  const fighting = world.parties.some((p) => p.phase === 'combate');
  return (
    <button class={`watch-btn${fighting ? ' hot' : ''}`} onClick={() => ui.watch(world)} title="Acompanhar as dungeons (G)">
      <i class="watch-dot" aria-hidden="true" />
      <span>
        Acompanhar <small>{parties === 1 ? '1 grupo' : `${parties} grupos`}</small>
      </span>
      <kbd>G</kbd>
    </button>
  );
}

function Nav() {
  const { world, ui } = useGame();
  const parties = world.parties.length;
  const fighting = world.parties.some((p) => p.phase === 'combate');
  const threat = abyssPressure(world);
  const crows = world.parties.filter((p) => p.encounter && !p.encounter.advice).length;
  const petitions = (world.town.petitions?.length ?? 0) + crows;
  const urgent = crows > 0 || (world.town.petitions ?? []).some((p) => p.untilDay <= dayOf(world.tick));
  // Petição nova na mesa: um aviso curto (não no carregamento do save).
  const seenSeq = useRef<number | null>(null);
  useEffect(() => {
    const seq = world.town.petitionSeq ?? 0;
    if (seenSeq.current !== null && seq > seenSeq.current) {
      const fresh = (world.town.petitions ?? []).filter((p) => p.id > seenSeq.current!);
      for (const p of fresh) ui.toast(`${petitionText(world, p).quem} pede audiência na mesa da praça (P).`, 'info');
    }
    seenSeq.current = seq;
  }, [world.town.petitionSeq]);
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
      <button class={`nav-btn${active('village')}`} onClick={toggle('village')} title="A vila (V)">
        <IconHouse /> <span>Vila</span>
        {threat >= 55 && <b class="badge hot">!</b>}
      </button>
      <button class={`nav-btn${active('audiences')}`} onClick={toggle('audiences')} title="Audiências (P)">
        <IconScroll /> <span>Audiências</span>
        {petitions > 0 && <b class={`badge${urgent ? ' hot' : ''}`}>{petitions}</b>}
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

/** O painel aberto; os de consulta ganham um fundo invisível que fecha ao clicar fora. */
function PanelHost() {
  const { ui } = useGame();
  const p = ui.panel;
  if (!p) return null;
  return (
    <>
      {DISMISSIBLE.has(p.kind) && <div class="panel-scrim" onPointerDown={() => ui.close()} aria-hidden="true" />}
      <PanelContent panel={p} />
    </>
  );
}

function PanelContent(props: { panel: Panel }) {
  const p = props.panel;
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
    case 'thermal':
      return <ThermalPanel />;
    case 'event':
      return <EventPanel />;
    case 'battle':
      return <BattlePanel partyId={p.partyId} />;
    case 'village':
      return <VillagePanel />;
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
      return <WelcomePanel oldSave={p.oldSave} />;
    case 'campaignEnd':
      return <CampaignEndPanel />;
    case 'amulet':
      return <AmuletPanel />;
    case 'lordEnd':
      return <LordEndPanel level={p.level} />;
    case 'audiences':
      return <AudiencesPanel />;
    case 'tournament':
      return <TournamentPanel />;
  }
}
