// Cenário fixo da vila: chão, estradas, abismo, árvores, cemitério, portão e marcos.

import Phaser from 'phaser';
import { ABYSS_EDGE_Y, CEMETERY, door, LANDMARKS, LOTS, PLAZA, WORLD_H, WORLD_W, type Point } from './layout.ts';
import { C } from './palette.ts';

type G = Phaser.GameObjects.Graphics;

export const DEPTH = {
  ground: 0,
  road: 1,
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

const ROADS: Point[][] = [
  [LANDMARKS.abismo, { x: 800, y: 420 }, PLAZA],
  [PLAZA, { x: 800, y: 800 }, { x: 800, y: WORLD_H + 20 }],
  [PLAZA, { x: 600, y: 520 }, door('templo')],
  [PLAZA, { x: 560, y: 650 }, door('taverna')],
  [PLAZA, { x: 640, y: 760 }, door('estalagem')],
  [PLAZA, { x: 1000, y: 520 }, door('guilda')],
  [PLAZA, { x: 1060, y: 650 }, door('ferreiro')],
  [PLAZA, { x: 960, y: 770 }, door('campo')],
  [door('taverna'), { x: 240, y: 560 }, { x: 150, y: 480 }],
  [door('ferreiro'), { x: 1400, y: 640 }, { x: 1450, y: 470 }],
];

function road(g: G, pts: Point[], width: number, color: number, alpha = 1): void {
  g.lineStyle(width, color, alpha);
  for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1]!.x, pts[i - 1]!.y, pts[i]!.x, pts[i]!.y);
  g.fillStyle(color, alpha);
  for (const p of pts) g.fillCircle(p.x, p.y, width / 2);
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function drawGround(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(DEPTH.ground);
  g.fillStyle(C.grass);
  g.fillRect(-400, -400, WORLD_W + 800, WORLD_H + 800);
  const rnd = seeded(7);
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * WORLD_W;
    const y = ABYSS_EDGE_Y - 20 + rnd() * (WORLD_H - ABYSS_EDGE_Y + 20);
    g.fillStyle(rnd() < 0.5 ? C.grassLight : C.grassDark, 0.6);
    g.fillRect(x, y, 2 + rnd() * 3, 2);
  }
  const roads = scene.add.graphics().setDepth(DEPTH.road);
  for (const pts of ROADS) road(roads, pts, 38, C.dirtEdge);
  for (const pts of ROADS) road(roads, pts, 30, C.dirt);
  // Praça de pedra
  roads.fillStyle(C.cobbleDark);
  roads.fillEllipse(PLAZA.x, PLAZA.y, PLAZA.r * 2 + 16, PLAZA.r * 1.45 + 12);
  roads.fillStyle(C.cobble);
  roads.fillEllipse(PLAZA.x, PLAZA.y, PLAZA.r * 2, PLAZA.r * 1.45);
  roads.lineStyle(1, C.cobbleDark, 0.7);
  for (let r = 30; r < PLAZA.r; r += 26) roads.strokeEllipse(PLAZA.x, PLAZA.y, r * 2, r * 1.45);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
    roads.lineBetween(
      PLAZA.x + Math.cos(a) * 30,
      PLAZA.y + Math.sin(a) * 30 * 0.72,
      PLAZA.x + Math.cos(a) * PLAZA.r,
      PLAZA.y + Math.sin(a) * PLAZA.r * 0.72,
    );
  }
  for (let i = 0; i < 260; i++) {
    const x = rnd() * WORLD_W;
    const y = ABYSS_EDGE_Y + rnd() * (WORLD_H - ABYSS_EDGE_Y);
    scene.add.image(x, y, 'tuft').setDepth(DEPTH.road).setAlpha(0.7);
  }
}

export interface AbyssView {
  glow: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Text;
}

