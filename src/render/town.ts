// A vila montada com tiles do Tiny Town (Kenney) e peças do DungeonTileset II (0x72).

import Phaser from 'phaser';
import { ART_SCALE, T } from './assets.ts';
import { ABYSS_ROWS, AUTUMN, dirtMask, dirtTile, FORESTS, inRect } from './ground.ts';
import {
  CEMETERY_TILES,
  COLS,
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
  type TileRect,
} from './layout.ts';

export const DEPTH = {
  ground: 0,
  decor: 1,
  abyss: 2,
  night: 10000,
  lights: 10001,
  labels: 10002,
  floating: 10010,
};

/** Gerador local só para enfeite (não toca no RNG do núcleo). */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nine(set: readonly number[], r: TileRect, x: number, y: number): number {
  const col = x === r.tx ? 0 : x === r.tx + r.tw - 1 ? 2 : 1;
  const row = y === r.ty ? 0 : y === r.ty + r.th - 1 ? 2 : 1;
  return set[row * 3 + col]!;
}

/** Imagem de um tile do Tiny Town no mundo, com a base em (x, y). */
export function townTile(scene: Phaser.Scene, frame: number, x: number, y: number, depth = y): Phaser.GameObjects.Image {
  return scene.add.image(x, y, 'town', frame).setOrigin(0, 1).setScale(ART_SCALE).setDepth(depth);
}

export function dungeonPiece(scene: Phaser.Scene, frame: string, x: number, y: number, depth = y): Phaser.GameObjects.Image {
  return scene.add.image(x, y, 'dungeon', frame).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(depth);
}

/** Casinhas dos moradores: quatro tiles de largura, telhado e parede alternados. */
export function buildCottages(scene: Phaser.Scene): void {
  HOME_LOTS.forEach((lot, i) => {
    const baseX = lot.tx * TILE;
    const baseY = (lot.ty + lot.th) * TILE;
    const red = i % 2 === 0;
    const roof = red ? T.roofRed : T.roofGray;
    const wall = red ? T.wood : T.stone;
    const rows = [
      [roof.tl, roof.t, roof.t, roof.tr],
      [wall.l, wall.win, wall.win, wall.r],
      [wall.l, wall.door, wall.win, wall.r],
    ];
    rows.forEach((row, r) =>
      row.forEach((frame, c) => townTile(scene, frame, baseX + c * TILE, baseY - (rows.length - 1 - r) * TILE, baseY)),
    );
  });
}

export function buildGround(scene: Phaser.Scene): boolean[][] {
  const mask = dirtMask();
  const map = scene.make.tilemap({ tileWidth: 16, tileHeight: 16, width: COLS, height: ROWS });
  const tiles = map.addTilesetImage('town', 'town', 16, 16, 0, 0)!;
  const ground = map.createBlankLayer('ground', tiles)!.setScale(ART_SCALE).setDepth(DEPTH.ground);
  const decor = map.createBlankLayer('decor', tiles)!.setScale(ART_SCALE).setDepth(DEPTH.decor);
  const rnd = seeded(7);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (mask[y]![x]) {
        ground.putTileAt(dirtTile(mask, x, y), x, y);
        continue;
      }
      const r = rnd();
      ground.putTileAt(r < 0.08 ? T.grassFlower : r < 0.3 ? T.grassTuft : T.grass, x, y);
      const forest = FORESTS.find((f) => inRect(f, x, y));
      const autumn = AUTUMN.find((f) => inRect(f, x, y));
      if (forest) decor.putTileAt(nine(T.forest, forest, x, y), x, y);
      else if (autumn) decor.putTileAt(nine(T.autumnForest, autumn, x, y), x, y);
    }
  }
  // O chão é estático. Assar as duas camadas numa textura única resolve a emenda de
  // 1 px que aparece entre tiles quando a câmera rola em zoom fracionário (1,5×/2,5×):
  // sem quads vizinhos, não há borda de tile para rasgar. Também é um desenho só por quadro.
  const baked = scene.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0, 0).setDepth(DEPTH.ground);
  baked.draw(ground, 0, 0);
  baked.draw(decor, 0, 0);
  baked.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  ground.setActive(false).setVisible(false);
  decor.setActive(false).setVisible(false);
  return mask;
}

