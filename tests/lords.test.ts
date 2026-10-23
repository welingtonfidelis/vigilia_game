import { describe, expect, it } from 'vitest';
import { BALANCE, commands, createWorld, lordOf, runTicks, TICKS_PER_DAY } from '../src/sim/index.ts';
import type { Hero, Party, World } from '../src/sim/index.ts';
import { createHero } from '../src/sim/hero.ts';
import { rollFragment } from '../src/sim/expedition.ts';

function strongHeroes(world: World, n: number, gear = 20): Hero[] {
  return Array.from({ length: n }, () => {
    const h = createHero(world);
    h.status = 'town';
    h.activity = null;
    h.injury = null;
    h.level = 30;
    h.rank = 'S';
    h.gear = { weapon: gear, armor: gear };
    if (h.items?.weapon) h.items.weapon.tier = gear;
    if (h.items?.armor) h.items.armor.tier = gear;
    h.hp = 99999;
    h.morale = 100;
    h.traits = [{ id: 'bravo', revealed: true }];
    return h;
  });
}

function readyAmulet(world: World): void {
  world.abyss.amulet = { level: world.abyss.level, readyTick: world.tick, inUse: false };
}

/** Roda até o grupo do covil voltar (ou cair). */
function runLair(world: World): void {
  for (let d = 0; d < 20 && world.parties.some((p) => p.lord !== undefined); d++) runTicks(world, TICKS_PER_DAY);
}

describe('Senhores do abismo', () => {
  it('um Senhor por nível, o Vigia no 10 e o ciclo do pós-jogo', () => {
    expect(lordOf(1).name).toBe('O Guardião das Urnas');
    expect(lordOf(5).name).toBe('O Martelo Que Não Dorme');
    expect(lordOf(6)).toMatchObject({ name: 'A Rainha dos Esporos', provisional: true, final: false });
    expect(lordOf(10)).toMatchObject({ name: 'Aquilo que Vigia', final: true, biome: 5 });
    expect(lordOf(11).name).toBe('O Guardião das Urnas (1º retorno)');
    expect(lordOf(20)).toMatchObject({ name: 'Aquilo que Vigia (1º retorno)', final: true });
  });

  it('fragmento só cai nas passagens do nível atual, e nunca no covil', () => {
    const world = createWorld(3);
    const party = { id: 1, passageId: 9, level: 1, biome: 0, rules: [], floor: 0, memberIds: [], moments: [], loot: { gold: 0, materials: {}, xp: 0 } } as unknown as Party;
    for (let i = 0; i < 2000; i++) rollFragment(world, party, 'guardiao');
    expect(party.loot.fragments ?? 0).toBeGreaterThan(0);
    const old = { ...party, level: 1, loot: { gold: 0, materials: {}, xp: 0 } } as Party;
    world.abyss.level = 2;
    for (let i = 0; i < 2000; i++) rollFragment(world, old, 'guardiao');
    expect(old.loot.fragments ?? 0).toBe(0);
    const lair = { ...party, level: 2, lord: 2, loot: { gold: 0, materials: {}, xp: 0 } } as Party;
    for (let i = 0; i < 2000; i++) rollFragment(world, lair, 'guardiao');
    expect(lair.loot.fragments ?? 0).toBe(0);
  });

  it('o joalheiro monta o amuleto com 5 fragmentos e ouro, e leva uns dias', () => {
    const world = createWorld(4);
    expect(commands.forgeAmulet(world).ok).toBe(false);
    world.abyss.fragments = BALANCE.fragmentsPerAmulet + 1;
    world.town.treasury = 10_000;
    expect(commands.forgeAmulet(world)).toEqual({ ok: true });
    expect(world.abyss.fragments).toBe(1);
    expect(world.abyss.amulet).toMatchObject({ level: 1, inUse: false });
    expect(world.abyss.amulet!.readyTick).toBeGreaterThan(world.tick);
    expect(commands.forgeAmulet(world).ok).toBe(false);
    expect(commands.challengeLord(world, [1]).ok).toBe(false);
  });

  it('o contrato do Senhor recusa ferido, grupo grande demais e quem não está na vila', () => {
    const world = createWorld(5);
    readyAmulet(world);
    const team = strongHeroes(world, 6);
    team[0]!.injury = { kind: 'braco', until: world.tick + 999 } as unknown as Hero['injury'];
    expect(commands.challengeLord(world, [team[0]!.id]).ok).toBe(false);
    expect(commands.challengeLord(world, team.slice(0, 6).map((h) => h.id)).ok).toBe(false);
    team[1]!.status = 'expedition';
    expect(commands.challengeLord(world, [team[1]!.id]).ok).toBe(false);
    expect(commands.challengeLord(world, [team[2]!.id, team[3]!.id])).toEqual({ ok: true });
    const lair = world.parties.find((p) => p.lord === 1)!;
    expect(lair.rooms.map((r) => r.kind)).toEqual(['elite', 'elite', 'chefe']);
    expect(world.abyss.amulet!.inUse).toBe(true);
  });

  it('vencer o Senhor sobe o nível, gasta o amuleto e vende os fragmentos que sobraram', () => {
    const world = createWorld(6);
    readyAmulet(world);
    world.abyss.fragments = 2;
    const team = strongHeroes(world, 4);
    const treasury = world.town.treasury;
    expect(commands.challengeLord(world, team.map((h) => h.id))).toEqual({ ok: true });
    runLair(world);
    expect(world.metrics.bossKills).toHaveLength(1);
    expect(world.abyss.level).toBe(2);
    expect(world.abyss.amulet).toBeNull();
    expect(world.abyss.fragments).toBe(0);
    expect(world.town.treasury).toBeGreaterThan(treasury);
    expect(world.chronicle.some((e) => e.kind === 'chefe' && e.text.includes('O abismo desce ao nível 2'))).toBe(true);
  });

  it('perder o contrato desfaz o amuleto; os mortos do covil não deixam restos', () => {
    const world = createWorld(7);
    world.abyss.level = 5;
    readyAmulet(world);
    const rookie = createHero(world);
    rookie.status = 'town';
    rookie.activity = null;
    rookie.traits = [{ id: 'bravo', revealed: true }];
    expect(commands.challengeLord(world, [rookie.id])).toEqual({ ok: true });
    runLair(world);
    expect(world.abyss.amulet).toBeNull();
    expect(world.abyss.level).toBe(5);
    expect(world.metrics.lordFailures).toBe(1);
    expect(world.remains.some((r) => r.heroId === rookie.id)).toBe(false);
  });

  it('o Vigia no nível 10 fecha a campanha, e o jogo segue no 11', () => {
    const world = createWorld(8);
    world.abyss.level = 10;
    readyAmulet(world);
    const team = strongHeroes(world, 4, 120);
    expect(commands.challengeLord(world, team.map((h) => h.id))).toEqual({ ok: true });
    runLair(world);
    expect(world.endedTick).not.toBeNull();
    expect(world.abyss.level).toBe(11);
    expect(world.chronicle.some((e) => e.kind === 'fim')).toBe(true);
  });
});