export function drawAbyss(scene: Phaser.Scene): AbyssView {
  const rnd = seeded(13);
  const edge: Point[] = [];
  for (let x = -40; x <= WORLD_W + 40; x += 40) {
    const nearStairs = Math.abs(x - 800) < 160;
    const y = nearStairs ? ABYSS_EDGE_Y - 10 + rnd() * 8 : ABYSS_EDGE_Y - 50 + Math.sin(x / 130) * 18 + rnd() * 24;
    edge.push({ x, y });
  }
  const g = scene.add.graphics().setDepth(2);
  // Borda de rocha
  g.fillStyle(0x3a352e);
  g.fillPoints([{ x: -400, y: -400 }, { x: WORLD_W + 400, y: -400 }, ...edge.map((p) => ({ x: p.x, y: p.y + 14 })).reverse()], true);
  g.fillStyle(0x24201c);
  g.fillPoints([{ x: -400, y: -400 }, { x: WORLD_W + 400, y: -400 }, ...edge.map((p) => ({ x: p.x, y: p.y + 6 })).reverse()], true);
  // Escuridão em camadas
  const layers = [0x120f12, 0x0c0a0e, C.abyss];
  layers.forEach((color, i) => {
    g.fillStyle(color);
    g.fillPoints([{ x: -400, y: -400 }, { x: WORLD_W + 400, y: -400 }, ...edge.map((p) => ({ x: p.x, y: p.y - i * 22 })).reverse()], true);
  });
  const glow = scene.add.image(800, 40, 'glow').setTint(C.abyssGlow).setScale(16, 4).setBlendMode(Phaser.BlendModes.ADD).setDepth(3).setAlpha(0.4);

  // Escadaria e ruínas da abadia
  const s = scene.add.graphics().setDepth(4);
  for (let i = 0; i < 7; i++) {
    const y = 220 - i * 13;
    const half = 58 - i * 6;
    const shade = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(C.stone),
      Phaser.Display.Color.ValueToColor(C.abyss),
      7,
      i,
    );
    s.fillStyle(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b));
    s.fillRect(800 - half, y - 12, half * 2, 12);
  }
  for (const px of [722, 878]) {
    s.fillStyle(0x000000, 0.3);
    s.fillEllipse(px, 226, 34, 10);
    s.fillStyle(C.stoneDark);
    s.fillRect(px - 12, 120 + (px > 800 ? 26 : 0), 24, 106 - (px > 800 ? 26 : 0));
    s.fillStyle(C.stone);
    s.fillRect(px - 9, 122 + (px > 800 ? 26 : 0), 14, 104 - (px > 800 ? 26 : 0));
    s.fillStyle(C.stoneDark);
    s.fillRect(px - 16, 214, 32, 12);
  }
  s.fillStyle(C.stoneDark);
  s.fillPoints(
    [
      { x: 710, y: 120 },
      { x: 734, y: 120 },
      { x: 770, y: 92 },
      { x: 790, y: 88 },
      { x: 786, y: 100 },
      { x: 742, y: 132 },
      { x: 710, y: 132 },
    ],
    true,
  );
  for (let i = 0; i < 10; i++) {
    s.fillStyle(rnd() < 0.5 ? C.stone : C.stoneDark);
    s.fillEllipse(690 + rnd() * 220, 222 + rnd() * 22, 6 + rnd() * 8, 4 + rnd() * 4);
  }
  // Brasas violetas subindo do fundo
  for (let i = 0; i < 16; i++) {
    const spark = scene.add
      .image(120 + rnd() * (WORLD_W - 240), 140, 'spark')
      .setTint(0xb46ae0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(3)
      .setAlpha(0);
    scene.tweens.add({
      targets: spark,
      y: { from: 150 + rnd() * 40, to: 20 + rnd() * 40 },
      alpha: { from: 0.8, to: 0 },
      duration: 3000 + rnd() * 3000,
      delay: rnd() * 4000,
      repeat: -1,
    });
  }
  const badge = scene.add
    .text(800, 70, '', { fontFamily: 'Georgia, serif', fontSize: '15px', color: '#e8d8ff', stroke: '#000000', strokeThickness: 4 })
    .setOrigin(0.5)
    .setDepth(DEPTH.labels);
  return { glow, badge };
}

