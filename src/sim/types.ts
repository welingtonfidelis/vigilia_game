// Estado do mundo: só dados puros (JSON-serializáveis). Nada de classes,
// Map ou funções aqui; o save é um JSON.stringify do World.

import type { RngState } from './rng.ts';

export type Gender = 'm' | 'f';
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type ClassId = 'guardiao' | 'clerigo' | 'selvagem' | 'lanceiro' | 'piromante' | 'arqueiro';
export type Role = 'tank' | 'healer' | 'melee' | 'bruiser' | 'aoe' | 'ranged';
export type TraitId =
  | 'covarde'
  | 'bravo'
  | 'vingativo'
  | 'ganancioso'
  | 'leal'
  | 'curioso'
  | 'beberrao'
  | 'devoto'
  | 'supersticioso'
  | 'sociavel'
  | 'veterano'
  | 'traumatizado'
  | 'marcado';
export type BuildingId = 'taverna' | 'estalagem' | 'ferreiro' | 'templo' | 'guilda' | 'campo' | 'casa';
export type MaterialId = 'ossos' | 'ferroNegro' | 'esporos' | 'perolas' | 'brasas' | 'almas';
/** Regra especial de uma dimensão (src/data/rules.ts). Sem regra nenhuma, é a Calmaria. */
export type DimRuleId = 'nevoa' | 'mare' | 'esporos' | 'calor' | 'silencio' | 'ganancia' | 'luaSangue' | 'ecos';
export type Doctrine = 'cautelosa' | 'equilibrada' | 'agressiva';
export type HeroStatus = 'town' | 'expedition' | 'dead' | 'left' | 'retired';

export type ActivityKind =
  | 'chegando'
  | 'descansar'
  | 'beber'
  | 'rezar'
  | 'comprar'
  | 'treinar'
  | 'tumulo'
  | 'socializar'
  | 'vagar'
  | 'aguardar'
  /** Tratando uma lesão (na Casa de cura, ou na estalagem se ela não existir). */
  | 'tratar'
  /** Tomando banho na fonte termal: vida, ânimo e luto. */
  | 'termas'
  /** Na bancada do joalheiro, pagando para encantar, reforjar ou polir uma peça. */
  | 'joias';

export type InjuryKind = 'braco' | 'perna' | 'olho' | 'costelas';

export interface Injury {
  kind: InjuryKind;
  /** Dias que faltam para sarar (pode ser fracionário). */
  daysLeft: number;
  total: number;
}

/** O que um herói aposentado faz na vila. */
export type RetiredRole = 'mentor' | 'ferreiro' | 'contador' | 'curandeiro';

/** Ofícios dos moradores que aparecem na vila. */
export type CitizenJob = 'lavrador' | 'pedreiro' | 'copeiro' | 'ferreiro' | 'acolito' | 'guarda';

/** Políticas permanentes do prefeito (M3). */
export type DecreeId = 'taxa-guerra' | 'toque-recolher' | 'funeral-honras';

/** Eventos sazonais do M3. */
export type SeasonalEventId = 'caravana' | 'festival-colheita' | 'cobrador' | 'peste' | 'eclipse' | 'visita-lendaria' | 'tempestade' | 'geada';

export interface PendingEvent {
  id: SeasonalEventId;
  year: number;
  season: number;
  tick: number;
}

/** Morador nomeado da vila. A população total continua em Town.population. */
export interface Citizen {
  id: number;
  name: string;
  gender: Gender;
  job: CitizenJob;
  happiness: number;
  workplace: BuildingId | null;
  arrivedDay: number;
}

export type RaidOutcome = 'repelido' | 'custoso' | 'saque';

/** Relatório de uma incursão noturna. */
/** De onde vem o ouro do tesouro (métrica do balanceador). */
export type EarnKind = 'saque' | 'imposto' | 'taverna' | 'descanso' | 'oferenda' | 'forja' | 'treino' | 'cura' | 'venda' | 'bancada' | 'provisao' | 'reliquia' | 'audiencia';

/** Para onde vai o ouro do tesouro (métrica do balanceador). */
export type SpendKind =
  | 'predio'
  | 'conserto'
  | 'manutencao'
  | 'pensao'
  | 'guarda'
  | 'decreto'
  | 'berrante'
  | 'forja'
  | 'contrato'
  | 'amuleto'
  | 'fragmento'
  | 'expansao'
  | 'mecenato'
  | 'presente'
  | 'festa'
  | 'funeral'
  | 'evento'
  /** Respostas das audiências e lápides dos desejos (M6 F1): valores simbólicos. */
  | 'audiencia'
  /** Enfeites da vila (M6 F6): ouro simbólico. */
  | 'enfeite';

