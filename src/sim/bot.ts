// Prefeito automático: joga sozinho para o balanceador medir a economia e a mortalidade.
// Não é a IA dos heróis (essa vive em town.ts/party.ts); é um "jogador médio" roteirizado.

import { dayOf, hourOf } from './calendar.ts';
import { RANKS } from '../data/classes.ts';
import { heroStrength, maxLevel } from './hero.ts';
import { blowHorn, build, comfort, holdFestival, postContract, retire, speech, sponsor, suggestedReward, talk } from './commands.ts';
import { canAfford, festivalCost, gearPrice, heroCapacity, hornCost, level, maxGearTier, maxParties, nextLevelCost } from './economy.ts';
import { BALANCE as B } from './config.ts';
import { activeHeroes, townHeroes } from './town.ts';
import type { BuildingId, World } from './types.ts';

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
  for (const [id, lvl] of BUILD_ORDER) {
    if (level(world, id) >= lvl) continue;
    const cost = nextLevelCost(world, id);
    if (!cost) continue;
    const materialsOk = canAfford(world, { gold: 0, ...(cost.materials ? { materials: cost.materials } : {}) });
    if (!materialsOk) continue;
    if (town.treasury - cost.gold >= reserve) build(world, id);
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
    if (town.contracts.some((c) => c.act === frontier.act && c.floor === frontier.floor)) continue;
    const reward = suggestedReward(frontier.act, frontier.floor);
    if (town.treasury >= reward + reserve * 2) postContract(world, frontier.act, frontier.floor, reward);
  }

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

function frontierFloors(world: World): { act: number; floor: number }[] {
  const out: { act: number; floor: number }[] = [];
  world.acts.forEach((act, a) => {
    if (!act.unlocked) return;
    const f = act.conquered.findIndex((c) => !c);
    if (f >= 0 && f < B.floorsPerAct) out.push({ act: a, floor: f });
  });
  return out.reverse();
}

/**
 * Com a vila cheia e a reputação atraindo gente melhor, abre uma vaga dispensando
 * quem já bateu no teto de nível e tem rank abaixo do recruta típico.
 */
function makeRoom(world: World): void {
  if (activeHeroes(world).length < heroCapacity(world) - 1 || world.town.reputation < 30) return;
  const typical = world.town.reputation >= 70 ? 3 : 2;
  const capped = townHeroes(world).filter((h) => h.level >= maxLevel(h) && RANKS.indexOf(h.rank) < typical);
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
