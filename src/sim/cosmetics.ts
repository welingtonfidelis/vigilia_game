// Cosmética da vila (M6 F6). O estandarte (cores e símbolo, como os brasões das casas), o
// enfeite de cada um dos 12 pontos da vila, os nomes da praça e das ruas e o busto do memorial.
// Os enfeites se liberam pelos feitos da vila; o ouro é simbólico, e nada aqui mexe no jogo.

import { DECOR_BY_ID, DECOR_POINTS, STREETS, type DecorDef } from '../data/decor.ts';
import { record } from './chronicle.ts';
import { spend } from './economy.ts';
import { legendsOf } from './hall.ts';
import { biomePageComplete, codexOf } from './codex.ts';
import { crestReadable, housesOf, rollCrest } from './houses.ts';
import type { Crest, DecorId, StreetId, World } from './types.ts';

export type CosmeticResult = { ok: true } | { ok: false; reason: string };

/** O estandarte da vila: o que o prefeito escolheu, ou o que a semente deu. */
export const villageBanner = (world: World): Crest => world.town.banner ?? rollCrest(world, 0, 900);

export function setBanner(world: World, banner: Crest): CosmeticResult {
  if (!crestReadable(banner)) return { ok: false, reason: 'Metal sobre cor ou cor sobre metal: ouro e prata não vão um sobre o outro, nem duas cores.' };
  world.town.banner = { ...banner };
  return { ok: true };
}

/** O que falta para liberar o enfeite (null = liberado). */
export function decorBlocker(world: World, def: DecorDef): string | null {
  const u = def.unlock;
  switch (u.kind) {
    case 'livre':
      return null;
    case 'lendas':
      return legendsOf(world).total >= u.n ? null : `Libera com ${u.n} lendas no Salão.`;
    case 'torneios': {
      const held = world.metrics.tournaments?.held ?? 0;
      return held >= u.n ? null : u.n === 1 ? 'Libera com o primeiro torneio.' : `Libera com ${u.n} torneios (${held} até agora).`;
    }
    case 'feitoCasa':
      return housesOf(world).some((h) => h.deeds.length > 0) ? null : 'Libera com o primeiro feito de uma casa.';
    case 'nemesis':
      return (world.abyss.nemeses ?? []).some((n) => n.fallen) ? null : 'Libera quando a primeira nêmesis cair.';
    case 'senhor':
      return world.metrics.bossKills.length > 0 ? null : 'Libera com o primeiro Senhor vencido.';
    case 'pagina':
      return biomePageComplete(codexOf(world), u.biome) ? null : 'Libera com a página do bioma completa no bestiário.';
  }
}

/** Enfeite de cada ponto (o save antigo começa sem nenhum). */
export const decorOf = (world: World): (DecorId | null)[] => {
  const d = (world.town.decor ??= []);
  while (d.length < DECOR_POINTS) d.push(null);
  return d;
};

/** O prefeito põe (ou tira, com null) o enfeite de um ponto. */
export function placeDecor(world: World, point: number, id: DecorId | null): CosmeticResult {
  if (!Number.isInteger(point) || point < 0 || point >= DECOR_POINTS) return { ok: false, reason: 'Esse ponto não existe.' };
  const decor = decorOf(world);
  if (decor[point] === id) return { ok: false, reason: 'O enfeite já está lá.' };
  if (id === null) {
    decor[point] = null;
    return { ok: true };
  }
  const def = DECOR_BY_ID.get(id);
  if (!def) return { ok: false, reason: 'Esse enfeite não existe.' };
  const blocked = decorBlocker(world, def);
  if (blocked) return { ok: false, reason: blocked };
  if (world.town.treasury < def.cost) return { ok: false, reason: `Faltam ${Math.ceil(def.cost - world.town.treasury)} de ouro.` };
  if (def.cost > 0) spend(world, 'enfeite', def.cost);
  decor[point] = id;
  return { ok: true };
}

export const streetName = (world: World, id: StreetId): string => world.town.streets?.[id] ?? STREETS.find((s) => s.id === id)!.name;

/** O prefeito dá nome à praça ou a uma rua. */
export function renameStreet(world: World, id: StreetId, name: string): CosmeticResult {
  const street = STREETS.find((s) => s.id === id);
  if (!street) return { ok: false, reason: 'Essa rua não existe.' };
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length < 3 || clean.length > 32) return { ok: false, reason: 'O nome precisa ter de 3 a 32 letras.' };
  if (!/^[\p{L}][\p{L}\p{N} '-]*$/u.test(clean)) return { ok: false, reason: 'Só letras, números, espaço, hífen e apóstrofo.' };
  const old = streetName(world, id);
  if (clean === old) return { ok: false, reason: 'A rua já tem esse nome.' };
  if (STREETS.some((s) => s.id !== id && streetName(world, s.id).toLowerCase() === clean.toLowerCase())) return { ok: false, reason: 'Outra rua já tem esse nome.' };
  (world.town.streets ??= {})[id] = clean;
  record(world, 'prefeito', [], `Por decisão do prefeito, ${old} passou a se chamar ${clean}.`);
  return { ok: true };
}

/** O prefeito escolhe o herói caído do busto do memorial (null tira o busto). */
export function setBust(world: World, heroId: number | null): CosmeticResult {
  if (heroId === null) {
    world.town.bust = null;
    return { ok: true };
  }
  const hero = world.heroes.find((h) => h.id === heroId);
  if (!hero || hero.status !== 'dead') return { ok: false, reason: 'O busto do memorial é de um herói caído.' };
  if (world.town.bust === heroId) return { ok: false, reason: `O busto já é de ${hero.name}.` };
  world.town.bust = heroId;
  record(world, 'prefeito', [heroId], `O busto da entrada do cemitério agora lembra ${hero.name}.`);
  return { ok: true };
}
