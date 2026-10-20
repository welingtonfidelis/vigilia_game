// A vila montada com tiles do Tiny Town (Kenney) e peças do DungeonTileset II (0x72).

import Phaser from 'phaser';
import { ART_SCALE } from './assets.ts';
import { AUTUMN, dirtMask, FORESTS, inRect, pathMask } from './ground.ts';
import { PACK_TERRAIN_COLUMNS, PACK_TILES } from './pack.ts';
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

function tileIndex(name: string): number {
  const cell = PACK_TILES[name];
  if (!cell) throw new Error(`tile do pack ausente: ${name}`);
  return cell[1] * PACK_TERRAIN_COLUMNS + cell[0];
}

/** Autotile do pack: escolhe a peça de terra/trilha pela vizinhança. */
function packDirtName(mask: boolean[][], paths: boolean[][], x: number, y: number): string {
  const prefix = paths[y]?.[x] ? 'trail' : 'dirt';
  const d = (dx: number, dy: number): boolean => {
    const yy = y + dy;
    const xx = x + dx;
    if (yy < 0 || yy >= ROWS || xx < 0 || xx >= COLS) return true;
    return mask[yy]?.[xx] === true;
  };
  const n = d(0, -1);
  const s = d(0, 1);
  const e = d(1, 0);
  const w = d(-1, 0);
  if (!n && !w) return `${prefix}-nw`;
  if (!n && !e) return `${prefix}-ne`;
  if (!s && !w) return `${prefix}-sw`;
  if (!s && !e) return `${prefix}-se`;
  if (!n) return `${prefix}-n`;
  if (!s) return `${prefix}-s`;
  if (!w) return `${prefix}-w`;
  if (!e) return `${prefix}-e`;
  if (prefix === 'dirt') {
    if (!d(-1, -1)) return 'dirt-inner-nw';
    if (!d(1, -1)) return 'dirt-inner-ne';
    if (!d(1, 1)) return 'dirt-inner-se';
    if (!d(-1, 1)) return 'dirt-inner-sw';
  }
  return `${prefix}-c`;
}

function packTree(scene: Phaser.Scene, name: string, px: number, py: number): void {
  scene.add.image(px, py, name).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(py);
}