/** Árvores soltas e enfeites nos espaços livres. */
export function scatterTrees(scene: Phaser.Scene, mask: boolean[][]): void {
  const rnd = seeded(29);
  const reserved: TileRect[] = [
    ...Object.values(LOT_TILES),
    ...FORESTS,
    ...AUTUMN,
    PLAZA_TILES,
    { tx: CEMETERY_TILES.tx - 1, ty: CEMETERY_TILES.ty - 1, tw: CEMETERY_TILES.tw + 2, th: CEMETERY_TILES.th + 3 },
    { tx: 0, ty: 10, tw: 7, th: 7 }, // portão com berrante na entrada
    { tx: 20, ty: 5, tw: 10, th: 3 }, // abadia
    THERMAL_YARD,
    ...HOME_LOTS,
  ];
  const nearDirt = (x: number, y: number): boolean =>
    [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => mask[y + dy]?.[x + dx] === true));
  const free = (x: number, y: number): boolean =>
    y >= ABYSS_ROWS + 1 && y < ROWS && x >= 0 && x < COLS && !nearDirt(x, y) && !reserved.some((r) => inRect(r, x, y));
  const decor: number[] = [T.sprout, T.mushrooms, T.stones, T.bush];
  let trees = 0;
  for (let i = 0; i < 1200 && trees < 48; i++) {
    const x = Math.floor(rnd() * COLS);
    const y = ABYSS_ROWS + 1 + Math.floor(rnd() * (ROWS - ABYSS_ROWS - 1));
    if (!free(x, y)) continue;
    const kind = rnd();
    const px = x * TILE;
    const py = (y + 1) * TILE;
    if (kind < 0.45 && free(x, y - 1)) {
      const autumn = rnd() < 0.3;
      townTile(scene, autumn ? T.autumnBase : T.pineBase, px, py);
      townTile(scene, autumn ? T.autumnTop : T.pineTop, px, py - TILE, py);
    } else if (kind < 0.75) {
      townTile(scene, rnd() < 0.3 ? T.autumnSmall : T.pineSmall, px, py);
    } else {
      townTile(scene, decor[Math.floor(rnd() * decor.length)]!, px, py, DEPTH.decor + 1);
    }
    reserved.push({ tx: x, ty: y - 1, tw: 1, th: 2 });
    trees++;
  }
}

export interface AbyssView {
  glow: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Text;
}

