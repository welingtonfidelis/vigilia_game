import { describe, expect, it } from 'vitest';
import { BUILDING_IDS } from '../src/sim/index.ts';
import { CELL, NavGrid } from '../src/render/nav.ts';
import { door, gravePoint, GRAVE_SLOTS, HOMES, LANDMARKS, PLAZA, WORLD_H, WORLD_W, type Point } from '../src/render/layout.ts';
import { CLIFFS, cliffTop, faceCells, onFace } from '../src/render/relief.ts';

function reliefNav(): NavGrid {
  const nav = new NavGrid(WORLD_W, WORLD_H);
  nav.setLayer('relevo', faceCells(nav.cols, nav.rows, CELL));
  return nav;
}

/** A rota chega no próprio ponto pedido (não parou na célula livre mais perto). */
function reaches(nav: NavGrid, from: Point, to: Point): boolean {
  const path = nav.findPath(from, to);
  return path !== null && path[path.length - 1]!.x === to.x && path[path.length - 1]!.y === to.y;
}

describe('relevo da vila', () => {
  const nav = reliefNav();
  const plaza = { x: PLAZA.x, y: PLAZA.y };

  it('a parede de rocha separa os níveis: não dá para descer em linha reta', () => {
    // Da praça ao cemitério e da estrada de cima até a estalagem, atravessando a rocha.
    expect(nav.clear({ x: 300, y: 420 }, { x: 300, y: 250 })).toBe(false);
    expect(nav.clear({ x: 400, y: 580 }, { x: 400, y: 760 })).toBe(false);
  });

  it('todo lugar da vila continua alcançável pelas escadarias', () => {
    const targets: [string, Point][] = [
      ['berrante', { x: LANDMARKS.berrante.x, y: LANDMARKS.berrante.y + 8 }],
      ['portao', LANDMARKS.portao],
      ['termas', LANDMARKS.termas],
      ['abismo', LANDMARKS.abismo],
      ['fogueira', { x: LANDMARKS.fogueira.x, y: LANDMARKS.fogueira.y + 30 }],
      ['quadro', { x: LANDMARKS.quadro.x, y: LANDMARKS.quadro.y + 40 }],
      ...BUILDING_IDS.map((id): [string, Point] => [id, door(id)]),
      ...HOMES.map((h, i): [string, Point] => [`casa ${i}`, h.door]),
      ...[0, 8, 20, GRAVE_SLOTS - 1].map((i): [string, Point] => [`cova ${i}`, { x: gravePoint(i).x, y: gravePoint(i).y + 24 }]),
    ];
    for (const [name, to] of targets) {
      expect(onFace(to.x, to.y), `${name} está na rocha`).toBe(false);
      expect(reaches(nav, plaza, to), name).toBe(true);
    }
  });

  it('a descida da praça passa pela escadaria do meio', () => {
    const path = nav.findPath(plaza, LANDMARKS.termas)!;
    const praca = CLIFFS.find((c) => c.id === 'praca')!;
    const stair = praca.stairs[1]!;
    let prev = plaza;
    let crossed = false;
    for (const p of path) {
      const top = cliffTop(praca, p.x);
      if (prev.y < top && p.y > top) crossed = (p.x + prev.x) / 2 >= stair.x && (p.x + prev.x) / 2 <= stair.x + stair.w;
      prev = p;
    }
    expect(crossed).toBe(true);
  });

  it('a borda é contínua: a parede tem a mesma altura em toda a largura', () => {
    for (const c of CLIFFS) {
      let last = cliffTop(c, 0);
      for (let x = 4; x < WORLD_W; x += 4) {
        const y = cliffTop(c, x);
        expect(Math.abs(y - last), `${c.id} em x=${x}`).toBeLessThan(8);
        last = y;
      }
    }
  });
});
