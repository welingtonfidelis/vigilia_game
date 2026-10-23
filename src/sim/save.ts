import { SAVE_VERSION } from './config.ts';
import type { World } from './types.ts';

export function serialize(world: World): string {
  return JSON.stringify(world);
}

/**
 * Save de antes do M5 (atos fixos). O abismo mudou demais para converter com justiça: a
 * tela guarda o save antigo à parte e começa uma campanha nova.
 */
export class OldSaveError extends Error {
  readonly version: number;
  constructor(version: number) {
    super(`Save da versão ${version}: o abismo mudou e esta versão começa uma campanha nova.`);
    this.name = 'OldSaveError';
    this.version = version;
  }
}

export function deserialize(json: string): World {
  const data = JSON.parse(json) as World;
  if (typeof data.version !== 'number') throw new Error('Save inválido: sem versão.');
  if (data.version > SAVE_VERSION) throw new Error(`Save da versão ${data.version}, este jogo lê até a ${SAVE_VERSION}.`);
  if (data.version < SAVE_VERSION) throw new OldSaveError(data.version);
  fillDefaults(data);
  return data;
}

/**
 * Saves da versão 11 feitos no meio do M5 (antes da F2 e da F4) não têm os campos novos:
 * completa com os valores de um mundo novo.
 */
function fillDefaults(world: World): void {
  const town = world.town;
  town.care ??= Object.fromEntries(Object.keys(town.buildings).map((id) => [id, 100])) as World['town']['care'];
  town.repairs ??= {};
  world.abyss.fragments ??= 0;
  world.abyss.amulet ??= null;
  const m = world.metrics;
  m.bossKills ??= [];
  m.lordFailures ??= 0;
  m.treasuryIn ??= 0;
  m.maintenance ??= 0;
  m.repairs ??= 0;
  m.spent ??= {};
}

/** Hash curto (FNV-1a) do estado, útil para comparar mundos em testes. */
export function checksum(world: World): string {
  const text = serialize(world);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
