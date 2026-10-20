// Desenho dos 6 prédios: ruína (nível 0) e construído (níveis 1–3), em 3/4 de cima.

import type Phaser from 'phaser';
import type { BuildingId } from '../sim/index.ts';
import { hash, type Lot } from './layout.ts';
import { C } from './palette.ts';

type G = Phaser.GameObjects.Graphics;

interface HouseOpts {
  w: number;
  wallH: number;
  roofH: number;
  wall: number;
  wallDark: number;
  roof: number;
  roofDark: number;
  rows: number;
  timber?: boolean;
  stone?: boolean;
  baseY: number;
  x?: number;
}

const WINDOW = 0x262630;

/** Desenha uma casa e as janelas acesas (na camada de luz). Devolve o topo da parede. */
function house(g: G, lights: G, o: HouseOpts): number {
  const x0 = o.x ?? 0;
  const half = o.w / 2;
  const top = o.baseY - o.wallH;
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(x0, o.baseY + 4, o.w + 34, 20);
  // Telhado (visto de cima, inclinado para trás)
  g.fillStyle(o.roofDark);
  g.fillPoints(
    [
      { x: x0 - half - 12, y: top + 6 },
      { x: x0 + half + 12, y: top + 6 },
      { x: x0 + half - 4, y: top - o.roofH },
      { x: x0 - half + 4, y: top - o.roofH },
    ],
    true,
  );
  g.fillStyle(o.roof);
  g.fillPoints(
    [
      { x: x0 - half - 9, y: top + 2 },
      { x: x0 + half + 9, y: top + 2 },
      { x: x0 + half - 6, y: top - o.roofH + 3 },
      { x: x0 - half + 6, y: top - o.roofH + 3 },
    ],
    true,
  );
  g.lineStyle(1, o.roofDark, 0.8);
  for (let y = top - 6; y > top - o.roofH + 4; y -= 8) {
    const t = (top - y) / o.roofH;
    const inset = 9 - 15 * t;
    g.lineBetween(x0 - half - inset, y, x0 + half + inset, y);
  }
  g.fillStyle(o.roofDark);
  g.fillRect(x0 - half + 4, top - o.roofH, o.w - 8, 4);
  // Fachada
  g.fillStyle(o.wall);
  g.fillRect(x0 - half, top, o.w, o.wallH);
  g.fillStyle(o.wallDark);
  g.fillRect(x0 - half, o.baseY - 7, o.w, 7);
  if (o.stone) {
    g.lineStyle(1, o.wallDark, 0.6);
    for (let y = top + 8; y < o.baseY - 7; y += 9) {
      g.lineBetween(x0 - half, y, x0 + half, y);
      const off = ((y / 9) | 0) % 2 === 0 ? 0 : 10;
      for (let x = x0 - half + off; x < x0 + half; x += 20) g.lineBetween(x, y, x, y + 9);
    }
  }
  if (o.timber) {
    g.fillStyle(o.wallDark);
    g.fillRect(x0 - half, top, 4, o.wallH);
    g.fillRect(x0 + half - 4, top, 4, o.wallH);
    g.fillRect(x0 - half, top, o.w, 3);
    if (o.rows > 1) g.fillRect(x0 - half, top + o.wallH / 2 - 2, o.w, 3);
  }
  // Porta
  g.fillStyle(o.wallDark);
  g.fillRect(x0 - 10, o.baseY - 30, 20, 30);
  g.fillStyle(0x3a2616);
  g.fillRoundedRect(x0 - 8, o.baseY - 28, 16, 28, { tl: 6, tr: 6, bl: 0, br: 0 });
  g.fillStyle(C.gold);
  g.fillCircle(x0 + 4, o.baseY - 13, 1.3);
  // Janelas
  const rowH = o.wallH / o.rows;
  for (let r = 0; r < o.rows; r++) {
    const wy = top + r * rowH + rowH / 2 - 9;
    const slots = Math.max(1, Math.floor((o.w - 40) / 30));
    for (let i = 0; i < slots; i++) {
      const wx = x0 - half + 20 + ((o.w - 40) * (i + 0.5)) / slots;
      if (r === o.rows - 1 && Math.abs(wx - x0) < 20) continue;
      g.fillStyle(o.wallDark);
      g.fillRect(wx - 7, wy - 1, 14, 16);
      g.fillStyle(WINDOW);
      g.fillRect(wx - 5, wy + 1, 10, 12);
      lights.fillStyle(C.warm, 0.95);
      lights.fillRect(wx - 5, wy + 1, 10, 12);
      lights.fillStyle(C.warm, 0.18);
      lights.fillCircle(wx, wy + 7, 14);
    }
  }
  return top;
}

