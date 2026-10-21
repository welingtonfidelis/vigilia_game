// A vila montada com tiles do Tiny Town (Kenney) e peças do DungeonTileset II (0x72).

import Phaser from 'phaser';
import { ART_SCALE } from './assets.ts';
import { AUTUMN, FORESTS, inRect } from './ground.ts';
import type { FootprintOptions } from './nav.ts';
import { onFace } from './relief.ts';
import { sway } from './fx/wind.ts';
import { FogSystem } from './fx/fog.ts';
import { ParallaxLayer, type Edge } from './fx/parallax.ts';
import {
  CEMETERY_TILES,
  COLS,
  EXPANSION_TILES,
  HOME_LOTS,
  HORN_TOWER,
  LANDMARKS,
  LOT_TILES,
  PLAZA_TILES,
  ROWS,
  THERMAL_TILES,
  THERMAL_YARD,
  TILE,
  WORLD_H,
  WORLD_W,
  type Point,
  type TileRect,
} from './layout.ts';

export const DEPTH = {
  ground: 0,
  decor: 1,
  abyss: 2,
  /** Camada de sombras projetadas: acima do chão e da água, abaixo de tudo que fica de pé. */
  shadow: 2.5,
  night: 10000,
  lights: 10001,
  labels: 10002,
  floating: 10010,
};

/**
 * Algo que ocupa chão: a cena lê a transparência da imagem e bloqueia as células que
 * ela cobre, para ninguém atravessar. `origin` segue o setOrigin da imagem.
 */
export interface Solid {
  key: string;
  frame?: number;
  x: number;
  y: number;
  origin?: [number, number];
  opts?: FootprintOptions;
}

/** Só a base de objetos e o tronco das árvores: dá para passar por trás da copa. */
const TRUNK: FootprintOptions = { fromBottom: 6, minCover: 0.25 };
const BASE: FootprintOptions = { fromBottom: 8, minCover: 0.3 };

/** Gerador local só para enfeite (não toca no RNG do núcleo). */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function packTree(scene: Phaser.Scene, solids: Solid[], name: string, px: number, py: number): void {
  // Pé na parede de rocha de um paredão: árvore ali pareceria pendurada no barranco.
  if (onFace(px, py, 6)) return;
  // A sombra vem da camada de sombras (silhueta projetada a partir do que está em `solids`).
  sway(scene.add.image(px, py, name).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(py));
  solids.push({ key: name, x: px, y: py, opts: TRUNK });
}

/** Casinhas dos moradores: imagem do pack + overlay de janelas para a noite. */
export function buildCottages(scene: Phaser.Scene, solids: Solid[]): Phaser.GameObjects.Image[] {
  const lights: Phaser.GameObjects.Image[] = [];
  HOME_LOTS.forEach((lot, i) => {
    const x = (lot.tx + lot.tw / 2) * TILE;
    const y = (lot.ty + lot.th) * TILE;
    const id = `building/house/0${i + 1}`;
    scene.add.image(x, y, id).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y);
    solids.push({ key: id, x, y });
    const light = scene.add
      .image(x, y, `${id}-lights`)
      .setOrigin(0.5, 1)
      .setScale(ART_SCALE)
      .setDepth(DEPTH.lights)
      .setAlpha(0);
    lights.push(light);
  });
  return lights;
}

/** Só sombra: não ocupa chão (samambaia, taboa). */
const NO_BLOCK: FootprintOptions = { minCover: 2 };
const LOW: FootprintOptions = { fromBottom: 6, minCover: 0.25 };

interface Decor {
  id: string;
  x: number;
  y: number;
  opts?: FootprintOptions;
  flip?: boolean;
}

/**
 * Enfeites de transição (Fase 3 do visual 2.5D), no desenho da referência: barris e
 * caixotes na taverna, lenha na guilda e no ferreiro, lápides quebradas e cerca torta
 * no cemitério, pedras corrompidas e espinheiro na caverna, mato em volta da fonte e
 * no pé da escadaria da praça.
 */
