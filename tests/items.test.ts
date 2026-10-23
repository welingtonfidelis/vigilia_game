import { describe, expect, it } from 'vitest';
import { commands, createWorld, heroCapacity, heroStats, maxGearTier, TICKS_PER_DAY } from '../src/sim/index.ts';
import type { Hero, Party, World } from '../src/sim/index.ts';
import { createHero } from '../src/sim/hero.ts';
import { benchOffer, commissionBlocker, equip, itemName, legendaryTier, merchantVisit, newItem, offer, processForge, raiseLegendaries, rollDrop, shareLoot, stash, useBench } from '../src/sim/items.ts';
import { springTrap } from '../src/sim/expedition.ts';
import { combatTick, startCombat } from '../src/sim/combat.ts';

function townWith(heroes = 2): { world: World; list: Hero[] } {
  const world = createWorld(77);
  const list = Array.from({ length: heroes }, () => createHero(world));
  return { world, list };
}

const fakeParty = (world: World, persistent: boolean, floor = 1): Party =>
  ({
    id: 999,
    memberIds: [],
    startMemberIds: [],
    passageId: -1,
    level: 1,
    biome: 0,
    rules: [],
    floor,
    phase: 'explorando',
    phaseEndsAt: 0,
    persistent,
    rooms: [],
    roomIndex: 0,
    retreating: false,
    combat: null,
    loot: { gold: 0, materials: {}, xp: 0, items: [] },
    contractId: null,
    rescued: 0,
    dead: [],
    recallRequested: false,
    outcome: null,
    startedTick: world.tick,
    confidence: 1,
    moments: [],
  }) as Party;

describe('itens: nomes e números', () => {
  it('a arma muda de nome conforme a classe e concorda no gênero', () => {
    const { world, list } = townWith(1);
    const item = newItem(world, { slot: 'weapon', rarity: 'rara', tier: 3, material: 'ossos', affixes: ['afiado'], origin: 'teste' });
    list[0]!.classId = 'guardiao';
    expect(itemName(item, 'guardiao')).toBe('Espada afiada de osso');
    expect(itemName(item, 'selvagem')).toBe('Machado afiado de osso');
    expect(itemName(item, null)).toBe('Arma afiada de osso');
    const legend = newItem(world, { slot: 'armor', rarity: 'lendaria', tier: 5, origin: 'teste' });
    expect(legend.affixes).toHaveLength(3);
    expect(legend.title).toBeTruthy();
    expect(itemName(legend, 'clerigo')).toBe(legend.title);
  });

  it('os afixos entram nos atributos do herói', () => {
    const { world, list } = townWith(1);
    const hero = list[0]!;
    const before = heroStats(world, hero);
    equip(world, hero, newItem(world, { slot: 'amulet', rarity: 'epica', tier: 0, affixes: ['robusto', 'afiado'], origin: 'teste' }));
    const after = heroStats(world, hero);
    expect(after.maxHp).toBe(Math.round(before.maxHp * 1.1));
    expect(after.crit).toBeCloseTo(before.crit + 0.05);
    equip(world, hero, newItem(world, { slot: 'weapon', rarity: 'rara', tier: 1, affixes: ['agil'], origin: 'teste' }));
    expect(heroStats(world, hero).interval).toBeLessThan(before.interval);
  });

  it('peça melhor substitui a antiga; a nomeada vai para o cofre e a comum derrete', () => {
    const { world, list } = townWith(1);
    const hero = list[0]!;
    const rare = newItem(world, { slot: 'weapon', rarity: 'rara', tier: 2, affixes: ['afiado'], origin: 'teste' });
    expect(offer(world, hero, rare)).toBe(true);
    expect(hero.gear.weapon).toBe(2);
    const epic = newItem(world, { slot: 'weapon', rarity: 'epica', tier: 3, origin: 'teste' });
    expect(offer(world, hero, epic)).toBe(true);
    expect(world.town.arsenal.map((i) => i.id)).toEqual([rare.id]);
    expect(offer(world, hero, newItem(world, { slot: 'weapon', rarity: 'comum', tier: 3, origin: 'teste' }))).toBe(false);
    expect(epic.owners).toEqual([hero.id]);
  });
});

