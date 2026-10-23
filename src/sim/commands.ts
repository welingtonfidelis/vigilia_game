// Alavancas do prefeito. Toda interação do jogador passa por aqui.

import { MATERIAL_NAMES } from '../data/biomes.ts';
import { BUILDINGS } from '../data/buildings.ts';
import { repairCost, theBuilding } from './care.ts';
import { SPEC_DEFS, SPECS } from '../data/specs.ts';
import { dayOf } from './calendar.ts';
import { record, floorLabel, heroLabel } from './chronicle.ts';
import { decreeEnactCost, DECREES, DECREE_IDS } from './decrees.ts';
import { DIFFICULTIES } from '../data/difficulty.ts';
import { resolveSeasonalEvent as resolveSeasonalEventImpl } from './events.ts';
import { levelPower, passageOf } from './dungeon.ts';
import { scaledCost } from './difficulty.ts';
import { BALANCE as B, TICKS_PER_DAY, TICKS_PER_HOUR } from './config.ts';
import { lordOf } from '../data/lords.ts';
import { departLord } from './party.ts';
import {
  builtLevel,
  canAfford,
  earn,
  expansionClearCost,
  spend,
  expansionHouseCost,
  festivalCost,
  heroCapacity,
  hornCost,
  level,
  maxContracts,
  maxGearTier,
  maxPartySize,
  nextLevelCost,
  pay,
  repairOf,
  specOf,
  upgradeBlocker,
  populationCap,
  recruitsPerHorn,
} from './economy.ts';
import { getBond, hasTrait, revealTrait } from './hero.ts';
import { commissionBlocker, commissionCost, commissionReadyTick, equip, itemName, sellPrice, stash, upgradeTier } from './items.ts';
import { defaultRole, forgePrice, retireHero, ROLE_NAMES } from './people.ts';
import { festivalCitizens, refreshJobs, syncCitizenRoster } from './citizens.ts';
import { activeHeroes, townHeroes } from './town.ts';
import { noteWish } from './wishes.ts';
import { answerPetition as answerPetitionImpl } from './audiences.ts';
import { chance, int } from './rng.ts';
import type { BuildingId, DecreeId, Difficulty, Doctrine, GiftKind, Hero, ItemSlot, MaterialId, RetiredRole, SpecId, World } from './types.ts';

export type CommandResult = { ok: true } | { ok: false; reason: string };

const fail = (reason: string): CommandResult => ({ ok: false, reason });

/** Carinho do prefeito num cão ou gato da vila (uma vez por dia por bicho). */
export { petAnimal } from './pets.ts';
const OK: CommandResult = { ok: true };

export function blowHorn(world: World): CommandResult {
  const town = world.town;
  const today = dayOf(world.tick);
  if (today < town.hornReadyDay) return fail('O berrante ainda ecoa: espere alguns dias.');
  const free = town.hornUses === 0;
  const cost = free ? 0 : hornCost(world);
  if (town.treasury < cost) return fail(`Faltam ${Math.ceil(cost - town.treasury)} de ouro.`);
  const room = heroCapacity(world) - activeHeroes(world).length - town.arrivals.length;
  if (room <= 0) return fail('Não há vagas: amplie a estalagem.');
  spend(world, 'berrante', cost);
  town.hornUses++;
  town.hornReadyDay = today + B.hornCooldownDays;
  const count = Math.min(room, recruitsPerHorn(world));
  for (let i = 0; i < count; i++) {
    town.arrivals.push({ at: world.tick + int(world.rng, 1, 6) * TICKS_PER_HOUR, free: false });
  }
  record(world, 'berrante', [], `O prefeito tocou o berrante. ${count} aventureiros responderam ao chamado.`);
  return OK;
}

/**
 * Sobe o prédio um nível. Chegar ao nível 3 pede a especialização (uma das duas do
 * prédio); a escolha é definitiva. No nível 7 o prédio ganha também o outro caminho.
 * A obra deixa o prédio inteiro de novo.
 */