export const DECOR: Decor[] = [
  // Taverna: barris e caixote no canto direito, junto da estrada do berrante.
  { id: 'prop/barrel', x: 698, y: 478, opts: BASE },
  { id: 'prop/barrel', x: 716, y: 482, opts: BASE },
  { id: 'prop/crate', x: 734, y: 474, opts: BASE },
  { id: 'prop/barrel', x: 458, y: 470, opts: BASE },
  // Lenha: guilda (direita) e ferreiro (esquerda, na beira da estrada).
  { id: 'prop/logs', x: 1176, y: 478, opts: BASE },
  { id: 'prop/logs', x: 1232, y: 846, opts: BASE },
  { id: 'prop/logs', x: 112, y: 474, opts: BASE },
  // Cemitério: lápides velhas fora da cerca e cerca torta ao lado.
  { id: 'prop/grave-broken', x: 94, y: 424, opts: LOW },
  { id: 'prop/grave-leaning', x: 126, y: 404, opts: LOW },
  { id: 'prop/grave-leaning', x: 418, y: 146, opts: LOW, flip: true },
  { id: 'prop/grave-broken', x: 446, y: 214, opts: LOW },
  { id: 'prop/fence-crooked', x: 432, y: 268, opts: LOW },
  { id: 'prop/fence-crooked', x: 446, y: 104, opts: LOW, flip: true },
  // Caverna: pedras com cristal roxo e espinheiro em volta da boca.
  { id: 'prop/bramble-corrupt', x: 1328, y: 484, opts: LOW },
  { id: 'prop/crystal-corrupt-02', x: 1298, y: 500, opts: BASE },
  { id: 'prop/crystal-corrupt-01', x: 1352, y: 470, opts: BASE },
  { id: 'prop/crystal-corrupt-01', x: 1524, y: 478, opts: BASE, flip: true },
  { id: 'prop/bramble-corrupt', x: 1552, y: 494, opts: LOW, flip: true },
  { id: 'prop/crystal-corrupt-02', x: 1474, y: 510, opts: BASE },
  // Fonte termal: mato denso e taboas na beira.
  { id: 'prop/fern', x: 704, y: 968, opts: NO_BLOCK },
  { id: 'prop/bush', x: 716, y: 1004, opts: BASE },
  { id: 'prop/reeds', x: 752, y: 920, opts: NO_BLOCK },
  { id: 'prop/reeds', x: 886, y: 926, opts: NO_BLOCK, flip: true },
  { id: 'prop/fern', x: 926, y: 966, opts: NO_BLOCK, flip: true },
  { id: 'prop/bush', x: 912, y: 1002, opts: BASE },
  { id: 'prop/fern', x: 868, y: 1012, opts: NO_BLOCK },
  // Pé da escadaria da praça.
  { id: 'prop/fern', x: 738, y: 790, opts: NO_BLOCK },
  { id: 'prop/bush', x: 866, y: 786, opts: BASE },
  { id: 'prop/logs', x: 878, y: 812, opts: BASE },
];

export function buildDecor(scene: Phaser.Scene, solids: Solid[]): void {
  for (const d of DECOR) {
    scene.add.image(d.x, d.y, d.id).setOrigin(0.5, 1).setScale(ART_SCALE).setFlipX(d.flip === true).setDepth(d.y);
    solids.push({ key: d.id, x: d.x, y: d.y, opts: d.opts ?? BASE });
  }
}

/** Copas em primeiro plano: acima da fumaça e da neblina, abaixo do mapa de luz. */
export const FOREGROUND_DEPTH = 9600;

/**
 * Copas escuras "perto da câmera" nas bordas da vila (fx/parallax): emolduram o mapa
 * quando a câmera chega na beira e somem no meio da vila. Balançam com o vento.
 */