export interface RaidHit {
  id: BuildingId;
  damage: number;
  collapsed: boolean;
}

export interface Raid {
  day: number;
  /** Nível do abismo na noite da incursão. */
  level: number;
  pressure: number;
  /** De que bioma vieram os monstros (o de uma passagem aberta). */
  biome: number;
  power: number;
  defense: number;
  outcome: RaidOutcome;
  /** Prédios desgastados pela incursão (M5 F4); `collapsed` = perdeu um nível. */
  hits: RaidHit[];
  citizenLoss: number;
  goldLost: number;
  injuries: number;
}

export type GiftKind = 'bebida' | 'reliquia' | 'arma';

// ── Itens (M4) ────────────────────────────────────────────────────────────

export type ItemSlot = 'weapon' | 'armor' | 'amulet';
export type Rarity = 'comum' | 'rara' | 'epica' | 'lendaria';
export type ItemAffix = 'afiado' | 'perfurante' | 'guardiao' | 'robusto' | 'sereno' | 'agil' | 'sanguessuga' | 'afortunado';

/** Uma peça de equipamento. O nome de tela sai do encaixe, do afixo e da classe de quem usa. */
export interface Item {
  id: number;
  slot: ItemSlot;
  rarity: Rarity;
  /** Qualidade base (arma: ataque; armadura: vida e defesa). O amuleto não tem tier (0). */
  tier: number;
  affixes: ItemAffix[];
  /** Material de que foi feito, quando veio da forja ou do abismo. */
  material: MaterialId | null;
  /** Nome próprio das lendárias. */
  title: string | null;
  /** De onde veio: "forjado na vila no ano 2", "achado no andar 3 das Catacumbas". */
  origin: string;
  /** Quem já usou, em ordem. */
  owners: number[];
  createdTick: number;
  /** Quantas vezes passou pela bancada do joalheiro. */
  enchants?: number;
  /** O que aconteceu com a peça depois de feita ("encantada por Mira no ano 9"). */
  history?: string[];
}

/** Obras que os heróis pagam na vila (mecenato, M4). */
export type WorkId = 'estatua' | 'vitral' | 'fonte' | 'muro';

export interface TownWork {
  level: number;
  /** Quem pagou cada nível, em ordem. */
  patrons: { heroId: number; level: number; tick: number; price: number }[];
}

/** Serviços da bancada do joalheiro. */
export type BenchService = 'encantar' | 'reforjar' | 'polir';

export interface BenchVisit {
  tick: number;
  heroId: number;
  service: BenchService;
  itemId: number;
  price: number;
}

/** Encomenda na forja: sai pronta no arsenal em `readyTick`. */
export interface ForgeOrder {
  id: number;
  slot: ItemSlot;
  material: MaterialId;
  rarity: 'rara' | 'epica';
  tier: number;
  readyTick: number;
}

/** Especializações de nível 3 dos prédios. */
export type SpecId =
  | 'cervejaria'
  | 'apostas'
  | 'luxo'
  | 'dormitorio'
  | 'laminas'
  | 'couracas'
  | 'luz'
  | 'penitencia'
  | 'mercenaria'
  | 'ordem'
  | 'disciplina'
  | 'arena'
  | 'cirurgia'
  | 'ervas';

/** Filho de um casal da vila; vira herói aos 16 anos. */
export interface Child {
  id: number;
  name: string;
  gender: Gender;
  parents: [number, number];
  bornDay: number;
  /** Traço herdado de um dos pais. */
  trait: TraitId;
  classId: ClassId;
  /** Peça herdada dos pais (null = nenhuma). */
  heirloom: Item | null;
  /** Treinou no campo por decisão do prefeito (audiência): chega à maioridade com um nível a mais. */
  apprentice?: boolean;
  /** Casa (M6 F5) em que nasceu: leva o nome dela quando pega em armas. */
  houseId?: number;
}

export interface Activity {
  kind: ActivityKind;
  startedAt: number;
  endsAt: number;
  targetId?: number;
}

export interface HeroTrait {
  id: TraitId;
  revealed: boolean;
}

export interface Deed {
  tick: number;
  kind: 'chefe' | 'ultimoDePe' | 'conquista' | 'matador' | 'desejo' | 'nemesis' | 'torneio';
  text: string;
}

