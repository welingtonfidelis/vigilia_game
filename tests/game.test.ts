import { describe, expect, it } from 'vitest';
import { openPassage } from '../src/sim/dungeon.ts';
import { autoMayor, byWhom, checksum, commands, createWorld, runDays, runTicks, TICKS_PER_DAY, TICKS_PER_SECOND } from '../src/sim/index.ts';
import type { ActivityKind } from '../src/sim/index.ts';
import { createHero } from '../src/sim/hero.ts';
import { MAX_CATCH_UP_MS, MAX_FRAME_MS, MAX_STEPS_PER_FRAME, Session, type SessionEvent } from '../src/game/session.ts';
import { clearSave, loadPrefs, loadWorld, readSaveMeta, saveWorld, type KeyValueStore } from '../src/game/storage.ts';
import { heroDestination, LANDMARKS, door, workSpot } from '../src/render/layout.ts';
import { activityText, fmt, midSentence, phaseText } from '../src/ui/format.ts';
import { objectives } from '../src/ui/objectives.ts';

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

class BrokenStore implements KeyValueStore {
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem(): void {
    throw new Error('QuotaExceededError');
  }
  removeItem(): void {
    throw new Error('SecurityError');
  }
}

describe('sessão: acumulador de tick fixo', () => {
  it('1 s real roda 10 ticks em 1×, 20 em 2× e 40 em 4×', () => {
    for (const speed of [1, 2, 4] as const) {
      const session = new Session(createWorld(1));
      session.setSpeed(speed);
      const start = session.world.tick;
      for (let i = 0; i < 20; i++) session.update(50);
      expect(session.world.tick - start).toBe(TICKS_PER_SECOND * speed);
    }
  });

  it('pausado não anda', () => {
    const session = new Session(createWorld(1));
    session.togglePause();
    expect(session.update(1000)).toBe(0);
    session.togglePause();
    expect(session.update(100)).toBe(1);
  });

  it('um quadro enorme é limitado (aba em segundo plano não dispara milhares de ticks)', () => {
    const session = new Session(createWorld(1));
    session.setSpeed(4);
    const ticks = session.update(60_000);
    expect(ticks).toBeLessThanOrEqual(Math.min(MAX_STEPS_PER_FRAME, (MAX_FRAME_MS / 1000) * TICKS_PER_SECOND * 4));
  });

  it('aba em segundo plano: recupera o tempo real que passou, sempre em 1×, com teto e respeitando a pausa', () => {
    const session = new Session(createWorld(1));
    session.setSpeed(4);
    expect(session.catchUp(3000)).toBe(3 * TICKS_PER_SECOND);
    expect(session.catchUp(MAX_CATCH_UP_MS * 3)).toBe((MAX_CATCH_UP_MS / 1000) * TICKS_PER_SECOND);
    session.togglePause();
    expect(session.catchUp(5000)).toBe(0);
  });

  it('jogar pela sessão dá o mesmo mundo que rodar o núcleo direto', () => {
    const direct = createWorld(21);
    commands.blowHorn(direct);
    runTicks(direct, 3 * TICKS_PER_DAY);

    const session = new Session(createWorld(21));
    session.run(commands.blowHorn);
    session.setSpeed(4);
    while (session.world.tick < direct.tick) session.update(16.7);
    expect(session.world.tick).toBe(direct.tick);
    expect(checksum(session.world)).toBe(checksum(direct));
  });

  it('avisa entradas novas da crônica e resume expedições que voltaram', () => {
    const session = new Session(createWorld(4));
    const events: SessionEvent[] = [];
    session.subscribe((e) => events.push(e));
    session.run(commands.blowHorn);
    session.advance(6 * TICKS_PER_DAY);
    const entries = events.flatMap((e) => (e.type === 'entries' ? e.entries : []));
    expect(entries.some((e) => e.kind === 'berrante')).toBe(true);
    expect(entries.some((e) => e.kind === 'chegada')).toBe(true);
    // Toda entrada é avisada uma vez só.
    expect(entries.length).toBe(session.world.chronicle.length);
    const summaries = events.flatMap((e) => (e.type === 'expedition' ? [e.summary] : []));
    expect(summaries.length).toBeGreaterThan(0);
    // Nem toda descida rende um momento marcante; o resumo carrega os que houver.
    expect(summaries.some((s) => s.moments.length > 0)).toBe(true);
  });
});

describe('salvar e carregar', () => {
  it('ida e volta pelo armazenamento preserva o mundo', () => {
    const store = new MemoryStore();
    const world = createWorld(8);
    commands.blowHorn(world);
    runTicks(world, TICKS_PER_DAY + 33);
    expect(saveWorld(store, world, 1000)).toEqual({ ok: true });
    const meta = readSaveMeta(store)!;
    expect(meta.tick).toBe(world.tick);
    expect(meta.label).toMatch(/^Ano 1/);
    const loaded = loadWorld(store);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(checksum(loaded.world)).toBe(checksum(world));
    clearSave(store);
    expect(loadWorld(store).ok).toBe(false);
  });

  it('armazenamento quebrado ou ausente vira mensagem, não exceção', () => {
    const world = createWorld(1);
    const broken = new BrokenStore();
    const saved = saveWorld(broken, world);
    expect(saved.ok).toBe(false);
    expect(loadWorld(broken).ok).toBe(false);
    expect(readSaveMeta(broken)).toBeNull();
    expect(() => clearSave(broken)).not.toThrow();
    expect(loadPrefs(broken).uiScale).toBe(1);
    expect(saveWorld(null, world).ok).toBe(false);
  });

  it('save corrompido não derruba o jogo', () => {
    const store = new MemoryStore();
    store.setItem('vigilia:save', '{"isso não é um mundo"');
    const result = loadWorld(store);
    expect(result.ok).toBe(false);
  });
});