function lotGround(g: G, lot: Lot, built: boolean): void {
  g.fillStyle(built ? 0x3c3326 : 0x352d22, built ? 0.65 : 0.5);
  g.fillRoundedRect(-lot.w / 2, -lot.h / 2, lot.w, lot.h, 22);
  if (!built) {
    g.lineStyle(1, 0x8a7a5a, 0.35);
    g.strokeRoundedRect(-lot.w / 2 + 4, -lot.h / 2 + 4, lot.w - 8, lot.h - 8, 18);
  }
}

function ruin(g: G, id: BuildingId, lot: Lot): void {
  const seed = hash(id.length * 31 + id.charCodeAt(0), id.charCodeAt(1));
  let s = seed;
  const rnd = () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    return s / 0x100000000;
  };
  const baseY = lot.h / 2 - 30;
  const w = lot.w * 0.58;
  // Paredes quebradas
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(0, baseY + 4, w + 24, 16);
  const pts: { x: number; y: number }[] = [{ x: -w / 2, y: baseY }];
  for (let i = 0; i <= 8; i++) {
    const x = -w / 2 + (w * i) / 8;
    pts.push({ x, y: baseY - 12 - rnd() * 34 });
  }
  pts.push({ x: w / 2, y: baseY });
  g.fillStyle(C.stoneDark);
  g.fillPoints(pts, true);
  g.lineStyle(1, 0x4a4740, 0.8);
  for (let y = baseY - 9; y > baseY - 40; y -= 9) g.lineBetween(-w / 2 + 3, y, w / 2 - 3, y);
  // Vão da porta
  g.fillStyle(0x221d18);
  g.fillRect(-9, baseY - 24, 18, 24);
  // Vigas queimadas
  g.lineStyle(5, 0x2b1e14, 1);
  g.lineBetween(-w / 2 + 10, baseY - 30, -w / 2 + 48, baseY - 58);
  g.lineBetween(w / 4, baseY - 10, w / 2 + 6, baseY - 44);
  g.lineStyle(3, 0x1d140e, 1);
  g.lineBetween(-10, baseY - 52, 30, baseY - 34);
  // Entulho
  for (let i = 0; i < 14; i++) {
    const x = (rnd() - 0.5) * lot.w * 0.8;
    const y = baseY - 6 + rnd() * 26;
    const r = 3 + rnd() * 5;
    g.fillStyle(rnd() < 0.5 ? C.stone : C.stoneDark);
    g.fillEllipse(x, y, r * 2, r * 1.3);
  }
  // Mato
  g.lineStyle(1, C.grassLight, 0.9);
  for (let i = 0; i < 10; i++) {
    const x = (rnd() - 0.5) * lot.w * 0.85;
    const y = -lot.h / 2 + 20 + rnd() * (lot.h - 30);
    g.lineBetween(x, y, x - 2, y - 6);
    g.lineBetween(x + 2, y, x + 3, y - 7);
  }
}

function sign(g: G, x: number, y: number, draw: (g: G) => void): void {
  g.lineStyle(2, C.woodDark, 1);
  g.lineBetween(x, y - 18, x + 16, y - 18);
  g.lineBetween(x + 14, y - 18, x + 14, y - 12);
  g.fillStyle(C.wood);
  g.fillRoundedRect(x + 5, y - 12, 18, 14, 2);
  draw(g);
}