export interface Hero {
  id: number;
  name: string;
  gender: Gender;
  classId: ClassId;
  rank: Rank;
  level: number;
  xp: number;
  bornDay: number;
  arrivedDay: number;
  traits: HeroTrait[];
  status: HeroStatus;
  hp: number;
  morale: number;
  loyalty: number;
  needs: { energy: number; fun: number; faith: number };
  gold: number;
  /** Tier da arma e da armadura em uso (espelha `items`; os ecos dos mortos usam este número). */
  gear: { weapon: number; armor: number };
  /** Peças equipadas. */
  items: Record<ItemSlot, Item | null>;
  grief: number;
  griefFor: number | null;
  vengeful: boolean;
  activity: Activity | null;
  lfgSince: number | null;
  partyId: number | null;
  lowMoraleDays: number;
  deeds: Deed[];
  stats: {
    expeditions: number;
    kills: number;
    floorsConquered: number;
    bossKills: number;
    fled: number;
    alliesLost: number;
    /** Descidas em que comprou provisões (opcional: saves antigos não têm). */
    provisions?: number;
    /** Torneios vencidos (M6 F4). */
    tournaments?: number;
    /** Incursões repelidas com ele na vila (título Escudo da Vila, M6 F4). */
    defended?: number;
  };
  death: { tick: number; where: string; by: string } | null;
  /** Lesão em tratamento (não desce enquanto houver). */
  injury: Injury | null;
  /** Cicatrizes permanentes. */
  scars: InjuryKind[];
  partnerId: number | null;
  /** Pais, quando o herói nasceu na vila. */
  parents: number[];
  /** Casa da família (M6 F5): quem casa e tem filho funda uma, e os filhos herdam o nome. */
  houseId?: number | null;
  retiredRole: RetiredRole | null;
  /** Último dia em que conversou com o prefeito (uma conversa por dia). */
  lastTalkDay: number;
  /** Escrito na lápide quando morre. */
  epitaph: string | null;
  /** Desejo pessoal em aberto (M6 F1). */
  wish?: Wish | null;
  /** Lápide melhor, paga pelo prefeito a pedido de quem ficou (M6 F1). */
  honoredGrave?: boolean;
  /** Vontade de visitar o túmulo de um velho companheiro, sem luto (o id do morto). */
  visitGrave?: number | null;
  /** Último dia em que visitou um túmulo por lembrança. */
  lastGraveVisit?: number;
}

export type WishId = 'herdeiro' | 'lapide' | 'juntos' | 'padrinho' | 'festa' | 'peca' | 'selar' | 'veterano' | 'superar';

/** Desejo de um herói (M6 F1): o prefeito atende pelo que já existe no jogo. */
export interface Wish {
  id: WishId;
  /** O outro personagem do desejo: o morto, o amigo, o rival, o veterano ou o afilhado. */
  targetId: number | null;
  sinceDay: number;
  untilDay: number;
  /** Desejos de par: o prefeito já conversou com um dos dois neste dia. */
  talkedDay?: number;
  talkedId?: number;
  /** O prefeito conversou com os dois no mesmo dia: eles se procuram para formar grupo. */
  paired?: boolean;
}

export type PostId = 'capitao' | 'mestre' | 'campeao';

/** Torneio da estação (M6 F4): a chave sai de manhã, as lutas acontecem à tarde. */
export interface Tournament {
  day: number;
  /** Tick em que as lutas acontecem (o palpite vale até lá). */
  startTick: number;
  /** Os heróis na ordem da chave (1 contra 2, 3 contra 4…). */
  entrants: number[];
  /** O palpite do prefeito. */
  favorite: number | null;
  /** As lutas, na ordem em que aconteceram (vazio antes da tarde). */
  duels: Duel[];
  championId: number | null;
}

/** Um duelo do torneio: os golpes ficam guardados para a tela rever. */
export interface Duel {
  round: number;
  a: number;
  b: number;
  winner: number;
  maxA: number;
  maxB: number;
  /** Golpes no formato do registro de combate: uid 1 é `a`, uid 2 é `b`. */
  events: CombatEvent[];
}

/** Petição de uma audiência da manhã (M6 F1). */
export interface Petition {
  id: number;
  /** Modelo em src/data/petitions.ts. */
  defId: string;
  /** Quem pede e quem mais aparece: morador, herói (vivo ou morto) ou criança. */
  asker: PetitionPerson;
  other: PetitionPerson | null;
  building: BuildingId | null;
  day: number;
  /** Último dia em que ainda dá para responder. */
  untilDay: number;
}