export function buildAbyss(scene: Phaser.Scene): AbyssView {
  const rnd = seeded(13);
  const g = scene.add.graphics().setDepth(DEPTH.abyss);
  // Escuridão com borda em degraus de pixel (linhas inteiras de tile, com mordidas de 8 px).
  g.fillStyle(0x07060a);
  g.fillRect(-WORLD_W, -3000, WORLD_W * 3, 3000 + (ABYSS_ROWS - 1) * TILE);
  for (let x = -2; x < COLS + 2; x++) {
    const nearAbbey = x >= 20 && x <= 29;
    const bite = nearAbbey ? 0 : Math.floor(rnd() * 3) * 8;
    g.fillRect(x * TILE, (ABYSS_ROWS - 1) * TILE, TILE, TILE + bite);
  }
  g.fillStyle(0x110d16, 1);
  for (let x = -2; x < COLS + 2; x++) g.fillRect(x * TILE, (ABYSS_ROWS - 1) * TILE - 12, TILE, 6);
  // Beirada de pedra (borda de piso caindo no vazio)
  for (let x = 0; x < COLS; x++) {
    if (x >= 22 && x <= 27) continue;
    scene.add
      .image(x * TILE + TILE / 2, ABYSS_ROWS * TILE, 'dungeon', 'edge_down')
      .setOrigin(0.5, 0)
      .setScale(ART_SCALE)
      .setDepth(DEPTH.abyss + 1)
      .setTint(0x8a8078);
  }
  const glow = scene.add
    .image(WORLD_W / 2, 40, 'glow')
    .setTint(0x6a2a8a)
    .setScale(18, 4)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.abyss + 1)
    .setAlpha(0.4);

  // Luz violeta subindo pela escada
  const stairsGlow = scene.add
    .image(WORLD_W / 2, (ABYSS_ROWS - 0.5) * TILE, 'glow')
    .setTint(0x9a4ad0)
    .setScale(3.2, 1.8)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.abyss + 3)
    .setAlpha(0.45);
  scene.tweens.add({ targets: stairsGlow, alpha: { from: 0.3, to: 0.6 }, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' });

  // Ruínas da abadia em volta da escada que desce
  const floors = ['floor_1', 'floor_2', 'floor_3', 'floor_4', 'floor_5', 'floor_6', 'floor_7', 'floor_8'];
  for (let x = 22; x <= 27; x++) {
    scene.add
      .image(x * TILE, ABYSS_ROWS * TILE, 'dungeon', floors[Math.floor(rnd() * floors.length)])
      .setOrigin(0, 0)
      .setScale(ART_SCALE)
      .setDepth(DEPTH.abyss + 1);
    if (x === 24 || x === 25) {
      scene.add
        .image(x * TILE, (ABYSS_ROWS - 1) * TILE, 'dungeon', 'floor_stairs')
        .setOrigin(0, 0)
        .setScale(ART_SCALE)
        .setDepth(DEPTH.abyss + 2);
    }
  }
  for (const [x, frame] of [
    [20, 'wall_hole_1'],
    [21, 'wall_mid'],
    [28, 'wall_mid'],
    [29, 'wall_hole_2'],
  ] as const) {
    scene.add.image(x * TILE, (ABYSS_ROWS - 1) * TILE, 'dungeon', 'wall_top_mid').setOrigin(0, 1).setScale(ART_SCALE).setDepth(ABYSS_ROWS * TILE - 2);
    scene.add.image(x * TILE, (ABYSS_ROWS - 1) * TILE, 'dungeon', frame).setOrigin(0, 0).setScale(ART_SCALE).setDepth(ABYSS_ROWS * TILE - 1);
  }
  dungeonPiece(scene, 'column', 23 * TILE - 2, (ABYSS_ROWS + 1) * TILE - 6);
  dungeonPiece(scene, 'column', 27 * TILE + 2, (ABYSS_ROWS + 1) * TILE - 6);
  dungeonPiece(scene, 'skull', 21 * TILE + 8, (ABYSS_ROWS + 1) * TILE + 4).setAlpha(0.85);

  // Brasas violetas subindo do fundo
  for (let i = 0; i < 18; i++) {
    const spark = scene.add
      .image(Math.round(120 + rnd() * (WORLD_W - 240)), 140, 'spark')
      .setTint(0xb46ae0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.abyss + 1)
      .setScale(ART_SCALE)
      .setAlpha(0);
    scene.tweens.add({
      targets: spark,
      y: { from: 150 + rnd() * 20, to: 20 + rnd() * 40 },
      alpha: { from: 0.8, to: 0 },
      duration: 3000 + rnd() * 3000,
      delay: rnd() * 4000,
      repeat: -1,
    });
  }
  const badge = smooth(scene.add.text(WORLD_W / 2, 92, '', { fontFamily: 'Georgia, serif', fontSize: '15px', color: '#e8d8ff', stroke: '#000000', strokeThickness: 4 }))
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

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 14, color = '#f0e6d0'): Phaser.GameObjects.Text {
  return smooth(scene.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: `${size}px`, color, stroke: '#0b0a08', strokeThickness: 4 }))
    .setOrigin(0.5, 0)
    .setDepth(DEPTH.labels)
    .setName('label');
}

