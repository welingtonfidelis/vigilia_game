import {
  abyssPressure,
  BALANCE,
  BIOMES,
  lordOf,
  commands,
  dayOf,
  DIM_RULES,
  fleeLimit,
  floorLabel,
  formatDate,
  isGuardianFloor,
  livingNemeses,
  MATERIAL_NAMES,
  nemesisStep,
  nemesisWhere,
  openPassages,
  partyRooms,
  passageCapacity,
  rulesLabel,
  rumorBoard,
  TICKS_PER_DAY,
} from '../../sim/index.ts';
import type { MaterialId, Party, Passage, Unit, World } from '../../sim/index.ts';
import type { ExpeditionSummary } from '../../game/session.ts';
import { Bar, HeroLink, PanelShell, useCommand, useGame } from '../components.tsx';
import { className, fmt, floorName, heroById, liveHp, OUTCOME_LABELS, phaseText, ROOM_LABELS } from '../format.ts';
import { IconSkull, RoomIcon } from '../icons.tsx';
import { imgSrc } from '../../render/art32.ts';
import { HeroPortrait, MonsterPortrait, monsterBase } from '../PixelSprite.tsx';
import { loadReportHistory } from '../report-history.ts';

/** O abismo: nível, pressão e as passagens que a guilda acompanha. */
function AbyssOverview(props: { world: World }) {
  const { world } = props;
  const { ui } = useGame();
  const abyss = world.abyss;
  const lord = lordOf(abyss.amulet?.level ?? abyss.level);
  const amuletText = !abyss.amulet
    ? `Fragmentos: ${abyss.fragments} de ${BALANCE.fragmentsPerAmulet}`
    : abyss.amulet.inUse
      ? 'O amuleto desceu com o grupo ao covil'
      : world.tick < abyss.amulet.readyTick
        ? 'O joalheiro está montando o amuleto'
        : 'Amuleto pronto: o contrato do Senhor espera um grupo';
  const free = passageCapacity(world) - openPassages(world).length;
  return (
    <div class="acts">
      <div class="act abyss-head">
        <div class="act-head">
          <strong>Nível {abyss.level} do abismo</strong>
          <span class="sub">
            {openPassages(world).length} de {passageCapacity(world)} passagens
          </span>
        </div>
        <p class="sub">
          Senhor do nível: <strong>{lord.name}</strong> · {amuletText}{' '}
          <button class="link" onClick={() => ui.open({ kind: 'amulet' })}>
            Amuleto e contrato
          </button>
        </p>
        <label>Pressão do abismo (a da passagem mais pressionada)</label>
        <Bar
          kind="corruption"
          value={abyssPressure(world)}
          max={100}
          marker={55}
          markerTitle="Acima de 55, uma incursão pode subir à noite"
          text={`${Math.round(abyssPressure(world))}`}
          slim
        />
      </div>
      {abyss.passages.map((p) => (
        <PassageCard key={p.id} world={world} passage={p} />
      ))}
      {free > 0 && <Rumors world={world} />}
    </div>
  );
}

