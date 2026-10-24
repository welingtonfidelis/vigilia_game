import { afterEach, describe, expect, it } from 'vitest';
import { commands, createWorld, runDays } from '../src/sim/index.ts';
import type { Combat, Hero, Party, Unit, World } from '../src/sim/index.ts';
import { BALANCE as B } from '../src/sim/config.ts';
import { BIOMES } from '../src/data/biomes.ts';
import { startCombat } from '../src/sim/combat.ts';
import { confidence, generatePassage, makeEnemy, openPassage, spotOf } from '../src/sim/dungeon.ts';
import { createHero } from '../src/sim/hero.ts';
import { bringNemesis, dailyNemeses, livingNemeses, maybeFlee, nemesisAfterCombat, nemesisFalls, nemesisMigrate } from '../src/sim/nemesis.ts';
import { markRumor, rumorBoard, takeRumorSeed } from '../src/sim/rumors.ts';

const tuned = B as unknown as Record<string, number>;
const saved = { ...tuned };
afterEach(() => Object.assign(tuned, saved));

function partyIn(world: World, passageId: number, floor: number, heroes: Hero[]): Party {
  const passage = world.abyss.passages.find((p) => p.id === passageId)!;
  return {
    id: 99, memberIds: heroes.map((h) => h.id), startMemberIds: heroes.map((h) => h.id), ...spotOf(passage, floor), phase: 'combate',
    phaseEndsAt: 0, persistent: false, rooms: [], roomIndex: 0, retreating: false, combat: null, loot: { gold: 0, materials: {}, xp: 0 },
    contractId: null, rescued: 0, dead: [], recallRequested: false, outcome: null, startedTick: 0, confidence: 1, moments: [],
  } as unknown as Party;
}

function heroes(world: World, n: number): Hero[] {
  return Array.from({ length: n }, () => {
    const h = createHero(world);
    h.status = 'expedition';
    return h;
  });
}

/** Um esqueleto que matou a primeira heroína e saiu vivo da luta. */
function killer(world: World, party: Party, c: Combat, victim: Hero): Unit {
  const unit = makeEnemy(world, c, BIOMES[0]!.enemies[0]!, party);
  unit.kills = [victim.id];
  c.units.push(unit);
  victim.status = 'dead';
  return unit;
}

const emptyCombat = (): Combat => ({ units: [], ticks: 0, enraged: false, isBoss: false, bossMech: null, mechCd: 0, echoesSpawned: false, nextUid: 1 });

