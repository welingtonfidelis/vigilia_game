// Ciclo de uma expedição: descer, atravessar salas, lutar, voltar e dividir o saque.

import { BIOMES, MATERIAL_NAMES } from '../data/biomes.ts';
import { lordOf } from '../data/lords.ts';
import { dayOf } from './calendar.ts';
import { festivalCitizens } from './citizens.ts';
import { record, floorLabel, g, heroLabel, listNames } from './chronicle.ts';
import { combatTick, startCombat, syncHeroes } from './combat.ts';
import { BALANCE as B } from './config.ts';
import { enterFloor, isGuardianFloor, levelPower, partyRooms, passageOf, reducePressure, travelTicks } from './dungeon.ts';
import { earn, hasSpec, heroCapacity } from './economy.ts';
import { affixCount, merchantVisit, rollDrop, shareLoot } from './items.ts';
import { isProvisioned } from './patronage.ts';
import {
  addBond,
  addTrait,
  createHero,
  gainXp,
  getBond,
  hasTrait,
  heroStats,
  promote,
  revealTrait,
  traitSum,
} from './hero.ts';
import { honorFuneral, maybeInjure } from './people.ts';
import { activeHeroes } from './town.ts';
import { noteWish } from './wishes.ts';
import { nemesisAfterCombat, nemesisById } from './nemesis.ts';
import { resolveEncounter, startEncounter, waitingAdvice } from './encounters.ts';
import { chance, int, pick, range } from './rng.ts';
import type { Hero, MaterialId, Party, PartyOutcome, Room, Spot, World } from './types.ts';
import { difficultyOf } from './difficulty.ts';

const members = (world: World, party: Party): Hero[] =>
  party.memberIds.map((id) => world.heroes.find((h) => h.id === id)!).filter((h) => h.status === 'expedition');

export function expeditionTick(world: World): void {
  for (const party of [...world.parties]) stepParty(world, party);
  for (const f of world.pendingFugitives.splice(0)) soloReturn(world, f.heroId, f.spot);
}

function stepParty(world: World, party: Party): void {
  switch (party.phase) {
    case 'descendo': {
      if (world.tick < party.phaseEndsAt) return;
      const heroes = members(world, party);
      enterFloor(world, party, heroes);
      if (world.remains.some((r) => r.passageId === party.passageId && r.floor === party.floor)) {
        for (const h of heroes) if (hasTrait(h, 'supersticioso')) h.morale = Math.max(0, h.morale - 10);
      }
      party.phase = 'explorando';
      party.phaseEndsAt = world.tick + B.roomWalkTicks;
      return;
    }
    case 'explorando': {
      if (party.recallRequested) return startReturn(world, party, 'chamado');
      // Encontro (M6 F3): espera o corvo voltar ou o tempo acabar, e decide.
      if (party.encounter) {
        if (waitingAdvice(world, party)) return;
        resolveEncounter(world, party, members(world, party));
        return afterRoom(world, party, true);
      }
      if (world.tick < party.phaseEndsAt) return;
      const rooms = partyRooms(world, party);
      const room = rooms[party.roomIndex];
      if (!room) return startReturn(world, party, 'retirada');
      if (room.cleared) return afterRoom(world, party, false);
      enterRoom(world, party, room);
      return;
    }
    case 'combate': {
      const result = combatTick(world, party);
      if (result === 'andamento') return;
      nemesisAfterCombat(world, party.combat!, result);
      syncHeroes(world, party.combat!);
      party.combat = null;
      for (const h of members(world, party)) maybeInjure(world, h, h.hp / heroStats(world, h).maxHp, `do ${floorLabel(party)}`);
      if (party.memberIds.length === 0) {
        finish(world, party, 'massacre');
        return;
      }
      if (result === 'vitoria') {
        // Elite, guardião e chefe deixam peças (antes de o andar contar como conquistado).
        const kind = partyRooms(world, party)[party.roomIndex]?.kind;
        if (kind === 'elite' || kind === 'guardiao' || kind === 'chefe') rollDrop(world, party, kind);
        if (kind === 'matilha' || kind === 'elite' || kind === 'guardiao') rollFragment(world, party, kind);
      }
      if (result === 'vitoria' && !party.retreating) {
        lastStandCheck(world, party);
        afterRoom(world, party, true);
        return;
      }
      if (result === 'vitoria') afterRoomClearedOnly(world, party);
      startReturn(world, party, party.recallRequested ? 'chamado' : 'retirada');
      return;
    }
    case 'voltando': {
      if (world.tick >= party.phaseEndsAt) arrive(world, party);
      return;
    }
  }
}

