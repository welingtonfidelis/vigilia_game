import { describe, expect, it, vi } from 'vitest';
import { CuePlanner, cuesFor, moodOf, MOURNING_TICKS, STAGGER_S } from '../src/audio/director.ts';
import { AudioEngine } from '../src/audio/engine.ts';
import { ACTIVATION_EVENTS, installUnlock } from '../src/audio/index.ts';
import { SFX, SFX_NAMES } from '../src/audio/sfx.ts';
import { Session } from '../src/game/session.ts';
import { DEFAULT_PREFS, loadPrefs } from '../src/game/storage.ts';
import { commands, createWorld, TICKS_PER_DAY, TICKS_PER_HOUR } from '../src/sim/index.ts';
import type { ChronicleEntry, ChronicleKind } from '../src/sim/index.ts';

const entry = (kind: ChronicleKind, tick = 0): ChronicleEntry => ({ tick, kind, heroIds: [], text: kind });

describe('diretor de som: eventos → efeitos', () => {
  it('traduz a crônica em efeitos e ignora o berrante (ele soa no comando)', () => {
    const cues = cuesFor({ type: 'entries', entries: [entry('morte'), entry('construcao'), entry('berrante'), entry('eco')] });
    expect(cues.map((c) => c.sfx)).toEqual(['death', 'build', 'echo']);
  });

  it('moedas só quando o grupo volta com ouro', () => {
    const base = {
      id: 1, act: 0, floor: 0, startedTick: 0, endedTick: 1, memberIds: [], startMemberIds: [], dead: [],
      materials: {}, rescued: 0, contract: false, moments: [],
    };
    expect(cuesFor({ type: 'expedition', summary: { ...base, outcome: 'conquista', gold: 40 } })).toEqual([{ sfx: 'coins', priority: 3 }]);
    expect(cuesFor({ type: 'expedition', summary: { ...base, outcome: 'massacre', gold: 40 } })).toEqual([]);
    expect(cuesFor({ type: 'expedition', summary: { ...base, outcome: 'retirada', gold: 0 } })).toEqual([]);
  });

  it('comandos respondem na hora, comparados por identidade; falha soa como recusa', () => {
    expect(cuesFor({ type: 'command', command: commands.blowHorn, ok: true })[0]?.sfx).toBe('horn');
    expect(cuesFor({ type: 'command', command: commands.recall, ok: true })[0]?.sfx).toBe('bell');
    expect(cuesFor({ type: 'command', command: commands.build, ok: false })[0]?.sfx).toBe('deny');
  });

  it('a sessão emite o evento de comando', () => {
    const session = new Session(createWorld(1));
    const seen: unknown[] = [];
    session.subscribe((e) => e.type === 'command' && seen.push(e.command));
    session.run(commands.blowHorn);
    expect(seen).toEqual([commands.blowHorn]);
  });

  it('todo efeito tem receita', () => {
    for (const name of SFX_NAMES) expect(typeof SFX[name]).toBe('function');
  });
});

describe('planejador de efeitos', () => {
  it('toca o mais importante primeiro, sem repetir, espaçado e no máximo 3 por lote', () => {
    const planner = new CuePlanner(3);
    const plan = planner.plan(
      [
        { sfx: 'depart', priority: 2 },
        { sfx: 'death', priority: 9 },
        { sfx: 'depart', priority: 2 },
        { sfx: 'bond', priority: 2 },
        { sfx: 'conquest', priority: 6 },
        { sfx: 'reveal', priority: 1 },
      ],
      0,
    );
    expect(plan.map((p) => p.sfx)).toEqual(['death', 'conquest', 'depart']);
    expect(plan.map((p) => p.delay)).toEqual([0, STAGGER_S, 2 * STAGGER_S]);
  });

  it('respeita o intervalo mínimo do mesmo efeito (4× não vira metralhadora)', () => {
    const planner = new CuePlanner();
    expect(planner.plan([{ sfx: 'coins', priority: 3 }], 0)).toHaveLength(1);
    expect(planner.plan([{ sfx: 'coins', priority: 3 }], 100)).toHaveLength(0);
    expect(planner.plan([{ sfx: 'coins', priority: 3 }], 400)).toHaveLength(1);
  });
});

