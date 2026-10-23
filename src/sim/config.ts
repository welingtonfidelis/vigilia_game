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

  // Escala sem fim (M5 F3): os três lados crescem perto do quadrado do nível do abismo.
  /** O teto de nível de cada rank sobe isto por nível do abismo. */
  levelCapPerAbyssLevel: 4,
  /** Tier do saque por nível do abismo: 2 até o nível 6, 4 depois (casa com o quadrado da força). */
  tierPerLevelEarly: 2,
  tierPerLevelLate: 4,
  tierEarlyLevels: 6,
  /** A defesa extra dos monstros para de crescer aqui; a vida e o ataque seguem a força. */
  defBonusMaxLevel: 6,
  /** A defesa da armadura conta até este tier; acima, a armadura só dá vida. */
  armorDefTierCap: 12,
  /** Recrutas chegam com níveis a mais por nível do abismo e equipamento comum de uma fração do tier do nível. */
  recruitLevelsPerAbyssLevel: 3,
  recruitGearFraction: 0.5,

  // Ritmo 5× (M5 F5): a campanha é 5× mais longa, e os heróis sobem no ritmo dela.
  /** Multiplica toda a experiência dos heróis (abismo e treino). */
  xpPace: 0.4,
  /** Multiplica o ouro de todo monstro (o saque dos heróis e, por ele, o imposto e o que eles gastam na vila). */
  goldPace: 0.5,
  /** Multiplica a chance de todo fragmento de amuleto: é o relógio dos Senhores. */
  fragmentPace: 0.52,
  /** Fragmento comprado dos mercadores do abismo: tantas vezes o preço do amuleto, mais caro a cada compra no nível, até o limite. */
  fragmentBuyMult: 6,
  fragmentBuyGrowth: 1.5,
  fragmentBuyMax: 3,
  /** Monstros (menos o Senhor) com ataque × isto e vida ÷ isto: mesma ameaça, lutas mais letais. */
  enemyLethality: 2.8,
  /** Força do Senhor (vida e ataque) e afixos sorteados a cada desafio: 1 até este nível, 2 depois. */
  lordPower: 0.95,
  lordAffixOneUntil: 3,
  /** Acerta a confiança contra o Senhor com a chance real de vitória (1 ≈ metade). */
  lordConfidenceScale: 1.6,
  /** A confiança contra o Senhor se o grupo não tem tanque (e de novo se não tem curandeiro). */
  lordMissingRole: 0.85,
  // Mecânicas dos Senhores das dimensões fundas (M5 F6).
  /** Rainha dos Esporos: dano a menos enquanto houver zangão vivo. */
  lordHiveGuard: 0.4,
  /** Coro Submerso: segundos de encanto e a cura do canto na fase 2 (fração da vida). */
  lordCharmSeconds: 4,
  lordSongHeal: 0.03,
  /** Colosso de Ferro-negro: placas (fração da vida), quanto tempo seguram inteiras, quanto demoram quebradas, e o vapor da fase 2 (× ataque). */
  lordPlates: 0.3,
  lordPlatesHold: 15,
  lordPlatesBroken: 20,
  lordSteam: 0.4,
  /** Rei dos Ossuários: chance de levantar quem cai (fases 1 e 2) e a cura dos golpes na fase 2. */
  lordRaise: 0.5,
  lordRaisePhase2: 0.8,
  lordArmyLifesteal: 0.3,

  // Vila longa (M5 F4): prédios até o 10, efeitos em curva e conservação.
  /** Teto dos prédios na campanha; no pós-jogo não há teto. */
  buildingMaxLevel: 10,
  /** Cada nível acima do 1 vale isto em efeito (o antigo nível 3 fica entre o 4 e o 5). */
  buildingGradeStep: 0.55,
  /** Do nível 4 em diante, o ouro de cada nível é o do 3 vezes isto a cada nível. */
  buildingCostGrowth: 1.65,
  /** Material dos níveis 4 em diante: base no 4, mais o passo a cada nível. */
  buildingMaterialBase: 20,
  buildingMaterialStep: 8,
  /** A primeira especialização chega no nível 3; no 7 o prédio ganha também o outro caminho. */
  specLevel: 3,
  secondSpecLevel: 7,
  /** A forja não passa do tier do nível do abismo mais isto: o resto vem lá de baixo. */
  forgeAbyssEdge: 4,
  /** A bancada do joalheiro abre com o ferreiro neste nível. */
  benchSmithLevel: 5,
  restHpMax: 0.9,
  restEnergyMax: 80,
  /** Conservação perdida por dia (cerca de 10 por ano). */
  careDecayPerDay: 0.25,
  /** Abaixo de careWorn o prédio rende careWornFactor; abaixo de careBroken, careBrokenFactor e não sobe de nível. */
  careWorn: 50,
  careBroken: 25,
  careWornFactor: 0.8,
  careBrokenFactor: 0.5,
  /** Em conserto, o prédio rende isto e não se desgasta. */
  careRepairFactor: 0.8,
  /** Ao chegar a 0, o prédio perde um nível e volta a esta conservação. */
  careAfterCollapse: 50,
  /** Conserto: fração do ouro do nível atual por 100 de estrago; acima de repairMaterialFrom, também material. */
  repairCostFraction: 0.5,
  repairMaterialFrom: 40,
  /** Um dia de obra mais um a cada repairDaysPer de estrago. */
  repairDaysPer: 40,
  /** Estrago por incursão: [mínimo, máximo] em cada prédio atingido. */
  raidCareDamage: [10, 30] as [number, number],

  // Abismo (M5): dimensões, passagens e pressão
  /** Força dos monstros por nível do abismo (1 a 6); depois cresce com o quadrado do nível. */
  levelPower: [1, 2, 3.4, 5.3, 7.6, 9.2] as readonly number[],
  /** Defesa somada aos monstros por nível do abismo acima do 1. */
  defBonusPerLevel: 10,
  floorPowerGrowth: 0.25,
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
  /** Fragmentos de amuleto (M5 F2): chance por combate vencido e pela volta triunfal, no nível atual. */
  fragmentMatilha: 0.001,
  fragmentElite: 0.003,
  fragmentGuardian: 0.012,
  fragmentReturn: 0.009,
  fragmentsPerAmulet: 5,
  /** Montagem do amuleto pelo joalheiro: ouro (× força do nível ^ 0,8) e dias. */
  amuletBaseCost: 300,
  amuletDays: 2,
  /** Fragmento de um nível já vencido: vira relíquia de museu e vale este ouro. */
  oldFragmentGold: 40,
  /** Salas de guarda (elites) antes do Senhor, no covil. */
  lordGuards: 2,
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

  // Audiências e desejos (M6 F1)
  /**
   * Petições por manhã: 0, 1 ou 2, com estes pesos. Um dia dura 48 s em 1×: uma petição a cada
   * 4 dias dá uma a cada ~3 minutos, sem virar uma fila sem fim.
   */
  petitionsPerMorning: [3, 1, 0] as [number, number, number],
  /** Dias para responder (o dia em que chegou conta como o primeiro): ~4 minutos em 1×. */
  petitionDays: 5,
  /** Mais que isso em aberto, a mesa não recebe ninguém novo. */
  petitionMaxOpen: 3,
  /** Imposto de um dia dos moradores, mínimo: a medida do ouro simbólico das audiências. */
  petitionDayTaxMin: 10,
  /** Fatia dos heróis com desejo em aberto, mantida por um sorteio por semana. */
  wishShare: 0.1,
  wishDays: [30, 60] as [number, number],
  wishLoyalty: 10,
  wishMorale: 10,
  wishFailMorale: 8,
  /** Lápide nova (desejo): ouro simbólico, com a dificuldade por cima. */
  wishGraveCost: 20,
  /** Quanto o par apresentado pelo prefeito se procura na formação dos grupos. */
  wishPairBonus: 1,
  /** Experiência que o novato ganha ouvindo o veterano (fração do próximo nível). */
  wishVeteranXp: 0.25,
  /** Chance de quem desceu com o amigo perder o traço Traumatizado. */
  wishHealTrauma: 0.5,

  // Nêmesis e rumores (M6 F2)
  /** Chance de o monstro que matou alguém e saiu vivo da luta virar nêmesis. */
  nemesisBirthChance: 0.05,
  /** Abaixo desta fração da vida, o monstro que matou alguém nesta luta pode fugir na névoa. */
  nemesisFleeBelow: 0.25,
  nemesisFleeChance: 0.5,
  /** Nêmesis vivas ao mesmo tempo. */
  nemesisMax: 3,
  /** A nêmesis luta com o corpo de um elite (sem o ouro de elite), e cada herói que ela matou soma um degrau, até o teto. */
  nemesisHp: 2.5,
  nemesisAtk: 1.3,
  nemesisStepBonus: 0.15,
  nemesisMaxStep: 3,
  /** Chance de uma nêmesis sem lugar se mudar para uma passagem que acabou de abrir. */
  nemesisMigrateChance: 0.35,
  /** Quanto de confiança a menos quem quer vingar alguém aceita para caçar a nêmesis. */
  nemesisHuntSlack: 0.25,
  /** Rumores que a guilda traz para cada vaga de passagem nova. */
  rumorCount: 3,
} as const;
