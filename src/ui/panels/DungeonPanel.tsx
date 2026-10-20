import {
  ACTS,
  commands,
  fleeThreshold,
  floorLabel,
  formatDate,
  isBossFloor,
  MATERIAL_NAMES,
  partyRooms,
} from '../../sim/index.ts';
import type { MaterialId, Party, Unit, World } from '../../sim/index.ts';
import type { ExpeditionSummary } from '../../game/session.ts';
import { Bar, HeroLink, PanelShell, useCommand, useGame } from '../components.tsx';
import { className, fmt, floorName, heroById, liveHp, OUTCOME_LABELS, phaseText, ROOM_LABELS } from '../format.ts';
import { IconSkull, RoomIcon } from '../icons.tsx';

function ActOverview(props: { world: World }) {
  const { world } = props;
  return (
    <div class="acts">
      {world.acts.map((act, a) => {
        if (!act.unlocked) return null;
        const def = ACTS[a]!;
        return (
          <div class="act" key={a}>
            <div class="act-head">
              <strong>
                Ato {a + 1}: {def.name}
              </strong>
              {act.bossDefeated && <span class="tag gold">chefe derrotado</span>}
            </div>
            <div class="floors">
              {act.conquered.map((done, f) => {
                const open = f === 0 || act.conquered[f - 1];
                const map = act.maps[f];
                const cleared = map ? map.filter((r) => r.cleared).length : 0;
                return (
                  <div key={f} class={`floor ${done ? 'done' : open ? 'open' : 'locked'}`} title={floorName(a, f)}>
                    <span>{isBossFloor(f) ? <IconSkull /> : f + 1}</span>
                    <small>{done ? 'conquistado' : open ? (map ? `${cleared}/${map.length} salas` : 'inexplorado') : 'trancado'}</small>
                  </div>
                );
              })}
            </div>
            <label>Corrupção</label>
            <Bar kind="corruption" value={act.corruption} max={100} marker={70} markerTitle="Acima de 70, monstros voltam a salas limpas" text={`${Math.round(act.corruption)}`} slim />
          </div>
        );
      })}
    </div>
  );
}

function Rooms(props: { world: World; party: Party }) {
  const { world, party } = props;
  const rooms = partyRooms(world, party);
  if (rooms.length === 0) return party.phase === 'descendo' ? <p class="sub">O mapa se revela sala a sala.</p> : null;
  return (
    <div class="rooms" aria-label="Salas do andar">
      {rooms.map((room, i) => {
        const current = i === party.roomIndex && party.phase !== 'voltando';
        const known = room.cleared || current || room.kind === 'chefe' || i < party.roomIndex;
        return (
          <span key={i} class={`room${room.cleared ? ' cleared' : ''}${current ? ' current' : ''}${known ? '' : ' fog'}`} title={known ? ROOM_LABELS[room.kind] : 'Desconhecida'}>
            <RoomIcon kind={known ? room.kind : null} />
          </span>
        );
      })}
    </div>
  );
}

function EnemyRow(props: { unit: Unit }) {
  const u = props.unit;
  return (
    <div class={`unit enemy${u.alive ? '' : ' down'}`}>
      <span class={`unit-name${u.elite ? ' elite' : ''}${u.tags.includes('boss') ? ' boss' : ''}`}>{u.name}</span>
      <Bar kind="enemy" value={u.hp} max={u.maxHp} slim />
    </div>
  );
}

