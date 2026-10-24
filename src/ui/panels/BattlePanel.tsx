// Visualizador de dungeon do M4: várias expedições empilhadas (cada uma um corredor
// lateral, em LaneCard) e o relatório ao fim.
import { useEffect, useRef, useState } from 'preact/hooks';
import { floorLabel, formatDate, itemName, MATERIAL_NAMES, passageOf, TICKS_PER_DAY, todaysTournament } from '../../sim/index.ts';
import type { Hero, MaterialId, Party, Rarity, World } from '../../sim/index.ts';
import { fmt, heroById } from '../format.ts';
import { HeroPortrait } from '../PixelSprite.tsx';
import { useGame } from '../components.tsx';
import { addReportToHistory, clearReportHistory, loadReportHistory } from '../report-history.ts';
import { LaneCard } from './LaneCard.tsx';
import { highlightsFor, playHighlight, type Highlight } from '../../render/lane/replay.ts';

const OUTCOMES: Record<string, string> = {
  conquista: 'Conquista',
  retirada: 'Retirada',
  chamado: 'Chamado pelo sino',
  massacre: 'Massacre',
  cansaco: 'Exaustão',
  fuga: 'Fuga',
};

interface PartySnapshot {
  passageId: number;
  level: number;
  biome: number;
  floor: number;
  startMemberIds: number[];
  memberIds: number[];
  dead: number[];
  loot: { gold: number; materials: Partial<Record<MaterialId, number>>; xp: number };
  items: { name: string; rarity: Rarity }[];
  moments: string[];
  provisioned: number[];
  relics: number[];
  rooms: { kind: string; cleared: boolean }[];
  roomIndex: number;
  outcome: Party['outcome'];
  startedTick: number;
  rescued: number;
  contractId: number | null;
  confidence: number;
  endTick: number;
}

interface Track {
  initial: Map<number, { name: string; level: number; xp: number }>;
  initialFloorCleared: boolean;
  last: PartySnapshot;
}

/** Quantos momentos o relatório guarda (os últimos). */
const B_MOMENTS = 8;

export interface DungeonReport {
  key: string;
  id: number;
  endTick: number;
  level: number;
  biome: number;
  floor: number;
  outcome: Party['outcome'];
  cleared: boolean;
  xp: number;
  gold: number;
  materials: [MaterialId, number][];
  /** Peças trazidas (relatórios antigos não têm). */
  items?: { name: string; rarity: Rarity }[];
  /** Momentos marcantes: compras do mercador, armadilhas, fases de chefe… */
  moments?: string[];
  /** Quem desceu com ração e tochas, e quem com relíquia. */
  provisions?: { rations: string[]; relics: string[] };
  roomsCleared: number;
  roomsTotal: number;
  duration: number;
  fallen: { id: number; name: string }[];
  leveled: { heroId: number; name: string; from: number; to: number; xpGain: number }[];
  survivors: string[];
  rescued: number;
  contract: number | null;
  /** O grupo (para achar os melhores momentos gravados nesta sessão, M6 F3). */
  partyId?: number;
}

function snapshot(party: Party, endTick: number): PartySnapshot {
  return {
    passageId: party.passageId,
    level: party.level,
    biome: party.biome,
    floor: party.floor,
    startMemberIds: [...party.startMemberIds],
    memberIds: [...party.memberIds],
    dead: [...party.dead],
    loot: { gold: party.loot.gold, materials: { ...party.loot.materials }, xp: party.loot.xp },
    items: (party.loot.items ?? []).map((i) => ({ name: itemName(i, null), rarity: i.rarity })),
    moments: [...party.moments],
    provisioned: [...(party.provisioned ?? [])],
    relics: [...(party.relics ?? [])],
    rooms: party.rooms.map((r) => ({ kind: r.kind, cleared: r.cleared })),
    roomIndex: party.roomIndex,
    outcome: party.outcome,
    startedTick: party.startedTick,
    rescued: party.rescued,
    contractId: party.contractId,
    confidence: party.confidence,
    endTick,
  };
}

