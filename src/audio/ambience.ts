// Ambiente da vila: vento e zumbido do abismo contínuos, mais grilos (noite), pássaros
// (dia), estalos da fogueira, metal distante quando há combate e o "respiro" do abismo.
// Na masmorra (acompanhando um grupo) a vila some: gotas, correntes e um ronco de pedra.

import type { Mood } from './director.ts';
import { clank, noise, noiseBuffer, pluck, rand, tone } from './instruments.ts';

type Timer = 'cricket' | 'bird' | 'fire' | 'clank' | 'breath' | 'drip' | 'chain' | 'rumble' | 'thunder' | 'lute';

/** Dedilhado do bardo (M6 F6): uma frase em lá menor que se repete, com uma nota de cada vez. */
const LUTE = [220, 262, 330, 294, 262, 247, 220, 196, 220, 262, 330, 392, 330, 294, 262, 220];

export class AmbiencePlayer {
  private readonly ctx: BaseAudioContext;
  private readonly out: AudioNode;
  private readonly windGain: GainNode;
  private readonly droneGain: GainNode;
  /** Chuva (M6 F6): ruído alto e chiado, com volume pelo clima do dia. */
  private readonly rainGain: GainNode;
  private mood: Mood = { mode: 'dia', night: false, hour: 8, corruption: 0, fighting: 0 };
  private next: Record<Timer, number> = { cricket: 0, bird: 0, fire: 0, clank: 0, breath: 0, drip: 0, chain: 0, rumble: 0, thunder: 0, lute: 0 };
  private luteStep = 0;

  constructor(ctx: BaseAudioContext, out: AudioNode) {
    this.ctx = ctx;
    this.out = out;
    this.windGain = this.wind();
    this.droneGain = this.drone();
    this.rainGain = this.rain();
    this.setMood(this.mood);
  }

  setMood(mood: Mood): void {
    this.mood = mood;
    const now = this.ctx.currentTime;
    const rain = mood.scene === 'masmorra' ? 0 : ({ garoa: 0.012, chuva: 0.032, tempestade: 0.05 } as Record<string, number>)[mood.weather ?? 'limpo'] ?? 0;
    this.rainGain.gain.setTargetAtTime(rain, now, 2);
    if (mood.scene === 'masmorra') {
      // Corrente de ar fraca e o zumbido de pedra mais presente.
      this.windGain.gain.setTargetAtTime(0.018, now, 1);
      this.droneGain.gain.setTargetAtTime(0.05 + mood.corruption * 0.05, now, 1);
      return;
    }
    // Vento, nevasca e tempestade sopram mais forte.
    const gust = ({ vento: 0.03, nevasca: 0.04, tempestade: 0.035 } as Record<string, number>)[mood.weather ?? 'limpo'] ?? 0;
    this.windGain.gain.setTargetAtTime((mood.night ? 0.05 : 0.035) + mood.corruption * 0.025 + gust, now, 1.5);
    this.droneGain.gain.setTargetAtTime((0.01 + mood.corruption * 0.07) * (mood.night ? 1.2 : 1), now, 2);
  }

  schedule(): void {
    const now = this.ctx.currentTime;
    const { mood } = this;
    const due = (timer: Timer, min: number, max: number): boolean => {
      if (this.next[timer] > now) return false;
      this.next[timer] = now + rand(min, max);
      return true;
    };
    if (mood.scene === 'masmorra') {
      if (due('drip', 0.7, 3.5)) this.drip(now + 0.05);
      if (due('chain', 9, 22)) clank(this.ctx, this.panned(rand(-0.8, 0.8)), now + 0.05, rand(0.008, 0.016));
      if (due('rumble', 14, 30)) noise(this.ctx, this.out, now + 0.1, { dur: 3, gain: 0.05, filter: 'lowpass', freq: 110, attack: 1.2 });
      return;
    }
    const wet = mood.weather === 'chuva' || mood.weather === 'tempestade' || mood.weather === 'nevasca';
    if (mood.weather === 'tempestade' && due('thunder', 7, 18)) this.thunder(now + rand(0.4, 1.6));
    if (mood.bard && due('lute', 0.26, 0.34)) {
      const freq = LUTE[this.luteStep++ % LUTE.length]!;
      pluck(this.ctx, this.panned(-0.15), now + 0.03, freq, 0.035, 1.6, 5);
    }
    if (mood.night && !wet && due('cricket', 0.5, 2.2)) this.cricket(now + 0.05);
    const daylight = mood.hour >= 5 && mood.hour < 19;
    if (daylight && !wet && due('bird', 3, 9)) this.bird(now + 0.05);
    if (due('fire', 0.08, 0.7)) {
      noise(this.ctx, this.panned(rand(-0.2, 0.2)), now + 0.02, {
        dur: rand(0.01, 0.03),
        gain: rand(0.006, mood.night ? 0.03 : 0.015),
        filter: 'highpass',
        freq: rand(1500, 3200),
      });
    }
    if (mood.fighting > 0 && due('clank', 0.6 / mood.fighting, 2.2 / mood.fighting)) {
      clank(this.ctx, this.panned(rand(-0.4, 0.4)), now + 0.05, rand(0.015, 0.035));
    }
    if (mood.corruption > 0.6 && due('breath', 8, 20)) {
      noise(this.ctx, this.out, now + 0.1, { dur: 4, gain: 0.05 * mood.corruption, filter: 'lowpass', freq: 180, attack: 2 });
      tone(this.ctx, this.out, now + 0.1, { freq: 36, dur: 4, gain: 0.08 * mood.corruption, attack: 2 });
    }
  }

