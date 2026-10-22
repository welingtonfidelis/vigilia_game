// Itens nomeados (M4): criar, nomear, equipar, guardar no arsenal, achar no abismo,
// herdar e encomendar na forja. As peças entram nos números do combate pelos afixos.

import { ACTS } from '../data/acts.ts';
import {
  AFFIX_IDS,
  AFFIXES,
  ARMOR_NOUN,
  CLASS_AFFIXES,
  GENERIC_NOUN,
  LEGENDARY_TITLES,
  MATERIAL_AFFIX,
  MATERIAL_OF,
  RARITY_AFFIXES,
  WEAPON_NOUN,
} from '../data/items.ts';
import { dayOf, yearOf } from './calendar.ts';
import { floorLabel, ofWhom, record } from './chronicle.ts';
import { BALANCE as B, TICKS_PER_DAY } from './config.ts';
import { hasSpec, level, maxGearTier } from './economy.ts';
import { heroStats } from './hero.ts';
import { chance, pick } from './rng.ts';
import type { BenchService, ClassId, Hero, Item, ItemAffix, ItemSlot, MaterialId, Party, Rarity, World } from './types.ts';
import { difficultyOf, scaledCost } from './difficulty.ts';

export const ITEM_SLOTS: readonly ItemSlot[] = ['weapon', 'armor', 'amulet'];

export const emptyItems = (): Record<ItemSlot, Item | null> => ({ weapon: null, armor: null, amulet: null });

/** Quantas peças equipadas trazem o afixo. */
export function affixCount(hero: Hero, affix: ItemAffix): number {
  let n = 0;
  for (const slot of ITEM_SLOTS) for (const a of hero.items?.[slot]?.affixes ?? []) if (a === affix) n++;
  return n;
}

/** Quanto a peça vale para o herói: tier mais um tanto por afixo. Vazio vale 0. */
export const itemValue = (item: Item | null | undefined): number => (item ? item.tier + B.affixValue * item.affixes.length : 0);

const RARITY_PRICE: Record<Rarity, number> = { comum: 0.5, rara: 1, epica: B.commissionEpicMult, lendaria: 4 };

/**
 * Preço de tabela: o mesmo da encomenda na forja (a venda paga uma fração dele, então
 * encomendar para vender nunca dá lucro).
 */
export function itemPrice(item: Item): number {
  return Math.round((B.commissionBase + B.commissionPerTier * Math.max(4, item.tier)) * RARITY_PRICE[item.rarity]);
}

export const sellPrice = (item: Item): number => Math.round(itemPrice(item) * B.itemSellFraction);

const TIER_WORD: { upTo: number; m: string; f: string }[] = [
  { upTo: 3, m: 'de ferro', f: 'de ferro' },
  { upTo: 6, m: 'de aço', f: 'de aço' },
  { upTo: 9, m: 'temperado', f: 'temperada' },
  { upTo: Infinity, m: 'de mestre', f: 'de mestre' },
];

/**
 * Nome de tela. A arma muda conforme a classe de quem usa ("Machado afiado de osso"); sem
 * dono, no arsenal, vira "Arma afiada de osso". A lendária tem nome próprio.
 */
export function itemName(item: Item, classId: ClassId | null): string {
  if (item.title) return item.title;
  const noun =
    item.slot === 'amulet' ? GENERIC_NOUN.amulet : classId ? (item.slot === 'weapon' ? WEAPON_NOUN : ARMOR_NOUN)[classId] : GENERIC_NOUN[item.slot];
  const adjs = item.affixes.map((a) => AFFIXES[a].adj[noun.g]);
  let name = noun.name;
  if (adjs.length === 1) name += ` ${adjs[0]}`;
  else if (adjs.length >= 2) name += ` ${adjs.slice(0, -1).join(', ')} e ${adjs[adjs.length - 1]}`;
  if (item.material) name += ` ${MATERIAL_OF[item.material]}`;
  else if (item.rarity === 'comum' && item.slot !== 'amulet') name += ` ${TIER_WORD.find((w) => item.tier <= w.upTo)![noun.g]}`;
  return name;
}