function PartyCard(props: { world: World; party: Party }) {
  const { world, party } = props;
  const command = useCommand();
  const doctrine = world.town.doctrine;
  const combat = party.combat;
  const heroes = party.startMemberIds.map((id) => heroById(world, id)).filter((h) => !!h);
  const contract = party.contractId === null ? null : world.town.contracts.find((c) => c.id === party.contractId);
  const solo = party.outcome === 'fuga';
  const canRecall = party.phase !== 'voltando' && !party.recallRequested;
  return (
    <article class={`party${party.phase === 'combate' ? ' fighting' : ''}`}>
      <header>
        <div>
          <strong>{floorLabel(party.act, party.floor)[0]!.toUpperCase() + floorLabel(party.act, party.floor).slice(1)}</strong>
          <p class="sub">
            {phaseText(world, party)}
            {contract ? ` · contrato de ${fmt(contract.reward)}` : ''}
            {combat?.enraged ? ' · fúria!' : ''}
          </p>
        </div>
        {!solo && (
          <button
            class="btn bell"
            disabled={!canRecall}
            onClick={() => command(commands.recall, party.id)}
            title="Chama o grupo de volta. Custa reputação; os vingativos ignoram."
          >
            {party.recallRequested ? 'O sino tocou' : 'Tocar o sino'}
          </button>
        )}
      </header>
      {!solo && <Rooms world={world} party={party} />}
      <div class="combat">
        <div class="side">
          {heroes.map((hero) => {
            const inParty = party.memberIds.includes(hero.id);
            const dead = party.dead.includes(hero.id);
            const { hp, max } = liveHp(world, hero);
            const flee = fleeThreshold(hero, doctrine);
            const unit = combat?.units.find((u) => u.heroId === hero.id);
            const state = dead ? 'tombou' : !inParty ? 'fugiu' : unit?.fled ? 'recuando' : '';
            return (
              <div key={hero.id} class={`unit hero${dead ? ' down' : !inParty ? ' gone' : ''}`}>
                <span class="unit-name">
                  <HeroLink id={hero.id} /> <small>{className(hero)} {hero.rank}</small>
                  {hero.vengeful && <small class="bad"> · vingança</small>}
                  {state && <small class="muted"> · {state}</small>}
                </span>
                {!dead && (
                  <>
                    <Bar kind="hp" value={hp} max={max} slim />
                    <Bar
                      kind="morale"
                      value={hero.morale}
                      max={100}
                      marker={Number.isFinite(flee) ? flee : null}
                      markerTitle={`Foge abaixo de ${Math.round(flee)}`}
                      slim
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        {combat && (
          <div class="side foes">
            {combat.units
              .filter((u) => u.side === 'enemy')
              // Chefe primeiro, depois os vivos; os caídos mais antigos saem da lista.
              .sort((a, b) => Number(b.tags.includes('boss')) - Number(a.tags.includes('boss')) || Number(b.alive) - Number(a.alive) || b.uid - a.uid)
              .slice(0, 8)
              .map((u) => (
                <EnemyRow key={u.uid} unit={u} />
              ))}
          </div>
        )}
      </div>
      {party.moments.length > 0 && (
        <ul class="moments">
          {[...party.moments].reverse().slice(0, 8).map((m, i) => (
            <li key={party.moments.length - i}>{m}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Summary(props: { s: ExpeditionSummary }) {
  const { s } = props;
  const mats = Object.entries(s.materials) as [MaterialId, number][];
  return (
    <details class={`summary outcome-${s.outcome}`}>
      <summary>
        <span class={`tag ${s.outcome === 'conquista' ? 'gold' : s.outcome === 'massacre' ? 'bad' : ''}`}>{OUTCOME_LABELS[s.outcome]}</span> {floorLabel(s.act, s.floor)} ·{' '}
        {fmt(s.gold)} de ouro{s.dead.length > 0 && <span class="bad"> · {s.dead.length} {s.dead.length === 1 ? 'morte' : 'mortes'}</span>}
      </summary>
      <p class="sub">
        {formatDate(s.endedTick)} ·{' '}
        {s.startMemberIds.map((id, i) => (
          <span key={id}>
            {i > 0 && ', '}
            <HeroLink id={id} />
          </span>
        ))}
      </p>
      {mats.length > 0 && <p class="sub">Materiais: {mats.map(([m, q]) => `${q} ${MATERIAL_NAMES[m].toLowerCase()}`).join(', ')}</p>}
      {s.rescued > 0 && <p class="sub">Resgatou {s.rescued} {s.rescued === 1 ? 'prisioneiro' : 'prisioneiros'}.</p>}
      <ul class="moments">
        {s.moments.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
      {s.dead.length > 0 && (
        <p class="bad">
          Tombaram:{' '}
          {s.dead.map((id, i) => (
            <span key={id}>
              {i > 0 && ', '}
              <HeroLink id={id} />
            </span>
          ))}
        </p>
      )}
    </details>
  );
}

export function DungeonPanel() {
  const { world, session } = useGame();
  const parties = [...world.parties].sort((a, b) => a.startedTick - b.startedTick);
  return (
    <PanelShell title="O Abismo" subtitle="Você não comanda o combate: só pode tocar o sino." wide>
      <ActOverview world={world} />
      <h3>Grupos no abismo</h3>
      {parties.length === 0 ? (
        <p class="sub">Ninguém lá embaixo agora. Os heróis montam grupos sozinhos no quadro quando estão descansados.</p>
      ) : (
        parties.map((p) => <PartyCard key={p.id} world={world} party={p} />)
      )}
      {session.recent.length > 0 && (
        <>
          <h3>Expedições recentes</h3>
          {session.recent.map((s) => (
            <Summary key={s.id} s={s} />
          ))}
        </>
      )}
    </PanelShell>
  );
}
