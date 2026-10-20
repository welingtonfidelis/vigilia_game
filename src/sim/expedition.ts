// Ciclo de uma expedição: descer, atravessar salas, lutar, voltar e dividir o saque.

import { ACTS, ACT_COUNT, MATERIAL_NAMES } from '../data/acts.ts';
import { record, floorLabel, g, heroLabel, listNames } from './chronicle.ts';
import { dayOf } from './calendar.ts';
import { combatTick, startCombat, syncHeroes } from './combat.ts';
import { BALANCE as B } from './config.ts';
import { enterFloor, isBossFloor, partyRooms, reduceCorruption, travelTicks } from './dungeon.ts';
import { heroCapacity } from './economy.ts';
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
import { maybeInjure } from './people.ts';
import { activeHeroes } from './town.ts';
import { chance, int } from './rng.ts';
import type { Hero, MaterialId, Party, PartyOutcome, Room, World } from './types.ts';

const members = (world: World, party: Party): Hero[] =>
  party.memberIds.map((id) => world.heroes.find((h) => h.id === id)!).filter((h) => h.status === 'expedition');

export function expeditionTick(world: World): void {
  for (const party of [...world.parties]) stepParty(world, party);
  for (const f of world.pendingFugitives.splice(0)) soloReturn(world, f.heroId, f.act, f.floor);
}

