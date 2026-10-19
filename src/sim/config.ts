// Escala de tempo: 1 tick = 0,1 s de jogo em velocidade 1×.
export const TICKS_PER_SECOND = 10;
export const TICKS_PER_HOUR = 20; // 1 hora do jogo = 2 s em 1×
export const HOURS_PER_DAY = 24;
export const TICKS_PER_DAY = TICKS_PER_HOUR * HOURS_PER_DAY; // 48 s em 1×
export const DAYS_PER_SEASON = 10;
export const SEASONS = ['Primavera', 'Verão', 'Outono', 'Inverno'] as const;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS.length; // ~32 min em 1×
export const START_HOUR = 8;

export const SAVE_VERSION = 1;

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
} as const;