export function buildForeground(scene: Phaser.Scene): ParallaxLayer {
  const layer = new ParallaxLayer(WORLD_W, WORLD_H);
  const rnd = seeded(97);
  const names = ['prop/tree/pine', 'prop/tree/pine', 'prop/tree/01', 'prop/tree/autumn'];
  const put = (x: number, y: number, edge: Edge): void => {
    const name = names[Math.floor(rnd() * names.length)]!;
    const size = ART_SCALE * (1.5 + rnd() * 0.4);
    const img = scene.add.image(x, y, name).setOrigin(0.5, 1).setScale(size).setFlipX(rnd() < 0.5).setTint(0x16201b).setAlpha(0.94).setDepth(FOREGROUND_DEPTH);
    layer.add(sway(img), edge);
  };
  for (let x = -30; x < WORLD_W + 60; x += 70 + rnd() * 50) put(x, WORLD_H + 84 + rnd() * 20, 'bottom');
  for (let y = 180; y < WORLD_H + 40; y += 100 + rnd() * 70) {
    put(-10 + rnd() * 24, y, 'left');
    put(WORLD_W + 10 - rnd() * 24, y + 40, 'right');
  }
  return layer;
}

/** Neblina rasteira: sobre o cemitério e nas quatro bordas da floresta. */
export function buildFog(scene: Phaser.Scene): FogSystem {
  const fog = new FogSystem(scene);
  const c = CEMETERY_TILES;
  fog.add({ x: c.tx * TILE - 40, y: (c.ty + 1) * TILE, w: c.tw * TILE + 80, h: c.th * TILE - 10, count: 7, day: 0.3, night: 0.7, speed: 5, depth: (c.ty + c.th + 1) * TILE + 4, scale: 1.3 });
  // Nas bordas a névoa fica por cima do mapa de luz: à noite ela continua cinza, não some no escuro.
  const edge = { day: 0.24, night: 0.2, depth: DEPTH.night + 0.5, scale: 1.9, tint: 0x8a96a2 };
  fog.add({ ...edge, x: -120, y: 0, w: 220, h: WORLD_H, count: 9, speed: 3 });
  fog.add({ ...edge, x: WORLD_W - 100, y: 0, w: 220, h: WORLD_H, count: 9, speed: 3 });
  fog.add({ ...edge, x: 0, y: WORLD_H - 80, w: WORLD_W, h: 130, count: 12, speed: 4 });
  fog.add({ ...edge, x: 0, y: -60, w: WORLD_W, h: 100, count: 10, speed: 4 });
  return fog;
}

