// Visualizador de dungeon do M4: palco lateral com as arenas do pack 1.9.
import { useEffect, useRef, useState } from 'preact/hooks';
import { floorLabel, MATERIAL_NAMES } from '../../sim/index.ts';
import type { Hero, MaterialId, Party, Unit } from '../../sim/index.ts';
import { packAsset, packUrl } from '../../render/pack.ts';
import { fmt, heroById, liveHp, phaseText, ROOM_LABELS } from '../format.ts';
import { HERO_CROP, monsterBase, PixelSprite } from '../PixelSprite.tsx';
import { useGame } from '../components.tsx';
import { RoomIcon } from '../icons.tsx';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

interface FloatItem {
  id: number;
  kind: 'damage' | 'gold';
  amount: number;
  unitUid?: number;
  x: number;
}

interface PropSpot {
  id: string;
  x: number;
  y: number;
}

/** Props que dão a moldura de cada bioma. Ficam atrás dos lutadores. */
const ACT_PROPS: Record<string, PropSpot[]> = {
  I: [
    { id: 'prop/arena/I/urn', x: 20, y: 158 },
    { id: 'prop/arena/I/candle', x: 35, y: 150 },
    { id: 'prop/arena/I/skull-pile', x: 294, y: 158 },
    { id: 'prop/arena/I/web', x: 40, y: 24 },
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

function useArenaScale(): number {
  const [scale, setScale] = useState(4);
  useEffect(() => {
    const fit = (): void => {
      const width = window.innerWidth - 28;
      const height = window.innerHeight - 150;
      setScale(Math.max(0.8, Math.min(4.25, width / 320, height / 192)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return scale;
}

/** Sprite de personagem do pack novo, com a animação escolhida pelo estado da luta. */
function ArenaSprite(props: { assetId: string; anim: 'idle' | 'attack' | 'hit' | 'death'; className?: string }) {
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
  return <span key={`${props.assetId}:${props.anim}:${from}:${to}`} class={`arena-sprite ${props.anim}${props.className ? ` ${props.className}` : ''}`} style={style} aria-hidden="true" />;
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

function HpBar(props: { hp: number; max: number }) {
  const pct = props.max > 0 ? Math.max(0, Math.min(100, (props.hp / props.max) * 100)) : 0;
  return (
    <span class="arena-hp" title={`${Math.ceil(props.hp)} / ${props.max}`}>
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}

function damageAnim(dead: boolean, hit: boolean, attacking: boolean): 'idle' | 'attack' | 'hit' | 'death' {
  if (dead) return 'death';
  if (hit) return 'hit';
  if (attacking) return 'attack';
  return 'idle';
}

function HeroUnit(props: { world: ReturnType<typeof useGame>['world']; hero: Hero; unit: Unit | null; x: number; y: number; floats: FloatItem[]; attacking: boolean }) {
  const { world, hero, unit, x, y, floats, attacking } = props;
  const live = liveHp(world, hero);
  const assetId = `char/hero/${hero.classId}/${hero.gender}`;
  const hp = unit ? Math.max(0, unit.hp) : live.hp;
  const max = unit ? unit.maxHp : live.max;
  const hits = floats.filter((f) => unit && f.unitUid === unit.uid);
  const dead = unit ? !unit.alive : hero.status === 'dead';
  const anim = damageAnim(dead, hits.length > 0, attacking);
  return (
    <div class={`arena-unit hero${dead ? ' down' : ''}${hits.length ? ' hit' : ''}`} style={{ left: `${x}px`, bottom: `${192 - y}px` }}>
      <ArenaSprite assetId={assetId} anim={anim} />
      <span class="arena-unit-floats">{hits.map((f) => <b key={f.id}>−{f.amount}</b>)}</span>
      <span class="arena-name" title={hero.name}>{hero.name}</span>
      <HpBar hp={hp} max={max} />
    </div>
  );
}

function EnemyUnit(props: { world: ReturnType<typeof useGame>['world']; party: Party; unit: Unit; x: number; y: number; floats: FloatItem[]; attacking: boolean }) {
  const { world, party, unit, x, y, floats, attacking } = props;
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
    <div
      class={`arena-unit enemy${unit.alive ? '' : ' down'}${boss ? ' boss' : ''}${unit.elite ? ' elite' : ''}${hits.length ? ' hit' : ''}`}
      style={{ left: `${x}px`, bottom: `${192 - y}px` }}
    >
      {assetId ? (
        <ArenaSprite assetId={assetId} anim={anim} />
      ) : (
        <PixelSprite base={look.base ?? 'skelet'} scale={1} crop={look.ghost ? HERO_CROP : 0} ghost={look.ghost} animate={unit.alive} />
      )}
      <span class="arena-unit-floats">{hits.map((f) => <b key={f.id}>−{f.amount}</b>)}</span>
      <span class="arena-name" title={unit.name}>{unit.name}</span>
      <HpBar hp={unit.hp} max={unit.maxHp} />
    </div>
  );
}

export function BattlePanel(props: { partyId: number }) {
  const { world, session, ui } = useGame();
  const scale = useArenaScale();
  const party = world.parties.find((p) => p.id === props.partyId);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [attacking, setAttacking] = useState<'hero' | 'enemy' | null>(null);
  const prevHp = useRef(new Map<number, number>());
  const prevGold = useRef(0);
  const prevRoom = useRef(0);
  const prevParty = useRef<number | null>(null);
  const nextFloat = useRef(1);
  const timers = useRef<number[]>([]);

  const addFloats = (items: FloatItem[]): void => {
    if (items.length === 0) return;
    setFloats((old) => [...old, ...items].slice(-24));
    const ids = new Set(items.map((i) => i.id));
    const timer = window.setTimeout(() => setFloats((old) => old.filter((f) => !ids.has(f.id))), 1000);
    timers.current.push(timer);
  };

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    if (!party) return;
    if (prevParty.current !== party.id) {
      prevParty.current = party.id;
      prevHp.current.clear();
      prevGold.current = party.loot.gold;
      prevRoom.current = party.roomIndex;
      setFloats([]);
      setBanner(null);
      setAttacking(null);
      return;
    }
    const items: FloatItem[] = [];
    for (const unit of party.combat?.units ?? []) {
      const old = prevHp.current.get(unit.uid);
      if (old !== undefined && unit.hp < old) {
        items.push({
          id: nextFloat.current++,
          kind: 'damage',
          amount: Math.max(1, Math.round(old - unit.hp)),
          unitUid: unit.uid,
          x: 50,
        });
      }
      prevHp.current.set(unit.uid, unit.hp);
    }
    if (items.some((i) => i.unitUid !== undefined)) {
      const damagedHero = (party.combat?.units ?? []).some((u) => u.side === 'hero' && items.some((i) => i.unitUid === u.uid));
      const damagedEnemy = (party.combat?.units ?? []).some((u) => u.side === 'enemy' && items.some((i) => i.unitUid === u.uid));
      if (damagedEnemy || damagedHero) {
        setAttacking(damagedEnemy ? 'hero' : 'enemy');
        const timer = window.setTimeout(() => setAttacking(null), 360);
        timers.current.push(timer);
      }
    }
    if (party.loot.gold > prevGold.current) {
      items.push({ id: nextFloat.current++, kind: 'gold', amount: Math.round(party.loot.gold - prevGold.current), x: 50 });
      prevGold.current = party.loot.gold;
    }
    if (party.roomIndex > prevRoom.current) {
      prevRoom.current = party.roomIndex;
      setBanner('Sala limpa · o grupo avança');
      const timer = window.setTimeout(() => setBanner(null), 1600);
      timers.current.push(timer);
    }
    addFloats(items);
  }, [session.rev, party?.id]);

  if (!party) {
    return (
      <section class="battle-view">
        <header class="battle-top">
          <button class="battle-close" onClick={() => ui.close()} aria-label="Fechar">×</button>
          <div class="battle-title"><h2>Dungeon</h2><p>O grupo voltou à vila.</p></div>
        </header>
        <div class="battle-empty">Ninguém está no abismo agora.</div>
      </section>
    );
  }

  const combat = party.combat;
  const heroIds = combat
    ? combat.units.filter((u) => u.side === 'hero' && u.heroId !== null).map((u) => u.heroId!)
    : party.startMemberIds;
  const heroes = [...new Set(heroIds)]
    .map((id) => heroById(world, id))
    .filter((h): h is Hero => !!h);
  const enemies = combat?.units.filter((u) => u.side === 'enemy') ?? [];
  const unitsByHero = new Map<number, Unit>();
  for (const u of combat?.units ?? []) if (u.heroId !== null) unitsByHero.set(u.heroId, u);
  const room = party.rooms[party.roomIndex];
  const materials = Object.entries(party.loot.materials) as [MaterialId, number][];
  const goldFloats = floats.filter((f) => f.kind === 'gold');
  const fighting = party.phase === 'combate' && !!combat;
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

  return (
    <section class="battle-view">
      <header class="battle-top">
        <button class="battle-close" onClick={() => ui.close()} aria-label="Fechar">×</button>
        <div class="battle-title">
          <h2>Ato {party.act + 1} · {floorLabel(party.act, party.floor)}</h2>
          <p>
            {phaseText(world, party)}
            {party.rooms.length > 0 ? ` · sala ${Math.min(party.roomIndex + 1, party.rooms.length)}/${party.rooms.length}` : ''}
            {room ? ` · ${ROOM_LABELS[room.kind]}` : ''}
            {combat?.isBoss ? ' · CHEFE' : ''}
            {combat?.enraged ? ' · fúria' : ''}
          </p>
        </div>
        <div class="battle-loot">
          <span>Saque</span>
          <strong>{fmt(party.loot.gold)} ouro</strong>
          {materials.length > 0 && <small>{materials.map(([m, n]) => `${n} ${MATERIAL_NAMES[m].toLowerCase()}`).join(' · ')}</small>}
          {goldFloats.map((f) => <b key={f.id} class="battle-gold-float">+{f.amount}</b>)}
        </div>
      </header>

      {world.parties.length > 1 && (
        <div class="battle-tabs">
          {world.parties.map((p) => (
            <button key={p.id} class={`tab${p.id === party.id ? ' active' : ''}`} onClick={() => ui.open({ kind: 'battle', partyId: p.id })}>
              {floorLabel(p.act, p.floor)} · {p.memberIds.length}
            </button>
          ))}
        </div>
      )}

      <div class="battle-stage">
        <div class="arena-shell" style={{ width: '320px', height: '192px', transform: `scale(${scale})` }}>
          {back && <img class="arena-back" src={packUrl(back.file)} width={320} height={192} alt="" />}
          {floor && <img class="arena-floor" src={packUrl(floor.file)} width={320} height={64} alt="" />}
          {ritual && floorIndex === 3 && (
            <img class="arena-ritual" src={packUrl(ritual.file)} width={160} height={16} alt="" />
          )}
          {ACT_PROPS[roman]?.map((p) => <ArenaProp key={p.id} id={p.id} x={p.x} y={p.y} />)}
          <ArenaProp id="prop/arena/torch" x={13} y={150} />
          <ArenaProp id="prop/arena/brazier" x={306} y={152} />
          {bossGate && floorIndex === 3 && <img class="arena-boss-gate" src={packUrl(bossGate.file)} width={96} height={96} alt="" />}
          {heroes.map((hero, i) => (
            <HeroUnit
              key={hero.id}
              world={world}
              hero={hero}
              unit={unitsByHero.get(hero.id) ?? null}
              x={heroX[i] ?? 150}
              y={i % 2 === 0 ? 166 : 152}
              floats={floats}
              attacking={attacking === 'hero'}
            />
          ))}
          {enemies.map((unit, i) => {
            const boss = unit.tags.includes('boss');
            return (
              <EnemyUnit
                key={unit.uid}
                world={world}
                party={party}
                unit={unit}
                x={boss ? 252 : (enemyX[i] ?? 250)}
                y={boss ? 152 : (i % 2 === 0 ? 166 : 152)}
                floats={floats}
                attacking={attacking === 'enemy'}
              />
            );
          })}
          {fore && <img class="arena-fore" src={packUrl(fore.file)} width={320} height={64} alt="" />}
          {bossBanner && combat?.isBoss && <img class="arena-boss-banner" src={packUrl(bossBanner.file)} width={320} height={48} alt="" />}
          <span class="arena-frame" style={{ borderImageSource: `url(${packUrl('export/ui/ui-dungeon-frame.png')})` }} />
          {!fighting && enemies.length === 0 && <span class="arena-message">{party.phase === 'voltando' ? 'Voltando à vila' : 'Avançando pela dungeon'}</span>}
          {banner && <div class="arena-banner">{banner}</div>}
          <div class="arena-room-progress">
            {party.rooms.map((r, i) => (
              <span key={i} class={`arena-room${i === party.roomIndex ? ' current' : ''}${r.cleared ? ' cleared' : ''}`} title={ROOM_LABELS[r.kind]}>
                <RoomIcon kind={r.cleared || i <= party.roomIndex ? r.kind : null} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <footer class="battle-bottom">
        <span>{fmt(party.loot.gold)} de ouro saqueado</span>
        <span>{party.moments.length ? party.moments[party.moments.length - 1] : 'Sem momentos marcantes ainda.'}</span>
        <button class="btn small" onClick={() => ui.open({ kind: 'dungeon' })}>Voltar ao Abismo</button>
      </footer>
    </section>
  );
}