describe('nêmesis (M6 F2)', () => {
  it('quem matou e saiu vivo da luta pode virar nêmesis, e some na névoa', () => {
    tuned.nemesisBirthChance = 1;
    const world = createWorld(31);
    const passage = openPassage(world);
    const [victim, ...rest] = heroes(world, 3);
    const party = partyIn(world, passage.id, 0, rest);
    const c = emptyCombat();
    killer(world, party, c, victim!);
    nemesisAfterCombat(world, c, 'retirada');
    const [n] = livingNemeses(world);
    expect(n).toBeDefined();
    expect(n!.victims).toEqual([victim!.id]);
    expect(n!.passageId).toBeNull();
    expect(world.chronicle.at(-1)!.kind).toBe('nemesis');
  });

  it('quem venceu a luta não deixa nêmesis, nem o Senhor vira uma', () => {
    tuned.nemesisBirthChance = 1;
    const world = createWorld(32);
    const passage = openPassage(world);
    const [victim, ...rest] = heroes(world, 3);
    const party = partyIn(world, passage.id, 0, rest);
    const c = emptyCombat();
    const u = killer(world, party, c, victim!);
    u.alive = false;
    nemesisAfterCombat(world, c, 'vitoria');
    u.alive = true;
    u.tags = ['boss'];
    nemesisAfterCombat(world, c, 'retirada');
    expect(livingNemeses(world)).toHaveLength(0);
  });

  it('nunca mais que o teto de vivas', () => {
    tuned.nemesisBirthChance = 1;
    const world = createWorld(33);
    const passage = openPassage(world);
    for (let i = 0; i < B.nemesisMax + 2; i++) {
      const [victim, ...rest] = heroes(world, 2);
      const party = partyIn(world, passage.id, 0, rest);
      const c = emptyCombat();
      killer(world, party, c, victim!);
      world.tick += 1;
      nemesisAfterCombat(world, c, 'massacre');
    }
    expect(livingNemeses(world)).toHaveLength(B.nemesisMax);
  });

  it('volta numa passagem nova, entra no lugar de um do bando e aparece uma vez por descida', () => {
    tuned.nemesisBirthChance = 1;
    tuned.nemesisMigrateChance = 1;
    const world = createWorld(34);
    const old = openPassage(world);
    const [victim, ...rest] = heroes(world, 4);
    const c0 = emptyCombat();
    killer(world, partyIn(world, old.id, 0, rest), c0, victim!);
    nemesisAfterCombat(world, c0, 'retirada');
    const fresh = openPassage(world);
    nemesisMigrate(world, fresh);
    const n = livingNemeses(world)[0]!;
    expect(n.passageId).toBe(fresh.id);
    expect(n.floor).toBeLessThan(fresh.floors - 1);
    const party = partyIn(world, fresh.id, n.floor, rest);
    const c = startCombat(world, party, { kind: 'matilha', cleared: false, remainsOf: null });
    const unit = c.units.find((u) => u.nemesisId === n.id)!;
    expect(unit.name).toBe(n.name);
    expect(unit.gold).toBeLessThan(B.goldPerEnemy * 10);
    const plain = makeEnemy(world, emptyCombat(), BIOMES[0]!.enemies.find((e) => e.id === n.enemyId)!, party);
    expect(unit.maxHp).toBeGreaterThan(plain.maxHp * 2);
    // Na mesma descida, a próxima sala não traz ela de novo.
    const again = startCombat(world, party, { kind: 'matilha', cleared: false, remainsOf: null });
    expect(again.units.some((u) => u.nemesisId !== undefined)).toBe(false);
    // Sala sem luta comum não recebe nêmesis.
    party.nemesisMet = [];
    const chest = emptyCombat();
    bringNemesis(world, party, chest, { kind: 'bau', cleared: false, remainsOf: null });
    expect(chest.units).toHaveLength(0);
  });

  it('cai com feito para quem acertou, e a passagem fechada a manda de volta à névoa', () => {
    tuned.nemesisBirthChance = 1;
    tuned.nemesisMigrateChance = 1;
    const world = createWorld(35);
    const passage = openPassage(world);
    const [victim, slayer, ...rest] = heroes(world, 4);
    const c0 = emptyCombat();
    killer(world, partyIn(world, passage.id, 0, [slayer!, ...rest]), c0, victim!);
    nemesisAfterCombat(world, c0, 'retirada');
    const fresh = openPassage(world);
    nemesisMigrate(world, fresh);
    world.abyss.passages = world.abyss.passages.filter((p) => p.id !== fresh.id);
    dailyNemeses(world);
    expect(livingNemeses(world)[0]!.passageId).toBeNull();
    const n = livingNemeses(world)[0]!;
    const party = partyIn(world, passage.id, 0, [slayer!, ...rest]);
    nemesisFalls(world, party, { nemesisId: n.id } as Unit, slayer);
    expect(livingNemeses(world)).toHaveLength(0);
    expect(slayer!.deeds.at(-1)!.kind).toBe('nemesis');
    expect(world.metrics.nemeses!.fallen).toBe(1);
  });

  it('quem matou e ficou por um fio pode fugir na névoa (uma tentativa por luta)', () => {
    tuned.nemesisFleeChance = 1;
    const world = createWorld(36);
    const passage = openPassage(world);
    const [victim, ...rest] = heroes(world, 3);
    const party = partyIn(world, passage.id, 0, rest);
    const c = emptyCombat();
    const u = killer(world, party, c, victim!);
    u.hp = u.maxHp * 0.5;
    expect(maybeFlee(world, party, u)).toBe(false);
    u.hp = u.maxHp * 0.1;
    expect(maybeFlee(world, party, u)).toBe(true);
    expect(u.alive).toBe(false);
    expect(u.fled).toBe(true);
  });

  it('o andar onde ela foi vista pesa na confiança do grupo', () => {
    tuned.nemesisBirthChance = 1;
    tuned.nemesisMigrateChance = 1;
    const world = createWorld(37);
    const fresh = openPassage(world);
    const group = heroes(world, 4);
    const before = confidence(world, group, spotOf(fresh, 0), fresh);
    const c0 = emptyCombat();
    killer(world, partyIn(world, fresh.id, 0, group), c0, heroes(world, 1)[0]!);
    nemesisAfterCombat(world, c0, 'retirada');
    const n = livingNemeses(world)[0]!;
    n.passageId = fresh.id;
    n.floor = 0;
    expect(confidence(world, group, spotOf(fresh, 0), fresh)).toBeLessThan(before);
  });
});