describe('planta da vila', () => {
  it('cada atividade leva o herói a um lugar da vila', () => {
    const world = createWorld(2);
    const hero = createHero(world);
    const kinds: ActivityKind[] = ['chegando', 'descansar', 'beber', 'rezar', 'comprar', 'treinar', 'tumulo', 'socializar', 'vagar', 'aguardar', 'tratar', 'termas'];
    for (const kind of kinds) {
      hero.activity = { kind, startedAt: world.tick, endsAt: world.tick + 20 };
      const dest = heroDestination(world, hero, () => null);
      expect(Number.isFinite(dest.point.x) && Number.isFinite(dest.point.y)).toBe(true);
      expect(dest.hide).toBe(false);
    }
  });

  it('sem estalagem, descansa na fogueira; com estalagem, na porta dela', () => {
    const world = createWorld(2);
    const hero = createHero(world);
    hero.activity = { kind: 'descansar', startedAt: 0, endsAt: 99 };
    expect(heroDestination(world, hero, () => null).point).toEqual(LANDMARKS.fogueira);
    world.town.buildings.estalagem = 1;
    expect(heroDestination(world, hero, () => null).point).toEqual(door('estalagem'));
  });

  it('quem desce vai para o abismo e quem parte vai para o portão, e ambos somem', () => {
    const world = createWorld(2);
    const hero = createHero(world);
    hero.status = 'expedition';
    expect(heroDestination(world, hero, () => null)).toMatchObject({ place: 'abismo', hide: true });
    hero.status = 'left';
    expect(heroDestination(world, hero, () => null)).toMatchObject({ place: 'portao', hide: true });
  });

  it('lesionado se trata na Casa de cura; sem ela, na estalagem', () => {
    const world = createWorld(2);
    const hero = createHero(world);
    hero.injury = { kind: 'perna', daysLeft: 9, total: 12 };
    hero.activity = { kind: 'tratar', startedAt: 0, endsAt: 99 };
    expect(heroDestination(world, hero, () => null).place).toBe('fogueira');
    world.town.buildings.estalagem = 1;
    expect(heroDestination(world, hero, () => null).place).toBe('estalagem');
    world.town.buildings.casa = 1;
    expect(heroDestination(world, hero, () => null).place).toBe('casa');
  });

  it('aposentado com função fica na vila, no posto de trabalho', () => {
    const world = createWorld(2);
    const hero = createHero(world);
    hero.status = 'retired';
    hero.retiredRole = 'mentor';
    const dest = heroDestination(world, hero, () => null);
    expect(dest.hide).toBe(false);
    expect(dest.place).toBe('campo');
    expect(dest.point).toEqual(workSpot(world, 'mentor'));
    hero.retiredRole = null;
    expect(heroDestination(world, hero, () => null).hide).toBe(true);
  });

  it('o enlutado vai até a cova do amigo', () => {
    const world = createWorld(2);
    const hero = createHero(world);
    hero.griefFor = 99;
    hero.activity = { kind: 'tumulo', startedAt: 0, endsAt: 99 };
    expect(heroDestination(world, hero, (id) => (id === 99 ? 3 : null)).place).toBe('cova');
  });
});

describe('textos da tela', () => {
  it('objetivos guiam o começo: berrante, reconstrução e a primeira passagem', () => {
    const world = createWorld(3);
    const first = objectives(world);
    expect(first[0]!.text).toMatch(/berrante/);
    expect(first.some((o) => /Reconstrua a estalagem/.test(o.text))).toBe(true);
    expect(first.some((o) => /primeira passagem/.test(o.text))).toBe(true);
    commands.blowHorn(world);
    expect(objectives(world)[0]!.text).not.toMatch(/Ande até o berrante/);
  });

  it('com a passagem aberta até o fim, o objetivo é vencer o guardião', () => {
    const world = createWorld(3);
    const passage = openPassage(world);
    passage.discovered = true;
    passage.conquered = passage.conquered.map((_, f) => f < passage.floors - 1);
    expect(objectives(world).some((o) => o.text.startsWith('Vença o guardião e sele a passagem'))).toBe(true);
    expect(midSentence('A Mãe-Bolor')).toBe('a Mãe-Bolor');
  });

  it('números compactos a partir de 10 mil, para o pós-jogo sem teto', () => {
    expect(fmt(9_999)).toBe('9.999');
    expect(fmt(12_345)).toBe('12,3 mil');
    expect(fmt(108_568)).toBe('109 mil');
    expect(fmt(4_500_000)).toBe('4,5 mi');
    expect(fmt(-25_000)).toBe('-25 mil');
  });

  it('"abatido por" contrai com o artigo', () => {
    expect(byWhom('O Guardião das Urnas')).toBe('pelo Guardião das Urnas');
    expect(byWhom('a explosão de Rato-de-ossuário')).toBe('pela explosão de Rato-de-ossuário');
    expect(byWhom('veneno')).toBe('por veneno');
  });

  it('toda atividade e fase de expedição tem texto, sem "undefined"', () => {
    const world = createWorld(12);
    runDays(world, 30, { onHour: autoMayor });
    for (const hero of world.heroes) {
      const text = activityText(world, hero);
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain('undefined');
    }
    for (const party of world.parties) expect(phaseText(world, party)).not.toContain('undefined');
    const dead = world.chronicle.filter((e) => e.kind === 'morte');
    for (const e of dead) expect(e.text).not.toMatch(/ por (O|A) /);
  });
});