function stepParty(world: World, party: Party): void {
  switch (party.phase) {
    case 'descendo': {
      if (world.tick < party.phaseEndsAt) return;
      const heroes = members(world, party);
      enterFloor(world, party, heroes);
      if (world.remains.some((r) => r.act === party.act && r.floor === party.floor)) {
        for (const h of heroes) if (hasTrait(h, 'supersticioso')) h.morale = Math.max(0, h.morale - 10);
      }
      party.phase = 'explorando';
      party.phaseEndsAt = world.tick + B.roomWalkTicks;
      return;
    }
    case 'explorando': {
      if (party.recallRequested) return startReturn(world, party, 'chamado');
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
      syncHeroes(world, party.combat!);
      party.combat = null;
      for (const h of members(world, party)) maybeInjure(world, h, h.hp / heroStats(world, h).maxHp, `do ${floorLabel(party.act, party.floor)}`);
      if (party.memberIds.length === 0) {
        finish(world, party, 'massacre');
        return;
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
  const act = ACTS[party.act]!;
  switch (room.kind) {
    case 'matilha':
    case 'elite':
    case 'chefe':
      party.combat = startCombat(world, party, room);
      party.phase = 'combate';
      return;
    case 'bau': {
      const gold = B.goldPerEnemy * Math.pow(act.power, 0.9) * (1 + 0.2 * party.floor) * 6;
      party.loot.gold += gold;
      addMaterial(party, act.material, int(world.rng, 2, 4));
      party.moments.push(`Encontraram um baú com ${Math.round(gold)} de ouro.`);
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
        party.loot.gold += rem.gold;
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
          `${finder.name} encontrou os restos de ${lost.name} no ${floorLabel(party.act, party.floor)} e trouxe de volta o que restou.`,
        );
      }
      break;
    }
    case 'vazia':
      break;
  }
  afterRoom(world, party, true);
}

function addMaterial(party: Party, mat: MaterialId, qty: number): void {
  party.loot.materials[mat] = (party.loot.materials[mat] ?? 0) + qty;
}

function markCleared(world: World, party: Party): void {
  const room = partyRooms(world, party)[party.roomIndex];
  if (!room || room.cleared) return;
  room.cleared = true;
  world.metrics.roomsCleared++;
  reduceCorruption(world, party.act, B.corruptionPerRoom);
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
  const healAmount = healer ? heroStats(world, healer).atk * 3 : 0;
  for (const h of heroes) {
    const max = heroStats(world, h).maxHp;
    h.hp = Math.min(max, h.hp + max * 0.03 + healAmount);
    h.needs.energy = Math.max(0, h.needs.energy - 4);
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
  if (nextRoom.kind === 'chefe') threshold += 0.25;
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
  record(world, 'promocao', [hero.id], `${heroLabel(hero)} ${text} no ${floorLabel(party.act, party.floor)}.`);
  if (chance(world.rng, 0.6)) promote(world, hero, 'por sobreviver ao impossível');
}

// ── Conquista ─────────────────────────────────────────────────────────────

function conquer(world: World, party: Party): void {
  const actState = world.acts[party.act]!;
  if (actState.conquered[party.floor]) return;
  actState.conquered[party.floor] = true;
  actState.maps[party.floor] = null;
  party.persistent = false;
  reduceCorruption(world, party.act, B.corruptionPerConquest);
  world.metrics.floorsConquered++;
  world.town.reputation = Math.min(100, world.town.reputation + 2 + party.act);
  const heroes = members(world, party);
  const boss = isBossFloor(party.floor);
  for (const h of heroes) {
    h.stats.floorsConquered++;
    h.deeds.push({ tick: world.tick, kind: 'conquista', text: `conquistou o ${floorLabel(party.act, party.floor)}` });
    if (chance(world.rng, boss ? 0.2 : 0.1)) promote(world, h, `por abrir caminho no ${floorLabel(party.act, party.floor)}`);
  }
  record(world, 'conquista', party.memberIds, `${listNames(heroes)} conquistaram o ${floorLabel(party.act, party.floor)}.`);
  if (!boss) return;

  actState.bossDefeated = true;
  world.metrics.bossKills.push({ act: party.act, day: dayOf(world.tick) });
  world.town.reputation = Math.min(100, world.town.reputation + 10);
  const actDef = ACTS[party.act]!;
  record(world, 'chefe', party.memberIds, `${actDef.boss.name} caiu. O caminho ${actDef.of} está livre.`);
  const nextAct = world.acts[party.act + 1];
  if (nextAct && !nextAct.unlocked) {
    nextAct.unlocked = true;
    nextAct.corruption = B.corruptionStart;
    record(world, 'conquista', [], `Abaixo ${actDef.of}, um novo caminho se abriu: ${ACTS[party.act + 1]!.name}.`);
  }
  if (party.act === ACT_COUNT - 1 && world.endedTick === null) {
    world.endedTick = world.tick;
    record(world, 'fim', party.memberIds, 'Aquilo que Vigia foi silenciado. Pela primeira vez em séculos, a vila dorme sem medo.');
  }
}

// ── Retorno ───────────────────────────────────────────────────────────────

function startReturn(world: World, party: Party, outcome: PartyOutcome): void {
  if (party.memberIds.length === 0) return finish(world, party, 'massacre');
  party.outcome = outcome;
  party.phase = 'voltando';
  party.phaseEndsAt = world.tick + travelTicks(party.act, party.floor);
}

function soloReturn(world: World, heroId: number, act: number, floor: number): void {
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero || hero.status !== 'expedition') return;
  const party: Party = {
    id: world.nextId++,
    memberIds: [hero.id],
    startMemberIds: [hero.id],
    act,
    floor,
    phase: 'voltando',
    phaseEndsAt: world.tick + travelTicks(act, floor),
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
  mourn(world, party);
  if (outcome === 'massacre' && party.dead.length > 0) {
    const fallen = party.dead.map((id) => world.heroes.find((h) => h.id === id)!);
    record(world, 'morte', party.dead, `Ninguém voltou do ${floorLabel(party.act, party.floor)}. ${listNames(fallen)} não verão outro amanhecer.`);
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
  }
}

function arrive(world: World, party: Party): void {
  const heroes = members(world, party);
  const outcome = party.outcome ?? 'retirada';
  const town = world.town;

  // Ouro: o imposto vai para o tesouro, o resto é dividido por fatias.
  const tax = party.loot.gold * town.lootTax;
  town.treasury += tax;
  world.metrics.goldLooted += party.loot.gold;
  const shares = heroes.map((h) => 1 + (traitSum(h, 'lootShares') > 0 ? traitSum(h, 'lootShares') - 1 : 0));
  const totalShares = shares.reduce((a, b) => a + b, 0);
  heroes.forEach((h, i) => (h.gold += ((party.loot.gold - tax) * shares[i]!) / Math.max(1, totalShares)));
  for (const [mat, qty] of Object.entries(party.loot.materials) as [MaterialId, number][]) town.materials[mat] += qty;
  for (const h of heroes) gainXp(world, h, party.loot.xp / Math.max(1, heroes.length));

  // Contrato
  const contract = town.contracts.find((c) => c.id === party.contractId);
  const done = !!contract && world.acts[contract.act]!.conquered[contract.floor] === true;
  if (contract && done && heroes.length > 0) {
    for (const h of heroes) {
      h.gold += contract.reward / heroes.length;
      h.loyalty = Math.min(100, h.loyalty + 5);
    }
    record(world, 'contrato', party.memberIds, `${listNames(heroes)} cumpriram o contrato do prefeito e dividiram ${contract.reward} de ouro.`);
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
  }
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
      `${listNames(heroes)} ${how[outcome]} do ${floorLabel(party.act, party.floor)} com ${Math.round(party.loot.gold)} de ouro${mats ? ` e ${mats}` : ''}.${lost}`,
    );
  }
  finish(world, party, outcome);
}
