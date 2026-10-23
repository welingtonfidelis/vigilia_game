import { describe, expect, it } from 'vitest';
import { BUILDING_IDS } from '../src/sim/index.ts';
import { CELL, NavGrid } from '../src/render/nav.ts';
import { DECOR_SPOTS, door, gravePoint, GRAVE_SLOTS, HOMES, LANDMARKS, PLAZA, WORLD_H, WORLD_W, type Point } from '../src/render/layout.ts';
import { CLIFFS, cliffTop, faceCells, inCliff, onFace } from '../src/render/relief.ts';

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
    // Do portão ao cemitério, no alto: a parede lateral do platô fecha a passagem.
    expect(nav.clear({ x: 700, y: 150 }, { x: 300, y: 150 })).toBe(false);
    expect(nav.clear({ x: 600, y: 268 }, { x: 300, y: 240 })).toBe(false);
  });

  it('todo lugar da vila continua alcançável pelas escadarias', () => {
    const targets: [string, Point][] = [
      ['berrante', { x: LANDMARKS.berrante.x, y: LANDMARKS.berrante.y + 8 }],
      ['portao', LANDMARKS.portao],
      ['cemiterio', LANDMARKS.cemiterio],
      ['termas', LANDMARKS.termas],
      ['salao', LANDMARKS.salao],
      ['paco', LANDMARKS.paco],
      ['cofre', { x: LANDMARKS.cofre.x, y: LANDMARKS.cofre.y + 44 }],
      ...DECOR_SPOTS.map((d, i): [string, Point] => [`enfeite ${i}`, { x: d.x * 32, y: d.y * 32 + 12 }]),
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

  it('a borda dos paredões compridos é contínua (sem degrau de um ponto para o outro)', () => {
    for (const c of CLIFFS.filter((cl) => cl.id !== 'cemiterio')) {
      let last = NaN;
      for (let x = 0; x < WORLD_W; x += 4) {
        if (!inCliff(c, x)) continue;
        const y = cliffTop(c, x);
        if (Number.isNaN(last)) last = y;
        expect(Math.abs(y - last), `${c.id} em x=${x}`).toBeLessThan(8);
        last = y;
      }
    }
  });

  it('a encosta íngreme da meseta do cemitério não deixa fresta: só se entra pela escadaria', () => {
    // De vários pontos do alto, ao lado do portão, em linha reta até o meio do cemitério.
    const inside = { x: 240, y: 120 };
    for (let y = 8; y <= 290; y += 6) {
      for (const x of [660, 700, 740]) expect(nav.clear({ x, y }, inside), `de ${x},${y}`).toBe(false);
    }
    // E a rota do portão até o cemitério desce, atravessa o templo e sobe pela escadaria.
    const path = nav.findPath(LANDMARKS.portao, LANDMARKS.cemiterio)!;
    expect(path[path.length - 1]).toEqual(LANDMARKS.cemiterio);
    // Onde a rota cruza a altura da parede (y = 330), ela está na escadaria (x 150–208).
    let prev: Point = LANDMARKS.portao;
    const crossings: number[] = [];
    for (const p of path) {
      if ((prev.y - 330) * (p.y - 330) < 0) crossings.push(prev.x + ((330 - prev.y) / (p.y - prev.y)) * (p.x - prev.x));
      prev = p;
    }
    expect(crossings.length).toBeGreaterThan(0);
    for (const x of crossings) expect(x >= 150 && x <= 208 || x >= 762 && x <= 838, `cruzou em x=${x}`).toBe(true);
  });
});