/** Todas as peças que existem agora (equipadas, no cofre, com mortos, a caminho). */
function allItems(world: World): Item[] {
  const out: Item[] = [];
  for (const h of world.heroes) for (const slot of ITEM_SLOTS) if (h.items?.[slot]) out.push(h.items[slot]!);
  out.push(...(world.town.arsenal ?? []));
  for (const r of world.remains) out.push(...(r.items ?? []));
  for (const p of world.parties) out.push(...(p.loot.items ?? []));
  return out;
}

export interface NewItem {
  slot: ItemSlot;
  rarity: Rarity;
  tier: number;
  origin: string;
  material?: MaterialId | null;
  /** Afixos que a peça já traz; o resto é sorteado até o número da raridade. */
  affixes?: ItemAffix[];
}

export function newItem(world: World, o: NewItem): Item {
  const affixes = [...(o.affixes ?? [])];
  const want = Math.max(RARITY_AFFIXES[o.rarity], o.slot === 'amulet' ? 1 : 0);
  while (affixes.length < want) {
    const options = AFFIX_IDS.filter((a) => !affixes.includes(a));
    affixes.push(pick(world.rng, options));
  }
  let title: string | null = null;
  if (o.rarity === 'lendaria') {
    const used = new Set(allItems(world).map((i) => i.title));
    const free = LEGENDARY_TITLES.filter((t) => !used.has(t));
    title = free.length > 0 ? pick(world.rng, free) : `${pick(world.rng, LEGENDARY_TITLES)} ${['II', 'III', 'IV'][used.size % 3]}`;
  }
  return {
    id: world.nextId++,
    slot: o.slot,
    rarity: o.rarity,
    tier: o.slot === 'amulet' ? 0 : Math.max(1, Math.round(o.tier)),
    affixes,
    material: o.material ?? null,
    title,
    origin: o.origin,
    owners: [],
    createdTick: world.tick,
  };
}

/** Peça comum de um tier (o que a forja vende aos heróis). */
export const commonItem = (world: World, slot: 'weapon' | 'armor', tier: number, origin: string): Item =>
  newItem(world, { slot, rarity: 'comum', tier, origin });

/**
 * Põe a peça no herói e devolve a que ele usava. Ajusta o tier espelhado em `gear` e
 * a vida, se a vida máxima subiu.
 */
export function equip(world: World, hero: Hero, item: Item): Item | null {
  hero.items ??= emptyItems();
  const before = heroStats(world, hero).maxHp;
  const old = hero.items[item.slot];
  hero.items[item.slot] = item;
  if (item.slot !== 'amulet') hero.gear[item.slot] = item.tier;
  if (item.owners[item.owners.length - 1] !== hero.id) item.owners.push(hero.id);
  const after = heroStats(world, hero).maxHp;
  if (after > before) hero.hp = Math.min(after, hero.hp + (after - before));
  else hero.hp = Math.min(hero.hp, after);
  return old;
}

/**
 * Guarda no cofre da vila. Peça comum o ferreiro derrete (não ocupa o arsenal), e com o
 * cofre cheio também derrete a de menor valor.
 */
export function stash(world: World, item: Item | null): void {
  if (!item || item.rarity === 'comum') return;
  const arsenal = (world.town.arsenal ??= []);
  arsenal.push(item);
  // Cofre cheio: o ferreiro derrete a pior peça (o cofre não vira fonte de ouro).
  while (arsenal.length > B.arsenalMax) {
    const worst = arsenal.reduce((lo, i) => (itemValue(i) < itemValue(lo) ? i : lo));
    arsenal.splice(arsenal.indexOf(worst), 1);
  }
}

/** Quanto o herói ganha trocando a peça dele por esta. */
export const upgradeGain = (hero: Hero, item: Item): number => itemValue(item) - itemValue(hero.items?.[item.slot]);

