// Receitas dos efeitos sonoros. Cada uma agenda nós a partir de `t` e não guarda estado.

import { bell, drum, midiToFreq, noise, pad, pluck, rand, SMALL_BELL, tone, type Ctx } from './instruments.ts';

export type SfxName =
  | 'horn'
  | 'coins'
  | 'build'
  | 'depart'
  | 'return'
  | 'death'
  | 'vengeance'
  | 'flee'
  | 'grief'
  | 'conquest'
  | 'boss'
  | 'finale'
  | 'echo'
  | 'promotion'
  | 'level'
  | 'arrival'
  | 'contract'
  | 'corruption'
  | 'bond'
  | 'reveal'
  | 'rescue'
  | 'leave'
  | 'bell'
  | 'click'
  | 'deny'
  | 'open';

type Recipe = (ctx: Ctx, out: AudioNode, t: number) => void;

const n = midiToFreq;

/** Arpejo dedilhado a partir de notas MIDI. */
const arpeggio = (ctx: Ctx, out: AudioNode, t: number, notes: number[], step: number, gain = 0.09, decay = 1.2) =>
  notes.forEach((note, i) => pluck(ctx, out, t + i * step, n(note), gain, decay, 7));

/** Metais (fanfarra): dente de serra com filtro que abre no ataque. */
const brass = (ctx: Ctx, out: AudioNode, t: number, notes: number[], dur: number, gain = 0.07) => {
  for (const note of notes) {
    for (const detune of [-6, 6]) {
      tone(ctx, out, t, {
        type: 'sawtooth',
        freq: n(note),
        detune,
        dur,
        gain,
        attack: 0.06,
        filter: { type: 'lowpass', freq: 600, to: 2400, q: 1 },
      });
    }
  }
};

