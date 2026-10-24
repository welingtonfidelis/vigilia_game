// Torneio da estação (M6 F4): a chave por rodada e os duelos revistos golpe a golpe, no compasso
// em que aconteceram. Os golpes vêm guardados do mundo (src/sim/tournament.ts).

import { useEffect, useRef, useState } from 'preact/hooks';
import { TICKS_PER_SECOND } from '../../sim/index.ts';
import type { Duel, Hero, Room, Unit, World } from '../../sim/index.ts';
import { playHighlight, type Highlight } from '../../render/lane/replay.ts';
import { packAsset } from '../../render/pack.ts';
import { HeroLink, PanelShell, useGame } from '../components.tsx';
import { fmt, heroById } from '../format.ts';
import { HeroPortrait } from '../PixelSprite.tsx';

const ROUND_NAMES: Record<number, string> = { 1: 'Primeira rodada', 2: 'Semifinal', 3: 'Final' };

function roundName(round: number, rounds: number): string {
  if (round === rounds) return 'Final';
  if (round === rounds - 1) return 'Semifinal';
  return ROUND_NAMES[round] ?? `Rodada ${round}`;
}

/** Vida de cada lado depois dos golpes até o tick `t`. */
function lifeAt(d: Duel, t: number): { a: number; b: number; last: Duel['events'][number] | undefined } {
  let a = d.maxA;
  let b = d.maxB;
  let last: Duel['events'][number] | undefined;
  for (const e of d.events) {
    if (e.t > t) break;
    if (e.to === 1) a -= e.amount;
    else b -= e.amount;
    last = e;
  }
  return { a: Math.max(0, a), b: Math.max(0, b), last };
}

function Fighter(props: { hero: Hero | undefined; hp: number; max: number; side: 'a' | 'b'; won: boolean | null; hit: boolean }) {
  const { hero, hp, max } = props;
  if (!hero) return <div class="duel-fighter" />;
  return (
    <div class={`duel-fighter ${props.side}${props.won === true ? ' won' : props.won === false ? ' lost' : ''}${props.hit ? ' hit' : ''}`}>
      <HeroPortrait hero={hero} variant="detail" />
      <strong>
        <HeroLink id={hero.id} />
      </strong>
      <span class="duel-bar">
        <i style={{ width: `${Math.max(0, Math.min(1, hp / max)) * 100}%` }} />
        <em>
          {fmt(Math.ceil(hp))}/{fmt(max)}
        </em>
      </span>
    </div>
  );
}

/**
 * O duelo como um melhor momento (M6 F6): os dois heróis frente a frente no corredor do campo de
 * treino (a arena XI; sem a arte, o corredor das Catacumbas), com os golpes guardados.
 */
function duelHighlight(world: World, d: Duel): Highlight | null {
  const a = heroById(world, d.a);
  const b = heroById(world, d.b);
  if (!a || !b) return null;
  const unit = (h: Hero, uid: number, side: 'hero' | 'enemy', max: number): Unit =>
    ({ uid, side, heroId: h.id, name: h.name, maxHp: max, hp: max, atk: 0, def: 0, interval: 10, cd: 0, pierce: 0, crit: 0, role: null, tags: side === 'enemy' ? ['duelo'] : [], affixes: [], elite: false, alive: true, fled: false, gold: 0, xp: 0, material: null }) as unknown as Unit;
  return {
    title: `${a.name} × ${b.name}`,
    score: 0,
    party: { passageId: -1, level: 1, biome: packAsset('corridor/XI/wall-a') ? 10 : 0, rules: [], floor: 0, lord: undefined, roomIndex: 0, startMemberIds: [a.id] },
    rooms: [{ kind: 'matilha', cleared: false, remainsOf: null } as Room],
    heroes: [structuredClone(a), structuredClone(b)],
    units: [unit(a, 1, 'hero', d.maxA), unit(b, 2, 'enemy', d.maxB)],
    start: 0,
    events: d.events,
    complete: true,
  };
}

function DuelLane(props: { duel: Duel }) {
  const { world } = useGame();
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const h = duelHighlight(world, props.duel);
    if (!h || !canvas.current) return;
    return playHighlight(h, canvas.current, () => {});
  }, [props.duel]);
  return (
    <div class="lane-view duel-stage">
      <canvas ref={canvas} class="lane-canvas" aria-label="Duelo no campo de treino" />
    </div>
  );
}

