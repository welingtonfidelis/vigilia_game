// Mesa de som: um AudioContext com três canais (música, ambiente, efeitos), cada um
// com volume próprio e um envio para o reverb compartilhado.

import { impulse } from './instruments.ts';

export type Bus = 'music' | 'ambient' | 'sfx';

export interface Levels {
  muted: boolean;
  master: number;
  music: number;
  ambient: number;
  sfx: number;
}

const REVERB_SEND: Record<Bus, number> = { music: 0.35, ambient: 0.2, sfx: 0.25 };

interface Channel {
  input: GainNode;
  volume: GainNode;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private channels = new Map<Bus, Channel>();
  private levels: Levels = { muted: false, master: 0.8, music: 0.4, ambient: 0.5, sfx: 0.9 };
  private readonly create: () => AudioContext;

  constructor(create: () => AudioContext = createContext) {
    this.create = create;
  }

  /**
   * Cria o contexto (se preciso) e tenta retomá-lo. Só dá certo dentro de um gesto
   * que o navegador aceita como ativação; por isso é chamado a cada toque até tocar.
   */
  unlock(): boolean {
    if (!this.ctx) {
      try {
        this.ctx = this.create();
      } catch {
        return false;
      }
      this.build(this.ctx);
    }
    // 'interrupted' existe no Safari (ligação, troca de app).
    const state = this.ctx.state as AudioContextState | 'interrupted';
    if (state !== 'running' && state !== 'closed') void this.ctx.resume().catch(() => {});
    return true;
  }

  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Entrada de um canal, onde os instrumentos se conectam. */
  out(bus: Bus): AudioNode | null {
    return this.channels.get(bus)?.input ?? null;
  }

  setLevels(levels: Levels): void {
    const same = (Object.keys(levels) as (keyof Levels)[]).every((k) => levels[k] === this.levels[k]);
    this.levels = levels;
    if (!same) this.applyLevels();
  }

  /** Leva os volumes guardados para os nós (na criação do contexto e a cada mudança). */
  private applyLevels(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.levels.muted ? 0 : this.levels.master, now, 0.05);
    for (const [bus, ch] of this.channels) ch.volume.gain.setTargetAtTime(this.levels[bus], now, 0.05);
  }

  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend().catch(() => {});
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {});
  }

  private build(ctx: AudioContext): void {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.connect(comp);

    const reverb = ctx.createConvolver();
    reverb.buffer = impulse(ctx, 2.2, 2.8);
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.9;
    reverb.connect(reverbOut).connect(this.master);

    for (const bus of ['music', 'ambient', 'sfx'] as const) {
      const input = ctx.createGain();
      const volume = ctx.createGain();
      const send = ctx.createGain();
      send.gain.value = REVERB_SEND[bus];
      input.connect(volume);
      volume.connect(this.master);
      volume.connect(send).connect(reverb);
      this.channels.set(bus, { input, volume });
    }
    this.applyLevels();
  }
}

/**
 * 'balanced' troca alguns milissegundos de latência por menos cortes em máquinas
 * mais fracas. No iPhone, a sessão 'playback' faz o som tocar mesmo com a chave
 * de silencioso ligada (Safari 17+); sem ela o Web Audio fica mudo nesse modo.
 */
function createContext(): AudioContext {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    // Navegador sem a API de sessão de áudio: segue sem ela.
  }
  return new AudioContext({ latencyHint: 'balanced' });
}