// ── Salas ─────────────────────────────────────────────────────────────────

function enterRoom(world: World, party: Party, room: Room): void {
  const heroes = members(world, party);
  switch (room.kind) {
    case 'matilha':
    case 'elite':
    case 'guardiao':
    case 'chefe':
      party.combat = startCombat(world, party, room);
      party.phase = 'combate';
      return;
    case 'bau': {
      const gold = B.goldPerEnemy * Math.pow(levelPower(party.level), 0.9) * (1 + 0.2 * party.floor) * 6;
      party.loot.gold += gold;
      addMaterial(party, BIOMES[party.biome]!.material, int(world.rng, 2, 4));
      party.moments.push(`Encontraram um baú com ${Math.round(gold)} de ouro.`);
      rollDrop(world, party, 'bau');
      break;
    }
    case 'santuario': {
      const wary = heroes.find((h) => hasTrait(h, 'supersticioso'));
      if (wary) {
        party.moments.push(`${wary.name} não deixou ninguém tocar no santuário.`);
        revealTrait(world, wary, 'supersticioso', `${wary.name} se recusou a chegar perto de um santuário.`);
        break;
      }
      const blessed = chance(world.rng, heroes.some((h) => hasTrait(h, 'devoto')) ? 0.8 : 0.5);
      for (const h of heroes) {
        const max = heroStats(world, h).maxHp;
        if (blessed) {
          h.hp = Math.min(max, h.hp + max * 0.3);
          h.morale = Math.min(100, h.morale + 15);
        } else {
          h.hp = Math.max(1, h.hp - max * 0.1);
          h.morale = Math.max(0, h.morale - 15);
        }
      }
      party.moments.push(blessed ? 'Um santuário abençoou o grupo.' : 'Um santuário amaldiçoado drenou o grupo.');
      break;
    }
    case 'prisioneiro':
      party.rescued++;
      party.moments.push('Libertaram alguém preso nas profundezas.');
      break;
    case 'restos': {
      const idx = world.remains.findIndex((r) => r.heroId === room.remainsOf);
      const lost = world.heroes.find((h) => h.id === room.remainsOf);
      if (idx >= 0 && lost) {
        const rem = world.remains.splice(idx, 1)[0]!;
        noteWish(world, { kind: 'restos', deadId: rem.heroId });
        party.loot.gold += rem.gold;
        // As peças do morto voltam com o grupo, e os fragmentos de amuleto que ele carregava.
        if (rem.items?.length) (party.loot.items ??= []).push(...rem.items);
        if (rem.fragments) {
          party.loot.fragments = (party.loot.fragments ?? 0) + rem.fragments;
          party.moments.push(`Com os restos de ${lost.name} estava ${rem.fragments === 1 ? 'um fragmento' : `${rem.fragments} fragmentos`} de amuleto.`);
        }
        const mourners = heroes.filter((h) => getBond(world, h.id, lost.id) > 30);
        for (const h of mourners) {
          h.grief = Math.max(0, h.grief - 30);
          h.morale = Math.min(100, h.morale + 10);
        }
        const finder = mourners[0] ?? heroes[0]!;
        party.moments.push(`${finder.name} encontrou os restos de ${lost.name}.`);
        record(
          world,
          'restos',
          [finder.id, lost.id],
          `${finder.name} encontrou os restos de ${lost.name} no ${floorLabel(party)} e trouxe de volta o que restou.`,
        );
      }
      break;
    }
    case 'mercador':
      merchantVisit(world, party, heroes);
      break;
    case 'armadilha':
      springTrap(world, party, heroes);
      break;
    case 'vazia':
      break;
    case 'encontro':
      startEncounter(world, party, heroes);
      return;
  }
  afterRoom(world, party, true);
}

