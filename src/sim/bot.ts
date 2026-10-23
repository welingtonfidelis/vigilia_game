// Prefeito automático: joga sozinho para o balanceador medir a economia e a mortalidade.
// Não é a IA dos heróis (essa vive em town.ts/party.ts); é um "jogador médio" roteirizado.

import { dayOf, hourOf } from './calendar.ts';
import { RANKS } from '../data/classes.ts';
import { heroStrength, maxLevel } from './hero.ts';
import { amuletCostFor, blowHorn, build, challengeLord, repair, comfort, commission, forgeAmulet, giftItem, holdFestival, postContract, retire, speech, sponsor, suggestedReward, talk } from './commands.ts';
import { commissionBlocker, commissionCost, itemValue, upgradeGain } from './items.ts';
import { MATERIAL_AFFIX } from '../data/items.ts';
import { builtLevel, canAfford, careOf, festivalCost, gearPrice, heroCapacity, hornCost, maxContracts, maxGearTier, maxParties, maxPartySize, nextLevelCost, repairOf, upgradeBlocker } from './economy.ts';
import { repairCost } from './care.ts';
import { BUILDING_IDS } from '../data/buildings.ts';
import { lordCandidates, lordConfidence, openPassages } from './dungeon.ts';
import { BALANCE as B } from './config.ts';
import { activeHeroes, townHeroes } from './town.ts';
import type { BuildingId, ItemSlot, MaterialId, SpecId, World } from './types.ts';
import type { LevelCost } from '../data/buildings.ts';

/** O que o prefeito automático escolhe ao chegar no nível 3. */
const BOT_SPECS: Record<BuildingId, SpecId> = {
  taverna: 'cervejaria',
  estalagem: 'dormitorio',
  ferreiro: 'laminas',
  templo: 'penitencia',
  guilda: 'mercenaria',
  campo: 'disciplina',
  casa: 'cirurgia',
};

/** Depois das ruínas, cada rodada de níveis segue esta ordem. */
const PRIORITY: BuildingId[] = ['ferreiro', 'guilda', 'estalagem', 'taverna', 'templo', 'casa', 'campo'];

/** Ordem em que o prefeito automático reconstrói e melhora a vila (até o nível 30 do pós-jogo). */
const BUILD_ORDER: [BuildingId, number][] = [
  ['guilda', 1],
  ['ferreiro', 1],
  ['estalagem', 1],
  ['templo', 1],
  ['casa', 1],
  ['campo', 1],
  ...Array.from({ length: 29 }, (_, i) => PRIORITY.map((id): [BuildingId, number] => [id, i + 2])).flat(),
];

/** O prefeito automático manda consertar abaixo desta conservação. */
const REPAIR_BELOW = 55;

/** Quanto do ouro da próxima obra o prefeito automático guarda antes de postar contratos. */
const CONTRACT_FUND = 0.5;