/** Árvores soltas e enfeites nos espaços livres. */
export function scatterTrees(scene: Phaser.Scene, mask: boolean[][], solids: Solid[]): void {
  const rnd = seeded(29);
  const reserved: TileRect[] = [
    ...Object.values(LOT_TILES),
    ...FORESTS,
    ...AUTUMN,
    PLAZA_TILES,
    { tx: CEMETERY_TILES.tx - 1, ty: CEMETERY_TILES.ty - 1, tw: CEMETERY_TILES.tw + 2, th: CEMETERY_TILES.th + 3 },
    { tx: 0, ty: 10, tw: 7, th: 7 }, // entrada com berrante
    { tx: 20, ty: 5, tw: 10, th: 3 }, // abadia
    THERMAL_YARD,
    EXPANSION_TILES,
    ...HOME_LOTS,
    ...DECOR.map((d) => ({ tx: Math.floor(d.x / TILE) - 1, ty: Math.floor(d.y / TILE) - 1, tw: 3, th: 2 })),
  ];
  const nearDirt = (x: number, y: number): boolean =>
    [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => mask[y + dy]?.[x + dx] === true));
  const free = (x: number, y: number): boolean =>
    y >= 1 && y < ROWS && x >= 0 && x < COLS && !nearDirt(x, y) && !reserved.some((r) => inRect(r, x, y));
  const occupied = (x: number, y: number): boolean =>
    [
      ...HOME_LOTS,
      ...Object.values(LOT_TILES),
      THERMAL_YARD,
      PLAZA_TILES,
      CEMETERY_TILES,
      { tx: 21, ty: 0, tw: 7, th: 8 }, // entrada/berrante no topo central
      { tx: 20, ty: 5, tw: 10, th: 3 }, // abadia
      { tx: 43, ty: 11, tw: 4, th: 5 }, // boca/terreiro da caverna
    ].some((r) => inRect(r, x, y));

  // Florestas: manchas de pinheiros sobre a grama.
  for (const f of FORESTS) {
    for (let y = f.ty; y < f.ty + f.th; y += 2) {
      for (let x = f.tx; x < f.tx + f.tw; x += 2) {
        if (rnd() < 0.25 || occupied(x, y)) continue;
        packTree(scene, solids, 'prop/tree/pine', (x + 0.5) * TILE, (y + 1) * TILE);
      }
    }
  }
  for (const f of AUTUMN) {
    for (let y = f.ty; y < f.ty + f.th; y += 2) {
      for (let x = f.tx; x < f.tx + f.tw; x += 2) {
        if (rnd() < 0.3 || occupied(x, y)) continue;
        packTree(scene, solids, rnd() < 0.35 ? 'prop/tree/autumn-small' : 'prop/tree/autumn', (x + 0.5) * TILE, (y + 1) * TILE);
      }
    }
  }

  let trees = 0;
  for (let i = 0; i < 1200 && trees < 40; i++) {
    const x = Math.floor(rnd() * COLS);
    const y = 1 + Math.floor(rnd() * (ROWS - 1));
    if (!free(x, y)) continue;
    const r = rnd();
    const name = r < 0.55 ? 'prop/tree/pine' : r < 0.85 ? 'prop/tree/01' : 'prop/tree/dead';
    packTree(scene, solids, name, (x + 0.5) * TILE, (y + 1) * TILE);
    reserved.push({ tx: x, ty: y - 1, tw: 1, th: 2 });
    trees++;
  }
}

/**
 * Floresta que cobre o distrito sul até o prefeito mandar limpar ("a floresta ao sul
 * esconde três lotes"): árvores cerradas, secas e pedras por cima dos lotes e da trilha.
 * Devolve as imagens (somem ao limpar) e o que ocupa chão.
 */
export function buildOvergrowth(scene: Phaser.Scene): { images: Phaser.GameObjects.Image[]; solids: Solid[] } {
  const rnd = seeded(71);
  const images: Phaser.GameObjects.Image[] = [];
  const solids: Solid[] = [];
  const r = EXPANSION_TILES;
  for (let y = r.ty; y < r.ty + r.th; y++) {
    for (let x = r.tx; x < r.tx + r.tw; x++) {
      if (rnd() < 0.42) continue;
      const v = rnd();
      const name =
        v < 0.42 ? 'prop/tree/pine' : v < 0.66 ? 'prop/tree/autumn-small' : v < 0.78 ? 'prop/tree/dead' : v < 0.9 ? 'prop/tree/01' : v < 0.95 ? 'prop/boulder/01' : 'prop/boulder/02';
      const px = Math.round((x + 0.5) * TILE + (rnd() - 0.5) * 12);
      const py = Math.round((y + 1) * TILE - rnd() * 6);
      const img = scene.add.image(px, py, name).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(py);
      images.push(name.startsWith('prop/tree') ? sway(img) : img);
      solids.push({ key: name, x: px, y: py, opts: name.startsWith('prop/boulder') ? BASE : TRUNK });
    }
  }
  return { images, solids };
}

export interface AbyssView {
  glow: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Text;
}