/**
 * Armadilha: arqueiros e lanceiros podem perceber antes (cada um tem uma chance); o
 * Curioso chama a atenção para o lugar errado. Fere, mas não mata.
 */
export function springTrap(world: World, party: Party, heroes: Hero[]): void {
  const scouts = heroes.filter((h) => h.classId === 'arqueiro' || h.classId === 'lanceiro');
  let spot = 1 - Math.pow(1 - B.trapSpotChance, scouts.length);
  if (heroes.some((h) => hasTrait(h, 'curioso'))) spot *= 0.7;
  if (scouts.length > 0 && chance(world.rng, spot)) {
    party.moments.push(`${scouts[0]!.name} percebeu uma armadilha a tempo e o grupo passou ao largo.`);
    return;
  }
  for (const h of heroes) {
    const max = heroStats(world, h).maxHp;
    const hurt = max * range(world.rng, B.trapDamageMin, B.trapDamageMax);
    h.hp = Math.max(1, h.hp - hurt);
  }
  party.moments.push(chance(world.rng, 0.5) ? 'Dardos saíram das paredes e feriram o grupo.' : 'Espinhos subiram do chão e feriram o grupo.');
}

function addMaterial(party: Party, mat: MaterialId, qty: number): void {
  party.loot.materials[mat] = (party.loot.materials[mat] ?? 0) + qty;
}

function markCleared(world: World, party: Party): void {
  const room = partyRooms(world, party)[party.roomIndex];
  if (!room || room.cleared) return;
  room.cleared = true;
  world.metrics.roomsCleared++;
  reducePressure(world, party.passageId, B.pressurePerRoom);
}

function afterRoomClearedOnly(world: World, party: Party): void {
  markCleared(world, party);
  if (partyRooms(world, party).every((r) => r.cleared)) conquer(world, party);
}

function afterRoom(world: World, party: Party, freshlyCleared: boolean): void {
  if (freshlyCleared) {
    markCleared(world, party);
    recoverBetweenRooms(world, party);
  }
  const rooms = partyRooms(world, party);
  party.roomIndex++;
  if (party.roomIndex >= rooms.length) {
    if (!rooms.every((r) => r.cleared)) return startReturn(world, party, 'retirada');
    conquer(world, party);
    return startReturn(world, party, 'conquista');
  }
  const decision = shouldContinue(world, party, rooms[party.roomIndex]!);
  if (decision !== 'seguir') return startReturn(world, party, decision);
  party.phase = 'explorando';
  party.phaseEndsAt = world.tick + (rooms[party.roomIndex]!.cleared ? Math.round(B.roomWalkTicks / 2) : B.roomWalkTicks);
}

function recoverBetweenRooms(world: World, party: Party): void {
  const heroes = members(world, party);
  const healer = heroes.find((h) => h.classId === 'clerigo');
  // Silêncio: a cura rende menos na dimensão inteira.
  const silence = party.rules.includes('silencio') ? 0.6 : 1;
  const healAmount = healer ? heroStats(world, healer).atk * 3 * silence : 0;
  // Ervas da Casa de cura: o grupo leva remédio para o caminho.
  const herbs = hasSpec(world, 'ervas') ? B.specErvasHeal : 0;
  // Esporos no ar: cada sala atravessada custa um pouco de vida.
  const spores = party.rules.includes('esporos') ? 0.02 : 0;
  for (const h of heroes) {
    const max = heroStats(world, h).maxHp;
    h.hp = Math.max(1, Math.min(max, h.hp + max * (0.03 * silence + herbs - spores) + healAmount));
    // Quem levou ração e tochas cansa pela metade entre as salas.
    h.needs.energy = Math.max(0, h.needs.energy - (isProvisioned(party, h.id) ? 2 : 4));
  }
}

