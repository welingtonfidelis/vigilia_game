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
export type SeasonalEventId = 'caravana' | 'festival-colheita' | 'cobrador' | 'peste' | 'eclipse' | 'visita-lendaria';

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
export interface Raid {
  day: number;
  act: number;
  corruption: number;
  power: number;
  defense: number;
  outcome: RaidOutcome;
  building: BuildingId | null;
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

export type EnemyTag = 'backline' | 'swarm' | 'boss';
export type Affix = 'veloz' | 'vampirico' | 'explosivo' | 'couracado' | 'feroz';
export type BossMech = 'invocar' | 'couraca' | 'veneno' | 'maldicao' | 'retaguarda' | 'ecos';

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

export interface Party {
  id: number;
  memberIds: number[];
  startMemberIds: number[];
  act: number;
  floor: number;
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
    /** Peças compradas do mercador nesta expedição (já equipadas). */
    bought?: { heroId: number; itemId: number; price: number }[];
  };
  contractId: number | null;
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

export interface ActState {
  unlocked: boolean;
  corruption: number;
  conquered: boolean[];
  /** Mapa persistente de andares ainda não conquistados (salas limpas continuam limpas). */
  maps: (Room[] | null)[];
  bossDefeated: boolean;
}

export interface Remains {
  heroId: number;
  act: number;
  floor: number;
  gold: number;
  /** Peças que ficaram com o morto (voltam com quem achar os restos). */
  items?: Item[];
}

export interface Contract {
  id: number;
  act: number;
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
  bossKills: { act: number; day: number }[];
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
  corruption: number[];
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
  acts: ActState[];
  bonds: Record<string, number>;
  remains: Remains[];
  chronicle: ChronicleEntry[];
  children: Child[];
  citizens: Citizen[];
  raids: Raid[];
  /** Heróis que fugiram sozinhos neste tick e ainda precisam virar um retorno solo. */
  pendingFugitives: { heroId: number; act: number; floor: number }[];
  metrics: Metrics;
  endedTick: number | null;
}