function DuelPlayer(props: { duel: Duel; onDone: () => void }) {
  const { world } = useGame();
  const d = props.duel;
  const end = (d.events.at(-1)?.t ?? 0) + TICKS_PER_SECOND;
  const [t, setT] = useState(0);
  useEffect(() => {
    setT(0);
    const timer = window.setInterval(() => setT((x) => x + 1), 1000 / TICKS_PER_SECOND);
    return () => window.clearInterval(timer);
  }, [d]);
  useEffect(() => {
    if (t < end + 15) return;
    props.onDone();
  }, [t >= end + 15]);
  const life = lifeAt(d, t);
  const over = t >= end;
  const a = heroById(world, d.a);
  const b = heroById(world, d.b);
  const hitA = life.last?.to === 1 && t - life.last.t < 3;
  const hitB = life.last?.to === 2 && t - life.last.t < 3;
  const who = (uid: number) => (uid === 1 ? a : b)?.name ?? '';
  return (
    <div class="duel">
      <Fighter hero={a} hp={life.a} max={d.maxA} side="a" won={over ? d.winner === d.a : null} hit={hitA} />
      <div class="duel-mid">
        <span class="duel-vs">×</span>
        <small>
          {over
            ? `${heroById(world, d.winner)?.name ?? ''} vence`
            : life.last
              ? `${who(life.last.from)} acerta ${fmt(Math.round(life.last.amount))}${life.last.crit ? ' (crítico)' : ''}`
              : 'Os dois se encaram…'}
        </small>
      </div>
      <Fighter hero={b} hp={life.b} max={d.maxB} side="b" won={over ? d.winner === d.b : null} hit={hitB} />
    </div>
  );
}

export function TournamentPanel() {
  const { world } = useGame();
  const t = world.town.tournament;
  const [index, setIndex] = useState(0);
  const [skip, setSkip] = useState(false);
  if (!t) {
    return (
      <PanelShell title="Torneio da estação" subtitle="No último dia de cada estação, com o campo de treino de pé.">
        <p class="sub">Ainda não houve torneio nesta campanha.</p>
      </PanelShell>
    );
  }
  const rounds = t.duels.length ? Math.max(...t.duels.map((d) => d.round)) : Math.log2(t.entrants.length);
  const current = t.duels[index];
  const champion = heroById(world, t.championId ?? -1);
  return (
    <PanelShell title="Torneio da estação" subtitle="Herói contra herói no campo de treino, até um cair a 20% da vida. Ninguém se fere." wide>
      {t.duels.length === 0 ? (
        <p class="sub">As lutas começam às 16h. Até lá, o palpite fica nas Audiências.</p>
      ) : skip || !current ? (
        <p class="tournament-champion">
          {champion ? (
            <>
              <HeroLink id={champion.id} /> {champion.gender === 'f' ? 'é a campeã' : 'é o campeão'} desta estação.
            </>
          ) : null}
          {t.favorite !== null && <small>{t.favorite === t.championId ? 'O palpite do prefeito acertou.' : 'O palpite do prefeito errou.'}</small>}
        </p>
      ) : (
        <>
          <p class="sub">
            {roundName(current.round, rounds)} · duelo {index + 1} de {t.duels.length}
          </p>
          <DuelLane duel={current} />
          <DuelPlayer duel={current} onDone={() => setIndex((i) => i + 1)} />
          <div class="report-actions">
            <button class="btn small" onClick={() => setIndex((i) => i + 1)}>
              Próximo duelo
            </button>
            <button class="btn small" onClick={() => setSkip(true)}>
              Ver o resultado
            </button>
          </div>
        </>
      )}
      <h3>Chave</h3>
      <div class="bracket">
        {Array.from({ length: rounds }, (_, r) => r + 1).map((round) => {
          const duels = t.duels.filter((d) => d.round === round);
          return (
            <div key={round} class="bracket-round">
              <small>{roundName(round, rounds)}</small>
              {round === 1 && duels.length === 0
                ? Array.from({ length: t.entrants.length / 2 }, (_, i) => (
                    <div key={i} class="bracket-duel">
                      <span>{heroById(world, t.entrants[i * 2]!)?.name}</span>
                      <span>{heroById(world, t.entrants[i * 2 + 1]!)?.name}</span>
                    </div>
                  ))
                : duels.map((d, i) => {
                    const seen = (x: Duel | undefined) => skip || (!!x && t.duels.indexOf(x) < index);
                    const shown = seen(d);
                    // Quem chega a esta rodada só aparece depois de assistido o duelo de onde veio.
                    const prev = t.duels.filter((x) => x.round === round - 1);
                    const knownA = round === 1 || seen(prev[i * 2]);
                    const knownB = round === 1 || seen(prev[i * 2 + 1]);
                    return (
                      <div key={i} class="bracket-duel">
                        <span class={shown && d.winner === d.a ? 'win' : ''}>{knownA ? heroById(world, d.a)?.name : '?'}</span>
                        <span class={shown && d.winner === d.b ? 'win' : ''}>{knownB ? heroById(world, d.b)?.name : '?'}</span>
                      </div>
                    );
                  })}
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
}
