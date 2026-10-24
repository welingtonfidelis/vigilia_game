// Audiências da manhã (M6 F1): os modelos das petições. Cada modelo diz quem pede, quem mais
// aparece, quando ele faz sentido e o que cada resposta muda. O ouro é sempre simbólico: o
// custo e o ganho contam em dias do imposto dos moradores.

import type { BuildingId, CitizenJob, TraitId, WishId } from '../sim/types.ts';

/** Sobre quem a resposta age: quem pediu, o outro da petição, todos os moradores, os heróis na vila. */
export type Who = 'quem' | 'outro' | 'moradores' | 'herois';

export type PetitionEffect =
  /** Humor do morador ou ânimo do herói. */
  | readonly ['humor', Who, number]
  | readonly ['lealdade', Who, number]
  /** Laço entre quem pediu e o outro (os dois heróis). */
  | readonly ['laco', number]
  | readonly ['reputacao', number]
  /** Ouro que entra no tesouro, em dias de imposto. */
  | readonly ['ouro', number]
  /** Alivia o luto (herói). */
  | readonly ['luto', Who, number]
  /** Revela o traço escondido do herói. */
  | readonly ['traco', Who]
  /** A criança (o outro) treina no campo: chega à maioridade com um nível a mais. */
  | readonly ['aprendiz']
  /** Gente nova na vila (população). */
  | readonly ['morador', number]
  /** Quem pediu (morador) vai embora da vila. */
  | readonly ['partir']
  /** O guarda (quem pediu ou o outro) folga: não defende nesta noite. */
  | readonly ['folga', Who]
  /** Quem pediu (herói) ganha um desejo, com o outro como alvo quando o desejo pede alguém. */
  | readonly ['desejo', WishId];

/** Quem pede. */
export type AskerSpec =
  | { kind: 'morador'; job?: CitizenJob }
  | { kind: 'heroi'; trait?: TraitId; tag?: HeroTag }
  | { kind: 'aposentado' };

/** Marcas da vida do herói que a petição procura. */
export type HeroTag = 'pai' | 'luto' | 'novato' | 'rico' | 'casado' | 'recemCasado' | 'recemPai';

/** Quem mais aparece na petição. */
export type OtherSpec =
  | { kind: 'morador'; job?: CitizenJob }
  | { kind: 'heroi'; tag?: 'rival' | 'amigo' | 'veterano' | 'parceiro'; trait?: TraitId }
  /** Filho ou filha de quem pediu, ainda criança. */
  | { kind: 'filho' }
  /** O herói morto por quem quem pediu está de luto. */
  | { kind: 'morto' };

/** Quando a petição faz sentido. */
export type PetitionWhen =
  | 'peste'
  | 'incursao'
  | 'luto'
  | 'casamento'
  | 'nascimento'
  | 'verao'
  | 'outono'
  | 'inverno'
  | 'pressao'
  | 'bichos';

export interface PetitionText {
  quem: string;
  outro: string;
  /** Nome do prédio da petição (quando ela pede um). */
  predio: string;
  /** Ofício de quem pede (morador). */
  oficio: string;
  /** Concordância de gênero de quem pede ou do outro. */
  g: (who: 'quem' | 'outro', m: string, f: string) => string;
}

export interface PetitionChoiceDef {
  id: string;
  label: (t: PetitionText) => string;
  effects: readonly PetitionEffect[];
  /** Energia do prefeito que a resposta gasta. */
  energy?: number;
  /** Ouro que a resposta custa, em dias de imposto. */
  cost?: number;
  /** A resposta que o prefeito automático escolhe (a mais segura). */
  bot?: boolean;
}

export interface PetitionDef {
  id: string;
  asker: AskerSpec;
  other?: OtherSpec;
  /** Precisa deste prédio de pé (e o nome dele entra no texto). */
  building?: BuildingId;
  when?: PetitionWhen;
  /** Peso no sorteio do dia (1 = comum). */
  weight?: number;
  text: (t: PetitionText) => string;
  choices: readonly PetitionChoiceDef[];
  /** O que acontece se o prefeito não responder a tempo. */
  expire: readonly PetitionEffect[];
}