function barrel(g: G, x: number, y: number): void {
  g.fillStyle(0x5a3a20);
  g.fillRoundedRect(x - 6, y - 14, 12, 14, 3);
  g.lineStyle(1, 0x2a1a10, 1);
  g.lineBetween(x - 6, y - 10, x + 6, y - 10);
  g.lineBetween(x - 6, y - 4, x + 6, y - 4);
}

function banner(g: G, x: number, y: number, color: number, accent: number): void {
  g.lineStyle(2, C.woodDark, 1);
  g.lineBetween(x, y, x, y - 44);
  g.fillStyle(color);
  g.fillPoints(
    [
      { x: x + 1, y: y - 42 },
      { x: x + 15, y: y - 42 },
      { x: x + 15, y: y - 18 },
      { x: x + 8, y: y - 23 },
      { x: x + 1, y: y - 18 },
    ],
    true,
  );
  g.fillStyle(accent);
  g.fillCircle(x + 8, y - 34, 3);
}

function dummy(g: G, x: number, y: number): void {
  g.fillStyle(0x000000, 0.2);
  g.fillEllipse(x, y + 1, 18, 6);
  g.lineStyle(3, C.woodDark, 1);
  g.lineBetween(x, y, x, y - 30);
  g.lineBetween(x - 10, y - 22, x + 10, y - 22);
  g.fillStyle(0xc9a85a);
  g.fillEllipse(x, y - 20, 12, 16);
  g.fillCircle(x, y - 32, 5);
  g.lineStyle(1, 0x8a6a2a, 1);
  g.lineBetween(x - 4, y - 20, x + 4, y - 18);
}

function target(g: G, x: number, y: number): void {
  g.lineStyle(2, C.woodDark, 1);
  g.lineBetween(x - 8, y, x - 3, y - 24);
  g.lineBetween(x + 8, y, x + 3, y - 24);
  g.fillStyle(0xe8dfc8);
  g.fillCircle(x, y - 24, 11);
  g.fillStyle(0xa83a2a);
  g.fillCircle(x, y - 24, 7.5);
  g.fillStyle(0xe8dfc8);
  g.fillCircle(x, y - 24, 4.5);
  g.fillStyle(0xa83a2a);
  g.fillCircle(x, y - 24, 2);
}

const SIZES = [
  { f: 0, wallH: 0, roofH: 0, rows: 0 },
  { f: 0.6, wallH: 48, roofH: 40, rows: 1 },
  { f: 0.74, wallH: 70, roofH: 48, rows: 2 },
  { f: 0.86, wallH: 78, roofH: 54, rows: 2 },
];

