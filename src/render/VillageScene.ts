// Cena da Vila: lê o World a cada quadro e roda o núcleo pela Session (tick fixo).
// Nada aqui muda o mundo diretamente; o prefeito só age por commands via painéis.

import Phaser from 'phaser';
import {
  BUILDING_IDS,
  BUILDINGS,
  buildingLevel,
  dayOf,
  hourOf,
  TICKS_PER_HOUR,
} from '../sim/index.ts';
import type { BuildingId, ChronicleEntry, Hero, World } from '../sim/index.ts';
import type { Session, SessionEvent } from '../game/session.ts';
import type { UiStore } from '../ui/store.ts';
import { makeTextures } from './art.ts';
import { drawBuilding } from './buildings.ts';
import {
  DEPTH,
  drawAbyss,
  drawBoard,
  drawCampfire,
  drawCemetery,
  drawCoffer,
  drawGate,
  drawGround,
  drawHornTower,
  scatterTrees,
  type AbyssView,
  type BoardView,
  type CampfireView,
  type CofferView,
  type HornView,
} from './environment.ts';
import { moveAxis } from './keys.ts';
import {
  ABYSS_EDGE_Y,
  door,
  gravePoint,
  graveOrder,
  heroDestination,
  LANDMARKS,
  LOTS,
  slotOffset,
  WORLD_H,
  WORLD_W,
  type Point,
} from './layout.ts';
import { HeroSprite, Mayor } from './sprites.ts';

/** Velocidade de caminhada dos heróis em 1× (px de mundo por segundo real). */
const HERO_SPEED = 170;
/** Quanto o herói fica num lugar antes de seguir para o próximo (segundos em 1×). */
const LINGER_S = 0.8;
/** Teto para uma caminhada travada não prender o herói. */
const MAX_COMMIT_S = 8;
const MAYOR_SPEED = 250;
const INTERACT_RADIUS = 78;

interface Interactable {
  id: string;
  point: Point;
  hit: { x: number; y: number; w: number; h: number };
  label: (world: World) => string;
  open: () => void;
}

interface BuildingView {
  g: Phaser.GameObjects.Graphics;
  lights: Phaser.GameObjects.Graphics;
  sign: Phaser.GameObjects.Text;
  level: number;
}

interface GraveView {
  stone: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
}

/** 0 = dia claro, 1 = noite fechada. */
export function nightFactor(tick: number): number {
  const h = hourOf(tick) + (tick % TICKS_PER_HOUR) / TICKS_PER_HOUR;
  if (h >= 8 && h < 18) return 0;
  if (h >= 18 && h < 22) return (h - 18) / 4;
  if (h >= 22 || h < 5) return 1;
  return 1 - (h - 5) / 3;
}

export class VillageScene extends Phaser.Scene {
  private readonly session: Session;
  private readonly ui: UiStore;
  private heroes = new Map<number, HeroSprite>();
  private buildings = new Map<BuildingId, BuildingView>();
  private graves = new Map<number, GraveView>();
  private interactables: Interactable[] = [];
  private mayor!: Mayor;
  private night!: Phaser.GameObjects.Rectangle;
  private abyss!: AbyssView;
  private horn!: HornView;
  private board!: BoardView;
  private coffer!: CofferView;
  private campfire!: CampfireView;
  private moveTarget: Point | null = null;
  private pendingInteract: string | null = null;
  private labelScale = 1;
  private baseZoom = 1;
  private zoomFactor = 1;
  private treasurySeen = 0;
  private treasuryCheckAt = 0;
  private hoverCursor = '';
  private downOnMap = false;
  private walkClock = 0;
  private unsubscribe: (() => void) | null = null;

  constructor(session: Session, ui: UiStore) {
    super('village');
    this.session = session;
    this.ui = ui;
  }

  private get world(): World {
    return this.session.world;
  }

