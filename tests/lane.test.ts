import { describe, expect, it } from 'vitest';
import {
  cameraTarget,
  enemySlot,
  ENTRY_W,
  formation,
  laneGoal,
  laneLength,
  revealX,
  ROOM_W,
  stopX,
  takeEvents,
  threatX,
  wallVariant,
  type EventCursor,
} from '../src/render/lane/model.ts';
import { CLASSES } from '../src/sim/index.ts';
import type { Combat, CombatEvent, Party, Room } from '../src/sim/index.ts';
import { packAsset } from '../src/render/pack.ts';

const rooms = (n: number, cleared = 0): Room[] =>
  Array.from({ length: n }, (_, i) => ({ kind: i === n - 1 ? 'chefe' : 'matilha', cleared: i < cleared, remainsOf: null }));

const party = (over: Partial<Party>): Party => ({ phase: 'explorando', roomIndex: 0, ...over }) as Party;

const ev = (n: number): CombatEvent => ({ n, t: n, kind: 'hit', from: 1, to: 2, amount: 3, crit: false, kill: false });

describe('corredor: geometria', () => {
  it('cada sala é um trecho; o grupo para antes dos monstros', () => {
    expect(laneLength(5)).toBe(ENTRY_W + 5 * ROOM_W);
    for (let i = 0; i < 5; i++) {
      expect(stopX(i)).toBeLessThan(threatX(i));
      expect(stopX(i + 1) - stopX(i)).toBe(ROOM_W);
    }
  });

  it('formação estável: tanque na frente, retaguarda atrás, duas fileiras', () => {
    const slots = formation([
      { id: 3, role: 'healer' },
      { id: 1, role: 'ranged' },
      { id: 2, role: 'tank' },
      { id: 4, role: 'melee' },
    ]);
    expect(slots.map((s) => s.id)).toEqual([2, 4, 1, 3]);
    expect(slots[0]!.dx).toBe(0);
    expect(slots.every((s, i) => i === 0 || s.dx < slots[i - 1]!.dx)).toBe(true);
    expect(new Set(slots.map((s) => s.row)).size).toBe(2);
  });

  it('monstros ficam à frente do grupo; o chefe mais ao fundo', () => {
    const normal = [0, 1, 2, 3].map((i) => enemySlot(2, i, false));
    expect(normal.every((s) => s.x > stopX(2))).toBe(true);
    expect(enemySlot(2, 0, true).x).toBeGreaterThan(normal[0]!.x);
  });

  it('parede de cada sala: fixa por andar, misturando a e b', () => {
    const rooms = Array.from({ length: 40 }, (_, i) => wallVariant(0, 1, i));
    expect(rooms).toEqual(Array.from({ length: 40 }, (_, i) => wallVariant(0, 1, i)));
    const b = rooms.filter((v) => v === 'b').length;
    expect(b).toBeGreaterThan(8);
    expect(b).toBeLessThan(28);
    expect(rooms.slice(0, 8)).not.toEqual(Array.from({ length: 8 }, (_, i) => wallVariant(0, 2, i)));
  });
});

describe('corredor: arte', () => {
  it('os 12 heróis têm caminhada de perfil de 8 quadros com passada', () => {
    for (const cls of Object.keys(CLASSES)) {
      for (const g of ['m', 'f']) {
        const walk = packAsset(`char/hero/${cls}/${g}/walk`);
        expect(walk?.animations?.walk?.frames, `${cls}/${g}`).toHaveLength(8);
        expect(walk?.stride).toBeGreaterThan(0);
      }
    }
  });

  it('os seis atos têm todas as peças do corredor', () => {
    for (const act of ['I', 'II', 'III', 'IV', 'V', 'VI']) {
      for (const piece of ['wall-a', 'wall-b', 'floor', 'fore', 'door', 'entry']) {
        expect(packAsset(`corridor/${act}/${piece}`), `${act} ${piece}`).toBeDefined();
      }
    }
  });
});

describe('corredor: para onde o grupo anda', () => {
  it('descendo entra pela borda; explorando e lutando vão até a sala atual; voltando sai pela esquerda', () => {
    const r = rooms(5);
    expect(laneGoal(party({ phase: 'descendo' }), r).x).toBeLessThan(stopX(0));
    expect(laneGoal(party({ phase: 'explorando', roomIndex: 2 }), r).x).toBe(stopX(2));
    expect(laneGoal(party({ phase: 'combate', roomIndex: 3 }), r).x).toBe(stopX(3));
    const back = laneGoal(party({ phase: 'voltando', roomIndex: 3 }), r);
    expect(back.x).toBeLessThan(0);
    expect(back.facing).toBe(-1);
  });

  it('índice além do fim (andar conquistado) fica na última sala', () => {
    expect(laneGoal(party({ roomIndex: 9 }), rooms(4)).x).toBe(stopX(3));
  });

  it('a névoa abre a sala atual e as já limpas', () => {
    expect(revealX(party({ roomIndex: 1 }), rooms(5))).toBe(ENTRY_W + 2 * ROOM_W);
    expect(revealX(party({ roomIndex: 0 }), rooms(5, 3))).toBe(ENTRY_W + 3 * ROOM_W);
  });

  it('a câmera deixa espaço à frente e não sai do corredor', () => {
    const len = laneLength(6);
    const ahead = cameraTarget(stopX(2), 1, 400, len);
    expect(stopX(2) - ahead).toBeLessThan(400 / 2);
    expect(cameraTarget(stopX(5), 1, 400, len)).toBeLessThanOrEqual(len - 400);
    expect(cameraTarget(0, 1, 400, len)).toBeGreaterThanOrEqual(-ENTRY_W);
    expect(cameraTarget(100, 1, 2000, laneLength(2))).toBeLessThan(0); // corredor curto: centraliza
  });
});

describe('corredor: golpes novos', () => {
  it('combate novo toca tudo; depois só o que chegou', () => {
    const cursor: EventCursor = { combat: null, last: 0 };
    const c = { ticks: 3, log: [ev(1), ev(2)] } as Combat;
    expect(takeEvents(cursor, c).map((e) => e.n)).toEqual([1, 2]);
    c.log!.push(ev(3));
    expect(takeEvents(cursor, c).map((e) => e.n)).toEqual([3]);
    expect(takeEvents(cursor, c)).toEqual([]);
  });

  it('abrir a tela no meio de uma luta não repete os golpes antigos', () => {
    const cursor: EventCursor = { combat: null, last: 0 };
    const c = { ticks: 200, log: [ev(40), ev(41)] } as Combat;
    expect(takeEvents(cursor, c)).toEqual([]);
    c.log!.push(ev(42));
    expect(takeEvents(cursor, c).map((e) => e.n)).toEqual([42]);
  });

  it('save antigo sem registro não quebra', () => {
    const cursor: EventCursor = { combat: null, last: 0 };
    expect(takeEvents(cursor, { ticks: 1 } as Combat)).toEqual([]);
    expect(takeEvents(cursor, null)).toEqual([]);
  });
});