export function buildAbyss(scene: Phaser.Scene): AbyssView {
  const { x } = LANDMARKS.abismo;
  const base = 15 * TILE;
  scene.add.image(x, base, 'prop/abyss/cave').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(base);

  const glow = scene.add
    .image(x, base - 26, 'glow')
    .setTint(0x9a4ad0)
    .setScale(3.4, 2.2)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.lights)
    .setAlpha(0.4);
  scene.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.6 }, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });

  const badge = pill(
    smooth(
      scene.add.text(x, 9.5 * TILE, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#e8d8ff',
        stroke: '#000000',
        strokeThickness: 2,
      }),
    ),
    'rgba(28, 12, 40, 0.66)',
  )
    .setOrigin(0.5)
    .setDepth(DEPTH.labels);
  return { glow, badge };
}

/** Texto nítido: a arte usa filtro "nearest", mas texto reduzido assim fica serrilhado. */
export function smooth<T extends Phaser.GameObjects.Text>(text: T): T {
  text.setResolution(2);
  text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return text;
}

/**
 * Puxa as UVs de cada moldura meio texel para dentro. Em zoom fracionário (1,5×/2,5×)
 * a borda de um tile cai em meio pixel e a GPU amostra o pixel da moldura vizinha do
 * atlas: é a linha vertical que aparece ao lado de portão, quadro e prédios. Meio texel
 * basta para a amostra continuar dentro do próprio tile, sem mudar o desenho em 1×.
 * O chão já foi assado antes disto, então a textura estática não é afetada.
 */
export function insetTownFrames(scene: Phaser.Scene, texels = 0.5): void {
  const texture = scene.textures.get('town');
  const source = texture.getSourceImage() as { width: number; height: number };
  const tw = source.width;
  const th = source.height;
  for (const frame of Object.values(texture.frames)) {
    if (!frame || frame.name === '__BASE') continue;
    frame.setUVs(
      frame.width,
      frame.height,
      frame.cutX / tw + texels / tw,
      frame.cutY / th + texels / th,
      (frame.cutX + frame.width) / tw - texels / tw,
      (frame.cutY + frame.height) / th - texels / th,
    );
  }
}

/**
 * Plaquinha: fundo escuro translúcido, de cantos redondos, atrás do texto. Deixa o nome
 * legível em cima de telhado, rocha ou grama sem o contorno grosso, e a arte respira.
 * O fundo é pintado no próprio canvas do texto toda vez que o texto muda.
 */
export function pill<T extends Phaser.GameObjects.Text>(text: T, fill = 'rgba(14, 12, 10, 0.6)'): T {
  text.setPadding(6, 2, 6, 3);
  const update = text.updateText.bind(text);
  text.updateText = (): T => {
    update();
    const { canvas, context } = text;
    context.save();
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = fill;
    context.beginPath();
    if (typeof context.roundRect === 'function') context.roundRect(0, 0, canvas.width, canvas.height, canvas.height / 2);
    else context.rect(0, 0, canvas.width, canvas.height);
    context.fill();
    context.restore();
    const renderer = text.renderer;
    if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      text.frame.source.glTexture = renderer.canvasToTexture(canvas, text.frame.source.glTexture ?? undefined, true);
    }
    return text;
  };
  text.updateText();
  return text;
}

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 14, color = '#f0e6d0'): Phaser.GameObjects.Text {
  return pill(smooth(scene.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: `${size}px`, color, stroke: '#0b0a08', strokeThickness: 2 })))
    .setOrigin(0.5, 0)
    .setDepth(DEPTH.labels)
    .setName('label');
}