export interface PetitionPerson {
  kind: 'morador' | 'heroi' | 'crianca';
  id: number;
}

/** O que a vila lembra de uma audiência (para o painel). */
export interface PetitionRecord {
  day: number;
  text: string;
}

export interface EnemyUnitDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  interval: number;
  tags: EnemyTag[];
}

/** `duelo`: o outro herói no duelo do torneio (M6 F6), desenhado como herói do lado de lá. */
export type EnemyTag = 'backline' | 'swarm' | 'boss' | 'guardian' | 'risen' | 'nemesis' | 'duelo';
export type Affix = 'veloz' | 'vampirico' | 'explosivo' | 'couracado' | 'feroz';
export type BossMech = 'invocar' | 'couraca' | 'veneno' | 'maldicao' | 'retaguarda' | 'ecos' | 'colmeia' | 'canto' | 'placas' | 'exercito';

export interface Unit {
  uid: number;
  side: 'hero' | 'enemy';
  heroId: number | null;
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  interval: number;
  cd: number;
  pierce: number;
  crit: number;
  role: Role | null;
  tags: EnemyTag[];
  affixes: Affix[];
  elite: boolean;
  alive: boolean;
  fled: boolean;
  poisonTicks: number;
  poisonDps: number;
  xp: number;
  gold: number;
  material: MaterialId | null;
  /** Fração do dano causado que volta como vida (afixo sanguessuga). */
  lifesteal?: number;
  /** Até este tick o herói fica parado, encantado pelo canto do Coro Submerso. */
  charmedUntil?: number;
  /** O monstro de src/data/biomes.ts por trás da unidade. */
  defId?: string;
  /** Heróis que este monstro matou nesta luta (para virar nêmesis, M6 F2). */
  kills?: number[];
  /** Já tentou fugir na névoa nesta luta. */
  fleeTried?: boolean;
  /** Esta unidade é a nêmesis com este id. */
  nemesisId?: number;
}

export interface Combat {
  units: Unit[];
  ticks: number;
  enraged: boolean;
  isBoss: boolean;
  bossMech: BossMech | null;
  mechCd: number;
  echoesSpawned: boolean;
  nextUid: number;
  /**
   * Últimos golpes e curas, só para a tela animar quem atacou quem. A simulação
   * escreve e nunca lê (não muda resultado). Opcional: saves antigos não têm.
   */
  log?: CombatEvent[];
  /** Contador do registro (o `n` do próximo evento). */
  seq?: number;
  /** O chefe passou de 50% de vida e entrou na segunda fase. */
  phase2?: boolean;
  /** Até este tick as curas rendem metade (silêncio do Arcebispo). */
  silenceUntil?: number;
  /** Placas do Colosso de Ferro-negro: blindagem que absorve o dano antes da vida. */
  plates?: number;
  /** Tick em que as placas voltam (inteiras ou depois de quebradas). */
  platesAt?: number;
}

export interface CombatEvent {
  /** Número sequencial dentro deste combate. */
  n: number;
  /** Tick do combate em que aconteceu. */
  t: number;
  kind: 'hit' | 'heal' | 'blast';
  /** uid de quem agiu e de quem recebeu. */
  from: number;
  to: number;
  amount: number;
  crit: boolean;
  kill: boolean;
}

export type RoomKind =
  | 'matilha'
  | 'elite'
  | 'bau'
  | 'santuario'
  | 'vazia'
  | 'prisioneiro'
  | 'restos'
  /** Guardião da passagem, no último andar: vencê-lo sela a passagem. */
  | 'guardiao'
  /** Senhor do abismo (contrato do amuleto, M5 F2). */
  | 'chefe'
  /** Mercador errante: vende uma peça a quem pagar (ouro do herói). */
  | 'mercador'
  /** Dardos ou espinhos: ferem o grupo se ninguém perceber antes. */
  | 'armadilha'
  /** Encontro (M6 F3): o grupo acha algo, manda um corvo e decide. */
  | 'encontro';

export interface Room {
  kind: RoomKind;
  cleared: boolean;
  remainsOf: number | null;
  /** Sala de encontro (M6 F6): qual foi, para o corredor desenhar o objeto dele. */
  encounter?: string;
}

export type PartyPhase = 'descendo' | 'explorando' | 'combate' | 'voltando';
export type PartyOutcome = 'conquista' | 'retirada' | 'chamado' | 'massacre' | 'cansaco' | 'fuga';

