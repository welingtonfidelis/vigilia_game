// Cena da Vila: lê o World a cada quadro e roda o núcleo pela Session (tick fixo).
// Nada aqui muda o mundo diretamente; o prefeito só age por commands via painéis.

import Phaser from 'phaser';
import {
  abyssPressure,
  BALANCE,
  BIOMES,
  BUILDING_IDS,
  BUILDINGS,
  buildingLevel,
  careOf,
  commands,
  repairOf,
  dayOf,
  seasonOf,
  snowCover,
  weatherOn,
  hourOf,
  TICKS_PER_HOUR,
  hallLevel,
  hallStatues,
  housesOf,
  DECOR_BY_ID,
  decorOf,
  STREETS,
  streetName,
  villageBanner,
} from '../sim/index.ts';
import { CREST_TINCTURES } from '../data/houses.ts';
import { statueTexture } from './statue.ts';
import type { BuildingId, ChronicleEntry, Crest, Hero, StreetId, WeatherKind, World } from '../sim/index.ts';
import type { Session, SessionEvent } from '../game/session.ts';
import type { UiStore } from '../ui/store.ts';
import { makeTextures } from './art.ts';
import { ART_SCALE, MONSTERS, type MonsterLook } from './assets.ts';
import { PACK_ASSETS, artLevel, buildingTexture, heroSpriteId, lightsTexture, packUrl } from './pack.ts';
import { scaffoldTexture, snowTexture, wearTexture } from './scaffold.ts';
import { moveAxis } from './keys.ts';
import { CELL, NavGrid, type AlphaMask, type Route } from './nav.ts';
import {
  ABYSS_EDGE_Y,
  AUDIENCE_TABLE,
  CEMETERY_TILES,
  EXPANSION_LOTS,
  HALL,
  HALL_TILES,
  PLAZA,
  PALANQUE,
  MARKET_STALLS,
  BARD_SPOT,
  marketHours,
  bardHours,
  PACO,
  PACO_TILES,
  FLAG_POLES,
  BUST_SPOT,
  STREET_SIGNS,
  DECOR_SPOTS,
  citizenSpot,
  door,
  gravePoint,
  standingGraves,
  HORN_STAND,
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
import { alphaOf, blobs } from './fx/alpha.ts';
import { LightingSystem, type LightSpec } from './fx/lighting.ts';
import { ParticleSystem, type EmitterSpec } from './fx/particles.ts';
import { ShadowLayer, type Caster } from './fx/shadows.ts';
import { registerWind, TREES } from './fx/wind.ts';
import type { FogSystem } from './fx/fog.ts';
import type { ParallaxLayer } from './fx/parallax.ts';
import { faceCells } from './relief.ts';
import { playArt, preload32, registerAnims32, showArt } from './art32.ts';
import { buildGround, type GroundSeasons } from './terrain.ts';
import { WeatherSystem } from './fx/weather.ts';
import {
  buildAbyss,
  buildBoard,
  buildCampfire,
  buildCemetery,
  buildCoffer,
  buildHornTower,
  buildOvergrowth,
  buildProps,
  buildCottages,
  buildDecor,
  buildFog,
  buildForeground,
  DECOR,
  buildThermal,
  DEPTH,
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
/** Nomes de heróis e crianças aparecem perto do prefeito (e sempre sob o ponteiro ou selecionados). */
const NAME_RADIUS = 200;
/**
 * Zoom fixo: o mapa é um recorte que acompanha o prefeito, como no Tristram. 1,5× na
 * tela grande; no celular (lado curto menor que SMALL_SCREEN px) 1×, para caber mais
 * vila na tela. Os dois deixam o pixel da arte inteiro (3 e 2 px de tela).
 */
const CAMERA_ZOOM = 1.5;
const CAMERA_ZOOM_SMALL = 1;
const SMALL_SCREEN = 600;

interface Interactable {
  id: string;
  point: Point;
  hit: { x: number; y: number; w: number; h: number };
  label: (world: World) => string;
  open: () => void;
}

/** Não projetam sombra: a bacia da fonte é chata no chão e a fogueira é a própria luz. */
const NO_SHADOW = new Set(['prop/thermal/basin', 'prop/campfire/on']);

/**
 * Bocas de chaminé por prédio e nível (pixel da arte 112×96, medidos no pack). Taverna,
 * estalagem e casa de cura só ganham chaminé do nível 2 em diante; o ferreiro em todos.
 */
const CHIMNEYS: Partial<Record<BuildingId, Record<number, [number, number][]>>> = {
  taverna: { 2: [[24.5, 27]], 3: [[16, 10], [93, 14.5]] },
  estalagem: { 2: [[87, 19.5]], 3: [[11.5, 12.5], [98, 12.5]] },
  casa: { 2: [[27.5, 35]], 3: [[91, 20]] },
  ferreiro: { 1: [[28, 28.5]], 2: [[21, 22.5]], 3: [[15, 16.5]] },
};

/** Fumaça fica acima de todo mundo que anda, mas abaixo do mapa de luz (escurece à noite). */
const SMOKE_DEPTH = 9000;

/** Meio da grelha da fornalha (x da arte 112×96, linha 85) em cada nível do ferreiro. */
const FORGE_COALS_X: Record<number, number> = { 1: 84, 2: 91, 3: 97 };

interface CosmeticsView {
  paco: { base: Phaser.GameObjects.Image; lights: Phaser.GameObjects.Image; sign: Phaser.GameObjects.Text } | null;
  /** Panos nas cores da vila (sacada do Paço, flâmulas, bandeirolas), cada um na profundidade do que o segura. */
  cloth: Phaser.GameObjects.Graphics[];
  decor: Phaser.GameObjects.Image[];
  decorLights: Phaser.GameObjects.Image[];
  signs: Map<StreetId, Phaser.GameObjects.Text>;
  bust: Phaser.GameObjects.Image[];
  state: string;
}

interface HallView {
  base: Phaser.GameObjects.Image;
  lights: Phaser.GameObjects.Image;
  sign: Phaser.GameObjects.Text;
  banners: Phaser.GameObjects.Graphics;
  pedestals: Phaser.GameObjects.Image[];
  statues: Phaser.GameObjects.Image[];
  /** Herói de cada estátua, na mesma ordem (o toque abre a ficha). */
  statueIds: number[];
  level: number;
  state: string;
}

/** Céu fechado de cada clima (somado ao anoitecer): a chuva e a neve escurecem a vila. */
const GLOOM: Record<WeatherKind, number> = { limpo: 0, vento: 0.05, garoa: 0.12, neve: 0.12, chuva: 0.3, nevasca: 0.32, tempestade: 0.5 };

/**
 * A árvore da estação: o pinheiro só ganha neve; a de folha floresce na primavera, fica de
 * outono e perde as folhas no inverno; as de outono do pack também ficam nuas no inverno.
 */
function seasonTree(base: string, season: number, snowy: boolean): string {
  const bare = snowy ? 'prop/tree/dead-snow' : 'prop/tree/dead';
  switch (base) {
    case 'prop/tree/pine':
      return season === 3 && snowy ? 'prop/tree/pine-snow' : base;
    case 'prop/tree/01':
      return season === 0 ? 'prop/tree/01-flor' : season === 2 ? 'prop/tree/autumn-small' : season === 3 ? bare : base;
    case 'prop/tree/autumn':
    case 'prop/tree/autumn-small':
    case 'prop/tree/dead':
      return season === 3 ? bare : base;
    default:
      return base;
  }
}

/** Arte do Salão (16-bit): 112 × 96, com o pé no meio de baixo. */
const HALL_SIZE: [number, number] = [112, 96];
const PEDESTAL = 'prop/salao/pedestal';
const MASTRO = 'prop/vila/mastro';
const BUST = 'prop/vila/busto';
/**
 * Pedestais: x em tiles a partir do meio da porta e o pé abaixo do pé do prédio (px do mundo).
 * Os dois primeiros ladeiam a escada, por fora dos braseiros, e o segundo par vai para os
 * cantos; o terceiro vem à frente da escada, dos dois lados da passagem, como uma avenida.
 */
const PEDESTALS: [number, number][] = [
  [-2.5, 30],
  [2.5, 30],
  [-3.7, 34],
  [3.7, 34],
  [-1.5, 62],
  [1.5, 62],
];
/** As estátuas um pouco menores que o herói vivo, para caber o arco no pátio. */
const STATUE_SCALE = 0.85;
/** Meio do pano de cada suporte de estandarte e a linha onde ele começa, por nível (px da arte 16-bit). */
const HALL_BANNERS: Record<number, [number, number][]> = {
  1: [],
  2: [
    [33, 64],
    [79, 64],
  ],
  3: [
    [31, 64],
    [81, 64],
    [17, 64],
    [95, 64],
  ],
};
/** Paço do prefeito (M6 F6): tamanho da arte 16-bit e onde o estandarte pende da sacada. */
const PACO_SIZE: [number, number] = [96, 80];
const PACO_BANNER: [number, number] = [48, 51];
/** Ponto de amarra da flâmula no mastro, das pontas da bandeirola e o tampo da coluna do busto (px da arte 16-bit). */
const MASTRO_TIP: [number, number] = [5, 4];
const BUNTING_TIPS: [[number, number], [number, number]] = [
  [2, 2],
  [26, 2],
];
const BUST_TOP = 2;

/** Braseiros acesos dos dois lados da escada (meio da chama, px da arte 16-bit). */
const HALL_BRAZIERS: Record<number, [number, number][]> = {
  1: [],
  2: [
    [34, 83],
    [77, 83],
  ],
  3: [
    [28, 83],
    [83, 83],
  ],
};

const tincture = (i: number, fallback: string): number => Phaser.Display.Color.HexStringToColor(CREST_TINCTURES[i]?.color ?? fallback).color;
const CLOTH_EDGE = 0x17120f;

/** Estandarte pendurado (M6 F5/F6): pano na cor do campo, faixa da figura e ponta de andorinha. Tamanho em px da arte. */
function hangingBanner(g: Phaser.GameObjects.Graphics, left: number, top: number, w16: number, h16: number, crest: Crest): void {
  const w = w16 * ART_SCALE;
  const h = h16 * ART_SCALE;
  g.fillStyle(CLOTH_EDGE, 1).fillRect(left - 1, top - 1, w + 2, h + 1);
  g.fillStyle(tincture(crest.field, '#5a2a2a'), 1).fillRect(left, top, w, h);
  g.fillStyle(CLOTH_EDGE, 1).fillTriangle(left + w / 2 - ART_SCALE * 1.5, top + h, left + w / 2 + ART_SCALE * 1.5, top + h, left + w / 2, top + h - ART_SCALE * 2);
  g.fillStyle(tincture(crest.charge, '#d8a842'), 1).fillRect(left + w / 2 - ART_SCALE, top + ART_SCALE * 2, ART_SCALE * 2, h - ART_SCALE * 6);
}

/** Flâmula de mastro: sai do ponto de amarra para a direita, com a ponta cortada. Tamanho em px da arte. */
function pennant(g: Phaser.GameObjects.Graphics, x: number, y: number, crest: Crest): void {
  const w = 10 * ART_SCALE;
  const h = 7 * ART_SCALE;
  g.fillStyle(CLOTH_EDGE, 1).fillRect(x, y - 1, w + 1, h + 2);
  g.fillStyle(tincture(crest.field, '#5a2a2a'), 1).fillRect(x + 1, y, w - 1, h);
  g.fillStyle(CLOTH_EDGE, 1).fillTriangle(x + w + 1, y - 1, x + w + 1, y + h + 1, x + w - ART_SCALE * 3, y + h / 2);
  g.fillStyle(tincture(crest.charge, '#d8a842'), 1).fillRect(x + ART_SCALE * 2, y + h / 2 - ART_SCALE, ART_SCALE * 4, ART_SCALE * 2);
}

/** Bandeirola: o cordão entre as duas pontas e as bandeirinhas alternando as cores. */
function bunting(g: Phaser.GameObjects.Graphics, a: Point, b: Point, crest: Crest): void {
  const sag = 3 * ART_SCALE;
  const at = (t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(Math.PI * t) * sag });
  g.lineStyle(1, CLOTH_EDGE, 1);
  g.beginPath();
  for (let i = 0; i <= 12; i++) {
    const p = at(i / 12);
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  }
  g.strokePath();
  const flags = 5;
  for (let i = 0; i < flags; i++) {
    const p = at((i + 0.5) / (flags + 0.5) + 0.05);
    g.fillStyle(tincture(i % 2 ? crest.charge : crest.field, '#5a2a2a'), 1).fillTriangle(p.x - ART_SCALE * 2, p.y, p.x + ART_SCALE * 2, p.y, p.x, p.y + ART_SCALE * 4);
  }
}

/** Altura do pedestal na arte 16-bit; o pé da estátua fica na linha 2 do tampo (3 px abaixo do alto). */
const pedestalHeight = (scene: Phaser.Scene): number => scene.textures.getFrame(PEDESTAL)?.height ?? 10;
const PEDESTAL_FOOT = 3;

interface BuildingView {
  base: Phaser.GameObjects.Image;
  lights: Phaser.GameObjects.Image;
  /** Andaime do conserto e marcas de desgaste (M5 F4), sobre a arte. */
  scaffold: Phaser.GameObjects.Image;
  wear: Phaser.GameObjects.Image;
  sign: Phaser.GameObjects.Text;
  level: number;
  /** Nível, obra e faixa de desgaste da última sincronização: só redesenha quando muda. */
  state: string;
}

/** Lápide sem nome: quem está ali se vê no Memorial, ao clicar no cemitério. */
interface GraveView {
  stone: Phaser.GameObjects.Image;
  /** Flores da lápide nova, paga pelo prefeito a pedido de quem ficou (M6 F1). */
  flowers?: Phaser.GameObjects.Image;
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
  /** Salão das Lendas (M6 F5): prédio só de aparência, pedestais com estátuas e estandartes. */
  private hall: HallView | null = null;
  /** Cosmética da vila (M6 F6): Paço, mastros, enfeites, placas e busto. */
  private cosmetics: CosmeticsView | null = null;
  /** Clima das estações (M6 F6): o chão por estação, as partículas e o que já foi aplicado. */
  private groundSeasons: GroundSeasons | null = null;
  private weather: WeatherSystem | null = null;
  /** Praça de encontro (M6 F6): barracas da feira com os vendedores e o bardo, que aparecem na hora. */
  private plaza: { stalls: Phaser.GameObjects.GameObject[]; bard: Phaser.GameObjects.GameObject[]; notes: Phaser.GameObjects.Particles.ParticleEmitter | null; market: boolean; music: boolean } | null = null;
  private seasonState = '';
  /** Neve dos telhados, por prédio (a mesma origem da arte 16-bit), e a transparência de agora. */
  private roofs = new Map<string, Phaser.GameObjects.Image>();
  private roofSnowAlpha = 0;
  private houseLights: Phaser.GameObjects.Image[] = [];
  private propLights: Phaser.GameObjects.Image[] = [];
  /** Fogo da fornalha do ferreiro (arte nova não traz a brasa acesa). */
  private forgeFire: Phaser.GameObjects.Sprite | null = null;
  /** Sombras projetadas e oclusão de tudo que fica parado (Fase 1 do visual 2.5D). */
  private shadows!: ShadowLayer;
  /** Mapa de luz: noite fria e as fontes de luz da vila (Fase 2). */
  private lighting!: LightingSystem;
  private particles!: ParticleSystem;
  /** Neblina rasteira e copas em primeiro plano nas bordas (Fase 4). */
  private fog!: FogSystem;
  private foreground!: ParallaxLayer;
  private vignette: Phaser.FX.Vignette | null = null;
  private grade: Phaser.FX.ColorMatrix | null = null;
  /** Último nível de noite aplicado na correção de cor (refaz só quando muda). */
  private gradedNight = -1;
  private expansionHouses: (Phaser.GameObjects.Image | undefined)[] = [];
  /** Mato do distrito sul enquanto a área não foi limpa (null = ainda não decidido). */
  private overgrowth: Phaser.GameObjects.Image[] | null = null;
  private expansionLights: (Phaser.GameObjects.Image | undefined)[] = [];
  private graves = new Map<number, GraveView>();
  /** Mortos na última sincronização das covas (−1 = refazer). */
  private graveCount = -1;
  private interactables: Interactable[] = [];
  private mayor!: Mayor;
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
    preload32(this.load, this.textures);
  }

  create(): void {
    this.registerArt();
    registerAnims32(this);
    registerWind(this.game);
    this.shadows = new ShadowLayer(this, WORLD_W, WORLD_H, DEPTH.shadow);
    this.lighting = new LightingSystem(this, { x: -400, y: -400, width: WORLD_W + 800, height: WORLD_H + 800, depth: DEPTH.night, haloDepth: DEPTH.lights });
    this.particles = new ParticleSystem(this);
    this.weather = new WeatherSystem(this, DEPTH.floating - 1);
    const { mask, seasons: groundSeasons } = buildGround(this);
    this.groundSeasons = groundSeasons;
    this.abyss = buildAbyss(this);
    const solids: Solid[] = [];
    scatterTrees(this, mask, solids);
    buildCemetery(this, solids);
    const props = buildProps(this, solids);
    buildDecor(this, solids);
    this.propLights = props.lights;
    buildCampfire(this, solids);
    buildThermal(this, solids);
    this.houseLights = buildCottages(this, solids);
    this.horn = buildHornTower(this, solids);
    this.board = buildBoard(this, solids);
    this.coffer = buildCoffer(this, solids);
    this.nav.setLayer('cenario', this.cellsOf(solids));
    // Paredões de rocha entre os níveis: só se passa pelas escadarias.
    this.nav.setLayer('relevo', faceCells(this.nav.cols, this.nav.rows, CELL));
    // Sombra de tudo que ocupa chão, menos o que é chato (a bacia da fonte) ou é fogo.
    this.shadows.set('cenario', solids.filter((s) => !NO_SHADOW.has(s.key)).map((s) => this.caster(s)));
    this.sceneryLights(props.lamps);
    this.fog = buildFog(this);
    this.foreground = buildForeground(this);
    for (const id of BUILDING_IDS) this.createBuilding(id);
    this.createHall();
    this.createCosmetics();
    this.createPlaza();
    this.createInteractables();
    this.layoutSigns();

    this.mayor = new Mayor(this, LANDMARKS.fogueira.x + 50, LANDMARKS.fogueira.y + 30);
    // Lanterna do prefeito: anda com ele, do lado da mão.
    this.lighting.add({
      x: this.mayor.x,
      y: this.mayor.y,
      follow: () => ({ x: this.mayor.x + (this.mayor.facingLeft ? -10 : 10), y: this.mayor.y - 16 }),
      color: 0xffb04a,
      radius: 130,
      intensity: 0.6,
      flicker: 0.12,
      halo: { scaleX: 1.8, scaleY: 1.8, day: 0.12, night: 0.55 },
    });
    const cam = this.cameras.main;
    cam.setBackgroundColor('#07060a');
    cam.setRoundPixels(true);
    cam.startFollow(this.mayor.root, true, 0.12, 0.12);
    // Fantasia sombria: tira um pouco de saturação e brilho da cena inteira.
    if (this.game.renderer.type === Phaser.WEBGL) {
      this.grade = cam.postFX.addColorMatrix();
      this.applyGrade(0);
      this.vignette = cam.postFX.addVignette(0.5, 0.5, 0.95, 0.32);
    }
    this.fitCamera();
    const onResize = () => this.fitCamera();
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize));

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
    const zoom = Math.min(width, height) < SMALL_SCREEN ? CAMERA_ZOOM_SMALL : CAMERA_ZOOM;
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
    this.layoutSigns();
  }

  /** Texturas desenhadas em código e as animações do pack (personagens e FX). */
  private registerArt(): void {
    makeTextures(this);
    this.anims.create({ key: 'fire', frames: [{ key: 'fire0' }, { key: 'fire1' }, { key: 'fire2' }], frameRate: 7, repeat: -1 });

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
    const sign = label(this, lot.x, y + 2, '', 14).setOrigin(0.5, 1);
    const wear = this.add.image(lot.x, y, '__DEFAULT').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y - 1.5).setVisible(false);
    const scaffold = this.add.image(lot.x, y, '__DEFAULT').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y - 1).setVisible(false);
    const view: BuildingView = { base, lights, scaffold, wear, sign, level: -1, state: '' };
    this.buildings.set(id, view);
    this.syncBuilding(id, false);
  }

  private syncBuilding(id: BuildingId, announce: boolean): void {
    const view = this.buildings.get(id)!;
    const level = buildingLevel(this.world, id);
    const repairing = level > 0 && repairOf(this.world, id) !== undefined;
    const care = careOf(this.world, id);
    const worn: 0 | 1 | 2 = level <= 0 || repairing ? 0 : care < BALANCE.careBroken ? 2 : care < BALANCE.careWorn ? 1 : 0;
    const state = `${level}:${repairing}:${worn}`;
    if (state === view.state) return;
    view.state = state;
    const lot = LOTS[id];
    const texture = buildingTexture(id, level);
    // Andaime e desgaste seguem a arte 16-bit (a de 32-bit tem o mesmo enquadramento).
    view.scaffold.setVisible(repairing);
    if (repairing) view.scaffold.setTexture(scaffoldTexture(this, texture));
    view.wear.setVisible(worn > 0);
    if (worn !== 0) view.wear.setTexture(wearTexture(this, texture, worn));
    // O prédio gasto perde a cor; o quebrado, mais.
    if (worn === 0) view.base.clearTint();
    else view.base.setTint(worn === 1 ? 0xd8cdb8 : 0xb4a58c);
    view.sign.setText(level === 0 ? `${BUILDINGS[id].name} · ruína` : `${BUILDINGS[id].name} · nível ${level}${repairing ? ' · em obra' : ''}`);
    if (level === view.level) {
      this.layoutSigns();
      return;
    }
    showArt(view.base, texture);
    this.roofSnow(`predio:${id}`, texture, lot.x, lot.y + lot.h / 2, lot.y + lot.h / 2 - 1.2);
    if (this.textures.exists(lightsTexture(texture))) {
      showArt(view.lights, lightsTexture(texture));
      view.lights.setVisible(true);
    } else {
      view.lights.setVisible(false);
    }
    const bottom = lot.y + lot.h / 2;
    this.nav.setLayer(`predio:${id}`, this.cellsOf([{ key: texture, x: lot.x, y: bottom }]));
    // Sombra, janelas acesas e fumaça mudam com a arte de cada nível.
    this.shadows.set(`predio:${id}`, [this.caster({ key: texture, x: lot.x, y: bottom }, true)]);
    this.lighting.setGroup(`janelas:${id}`, this.windowLights(lightsTexture(texture), lot.x, bottom));
    this.particles.setGroup(`fumaca:${id}`, this.chimneySmoke(id, artLevel(level), lot.x, bottom));
    if (id === 'ferreiro') this.syncForge(artLevel(level));
    view.sign.setColor(level === 0 ? '#b8a890' : '#f4ecd8');
    if (announce && view.level >= 0 && level > view.level) this.sparkle(lot.x, lot.y + lot.h / 4);
    view.level = level;
    this.layoutSigns();
  }

  // ── Praça de encontro (M6 F6) ─────────────────────────────────────────

  private createPlaza(): void {
    const solids: Solid[] = [];
    if (this.textures.exists('prop/praca/palanque')) {
      showArt(this.add.image(PALANQUE.x, PALANQUE.y, 'prop/praca/palanque'), 'prop/praca/palanque').setOrigin(0.5, 1).setDepth(PALANQUE.y);
      solids.push({ key: 'prop/praca/palanque', x: PALANQUE.x, y: PALANQUE.y, opts: { fromBottom: 6, minCover: 0.2 } });
    }
    this.nav.setLayer('palanque', this.cellsOf(solids));
    const stalls: Phaser.GameObjects.GameObject[] = [];
    const vendors = ['char/villager/lavrador/f', 'char/villager/artesa/f', 'char/villager/artesa/m'];
    MARKET_STALLS.forEach((p, i) => {
      const key = `prop/feira/barraca-${i + 1}`;
      if (!this.textures.exists(key)) return;
      // O vendedor fica atrás do balcão: um pouco acima do pé da barraca.
      const vendor = vendors[i % vendors.length]!;
      if (this.textures.exists(vendor)) stalls.push(showArt(this.add.sprite(p.x, p.y - 10, vendor, 0), vendor, ART_SCALE, 0).setOrigin(0.5, 1).setDepth(p.y - 1));
      stalls.push(showArt(this.add.image(p.x, p.y, key), key).setOrigin(0.5, 1).setDepth(p.y));
    });
    const bard: Phaser.GameObjects.GameObject[] = [];
    let notes: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    if (this.textures.exists('char/villager/bardo')) {
      const sprite = showArt(this.add.sprite(BARD_SPOT.x, BARD_SPOT.y, 'char/villager/bardo', 0), 'char/villager/bardo', ART_SCALE, 0).setOrigin(0.5, 1).setDepth(BARD_SPOT.y);
      if (this.anims.exists('char/villager/bardo:play') || this.anims.exists(`p32/char/villager/bardo:play`)) playArt(sprite, 'char/villager/bardo', 'play');
      bard.push(sprite);
      if (!this.textures.exists('fx/nota')) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0xffffff, 1).fillRect(1, 4, 2, 2).fillRect(2, 0, 1, 5).fillRect(3, 0, 2, 1);
        g.generateTexture('fx/nota', 5, 6);
        g.destroy();
      }
      notes = this.add.particles(BARD_SPOT.x + 8, BARD_SPOT.y - 50, 'fx/nota', {
        lifespan: 2200,
        speedY: { min: -26, max: -14 },
        speedX: { min: -10, max: 14 },
        scale: 2,
        alpha: { start: 1, end: 0 },
        tint: [0xffe08a, 0xf4f0e0, 0xd8b0f0],
        frequency: 700,
        emitting: false,
      }).setDepth(DEPTH.floating - 2);
    }
    for (const o of [...stalls, ...bard]) (o as Phaser.GameObjects.Image).setVisible(false);
    this.plaza = { stalls, bard, notes, market: false, music: false };
  }

  /** Feira de dia e bardo à noite, nas horas certas. */
  private syncPlaza(): void {
    const plaza = this.plaza;
    if (!plaza) return;
    const day = dayOf(this.world.tick);
    const hour = hourOf(this.world.tick);
    const market = marketHours(day, hour);
    const music = bardHours(this.world, day, hour);
    if (market !== plaza.market) {
      plaza.market = market;
      for (const o of plaza.stalls) (o as Phaser.GameObjects.Image).setVisible(market);
      const solids = market
        ? MARKET_STALLS.map((p, i) => ({ key: `prop/feira/barraca-${i + 1}`, x: p.x, y: p.y, opts: { fromBottom: 6, minCover: 0.2 } })).filter((sol) => this.textures.exists(sol.key))
        : [];
      this.nav.setLayer('feira', this.cellsOf(solids));
    }
    if (music !== plaza.music) {
      plaza.music = music;
      for (const o of plaza.bard) (o as Phaser.GameObjects.Image).setVisible(music);
      if (music) plaza.notes?.start();
      else plaza.notes?.stop();
    }
  }

  // ── Clima das estações (M6 F6) ────────────────────────────────────────

  /** Estação e clima do dia: chão, árvores, neve nos telhados e partículas. Devolve o céu fechado (0 a 1). */
  private syncSeason(now: number): number {
    const day = dayOf(this.world.tick);
    const season = seasonOf(day);
    const kind = weatherOn(this.world, day);
    const snow = Math.round(snowCover(this.world, day) * 10) / 10;
    const state = `${season}|${snow}`;
    if (state !== this.seasonState) {
      const first = this.seasonState === '';
      this.seasonState = state;
      this.groundSeasons?.paint(season, snow, first ? 0 : 2500);
      this.seasonTrees(season, snow >= 0.3);
      this.roofSnowAlpha = season === 3 ? Math.min(1, snow * 1.4) : 0;
      for (const img of this.roofs.values()) img.setAlpha(this.roofSnowAlpha).setVisible(this.roofSnowAlpha > 0);
    }
    const quality = this.ui.prefs.weather ?? 'completo';
    const cam = this.cameras.main;
    this.weather?.update(cam, kind, season, quality, this.session.paused);
    if (kind === 'tempestade' && !this.session.paused) this.weather?.lightning(now, cam, quality);
    if (quality === 'desligado') return 0;
    return GLOOM[kind];
  }

  private seasonTrees(season: number, snowy: boolean): void {
    for (const [img, base] of TREES) {
      if (img.scene !== this) continue;
      const key = seasonTree(base, season, snowy);
      showArt(img, this.textures.exists(key) ? key : base);
    }
  }

  /** Camada de neve sobre o telhado de um prédio (refeita quando a arte muda de nível). */
  private roofSnow(id: string, artKey: string, x: number, bottom: number, depth: number): void {
    let img = this.roofs.get(id);
    if (!img) {
      img = this.add.image(x, bottom, '__DEFAULT').setOrigin(0.5, 1).setScale(ART_SCALE);
      this.roofs.set(id, img);
    }
    img.setTexture(snowTexture(this, artKey)).setDepth(depth).setAlpha(this.roofSnowAlpha).setVisible(this.roofSnowAlpha > 0);
  }

  // ── Cosmética da vila (M6 F6) ─────────────────────────────────────────

  private createCosmetics(): void {
    let paco: CosmeticsView['paco'] = null;
    if (this.textures.exists('building/paco')) {
      const base = showArt(this.add.image(PACO.x, PACO.bottom, 'building/paco'), 'building/paco').setOrigin(0.5, 1).setDepth(PACO.bottom - 2);
      const lit = lightsTexture('building/paco');
      const lights = showArt(this.add.image(PACO.x, PACO.bottom, lit), lit).setOrigin(0.5, 1).setDepth(DEPTH.lights).setAlpha(0);
      const sign = label(this, PACO.x, this.roofTop('building/paco', PACO.bottom) - 4, 'Paço do prefeito', 14).setOrigin(0.5, 1);
      this.roofSnow('paco', 'building/paco', PACO.x, PACO.bottom, PACO.bottom - 1.5);
      this.nav.setLayer('predio:paco', this.cellsOf([{ key: 'building/paco', x: PACO.x, y: PACO.bottom }]));
      this.shadows.set('predio:paco', [this.caster({ key: 'building/paco', x: PACO.x, y: PACO.bottom }, true)]);
      this.lighting.setGroup('janelas:paco', this.windowLights(lit, PACO.x, PACO.bottom));
      paco = { base, lights, sign };
    }
    // Mastros: o pau é arte; a flâmula, pano nas cores da vila.
    const poles: Solid[] = [];
    if (this.textures.exists(MASTRO)) {
      for (const p of FLAG_POLES) {
        const x = p.x * TILE;
        const y = p.y * TILE;
        showArt(this.add.image(x, y, MASTRO), MASTRO).setOrigin(0.5, 1).setDepth(y);
        poles.push({ key: MASTRO, x, y });
      }
    }
    this.nav.setLayer('mastros', this.cellsOf(poles));
    const signs = new Map<StreetId, Phaser.GameObjects.Text>();
    for (const street of STREETS) {
      const at = STREET_SIGNS[street.id];
      signs.set(street.id, label(this, at.x * TILE, at.y * TILE, '', 11, '#d8cba8').setAlpha(0.85));
    }
    this.cosmetics = { paco, cloth: [], decor: [], decorLights: [], signs, bust: [], state: '' };
    this.syncCosmetics();
  }

  /** Estandarte, enfeites, placas e busto: refaz só quando algo muda. */
  private syncCosmetics(): void {
    const view = this.cosmetics;
    if (!view) return;
    const town = this.world.town;
    const banner = villageBanner(this.world);
    const decor = decorOf(this.world);
    const names = STREETS.map((st) => streetName(this.world, st.id));
    const bust = town.bust ?? null;
    const bustHero = bust === null ? undefined : this.world.heroes.find((h) => h.id === bust);
    const state = `${banner.field}:${banner.charge}:${banner.symbol}|${decor.join(',')}|${names.join('|')}|${bust}:${bustHero?.classId}`;
    if (state === view.state) return;
    view.state = state;
    STREETS.forEach((st, i) => view.signs.get(st.id)?.setText(names[i]!));
    // Panos nas cores da vila: cada um logo à frente do que o segura.
    for (const g of view.cloth) g.destroy();
    view.cloth = [];
    const cloth = (depth: number): Phaser.GameObjects.Graphics => {
      const g = this.add.graphics().setDepth(depth);
      view.cloth.push(g);
      return g;
    };
    if (view.paco) {
      const left = PACO.x - (PACO_SIZE[0] / 2) * ART_SCALE + (PACO_BANNER[0] - 4) * ART_SCALE;
      hangingBanner(cloth(PACO.bottom - 1), left, PACO.bottom - PACO_SIZE[1] * ART_SCALE + PACO_BANNER[1] * ART_SCALE, 8, 12, banner);
    }
    if (this.textures.exists(MASTRO)) {
      const h = this.textures.getFrame(MASTRO)?.height ?? 44;
      const w = this.textures.getFrame(MASTRO)?.width ?? 8;
      for (const p of FLAG_POLES) {
        const x = p.x * TILE - (w / 2) * ART_SCALE + MASTRO_TIP[0] * ART_SCALE;
        const y = p.y * TILE - h * ART_SCALE + MASTRO_TIP[1] * ART_SCALE;
        pennant(cloth(p.y * TILE + 0.1), x, y, banner);
      }
    }
    // Enfeites dos 12 pontos.
    for (const img of [...view.decor, ...view.decorLights]) img.destroy();
    view.decor = [];
    view.decorLights = [];
    const solids: Solid[] = [];
    const lamps: LightSpec[] = [];
    decor.forEach((id, i) => {
      const def = id ? DECOR_BY_ID.get(id) : undefined;
      const spot = DECOR_SPOTS[i];
      if (!def || !spot || !this.textures.exists(def.art)) return;
      const x = spot.x * TILE;
      const y = spot.y * TILE;
      view.decor.push(showArt(this.add.image(x, y, def.art), def.art).setOrigin(0.5, 1).setDepth(y));
      solids.push({ key: def.art, x, y, opts: { fromBottom: 6, minCover: 0.2 } });
      if (def.light && this.textures.exists(`${def.art}-lights`)) {
        view.decorLights.push(showArt(this.add.image(x, y, `${def.art}-lights`), `${def.art}-lights`).setOrigin(0.5, 1).setDepth(DEPTH.lights).setAlpha(0));
        lamps.push({ x: x + 6, y: y - 36, color: 0xffb04a, radius: 120, intensity: 0.55, flicker: 0.1, halo: { scaleX: 1.2, scaleY: 1.2, day: 0, night: 0.5 } });
      }
      if (id === 'bandeirola') {
        const w = this.textures.getFrame(def.art)?.width ?? 28;
        const h = this.textures.getFrame(def.art)?.height ?? 22;
        const tip = ([tx, ty]: [number, number]): Point => ({ x: x - (w / 2) * ART_SCALE + tx * ART_SCALE, y: y - h * ART_SCALE + ty * ART_SCALE });
        bunting(cloth(y + 0.1), tip(BUNTING_TIPS[0]), tip(BUNTING_TIPS[1]), banner);
      }
    });
    this.nav.setLayer('enfeites', this.cellsOf(solids));
    this.shadows.set('enfeites', solids.map((sol) => this.caster(sol)));
    this.lighting.setGroup('enfeites', lamps);
    // Busto: a coluna e o herói em pedra, do peito para cima.
    for (const img of view.bust) img.destroy();
    view.bust = [];
    if (this.textures.exists(BUST)) {
      const x = BUST_SPOT.x * TILE;
      const y = BUST_SPOT.y * TILE;
      view.bust.push(showArt(this.add.image(x, y, BUST), BUST).setOrigin(0.5, 1).setDepth(y));
      if (bustHero) {
        const look = statueTexture(this, heroSpriteId(bustHero.classId, bustHero.gender), ART_SCALE);
        const frame = this.textures.getFrame(look.key);
        const top = y - ((this.textures.getFrame(BUST)?.height ?? 18) - BUST_TOP) * ART_SCALE;
        if (frame) {
          // Só a metade de cima do herói: cabeça e ombros.
          const cut = Math.round(frame.height * 0.55);
          const head = this.add.image(x, top, look.key).setOrigin(0.5, 1).setScale(look.scale * 0.9).setDepth(y + 0.1);
          head.setCrop(0, 0, frame.width, cut);
          head.setY(top + (frame.height - cut) * look.scale * 0.9);
          view.bust.push(head);
        }
      }
    }
  }

  // ── Salão das Lendas (M6 F5) ──────────────────────────────────────────

  private createHall(): void {
    const { x, bottom } = HALL;
    const base = this.add.image(x, bottom, '__DEFAULT').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(bottom - 2);
    const lights = this.add.image(x, bottom, '__DEFAULT').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(DEPTH.lights).setAlpha(0);
    const sign = label(this, x, bottom + 2, '', 14).setOrigin(0.5, 1);
    const banners = this.add.graphics().setDepth(bottom - 1);
    this.hall = { base, lights, sign, banners, pedestals: [], statues: [], statueIds: [], level: -1, state: '' };
    this.syncHall(false);
  }

  /** Nível, estátuas e estandartes; refaz só o que mudou. */
  private syncHall(announce: boolean): void {
    const hall = this.hall;
    if (!hall) return;
    const level = hallLevel(this.world);
    const statues = hallStatues(this.world);
    const banners = housesOf(this.world)
      .filter((h) => h.deeds.length > 0)
      .sort((a, b) => b.deeds.length - a.deeds.length || a.foundedTick - b.foundedTick)
      .slice(0, HALL_BANNERS[level]?.length ?? 0);
    const state = `${level}|${statues.map((h) => `${h.id}:${h.classId}:${h.gender}`).join(',')}|${banners.map((h) => `${h.id}:${h.crest.field}:${h.crest.charge}`).join(',')}`;
    if (state === hall.state) return;
    hall.state = state;
    const { x, bottom } = HALL;
    if (level !== hall.level) {
      const texture = `building/salao/level-${level}`;
      showArt(hall.base, texture);
      this.roofSnow('salao', texture, x, bottom, bottom - 1.5);
      const lit = lightsTexture(texture);
      hall.lights.setVisible(this.textures.exists(lit));
      if (this.textures.exists(lit)) showArt(hall.lights, lit);
      this.nav.setLayer('predio:salao', this.cellsOf([{ key: texture, x, y: bottom }]));
      this.shadows.set('predio:salao', [this.caster({ key: texture, x, y: bottom }, true)]);
      this.lighting.setGroup('janelas:salao', this.windowLights(lit, x, bottom));
      this.particles.setGroup(
        'salao:braseiros',
        (HALL_BRAZIERS[level] ?? []).map(([ax, ay]) => ({
          preset: 'sparks' as const,
          x: x - (HALL_SIZE[0] / 2) * ART_SCALE + ax * ART_SCALE,
          y: bottom - HALL_SIZE[1] * ART_SCALE + ay * ART_SCALE,
          spread: 4,
          rate: 0.35,
          depth: bottom + 1,
        })),
      );
      hall.sign.setText(`Salão das Lendas · nível ${level}`);
      hall.sign.setY(this.roofTop(texture, bottom) - 4);
      if (announce && hall.level > 0 && level > hall.level) this.sparkle(x, bottom - 3 * TILE);
      hall.level = level;
    }
    // Pedestais e estátuas: os primeiros ficam mais perto da porta.
    for (const img of [...hall.pedestals, ...hall.statues]) img.destroy();
    hall.pedestals = [];
    hall.statues = [];
    hall.statueIds = [];
    const slots = PEDESTALS.slice(0, [0, 2, 4, 6][level] ?? 2);
    const solids: Solid[] = [];
    slots.forEach(([dx, dy], i) => {
      const px = x + dx * TILE;
      const py = bottom + dy;
      hall.pedestals.push(showArt(this.add.image(px, py, PEDESTAL), PEDESTAL).setOrigin(0.5, 1).setDepth(py));
      solids.push({ key: PEDESTAL, x: px, y: py });
      const hero = statues[i];
      if (!hero) return;
      const look = statueTexture(this, heroSpriteId(hero.classId, hero.gender), ART_SCALE);
      const top = py - (pedestalHeight(this) - PEDESTAL_FOOT) * ART_SCALE;
      hall.statues.push(this.add.image(px, top, look.key).setOrigin(0.5, 1).setScale(look.scale * STATUE_SCALE).setDepth(py + 0.1));
      hall.statueIds.push(hero.id);
    });
    this.nav.setLayer('salao:pedestais', this.cellsOf(solids));
    this.shadows.set('salao:pedestais', solids.map((s) => this.caster(s)));
    // Estandartes das casas com feito, pendurados nos suportes da fachada.
    hall.banners.clear();
    const slotsAt = HALL_BANNERS[level] ?? [];
    const imgLeft = x - (HALL_SIZE[0] / 2) * ART_SCALE;
    const imgTop = bottom - HALL_SIZE[1] * ART_SCALE;
    banners.forEach((house, i) => {
      const [bx, by] = slotsAt[i]!;
      hangingBanner(hall.banners, imgLeft + (bx - 3) * ART_SCALE, imgTop + by * ART_SCALE, 6, 10, house.crest);
    });
  }

  /**
   * Brasa da fornalha do ferreiro: a arte só traz uns pixels apagados no anexo da direita.
   * Acende fogo e halo sobre a grelha (que anda para a direita a cada nível).
   */
  private syncForge(level: number): void {
    if (!this.forgeFire) this.forgeFire = playArt(showArt(this.add.sprite(0, 0, 'fx/fire'), 'fx/fire', 1), 'fx/fire').setOrigin(0.5, 1);
    const coalX = FORGE_COALS_X[level];
    const lit = level >= 1 && coalX !== undefined;
    this.forgeFire.setVisible(lit);
    if (!lit) {
      this.lighting.setGroup('forja', []);
      this.particles.setGroup('forja', []);
      return;
    }
    const lot = LOTS.ferreiro;
    const bottom = lot.y + lot.h / 2;
    // Arte de 112×96 com origem no pé do meio: pixel (ax, ay) vai para lot.x − 112 + 2ax, bottom − 192 + 2ay.
    const x = lot.x - 112 + coalX * ART_SCALE;
    const y = bottom - 96 * ART_SCALE + 86 * ART_SCALE;
    this.forgeFire.setPosition(x, y).setDepth(bottom - 1);
    // Luz vermelha da forja, pulsando no ritmo do martelo, e fagulhas saindo da grelha.
    this.lighting.setGroup('forja', [
      { x, y: y - 6, color: 0xff4500, radius: 150, intensity: 0.85, flicker: 0.1, pulse: { period: 1100, depth: 0.35 }, halo: { scaleX: 1.6, scaleY: 1.2, day: 0.35, night: 0.7 } },
    ]);
    this.particles.setGroup('forja', [{ preset: 'sparks', x, y: y - 8, spread: 10, rate: 0.6, depth: DEPTH.lights }]);
  }

  // ── Luz, sombra e partículas ────────────────────────────────────────────

  /**
   * Correção de cor da câmera. De dia tira saturação (fantasia sombria); à noite tira
   * menos, para o laranja da fogueira e o ciano da fonte aparecerem contra o escuro.
   */
  private applyGrade(night: number): void {
    if (!this.grade) return;
    const step = Math.round(night * 20) / 20;
    if (step === this.gradedNight) return;
    this.gradedNight = step;
    this.grade.reset();
    this.grade.saturate(-0.55 + 0.2 * step);
    this.grade.brightness(0.8, true);
    this.grade.contrast(0.08 + 0.04 * step, true);
  }

  /** Quem projeta sombra: o pé (meio da base) da imagem no mundo, a partir do setOrigin dela. */
  private caster(s: Solid, ao = s.key.startsWith('building/')): Caster {
    const mask = alphaOf(this.textures, s.key, s.frame);
    const [ox, oy] = s.origin ?? [0.5, 1];
    const w = (mask?.w ?? 0) * ART_SCALE;
    const h = (mask?.h ?? 0) * ART_SCALE;
    return {
      key: s.key,
      frame: s.frame,
      x: s.x + w * (0.5 - ox),
      y: s.y + h * (1 - oy),
      scale: ART_SCALE,
      ao: ao ? ShadowLayer.baseWidth(this, s.key, ART_SCALE, s.frame) * 0.95 : 0,
    };
  }

  /**
   * Janelas acesas: cada mancha opaca do overlay "-lights" da arte vira uma luz amarela
   * pequena, que só acende com a noite. Funciona para qualquer prédio e nível.
   */
  private windowLights(key: string, x: number, bottom: number): LightSpec[] {
    const mask = alphaOf(this.textures, key);
    if (!mask) return [];
    const left = x - (mask.w * ART_SCALE) / 2;
    const top = bottom - mask.h * ART_SCALE;
    return blobs(mask, 2).map((b) => ({
      x: left + b.x * ART_SCALE,
      y: top + b.y * ART_SCALE + 6,
      color: 0xffbe55,
      radius: 36 + Math.min(34, b.n),
      intensity: 0.5,
      flicker: 0.03,
      nightOnly: true,
    }));
  }

  /** Fumaça das chaminés de cada prédio (posições medidas na arte de cada nível). */
  private chimneySmoke(id: BuildingId, level: number, x: number, bottom: number): EmitterSpec[] {
    return (CHIMNEYS[id]?.[level] ?? []).map(([ax, ay]) => ({
      preset: 'smoke' as const,
      x: x - 112 + ax * ART_SCALE,
      y: bottom - 96 * ART_SCALE + ay * ART_SCALE,
      spread: 4,
      depth: SMOKE_DEPTH,
    }));
  }

  /** Luzes fixas do cenário: fogueira, lampiões, fonte termal, caverna e portão do berrante. */
  private sceneryLights(lamps: Point[]): void {
    const { fogueira, abismo } = LANDMARKS;
    this.lighting.add({
      x: fogueira.x,
      y: fogueira.y - 10,
      color: 0xff8c3b,
      radius: 240,
      intensity: 0.8,
      flicker: 0.25,
      halo: { scaleX: 2.6, scaleY: 1.8, day: 0.22, night: 0.42, dy: -2 },
    });
    this.particles.add({ preset: 'sparks', x: fogueira.x, y: fogueira.y - 14, spread: 12, depth: DEPTH.lights });
    for (const lamp of lamps) {
      this.lighting.add({ ...lamp, color: 0xffb04a, radius: 110, intensity: 0.55, flicker: 0.08, nightOnly: true, halo: { scaleX: 1.6, scaleY: 1.6, day: 0, night: 0.45 } });
    }
    const thermal = { x: (THERMAL_TILES.tx + THERMAL_TILES.tw / 2) * TILE, y: (THERMAL_TILES.ty + THERMAL_TILES.th) * TILE - 34 };
    this.lighting.add({ ...thermal, color: 0x4deeea, radius: 170, intensity: 0.6, pulse: { period: 4200, depth: 0.15 }, halo: { scaleX: 3, scaleY: 2.2, day: 0.18, night: 0.32 } });
    // Vapor subindo devagar de toda a água quente.
    this.particles.add({ preset: 'steam', x: thermal.x, y: thermal.y - 2, spread: 100, spreadY: 34, depth: SMOKE_DEPTH });
    // Cristais da corrupção em volta da caverna: brilho roxo fraco, que cresce com a corrupção.
    for (const d of DECOR) {
      if (!d.id.startsWith('prop/crystal')) continue;
      this.lighting.add({ x: d.x, y: d.y - 14, color: 0xb46ae0, radius: 56, intensity: 0.4, pulse: { period: 2600, depth: 0.45 }, gain: () => 0.6 + (0.4 * this.corruption()) / 100 });
    }
    // Caverna: a luz roxa cresce com a corrupção (o brilho de cima, que já existia, também).
    const caveMouth = { x: abismo.x, y: 15 * TILE - 26 };
    this.lighting.add({
      ...caveMouth,
      color: 0x9d4edd,
      radius: 230,
      intensity: 0.8,
      pulse: { period: 3200, depth: 0.35 },
      gain: () => 0.6 + (0.4 * this.corruption()) / 100,
    });
    this.particles.add({ preset: 'miasma', x: caveMouth.x, y: caveMouth.y + 6, spread: 48, depth: DEPTH.lights });
    this.particles.add({ preset: 'sparks', tint: [0xb46ae0, 0x9d4edd, 0xe0b8ff], x: caveMouth.x, y: caveMouth.y + 6, spread: 52, rate: 0.7, depth: DEPTH.lights });
    // Portão do berrante: uma luz pálida de foco no norte.
    this.lighting.add({ x: (HORN_TOWER.tx + HORN_TOWER.tw / 2) * TILE, y: (HORN_TOWER.ty + HORN_TOWER.th) * TILE - 40, color: 0xcfd8ff, radius: 150, intensity: 0.45 });
  }

  /** Pressão do abismo (0 a 100): o brilho da caverna e dos cristais acompanha. */
  private corruption(): number {
    return abyssPressure(this.world);
  }

  /**
   * Placa de cada prédio em cima do telhado, como na arte de referência. Se duas placas
   * vizinhas se encostam (telhados da mesma altura e nomes largos), a segunda sobe uma
   * linha. Elas são fixas, então isto só roda quando algo muda.
   */
  private layoutSigns(): void {
    const placed: Phaser.Geom.Rectangle[] = [];
    const signs: { id: BuildingId; view: BuildingView; lot: (typeof LOTS)[BuildingId] }[] = [];
    for (const id of BUILDING_IDS) {
      const view = this.buildings.get(id);
      if (view) signs.push({ id, view, lot: LOTS[id] });
    }
    signs.sort((a, b) => a.lot.x - b.lot.x);
    for (const { id, view, lot } of signs) {
      const sign = view.sign;
      // A arte 16-bit (a 32-bit, quando ligada, mostra outra imagem com o dobro de pixels).
      sign.setY(this.roofTop(buildingTexture(id, buildingLevel(this.world, id)), lot.y + lot.h / 2) - 4);
      let rect = sign.getBounds();
      for (let tries = 0; tries < 3; tries++) {
        const padded = new Phaser.Geom.Rectangle(rect.x - 6, rect.y - 1, rect.width + 12, rect.height + 2);
        if (!placed.some((other) => Phaser.Geom.Intersects.RectangleToRectangle(other, padded))) break;
        sign.setY(sign.y - rect.height - 3);
        rect = sign.getBounds();
      }
      placed.push(rect);
    }
  }

  /** y do alto do telhado (primeira linha opaca da arte) de um prédio com o pé em `bottom`. */
  private roofTop(key: string, bottom: number): number {
    const mask = alphaOf(this.textures, key);
    if (!mask) return bottom - 96 * ART_SCALE;
    for (let row = 0; row < mask.h; row++) {
      for (let x = 0; x < mask.w; x++) {
        if ((mask.alpha[row * mask.w + x] ?? 0) >= 128) return bottom - (mask.h - row) * ART_SCALE;
      }
    }
    return bottom;
  }

  /**
   * Nomes no mapa sem um por cima do outro: o selecionado e o que está sob o
   * ponteiro sempre aparecem; dos outros, só quem está perto do prefeito (a arte da
   * vila respira, como na referência). Entram por prioridade (prefeito, prédios,
   * heróis, crianças) enquanto couber. A medalha de rank continua sempre visível.
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
      const near = Math.hypot(sprite.x - this.mayor.x, sprite.y - this.mayor.y) < NAME_RADIUS;
      if (!forced && (crowd >= 3 || !near)) {
        sprite.label.setVisible(false);
        continue;
      }
      entries.push({ obj: sprite.label, force: forced, priority: 2 });
    }
    for (const kid of this.kids.values()) {
      if (kid.hidden) continue;
      if (Math.hypot(kid.x - this.mayor.x, kid.y - this.mayor.y) < NAME_RADIUS * 0.7) entries.push({ obj: kid.label, force: false, priority: 3 });
      else kid.label.setVisible(false);
    }
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
      this.shadows.set('mato', growth.solids.map((solid) => this.caster(solid)));
    } else if (expansion.cleared && this.overgrowth !== null) {
      // Limpou: o mato some aos poucos e o caminho para os lotes abre.
      for (const img of this.overgrowth) {
        this.tweens.add({ targets: img, alpha: 0, duration: 700, delay: Math.random() * 500, onComplete: () => img.destroy() });
      }
      this.overgrowth = null;
      this.nav.setLayer('mato', []);
      this.shadows.set('mato', []);
    }
    EXPANSION_LOTS.forEach((lot, i) => {
      const built = expansion.houses[i] === true;
      if (built && !this.expansionHouses[i]) {
        const x = (lot.tx + lot.tw / 2) * TILE;
        const y = (lot.ty + lot.th) * TILE;
        const id = `building/house/0${i + 1}`;
        this.expansionHouses[i] = showArt(this.add.image(x, y, id), id).setOrigin(0.5, 1).setDepth(y);
        this.nav.setLayer(`casa-nova:${i}`, this.cellsOf([{ key: id, x, y }]));
        this.shadows.set(`casa-nova:${i}`, [this.caster({ key: id, x, y })]);
        this.lighting.setGroup(`janelas:casa-nova:${i}`, this.windowLights(`${id}-lights`, x, y));
        this.expansionLights[i] = showArt(this.add.image(x, y, `${id}-lights`), `${id}-lights`)
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.lights)
          .setAlpha(0);
      } else if (!built && this.expansionHouses[i]) {
        this.expansionHouses[i]!.destroy();
        this.expansionLights[i]?.destroy();
        this.expansionHouses[i] = undefined;
        this.expansionLights[i] = undefined;
        this.nav.setLayer(`casa-nova:${i}`, []);
        this.shadows.set(`casa-nova:${i}`, []);
        this.lighting.setGroup(`janelas:casa-nova:${i}`, []);
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
        point: berrante,
        // A torrinha inteira (arte de 72×94 com o pé no meio), ao lado do portão.
        hit: { x: berrante.x - 72, y: (HORN_STAND.ty + HORN_STAND.th) * TILE - 188, w: 144, h: 188 },
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
        // O palanque do prefeito, no centro da praça (M6 F6).
        point: { x: PALANQUE.x, y: PALANQUE.y + 24 },
        hit: { x: PALANQUE.x - 40, y: PALANQUE.y - 50, w: 80, h: 60 },
        label: (world) => {
          if (world.town.speechDay === dayOf(world.tick)) return 'Já discursou hoje';
          if (world.town.mayorEnergy < 2) return 'Discursar (falta energia)';
          return 'Discursar na praça (2 de energia)';
        },
        open: () => this.speech(),
      },
      {
        id: 'audiencias',
        point: { x: AUDIENCE_TABLE.x, y: AUDIENCE_TABLE.y + 22 },
        hit: { x: AUDIENCE_TABLE.x - 36, y: AUDIENCE_TABLE.y - 52, w: 72, h: 58 },
        label: (world) => {
          const n = world.town.petitions?.length ?? 0;
          return n === 0 ? 'Mesa de audiências' : `Audiências (${n} ${n === 1 ? 'pedido' : 'pedidos'})`;
        },
        open: open({ kind: 'audiences' }),
      },
      {
        id: 'cemiterio',
        point: cemiterio,
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
      {
        id: 'paco',
        point: LANDMARKS.paco,
        hit: { x: PACO_TILES.tx * TILE, y: PACO_TILES.ty * TILE, w: PACO_TILES.tw * TILE, h: PACO_TILES.th * TILE },
        label: () => 'Paço do prefeito',
        open: open({ kind: 'paco' }),
      },
      {
        id: 'salao',
        point: LANDMARKS.salao,
        hit: { x: HALL_TILES.tx * TILE, y: HALL_TILES.ty * TILE, w: HALL_TILES.tw * TILE, h: HALL_TILES.th * TILE },
        label: (world) => `Salão das Lendas (nível ${hallLevel(world)})`,
        open: open({ kind: 'hall' }),
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
  /** Transparência de uma textura do pack (cache compartilhado em fx/alpha). */
  private alphaOf(key: string, frame?: number): AlphaMask | null {
    return alphaOf(this.textures, key, frame);
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
    // Estátua do Salão das Lendas: a ficha do herói que ela lembra.
    const statue = this.hall?.statues.findIndex((img) => img.getBounds().contains(p.worldX, p.worldY)) ?? -1;
    if (statue >= 0) {
      this.ui.open({ kind: 'hero', heroId: this.hall!.statueIds[statue]! });
      return;
    }
    const child = [...this.kids.values()].find((c) => c.hits(p.worldX, p.worldY));
    if (child) {
      const parent = child.parents.find((id) => this.world.heroes.some((h) => h.id === id));
      if (parent !== undefined) this.ui.open({ kind: 'hero', heroId: parent });
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
  private onHover(p: Phaser.Input.Pointer): void {
    const hero = this.heroAt(p.worldX, p.worldY);
    this.hoverHeroId = hero?.id ?? null;
    const over = hero || this.petAt(p.worldX, p.worldY) || this.interactableAt(p.worldX, p.worldY);
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
    this.syncHall(!initial);
    this.syncCosmetics();
    this.syncPlaza();
    this.syncGraves(initial);
    this.syncHeroes(initial, dt);
    this.syncChildren(dt);
    this.syncCitizens(dt);
    this.syncPets(dt);
    this.syncExpansion();

    // Estação e clima do dia (M6 F6): o céu fechado de chuva e neve escurece como o anoitecer.
    const gloom = this.syncSeason(this.time.now);
    const night = Math.max(nightFactor(world.tick), gloom);
    // De dia, uma névoa fria; à noite a floresta afunda e só a vila acesa aparece.
    this.lighting.update(this.time.now, night);
    this.shadows.flush();
    this.particles.update(this.session.paused ? 0 : this.session.speed);
    this.fog.update(dt, this.session.paused ? 0 : Math.min(2, Math.max(0.5, this.session.speed)), night);
    this.foreground.update(this.cameras.main);
    if (this.vignette) this.vignette.strength = 0.32 + 0.2 * night;
    this.applyGrade(night);
    const lightAlpha = Phaser.Math.Clamp((night - 0.1) / 0.5, 0, 1);
    for (const b of this.buildings.values()) b.lights.setAlpha(lightAlpha);
    this.hall?.lights.setAlpha(lightAlpha);
    this.cosmetics?.paco?.lights.setAlpha(lightAlpha);
    for (const light of this.cosmetics?.decorLights ?? []) light.setAlpha(lightAlpha);
    for (const light of this.houseLights) light.setAlpha(lightAlpha);
    for (const light of this.propLights) light.setAlpha(lightAlpha);
    for (const light of this.expansionLights) light?.setAlpha(lightAlpha);
    this.mayor.placeLabels(this.labelScale);

    const town = world.town;
    const hornReady = dayOf(world.tick) >= town.hornReadyDay;
    this.horn.ready.setVisible(hornReady);
    this.board.update(town.contracts.length, buildingLevel(world, 'guilda') >= 1);
    this.coffer.update(town.treasury);

    const pulse = 0.08 * Math.sin(this.time.now / 600);
    this.abyss.glow.setAlpha(0.3 + (0.6 * this.corruption()) / 100 + pulse);
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
    // Só quem ainda tem cova no chão; o túmulo de quem saiu para o Memorial vira "o cemitério".
    const graveIndex = new Map(standingGraves(world).map(({ hero, index }) => [hero.id, index]));
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
    const looks = this.raidMonsters();
    const start = LANDMARKS.abismo;
    for (let i = 0; i < 6; i++) {
      const look = looks[i % looks.length]!;
      const shade = showArt(this.add.sprite(0, 0, look.asset, 0), look.asset)
        .setPosition(start.x + (i - 2.5) * 26, start.y + 26)
        .setOrigin(0.5, 1)
        .setTint(0x6a5070)
        .setDepth(start.y + 40)
        .setAlpha(0.9);
      playArt(shade, look.asset, 'run');
      this.tweens.add({
        targets: shade,
        x: PLAZA.x + (i - 2.5) * 60,
        y: PLAZA.y + 40 + (i % 3) * 24,
        alpha: 0,
        duration: 2200 + i * 120,
        delay: i * 90,
        ease: 'Cubic.easeIn',
        onComplete: () => shade.destroy(),
      });
    }
    this.floatText(PLAZA.x, PLAZA.y - 120, 'Incursão!', '#ff8a7a');
  }

  /** Os monstros comuns do bioma de onde a incursão subiu. */
  private raidMonsters(): MonsterLook[] {
    const def = BIOMES[this.world.raids.at(-1)?.biome ?? 0] ?? BIOMES[0]!;
    const looks = def.enemies.map((e) => MONSTERS[e.id]).filter((m): m is MonsterLook => !!m);
    return looks.length ? looks : [MONSTERS.esqueleto!];
  }

  private syncGraves(initial: boolean): void {
    // Roda todo quadro: só refaz quando alguém morreu (ou ganhou lápide nova) desde a última vez.
    const dead = this.world.heroes.reduce((n, h) => n + (h.status === 'dead' ? 1 + (h.honoredGrave ? 1000 : 0) : 0), 0);
    if (dead === this.graveCount) return;
    this.graveCount = dead;
    const standing = standingGraves(this.world);
    const keep = new Set(standing.map(({ hero }) => hero.id));
    // Cemitério lotado: a cova mais antiga sai do chão (o nome segue no Memorial).
    for (const [id, view] of this.graves) {
      if (keep.has(id)) continue;
      view.stone.destroy();
      view.flowers?.destroy();
      this.graves.delete(id);
    }
    for (const { hero, index } of standing) {
      const p = gravePoint(index);
      const seen = this.graves.get(hero.id);
      if (seen && hero.honoredGrave && !seen.flowers) {
        seen.flowers = showArt(this.add.image(p.x, p.y + 4, 'prop/tumulo/flores'), 'prop/tumulo/flores').setOrigin(0.5, 1).setDepth(p.y + 1);
      }
      if (seen) continue;
      const stone = showArt(this.add.image(p.x, p.y, 'decal/grave'), 'decal/grave').setOrigin(0.5, 1).setDepth(p.y);
      if (!initial) {
        stone.setAlpha(0);
        this.tweens.add({ targets: stone, alpha: 1, duration: 1200 });
        this.add.image(p.x, p.y + 6, 'mound').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(p.y - 1);
      }
      const flowers = hero.honoredGrave
        ? showArt(this.add.image(p.x, p.y + 4, 'prop/tumulo/flores'), 'prop/tumulo/flores').setOrigin(0.5, 1).setDepth(p.y + 1)
        : undefined;
      this.graves.set(hero.id, { stone, flowers });
    }
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
        g.flowers?.destroy();
      }
      this.graves.clear();
      this.graveCount = -1;
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