describe('clima da música', () => {
  it('dia, noite, luto, tensão e alvorada', () => {
    const world = createWorld(2);
    world.tick = 10 * TICKS_PER_HOUR;
    expect(moodOf(world).mode).toBe('dia');
    world.tick = 23 * TICKS_PER_HOUR;
    expect(moodOf(world).mode).toBe('noite');

    world.chronicle.push(entry('morte', world.tick));
    expect(moodOf(world).mode).toBe('luto');
    world.tick += MOURNING_TICKS + 1;
    expect(moodOf(world).mode).not.toBe('luto');

    world.parties.push({ phase: 'combate', combat: { isBoss: true } } as never);
    expect(moodOf(world).mode).toBe('tensao');
    expect(moodOf(world).fighting).toBe(1);

    world.endedTick = world.tick;
    expect(moodOf(world).mode).toBe('alvorada');
  });

  it('a corrupção vem do ato mais corrompido, de 0 a 1', () => {
    const world = createWorld(3);
    world.acts[0]!.corruption = 40;
    world.acts[1]!.unlocked = true;
    world.acts[1]!.corruption = 80;
    world.acts[2]!.corruption = 100; // trancado: não conta
    expect(moodOf(world).corruption).toBeCloseTo(0.8);
    expect(TICKS_PER_DAY).toBeGreaterThan(0);
  });
});

describe('preferências de som', () => {
  it('saves antigos sem as chaves de som ganham os padrões', () => {
    const store = { getItem: () => JSON.stringify({ uiScale: 1.2, autosave: false }), setItem: () => {}, removeItem: () => {} };
    const prefs = loadPrefs(store);
    expect(prefs.uiScale).toBe(1.2);
    expect(prefs.muted).toBe(false);
    expect(prefs.musicVolume).toBe(DEFAULT_PREFS.musicVolume);
  });
});

/** Contexto de áudio falso: estado controlável e registro do que o motor pediu. */
function fakeContext(opts: { resumeWorks?: boolean } = {}) {
  const log = { resumes: 0, closes: 0, gains: [] as number[] };
  const gain = () => ({ connect: (n: unknown) => n, gain: { value: 1, setTargetAtTime: (v: number) => log.gains.push(v) } });
  const ctx = {
    state: 'suspended' as string,
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    log,
    resume() {
      log.resumes++;
      if (opts.resumeWorks !== false) ctx.state = 'running';
      return Promise.resolve();
    },
    suspend() {
      ctx.state = 'suspended';
      return Promise.resolve();
    },
    close() {
      log.closes++;
      ctx.state = 'closed';
      return Promise.resolve();
    },
    createGain: gain,
    createConvolver: () => ({ connect: (n: unknown) => n, buffer: null }),
    createDynamicsCompressor: () => ({
      connect: (n: unknown) => n,
      threshold: { value: 0 },
      knee: { value: 0 },
      ratio: { value: 0 },
      attack: { value: 0 },
      release: { value: 0 },
    }),
    createBuffer: (ch: number, len: number) => ({ getChannelData: () => new Float32Array(len), numberOfChannels: ch }),
  };
  return ctx;
}

type Fake = ReturnType<typeof fakeContext>;
const tick = () => new Promise((r) => setTimeout(r, 0));

function engineWith(factory: () => Fake, recreateOnReturn = false) {
  const made: Fake[] = [];
  const engine = new AudioEngine(() => {
    const ctx = factory();
    made.push(ctx);
    return ctx as unknown as AudioContext;
  }, recreateOnReturn);
  return { engine, made };
}

