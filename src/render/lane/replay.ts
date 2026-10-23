// Melhores momentos (M6 F3). Ao lado dos corredores, um gravador guarda as lutas de cada grupo
// (os bonecos do começo e os golpes do registro do combate) e, quando a expedição acaba, fica
// com as mais marcantes: morte, nêmesis, Senhor, guardião, herói por um fio. O replay monta um
// mundo de mentira com aquele grupo e aquela sala e entrega os golpes no compasso original ao
// mesmo corredor de sempre. Só tela: nada disso vai para o save.

import { TICKS_PER_SECOND } from '../../sim/index.ts';
import type { Combat, CombatEvent, Hero, Party, Room, Unit, World } from '../../sim/index.ts';
import { LaneRenderer, type LaneHost } from './renderer.ts';

/** Golpes guardados por luta (os últimos): uns 20 a 30 segundos de luta. */
const MAX_EVENTS = 220;
/** Lutas marcantes por expedição. */
const MAX_HIGHLIGHTS = 3;

export interface Highlight {
  title: string;
  score: number;
  party: Pick<Party, 'passageId' | 'level' | 'biome' | 'rules' | 'floor' | 'lord' | 'roomIndex' | 'startMemberIds'>;
  rooms: Room[];
  heroes: Hero[];
  units: Unit[];
  /** Tick do combate em que a gravação começa (o replay conta a partir dele). */
  start: number;
  events: CombatEvent[];
  complete: boolean;
}

interface Recording {
  combat: Combat;
  highlight: Highlight;
  lastN: number;
}

const live = new Map<number, Recording>();
const kept = new Map<number, Highlight[]>();

const clone = <T>(v: T): T => structuredClone(v);

/** Chamado a cada quadro pelos corredores: grava as lutas em andamento e fecha as que acabaram. */
export function recordFights(world: World): void {
  for (const party of world.parties) {
    const rec = live.get(party.id);
    const combat = party.phase === 'combate' ? party.combat : null;
    if (rec && rec.combat !== combat) {
      finish(party.id, rec);
      live.delete(party.id);
    }
    if (!combat) continue;
    let cur = live.get(party.id);
    if (!cur) {
      cur = {
        combat,
        lastN: combat.log?.at(-1)?.n ?? 0,
        highlight: {
          title: '',
          score: 0,
          party: { passageId: party.passageId, level: party.level, biome: party.biome, rules: [...party.rules], floor: party.floor, lord: party.lord, roomIndex: party.roomIndex, startMemberIds: [...party.memberIds] },
          rooms: clone(party.rooms),
          heroes: party.memberIds.map((id) => world.heroes.find((h) => h.id === id)).filter((h): h is Hero => !!h).map(clone),
          units: clone(combat.units),
          start: combat.ticks,
          events: [],
          complete: true,
        },
      };
      live.set(party.id, cur);
    }
    for (const ev of combat.log ?? []) {
      if (ev.n <= cur.lastN) continue;
      // Pulou golpes (a aba ficou parada): o replay não teria como mostrar a luta inteira.
      if (ev.n > cur.lastN + 1 && cur.highlight.events.length > 0) cur.highlight.complete = false;
      cur.highlight.events.push(ev);
      cur.lastN = ev.n;
    }
  }
  for (const id of [...live.keys()]) {
    if (!world.parties.some((p) => p.id === id)) {
      finish(id, live.get(id)!);
      live.delete(id);
    }
  }
}

/** Fecha a gravação: dá nota e título, e guarda se estiver entre as melhores da expedição. */
function finish(partyId: number, rec: Recording): void {
  const h = rec.highlight;
  if (!h.complete || h.events.length === 0) return;
  const side = new Map(h.units.map((u) => [u.uid, u]));
  const deaths = h.events.filter((e) => e.kill && side.get(e.to)?.side === 'hero').map((e) => side.get(e.to)!.name);
  const nemesis = h.units.find((u) => u.nemesisId !== undefined);
  const boss = h.units.find((u) => u.tags.includes('boss'));
  const guardian = h.units.find((u) => u.tags.includes('guardian'));
  // Quem chegou perto de cair: a menor fração de vida de um herói na luta.
  const hp = new Map(h.units.map((u) => [u.uid, u.hp]));
  let closest = 1;
  let clutch = '';
  for (const e of h.events) {
    const u = side.get(e.to);
    if (!u) continue;
    hp.set(e.to, (hp.get(e.to) ?? 0) + (e.kind === 'heal' ? e.amount : -e.amount));
    if (u.side === 'hero' && !e.kill) {
      const frac = (hp.get(e.to) ?? 0) / u.maxHp;
      if (frac < closest) {
        closest = frac;
        clutch = u.name;
      }
    }
  }
  h.score = deaths.length * 5 + (nemesis ? 4 : 0) + (boss ? 5 : 0) + (guardian ? 3 : 0) + (closest < 0.1 ? 2 : 0);
  if (h.score <= 0) return;
  const names = deaths.length > 1 ? `${deaths.slice(0, -1).join(', ')} e ${deaths.at(-1)}` : deaths[0];
  h.title = deaths.length
    ? `A queda de ${names}`
    : nemesis
      ? nemesis.name
      : boss
        ? boss.name
        : guardian
          ? 'O guardião da passagem'
          : `Por um fio: ${clutch}`;
  if (h.events.length > MAX_EVENTS) {
    // Corta o começo da luta: os golpes cortados já valem para a vida de quem começa o replay.
    const dropped = h.events.slice(0, h.events.length - MAX_EVENTS);
    const byUid = new Map(h.units.map((u) => [u.uid, u]));
    for (const e of dropped) {
      const u = byUid.get(e.to);
      if (!u) continue;
      u.hp = Math.max(0, Math.min(u.maxHp, u.hp + (e.kind === 'heal' ? e.amount : -e.amount)));
      if (e.kill) u.alive = false;
    }
    h.units = h.units.filter((u) => u.alive || u.side === 'enemy');
    h.party.startMemberIds = h.party.startMemberIds.filter((id) => h.units.some((u) => u.heroId === id && u.alive));
    h.events = h.events.slice(-MAX_EVENTS);
    h.start = h.events[0]!.t;
  }
  const list = [...(kept.get(partyId) ?? []), h].sort((a, b) => b.score - a.score).slice(0, MAX_HIGHLIGHTS);
  kept.set(partyId, list);
  // Só os grupos mais recentes: a memória não cresce sem fim numa campanha longa.
  if (kept.size > 24) kept.delete(kept.keys().next().value!);
}