export function build(world: World, id: BuildingId, spec?: SpecId): CommandResult {
  const cost = nextLevelCost(world, id);
  if (!cost) return fail('Já está no nível máximo.');
  const blocked = upgradeBlocker(world, id);
  if (blocked) return fail(blocked);
  const toSpec = builtLevel(world, id) + 1 === B.specLevel;
  if (toSpec && (!spec || !SPECS[id].some((s) => s.id === spec))) return fail('Escolha a especialização do nível 3.');
  if (!canAfford(world, cost)) return fail('Recursos insuficientes.');
  pay(world, cost, 'predio');
  world.town.buildings[id]++;
  world.town.care[id] = 100;
  const lvl = builtLevel(world, id);
  refreshJobs(world);
  const { name, gender } = BUILDINGS[id];
  const article = gender === 'm' ? 'O' : 'A';
  const rebuilt = gender === 'm' ? 'reconstruído' : 'reconstruída';
  if (toSpec && spec) {
    (world.town.specs ??= {})[id] = spec;
    record(world, 'construcao', [], `${article} ${name.toLowerCase()} chegou ao nível ${lvl}, com a especialização ${SPEC_DEFS[spec].name}.`);
    return OK;
  }
  const chosen = specOf(world, id);
  if (lvl === B.secondSpecLevel && chosen) {
    const other = SPECS[id].find((s) => s.id !== chosen)!;
    record(world, 'construcao', [], `${article} ${name.toLowerCase()} chegou ao nível ${lvl} e ganhou também o caminho ${other.name}.`);
    return OK;
  }
  record(world, 'construcao', [], lvl === 1 ? `${article} ${name.toLowerCase()} foi ${rebuilt}.` : `${article} ${name.toLowerCase()} chegou ao nível ${lvl}.`);
  return OK;
}

/** Manda consertar o prédio: paga agora, e a obra leva de 1 a 3 dias, com andaime. */
export function repair(world: World, id: BuildingId): CommandResult {
  if (builtLevel(world, id) <= 0) return fail('Ruína não se conserta: reconstrua.');
  if (repairOf(world, id) !== undefined) return fail('A obra já está em andamento.');
  const cost = repairCost(world, id);
  if (!cost) return fail('O prédio está inteiro.');
  if (!canAfford(world, cost)) return fail('Recursos insuficientes.');
  pay(world, cost, 'conserto');
  world.metrics.repairs++;
  world.town.repairs[id] = world.tick + cost.days * TICKS_PER_DAY;
  record(world, 'construcao', [], `O prefeito mandou consertar ${theBuilding(id).toLowerCase()}: ${cost.days} ${cost.days === 1 ? 'dia' : 'dias'} de obra.`);
  return OK;
}

/** Escolhe a especialização de um prédio que já está no nível 3 (saves de antes do M4). */
export function chooseSpecialization(world: World, id: BuildingId, spec: SpecId): CommandResult {
  if (builtLevel(world, id) < B.specLevel) return fail('Só no nível 3.');
  if (world.town.specs?.[id]) return fail('A especialização já foi escolhida.');
  if (!SPECS[id].some((s) => s.id === spec)) return fail('Essa especialização não é deste prédio.');
  (world.town.specs ??= {})[id] = spec;
  const { name, gender } = BUILDINGS[id];
  record(world, 'construcao', [], `${gender === 'm' ? 'O' : 'A'} ${name.toLowerCase()} ganhou a especialização ${SPEC_DEFS[spec].name}.`);
  return OK;
}