/** O herói fica com a peça se ela for melhor; a antiga vai para o cofre. */
export function offer(world: World, hero: Hero, item: Item): boolean {
  if (upgradeGain(hero, item) <= 0.01) return false;
  stash(world, equip(world, hero, item));
  return true;
}

/** Tira tudo o que o herói usa (morte, aposentadoria). O tier em `gear` fica como lembrança. */
export function takeItems(hero: Hero): Item[] {
  const out: Item[] = [];
  for (const slot of ITEM_SLOTS) {
    const item = hero.items?.[slot];
    if (item) out.push(item);
    if (hero.items) hero.items[slot] = null;
  }
  return out;
}

/**
 * Melhora a arma em um tier (presente do prefeito, compra na forja). Peça nomeada o
 * ferreiro reforja e ela sobe de tier; peça comum é trocada por uma nova.
 */
export function upgradeTier(world: World, hero: Hero, slot: 'weapon' | 'armor', origin: string): Item {
  hero.items ??= emptyItems();
  const current = hero.items[slot];
  if (current && current.rarity !== 'comum') {
    const before = heroStats(world, hero).maxHp;
    current.tier++;
    hero.gear[slot] = current.tier;
    const after = heroStats(world, hero).maxHp;
    if (after > before) hero.hp += after - before;
    return current;
  }
  const item = commonItem(world, slot, (current?.tier ?? hero.gear[slot]) + 1, origin);
  equip(world, hero, item);
  return item;
}

/** O próximo tier que vale a pena comprar neste encaixe (null = não compensa ou a forja não faz). */
export function nextTierWorth(world: World, hero: Hero, slot: 'weapon' | 'armor'): number | null {
  const current = hero.items?.[slot] ?? null;
  const tier = (current?.tier ?? hero.gear[slot]) + 1;
  if (tier > maxGearTier(world, slot)) return null;
  // Uma peça nomeada só vale a troca quando o ferreiro a reforja (sobe o tier dela).
  if (current && current.rarity !== 'comum') return tier;
  return tier > itemValue(current) ? tier : null;
}

// ── Abismo ───────────────────────────────────────────────────────────────

/**
 * Tier das peças que caem num andar: cresce com o ato e a profundidade, mas nunca passa
 * do que a forja da vila já faz (o abismo devolve peças da época; o ganho está nos afixos).
 */
export const dropTier = (world: World, act: number, floor: number, slot: ItemSlot): number =>
  Math.max(1, Math.min(B.dropTierMax, act * 2 + floor, Math.max(1, maxGearTier(world, slot === 'amulet' ? undefined : slot))));

/**
 * Tier da lendária que o chefe deixa: acima do que a forja faz na hora (ou do tier do
 * ato, o que for maior), para a peça de chefe valer o nome por bastante tempo.
 */
export const legendaryTier = (world: World, act: number, floor: number, slot: ItemSlot): number =>
  Math.min(B.dropTierMax + B.legendaryDropEdge + 1, Math.max(act * 2 + floor, maxGearTier(world, slot === 'amulet' ? undefined : slot)) + B.legendaryDropEdge);

/**
 * Lendárias acompanham a vila: quando o ferreiro sobe ou se especializa, toda lendária
 * de arma e armadura fica pelo menos B.legendaryFollowEdge acima do teto da forja (o
 * polimento do joalheiro leva até 2 acima). Chamado uma vez por dia.
 */
export function raiseLegendaries(world: World): void {
  const raised: Item[] = [];
  for (const item of allItems(world)) {
    if (item.rarity !== 'lendaria' || item.slot === 'amulet') continue;
    const floor = maxGearTier(world, item.slot) + B.legendaryFollowEdge;
    if (item.tier >= floor) continue;
    const owner = world.heroes.find((h) => h.items?.[item.slot] === item);
    const before = owner ? heroStats(world, owner).maxHp : 0;
    item.tier = floor;
    if (owner) {
      owner.gear[item.slot] = item.tier;
      const after = heroStats(world, owner).maxHp;
      if (after > before) owner.hp += after - before;
    }
    raised.push(item);
  }
  if (raised.length === 0) return;
  const names = raised.map((i) => i.title ?? itemName(i, null)).join(', ');
  record(world, 'item', [], `O ferreiro ajustou ${raised.length === 1 ? 'a lendária' : 'as lendárias'} ${names} ao tier da vila.`);
}