describe('itens: abismo', () => {
  it('só terreno novo dá peças; o Senhor deixa uma lendária e o guardião, uma épica', () => {
    const { world } = townWith(0);
    expect(rollDrop(world, fakeParty(world, false), 'chefe')).toBeNull();
    expect(rollDrop(world, fakeParty(world, true, 3), 'chefe')?.rarity).toBe('lendaria');
    expect(rollDrop(world, fakeParty(world, true, 2), 'guardiao')?.rarity).toBe('epica');
  });

  it('na volta cada peça vai para quem mais ganha; o resto vai para o cofre', () => {
    const { world, list } = townWith(2);
    const [a, b] = list as [Hero, Hero];
    equip(world, a, newItem(world, { slot: 'weapon', rarity: 'epica', tier: 6, origin: 'teste' }));
    const party = fakeParty(world, true);
    const sword = newItem(world, { slot: 'weapon', rarity: 'rara', tier: 3, origin: 'teste' });
    const ring = newItem(world, { slot: 'amulet', rarity: 'rara', tier: 0, origin: 'teste' });
    party.loot.items = [sword, ring];
    shareLoot(world, party, [a, b]);
    expect(b.items.weapon?.id).toBe(sword.id);
    expect([a.items.amulet?.id, b.items.amulet?.id]).toContain(ring.id);
    expect(world.town.arsenal).toHaveLength(0);
  });
});

describe('forja e especializações', () => {
  it('encomenda pede ferreiro nível 2, cobra na hora e entrega no cofre', () => {
    const { world } = townWith(0);
    expect(commissionBlocker(world, 'weapon', 'rara')).toMatch(/nível 2/);
    world.town.buildings.ferreiro = 2;
    world.town.treasury = 5000;
    world.town.materials.ossos = 100;
    expect(commands.commission(world, 'weapon', 'ossos', 'epica').ok).toBe(false);
    expect(commands.commission(world, 'weapon', 'ossos', 'rara').ok).toBe(true);
    expect(world.town.treasury).toBeLessThan(5000);
    expect(world.town.forge).toHaveLength(1);
    expect(commands.commission(world, 'armor', 'ossos', 'rara').ok).toBe(false);
    world.tick += 3 * TICKS_PER_DAY;
    processForge(world);
    expect(world.town.forge).toHaveLength(0);
    expect(world.town.arsenal[0]?.affixes).toContain('afiado');
    // A encomenda rara sai um tier acima do que se compra pronto.
    expect(world.town.arsenal[0]?.tier).toBe(maxGearTier(world, 'weapon') + 1);
  });

  it('lendária cai acima do teto da forja e acompanha o ferreiro quando ele sobe', () => {
    const { world } = townWith(0);
    world.town.buildings.ferreiro = 1;
    // Nível 1, primeiro andar: o tier do nível é baixo; vale o teto da forja + 2.
    expect(legendaryTier(world, { level: 1, floor: 0 }, 'weapon')).toBe(maxGearTier(world, 'weapon') + 2);
    const item = newItem(world, { slot: 'weapon', rarity: 'lendaria', tier: 3, origin: 'teste' });
    stash(world, item);
    world.town.buildings.ferreiro = 3;
    raiseLegendaries(world);
    expect(item.tier).toBe(maxGearTier(world, 'weapon') + 1);
    const tier = item.tier;
    raiseLegendaries(world);
    expect(item.tier).toBe(tier);
  });

  it('nível 3 exige especialização; os efeitos valem na hora', () => {
    const { world } = townWith(0);
    world.town.buildings.estalagem = 2;
    world.town.treasury = 99999;
    world.town.materials.ferroNegro = 999;
    const before = heroCapacity(world);
    expect(commands.build(world, 'estalagem').ok).toBe(false);
    expect(commands.build(world, 'estalagem', 'laminas').ok).toBe(false);
    expect(commands.build(world, 'estalagem', 'dormitorio').ok).toBe(true);
    // Do nível 2 ao 3 a estalagem ganha 2 vagas na curva nova (M5 F4), e o dormitório dá mais 4.
    expect(heroCapacity(world)).toBe(before + 2 + 4);
    world.town.buildings.ferreiro = 3;
    world.abyss.level = 5; // a forja não passa do que o abismo já mostrou
    expect(commands.chooseSpecialization(world, 'ferreiro', 'laminas').ok).toBe(true);
    expect(commands.chooseSpecialization(world, 'ferreiro', 'couracas').ok).toBe(false);
    expect(maxGearTier(world, 'weapon')).toBe(11);
    expect(maxGearTier(world, 'armor')).toBe(10);
  });

  it('presentear e vender peças do cofre', () => {
    const { world, list } = townWith(1);
    const hero = list[0]!;
    hero.status = 'town';
    const item = newItem(world, { slot: 'amulet', rarity: 'rara', tier: 0, origin: 'teste' });
    world.town.arsenal.push(item);
    const energy = world.town.mayorEnergy;
    expect(commands.giftItem(world, item.id, hero.id).ok).toBe(true);
    expect(hero.items.amulet?.id).toBe(item.id);
    expect(world.town.mayorEnergy).toBe(energy - 1);
    const other = newItem(world, { slot: 'weapon', rarity: 'epica', tier: 4, origin: 'teste' });
    world.town.arsenal.push(other);
    const gold = world.town.treasury;
    expect(commands.sellItem(world, other.id).ok).toBe(true);
    expect(world.town.treasury).toBeGreaterThan(gold);
    expect(world.town.arsenal).toHaveLength(0);
  });
});


