// Sessão de jogo: guarda o World, roda o núcleo num acumulador de tick fixo e avisa
// a tela do que aconteceu. Não importa Phaser nem DOM, para dar para testar no Node.

import { dayOf, step, TICKS_PER_SECOND } from '../sim/index.ts';
import type { ChronicleEntry, CommandResult, MaterialId, Party, PartyOutcome, World } from '../sim/index.ts';

export const SPEEDS = [1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

/** Um quadro longo (aba em segundo plano, depurador) não vira uma avalanche de ticks. */
export const MAX_FRAME_MS = 250;
/** Teto de ticks por quadro: 4× a 60 fps dá menos de 1; isto só protege quadros lentos. */
export const MAX_STEPS_PER_FRAME = 40;

/** Resumo de uma expedição que acabou (o grupo some do World quando volta). */
export interface ExpeditionSummary {
  id: number;
  act: number;
  floor: number;
  outcome: PartyOutcome;
  startedTick: number;
  endedTick: number;
  memberIds: number[];
  startMemberIds: number[];
  dead: number[];
  gold: number;
  materials: Partial<Record<MaterialId, number>>;
  rescued: number;
  contract: boolean;
  moments: string[];
}

export type SessionEvent =
  | { type: 'entries'; entries: ChronicleEntry[] }
  | { type: 'expedition'; summary: ExpeditionSummary }
  | { type: 'day'; day: number }
  | { type: 'reset' };

type Listener = (event: SessionEvent) => void;

const RECENT_LIMIT = 12;

export class Session {
  world: World;
  speed: Speed = 1;
  paused = false;
  /** Sobe a cada mudança no mundo; a UI só redesenha quando ele muda. */
  rev = 0;
  recent: ExpeditionSummary[] = [];
  private acc = 0;
  private chronicleCursor: number;
  private day: number;
  private tracked = new Map<number, Party>();
  private listeners = new Set<Listener>();

  constructor(world: World) {
    this.world = world;
    this.chronicleCursor = world.chronicle.length;
    this.day = dayOf(world.tick);
    this.track();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Avança o relógio real. Devolve quantos ticks rodaram. */
  update(deltaMs: number): number {
    if (this.paused) return 0;
    const ms = Math.min(Math.max(0, deltaMs), MAX_FRAME_MS);
    this.acc += (ms / 1000) * TICKS_PER_SECOND * this.speed;
    const steps = Math.min(Math.floor(this.acc), MAX_STEPS_PER_FRAME);
    this.acc -= steps;
    if (this.acc > 1) this.acc = 1;
    if (steps > 0) this.advance(steps);
    return steps;
  }

  /** Roda ticks direto (testes e atalhos de depuração). */
  advance(ticks: number): void {
    for (let i = 0; i < ticks; i++) {
      step(this.world);
      // Um grupo pode partir e voltar dentro de um lote grande; o rastreio é por tick.
      this.track();
    }
    this.rev++;
    this.flush();
  }

  /** Executa uma alavanca do prefeito entre dois ticks. */
  run<A extends unknown[]>(command: (world: World, ...args: A) => CommandResult, ...args: A): CommandResult {
    const result = command(this.world, ...args);
    this.rev++;
    this.flush();
    return result;
  }

  setSpeed(speed: Speed): void {
    this.speed = speed;
    this.paused = false;
    this.rev++;
  }

  togglePause(): void {
    this.setPaused(!this.paused);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.rev++;
  }

  /** Troca o mundo inteiro (novo jogo ou carregar). */
  replace(world: World): void {
    this.world = world;
    this.acc = 0;
    this.recent = [];
    this.tracked.clear();
    this.chronicleCursor = world.chronicle.length;
    this.day = dayOf(world.tick);
    this.track();
    this.rev++;
    this.emit({ type: 'reset' });
  }

  private flush(): void {
    this.track();
    const chronicle = this.world.chronicle;
    if (chronicle.length > this.chronicleCursor) {
      const entries = chronicle.slice(this.chronicleCursor);
      this.chronicleCursor = chronicle.length;
      this.emit({ type: 'entries', entries });
    }
    const day = dayOf(this.world.tick);
    if (day !== this.day) {
      this.day = day;
      this.emit({ type: 'day', day });
    }
  }

  private track(): void {
    const alive = new Set<number>();
    for (const party of this.world.parties) {
      alive.add(party.id);
      this.tracked.set(party.id, party);
    }
    for (const [id, party] of this.tracked) {
      if (alive.has(id)) continue;
      this.tracked.delete(id);
      const summary = summarize(party, this.world.tick);
      this.recent.unshift(summary);
      this.recent.length = Math.min(this.recent.length, RECENT_LIMIT);
      this.emit({ type: 'expedition', summary });
    }
  }

  private emit(event: SessionEvent): void {
    for (const fn of this.listeners) fn(event);
  }
}

function summarize(party: Party, tick: number): ExpeditionSummary {
  return {
    id: party.id,
    act: party.act,
    floor: party.floor,
    outcome: party.outcome ?? 'retirada',
    startedTick: party.startedTick,
    endedTick: tick,
    memberIds: [...party.memberIds],
    startMemberIds: [...party.startMemberIds],
    dead: [...party.dead],
    gold: Math.round(party.loot.gold),
    materials: { ...party.loot.materials },
    rescued: party.rescued,
    contract: party.contractId !== null,
    moments: [...party.moments],
  };
}
