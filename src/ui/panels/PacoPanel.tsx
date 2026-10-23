// Paço do prefeito (M6 F6): as audiências, os cargos e a cosmética da vila (estandarte, enfeites
// dos 12 pontos e os nomes da praça e das ruas). O botão Audiências da barra abre a primeira aba.

import { useState } from 'preact/hooks';
import { CREST_SYMBOLS, CREST_TINCTURES } from '../../data/houses.ts';
import { commands, crestReadable, DECOR, DECOR_BY_ID, decorBlocker, decorOf, STREETS, streetName, villageBanner } from '../../sim/index.ts';
import type { Crest as CrestValue, DecorId, Hero, StreetId, World } from '../../sim/index.ts';
import { DECOR_SPOTS } from '../../render/layout.ts';
import { PanelShell, useCommand, useGame } from '../components.tsx';
import { Crest } from '../Crest.tsx';
import { fmt } from '../format.ts';
import type { PacoTab } from '../store.ts';
import { AudiencesBody } from './AudiencesPanel.tsx';
import { PostsSection } from './VillagePanel.tsx';

const TABS: [PacoTab, string][] = [
  ['audiencias', 'Audiências'],
  ['cargos', 'Cargos'],
  ['estandarte', 'Estandarte'],
  ['enfeites', 'Enfeites'],
  ['nomes', 'Nomes'],
];

export function PacoPanel(props: { tab?: PacoTab }) {
  const { world } = useGame();
  const [tab, setTab] = useState<PacoTab>(props.tab ?? 'audiencias');
  return (
    <PanelShell title="Paço do prefeito" subtitle="Onde a vila é governada: as audiências, os cargos e a cara da vila." wide>
      <div class="row tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} class={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'audiencias' && <AudiencesBody />}
      {tab === 'cargos' && <PostsSection />}
      {tab === 'estandarte' && <BannerTab world={world} />}
      {tab === 'enfeites' && <DecorTab world={world} />}
      {tab === 'nomes' && <StreetsTab world={world} />}
    </PanelShell>
  );
}

// ── Estandarte ─────────────────────────────────────────────────────────────