/** Encomenda uma peça na forja: paga ouro e material agora, a peça cai no cofre depois. */
export function commission(world: World, slot: ItemSlot, material: MaterialId, rarity: 'rara' | 'epica'): CommandResult {
  const blocked = commissionBlocker(world, slot, rarity);
  if (blocked) return fail(blocked);
  const cost = commissionCost(world, slot, rarity);
  if (world.town.treasury < cost.gold) return fail(`Faltam ${Math.ceil(cost.gold - world.town.treasury)} de ouro.`);
  if (world.town.materials[material] < cost.material) return fail(`Faltam ${cost.material - world.town.materials[material]} de ${MATERIAL_NAMES[material].toLowerCase()}.`);
  spend(world, 'forja', cost.gold);
  world.town.materials[material] -= cost.material;
  (world.town.forge ??= []).push({ id: world.nextId++, slot, material, rarity, tier: cost.tier, readyTick: commissionReadyTick(world, cost.days) });
  const what = slot === 'weapon' ? 'uma arma' : slot === 'armor' ? 'uma armadura' : 'um amuleto';
  record(world, 'prefeito', [], `O prefeito encomendou ${what} ${rarity === 'epica' ? 'épica' : 'rara'} de ${MATERIAL_NAMES[material].toLowerCase()} ao ferreiro.`);
  return OK;
}

/** Dá uma peça do cofre a um herói na vila. A peça antiga dele volta para o cofre. */
export function giftItem(world: World, itemId: number, heroId: number): CommandResult {
  const hero = heroInTown(world, heroId);
  if (typeof hero === 'string') return fail(hero);
  const arsenal = world.town.arsenal ?? [];
  const item = arsenal.find((i) => i.id === itemId);
  if (!item) return fail('Essa peça não está no cofre.');
  const noEnergy = spendEnergy(world, 1);
  if (noEnergy) return fail(noEnergy);
  arsenal.splice(arsenal.indexOf(item), 1);
  stash(world, equip(world, hero, item));
  hero.loyalty = Math.min(100, hero.loyalty + (hasTrait(hero, 'ganancioso') ? 15 : 10));
  record(world, 'prefeito', [hero.id], `O prefeito entregou ${itemName(item, hero.classId).toLowerCase()} a ${hero.name}.`);
  noteWish(world, { kind: 'presente', heroId: hero.id });
  return OK;
}

/** Vende uma peça do cofre por metade do valor. */
export function sellItem(world: World, itemId: number): CommandResult {
  const arsenal = world.town.arsenal ?? [];
  const item = arsenal.find((i) => i.id === itemId);
  if (!item) return fail('Essa peça não está no cofre.');
  arsenal.splice(arsenal.indexOf(item), 1);
  earn(world, sellPrice(item), 'venda');
  return OK;
}

/**
 * Contrato no quadro: conquistar um andar de uma passagem conhecida, ou (passageId null)
 * abrir uma passagem nova.
 */
export function postContract(world: World, passageId: number | null, floor: number, reward: number): CommandResult {
  if (level(world, 'guilda') < 1) return fail('Reconstrua a guilda para postar contratos.');
  const passage = passageId === null ? null : passageOf(world, passageId);
  if (passageId !== null) {
    if (!passage || passage.sealed) return fail('Essa passagem não está mais aberta.');
    if (!passage.discovered) return fail('Ninguém entrou nessa passagem ainda.');
    if (floor < 0 || floor >= passage.floors) return fail('Esse andar não existe nessa passagem.');
    if (passage.conquered[floor]) return fail('Esse andar já foi conquistado.');
  } else if (world.town.contracts.some((c) => c.passageId === null)) {
    return fail('Já há um contrato de passagem nova no quadro.');
  }
  if (world.town.contracts.length >= maxContracts(world)) return fail('O quadro está cheio.');
  if (world.town.treasury < reward) return fail('O tesouro não cobre a recompensa.');
  spend(world, 'contrato', reward);
  world.town.contracts.push({ id: world.nextId++, passageId, floor, reward, postedTick: world.tick, takenBy: null });
  const goal = passage ? `conquistar o ${floorLabel({ biome: passage.biome, floor })}` : 'abrir uma passagem nova';
  record(world, 'contrato', [], `Novo contrato no quadro: ${goal} por ${reward} de ouro.`);
  return OK;
}

// ── Amuleto e contrato do Senhor (M5 F2) ─────────────────────────────────

/**
 * Preço do próximo fragmento dos mercadores do abismo: várias vezes o do amuleto do nível,
 * mais caro a cada compra no mesmo nível (null = já comprou o limite do nível).
 */
