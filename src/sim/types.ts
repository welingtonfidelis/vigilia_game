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
export type EarnKind = 'saque' | 'imposto' | 'taverna' | 'descanso' | 'oferenda' | 'forja' | 'treino' | 'cura' | 'venda' | 'bancada' | 'provisao' | 'reliquia';

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
  | 'evento';

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
  kind: 'chefe' | 'ultimoDePe' | 'conquista' | 'matador';
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
  };
  death: { tick: number; where: string; by: string } | null;
  /** Lesão em tratamento (não desce enquanto houver). */
  injury: Injury | null;
  /** Cicatrizes permanentes. */
  scars: InjuryKind[];
  partnerId: number | null;
  /** Pais, quando o herói nasceu na vila. */
  parents: number[];
  retiredRole: RetiredRole | null;
  /** Último dia em que conversou com o prefeito (uma conversa por dia). */
  lastTalkDay: number;
  /** Escrito na lápide quando morre. */
  epitaph: string | null;
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

export type EnemyTag = 'backline' | 'swarm' | 'boss' | 'guardian' | 'risen';
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
  | 'armadilha';

export interface Room {
  kind: RoomKind;
  cleared: boolean;
  remainsOf: number | null;
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
  outcome: PartyOutcome | null;
  startedTick: number;
  /** O quanto o grupo se achava capaz ao descer (1 = no limite). */
  confidence: number;
  moments: string[];
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
  bossKills: { level: number; day: number }[];
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
}