function shouldContinue(world: World, party: Party, nextRoom: Room): 'seguir' | PartyOutcome {
  const heroes = members(world, party);
  if (heroes.length === 0) return 'massacre';
  if (party.startMemberIds.length >= 2 && heroes.length < 2) return 'retirada';
  if (heroes.some((h) => h.needs.energy < 10)) return 'cansaco';
  // Ninguém deixa um ferido para trás: o grupo volta carregando quem se machucou.
  if (heroes.some((h) => h.injury)) return 'retirada';
  const avgHp = heroes.reduce((s, h) => s + h.hp / heroStats(world, h).maxHp, 0) / heroes.length;
  const avgMorale = heroes.reduce((s, h) => s + h.morale, 0) / heroes.length;
  let threshold = B.continueHp[world.town.doctrine];
  threshold -= 0.05 * heroes.filter((h) => hasTrait(h, 'ganancioso')).length;
  if (nextRoom.kind === 'guardiao' || nextRoom.kind === 'chefe') threshold += 0.25;
  if (nextRoom.cleared) threshold -= 0.15;
  if (avgHp < threshold || avgMorale < 30) return 'retirada';
  return 'seguir';
}

function lastStandCheck(world: World, party: Party): void {
  const heroes = members(world, party);
  if (heroes.length !== 1 || party.dead.length < 2) return;
  const hero = heroes[0]!;
  const text = `ficou de pé sozinh${g(hero, 'o', 'a')} depois que ${party.dead.length} companheiros caíram`;
  if (hero.deeds.some((d) => d.kind === 'ultimoDePe' && d.tick === world.tick)) return;
  hero.deeds.push({ tick: world.tick, kind: 'ultimoDePe', text });
  party.moments.push(`${hero.name} ${text}.`);
  record(world, 'promocao', [hero.id], `${heroLabel(hero)} ${text} no ${floorLabel(party)}.`);
  if (chance(world.rng, 0.6)) promote(world, hero, 'por sobreviver ao impossível');
}

// ── Conquista ─────────────────────────────────────────────────────────────

function conquer(world: World, party: Party): void {
  if (party.lord) return lordVictory(world, party);
  const passage = passageOf(world, party.passageId);
  if (!passage || passage.conquered[party.floor]) return;
  passage.conquered[party.floor] = true;
  passage.maps[party.floor] = null;
  party.persistent = false;
  reducePressure(world, party.passageId, B.pressurePerConquest);
  world.metrics.floorsConquered++;
  world.town.reputation = Math.min(100, world.town.reputation + 1 + party.level);
  const heroes = members(world, party);
  const guardian = isGuardianFloor(passage, party.floor);
  for (const h of heroes) {
    h.stats.floorsConquered++;
    h.deeds.push({ tick: world.tick, kind: 'conquista', text: `conquistou o ${floorLabel(party)}` });
    if (chance(world.rng, guardian ? 0.2 : 0.1)) promote(world, h, `por abrir caminho no ${floorLabel(party)}`);
  }
  record(world, 'conquista', party.memberIds, `${listNames(heroes)} conquistaram o ${floorLabel(party)}.`);
  if (!guardian) return;

  // O guardião caiu: a passagem se fecha assim que o grupo voltar.
  passage.sealed = true;
  world.metrics.passagesSealed++;
  world.town.reputation = Math.min(100, world.town.reputation + 5);
  addMaterial(party, BIOMES[party.biome]!.material, B.sealMaterial);
  record(world, 'passagem', party.memberIds, `${listNames(heroes)} venceram o guardião e selaram a passagem para ${BIOMES[party.biome]!.name}.`);
  noteWish(world, { kind: 'selou', heroIds: heroes.map((h) => h.id) });
}

