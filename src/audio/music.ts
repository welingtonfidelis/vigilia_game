// Trilha generativa em Ré menor: acorde de fundo, baixo, alaúde dedilhado e uma flauta
// esparsa. O clima (dia, noite, luto, tensão, alvorada, masmorra) troca no começo do compasso.

import type { MusicMode } from './director.ts';
import { drum, midiToFreq as n, pad, pickOne, pluck, rand, tone } from './instruments.ts';

interface Style {
  bpm: number;
  chords: number[][];
  barsPerChord: number;
  /** Chance de dedilhar em cada colcheia. */
  pluck: number;
  /** Chance de a flauta tocar uma frase no compasso. */
  melody: number;
  cutoff: number;
  padGain: number;
  bass: boolean;
  pulse: boolean;
  drums: boolean;
  scale: number[];
}

const Dm = [50, 53, 57];
const Bb = [46, 50, 53];
const F = [53, 57, 60];
const C = [48, 52, 55];
const Am = [45, 48, 52];
const A = [45, 49, 52];
const Gm = [43, 46, 50];
const D = [50, 54, 57];
const G = [43, 47, 50];

const MINOR = [62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 79, 81];
const MAJOR = [62, 64, 66, 67, 69, 71, 73, 74, 76, 78, 79, 81];

export const STYLES: Record<MusicMode, Style> = {
  dia: { bpm: 64, chords: [Dm, Bb, F, C], barsPerChord: 1, pluck: 0.42, melody: 0.12, cutoff: 1100, padGain: 0.03, bass: true, pulse: false, drums: false, scale: MINOR },
  noite: { bpm: 54, chords: [Dm, Am, Bb, A], barsPerChord: 2, pluck: 0.2, melody: 0.06, cutoff: 650, padGain: 0.03, bass: true, pulse: false, drums: false, scale: MINOR },
  luto: { bpm: 50, chords: [Dm, Gm, Bb, A], barsPerChord: 2, pluck: 0.14, melody: 0.35, cutoff: 800, padGain: 0.035, bass: false, pulse: false, drums: false, scale: MINOR },
  tensao: { bpm: 78, chords: [Dm, Bb, Dm, A], barsPerChord: 1, pluck: 0.28, melody: 0, cutoff: 900, padGain: 0.028, bass: true, pulse: true, drums: true, scale: MINOR },
  alvorada: { bpm: 66, chords: [D, G, D, A], barsPerChord: 1, pluck: 0.4, melody: 0.2, cutoff: 1500, padGain: 0.03, bass: true, pulse: false, drums: false, scale: MAJOR },
  // Dentro do abismo: lenta, escura, quase só o acorde e o baixo, com um tambor distante.
  masmorra: { bpm: 48, chords: [Dm, Bb, Gm, A], barsPerChord: 2, pluck: 0.07, melody: 0.05, cutoff: 480, padGain: 0.034, bass: true, pulse: false, drums: true, scale: MINOR },
};

const STEPS_PER_BAR = 8;

export class MusicPlayer {
  private mode: MusicMode = 'dia';
  private pending: MusicMode | null = null;
  private step = 0;
  private nextTime = 0;
  private chordIdx = 0;
  private chord = Dm;
  private melodyIdx = 4;
  private readonly ctx: BaseAudioContext;
  private readonly out: AudioNode;

  constructor(ctx: BaseAudioContext, out: AudioNode) {
    this.ctx = ctx;
    this.out = out;
  }

  /** O novo clima entra no próximo compasso, para não cortar a frase no meio. */
  setMode(mode: MusicMode): void {
    this.pending = mode === this.mode ? null : mode;
  }

  get currentMode(): MusicMode {
    return this.mode;
  }

  /** Quantas vezes a música teve de pular para o próximo compasso por ficar para trás. */
  resyncs = 0;