export function fragmentPriceFor(world: World): number | null {
  const abyss = world.abyss;
  if (abyss.bought >= B.fragmentBuyMax) return null;
  return Math.round(amuletCostFor(world, abyss.level) * B.fragmentBuyMult * Math.pow(B.fragmentBuyGrowth, abyss.bought));
}

/** O joalheiro compra um fragmento do nível atual de mercadores do abismo. */
export function buyFragment(world: World): CommandResult {
  const abyss = world.abyss;
  if (abyss.amulet) return fail('Já há um amuleto montado para este nível.');
  if (abyss.fragments >= B.fragmentsPerAmulet) return fail('Os fragmentos para o amuleto já estão no Cofre.');
  const price = fragmentPriceFor(world);
  if (price === null) return fail(`Os mercadores só têm ${B.fragmentBuyMax} fragmentos por nível; o resto vem do abismo.`);
  if (world.town.treasury < price) return fail(`Faltam ${Math.ceil(price - world.town.treasury)} de ouro.`);
  spend(world, 'fragmento', price);
  abyss.fragments++;
  abyss.bought++;
  record(world, 'amuleto', [], `O joalheiro comprou um fragmento do nível ${abyss.level} de mercadores do abismo por ${price} de ouro (${abyss.fragments}/${B.fragmentsPerAmulet} no Cofre).`);
  return OK;
}

/** Monta o amuleto com 5 fragmentos do nível atual. Fica pronto em alguns dias. */
export function forgeAmulet(world: World): CommandResult {
  const abyss = world.abyss;
  if (abyss.amulet) return fail(abyss.amulet.inUse ? 'O amuleto está com o grupo no covil.' : 'Já há um amuleto montado.');
  if (abyss.fragments < B.fragmentsPerAmulet) return fail(`Faltam ${B.fragmentsPerAmulet - abyss.fragments} fragmentos do nível ${abyss.level}.`);
  const cost = amuletCostFor(world, abyss.level);
  if (world.town.treasury < cost) return fail(`O joalheiro cobra ${cost} de ouro.`);
  spend(world, 'amuleto', cost);
  abyss.fragments -= B.fragmentsPerAmulet;
  abyss.amulet = { level: abyss.level, readyTick: world.tick + B.amuletDays * TICKS_PER_DAY, inUse: false };
  record(world, 'amuleto', [], `O joalheiro começou a montar o amuleto do nível ${abyss.level} com ${B.fragmentsPerAmulet} fragmentos. Fica pronto em ${B.amuletDays} dias.`);
  return OK;
}

/** O preço do amuleto com a dificuldade da campanha. */
export const amuletCostFor = (world: World, lvl: number): number => scaledCost(world, Math.round(B.amuletBaseCost * Math.pow(levelPower(lvl), 0.8)));

/**
 * Contrato do Senhor: o grupo escolhido (a guilda propõe os mais fortes, o prefeito troca
 * quem quiser) desce com o amuleto ao covil do Senhor do nível dele.
 */
export function challengeLord(world: World, heroIds: number[]): CommandResult {
  const amulet = world.abyss.amulet;
  if (!amulet) return fail('Não há amuleto montado.');
  if (amulet.inUse) return fail('Um grupo já desceu com o amuleto.');
  if (world.tick < amulet.readyTick) return fail('O joalheiro ainda não terminou o amuleto.');
  const ids = [...new Set(heroIds)];
  if (ids.length === 0) return fail('Escolha quem vai.');
  if (ids.length > maxPartySize(world)) return fail(`A guilda forma grupos de até ${maxPartySize(world)}.`);
  const heroes = ids.map((id) => world.heroes.find((h) => h.id === id));
  if (heroes.some((h) => !h || h.status !== 'town')) return fail('Só vai quem está na vila.');
  if (heroes.some((h) => h!.injury)) return fail('Ninguém desce ferido ao covil.');
  amulet.inUse = true;
  departLord(world, heroes as Hero[], amulet.level);
  return OK;
}

/** Nome do Senhor que o amuleto do nível chama. */
export const lordName = (lvl: number): string => lordOf(lvl).name;