// ── Fragmentos e Senhores (M5 F2) ────────────────────────────────────────

export type FragmentSource = 'matilha' | 'elite' | 'guardiao' | 'volta';

/** Talvez um fragmento de amuleto: só em passagens do nível atual (o covil não dá). Exportado para os testes. */
export function rollFragment(world: World, party: Party, source: FragmentSource): void {
  if (party.lord || party.level !== world.abyss.level) return;
  const p = { matilha: B.fragmentMatilha, elite: B.fragmentElite, guardiao: B.fragmentGuardian, volta: B.fragmentReturn }[source];
  if (!chance(world.rng, p * B.fragmentPace * difficultyOf(world).fragments)) return;
  party.loot.fragments = (party.loot.fragments ?? 0) + 1;
  const heroes = members(world, party);
  const finder = heroes.length > 0 ? pick(world.rng, heroes) : null;
  party.moments.push(finder ? `${finder.name} achou um fragmento de amuleto.` : 'Acharam um fragmento de amuleto.');
}

/** Na volta, os fragmentos vão para o Cofre (ou viram relíquia, se o nível já foi vencido). */
function deliverFragments(world: World, party: Party, heroes: Hero[]): void {
  const n = party.loot.fragments ?? 0;
  party.loot.fragments = 0;
  if (n <= 0 || heroes.length === 0) return;
  const abyss = world.abyss;
  const what = n === 1 ? 'um fragmento' : `${n} fragmentos`;
  if (party.level === abyss.level) {
    abyss.fragments += n;
    for (const h of heroes) h.loyalty = Math.min(100, h.loyalty + 2);
    record(world, 'amuleto', party.memberIds, `${listNames(heroes)} trouxeram ${what} de amuleto do nível ${party.level} (${abyss.fragments}/${B.fragmentsPerAmulet} no Cofre).`);
  } else {
    const gold = n * B.oldFragmentGold;
    earn(world, gold, 'reliquia');
    record(world, 'amuleto', party.memberIds, `${cap(what)} de um nível já vencido virou relíquia de museu e rendeu ${gold} de ouro.`);
  }
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
/** "O Guardião das Urnas" no meio da frase vira "o Guardião das Urnas". */
const midName = (name: string): string => name.replace(/^(O|A) /, (m) => m.toLowerCase());

/** O Senhor caiu: o nível do abismo sobe, o amuleto se cumpre e a vila festeja. */
function lordVictory(world: World, party: Party): void {
  const abyss = world.abyss;
  const level = party.lord!;
  const lord = lordOf(level);
  const heroes = members(world, party);
  if (abyss.amulet?.level === level) abyss.amulet = null;
  world.metrics.bossKills.push({ level, day: dayOf(world.tick) });
  world.town.reputation = Math.min(100, world.town.reputation + 10);
  for (const h of heroes) {
    h.deeds.push({ tick: world.tick, kind: 'chefe', text: `derrotou ${midName(lord.name)}` });
    if (chance(world.rng, 0.3)) promote(world, h, `por derrotar ${midName(lord.name)}`);
  }
  // Os fragmentos que sobraram do nível vencido viram relíquia de museu.
  if (abyss.fragments > 0) {
    const gold = abyss.fragments * B.oldFragmentGold;
    earn(world, gold, 'reliquia');
    record(world, 'amuleto', [], `Os ${abyss.fragments} fragmentos que sobraram do nível ${level} viraram relíquia de museu: ${gold} de ouro.`);
    abyss.fragments = 0;
  }
  if (abyss.level <= level) {
    abyss.level = level + 1;
    abyss.bought = 0;
  }
  record(world, 'chefe', party.memberIds, `${listNames(heroes)} derrotaram ${midName(lord.name)}. O abismo desce ao nível ${abyss.level}.`);
  // A vila festeja por conta da vitória (sem custo para o tesouro).
  for (const h of activeHeroes(world)) {
    if (h.status !== 'town') continue;
    h.morale = Math.min(100, h.morale + B.festivalMorale);
    h.loyalty = Math.min(100, h.loyalty + B.festivalLoyalty);
  }
  festivalCitizens(world, B.festivalMorale);
  if (lord.final && world.endedTick === null) {
    world.endedTick = world.tick;
    record(world, 'fim', party.memberIds, 'Aquilo que Vigia foi silenciado. Pela primeira vez em séculos, a vila dorme sem medo. Mas o abismo continua lá embaixo.');
  }
}

/** O grupo voltou (ou não voltou) sem vencer o Senhor: o amuleto se desfaz. */
function lordDefeat(world: World, party: Party): void {
  const amulet = world.abyss.amulet;
  if (!party.lord || !amulet?.inUse || amulet.level !== party.lord) return;
  world.abyss.amulet = null;
  world.metrics.lordFailures++;
  const lord = lordOf(party.lord);
  record(
    world,
    'amuleto',
    party.startMemberIds,
    `O amuleto do nível ${party.lord} se desfez: ${midName(lord.name)} continua de pé. Serão precisos ${B.fragmentsPerAmulet} fragmentos novos.`,
  );
}

// ── Retorno ───────────────────────────────────────────────────────────────

function startReturn(world: World, party: Party, outcome: PartyOutcome): void {
  party.encounter = null;
  if (party.memberIds.length === 0) return finish(world, party, 'massacre');
  party.outcome = outcome;
  party.phase = 'voltando';
  party.phaseEndsAt = world.tick + travelTicks(party);
}

function soloReturn(world: World, heroId: number, spot: Spot): void {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero || hero.status !== 'expedition') return;
  const party: Party = {
    id: world.nextId++,
    memberIds: [hero.id],
    startMemberIds: [hero.id],
    ...spot,
    rules: [...spot.rules],
    phase: 'voltando',
    phaseEndsAt: world.tick + travelTicks(spot),
    persistent: false,
    rooms: [],
    roomIndex: 0,
    retreating: true,
    combat: null,
    loot: { gold: 0, materials: {}, xp: 0 },
    contractId: null,
    rescued: 0,
    dead: [],
    recallRequested: false,
    outcome: 'fuga',
    startedTick: world.tick,
    confidence: 0,
    moments: [],
  };
  hero.partyId = party.id;
  world.parties.push(party);
}