function buildReport(world: ReturnType<typeof useGame>['world'], track: Track): DungeonReport {
  const last = track.last;
  const heroes = last.startMemberIds.map((id) => heroById(world, id)).filter((h): h is Hero => !!h);
  const fallen = last.dead.map((id) => {
    const hero = heroById(world, id);
    return { id, name: hero?.name ?? track.initial.get(id)?.name ?? 'Herói perdido' };
  });
  const leveled = heroes
    .map((hero) => {
      const initial = track.initial.get(hero.id);
      if (!initial || hero.level <= initial.level) return null;
      return { heroId: hero.id, name: hero.name, from: initial.level, to: hero.level, xpGain: Math.max(0, Math.round(hero.xp - initial.xp)) };
    })
    .filter((h): h is { heroId: number; name: string; from: number; to: number; xpGain: number } => !!h);
  const survivors = last.startMemberIds
    .filter((id) => !last.dead.includes(id))
    .map((id) => heroById(world, id)?.name ?? track.initial.get(id)?.name ?? 'Herói')
    .filter(Boolean);
  const contract = last.contractId === null ? null : world.town.contracts.find((c) => c.id === last.contractId)?.reward ?? null;
  const cleared = last.outcome === 'conquista' || (!track.initialFloorCleared && passageOf(world, last.passageId)?.conquered[last.floor] === true);
  const outcome = last.outcome ?? (cleared ? 'conquista' : 'retirada');
  return {
    key: `${last.startMemberIds.join('-')}:${last.passageId}:${last.floor}:${last.endTick}`,
    id: last.startMemberIds[0] ?? 0,
    endTick: last.endTick,
    level: last.level,
    biome: last.biome,
    floor: last.floor,
    outcome,
    cleared,
    xp: last.loot.xp,
    gold: last.loot.gold,
    materials: Object.entries(last.loot.materials) as [MaterialId, number][],
    items: last.items,
    moments: last.moments.slice(-B_MOMENTS),
    provisions: {
      rations: last.provisioned.map((id) => heroById(world, id)?.name ?? '').filter(Boolean),
      relics: last.relics.map((id) => heroById(world, id)?.name ?? '').filter(Boolean),
    },
    roomsCleared: last.rooms.filter((r) => r.cleared).length,
    roomsTotal: last.rooms.length,
    duration: Math.max(0, last.endTick - last.startedTick),
    fallen,
    leveled,
    survivors,
    rescued: last.rescued,
    contract,
  };
}

/**
 * Modo destaque (M6 F3): quanto vale olhar este grupo agora. Senhor, guardião, nêmesis,
 * herói por um fio, encontro, elite, luta comum, nesta ordem.
 */
function interest(party: Party): { score: number; why: string } {
  const c = party.phase === 'combate' ? party.combat : null;
  if (c?.bossMech) return { score: 60, why: 'luta contra o Senhor' };
  if (c?.isBoss) return { score: 50, why: 'luta contra o guardião' };
  if (c?.units.some((u) => u.nemesisId !== undefined && u.alive)) return { score: 40, why: 'uma nêmesis na sala' };
  if (c?.units.some((u) => u.side === 'hero' && u.alive && u.hp < u.maxHp * 0.2)) return { score: 30, why: 'um herói por um fio' };
  if (party.encounter && party.phase !== 'voltando') return { score: 20, why: 'um encontro esperando conselho' };
  if (c?.units.some((u) => u.side === 'enemy' && u.elite && u.alive)) return { score: 15, why: 'luta contra um elite' };
  if (c) return { score: 10, why: 'luta' };
  return { score: party.phase === 'voltando' ? 0 : 2, why: party.phase === 'voltando' ? 'voltando à vila' : 'explorando' };
}

/** Fica pelo menos este tempo num grupo antes de trocar (ms de relógio). */
const HIGHLIGHT_DWELL = 8000;