export function scatterTrees(scene: Phaser.Scene): void {
  const rnd = seeded(29);
  const blocked = (p: Point): boolean => {
    for (const lot of Object.values(LOTS)) {
      if (Math.abs(p.x - lot.x) < lot.w / 2 + 34 && p.y > lot.y - lot.h / 2 - 20 && p.y < lot.y + lot.h / 2 + 70) return true;
    }
    if (Math.hypot(p.x - PLAZA.x, (p.y - PLAZA.y) / 0.72) < PLAZA.r + 50) return true;
    for (const pts of ROADS) for (let i = 1; i < pts.length; i++) if (distToSegment(p, pts[i - 1]!, pts[i]!) < 40) return true;
    for (const lm of Object.values(LANDMARKS)) if (Math.hypot(p.x - lm.x, p.y - lm.y) < 90) return true;
    if (p.x > CEMETERY.x - 40 && p.y < 470) return true;
    return false;
  };
  let placed = 0;
  for (let i = 0; i < 900 && placed < 95; i++) {
    const edgeBias = rnd();
    const x = edgeBias < 0.35 ? rnd() * 110 : edgeBias < 0.7 ? WORLD_W - rnd() * 110 : rnd() * WORLD_W;
    const y = ABYSS_EDGE_Y + 30 + rnd() * (WORLD_H - ABYSS_EDGE_Y - 20);
    const p = { x, y };
    if (blocked(p)) continue;
    const kind = rnd();
    const key = kind < 0.55 ? 'pine' : kind < 0.8 ? 'oak' : kind < 0.92 ? 'bush' : 'rock';
    const img = scene.add.image(x, y, key).setOrigin(0.5, 0.92).setDepth(y);
    if (key === 'pine' || key === 'oak') img.setScale(0.85 + rnd() * 0.4);
    placed++;
  }
}

