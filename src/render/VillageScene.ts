// Cena da Vila: lê o World a cada quadro e roda o núcleo pela Session (tick fixo).
// Nada aqui muda o mundo diretamente; o prefeito só age por commands via painéis.

import Phaser from 'phaser';
import {
  BUILDING_IDS,
  BUILDINGS,
  buildingLevel,
  childAge,
  commands,
  dayOf,
  hourOf,
  TICKS_PER_HOUR,
} from '../sim/index.ts';
import type { BuildingId, ChronicleEntry, Hero, World } from '../sim/index.ts';
import type { Session, SessionEvent } from '../game/session.ts';
import type { UiStore } from '../ui/store.ts';
import { makeTextures } from './art.ts';
import { animFrames, ART_SCALE, CLASS_LOOK, DUNGEON_URL, FRAMES_0X72, MAYOR_SPRITE, TOWN_URL } from './assets.ts';
import { drawBuilding } from './buildings.ts';
import { moveAxis } from './keys.ts';
import {
  ABYSS_EDGE_Y,
  CEMETERY_TILES,
  citizenSpot,
  door,
  gravePoint,
  graveOrder,
  HORN_TOWER,
  heroDestination,
  isNightOwl,
  LANDMARKS,
  LOT_TILES,
  LOTS,
  slotOffset,
  THERMAL_TILES,
  TILE,
  wanderPoint,
  WORLD_H,
  WORLD_W,
  type Point,
} from './layout.ts';
import { CitizenSprite, ChildSprite, HeroSprite, Mayor } from './sprites.ts';
import {
  buildAbyss,
  buildBoard,
  buildCampfire,
  buildCemetery,
  buildCoffer,
  buildGround,
  buildHornTower,
  buildProps,
  buildCottages,
  buildThermal,
  DEPTH,
  insetTownFrames,
  label,
  scatterTrees,
  smooth,
  type AbyssView,
  type BoardView,
  type CofferView,
  type HornView,
} from './town.ts';

/** Velocidade de caminhada dos heróis em 1× (px de mundo por segundo real). */
const HERO_SPEED = 170;
/** Quanto o herói fica num lugar antes de seguir para o próximo (segundos em 1×). */
const LINGER_S = 0.8;
/** Teto para uma caminhada travada não prender o herói. */
const MAX_COMMIT_S = 8;
const MAYOR_SPEED = 250;
const CHILD_SPEED = 80;
const CITIZEN_SPEED = 90;
/** Quem está lesionado anda mais devagar (manca). */
const INJURED_PACE = 0.6;
const INTERACT_RADIUS = 78;
/** Zoom fixo: o mapa é um recorte que acompanha o prefeito, como no Tristram. */
const CAMERA_ZOOM = 1.5;

interface Interactable {
  id: string;
  point: Point;
  hit: { x: number; y: number; w: number; h: number };
  label: (world: World) => string;
  open: () => void;
}

interface BuildingView {
  tiles: Phaser.GameObjects.Container;
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
  private kids = new Map<number, ChildSprite>();
  private citizens = new Map<number, CitizenSprite>();
  private buildings = new Map<BuildingId, BuildingView>();
  private graves = new Map<number, GraveView>();
  private interactables: Interactable[] = [];
  private mayor!: Mayor;
  private night!: Phaser.GameObjects.Rectangle;
  private abyss!: AbyssView;
  private horn!: HornView;
  private board!: BoardView;
  private coffer!: CofferView;
  private moveTarget: Point | null = null;
  private pendingInteract: string | null = null;
  private labelScale = 1;
  private treasurySeen = 0;
  private treasuryCheckAt = 0;
  private hoverCursor = '';
  private hoverHeroId: number | null = null;
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

  preload(): void {
    this.load.spritesheet('town', TOWN_URL, { frameWidth: 16, frameHeight: 16 });
    this.load.image('dungeon', DUNGEON_URL);
  }