export function buildCemetery(scene: Phaser.Scene, solids: Solid[]): void {
  const r = CEMETERY_TILES;
  const x0 = r.tx * TILE;
  const x1 = (r.tx + r.tw - 1) * TILE;
  const y0 = (r.ty + 1) * TILE;
  const y1 = (r.ty + r.th) * TILE;
  const key = 'tile/town/cemetery-fence';
  const put = (frame: number, x: number, y: number): void => {
    scene.add.image(x, y, key, frame).setOrigin(0, 0).setScale(ART_SCALE).setDepth(y + 2);
    // A cerca fecha o cemitério; o portãozinho de baixo (quadro 6) fica aberto.
    if (frame !== 6) solids.push({ key, frame, x, y, origin: [0, 0], opts: { minCover: 0.2 } });
  };
  put(2, x0, y0);
  for (let x = x0 + TILE; x < x1; x += TILE) put(0, x, y0);
  put(3, x1, y0);
  put(4, x0, y1);
  for (let x = x0 + TILE; x < x1; x += TILE) put(x === x0 + 4 * TILE ? 6 : 0, x, y1);
  put(5, x1, y1);
  for (let y = y0 + TILE; y < y1; y += TILE) {
    put(1, x0, y);
    put(1, x1, y);
  }
  // Acima da cerca de cima: embaixo fica a escadinha do paredão.
  label(scene, (r.tx + r.tw / 2) * TILE, (r.ty + 1) * TILE - 24, 'Cemitério', 14, '#c8c0b0');
}

export interface HornView {
  ready: Phaser.GameObjects.Image;
  blast: () => void;
}

export function buildHornTower(scene: Phaser.Scene, solids: Solid[]): HornView {
  const base = (HORN_TOWER.ty + HORN_TOWER.th) * TILE;
  const c = (HORN_TOWER.tx + HORN_TOWER.tw / 2) * TILE;
  scene.add.image(c, base, 'prop/gate-horn/open').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(base);
  // Só os pilares e a guarita: a passagem do meio é transparente na arte.
  solids.push({ key: 'prop/gate-horn/open', x: c, y: base, opts: { fromBottom: 24, minCover: 0.35 } });
  const hornY = base - 4.5 * TILE;
  const ready = scene.add
    .image(c, hornY, 'glow')
    .setTint(0xffc46b)
    .setScale(1.8)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.lights);
  scene.tweens.add({ targets: ready, alpha: { from: 0.15, to: 0.6 }, yoyo: true, repeat: -1, duration: 900 });
  label(scene, c, base + 10, 'Berrante', 13);
  const blast = () => {
    for (let i = 0; i < 3; i++) {
      const ring = scene.add.circle(c - 6, hornY, 10).setStrokeStyle(4, 0xffc46b, 0.9).setDepth(DEPTH.floating);
      scene.tweens.add({ targets: ring, radius: 220, alpha: 0, duration: 1600, delay: i * 350, onComplete: () => ring.destroy() });
    }
  };
  return { ready, blast };
}

export interface BoardView {
  update: (contracts: number, enabled: boolean) => void;
}

export function buildBoard(scene: Phaser.Scene, solids: Solid[]): BoardView {
  const x = 28 * TILE;
  const base = 17 * TILE;
  const board = scene.add.image(x, base, 'prop/board').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(base);
  solids.push({ key: 'prop/board', x, y: base, opts: BASE });
  label(scene, x, base - 2 * TILE - 4, 'Quadro', 13).setOrigin(0.5, 1);
  let last = '';
  const update = (contracts: number, enabled: boolean) => {
    const key = `${contracts}:${enabled}`;
    if (key === last) return;
    last = key;
    board.setAlpha(enabled ? 1 : 0.65);
  };
  return { update };
}

export interface CofferView {
  update: (treasury: number) => void;
}

export function buildCoffer(scene: Phaser.Scene, solids: Solid[]): CofferView {
  const { x, y } = LANDMARKS.cofre;
  const chest = scene.add.image(x, y + 8, 'prop/coffer').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y + 8);
  solids.push({ key: 'prop/coffer', x, y: y + 8, opts: { fromBottom: 12, minCover: 0.3 } });
  let shown = -1;
  const update = (treasury: number) => {
    const step = Math.floor(Math.log2(treasury / 15 + 1));
    if (step === shown) return;
    shown = step;
    chest.setScale(ART_SCALE + Math.min(0.35, step * 0.015));
  };
  label(scene, x, y + 10, 'Cofre', 13);
  return { update };
}