function useHighlight(world: World, on: boolean, preferred: number): { id: number | null; why: string } {
  const current = useRef<{ id: number | null; since: number }>({ id: null, since: 0 });
  if (!on || world.parties.length === 0) return { id: null, why: '' };
  const now = Date.now();
  const best = world.parties.reduce((a, b) => (interest(b).score > interest(a).score ? b : a));
  const cur = world.parties.find((p) => p.id === current.current.id);
  if (!cur) {
    // Primeira vez (ou o grupo voltou à vila): começa no grupo escolhido, se nada melhor acontece.
    const start = world.parties.find((p) => p.id === preferred);
    const pick = current.current.id === null && start && interest(start).score >= interest(best).score ? start : best;
    current.current = { id: pick.id, since: now };
  } else if (best.id !== cur.id && interest(best).score > interest(cur).score && now - current.current.since >= HIGHLIGHT_DWELL) {
    current.current = { id: best.id, since: now };
  }
  const shown = world.parties.find((p) => p.id === current.current.id)!;
  return { id: shown.id, why: interest(shown).why };
}

function durationLabel(ticks: number): string {
  const hours = Math.round(ticks / (TICKS_PER_DAY / 24));
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** O replay de uma luta marcante no corredor de sempre (M6 F3). */
function ReplayView(props: { highlight: Highlight; onClose: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [run, setRun] = useState(0);
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    if (!stage.current || !canvas.current) return;
    setEnded(false);
    return playHighlight(props.highlight, canvas.current, () => setEnded(true));
  }, [props.highlight, run]);
  return (
    <div class="replay-view">
      <header>
        <strong>{props.highlight.title}</strong>
        <span>
          {ended && (
            <button class="btn small" onClick={() => setRun((r) => r + 1)}>
              Ver de novo
            </button>
          )}
          <button class="btn small" onClick={props.onClose}>
            Fechar
          </button>
        </span>
      </header>
      <div class="lane-view replay-stage" ref={stage}>
        <canvas ref={canvas} class="lane-canvas" aria-label={`Replay: ${props.highlight.title}`} />
      </div>
    </div>
  );
}