describe('caçada (M6 F2)', () => {
  it('num andar conquistado com nêmesis, o contrato é a caçada; ela caindo, as caçadas livres voltam ao tesouro', () => {
    tuned.nemesisBirthChance = 1;
    const world = createWorld(38);
    world.town.buildings.guilda = 3;
    world.town.treasury = 10000;
    const passage = openPassage(world);
    passage.discovered = true;
    passage.conquered[0] = true;
    expect(commands.postContract(world, passage.id, 0, 100).ok).toBe(false);
    const [victim, slayer, ...rest] = heroes(world, 4);
    const c0 = emptyCombat();
    killer(world, partyIn(world, passage.id, 0, rest), c0, victim!);
    nemesisAfterCombat(world, c0, 'retirada');
    const n = livingNemeses(world)[0]!;
    n.passageId = passage.id;
    n.floor = 0;
    expect(commands.postContract(world, passage.id, 0, 100).ok).toBe(true);
    expect(world.town.contracts.at(-1)!.nemesisId).toBe(n.id);
    expect(world.chronicle.at(-1)!.text).toContain(`caçar ${n.name}`);
    const before = world.town.treasury;
    nemesisFalls(world, partyIn(world, passage.id, 0, [slayer!]), { nemesisId: n.id } as Unit, slayer);
    expect(world.town.treasury).toBe(before + 100);
    expect(world.town.contracts.some((c) => c.nemesisId === n.id)).toBe(false);
  });
});

describe('rumores da próxima passagem (M6 F2)', () => {
  it('três rumores do mesmo tamanho, com biomas diferentes quando o nível deixa', () => {
    const world = createWorld(41);
    world.abyss.level = 6;
    const board = rumorBoard(world);
    expect(board.list).toHaveLength(B.rumorCount);
    expect(new Set(board.list.map((r) => r.biome)).size).toBe(B.rumorCount);
    const floors = board.list.map((r) => generatePassage(0, r.seed, 6, 0).floors);
    expect(new Set(floors).size).toBe(1);
    for (const r of board.list) expect(r.text.length).toBeGreaterThan(10);
  });

  it('o rumor marcado é a passagem que abre, com o bioma e a regra prometidos', () => {
    const world = createWorld(42);
    world.abyss.level = 5;
    expect(commands.markRumor(world, 2).ok).toBe(true);
    const rumor = rumorBoard(world).list[2]!;
    const passage = openPassage(world, takeRumorSeed(world));
    expect(passage.biome).toBe(rumor.biome);
    if (rumor.rule) expect(passage.rules).toContain(rumor.rule);
    // Abriu: a guilda ouve rumores novos, de novo com o primeiro marcado.
    const next = rumorBoard(world);
    expect(next.list.map((r) => r.seed)).not.toContain(rumor.seed);
    expect(next.marked).toBe(0);
    expect(markRumor(world, 9).ok).toBe(false);
  });

  it('ouvir rumores não mexe no RNG do núcleo e é igual para a mesma semente', () => {
    const a = createWorld(43);
    const b = createWorld(43);
    const before = a.rng.s;
    expect(rumorBoard(a)).toEqual(rumorBoard(b));
    expect(a.rng.s).toBe(before);
  });

  it('a campanha corre com nêmesis e rumores e o save volta igual', async () => {
    const { deserialize, serialize } = await import('../src/sim/index.ts');
    const world = createWorld(44);
    runDays(world, 200);
    const back = deserialize(serialize(world));
    expect(serialize(back)).toBe(serialize(world));
  });
});