export function autoMayor(world: World): void {
  const town = world.town;
  if (hourOf(world.tick) === 9 && dayOf(world.tick) % 10 === 0) makeRoom(world);
  if (hourOf(world.tick) === 10) tendPeople(world);
  const roster = activeHeroes(world).length + town.arrivals.length;
  const wanted = Math.min(heroCapacity(world), 4 * maxParties(world) + 2);
  if (roster < wanted) blowHorn(world);

  const reserve = hornCost(world);
  if (hourOf(world.tick) === 15) tendAmulet(world, reserve);
  // Conserto primeiro; depois, a próxima obra da lista. O ouro que ela pede fica guardado:
  // festas, contratos, encomendas e mecenato só usam o que sobra.
  let fund = tendBuildings(world, reserve);
  const next = fund > 0 ? null : nextBuild(world);
  if (next && town.treasury - next.cost.gold >= reserve) build(world, next.id, next.lvl === B.specLevel ? BOT_SPECS[next.id] : undefined);
  else if (next) fund = next.cost.gold;

  // Fim de jogo sem ouro morto: quando o tesouro sobra, a vila faz festa.
  if (hourOf(world.tick) === 14) {
    const cost = festivalCost(world);
    const lowMorale = townHeroes(world).some((h) => h.morale < 45);
    if (town.treasury > cost + fund + (lowMorale ? 300 : 900)) holdFestival(world);
  }

  // Contratos para todos os andares da fronteira, até o limite do quadro.
  for (const frontier of frontierFloors(world)) {
    if (town.contracts.length >= maxContracts(world)) break;
    if (town.contracts.some((c) => c.passageId === frontier.passageId && c.floor === frontier.floor)) continue;
    const reward = suggestedReward(frontier.level, frontier.floor);
    if (town.treasury >= reward + reserve * 2 + fund * CONTRACT_FUND) postContract(world, frontier.passageId, frontier.floor, reward);
  }

  if (hourOf(world.tick) === 11) giveFromArsenal(world);
  if (hourOf(world.tick) === 13 && dayOf(world.tick) % 3 === 0) orderFromForge(world, reserve + fund);

  // Uma vez por dia, patrocina o equipamento do herói mais mal-equipado.
  if (hourOf(world.tick) === 12 && town.treasury > reserve + fund + 400) {
    const cap = maxGearTier(world);
    const candidates = townHeroes(world).filter((h) => Math.min(h.gear.weapon, h.gear.armor) < cap);
    if (candidates.length > 0) {
      const hero = candidates.reduce((lo, h) => (h.gear.weapon + h.gear.armor < lo.gear.weapon + lo.gear.armor ? h : lo));
      const next = gearPrice(Math.min(hero.gear.weapon, hero.gear.armor) + 1);
      const gift = Math.round(Math.min(next - hero.gold, town.treasury * 0.3));
      if (gift >= 30) sponsor(world, hero.id, gift);
    }
  }
}

/** A próxima obra da lista que o prefeito automático pode pagar em material (null = nenhuma). */
function nextBuild(world: World): { id: BuildingId; lvl: number; cost: LevelCost } | null {
  for (const [id, lvl] of BUILD_ORDER) {
    if (builtLevel(world, id) >= lvl) continue;
    const cost = nextLevelCost(world, id);
    if (!cost || upgradeBlocker(world, id)) continue;
    if (!canAfford(world, { gold: 0, ...(cost.materials ? { materials: cost.materials } : {}) })) continue;
    return { id, lvl, cost };
  }
  return null;
}

/**
 * Conserta o prédio mais gasto. Se ele já rende menos e o conserto não cabe no tesouro,
 * devolve o ouro do conserto: a vila junta para a obra antes de melhorar outro prédio.
 */
function tendBuildings(world: World, reserve: number): number {
  const worn = BUILDING_IDS.filter((id) => builtLevel(world, id) > 0 && repairOf(world, id) === undefined && careOf(world, id) < REPAIR_BELOW).sort(
    (a, b) => careOf(world, a) - careOf(world, b),
  );
  const worst = worn[0];
  if (!worst) return 0;
  const cost = repairCost(world, worst);
  if (!cost) return 0;
  if (canAfford(world, cost) && world.town.treasury - cost.gold >= reserve) {
    repair(world, worst);
    return 0;
  }
  return careOf(world, worst) < B.careWorn ? cost.gold : 0;
}

/** Dá a melhor peça do cofre a quem mais ganha com ela (uma por dia). */
function giveFromArsenal(world: World): void {
  const items = [...(world.town.arsenal ?? [])].sort((a, b) => itemValue(b) - itemValue(a));
  const heroes = townHeroes(world);
  for (const item of items) {
    const taker = heroes.reduce<{ id: number; gain: number } | null>((best, h) => {
      const gain = upgradeGain(h, item);
      return gain > 0.5 && (!best || gain > best.gain) ? { id: h.id, gain } : best;
    }, null);
    if (taker) {
      giftItem(world, item.id, taker.id);
      return;
    }
  }
}