function BattleReport(props: { report: DungeonReport; world: ReturnType<typeof useGame>['world']; total: number; onClose: () => void; onAbismo: () => void }) {
  const { report, world, total, onClose, onAbismo } = props;
  const outcome = report.outcome ? OUTCOMES[report.outcome] ?? report.outcome : 'Retorno';
  const best = report.partyId !== undefined ? highlightsFor(report.partyId) : [];
  const [replay, setReplay] = useState<Highlight | null>(null);
  return (
    <div class="battle-report">
      {replay && <ReplayView highlight={replay} onClose={() => setReplay(null)} />}
      <section class="report-card">
        <header>
          <small>Relatório de expedição{total > 1 ? ' · 1 de ' + total : ''}</small>
          <h2>{outcome}</h2>
          <p>Nível {report.level} · {floorLabel(report)} · {durationLabel(report.duration)}</p>
        </header>
        <div class="report-stats">
          <div><span>Experiência</span><strong>{fmt(report.xp)} XP</strong></div>
          <div><span>Ouro</span><strong>{fmt(report.gold)}</strong></div>
          <div><span>Salas limpas</span><strong>{report.roomsCleared}/{report.roomsTotal}</strong></div>
          <div><span>Dungeon vencida</span><strong>{report.cleared ? 'Sim' : 'Não'}</strong></div>
          <div><span>Sobreviventes</span><strong>{report.survivors.length}</strong></div>
          <div><span>Resgatados</span><strong>{report.rescued}</strong></div>
        </div>
        {report.materials.length > 0 && <p class="report-materials">Materiais: {report.materials.map(([m, n]) => `${n} ${MATERIAL_NAMES[m].toLowerCase()}`).join(' · ')}</p>}
        {report.items && report.items.length > 0 && (
          <p class="report-materials">
            Peças:{' '}
            {report.items.map((it, i) => (
              <span key={i} class={`rarity-text rarity-${it.rarity}`}>
                {i > 0 && ' · '}
                {it.name}
              </span>
            ))}
          </p>
        )}
        {report.contract !== null && <p class="report-materials">Contrato cumprido: {fmt(report.contract)} de ouro.</p>}
        {report.provisions && (report.provisions.rations.length > 0 || report.provisions.relics.length > 0) && (
          <p class="report-materials">
            Provisões:{' '}
            {report.provisions.rations.length > 0 ? `ração e tochas para ${report.provisions.rations.join(', ')}` : 'ninguém levou ração'}
            {report.provisions.relics.length > 0 ? ` · relíquia do templo com ${report.provisions.relics.join(', ')}` : ''}.
          </p>
        )}
        {report.moments && report.moments.length > 0 && (
          <>
            <h3>Momentos</h3>
            <ul class="report-moments">
              {report.moments.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </>
        )}
        {best.length > 0 && (
          <>
            <h3>Melhores momentos</h3>
            <ul class="report-best">
              {best.map((h, i) => (
                <li key={i}>
                  <button class="btn small" onClick={() => setReplay(h)}>
                    ▶ {h.title}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <h3>Heróis caídos</h3>
        {report.fallen.length === 0 ? <p class="sub">Nenhum herói caiu nesta expedição.</p> : (
          <ul class="report-heroes">
            {report.fallen.map((f) => {
              const hero = heroById(world, f.id);
              return <li key={f.id}>{hero ? <HeroPortrait hero={hero} variant="detail" /> : <span class="report-portrait-empty">†</span>}<span>{f.name}</span></li>;
            })}
          </ul>
        )}
        <h3>Subiram de nível</h3>
        {report.leveled.length === 0 ? <p class="sub">Nenhum herói subiu de nível.</p> : (
          <ul class="report-heroes">
            {report.leveled.map((l) => {
              const hero = heroById(world, l.heroId);
              return <li key={l.heroId}>{hero ? <HeroPortrait hero={hero} variant="detail" /> : <span class="report-portrait-empty">↑</span>}<span>{l.name}<small>nível {l.from} → {l.to}{l.xpGain > 0 ? ` · +${fmt(l.xpGain)} XP` : ''}</small></span></li>;
            })}
          </ul>
        )}
        <p class="sub report-survivors">Sobreviventes: {report.survivors.join(', ') || 'nenhum'}.</p>
        <div class="report-actions">
          <button class="btn" onClick={onClose}>Fechar relatório</button>
          <button class="btn primary" onClick={onAbismo}>Voltar à vila</button>
        </div>
      </section>
    </div>
  );
}

function ReportHistory(props: { reports: DungeonReport[]; onOpen: (r: DungeonReport) => void; onClose: () => void; onClear: () => void }) {
  return (
    <div class="battle-history">
      <section class="history-card">
        <header>
          <div><small>Arquivo da vila</small><h2>Relatórios recentes</h2></div>
          <button class="battle-close" onClick={props.onClose} aria-label="Fechar histórico">×</button>
        </header>
        {props.reports.length === 0 ? <p class="sub">Nenhum relatório guardado.</p> : (
          <ul>
            {props.reports.map((r) => (
              <li key={r.key}>
                <button onClick={() => props.onOpen(r)}>
                  <strong>{r.outcome ? OUTCOMES[r.outcome] ?? r.outcome : 'Retorno'}</strong>
                  <span>Nível {r.level} · {floorLabel(r)}</span>
                  <small>{formatDate(r.endTick)} · {fmt(r.xp)} XP · {fmt(r.gold)} ouro{r.cleared ? ' · vencida' : ''}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div class="report-actions">
          <button class="btn" onClick={props.onClear}>Limpar histórico</button>
          <button class="btn" onClick={props.onClose}>Fechar</button>
        </div>
      </section>
    </div>
  );
}

export function BattlePanel(props: { partyId: number }) {
  const { world, session, ui } = useGame();
  const [reports, setReports] = useState<DungeonReport[]>([]);
  const [history, setHistory] = useState<DungeonReport[]>(() => loadReportHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyReport, setHistoryReport] = useState<DungeonReport | null>(null);
  const tracked = useRef(new Map<number, Track>());

  const ordered = [...world.parties].sort((a, b) => {
    if (a.id === props.partyId) return -1;
    if (b.id === props.partyId) return 1;
    return a.id - b.id;
  });
  const highlight = useHighlight(world, ui.prefs.highlight, props.partyId);
  const visible = highlight.id !== null ? world.parties.filter((p) => p.id === highlight.id) : ordered.slice(0, 3);

  useEffect(() => {
    const active = new Map(world.parties.map((p) => [p.id, p]));
    for (const p of world.parties) {
      const t = tracked.current.get(p.id);
      if (t) t.last = snapshot(p, world.tick);
    }
    for (const p of visible) {
      if (tracked.current.has(p.id)) continue;
      const initial = new Map<number, { name: string; level: number; xp: number }>();
      for (const id of p.startMemberIds) {
        const h = heroById(world, id);
        if (h) initial.set(id, { name: h.name, level: h.level, xp: h.xp });
      }
      tracked.current.set(p.id, { initial, initialFloorCleared: passageOf(world, p.passageId)?.conquered[p.floor] === true, last: snapshot(p, world.tick) });
    }
    const finished: DungeonReport[] = [];
    for (const [id, t] of [...tracked.current]) {
      if (!active.has(id)) {
        finished.push({ ...buildReport(world, t), partyId: id });
        tracked.current.delete(id);
      }
    }
    if (finished.length > 0) {
      setReports((old) => [...old, ...finished]);
      let next = history;
      for (const r of finished) next = addReportToHistory(r);
      setHistory(next);
    }
  }, [session.rev]);

  const report = reports[0] ?? null;
  const closeReport = (): void => setReports((old) => old.slice(1));

  return (
    <section class="battle-view">
      <header class="battle-top">
        <button class="battle-close" onClick={() => ui.close()} aria-label="Fechar">×</button>
        <div class="battle-title">
          <h2>Dungeons em andamento</h2>
          <p>
            {world.parties.length} grupo{world.parties.length === 1 ? '' : 's'} no abismo
            {highlight.id !== null ? <span class="highlight-why"> · destaque: {highlight.why}</span> : world.parties.length > 3 ? ` · mostrando 3` : ''}
          </p>
        </div>
        {(todaysTournament(world)?.duels.length ?? 0) > 0 && (
          <button class="btn small" onClick={() => ui.open({ kind: 'tournament' })} title="Os duelos do torneio de hoje, no campo de treino">
            Torneio
          </button>
        )}
        <button
          class={`btn small highlight-toggle${ui.prefs.highlight ? ' active' : ''}`}
          aria-pressed={ui.prefs.highlight}
          onClick={() => ui.setPrefs({ highlight: !ui.prefs.highlight })}
          title="Um corredor só, que troca sozinho para o grupo onde algo vai acontecer"
        >
          Destaques
        </button>
        <div class="battle-loot"><span>Em campo</span><strong>{world.parties.length}</strong></div>
        {history.length > 0 && <button class="btn small history-button" onClick={() => setHistoryOpen(true)}>Relatórios ({history.length})</button>}
      </header>

      {report ? (
        <BattleReport report={report} world={world} total={reports.length} onClose={closeReport} onAbismo={() => ui.open({ kind: 'dungeon' })} />
      ) : historyReport ? (
        <BattleReport
          report={historyReport}
          world={world}
          total={1}
          onClose={() => { setHistoryReport(null); setHistoryOpen(true); }}
          onAbismo={() => ui.open({ kind: 'dungeon' })}
        />
      ) : historyOpen ? (
        <ReportHistory
          reports={history}
          onOpen={(r) => { setHistoryReport(r); setHistoryOpen(false); }}
          onClose={() => setHistoryOpen(false)}
          onClear={() => { clearReportHistory(); setHistory([]); setHistoryOpen(false); }}
        />
      ) : visible.length === 0 ? (
        <div class="battle-empty">Nenhuma dungeon em andamento.</div>
      ) : (
        <div class={`battle-multi${highlight.id !== null ? ' focus' : ''}`}>
          {visible.map((party) => <LaneCard key={party.id} party={party} selected={party.id === props.partyId} />)}
        </div>
      )}

      {!report && !historyReport && !historyOpen && <footer class="battle-bottom"><span>{world.parties.length} expedição{world.parties.length === 1 ? '' : 'ões'} ativa{world.parties.length === 1 ? '' : 's'}</span><span>O combate segue automático.</span><button class="btn small" onClick={() => ui.open({ kind: 'dungeon' })}>Voltar à vila</button></footer>}
    </section>
  );
}
