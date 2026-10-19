import { SAVE_VERSION } from './config.ts';
import type { World } from './types.ts';

export function serialize(world: World): string {
  return JSON.stringify(world);
}

export function deserialize(json: string): World {
  const data = JSON.parse(json) as World;
  if (typeof data.version !== 'number') throw new Error('Save inválido: sem versão.');
  if (data.version > SAVE_VERSION) throw new Error(`Save da versão ${data.version}, este jogo lê até a ${SAVE_VERSION}.`);
  return migrate(data);
}

/** Ponto único para migrar saves antigos quando o formato mudar. */
function migrate(world: World): World {
  return world;
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
