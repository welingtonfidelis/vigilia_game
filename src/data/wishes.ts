// Desejos dos heróis (M6 F1): o que cada um pede ao prefeito, como ele atende pelo que já existe
// no jogo e o que a crônica conta quando o desejo se cumpre ou passa.

import type { WishId } from '../sim/types.ts';

export interface WishText {
  quem: string;
  /** O outro do desejo (o morto, o amigo, o veterano); vazio quando não há. */
  alvo: string;
  /** Onde estão os restos (desejo de herdeiro). */
  onde: string;
  g: (who: 'quem' | 'alvo', m: string, f: string) => string;
}

export interface WishDef {
  id: WishId;
  /** O desejo na ficha e no painel. */
  text: (t: WishText) => string;
  /** A dica para o prefeito. */
  how: (t: WishText) => string;
  /** Na crônica, quando se cumpre. */
  done: (t: WishText) => string;
  /** Peso no sorteio entre os desejos que cabem no herói. */
  weight: number;
}

export const WISHES: Record<WishId, WishDef> = {
  herdeiro: {
    id: 'herdeiro',
    text: (t) => `Recuperar as coisas de ${t.alvo}, que ficaram nos restos ${t.onde}.`,
    how: (t) => `Poste um contrato ${t.onde}: quem achar os restos traz as peças de volta.`,
    done: (t) => `Os restos de ${t.alvo} voltaram à vila, e ${t.quem} pôde enfim guardar o que era ${t.g('alvo', 'do pai', 'da mãe')}.`,
    weight: 3,
  },
  lapide: {
    id: 'lapide',
    text: (t) => `Uma lápide digna para ${t.alvo}.`,
    how: () => 'Pague a lápide no cemitério (ou na ficha do morto).',
    done: (t) => `O prefeito mandou fazer uma lápide nova para ${t.alvo}. ${t.quem} levou flores no mesmo dia.`,
    weight: 3,
  },
  juntos: {
    id: 'juntos',
    text: (t) => `Descer ao abismo ao lado de ${t.alvo}.`,
    how: (t) => `Converse com ${t.quem} e com ${t.alvo} no mesmo dia: os dois passam a se procurar no quadro.`,
    done: (t) => `${t.quem} e ${t.alvo} desceram juntos, como ${t.g('quem', 'ele', 'ela')} queria.`,
    weight: 2,
  },
  padrinho: {
    id: 'padrinho',
    text: (t) => `Ser ${t.g('quem', 'padrinho', 'madrinha')} da criança de ${t.alvo}.`,
    how: (t) => `Converse com ${t.alvo} e faça o pedido.`,
    done: (t) => `${t.alvo} aceitou: ${t.quem} é ${t.g('quem', 'o padrinho', 'a madrinha')} da criança.`,
    weight: 3,
  },
  festa: {
    id: 'festa',
    text: () => 'Ver a vila em festa.',
    how: () => 'Faça uma festa na praça antes do prazo.',
    done: (t) => `Na festa da praça, ${t.quem} dançou até a fogueira apagar.`,
    weight: 1,
  },
  peca: {
    id: 'peca',
    text: () => 'Uma peça nova do cofre, dada pelo prefeito.',
    how: () => 'Entregue uma peça do arsenal do Cofre (ou uma encomenda da forja).',
    done: (t) => `${t.quem} recebeu do prefeito a peça que tanto queria.`,
    weight: 1,
  },
  selar: {
    id: 'selar',
    text: () => 'Estar no grupo que vencer um guardião e selar uma passagem.',
    how: () => 'Poste contratos nos andares do guardião: o grupo que selar a passagem leva a glória.',
    done: (t) => `${t.quem} ajudou a selar uma passagem, como sonhava desde que chegou.`,
    weight: 1,
  },
  veterano: {
    id: 'veterano',
    text: (t) => `Ouvir as histórias de ${t.alvo}.`,
    how: (t) => `Converse com ${t.quem} e com ${t.alvo} no mesmo dia.`,
    done: (t) => `${t.alvo} passou a noite contando histórias do abismo, e ${t.quem} não perdeu uma palavra.`,
    weight: 2,
  },
  superar: {
    id: 'superar',
    text: (t) => `Descer de novo ao lado de ${t.alvo} e voltar inteiro.`,
    how: (t) => `Converse com ${t.quem} e com ${t.alvo} no mesmo dia: os dois passam a se procurar no quadro.`,
    done: (t) => `${t.quem} voltou do abismo ao lado de ${t.alvo}, e dormiu a noite inteira pela primeira vez.`,
    weight: 3,
  },
};