export function buildCampfire(scene: Phaser.Scene, solids: Solid[]): void {
  const { x, y } = LANDMARKS.fogueira;
  scene.add.image(x, y, 'prop/campfire/on').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y - 2);
  solids.push({ key: 'prop/campfire/on', x, y, opts: { fromBottom: 10, minCover: 0.3 } });
  scene.add.sprite(x, y - 4, 'fx/fire').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y - 1).play('fx/fire');
}

/** Fonte termal: bacia natural do pack, água separada, vapor e banco. */
export function buildThermal(scene: Phaser.Scene, solids: Solid[]): void {
  const r = THERMAL_TILES;
  const cx = (r.tx + r.tw / 2) * TILE;
  const base = (r.ty + r.th) * TILE;
  scene.add.image(cx, base, 'prop/thermal/basin').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(DEPTH.decor);
  solids.push({ key: 'prop/thermal/basin', x: cx, y: base });
  scene.add.image(cx, base, 'prop/thermal/water').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(DEPTH.decor + 1).setAlpha(0.9);
  scene.add
    .image(cx - (r.tw / 2 - 0.4) * TILE, base - 2, 'prop/thermal/bench')
    .setOrigin(0.5, 1)
    .setScale(ART_SCALE)
    .setDepth(base);
  const steam = scene.add
    .sprite(cx, base - 24, 'fx/steam')
    .setOrigin(0.5, 1)
    .setScale(ART_SCALE)
    .setDepth(DEPTH.floating)
    .setAlpha(0.8);
  steam.play('fx/steam');
  label(scene, LANDMARKS.termas.x, r.ty * TILE - 24, 'Fonte termal', 13, '#c8e8e0');
}
/**
 * Props de praça do pack 1.7. Devolve, para o ciclo dia/noite, o desenho aceso de cada
 * lampião e o halo em volta (o mesmo brilho da lanterna do prefeito).
 */
export function buildProps(scene: Phaser.Scene, solids: Solid[]): { lights: Phaser.GameObjects.Image[]; lamps: Point[] } {
  const prop = (id: string, x: number, y: number): void => {
    scene.add.image(x, y, id).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y);
    solids.push({ key: id, x, y, opts: BASE });
  };
  prop('prop/well', 21 * TILE + 16, 16 * TILE);
  prop('prop/hay', 22 * TILE, 21 * TILE);
  prop('prop/sacks', 14 * TILE, 15 * TILE);
  prop('prop/bucket', 22 * TILE, 16 * TILE);
  prop('prop/logs', LANDMARKS.fogueira.x - 52, LANDMARKS.fogueira.y + 4);
  prop('prop/barrel', 17 * TILE, 17 * TILE);
  prop('prop/crate', 26 * TILE, 16 * TILE);
  prop('prop/bench', 22 * TILE, 19 * TILE);
  // Carroça parada na estrada da estalagem; as marcas das rodas saem dela (terrain.ts).
  prop('prop/cart', 222, 900);

  const lights: Phaser.GameObjects.Image[] = [];
  const lamps: Point[] = [];
  const lamp = (x: number, y: number): void => {
    scene.add.image(x, y, 'prop/lamp').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y);
    solids.push({ key: 'prop/lamp', x, y, opts: { fromBottom: 4, minCover: 0.15 } });
    const light = scene.add
      .image(x, y, 'prop/lamp-lights')
      .setOrigin(0.5, 1)
      .setScale(ART_SCALE)
      .setDepth(DEPTH.lights)
      .setAlpha(0);
    lights.push(light);
    // A chama fica no alto do poste, um pouco à direita do meio (x 11, y 14 da arte 16×32).
    lamps.push({ x: x + 6, y: y - 36 });
  };
  lamp(18 * TILE, 17 * TILE);
  lamp(32 * TILE, 17 * TILE);
  lamp(23 * TILE, 13 * TILE);
  lamp(43 * TILE, 18 * TILE);
  return { lights, lamps };
}
