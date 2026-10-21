// Cena da Vila: lê o World a cada quadro e roda o núcleo pela Session (tick fixo).
// Nada aqui muda o mundo diretamente; o prefeito só age por commands via painéis.

import Phaser from 'phaser';
import {
  BUILDING_IDS,
  BUILDINGS,
  buildingLevel,
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
import { PACK_ASSETS, buildingTexture, lightsTexture, packUrl } from './pack.ts';
import { moveAxis } from './keys.ts';
import { CELL, NavGrid, type AlphaMask, type Route } from './nav.ts';
import {
  ABYSS_EDGE_Y,
  CEMETERY_TILES,
  EXPANSION_LOTS,
  citizenSpot,
  door,
  gravePoint,
  graveOrder,
  HORN_TOWER,
  heroDestination,
  isNightOwl,
  LANDMARKS,
  LOTS,
  slotOffset,
  THERMAL_TILES,
  TILE,
  petSpot,
  wanderPoint,
  WORLD_H,
  WORLD_W,
  type Point,
} from './layout.ts';
import { CitizenSprite, ChildSprite, HeroSprite, Mayor, PetSprite, type PetPose } from './sprites.ts';
import {
  buildAbyss,
  buildBoard,
  buildCampfire,
  buildCemetery,
  buildCoffer,
  buildGround,
  buildHornTower,
  buildOvergrowth,
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
  type Solid,
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
const DOG_SPEED = 120;
const CAT_SPEED = 80;
/** Perto assim, o prefeito já faz carinho sem andar. */
const PET_RADIUS = 60;
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

/** Meio da grelha da fornalha (x da arte 112×96, linha 85) em cada nível do ferreiro. */
const FORGE_COALS_X: Record<number, number> = { 1: 84, 2: 91, 3: 97 };

interface BuildingView {
  base: Phaser.GameObjects.Image;
  lights: Phaser.GameObjects.Image;
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
  private pets = new Map<number, PetSprite>();
  /** Depois do primeiro quadro, bicho novo entra pelo portão (ao carregar, já está no lugar). */
  private petsReady = false;
  /** Bicho que o prefeito está indo afagar. */
  private pendingPet: number | null = null;
  private buildings = new Map<BuildingId, BuildingView>();
  private houseLights: Phaser.GameObjects.Image[] = [];
  private propLights: Phaser.GameObjects.Image[] = [];
  private lampHalos: Phaser.GameObjects.Image[] = [];
  /** Fogo da fornalha do ferreiro (arte nova não traz a brasa acesa). */
  private forge: { fire: Phaser.GameObjects.Sprite; glow: Phaser.GameObjects.Image } | null = null;
  private expansionHouses: (Phaser.GameObjects.Image | undefined)[] = [];
  /** Mato do distrito sul enquanto a área não foi limpa (null = ainda não decidido). */
  private overgrowth: Phaser.GameObjects.Image[] | null = null;
  private expansionLights: (Phaser.GameObjects.Image | undefined)[] = [];
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
  /** O que ocupa chão na vila: rotas contornam, o prefeito escorrega. */
  readonly nav = new NavGrid(WORLD_W, WORLD_H);
  private readonly alphas = new Map<string, AlphaMask>();
  private navDebug: Phaser.GameObjects.Graphics | null = null;
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
    for (const a of PACK_ASSETS) {
      // UI/retratos são DOM (SVG/PNG), não texturas do Phaser.
      if (a.type === 'ui-icon' || a.type === 'portrait' || a.type === 'arena-layer' || a.type === 'ui' || a.type === 'web-icon') continue;
      const url = packUrl(a.file);
      const fence = a.id === 'tile/town/cemetery-fence' || a.id === 'tile/town/wood-fence';
      if (a.type === 'character' || a.type === 'fx' || fence) {
        const fw = a.type === 'tileset' ? 16 : a.frameSize![0];
        const fh = a.type === 'tileset' ? 16 : a.frameSize![1];
        this.load.spritesheet(a.id, url, { frameWidth: fw, frameHeight: fh });
      } else {
        this.load.image(a.id, url);
      }
      if (a.lights) this.load.image(lightsTexture(a.id), packUrl(a.lights));
    }
    this.load.json('vigilia-terrain', packUrl('export/tiles/town-terrain.json'));
  }

  create(): void {
    this.registerArt();
    const mask = buildGround(this);
    // O chão já foi assado; daqui para baixo, todo tile-imagem (prédios, cercas,
    // portão, quadro, árvores) usa UVs um pouco para dentro contra o vazamento do atlas.
    insetTownFrames(this);
    this.abyss = buildAbyss(this);
    const solids: Solid[] = [];
    scatterTrees(this, mask, solids);
    buildCemetery(this, solids);
    const props = buildProps(this, solids);
    this.propLights = props.lights;
    this.lampHalos = props.halos;
    buildCampfire(this, solids);
    buildThermal(this, solids);
    this.houseLights = buildCottages(this, solids);
    this.horn = buildHornTower(this, solids);
    this.board = buildBoard(this, solids);
    this.coffer = buildCoffer(this, solids);
    this.nav.setLayer('cenario', this.cellsOf(solids));
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

    // Animações do pack novo (personagens e FX).
    for (const a of PACK_ASSETS) {
      if (a.animations) {
        for (const [name, anim] of Object.entries(a.animations)) {
          this.anims.create({
            key: `${a.id}:${name}`,
            frames: anim.frames.map((frame) => ({ key: a.id, frame })),
            frameRate: anim.fps,
            repeat: name === 'hit' ? 0 : -1,
          });
        }
      }
      if (a.type === 'fx' && a.frames) {
        this.anims.create({
          key: a.id,
          frames: Array.from({ length: a.frames }, (_, i) => ({ key: a.id, frame: i })),
          frameRate: a.fps ?? 8,
          repeat: -1,
        });
      }
    }
  }

  // ── Prédios e marcos ───────────────────────────────────────────────────

  private createBuilding(id: BuildingId): void {
    const lot = LOTS[id];
    const y = lot.y + lot.h / 2;
    const base = this.add.image(lot.x, y, buildingTexture(id, 1)).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y - 2);
    const lights = this.add.image(lot.x, y, lightsTexture(buildingTexture(id, 1))).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(DEPTH.lights).setAlpha(0);
    const sign = label(this, lot.x, y + 2, '', 14);
    const view: BuildingView = { base, lights, sign, level: -1 };
    this.buildings.set(id, view);
    this.syncBuilding(id, false);
  }

  private syncBuilding(id: BuildingId, announce: boolean): void {
    const view = this.buildings.get(id)!;
    const level = buildingLevel(this.world, id);
    if (level === view.level) return;
    const lot = LOTS[id];
    const texture = buildingTexture(id, level);
    view.base.setTexture(texture);
    if (this.textures.exists(lightsTexture(texture))) {
      view.lights.setTexture(lightsTexture(texture));
      view.lights.setVisible(true);
    } else {
      view.lights.setVisible(false);
    }
    this.nav.setLayer(`predio:${id}`, this.cellsOf([{ key: texture, x: lot.x, y: lot.y + lot.h / 2 }]));
    if (id === 'ferreiro') this.syncForge(level);
    view.sign.setText(level === 0 ? `${BUILDINGS[id].name} · ruína` : `${BUILDINGS[id].name} · nível ${level}`);
    view.sign.setColor(level === 0 ? '#b8a890' : '#f4ecd8');
    if (announce && view.level >= 0 && level > view.level) this.sparkle(lot.x, lot.y + lot.h / 4);
    view.level = level;
    this.layoutSigns();
  }

  /**
   * Brasa da fornalha do ferreiro: a arte só traz uns pixels apagados no anexo da direita.
   * Acende fogo e halo sobre a grelha (que anda para a direita a cada nível).
   */
  private syncForge(level: number): void {
    if (!this.forge) {
      const fire = this.add.sprite(0, 0, 'fx/fire').setOrigin(0.5, 1).setScale(1).play('fx/fire');
      const glow = this.add.image(0, 0, 'glow').setTint(0xff7a2a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights).setScale(1.6, 1.2);
      this.forge = { fire, glow };
    }
    const coalX = FORGE_COALS_X[level];
    const lit = level >= 1 && coalX !== undefined;
    this.forge.fire.setVisible(lit);
    this.forge.glow.setVisible(lit);
    if (!lit) return;
    const lot = LOTS.ferreiro;
    const bottom = lot.y + lot.h / 2;
    // Arte de 112×96 com origem no pé do meio: pixel (ax, ay) vai para lot.x − 112 + 2ax, bottom − 192 + 2ay.
    const x = lot.x - 112 + coalX * ART_SCALE;
    const y = bottom - 96 * ART_SCALE + 86 * ART_SCALE;
    this.forge.fire.setPosition(x, y).setDepth(bottom - 1);
    this.forge.glow.setPosition(x, y - 6);
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



  /** Casas do distrito sul aparecem conforme o prefeito constrói cada lote. */
  private syncExpansion(): void {
    const expansion = this.world.town.expansion;
    if (!expansion.cleared && this.overgrowth === null) {
      const growth = buildOvergrowth(this);
      this.overgrowth = growth.images;
      this.nav.setLayer('mato', this.cellsOf(growth.solids));
    } else if (expansion.cleared && this.overgrowth !== null) {
      // Limpou: o mato some aos poucos e o caminho para os lotes abre.
      for (const img of this.overgrowth) {
        this.tweens.add({ targets: img, alpha: 0, duration: 700, delay: Math.random() * 500, onComplete: () => img.destroy() });
      }
      this.overgrowth = null;
      this.nav.setLayer('mato', []);
    }
    EXPANSION_LOTS.forEach((lot, i) => {
      const built = expansion.houses[i] === true;
      if (built && !this.expansionHouses[i]) {
        const x = (lot.tx + lot.tw / 2) * TILE;
        const y = (lot.ty + lot.th) * TILE;
        const id = `building/house/0${i + 1}`;
        this.expansionHouses[i] = this.add.image(x, y, id).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y);
        this.nav.setLayer(`casa-nova:${i}`, this.cellsOf([{ key: id, x, y }]));
        this.expansionLights[i] = this.add
          .image(x, y, `${id}-lights`)
          .setOrigin(0.5, 1)
          .setScale(ART_SCALE)
          .setDepth(DEPTH.lights)
          .setAlpha(0);
      } else if (!built && this.expansionHouses[i]) {
        this.expansionHouses[i]!.destroy();
        this.expansionLights[i]?.destroy();
        this.expansionHouses[i] = undefined;
        this.expansionLights[i] = undefined;
        this.nav.setLayer(`casa-nova:${i}`, []);
      }
    });
  }

  private createInteractables(): void {
    const open = (panel: Parameters<UiStore['open']>[0]) => () => this.ui.open(panel);
    const { berrante, quadro, cofre, abismo, cemiterio } = LANDMARKS;
    const cem = CEMETERY_TILES;
    this.interactables = [
      {
        id: 'berrante',
        point: { x: berrante.x, y: berrante.y + 8 },
        // Metade de cima da guarita (o berrante fica acima da viga); a passagem é o portão.
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
        hit: { x: abismo.x - 2.5 * TILE, y: abismo.y - 4 * TILE, w: 5 * TILE, h: 5 * TILE },
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
        hit: { x: (HORN_TOWER.tx + 1) * TILE, y: (HORN_TOWER.ty + 3) * TILE, w: (HORN_TOWER.tw - 2) * TILE, h: (HORN_TOWER.th - 3) * TILE + 16 },
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
    if (id.startsWith('pet:')) {
      this.petPet(Number(id.slice(4)));
      return;
    }
    this.interactables.find((i) => i.id === id)?.open();
  }

  // ── Cães e gatos ────────────────────────────────────────────────────────

  private petAt(x: number, y: number): PetSprite | null {
    for (const s of this.pets.values()) if (s.hits(x, y)) return s;
    return null;
  }

  private nearestPet(): PetSprite | null {
    let best: PetSprite | null = null;
    let bestDist = PET_RADIUS;
    for (const s of this.pets.values()) {
      const d = Math.hypot(s.x - this.mayor.x, s.y - this.mayor.y);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return best;
  }

  /** Clicou num bicho: perto, faz carinho; longe, o prefeito vai até ele. */
  private approachPet(sprite: PetSprite): void {
    this.pendingInteract = null;
    if (Math.hypot(sprite.x - this.mayor.x, sprite.y - this.mayor.y) < PET_RADIUS) {
      this.petPet(sprite.id);
      return;
    }
    this.pendingPet = sprite.id;
  }

  /** Enquanto vai afagar, segue o bicho (ele pode estar andando) e faz carinho ao chegar. */
  private followPet(): void {
    if (this.pendingPet === null) return;
    const sprite = this.pets.get(this.pendingPet);
    if (!sprite) {
      this.pendingPet = null;
      return;
    }
    if (Math.hypot(sprite.x - this.mayor.x, sprite.y - this.mayor.y) < PET_RADIUS - 16) {
      this.moveTarget = null;
      this.pendingPet = null;
      this.petPet(sprite.id);
      return;
    }
    this.moveTarget = { x: sprite.x + (this.mayor.x < sprite.x ? -26 : 26), y: sprite.y + 4 };
  }

  private petPet(id: number): void {
    const sprite = this.pets.get(id);
    if (!sprite) return;
    const result = this.session.run(commands.petAnimal, id);
    if (!result.ok) {
      this.ui.toast(result.reason, 'warn');
      return;
    }
    sprite.faceTowards(this.mayor.x);
    sprite.happyUntil = this.time.now + 1800;
    this.floatText(sprite.x - 6, sprite.y - 30, '♥', '#ff8aa0');
    this.time.delayedCall(350, () => this.floatText(sprite.x + 8, sprite.y - 38, '♥', '#ff8aa0'));
    this.ui.toast(sprite.species === 'cao' ? `${sprite.name} abanou o rabo.` : `${sprite.name} ronronou.`, 'good');
  }

  /** Cães e gatos: passeiam pelos lugares deles, dormem à noite e chegam pelo portão. */
  private syncPets(dt: number): void {
    const world = this.world;
    const hour = hourOf(world.tick);
    const day = dayOf(world.tick);
    const night = hour >= 21 || hour < 6;
    const rate = this.session.paused ? 0 : this.session.speed;
    const seen = new Set<number>();
    for (const pet of world.town.pets ?? []) {
      seen.add(pet.id);
      const target = petSpot(pet, hour, day);
      let sprite = this.pets.get(pet.id);
      if (!sprite) {
        sprite = new PetSprite(this, pet, this.petsReady ? LANDMARKS.portao : target);
        this.pets.set(pet.id, sprite);
      }
      if (this.time.now < sprite.happyUntil) {
        sprite.animate('happy', 1);
        continue;
      }
      const step = (pet.species === 'cao' ? DOG_SPEED : CAT_SPEED) * rate * dt;
      const arrived = this.travel(sprite, target, step);
      const rest: PetPose = night ? 'sleep' : pet.species === 'gato' || (pet.id + day) % 3 === 0 ? 'sit' : 'idle';
      sprite.animate(arrived ? rest : 'walk', rate);
    }
    // Foi embora: some aos poucos.
    for (const [id, sprite] of this.pets) {
      if (seen.has(id)) continue;
      this.pets.delete(id);
      this.tweens.add({ targets: sprite.root, alpha: 0, duration: 900, onComplete: () => sprite.destroy() });
    }
    this.petsReady = true;
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
      this.pendingPet = null;
      const len = Math.hypot(axis.x, axis.y);
      const step = MAYOR_SPEED * dt;
      const next = this.clampWalk({ x: this.mayor.x + (axis.x / len) * step, y: this.mayor.y + (axis.y / len) * step });
      const free = this.nav.slide(this.mayor, next.x - this.mayor.x, next.y - this.mayor.y);
      this.mayor.walkBy(free.x - this.mayor.x, free.y - this.mayor.y);
      this.mayor.route.reset();
    } else if (this.moveTarget) {
      const arrived = this.travel(this.mayor, this.moveTarget, MAYOR_SPEED * dt, false);
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
    this.followPet();
    const pet = near ? null : this.nearestPet();
    this.ui.setPrompt(near ? { id: near.id, label: near.label(this.world) } : pet ? { id: `pet:${pet.id}`, label: `Fazer carinho em ${pet.name}` } : null);
  }

  // ── Chão ocupado ────────────────────────────────────────────────────────

  /** Transparência de uma textura do pack (lida uma vez por quadro de imagem). */
  private alphaOf(key: string, frame?: number): AlphaMask | null {
    const id = `${key}#${frame ?? ''}`;
    const cached = this.alphas.get(id);
    if (cached) return cached;
    if (!this.textures.exists(key)) return null;
    const f = this.textures.getFrame(key, frame);
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!f || !ctx) return null;
    ctx.canvas.width = f.cutWidth;
    ctx.canvas.height = f.cutHeight;
    ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
    const rgba = ctx.getImageData(0, 0, f.cutWidth, f.cutHeight).data;
    const alpha = new Uint8Array(f.cutWidth * f.cutHeight);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3]!;
    const mask = { w: f.cutWidth, h: f.cutHeight, alpha };
    this.alphas.set(id, mask);
    return mask;
  }

  private cellsOf(solids: Solid[]): number[] {
    const cells: number[] = [];
    for (const s of solids) {
      const mask = this.alphaOf(s.key, s.frame);
      if (!mask) continue;
      const [ox, oy] = s.origin ?? [0.5, 1];
      cells.push(...this.nav.footprint(mask, s.x - mask.w * ART_SCALE * ox, s.y - mask.h * ART_SCALE * oy, ART_SCALE, s.opts));
    }
    return cells;
  }

  /**
   * Anda pela rota que contorna o que ocupa chão. `hurry` acelera o passo nos desvios
   * (heróis e moradores têm hora para chegar); o prefeito anda no próprio ritmo.
   */
  private travel(sprite: { x: number; y: number; route: Route; walkTo(p: Point, step: number): boolean }, target: Point, step: number, hurry = true): boolean {
    const pace = hurry ? step * sprite.route.stretch : step;
    const next = sprite.route.toward(this.nav, sprite, target, pace);
    return sprite.walkTo(next, hurry ? step * sprite.route.stretch : step) && sprite.route.last;
  }

  /** Para conferir: pinta as células bloqueadas (vigilia.renderer → cena 'village'). */
  debugNav(on = true): void {
    this.navDebug?.destroy();
    this.navDebug = null;
    if (!on) return;
    const g = this.add.graphics().setDepth(DEPTH.floating - 1);
    g.fillStyle(0xff3030, 0.35);
    for (let cy = 0; cy < this.nav.rows; cy++) {
      for (let cx = 0; cx < this.nav.cols; cx++) {
        if (this.nav.blockedCell(cx, cy)) g.fillRect(cx * CELL, cy * CELL, CELL, CELL);
      }
    }
    this.navDebug = g;
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
    const pet = this.petAt(p.worldX, p.worldY);
    if (pet) {
      this.approachPet(pet);
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
    const over = hero || this.petAt(p.worldX, p.worldY) || this.graveAt(p.worldX, p.worldY) !== null || this.interactableAt(p.worldX, p.worldY);
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
    this.syncPets(dt);
    this.syncExpansion();

    const night = nightFactor(world.tick);
    // De dia fica uma névoa fria; à noite escurece de vez.
    this.night.setFillStyle(0x0b0f24, 0.1 + night * 0.45);
    const lightAlpha = Phaser.Math.Clamp((night - 0.1) / 0.5, 0, 1);
    for (const b of this.buildings.values()) b.lights.setAlpha(lightAlpha);
    for (const light of this.houseLights) light.setAlpha(lightAlpha);
    for (const light of this.propLights) light.setAlpha(lightAlpha);
    // Halo dos lampiões: como a lanterna do prefeito, tremulando um pouco.
    const flicker = 0.9 + 0.1 * Math.sin(this.time.now / 170);
    for (const halo of this.lampHalos) halo.setAlpha((0.15 + 0.75 * night) * Math.min(1, lightAlpha * 1.5) * flicker);
    if (this.forge?.glow.visible) this.forge.glow.setAlpha((0.35 + 0.45 * night) * (0.85 + 0.15 * Math.sin(this.time.now / 90)));
    for (const light of this.expansionLights) light?.setAlpha(lightAlpha);
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
        sprite.route.reset();
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
      const arrived = sprite.hidden ? true : this.travel(sprite, commit.point, hero.injury ? step * INJURED_PACE : step);
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
    // Aparecem desde que nascem: o nascimento sai na crônica e já se vê na praça.
    for (const child of world.children) {
      seen.add(child.id);
      const target = wanderPoint(child.id + 50_000, Math.floor(world.tick / (2 * TICKS_PER_HOUR)));
      let sprite = this.kids.get(child.id);
      if (!sprite) {
        sprite = new ChildSprite(this, child, target);
        this.kids.set(child.id, sprite);
      }
      sprite.setHidden(!day);
      if (!sprite.hidden) this.travel(sprite, target, step, false);
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
      const arrived = this.travel(sprite, target, step);
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
      const stone = this.add.image(p.x, p.y, 'decal/grave').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(p.y);
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
      for (const p of this.pets.values()) p.destroy();
      this.pets.clear();
      this.petsReady = false;
      this.pendingPet = null;
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