/**
 * Onde um grupo está no abismo: a passagem, o nível e o bioma dela, as regras e o andar.
 * O grupo leva uma cópia: a passagem pode fechar enquanto ele volta para a vila.
 */
export interface Spot {
  passageId: number;
  level: number;
  biome: number;
  rules: DimRuleId[];
  floor: number;
  /** Covil do Senhor deste nível (contrato do amuleto): não é uma passagem. */
  lord?: number;
}

export interface Party extends Spot {
  id: number;
  memberIds: number[];
  startMemberIds: number[];
  phase: PartyPhase;
  phaseEndsAt: number;
  /** true = usa o mapa persistente do andar; false = salas próprias (andar já conquistado). */
  persistent: boolean;
  rooms: Room[];
  roomIndex: number;
  retreating: boolean;
  combat: Combat | null;
  loot: {
    gold: number;
    materials: Partial<Record<MaterialId, number>>;
    xp: number;
    items?: Item[];
    /** Fragmentos de amuleto achados nesta descida (do nível da passagem). */
    fragments?: number;
    /** Peças compradas do mercador nesta expedição (já equipadas). */
    bought?: { heroId: number; itemId: number; price: number }[];
  };
  contractId: number | null;
  /** O grupo abriu a passagem nesta descida (conta para o contrato de passagem nova). */
  opened?: boolean;
  rescued: number;
  dead: number[];
  recallRequested: boolean;
  /** Quem deu o golpe final no Senhor nesta descida (M6 F5, para a estátua do Salão). */
  lordSlayerId?: number;
  outcome: PartyOutcome | null;
  startedTick: number;
  /** O quanto o grupo se achava capaz ao descer (1 = no limite). */
  confidence: number;
  moments: string[];
  /** Nêmesis que este grupo já encontrou nesta descida (aparece uma vez por descida). */
  nemesisMet?: number[];
  /** Encontro em andamento (M6 F3): o grupo espera o conselho do prefeito até `untilTick`. */
  encounter?: { defId: string; untilTick: number; advice: string | null } | null;
  /** Bênçãos e maldições dos encontros até o fim da descida (multiplicam ataque e defesa). */
  boons?: { atk: number; def: number };
  /** Quem levou ração e tochas nesta descida (gasta metade da energia entre as salas). */
  provisioned?: number[];
  /** Quem levou relíquia do templo (foge menos nesta descida). */
  relics?: number[];
}

/** Uma passagem para outra dimensão: o mundo gerado por semente e o que já mudou nele. */
export interface Passage {
  id: number;
  seed: number;
  level: number;
  biome: number;
  rules: DimRuleId[];
  floors: number;
  /** Alguém já entrou: o bioma e as regras aparecem para a vila. */
  discovered: boolean;
  openedDay: number;
  closesDay: number;
  conquered: boolean[];
  /** Mapa persistente de andares ainda não conquistados (salas limpas continuam limpas). */
  maps: (Room[] | null)[];
  /** O guardião caiu: a passagem fecha assim que ninguém mais estiver nela. */
  sealed: boolean;
  /** 0 a 100: sobe todo dia e cai com as salas e os andares limpos nela (monstros mais fortes, salas reocupadas). */
  pressure: number;
}

/** Amuleto montado com 5 fragmentos: abre o covil do Senhor do nível dele. */
export interface Amulet {
  level: number;
  /** Pronto a partir daqui (o joalheiro leva uns dias). */
  readyTick: number;
  /** Um grupo desceu com ele: vitória ou derrota, ele se desfaz. */
  inUse: boolean;
}

/** O abismo da vila: o nível, as passagens abertas (a pressão é de cada uma) e o amuleto. */
export interface AbyssState {
  level: number;
  passages: Passage[];
  /** Fragmentos do nível atual guardados no Cofre. */
  fragments: number;
  amulet: Amulet | null;
  /** Fragmentos do nível atual comprados dos mercadores do abismo (no máximo fragmentBuyMax). */
  bought: number;
  /** Monstros que levaram heróis e fugiram (M6 F2), vivos e caídos, e o contador próprio. */
  nemeses?: Nemesis[];
  nemesisSeq?: number;
  /** O que a guilda ouve sobre a próxima passagem (M6 F2). */
  rumors?: RumorBoard;
}