export function buildCemetery(scene: Phaser.Scene): void {
  const r = CEMETERY_TILES;
  const iron = 0x7a7470;
  const gate = { from: 42, to: 44 };
  for (let x = r.tx; x < r.tx + r.tw; x++) {
    const top = x === r.tx ? T.fenceL : x === r.tx + r.tw - 1 ? T.fenceR : T.fenceM;
    townTile(scene, top, x * TILE, (r.ty + 1) * TILE).setTint(iron);
    if (x >= gate.from && x <= gate.to) continue;
    const bottom = x === r.tx || x === gate.to + 1 ? T.fenceL : x === r.tx + r.tw - 1 || x === gate.from - 1 ? T.fenceR : T.fenceM;
    townTile(scene, bottom, x * TILE, (r.ty + r.th) * TILE).setTint(iron);
  }
  for (const x of [r.tx, r.tx + r.tw - 1]) {
    for (let y = r.ty + 1; y < r.ty + r.th - 1; y++) townTile(scene, y === r.ty + 1 ? T.fenceVTop : T.fenceV, x * TILE, (y + 1) * TILE).setTint(iron);
  }
  // Árvore seca de 0x72? Não há: usa um toco e cogumelos.
  townTile(scene, T.mushrooms, (r.tx + 1) * TILE, (r.ty + 6) * TILE, DEPTH.decor + 1);
  label(scene, LANDMARKS.cemiterio.x, LANDMARKS.cemiterio.y + 4, 'Cemitério', 14, '#c8c0b0');
}

export interface HornView {
  ready: Phaser.GameObjects.Image;
  blast: () => void;
}

/** Portão da cidade + berrante num só desenho, no espírito da referência. */
function drawGateHorn(scene: Phaser.Scene): void {
  if (scene.textures.exists('gate-horn')) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const WD = 0x2a1a10;
  const WM = 0x6a4a2e;
  const WL = 0x9a6c3a;
  const WH = 0xc89a52;
  const IRON = 0x383840;
  const IRONL = 0x8a8a96;
  const HD = 0x2a241e;
  const H = 0x8a8070;
  const HL = 0xd0c4a8;
  const BR = 0x8a6a2a;
  const BRL = 0xd2a848;
  const ROPE = 0xa28458;
  const post = (x: number): void => {
    g.fillStyle(WD).fillRect(x, 43, 12, 53);
    g.fillStyle(WM).fillRect(x + 2, 45, 8, 51);
    g.fillStyle(WL).fillRect(x + 3, 47, 2, 47);
    g.fillStyle(WM).fillRect(x + 7, 45, 2, 51);
    g.fillStyle(IRON).fillRect(x + 1, 62, 10, 3);
    g.fillStyle(IRON).fillRect(x + 1, 80, 10, 3);
    g.fillStyle(IRONL).fillRect(x + 2, 62, 2, 1);
    g.fillStyle(IRONL).fillRect(x + 2, 80, 2, 1);
  };
  post(2);
  post(68);
  // Viga-mestra
  g.fillStyle(WD).fillRect(0, 37, 80, 15);
  g.fillStyle(WM).fillRect(2, 39, 76, 11);
  g.fillStyle(WL).fillRect(2, 41, 76, 2);
  g.fillStyle(WM).fillRect(2, 47, 76, 3);
  g.fillStyle(IRON).fillRect(0, 42, 4, 8);
  g.fillStyle(IRON).fillRect(76, 42, 4, 8);
  // Folha do portão aberta à esquerda
  g.fillStyle(WD).fillRect(9, 51, 20, 42);
  g.fillStyle(WM).fillRect(11, 53, 16, 38);
  for (let x = 13; x < 27; x += 4) {
    g.fillStyle(WL, 0.7).fillRect(x, 53, 1, 38);
    g.fillStyle(WD, 0.5).fillRect(x + 2, 53, 1, 38);
  }
  g.fillStyle(IRON).fillRect(11, 63, 16, 2);
  g.fillStyle(IRON).fillRect(11, 82, 16, 2);
  g.fillStyle(IRONL).fillRect(12, 63, 2, 1);
  g.lineStyle(2, WL, 0.5).lineBetween(12, 88, 26, 54);
  g.fillStyle(IRON).fillRect(8, 57, 3, 6);
  g.fillStyle(IRON).fillRect(8, 75, 3, 6);
  // Soleira
  g.fillStyle(WD).fillRect(2, 92, 76, 4);
  g.fillStyle(WM).fillRect(4, 93, 72, 2);
  // Mão de madeira do berrante
  g.fillStyle(WD).fillRect(24, 34, 36, 10);
  g.fillStyle(WM).fillRect(26, 36, 32, 6);
  g.fillStyle(WH).fillRect(28, 37, 28, 1);
  // Berrante grande, curvado, com bocal à direita
  const pts = [
    { x: 52, y: 2 }, { x: 62, y: 0 }, { x: 68, y: 5 }, { x: 69, y: 15 }, { x: 63, y: 23 },
    { x: 54, y: 27 }, { x: 44, y: 29 }, { x: 34, y: 35 }, { x: 25, y: 38 }, { x: 17, y: 35 },
    { x: 13, y: 28 }, { x: 16, y: 21 }, { x: 24, y: 18 }, { x: 34, y: 21 }, { x: 44, y: 20 },
    { x: 50, y: 15 }, { x: 49, y: 8 },
  ].map((p) => new Phaser.Geom.Point(p.x, p.y));
  g.fillStyle(HD).fillPoints(pts, true);
  const inner = pts.map((p) => new Phaser.Geom.Point(40 + (p.x - 40) * 0.86, 19 + (p.y - 19) * 0.82));
  g.fillStyle(H).fillPoints(inner, true);
  g.lineStyle(2, HL, 0.55).strokePoints(
    [new Phaser.Geom.Point(28, 22), new Phaser.Geom.Point(38, 20), new Phaser.Geom.Point(48, 16), new Phaser.Geom.Point(54, 10)],
    false,
  );
  g.lineStyle(2, HD, 0.9).strokePoints(
    [new Phaser.Geom.Point(24, 30), new Phaser.Geom.Point(36, 28), new Phaser.Geom.Point(46, 24), new Phaser.Geom.Point(56, 19)],
    false,
  );
  // Boca e braçadeiras
  g.fillStyle(BR).fillRect(58, 4, 9, 20);
  g.fillStyle(BRL).fillRect(59, 5, 2, 18);
  g.fillStyle(HD).fillPoints(
    [new Phaser.Geom.Point(60, 7), new Phaser.Geom.Point(67, 7), new Phaser.Geom.Point(66, 17), new Phaser.Geom.Point(61, 20), new Phaser.Geom.Point(58, 15)],
    true,
  );
  g.fillStyle(BR).fillRect(14, 26, 8, 7);
  g.fillStyle(BRL).fillRect(15, 27, 2, 5);
  // Cordas
  g.lineStyle(3, ROPE, 1).lineBetween(36, 8, 32, 36);
  g.lineStyle(3, ROPE, 1).lineBetween(48, 6, 44, 34);
  g.lineStyle(2, WD, 1).lineBetween(33, 36, 34, 44);
  g.fillStyle(WD).fillRect(30, 40, 20, 6);
  g.fillStyle(WH).fillRect(32, 41, 16, 1);
  g.generateTexture('gate-horn', 80, 96);
  g.destroy();
}