export function cancelContract(world: World, id: number): CommandResult {
  const contract = world.town.contracts.find((c) => c.id === id);
  if (!contract) return fail('Contrato não encontrado.');
  if (contract.takenBy !== null) return fail('Um grupo já está atrás desse contrato.');
  world.town.contracts = world.town.contracts.filter((c) => c.id !== id);
  world.town.treasury += contract.reward;
  return OK;
}

export function recall(world: World, partyId: number): CommandResult {
  const party = world.parties.find((p) => p.id === partyId);
  if (!party) return fail('Grupo não encontrado.');
  if (party.phase === 'voltando') return fail('O grupo já está voltando.');
  if (party.recallRequested) return fail('O sino já tocou.');
  party.recallRequested = true;
  world.town.reputation = Math.max(0, world.town.reputation - 1);
  return OK;
}

export function setDoctrine(world: World, doctrine: Doctrine): CommandResult {
  if (level(world, 'guilda') < 1) return fail('Reconstrua a guilda para definir a doutrina.');
  world.town.doctrine = doctrine;
  return OK;
}

export function setLootTax(world: World, rate: number): CommandResult {
  if (rate < 0 || rate > 0.5) return fail('O imposto vai de 0% a 50%.');
  world.town.lootTax = rate;
  return OK;
}

/** Abre os três lotes do distrito sul, cobrindo a limpeza da floresta. */

export function clearSouthExpansion(world: World): CommandResult {
  const expansion = world.town.expansion;
  if (expansion.cleared) return fail('Os lotes do sul já estão limpos.');
  const cost = expansionClearCost(world);
  if (world.town.treasury < cost) return fail(`Faltam ${Math.ceil(cost - world.town.treasury)} de ouro para limpar os lotes.`);
  spend(world, 'expansao', cost);
  expansion.cleared = true;
  record(world, 'construcao', [], 'O prefeito limpou a floresta ao sul. Três lotes de moradia estão abertos.');
  return OK;
}

/** Constrói uma casa em um dos três lotes do sul. */
export function buildExpansionHouse(world: World, index: number): CommandResult {
  const expansion = world.town.expansion;
  if (!expansion.cleared) return fail('Limpe os lotes do sul primeiro.');
  if (!Number.isInteger(index) || index < 0 || index >= expansion.houses.length) return fail('Lote inválido.');
  if (expansion.houses[index]) return fail('Esse lote já tem casa.');
  const cost = expansionHouseCost(world);
  if (world.town.treasury < cost) return fail(`Faltam ${Math.ceil(cost - world.town.treasury)} de ouro para a casa.`);
  spend(world, 'expansao', cost);
  expansion.houses[index] = true;
  record(world, 'construcao', [], `Uma casa foi construída no lote ${index + 1} do distrito sul. A vila cresce.`);
  return OK;
}

export function toggleDecree(world: World, id: DecreeId): CommandResult {
  if (!DECREE_IDS.includes(id)) return fail('Decreto desconhecido.');
  const def = DECREES[id];
  const active = world.town.decrees.includes(id);
  if (active) {
    world.town.decrees = world.town.decrees.filter((d) => d !== id);
    record(world, 'decreto', [], `O prefeito revogou o decreto "${def.name}".`);
    return OK;
  }
  if (world.town.decrees.length >= B.maxActiveDecrees) return fail(`Só cabem ${B.maxActiveDecrees} decretos ativos.`);
  const cost = decreeEnactCost(world, def);
  if (world.town.treasury < cost) return fail(`Faltam ${Math.ceil(cost - world.town.treasury)} de ouro para promulgar.`);
  spend(world, 'decreto', cost);
  world.town.decrees.push(id);
  record(world, 'decreto', [], `O prefeito promulgou o decreto "${def.name}": ${def.description}`);
  return OK;
}

