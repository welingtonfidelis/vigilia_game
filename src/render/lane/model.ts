// Corredor da dungeon: o andar inteiro como uma faixa lateral, com cada sala num
// trecho. Só geometria e regras (sem canvas), para dar para testar no Node.
//
// Coordenadas em pixels de arte (o canvas amplia depois). x cresce para dentro
// da dungeon; y é a linha dos pés.

import type { Combat, CombatEvent, Party, Role, Room } from '../../sim/index.ts';

/** Largura de cada sala: um painel de arena (320 px) do pack. */
export const ROOM_W = 320;
/** Trecho antes da primeira sala, onde o grupo entra. */
export const ENTRY_W = 72;
/** Altura da faixa (a das camadas de arena). */
export const LANE_H = 192;
/** Linhas dos pés: a de trás e a da frente (formação em duas fileiras). */
export const ROW_Y = [154, 168] as const;

/** Onde o líder para em cada sala para lutar ou passar. */
export const STOP_IN_ROOM = 136;
/** Onde ficam os monstros, o baú, o santuário… dentro da sala. */
export const THREAT_IN_ROOM = 214;

/** Passo normal do grupo (px de arte por segundo em 1×); entre salas ele acompanha a simulação. */
export const WALK_SPEED = 96;

export const roomX = (i: number): number => ENTRY_W + i * ROOM_W;

/**
 * Qual das duas paredes do corredor vai em cada sala. Fixo por andar (a mesma sala
 * mostra sempre a mesma parede), sem padrão óbvio, com cerca de 40% de "b".
 */
export function wallVariant(seed: number, floor: number, room: number): 'a' | 'b' {
  const h = Math.imul(room + 1, 2654435761) ^ Math.imul(floor + 1, 40503) ^ Math.imul(seed + 1, 69069);
  return ((h >>> 0) % 5) < 2 ? 'b' : 'a';
}
export const stopX = (i: number): number => roomX(i) + STOP_IN_ROOM;
export const threatX = (i: number): number => roomX(i) + THREAT_IN_ROOM;
export const laneLength = (rooms: number): number => ENTRY_W + Math.max(1, rooms) * ROOM_W;

/** Quem vai na frente: tanque, depois corpo a corpo, e a retaguarda atrás. */
const FRONT: Record<Role, number> = { tank: 0, bruiser: 1, melee: 2, ranged: 3, aoe: 4, healer: 5 };

export interface Slot {
  id: number;
  /** Distância atrás do líder (≤ 0). */
  dx: number;
  row: 0 | 1;
}

/** Formação do grupo: a mesma ordem sempre, para ninguém trocar de lugar sem motivo. */
export function formation(members: { id: number; role: Role }[]): Slot[] {
  return [...members]
    .sort((a, b) => FRONT[a.role] - FRONT[b.role] || a.id - b.id)
    .map((m, i) => ({ id: m.id, dx: i === 0 ? 0 : -i * 24, row: (i % 2 === 0 ? 1 : 0) as 0 | 1 }));
}

/** Lugar dos monstros: em leque à frente da sala; o chefe um pouco mais atrás. */
export function enemySlot(room: number, index: number, boss: boolean): { x: number; row: 0 | 1 } {
  if (boss) return { x: threatX(room) + 40, row: 0 };
  return { x: threatX(room) + Math.floor(index / 2) * 30 + (index % 2) * 12, row: (index % 2 === 0 ? 1 : 0) as 0 | 1 };
}

export interface LaneGoal {
  /** Para onde o líder vai. */
  x: number;
  /** 1 = para dentro da dungeon, −1 = de volta à vila. */
  facing: 1 | -1;
  /** Texto curto do que o grupo está fazendo. */
  label: string;
}

/** Para onde o grupo caminha agora, a partir da fase da expedição. */
export function laneGoal(party: Party, rooms: Room[]): LaneGoal {
  const last = Math.max(0, rooms.length - 1);
  const index = Math.min(party.roomIndex, last);
  switch (party.phase) {
    case 'descendo':
      return { x: ENTRY_W - 24, facing: 1, label: 'Descendo' };
    case 'voltando':
      return { x: -60, facing: -1, label: 'Voltando à vila' };
    case 'combate':
      return { x: stopX(index), facing: 1, label: 'Em combate' };
    default:
      return { x: stopX(index), facing: 1, label: 'Avançando' };
  }
}

/** Até onde a névoa já se abriu: a sala atual inteira fica visível. */
export const revealX = (party: Party, rooms: Room[]): number => {
  const cleared = rooms.reduce((max, r, i) => (r.cleared ? i : max), -1);
  const index = Math.max(cleared, Math.min(party.roomIndex, rooms.length - 1));
  return roomX(index) + ROOM_W;
};

/** Câmera: segue o líder deixando mais espaço à frente; nunca sai do corredor. */
export function cameraTarget(leaderX: number, facing: 1 | -1, viewW: number, length: number): number {
  const ahead = facing === 1 ? 0.38 : 0.62;
  const x = leaderX - viewW * ahead;
  if (length <= viewW) return (length - viewW) / 2;
  return Math.max(-ENTRY_W, Math.min(length - viewW, x));
}

// ── Golpes novos para animar ────────────────────────────────────────────

export interface EventCursor {
  combat: Combat | null;
  last: number;
}

/**
 * Golpes que a tela ainda não mostrou. Um combate novo começa do zero; ao abrir
 * a tela no meio de uma luta antiga, pula o que já passou (não repete a luta).
 */
export function takeEvents(cursor: EventCursor, combat: Combat | null | undefined): CombatEvent[] {
  if (!combat) {
    cursor.combat = null;
    return [];
  }
  const log = combat.log ?? [];
  if (cursor.combat !== combat) {
    const fresh = combat.ticks < 15;
    cursor.combat = combat;
    cursor.last = fresh ? 0 : (log[log.length - 1]?.n ?? 0);
    if (!fresh) return [];
  }
  const out = log.filter((e) => e.n > cursor.last);
  if (out.length > 0) cursor.last = out[out.length - 1]!.n;
  return out;
}

/** Quem ataca de longe: projétil em vez de investida. */
export const RANGED_ROLES: ReadonlySet<Role> = new Set(['ranged', 'aoe', 'healer']);