/** Encomenda uma peça quando o tesouro sobra: arma, armadura e amuleto, em rodízio. */
function orderFromForge(world: World, reserve: number): void {
  if ((world.town.arsenal ?? []).length >= 4) return;
  const slots: ItemSlot[] = ['weapon', 'armor', 'amulet'];
  const slot = slots[Math.floor(dayOf(world.tick) / 3) % 3]!;
  const rarity = commissionBlocker(world, slot, 'epica') === null ? 'epica' : 'rara';
  if (commissionBlocker(world, slot, rarity)) return;
  const cost = commissionCost(world, slot, rarity);
  if (world.town.treasury < reserve + cost.gold * 2) return;
  const mats = (Object.keys(MATERIAL_AFFIX) as MaterialId[]).filter((m) => world.town.materials[m] >= cost.material + 20);
  if (mats.length === 0) return;
  const material = mats.reduce((best, m) => (world.town.materials[m] > world.town.materials[best] ? m : best));
  commission(world, slot, material, rarity);
}

/** O primeiro andar ainda não conquistado de cada passagem conhecida, do nível mais alto ao mais baixo. */
function frontierFloors(world: World): { passageId: number; level: number; floor: number }[] {
  const out: { passageId: number; level: number; floor: number }[] = [];
  for (const p of openPassages(world)) {
    if (!p.discovered) continue;
    const f = p.conquered.findIndex((c) => !c);
    if (f >= 0) out.push({ passageId: p.id, level: p.level, floor: f });
  }
  return out.sort((a, b) => b.level - a.level || b.floor - a.floor);
}

/**
 * Com a vila cheia e a reputação atraindo gente melhor, abre uma vaga dispensando
 * quem já bateu no teto de nível e tem rank abaixo do recruta típico.
 */
function makeRoom(world: World): void {
  if (activeHeroes(world).length < heroCapacity(world) - 1 || world.town.reputation < 30) return;
  const typical = world.town.reputation >= 70 ? 3 : 2;
  const capped = townHeroes(world).filter((h) => h.level >= maxLevel(world, h) && RANKS.indexOf(h.rank) < typical);
  if (capped.length === 0) return;
  const power = (h: (typeof capped)[number]) => {
    const s = heroStrength(world, h);
    return s.ehp * s.dps;
  };
  retire(world, capped.reduce((lo, h) => (power(h) < power(lo) ? h : lo)).id);
}

/** Um prefeito atento: consola quem chora, discursa para a vila e conversa com quem anda desconfiado. */
function tendPeople(world: World): void {
  const heroes = townHeroes(world);
  const grieving = heroes.filter((h) => h.grief >= 40).sort((a, b) => b.grief - a.grief)[0];
  if (grieving) comfort(world, grieving.id);
  if (heroes.length >= 4) speech(world);
  const doubtful = heroes.filter((h) => h.loyalty < 60).sort((a, b) => a.loyalty - b.loyalty);
  for (const h of doubtful) if (world.town.mayorEnergy > 0) talk(world, h.id);
}

/**
 * Amuleto (M5 F2): monta quando tem os fragmentos e o ouro; desafia o Senhor quando o
 * grupo mais forte se acha capaz, ou, depois de esperar muito, se acha quase capaz.
 */
function tendAmulet(world: World, reserve: number): void {
  const abyss = world.abyss;
  if (!abyss.amulet) {
    if (abyss.fragments >= B.fragmentsPerAmulet && world.town.treasury >= amuletCostFor(world, abyss.level) + reserve) forgeAmulet(world);
    return;
  }
  const amulet = abyss.amulet;
  if (amulet.inUse || world.tick < amulet.readyTick) return;
  const team = lordCandidates(world).slice(0, maxPartySize(world));
  if (team.length < Math.min(3, maxPartySize(world))) return;
  const conf = lordConfidence(world, team, amulet.level);
  const waited = dayOf(world.tick - amulet.readyTick);
  if (conf >= 1.1 || (waited >= 60 && conf >= 0.85)) challengeLord(world, team.map((h) => h.id));
}
