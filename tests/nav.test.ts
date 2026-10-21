import { describe, expect, it } from 'vitest';
import { CELL, NavGrid, Route } from '../src/render/nav.ts';
import type { Point } from '../src/render/layout.ts';

/** Um "prédio" de 8×6 células no meio de uma área 40×30. */
function withBuilding(): NavGrid {
  const nav = new NavGrid(40 * CELL, 30 * CELL);
  nav.setLayer('predio', nav.rect(16 * CELL, 10 * CELL, 8 * CELL, 6 * CELL));
  return nav;
}

const crosses = (nav: NavGrid, from: Point, path: Point[]): boolean => {
  let prev = from;
  for (const p of path) {
    if (!nav.clear(prev, p)) return true;
    prev = p;
  }
  return false;
};

describe('navegação da vila', () => {
  it('caminho livre vira uma linha reta', () => {
    const nav = withBuilding();
    const to = { x: 30 * CELL, y: 4 * CELL };
    expect(nav.findPath({ x: 4 * CELL, y: 4 * CELL }, to)).toEqual([to]);
  });

  it('contorna o prédio em vez de atravessar', () => {
    const nav = withBuilding();
    const from = { x: 12 * CELL, y: 13 * CELL };
    const to = { x: 28 * CELL, y: 13 * CELL };
    expect(nav.clear(from, to)).toBe(false);
    const path = nav.findPath(from, to)!;
    expect(path.length).toBeGreaterThan(1);
    expect(path[path.length - 1]).toEqual(to);
    expect(crosses(nav, from, path)).toBe(false);
  });

  it('destino dentro de um bloqueio vai para a célula livre mais perto', () => {
    const nav = withBuilding();
    const path = nav.findPath({ x: 4 * CELL, y: 13 * CELL }, { x: 17 * CELL, y: 13 * CELL })!;
    const end = path[path.length - 1]!;
    expect(nav.blockedAt(end.x, end.y)).toBe(false);
    expect(end.x).toBeLessThan(16 * CELL);
  });

  it('a pegada sai da parte opaca da imagem', () => {
    const nav = new NavGrid(20 * CELL, 20 * CELL);
    // Imagem 16×16 (escala 2 = 32×32 no mundo): só a metade de baixo é opaca.
    const alpha = Array.from({ length: 16 * 16 }, (_, i) => (Math.floor(i / 16) >= 8 ? 255 : 0));
    const cells = nav.footprint({ w: 16, h: 16, alpha }, 4 * CELL, 4 * CELL, 2);
    expect(cells.sort((a, b) => a - b)).toEqual([nav.index(4, 5), nav.index(5, 5)]);
    // Só as 2 linhas de baixo: cobrem um quarto da célula e não chegam a bloquear.
    expect(nav.footprint({ w: 16, h: 16, alpha }, 4 * CELL, 4 * CELL, 2, { fromBottom: 2, minCover: 0.5 })).toEqual([]);
  });

  it('o prefeito escorrega pela parede', () => {
    const nav = withBuilding();
    const at = { x: 15 * CELL, y: 12 * CELL };
    const next = nav.slide(at, 12, 6);
    expect(next.x).toBe(at.x);
    expect(next.y).toBe(at.y + 6);
  });

  it('a rota acelera o passo no desvio e se refaz quando um bloqueio aparece', () => {
    const nav = new NavGrid(40 * CELL, 30 * CELL);
    const route = new Route();
    const from = { x: 12 * CELL, y: 13 * CELL };
    const to = { x: 28 * CELL, y: 13 * CELL };
    expect(route.toward(nav, from, to, 2)).toEqual(to);
    expect(route.stretch).toBe(1);
    nav.setLayer('predio', nav.rect(16 * CELL, 10 * CELL, 8 * CELL, 6 * CELL));
    const next = route.toward(nav, from, to, 2);
    expect(next).not.toEqual(to);
    expect(route.stretch).toBeGreaterThan(1);
    expect(route.stretch).toBeLessThanOrEqual(1.8);
  });
});