/** Monstro que levou heróis e saiu vivo da luta (M6 F2). */
export interface Nemesis {
  id: number;
  /** Epíteto que a vila deu ("Garra-Fria"). */
  name: string;
  /** O monstro de sempre por baixo (id e nome do tipo em src/data/biomes.ts). */
  enemyId: string;
  enemyName: string;
  bornDay: number;
  /** Heróis que ela matou: cada um é um degrau (até nemesisMaxStep). */
  victims: number[];
  /** Onde está agora (null = sumiu na névoa até uma passagem nova abrir). */
  passageId: number | null;
  floor: number;
  /** Último dia em que um grupo deu de cara com ela. */
  seenDay: number | null;
  fallen: { day: number; by: number | null } | null;
}

/** Os rumores sobre a próxima passagem; `key` muda a cada passagem aberta (M6 F2). */
export interface RumorBoard {
  key: number;
  level: number;
  list: Rumor[];
  /** O rumor que o prefeito marcou no mapa da guilda (o primeiro, sem escolha). */
  marked: number;
}

export interface Rumor {
  seed: number;
  biome: number;
  /** A regra que o rumor revela (null = nenhuma). */
  rule: DimRuleId | null;
  text: string;
}

export interface Remains {
  heroId: number;
  passageId: number;
  floor: number;
  gold: number;
  /** Peças que ficaram com o morto (voltam com quem achar os restos). */
  items?: Item[];
  /** Fragmentos de amuleto que o grupo carregava quando ninguém voltou. */
  fragments?: number;
}

export interface Contract {
  id: number;
  /** null: abrir uma passagem nova. */
  passageId: number | null;
  floor: number;
  reward: number;
  postedTick: number;
  takenBy: number | null;
  /** Caçada (M6 F2) num andar já conquistado: cumpre quando esta nêmesis cai. */
  nemesisId?: number;
}

export interface ExpansionState {
  /** A floresta ao sul foi limpa e os três lotes estão abertos. */
  cleared: boolean;
  /** Quais dos três lotes de moradia já têm casa. */
  houses: [boolean, boolean, boolean];
}

export type PetSpecies = 'cao' | 'gato';

/** Cão ou gato da vila (enfeite e carinho do prefeito). */
export interface Pet {
  id: number;
  species: PetSpecies;
  /** Pelagem: char/pet/<espécie>/<look>. */
  look: string;
  name: string;
  arrivedDay: number;
  /** Dia em que vai embora (alguns anos depois de chegar). */
  leavesDay: number;
  /** Último dia em que ganhou carinho (−1 = nunca). */
  lastPetDay: number;
  /** Carinhos recebidos. */
  pets: number;
}

export interface Town {
  treasury: number;
  buildings: Record<BuildingId, number>;
  population: number;
  lootTax: number;
  reputation: number;
  doctrine: Doctrine;
  hornReadyDay: number;
  hornUses: number;
  materials: Record<MaterialId, number>;
  arrivals: { at: number; free: boolean }[];
  contracts: Contract[];
  emptySinceDay: number | null;
  /** Energia do prefeito para conversar, presentear, consolar e discursar. Recarrega todo dia. */
  mayorEnergy: number;
  /** Último dia em que o prefeito discursou (um discurso por dia). */
  speechDay: number;
  /** Último dia em que houve festa na praça (−1 = nunca). */
  festivalDay: number;
  /** Acumulador fracionário do crescimento da população. */
  popGrowth: number;
  /** Último dia de incursão (−1 = nunca). */
  lastRaidDay: number;
  /** Decretos ativos (no máximo maxActiveDecrees). */
  decrees: DecreeId[];
  /** Evento sazonal aguardando escolha do prefeito (null = nenhum). */
  event: PendingEvent | null;
  /** Chave `ano:estação` do último evento criado, para não repetir. */
  lastEventKey: string;
  /** Expansão sul: limpeza e casas construídas. */
  expansion: ExpansionState;
  /** Peças sem dono guardadas no cofre (o prefeito presenteia ou vende). */
  arsenal: Item[];
  /** Encomendas na forja. */
  forge: ForgeOrder[];
  /** Especialização escolhida ao chegar no nível 3. */
  specs: Partial<Record<BuildingId, SpecId>>;
  /** Conservação de cada prédio, de 0 a 100 (M5 F4). */
  care: Record<BuildingId, number>;
  /** Consertos em andamento: o tick em que cada obra termina. */
  repairs: Partial<Record<BuildingId, number>>;
  /** Últimas visitas à bancada do joalheiro (para o painel do ferreiro). */
  bench?: BenchVisit[];
  /** Obras pagas pelos heróis (mecenato). */
  works?: Partial<Record<WorkId, TownWork>>;
  /** Cães e gatos que vivem na vila agora (2 no primeiro ano, 3 depois). */
  pets?: Pet[];
  /** Último id de bicho dado (contador próprio, fora do nextId do mundo). */
  petSeq?: number;
  /** Audiências da manhã em aberto, o contador próprio delas e as últimas resolvidas (M6 F1). */
  petitions?: Petition[];
  petitionSeq?: number;
  petitionLog?: PetitionRecord[];
  /** Dia de folga dado a um guarda numa audiência: ele não defende naquela noite. */
  guardLeaveDay?: number;
  /** Cargos da vila (M6 F4): o herói (ou aposentado) em cada um. */
  posts?: Partial<Record<PostId, number>>;
  /** O torneio da estação (o de agora ou o último). */
  tournament?: Tournament | null;
  /** Cosmética da vila (M6 F6): estandarte, enfeite de cada ponto, nomes de ruas e o busto do memorial. */
  banner?: Crest;
  decor?: (DecorId | null)[];
  streets?: Partial<Record<StreetId, string>>;
  bust?: number | null;
}