/** Desenha o prédio relativo ao centro do lote. `lights` fica acima da noite. */
export function drawBuilding(g: G, lights: G, id: BuildingId, level: number, lot: Lot): void {
  g.clear();
  lights.clear();
  lotGround(g, lot, level > 0);
  if (level <= 0) {
    ruin(g, id, lot);
    return;
  }
  const size = SIZES[Math.min(3, level)]!;
  const baseY = lot.h / 2 - 22;
  const w = lot.w * size.f;
  switch (id) {
    case 'taverna': {
      const top = house(g, lights, { w, wallH: size.wallH, roofH: size.roofH, wall: 0x8b5a33, wallDark: 0x5a3820, roof: 0x7a2e2a, roofDark: 0x531d1a, rows: size.rows, timber: true, baseY });
      sign(g, w / 2 - 4, baseY - 30, (g) => {
        g.fillStyle(0xd8a03a);
        g.fillRect(w / 2 + 10, baseY - 9, 6, 8);
        g.fillStyle(0xffffff);
        g.fillRect(w / 2 + 9, baseY - 11, 8, 3);
      });
      barrel(g, -w / 2 - 14, baseY + 4);
      barrel(g, -w / 2 - 2, baseY + 8);
      if (level >= 2) {
        g.fillStyle(C.woodDark);
        g.fillRect(w / 2 + 10, baseY + 6, 26, 4);
        g.fillRect(w / 2 + 12, baseY + 10, 3, 8);
        g.fillRect(w / 2 + 31, baseY + 10, 3, 8);
      }
      if (level >= 3) {
        g.fillStyle(0x531d1a);
        g.fillRect(-w / 2 + 14, top - size.roofH - 16, 12, 22);
        lights.fillStyle(C.warm, 0.25);
        lights.fillCircle(0, baseY - 14, 40);
      }
      break;
    }
    case 'estalagem': {
      house(g, lights, { w, wallH: size.wallH, roofH: size.roofH, wall: 0xc9b89a, wallDark: 0x8a7a5e, roof: 0x4a5a6e, roofDark: 0x33404f, rows: size.rows, timber: true, baseY });
      sign(g, -w / 2 - 16, baseY - 30, (g) => {
        g.fillStyle(0xe8e0d0);
        g.fillRect(-w / 2 - 9, baseY - 8, 12, 5);
        g.fillStyle(0x8a3a3a);
        g.fillRect(-w / 2 - 9, baseY - 10, 4, 3);
      });
      if (level >= 3) {
        house(g, lights, { x: w / 2 + 26, w: 52, wallH: 46, roofH: 30, wall: 0xc9b89a, wallDark: 0x8a7a5e, roof: 0x4a5a6e, roofDark: 0x33404f, rows: 1, timber: true, baseY: baseY + 6 });
      }
      break;
    }
    case 'ferreiro': {
      const top = house(g, lights, { w, wallH: size.wallH, roofH: size.roofH, wall: 0x7d786e, wallDark: 0x58544c, roof: 0x3a3a3e, roofDark: 0x26262a, rows: size.rows, stone: true, baseY });
      // Chaminé
      const cx = w / 2 - 22;
      g.fillStyle(0x58544c);
      g.fillRect(cx, top - size.roofH - 14 - level * 4, 14, 26 + level * 4);
      g.fillStyle(0x6a6a70, 0.45);
      g.fillCircle(cx + 7, top - size.roofH - 26 - level * 4, 7);
      g.fillCircle(cx + 14, top - size.roofH - 38 - level * 4, 9);
      // Forja aberta
      const fx = -w / 2 - 22;
      g.fillStyle(0x4a463f);
      g.fillRoundedRect(fx - 16, baseY - 26, 32, 26, 4);
      g.fillStyle(0x1a1410);
      g.fillRoundedRect(fx - 9, baseY - 18, 18, 12, 3);
      lights.fillStyle(C.fire, 1);
      lights.fillRoundedRect(fx - 9, baseY - 18, 18, 12, 3);
      lights.fillStyle(C.fire, 0.22);
      lights.fillCircle(fx, baseY - 12, 26);
      // Bigorna
      g.fillStyle(0x2c2c30);
      g.fillRect(fx + 20, baseY + 2, 6, 8);
      g.fillRoundedRect(fx + 13, baseY - 3, 20, 6, 2);
      if (level >= 2) {
        g.lineStyle(2, 0x9aa3ab, 1);
        g.lineBetween(w / 2 + 8, baseY - 2, w / 2 + 8, baseY - 30);
        g.lineBetween(w / 2 + 16, baseY - 2, w / 2 + 16, baseY - 34);
        g.lineStyle(2, C.woodDark, 1);
        g.lineBetween(w / 2 + 4, baseY - 26, w / 2 + 20, baseY - 26);
      }
      break;
    }
    case 'templo': {
      const top = house(g, lights, { w, wallH: size.wallH + 6, roofH: size.roofH + 10, wall: 0xd6d0c2, wallDark: 0xa39c8c, roof: 0x3d4358, roofDark: 0x2a2f40, rows: size.rows, stone: true, baseY });
      // Torre do sino
      const towerH = 24 + level * 14;
      const ty = top - size.roofH - 10;
      g.fillStyle(0xc6bfb0);
      g.fillRect(-12, ty - towerH, 24, towerH + 10);
      g.fillStyle(0x2a2f40);
      g.fillTriangle(-16, ty - towerH, 16, ty - towerH, 0, ty - towerH - 22 - level * 4);
      g.fillStyle(0x3a3428);
      g.fillRoundedRect(-6, ty - towerH + 6, 12, 14, { tl: 6, tr: 6, bl: 0, br: 0 });
      g.fillStyle(C.goldDark);
      g.fillCircle(0, ty - towerH + 16, 4);
      if (level >= 3) {
        g.fillStyle(C.gold);
        g.fillRect(-1, ty - towerH - 40, 2, 14);
        g.fillRect(-5, ty - towerH - 35, 10, 2);
      }
      // Rosácea
      lights.fillStyle(0xffd88a, 0.9);
      lights.fillCircle(0, top + 14, 7);
      lights.fillStyle(0xffd88a, 0.15);
      lights.fillCircle(0, top + 14, 20);
      g.fillStyle(WINDOW);
      g.fillCircle(0, top + 14, 7);
      break;
    }
    case 'guilda': {
      const top = house(g, lights, { w, wallH: size.wallH, roofH: size.roofH, wall: 0x7a6a4a, wallDark: 0x4e4330, roof: 0x2f5a3e, roofDark: 0x1f3d2a, rows: size.rows, timber: true, baseY });
      banner(g, -w / 2 - 10, baseY, 0x2f5a3e, C.gold);
      banner(g, w / 2 + 2, baseY, 0x2f5a3e, C.gold);
      if (level >= 2) {
        g.fillStyle(0x6a5a3e);
        g.fillRect(-w / 2 + 6, top - size.roofH - 30, 30, 34 + size.roofH);
        g.fillStyle(0x1f3d2a);
        g.fillTriangle(-w / 2 + 1, top - size.roofH - 30, -w / 2 + 41, top - size.roofH - 30, -w / 2 + 21, top - size.roofH - 56);
        lights.fillStyle(C.warm, 0.9);
        lights.fillRect(-w / 2 + 16, top - size.roofH - 20, 10, 12);
      }
      if (level >= 3) {
        g.lineStyle(2, C.woodDark, 1);
        g.lineBetween(-w / 2 + 21, top - size.roofH - 56, -w / 2 + 21, top - size.roofH - 82);
        g.fillStyle(C.gold);
        g.fillTriangle(-w / 2 + 22, top - size.roofH - 82, -w / 2 + 40, top - size.roofH - 76, -w / 2 + 22, top - size.roofH - 70);
      }
      break;
    }
    case 'campo': {
      const fw = lot.w * (0.62 + 0.1 * level);
      const fh = lot.h * 0.62;
      const fy = -lot.h / 2 + 22;
      g.fillStyle(0x4a5a34, 0.5);
      g.fillRect(-fw / 2, fy, fw, fh);
      g.lineStyle(2, C.woodDark, 1);
      g.strokeRect(-fw / 2, fy, fw, fh);
      g.lineStyle(1, C.wood, 1);
      g.strokeRect(-fw / 2, fy + 6, fw, fh - 6);
      for (let x = -fw / 2; x <= fw / 2; x += fw / 6) {
        g.fillStyle(C.woodDark);
        g.fillRect(x - 2, fy - 4, 4, 10);
        g.fillRect(x - 2, fy + fh - 6, 4, 10);
      }
      dummy(g, -fw / 4, fy + fh - 14);
      dummy(g, 0, fy + fh - 24);
      if (level >= 2) target(g, fw / 4 + 6, fy + fh - 16);
      if (level >= 3) {
        dummy(g, -fw / 2 + 24, fy + 40);
        house(g, lights, { x: fw / 2 - 20, w: 46, wallH: 34, roofH: 24, wall: 0x7a6a4a, wallDark: 0x4e4330, roof: 0x6a4a2a, roofDark: 0x4a321c, rows: 1, timber: true, baseY: fy + 40 });
      }
      break;
    }
  }
}
