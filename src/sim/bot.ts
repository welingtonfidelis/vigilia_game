// Prefeito automático: joga sozinho para o balanceador medir a economia e a mortalidade.
// Não é a IA dos heróis (essa vive em town.ts/party.ts); é um "jogador médio" roteirizado.

import { dayOf, hourOf } from './calendar.ts';
import { RANKS } from '../data/classes.ts';
import { heroStrength, maxLevel } from './hero.ts';
import { amuletCostFor, blowHorn, build, challengeLord, comfort, commission, forgeAmulet, giftItem, holdFestival, postContract, retire, speech, sponsor, suggestedReward, talk } from './commands.ts';
import { commissionBlocker, commissionCost, itemValue, upgradeGain } from './items.ts';
import { MATERIAL_AFFIX } from '../data/items.ts';
import { canAfford, festivalCost, gearPrice, heroCapacity, hornCost, level, maxGearTier, maxParties, maxPartySize, nextLevelCost } from './economy.ts';
import { lordCandidates, lordConfidence, openPassages } from './dungeon.ts';
import { BALANCE as B } from './config.ts';
import { activeHeroes, townHeroes } from './town.ts';
import type { BuildingId, ItemSlot, MaterialId, SpecId, World } from './types.ts';

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

/** Ordem em que o prefeito automático reconstrói a vila. */
const BUILD_ORDER: [BuildingId, number][] = [
  ['guilda', 1],
  ['ferreiro', 1],
  ['estalagem', 1],
  ['templo', 1],
  ['casa', 1],
  ['campo', 1],
  ['ferreiro', 2],
  ['guilda', 2],
  ['estalagem', 2],
  ['taverna', 2],
  ['templo', 2],
  ['casa', 2],
  ['campo', 2],
  ['ferreiro', 3],
  ['guilda', 3],
  ['estalagem', 3],
  ['taverna', 3],
  ['templo', 3],
  ['casa', 3],
  ['campo', 3],
];

export function autoMayor(world: World): void {
  const town = world.town;
  if (hourOf(world.tick) === 9 && dayOf(world.tick) % 10 === 0) makeRoom(world);
  if (hourOf(world.tick) === 10) tendPeople(world);
  const roster = activeHeroes(world).length + town.arrivals.length;
  const wanted = Math.min(heroCapacity(world), 4 * maxParties(world) + 2);
  if (roster < wanted) blowHorn(world);

  const reserve = hornCost(world);
  if (hourOf(world.tick) === 15) tendAmulet(world, reserve);
  for (const [id, lvl] of BUILD_ORDER) {
    if (level(world, id) >= lvl) continue;
    const cost = nextLevelCost(world, id);
    if (!cost) continue;
    const materialsOk = canAfford(world, { gold: 0, ...(cost.materials ? { materials: cost.materials } : {}) });
    if (!materialsOk) continue;
    if (town.treasury - cost.gold >= reserve) build(world, id, lvl === 3 ? BOT_SPECS[id] : undefined);
    break;
  }

  // Fim de jogo sem ouro morto: quando o tesouro sobra, a vila faz festa.
  if (hourOf(world.tick) === 14) {
    const cost = festivalCost(world);
    const lowMorale = townHeroes(world).some((h) => h.morale < 45);
    if (town.treasury > cost + (lowMorale ? 300 : 900)) holdFestival(world);
  }

  // Contratos para todos os andares da fronteira, até o limite do quadro.
  for (const frontier of frontierFloors(world)) {
    if (town.contracts.length >= level(world, 'guilda')) break;
    if (town.contracts.some((c) => c.passageId === frontier.passageId && c.floor === frontier.floor)) continue;
    const reward = suggestedReward(frontier.level, frontier.floor);
    if (town.treasury >= reward + reserve * 2) postContract(world, frontier.passageId, frontier.floor, reward);
  }

  if (hourOf(world.tick) === 11) giveFromArsenal(world);
  if (hourOf(world.tick) === 13 && dayOf(world.tick) % 3 === 0) orderFromForge(world, reserve);

  // Uma vez por dia, patrocina o equipamento do herói mais mal-equipado.
  if (hourOf(world.tick) === 12 && town.treasury > reserve + 400) {
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