/** Troca a dificuldade da campanha (vale dali em diante e fica na crônica). */
export function setDifficulty(world: World, difficulty: Difficulty): CommandResult {
  if (!DIFFICULTIES[difficulty]) return fail('Dificuldade desconhecida.');
  if ((world.difficulty ?? 'normal') === difficulty) return OK;
  world.difficulty = difficulty;
  record(world, 'prefeito', [], `A campanha seguiu na dificuldade ${DIFFICULTIES[difficulty].name}.`);
  return OK;
}

export function sponsor(world: World, heroId: number, amount: number): CommandResult {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero || (hero.status !== 'town' && hero.status !== 'expedition')) return fail('Herói indisponível.');
  if (world.town.treasury < amount) return fail('Ouro insuficiente.');
  spend(world, 'mecenato', amount);
  hero.gold += amount;
  hero.loyalty = Math.min(100, hero.loyalty + Math.min(20, amount / 5));
  record(world, 'contrato', [hero.id], `O prefeito patrocinou ${heroLabel(hero)} com ${amount} de ouro.`);
  return OK;
}

/** Dispensa um herói da vila. Os amigos dele não gostam. */
export function dismiss(world: World, heroId: number): CommandResult {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero || hero.status !== 'town') return fail('Só dá para dispensar quem está na vila.');
  hero.status = 'left';
  hero.activity = null;
  hero.lfgSince = null;
  world.metrics.left++;
  for (const other of activeHeroes(world)) {
    const bond = getBond(world, hero.id, other.id);
    other.loyalty = Math.max(0, other.loyalty - (bond > 30 ? 6 : 1));
    if (bond > 30) other.morale = Math.max(0, other.morale - 10);
  }
  record(world, 'dispensa', [hero.id], `O prefeito dispensou ${heroLabel(hero)}, que deixou a vila depois de ${hero.stats.expeditions} expedições.`);
  return OK;
}

/** Recompensa sugerida para um contrato, proporcional ao perigo do andar (do nível do abismo). */
export const suggestedReward = (level: number, floor: number): number => Math.round(30 * levelPower(level) * (1 + 0.3 * floor));

// ── Prefeito e pessoas (M2) ─────────────────────────────────────────────

function heroInTown(world: World, heroId: number): Hero | string {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero) return 'Herói não encontrado.';
  if (hero.status !== 'town') return `${hero.name} não está na vila agora.`;
  return hero;
}

function spendEnergy(world: World, cost: number): string | null {
  if (world.town.mayorEnergy < cost) return 'O prefeito já está sem energia hoje. Amanhã tem mais.';
  world.town.mayorEnergy -= cost;
  return null;
}

/** Conversa com um herói: +lealdade e +ânimo; às vezes ele se abre e revela o traço oculto. */
export function talk(world: World, heroId: number): CommandResult {
  const hero = heroInTown(world, heroId);
  if (typeof hero === 'string') return fail(hero);
  const today = dayOf(world.tick);
  if (hero.lastTalkDay === today) return fail(`Já conversou com ${hero.name} hoje.`);
  const noEnergy = spendEnergy(world, 1);
  if (noEnergy) return fail(noEnergy);
  hero.lastTalkDay = today;
  const gain = B.talkLoyalty + (hasTrait(hero, 'leal') ? 3 : 0) - (hasTrait(hero, 'ganancioso') ? 3 : 0);
  hero.loyalty = Math.min(100, hero.loyalty + gain);
  hero.morale = Math.min(100, hero.morale + 5);
  const hidden = hero.traits.find((t) => !t.revealed);
  if (hidden && chance(world.rng, 0.25)) revealTrait(world, hero, hidden.id, `Conversando com o prefeito, ${hero.name} se abriu.`);
  noteWish(world, { kind: 'conversa', heroId: hero.id });
  return OK;
}

export const giftPrice = (world: World, heroId: number, kind: GiftKind): number => {
  if (kind !== 'arma') return B.giftPrice[kind];
  const hero = world.heroes.find((h) => h.id === heroId);
  return hero ? forgePrice(world, hero.gear.weapon + 1) : 0;
};

