// Corredor da dungeon em canvas: o andar inteiro como uma faixa lateral. A câmera
// acompanha o grupo, que anda de verdade de sala em sala; os monstros esperam na
// névoa; cada golpe tem investida ou projétil; sangue e corpos ficam no chão.
//
// Lê o World a cada quadro (não muda nada nele). Cada grupo tem o seu corredor
// rodando o tempo todo (lanes.ts), com ou sem tela: quem abre no meio da expedição
// vê o grupo onde ele está, com os corpos e o sangue das salas anteriores.
// Dois relógios:
//   - a caminhada segue a velocidade do jogo (1×, 2×, 4×), para não descolar da simulação;
//   - golpes, partículas e números seguem um relógio mais calmo (raiz da velocidade),
//     para continuarem legíveis em 4×. Na pausa, os dois param.

import { CLASSES, heroStats, partyRooms, TICKS_PER_SECOND } from '../../sim/index.ts';
import type { CombatEvent, Hero, Party, Room, Unit, World } from '../../sim/index.ts';
import { artFile } from '../art32.ts';
import { packAsset, packUrl, type PackAsset } from '../pack.ts';
import {
  cameraTarget,
  ENTRY_W,
  enemySlot,
  formation,
  LANE_H,
  laneGoal,
  laneLength,
  RANGED_ROLES,
  revealX,
  ROOM_W,
  roomX,
  ROW_Y,
  stopX,
  takeEvents,
  threatX,
  WALK_SPEED,
  wallVariant,
  type EventCursor,
} from './model.ts';
import { enemySource, heroSource, image, type Anim, type SpriteSource } from './sprites.ts';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

/** Peça do pack pronta para desenhar no modo de arte atual. */
interface Art {
  asset: PackAsset;
  img: HTMLImageElement;
  /** Pixels da imagem por pixel da 16-bit (2 na 32-bit); o desenho segue nas medidas da 16-bit. */
  k: number;
}

/** A 32-bit quando existe neste modo; enquanto ela carrega, a 16-bit. */
function art(id: string): Art | null {
  const asset = packAsset(id);
  if (!asset) return null;
  const { file, hires } = artFile(id, asset.file);
  const hi = hires ? image(packUrl(file)) : null;
  if (hi) return { asset, img: hi, k: 2 };
  const img = image(packUrl(asset.file));
  return img ? { asset, img, k: 1 } : null;
}

/** Onde o grupo estava ao começar a volta (para a câmera, quando a tela abre já na volta). */
const stopXOrEntry = (party: Party, rooms: Room[]): number =>
  rooms.length > 0 ? stopX(Math.min(party.roomIndex, rooms.length - 1)) : ENTRY_W - 24;

/** Props de cada ato num painel de sala (x dentro do painel de 320 px, y dos pés). */
const ROOM_PROPS: Record<string, { id: string; x: number; y: number }[]> = {
  I: [
    { id: 'prop/arena/I/urn', x: 56, y: 150 },
    { id: 'prop/arena/I/candle', x: 72, y: 146 },
    { id: 'prop/arena/I/skull-pile', x: 270, y: 152 },
    { id: 'prop/arena/I/web', x: 40, y: 34 },
  ],
  II: [
    { id: 'prop/arena/II/beam', x: 50, y: 150 },
    { id: 'prop/arena/II/drowned-lantern', x: 268, y: 148 },
    { id: 'prop/arena/II/pipe', x: 286, y: 150 },
  ],
  III: [
    { id: 'prop/arena/III/giant-mushroom', x: 48, y: 150 },
    { id: 'prop/arena/III/spore-pod', x: 276, y: 148 },
    { id: 'prop/arena/III/root', x: 66, y: 152 },
  ],
  IV: [
    { id: 'prop/arena/IV/statue', x: 48, y: 150 },
    { id: 'prop/arena/IV/coral', x: 272, y: 152 },
    { id: 'prop/arena/IV/broken-window', x: 270, y: 120 },
  ],
  V: [
    { id: 'prop/arena/V/anvil', x: 52, y: 152 },
    { id: 'prop/arena/V/heavy-chain', x: 280, y: 130 },
    { id: 'prop/arena/V/slag', x: 70, y: 152 },
  ],
  VI: [
    { id: 'prop/arena/VI/vein', x: 50, y: 140 },
    { id: 'prop/arena/VI/eye', x: 272, y: 128 },
    { id: 'prop/arena/VI/floating-shard', x: 70, y: 120 },
  ],
};

/** Cor do sangue de cada ato (ossos dão pó; fungos, esporos; a forja, brasa…). */
const BLOOD: Record<string, string[]> = {
  I: ['#c8c0a8', '#8a8070', '#e8e0c8'],
  II: ['#3a6a70', '#24484c', '#5a9aa0'],
  III: ['#8a6ab0', '#5a3a80', '#b48ad0'],
  IV: ['#3a8070', '#205448', '#60a890'],
  V: ['#d86a2a', '#a03a18', '#f0a040'],
  VI: ['#7a3aa0', '#4a1a6a', '#b070d0'],
};
const HERO_BLOOD = ['#9a1e1e', '#6e1414', '#c03030'];

interface Actor {
  key: string;
  side: 'hero' | 'enemy';
  sprite: SpriteSource | null;
  x: number;
  y: number;
  homeX: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  boss: boolean;
  /** Relógio de efeitos em que a animação atual começou. */
  animStart: number;
  anim: Anim;
  attackUntil: number;
  hitUntil: number;
  flash: number;
  knock: number;
  lunge: { start: number; dur: number; dx: number } | null;
  dying: number | null;
  leaving: number | null;
  ranged: boolean;
  projectile: 'arrow' | 'fire' | 'bolt' | 'dark';
}

interface Corpse {
  sprite: SpriteSource | null;
  x: number;
  y: number;
  flip: boolean;
}

interface Projectile {
  kind: Actor['projectile'];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  start: number;
  dur: number;
  hit: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  floor: number;
  color: string;
  life: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  big: boolean;
  start: number;
}

interface Spark {
  id: string;
  x: number;
  y: number;
  start: number;
}

/** Altura mínima de arte à mostra (px de arte): do alto das cabeças ao chão. */
const MIN_VISIBLE_H = 136;
/** Largura mínima à mostra: a luta inteira (grupo e inimigos) cabe nela. */
const MIN_VISIBLE_W = 280;
const MIN_VISIBLE_W_NARROW = 200;
/** Abaixo desta largura (px de CSS) é tela de celular, como no style.css. */
const NARROW_CSS_W = 620;
/** Quanto o primeiro plano desce em relação à arte da arena frontal (px de arte). */
const FORE_DROP = 18;