export type DropSource = 'bau' | 'elite' | 'chefe';

/**
 * Talvez uma peça para o saque do grupo (baú, elite ou chefe). Só em terreno novo: um
 * andar já conquistado, refeito, dá ouro e experiência, não peças. Assim o total de
 * peças da campanha cabe no mapa e não cresce com a repetição.
 */
export function rollDrop(world: World, party: Party, source: DropSource): Item | null {
  if (!party.persistent) return null;
  const f = party.floor;
  let rarity: Rarity | null = null;
  // O primeiro chefe de cada ato deixa uma lendária.
  if (source === 'chefe') rarity = !world.acts[party.act]!.bossDefeated ? 'lendaria' : null;
  else {
    // A dificuldade mexe na chance de peça rara e épica (a lendária do chefe não muda).
    const luck = difficultyOf(world).rarity;
    if (source === 'elite') rarity = chance(world.rng, B.eliteEpicChance * luck) ? 'epica' : chance(world.rng, B.eliteRareChance * luck) ? 'rara' : null;
    else rarity = chance(world.rng, (B.chestEpicChance + B.chestEpicPerFloor * f) * luck) ? 'epica' : chance(world.rng, (B.chestRareChance + B.chestRarePerFloor * f) * luck) ? 'rara' : null;
  }
  if (!rarity) return null;
  const act = ACTS[party.act]!;
  const material = act.material;
  const first = chance(world.rng, 0.15) ? 'afortunado' : pick(world.rng, MATERIAL_AFFIX[material]);
  const where = source === 'chefe' ? `tirado ${ofWhom(act.boss.name)} no ${floorLabel(party.act, f)}` : `achado no ${floorLabel(party.act, f)}`;
  const slot = pick(world.rng, ITEM_SLOTS);
  const item = newItem(world, {
    slot,
    rarity,
    tier: rarity === 'lendaria' ? legendaryTier(world, party.act, f, slot) : dropTier(world, party.act, f, slot),
    material,
    affixes: [first],
    origin: `${where} no ano ${yearOf(dayOf(world.tick))}`,
  });
  (party.loot.items ??= []).push(item);
  const label = rarity === 'lendaria' ? `a lendária ${item.title}` : `uma peça ${rarity === 'epica' ? 'épica' : 'rara'}`;
  party.moments.push(source === 'bau' ? `No baú havia ${label}.` : source === 'elite' ? `O elite deixou ${label}.` : `${act.boss.name} deixou ${label}.`);
  return item;
}

/**
 * Na volta, cada peça vai para quem mais ganha com ela; o que ninguém quer fica no
 * cofre. As épicas e lendárias entram na crônica.
 */
export function shareLoot(world: World, party: Party, heroes: Hero[]): void {
  const items = [...(party.loot.items ?? [])].sort((a, b) => itemValue(b) - itemValue(a));
  party.loot.items = [];
  for (const item of items) {
    let taker: Hero | null = null;
    let best = 0.01;
    for (const h of heroes) {
      const gain = upgradeGain(h, item);
      if (gain > best) {
        best = gain;
        taker = h;
      }
    }
    // Peça que já teve dono: veio dos restos de alguém.
    const before = item.owners[item.owners.length - 1];
    const lost = before !== undefined ? world.heroes.find((h) => h.id === before) : undefined;
    if (taker) offer(world, taker, item);
    else stash(world, item);
    if (item.rarity === 'epica' || item.rarity === 'lendaria') {
      const name = itemName(item, taker?.classId ?? null);
      const label = item.title ? `a lendária ${name}` : name.charAt(0).toLowerCase() + name.slice(1);
      const where = floorLabel(party.act, party.floor);
      const text = lost
        ? taker
          ? `${taker.name} recuperou ${label}, que era de ${lost.name}, no ${where}.`
          : `${label.charAt(0).toUpperCase() + label.slice(1)}, que era de ${lost.name}, voltou do ${where} para o cofre da vila.`
        : taker
          ? `${taker.name} voltou do ${where} usando ${label}.`
          : `${label.charAt(0).toUpperCase() + label.slice(1)} voltou do ${where} e foi para o cofre da vila.`;
      record(world, 'item', taker ? [taker.id] : party.memberIds, text);
    }
  }
}