/** Rumores da próxima passagem (M6 F2): o prefeito marca qual delas o próximo grupo abre. */
function Rumors(props: { world: World }) {
  const { world } = props;
  const command = useCommand();
  const board = rumorBoard(world);
  return (
    <div class="act passage unknown rumors">
      <div class="act-head">
        <strong>Rumores da próxima passagem</strong>
      </div>
      <p class="sub">A guilda ouviu falar de três passagens do mesmo tamanho. O próximo grupo que descer abre a marcada.</p>
      <div class="rumor-list">
        {board.list.map((r, i) => {
          const marked = board.marked === i;
          return (
            <button key={r.seed} class={`rumor${marked ? ' marked' : ''}`} aria-pressed={marked} onClick={() => command(commands.markRumor, i)}>
              <strong>{BIOMES[r.biome]!.name}</strong>
              {r.rule && (
                <span class="tag" title={DIM_RULES[r.rule].blurb}>
                  {DIM_RULES[r.rule].name}
                </span>
              )}
              <span>{r.text}</span>
              <em>{marked ? 'Marcada: é a próxima a abrir' : 'Marcar esta'}</em>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Nêmesis (M6 F2): os monstros que levaram heróis e fugiram, e onde foram vistos. */
function Nemeses(props: { world: World }) {
  const { world } = props;
  const command = useCommand();
  const living = livingNemeses(world);
  const fallen = (world.abyss.nemeses ?? []).filter((n) => n.fallen).slice(-3).reverse();
  if (living.length === 0 && fallen.length === 0) return null;
  return (
    <>
      <h3>Nêmesis</h3>
      {living.map((n) => {
        const where = nemesisWhere(world, n);
        const passage = n.passageId === null ? undefined : world.abyss.passages.find((p) => p.id === n.passageId);
        const reachable = !!passage && !passage.sealed && passage.discovered && (n.floor === 0 || passage.conquered[n.floor - 1]);
        const posted = world.town.contracts.some((c) => c.passageId === n.passageId && c.floor === n.floor);
        const reward = passage ? commands.suggestedReward(passage.level, n.floor) : 0;
        return (
          <div key={n.id} class="nemesis">
            <div class="act-head">
              <strong>{n.name}</strong>
              <span class="tag bad">degrau {nemesisStep(n)}</span>
            </div>
            <p class="sub">
              {n.enemyName} que levou{' '}
              {n.victims.map((id, i) => (
                <>
                  {i > 0 && (i === n.victims.length - 1 ? ' e ' : ', ')}
                  <HeroLink key={id} id={id} />
                </>
              ))}
              . {where ? `Vista no ${where}.` : 'Sumiu na névoa: volta numa passagem que ainda vai abrir.'}
            </p>
            {reachable && !posted && (
              <button class="btn small" disabled={world.town.treasury < reward} onClick={() => command(commands.postContract, n.passageId, n.floor, reward)}>
                Postar caçada ({fmt(reward)} de ouro)
              </button>
            )}
            {posted && <p class="sub gold">Há um contrato no quadro para esse andar.</p>}
          </div>
        );
      })}
      {fallen.length > 0 && (
        <p class="sub">
          Caídas:{' '}
          {fallen.map((n, i) => (
            <span key={n.id}>
              {i > 0 && ' · '}
              {n.name} ({formatDate(n.fallen!.day * TICKS_PER_DAY)}
              {n.fallen!.by !== null && (
                <>
                  , por <HeroLink id={n.fallen!.by} />
                </>
              )}
              )
            </span>
          ))}
        </p>
      )}
    </>
  );
}

function PassageCard(props: { world: World; passage: Passage }) {
  const { world, passage } = props;
  if (!passage.discovered) {
    return (
      <div class="act passage unknown">
        <div class="act-head">
          <strong>Passagem desconhecida</strong>
          <span class="tag">nível {passage.level}</span>
        </div>
        <p class="sub">Um grupo desceu para abri-la. O que há do outro lado só se sabe quando ele entrar.</p>
      </div>
    );
  }
  const biome = BIOMES[passage.biome]!;
  const days = passage.closesDay - dayOf(world.tick);
  const remains = world.remains.filter((r) => r.passageId === passage.id).length;
  return (
    <div class={`act passage${passage.sealed ? ' sealed' : ''}`}>
      <div class="act-head">
        <strong>{biome.name}</strong>
        <span class="tag">nível {passage.level}</span>
        {passage.sealed && <span class="tag gold">selada</span>}
      </div>
      <p class="sub rules">
        {passage.rules.length === 0
          ? 'Calmaria'
          : passage.rules.map((r) => (
              <span key={r} class="tag" title={DIM_RULES[r].blurb}>
                {DIM_RULES[r].name}
              </span>
            ))}
      </p>
      <div class="floors">
        {passage.conquered.map((done, f) => {
          const open = f === 0 || passage.conquered[f - 1];
          const map = passage.maps[f];
          const cleared = map ? map.filter((r) => r.cleared).length : 0;
          const prey = livingNemeses(world).find((n) => n.passageId === passage.id && n.floor === f);
          return (
            <div
              key={f}
              class={`floor ${done ? 'done' : open ? 'open' : 'locked'}${prey ? ' nemesis-floor' : ''}`}
              title={prey ? `${floorName(passage, f)} · ${prey.name} foi vista aqui` : floorName(passage, f)}
            >
              <span>{isGuardianFloor(passage, f) ? <IconSkull /> : f + 1}</span>
              <small>{done ? 'conquistado' : open ? (map ? `${cleared}/${map.length} salas` : 'inexplorado') : 'trancado'}</small>
            </div>
          );
        })}
      </div>
      {!passage.sealed && (
        <>
          <label>Pressão</label>
          <Bar
            kind="corruption"
            value={passage.pressure}
            max={100}
            marker={70}
            markerTitle="Acima de 70, monstros voltam a salas limpas desta passagem"
            text={`${Math.round(passage.pressure)}`}
            slim
          />
        </>
      )}
      <p class="sub">
        {passage.sealed ? 'Fecha quando o último grupo voltar' : days > 0 ? `Fecha em ${days} ${days === 1 ? 'dia' : 'dias'}` : 'Fecha quando o último grupo voltar'}
        {remains > 0 ? ` · restos de ${remains} ${remains === 1 ? 'herói' : 'heróis'}` : ''}
      </p>
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
        const known = room.cleared || current || room.kind === 'chefe' || room.kind === 'guardiao' || i < party.roomIndex;
        return (
          <span key={i} class={`room${room.cleared ? ' cleared' : ''}${current ? ' current' : ''}${known ? '' : ' fog'}`} title={known ? ROOM_LABELS[room.kind] : 'Desconhecida'}>
            <RoomIcon kind={known ? room.kind : null} />
          </span>
        );
      })}
    </div>
  );
}

function EnemyRow(props: { unit: Unit; world: World; biome: number }) {
  const u = props.unit;
  const look = monsterBase(props.world, u, props.biome);
  return (
    <div class={`unit enemy${u.alive ? '' : ' down'}`}>
      <span class="unit-art">
        {look.portrait ? (
          <img class="monster-portrait portrait-ghost" {...imgSrc(look.portrait)} width={32} height={36} alt="" aria-hidden="true" />
        ) : (
          <MonsterPortrait asset={look.asset} />
        )}
      </span>
      <div class="unit-info">
        <span class={`unit-name${u.elite ? ' elite' : ''}${u.tags.includes('boss') ? ' boss' : ''}`}>{u.name}</span>
        <Bar kind="enemy" value={u.hp} max={u.maxHp} slim />
      </div>
    </div>
  );
}

function PartyCard(props: { world: World; party: Party }) {
  const { world, party } = props;
  const command = useCommand();
  const { ui } = useGame();
  const combat = party.combat;
  const heroes = party.startMemberIds.map((id) => heroById(world, id)).filter((h) => !!h);
  const contract = party.contractId === null ? null : world.town.contracts.find((c) => c.id === party.contractId);
  const solo = party.outcome === 'fuga';
  const canRecall = party.phase !== 'voltando' && !party.recallRequested;
  return (
    <article class={`party${party.phase === 'combate' ? ' fighting' : ''}`}>
      <header>
        <div>
          <strong>
            {floorLabel(party)[0]!.toUpperCase() + floorLabel(party).slice(1)} <small class="muted">· nível {party.level} · {rulesLabel(party.rules)}</small>
          </strong>
          <p class="sub">
            {phaseText(world, party)}
            {contract ? ` · contrato de ${fmt(contract.reward)}` : ''}
            {combat?.enraged ? ' · fúria!' : ''}
          </p>
        </div>
        <div class="party-actions">
          <button class="btn small" onClick={() => ui.open({ kind: 'battle', partyId: party.id })}>
            Acompanhar
          </button>
          {!solo && (
            <button
              class="btn small bell"
              disabled={!canRecall}
              onClick={() => command(commands.recall, party.id)}
              title="Chama o grupo de volta. Custa reputação; os vingativos ignoram."
            >
              {party.recallRequested ? 'O sino tocou' : 'Tocar o sino'}
            </button>
          )}
        </div>
      </header>
      {!solo && <Rooms world={world} party={party} />}
      <div class="combat">
        <div class="side">
          {heroes.map((hero) => {
            const inParty = party.memberIds.includes(hero.id);
            const dead = party.dead.includes(hero.id);
            const { hp, max } = liveHp(world, hero);
            const flee = fleeLimit(world, hero);
            const unit = combat?.units.find((u) => u.heroId === hero.id);
            const state = dead ? 'tombou' : !inParty ? 'fugiu' : unit?.fled ? 'recuando' : '';
            return (
              <div key={hero.id} class={`unit hero${dead ? ' down' : !inParty ? ' gone' : ''}`}>
                <span class="unit-art">
                  <HeroPortrait hero={hero} animate={!dead} />
                </span>
                <div class="unit-info">
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
                <EnemyRow key={u.uid} unit={u} world={world} biome={party.biome} />
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
        <span class={`tag ${s.outcome === 'conquista' ? 'gold' : s.outcome === 'massacre' ? 'bad' : ''}`}>{OUTCOME_LABELS[s.outcome]}</span> {floorLabel(s)} ·{' '}
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
  const { world, session, ui } = useGame();
  const parties = [...world.parties].sort((a, b) => a.startedTick - b.startedTick);
  const reports = loadReportHistory();
  return (
    <PanelShell title="O Abismo" subtitle="Você não comanda o combate: só pode tocar o sino." wide>
      {reports.length > 0 && (
        <p class="sub">
          <button class="btn small" onClick={() => ui.open({ kind: 'battle', partyId: 0 })}>Relatórios recentes ({reports.length})</button>
        </p>
      )}
      <AbyssOverview world={world} />
      <Nemeses world={world} />
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
