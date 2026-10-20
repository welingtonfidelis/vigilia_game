// Visualizador de dungeon do M4: várias expedições empilhadas e relatório ao fim.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import { commands, floorLabel, formatDate, MATERIAL_NAMES, TICKS_PER_DAY } from '../../sim/index.ts';
import type { Hero, MaterialId, Party, Unit } from '../../sim/index.ts';
import { packAsset, packUrl } from '../../render/pack.ts';
import { fmt, heroById, liveHp, phaseText, ROOM_LABELS } from '../format.ts';
import { HeroPortrait, HERO_CROP, monsterBase, PixelSprite } from '../PixelSprite.tsx';
import { useCommand, useGame } from '../components.tsx';
import { addReportToHistory, clearReportHistory, loadReportHistory } from '../report-history.ts';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
const OUTCOMES: Record<string, string> = {
  conquista: 'Conquista',
  retirada: 'Retirada',
  chamado: 'Chamado pelo sino',
  massacre: 'Massacre',
  cansaco: 'Exaustão',
  fuga: 'Fuga',
};

interface FloatItem {
  id: number;
  kind: 'damage' | 'gold';
  amount: number;
  unitUid?: number;
}

interface PropSpot { id: string; x: number; y: number; }

const ACT_PROPS: Record<string, PropSpot[]> = {
  I: [
    { id: 'prop/arena/I/urn', x: 20, y: 158 },
    { id: 'prop/arena/I/candle', x: 35, y: 150 },
    { id: 'prop/arena/I/skull-pile', x: 294, y: 158 },
    { id: 'prop/arena/I/web', x: 40, y: 34 },
  ],
  II: [
    { id: 'prop/arena/II/beam', x: 22, y: 150 },
    { id: 'prop/arena/II/rail', x: 58, y: 170 },
    { id: 'prop/arena/II/drowned-lantern', x: 296, y: 150 },
    { id: 'prop/arena/II/pipe', x: 286, y: 170 },
  ],
  III: [
    { id: 'prop/arena/III/giant-mushroom', x: 22, y: 160 },
    { id: 'prop/arena/III/glowing-pool', x: 278, y: 172 },
    { id: 'prop/arena/III/spore-pod', x: 298, y: 152 },
    { id: 'prop/arena/III/root', x: 42, y: 170 },
  ],
  IV: [
    { id: 'prop/arena/IV/statue', x: 20, y: 160 },
    { id: 'prop/arena/IV/coral', x: 296, y: 170 },
    { id: 'prop/arena/IV/pearl', x: 55, y: 152 },
    { id: 'prop/arena/IV/broken-window', x: 286, y: 142 },
  ],
  V: [
    { id: 'prop/arena/V/anvil', x: 24, y: 170 },
    { id: 'prop/arena/V/lava-crack', x: 278, y: 176 },
    { id: 'prop/arena/V/heavy-chain', x: 298, y: 140 },
    { id: 'prop/arena/V/slag', x: 52, y: 152 },
  ],
  VI: [
    { id: 'prop/arena/VI/vein', x: 20, y: 150 },
    { id: 'prop/arena/VI/eye', x: 300, y: 150 },
    { id: 'prop/arena/VI/floating-shard', x: 48, y: 140 },
    { id: 'prop/arena/VI/bone-pedestal', x: 278, y: 170 },
  ],
};

