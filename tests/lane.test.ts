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
import { autoMayor, CLASSES, createWorld, runTicks } from '../src/sim/index.ts';
import type { Combat, CombatEvent, Party, Room, World } from '../src/sim/index.ts';
import { LaneRenderer, type LaneHost } from '../src/render/lane/renderer.ts';
import { heroPortraitHd, heroSpriteId, packAsset } from '../src/render/pack.ts';

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

  it('os 12 heróis usam o estilo novo: mapa e caminhada 24×32, modelo 48×64', () => {
    expect(heroSpriteId('guardiao', 'm')).toBe('char/hero/guerreiro/m');
    for (const cls of Object.keys(CLASSES)) {
      for (const g of ['m', 'f']) {
        const id = heroSpriteId(cls, g);
        expect(packAsset(id)?.frameSize, id).toEqual([24, 32]);
        expect(packAsset(id)?.animations?.death?.frames, id).toHaveLength(5);
        expect(packAsset(`${id}/walk`)?.frameSize, id).toEqual([24, 32]);
        expect(heroPortraitHd(cls, g)?.animations?.idle?.frames, id).toHaveLength(4);
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

describe('corredor em segundo plano', () => {
  // Joga até ter um grupo lutando com pelo menos um inimigo já caído.
  function worldInFight(): { world: World; party: Party } {
    const world = createWorld(11);
    for (let i = 0; i < 4000; i++) {
      runTicks(world, 5, { onHour: autoMayor });
      const party = world.parties.find((p) => p.combat?.units.some((u) => u.side === 'enemy' && !u.alive));
      if (party) return { world, party };
    }
    throw new Error('nenhuma luta com baixa');
  }

  const host = (world: World): LaneHost => ({ world: () => world, speed: () => 1, paused: () => false });

  it('inimigo que já caiu vira um corpo só e não renasce andando', () => {
    const { world, party } = worldInFight();
    const dead = party.combat!.units.filter((u) => u.side === 'enemy' && !u.alive).length;
    const lane = new LaneRenderer(host(world), party.id);
    let t = 0;
    for (let i = 0; i < 400; i++) lane.frame((t += 16));
    expect(lane.counts.corpses).toBe(dead);
    const alive = party.combat!.units.filter((u) => u.side === 'enemy' && u.alive).length;
    expect(lane.counts.enemies).toBe(alive);
  });

  /** Um golpe novo num herói: o dano já vale na simulação e o registro ganha o golpe. */
  function hitHero(party: Party, amount: number, kill = false): { heroId: number; hp: number } {
    const c = party.combat!;
    const hero = c.units.find((u) => u.side === 'hero' && u.alive && u.heroId !== null && party.memberIds.includes(u.heroId))!;
    const foes = c.units.filter((u) => u.side === 'enemy');
    const foe = foes.find((u) => u.alive && !u.tags.includes('backline')) ?? foes[0]!;
    hero.hp = kill ? 0 : hero.hp - amount;
    if (kill) {
      hero.alive = false;
      party.memberIds = party.memberIds.filter((id) => id !== hero.heroId);
      party.dead.push(hero.heroId!);
    }
    (c.log ??= []).push({ n: (c.seq = (c.seq ?? 0) + 1), t: c.ticks, kind: 'hit', from: foe.uid, to: hero.uid, amount, crit: false, kill });
    return { heroId: hero.heroId!, hp: hero.hp };
  }

  /** Abre o corredor e deixa os golpes antigos chegarem. */
  function settled(world: World, party: Party): { lane: LaneRenderer; run: (frames: number) => void } {
    const lane = new LaneRenderer(host(world), party.id);
    let t = 0;
    const run = (frames: number): void => {
      for (let i = 0; i < frames; i++) lane.frame((t += 16));
    };
    run(200);
    return { lane, run };
  }

  it('a barra de vida espera o golpe chegar e depois segue a simulação (§9.9)', () => {
    const { world, party } = worldInFight();
    const { lane, run } = settled(world, party);
    const target = party.combat!.units.find((u) => u.side === 'hero' && u.alive && party.memberIds.includes(u.heroId!))!;
    const before = lane.shown(target.heroId!)!.hp;
    expect(before).toBe(target.hp);
    const hit = hitHero(party, 7);
    run(3);
    expect(lane.shown(hit.heroId)!.hp).toBe(before);
    run(40);
    expect(lane.shown(hit.heroId)!.hp).toBe(hit.hp);
  });

  it('o herói só cai quando chega o golpe que matou', () => {
    const { world, party } = worldInFight();
    const { lane, run } = settled(world, party);
    const hit = hitHero(party, 9, true);
    run(3);
    expect(lane.shown(hit.heroId)).toMatchObject({ down: false });
    run(40);
    expect(lane.shown(hit.heroId)?.down ?? true).toBe(true);
  });

  it('um golpe que não chega em 3 s é esquecido, e a barra volta à simulação', () => {
    const { world, party } = worldInFight();
    const { lane, run } = settled(world, party);
    const hit = hitHero(party, 7);
    run(1);
    const before = lane.shown(hit.heroId)!.hp;
    expect(before).not.toBe(hit.hp);
    // Some sem chegar (o que a segurança cobre): sai da fila, do acerto marcado e do voo.
    const inner = lane as unknown as { queue: unknown[]; pending: unknown[]; projectiles: unknown[] };
    inner.queue.length = inner.pending.length = inner.projectiles.length = 0;
    run(150);
    expect(lane.shown(hit.heroId)!.hp).toBe(before);
    run(50);
    expect(lane.shown(hit.heroId)!.hp).toBe(hit.hp);
  });

  it('na volta para a vila o grupo sai de vista em vez de refazer o caminho', () => {
    const { world, party } = worldInFight();
    const lane = new LaneRenderer(host(world), party.id);
    let t = 0;
    for (let i = 0; i < 30; i++) lane.frame((t += 16));
    expect(lane.counts.heroes).toBeGreaterThan(0);
    party.phase = 'voltando';
    for (let i = 0; i < 200; i++) lane.frame((t += 16));
    expect(lane.gone).toBe(true);
    expect(lane.counts.heroes).toBe(0);
  });
});
