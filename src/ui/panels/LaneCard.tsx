// Uma expedição como corredor lateral: o canvas desenha o andar (src/render/lane);
// em DOM, o cabeçalho com o sino, a lista do grupo ao lado e as salas por cima.

import { useEffect, useRef } from 'preact/hooks';
import { commands, floorLabel, partyRooms } from '../../sim/index.ts';
import type { Hero, Party } from '../../sim/index.ts';
import { LaneRenderer } from '../../render/lane/renderer.ts';
import { packUrl } from '../../render/pack.ts';
import { useCommand, useGame } from '../components.tsx';
import { fmt, heroById, liveHp, phaseText, ROOM_LABELS } from '../format.ts';
import { HeroPortrait } from '../PixelSprite.tsx';

function RoomNode(props: { state: 'normal' | 'current' | 'cleared' }) {
  return <span class={`arena-room-node ${props.state}`} style={{ backgroundImage: `url(${packUrl('export/ui/ui-room-node.png')})` }} aria-hidden="true" />;
}

/** Linha da lista do grupo: retrato, nome, vida e ânimo, ou "caiu"/"fugiu". */
function RosterRow(props: { hero: Hero; party: Party }) {
  const { world } = useGame();
  const { hero, party } = props;
  const dead = party.dead.includes(hero.id) || hero.status === 'dead';
  const fled = !dead && !party.memberIds.includes(hero.id);
  const { hp, max } = liveHp(world, hero);
  const hpPct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  return (
    <li class={`lane-hero${dead ? ' dead' : fled ? ' fled' : ''}`} title={`${hero.name} · ${Math.ceil(hp)}/${max} de vida · ânimo ${Math.round(hero.morale)}`}>
      <HeroPortrait hero={hero} />
      <span class="lane-hero-info">
        <b>{hero.name}</b>
        {dead ? (
          <small class="lane-status bad">Caiu</small>
        ) : fled ? (
          <small class="lane-status warn">Fugiu</small>
        ) : (
          <>
            <i class="lane-bar hp"><i style={{ width: `${hpPct}%` }} /></i>
            <i class="lane-bar morale"><i style={{ width: `${Math.max(0, Math.min(100, hero.morale))}%` }} /></i>
          </>
        )}
      </span>
    </li>
  );
}

export function LaneCard(props: { party: Party; selected: boolean }) {
  const { world, session } = useGame();
  const command = useCommand();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const party = props.party;

  useEffect(() => {
    const el = stage.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const renderer = new LaneRenderer(cv, { world: () => session.world, speed: () => session.speed, paused: () => session.paused }, party.id);
    const fit = (): void => {
      const rect = el.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    let raf = 0;
    const loop = (now: number): void => {
      renderer.frame(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.destroy();
    };
  }, [party.id]);

  const rooms = partyRooms(world, party);
  const room = rooms[party.roomIndex];
  const combat = party.combat;
  const bossPhase2 = combat?.units.some((u) => u.side === 'enemy' && u.tags.includes('boss') && u.hp <= u.maxHp * 0.5) ?? false;
  const heroes = party.startMemberIds.map((id) => heroById(world, id)).filter((h): h is Hero => !!h);
  const canRecall = party.phase !== 'voltando' && !party.recallRequested;

  return (
    <section class={`arena-card lane-card${props.selected ? ' selected' : ''}`}>
      <header class="arena-card-head">
        <strong>Ato {party.act + 1} · {floorLabel(party.act, party.floor)}</strong>
        <span>
          {phaseText(world, party)}
          {room ? ` · ${ROOM_LABELS[room.kind]}` : ''}
          {combat?.isBoss ? ' · CHEFE' : ''}
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
        <ul class="lane-roster">
          {heroes.map((h) => <RosterRow key={h.id} hero={h} party={party} />)}
        </ul>
        <div class="lane-view" ref={stage}>
          <canvas ref={canvas} class="lane-canvas" aria-label={`Corredor do ${floorLabel(party.act, party.floor)}`} />
          {rooms.length > 0 && (
            <div class="arena-room-progress lane-rooms">
              {rooms.map((r, i) => (
                <span key={i} class={`arena-room${i === party.roomIndex ? ' current' : ''}${r.cleared ? ' cleared' : ''}`} title={ROOM_LABELS[r.kind]}>
                  <RoomNode state={i === party.roomIndex ? 'current' : r.cleared ? 'cleared' : 'normal'} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
