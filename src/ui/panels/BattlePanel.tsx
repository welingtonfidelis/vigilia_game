// Visualizador de dungeon do M4: acompanha um grupo em tempo real, sem comandar.
import { useEffect, useRef, useState } from 'preact/hooks';
import { floorLabel, MATERIAL_NAMES } from '../../sim/index.ts';
import type { Hero, MaterialId, Party, Unit } from '../../sim/index.ts';
import { PACK_BASE, packAsset } from '../../render/pack.ts';
import { fmt, heroById, liveHp, phaseText, ROOM_LABELS } from '../format.ts';
import { HERO_CROP, MonsterSprite, monsterBase, PixelSprite } from '../PixelSprite.tsx';
import { useGame } from '../components.tsx';
import { RoomIcon } from '../icons.tsx';

interface FloatItem {
  id: number;
  kind: 'damage' | 'gold';
  amount: number;
  unitUid?: number;
  x: number;
}

function BattleHeroSprite(props: { hero: Hero; dead: boolean }) {
  const asset = packAsset(`char/hero/${props.hero.classId}/${props.hero.gender}`);
  if (!asset) return null;
  const [w, h] = asset.frameSize ?? [16, 28];
  const scale = 4;
  const style: Record<string, string> = {
    width: `${w * scale}px`,
    height: `${h * scale}px`,
    backgroundImage: `url(${PACK_BASE}${asset.file})`,
    backgroundSize: `${w * 9 * scale}px ${h * scale}px`,
    backgroundPosition: '0 0',
    '--battle-to': `${-w * 4 * scale}px`,
  };
  return <span class={`battle-hero-sprite${props.dead ? ' dead' : ''}`} style={style} aria-hidden="true" />;
}

function HpBar(props: { hp: number; max: number }) {
  const pct = props.max > 0 ? Math.max(0, Math.min(100, (props.hp / props.max) * 100)) : 0;
  return (
    <span class="battle-hp" title={`${Math.ceil(props.hp)} / ${props.max}`}>
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}

function HeroUnit(props: { world: ReturnType<typeof useGame>['world']; unit: Unit | null; hero: Hero; floats: FloatItem[] }) {
  const { world, unit, hero, floats } = props;
  const live = liveHp(world, hero);
  const hp = unit ? Math.max(0, unit.hp) : live.hp;
  const max = unit ? unit.maxHp : live.max;
  const dead = unit ? !unit.alive : hero.status === 'dead';
  const fled = unit?.fled === true;
  const hits = floats.filter((f) => unit && f.unitUid === unit.uid);
  return (
    <div class={`battle-unit hero${dead ? ' down' : ''}${fled ? ' fled' : ''}${hits.length ? ' hit' : ''}`}>
      <BattleHeroSprite hero={hero} dead={dead} />
      <span class="battle-unit-floats">{hits.map((f) => <b key={f.id} class="battle-unit-float">−{f.amount}</b>)}</span>
      <span class="battle-name">{hero.name}</span>
      <HpBar hp={hp} max={max} />
    </div>
  );
}

function EnemyUnit(props: { world: ReturnType<typeof useGame>['world']; party: Party; unit: Unit; floats: FloatItem[] }) {
  const { world, party, unit, floats } = props;
  const look = monsterBase(world, unit, party.act);
  const boss = unit.tags.includes('boss');
  const hits = floats.filter((f) => f.unitUid === unit.uid);
  return (
    <div class={`battle-unit enemy${unit.alive ? '' : ' down'}${boss ? ' boss' : ''}${unit.elite ? ' elite' : ''}${hits.length ? ' hit' : ''}`}>
      <span class="battle-unit-floats">{hits.map((f) => <b key={f.id} class="battle-unit-float">−{f.amount}</b>)}</span>
      {look.asset ? (
        <MonsterSprite asset={look.asset} boss={boss} animate={unit.alive} scale={boss ? 3 : 4} />
      ) : (
        <PixelSprite base={look.base ?? 'skelet'} scale={4} crop={look.ghost ? HERO_CROP : 0} ghost={look.ghost} animate={unit.alive} />
      )}
      <span class="battle-name">{unit.name}</span>
      <HpBar hp={unit.hp} max={unit.maxHp} />
    </div>
  );
}

export function BattlePanel(props: { partyId: number }) {
  const { world, session, ui } = useGame();
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
          x: 30 + Math.random() * 40,
        });
      }
      prevHp.current.set(unit.uid, unit.hp);
    }
    if (items.some((i) => i.unitUid !== undefined)) {
      const damagedHero = (party.combat?.units ?? []).some((u) => u.side === 'hero' && items.some((i) => i.unitUid === u.uid));
      const damagedEnemy = (party.combat?.units ?? []).some((u) => u.side === 'enemy' && items.some((i) => i.unitUid === u.uid));
      if (damagedEnemy || damagedHero) {
        setAttacking(damagedEnemy ? 'hero' : 'enemy');
        const timer = window.setTimeout(() => setAttacking(null), 240);
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

  return (
    <section class="battle-view">
      <header class="battle-top">
        <button class="battle-close" onClick={() => ui.close()} aria-label="Fechar">×</button>
        <div class="battle-title">
          <h2>
            Ato {party.act + 1} · {floorLabel(party.act, party.floor)}
          </h2>
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
        <div class="battle-backdrop" />
        <div class="battle-scenery" aria-hidden="true">
          <img class="battle-cave" src={`${PACK_BASE}export/png/prop-abyss-cave.png`} alt="" />
          <img class="battle-rock left" src={`${PACK_BASE}export/png/prop-boulder-01.png`} alt="" />
          <img class="battle-rock right" src={`${PACK_BASE}export/png/prop-boulder-02.png`} alt="" />
        </div>
        <div class="battle-teams">
          <div class={`battle-team heroes${attacking === 'hero' ? ' attacking' : ''}`}>
            {heroes.map((hero) => (
              <HeroUnit key={hero.id} world={world} unit={unitsByHero.get(hero.id) ?? null} hero={hero} floats={floats} />
            ))}
            {heroes.length === 0 && <span class="battle-empty">O grupo está vazio.</span>}
          </div>
          <div class="battle-vs">{fighting ? '⚔' : '···'}</div>
          <div class={`battle-team enemies${attacking === 'enemy' ? ' attacking' : ''}`}>
            {enemies.map((unit) => (
              <EnemyUnit key={unit.uid} world={world} party={party} unit={unit} floats={floats} />
            ))}
            {enemies.length === 0 && <span class="battle-empty">{fighting ? 'Sem inimigos nesta sala.' : 'O grupo avança pela dungeon.'}</span>}
          </div>
        </div>

        {banner && <div class="battle-banner">{banner}</div>}
        <div class="battle-room-progress">
          {party.rooms.map((r, i) => (
            <span key={i} class={`battle-room${i === party.roomIndex ? ' current' : ''}${r.cleared ? ' cleared' : ''}`} title={ROOM_LABELS[r.kind]}>
              <RoomIcon kind={r.cleared || i <= party.roomIndex ? r.kind : null} />
            </span>
          ))}
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