export const SFX: Record<SfxName, Recipe> = {
  // Berrante: chifre grave que sobe e treme, com uma quinta por cima.
  horn: (ctx, out, t) => {
    for (const [base, gain] of [
      [n(45), 0.24],
      [n(52), 0.1],
    ] as const) {
      tone(ctx, out, t, {
        type: 'sawtooth',
        freq: base * 0.94,
        glide: { to: base, time: 0.35 },
        dur: 1.9,
        gain,
        attack: 0.18,
        vibrato: { rate: 5.2, depth: base * 0.012 },
        filter: { type: 'lowpass', freq: 500, to: 1400, q: 2 },
      });
    }
    noise(ctx, out, t, { dur: 0.5, gain: 0.03, filter: 'bandpass', freq: 900, q: 2, attack: 0.1 });
  },

  coins: (ctx, out, t) => {
    const count = 4 + Math.floor(rand(0, 3));
    for (let i = 0; i < count; i++) {
      bell(ctx, out, t + i * rand(0.045, 0.09), rand(2300, 3600), 0.05, 0.35, SMALL_BELL);
    }
  },

  // Martelo na madeira: três batidas e um acorde de "pronto".
  build: (ctx, out, t) => {
    for (let i = 0; i < 3; i++) {
      const at = t + i * 0.2;
      drum(ctx, out, at, 140, 0.25, 0.18);
      noise(ctx, out, at, { dur: 0.08, gain: 0.12, filter: 'bandpass', freq: 1300, q: 3 });
    }
    arpeggio(ctx, out, t + 0.7, [62, 66, 69, 74], 0.07, 0.07, 1.4);
  },

  // Grupo descendo: dois toques de tambor, passos.
  depart: (ctx, out, t) => {
    drum(ctx, out, t, 70, 0.3, 0.6);
    drum(ctx, out, t + 0.32, 62, 0.25, 0.7);
    for (let i = 0; i < 4; i++) noise(ctx, out, t + 0.1 + i * 0.22, { dur: 0.05, gain: 0.04, filter: 'lowpass', freq: 500 });
  },

  return: (ctx, out, t) => {
    arpeggio(ctx, out, t, [57, 62, 66], 0.11, 0.08, 1.6);
  },

  // Sino fúnebre: duas badaladas graves com cauda longa.
  death: (ctx, out, t) => {
    bell(ctx, out, t, 196, 0.16, 5);
    bell(ctx, out, t + 1.6, 196, 0.11, 5);
  },

  // Fúria vingativa: cluster grave e áspero.
  vengeance: (ctx, out, t) => {
    brass(ctx, out, t, [38, 39, 45], 0.9, 0.06);
    drum(ctx, out, t, 55, 0.45, 0.9);
  },

  flee: (ctx, out, t) => {
    tone(ctx, out, t, { type: 'triangle', freq: 820, glide: { to: 260, time: 0.35 }, dur: 0.4, gain: 0.08 });
    for (let i = 0; i < 5; i++) noise(ctx, out, t + i * 0.11, { dur: 0.04, gain: 0.05, filter: 'lowpass', freq: 700 });
  },

  // Luto: acorde menor baixo e lento.
  grief: (ctx, out, t) => {
    pad(ctx, out, t, [n(50), n(53), n(57), n(64)], 1.6, 0.05, 1100);
  },

  conquest: (ctx, out, t) => {
    arpeggio(ctx, out, t, [62, 65, 69, 74, 77], 0.09, 0.09, 1.6);
  },

  // Fanfarra de chefe derrotado: Ré maior → Sol → Ré, com rufar.
  boss: (ctx, out, t) => {
    for (let i = 0; i < 8; i++) drum(ctx, out, t + i * 0.06, 65, 0.12 + i * 0.02, 0.3);
    brass(ctx, out, t + 0.5, [50, 54, 57, 62], 0.7);
    brass(ctx, out, t + 1.25, [55, 59, 62, 67], 0.6);
    brass(ctx, out, t + 1.9, [50, 54, 57, 62, 66], 1.8, 0.08);
    drum(ctx, out, t + 1.9, 60, 0.5, 1.2);
  },

  finale: (ctx, out, t) => {
    SFX.boss(ctx, out, t);
    bell(ctx, out, t + 3.2, 392, 0.1, 4);
    arpeggio(ctx, out, t + 3.4, [62, 66, 69, 74, 78, 81], 0.14, 0.08, 2.4);
  },

  // Eco de um herói morto se erguendo: sino invertido e sopro grave.
  echo: (ctx, out, t) => {
    tone(ctx, out, t, { freq: 98, glide: { to: 73, time: 2 }, dur: 2.4, gain: 0.12, attack: 0.8, vibrato: { rate: 0.6, depth: 3 } });
    noise(ctx, out, t, { dur: 2.2, gain: 0.05, filter: 'bandpass', freq: 300, to: 120, q: 3, attack: 0.9 });
    bell(ctx, out, t + 0.6, 233, 0.06, 3);
  },

  promotion: (ctx, out, t) => {
    [74, 78, 81, 86].forEach((note, i) => bell(ctx, out, t + i * 0.09, n(note), 0.05, 1.2, SMALL_BELL));
  },

  level: (ctx, out, t) => {
    bell(ctx, out, t, n(81), 0.04, 0.8, SMALL_BELL);
    bell(ctx, out, t + 0.09, n(86), 0.04, 1, SMALL_BELL);
  },

  arrival: (ctx, out, t) => {
    for (let i = 0; i < 3; i++) noise(ctx, out, t + i * 0.24, { dur: 0.05, gain: 0.05, filter: 'lowpass', freq: 600 });
    pluck(ctx, out, t + 0.7, n(69), 0.06, 1.2);
  },

  // Papel e pena no quadro de contratos.
  contract: (ctx, out, t) => {
    noise(ctx, out, t, { dur: 0.18, gain: 0.06, filter: 'bandpass', freq: 2500, to: 4200, q: 1.5, attack: 0.03 });
    noise(ctx, out, t + 0.22, { dur: 0.25, gain: 0.04, filter: 'highpass', freq: 3500, attack: 0.02 });
  },

  corruption: (ctx, out, t) => {
    tone(ctx, out, t, { freq: 41, dur: 2.8, gain: 0.25, attack: 0.9 });
    noise(ctx, out, t, { dur: 2.6, gain: 0.12, filter: 'lowpass', freq: 160, attack: 1 });
  },

  bond: (ctx, out, t) => {
    pluck(ctx, out, t, n(69), 0.05, 1.3);
    pluck(ctx, out, t + 0.16, n(74), 0.05, 1.6);
  },

  reveal: (ctx, out, t) => {
    tone(ctx, out, t, { type: 'triangle', freq: n(76), dur: 0.35, gain: 0.04 });
  },

  rescue: (ctx, out, t) => {
    arpeggio(ctx, out, t, [62, 66, 69, 74], 0.14, 0.07, 1.8);
  },

  // Porta que bate: alguém deixou a vila.
  leave: (ctx, out, t) => {
    drum(ctx, out, t, 95, 0.2, 0.25);
    noise(ctx, out, t, { dur: 0.15, gain: 0.06, filter: 'lowpass', freq: 400 });
  },

  // Sino de retirada: sininho de mão tocado três vezes.
  bell: (ctx, out, t) => {
    for (let i = 0; i < 3; i++) bell(ctx, out, t + i * 0.32, 1046, 0.07, 1.4, SMALL_BELL);
  },

  click: (ctx, out, t) => {
    tone(ctx, out, t, { type: 'triangle', freq: 1250, dur: 0.03, gain: 0.025 });
  },

  deny: (ctx, out, t) => {
    tone(ctx, out, t, { type: 'triangle', freq: 180, glide: { to: 120, time: 0.15 }, dur: 0.18, gain: 0.1 });
  },

  open: (ctx, out, t) => {
    noise(ctx, out, t, { dur: 0.22, gain: 0.025, filter: 'bandpass', freq: 600, to: 2200, q: 0.8, attack: 0.05 });
  },
};

export const SFX_NAMES = Object.keys(SFX) as SfxName[];