/** Sons da luta, para o áudio tocar quando o corredor está na tela. */
export type LaneSound = 'slash' | 'crit' | 'shot' | 'fire' | 'holy' | 'dark' | 'kill' | 'heal' | 'blast';

export interface LaneHost {
  world(): World;
  speed(): number;
  paused(): boolean;
  sound?(name: LaneSound): void;
}

const SHOT_SOUND: Record<'arrow' | 'fire' | 'bolt' | 'dark', LaneSound> = { arrow: 'shot', fire: 'fire', bolt: 'holy', dark: 'dark' };

/** Quanto o grupo leva para sumir de vista ao voltar para a vila (s do relógio de efeitos). */
const EXIT_TIME = 1.6;

export class LaneRenderer {
  private ctx!: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement | null = null;
  private scale = 2;
  private viewW = ROOM_W;
  private top = 0;
  private camX = Number.NaN;
  private leaderX = Number.NaN;
  private facing: 1 | -1 = 1;
  private moving = false;
  /** Passadas do grupo, em segundos de caminhada a passo normal. */
  private stride = 0;
  private fx = 0;
  private real = 0;
  private last = 0;
  private reveal = 0;
  private floorKey = '';
  /** Bioma da passagem do grupo: escolhe a arte do corredor e da arena. */
  private biome = 0;
  private combatRoom = 0;
  private heroes = new Map<number, Actor>();
  private enemies = new Map<number, Actor>();
  private uidToHero = new Map<number, number>();
  private corpses: Corpse[] = [];
  private decals: { x: number; y: number; color: string; w: number }[] = [];
  private particles: Particle[] = [];
  private projectiles: Projectile[] = [];
  private floats: FloatText[] = [];
  private sparks: Spark[] = [];
  private queue: { at: number; ev: CombatEvent }[] = [];
  private cursor: EventCursor = { combat: null, last: 0 };
  private lastCombat: unknown = null;
  /** O chefe desta luta já passou para a fase 2 (a câmera treme uma vez). */
  private phase2Seen = false;
  private shakeUntil = 0;
  /** Inimigos desta luta que já viraram corpo (não renascem). */
  private fallen = new Set<number>();
  /** Quando o grupo começou a voltar para a vila (relógio de efeitos). */
  private exitAt: number | null = null;

  private readonly host: LaneHost;
  readonly partyId: number;

  constructor(host: LaneHost, partyId: number) {
    this.host = host;
    this.partyId = partyId;
  }

