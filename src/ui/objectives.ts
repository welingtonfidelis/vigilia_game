// Objetivos abertos (regra de ouro do GDD: sempre algo para agora, para logo e para depois).

import {
  activeHeroes,
  BALANCE,
  BIOMES,
  commands,
  lordOf,
  BUILDING_IDS,
  BUILDINGS,
  buildingLevel,
  careOf,
  floorLabel,
  hornCost,
  isGuardianFloor,
  MATERIAL_NAMES,
  nextLevelCost,
  openPassages,
  repairCost,
  repairOf,
  upgradeBlocker,
} from '../sim/index.ts';
import type { MaterialId, World } from '../sim/index.ts';
import { fmt, midSentence } from './format.ts';

export type Horizon = 'agora' | 'logo' | 'depois';

export interface Objective {
  horizon: Horizon;
  text: string;
}

export function objectives(world: World): Objective[] {
  const out: Objective[] = [];
  const town = world.town;
  const roster = activeHeroes(world).length;

  if (town.hornUses === 0) {
    out.push({ horizon: 'agora', text: 'Ande até o berrante, no portão ao norte, e toque para chamar heróis.' });
  } else if (world.metrics.expeditions === 0) {
    out.push({
      horizon: 'agora',
      text:
        roster + town.arrivals.length < 3
          ? 'Os heróis formam grupos de 3. Toque o berrante de novo quando ele parar de ecoar.'
          : roster < 3
            ? 'Os aventureiros estão chegando pelo portão, ao norte.'
            : 'Os heróis formam grupo sozinhos no quadro. Veja-os descer ao abismo.',
    });
  } else if (roster < 3 && town.arrivals.length === 0) {
    out.push({ horizon: 'agora', text: `Restam poucos heróis. Toque o berrante (${fmt(hornCost(world))} de ouro).` });
  } else if (buildingLevel(world, 'guilda') >= 1 && town.contracts.length === 0) {
    out.push({ horizon: 'agora', text: 'Poste um contrato no quadro para levar os heróis a uma passagem ou ao próximo andar.' });
  }

  // Prédio gasto vem antes de qualquer obra nova: rende menos e, em 0, perde um nível.
  const worn = wornest(world);
  if (worn) out.push({ horizon: 'logo', text: worn });
  const upgrade = cheapestUpgrade(world);
  if (upgrade) out.push({ horizon: 'logo', text: upgrade });

  // O amuleto: juntar fragmentos, montar e mandar o grupo ao Senhor.
  const abyss = world.abyss;
  const lord = lordOf(abyss.amulet?.level ?? abyss.level);
  if (abyss.amulet && !abyss.amulet.inUse && world.tick >= abyss.amulet.readyTick) {
    out.push({ horizon: 'logo', text: `O amuleto está pronto: mande um grupo enfrentar ${midSentence(lord.name)} (no Cofre ou no Abismo).` });
  } else if (!abyss.amulet && abyss.fragments >= BALANCE.fragmentsPerAmulet) {
    out.push({ horizon: 'logo', text: `Monte o amuleto do nível ${abyss.level} no Cofre (${fmt(commands.amuletCostFor(world, abyss.level))} de ouro).` });
  } else if (!abyss.amulet && abyss.fragments > 0) {
    out.push({ horizon: 'depois', text: `Junte fragmentos de amuleto do nível ${abyss.level}: ${abyss.fragments} de ${BALANCE.fragmentsPerAmulet}.` });
  }
  // O abismo: abrir a primeira passagem, depois descer até o guardião e selar.
  const known = openPassages(world).filter((p) => p.discovered);
  if (known.length === 0) {
    out.push({ horizon: 'depois', text: 'Abra a primeira passagem: o próximo grupo que descer vai descobrir o que há do outro lado.' });
  } else {
    const deepest = known.reduce((a, b) => (b.level * 10 + b.conquered.filter(Boolean).length > a.level * 10 + a.conquered.filter(Boolean).length ? b : a));
    const floor = deepest.conquered.findIndex((c) => !c);
    if (floor >= 0) {
      const name = BIOMES[deepest.biome]!.name;
      out.push({
        horizon: 'depois',
        text: isGuardianFloor(deepest, floor) ? `Vença o guardião e sele a passagem para ${name}.` : `Conquiste o ${floorLabel({ biome: deepest.biome, floor })}.`,
      });
    }
  }
  return out.slice(0, 3);
}

/** "Conserte a taverna (conservação 32): …" para o prédio mais gasto abaixo de 50. */
function wornest(world: World): string | null {
  const worn = BUILDING_IDS.filter((id) => buildingLevel(world, id) > 0 && repairOf(world, id) === undefined && careOf(world, id) < BALANCE.careWorn);
  if (worn.length === 0) return null;
  const id = worn.reduce((a, b) => (careOf(world, b) < careOf(world, a) ? b : a));
  const cost = repairCost(world, id);
  const name = `${BUILDINGS[id].gender === 'm' ? 'o' : 'a'} ${BUILDINGS[id].name.toLowerCase()}`;
  return `Conserte ${name} (conservação ${Math.floor(careOf(world, id))})${cost ? `: ${fmt(cost.gold)} de ouro` : ''}.`;
}

function cheapestUpgrade(world: World): string | null {
  let best: { text: string; gold: number } | null = null;
  for (const id of BUILDING_IDS) {
    const cost = nextLevelCost(world, id);
    if (!cost || upgradeBlocker(world, id)) continue;
    const lvl = buildingLevel(world, id);
    // Ruínas primeiro: reconstruir vale mais do que melhorar.
    const weight = cost.gold + (lvl > 0 ? 10_000 : 0);
    if (best && weight >= best.gold) continue;
    const mats = Object.entries(cost.materials ?? {}) as [MaterialId, number][];
    const missing = mats.filter(([m, q]) => world.town.materials[m] < q).map(([m, q]) => `${q} de ${MATERIAL_NAMES[m].toLowerCase()}`);
    const name = BUILDINGS[id].name.toLowerCase();
    const what = lvl === 0 ? `Reconstrua ${BUILDINGS[id].gender === 'm' ? 'o' : 'a'} ${name}` : `Melhore ${BUILDINGS[id].gender === 'm' ? 'o' : 'a'} ${name} para o nível ${lvl + 1}`;
    const price = `${fmt(cost.gold)} de ouro${mats.length ? ` e ${mats.map(([m, q]) => `${q} de ${MATERIAL_NAMES[m].toLowerCase()}`).join(', ')}` : ''}`;
    const lack = world.town.treasury < cost.gold ? ` Faltam ${fmt(cost.gold - world.town.treasury)} de ouro.` : missing.length ? ' Faltam materiais do abismo.' : '';
    best = { text: `${what} (${price}).${lack}`, gold: weight };
  }
  return best?.text ?? null;
}