  /** Cinco posições fixas no estéreo, reaproveitadas (sem criar um nó por som). */
  private readonly pans: StereoPannerNode[] = [];

  private panned(pan: number): AudioNode {
    if (this.pans.length === 0) {
      for (const value of [-0.8, -0.4, 0, 0.4, 0.8]) {
        const p = this.ctx.createStereoPanner();
        p.pan.value = value;
        p.connect(this.out);
        this.pans.push(p);
      }
    }
    const idx = Math.round(((Math.max(-0.8, Math.min(0.8, pan)) + 0.8) / 1.6) * (this.pans.length - 1));
    return this.pans[idx]!;
  }

  private cricket(t: number): void {
    const out = this.panned(rand(-0.8, 0.8));
    const freq = rand(4200, 5000);
    const pulses = 2 + Math.floor(rand(0, 3));
    for (let i = 0; i < pulses; i++) tone(this.ctx, out, t + i * 0.07, { freq, dur: 0.03, gain: 0.012, attack: 0.004 });
  }

  /** Gota caindo numa poça: nota aguda que cai rápido, às vezes com um eco. */
  private drip(t: number): void {
    const out = this.panned(rand(-0.8, 0.8));
    const freq = rand(1500, 2600);
    tone(this.ctx, out, t, { freq, glide: { to: freq * 0.55, time: 0.06 }, dur: 0.09, gain: rand(0.012, 0.024), attack: 0.002 });
    if (Math.random() < 0.4) tone(this.ctx, out, t + 0.18, { freq: freq * 0.9, glide: { to: freq * 0.5, time: 0.06 }, dur: 0.08, gain: 0.006 });
  }

  private bird(t: number): void {
    const out = this.panned(rand(-0.9, 0.9));
    const chirps = 2 + Math.floor(rand(0, 3));
    for (let i = 0; i < chirps; i++) {
      const from = rand(2400, 3400);
      tone(this.ctx, out, t + i * rand(0.1, 0.16), { freq: from, glide: { to: from * rand(1.2, 1.6), time: 0.07 }, dur: 0.09, gain: 0.018 });
    }
  }

  /** Trovão: um estalo seco e o ronco grave que rola depois. */
  private thunder(t: number): void {
    noise(this.ctx, this.out, t, { dur: 0.25, gain: 0.08, filter: 'bandpass', freq: 900, attack: 0.005 });
    noise(this.ctx, this.out, t + 0.05, { dur: rand(2.5, 4), gain: 0.16, filter: 'lowpass', freq: 140, attack: 0.15 });
  }

  private rain(): GainNode {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1600;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(this.out);
    src.start();
    return gain;
  }

  private wind(): GainNode {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    // Rajadas: um LFO lento mexe no filtro.
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.07;
    depth.gain.value = 260;
    lfo.connect(depth).connect(filter.frequency);
    src.connect(filter).connect(gain).connect(this.out);
    src.start();
    lfo.start();
    return gain;
  }

  private drone(): GainNode {
    const { ctx } = this;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.connect(gain).connect(this.out);
    for (const [type, freq, level] of [
      ['sine', 55, 1],
      ['triangle', 82.1, 0.5],
      ['sine', 27.5, 0.7],
    ] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = level;
      osc.connect(g).connect(filter);
      osc.start();
    }
    return gain;
  }
}