export const PETITIONS: readonly PetitionDef[] = [
  {
    id: 'cerca',
    asker: { kind: 'morador', job: 'lavrador' },
    other: { kind: 'morador', job: 'lavrador' },
    text: (t) => `${t.quem} e ${t.outro} brigam pela cerca do campo. Cada um jura que a divisa fica do seu lado.`,
    choices: [
      { id: 'quem', label: (t) => `Dar razão a ${t.quem}`, effects: [['humor', 'quem', 8], ['humor', 'outro', -8]] },
      { id: 'dividir', label: () => 'Dividir a terra ao meio', effects: [['humor', 'quem', -2], ['humor', 'outro', -2], ['reputacao', 1]], bot: true },
      { id: 'guarda', label: () => 'Mandar o guarda resolver', effects: [['humor', 'moradores', -1], ['reputacao', 2]] },
    ],
    expire: [['humor', 'quem', -3], ['humor', 'outro', -3]],
  },
  {
    id: 'aprendiz',
    asker: { kind: 'heroi', tag: 'pai' },
    other: { kind: 'filho' },
    building: 'campo',
    text: (t) => `${t.g('outro', 'O filho', 'A filha')} de ${t.quem}, ${t.outro}, quer treinar para o abismo antes dos 16. ${t.quem} pede a palavra do prefeito.`,
    choices: [
      { id: 'proibir', label: () => 'Proibir: criança não pega em armas', effects: [['lealdade', 'quem', 6]], bot: true },
      { id: 'treinar', label: () => 'Deixar treinar no campo', effects: [['aprendiz'], ['humor', 'quem', 4]] },
      { id: 'pais', label: () => 'A decisão é da família', effects: [['humor', 'quem', 3]] },
    ],
    expire: [['humor', 'quem', -2]],
  },
  {
    id: 'abrigo',
    asker: { kind: 'morador', job: 'guarda' },
    text: (t) => `${t.quem}, ${t.g('quem', 'o guarda', 'a guarda')} do portão, trouxe um viajante molhado de chuva que pede abrigo na vila.`,
    choices: [
      { id: 'acolher', label: () => 'Acolher: há lugar para mais um', effects: [['morador', 1], ['humor', 'moradores', -1]] },
      { id: 'estalagem', label: () => 'Pagar uma noite na estalagem', effects: [['reputacao', 2]], cost: 0.5 },
      { id: 'recusar', label: () => 'Mandar seguir viagem', effects: [['reputacao', -1]], bot: true },
    ],
    expire: [['reputacao', -1]],
  },
  {
    id: 'parte-saque',
    asker: { kind: 'heroi', trait: 'ganancioso' },
    text: (t) => `${t.quem} quer parte maior do saque: diz que desce mais fundo que todo mundo e volta com mais ouro.`,
    choices: [
      { id: 'negar', label: () => 'Negar: o imposto é igual para todos', effects: [['humor', 'quem', -6]] },
      { id: 'festa', label: (t) => `Prometer uma festa em nome de ${t.quem}`, effects: [['lealdade', 'quem', 4], ['desejo', 'festa']], bot: true },
      { id: 'agrado', label: () => 'Dar um agrado do cofre', effects: [['lealdade', 'quem', 8]], cost: 1 },
    ],
    expire: [['lealdade', 'quem', -3]],
  },
  {
    id: 'folga-guarda',
    asker: { kind: 'morador', job: 'guarda' },
    text: (t) => `${t.quem} pede folga esta noite: a irmã casa na vila vizinha.`,
    choices: [
      { id: 'folga', label: () => 'Dar a folga', effects: [['folga', 'quem'], ['humor', 'quem', 10]] },
      { id: 'negar', label: () => 'Negar: o portão não fica sem guarda', effects: [['humor', 'quem', -8]], bot: true },
      { id: 'presente', label: () => 'Negar, mas mandar um presente aos noivos', effects: [['humor', 'quem', 4]], cost: 0.5 },
    ],
    expire: [['humor', 'quem', -4]],
  },
  {
    id: 'remedio',
    asker: { kind: 'morador', job: 'acolito' },
    when: 'peste',
    weight: 3,
    text: (t) => `${t.quem} pede ervas para os doentes da peste. O templo já não tem onde deitar mais ninguém.`,
    choices: [
      { id: 'ervas', label: () => 'Comprar as ervas', effects: [['humor', 'moradores', 4]], cost: 1 },
      { id: 'isolar', label: () => 'Isolar os doentes no templo', effects: [['humor', 'moradores', -3], ['reputacao', 1]], bot: true },
      { id: 'rezar', label: () => 'Rezar e esperar', effects: [['humor', 'moradores', -2]] },
    ],
    expire: [['humor', 'moradores', -2]],
  },
  {
    id: 'muro',
    asker: { kind: 'morador', job: 'pedreiro' },
    when: 'incursao',
    weight: 3,
    text: (t) => `Depois da incursão, ${t.quem} pede pedra para remendar o muro do lado do abismo.`,
    choices: [
      { id: 'pedra', label: () => 'Pagar a pedra', effects: [['humor', 'moradores', 3]], cost: 1 },
      { id: 'vigiar', label: () => 'Pedir aos heróis que vigiem à noite', effects: [['humor', 'herois', -3], ['humor', 'moradores', 2]] },
      { id: 'esperar', label: () => 'O muro aguenta mais um pouco', effects: [['humor', 'moradores', -2]], bot: true },
    ],
    expire: [['humor', 'moradores', -3]],
  },
  {
    id: 'vigilia-morto',
    asker: { kind: 'heroi', tag: 'luto' },
    other: { kind: 'morto' },
    weight: 2,
    text: (t) => `${t.quem} pede uma vigília na praça por ${t.outro}, que o abismo levou.`,
    choices: [
      { id: 'vigilia', label: () => 'Fazer a vigília', effects: [['luto', 'quem', 25], ['humor', 'herois', 2]], energy: 1 },
      { id: 'flores', label: () => 'Mandar flores à cova', effects: [['luto', 'quem', 15]], cost: 0.5, bot: true },
      { id: 'abismo', label: () => 'O abismo não espera', effects: [['humor', 'quem', -6], ['lealdade', 'quem', -4]] },
    ],
    expire: [['humor', 'quem', -4]],
  },
  {
    id: 'festa-noivos',
    asker: { kind: 'heroi', tag: 'recemCasado' },
    other: { kind: 'heroi', tag: 'parceiro' },
    when: 'casamento',
    weight: 4,
    text: (t) => `${t.quem} e ${t.outro} acabaram de casar e pedem a praça para a festa.`,
    choices: [
      { id: 'barril', label: () => 'Ceder a praça e um barril', effects: [['humor', 'quem', 8], ['humor', 'outro', 8], ['humor', 'moradores', 2]], cost: 0.5 },
      { id: 'praca', label: () => 'Ceder só a praça', effects: [['humor', 'quem', 4], ['humor', 'outro', 4]], bot: true },
      { id: 'agora-nao', label: () => 'Agora não: a vila está de vigia', effects: [['humor', 'quem', -4], ['humor', 'outro', -4]] },
    ],
    expire: [['humor', 'quem', -2], ['humor', 'outro', -2]],
  },
  {
    id: 'cadeiras',
    asker: { kind: 'morador', job: 'copeiro' },
    other: { kind: 'heroi' },
    building: 'taverna',
    text: (t) => `${t.quem} reclama: ${t.outro} quebrou duas cadeiras da taverna numa briga de braço.`,
    choices: [
      { id: 'cobrar', label: (t) => `Cobrar de ${t.outro}`, effects: [['humor', 'outro', -5], ['humor', 'quem', 4], ['ouro', 0.5]] },
      { id: 'tesouro', label: () => 'O tesouro paga as cadeiras', effects: [['humor', 'quem', 4], ['lealdade', 'outro', 3]], cost: 0.5 },
      { id: 'deixar', label: () => 'Cadeira se conserta', effects: [['humor', 'quem', -5]], bot: true },
    ],
    expire: [['humor', 'quem', -3]],
  },
  {
    id: 'nomes-armas',
    asker: { kind: 'morador', job: 'ferreiro' },
    building: 'ferreiro',
    text: (t) => `${t.quem} quer gravar o nome dos mortos nas armas que ${t.g('quem', 'ele', 'ela')} conserta.`,
    choices: [
      { id: 'permitir', label: () => 'Permitir', effects: [['luto', 'herois', 5], ['humor', 'quem', 4]], bot: true },
      { id: 'familias', label: () => 'Só com o sim das famílias', effects: [['luto', 'herois', 8], ['humor', 'quem', 6]], energy: 1 },
      { id: 'proibir', label: () => 'Proibir: dá azar', effects: [['humor', 'quem', -4]] },
    ],
    expire: [['humor', 'quem', -2]],
  },
  {
    id: 'beira-abismo',
    asker: { kind: 'morador' },
    when: 'pressao',
    text: (t) => `${t.quem} viu as crianças brincando na beira do abismo de novo. A névoa sobe cada vez mais perto.`,
    choices: [
      { id: 'guarda', label: () => 'Pôr um guarda olhando', effects: [['humor', 'moradores', 3]], bot: true },
      { id: 'historias', label: () => 'Contar histórias do abismo para assustar', effects: [['humor', 'moradores', 2], ['reputacao', 1]], energy: 1 },
      { id: 'deixar', label: () => 'Criança é assim', effects: [['humor', 'moradores', -3]] },
    ],
    expire: [['humor', 'quem', -3]],
  },
  {
    id: 'linguica',
    asker: { kind: 'morador', job: 'copeiro' },
    when: 'bichos',
    text: (t) => `${t.quem} jura que o cão da vila roubou a linguiça do jantar da taverna. Quer uma providência.`,
    choices: [
      { id: 'pagar', label: () => 'Pagar a linguiça', effects: [['humor', 'quem', 4]], cost: 0.25 },
      { id: 'rir', label: () => 'Rir e deixar para lá', effects: [['humor', 'quem', -3], ['humor', 'moradores', 2]], bot: true },
      { id: 'prender', label: () => 'Prender o cão por um dia', effects: [['humor', 'moradores', -2], ['humor', 'quem', 3]] },
    ],
    expire: [['humor', 'quem', -2]],
  },
  {
    id: 'sermao',
    asker: { kind: 'morador', job: 'acolito' },
    building: 'templo',
    text: (t) => `${t.quem} quer pregar na praça contra o ouro do abismo: diz que ele apodrece quem o carrega.`,
    choices: [
      { id: 'permitir', label: () => 'Permitir', effects: [['humor', 'moradores', 3], ['lealdade', 'herois', -2]] },
      { id: 'templo', label: () => 'Pregar no templo, não na praça', effects: [['humor', 'quem', 2]], bot: true },
      { id: 'proibir', label: () => 'Proibir', effects: [['humor', 'quem', -8], ['lealdade', 'herois', 1]] },
    ],
    expire: [['humor', 'quem', -2]],
  },
  {
    id: 'ensinar',
    asker: { kind: 'aposentado' },
    building: 'campo',
    text: (t) => `${t.quem}, que já não desce, quer ensinar os novatos no campo de treino.`,
    choices: [
      { id: 'aceitar', label: () => 'Aceitar com gratidão', effects: [['humor', 'quem', 8], ['lealdade', 'herois', 2]], bot: true },
      { id: 'taverna', label: () => 'Pedir que conte histórias na taverna', effects: [['humor', 'quem', 4], ['humor', 'moradores', 2]] },
      { id: 'recusar', label: () => 'Agradecer e recusar', effects: [['humor', 'quem', -5]] },
    ],
    expire: [['humor', 'quem', -3]],
  },
  {
    id: 'covardia',
    asker: { kind: 'heroi' },
    other: { kind: 'heroi', tag: 'rival' },
    weight: 2,
    text: (t) => `${t.quem} acusa ${t.outro} de covardia na última descida. ${t.outro} diz que foi prudência.`,
    choices: [
      { id: 'quem', label: (t) => `Ficar do lado de ${t.quem}`, effects: [['lealdade', 'quem', 6], ['lealdade', 'outro', -8], ['laco', -5]] },
      { id: 'outro', label: (t) => `Ficar do lado de ${t.outro}`, effects: [['lealdade', 'outro', 6], ['lealdade', 'quem', -8], ['laco', -5]] },
      { id: 'conversar', label: () => 'Pôr os dois para conversar', effects: [['laco', 12]], energy: 1, bot: true },
    ],
    expire: [['laco', -4]],
  },
  {
    id: 'dupla',
    asker: { kind: 'heroi' },
    other: { kind: 'heroi', tag: 'amigo' },
    weight: 2,
    text: (t) => `${t.quem} e ${t.outro} pedem para descer sempre juntos: dizem que um cobre as costas do outro.`,
    choices: [
      { id: 'apoiar', label: () => 'Apoiar a dupla', effects: [['desejo', 'juntos'], ['laco', 5]], bot: true },
      { id: 'guilda', label: () => 'Quem decide é a guilda', effects: [['humor', 'quem', -3], ['humor', 'outro', -3]] },
    ],
    expire: [['humor', 'quem', -2]],
  },
  {
    id: 'imposto',
    asker: { kind: 'heroi', tag: 'rico' },
    text: (t) => `${t.quem} reclama do imposto sobre o saque: "O abismo é que paga a vila, não o contrário."`,
    choices: [
      { id: 'explicar', label: () => 'Explicar para onde vai o ouro', effects: [['lealdade', 'quem', 5]], energy: 1 },
      { id: 'ouvir', label: () => 'Ouvir e anotar a queixa', effects: [['lealdade', 'quem', 2]], bot: true },
      { id: 'ignorar', label: () => 'Ignorar', effects: [['lealdade', 'quem', -5]] },
    ],
    expire: [['lealdade', 'quem', -3]],
  },
  {
    id: 'velas',
    asker: { kind: 'heroi', trait: 'devoto' },
    building: 'templo',
    text: (t) => `${t.quem} pede uma vigília de orações antes da próxima descida.`,
    choices: [
      { id: 'vigilia', label: () => 'Fazer a vigília no templo', effects: [['humor', 'herois', 4]], energy: 1 },
      { id: 'velas', label: () => 'Pagar as velas do templo', effects: [['humor', 'quem', 6], ['humor', 'moradores', 1]], cost: 0.5 },
      { id: 'sozinho', label: () => 'Que reze à vontade', effects: [['humor', 'quem', -2]], bot: true },
    ],
    expire: [['humor', 'quem', -3]],
  },
  {
    id: 'conta',
    asker: { kind: 'morador', job: 'copeiro' },
    other: { kind: 'heroi', trait: 'beberrao' },
    building: 'taverna',
    text: (t) => `${t.quem} cobra trinta canecas que ${t.outro} pendurou na conta da taverna.`,
    choices: [
      { id: 'tesouro', label: () => 'O tesouro paga a conta', effects: [['humor', 'quem', 6], ['lealdade', 'outro', 4]], cost: 0.5 },
      { id: 'cobrar', label: (t) => `Cobrar de ${t.outro}`, effects: [['humor', 'outro', -6], ['humor', 'quem', 3]], bot: true },
      { id: 'cortar', label: (t) => `Cortar a bebida de ${t.outro}`, effects: [['humor', 'outro', -8], ['humor', 'quem', -2]] },
    ],
    expire: [['humor', 'quem', -3]],
  },
  {
    id: 'bencao',
    asker: { kind: 'heroi', tag: 'recemPai' },
    other: { kind: 'filho' },
    when: 'nascimento',
    weight: 4,
    text: (t) => `${t.quem} pede a bênção do prefeito para ${t.outro}, que acabou de nascer.`,
    choices: [
      { id: 'praca', label: () => 'Abençoar na praça, diante da vila', effects: [['humor', 'quem', 8], ['humor', 'moradores', 2], ['reputacao', 1]], energy: 1 },
      { id: 'presente', label: () => 'Mandar um presente', effects: [['humor', 'quem', 6]], cost: 0.5 },
      { id: 'sorte', label: () => 'Desejar sorte', effects: [['humor', 'quem', 1]], bot: true },
    ],
    expire: [['humor', 'quem', -2]],
  },
  {
    id: 'colheita',
    asker: { kind: 'morador', job: 'lavrador' },
    when: 'outono',
    weight: 2,
    text: (t) => `${t.quem} diz que a colheita foi pouca este ano. O inverno vai ser magro.`,
    choices: [
      { id: 'reserva', label: () => 'Dividir a reserva da vila', effects: [['humor', 'moradores', 5]], cost: 1 },
      { id: 'racionar', label: () => 'Racionar até a primavera', effects: [['humor', 'moradores', -3], ['reputacao', 1]], bot: true },
      { id: 'herois', label: () => 'Pedir ajuda aos heróis na roça', effects: [['humor', 'herois', -3], ['humor', 'moradores', 4]] },
    ],
    expire: [['humor', 'moradores', -2]],
  },
  {
    id: 'lenha',
    asker: { kind: 'morador' },
    when: 'inverno',
    weight: 2,
    text: (t) => `Faltou lenha na casa de ${t.quem}. As crianças dormem de casaco.`,
    choices: [
      { id: 'lenha', label: () => 'Mandar lenha do estoque', effects: [['humor', 'quem', 8]], cost: 0.5 },
      { id: 'estalagem', label: () => 'Abrir a estalagem a quem tem frio', effects: [['humor', 'moradores', 3], ['humor', 'herois', -2]], bot: true },
      { id: 'aguentar', label: () => 'O inverno passa', effects: [['humor', 'quem', -8]] },
    ],
    expire: [['humor', 'quem', -4]],
  },
  {
    id: 'bardo',
    asker: { kind: 'morador', job: 'guarda' },
    text: (t) => `${t.quem} conta que um bardo de passagem quer cantar na praça os feitos da vila.`,
    choices: [
      { id: 'cantar', label: () => 'Deixar cantar', effects: [['humor', 'moradores', 3], ['reputacao', 2]], bot: true },
      { id: 'mortos', label: () => 'Pagar para cantar o nome dos mortos', effects: [['luto', 'herois', 8], ['reputacao', 1]], cost: 0.5 },
      { id: 'embora', label: () => 'Mandar embora', effects: [['humor', 'moradores', -1]] },
    ],
    expire: [],
  },
  {
    id: 'ir-embora',
    asker: { kind: 'morador' },
    when: 'incursao',
    weight: 2,
    text: (t) => `${t.quem} quer ir embora depois da incursão. Diz que não dorme mais com o barulho do abismo.`,
    choices: [
      { id: 'convencer', label: () => 'Convencer a ficar', effects: [['humor', 'quem', 12]], energy: 1 },
      { id: 'guardas', label: () => 'Prometer mais vigia no portão', effects: [['humor', 'quem', 6], ['humor', 'moradores', 1]], bot: true },
      { id: 'partir', label: () => 'Deixar partir em paz', effects: [['partir'], ['reputacao', -1]] },
    ],
    expire: [['partir']],
  },
  {
    id: 'guarda-dormiu',
    asker: { kind: 'morador' },
    other: { kind: 'morador', job: 'guarda' },
    text: (t) => `${t.quem} pegou ${t.outro} dormindo no posto, de madrugada.`,
    choices: [
      { id: 'punir', label: (t) => `Punir ${t.outro}`, effects: [['humor', 'outro', -8], ['humor', 'moradores', 2]] },
      { id: 'advertir', label: () => 'Uma advertência basta', effects: [['humor', 'outro', -2]], bot: true },
      { id: 'folga', label: (t) => `${t.g('outro', 'Ele', 'Ela')} está cansad${t.g('outro', 'o', 'a')}: dar a noite de folga`, effects: [['folga', 'outro'], ['humor', 'outro', 6], ['humor', 'quem', -3]] },
    ],
    expire: [['humor', 'quem', -2]],
  },
  {
    id: 'estatua-morto',
    asker: { kind: 'morador', job: 'pedreiro' },
    when: 'luto',
    weight: 2,
    text: (t) => `${t.quem} quer esculpir em pedra o rosto de quem o abismo levou por último.`,
    choices: [
      { id: 'pedra', label: () => 'Pagar a pedra', effects: [['luto', 'herois', 10], ['humor', 'quem', 6]], cost: 1 },
      { id: 'madeira', label: () => 'Que seja em madeira', effects: [['luto', 'herois', 4], ['humor', 'quem', 2]], cost: 0.25, bot: true },
      { id: 'nao', label: () => 'Não há pedra para isso', effects: [['humor', 'quem', -4]] },
    ],
    expire: [['humor', 'quem', -2]],
  },
  {
    id: 'boato',
    asker: { kind: 'morador', job: 'copeiro' },
    other: { kind: 'heroi', trait: 'ganancioso' },
    text: (t) => `Na taverna, ${t.quem} ouviu dizer que ${t.outro} esconde parte do saque debaixo da cama.`,
    choices: [
      { id: 'investigar', label: () => 'Conversar com calma e descobrir', effects: [['traco', 'outro'], ['humor', 'quem', 2]], energy: 1 },
      { id: 'boato', label: () => 'Boato de taverna', effects: [['humor', 'quem', -2]], bot: true },
      { id: 'acusar', label: () => 'Acusar em público', effects: [['lealdade', 'outro', -10], ['reputacao', 1]] },
    ],
    expire: [],
  },
  {
    id: 'quarto',
    asker: { kind: 'heroi' },
    other: { kind: 'heroi' },
    building: 'estalagem',
    text: (t) => `${t.quem} e ${t.outro} disputam o mesmo quarto da estalagem, o da janela para o abismo.`,
    choices: [
      { id: 'quem', label: (t) => `O quarto é de ${t.quem}`, effects: [['lealdade', 'quem', 4], ['lealdade', 'outro', -4], ['laco', -4]] },
      { id: 'sortear', label: () => 'Tirar na sorte', effects: [['laco', -2]], bot: true },
      { id: 'outro-quarto', label: () => 'Pagar mais um quarto', effects: [['lealdade', 'quem', 3], ['lealdade', 'outro', 3]], cost: 0.5 },
    ],
    expire: [['laco', -3]],
  },
  {
    id: 'medo',
    asker: { kind: 'heroi', tag: 'novato' },
    text: (t) => `${t.quem} confessa, baixinho, que tem medo da próxima descida.`,
    choices: [
      { id: 'conversar', label: () => 'Conversar com calma', effects: [['humor', 'quem', 12], ['lealdade', 'quem', 4]], energy: 1 },
      { id: 'veterano', label: () => 'Mandar um veterano conversar', effects: [['humor', 'quem', 6], ['desejo', 'veterano']], bot: true },
      { id: 'passa', label: () => 'O medo passa lá embaixo', effects: [['humor', 'quem', -4]] },
    ],
    expire: [['humor', 'quem', -3]],
  },
  {
    id: 'insonia',
    asker: { kind: 'heroi', trait: 'traumatizado' },
    weight: 2,
    text: (t) => `${t.quem} não dorme desde a última descida. Acorda gritando o nome de quem ficou lá embaixo.`,
    choices: [
      { id: 'termas', label: () => 'Mandar às termas e pedir cuidado', effects: [['humor', 'quem', 10]], energy: 1 },
      { id: 'amigo', label: () => 'Pedir a um amigo que desça junto da próxima vez', effects: [['humor', 'quem', 4], ['desejo', 'superar']], bot: true },
      { id: 'acostuma', label: () => 'Vai se acostumar', effects: [['humor', 'quem', -6], ['lealdade', 'quem', -4]] },
    ],
    expire: [['humor', 'quem', -4]],
  },
];

export const PETITION_BY_ID: ReadonlyMap<string, PetitionDef> = new Map(PETITIONS.map((p) => [p.id, p]));