  create(): void {
    this.registerArt();
    const mask = buildGround(this);
    // O chão já foi assado; daqui para baixo, todo tile-imagem (prédios, cercas,
    // portão, quadro, árvores) usa UVs um pouco para dentro contra o vazamento do atlas.
    insetTownFrames(this);
    this.abyss = buildAbyss(this);
    scatterTrees(this, mask);
    buildCemetery(this);
    buildProps(this);
    buildCampfire(this);
    buildThermal(this);
    buildCottages(this);
    this.horn = buildHornTower(this);
    this.board = buildBoard(this);
    this.coffer = buildCoffer(this);
    for (const id of BUILDING_IDS) this.createBuilding(id);
    this.createInteractables();
    this.layoutSigns();

    this.night = this.add
      .rectangle(-400, -400, WORLD_W + 800, WORLD_H + 800, 0x0b0f24, 0)
      .setOrigin(0)
      .setDepth(DEPTH.night);

    this.mayor = new Mayor(this, LANDMARKS.cofre.x - 40, LANDMARKS.cofre.y + 70);
    const cam = this.cameras.main;
    cam.setBackgroundColor('#07060a');
    cam.setRoundPixels(true);
    cam.startFollow(this.mayor.root, true, 0.12, 0.12);
    // Fantasia sombria: o Tiny Town é colorido; tira saturação e brilho da cena inteira.
    if (this.game.renderer.type === Phaser.WEBGL) {
      const grade = cam.postFX.addColorMatrix();
      grade.saturate(-0.55);
      grade.brightness(0.8, true);
      grade.contrast(0.08, true);
      cam.postFX.addVignette(0.5, 0.5, 0.95, 0.32);
    }
    this.fitCamera();
    this.scale.on('resize', () => this.fitCamera());

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.downOnMap = this.onCanvas(p)));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.downOnMap && this.onCanvas(p)) this.onTap(p);
      this.downOnMap = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onHover(p));

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
    const zoom = CAMERA_ZOOM;
    const cam = this.cameras.main;
    cam.setZoom(zoom);
    // Tela maior que a vila: centraliza na horizontal e põe a sobra em cima, onde ela
    // vira mais abismo (o fundo da câmera tem a mesma cor do vazio).
    const bw = Math.max(WORLD_W, width / zoom);
    const bh = Math.max(WORLD_H, height / zoom);
    cam.setBounds((WORLD_W - bw) / 2, WORLD_H - bh, bw, bh);
    this.labelScale = Phaser.Math.Clamp(1 / zoom, 1, 1.8);
    for (const obj of this.children.list) {
      if (obj.name === 'label' && obj instanceof Phaser.GameObjects.Text) obj.setScale(this.labelScale);
    }
    for (const b of this.buildings.values()) b.sign.setScale(this.labelScale);
    for (const grave of this.graves.values()) grave.name.setScale(Math.min(this.labelScale, 1.4));
    this.layoutSigns();
  }

  /** Quadros do 0x72 a partir da tabela e as animações de heróis, monstros e moedas. */
  private registerArt(): void {
    makeTextures(this);
    const sheet = this.textures.get('dungeon');
    for (const [name, [x, y, w, h]] of Object.entries(FRAMES_0X72)) sheet.add(name, 0, x, y, w, h);
    const bodies = new Set<string>([MAYOR_SPRITE]);
    for (const look of Object.values(CLASS_LOOK)) for (const g of ['m', 'f']) bodies.add(`${look.body}_${g}`);
    for (const base of bodies) {
      for (const kind of ['idle', 'run'] as const) {
        this.anims.create({
          key: `${base}_${kind}`,
          frames: animFrames(base, kind).map((frame) => ({ key: 'dungeon', frame })),
          frameRate: kind === 'run' ? 10 : 6,
          repeat: -1,
        });
      }
    }
    this.anims.create({ key: 'coin', frames: [0, 1, 2, 3].map((i) => ({ key: 'dungeon', frame: `coin_anim_f${i}` })), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'fire', frames: [{ key: 'fire0' }, { key: 'fire1' }, { key: 'fire2' }], frameRate: 7, repeat: -1 });
  }

  // ── Prédios e marcos ───────────────────────────────────────────────────

  private createBuilding(id: BuildingId): void {
    const lot = LOTS[id];
    const r = LOT_TILES[id];
    const tiles = this.add.container(r.tx * TILE, r.ty * TILE).setDepth(lot.y + lot.h / 2 - 2);
    const lights = this.add.graphics({ x: r.tx * TILE, y: r.ty * TILE }).setDepth(DEPTH.lights).setBlendMode(Phaser.BlendModes.ADD);
    const sign = label(this, lot.x, lot.y + lot.h / 2 + 2, '', 14);
    const view: BuildingView = { tiles, lights, sign, level: -1 };
    this.buildings.set(id, view);
    this.syncBuilding(id, false);
  }

  private syncBuilding(id: BuildingId, announce: boolean): void {
    const view = this.buildings.get(id)!;
    const level = buildingLevel(this.world, id);
    if (level === view.level) return;
    const lot = LOTS[id];
    drawBuilding(this, view.tiles, view.lights, id, level, LOT_TILES[id]);
    view.sign.setText(level === 0 ? `${BUILDINGS[id].name} · ruína` : `${BUILDINGS[id].name} · nível ${level}`);
    view.sign.setColor(level === 0 ? '#b8a890' : '#f4ecd8');
    if (announce && view.level >= 0 && level > view.level) this.sparkle(lot.x, lot.y + lot.h / 4);
    view.level = level;
    this.layoutSigns();
  }

  /**
   * Placa de cada prédio logo abaixo do lote. Quando dois lotes vizinhos têm nomes
   * largos (Estalagem e Casa de cura), a segunda placa desce uma linha em vez de
   * encostar na primeira. Elas são fixas, então isto só roda quando algo muda.
   */
  private layoutSigns(): void {
    const placed: Phaser.Geom.Rectangle[] = [];
    const signs: { sign: Phaser.GameObjects.Text; lot: (typeof LOTS)[BuildingId] }[] = [];
    for (const id of BUILDING_IDS) {
      const view = this.buildings.get(id);
      if (view) signs.push({ sign: view.sign, lot: LOTS[id] });
    }
    signs.sort((a, b) => a.lot.x - b.lot.x);
    for (const { sign, lot } of signs) {
      const baseY = lot.y + lot.h / 2 + 2;
      sign.setY(baseY);
      let rect = sign.getBounds();
      for (let tries = 0; tries < 3; tries++) {
        const padded = new Phaser.Geom.Rectangle(rect.x - 6, rect.y - 1, rect.width + 12, rect.height + 2);
        if (!placed.some((other) => Phaser.Geom.Intersects.RectangleToRectangle(other, padded))) break;
        sign.setY(sign.y + rect.height + 3);
        rect = sign.getBounds();
      }
      placed.push(rect);
    }
  }

  /**
   * Nomes no mapa sem um por cima do outro: o selecionado e o que está sob o
   * ponteiro sempre aparecem; o resto entra por prioridade (prefeito, prédios,
   * heróis, crianças, túmulos) enquanto couber. A medalha de rank continua
   * visível mesmo quando o nome é escondido.
   */
  private layoutLabels(): void {
    const entries: { obj: Phaser.GameObjects.Text; force: boolean; priority: number }[] = [];
    if (this.mayor) entries.push({ obj: this.mayor.label, force: true, priority: 0 });
    for (const b of this.buildings.values()) entries.push({ obj: b.sign, force: true, priority: 1 });
    const walkers = [...this.heroes.values()].filter((s) => !s.hidden);
    for (const sprite of walkers) {
      const selected = this.ui.selectedHeroId === sprite.id;
      const forced = selected || this.hoverHeroId === sprite.id;
      // Numa multidão (festa, taverna cheia) os nomes viram uma pilha ilegível:
      // só o herói sob o ponteiro ou selecionado mantém o nome. As medalhas ficam.
      const crowd = walkers.filter((other) => other !== sprite && Math.abs(other.x - sprite.x) < 46 && Math.abs(other.y - sprite.y) < 42).length;
      if (!forced && crowd >= 3) {
        sprite.label.setVisible(false);
        continue;
      }
      entries.push({ obj: sprite.label, force: forced, priority: 2 });
    }
    for (const kid of this.kids.values()) if (!kid.hidden) entries.push({ obj: kid.label, force: false, priority: 3 });
    for (const grave of this.graves.values()) entries.push({ obj: grave.name, force: false, priority: 4 });
    entries.sort((a, b) => Number(b.force) - Number(a.force) || a.priority - b.priority || a.obj.y - b.obj.y);
    const taken: Phaser.Geom.Rectangle[] = [];
    for (const entry of entries) {
      const bounds = entry.obj.getBounds();
      const rect = new Phaser.Geom.Rectangle(bounds.x - 4, bounds.y - 1, bounds.width + 8, bounds.height + 2);
      const visible = entry.force || !taken.some((other) => Phaser.Geom.Intersects.RectangleToRectangle(other, rect));
      entry.obj.setVisible(visible);
      if (visible) taken.push(rect);
    }
  }

  private createInteractables(): void {
    const open = (panel: Parameters<UiStore['open']>[0]) => () => this.ui.open(panel);
    const { berrante, quadro, cofre, abismo, cemiterio } = LANDMARKS;
    const cem = CEMETERY_TILES;
    this.interactables = [
      {
        id: 'berrante',
        point: { x: berrante.x, y: berrante.y + 8 },
        hit: { x: HORN_TOWER.tx * TILE, y: HORN_TOWER.ty * TILE, w: HORN_TOWER.tw * TILE, h: 3 * TILE },
        label: () => 'Tocar o berrante',
        open: open({ kind: 'horn' }),
      },
      {
        id: 'quadro',
        point: { x: quadro.x, y: quadro.y + 50 },
        hit: { x: 27 * TILE, y: 15 * TILE, w: 3 * TILE, h: 2 * TILE },
        label: () => 'Quadro de contratos',
        open: open({ kind: 'board' }),
      },
      {
        id: 'cofre',
        point: { x: cofre.x, y: cofre.y + 44 },
        hit: { x: cofre.x - 40, y: cofre.y - 40, w: 80, h: 50 },
        label: () => 'Cofre da vila',
        open: open({ kind: 'coffer' }),
      },
      {
        id: 'abismo',
        point: { x: abismo.x, y: abismo.y + 40 },
        hit: { x: 21 * TILE, y: 2 * TILE, w: 8 * TILE, h: 5 * TILE },
        label: () => 'Olhar o abismo',
        open: open({ kind: 'dungeon' }),
      },
      {
        id: 'discurso',
        point: { x: LANDMARKS.fogueira.x, y: LANDMARKS.fogueira.y + 30 },
        hit: { x: LANDMARKS.fogueira.x - 40, y: LANDMARKS.fogueira.y - 36, w: 80, h: 50 },
        label: (world) => {
          if (world.town.speechDay === dayOf(world.tick)) return 'Já discursou hoje';
          if (world.town.mayorEnergy < 2) return 'Discursar (falta energia)';
          return 'Discursar na praça (2 de energia)';
        },
        open: () => this.speech(),
      },
      {
        id: 'cemiterio',
        point: { x: cemiterio.x, y: cemiterio.y + 40 },
        hit: { x: cem.tx * TILE, y: cem.ty * TILE, w: cem.tw * TILE, h: (cem.th + 1) * TILE },
        label: () => 'Cemitério',
        open: open({ kind: 'memorial' }),
      },
      {
        id: 'portao',
        point: { x: LANDMARKS.portao.x, y: LANDMARKS.portao.y - 20 },
        hit: { x: HORN_TOWER.tx * TILE, y: 14 * TILE, w: HORN_TOWER.tw * TILE, h: 3 * TILE },
        label: () => 'Portão da vila',
        open: open({ kind: 'village' }),
      },
      {
        id: 'termas',
        point: { x: LANDMARKS.termas.x, y: LANDMARKS.termas.y + 8 },
        hit: { x: THERMAL_TILES.tx * TILE, y: THERMAL_TILES.ty * TILE, w: THERMAL_TILES.tw * TILE, h: THERMAL_TILES.th * TILE },
        label: () => 'Fonte termal',
        open: open({ kind: 'thermal' }),
      },
      ...BUILDING_IDS.map<Interactable>((id) => {
        const lot = LOTS[id];
        const d = door(id);
        return {
          id,
          point: { x: d.x, y: d.y + 12 },
          hit: { x: lot.x - lot.w / 2, y: lot.y - lot.h / 2, w: lot.w, h: lot.h },
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

  private speech(): void {
    const result = this.session.run(commands.speech);
    if (!result.ok) {
      this.ui.toast(result.reason, 'warn');
      return;
    }
    this.floatText(this.mayor.x, this.mayor.y - 60, 'Discurso!', '#ffd98a');
    this.sparkle(this.mayor.x, this.mayor.y - 20);
  }

  // ── Prefeito ────────────────────────────────────────────────────────────

  private updateMayor(dt: number): void {
    const axis = moveAxis();
    if (axis.x !== 0 || axis.y !== 0) {
      this.moveTarget = null;
      this.pendingInteract = null;
      const len = Math.hypot(axis.x, axis.y);
      const step = MAYOR_SPEED * dt;
      const next = this.clampWalk({ x: this.mayor.x + (axis.x / len) * step, y: this.mayor.y + (axis.y / len) * step });
      this.mayor.walkBy(next.x - this.mayor.x, next.y - this.mayor.y);
    } else if (this.moveTarget) {
      const arrived = this.mayor.walkTo(this.moveTarget, MAYOR_SPEED * dt);
      if (arrived) this.moveTarget = null;
    } else {
      this.mayor.walkTo({ x: this.mayor.x, y: this.mayor.y }, 0);
    }
    this.mayor.animate(1);

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
    return { x: Phaser.Math.Clamp(p.x, 24, WORLD_W - 24), y: Phaser.Math.Clamp(p.y, ABYSS_EDGE_Y + 44, WORLD_H - 8) };
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
    if (p.getDistance() > 14 || this.input.pointer2?.isDown) return;
    const hero = this.heroAt(p.worldX, p.worldY);
    if (hero) {
      this.ui.open({ kind: 'hero', heroId: hero.id });
      return;
    }
    const citizen = this.citizenAt(p.worldX, p.worldY);
    if (citizen) {
      this.ui.open({ kind: 'village' });
      return;
    }
    const child = [...this.kids.values()].find((c) => c.hits(p.worldX, p.worldY));
    if (child) {
      const parent = child.parents.find((id) => this.world.heroes.some((h) => h.id === id));
      if (parent !== undefined) this.ui.open({ kind: 'hero', heroId: parent });
      return;
    }
    const grave = this.graveAt(p.worldX, p.worldY);
    if (grave !== null) {
      this.ui.open({ kind: 'hero', heroId: grave });
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

  /** Lápide sob o ponteiro: abre a ficha do morto, com o epitáfio. */
  private graveAt(x: number, y: number): number | null {
    for (const [id, g] of this.graves) {
      if (Math.abs(x - g.stone.x) < 14 && y > g.stone.y - 28 && y < g.stone.y + 8) return id;
    }
    return null;
  }

  private onHover(p: Phaser.Input.Pointer): void {
    const hero = this.heroAt(p.worldX, p.worldY);
    this.hoverHeroId = hero?.id ?? null;
    const over = hero || this.graveAt(p.worldX, p.worldY) !== null || this.interactableAt(p.worldX, p.worldY);
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
    this.syncChildren(dt);
    this.syncCitizens(dt);

    const night = nightFactor(world.tick);
    // De dia fica uma névoa fria; à noite escurece de vez.
    this.night.setFillStyle(0x0b0f24, 0.1 + night * 0.45);
    const lightAlpha = 0.2 + 0.8 * night;
    for (const b of this.buildings.values()) b.lights.setAlpha(lightAlpha);
    this.mayor.placeLabels(this.labelScale, night);

    const town = world.town;
    const hornReady = dayOf(world.tick) >= town.hornReadyDay;
    this.horn.ready.setVisible(hornReady);
    this.board.update(town.contracts.length, buildingLevel(world, 'guilda') >= 1);
    this.coffer.update(town.treasury);

    const corruption = Math.max(...world.acts.filter((a) => a.unlocked).map((a) => a.corruption));
    const pulse = 0.08 * Math.sin(this.time.now / 600);
    this.abyss.glow.setAlpha(0.3 + (0.6 * corruption) / 100 + pulse);
    const parties = world.parties.filter((p) => p.outcome !== 'fuga' || p.memberIds.length > 0);
    const fighting = parties.some((p) => p.phase === 'combate');
    const badge = parties.length === 0 ? '' : `${parties.length} ${parties.length === 1 ? 'grupo' : 'grupos'} no abismo${fighting ? ' · em combate' : ''}`;
    if (this.abyss.badge.text !== badge) this.abyss.badge.setText(badge);
    this.abyss.badge.setScale(this.labelScale);

    if (this.time.now >= this.treasuryCheckAt) {
      this.treasuryCheckAt = this.time.now + 700;
      const gain = town.treasury - this.treasurySeen;
      if (!initial && gain >= 5) this.floatText(LANDMARKS.cofre.x + 16, LANDMARKS.cofre.y - 44, `+${Math.round(gain)} ouro`, '#ffd86a');
      this.treasurySeen = town.treasury;
    }
    this.layoutLabels();
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
      const leaving = hero.status === 'left' || (hero.status === 'retired' && !hero.retiredRole);
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
      const arrived = sprite.hidden ? true : sprite.walkTo(commit.point, hero.injury ? step * INJURED_PACE : step);
      if (arrived && commit.arrivedAt === null) commit.arrivedAt = this.walkClock;
      if (arrived && commit.hide && !sprite.hidden) sprite.setHidden(true);
      sprite.animate(this.session.paused ? 0 : this.session.speed);
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

  /** Crianças brincam na praça de dia e somem em casa à noite (só enfeite). */
  private syncChildren(dt: number): void {
    const world = this.world;
    const hour = hourOf(world.tick);
    const day = hour >= 7 && hour < 19;
    const step = this.session.paused ? 0 : CHILD_SPEED * this.session.speed * dt;
    const seen = new Set<number>();
    for (const child of world.children) {
      if (childAge(world, child) < 2) continue;
      seen.add(child.id);
      const target = wanderPoint(child.id + 50_000, Math.floor(world.tick / (2 * TICKS_PER_HOUR)));
      let sprite = this.kids.get(child.id);
      if (!sprite) {
        sprite = new ChildSprite(this, child, target);
        this.kids.set(child.id, sprite);
      }
      sprite.setHidden(!day);
      if (!sprite.hidden) sprite.walkTo(target, step);
      sprite.animate(this.session.paused ? 0 : this.session.speed);
      sprite.placeLabels(this.labelScale);
    }
    for (const [id, sprite] of this.kids) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.kids.delete(id);
    }
  }

  /** Moradores: horário comercial, praça no meio do dia e casa à noite. */
  private syncCitizens(dt: number): void {
    const world = this.world;
    const hour = hourOf(world.tick);
    const day = dayOf(world.tick);
    const night = hour >= 21 || hour < 6;
    const step = this.session.paused ? 0 : CITIZEN_SPEED * this.session.speed * dt;
    const seen = new Set<number>();
    for (const citizen of world.citizens) {
      seen.add(citizen.id);
      const target = citizenSpot(world, citizen, hour, day);
      let sprite = this.citizens.get(citizen.id);
      if (!sprite) {
        sprite = new CitizenSprite(this, citizen, target);
        this.citizens.set(citizen.id, sprite);
      }
      const arrived = sprite.walkTo(target, step);
      // À noite, quem não é guarda nem noctívago entra em casa e some.
      const staysOut = !night || citizen.job === 'guarda' || isNightOwl(citizen);
      const inside = !staysOut && arrived;
      sprite.setHidden(inside);
      if (!inside) sprite.animate(this.session.paused ? 0 : this.session.speed, dt);
    }
    for (const [id, sprite] of this.citizens) {
      if (seen.has(id)) continue;
      sprite.destroy();
      this.citizens.delete(id);
    }
  }

  private citizenAt(x: number, y: number): CitizenSprite | null {
    for (const sprite of this.citizens.values()) if (sprite.hits(x, y)) return sprite;
    return null;
  }

  /** Susto visual da incursão: tremor, clarão vermelho e vultos saindo do abismo. */
  private raidVisual(): void {
    this.cameras.main.shake(320, 0.004);
    const flash = this.add
      .rectangle(-400, -400, WORLD_W + 800, WORLD_H + 800, 0x8a1a2a, 0.18)
      .setOrigin(0)
      .setDepth(DEPTH.night + 1);
    this.tweens.add({ targets: flash, alpha: 0, duration: 1400, onComplete: () => flash.destroy() });
    const frames = ['wogol_idle_anim_f0', 'chort_idle_anim_f0', 'imp_idle_anim_f0', 'skelet_idle_anim_f0'];
    const start = LANDMARKS.abismo;
    for (let i = 0; i < 6; i++) {
      const shade = this.add
        .sprite(start.x + (i - 2.5) * 26, start.y + 26, 'dungeon', frames[i % frames.length]!)
        .setScale(ART_SCALE)
        .setDepth(start.y + 40)
        .setAlpha(0.9);
      this.tweens.add({
        targets: shade,
        x: LANDMARKS.cofre.x + (i - 2.5) * 60,
        y: LANDMARKS.cofre.y + 40 + (i % 3) * 24,
        alpha: 0,
        duration: 2200 + i * 120,
        delay: i * 90,
        ease: 'Cubic.easeIn',
        onComplete: () => shade.destroy(),
      });
    }
    this.floatText(LANDMARKS.cofre.x, LANDMARKS.cofre.y - 120, 'Incursão!', '#ff8a7a');
  }

  private syncGraves(initial: boolean): void {
    const order = graveOrder(this.world);
    if (order.length === this.graves.size) return;
    order.forEach((hero, index) => {
      if (this.graves.has(hero.id)) return;
      const p = gravePoint(index);
      const stone = this.add.image(p.x, p.y, 'grave').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(p.y);
      const name = smooth(this.add.text(p.x, p.y + 2, hero.name, { fontFamily: 'Georgia, serif', fontSize: '10px', color: '#cfc8bb', stroke: '#000', strokeThickness: 3 }))
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.labels)
        .setScale(Math.min(this.labelScale, 1.4));
      if (!initial) {
        stone.setAlpha(0);
        this.tweens.add({ targets: stone, alpha: 1, duration: 1200 });
        this.add.image(p.x, p.y + 6, 'mound').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(p.y - 1);
      }
      this.graves.set(hero.id, { stone, name });
    });
  }

  private onSessionEvent(event: SessionEvent): void {
    if (event.type === 'reset') {
      for (const s of this.heroes.values()) s.destroy();
      this.heroes.clear();
      for (const c of this.kids.values()) c.destroy();
      this.kids.clear();
      for (const c of this.citizens.values()) c.destroy();
      this.citizens.clear();
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
    if (entry.kind === 'incursao') this.raidVisual();
    if (entry.kind === 'morte') {
      const p = LANDMARKS.abismo;
      this.floatText(p.x, p.y - 40, entry.heroIds.length > 1 ? 'Um grupo não voltou' : 'Um herói tombou', '#ff8a7a');
    }
  }

  // ── Efeitos ─────────────────────────────────────────────────────────────

  private floatText(x: number, y: number, text: string, color: string): void {
    const t = smooth(this.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: '16px', color, stroke: '#000', strokeThickness: 4, fontStyle: 'bold' }))
      .setOrigin(0.5)
      .setDepth(DEPTH.floating)
      .setScale(this.labelScale);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private sparkle(x: number, y: number): void {
    for (let i = 0; i < 18; i++) {
      const s = this.add.image(x, y, 'spark').setScale(ART_SCALE).setTint(0xffd86a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.floating);
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
    const ring = this.add.image(p.x, p.y, 'ring').setScale(ART_SCALE).setDepth(p.y - 1);
    this.tweens.add({ targets: ring, scaleX: 0.3, scaleY: 0.3, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
  }
}