/** As melhores lutas da expedição deste grupo (vazio se nada marcante foi visto). */
export const highlightsFor = (partyId: number): Highlight[] => kept.get(partyId) ?? [];

/** Mundo de mentira com o grupo e a sala da luta; os golpes chegam no compasso original. */
class ReplayHost implements LaneHost {
  private readonly party: Party;
  private readonly combat: Combat;
  private readonly fake: World;
  private readonly h: Highlight;
  private next = 0;
  private t0 = 0;
  done = false;

  constructor(h: Highlight) {
    this.h = h;
    const units = clone(h.units);
    // Os golpes de antes do começo guardado já aconteceram: a vida parte de onde a gravação parte.
    this.combat = { units, ticks: h.start, enraged: false, isBoss: units.some((u) => u.tags.includes('boss') || u.tags.includes('guardian')), bossMech: null, mechCd: 0, echoesSpawned: false, nextUid: 999, log: [] };
    this.party = {
      ...h.party,
      id: -1,
      memberIds: [...h.party.startMemberIds],
      dead: [],
      phase: 'combate',
      phaseEndsAt: 0,
      persistent: false,
      rooms: clone(h.rooms),
      retreating: false,
      combat: this.combat,
      loot: { gold: 0, materials: {}, xp: 0 },
      contractId: null,
      rescued: 0,
      recallRequested: false,
      outcome: null,
      startedTick: 0,
      confidence: 1,
      moments: [],
    } as unknown as Party;
    this.fake = { tick: 0, parties: [this.party], heroes: clone(h.heroes), abyss: { level: h.party.level, passages: [] } } as unknown as World;
  }

  world(): World {
    return this.fake;
  }
  speed(): number {
    return 1;
  }
  paused(): boolean {
    return false;
  }

  /** Avança o replay até `now` (ms) e entrega os golpes que já deviam ter acontecido. */
  advance(now: number): void {
    if (!this.t0) this.t0 = now;
    const tick = this.h.start + ((now - this.t0) / 1000) * TICKS_PER_SECOND;
    this.combat.ticks = Math.floor(tick);
    this.fake.tick = Math.floor(tick);
    const byUid = new Map(this.combat.units.map((u) => [u.uid, u]));
    while (this.next < this.h.events.length && this.h.events[this.next]!.t <= tick) {
      const ev = this.h.events[this.next++]!;
      const target = byUid.get(ev.to);
      if (target) {
        target.hp = Math.max(0, Math.min(target.maxHp, target.hp + (ev.kind === 'heal' ? ev.amount : -ev.amount)));
        if (ev.kill) {
          target.alive = false;
          if (target.side === 'hero' && target.heroId !== null) {
            this.party.memberIds = this.party.memberIds.filter((id) => id !== target.heroId);
            this.party.dead.push(target.heroId);
          }
        }
      }
      this.combat.log = [...(this.combat.log ?? []), ev].slice(-40);
    }
    if (this.next >= this.h.events.length && tick > (this.h.events.at(-1)?.t ?? 0) + 2 * TICKS_PER_SECOND) this.done = true;
  }
}

/** Toca um momento num canvas; devolve a função que para. */
export function playHighlight(h: Highlight, canvas: HTMLCanvasElement, onEnd: () => void): () => void {
  const host = new ReplayHost(h);
  const lane = new LaneRenderer(host, -1);
  lane.attach(canvas);
  const rect = canvas.parentElement!.getBoundingClientRect();
  lane.resize(rect.width, rect.height);
  let raf = 0;
  let ended = false;
  const loop = (now: number): void => {
    host.advance(now);
    lane.frame(now);
    if (host.done && !ended) {
      ended = true;
      onEnd();
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    lane.detach(canvas);
  };
}
