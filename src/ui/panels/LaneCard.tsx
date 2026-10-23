// Uma expedição como corredor lateral: o canvas desenha o andar (src/render/lane, que
// roda em segundo plano para cada grupo); em DOM, o cabeçalho com o sino, o quadro do
// grupo por cima do corredor (embaixo no celular), as salas e o aviso de volta à vila.

import { useEffect, useRef } from 'preact/hooks';
import { BIOMES, commands, fleeLimit, floorLabel, isGuardianFloor, maxLevel, partyRooms, passageOf, rulesLabel, xpToNext } from '../../sim/index.ts';
import type { Hero, Party } from '../../sim/index.ts';
import { lanes } from '../../render/lane/lanes.ts';
import { hiUrl } from '../../render/art32.ts';
import { packUrl } from '../../render/pack.ts';
import { useCommand, useGame } from '../components.tsx';
import { fmt, heroById, liveHp, OUTCOME_LABELS, phaseText, ROOM_LABELS } from '../format.ts';
import { HeroPortrait } from '../PixelSprite.tsx';

function RoomNode(props: { state: 'normal' | 'current' | 'cleared' }) {
  return <span class={`arena-room-node ${props.state}`} style={{ backgroundImage: `url(${hiUrl(packUrl('export/ui/ui-room-node.png'))})` }} aria-hidden="true" />;
}

const pct = (v: number): string => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;

/**
 * Quadro de um herói: retrato, nome e nível, vida com números e experiência. A barra de
 * experiência mostra o que ele já tinha e, mais clara, a parte do saque desta expedição
 * (que só entra ao voltar para a vila).
 */
function PartyFrame(props: { hero: Hero; party: Party }) {
  const { world } = useGame();
  const { hero, party } = props;
  const dead = party.dead.includes(hero.id) || hero.status === 'dead';
  const fled = !dead && !party.memberIds.includes(hero.id);
  const { hp, max } = liveHp(world, hero);
  const capped = hero.level >= maxLevel(world, hero);
  const need = xpToNext(hero.level);
  const share = party.loot.xp / Math.max(1, party.memberIds.length);
  const before = capped ? 1 : hero.xp / need;
  const after = capped ? 1 : (hero.xp + share) / need;
  const low = hp / Math.max(1, max) < 0.3;
  const shaken = !dead && !fled && hero.morale <= fleeLimit(world, hero) + 10;
  const levelUp = !capped && after >= 1;
  return (
    <li
      class={`party-frame${dead ? ' dead' : fled ? ' fled' : ''}`}
      title={`${hero.name} · nível ${hero.level} · ${fmt(Math.ceil(hp))}/${fmt(max)} de vida · ${capped ? 'nível máximo' : `${fmt(hero.xp)}+${fmt(share)} de ${fmt(need)} XP`} · ânimo ${Math.round(hero.morale)}`}
    >
      <HeroPortrait hero={hero} />
      <span class="pf-info">
        <span class="pf-name">
          <b>{hero.name}</b>
          <small class={levelUp ? 'up' : ''}>Nv {hero.level}{levelUp ? ' ↑' : ''}</small>
        </span>
        {dead ? (
          <small class="pf-status bad">Caiu</small>
        ) : fled ? (
          <small class="pf-status warn">Fugiu</small>
        ) : (
          <>
            <span class={`pf-bar hp${low ? ' low' : ''}`} aria-label={`Vida ${fmt(Math.ceil(hp))} de ${fmt(max)}`}>
              <i style={{ width: pct(hp / Math.max(1, max)) }} />
              <em>{fmt(Math.ceil(hp))}/{fmt(max)}</em>
            </span>
            <span class="pf-bar xp" aria-label="Experiência">
              <i class="gain" style={{ width: pct(after) }} />
              <i style={{ width: pct(before) }} />
            </span>
            {shaken && <small class="pf-status warn">Abalado</small>}
          </>
        )}
      </span>
    </li>
  );
}

