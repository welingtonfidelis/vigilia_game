// Navegação na vila: grade de bloqueios em células de 16 px e rotas que contornam
// prédios, casas, cercas e objetos. Só visual (o núcleo não guarda posição); sem Phaser,
// para dar para testar.

import type { Point } from './layout.ts';

export const CELL = 16;

/** Transparência de uma imagem (1 byte por pixel, 0 = vazio). */
export interface AlphaMask {
  w: number;
  h: number;
  alpha: ArrayLike<number>;
}

export interface FootprintOptions {
  /** Fração mínima de pixels opacos para a célula bloquear. */
  minCover?: number;
  /** Só as N linhas de baixo da arte contam (a base de árvores e objetos); sem isto, a imagem toda. */
  fromBottom?: number;
}

/** Folga dos pés: a rota não passa raspando na quina de um bloqueio. */
const FEET_X = 6;
const FEET_Y = 3;
/** Desvio que acelera o passo no máximo isto, para a chegada não atrasar demais. */
const MAX_STRETCH = 1.8;
/** Se o destino andou mais que isto, a rota é refeita; menos, só o último ponto muda. */
const REROUTE = 24;

export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  /** Muda sempre que um bloqueio entra ou sai: rotas antigas se refazem. */
  version = 0;
  private readonly count: Uint16Array;
  private readonly layers = new Map<string, number[]>();

  constructor(width: number, height: number) {
    this.cols = Math.ceil(width / CELL);
    this.rows = Math.ceil(height / CELL);
    this.count = new Uint16Array(this.cols * this.rows);
  }

  /** Troca as células de uma camada (um prédio, as árvores, a cerca…). */
  setLayer(name: string, cells: number[]): void {
    const old = this.layers.get(name);
    if (old) for (const i of old) this.count[i]!--;
    const unique = [...new Set(cells.filter((i) => i >= 0 && i < this.count.length))];
    for (const i of unique) this.count[i]!++;
    this.layers.set(name, unique);
    this.version++;
  }

  index(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  blockedCell(cx: number, cy: number): boolean {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return true;
    return this.count[this.index(cx, cy)]! > 0;
  }

  blockedAt(x: number, y: number): boolean {
    return this.blockedCell(Math.floor(x / CELL), Math.floor(y / CELL));
  }

  /** Os pés (com folga) cabem neste ponto. */
  feetFree(x: number, y: number): boolean {
    return (
      !this.blockedAt(x, y) &&
      !this.blockedAt(x - FEET_X, y) &&
      !this.blockedAt(x + FEET_X, y) &&
      !this.blockedAt(x, y - FEET_Y) &&
      !this.blockedAt(x, y + FEET_Y)
    );
  }

  /** Dá para andar em linha reta de a até b sem bater em nada. */
  clear(a: Point, b: Point): boolean {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(dist / 4));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (!this.feetFree(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  }

  /** Célula livre mais perto (busca em anéis), ou null se a grade estiver toda tomada. */
  nearestOpen(cx: number, cy: number): [number, number] | null {
    if (!this.blockedCell(cx, cy)) return [cx, cy];
    const max = Math.max(this.cols, this.rows);
    for (let r = 1; r < max; r++) {
      let best: [number, number] | null = null;
      let bestD = Infinity;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (this.blockedCell(x, y)) continue;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = [x, y];
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /**
   * Rota de `from` até `to` contornando os bloqueios: A* em 8 direções (sem cortar
   * quina) e depois esticada em linhas retas. Devolve os pontos a seguir, sem o de
   * partida; o último é `to` (ou o centro livre mais perto, se `to` cair num bloqueio).
   */
  findPath(from: Point, to: Point): Point[] | null {
    const start = this.nearestOpen(Math.floor(from.x / CELL), Math.floor(from.y / CELL));
    const goal = this.nearestOpen(Math.floor(to.x / CELL), Math.floor(to.y / CELL));
    if (!start || !goal) return null;
    const end = this.blockedAt(to.x, to.y) ? center(goal[0], goal[1]) : to;
    if (this.clear(from, end)) return [end];

    const cells = this.search(start, goal);
    if (!cells) return null;
    const points = cells.map(([cx, cy]) => center(cx, cy));
    points[points.length - 1] = end;
    return this.smooth(from, points);
  }

  private search(start: [number, number], goal: [number, number]): [number, number][] | null {
    const n = this.cols * this.rows;
    const g = new Float32Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const s = this.index(start[0], start[1]);
    const t = this.index(goal[0], goal[1]);
    const heap = new MinHeap();
    g[s] = 0;
    heap.push(s, octile(start, goal));
    while (heap.size > 0) {
      const cur = heap.pop();
      if (cur === t) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % this.cols;
      const cy = (cur - cx) / this.cols;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (this.blockedCell(nx, ny)) continue;
        // Diagonal só se os dois lados estiverem livres (não corta quina).
        if (dx !== 0 && dy !== 0 && (this.blockedCell(cx + dx, cy) || this.blockedCell(cx, cy + dy))) continue;
        const ni = this.index(nx, ny);
        if (closed[ni]) continue;
        const cost = g[cur]! + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
        if (cost < g[ni]!) {
          g[ni] = cost;
          came[ni] = cur;
          heap.push(ni, cost + octile([nx, ny], goal));
        }
      }
    }
    if (s !== t && came[t] === -1) return null;
    const path: [number, number][] = [];
    for (let i = t; i !== -1; i = came[i]!) {
      const x = i % this.cols;
      path.push([x, (i - x) / this.cols]);
      if (i === s) break;
    }
    return path.reverse();
  }

  /** Puxa a corda: de cada ponto, pula direto para o mais longe que se enxerga. */
  private smooth(from: Point, points: Point[]): Point[] {
    const out: Point[] = [];
    let anchor = from;
    let i = 0;
    while (i < points.length) {
      let far = i;
      for (let j = points.length - 1; j > i; j--) {
        if (this.clear(anchor, points[j]!)) {
          far = j;
          break;
        }
      }
      out.push(points[far]!);
      anchor = points[far]!;
      i = far + 1;
    }
    return out;
  }

  /** Movimento livre (o prefeito no teclado): escorrega pela parede em vez de atravessar. */
  slide(from: Point, dx: number, dy: number): Point {
    if (this.feetFree(from.x + dx, from.y + dy)) return { x: from.x + dx, y: from.y + dy };
    if (dx !== 0 && this.feetFree(from.x + dx, from.y)) return { x: from.x + dx, y: from.y };
    if (dy !== 0 && this.feetFree(from.x, from.y + dy)) return { x: from.x, y: from.y + dy };
    // Já dentro de um bloqueio (um prédio subiu de nível em cima dele): deixa sair.
    if (!this.feetFree(from.x, from.y)) return { x: from.x + dx, y: from.y + dy };
    return from;
  }

  /** Células que a parte opaca de uma imagem cobre, desenhada com o canto em (left, top). */
  footprint(mask: AlphaMask, left: number, top: number, scale: number, opts: FootprintOptions = {}): number[] {
    const minCover = opts.minCover ?? 0.4;
    const y0 = opts.fromBottom === undefined ? 0 : Math.max(0, mask.h - opts.fromBottom);
    const perCell = (CELL / scale) ** 2;
    const hits = new Map<number, number>();
    for (let y = y0; y < mask.h; y++) {
      for (let x = 0; x < mask.w; x++) {
        if ((mask.alpha[y * mask.w + x] ?? 0) < 128) continue;
        const cx = Math.floor((left + (x + 0.5) * scale) / CELL);
        const cy = Math.floor((top + (y + 0.5) * scale) / CELL);
        if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) continue;
        const i = this.index(cx, cy);
        hits.set(i, (hits.get(i) ?? 0) + 1);
      }
    }
    return [...hits].filter(([, n]) => n / perCell >= minCover).map(([i]) => i);
  }

  /** Células de um retângulo em unidades do mundo. */
  rect(x: number, y: number, w: number, h: number): number[] {
    const out: number[] = [];
    for (let cy = Math.floor(y / CELL); cy < Math.ceil((y + h) / CELL); cy++) {
      for (let cx = Math.floor(x / CELL); cx < Math.ceil((x + w) / CELL); cx++) {
        if (cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows) out.push(this.index(cx, cy));
      }
    }
    return out;
  }
}

/**
 * Rota de um personagem: sabe para onde andar agora e refaz o caminho quando o
 * destino muda de verdade ou um bloqueio aparece. `stretch` acelera o passo nos
 * desvios, para a chegada não atrasar em relação ao que o núcleo já decidiu.
 */
export class Route {
  stretch = 1;
  private points: Point[] = [];
  private goal: Point | null = null;
  private version = -1;

  /** Ponto para onde andar neste quadro. `step` é quanto o personagem anda agora. */
  toward(nav: NavGrid | null, pos: Point, target: Point, step: number): Point {
    if (!nav) return target;
    const moved = this.goal ? Math.hypot(target.x - this.goal.x, target.y - this.goal.y) : Infinity;
    if (moved > REROUTE || this.version !== nav.version) {
      this.points = nav.findPath(pos, target) ?? [target];
      this.goal = target;
      this.version = nav.version;
      const straight = Math.hypot(target.x - pos.x, target.y - pos.y);
      this.stretch = straight > CELL ? Math.min(MAX_STRETCH, Math.max(1, length(pos, this.points) / straight)) : 1;
    } else if (moved > 0 && this.points.length > 0 && !nav.blockedAt(target.x, target.y)) {
      this.points[this.points.length - 1] = target;
    }
    while (this.points.length > 1 && Math.hypot(this.points[0]!.x - pos.x, this.points[0]!.y - pos.y) <= Math.max(step, 0.5)) {
      this.points.shift();
    }
    return this.points[0] ?? target;
  }

  /** Está na última perna (o próximo ponto é o destino). */
  get last(): boolean {
    return this.points.length <= 1;
  }

  /** Esquece a rota (teleporte, sumiu, voltou do abismo). */
  reset(): void {
    this.points = [];
    this.goal = null;
    this.stretch = 1;
  }
}

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const center = (cx: number, cy: number): Point => ({ x: (cx + 0.5) * CELL, y: (cy + 0.5) * CELL });

function octile(a: [number, number], b: [number, number]): number {
  const dx = Math.abs(a[0] - b[0]);
  const dy = Math.abs(a[1] - b[1]);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

function length(from: Point, points: Point[]): number {
  let total = 0;
  let prev = from;
  for (const p of points) {
    total += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return total;
}

/** Fila de prioridade mínima (heap binário) para o A*. */
class MinHeap {
  private readonly items: number[] = [];
  private readonly prio: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, p: number): void {
    this.items.push(item);
    this.prio.push(p);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent]! <= this.prio[i]!) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0]!;
    const lastItem = this.items.pop()!;
    const lastPrio = this.prio.pop()!;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.prio[0] = lastPrio;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.prio[l]! < this.prio[m]!) m = l;
        if (r < this.items.length && this.prio[r]! < this.prio[m]!) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b]!, this.items[a]!];
    [this.prio[a], this.prio[b]] = [this.prio[b]!, this.prio[a]!];
  }
}