// ── Herança ──────────────────────────────────────────────────────────────

/** A peça que um filho herda: a arma do melhor dos pais, um tier abaixo, com um afixo dela. */
export function heirloomFor(world: World, a: Hero, b: Hero): Item | null {
  const parent = (h: Hero) => itemValue(h.items?.weapon) || h.gear.weapon;
  const best = parent(a) >= parent(b) ? a : b;
  const weapon = best.items?.weapon ?? null;
  const tier = Math.max(weapon?.tier ?? 0, best.gear.weapon) - 1;
  if (tier < 1) return null;
  const affix = weapon && weapon.affixes.length > 0 ? [pick(world.rng, weapon.affixes)] : [];
  return newItem(world, {
    slot: 'weapon',
    rarity: affix.length > 0 ? 'rara' : 'comum',
    tier,
    material: weapon?.material ?? null,
    affixes: affix,
    origin: `herança de ${a.name} e ${b.name}`,
  });
}

// ── Forja ────────────────────────────────────────────────────────────────

export interface Commission {
  gold: number;
  material: number;
  days: number;
  tier: number;
}

/**
 * Quanto custa encomendar uma peça. A encomenda sai acima do que se compra pronto: rara
 * um tier acima do teto da forja, épica dois.
 */
export function commissionCost(world: World, slot: ItemSlot, rarity: 'rara' | 'epica'): Commission {
  const edge = rarity === 'epica' ? B.commissionEpicTierEdge : B.commissionRareTierEdge;
  const tier = slot === 'amulet' ? 0 : maxGearTier(world, slot) + edge;
  // O preço sobe devagar com o tier: o que pesa na encomenda é o material do abismo.
  const base = B.commissionBase + B.commissionPerTier * Math.max(4, slot === 'amulet' ? maxGearTier(world) : tier);
  return rarity === 'epica'
    ? { gold: scaledCost(world, Math.round(base * B.commissionEpicMult)), material: B.commissionEpicMaterial, days: B.commissionEpicDays, tier }
    : { gold: scaledCost(world, Math.round(base)), material: B.commissionRareMaterial, days: B.commissionRareDays, tier };
}

/** Por que a forja não aceita esta encomenda (null = aceita). */
export function commissionBlocker(world: World, slot: ItemSlot, rarity: 'rara' | 'epica'): string | null {
  const smith = level(world, 'ferreiro');
  if (smith < 2) return 'O ferreiro precisa estar no nível 2 para encomendas.';
  if (rarity === 'epica') {
    const spec = slot === 'weapon' ? 'laminas' : slot === 'armor' ? 'couracas' : null;
    if (smith < 3 || !spec || !hasSpec(world, spec)) {
      return slot === 'amulet' ? 'Amuletos épicos a forja não faz.' : `Peças épicas pedem o ferreiro especializado em ${slot === 'weapon' ? 'Lâminas' : 'Couraças'}.`;
    }
  }
  const busy = (world.town.forge ?? []).filter((o) => o.slot === slot).length;
  const total = (world.town.forge ?? []).length;
  if (total >= forgeCapacity(world) || busy >= forgeSlotCapacity(world, slot)) return 'A forja está ocupada.';
  return null;
}

/** Quantas encomendas cabem ao mesmo tempo. */
export const forgeCapacity = (world: World): number => (hasSpec(world, 'laminas') || hasSpec(world, 'couracas') ? 2 : 1);

/** A especialização dobra só o encaixe dela. */
export const forgeSlotCapacity = (world: World, slot: ItemSlot): number =>
  (slot === 'weapon' && hasSpec(world, 'laminas')) || (slot === 'armor' && hasSpec(world, 'couracas')) ? 2 : 1;