function finish(world: World, party: Party, outcome: PartyOutcome): void {
  party.outcome = outcome;
  world.metrics.outcomes[outcome]++;
  if (outcome !== 'fuga') {
    const bucket = (Math.min(3, Math.floor(party.confidence * 4) / 4)).toFixed(2);
    const b = (world.metrics.byConfidence[bucket] ??= { n: 0, deaths: 0, wipes: 0, conquests: 0 });
    b.n++;
    b.deaths += party.dead.length;
    if (outcome === 'massacre') b.wipes++;
    if (outcome === 'conquista') b.conquests++;
  }
  releaseContract(world, party, false);
  lordDefeat(world, party);
  mourn(world, party);
  // Ninguém voltou: as peças e os fragmentos achados ficam com os restos de quem caiu por último.
  const lostItems = party.loot.items ?? [];
  const lostFragments = party.loot.fragments ?? 0;
  if (lostItems.length > 0 || lostFragments > 0) {
    const rem = world.remains.findLast((r) => party.dead.includes(r.heroId));
    if (rem && lostItems.length > 0) (rem.items ??= []).push(...lostItems);
    if (rem && lostFragments > 0) rem.fragments = (rem.fragments ?? 0) + lostFragments;
    party.loot.items = [];
    party.loot.fragments = 0;
  }
  if (outcome === 'massacre' && party.dead.length > 0) {
    const fallen = party.dead.map((id) => world.heroes.find((h) => h.id === id)!);
    record(world, 'morte', party.dead, `Ninguém voltou do ${floorLabel(party)}. ${listNames(fallen)} não verão outro amanhecer.`);
  }
  world.parties = world.parties.filter((p) => p.id !== party.id);
}