interface PartySnapshot {
  act: number;
  floor: number;
  startMemberIds: number[];
  memberIds: number[];
  dead: number[];
  loot: { gold: number; materials: Partial<Record<MaterialId, number>>; xp: number };
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

function useArenaScale(): { ref: RefObject<HTMLDivElement>; scale: number } {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = (): void => {
      const rect = el.getBoundingClientRect();
      setScale(Math.max(0.45, Math.min(4.25, (rect.width - 8) / 320, (rect.height - 8) / 192)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}

function ArenaSprite(props: { assetId: string; anim: 'idle' | 'run' | 'attack' | 'hit' | 'death' }) {
  const asset = packAsset(props.assetId);
  if (!asset) return null;
  const frames = asset.animations?.[props.anim]?.frames ?? asset.animations?.idle?.frames ?? [0];
  const fps = asset.animations?.[props.anim]?.fps ?? 6;
  const [w, h] = asset.frameSize ?? asset.size ?? [16, 16];
  const columns = asset.columns ?? Math.max(...frames) + 1;
  const from = frames[0] ?? 0;
  const to = (frames[frames.length - 1] ?? from) + 1;
  const style: Record<string, string> = {
    width: `${w}px`,
    height: `${h}px`,
    backgroundImage: `url(${packUrl(asset.file)})`,
    backgroundSize: `${w * columns}px ${h}px`,
    backgroundPosition: `${-from * w}px 0`,
    '--sprite-from': `${-from * w}px`,
    '--sprite-to': `${-to * w}px`,
    '--sprite-steps': String(frames.length),
    '--sprite-duration': `${frames.length / fps}s`,
  };
  return <span key={`${props.assetId}:${props.anim}:${from}:${to}`} class={`arena-sprite ${props.anim}`} style={style} aria-hidden="true" />;
}

function ArenaProp(props: { id: string; x: number; y: number }) {
  const asset = packAsset(props.id);
  if (!asset) return null;
  const [w, h] = asset.size ?? [16, 16];
  const animated = asset.animations?.loop;
  if (animated) {
    const frames = animated.frames;
    const cols = asset.columns ?? frames.length;
    const style: Record<string, string> = {
      left: `${props.x - w / 2}px`,
      top: `${props.y - h}px`,
      width: `${w}px`,
      height: `${h}px`,
      backgroundImage: `url(${packUrl(asset.file)})`,
      backgroundSize: `${w * cols}px ${h}px`,
      '--prop-to': `${-w * frames.length}px`,
    };
    return <span class="arena-prop animated" style={style} aria-hidden="true" />;
  }
  return <img class="arena-prop" src={packUrl(asset.file)} style={{ left: `${props.x - w / 2}px`, top: `${props.y - h}px`, width: `${w}px`, height: `${h}px` }} alt="" aria-hidden="true" />;
}

function ArenaFx(props: { assetId: string }) {
  const asset = packAsset(props.assetId);
  if (!asset) return null;
  const frames = asset.animations?.play?.frames ?? [0];
  const fps = asset.animations?.play?.fps ?? 14;
  const [w, h] = asset.frameSize ?? asset.size ?? [64, 64];
  const columns = asset.columns ?? frames.length;
  const from = frames[0] ?? 0;
  const to = (frames[frames.length - 1] ?? from) + 1;
  const style: Record<string, string> = {
    width: `${w}px`,
    height: `${h}px`,
    backgroundImage: `url(${packUrl(asset.file)})`,
    backgroundSize: `${w * columns}px ${h}px`,
    backgroundPosition: `${-from * w}px 0`,
    '--sprite-from': `${-from * w}px`,
    '--sprite-to': `${-to * w}px`,
    '--sprite-steps': String(frames.length),
    '--sprite-duration': `${frames.length / fps}s`,
  };
  return <span key={props.assetId} class="arena-fx" style={style} aria-hidden="true" />;
}

function HpBar(props: { hp: number; max: number }) {
  const pct = props.max > 0 ? Math.max(0, Math.min(100, (props.hp / props.max) * 100)) : 0;
  return (
    <span class="arena-hp" title={`${Math.ceil(props.hp)} / ${props.max}`} style={{ backgroundImage: `url(${packUrl('export/ui/ui-hp-frame.png')})` }}>
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}

function RoomNode(props: { state: 'normal' | 'current' | 'cleared' }) {
  return <span class={`arena-room-node ${props.state}`} style={{ backgroundImage: `url(${packUrl('export/ui/ui-room-node.png')})` }} aria-hidden="true" />;
}

function damageAnim(dead: boolean, hit: boolean, attacking: boolean, moving = false): 'idle' | 'run' | 'attack' | 'hit' | 'death' {
  if (dead) return 'death';
  if (hit) return 'hit';
  if (attacking) return 'attack';
  if (moving) return 'run';
  return 'idle';
}

function HeroUnit(props: { world: ReturnType<typeof useGame>['world']; hero: Hero; unit: Unit | null; x: number; y: number; floats: FloatItem[]; attacking: boolean; fxAsset: string | null; moving: boolean }) {
  const { world, hero, unit, x, y, floats, attacking, fxAsset, moving } = props;
  const live = liveHp(world, hero);
  const hp = unit ? Math.max(0, unit.hp) : live.hp;
  const max = unit ? unit.maxHp : live.max;
  const hits = floats.filter((f) => unit && f.unitUid === unit.uid);
  const dead = unit ? !unit.alive : hero.status === 'dead';
  const anim = damageAnim(dead, hits.length > 0, attacking, moving);
  return (
    <div class={`arena-unit hero${dead ? ' down' : ''}`} style={{ left: `${x}px`, bottom: `${192 - y}px` }}>
      <ArenaSprite assetId={`char/hero/${hero.classId}/${hero.gender}`} anim={anim} />
      {hits.length > 0 && fxAsset && <ArenaFx assetId={fxAsset} />}
      <span class="arena-unit-floats">{hits.map((f) => <b key={f.id}>−{f.amount}</b>)}</span>
      <span class="arena-name" title={hero.name}>{hero.name}</span>
      <HpBar hp={hp} max={max} />
    </div>
  );
}

function EnemyUnit(props: { world: ReturnType<typeof useGame>['world']; party: Party; unit: Unit; x: number; y: number; floats: FloatItem[]; attacking: boolean; fxAsset: string | null }) {
  const { world, party, unit, x, y, floats, attacking, fxAsset } = props;
  const look = monsterBase(world, unit, party.act);
  const boss = unit.tags.includes('boss');
  let assetId = look.asset;
  if (assetId) {
    const core = `${assetId}-core`;
    const deep = `${assetId}-deep`;
    if (boss) {
      const phase2 = `${assetId}-phase2`;
      if (unit.hp <= unit.maxHp * 0.5 && packAsset(phase2)) assetId = phase2;
    } else if (party.floor >= 2 && packAsset(core)) {
      assetId = core;
    } else if (party.floor >= 1 && packAsset(deep)) {
      assetId = deep;
    }
  }
  const hits = floats.filter((f) => f.unitUid === unit.uid);
  const anim = damageAnim(!unit.alive, hits.length > 0, attacking);
  return (
    <div class={`arena-unit enemy${unit.alive ? '' : ' down'}${boss ? ' boss' : ''}${unit.elite ? ' elite' : ''}`} style={{ left: `${x}px`, bottom: `${192 - y}px` }}>
      {assetId ? <ArenaSprite assetId={assetId} anim={anim} /> : <PixelSprite base={look.base ?? 'skelet'} scale={1} crop={look.ghost ? HERO_CROP : 0} ghost={look.ghost} animate={unit.alive} />}
      {hits.length > 0 && fxAsset && <ArenaFx assetId={fxAsset} />}
      <span class="arena-unit-floats">{hits.map((f) => <b key={f.id}>−{f.amount}</b>)}</span>
      <span class="arena-name" title={unit.name}>{unit.name}</span>
      <HpBar hp={unit.hp} max={unit.maxHp} />
    </div>
  );
}

function ArenaCard(props: { party: Party; selected: boolean }) {
  const { world, session } = useGame();
  const command = useCommand();
  const { ref, scale } = useArenaScale();
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [attacking, setAttacking] = useState<'hero' | 'enemy' | null>(null);
  const [fxAsset, setFxAsset] = useState<string | null>(null);
  const prevHp = useRef(new Map<number, number>());
  const prevGold = useRef(0);
  const goldInit = useRef(false);
  const prevRoom = useRef(0);
  const nextFloat = useRef(1);
  const timers = useRef<number[]>([]);
  const party = props.party;

  const addFloats = (items: FloatItem[]): void => {
    if (items.length === 0) return;
    setFloats((old) => [...old, ...items].slice(-20));
    const ids = new Set(items.map((i) => i.id));
    const timer = window.setTimeout(() => setFloats((old) => old.filter((f) => !ids.has(f.id))), 1000);
    timers.current.push(timer);
  };

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    if (!goldInit.current) {
      prevGold.current = party.loot.gold;
      goldInit.current = true;
    }
    const items: FloatItem[] = [];
    for (const unit of party.combat?.units ?? []) {
      const old = prevHp.current.get(unit.uid);
      if (old !== undefined && unit.hp < old) {
        items.push({ id: nextFloat.current++, kind: 'damage', amount: Math.max(1, Math.round(old - unit.hp)), unitUid: unit.uid });
      }
      prevHp.current.set(unit.uid, unit.hp);
    }
    if (items.some((i) => i.unitUid !== undefined)) {
      const damagedHero = (party.combat?.units ?? []).some((u) => u.side === 'hero' && items.some((i) => i.unitUid === u.uid));
      const damagedEnemy = (party.combat?.units ?? []).some((u) => u.side === 'enemy' && items.some((i) => i.unitUid === u.uid));
      if (damagedEnemy || damagedHero) {
        setAttacking(damagedEnemy ? 'hero' : 'enemy');
        const roman = ROMAN[party.act] ?? 'I';
        setFxAsset(`fx/${roman}/${damagedEnemy ? 'slash' : 'impact'}`);
        const timer = window.setTimeout(() => { setAttacking(null); setFxAsset(null); }, 420);
        timers.current.push(timer);
      }
    }
    if (party.loot.gold > prevGold.current) {
      items.push({ id: nextFloat.current++, kind: 'gold', amount: Math.round(party.loot.gold - prevGold.current) });
      prevGold.current = party.loot.gold;
    }
    if (party.roomIndex > prevRoom.current) {
      prevRoom.current = party.roomIndex;
      setBanner('Sala limpa · o grupo avança');
      const timer = window.setTimeout(() => setBanner(null), 1600);
      timers.current.push(timer);
    }
    addFloats(items);
  }, [session.rev]);

  const combat = party.combat;
  const heroIds = combat ? combat.units.filter((u) => u.side === 'hero' && u.heroId !== null).map((u) => u.heroId!) : party.startMemberIds;
  const heroes = [...new Set(heroIds)].map((id) => heroById(world, id)).filter((h): h is Hero => !!h);
  const enemies = combat?.units.filter((u) => u.side === 'enemy') ?? [];
  const unitsByHero = new Map<number, Unit>();
  for (const u of combat?.units ?? []) if (u.heroId !== null) unitsByHero.set(u.heroId, u);
  const room = party.rooms[party.roomIndex];
  const roman = ROMAN[party.act] ?? 'I';
  const floorIndex = Math.max(0, Math.min(3, party.floor));
  const back = packAsset(`arena/${roman}/back-${floorIndex + 1}`) ?? packAsset(`arena/${roman}/back`);
  const floor = packAsset(`arena/${roman}/floor`);
  const fore = packAsset(`arena/${roman}/fore`);
  const bossGate = packAsset(`prop/arena/${roman}/boss-gate`);
  const ritual = packAsset('decal/arena/ritual-circle');
  const bossBanner = packAsset('ui/boss-banner');
  const heroX = [36, 62, 88, 114, 140];
  const enemyX = [292, 262, 232, 202, 172];
  const fighting = party.phase === 'combate' && !!combat;
  const bossPhase2 = enemies.some((u) => u.tags.includes('boss') && u.hp <= u.maxHp * 0.5);
  const moving = !fighting && enemies.length === 0;
  const backwards = party.phase === 'voltando';
  const canRecall = party.phase !== 'voltando' && !party.recallRequested;

  return (
    <section class={`arena-card${props.selected ? ' selected' : ''}`}>
      <header class="arena-card-head">
        <strong>Ato {party.act + 1} · {floorLabel(party.act, party.floor)}</strong>
        <span>{phaseText(world, party)}{party.rooms.length > 0 ? ` · sala ${Math.min(party.roomIndex + 1, party.rooms.length)}/${party.rooms.length}` : ''}{room ? ` · ${ROOM_LABELS[room.kind]}` : ''}{combat?.isBoss ? ' · CHEFE' : ''}{bossPhase2 ? ' · FASE 2' : ''}</span>
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
      <div class={`arena-card-stage${moving ? ' walking' : ''}${backwards ? ' backward' : ''}`} ref={ref}>
        <div class="arena-shell" style={{ width: '320px', height: '192px', transform: `scale(${scale})` }}>
          {back && <img class="arena-back" src={packUrl(back.file)} width={320} height={192} alt="" />}
          {floor && <div class="arena-floor" style={{ backgroundImage: `url(${packUrl(floor.file)})` }} aria-hidden="true" />}
          {ritual && floorIndex === 3 && <img class="arena-ritual" src={packUrl(ritual.file)} width={160} height={16} alt="" />}
          {ACT_PROPS[roman]?.map((p) => <ArenaProp key={p.id} id={p.id} x={p.x} y={p.y} />)}
          <ArenaProp id="prop/arena/torch" x={13} y={150} />
          <ArenaProp id="prop/arena/brazier" x={306} y={152} />
          {bossGate && floorIndex === 3 && <img class="arena-boss-gate" src={packUrl(bossGate.file)} width={96} height={96} alt="" />}
          {heroes.map((hero, i) => <HeroUnit key={hero.id} world={world} hero={hero} unit={unitsByHero.get(hero.id) ?? null} x={heroX[i] ?? 150} y={i % 2 === 0 ? 166 : 152} floats={floats} attacking={attacking === 'hero'} fxAsset={fxAsset} moving={moving} />)}
          {enemies.map((unit, i) => {
            const boss = unit.tags.includes('boss');
            const bossAddX = [302, 210, 178, 150];
            return <EnemyUnit key={unit.uid} world={world} party={party} unit={unit} x={boss ? 252 : combat?.isBoss ? (bossAddX[i] ?? 180) : (enemyX[i] ?? 250)} y={boss ? 152 : (i % 2 === 0 ? 166 : 152)} floats={floats} attacking={attacking === 'enemy'} fxAsset={fxAsset} />;
          })}
          {fore && <div class="arena-fore" style={{ backgroundImage: `url(${packUrl(fore.file)})` }} aria-hidden="true" />}
          {bossBanner && combat?.isBoss && <img class="arena-boss-banner" src={packUrl(bossBanner.file)} width={320} height={48} alt="" />}
          <span class="arena-frame" style={{ borderImageSource: `url(${packUrl('export/ui/ui-dungeon-frame.png')})` }} />
          {!fighting && enemies.length === 0 && <span class="arena-message">{party.phase === 'voltando' ? 'Voltando à vila' : 'Avançando pela dungeon'}</span>}
          {banner && <div class="arena-banner">{banner}</div>}
          <div class="arena-room-progress">
            {party.rooms.map((r, i) => <span key={i} class={`arena-room${i === party.roomIndex ? ' current' : ''}${r.cleared ? ' cleared' : ''}`} title={ROOM_LABELS[r.kind as keyof typeof ROOM_LABELS]}><RoomNode state={i === party.roomIndex ? 'current' : r.cleared ? 'cleared' : 'normal'} /></span>)}
          </div>
        </div>
      </div>
    </section>
  );
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
        {report.contract !== null && <p class="report-materials">Contrato cumprido: {fmt(report.contract)} de ouro.</p>}
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
          <button class="btn primary" onClick={onAbismo}>Voltar ao Abismo</button>
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
          {visible.map((party) => <ArenaCard key={party.id} party={party} selected={party.id === props.partyId} />)}
        </div>
      )}

      {!report && !historyReport && !historyOpen && <footer class="battle-bottom"><span>{world.parties.length} expedição{world.parties.length === 1 ? '' : 'ões'} ativa{world.parties.length === 1 ? '' : 's'}</span><span>O combate segue automático.</span><button class="btn small" onClick={() => ui.open({ kind: 'dungeon' })}>Voltar ao Abismo</button></footer>}
    </section>
  );
}