/** Casinhas dos moradores: imagem do pack + overlay de janelas para a noite. */
export function buildCottages(scene: Phaser.Scene): Phaser.GameObjects.Image[] {
  const lights: Phaser.GameObjects.Image[] = [];
  HOME_LOTS.forEach((lot, i) => {
    const x = (lot.tx + lot.tw / 2) * TILE;
    const y = (lot.ty + lot.th) * TILE;
    const id = `building/house/0${i + 1}`;
    scene.add.image(x, y, id).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y);
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

export function buildGround(scene: Phaser.Scene): boolean[][] {
  const mask = dirtMask();
  const paths = pathMask();
  const map = scene.make.tilemap({ tileWidth: 16, tileHeight: 16, width: COLS, height: ROWS });
  const tiles = map.addTilesetImage('vigilia-terrain', 'tile/town/terrain', 16, 16, 0, 0)!;
  const autumnGid = (tiles.firstgid ?? 1) + (tiles.total ?? 64);
  const autumnTiles = [0, 1, 2, 3].map((i) => map.addTilesetImage(`autumn-grass-${i}`, `tile/town/autumn-grass-${i}`, 16, 16, 0, 0, autumnGid + i)!);
  const ground = map.createBlankLayer('ground', [tiles, ...autumnTiles])!.setScale(ART_SCALE).setDepth(DEPTH.ground);
  const rnd = seeded(7);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (mask[y]![x]) {
        ground.putTileAt(tileIndex(packDirtName(mask, paths, x, y)), x, y);
        continue;
      }
      const r = rnd();
      const name = r < 0.06 ? 'grass-flowers' : `grass-${Math.floor(rnd() * 4)}`;
      ground.putTileAt(tileIndex(name), x, y);
    }
  }
  // Manchas de outono: grama própria nas clareiras marcadas em AUTUMN.
  for (const f of AUTUMN) {
    for (let y = f.ty; y < f.ty + f.th; y++) {
      for (let x = f.tx; x < f.tx + f.tw; x++) {
        if (mask[y]?.[x]) continue;
        const ts = autumnTiles[Math.floor(rnd() * autumnTiles.length)]!;
        ground.putTileAt(ts.firstgid, x, y);
      }
    }
  }

  // O chão é estático; assar numa textura única evita emenda entre tiles ao rolar.
  const baked = scene.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0, 0).setDepth(DEPTH.ground);
  baked.draw(ground, 0, 0);
  baked.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  ground.setActive(false).setVisible(false);
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
    { tx: 0, ty: 10, tw: 7, th: 7 }, // entrada com berrante
    { tx: 20, ty: 5, tw: 10, th: 3 }, // abadia
    THERMAL_YARD,
    ...HOME_LOTS,
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
        packTree(scene, 'prop/tree/pine', (x + 0.5) * TILE, (y + 1) * TILE);
      }
    }
  }
  for (const f of AUTUMN) {
    for (let y = f.ty; y < f.ty + f.th; y += 2) {
      for (let x = f.tx; x < f.tx + f.tw; x += 2) {
        if (rnd() < 0.3 || occupied(x, y)) continue;
        packTree(scene, rnd() < 0.35 ? 'prop/tree/autumn-small' : 'prop/tree/autumn', (x + 0.5) * TILE, (y + 1) * TILE);
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
    packTree(scene, name, (x + 0.5) * TILE, (y + 1) * TILE);
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

  // Brasas violetas saindo da boca da caverna.
  for (let i = 0; i < 18; i++) {
    const spark = scene.add
      .image(x + (rnd() - 0.5) * 52, base - 20, 'spark')
      .setTint(0xb46ae0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.lights)
      .setScale(ART_SCALE)
      .setAlpha(0);
    scene.tweens.add({
      targets: spark,
      y: { from: base - 20, to: base - 90 - rnd() * 30 },
      x: { from: spark.x, to: spark.x + (rnd() - 0.5) * 20 },
      alpha: { from: 0.8, to: 0 },
      duration: 2400 + rnd() * 2400,
      delay: rnd() * 3000,
      repeat: -1,
    });
  }

  const badge = smooth(
    scene.add.text(x, 9.5 * TILE, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#e8d8ff',
      stroke: '#000000',
      strokeThickness: 4,
    }),
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

export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 14, color = '#f0e6d0'): Phaser.GameObjects.Text {
  return smooth(scene.add.text(x, y, text, { fontFamily: 'Georgia, serif', fontSize: `${size}px`, color, stroke: '#0b0a08', strokeThickness: 4 }))
    .setOrigin(0.5, 0)
    .setDepth(DEPTH.labels)
    .setName('label');
}

export function buildCemetery(scene: Phaser.Scene): void {
  const r = CEMETERY_TILES;
  const x0 = r.tx * TILE;
  const x1 = (r.tx + r.tw - 1) * TILE;
  const y0 = (r.ty + 1) * TILE;
  const y1 = (r.ty + r.th) * TILE;
  const key = 'tile/town/cemetery-fence';
  const put = (frame: number, x: number, y: number): void => {
    scene.add.image(x, y, key, frame).setOrigin(0, 0).setScale(ART_SCALE).setDepth(y + 2);
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
  label(scene, LANDMARKS.cemiterio.x, LANDMARKS.cemiterio.y + 4, 'Cemitério', 14, '#c8c0b0');
}

export interface HornView {
  ready: Phaser.GameObjects.Image;
  blast: () => void;
}

export function buildHornTower(scene: Phaser.Scene): HornView {
  const base = (HORN_TOWER.ty + HORN_TOWER.th) * TILE;
  const c = (HORN_TOWER.tx + HORN_TOWER.tw / 2) * TILE;
  scene.add.image(c, base, 'prop/gate-horn/open').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(base);
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

export function buildBoard(scene: Phaser.Scene): BoardView {
  const x = 28 * TILE;
  const base = 17 * TILE;
  const board = scene.add.image(x, base, 'prop/board').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(base);
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

export function buildCoffer(scene: Phaser.Scene): CofferView {
  const { x, y } = LANDMARKS.cofre;
  const chest = scene.add.image(x, y + 8, 'prop/coffer').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y + 8);
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

export function buildCampfire(scene: Phaser.Scene): void {
  const { x, y } = LANDMARKS.fogueira;
  scene.add.image(x, y, 'prop/campfire/on').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y - 2);
  scene.add.sprite(x, y - 4, 'fx/fire').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y - 1).play('fx/fire');
  const halo = scene.add.image(x, y - 12, 'glow').setTint(0xffa040).setScale(2.6, 1.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights).setAlpha(0.3);
  scene.tweens.add({ targets: halo, alpha: { from: 0.2, to: 0.35 }, yoyo: true, repeat: -1, duration: 600 });
}

/** Fonte termal: bacia natural do pack, água separada, vapor e banco. */
export function buildThermal(scene: Phaser.Scene): void {
  const r = THERMAL_TILES;
  const cx = (r.tx + r.tw / 2) * TILE;
  const base = (r.ty + r.th) * TILE;
  scene.add.image(cx, base, 'prop/thermal/basin').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(DEPTH.decor);
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
  const glow = scene.add
    .image(cx, base - 34, 'glow')
    .setTint(0x8ad8d0)
    .setScale(3, 2.2)
    .setAlpha(0.25)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(DEPTH.lights);
  scene.tweens.add({ targets: glow, alpha: { from: 0.18, to: 0.32 }, yoyo: true, repeat: -1, duration: 1800 });
  label(scene, LANDMARKS.termas.x, r.ty * TILE - 24, 'Fonte termal', 13, '#c8e8e0');
}
/** Props de praça do pack 1.7; retorna as luzes das lamparinas para o ciclo dia/noite. */
export function buildProps(scene: Phaser.Scene): Phaser.GameObjects.Image[] {
  const prop = (id: string, x: number, y: number): void => {
    scene.add.image(x, y, id).setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y);
  };
  prop('prop/well', 21 * TILE + 16, 16 * TILE);
  prop('prop/hay', 22 * TILE, 21 * TILE);
  prop('prop/sacks', 14 * TILE, 15 * TILE);
  prop('prop/bucket', 22 * TILE, 16 * TILE);
  prop('prop/logs', LANDMARKS.fogueira.x - 52, LANDMARKS.fogueira.y + 10);
  prop('prop/barrel', 17 * TILE, 17 * TILE);
  prop('prop/crate', 26 * TILE, 16 * TILE);
  prop('prop/bench', 22 * TILE, 19 * TILE);
  prop('prop/cart', 17 * TILE, 22 * TILE);

  const lights: Phaser.GameObjects.Image[] = [];
  const lamp = (x: number, y: number): void => {
    scene.add.image(x, y, 'prop/lamp').setOrigin(0.5, 1).setScale(ART_SCALE).setDepth(y);
    const light = scene.add
      .image(x, y, 'prop/lamp-lights')
      .setOrigin(0.5, 1)
      .setScale(ART_SCALE)
      .setDepth(DEPTH.lights)
      .setAlpha(0);
    lights.push(light);
  };
  lamp(18 * TILE, 17 * TILE);
  lamp(32 * TILE, 17 * TILE);
  lamp(23 * TILE, 13 * TILE);
  lamp(43 * TILE, 18 * TILE);
  return lights;
}