export function buildHornTower(scene: Phaser.Scene): HornView {
  drawGateHorn(scene);
  const x0 = HORN_TOWER.tx * TILE;
  const base = (HORN_TOWER.ty + HORN_TOWER.th) * TILE;
  scene.add.image(x0, base, 'gate-horn').setOrigin(0, 1).setScale(ART_SCALE).setDepth(base);
  const c = x0 + 2.5 * TILE;
  const hornY = base - 4.5 * TILE;
  const ready = scene.add
    .image(c, hornY, 'glow')
    .setTint(0xffc46b)
    .setScale(1.8)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.lights);
  scene.tweens.add({ targets: ready, alpha: { from: 0.15, to: 0.6 }, yoyo: true, repeat: -1, duration: 900 });
  label(scene, c, base - 6 * TILE - 18, 'Berrante', 13);
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

export function buildBoard(scene: Phaser.Scene): BoardView {
  const x0 = 27 * TILE;
  const base = 17 * TILE;
  townTile(scene, T.frameTL, x0, base - TILE, base);
  townTile(scene, T.frameT, x0 + TILE, base - TILE, base);
  townTile(scene, T.frameTR, x0 + 2 * TILE, base - TILE, base);
  townTile(scene, T.frameL, x0, base, base);
  townTile(scene, T.frameR, x0 + 2 * TILE, base, base);
  const papers = scene.add.container(0, 0).setDepth(base + 1);
  const broken = townTile(scene, T.sign, x0 + TILE, base, base + 1).setAngle(-12).setTint(0x8a7a6a);
  let last = '';
  const update = (contracts: number, enabled: boolean) => {
    const key = `${contracts}:${enabled}`;
    if (key === last) return;
    last = key;
    papers.removeAll(true);
    broken.setVisible(!enabled);
    if (!enabled) return;
    for (let i = 0; i < Math.min(contracts, 3); i++) {
      papers.add(scene.add.image(x0 + TILE + 4 + i * 22, base - TILE + 12, 'paper').setOrigin(0, 0).setScale(ART_SCALE));
    }
  };
  label(scene, x0 + 1.5 * TILE, base - 2 * TILE - 4, 'Quadro', 13).setOrigin(0.5, 1);
  return { update };
}

