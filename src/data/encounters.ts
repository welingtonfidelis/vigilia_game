// Encontros nas salas (M6 F3): o que o grupo acha no lugar de parte das salas vazias. Cada
// encontro tem uma opção ousada e uma prudente (às vezes uma terceira); o prefeito aconselha
// pelo corvo e o grupo decide. Nada aqui dá fragmento, sala ou andar a mais; o ouro é o de um
// baú comum do andar.

import type { TraitId } from '../sim/types.ts';

export type EncounterEffect =
  /** Bênção (ou maldição, se negativa) no ataque ou na defesa até o fim da descida. */
  | readonly ['bencao', 'atk' | 'def', number]
  /** Cura (ou ferida, se negativa) em fração da vida máxima, em todo o grupo. */
  | readonly ['vida', number]
  | readonly ['animo', number]
  /** Alguém resgatado, que vira recruta na volta (como na sala de prisioneiro). */
  | readonly ['resgate']
  /** Revela o traço escondido de quem agiu. */
  | readonly ['traco']
  /** Quem agiu ganha este traço. */
  | readonly ['adquire', TraitId]
  /** Uma peça comum do andar. */
  | readonly ['peca']
  /** O ouro de um baú comum do andar. */
  | readonly ['ouro'];

export interface EncounterOutcome {
  weight: number;
  effects: readonly EncounterEffect[];
  /** {quem} = o herói que agiu. */
  text: (quem: string) => string;
}

export interface EncounterOption {
  id: string;
  label: string;
  /** A ousada (o Curioso escolhe) e a prudente (o Supersticioso e o Covarde escolhem). */
  kind: 'ousada' | 'prudente' | 'outra';
  outcomes: readonly EncounterOutcome[];
}

export interface EncounterDef {
  id: string;
  /** Bioma (índice em src/data/biomes.ts) ou null para os que aparecem em qualquer um. */
  biome: number | null;
  title: string;
  text: string;
  options: readonly EncounterOption[];
}

const nada = (text: string): EncounterOutcome => ({ weight: 1, effects: [], text: () => text });