describe('bancada do joalheiro, salas novas e chefes em duas fases (9.3)', () => {
  it('a bancada só abre com o ferreiro no nível 5 e cobra do herói', () => {
    const { world, list } = townWith(1);
    const hero = list[0]!;
    equip(world, hero, newItem(world, { slot: 'weapon', rarity: 'rara', tier: 4, affixes: ['afiado'], origin: 'teste' }));
    hero.gold = 50000;
    world.town.buildings.ferreiro = 4;
    expect(benchOffer(world, hero)).toBeNull();
    world.town.buildings.ferreiro = 5;
    const offer = benchOffer(world, hero)!;
    expect(offer.service).toBe('encantar');
    const treasury = world.town.treasury;
    useBench(world, hero, offer);
    expect(hero.items.weapon!.affixes).toHaveLength(2);
    expect(hero.items.weapon!.rarity).toBe('epica');
    expect(hero.items.weapon!.history?.[0]).toMatch(/encantada por/);
    expect(hero.gold).toBe(50000 - offer.price);
    expect(world.town.treasury).toBeGreaterThan(treasury);
    expect(world.town.bench).toHaveLength(1);
  });

  it('o mercador vende para quem ganha com a peça e tem o ouro', () => {
    const { world, list } = townWith(2);
    const [poor, rich] = list as [Hero, Hero];
    poor.gold = 0;
    rich.gold = 999999;
    const party = fakeParty(world, false, 2);
    const buyer = merchantVisit(world, party, [poor, rich]);
    expect(buyer?.id).toBe(rich.id);
    expect(rich.gold).toBeLessThan(999999);
    expect(party.loot.bought).toHaveLength(1);
    rich.gold = 0;
    expect(merchantVisit(world, fakeParty(world, false, 2), [poor, rich])).toBeNull();
  });

  it('a armadilha fere, mas não mata', () => {
    const { world, list } = townWith(3);
    for (const h of list) {
      h.classId = 'guardiao';
      h.hp = 1;
    }
    for (let i = 0; i < 20; i++) springTrap(world, fakeParty(world, true, 2), list);
    expect(list.every((h) => h.hp >= 1)).toBe(true);
  });

  it('abaixo de 50% o chefe entra na fase 2', () => {
    const { world, list } = townWith(3);
    for (const h of list) h.status = 'expedition';
    const party = fakeParty(world, true, 3);
    // O Senhor do nível 2 é a Couraça Submersa.
    party.level = 2;
    party.lord = 2;
    party.biome = 1;
    party.memberIds = list.map((h) => h.id);
    party.startMemberIds = [...party.memberIds];
    party.phase = 'combate';
    party.combat = startCombat(world, party, { kind: 'chefe', cleared: false, remainsOf: null });
    const boss = party.combat.units.find((u) => u.tags.includes('boss'))!;
    const def = boss.def;
    boss.hp = boss.maxHp * 0.4;
    combatTick(world, party);
    expect(party.combat.phase2).toBe(true);
    expect(boss.def).toBeCloseTo(def * 1.5);
    expect(party.moments.some((m) => m.includes('couraça'))).toBe(true);
  });
});
