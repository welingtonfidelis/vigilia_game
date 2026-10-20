import type { ComponentChildren } from 'preact';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Session } from '../game/session.ts';
import type { CommandResult, World } from '../sim/index.ts';
import type { UiStore } from './store.ts';

export interface Ctx {
  session: Session;
  ui: UiStore;
}

export const GameContext = createContext<Ctx>(null as unknown as Ctx);

export const useGame = (): Ctx & { world: World } => {
  const ctx = useContext(GameContext);
  return { ...ctx, world: ctx.session.world };
};

/** Executa um comando do prefeito e avisa quando ele é recusado. */
export function useCommand(): <A extends unknown[]>(
  cmd: (world: World, ...args: A) => CommandResult,
  ...args: A
) => boolean {
  const { session, ui } = useContext(GameContext);
  return (cmd, ...args) => {
    const result = session.run(cmd, ...args);
    if (!result.ok) ui.toast(result.reason, 'warn');
    return result.ok;
  };
}

export function Bar(props: {
  value: number;
  max: number;
  kind: 'hp' | 'morale' | 'xp' | 'energy' | 'fun' | 'faith' | 'loyalty' | 'corruption' | 'enemy';
  marker?: number | null;
  markerTitle?: string;
  text?: string;
  slim?: boolean;
}) {
  const frac = props.max > 0 ? Math.max(0, Math.min(1, props.value / props.max)) : 0;
  const mark = props.marker !== undefined && props.marker !== null && Number.isFinite(props.marker) ? Math.max(0, Math.min(1, props.marker / props.max)) : null;
  return (
    <div class={`bar bar-${props.kind}${props.slim ? ' slim' : ''}`} role="meter" aria-valuenow={Math.round(props.value)} aria-valuemax={Math.round(props.max)}>
      <div class="fill" style={{ width: `${frac * 100}%` }} />
      {mark !== null && <div class="mark" style={{ left: `${mark * 100}%` }} title={props.markerTitle} />}
      {props.text && <span class="bar-text">{props.text}</span>}
    </div>
  );
}

export function PanelShell(props: { title: ComponentChildren; subtitle?: ComponentChildren; children: ComponentChildren; wide?: boolean }) {
  const { ui } = useContext(GameContext);
  return (
    <section class={`panel${props.wide ? ' wide' : ''}`} role="dialog" aria-label={typeof props.title === 'string' ? props.title : undefined}>
      <header class="panel-head">
        {ui.back && (
          <button class="icon-btn" onClick={() => ui.goBack()} aria-label="Voltar" title="Voltar">
            ‹
          </button>
        )}
        <div class="panel-title">
          <h2>{props.title}</h2>
          {props.subtitle && <p class="sub">{props.subtitle}</p>}
        </div>
        <button class="icon-btn" onClick={() => ui.close()} aria-label="Fechar" title="Fechar (Esc)">
          ×
        </button>
      </header>
      <div class="panel-body">{props.children}</div>
    </section>
  );
}

/** Nome clicável que abre a ficha. `cross` marca os mortos com † (em listas, não no meio de frases). */
export function HeroLink(props: { id: number; children?: ComponentChildren; cross?: boolean }) {
  const { session, ui } = useContext(GameContext);
  const hero = session.world.heroes.find((h) => h.id === props.id);
  if (!hero) return <span>{props.children}</span>;
  return (
    <button class={`link${hero.status === 'dead' ? ' dead' : ''}`} onClick={() => ui.open({ kind: 'hero', heroId: hero.id })}>
      {props.children ?? hero.name}
      {hero.status === 'dead' && props.cross !== false && ' †'}
    </button>
  );
}

/** Texto da crônica com os nomes dos heróis citados clicáveis. */
export function LinkedText(props: { text: string; heroIds: number[] }) {
  const { session } = useContext(GameContext);
  const heroes = props.heroIds
    .map((id) => session.world.heroes.find((h) => h.id === id))
    .filter((h): h is NonNullable<typeof h> => !!h)
    .sort((a, b) => b.name.length - a.name.length);
  if (heroes.length === 0) return <>{props.text}</>;
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${heroes.map((h) => escape(h.name)).join('|')})`, 'g');
  const parts = props.text.split(re);
  const used = new Set<number>();
  return (
    <>
      {parts.map((part, i) => {
        const hero = heroes.find((h) => h.name === part);
        if (!hero || used.has(hero.id)) return part;
        used.add(hero.id);
        return (
          <HeroLink key={i} id={hero.id} cross={false}>
            {part}
          </HeroLink>
        );
      })}
    </>
  );
}

export function Stat(props: { label: string; value: ComponentChildren; hint?: string }) {
  return (
    <div class="stat" title={props.hint}>
      <span class="stat-label">{props.label}</span>
      <span class="stat-value">{props.value}</span>
    </div>
  );
}