/** Presente pago pelo tesouro. Cada temperamento prefere uma coisa. */
export function gift(world: World, heroId: number, kind: GiftKind): CommandResult {
  const hero = heroInTown(world, heroId);
  if (typeof hero === 'string') return fail(hero);
  if (kind === 'arma' && hero.gear.weapon + 1 > maxGearTier(world, 'weapon')) return fail('O ferreiro ainda não forja uma arma melhor que a dele.');
  const price = giftPrice(world, heroId, kind);
  if (world.town.treasury < price) return fail(`Faltam ${Math.ceil(price - world.town.treasury)} de ouro.`);
  const noEnergy = spendEnergy(world, 1);
  if (noEnergy) return fail(noEnergy);
  spend(world, 'presente', price);
  let what: string;
  switch (kind) {
    case 'bebida': {
      const fan = hasTrait(hero, 'beberrao');
      hero.needs.fun = Math.min(100, hero.needs.fun + 40);
      hero.morale = Math.min(100, hero.morale + (fan ? 25 : 10));
      hero.loyalty = Math.min(100, hero.loyalty + (fan ? 8 : 4));
      what = 'uma rodada na taverna';
      break;
    }
    case 'reliquia': {
      const fan = hasTrait(hero, 'devoto');
      hero.needs.faith = Math.min(100, hero.needs.faith + 50);
      hero.morale = Math.min(100, hero.morale + (fan ? 20 : 10));
      hero.loyalty = Math.min(100, hero.loyalty + (fan ? 12 : 6));
      hero.grief = Math.max(0, hero.grief - 20);
      what = 'uma relíquia do templo';
      break;
    }
    case 'arma': {
      upgradeTier(world, hero, 'weapon', 'presente do prefeito');
      hero.loyalty = Math.min(100, hero.loyalty + (hasTrait(hero, 'ganancioso') ? 15 : 10));
      what = 'uma arma nova da forja';
      break;
    }
  }
  record(world, 'prefeito', [hero.id], `O prefeito presenteou ${hero.name} com ${what}.`);
  return OK;
}

/** Consola quem está de luto. */
export function comfort(world: World, heroId: number): CommandResult {
  const hero = heroInTown(world, heroId);
  if (typeof hero === 'string') return fail(hero);
  if (hero.grief <= 0) return fail(`${hero.name} não está de luto.`);
  const noEnergy = spendEnergy(world, 1);
  if (noEnergy) return fail(noEnergy);
  hero.grief = Math.max(0, hero.grief - B.consoleGrief);
  hero.morale = Math.min(100, hero.morale + 10);
  hero.loyalty = Math.min(100, hero.loyalty + 5);
  const lost = world.heroes.find((h) => h.id === hero.griefFor);
  record(world, 'prefeito', [hero.id], `O prefeito sentou com ${hero.name} para falar de ${lost?.name ?? 'quem se foi'}.`);
  if (hero.grief === 0) hero.griefFor = null;
  return OK;
}

/** Discurso na praça: ânimo e lealdade para todos que estão na vila. */
export function speech(world: World): CommandResult {
  const today = dayOf(world.tick);
  if (world.town.speechDay === today) return fail('O prefeito já discursou hoje.');
  const listeners = townHeroes(world);
  if (listeners.length === 0) return fail('Não há ninguém na vila para ouvir.');
  const noEnergy = spendEnergy(world, 2);
  if (noEnergy) return fail(noEnergy);
  world.town.speechDay = today;
  for (const h of listeners) {
    h.morale = Math.min(100, h.morale + B.speechMorale + (hasTrait(h, 'covarde') ? 6 : 0));
    h.loyalty = Math.min(100, h.loyalty + 3);
  }
  record(world, 'prefeito', listeners.map((h) => h.id), `O prefeito subiu num barril na praça e falou do abismo. ${listeners.length} heróis ouviram.`);
  return OK;
}

export function rename(world: World, heroId: number, name: string): CommandResult {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero) return fail('Herói não encontrado.');
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length < 2 || clean.length > 20) return fail('O nome precisa ter de 2 a 20 letras.');
  if (clean === hero.name) return OK;
  const before = hero.name;
  hero.name = clean;
  record(world, 'prefeito', [hero.id], `${before} agora atende por ${clean}.`);
  return OK;
}

