// Objetivos abertos (regra de ouro do GDD: sempre algo para agora, para logo e para depois).

import {
  activeHeroes,
  ACTS,
  BUILDING_IDS,
  BUILDINGS,
  buildingLevel,
  floorLabel,
  hornCost,
  MATERIAL_NAMES,
  nextLevelCost,
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
    out.push({ horizon: 'agora', text: 'Poste um contrato no quadro para levar os heróis ao próximo andar.' });
  }

  const upgrade = cheapestUpgrade(world);
  if (upgrade) out.push({ horizon: 'logo', text: upgrade });

  const actIdx = world.acts.findIndex((a) => a.unlocked && !a.bossDefeated);
  if (actIdx >= 0) {
    const act = world.acts[actIdx]!;
    const floor = act.conquered.findIndex((c) => !c);
    const def = ACTS[actIdx]!;
    out.push({
      horizon: 'depois',
      text: floor === act.conquered.length - 1 ? `Derrote ${midSentence(def.boss.name)} no ${floorLabel(actIdx, floor)}.` : `Conquiste o ${floorLabel(actIdx, floor)}.`,
    });
  }
  return out.slice(0, 3);
}

function cheapestUpgrade(world: World): string | null {
  let best: { text: string; gold: number } | null = null;
  for (const id of BUILDING_IDS) {
    const cost = nextLevelCost(world, id);
    if (!cost) continue;
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
