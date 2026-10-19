import type { TraitId } from '../sim/types.ts';

export interface TraitDef {
  id: TraitId;
  name: { m: string; f: string };
  innate: boolean;
  blurb: string;
  /** Somado ao limiar de fuga (ânimo abaixo disso = foge). */
  flee?: number;
  /** Somado ao ânimo de repouso. */
  moraleBase?: number;
  /** Fatias do saque na divisão. */
  lootShares?: number;
  /** Somado à exigência de confiança na escolha do andar (negativo = ousado). */
  daring?: number;
  /** Multiplica o peso de procurar grupo. */
  lfg?: number;
  funDecay?: number;
  faithDecay?: number;
  affinityGain?: number;
  loyalty?: number;
}

export const TRAITS: Record<TraitId, TraitDef> = {
  covarde: {
    id: 'covarde',
    name: { m: 'Covarde', f: 'Covarde' },
    innate: true,
    blurb: 'Foge cedo quando o ânimo cai.',
    flee: 25,
    moraleBase: -5,
    lfg: 0.8,
    daring: 0.15,
  },
  bravo: {
    id: 'bravo',
    name: { m: 'Bravo', f: 'Brava' },
    innate: true,
    blurb: 'Aguenta firme e anima os outros.',
    flee: -8,
    moraleBase: 10,
    lfg: 1.15,
  },
  vingativo: {
    id: 'vingativo',
    name: { m: 'Vingativo', f: 'Vingativa' },
    innate: true,
    blurb: 'Quando um aliado cai, luta até o fim e ignora ordens de retirada.',
  },
  ganancioso: {
    id: 'ganancioso',
    name: { m: 'Ganancioso', f: 'Gananciosa' },
    innate: true,
    blurb: 'Quer descer mais fundo e leva uma fatia maior do saque.',
    lootShares: 1.5,
    daring: -0.1,
    lfg: 1.3,
  },
  leal: {
    id: 'leal',
    name: { m: 'Leal', f: 'Leal' },
    innate: true,
    blurb: 'Confia no prefeito e não abandona a vila.',
    loyalty: 25,
  },
  curioso: {
    id: 'curioso',
    name: { m: 'Curioso', f: 'Curiosa' },
    innate: true,
    blurb: 'Explora salas laterais: mais saque, mais risco.',
  },
  beberrao: {
    id: 'beberrao',
    name: { m: 'Beberrão', f: 'Beberrona' },
    innate: true,
    blurb: 'Recupera o ânimo na taverna, mas gasta tudo lá.',
    funDecay: 1.5,
  },
  devoto: {
    id: 'devoto',
    name: { m: 'Devoto', f: 'Devota' },
    innate: true,
    blurb: 'Encontra força no templo; imune a maldições.',
    faithDecay: 1.6,
  },
  supersticioso: {
    id: 'supersticioso',
    name: { m: 'Supersticioso', f: 'Supersticiosa' },
    innate: true,
    blurb: 'Não toca em santuários e treme onde um herói caiu.',
  },
  sociavel: {
    id: 'sociavel',
    name: { m: 'Sociável', f: 'Sociável' },
    innate: true,
    blurb: 'Faz amigos com facilidade.',
    affinityGain: 1.5,
  },
  veterano: {
    id: 'veterano',
    name: { m: 'Veterano', f: 'Veterana' },
    innate: false,
    blurb: 'Já viu de tudo. Dá ânimo ao grupo.',
    moraleBase: 10,
    flee: -5,
  },
  traumatizado: {
    id: 'traumatizado',
    name: { m: 'Traumatizado', f: 'Traumatizada' },
    innate: false,
    blurb: 'Viu amigos morrerem. Foge mais cedo.',
    moraleBase: -10,
    flee: 10,
  },
};

export const INNATE_TRAITS = (Object.values(TRAITS) as TraitDef[]).filter((t) => t.innate).map((t) => t.id);

export const EXCLUSIVE_TRAITS: [TraitId, TraitId][] = [['covarde', 'bravo']];
