// Escala de tempo: 1 tick = 0,1 s de jogo em velocidade 1×.
export const TICKS_PER_SECOND = 10;
export const TICKS_PER_HOUR = 20; // 1 hora do jogo = 2 s em 1×
export const HOURS_PER_DAY = 24;
export const TICKS_PER_DAY = TICKS_PER_HOUR * HOURS_PER_DAY; // 48 s em 1×
export const DAYS_PER_SEASON = 10;
export const SEASONS = ['Primavera', 'Verão', 'Outono', 'Inverno'] as const;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS.length; // ~32 min em 1×
export const START_HOUR = 8;

export const SAVE_VERSION = 11;

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
  expansionClearCost: 120,
  expansionHouseCost: 60,
  expansionHouseCapacity: 6,
  expansionHouseHeroSlots: 1,
  // Vila viva (M3): moradores nomeados, humor e incursões
  citizenStart: 6,
  citizenRoster: 8,
  /** Um morador nomeado a cada N de população (até citizenRoster). */
  citizenPerPop: 4,
  /** Quanto o humor médio mexe no imposto (0,8 + citizenTaxMood × humor/100). */
  citizenTaxMood: 0.4,
  /** Salário diário de cada guarda da milícia. */
  guardSalaryPerDay: 2.5,
  /** No máximo dois decretos ativos por vez. */
  maxActiveDecrees: 2,
  citizenHappinessBase: 55,
  citizenLeaveBelow: 30,
  citizenLeaveChance: 0.15,
  citizenGuardPerPop: 4,
  citizenGuardMax: 6,
  /** Incursões noturnas: disparam quando um ato passa deste limiar de corrupção. */
  raidMinCorruption: 55,
  raidChanceAtMin: 0.1,
  raidChanceAtMax: 0.35,
  raidCooldownDays: 14,
  raidPowerBase: 60,
  raidPowerPerAct: 220,
  /** Defesa/(defesa+poder) acima disto repele; abaixo do segundo, a vila é saqueada. */
  raidRepelRatio: 0.55,
  raidCostlyRatio: 0.35,
  raidGoldSteal: 0.08,
  populationPerBuildingLevel: 6,
  hornBaseCost: 25,
  hornCostGrowth: 0.1,
  hornMaxCost: 100,
  hornCooldownDays: 2,
  hornRecruits: 3,
  gearBasePrice: 25,
  gearPriceGrowth: 1.8,
  gearMargin: 0.3,

  // Itens (M4)
  /** Quanto cada afixo vale na hora de comparar peças (em tiers). */
  affixValue: 0.8,
  arsenalMax: 24,
  dropTierMax: 12,
  /** A lendária do chefe cai este tanto acima do teto da forja (ou do tier do ato). */
  legendaryDropEdge: 2,
  /** E nunca fica abaixo do teto da forja mais isto, quando o ferreiro sobe. */
  legendaryFollowEdge: 1,
  /** Encomenda na forja: rara e épica saem este tanto acima do teto da forja. */
  commissionRareTierEdge: 1,
  commissionEpicTierEdge: 2,
  // Chances por sala, só em andar ainda não conquistado.
  eliteEpicChance: 0.06,
  eliteRareChance: 0.25,
  chestEpicChance: 0.05,
  chestEpicPerFloor: 0.03,
  chestRareChance: 0.3,
  chestRarePerFloor: 0.05,
  itemSellFraction: 0.25,
  commissionBase: 150,
  commissionPerTier: 60,
  commissionEpicMult: 2.5,
  commissionRareMaterial: 40,
  commissionEpicMaterial: 100,
  commissionRareDays: 2,
  commissionEpicDays: 4,
  // Bancada do joalheiro (M4, terceira fatia): sumidouro do ouro dos heróis.
  benchEnchantBase: 2000,
  benchEnchantPerTier: 500,
  benchPolishPrice: 10000,
  benchTreasuryShare: 0.1,
  benchLogSize: 12,
  merchantMarkup: 3,
  merchantEpicChance: 0.3,
  // Armadilha: dano em fração da vida máxima; cada batedor (arqueiro ou lanceiro) tem esta chance de perceber.
  trapDamageMin: 0.1,
  trapDamageMax: 0.2,
  trapSpotChance: 0.5,
  // Provisões e mecenato (M4, última fatia): onde o ouro dos heróis vai parar.
  rationBase: 10,
  /** Só compra provisão quem tem este múltiplo do preço (o resto é para o equipamento). */
  provisionReserve: 4,
  rationExp: 1.3,
  relicPriceFraction: 0.5,
  relicFlee: 5,
  provisionTreasuryShare: 0.1,
  patronGold: 3000,
  workBasePrice: 2500,
  workPriceGrowth: 1.6,
  workEffectCap: 5,
  // Chefes em duas fases (abaixo de 50% de vida).
  phase2SecondHit: 0.6,
  phase2UrnBlast: 0.25,
  /** Quantos esqueletos o Guardião chama por vez na fase 2 (na 1, dois). */
  phase2Summons: 3,
  affixCrit: 0.05,
  affixPierce: 0.15,
  affixDef: 4,
  affixHp: 0.1,
  affixFlee: 8,
  affixInterval: 0.9,
  affixLifesteal: 0.08,
  lifestealCap: 0.12,
  affixGold: 0.1,

  // Especializações de nível 3 (M4)
  specLuxoHp: 0.2,
  specErvasHeal: 0.1,
  specPenitenciaFlee: 6,
  specPenitenciaCorruption: 1.1,
  specMercenariaReward: 1.25,
  specOrdemLoyalty: 10,
  specDisciplinaXp: 1.5,
  specArenaInjury: 0.03,
  specArenaGold: 2,
  specApostasGoldPerHero: 1.5,
  specApostasExtraPrice: 2,
  drinkPrice: 3,
  trainPrice: 4,
  donation: 2,

  // Abismo (M5): dimensões, passagens e pressão
  /** Força dos monstros por nível do abismo (1 a 6); depois cresce com o quadrado do nível. */
  levelPower: [1, 2, 3.4, 5.3, 7.6, 9.2] as readonly number[],
  /** Defesa somada aos monstros por nível do abismo acima do 1. */
  defBonusPerLevel: 10,
  floorPowerGrowth: 0.18,
  /** Andares de uma passagem: 3 no nível 1, um a mais a cada 3 níveis, até 6. */
  passageFloorsBase: 3,
  passageFloorsEvery: 3,
  passageFloorsMax: 6,
  /** Dias que uma passagem fica aberta (um ano de jogo), se ninguém a selar antes. */
  passageDays: 40,
  /** Um invasor de outro bioma pode aparecer nas matilhas a partir deste nível. */
  invaderMinLevel: 4,
  invaderChance: 0.25,
  /** Guardião da passagem: elite grande no último andar, com acólitos. */
  guardianHp: 5,
  guardianAdds: 2,
  /** Selar uma passagem: ouro extra do guardião (em matilhas) e material. */
  sealGoldPacks: 12,
  sealMaterial: 8,
  /** A confiança num mundo desconhecido é menor: ninguém sabe o que há do outro lado. */
  mysteryConfidence: 0.9,
  descendHours: 2,
  descendHoursPerFloor: 0.75,
  /** Cada nível do abismo acima do 1 conta como este tanto de andares na descida. */
  descendFloorsPerLevel: 4,
  roomWalkTicks: 30,
  /** Pressão de cada passagem: começa aqui, sobe por dia, cai por sala e por andar limpos. */
  pressureStart: 30,
  pressurePerDay: 2,
  pressurePerRoom: 1,
  pressurePerConquest: 10,
  pressureStatDivisor: 250,
  /** A partir daqui, salas limpas das passagens abertas voltam a ser ocupadas. */
  pressureReoccupy: 70,
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
  /** Na fúria, os inimigos passam a ignorar a defesa aos poucos (fração por segundo). */
  enragePiercePerSecond: 0.01,
  /** Na fúria, a cura vai rendendo menos (fração por segundo, até 20% da cura da fúria). */
  enrageHealDecayPerSecond: 0.01,
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
  marriageBond: 65,
  /** Cães e gatos: quantos ao mesmo tempo, chance de um aparecer por dia, anos que ficam. */
  petsMaxFirstYear: 2,
  petsMax: 3,
  petArrivalChance: 0.25,
  petYears: [3, 5] as [number, number],
  marriageChancePerSeason: 0.25,
  birthChancePerSeason: 0.2,
  comingOfAgeYears: 16,
  oldAgeYears: 70,
  oldAgeDeathChance: 0.25,
  roleCap: 2,
} as const;