/** Entrega as encomendas prontas no cofre. Chamado a cada hora. */
export function processForge(world: World): void {
  const orders = world.town.forge ?? [];
  const ready = orders.filter((o) => o.readyTick <= world.tick);
  if (ready.length === 0) return;
  world.town.forge = orders.filter((o) => o.readyTick > world.tick);
  for (const o of ready) {
    const affixes: ItemAffix[] = [pick(world.rng, MATERIAL_AFFIX[o.material])];
    const item = newItem(world, {
      slot: o.slot,
      rarity: o.rarity,
      tier: o.tier,
      material: o.material,
      affixes,
      origin: `forjado na vila no ano ${yearOf(dayOf(world.tick))}`,
    });
    stash(world, item);
    record(world, 'item', [], `A forja entregou ${itemName(item, null).toLowerCase()} (${o.rarity === 'epica' ? 'épica' : 'rara'}). Está no cofre da vila.`);
  }
}

export const commissionReadyTick = (world: World, days: number): number => world.tick + days * TICKS_PER_DAY;

// ── Bancada do joalheiro (ferreiro nível 3) ─────────────────────────────

/** Tier que conta no preço da bancada (o amuleto conta como 8). */
const benchTier = (item: Item): number => (item.slot === 'amulet' ? 8 : item.tier);

export const enchantPrice = (item: Item): number => B.benchEnchantBase + B.benchEnchantPerTier * benchTier(item);
export const reforgePrice = (item: Item): number => Math.round(enchantPrice(item) / 2);

/** O afixo da peça que menos serve para a classe (null = todos servem). */
function weakestAffix(item: Item, classId: ClassId): ItemAffix | null {
  const liked = CLASS_AFFIXES[classId];
  return item.affixes.find((a) => !liked.includes(a)) ?? null;
}

export interface BenchOffer {
  service: BenchService;
  slot: ItemSlot;
  price: number;
  /** Quanto o valor da peça sobe (em tiers), para o herói comparar. */
  gain: number;
}

/**
 * O melhor serviço da bancada que o herói pode pagar agora: encantar (+1 afixo), reforjar
 * (troca um afixo que não serve à classe) ou polir a lendária (+1 tier). null = nada a fazer.
 */
export function benchOffer(world: World, hero: Hero): BenchOffer | null {
  if (level(world, 'ferreiro') < 3) return null;
  let best: BenchOffer | null = null;
  const consider = (o: BenchOffer) => {
    if (o.price > hero.gold) return;
    if (!best || o.gain / o.price > best.gain / best.price) best = o;
  };
  for (const slot of ITEM_SLOTS) {
    const item = hero.items?.[slot];
    if (!item) continue;
    if ((item.rarity === 'rara' || item.rarity === 'epica') && item.affixes.length < 3) {
      consider({ service: 'encantar', slot, price: enchantPrice(item), gain: B.affixValue });
    }
    if (item.rarity !== 'comum' && weakestAffix(item, hero.classId)) {
      consider({ service: 'reforjar', slot, price: reforgePrice(item), gain: B.affixValue / 2 });
    }
    if (item.rarity === 'lendaria' && slot !== 'amulet' && item.tier < maxGearTier(world, slot) + 2) {
      consider({ service: 'polir', slot, price: B.benchPolishPrice, gain: 1 });
    }
  }
  return best;
}