export interface CofferView {
  update: (treasury: number) => void;
}

export function buildCoffer(scene: Phaser.Scene): CofferView {
  const { x, y } = LANDMARKS.cofre;
  dungeonPiece(scene, 'chest_full_open_anim_f0', x - 18, y + 6, y + 6);
  const pile = scene.add.container(x + 16, y + 4).setDepth(y + 7);
  let shown = -1;
  const update = (treasury: number) => {
    const coins = Math.max(0, Math.min(28, Math.round(Math.log2(treasury / 15 + 1) * 4)));
    if (coins === shown) return;
    shown = coins;
    pile.removeAll(true);
    const base = Math.ceil((Math.sqrt(8 * coins + 1) - 1) / 2);
    let n = 0;
    for (let row = 0; n < coins; row++) {
      const width = Math.max(1, base - row);
      for (let i = 0; i < width && n < coins; i++, n++) {
        const coin = scene.add
          .sprite(Math.round((i - (width - 1) / 2) * 10), -row * 8, 'dungeon', 'coin_anim_f0')
          .setOrigin(0.5, 1)
          .setScale(ART_SCALE);
        // Só as do topo giram: o monte inteiro piscando cansa a vista.
        if (row >= Math.max(0, Math.floor(base / 2))) coin.play({ key: 'coin', startFrame: (i + row) % 4 });
        pile.add(coin);
      }
    }
  };
  label(scene, x, y + 10, 'Cofre', 13);
  return { update };
}

export function buildCampfire(scene: Phaser.Scene): void {
  const { x, y } = LANDMARKS.fogueira;
  scene.add.image(x, y, 'campfire').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y - 2);
  scene.add.sprite(x, y - 4, 'fire0').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y - 1).play('fire');
  townTile(scene, T.log, x - 52, y + 10, y + 10);
  townTile(scene, T.log, x + 20, y + 14, y + 14);
  const halo = scene.add.image(x, y - 12, 'glow').setTint(0xffa040).setScale(2.6, 1.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights).setAlpha(0.3);
  scene.tweens.add({ targets: halo, alpha: { from: 0.2, to: 0.35 }, yoyo: true, repeat: -1, duration: 600 });
}