/** Aposentadoria honrosa: o herói fica na vila com uma função (ao contrário de dispensar). */
export function retire(world: World, heroId: number, role?: RetiredRole): CommandResult {
  const hero = heroInTown(world, heroId);
  if (typeof hero === 'string') return fail(hero);
  retireHero(world, hero, 'com honras, por decisão do prefeito', role ?? defaultRole(hero, world));
  return OK;
}

/** Festa na praça: o tesouro vira ânimo, lealdade e reputação. Some do cofre e volta como história. */
export function holdFestival(world: World): CommandResult {
  const town = world.town;
  const today = dayOf(world.tick);
  if (town.festivalDay >= 0 && today < town.festivalDay + B.festivalCooldownDays) {
    const wait = town.festivalDay + B.festivalCooldownDays - today;
    return fail(`A última festa ainda está na memória: espere ${wait} ${wait === 1 ? 'dia' : 'dias'}.`);
  }
  const listeners = townHeroes(world);
  if (listeners.length === 0) return fail('Não há ninguém na vila para festejar.');
  const cost = festivalCost(world);
  if (town.treasury < cost) return fail(`Faltam ${Math.ceil(cost - town.treasury)} de ouro para a festa.`);
  spend(world, 'festa', cost);
  town.festivalDay = today;
  town.reputation = Math.min(100, town.reputation + B.festivalReputation);
  town.population = Math.min(populationCap(world), town.population + 2);
  for (const hero of listeners) {
    hero.morale = Math.min(100, hero.morale + B.festivalMorale);
    hero.loyalty = Math.min(100, hero.loyalty + B.festivalLoyalty);
    hero.grief = Math.max(0, hero.grief - 15);
    hero.needs.fun = Math.min(100, hero.needs.fun + 30);
  }
  festivalCitizens(world, B.festivalMorale);
  syncCitizenRoster(world);
  record(
    world,
    'festival',
    listeners.map((h) => h.id),
    `A vila fechou as portas e abriu as mesas: a festa na praça custou ${cost} de ouro e levantou o ânimo de ${listeners.length} heróis.`,
  );
  noteWish(world, { kind: 'festa' });
  return OK;
}

/** Resposta do prefeito a uma petição da audiência da manhã (M6 F1). */
export const answerPetition = (world: World, petitionId: number, choiceId: string): CommandResult => answerPetitionImpl(world, petitionId, choiceId);

/** Preço da lápide nova (desejo de quem ficou): ouro simbólico, com a dificuldade. */
export const graveCost = (world: World): number => scaledCost(world, B.wishGraveCost);

/** Lápide nova para um herói morto, a pedido de quem ficou (M6 F1). */
export function honorGrave(world: World, deadId: number): CommandResult {
  const dead = world.heroes.find((h) => h.id === deadId && h.status === 'dead');
  if (!dead) return fail('Essa cova não existe.');
  if (dead.honoredGrave) return fail(`A lápide de ${dead.name} já foi refeita.`);
  const cost = graveCost(world);
  if (world.town.treasury < cost) return fail(`Faltam ${Math.ceil(cost - world.town.treasury)} de ouro.`);
  spend(world, 'audiencia', cost);
  dead.honoredGrave = true;
  record(world, 'tumulo', [dead.id], `O prefeito mandou fazer uma lápide nova para ${dead.name}.`);
  noteWish(world, { kind: 'lapide', deadId: dead.id });
  return OK;
}

export function assignRole(world: World, heroId: number, role: RetiredRole): CommandResult {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero || hero.status !== 'retired') return fail('Só aposentados têm função na vila.');
  if (hero.retiredRole === role) return OK;
  hero.retiredRole = role;
  const r = ROLE_NAMES[role];
  record(world, 'funcao', [hero.id], `${hero.name} agora é ${r[hero.gender]} ${r.where}.`);
  return OK;
}

/** Evento sazonal: mantém a mesma porta de entrada das outras alavancas. */
export const resolveSeasonalEvent = resolveSeasonalEventImpl;