/** Faz o serviço: cobra do herói, muda a peça e anota na história dela. */
export function useBench(world: World, hero: Hero, offer: BenchOffer): void {
  const item = hero.items?.[offer.slot];
  if (!item || hero.gold < offer.price) return;
  hero.gold -= offer.price;
  // A forja fica com uma parte (o resto é o trabalho do joalheiro).
  world.town.treasury += offer.price * B.benchTreasuryShare;
  const year = yearOf(dayOf(world.tick));
  const before = item.rarity;
  const statsBefore = heroStats(world, hero).maxHp;
  switch (offer.service) {
    case 'encantar': {
      const options = AFFIX_IDS.filter((a) => !item.affixes.includes(a));
      const liked = options.filter((a) => CLASS_AFFIXES[hero.classId].includes(a));
      item.affixes.push(pick(world.rng, liked.length > 0 && chance(world.rng, 0.6) ? liked : options));
      if (item.rarity === 'rara') item.rarity = 'epica';
      item.enchants = (item.enchants ?? 0) + 1;
      (item.history ??= []).push(`encantada por ${hero.name} no ano ${year}`);
      break;
    }
    case 'reforjar': {
      const weak = weakestAffix(item, hero.classId);
      if (!weak) break;
      const options = CLASS_AFFIXES[hero.classId].filter((a) => !item.affixes.includes(a));
      if (options.length === 0) break;
      item.affixes[item.affixes.indexOf(weak)] = pick(world.rng, options);
      (item.history ??= []).push(`reforjada por ${hero.name} no ano ${year}`);
      break;
    }
    case 'polir': {
      item.tier++;
      if (item.slot !== 'amulet') hero.gear[item.slot] = item.tier;
      (item.history ??= []).push(`polida por ${hero.name} no ano ${year}`);
      break;
    }
  }
  const statsAfter = heroStats(world, hero).maxHp;
  if (statsAfter > statsBefore) hero.hp += statsAfter - statsBefore;
  const visits = (world.town.bench ??= []);
  visits.push({ tick: world.tick, heroId: hero.id, service: offer.service, itemId: item.id, price: offer.price });
  if (visits.length > B.benchLogSize) visits.splice(0, visits.length - B.benchLogSize);
  const name = itemName(item, hero.classId);
  if (offer.service === 'polir') {
    record(world, 'item', [hero.id], `${hero.name} pagou ${offer.price} de ouro ao joalheiro para polir a lendária ${name}.`);
  } else if (item.rarity !== before) {
    record(world, 'item', [hero.id], `${hero.name} levou ${name.charAt(0).toLowerCase() + name.slice(1)} ao joalheiro e saiu com uma peça épica.`);
  }
}

// ── Mercador errante ─────────────────────────────────────────────────────

/** Preço do mercador: a tabela da forja com a margem dele. */
export const merchantPrice = (item: Item): number => Math.round(itemPrice(item) * B.merchantMarkup);

/**
 * O mercador mostra uma peça do ato; quem mais ganha com ela e tem o ouro compra (ouro do
 * herói) e já sai usando. Sem comprador, ele segue caminho. Devolve quem comprou.
 */
export function merchantVisit(world: World, party: Party, heroes: Hero[]): Hero | null {
  const act = ACTS[party.act]!;
  const material = act.material;
  const slot = pick(world.rng, ITEM_SLOTS);
  const item = newItem(world, {
    slot,
    rarity: chance(world.rng, B.merchantEpicChance) ? 'epica' : 'rara',
    tier: dropTier(world, party.act, party.floor, slot),
    material,
    affixes: [pick(world.rng, MATERIAL_AFFIX[material])],
    origin: `comprado de um mercador errante no ${floorLabel(party.act, party.floor)} no ano ${yearOf(dayOf(world.tick))}`,
  });
  const price = merchantPrice(item);
  let buyer: Hero | null = null;
  let best = 0.01;
  for (const h of heroes) {
    const gain = upgradeGain(h, item);
    if (h.gold >= price && gain > best) {
      best = gain;
      buyer = h;
    }
  }
  if (!buyer) {
    party.moments.push(`Um mercador errante ofereceu ${itemName(item, null).toLowerCase()} por ${price} de ouro; ninguém quis.`);
    return null;
  }
  buyer.gold -= price;
  offer(world, buyer, item);
  (party.loot.bought ??= []).push({ heroId: buyer.id, itemId: item.id, price });
  party.moments.push(`${buyer.name} comprou ${itemName(item, buyer.classId).toLowerCase()} de um mercador errante por ${price} de ouro.`);
  return buyer;
}