export const ENCOUNTERS: readonly EncounterDef[] = [
  // ── Em qualquer bioma ──
  {
    id: 'sarcofago',
    biome: null,
    title: 'Um sarcófago selado',
    text: 'No meio da sala, um sarcófago de pedra com inscrições que ninguém sabe ler. A tampa está só encostada.',
    options: [
      {
        id: 'abrir',
        label: 'Abrir o sarcófago',
        kind: 'ousada',
        outcomes: [
          { weight: 40, effects: [['peca']], text: (q) => `${q} empurrou a tampa e achou uma peça ainda inteira.` },
          { weight: 25, effects: [['ouro']], text: (q) => `${q} abriu o sarcófago: moedas antigas, aos montes.` },
          { weight: 35, effects: [['bencao', 'atk', -0.1]], text: (q) => `Um sopro frio saiu do sarcófago quando ${q} o abriu. Os braços pesaram até o fim da descida.` },
        ],
      },
      { id: 'deixar', label: 'Deixar o morto em paz', kind: 'prudente', outcomes: [nada('O grupo fez silêncio e seguiu.')] },
    ],
  },
  {
    id: 'peregrino',
    biome: null,
    title: 'Um peregrino perdido',
    text: 'Um peregrino magro, de lanterna apagada, pede para ser levado até a saída.',
    options: [
      {
        id: 'levar',
        label: 'Levar o peregrino junto',
        kind: 'ousada',
        outcomes: [
          { weight: 70, effects: [['resgate']], text: () => 'O peregrino seguiu com o grupo. Diz que vai ficar na vila.' },
          { weight: 30, effects: [['vida', -0.15]], text: () => 'Era uma isca: o peregrino sumiu e algo atacou pelas costas.' },
        ],
      },
      {
        id: 'indicar',
        label: 'Indicar o caminho e seguir',
        kind: 'prudente',
        outcomes: [{ weight: 1, effects: [['animo', 5]], text: (q) => `${q} desenhou o caminho no chão. O peregrino agradeceu e foi sozinho.` }],
      },
    ],
  },
  {
    id: 'altar-sangue',
    biome: null,
    title: 'Um altar que pede sangue',
    text: 'Uma bacia de pedra, seca, com uma faca ao lado. Quem chega perto ouve um pedido.',
    options: [
      {
        id: 'oferecer',
        label: 'Oferecer sangue',
        kind: 'ousada',
        outcomes: [
          { weight: 70, effects: [['vida', -0.12], ['bencao', 'atk', 0.1]], text: (q) => `${q} cortou a mão primeiro. O altar bebeu, e as armas pesaram menos.` },
          { weight: 30, effects: [['vida', -0.15]], text: () => 'O altar bebeu e não deu nada em troca.' },
        ],
      },
      { id: 'recusar', label: 'Recusar e seguir', kind: 'prudente', outcomes: [nada('O pedido ficou ecoando atrás do grupo.')] },
      {
        id: 'quebrar',
        label: 'Quebrar o altar',
        kind: 'outra',
        outcomes: [
          { weight: 50, effects: [['ouro']], text: (q) => `${q} quebrou o altar: havia moedas na base.` },
          { weight: 50, effects: [['bencao', 'def', -0.1]], text: () => 'O altar quebrou, e o grupo sentiu a pele mais fina até o fim da descida.' },
        ],
      },
    ],
  },
  {
    id: 'espelho',
    biome: null,
    title: 'Um espelho que mostra os mortos',
    text: 'Um espelho de moldura negra. No reflexo, atrás do grupo, está alguém que o abismo levou.',
    options: [
      {
        id: 'olhar',
        label: 'Olhar de perto',
        kind: 'ousada',
        outcomes: [
          { weight: 50, effects: [['traco'], ['animo', 10]], text: (q) => `${q} conversou com o reflexo e saiu de lá mais leve.` },
          { weight: 50, effects: [['animo', -15]], text: (q) => `${q} não conseguiu tirar os olhos do espelho. O grupo seguiu abalado.` },
        ],
      },
      { id: 'cobrir', label: 'Cobrir o espelho', kind: 'prudente', outcomes: [nada('Cobriram o espelho com uma capa e passaram rápido.')] },
    ],
  },
  // ── Catacumbas ──
  {
    id: 'urnas',
    biome: 0,
    title: 'Urnas que sussurram',
    text: 'Fileiras de urnas sussurram nomes, cada vez mais alto, quando alguém passa.',
    options: [
      {
        id: 'abrir',
        label: 'Abrir as urnas',
        kind: 'ousada',
        outcomes: [
          { weight: 40, effects: [['ouro']], text: (q) => `${q} achou moedas de prata no meio das cinzas.` },
          { weight: 30, effects: [['bencao', 'def', -0.1]], text: () => 'As cinzas grudaram na pele. O frio não passou mais.' },
          { weight: 30, effects: [['adquire', 'supersticioso']], text: (q) => `${q} ouviu o próprio nome numa das urnas e nunca mais foi o mesmo.` },
        ],
      },
      { id: 'deixar', label: 'Deixar as urnas', kind: 'prudente', outcomes: [nada('Passaram sem olhar para os lados.')] },
    ],
  },
  {
    id: 'coveiro',
    biome: 0,
    title: 'Um coveiro sem rosto',
    text: 'Um coveiro sem rosto oferece uma pá e aponta para o chão.',
    options: [
      {
        id: 'cavar',
        label: 'Aceitar a pá e cavar',
        kind: 'ousada',
        outcomes: [
          { weight: 50, effects: [['peca']], text: (q) => `${q} cavou e achou uma peça enterrada com alguém.` },
          { weight: 50, effects: [['vida', -0.1]], text: () => 'A terra cedeu; o grupo saiu do buraco arranhado.' },
        ],
      },
      { id: 'recusar', label: 'Recusar a pá', kind: 'prudente', outcomes: [nada('O coveiro voltou a cavar sozinho.')] },
    ],
  },
  // ── Minas Inundadas ──
  {
    id: 'vagonete',
    biome: 1,
    title: 'Um vagonete cheio de minério',
    text: 'Um vagonete parado nos trilhos, cheio de minério brilhante, à beira da água.',
    options: [
      {
        id: 'empurrar',
        label: 'Empurrar até o fim do trilho',
        kind: 'ousada',
        outcomes: [
          { weight: 60, effects: [['ouro']], text: (q) => `${q} empurrou o vagonete até um esconderijo de mineiro.` },
          { weight: 40, effects: [['vida', -0.15]], text: () => 'O trilho cedeu na água, e o vagonete arrastou o grupo junto.' },
        ],
      },
      { id: 'deixar', label: 'Deixar o vagonete', kind: 'prudente', outcomes: [nada('Ninguém quis saber de onde veio o minério.')] },
    ],
  },
  {
    id: 'mineiro-preso',
    biome: 1,
    title: 'Um mineiro preso nos escombros',
    text: 'Debaixo de uma viga caída, um mineiro ainda respira.',
    options: [
      {
        id: 'cavar',
        label: 'Cavar até ele',
        kind: 'ousada',
        outcomes: [
          { weight: 70, effects: [['resgate']], text: (q) => `${q} tirou o mineiro dos escombros. Ele vai seguir o grupo até a vila.` },
          { weight: 30, effects: [['vida', -0.15]], text: () => 'O teto desabou de novo. Ninguém conseguiu chegar até ele.' },
        ],
      },
      {
        id: 'marcar',
        label: 'Marcar o lugar e seguir',
        kind: 'prudente',
        outcomes: [{ weight: 1, effects: [['animo', -5]], text: () => 'Marcaram a viga com giz. O grupo seguiu calado.' }],
      },
    ],
  },
  // ── Jardim de Fungos ──
  {
    id: 'cogumelos',
    biome: 2,
    title: 'Cogumelos que cheiram a pão',
    text: 'Cogumelos que brilham devagar e cheiram a pão quente.',
    options: [
      {
        id: 'comer',
        label: 'Comer os cogumelos',
        kind: 'ousada',
        outcomes: [
          { weight: 50, effects: [['vida', 0.3]], text: (q) => `${q} provou primeiro. Estavam bons, e as feridas fecharam.` },
          { weight: 50, effects: [['bencao', 'atk', -0.1]], text: () => 'O estômago do grupo revirou até o fim da descida.' },
        ],
      },
      { id: 'deixar', label: 'Não tocar em nada', kind: 'prudente', outcomes: [nada('Seguiram com fome.')] },
    ],
  },
  {
    id: 'jardineiro',
    biome: 2,
    title: 'Um jardineiro de musgo',
    text: 'Uma figura de musgo cuida de flores que não deviam existir aqui embaixo.',
    options: [
      {
        id: 'flor',
        label: 'Pedir uma flor',
        kind: 'ousada',
        outcomes: [
          { weight: 60, effects: [['bencao', 'def', 0.1]], text: (q) => `O jardineiro deu uma flor a ${q}. A pele do grupo endureceu como casca.` },
          { weight: 40, effects: [['vida', -0.1]], text: () => 'A flor soltou esporos na cara de todos.' },
        ],
      },
      {
        id: 'silencio',
        label: 'Passar em silêncio',
        kind: 'prudente',
        outcomes: [{ weight: 1, effects: [['animo', 5]], text: () => 'Passaram em silêncio, e o jardineiro acenou.' }],
      },
    ],
  },
  // ── Cidade Afogada ──
  {
    id: 'sino-submerso',
    biome: 3,
    title: 'Um sino debaixo da água',
    text: 'Debaixo da água parada, um sino toca sozinho.',
    options: [
      {
        id: 'mergulhar',
        label: 'Mergulhar até o sino',
        kind: 'ousada',
        outcomes: [
          { weight: 50, effects: [['peca']], text: (q) => `${q} mergulhou e voltou com uma peça presa no sino.` },
          { weight: 50, effects: [['vida', -0.15]], text: (q) => `${q} quase não voltou do mergulho.` },
        ],
      },
      { id: 'tapar', label: 'Tapar os ouvidos e seguir', kind: 'prudente', outcomes: [nada('O sino tocou até a sala seguinte.')] },
    ],
  },
  {
    id: 'velas-afogadas',
    biome: 3,
    title: 'Velas acesas debaixo da água',
    text: 'Um altar de coral com velas que queimam debaixo da água.',
    options: [
      {
        id: 'rezar',
        label: 'Rezar com os afogados',
        kind: 'ousada',
        outcomes: [
          { weight: 60, effects: [['bencao', 'atk', 0.1]], text: (q) => `${q} rezou em voz alta, e as velas cresceram.` },
          { weight: 40, effects: [['animo', -10]], text: () => 'As vozes que responderam não eram de gente.' },
        ],
      },
      { id: 'seguir', label: 'Seguir sem rezar', kind: 'prudente', outcomes: [nada('As velas se apagaram uma a uma atrás do grupo.')] },
    ],
  },
  // ── Forja Abissal ──
  {
    id: 'bigorna',
    biome: 4,
    title: 'Uma bigorna ainda quente',
    text: 'Uma bigorna em brasa, com um martelo encostado, esperando alguém.',
    options: [
      {
        id: 'forjar',
        label: 'Afiar as armas na bigorna',
        kind: 'ousada',
        outcomes: [
          { weight: 60, effects: [['bencao', 'atk', 0.1]], text: (q) => `${q} bateu o martelo três vezes. As lâminas saíram melhores.` },
          { weight: 40, effects: [['vida', -0.1]], text: () => 'A bigorna cuspiu brasa em todo mundo.' },
        ],
      },
      { id: 'deixar', label: 'Deixar o fogo', kind: 'prudente', outcomes: [nada('O martelo ficou esperando outro grupo.')] },
    ],
  },
  {
    id: 'acorrentado',
    biome: 4,
    title: 'Um acorrentado da forja',
    text: 'Um escravo da forja, acorrentado, ainda respira e pede ajuda.',
    options: [
      {
        id: 'libertar',
        label: 'Quebrar as correntes',
        kind: 'ousada',
        outcomes: [
          { weight: 60, effects: [['resgate']], text: (q) => `${q} quebrou as correntes. O homem vai seguir o grupo até a vila.` },
          { weight: 40, effects: [['vida', -0.15]], text: () => 'Era uma armadilha: as correntes estavam presas a algo maior.' },
        ],
      },
      { id: 'seguir', label: 'Seguir em frente', kind: 'prudente', outcomes: [{ weight: 1, effects: [['animo', -5]], text: () => 'Os gritos seguiram o grupo por muito tempo.' }] },
    ],
  },
  // ── Coração do Abismo ──
  {
    id: 'olho',
    biome: 5,
    title: 'Um olho na parede',
    text: 'Um olho do tamanho de uma porta se abre na parede e espera.',
    options: [
      {
        id: 'encarar',
        label: 'Encarar o olho',
        kind: 'ousada',
        outcomes: [
          { weight: 50, effects: [['traco'], ['animo', 10]], text: (q) => `${q} encarou o olho até ele piscar.` },
          { weight: 50, effects: [['animo', -20]], text: (q) => `${q} viu alguma coisa no olho e não quis contar o quê.` },
        ],
      },
      { id: 'baixar', label: 'Baixar a cabeça e passar', kind: 'prudente', outcomes: [nada('O olho acompanhou o grupo até a porta.')] },
    ],
  },
  {
    id: 'voz',
    biome: 5,
    title: 'Uma voz que sabe os nomes',
    text: 'Uma voz chama cada herói pelo nome, com a voz de alguém que ele ama.',
    options: [
      {
        id: 'responder',
        label: 'Responder à voz',
        kind: 'ousada',
        outcomes: [
          { weight: 40, effects: [['bencao', 'def', 0.1]], text: (q) => `${q} respondeu, e a voz prometeu proteger o grupo.` },
          { weight: 60, effects: [['bencao', 'atk', -0.1]], text: () => 'A voz riu, e as mãos do grupo tremeram até o fim da descida.' },
        ],
      },
      { id: 'calar', label: 'Seguir calado', kind: 'prudente', outcomes: [nada('Ninguém respondeu. A voz se calou.')] },
    ],
  },
  // ── Colmeia Pálida ──
  {
    id: 'favo',
    biome: 6,
    title: 'Um favo de mel pálido',
    text: 'Um favo pálido escorre pela parede, e o mel é quase transparente.',
    options: [
      {
        id: 'provar',
        label: 'Provar o mel',
        kind: 'ousada',
        outcomes: [
          { weight: 60, effects: [['vida', 0.3]], text: (q) => `${q} provou o mel. As feridas do grupo fecharam.` },
          { weight: 40, effects: [['bencao', 'def', -0.1]], text: () => 'O mel deixou a pele mole como cera.' },
        ],
      },
      { id: 'deixar', label: 'Não tocar', kind: 'prudente', outcomes: [nada('O zumbido acompanhou o grupo.')] },
    ],
  },
  {
    id: 'casulo',
    biome: 6,
    title: 'Alguém dentro de um casulo',
    text: 'Dentro de um casulo grudado no teto, alguém se mexe.',
    options: [
      {
        id: 'abrir',
        label: 'Abrir o casulo',
        kind: 'ousada',
        outcomes: [
          { weight: 60, effects: [['resgate']], text: (q) => `${q} cortou o casulo. Era gente, viva e assustada.` },
          { weight: 40, effects: [['vida', -0.15]], text: () => 'Do casulo saiu outra coisa.' },
        ],
      },
      { id: 'queimar', label: 'Queimar o casulo', kind: 'prudente', outcomes: [{ weight: 1, effects: [['animo', -5]], text: () => 'O casulo queimou em silêncio.' }] },
    ],
  },
  // ── Fossa Cantante ──
  {
    id: 'poco',
    biome: 7,
    title: 'Um poço que canta',
    text: 'Um poço canta uma canção antiga, que alguns do grupo juram conhecer.',
    options: [
      {
        id: 'balde',
        label: 'Descer o balde',
        kind: 'ousada',
        outcomes: [
          { weight: 50, effects: [['peca']], text: (q) => `${q} puxou o balde: veio uma peça no lugar da água.` },
          { weight: 50, effects: [['animo', -15]], text: () => 'A canção ficou na cabeça de todos até a volta.' },
        ],
      },
      { id: 'tapar', label: 'Tapar os ouvidos', kind: 'prudente', outcomes: [nada('Passaram com as mãos nos ouvidos.')] },
    ],
  },
  {
    id: 'concha',
    biome: 7,
    title: 'Uma concha enorme',
    text: 'Uma concha do tamanho de uma mesa, entreaberta, com um brilho dentro.',
    options: [
      {
        id: 'abrir',
        label: 'Abrir a concha',
        kind: 'ousada',
        outcomes: [
          { weight: 60, effects: [['ouro']], text: (q) => `${q} abriu a concha: pérolas o bastante para encher um saco.` },
          { weight: 40, effects: [['vida', -0.15]], text: (q) => `A concha fechou no braço de ${q}.` },
        ],
      },
      { id: 'deixar', label: 'Deixar a concha', kind: 'prudente', outcomes: [nada('A concha se fechou devagar.')] },
    ],
  },
  // ── Cidadela de Engrenagens ──
  {
    id: 'engrenagem',
    biome: 8,
    title: 'Uma engrenagem parada',
    text: 'Uma engrenagem enorme parou, e a cidadela inteira range de dor.',
    options: [
      {
        id: 'consertar',
        label: 'Destravar a engrenagem',
        kind: 'ousada',
        outcomes: [
          { weight: 50, effects: [['bencao', 'def', 0.1]], text: (q) => `${q} destravou a engrenagem. As portas da cidadela se abriram por um tempo.` },
          { weight: 50, effects: [['vida', -0.1]], text: () => 'A engrenagem voltou com tudo e pegou quem estava perto.' },
        ],
      },
      { id: 'seguir', label: 'Seguir em frente', kind: 'prudente', outcomes: [nada('O rangido acompanhou o grupo.')] },
    ],
  },
  {
    id: 'automato',
    biome: 8,
    title: 'Um autômato quebrado',
    text: 'Um autômato quebrado repete a mesma frase sem parar.',
    options: [
      {
        id: 'desmontar',
        label: 'Desmontar o autômato',
        kind: 'ousada',
        outcomes: [
          { weight: 60, effects: [['peca']], text: (q) => `${q} desmontou o autômato e achou uma peça bem forjada no peito dele.` },
          { weight: 40, effects: [['bencao', 'atk', -0.1]], text: () => 'O autômato soltou uma descarga antes de parar.' },
        ],
      },
      {
        id: 'ouvir',
        label: 'Ouvir a frase até o fim',
        kind: 'prudente',
        outcomes: [{ weight: 1, effects: [['traco']], text: (q) => `${q} ouviu a frase inteira e ficou pensativo o resto do caminho.` }],
      },
    ],
  },
  // ── Deserto de Ossos ──
  {
    id: 'ampulheta',
    biome: 9,
    title: 'Uma ampulheta de ossos',
    text: 'Uma ampulheta de ossos moídos marca um tempo que não passa.',
    options: [
      {
        id: 'virar',
        label: 'Virar a ampulheta',
        kind: 'ousada',
        outcomes: [
          { weight: 50, effects: [['vida', 0.3]], text: (q) => `${q} virou a ampulheta, e as feridas voltaram no tempo.` },
          { weight: 50, effects: [['vida', -0.15]], text: () => 'O tempo correu para o lado errado.' },
        ],
      },
      { id: 'deixar', label: 'Deixar como está', kind: 'prudente', outcomes: [nada('A areia continuou parada.')] },
    ],
  },
  {
    id: 'caravana',
    biome: 9,
    title: 'Os restos de uma caravana',
    text: 'Os restos de uma caravana na areia, e um sobrevivente com sede.',
    options: [
      {
        id: 'agua',
        label: 'Dividir a água',
        kind: 'ousada',
        outcomes: [
          { weight: 60, effects: [['resgate']], text: (q) => `${q} dividiu a água. O sobrevivente vai seguir o grupo até a vila.` },
          { weight: 40, effects: [['vida', -0.1]], text: () => 'A água acabou, e a sede pegou o grupo também.' },
        ],
      },
      { id: 'seguir', label: 'Seguir viagem', kind: 'prudente', outcomes: [{ weight: 1, effects: [['animo', -5]], text: () => 'Ninguém olhou para trás.' }] },
    ],
  },
];

export const ENCOUNTER_BY_ID: ReadonlyMap<string, EncounterDef> = new Map(ENCOUNTERS.map((e) => [e.id, e]));