export function drawCemetery(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(5);
  const x0 = CEMETERY.x - 40;
  const x1 = WORLD_W - 18;
  const y0 = ABYSS_EDGE_Y + 4;
  const y1 = 440;
  g.fillStyle(C.grassDark, 0.8);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.lineStyle(2, 0x1a1a1e, 1);
  const gateX = LANDMARKS.cemiterio.x;
  g.lineBetween(x0, y0, x1, y0);
  g.lineBetween(x0, y0, x0, y1);
  g.lineBetween(x1, y0, x1, y1);
  g.lineBetween(x0, y1, gateX - 24, y1);
  g.lineBetween(gateX + 24, y1, x1, y1);
  g.lineStyle(1, 0x1a1a1e, 1);
  for (let x = x0; x <= x1; x += 12) {
    g.lineBetween(x, y0 - 10, x, y0);
    if (x < gateX - 24 || x > gateX + 24) g.lineBetween(x, y1 - 10, x, y1);
  }
  for (let y = y0; y <= y1; y += 12) {
    g.lineBetween(x0, y - 10, x0, y);
    g.lineBetween(x1, y - 10, x1, y);
  }
  g.fillStyle(0x1a1a1e);
  g.fillRect(gateX - 28, y1 - 30, 5, 32);
  g.fillRect(gateX + 23, y1 - 30, 5, 32);
  g.lineStyle(3, 0x1a1a1e, 1);
  g.beginPath();
  g.arc(gateX, y1 - 28, 26, Math.PI, 0, false);
  g.strokePath();
  // Árvore seca
  const t = scene.add.graphics().setDepth(250);
  t.lineStyle(5, 0x2a2018, 1);
  t.lineBetween(x0 + 26, 400, x0 + 26, 330);
  t.lineStyle(3, 0x2a2018, 1);
  t.lineBetween(x0 + 26, 350, x0 + 6, 322);
  t.lineBetween(x0 + 26, 340, x0 + 48, 312);
  t.lineStyle(2, 0x2a2018, 1);
  t.lineBetween(x0 + 38, 324, x0 + 44, 300);
  t.lineBetween(x0 + 12, 330, x0 + 4, 310);
  scene.add
    .text(gateX, y1 + 12, 'Cemitério', { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#c8c0b0', stroke: '#000', strokeThickness: 3 })
    .setOrigin(0.5, 0)
    .setDepth(DEPTH.labels)
    .setName('label');
}

export function drawGate(scene: Phaser.Scene): void {
  const { x, y } = LANDMARKS.portao;
  const g = scene.add.graphics().setDepth(y);
  g.fillStyle(C.woodDark);
  g.fillRect(x - 64, y - 70, 9, 74);
  g.fillRect(x + 55, y - 70, 9, 74);
  g.fillStyle(C.wood);
  g.fillRect(x - 70, y - 78, 140, 12);
  g.fillStyle(C.woodDark);
  g.fillRect(x - 70, y - 68, 140, 3);
  scene.add
    .text(x, y - 72, 'VIGÍLIA', { fontFamily: 'Georgia, serif', fontSize: '11px', color: '#f0dca0' })
    .setOrigin(0.5)
    .setDepth(y + 1);
}

export interface HornView {
  ready: Phaser.GameObjects.Image;
  blast: () => void;
}

export function drawHornTower(scene: Phaser.Scene): HornView {
  const { x, y } = LANDMARKS.berrante;
  const base = y + 70;
  const g = scene.add.graphics().setDepth(base);
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(x, base + 2, 90, 20);
  g.fillStyle(C.woodDark);
  for (const dx of [-30, 26]) g.fillRect(x + dx, y - 50, 6, 120);
  g.lineStyle(2, C.woodDark, 1);
  g.lineBetween(x - 27, y + 60, x + 29, y - 10);
  g.lineBetween(x + 29, y + 60, x - 27, y - 10);
  // Plataforma
  g.fillStyle(C.wood);
  g.fillRect(x - 40, y - 58, 80, 12);
  g.fillStyle(C.woodDark);
  g.fillRect(x - 40, y - 48, 80, 3);
  for (let i = -36; i <= 36; i += 12) g.fillRect(x + i, y - 74, 3, 16);
  g.fillRect(x - 40, y - 76, 80, 3);
  // O berrante: chifre curvo de osso com aro de ferro
  const h = scene.add.graphics().setDepth(base + 1);
  h.fillStyle(0xd8ccb0);
  h.fillPoints(
    [
      { x: x - 30, y: y - 92 },
      { x: x - 14, y: y - 100 },
      { x: x + 8, y: y - 98 },
      { x: x + 24, y: y - 88 },
      { x: x + 30, y: y - 80 },
      { x: x + 22, y: y - 82 },
      { x: x + 6, y: y - 88 },
      { x: x - 12, y: y - 88 },
      { x: x - 26, y: y - 80 },
    ],
    true,
  );
  h.fillStyle(0xb8aa88);
  h.fillEllipse(x - 28, y - 86, 10, 16);
  h.fillStyle(0x1a1410);
  h.fillEllipse(x - 28, y - 86, 5, 10);
  h.fillStyle(0x6a6a70);
  h.fillRect(x + 2, y - 99, 4, 12);
  const ready = scene.add.image(x - 4, y - 90, 'glow').setTint(C.warm).setScale(1.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights);
  scene.tweens.add({ targets: ready, alpha: { from: 0.15, to: 0.6 }, yoyo: true, repeat: -1, duration: 900 });
  scene.add
    .text(x, base + 8, 'Berrante', { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#f0e6d0', stroke: '#000', strokeThickness: 3 })
    .setOrigin(0.5, 0)
    .setDepth(DEPTH.labels)
    .setName('label');
  const blast = () => {
    for (let i = 0; i < 3; i++) {
      const ring = scene.add.circle(x - 30, y - 86, 10).setStrokeStyle(3, C.warm, 0.9).setDepth(DEPTH.floating);
      scene.tweens.add({ targets: ring, radius: 220, alpha: 0, duration: 1600, delay: i * 350, onComplete: () => ring.destroy() });
    }
  };
  return { ready, blast };
}

export interface BoardView {
  papers: Phaser.GameObjects.Graphics;
  update: (contracts: number, enabled: boolean) => void;
}

export function drawBoard(scene: Phaser.Scene): BoardView {
  const { x, y } = LANDMARKS.quadro;
  const g = scene.add.graphics().setDepth(y + 30);
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(x, y + 30, 70, 12);
  g.fillStyle(C.woodDark);
  g.fillRect(x - 28, y - 30, 5, 60);
  g.fillRect(x + 23, y - 30, 5, 60);
  g.fillStyle(C.wood);
  g.fillRect(x - 32, y - 34, 64, 40);
  g.lineStyle(2, C.woodDark, 1);
  g.strokeRect(x - 32, y - 34, 64, 40);
  g.fillStyle(C.woodDark);
  g.fillRect(x - 36, y - 40, 72, 6);
  const papers = scene.add.graphics().setDepth(y + 31);
  let last = '';
  const update = (contracts: number, enabled: boolean) => {
    const key = `${contracts}:${enabled}`;
    if (key === last) return;
    last = key;
    papers.clear();
    if (!enabled) {
      papers.lineStyle(2, 0x3a2616, 1);
      papers.lineBetween(x - 26, y - 26, x + 18, y);
      papers.lineBetween(x - 10, y - 30, x + 26, y - 6);
      return;
    }
    for (let i = 0; i < Math.max(contracts, 0); i++) {
      const px = x - 22 + i * 16;
      papers.fillStyle(0xe8dcc0);
      papers.fillRect(px, y - 28, 13, 17);
      papers.fillStyle(0x8a2a2a);
      papers.fillCircle(px + 6.5, y - 27, 1.8);
      papers.lineStyle(1, 0x6a5a40, 1);
      for (let l = 0; l < 3; l++) papers.lineBetween(px + 2, y - 22 + l * 4, px + 11, y - 22 + l * 4);
    }
  };
  scene.add
    .text(x, y - 44, 'Quadro', { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f0e6d0', stroke: '#000', strokeThickness: 3 })
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.labels)
    .setName('label');
  return { papers, update };
}

export interface CofferView {
  update: (treasury: number) => void;
}

export function drawCoffer(scene: Phaser.Scene): CofferView {
  const { x, y } = LANDMARKS.cofre;
  const g = scene.add.graphics().setDepth(y + 18);
  g.fillStyle(0x000000, 0.3);
  g.fillEllipse(x, y + 18, 96, 22);
  g.fillStyle(C.stoneDark);
  g.fillRoundedRect(x - 44, y - 6, 88, 24, 6);
  g.fillStyle(C.stone);
  g.fillRoundedRect(x - 42, y - 8, 84, 18, 6);
  // Baú
  g.fillStyle(0x5a3a20);
  g.fillRect(x - 36, y - 30, 34, 24);
  g.fillStyle(0x6e4a2a);
  g.fillRoundedRect(x - 37, y - 38, 36, 12, { tl: 6, tr: 6, bl: 0, br: 0 });
  g.fillStyle(0x3a3a40);
  g.fillRect(x - 30, y - 38, 4, 32);
  g.fillRect(x - 13, y - 38, 4, 32);
  g.fillStyle(C.gold);
  g.fillRect(x - 22, y - 26, 6, 6);
  const pile = scene.add.container(x + 20, y - 4).setDepth(y + 19);
  let shown = -1;
  const update = (treasury: number) => {
    const coins = Math.max(0, Math.min(36, Math.round(Math.log2(treasury / 15 + 1) * 5)));
    if (coins === shown) return;
    shown = coins;
    pile.removeAll(true);
    // Monte triangular: a base alarga conforme o tesouro cresce.
    const base = Math.ceil((Math.sqrt(8 * coins + 1) - 1) / 2);
    let n = 0;
    for (let row = 0; n < coins; row++) {
      const width = Math.max(1, base - row);
      for (let i = 0; i < width && n < coins; i++, n++) {
        pile.add(scene.add.image((i - (width - 1) / 2) * 6.5, -row * 3.6, 'coin'));
      }
    }
  };
  scene.add
    .text(x, y + 22, 'Cofre', { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f0e6d0', stroke: '#000', strokeThickness: 3 })
    .setOrigin(0.5, 0)
    .setDepth(DEPTH.labels)
    .setName('label');
  return { update };
}

export interface CampfireView {
  bedrolls: Phaser.GameObjects.Graphics;
}

export function drawCampfire(scene: Phaser.Scene): CampfireView {
  const { x, y } = LANDMARKS.fogueira;
  const g = scene.add.graphics().setDepth(y - 10);
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(x, y - 8, 46, 16);
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 5) {
    g.fillStyle(C.stoneDark);
    g.fillEllipse(x + Math.cos(a) * 16, y - 10 + Math.sin(a) * 7, 8, 5);
  }
  g.lineStyle(4, 0x3a2616, 1);
  g.lineBetween(x - 9, y - 6, x + 9, y - 14);
  g.lineBetween(x - 9, y - 14, x + 9, y - 6);
  const fire = scene.add.image(x, y - 14, 'glow').setTint(C.fire).setScale(0.5, 0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights);
  scene.tweens.add({ targets: fire, scaleX: { from: 0.45, to: 0.6 }, scaleY: { from: 0.6, to: 0.85 }, alpha: { from: 0.7, to: 1 }, yoyo: true, repeat: -1, duration: 260 });
  const halo = scene.add.image(x, y - 12, 'glow').setTint(C.warm).setScale(2.4, 1.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights).setAlpha(0.25);
  scene.tweens.add({ targets: halo, alpha: { from: 0.18, to: 0.3 }, yoyo: true, repeat: -1, duration: 700 });
  const bedrolls = scene.add.graphics().setDepth(y - 12);
  for (const [dx, dy] of [
    [-44, 4],
    [40, 2],
    [-12, 22],
  ] as const) {
    bedrolls.fillStyle(0x5a4a6a);
    bedrolls.fillRoundedRect(x + dx - 15, y + dy - 6, 30, 11, 5);
    bedrolls.fillStyle(0xd8ccb0);
    bedrolls.fillCircle(x + dx - 11, y + dy - 1, 4);
  }
  return { bedrolls };
}