  create(): void {
    makeTextures(this);
    drawGround(this);
    this.abyss = drawAbyss(this);
    scatterTrees(this);
    drawCemetery(this);
    drawGate(this);
    this.horn = drawHornTower(this);
    this.board = drawBoard(this);
    this.coffer = drawCoffer(this);
    this.campfire = drawCampfire(this);
    for (const id of BUILDING_IDS) this.createBuilding(id);
    this.createInteractables();

    this.night = this.add
      .rectangle(-400, -400, WORLD_W + 800, WORLD_H + 800, 0x0b0f24, 0)
      .setOrigin(0)
      .setDepth(DEPTH.night);

    this.mayor = new Mayor(this, LANDMARKS.cofre.x - 40, LANDMARKS.cofre.y + 90);
    const cam = this.cameras.main;
    cam.setBackgroundColor('#0b0a0c');
    cam.setBounds(-60, -40, WORLD_W + 120, WORLD_H + 60);
    cam.startFollow(this.mayor.root, true, 0.12, 0.12);
    this.fitCamera();
    this.scale.on('resize', () => this.fitCamera());

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.downOnMap = this.onCanvas(p)));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.downOnMap && this.onCanvas(p)) this.onTap(p);
      this.downOnMap = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onHover(p));
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      this.zoomFactor = Phaser.Math.Clamp(this.zoomFactor * (dy > 0 ? 0.9 : 1.1), 0.8, 2.2);
      this.fitCamera();
    });

    this.ui.interact = (id) => this.interact(id);
    this.unsubscribe = this.session.subscribe((e) => this.onSessionEvent(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
    this.syncAll(true);
    this.treasurySeen = this.world.town.treasury;
  }

  update(_time: number, delta: number): void {
    this.session.update(delta);
    const dt = Math.min(delta, 100) / 1000;
    this.updateMayor(dt);
    this.syncAll(false, dt);
  }

  // ── Câmera ──────────────────────────────────────────────────────────────

  private fitCamera(): void {
    const { width, height } = this.scale.gameSize;
    const fit = Math.min(width / WORLD_W, height / WORLD_H);
    // Se a vila inteira cabe legível, mostra tudo. Em tela pequena (celular),
    // aproxima até a altura caber e a câmera segue o prefeito.
    const tall = Math.min(height / WORLD_H, width / 620);
    this.baseZoom = fit >= 0.55 ? fit : Math.max(fit, tall, 0.5);
    const zoom = this.baseZoom * this.zoomFactor;
    this.cameras.main.setZoom(zoom);
    this.labelScale = Phaser.Math.Clamp(1 / zoom, 1, 1.8);
    for (const obj of this.children.list) {
      if (obj.name === 'label' && obj instanceof Phaser.GameObjects.Text) obj.setScale(this.labelScale);
    }
    for (const b of this.buildings.values()) b.sign.setScale(this.labelScale);
    for (const grave of this.graves.values()) grave.name.setScale(Math.min(this.labelScale, 1.4));
  }

  // ── Prédios e marcos ───────────────────────────────────────────────────

  private createBuilding(id: BuildingId): void {
    const lot = LOTS[id];
    const g = this.add.graphics({ x: lot.x, y: lot.y }).setDepth(lot.y + lot.h / 2 - 22);
    const lights = this.add.graphics({ x: lot.x, y: lot.y }).setDepth(DEPTH.lights).setBlendMode(Phaser.BlendModes.ADD);
    const sign = this.add
      .text(lot.x, lot.y + lot.h / 2 - 8, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#f4ecd8',
        stroke: '#0b0a08',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.labels);
    const view: BuildingView = { g, lights, sign, level: -1 };
    this.buildings.set(id, view);
    this.syncBuilding(id, false);
  }

  private syncBuilding(id: BuildingId, announce: boolean): void {
    const view = this.buildings.get(id)!;
    const level = buildingLevel(this.world, id);
    if (level === view.level) return;
    const lot = LOTS[id];
    drawBuilding(view.g, view.lights, id, level, lot);
    view.sign.setText(level === 0 ? `${BUILDINGS[id].name} · ruína` : `${BUILDINGS[id].name} · nível ${level}`);
    view.sign.setColor(level === 0 ? '#b8a890' : '#f4ecd8');
    if (announce && view.level >= 0 && level > view.level) this.sparkle(lot.x, lot.y);
    view.level = level;
  }

  private createInteractables(): void {
    const open = (panel: Parameters<UiStore['open']>[0]) => () => this.ui.open(panel);
    const { berrante, quadro, cofre, abismo, cemiterio } = LANDMARKS;
    this.interactables = [
      {
        id: 'berrante',
        point: { x: berrante.x, y: berrante.y + 90 },
        hit: { x: berrante.x - 50, y: berrante.y - 110, w: 100, h: 190 },
        label: () => 'Tocar o berrante',
        open: open({ kind: 'horn' }),
      },
      {
        id: 'quadro',
        point: { x: quadro.x, y: quadro.y + 48 },
        hit: { x: quadro.x - 40, y: quadro.y - 44, w: 80, h: 80 },
        label: () => 'Quadro de contratos',
        open: open({ kind: 'board' }),
      },
      {
        id: 'cofre',
        point: { x: cofre.x, y: cofre.y + 48 },
        hit: { x: cofre.x - 50, y: cofre.y - 44, w: 100, h: 70 },
        label: () => 'Cofre da vila',
        open: open({ kind: 'coffer' }),
      },
      {
        id: 'abismo',
        point: { x: abismo.x, y: abismo.y + 50 },
        hit: { x: abismo.x - 110, y: 60, w: 220, h: 180 },
        label: () => 'Olhar o abismo',
        open: open({ kind: 'dungeon' }),
      },
      {
        id: 'cemiterio',
        point: { x: cemiterio.x, y: cemiterio.y + 160 },
        hit: { x: cemiterio.x - 120, y: ABYSS_EDGE_Y, w: 240, h: 250 },
        label: () => 'Cemitério',
        open: open({ kind: 'memorial' }),
      },
      ...BUILDING_IDS.map<Interactable>((id) => {
        const lot = LOTS[id];
        const d = door(id);
        return {
          id,
          point: { x: d.x, y: d.y + 18 },
          hit: { x: lot.x - lot.w / 2, y: lot.y - lot.h / 2 - 40, w: lot.w, h: lot.h + 40 },
          label: (world) =>
            buildingLevel(world, id) === 0 ? `Reconstruir: ${BUILDINGS[id].name}` : `${BUILDINGS[id].name} (nível ${buildingLevel(world, id)})`,
          open: open({ kind: 'building', id }),
        };
      }),
    ];
  }

  private interact(id: string): void {
    this.interactables.find((i) => i.id === id)?.open();
  }

  // ── Prefeito ────────────────────────────────────────────────────────────

  private updateMayor(dt: number): void {
    const axis = moveAxis();
    if (axis.x !== 0 || axis.y !== 0) {
      this.moveTarget = null;
      this.pendingInteract = null;
      const len = Math.hypot(axis.x, axis.y);
      const step = MAYOR_SPEED * dt;
      this.mayor.walkTo(this.clampWalk({ x: this.mayor.x + (axis.x / len) * step, y: this.mayor.y + (axis.y / len) * step }), step);
    } else if (this.moveTarget) {
      const arrived = this.mayor.walkTo(this.moveTarget, MAYOR_SPEED * dt);
      if (arrived) this.moveTarget = null;
    } else {
      this.mayor.walkTo({ x: this.mayor.x, y: this.mayor.y }, 0);
    }
    this.mayor.animate(dt);

    const near = this.nearestInteractable();
    if (this.pendingInteract && near?.id === this.pendingInteract) {
      this.pendingInteract = null;
      this.moveTarget = null;
      near.open();
    }
    this.ui.setPrompt(near ? { id: near.id, label: near.label(this.world) } : null);
  }

  private nearestInteractable(): Interactable | null {
    let best: Interactable | null = null;
    let bestDist = INTERACT_RADIUS;
    for (const it of this.interactables) {
      const d = Math.hypot(it.point.x - this.mayor.x, it.point.y - this.mayor.y);
      if (d < bestDist) {
        bestDist = d;
        best = it;
      }
    }
    return best;
  }

  private clampWalk(p: Point): Point {
    return { x: Phaser.Math.Clamp(p.x, 24, WORLD_W - 24), y: Phaser.Math.Clamp(p.y, ABYSS_EDGE_Y + 40, WORLD_H - 8) };
  }

  private heroAt(x: number, y: number): HeroSprite | null {
    let best: HeroSprite | null = null;
    for (const s of this.heroes.values()) if (s.hits(x, y) && (!best || s.y > best.y)) best = s;
    return best;
  }

  private interactableAt(x: number, y: number): Interactable | null {
    return this.interactables.find((i) => x >= i.hit.x && x <= i.hit.x + i.hit.w && y >= i.hit.y && y <= i.hit.y + i.hit.h) ?? null;
  }

  /** O Phaser escuta o mouse na janela toda; cliques nos painéis HTML não são do mapa. */
  private onCanvas(p: Phaser.Input.Pointer): boolean {
    const target = (p.event as Event | undefined)?.target;
    return !target || target === this.game.canvas;
  }

  private onTap(p: Phaser.Input.Pointer): void {
    if (p.getDistance() > 14) return;
    const hero = this.heroAt(p.worldX, p.worldY);
    if (hero) {
      this.ui.open({ kind: 'hero', heroId: hero.id });
      return;
    }
    const it = this.interactableAt(p.worldX, p.worldY);
    if (it) {
      const dist = Math.hypot(it.point.x - this.mayor.x, it.point.y - this.mayor.y);
      if (dist < INTERACT_RADIUS) {
        it.open();
        return;
      }
      this.moveTarget = this.clampWalk(it.point);
      this.pendingInteract = it.id;
      return;
    }
    this.pendingInteract = null;
    this.moveTarget = this.clampWalk({ x: p.worldX, y: p.worldY });
    this.marker(this.moveTarget);
  }

  private onHover(p: Phaser.Input.Pointer): void {
    const over = this.heroAt(p.worldX, p.worldY) || this.interactableAt(p.worldX, p.worldY);
    const cursor = over ? 'pointer' : 'default';
    if (cursor !== this.hoverCursor) {
      this.hoverCursor = cursor;
      this.input.setDefaultCursor(cursor);
    }
  }

  // ── Sincronização com o World ──────────────────────────────────────────

  private syncAll(initial: boolean, dt = 0): void {
    const world = this.world;
    for (const id of BUILDING_IDS) this.syncBuilding(id, !initial);
    this.syncGraves(initial);
    this.syncHeroes(initial, dt);

    const night = nightFactor(world.tick);
    this.night.setFillStyle(0x0b0f24, night * 0.5);
    const lightAlpha = 0.2 + 0.8 * night;
    for (const b of this.buildings.values()) b.lights.setAlpha(lightAlpha);
    this.mayor.placeLabels(this.labelScale, night);

    const town = world.town;
    const hornReady = dayOf(world.tick) >= town.hornReadyDay;
    this.horn.ready.setVisible(hornReady);
    this.board.update(town.contracts.length, buildingLevel(world, 'guilda') >= 1);
    this.coffer.update(town.treasury);
    this.campfire.bedrolls.setVisible(buildingLevel(world, 'estalagem') === 0);

    const corruption = Math.max(...world.acts.filter((a) => a.unlocked).map((a) => a.corruption));
    const pulse = 0.08 * Math.sin(this.time.now / 600);
    this.abyss.glow.setAlpha(0.18 + (0.55 * corruption) / 100 + pulse);
    const parties = world.parties.filter((p) => p.outcome !== 'fuga' || p.memberIds.length > 0);
    const fighting = parties.some((p) => p.phase === 'combate');
    const badge = parties.length === 0 ? '' : `${parties.length} ${parties.length === 1 ? 'grupo' : 'grupos'} no abismo${fighting ? ' · em combate' : ''}`;
    if (this.abyss.badge.text !== badge) this.abyss.badge.setText(badge);
    this.abyss.badge.setScale(this.labelScale);

    if (this.time.now >= this.treasuryCheckAt) {
      this.treasuryCheckAt = this.time.now + 700;
      const gain = town.treasury - this.treasurySeen;
      if (!initial && gain >= 5) this.floatText(LANDMARKS.cofre.x + 20, LANDMARKS.cofre.y - 40, `+${Math.round(gain)} ouro`, '#ffd86a');
      this.treasurySeen = town.treasury;
    }
  }

  private syncHeroes(initial: boolean, dt: number): void {
    const world = this.world;
    const graveIndex = new Map(graveOrder(world).map((h, i) => [h.id, i]));
    const speed = this.session.paused ? 0 : HERO_SPEED * this.session.speed;
    const seen = new Set<number>();
    const groups = new Map<string, Hero[]>();
    const plans: { hero: Hero; key: string; point: Point; hide: boolean; follow?: number }[] = [];

    for (const hero of world.heroes) {
      if (hero.status === 'dead') continue;
      const sprite = this.heroes.get(hero.id);
      const leaving = hero.status === 'left' || hero.status === 'retired';
      if (leaving && (!sprite || sprite.hidden)) continue;
      const dest = heroDestination(world, hero, (id) => graveIndex.get(id) ?? null);
      plans.push({ hero, key: dest.key, point: dest.point, hide: dest.hide, ...(dest.followHeroId !== undefined ? { follow: dest.followHeroId } : {}) });
      const list = groups.get(dest.key) ?? [];
      list.push(hero);
      groups.set(dest.key, list);
    }

    const step = speed * dt;
    // Relógio de caminhada: anda junto com a velocidade do jogo e para na pausa.
    this.walkClock += this.session.paused ? 0 : dt * this.session.speed;
    for (const plan of plans) {
      const { hero } = plan;
      seen.add(hero.id);
      const group = groups.get(plan.key)!;
      const slot = slotOffset(group.indexOf(hero));
      let target = { x: plan.point.x + slot.x, y: plan.point.y + slot.y };
      if (plan.follow !== undefined) {
        const other = this.heroes.get(plan.follow);
        if (other && !other.hidden) target = { x: other.x + (hero.id < plan.follow ? -24 : 24), y: other.y };
      }
      let sprite = this.heroes.get(hero.id);
      if (!sprite) {
        const spawn = initial ? target : hero.activity?.kind === 'chegando' ? LANDMARKS.portao : LANDMARKS.abismo;
        sprite = new HeroSprite(this, hero, spawn);
        sprite.setHidden(initial ? plan.hide : hero.status === 'expedition');
        this.heroes.set(hero.id, sprite);
      }
      if (sprite.hidden && !plan.hide) {
        // Voltou do abismo: reaparece na escadaria.
        sprite.root.setPosition(LANDMARKS.abismo.x, LANDMARKS.abismo.y + 20);
        sprite.setHidden(false);
        sprite.commit = null;
      }
      // Uma hora do jogo dura 2 s em 1×: sem isto, quem vai ao túmulo vira as costas
      // antes de chegar. O herói termina a caminhada atual, para um instante e só
      // então segue para o que o núcleo já decidiu. Descer ou partir passa na frente.
      const c = sprite.commit;
      const sameKey = c?.key === plan.key;
      const done = !c || (c.arrivedAt !== null && this.walkClock - c.arrivedAt >= LINGER_S) || this.walkClock - c.since >= MAX_COMMIT_S;
      if (!c || plan.hide || sameKey || done) {
        if (sameKey) c!.point = target;
        else sprite.commit = { key: plan.key, point: target, since: this.walkClock, arrivedAt: null, hide: plan.hide };
      }
      const commit = sprite.commit!;
      sprite.sync(hero);
      const arrived = sprite.hidden ? true : sprite.walkTo(commit.point, step);
      if (arrived && commit.arrivedAt === null) commit.arrivedAt = this.walkClock;
      if (arrived && commit.hide && !sprite.hidden) sprite.setHidden(true);
      sprite.animate(this.session.paused ? 0 : dt * this.session.speed);
      const here = arrived && commit.key === plan.key && hero.status === 'town';
      sprite.setActivityIcon(here ? (hero.activity?.kind ?? null) : null);
      sprite.setSelected(this.ui.selectedHeroId === hero.id);
      sprite.placeLabels(this.labelScale);
    }

    for (const [id, sprite] of this.heroes) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.heroes.delete(id);
    }
  }

  private syncGraves(initial: boolean): void {
    const order = graveOrder(this.world);
    if (order.length === this.graves.size) return;
    order.forEach((hero, index) => {
      if (this.graves.has(hero.id)) return;
      const p = gravePoint(index);
      const stone = this.add.image(p.x, p.y, 'grave').setOrigin(0.5, 1).setDepth(p.y);
      const name = this.add
        .text(p.x, p.y + 2, hero.name, { fontFamily: 'Georgia, serif', fontSize: '10px', color: '#cfc8bb', stroke: '#000', strokeThickness: 2 })
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.labels)
        .setScale(Math.min(this.labelScale, 1.4));
      if (!initial) {
        stone.setAlpha(0);
        this.tweens.add({ targets: stone, alpha: 1, duration: 1200 });
        this.add.image(p.x, p.y + 4, 'mound').setDepth(p.y - 1);
      }
      this.graves.set(hero.id, { stone, name });
    });
  }

  private onSessionEvent(event: SessionEvent): void {
    if (event.type === 'reset') {
      for (const s of this.heroes.values()) s.destroy();
      this.heroes.clear();
      for (const g of this.graves.values()) {
        g.stone.destroy();
        g.name.destroy();
      }
      this.graves.clear();
      for (const b of this.buildings.values()) b.level = -1;
      this.syncAll(true);
      this.treasurySeen = this.world.town.treasury;
      return;
    }
    if (event.type === 'entries') for (const entry of event.entries) this.onEntry(entry);
  }

  private onEntry(entry: ChronicleEntry): void {
    if (entry.kind === 'berrante') this.horn.blast();
    if (entry.kind === 'morte') {
      const p = LANDMARKS.abismo;
      this.floatText(p.x, p.y - 40, entry.heroIds.length > 1 ? 'Um grupo não voltou' : 'Um herói tombou', '#ff8a7a');
    }
  }

  // ── Efeitos ─────────────────────────────────────────────────────────────

  private floatText(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '16px', color, stroke: '#000', strokeThickness: 4, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.floating)
      .setScale(this.labelScale);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private sparkle(x: number, y: number): void {
    for (let i = 0; i < 18; i++) {
      const s = this.add.image(x, y, 'spark').setTint(0xffd86a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floating);
      const a = (i / 18) * Math.PI * 2;
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * 90,
        y: y + Math.sin(a) * 60 - 20,
        alpha: 0,
        duration: 1100,
        ease: 'Cubic.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  private marker(p: Point): void {
    const ring = this.add.ellipse(p.x, p.y, 28, 12).setStrokeStyle(2, 0xffd86a, 0.9).setDepth(p.y - 1);
    this.tweens.add({ targets: ring, scaleX: 0.3, scaleY: 0.3, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
  }
}