export function LaneCard(props: { party: Party; selected: boolean }) {
  const { world } = useGame();
  const command = useCommand();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const party = props.party;

  useEffect(() => {
    const el = stage.current;
    const cv = canvas.current;
    const lane = lanes.lane(party.id);
    if (!el || !cv || !lane) return;
    lane.attach(cv);
    const fit = (): void => {
      const rect = el.getBoundingClientRect();
      lane.resize(rect.width, rect.height);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => {
      observer.disconnect();
      lane.detach(cv);
    };
  }, [party.id]);

  const rooms = partyRooms(world, party);
  const room = rooms[party.roomIndex];
  const combat = party.combat;
  const bossPhase2 = combat?.units.some((u) => u.side === 'enemy' && u.tags.includes('boss') && u.hp <= u.maxHp * 0.5) ?? false;
  const heroes = party.startMemberIds.map((id) => heroById(world, id)).filter((h): h is Hero => !!h);
  const canRecall = party.phase !== 'voltando' && !party.recallRequested;
  const returning = party.phase === 'voltando';
  const passage = passageOf(world, party.passageId);
  const floors = passage?.floors ?? party.floor + 1;

  return (
    <section class={`arena-card lane-card${props.selected ? ' selected' : ''}`}>
      <header class="arena-card-head">
        <strong title={`Esta passagem tem ${floors} andares; o guardião fica no último e, vencido, sela a passagem. Um andar só abre depois que o de cima for conquistado. Regras: ${rulesLabel(party.rules)}.`}>
          {party.lord ? (
            <>Nível {party.level} · {floorLabel(party)}</>
          ) : (
            <>
              Nível {party.level} · andar {party.floor + 1} de {floors} {BIOMES[party.biome]!.of}
              {passage && !isGuardianFloor(passage, party.floor) && <small class="lane-boss-hint"> · guardião no andar {floors}</small>}
            </>
          )}
        </strong>
        <span>
          {phaseText(world, party)}
          {room && !returning ? ` · ${ROOM_LABELS[room.kind]}` : ''}
          {combat?.isBoss ? (combat.bossMech ? ' · SENHOR' : ' · GUARDIÃO') : ''}
          {bossPhase2 ? ' · FASE 2' : ''}
        </span>
        <span class="arena-card-loot">{fmt(party.loot.gold)} ouro · {fmt(party.loot.xp)} XP</span>
        <button
          class="btn bell arena-bell"
          disabled={!canRecall}
          onClick={() => command(commands.recall, party.id)}
          title="Chama este grupo de volta. Custa 1 de reputação; os vingativos ignoram."
        >
          {party.recallRequested ? 'Sino tocado' : 'Tocar o sino'}
        </button>
      </header>
      <div class="lane-stage">
        <div class="lane-view" ref={stage}>
          <canvas ref={canvas} class="lane-canvas" aria-label={`Corredor do ${floorLabel(party)}`} />
          {rooms.length > 0 && (
            <div class="arena-room-progress lane-rooms">
              {rooms.map((r, i) => (
                <span
                  key={i}
                  class={`arena-room${i === party.roomIndex ? ' current' : ''}${r.cleared ? ' cleared' : ''}`}
                  title={`Sala ${i + 1} de ${rooms.length} deste andar · ${ROOM_LABELS[r.kind]}`}
                >
                  <RoomNode state={i === party.roomIndex ? 'current' : r.cleared ? 'cleared' : 'normal'} />
                </span>
              ))}
            </div>
          )}
          {returning && (
            <div class="lane-exit" role="status">
              <strong>{party.outcome ? OUTCOME_LABELS[party.outcome] : 'Volta'}</strong>
              <span>{phaseText(world, party)}</span>
              <span>
                {fmt(party.loot.gold)} ouro · {fmt(party.loot.xp)} XP
              </span>
            </div>
          )}
        </div>
        <ul class="lane-party">
          {heroes.map((h) => (
            <PartyFrame key={h.id} hero={h} party={party} />
          ))}
        </ul>
      </div>
    </section>
  );
}