export type ChronicleKind =
  | 'chegada'
  | 'partida'
  | 'retorno'
  | 'morte'
  | 'fuga'
  | 'vinganca'
  | 'conquista'
  /** Passagem aberta, selada ou fechada (M5). */
  | 'passagem'
  /** Fragmentos, montagem e destino do amuleto (M5). */
  | 'amuleto'
  | 'chefe'
  | 'promocao'
  | 'nivel'
  | 'traco'
  | 'luto'
  | 'tumulo'
  | 'restos'
  | 'resgate'
  | 'partiuDaVila'
  | 'dispensa'
  | 'aposentadoria'
  | 'construcao'
  | 'berrante'
  | 'contrato'
  | 'corrupcao'
  | 'decreto'
  | 'evento'
  | 'eco'
  | 'lesao'
  | 'cicatriz'
  | 'casamento'
  | 'nascimento'
  | 'maioridade'
  | 'prefeito'
  | 'funcao'
  | 'vinculo'
  | 'festival'
  | 'doacao'
  | 'cidadao'
  | 'incursao'
  | 'item'
  | 'bicho'
  /** Audiências da manhã e desejos dos heróis (M6 F1). */
  | 'audiencia'
  | 'desejo'
  /** Nêmesis que nasce, aparece e cai (M6 F2). */
  | 'nemesis'
  /** Encontros nas salas e o corvo do grupo (M6 F3). */
  | 'encontro'
  /** Cargos da vila e torneio da estação (M6 F4). */
  | 'cargo'
  | 'torneio'
  /** Casas das famílias (M6 F5): fundação, nome novo e feitos. */
  | 'casa'
  | 'fim';

export interface ChronicleEntry {
  tick: number;
  kind: ChronicleKind;
  heroIds: number[];
  text: string;
}

export interface Metrics {
  recruits: number;
  deaths: number;
  left: number;
  retired: number;
  expeditions: number;
  expeditionsAtDayStart: number;
  outcomes: Record<PartyOutcome, number>;
  fled: number;
  stalemates: number;
  roomsCleared: number;
  floorsConquered: number;
  rankUps: number;
  /** Senhores vencidos (M5 F2). */
  /** Senhores vencidos; quem deu o golpe final e se o grupo voltou inteiro (M6 F5, para as estátuas e o códex). */
  bossKills: { level: number; day: number; slayerId?: number; flawless?: boolean }[];
  /** Contratos do Senhor perdidos (o grupo caiu, fugiu ou recuou e o amuleto se desfez). */
  lordFailures: number;
  passagesOpened: number;
  /** Ouro que entrou no tesouro, e o que saiu em manutenção diária e consertos (M5 F4). */
  treasuryIn: number;
  maintenance: number;
  repairs: number;
  /** Ouro gasto pelo tesouro, por destino, e o que entrou, por origem. */
  spent: Partial<Record<SpendKind, number>>;
  earned?: Partial<Record<EarnKind, number>>;
  passagesSealed: number;
  idleDays: number;
  longestIdleStreak: number;
  idleStreak: number;
  goldLooted: number;
  injuries: number;
  scars: number;
  marriages: number;
  births: number;
  comeOfAge: number;
  oldAgeDeaths: number;
  raids: number;
  citizenDeaths: number;
  citizensLeft: number;
  /** Desfecho das expedições por faixa de confiança (0,25 em 0,25). Calibra a escolha de andar. */
  byConfidence: Record<string, { n: number; deaths: number; wipes: number; conquests: number }>;
  daily: DailySample[];
  /** Audiências da manhã (M6 F1): petições que chegaram, respondidas e vencidas. */
  audiences?: { asked: number; answered: number; expired: number };
  /** Desejos dos heróis (M6 F1): dados, cumpridos e esquecidos. */
  wishes?: { made: number; done: number; failed: number };
  /** Nêmesis (M6 F2): nascidas, encontros, heróis que mataram e caídas. */
  nemeses?: { born: number; met: number; kills: number; fallen: number };
  /** Encontros nas salas (M6 F3): achados, com conselho do prefeito e conselhos seguidos. */
  encounters?: { met: number; advised: number; followed: number };
  /** Torneios (M6 F4): feitos e palpites certos do prefeito. */
  tournaments?: { held: number; guessed: number };
  /** Material do abismo que entrou no Cofre e o que saiu em obras, consertos e encomendas. */
  materialsIn?: Partial<Record<MaterialId, number>>;
  materialsOut?: Partial<Record<MaterialId, number>>;
}

