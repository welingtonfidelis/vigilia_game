import { useState } from 'preact/hooks';
import { DAYS_PER_SEASON, dayOf, formatDate, SEASONS, seasonOf, yearOf } from '../../sim/index.ts';
import type { ChronicleKind, ChronicleEntry } from '../../sim/index.ts';
import { LinkedText, PanelShell, useGame } from '../components.tsx';
import { clockOf } from '../format.ts';

type Filter = 'tudo' | 'mortes' | 'gloria' | 'herois' | 'vila';

const FILTERS: Record<Filter, { label: string; kinds: ChronicleKind[] | null }> = {
  tudo: { label: 'Tudo', kinds: null },
  mortes: { label: 'Perdas', kinds: ['morte', 'luto', 'tumulo', 'restos', 'vinganca', 'fuga', 'eco', 'lesao', 'cicatriz'] },
  gloria: { label: 'Glória', kinds: ['conquista', 'chefe', 'promocao', 'traco', 'nivel', 'fim'] },
  herois: {
    label: 'Heróis',
    kinds: ['chegada', 'partida', 'retorno', 'resgate', 'vinculo', 'casamento', 'nascimento', 'maioridade', 'partiuDaVila', 'dispensa', 'aposentadoria', 'funcao'],
  },
  vila: { label: 'Vila', kinds: ['construcao', 'berrante', 'contrato', 'corrupcao', 'prefeito'] },
};

const TONE: Partial<Record<ChronicleKind, string>> = {
  morte: 'bad',
  luto: 'grief',
  tumulo: 'grief',
  restos: 'grief',
  vinganca: 'bad',
  eco: 'bad',
  fuga: 'warn',
  conquista: 'gold',
  chefe: 'gold',
  fim: 'gold',
  promocao: 'good',
  construcao: 'good',
  lesao: 'warn',
  cicatriz: 'grief',
  casamento: 'good',
  nascimento: 'good',
  maioridade: 'gold',
};

const PAGE = 150;

export function ChroniclePanel() {
  const { world } = useGame();
  const current = yearOf(dayOf(world.tick));
  const [year, setYear] = useState(current);
  const [filter, setFilter] = useState<Filter>('tudo');
  const [limit, setLimit] = useState(PAGE);
  const kinds = FILTERS[filter].kinds;
  const all = world.chronicle;
  const entries: ChronicleEntry[] = [];
  for (let i = all.length - 1; i >= 0; i--) {
    const e = all[i]!;
    const y = yearOf(dayOf(e.tick));
    if (y > year) continue;
    if (y < year) break;
    if (kinds && !kinds.includes(e.kind)) continue;
    entries.push(e);
  }
  const shown = entries.slice(0, limit);
  let lastSeason = -1;
  return (
    <PanelShell title="Crônica da Vila" subtitle="Tudo o que aconteceu, ano a ano." wide>
      <div class="row between">
        <button class="btn" disabled={year <= 1} onClick={() => { setYear(year - 1); setLimit(PAGE); }}>
          ‹ Ano {year - 1}
        </button>
        <strong>Ano {year}</strong>
        <button class="btn" disabled={year >= current} onClick={() => { setYear(year + 1); setLimit(PAGE); }}>
          Ano {year + 1} ›
        </button>
      </div>
      <div class="row tabs" role="tablist">
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} class={`tab${filter === f ? ' active' : ''}`} onClick={() => { setFilter(f); setLimit(PAGE); }}>
            {FILTERS[f].label}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p class="sub">Nada registrado aqui.</p>}
      <ol class="chronicle">
        {shown.map((e, i) => {
          const season = seasonOf(dayOf(e.tick));
          const header = season !== lastSeason;
          lastSeason = season;
          return (
            <li key={`${e.tick}-${i}`} class={TONE[e.kind] ?? ''}>
              {header && <h4>{SEASONS[season]}</h4>}
              <time title={formatDate(e.tick)}>
                dia {(dayOf(e.tick) % DAYS_PER_SEASON) + 1}, {clockOf(e.tick)}
              </time>
              <p>
                <LinkedText text={e.text} heroIds={e.heroIds} />
              </p>
            </li>
          );
        })}
      </ol>
      {entries.length > shown.length && (
        <button class="btn" onClick={() => setLimit(limit + PAGE)}>
          Mostrar mais ({entries.length - shown.length})
        </button>
      )}
    </PanelShell>
  );
}
