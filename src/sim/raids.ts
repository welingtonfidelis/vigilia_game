// Incursões noturnas (M3): quando um ato acumula corrupção, o abismo sobe até a vila.
// A defesa é a soma dos heróis que estão em casa, dos aposentados e da milícia de
// guardas. O resultado nunca acaba a campanha: no pior caso, prédios caem de nível,
// moradores morrem e o tesouro sangra.

import { ACTS } from '../data/acts.ts';
import { BUILDINGS } from '../data/buildings.ts';
import { dayOf, hourOf } from './calendar.ts';
import { record } from './chronicle.ts';
import { citizenNames, guardDefense, raidCitizenLoss, refreshJobs } from './citizens.ts';
import { BALANCE as B } from './config.ts';
import { decreeDefenseMultiplier } from './decrees.ts';
import { heroStrength } from './hero.ts';
import { maybeInjure } from './people.ts';
import { chance, int, pick } from './rng.ts';
import { townHeroes } from './town.ts';
import type { BuildingId, Citizen, Raid, RaidOutcome, World } from './types.ts';

export interface Threat {
  act: number;
  corruption: number;
}

/** O ato mais corrompido aberto é a origem da próxima incursão. */
export function threatOf(world: World): Threat | null {
  let best: Threat | null = null;
  for (let i = 0; i < world.acts.length; i++) {
    const act = world.acts[i]!;
    if (!act.unlocked) continue;
    if (!best || act.corruption > best.corruption) best = { act: i, corruption: act.corruption };
  }
  return best;
}

/** Heróis em casa, aposentados e milícia de guardas. */
export function defensePower(world: World): number {
  let power = 20 + guardDefense(world);
  for (const hero of townHeroes(world)) {
    const s = heroStrength(world, hero);
    power += Math.sqrt(s.ehp * s.dps) * 0.5;
  }
  for (const hero of world.heroes) {
    if (hero.status !== 'retired') continue;
    const s = heroStrength(world, hero);
    power += Math.sqrt(s.ehp * s.dps) * 0.3;
  }
  return Math.round(power * decreeDefenseMultiplier(world));
}

export function raidPower(act: number, corruption: number): number {
  return Math.round((B.raidPowerBase + act * B.raidPowerPerAct) * (corruption / 100));
}

/** Roda de hora em hora; só tenta às 22h. */
export function maybeRaid(world: World): void {
  if (hourOf(world.tick) !== 22) return;
  const day = dayOf(world.tick);
  if (day - world.town.lastRaidDay < B.raidCooldownDays) return;
  const threat = threatOf(world);
  if (!threat || threat.corruption < B.raidMinCorruption) return;
  const t = Math.max(0, Math.min(1, (threat.corruption - B.raidMinCorruption) / (100 - B.raidMinCorruption)));
  const p = B.raidChanceAtMin + (B.raidChanceAtMax - B.raidChanceAtMin) * t;
  if (!chance(world.rng, p)) return;
  resolveRaid(world, threat.act, threat.corruption);
}

function damageBuilding(world: World): BuildingId | null {
  const built = (Object.keys(world.town.buildings) as BuildingId[]).filter((id) => world.town.buildings[id] > 0);
  if (built.length === 0) return null;
  const id = pick(world.rng, built);
  world.town.buildings[id]--;
  return id;
}

/** Resolve a incursão. Exportado para os testes forçarem o cenário. */
export function resolveRaid(world: World, act: number, corruption: number): Raid {
  const defense = defensePower(world);
  const power = raidPower(act, corruption);
  const ratio = defense / (defense + power);
  const outcome: RaidOutcome = ratio >= B.raidRepelRatio ? 'repelido' : ratio >= B.raidCostlyRatio ? 'custoso' : 'saque';

  const damage = outcome === 'repelido' ? 0 : outcome === 'custoso' ? 1 : int(world.rng, 1, 2);
  let building: BuildingId | null = null;
  for (let i = 0; i < damage; i++) {
    const hit = damageBuilding(world);
    if (hit) building = hit;
  }

  const loss = outcome === 'repelido' ? 0 : outcome === 'custoso' ? int(world.rng, 1, 2) : int(world.rng, 2, 5);
  const lost: Citizen[] = loss > 0 ? raidCitizenLoss(world, loss) : [];

  const goldLost = outcome === 'repelido' ? 0 : Math.round(world.town.treasury * B.raidGoldSteal * (outcome === 'custoso' ? 0.5 : 1));
  world.town.treasury = Math.max(0, world.town.treasury - goldLost);

  let injuries = 0;
  if (outcome !== 'repelido') {
    const defenders = [...townHeroes(world)];
    const tries = outcome === 'saque' ? 2 : 1;
    for (let i = 0; i < tries && defenders.length > 0; i++) {
      const hero = defenders.splice(int(world.rng, 0, defenders.length - 1), 1)[0]!;
      const before = hero.injury;
      maybeInjure(world, hero, 0.05, 'na incursão');
      if (!before && hero.injury) injuries++;
    }
  }

  const mood = outcome === 'repelido' ? 4 : outcome === 'custoso' ? -6 : -12;
  for (const citizen of world.citizens) citizen.happiness = Math.max(0, Math.min(100, citizen.happiness + mood));

  if (outcome === 'repelido') {
    world.acts[act]!.corruption = Math.max(0, world.acts[act]!.corruption - 3);
    world.town.reputation = Math.min(100, world.town.reputation + 2);
  }

  world.metrics.raids++;
  world.town.lastRaidDay = dayOf(world.tick);
  refreshJobs(world);

  const hitName = building
    ? ` ${BUILDINGS[building].gender === 'm' ? 'O' : 'A'} ${BUILDINGS[building].name.toLowerCase()} ${
        world.town.buildings[building] === 0 ? 'voltou à ruína' : `voltou ao nível ${world.town.buildings[building]}`
      }.`
    : '';
  const lostText = lost.length ? ` Morreram ${citizenNames(lost)}.` : '';
  const hurtText = injuries ? ` ${injuries} ${injuries === 1 ? 'herói ficou ferido' : 'heróis ficaram feridos'}.` : '';
  const goldText = goldLost ? ` Levaram ${goldLost} de ouro.` : '';
  const head = outcome === 'repelido' ? 'A vila repeliu' : outcome === 'custoso' ? 'A vila segurou com custo' : 'O abismo saqueou';
  record(
    world,
    'incursao',
    [],
    `${head} uma incursão ${ACTS[act]!.of} (poder ${power} contra defesa ${defense}).${hitName}${lostText}${hurtText}${goldText}`,
  );

  const raid: Raid = { day: dayOf(world.tick), act, corruption, power, defense, outcome, building, citizenLoss: loss, goldLost, injuries };
  world.raids.push(raid);
  if (world.raids.length > 12) world.raids.shift();
  return raid;
}