  /**
   * Agenda as notas dos próximos `lookahead` segundos. Uma folga grande (1 s) absorve
   * engasgos da página sem cortar a música.
   */
  schedule(lookahead = 1): void {
    const now = this.ctx.currentTime;
    // Só depois de um atraso grande (mudo, aba oculta) pula para o próximo compasso;
    // atrasos pequenos tocam as notas na hora, sem soluço.
    if (this.nextTime < now - 0.25) {
      if (this.step > 0) this.resyncs++;
      this.nextTime = now + 0.05;
      this.step = Math.ceil(this.step / STEPS_PER_BAR) * STEPS_PER_BAR;
    }
    while (this.nextTime < now + lookahead) {
      const inBar = this.step % STEPS_PER_BAR;
      if (inBar === 0 && this.pending) {
        this.mode = this.pending;
        this.pending = null;
      }
      const style = STYLES[this.mode];
      const stepDur = 60 / style.bpm / 2;
      this.playStep(style, inBar, Math.max(this.nextTime, now), stepDur);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  private playStep(style: Style, inBar: number, t: number, stepDur: number): void {
    const { ctx, out } = this;
    const bar = Math.floor(this.step / STEPS_PER_BAR);
    if (inBar === 0) {
      if (bar % style.barsPerChord === 0) {
        this.chord = style.chords[this.chordIdx % style.chords.length]!;
        this.chordIdx++;
        pad(ctx, out, t, this.chord.map(n), stepDur * STEPS_PER_BAR * style.barsPerChord, style.padGain, style.cutoff);
      }
      if (style.bass) {
        tone(ctx, out, t, {
          type: 'triangle',
          freq: n(this.chord[0]! - 12),
          dur: stepDur * STEPS_PER_BAR * 0.95,
          gain: 0.09,
          attack: 0.04,
          filter: { type: 'lowpass', freq: 400 },
        });
      }
      if (Math.random() < style.melody) this.phrase(style, t, stepDur);
    }
    if (style.pulse) {
      const accent = inBar === 0 || inBar === 3 || inBar === 6;
      tone(ctx, out, t, {
        type: 'sawtooth',
        freq: n(this.chord[0]! - 12),
        dur: stepDur * 0.7,
        gain: accent ? 0.05 : 0.03,
        filter: { type: 'lowpass', freq: 320, q: 3 },
      });
    }
    if (style.drums && this.mode === 'masmorra') {
      // Na masmorra, um tambor grave e distante só no começo do compasso.
      if (inBar === 0) drum(ctx, out, t, 46, 0.14, 1.1);
    } else if (style.drums && (inBar === 0 || inBar === 3 || inBar === 6)) {
      drum(ctx, out, t, 62, inBar === 0 ? 0.22 : 0.13, 0.45);
    }
    const chance = style.pluck * (inBar % 2 === 0 ? 1 : 0.55);
    if (Math.random() < chance) {
      const note = pickOne(this.chord) + pickOne([12, 12, 24]);
      pluck(ctx, out, t + rand(0, 0.012), n(note), rand(0.04, 0.065), rand(1, 1.8), 6);
    }
  }

  /** Frase de flauta: algumas notas longas andando pela escala. */
  private phrase(style: Style, t: number, stepDur: number): void {
    let at = t + stepDur * pickOne([0, 1, 2]);
    const notes = 2 + Math.floor(rand(0, 3));
    for (let i = 0; i < notes; i++) {
      this.melodyIdx = Math.max(0, Math.min(style.scale.length - 1, this.melodyIdx + pickOne([-2, -1, -1, 1, 1, 2])));
      const freq = n(style.scale[this.melodyIdx]!);
      const dur = stepDur * pickOne([2, 3, 4]);
      tone(this.ctx, this.out, at, { freq, dur: dur * 1.1, gain: 0.035, attack: 0.12, vibrato: { rate: 5, depth: freq * 0.006 } });
      tone(this.ctx, this.out, at, { type: 'triangle', freq: freq * 2, dur: dur, gain: 0.006, attack: 0.15 });
      at += dur;
    }
  }
}