export interface DailySample {
  day: number;
  treasury: number;
  heroGold: number;
  roster: number;
  avgLevel: number;
  deepest: number;
  population: number;
  pressure: number;
  level: number;
  /** Nível médio dos 7 prédios (o construído) e conservação média dos de pé (M5 F4). */
  buildings: number;
  care: number;
}

/** Dificuldade da campanha (multiplicadores em src/data/difficulty.ts). */
export type Difficulty = 'facil' | 'normal' | 'dificil';

export interface World {
  version: number;
  seed: number;
  difficulty: Difficulty;
  rng: RngState;
  tick: number;
  nextId: number;
  heroes: Hero[];
  parties: Party[];
  town: Town;
  abyss: AbyssState;
  bonds: Record<string, number>;
  remains: Remains[];
  chronicle: ChronicleEntry[];
  children: Child[];
  citizens: Citizen[];
  raids: Raid[];
  /** Heróis que fugiram sozinhos neste tick e ainda precisam virar um retorno solo. */
  pendingFugitives: { heroId: number; spot: Spot }[];
  metrics: Metrics;
  endedTick: number | null;
  /** O que a guilda já viu e abateu, para o bestiário do Salão das Lendas (M6 F5). */
  codex?: Codex;
  /** As casas das famílias de heróis (M6 F5) e o contador próprio. */
  houses?: House[];
  houseSeq?: number;
  /** Estátuas do Salão que o prefeito fixou (ids de herói). */
  pinnedStatues?: number[];
}

/** Mistérios do códex: o que não é monstro nem lugar (src/data/codex.ts tem os textos). */
export type MysteryId = 'ecos' | 'nemesis' | 'elites' | 'calmaria' | 'passagens' | 'fragmentos' | 'contrato' | 'retorno';

export interface Codex {
  /** Monstros pelo id: presente = visto; o número é quantos a guilda abateu. */
  monsters: Record<string, number>;
  /** Senhores pelo id do chefe: 1 visto, 2 vencido, 3 vencido sem baixas. */
  lords: Record<string, number>;
  /** Biomas (índice de BIOMES) por onde a guilda já desceu. */
  biomes: number[];
  rules: DimRuleId[];
  /** Nomes próprios das lendárias que já existiram na vila. */
  legendaries: string[];
  mysteries: MysteryId[];
}

export type HouseDeedId = 'tresGeracoes' | 'senhorPorGeracao' | 'vinteAnos';

/** Brasão ou estandarte: índices das cores e do símbolo em src/data/houses.ts. */
export interface Crest {
  field: number;
  charge: number;
  symbol: number;
}

export type DecorId =
  | 'banco'
  | 'lampiao'
  | 'canteiro'
  | 'poco'
  | 'bandeirola'
  | 'arco'
  | 'trofeuNemesis'
  | 'taca'
  | 'estandarteSenhor'
  | 'urna'
  | 'vagonete'
  | 'cogumelo'
  | 'sino'
  | 'bigorna'
  | 'cristal'
  | 'favo'
  | 'concha'
  | 'engrenagem'
  | 'cranio';

export type StreetId = 'praca' | 'estradaCima' | 'estradaBaixo' | 'ruaPortao' | 'ruaTermas';

export interface House {
  id: number;
  /** Sobrenome da família ("Valente"); o prefeito pode trocar. */
  name: string;
  foundedTick: number;
  /** O casal que fundou a casa. */
  founders: [number, number];
  crest: Crest;
  deeds: { id: HouseDeedId; tick: number }[];
}
