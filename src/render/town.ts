// A vila montada com tiles do Tiny Town (Kenney) e peças do DungeonTileset II (0x72).

import Phaser from 'phaser';
import { ART_SCALE, T } from './assets.ts';
import { ABYSS_ROWS, AUTUMN, dirtMask, dirtTile, FORESTS, inRect } from './ground.ts';
import {
  CEMETERY_TILES,
  COLS,
  LANDMARKS,
  LOT_TILES,
  PLAZA_TILES,
  ROWS,
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
    { tx: 1, ty: 10, tw: 5, th: 7 }, // torre do berrante
    { tx: 20, ty: 5, tw: 10, th: 3 }, // abadia
    { tx: 21, ty: 29, tw: 8, th: 3 }, // portão
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

export function buildGate(scene: Phaser.Scene): void {
  const y = ROWS * TILE;
  const x0 = 23 * TILE;
  townTile(scene, T.frameTL, x0, y - TILE);
  townTile(scene, T.frameT, x0 + TILE, y - TILE);
  townTile(scene, T.frameT, x0 + 2 * TILE, y - TILE);
  townTile(scene, T.frameTR, x0 + 3 * TILE, y - TILE);
  townTile(scene, T.frameL, x0, y);
  townTile(scene, T.frameR, x0 + 3 * TILE, y);
  smooth(scene.add.text(x0 + 2 * TILE, y - TILE - 22, 'VIGÍLIA', { fontFamily: 'Georgia, serif', fontSize: '11px', color: '#f0dca0', stroke: '#000', strokeThickness: 3 }))
    .setOrigin(0.5)
    .setDepth(y + 1);
}

export interface HornView {
  ready: Phaser.GameObjects.Image;
  blast: () => void;
}

export function buildHornTower(scene: Phaser.Scene): HornView {
  const x0 = 2 * TILE;
  const base = 16 * TILE;
  const rows: number[][] = [
    [-1, T.hut, -1],
    [T.logL, T.logM, T.logR],
    [T.fenceVTop, -1, T.fenceVTop],
    [T.fenceV, -1, T.fenceV],
    [T.fenceV, T.shelf, T.fenceV],
  ];
  rows.forEach((row, ry) =>
    row.forEach((frame, rx) => {
      if (frame >= 0) townTile(scene, frame, x0 + rx * TILE, base - (rows.length - 1 - ry) * TILE, base);
    }),
  );
  const hornY = base - 4 * TILE + 6;
  scene.add.image(x0 + 1.5 * TILE + 10, hornY, 'horn').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(base + 1);
  const ready = scene.add
    .image(x0 + 1.5 * TILE + 4, hornY - 8, 'glow')
    .setTint(0xffc46b)
    .setScale(1.4)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.lights);
  scene.tweens.add({ targets: ready, alpha: { from: 0.15, to: 0.6 }, yoyo: true, repeat: -1, duration: 900 });
  label(scene, x0 + 1.5 * TILE, base + 2, 'Berrante');
  const blast = () => {
    for (let i = 0; i < 3; i++) {
      const ring = scene.add.circle(x0 + 1.5 * TILE - 6, hornY - 8, 10).setStrokeStyle(4, 0xffc46b, 0.9).setDepth(DEPTH.floating);
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

/** Enfeites da praça e das ruas (poço, feno, sacos). */
export function buildProps(scene: Phaser.Scene): void {
  townTile(scene, T.well, 21 * TILE, 16 * TILE);
  townTile(scene, T.hay, 22 * TILE, 21 * TILE);
  townTile(scene, T.sack, 14 * TILE, 15 * TILE);
  townTile(scene, T.bucket, 22 * TILE, 16 * TILE);
  townTile(scene, T.sign, 26 * TILE, 8 * TILE);
}