function BannerTab(props: { world: World }) {
  const command = useCommand();
  const current = villageBanner(props.world);
  const [draft, setDraft] = useState<CrestValue>(current);
  const set = (patch: Partial<CrestValue>) => setDraft({ ...draft, ...patch });
  const readable = crestReadable(draft);
  const changed = draft.field !== current.field || draft.charge !== current.charge || draft.symbol !== current.symbol;
  return (
    <>
      <p class="sub">O estandarte pende da sacada do Paço, nos mastros do portão e da praça, nas bandeirolas e na faixa dos grupos no Acompanhar.</p>
      <div class="banner-edit">
        <Crest crest={draft} label="Estandarte da vila" size={88} />
        <div>
          <h3>Campo</h3>
          <div class="swatches">
            {CREST_TINCTURES.map((t, i) => (
              <button key={i} class={`swatch${draft.field === i ? ' active' : ''}`} style={{ background: t.color }} title={t.name} aria-label={`Campo ${t.name}`} onClick={() => set({ field: i })} />
            ))}
          </div>
          <h3>Figura</h3>
          <div class="swatches">
            {CREST_TINCTURES.map((t, i) => (
              <button key={i} class={`swatch${draft.charge === i ? ' active' : ''}`} style={{ background: t.color }} title={t.name} aria-label={`Figura ${t.name}`} onClick={() => set({ charge: i })} />
            ))}
          </div>
          <h3>Símbolo</h3>
          <div class="row">
            {CREST_SYMBOLS.map((name, i) => (
              <button key={name} class={`btn small${draft.symbol === i ? ' active' : ''}`} onClick={() => set({ symbol: i })}>
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
      {!readable && <p class="tag warn">Metal sobre cor ou cor sobre metal: ouro e prata não vão um sobre o outro, nem duas cores.</p>}
      <div class="row">
        <button class="btn primary" disabled={!readable || !changed} onClick={() => command(commands.setBanner, draft)}>
          Erguer o estandarte
        </button>
        {changed && (
          <button class="btn" onClick={() => setDraft(current)}>
            Desfazer
          </button>
        )}
      </div>
    </>
  );
}

// ── Enfeites ───────────────────────────────────────────────────────────────

function DecorTab(props: { world: World }) {
  const { world } = props;
  const command = useCommand();
  const placed = decorOf(world);
  const [pick, setPick] = useState<Record<number, DecorId>>({});
  const open = DECOR.filter((d) => decorBlocker(world, d) === null);
  return (
    <>
      <p class="sub">
        Doze pontos pela vila. Os enfeites se liberam pelos feitos da vila; o ouro é simbólico. Tesouro: {fmt(world.town.treasury)}.
      </p>
      <ul class="post-list">
        {DECOR_SPOTS.map((spot, i) => {
          const here = placed[i] ?? null;
          const chosen = pick[i] ?? open.find((d) => d.id !== here)?.id;
          const def = chosen ? DECOR_BY_ID.get(chosen) : undefined;
          return (
            <li key={i}>
              <div>
                <strong>{spot.name}</strong> <span class="sub">{here ? DECOR_BY_ID.get(here)?.name : 'vazio'}</span>
              </div>
              <div class="post-pick">
                <select value={chosen} onChange={(e) => setPick({ ...pick, [i]: (e.target as HTMLSelectElement).value as DecorId })}>
                  {open.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.cost > 0 ? ` · ${d.cost} de ouro` : ''}
                    </option>
                  ))}
                </select>
                <button class="btn small" disabled={!def || def.id === here} onClick={() => def && command(commands.placeDecor, i, def.id)}>
                  {here ? 'Trocar' : 'Pôr'}
                </button>
                {here && (
                  <button class="btn small" onClick={() => command(commands.placeDecor, i, null)}>
                    Tirar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <h3>Catálogo</h3>
      <ul class="codex-list">
        {DECOR.map((d) => {
          const blocked = decorBlocker(world, d);
          return (
            <li key={d.id} class={blocked ? 'locked' : ''}>
              <strong>{d.name}</strong>
              <span class="muted"> · {blocked ?? (d.cost > 0 ? `${d.cost} de ouro` : 'liberado')}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ── Nomes ──────────────────────────────────────────────────────────────────

/** Sugestões: os caídos com mais feitos (e quem já tem rua fica de fora). */
function suggestions(world: World): Hero[] {
  const used = STREETS.map((s) => streetName(world, s.id));
  return world.heroes
    .filter((h) => h.status === 'dead' && !used.some((n) => n.endsWith(` ${h.name}`)))
    .sort((a, b) => b.deeds.length - a.deeds.length || b.level - a.level)
    .slice(0, 3);
}

function StreetsTab(props: { world: World }) {
  const { world } = props;
  const command = useCommand();
  const [draft, setDraft] = useState<Partial<Record<StreetId, string>>>({});
  const fallen = suggestions(world);
  return (
    <>
      <p class="sub">A placa de cada uma aparece no mapa. Uma rua com o nome de um herói caído é o jeito mais antigo de lembrar dele.</p>
      <ul class="post-list">
        {STREETS.map((street) => {
          const name = streetName(world, street.id);
          const value = draft[street.id] ?? name;
          const prefix = street.id === 'praca' ? 'Praça' : 'Rua';
          return (
            <li key={street.id}>
              <div>
                <strong>{name}</strong> <small>{street.what}.</small>
              </div>
              <form
                class="post-pick"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (command(commands.renameStreet, street.id, value)) setDraft({ ...draft, [street.id]: undefined });
                }}
              >
                <input class="house-name" value={value} maxLength={32} aria-label={`Nome de ${street.what.toLowerCase()}`} onInput={(e) => setDraft({ ...draft, [street.id]: (e.target as HTMLInputElement).value })} />
                <button class="btn small" type="submit" disabled={value.trim() === name}>
                  Dar o nome
                </button>
              </form>
              {fallen.length > 0 && (
                <div class="row">
                  {fallen.map((h) => (
                    <button key={h.id} class="btn small" onClick={() => setDraft({ ...draft, [street.id]: `${prefix} ${h.gender === 'f' ? 'da' : 'do'} ${h.name}` })}>
                      {prefix} {h.gender === 'f' ? 'da' : 'do'} {h.name}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
