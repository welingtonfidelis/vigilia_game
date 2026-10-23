// API pública do núcleo de simulação. A renderização (Phaser) e a UI só falam com isto.
export { createWorld } from './world.ts';
export { step, runTicks, runDays, type Hooks } from './loop.ts';
export * as commands from './commands.ts';
export type { CommandResult } from './commands.ts';
export { serialize, deserialize, checksum, OldSaveError } from './save.ts';
export { autoMayor } from './bot.ts';
export { JOB_NAMES, JOB_ORDER, citizenMood, guardDefense, guardTarget } from './citizens.ts';
export { DECREES, DECREE_IDS, activeDecreeDefs, activeDecreeIds, decreeCitizenMoodPenalty, decreeDailyCost, decreeDayCost, decreeDefenseMultiplier, decreeEnactCost, decreeTaxMultiplier, hasDecree } from './decrees.ts';
export { difficultyOf } from './difficulty.ts';
export { DIFFICULTIES, DIFFICULTY_IDS, type DifficultyDef } from '../data/difficulty.ts';
export { defensePower, raidPower, resolveRaid, threatOf, maybeRaid, type Threat } from './raids.ts';
export { eventChoiceCost, maybeSeasonalEvent, resolveSeasonalEvent } from './events.ts';
export { SEASONAL_EVENTS, SEASON_EVENTS, type SeasonalChoiceDef, type SeasonalEventDef } from '../data/seasonal-events.ts';
export { formatDate, dayOf, hourOf, yearOf, seasonOf, isNight } from './calendar.ts';
export { describeHero, heroStats, type HeroStats } from './hero.ts';
export * from './config.ts';
export type * from './types.ts';
export type { DecreeDef } from '../data/decrees.ts';

// Consultas somente-leitura para a tela. Nenhuma delas muda o mundo.
export {
  canAfford,
  citizenTaxesPerDay,
  expansionClearCost,
  expansionHouseCost,
  festivalCost,
  gearPrice,
  guardCount,
  guardSalaryPerDay,
  heroCapacity,
  hornCost,
  // O nível construído (painel, arte, custo) e o efetivo, já com a conservação (M5 F4).
  builtLevel as buildingLevel,
  level as effectiveLevel,
  careFactor,
  careOf,
  EFFECTS,
  gradeOfLevel,
  levelCost,
  maxBuildingLevel,
  maxContracts,
  repairOf,
  upgradeBlocker,
  maxGearTier,
  maxParties,
  maxPartySize,
  nextLevelCost,
  pensionPerDay,
  populationCap,
  recruitsPerHorn,
  totalBuildingLevels,
} from './economy.ts';
export { ageYears, className, fleeLimit, fleeThreshold, getBond, maxLevel, moraleBaseline, xpToNext } from './hero.ts';
// Itens, forja e especializações (M4).
export {
  affixCount,
  commissionBlocker,
  commissionCost,
  forgeCapacity,
  ITEM_SLOTS,
  itemName,
  itemPrice,
  itemValue,
  sellPrice,
  upgradeGain,
} from './items.ts';
export { hasSpec, specOf } from './economy.ts';
export { repairCost, theBuilding } from './care.ts';
export { carriesRelic, cheapestWork, isProvisioned, rationPrice, relicPrice, workEffectLevel, workLevel, workPrice } from './patronage.ts';
export { WORK_IDS, WORKS, type WorkDef } from '../data/works.ts';
export { AFFIXES, MATERIAL_AFFIX, RARITY_NAMES, SLOT_NAMES } from '../data/items.ts';
export { SPEC_DEFS, SPECS, type SpecDef } from '../data/specs.ts';
export { activeHeroes, townHeroes } from './town.ts';
export { busyParties } from './party.ts';
export {
  abyssPressure,
  availableBiomes,
  floorPower,
  isGuardianFloor,
  lairSpot,
  levelPower,
  levelTier,
  lordCandidates,
  lordConfidence,
  openPassages,
  partyRooms,
  passageCapacity,
  passageOf,
  spotOf,
  travelTicks,
} from './dungeon.ts';
export { byWhom, floorLabel, heroLabel } from './chronicle.ts';
// Pessoas (M2): funções dos aposentados, recuperação, filhos e penalidades de lesão.
export { petCap, petCoat } from './pets.ts';
export { answerPetition, choiceBlocker, choiceGold, effectSummary, petitionDayTax, textOf as petitionText } from './audiences.ts';
export { PETITIONS, PETITION_BY_ID, type PetitionChoiceDef, type PetitionDef, type PetitionEffect, type PetitionText } from '../data/petitions.ts';
export { wishPairBonus, wishText, wishTextFor } from './wishes.ts';
export { WISHES, type WishDef, type WishText } from '../data/wishes.ts';
export { livingNemeses, nemesisStep, nemesisWhere, victimNames } from './nemesis.ts';
export { rumorBoard } from './rumors.ts';
export { encounterOf, waitingAdvice } from './encounters.ts';
export { heroTitles, holderOf, POST_IDS, POSTS, postActive, postBlocker, postsOf, reviewOpen } from './posts.ts';
export { inTournament, todaysTournament } from './tournament.ts';
export { biomePageComplete, codexOf, codexProgress, legendaryBase, monsterStage } from './codex.ts';
export { fullName, generations, houseAge, houseById, houseMembers, houseOfHero, housesOf } from './houses.ts';
export { hallLevel, hallStatues, legendsOf, lordSlayers, pedestalsOf } from './hall.ts';
export { allItems } from './items.ts';
export { decorBlocker, decorOf, streetName, villageBanner } from './cosmetics.ts';
export { crestReadable } from './houses.ts';
export { DECOR, DECOR_BY_ID, DECOR_POINTS, STREETS, type DecorDef } from '../data/decor.ts';
export { LEGENDARY_TITLES } from '../data/items.ts';
export { ENCOUNTERS, ENCOUNTER_BY_ID, type EncounterDef, type EncounterOption } from '../data/encounters.ts';
export { PET_LOOKS, PET_NAMES, PET_SPECIES_NAME, type PetLookDef } from '../data/pets.ts';
export { childAge, defaultRole, forgePrice, honorFuneral, recoveryPerDay, roleCount, ROLE_NAMES } from './people.ts';
export { WOUNDS, woundEffects } from './hero.ts';

// Dados do jogo (nomes, custos, descrições).
export { BIOMES, MATERIAL_NAMES, type BiomeDef } from '../data/biomes.ts';
export { DIM_RULES, DIM_RULE_IDS, rulesLabel, type DimRuleDef } from '../data/rules.ts';
export { LORD_LEVELS, lordOf, type LordDef } from '../data/lords.ts';
export { BUILDINGS, BUILDING_IDS, type BuildingDef, type LevelCost } from '../data/buildings.ts';
export { CLASSES, CLASS_IDS, RANKS, RANK_MAX_LEVEL, type ClassDef } from '../data/classes.ts';
export { TRAITS, type TraitDef } from '../data/traits.ts';