  /** Passa a desenhar neste canvas. A câmera pula direto para o grupo. */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camX = Number.NaN;
  }

  detach(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas) this.canvas = null;
  }

  /** Quantos bonecos e corpos há no corredor (testes e depuração). */
  get counts(): { heroes: number; enemies: number; corpses: number } {
    return { heroes: this.heroes.size, enemies: this.enemies.size, corpses: this.corpses.length };
  }

  /** O grupo já saiu de vista a caminho da vila. */
  get gone(): boolean {
    return this.exitAt !== null && this.fx - this.exitAt > EXIT_TIME;
  }

  /**
   * Tamanho em px de CSS do espaço disponível. A arte cresce em passos inteiros;
   * quando o passo não cabe inteiro, corta o teto (e um pouco do chão) em vez de
   * encolher a cena: o que importa fica entre a altura das cabeças e os pés.
   */
  resize(cssW: number, cssH: number): void {
    const canvas = this.canvas;
    if (!canvas) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const h = canvas.height;
    // Teto pela largura também, para a luta inteira caber; no celular aceita uma
    // vista mais estreita em troca de bonecos maiores.
    const minW = cssW <= NARROW_CSS_W ? MIN_VISIBLE_W_NARROW : MIN_VISIBLE_W;
    this.scale = Math.max(1, Math.min(Math.floor(h / MIN_VISIBLE_H), Math.floor(canvas.width / minW)));
    this.viewW = canvas.width / this.scale;
    const crop = LANE_H * this.scale - h;
    if (crop <= 0) {
      this.top = Math.round(-crop / 2);
    } else {
      const bottom = Math.min(crop * 0.25, 14 * this.scale);
      this.top = -Math.round(crop - bottom);
    }
    // Mudar o tamanho limpa o canvas: desenha já, sem esperar o próximo quadro.
    this.frame(this.last || performance.now());
  }

  frame(now: number): void {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    const world = this.host.world();
    const party = world.parties.find((p) => p.id === this.partyId);
    if (!party) return;
    const paused = this.host.paused();
    const speed = paused ? 0 : this.host.speed();
    this.real += dt;
    this.fx += dt * Math.sqrt(speed);
    const rooms = partyRooms(world, party);
    this.syncFloor(party);
    this.walk(party, rooms, world.tick, dt * speed);
    this.syncHeroes(world, party);
    this.syncEnemies(world, party);
    this.ingest(party);
    this.step(dt * Math.sqrt(speed));
    this.reveal = Math.max(this.reveal, revealX(party, rooms));
    const length = laneLength(rooms.length);
    const target = cameraTarget(this.leaderX, this.facing, this.viewW, length);
    this.camX = Number.isNaN(this.camX) ? target : this.camX + (target - this.camX) * Math.min(1, dt * 3);
    if (this.canvas) {
      // Tremor curto da câmera (fase 2 do chefe).
      const shake = this.real < this.shakeUntil ? (Math.random() * 2 - 1) * 2.5 : 0;
      this.camX += shake;
      this.draw(party, rooms);
      this.camX -= shake;
    }
  }

  /** Som de um golpe, só quando alguém está olhando. */
  private sound(name: LaneSound): void {
    if (this.canvas) this.host.sound?.(name);
  }

  // ── Estado ────────────────────────────────────────────────────────────

  /** Uma expedição nova (ou outro andar) zera o chão: corpos e sangue são deste andar. */
  private syncFloor(party: Party): void {
    const key = `${party.startedTick}:${party.passageId}:${party.floor}`;
    if (key === this.floorKey) return;
    this.floorKey = key;
    this.biome = party.biome;
    this.corpses = [];
    this.decals = [];
    this.enemies.clear();
    this.fallen.clear();
    this.exitAt = null;
    this.reveal = 0;
    this.leaderX = Number.NaN;
    this.camX = Number.NaN;
  }

  private walk(party: Party, rooms: Room[], tick: number, gameDt: number): void {
    if (party.phase === 'voltando') {
      // Não refaz o caminho inteiro: dá meia-volta, sai de vista e a tela avisa.
      if (this.exitAt === null) this.exitAt = this.fx;
      if (Number.isNaN(this.leaderX)) this.leaderX = stopXOrEntry(party, rooms);
      this.moving = false;
      this.facing = -1;
      return;
    }
    this.exitAt = null;
    const goal = laneGoal(party, rooms);
    if (Number.isNaN(this.leaderX)) this.leaderX = party.phase === 'descendo' ? -ENTRY_W + 8 : goal.x;
    const d = goal.x - this.leaderX;
    // Se a tela ficou muito para trás (4× ou aba voltando), apressa o passo.
    const catchUp = Math.abs(d) > ROOM_W * 1.2 ? WALK_SPEED * 3 : 0;
    // Entre salas, chega junto com a simulação (phaseEndsAt é a chegada na próxima sala).
    const left = (party.phaseEndsAt - tick) / TICKS_PER_SECOND;
    const paced = party.phase === 'explorando' && left > 0.2 ? Math.abs(d) / left : 0;
    const v = Math.min(WALK_SPEED * 6, Math.max(WALK_SPEED, paced, catchUp));
    const step = Math.min(Math.abs(d), v * gameDt);
    this.leaderX += Math.sign(d) * step;
    // As pernas andam pelo chão percorrido, não pelo relógio: sem deslizar em 4×.
    this.stride += step / WALK_SPEED;
    this.moving = step > 0.01;
    this.facing = this.moving ? (Math.sign(d) as 1 | -1) : goal.facing;
  }

  private syncHeroes(world: World, party: Party): void {
    const members = party.memberIds.map((id) => world.heroes.find((h) => h.id === id)).filter((h): h is Hero => !!h);
    const slots = formation(members.map((h) => ({ id: h.id, role: CLASSES[h.classId].role })));
    const units = new Map<number, Unit>();
    this.uidToHero.clear();
    for (const u of party.combat?.units ?? []) {
      if (u.heroId === null) continue;
      units.set(u.heroId, u);
      this.uidToHero.set(u.uid, u.heroId);
    }
    const leaving = party.phase === 'voltando';
    for (const slot of slots) {
      const hero = members.find((h) => h.id === slot.id)!;
      let actor = this.heroes.get(hero.id);
      if (leaving) {
        // Voltando: quem está à vista corre para trás e some; ninguém novo aparece.
        if (actor && actor.leaving === null) {
          actor.leaving = this.fx;
          actor.facing = -1;
        }
        continue;
      }
      const homeX = this.leaderX + slot.dx * this.facing;
      if (!actor) {
        const role = CLASSES[hero.classId].role;
        actor = this.newActor(`h${hero.id}`, 'hero', heroSource(hero), homeX, ROW_Y[slot.row]);
        actor.ranged = RANGED_ROLES.has(role);
        actor.projectile = hero.classId === 'piromante' ? 'fire' : hero.classId === 'clerigo' ? 'bolt' : 'arrow';
        this.heroes.set(hero.id, actor);
      }
      actor.homeX = homeX;
      actor.y += (ROW_Y[slot.row] - actor.y) * 0.2;
      actor.facing = this.facing;
      const unit = units.get(hero.id);
      actor.hp = unit ? unit.hp : hero.hp;
      actor.maxHp = unit ? unit.maxHp : heroStats(world, hero).maxHp;
    }
    // Quem saiu do grupo: morreu (vira corpo) ou fugiu (corre de volta e some).
    for (const [id, actor] of this.heroes) {
      if (members.some((h) => h.id === id)) continue;
      const hero = world.heroes.find((h) => h.id === id);
      if (hero?.status === 'dead' || party.dead.includes(id)) {
        if (actor.dying === null) actor.dying = this.fx;
      } else if (actor.leaving === null) {
        actor.leaving = this.fx;
        actor.facing = -1;
      }
    }
  }

  private syncEnemies(world: World, party: Party): void {
    const combat = party.combat;
    if (combat !== this.lastCombat) {
      // Luta nova: quem estava morrendo vira corpo agora, os vivos (retirada) somem,
      // e os números de unidade recomeçam (não podem pegar o boneco da luta anterior).
      for (const actor of this.enemies.values()) {
        if (actor.dying !== null) this.corpses.push({ sprite: actor.sprite, x: actor.x, y: actor.y, flip: true });
      }
      this.enemies.clear();
      this.fallen.clear();
      this.lastCombat = combat;
      this.phase2Seen = false;
      this.combatRoom = party.roomIndex;
    }
    if (!combat) return;
    const foes = combat.units.filter((u) => u.side === 'enemy');
    foes.forEach((unit, i) => {
      const boss = unit.tags.includes('boss');
      const slot = enemySlot(this.combatRoom, i, boss);
      let actor = this.enemies.get(unit.uid);
      if (!actor) {
        if (this.fallen.has(unit.uid)) return;
        if (!unit.alive) {
          // Já estava morto quando a tela chegou: só o corpo, no lugar dele.
          this.fallen.add(unit.uid);
          this.corpses.push({ sprite: enemySource(world, party, unit), x: slot.x, y: ROW_Y[slot.row], flip: true });
          return;
        }
        // Surge da névoa um pouco atrás e anda até o lugar.
        actor = this.newActor(`e${unit.uid}`, 'enemy', enemySource(world, party, unit), slot.x + 46, ROW_Y[slot.row]);
        actor.facing = -1;
        actor.boss = boss;
        actor.ranged = unit.tags.includes('backline');
        actor.projectile = 'dark';
        this.enemies.set(unit.uid, actor);
      }
      // A fase 2 do chefe troca o desenho e sacode a câmera.
      if (boss) {
        actor.sprite = enemySource(world, party, unit) ?? actor.sprite;
        if (!this.phase2Seen && unit.alive && unit.hp <= unit.maxHp * 0.5) {
          this.phase2Seen = true;
          this.shakeUntil = this.real + 0.5;
          this.sound('blast');
        }
      }
      actor.homeX = slot.x;
      actor.hp = Math.max(0, unit.hp);
      actor.maxHp = unit.maxHp;
      if (!unit.alive && actor.dying === null) actor.dying = this.fx;
    });
  }

  private newActor(key: string, side: Actor['side'], sprite: SpriteSource | null, x: number, y: number): Actor {
    return {
      key,
      side,
      sprite,
      x,
      y,
      homeX: x,
      facing: 1,
      hp: 1,
      maxHp: 1,
      boss: false,
      animStart: this.fx,
      anim: 'idle',
      attackUntil: 0,
      hitUntil: 0,
      flash: 0,
      knock: 0,
      lunge: null,
      dying: null,
      leaving: null,
      ranged: false,
      projectile: 'arrow',
    };
  }

  private actorByUid(uid: number): Actor | undefined {
    const heroId = this.uidToHero.get(uid);
    return heroId !== undefined ? this.heroes.get(heroId) : this.enemies.get(uid);
  }

  // ── Golpes ────────────────────────────────────────────────────────────

  private ingest(party: Party): void {
    const events = takeEvents(this.cursor, party.combat);
    // Vários golpes no mesmo pulso viram uma rajada curta, não um bloco só.
    const base = Math.max(this.fx, this.queue[this.queue.length - 1]?.at ?? 0);
    events.slice(-12).forEach((ev, i) => this.queue.push({ at: base + i * 0.07, ev }));
    const unitOf = (uid: number) => party.combat?.units.find((u) => u.uid === uid);
    while (this.queue.length > 0 && this.queue[0]!.at <= this.fx) {
      const { ev } = this.queue.shift()!;
      this.play(ev, unitOf(ev.to));
    }
  }

  private play(ev: CombatEvent, targetUnit: Unit | undefined): void {
    const from = this.actorByUid(ev.from);
    const to = this.actorByUid(ev.to);
    if (!to) return;
    if (ev.kind === 'heal') {
      if (from) this.attack(from, 0.35);
      this.sound('heal');
      this.sparks.push({ id: 'fx/heal', x: to.x, y: to.y - 10, start: this.fx });
      this.floatText(to, `+${Math.round(ev.amount)}`, '#7fd37a', false);
      return;
    }
    if (ev.kind === 'blast') {
      this.sound('blast');
      this.burst(to.x, to.y - 10, ['#f0a040', '#d86a2a', '#fff0a0'], 10, to.y);
      this.impact(to, ev, targetUnit, from?.x ?? to.x + 10);
      return;
    }
    if (!from) {
      this.impact(to, ev, targetUnit, to.x + 10);
      return;
    }
    if (from.ranged) {
      this.attack(from, 0.3);
      this.sound(SHOT_SOUND[from.projectile]);
      const dir = Math.sign(to.x - from.x) || 1;
      const x0 = from.x + dir * 6;
      const y0 = from.y - (from.sprite?.height ?? 20) * 0.55;
      const x1 = to.x;
      const y1 = to.y - (to.sprite?.height ?? 20) * 0.5;
      this.projectiles.push({
        kind: from.projectile,
        x0,
        y0,
        x1,
        y1,
        start: this.fx + 0.08,
        dur: Math.max(0.12, Math.abs(x1 - x0) / 280),
        hit: () => this.impact(to, ev, targetUnit, from.x),
      });
      return;
    }
    // Corpo a corpo: avança, bate e volta.
    const gap = to.x - from.x;
    const reach = Math.sign(gap) * Math.max(0, Math.min(from.boss ? 52 : 40, Math.abs(gap) - 12));
    from.lunge = { start: this.fx, dur: 0.32, dx: reach };
    this.attack(from, 0.32);
    this.later(0.11, () => this.impact(to, ev, targetUnit, from.x));
  }

  private attack(actor: Actor, dur: number): void {
    actor.attackUntil = this.fx + dur;
    actor.animStart = this.fx;
    actor.anim = 'attack';
  }

  private pending: { at: number; run: () => void }[] = [];
  private later(delay: number, run: () => void): void {
    this.pending.push({ at: this.fx + delay, run });
  }

  private impact(to: Actor, ev: CombatEvent, unit: Unit | undefined, fromX: number): void {
    this.sound(ev.crit ? 'crit' : 'slash');
    if (ev.kill && to.side === 'enemy') this.sound('kill');
    to.flash = 0.09;
    to.knock = Math.sign(to.x - fromX || 1) * (ev.crit ? 5 : 3);
    to.hitUntil = this.fx + 0.22;
    const crit = ev.crit;
    this.floatText(to, `${Math.max(1, Math.round(ev.amount))}${crit ? '!' : ''}`, crit ? '#ffd24a' : '#ffffff', crit);
    const palette = to.side === 'hero' ? HERO_BLOOD : BLOOD[this.roman()] ?? HERO_BLOOD;
    this.burst(to.x, to.y - (to.sprite?.height ?? 20) * 0.5, palette, crit ? 9 : 5, to.y);
    const roman = this.roman();
    this.sparks.push({ id: `fx/${roman}/${to.side === 'enemy' ? 'slash' : 'impact'}`, x: to.x, y: to.y - (to.sprite?.height ?? 20) * 0.5, start: this.fx });
    if (ev.kill) {
      if (to.dying === null) to.dying = this.fx;
      if (to.side === 'enemy' && unit && unit.gold > 0) {
        const gold = Math.round(unit.gold);
        this.later(0.3, () => this.floatText(to, `+${gold} ouro`, '#e8c25a', false));
      }
    }
  }

  private floatText(actor: Actor, text: string, color: string, big: boolean): void {
    const jitter = (this.floats.length % 3) * 4 - 4;
    this.floats.push({ x: actor.x + jitter, y: actor.y - (actor.sprite?.height ?? 20) - 4, text, color, big, start: this.fx });
  }

  private burst(x: number, y: number, palette: string[], n: number, floor: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI - Math.PI;
      const v = 30 + Math.random() * 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 20,
        floor: floor + (Math.random() * 8 - 4),
        color: palette[i % palette.length]!,
        life: 1.2,
      });
    }
  }

  private roman(): string {
    return ROMAN[this.biome] ?? 'I';
  }

  // ── Passo dos efeitos ─────────────────────────────────────────────────

  private step(fxDt: number): void {
    for (const p of [...this.pending]) {
      if (p.at > this.fx) continue;
      this.pending.splice(this.pending.indexOf(p), 1);
      p.run();
    }
    for (const proj of [...this.projectiles]) {
      if (this.fx < proj.start + proj.dur) continue;
      this.projectiles.splice(this.projectiles.indexOf(proj), 1);
      proj.hit();
    }
    for (const actor of [...this.heroes.values(), ...this.enemies.values()]) this.moveActor(actor, fxDt);
    for (const [id, actor] of this.heroes) {
      if (actor.leaving !== null && this.fx - actor.leaving > EXIT_TIME) this.heroes.delete(id);
      if (actor.dying !== null && this.fx - actor.dying > this.deathTime(actor)) {
        this.corpses.push({ sprite: actor.sprite, x: actor.x, y: actor.y, flip: actor.facing === -1 });
        this.heroes.delete(id);
      }
    }
    for (const [uid, actor] of this.enemies) {
      if (actor.dying !== null && this.fx - actor.dying > this.deathTime(actor)) {
        this.corpses.push({ sprite: actor.sprite, x: actor.x, y: actor.y, flip: true });
        this.enemies.delete(uid);
        this.fallen.add(uid);
      }
    }
    const g = 260;
    for (const p of this.particles) {
      p.vy += g * fxDt;
      p.x += p.vx * fxDt;
      p.y += p.vy * fxDt;
      p.life -= fxDt;
      if (p.y >= p.floor && p.vy > 0) {
        // O sangue assenta no chão e fica: o caminho guarda a luta.
        if (this.decals.length < 500) this.decals.push({ x: Math.round(p.x), y: Math.round(p.floor), color: p.color, w: Math.random() < 0.3 ? 2 : 1 });
        p.life = 0;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    this.floats = this.floats.filter((f) => this.fx - f.start < 1);
    this.sparks = this.sparks.filter((s) => this.fx - s.start < 0.6);
  }

  private deathTime(actor: Actor): number {
    return Math.min(1.2, actor.sprite?.duration('death') ?? 0.6) + 0.15;
  }

  private moveActor(actor: Actor, fxDt: number): void {
    // Quem caiu fica onde caiu.
    if (actor.dying === null) actor.x += (actor.homeX - actor.x) * Math.min(1, fxDt * 9);
    actor.knock *= Math.max(0, 1 - fxDt * 12);
    actor.flash = Math.max(0, actor.flash - fxDt);
    if (actor.leaving !== null) actor.homeX -= 120 * fxDt;
    let anim: Anim;
    if (actor.dying !== null) anim = 'death';
    else if (actor.hitUntil > this.fx) anim = 'hit';
    else if (actor.attackUntil > this.fx) anim = 'attack';
    else if (actor.leaving !== null || (actor.side === 'hero' ? this.moving : Math.abs(actor.homeX - actor.x) > 2)) anim = 'run';
    else anim = 'idle';
    if (anim !== actor.anim) {
      actor.anim = anim;
      actor.animStart = anim === 'death' && actor.dying !== null ? actor.dying : this.fx;
    }
    if (actor.lunge && this.fx - actor.lunge.start > actor.lunge.dur) actor.lunge = null;
  }

  private lungeOffset(actor: Actor): number {
    const l = actor.lunge;
    if (!l) return 0;
    const p = (this.fx - l.start) / l.dur;
    // Avanço rápido, pausa curta no golpe, volta mais lenta.
    const out = p < 0.3 ? p / 0.3 : p < 0.45 ? 1 : 1 - (p - 0.45) / 0.55;
    return l.dx * Math.max(0, Math.min(1, out));
  }

  // ── Desenho ───────────────────────────────────────────────────────────

  private draw(party: Party, rooms: Room[]): void {
    const { ctx, scale: s } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, this.canvas!.width, this.canvas!.height);
    ctx.imageSmoothingEnabled = false;
    const cam = Math.round(this.camX * s) / s;
    ctx.setTransform(s, 0, 0, s, -Math.round(this.camX * s), this.top);
    const roman = ROMAN[party.biome] ?? 'I';
    const left = cam - 8;
    const right = cam + this.viewW + 8;

    const corridor = !!packAsset(`corridor/${roman}/wall-a`);
    if (corridor) this.drawCorridor(rooms, roman, party, left, right);
    else this.drawRooms(rooms, roman, party.floor, left, right);
    this.drawFloor(corridor ? `corridor/${roman}/floor` : `arena/${roman}/floor`, left, right, 1, cam);
    this.drawRoomContents(rooms, roman, corridor, left, right);
    this.drawDepthPass(roman, left, right, corridor);
    for (const d of this.decals) {
      if (d.x < left || d.x > right) continue;
      ctx.fillStyle = d.color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(d.x, d.y, d.w, 1);
    }
    ctx.globalAlpha = 1;
    for (const c of this.corpses) this.drawCorpse(c);
    const actors = [...this.heroes.values(), ...this.enemies.values()].sort((a, b) => a.y - b.y);
    for (const a of actors) this.drawShadow(a);
    for (const a of actors) this.drawActor(a);
    for (const a of actors) this.drawHp(a);
    this.drawProjectiles();
    this.drawSparks();
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    // Primeiro plano: o do corredor já é baixo; o da arena 1.9 desce para não tapar a fileira da frente.
    if (corridor) this.drawFloor(`corridor/${roman}/fore`, left - 80, right + 80, 1.25, cam);
    else this.drawFloor(`arena/${roman}/fore`, left - 80, right + 80, 1.25, cam, FORE_DROP);
    this.drawEntryShade(cam);
    this.drawFog(rooms, party, cam);
    this.drawFloats();
  }

  /** Arte contínua: patamar da escada, uma parede por sala (a ou b) e um arco em cada divisa. */
  private drawCorridor(rooms: Room[], roman: string, party: Party, left: number, right: number): void {
    const { ctx } = this;
    const draw = (id: string, x: number): void => {
      const a = art(id);
      if (!a) return;
      const w = a.img.width / a.k;
      if (x + w >= left && x <= right) ctx.drawImage(a.img, x, 0, w, a.img.height / a.k);
    };
    draw(`corridor/${roman}/entry`, 0);
    for (let i = 0; i < Math.max(1, rooms.length); i++) {
      draw(`corridor/${roman}/wall-${wallVariant(party.passageId, party.floor, i)}`, roomX(i));
    }
    const door = packAsset(`corridor/${roman}/door`);
    const half = Math.round((door?.size?.[0] ?? 48) / 2);
    for (let i = 1; i < rooms.length; i++) draw(`corridor/${roman}/door`, roomX(i) - half);
  }

  private drawRooms(rooms: Room[], roman: string, floor: number, left: number, right: number): void {
    const depth = packAsset(`arena/${roman}/back-${floor + 1}`) ?? packAsset(`arena/${roman}/back`);
    const plain = packAsset(`arena/${roman}/back`) ?? depth;
    const boss = packAsset(`arena/${roman}/back-4`) ?? depth;
    const pillars = art(`arena/${roman}/mid`);
    // Um painel antes da primeira sala, para o grupo sair da escuridão.
    for (let i = -1; i < Math.max(1, rooms.length); i++) {
      const x = roomX(i);
      if (x + ROOM_W < left || x > right) continue;
      const lair = rooms[i]?.kind === 'chefe' || rooms[i]?.kind === 'guardiao';
      const asset = lair ? boss : i % 2 === 0 ? depth : plain;
      const back = asset ? art(asset.id) : null;
      if (back) this.ctx.drawImage(back.img, x, 0, ROOM_W, LANE_H);
      // Os pilares nas bordas de cada painel escondem a emenda entre salas.
      if (pillars) this.ctx.drawImage(pillars.img, x, 0, ROOM_W, pillars.img.height / pillars.k);
    }
  }

  private drawFloor(id: string, left: number, right: number, parallax: number, cam: number, drop = 0): void {
    const a = art(id);
    if (!a) return;
    const w = a.img.width / a.k;
    const h = a.img.height / a.k;
    const y = (a.asset.stageY ?? 128) + drop;
    // Na tela, a camada anda `parallax` vezes o que a câmera anda. Com parallax > 1
    // o primeiro plano passa mais rápido que o chão: é isso que dá profundidade.
    const shift = cam * (1 - parallax);
    const start = Math.floor((left - shift) / w) * w + shift;
    for (let x = start; x < right; x += w) this.ctx.drawImage(a.img, Math.round(x), y, w, h);
  }

  private drawRoomContents(rooms: Room[], roman: string, corridor: boolean, left: number, right: number): void {
    const { ctx } = this;
    const t = this.real;
    rooms.forEach((room, i) => {
      const x0 = roomX(i);
      if (x0 + ROOM_W < left || x0 > right) return;
      if (corridor) {
        // A parede já é o cenário: tochas ao lado dos arcos e um ou outro objeto solto.
        this.drawProp('prop/arena/torch', x0 + 34, 148, t);
        this.drawProp('prop/arena/torch', x0 + ROOM_W - 34, 148, t + 0.2);
        const props = (ROOM_PROPS[roman] ?? []).filter((p) => p.y > 100);
        const pick = props[(i * 7 + this.biome) % Math.max(1, props.length)];
        if (pick && i % 3 !== 2) this.drawProp(pick.id, x0 + (i % 2 ? 70 : 262), pick.y, t);
      } else {
        for (const p of ROOM_PROPS[roman] ?? []) this.drawProp(p.id, x0 + p.x, p.y, t);
        this.drawProp('prop/arena/torch', x0 + 14, 148, t);
        this.drawProp('prop/arena/torch', x0 + ROOM_W - 14, 148, t + 0.2);
      }
      const tx = threatX(i);
      switch (room.kind) {
        case 'bau':
          this.drawChest(tx, ROW_Y[1], room.cleared);
          break;
        case 'santuario':
          this.drawProp('prop/arena/altar', tx, ROW_Y[0], t);
          break;
        case 'prisioneiro':
          if (!room.cleared) this.drawProp('prop/arena/chain', tx, ROW_Y[0] - 10, t);
          break;
        case 'restos':
          this.drawProp('prop/arena/bones', tx, ROW_Y[1], t);
          break;
        case 'mercador':
          // O mercador espera com a arca até o grupo passar; depois segue caminho.
          if (!room.cleared) {
            this.drawVillager('char/villager/artesa/m', tx + 6, ROW_Y[0]);
            this.drawChest(tx - 6, ROW_Y[0] + 2, true);
          }
          break;
        case 'armadilha':
          this.drawSpikes(tx, room.cleared);
          break;
        case 'guardiao':
        case 'chefe': {
          this.drawProp(`prop/arena/${roman}/boss-gate`, tx + 40, ROW_Y[0] - 2, t);
          const ritual = art('decal/arena/ritual-circle');
          if (ritual) ctx.drawImage(ritual.img, tx - 40, ROW_Y[1] - 10, ritual.img.width / ritual.k, ritual.img.height / ritual.k);
          break;
        }
        default:
          break;
      }
    });
  }

  /** Morador do pack (quadro parado), virado para quem chega pela esquerda. */
  private drawVillager(id: string, x: number, y: number): void {
    const a = art(id);
    if (!a) return;
    const [w, h] = a.asset.frameSize ?? a.asset.size ?? [16, 21];
    const { ctx } = this;
    ctx.save();
    ctx.translate(Math.round(x), y);
    ctx.scale(-1, 1);
    ctx.drawImage(a.img, 0, 0, w * a.k, h * a.k, -Math.floor(w / 2), -h, w, h);
    ctx.restore();
  }

  /** Baú do pack: fechado até o grupo passar, depois aberto com o ouro à mostra. */
  private drawChest(x: number, y: number, open: boolean): void {
    const a = art('prop/chest');
    if (!a) return;
    const [w, h] = a.asset.frameSize ?? [16, 16];
    const f = open ? (a.asset.frames ?? 3) - 1 : 0;
    this.ctx.drawImage(a.img, f * w * a.k, 0, w * a.k, h * a.k, Math.round(x - w / 2), Math.round(y - h), w, h);
  }

  /** Espinhos no chão da sala: baixos até o grupo passar; depois de pegar alguém, ficam erguidos. */
  private drawSpikes(cx: number, sprung: boolean): void {
    const { ctx } = this;
    const h = sprung ? 5 : 2;
    for (let row = 0; row < 2; row++) {
      const y = ROW_Y[row]! + 2;
      for (let x = cx - 24 + row * 3; x <= cx + 24; x += 6) {
        ctx.fillStyle = '#2a2a2e';
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillStyle = '#8a8f99';
        for (let k = 0; k < h; k++) ctx.fillRect(x, y - k - 1, 1, 1);
        ctx.fillStyle = '#c9ced6';
        ctx.fillRect(x, y - h, 1, 1);
      }
    }
  }

  private drawProp(id: string, x: number, y: number, t: number): void {
    const a = art(id);
    if (!a) return;
    const { img, k } = a;
    const [w, h] = a.asset.size ?? [img.width / k, img.height / k];
    const loop = a.asset.animations?.loop;
    if (loop) {
      const f = loop.frames[Math.floor(t * (loop.fps || 8)) % loop.frames.length] ?? 0;
      this.ctx.drawImage(img, f * w * k, 0, w * k, h * k, Math.round(x - w / 2), Math.round(y - h), w, h);
    } else {
      this.ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h), w, h);
    }
  }

  private drawShadow(a: Actor): void {
    const x = Math.round(a.x + this.lungeOffset(a));
    const { ctx } = this;
    const w = a.boss ? 22 : 9;
    // Sombra macia em dois planos + pixels de contato para assentar os sprites no chão.
    ctx.fillStyle = a.boss ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0.40)';
    ctx.beginPath();
    ctx.ellipse(x, a.y, w, a.boss ? 3.2 : 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = a.side === 'hero' ? 'rgba(226, 185, 91, 0.28)' : 'rgba(145, 65, 55, 0.25)';
    ctx.fillRect(x - (a.boss ? 5 : 2), Math.round(a.y), a.boss ? 10 : 4, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(x - (a.boss ? 9 : 4), Math.round(a.y) + 1, a.boss ? 18 : 8, 1);
  }

  private drawActor(a: Actor): void {
    const sprite = a.sprite;
    const img = sprite ? image(sprite.sheet(a.anim)) : null;
    if (!sprite || !img) return;
    const { ctx } = this;
    const marching = a.anim === 'run' && a.side === 'hero' && a.leaving === null;
    const t = marching ? this.stride : this.fx - a.animStart;
    const [sx, sy, sw, sh] = sprite.frame(a.anim, t);
    const d = sprite.density(a.anim);
    const bob = a.anim === 'run' && !sprite.walks ? Math.floor(t * 10) % 2 : 0;
    const x = Math.round(a.x + this.lungeOffset(a) + a.knock);
    const y = Math.round(a.y) - bob;
    ctx.save();
    ctx.translate(x, y);
    if (a.facing === -1) ctx.scale(-1, 1);
    let alpha = sprite.ghost ? 0.6 : 1;
    if (a.leaving !== null) alpha *= Math.max(0, 1 - (this.fx - a.leaving) / EXIT_TIME);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, sx * d, sy * d, sw * d, sh * d, -Math.floor(sw / 2), -sh, sw, sh);
    if (a.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, a.flash * 10) * 0.9;
      ctx.drawImage(img, sx * d, sy * d, sw * d, sh * d, -Math.floor(sw / 2), -sh, sw, sh);
    }
    ctx.restore();
  }

  private drawCorpse(c: Corpse): void {
    const sprite = c.sprite;
    const img = sprite ? image(sprite.sheet('death')) : null;
    if (!sprite || !img) return;
    const [sx, sy, sw, sh] = sprite.frame('death', 99);
    const d = sprite.density('death');
    const { ctx } = this;
    ctx.save();
    ctx.translate(Math.round(c.x), Math.round(c.y));
    if (c.flip) ctx.scale(-1, 1);
    ctx.globalAlpha = 0.75;
    ctx.filter = 'brightness(0.55) saturate(0.6)';
    ctx.drawImage(img, sx * d, sy * d, sw * d, sh * d, -Math.floor(sw / 2), -sh, sw, sh);
    ctx.restore();
  }

  private drawHp(a: Actor): void {
    if (a.dying !== null || a.leaving !== null) return;
    const w = a.boss ? 30 : 14;
    const x = Math.round(a.x + this.lungeOffset(a)) - Math.floor(w / 2);
    const y = Math.round(a.y) + 3;
    const pct = Math.max(0, Math.min(1, a.hp / (a.maxHp || 1)));
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x - 1, y - 1, w + 2, 4);
    ctx.fillStyle = a.side === 'hero' ? '#5fae5a' : '#c8452f';
    ctx.fillRect(x, y, Math.max(0, Math.round(w * pct)), 2);
  }

  private drawProjectiles(): void {
    const { ctx } = this;
    const arrow = art('fx/arrow');
    for (const p of this.projectiles) {
      const k = (this.fx - p.start) / p.dur;
      if (k < 0) continue;
      const x = p.x0 + (p.x1 - p.x0) * k;
      // Um arco leve: flechas sobem um pouco antes de descer.
      const y = p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * (p.kind === 'arrow' ? 6 : 2);
      const dir = Math.sign(p.x1 - p.x0) || 1;
      if (p.kind === 'arrow' && arrow) {
        // A flecha do pack aponta para a direita; inclina com o arco do voo.
        const [w, h] = arrow.asset.size ?? [8, 3];
        const slope = (p.y1 - p.y0 - 6 * Math.PI * Math.cos(k * Math.PI)) / (Math.abs(p.x1 - p.x0) || 1);
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.scale(dir, 1);
        ctx.rotate(Math.atan(slope));
        ctx.drawImage(arrow.img, -w / 2, -h / 2, w, h);
        ctx.restore();
        continue;
      }
      const colors: Record<Projectile['kind'], [string, string]> = {
        arrow: ['#e8dcc0', '#8a7a5a'],
        fire: ['#ffd27a', '#e0571e'],
        bolt: ['#f4f0c8', '#c8b860'],
        dark: ['#c890ff', '#5a2a90'],
      };
      const [core, glow] = colors[p.kind];
      ctx.fillStyle = glow;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(Math.round(x - dir * 5), Math.round(y) - 1, 5, 3);
      ctx.globalAlpha = 1;
      ctx.fillStyle = core;
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
  }

  private drawSparks(): void {
    for (const s of this.sparks) {
      const a = art(s.id);
      if (!a) continue;
      const { asset, img } = a;
      const play = asset.animations?.play ?? asset.animations?.loop;
      const [w, h] = asset.frameSize ?? asset.size ?? [32, 32];
      const frames = play?.frames ?? [0];
      const i = Math.min(frames.length - 1, Math.floor((this.fx - s.start) * (play?.fps ?? 16)));
      // Efeitos grandes do pack ficam pela metade: o corredor é mais apertado que a arena.
      const k = w > 32 ? 0.5 : 1;
      this.ctx.drawImage(img, (frames[i] ?? 0) * w * a.k, 0, w * a.k, h * a.k, Math.round(s.x - (w * k) / 2), Math.round(s.y - (h * k) / 2), w * k, h * k);
    }
  }

  /**
   * Passe de profundidade 2.5D: luz ambiente por bioma, poças de luz nas tochas
   * e poeira em poucos pixels. Tudo é desenhado no canvas existente; sem filtros
   * por sprite, buffers extras ou dependências, e sem tocar no estado da simulação.
   */
  private drawDepthPass(roman: string, left: number, right: number, corridor: boolean): void {
    const { ctx } = this;
    const ambience: Record<string, string> = {
      I: 'rgba(88, 65, 42, 0.10)',
      II: 'rgba(28, 78, 94, 0.13)',
      III: 'rgba(70, 42, 102, 0.12)',
      IV: 'rgba(28, 92, 72, 0.11)',
      V: 'rgba(126, 54, 24, 0.12)',
      VI: 'rgba(74, 34, 110, 0.15)',
    };

    // A parede recebe uma sombra vertical discreta; a faixa do chão ganha peso
    // perto da câmera, reforçando os planos sem desfocar a pixel art.
    ctx.fillStyle = ambience[roman] ?? ambience.I!;
    ctx.fillRect(left, 0, right - left, 112);
    const wallShade = ctx.createLinearGradient(0, 0, 0, 112);
    wallShade.addColorStop(0, 'rgba(0, 0, 0, 0.30)');
    wallShade.addColorStop(0.68, 'rgba(0, 0, 0, 0.04)');
    wallShade.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = wallShade;
    ctx.fillRect(left, 0, right - left, 112);

    const floorShade = ctx.createLinearGradient(0, 150, 0, LANE_H);
    floorShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    floorShade.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
    ctx.fillStyle = floorShade;
    ctx.fillRect(left, 150, right - left, LANE_H - 150);

    // A luz acompanha as tochas já existentes; só processa as salas visíveis.
    const first = Math.max(-1, Math.floor(left / ROOM_W) - 1);
    const last = Math.ceil(right / ROOM_W) + 1;
    for (let i = first; i <= last; i++) {
      const x0 = roomX(i);
      if (x0 + ROOM_W < left || x0 > right) continue;
      for (const tx of [x0 + (corridor ? 34 : 14), x0 + ROOM_W - (corridor ? 34 : 14)]) {
        const glow = ctx.createRadialGradient(tx, 143, 1, tx, 143, corridor ? 30 : 24);
        glow.addColorStop(0, roman === 'V' ? 'rgba(255, 148, 58, 0.18)' : 'rgba(255, 190, 104, 0.15)');
        glow.addColorStop(0.45, 'rgba(255, 155, 72, 0.06)');
        glow.addColorStop(1, 'rgba(255, 130, 50, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(tx - 30, 113, 60, 60);
      }
    }

    // Poeira em padrão determinístico: pequenos brilhos pixelados, sem RNG por frame.
    for (let i = 0; i < 9; i++) {
      const drift = this.real * (5 + (i % 3) * 2);
      const x = Math.floor(left + (((i * 73 + drift) % Math.max(1, right - left)) + Math.max(1, right - left)) % Math.max(1, right - left));
      const y = 34 + ((i * 29 + Math.floor(this.real * (2 + i % 2))) % 102);
      ctx.globalAlpha = 0.16 + (Math.sin(this.real * 1.8 + i * 2.1) + 1) * 0.10;
      ctx.fillStyle = roman === 'VI' ? '#c4a0ff' : roman === 'II' ? '#8bdce8' : '#ffdca0';
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  private drawEntryShade(cam: number): void {
    // O grupo sai da escuridão da escada; o patamar da entrada (0..ENTRY_W) já é visível,
    // é onde ele espera enquanto desce.
    if (cam > 0) return;
    const { ctx } = this;
    ctx.fillStyle = 'rgba(5,5,7,1)';
    if (cam < -ENTRY_W) ctx.fillRect(cam - 2, 0, -ENTRY_W - cam + 2, LANE_H);
    const g = ctx.createLinearGradient(-ENTRY_W, 0, 0, 0);
    g.addColorStop(0, 'rgba(5,5,7,1)');
    g.addColorStop(1, 'rgba(5,5,7,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-ENTRY_W, 0, ENTRY_W, LANE_H);
  }

  private drawFog(rooms: Room[], party: Party, cam: number): void {
    const { ctx } = this;
    const fogX = this.reveal;
    const end = cam + this.viewW + 20;
    if (fogX < end) {
      const g = ctx.createLinearGradient(fogX - 40, 0, fogX + 50, 0);
      g.addColorStop(0, 'rgba(6,6,10,0)');
      g.addColorStop(1, 'rgba(6,6,10,0.94)');
      ctx.fillStyle = g;
      ctx.fillRect(fogX - 40, 0, 90, LANE_H);
      ctx.fillStyle = 'rgba(6,6,10,0.94)';
      ctx.fillRect(fogX + 50, 0, end - fogX, LANE_H);
    }
    // Olhos na névoa onde há luta à frente.
    rooms.forEach((room, i) => {
      if (room.cleared || i <= party.roomIndex - (party.phase === 'combate' ? 0 : 1)) return;
      if (room.kind !== 'matilha' && room.kind !== 'elite' && room.kind !== 'chefe' && room.kind !== 'guardiao') return;
      const x = threatX(i);
      if (x < fogX + 20 || x > end) return;
      const big = room.kind === 'chefe' || room.kind === 'guardiao';
      const n = big ? 1 : room.kind === 'elite' ? 2 : 3;
      for (let k = 0; k < n; k++) {
        const blink = Math.sin(this.real * 1.7 + i * 2 + k * 1.3) > 0.85;
        if (blink) continue;
        const ex = x + k * 22;
        const ey = (big ? 118 : 140) - (k % 2) * 8;
        ctx.fillStyle = big ? '#ff5a3a' : '#c83a2a';
        ctx.fillRect(ex, ey, 1, 1);
        ctx.fillRect(ex + (big ? 5 : 3), ey, 1, 1);
      }
    });
  }

  private drawFloats(): void {
    const { ctx, scale } = this;
    for (const f of this.floats) {
      const p = (this.fx - f.start) / 1;
      const y = f.y - p * 14;
      ctx.save();
      // Texto em resolução cheia (não em pixel de arte) para ficar nítido.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const sx = Math.round((f.x - this.camX) * scale);
      const sy = Math.round(y * scale + this.top);
      const size = Math.round((f.big ? 9 : 7) * scale * 0.9);
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, 1 - p * p);
      ctx.lineWidth = Math.max(2, scale);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(f.text, sx, sy);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, sx, sy);
      ctx.restore();
    }
  }
}