describe('destravar o som (celular)', () => {
  it('toque no celular conta no pointerup/touchend e os ouvintes continuam ligados', () => {
    const target = new EventTarget();
    let wakes = 0;
    let hidden = false;
    installUnlock(target, () => hidden, () => wakes++);
    expect(ACTIVATION_EVENTS).toContain('touchend');
    expect(ACTIVATION_EVENTS).toContain('pointerup');
    target.dispatchEvent(new Event('pointerdown'));
    target.dispatchEvent(new Event('touchend'));
    target.dispatchEvent(new Event('click'));
    expect(wakes).toBe(3); // não se desliga depois do primeiro gesto
    hidden = true;
    target.dispatchEvent(new Event('touchend'));
    expect(wakes).toBe(3); // com a aba oculta não tenta
  });

  it('um gesto retoma; se o próximo gesto ainda achar o contexto parado, cria outro', async () => {
    const { engine, made } = engineWith(() => fakeContext({ resumeWorks: false }));
    engine.wake();
    await tick();
    expect(made).toHaveLength(1);
    expect(made[0]!.log.resumes).toBe(1);
    expect(engine.running).toBe(false);
    engine.wake(); // o resume do gesto anterior não pegou: contexto novo
    expect(made).toHaveLength(2);
    expect(made[0]!.log.closes).toBe(1);
    expect(engine.generation).toBe(2);
  });

  it('com o contexto rodando, gestos não fazem nada', async () => {
    const { engine, made } = engineWith(() => fakeContext());
    engine.wake();
    await tick();
    expect(engine.running).toBe(true);
    engine.wake();
    engine.wake();
    expect(made).toHaveLength(1);
    expect(engine.generation).toBe(1);
  });

  it('iPhone: ao voltar do segundo plano, o primeiro toque recria o contexto', async () => {
    const { engine, made } = engineWith(() => fakeContext(), true);
    engine.wake();
    await tick();
    engine.sleep();
    engine.resumeQuietly(); // volta para a aba: retoma "rodando", mas no Safari pode estar mudo
    await tick();
    expect(engine.needsGesture).toBe(true); // por isso o aviso "toque para religar"
    engine.wake();
    await tick();
    expect(made).toHaveLength(2);
    expect(engine.running).toBe(true);
    expect(engine.needsGesture).toBe(false);
  });

  it('fora do iPhone, voltar do segundo plano só retoma o mesmo contexto', async () => {
    const { engine, made } = engineWith(() => fakeContext(), false);
    engine.wake();
    await tick();
    engine.sleep();
    expect(engine.running).toBe(false);
    engine.resumeQuietly();
    await tick();
    expect(engine.running).toBe(true);
    engine.wake();
    expect(made).toHaveLength(1);
  });

  it('relógio do áudio parado com o contexto "rodando" = contexto morto, recriado no toque', async () => {
    const now = vi.spyOn(performance, 'now');
    try {
      const { engine, made } = engineWith(() => fakeContext());
      engine.wake();
      await tick();
      now.mockReturnValue(1000);
      engine.watch();
      now.mockReturnValue(3000); // 2 s de relógio de parede, currentTime não andou
      engine.watch();
      expect(engine.running).toBe(false);
      expect(engine.needsGesture).toBe(true);
      engine.wake();
      await tick();
      expect(made).toHaveLength(2);
      expect(engine.running).toBe(true);
    } finally {
      now.mockRestore();
    }
  });
});

describe('volumes do motor', () => {
  it('aplica os volumes padrão já na criação e só reaplica quando mudam', () => {
    const { engine, made } = engineWith(() => fakeContext());
    const defaults = { muted: false, master: 0.8, music: 0.4, ambient: 0.5, sfx: 0.9 };
    engine.setLevels(defaults); // antes do contexto: só guarda
    engine.wake();
    const gains = made[0]!.log.gains;
    expect(gains).toEqual([0.8, 0.4, 0.5, 0.9]); // geral, música, ambiente, efeitos
    engine.setLevels({ ...defaults });
    expect(gains).toHaveLength(4); // nada mudou: não reaplica
    engine.setLevels({ ...defaults, muted: true });
    expect(gains.slice(4, 5)).toEqual([0]);
  });

  it('um contexto novo nasce com os volumes atuais', async () => {
    const { engine, made } = engineWith(() => fakeContext(), true);
    engine.setLevels({ muted: false, master: 0.5, music: 0.2, ambient: 0.3, sfx: 1 });
    engine.wake();
    await tick();
    engine.sleep();
    engine.wake();
    expect(made[1]!.log.gains).toEqual([0.5, 0.2, 0.3, 1]);
  });
});
