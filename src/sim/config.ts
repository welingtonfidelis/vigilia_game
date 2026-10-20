// Escala de tempo: 1 tick = 0,1 s de jogo em velocidade 1×.
export const TICKS_PER_SECOND = 10;
export const TICKS_PER_HOUR = 20; // 1 hora do jogo = 2 s em 1×
export const HOURS_PER_DAY = 24;
export const TICKS_PER_DAY = TICKS_PER_HOUR * HOURS_PER_DAY; // 48 s em 1×
export const DAYS_PER_SEASON = 10;
export const SEASONS = ['Primavera', 'Verão', 'Outono', 'Inverno'] as const;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS.length; // ~32 min em 1×
export const START_HOUR = 8;

export const SAVE_VERSION = 3;

/** Números de balanceamento. Tudo que o balanceador mexe mora aqui. */
export const BALANCE = {
  // Heróis
  levelHpGrowth: 0.11,
  levelAtkGrowth: 0.11,
  levelDefGrowth: 0.05,
  weaponAtkPerTier: 0.15,
  armorHpPerTier: 0.12,
  armorDefPerTier: 6,
  xpBase: 20,
  xpExp: 1.6,
  baseFleeThreshold: 15,
  baseMorale: 60,
  startLoyalty: 50,
  veteranExpeditions: 40,
  hiddenTraitRevealExpeditions: 12,
  retireAge: 50,
  declineAge: 45,

  // Vila
  needDecayPerHour: { energy: 1.2, fun: 1.0, faith: 0.6 },
  passiveRegenPerHour: 0.01,
  moraleDriftPerHour: 2,
  leaveAfterLowDays: 4,

  // Economia
  startTreasury: 120,
  lootTax: 0.2,
  citizenTaxPerDay: 0.3,
  upkeepPerLevelPerDay: 1.5,
  /** Pensão de cada aposentado por dia: o tesouro paga quem pendurou as armas. */
  pensionPerRetiredPerDay: 1.2,
  /** Festa na praça: o tesouro vira ânimo, lealdade e reputação. */
  festivalBaseCost: 120,
  festivalCostPerCitizen: 8,
  festivalMorale: 14,
  festivalLoyalty: 4,
  festivalReputation: 4,
  festivalCooldownDays: 10,
  /** Ofertas no templo: quem tem muito ouro deixa uma parte no altar. */
  templeTithe: 0.08,
  templeTitheFrom: 100,
  startPopulation: 10,
  populationPerBuildingLevel: 6,
  hornBaseCost: 25,
  hornCostGrowth: 0.1,
  hornMaxCost: 100,
  hornCooldownDays: 2,
  hornRecruits: 3,
  gearBasePrice: 25,
  gearPriceGrowth: 1.8,
  gearMargin: 0.3,
  drinkPrice: 3,
  trainPrice: 4,
  donation: 2,

  // Masmorra
  floorsPerAct: 4,
  floorPowerGrowth: 0.18,
  descendHours: 2,
  descendHoursPerFloor: 0.75,
  roomWalkTicks: 30,
  corruptionStart: 30,
  corruptionPerDay: 2,
  corruptionPerRoom: 1,
  corruptionPerConquest: 10,
  corruptionStatDivisor: 250,
  goldPerEnemy: 2,
  xpPerEnemy: 10,
  materialChance: 0.3,

  // Combate
  /** O grupo se acha mais capaz do que é: é o que faz o abismo cobrar caro. */
  confidenceBias: 1.15,
  /** Vida média do grupo em que se decide continuar (expedição) e recuar (combate). */
  continueHp: { cautelosa: 0.6, equilibrada: 0.45, agressiva: 0.3 },
  retreatHp: { cautelosa: 0.45, equilibrada: 0.3, agressiva: 0.15 },
  enrageTicks: 450,
  bossEnrageTicks: 900,
  hardCapTicks: 1800,
  enrageDamagePerSecond: 0.04,
  enrageHealMult: 0.5,
  partingStrikeChance: 0.5,
  healMult: 2.2,
  healThreshold: 0.75,
  tauntChance: 0.65,
  critMult: 1.8,

  // Pessoas (M2)
  mayorEnergy: 4,
  talkLoyalty: 6,
  speechMorale: 12,
  consoleGrief: 35,
  giftPrice: { bebida: 10, reliquia: 40 },
  injuryHpFrac: 0.15,
  injuryChance: 0.45,
  injuryDays: [8, 25],
  scarChance: 0.35,
  marriageBond: 80,
  marriageChancePerSeason: 0.25,
  birthChancePerSeason: 0.08,
  comingOfAgeYears: 16,
  oldAgeYears: 70,
  oldAgeDeathChance: 0.25,
  roleCap: 2,
} as const;