/** Fonte termal: bacia de pedra com água quente, vapor e um banco. */
export function buildThermal(scene: Phaser.Scene): void {
  const r = THERMAL_TILES;
  const bottom = (r.ty + r.th) * TILE;
  // A bacia é chão, não um objeto alto: quem andar por cima (prefeito, herói, criança)
  // continua aparecendo. Por isso ela fica nos depths baixos, abaixo dos personagens.
  for (let y = r.ty; y < r.ty + r.th; y++) {
    for (let x = r.tx; x < r.tx + r.tw; x++) townTile(scene, T.stoneBlock, x * TILE, (y + 1) * TILE, DEPTH.decor);
  }

  const ix = (r.tx + 0.7) * TILE;
  const iy = (r.ty + 0.7) * TILE;
  const iw = (r.tw - 1.4) * TILE;
  const ih = (r.th - 1.4) * TILE;
  const water = scene.add.graphics().setDepth(DEPTH.decor + 1);
  water.fillStyle(0x1a4a50, 1).fillRect(ix, iy, iw, ih);
  water.fillStyle(0x2f7a78, 1).fillRect(ix + 6, iy + 6, iw - 12, ih - 12);
  water.lineStyle(2, 0x7ac8c0, 0.9).strokeRect(ix, iy, iw, ih);
  water.fillStyle(0x9ad8d0, 0.75);
  for (let row = 0; row < 3; row++) {
    const wx = ix + 18 + row * 9;
    water.fillRect(wx, iy + 18 + row * 14, Math.min(34, iw - 34), 2);
  }

  const centerX = (r.tx + r.tw / 2) * TILE;
  const centerY = (r.ty + r.th / 2) * TILE;
  const glow = scene.add
    .image(centerX, centerY, 'glow')
    .setTint(0x8ad8d0)
    .setScale(3, 2.2)
    .setAlpha(0.28)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.lights);
  scene.tweens.add({ targets: glow, alpha: { from: 0.2, to: 0.34 }, yoyo: true, repeat: -1, duration: 1800 });
  // Um calor alaranjado por baixo do vapor frio: a água vem quente do abismo.
  scene.add
    .image(centerX, centerY, 'glow')
    .setTint(0xffa060)
    .setScale(1.6, 1.2)
    .setAlpha(0.12)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.lights);

  // Vapor: sobe da água e some. É enfeite, então pode usar números do Phaser.
  scene.add
    .image(centerX, iy + 6, 'glow')
    .setTint(0xe8f8f4)
    .setScale(1.5, 0.9)
    .setAlpha(0.14)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.floating);
  for (let i = 0; i < 3; i++) {
    const puff = scene.add
      .image(centerX - 22 + i * 22, iy + 24, 'glow')
      .setTint(0xe8f8f4)
      .setScale(1, 0.7)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.floating);
    scene.tweens.add({
      targets: puff,
      y: iy - 40,
      alpha: { from: 0.28, to: 0 },
      scale: { from: 1, to: 1.8 },
      duration: 3200 + i * 420,
      delay: i * 900,
      repeat: -1,
    });
  }
  for (let i = 0; i < 12; i++) {
    const sx = ix + 16 + ((i * 37) % Math.max(1, Math.floor(iw - 32)));
    const sy = iy + 10 + ((i * 23) % Math.max(1, Math.floor(ih - 20)));
    const steam = scene.add
      .image(sx, sy, 'spark')
      .setTint(i % 3 === 0 ? 0xffe0c0 : 0xe8f8f4)
      .setScale(3 + (i % 3))
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.floating);
    scene.tweens.add({
      targets: steam,
      y: sy - 64 - (i % 4) * 8,
      alpha: { from: 0.7, to: 0 },
      scale: { from: 3 + (i % 3), to: 6 + (i % 3) },
      duration: 2400 + (i % 5) * 300,
      delay: i * 260,
      repeat: -1,
    });
  }

  townTile(scene, T.log, (r.tx + 0.3) * TILE, bottom + 24, bottom + 24);
  townTile(scene, T.log, (r.tx + 1.3) * TILE, bottom + 24, bottom + 24);
  townTile(scene, T.log, (r.tx + 2.3) * TILE, bottom + 24, bottom + 24);
  townTile(scene, T.bucket, (r.tx + r.tw - 0.5) * TILE, bottom + 22, bottom + 22);
  label(scene, LANDMARKS.termas.x, r.ty * TILE - 24, 'Fonte termal', 13, '#c8e8e0');
}

/** Enfeites da praça e das ruas (poço, feno, sacos). */
export function buildProps(scene: Phaser.Scene): void {
  townTile(scene, T.well, 21 * TILE, 16 * TILE);
  townTile(scene, T.hay, 22 * TILE, 21 * TILE);
  townTile(scene, T.sack, 14 * TILE, 15 * TILE);
  townTile(scene, T.bucket, 22 * TILE, 16 * TILE);
  townTile(scene, T.sign, 26 * TILE, 8 * TILE);
}