function releaseContract(world: World, party: Party, completed: boolean): void {
  if (party.contractId === null) return;
  const contract = world.town.contracts.find((c) => c.id === party.contractId);
  if (!contract) return;
  if (completed) world.town.contracts = world.town.contracts.filter((c) => c.id !== contract.id);
  else contract.takenBy = null;
}

function mourn(world: World, party: Party): void {
  for (const deadId of party.dead) {
    const lost = world.heroes.find((h) => h.id === deadId)!;
    let closest: Hero | null = null;
    for (const h of activeHeroes(world)) {
      const bond = getBond(world, h.id, deadId);
      if (bond < 30) continue;
      h.grief = Math.min(100, h.grief + bond * 0.8);
      h.griefFor = deadId;
      h.morale = Math.max(0, h.morale - 15);
      if (!closest || bond > getBond(world, closest.id, deadId)) closest = h;
    }
    if (closest) record(world, 'luto', [closest.id, deadId], `${closest.name} chora a morte de ${lost.name}.`);
    honorFuneral(world, lost);
  }
}

function arrive(world: World, party: Party): void {
  const heroes = members(world, party);
  const outcome = party.outcome ?? 'retirada';
  const town = world.town;

  // Afortunado: cada peça com o afixo engorda o saque do grupo.
  const lucky = heroes.reduce((n, h) => n + affixCount(h, 'afortunado'), 0);
  party.loot.gold *= (1 + B.affixGold * lucky) * difficultyOf(world).gold;
  // Ouro: o imposto vai para o tesouro, o resto é dividido por fatias.
  const tax = party.loot.gold * town.lootTax;
  earn(world, tax, 'saque');
  world.metrics.goldLooted += party.loot.gold;
  const shares = heroes.map((h) => 1 + (traitSum(h, 'lootShares') > 0 ? traitSum(h, 'lootShares') - 1 : 0));
  const totalShares = shares.reduce((a, b) => a + b, 0);
  heroes.forEach((h, i) => (h.gold += ((party.loot.gold - tax) * shares[i]!) / Math.max(1, totalShares)));
  const gained = (world.metrics.materialsIn ??= {});
  for (const [mat, qty] of Object.entries(party.loot.materials) as [MaterialId, number][]) {
    town.materials[mat] += qty;
    gained[mat] = (gained[mat] ?? 0) + qty;
  }
  for (const h of heroes) gainXp(world, h, party.loot.xp / Math.max(1, heroes.length));
  shareLoot(world, party, heroes);
  // Volta triunfal (todos inteiros, tendo feito o que foram fazer): mais uma chance de fragmento.
  if (outcome === 'conquista' && party.dead.length === 0) rollFragment(world, party, 'volta');
  deliverFragments(world, party, heroes);

  // Contrato
  const contract = town.contracts.find((c) => c.id === party.contractId);
  // Passagem nova: vale ter aberto a passagem. Andar: vale o andar estar conquistado.
  // Caçada (M6 F2): vale a nêmesis ter caído.
  const done =
    !!contract &&
    (contract.nemesisId !== undefined
      ? !!nemesisById(world, contract.nemesisId)?.fallen
      : contract.passageId === null
        ? party.opened === true
        : passageOf(world, contract.passageId)?.conquered[contract.floor] === true);
  if (contract && done && heroes.length > 0) {
    // A guilda Mercenária completa a recompensa do bolso dela.
    const reward = Math.round(contract.reward * (hasSpec(world, 'mercenaria') ? B.specMercenariaReward : 1));
    for (const h of heroes) {
      h.gold += reward / heroes.length;
      h.loyalty = Math.min(100, h.loyalty + 5);
    }
    record(world, 'contrato', party.memberIds, `${listNames(heroes)} cumpriram o contrato do prefeito e dividiram ${reward} de ouro.`);
  }
  releaseContract(world, party, done);

  // Resgatados viram recrutas.
  for (let i = 0; i < party.rescued; i++) {
    if (activeHeroes(world).length >= heroCapacity(world)) break;
    const saved = createHero(world, { rankCap: 'B' });
    saved.hp *= 0.5;
    world.metrics.recruits++;
    record(world, 'resgate', [saved.id, ...party.memberIds], `${heroLabel(saved)} foi ${g(saved, 'resgatado', 'resgatada')} das profundezas e decidiu ficar na vila.`);
  }

  for (const h of heroes) {
    h.status = 'town';
    h.partyId = null;
    h.activity = null;
    h.vengeful = false;
    h.stats.expeditions++;
    if (h.stats.expeditions === B.veteranExpeditions) addTrait(world, h, 'veterano', `Depois de ${B.veteranExpeditions} descidas,`);
    if (party.dead.length >= 2 && outcome !== 'fuga' && chance(world.rng, 0.5)) {
      addTrait(world, h, 'traumatizado', `${h.name} viu ${party.dead.length} companheiros morrerem.`);
    }
    if (h.stats.expeditions >= B.hiddenTraitRevealExpeditions) {
      const hidden = h.traits.find((t) => !t.revealed);
      if (hidden) {
        const how = [
          `Com o tempo, ${h.name} se mostrou como é.`,
          `Depois de tantas descidas juntos, os companheiros de ${h.name} já sabem quem ${g(h, 'ele', 'ela')} é.`,
          `Na taverna, contam histórias sobre ${h.name}.`,
        ][h.id % 3]!;
        revealTrait(world, h, hidden.id, how);
      }
    }
    if (outcome === 'fuga') h.morale = Math.max(0, h.morale - 10);
    if (hasSpec(world, 'ordem') && outcome !== 'fuga') h.loyalty = Math.min(100, h.loyalty + B.specOrdemLoyalty);
  }
  noteWish(world, { kind: 'volta', heroIds: heroes.map((h) => h.id) });
  for (let i = 0; i < heroes.length; i++) {
    for (let j = i + 1; j < heroes.length; j++) {
      const a = heroes[i]!;
      const b = heroes[j]!;
      // Dois gananciosos no mesmo grupo brigam pelo saque.
      const greedy = hasTrait(a, 'ganancioso') && hasTrait(b, 'ganancioso');
      addBond(world, a, b, greedy ? -6 : outcome === 'conquista' ? 3 : 2);
    }
  }

  if (outcome !== 'fuga') {
    const mats = Object.entries(party.loot.materials)
      .map(([m, q]) => `${q} ${MATERIAL_NAMES[m as MaterialId].toLowerCase()}`)
      .join(', ');
    const lost = party.dead.length ? ` Perderam ${listNames(party.dead.map((id) => world.heroes.find((h) => h.id === id)!))}.` : '';
    const how: Record<PartyOutcome, string> = {
      conquista: 'voltaram vitoriosos',
      retirada: 'recuaram',
      chamado: 'atenderam ao sino e voltaram',
      massacre: 'voltaram',
      cansaco: 'voltaram exaustos',
      fuga: 'fugiram',
    };
    record(
      world,
      'retorno',
      party.memberIds,
      `${listNames(heroes)} ${how[outcome]} do ${floorLabel(party)} com ${Math.round(party.loot.gold)} de ouro${mats ? ` e ${mats}` : ''}.${lost}`,
    );
  }
  finish(world, party, outcome);
}
