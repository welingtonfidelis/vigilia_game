// Visualizador de dungeon do M4: várias expedições empilhadas (cada uma um corredor
// lateral, em LaneCard) e o relatório ao fim.
import { useEffect, useRef, useState } from 'preact/hooks';
import { floorLabel, formatDate, itemName, MATERIAL_NAMES, TICKS_PER_DAY } from '../../sim/index.ts';
import type { Hero, MaterialId, Party, Rarity } from '../../sim/index.ts';
import { fmt, heroById } from '../format.ts';
import { HeroPortrait } from '../PixelSprite.tsx';
import { useGame } from '../components.tsx';
import { addReportToHistory, clearReportHistory, loadReportHistory } from '../report-history.ts';
import { LaneCard } from './LaneCard.tsx';

const OUTCOMES: Record<string, string> = {
  conquista: 'Conquista',
  retirada: 'Retirada',
  chamado: 'Chamado pelo sino',
  massacre: 'Massacre',
  cansaco: 'Exaustão',
  fuga: 'Fuga',
};

interface PartySnapshot {
  act: number;
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
  act: number;
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
}

function snapshot(party: Party, endTick: number): PartySnapshot {
  return {
    act: party.act,
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
  const cleared = last.outcome === 'conquista' || (!track.initialFloorCleared && world.acts[last.act]?.conquered[last.floor] === true);
  const outcome = last.outcome ?? (cleared ? 'conquista' : 'retirada');
  return {
    key: `${last.startMemberIds.join('-')}:${last.act}:${last.floor}:${last.endTick}`,
    id: last.startMemberIds[0] ?? 0,
    endTick: last.endTick,
    act: last.act,
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

function durationLabel(ticks: number): string {
  const hours = Math.round(ticks / (TICKS_PER_DAY / 24));
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function BattleReport(props: { report: DungeonReport; world: ReturnType<typeof useGame>['world']; total: number; onClose: () => void; onAbismo: () => void }) {
  const { report, world, total, onClose, onAbismo } = props;
  const outcome = report.outcome ? OUTCOMES[report.outcome] ?? report.outcome : 'Retorno';
  return (
    <div class="battle-report">
      <section class="report-card">
        <header>
          <small>Relatório de expedição{total > 1 ? ' · 1 de ' + total : ''}</small>
          <h2>{outcome}</h2>
          <p>Ato {report.act + 1} · {floorLabel(report.act, report.floor)} · {durationLabel(report.duration)}</p>
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
                  <span>Ato {r.act + 1} · {floorLabel(r.act, r.floor)}</span>
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
  const visible = ordered.slice(0, 3);

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
      tracked.current.set(p.id, { initial, initialFloorCleared: world.acts[p.act]?.conquered[p.floor] === true, last: snapshot(p, world.tick) });
    }
    const finished: DungeonReport[] = [];
    for (const [id, t] of [...tracked.current]) {
      if (!active.has(id)) {
        finished.push(buildReport(world, t));
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
          <p>{world.parties.length} grupo{world.parties.length === 1 ? '' : 's'} no abismo{world.parties.length > 3 ? ` · mostrando 3` : ''}</p>
        </div>
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
        <div class="battle-multi">
          {visible.map((party) => <LaneCard key={party.id} party={party} selected={party.id === props.partyId} />)}
        </div>
      )}

      {!report && !historyReport && !historyOpen && <footer class="battle-bottom"><span>{world.parties.length} expedição{world.parties.length === 1 ? '' : 'ões'} ativa{world.parties.length === 1 ? '' : 's'}</span><span>O combate segue automático.</span><button class="btn small" onClick={() => ui.open({ kind: 'dungeon' })}>Voltar à vila</button></footer>}
    </section>
  );
}
