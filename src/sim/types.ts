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
  | 'termas';

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
  /** Tier da arma herdada. */
  heirloom: number;
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
  gear: { weapon: number; armor: number };
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
}

export type RoomKind = 'matilha' | 'elite' | 'bau' | 'santuario' | 'vazia' | 'prisioneiro' | 'restos' | 'chefe';

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
  loot: { gold: number; materials: Partial<Record<MaterialId, number>>; xp: number };
  contractId: number | null;
  rescued: number;
  dead: number[];
  recallRequested: boolean;
  outcome: PartyOutcome | null;
  startedTick: number;
  /** O quanto o grupo se achava capaz ao descer (1 = no limite). */
  confidence: number;
  moments: string[];
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
}

export interface Contract {
  id: number;
  act: number;
  floor: number;
  reward: number;
  postedTick: number;
  takenBy: number | null;
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

export interface World {
  version: number;
  seed: number;
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
