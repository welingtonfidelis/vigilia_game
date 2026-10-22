import { BALANCE, SAVE_VERSION } from './config.ts';
import { DECREE_IDS } from './decrees.ts';
import { defaultRole, epitaph } from './people.ts';
import { seedCitizens } from './citizens.ts';
import { commonItem, emptyItems } from './items.ts';
import type { Hero, Item, Town, World } from './types.ts';

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
  if (world.version < 2) migrateToV2(world);
  if (world.version < 3) migrateToV3(world);
  if (world.version < 4) migrateToV4(world);
  if (world.version < 5) migrateToV5(world);
  if (world.version < 6) migrateToV6(world);
  if (world.version < 7) migrateToV7(world);
  if (world.version < 8) migrateToV8(world);
  if (world.version < 9) migrateToV9(world);
  if (world.version < 10) migrateToV10(world);
  return world;
}

/** v9 → v10: dificuldade da campanha; quem já jogava segue no Normal. */
function migrateToV10(world: World): void {
  world.difficulty ??= 'normal';
  world.version = 10;
}

/** v2 → v3 (Fase A): a data da última festa na praça. */
function migrateToV3(world: World): void {
  const town = world.town as unknown as { festivalDay?: number };
  town.festivalDay ??= -1;
  world.version = 3;
}

/** v3 → v4 (M3): moradores nomeados, crescimento inteiro e incursões. */
function migrateToV4(world: World): void {
  type Loose<T> = { [K in keyof T]?: T[K] };
  const w = world as Loose<World> & World;
  w.citizens ??= [];
  w.raids ??= [];
  const town = world.town as Loose<World['town']> & World['town'];
  town.popGrowth ??= 0;
  town.lastRaidDay ??= -1;
  town.population = Math.round(town.population);
  const m = world.metrics as Loose<World['metrics']> & World['metrics'];
  for (const k of ['raids', 'citizenDeaths', 'citizensLeft'] as const) m[k] ??= 0;
  if (w.citizens.length === 0 && town.population > 0) {
    const target = Math.min(
      BALANCE.citizenRoster,
      Math.max(BALANCE.citizenStart, Math.round(town.population / BALANCE.citizenPerPop)),
    );
    seedCitizens(world, target);
  }
  world.version = 4;
}

function migrateToV8(world: World): void {
  world.version = 8;
}

/**
 * v8 → v9 (M4, itens): o tier de arma e armadura vira uma peça comum do mesmo tier; o
 * tier herdado das crianças também. Cofre, forja e especializações começam vazios.
 */
function migrateToV9(world: World): void {
  for (const hero of world.heroes) {
    const h = hero as Hero & { items?: Hero['items'] };
    h.items ??= emptyItems();
    if (hero.status === 'dead' || hero.status === 'left') continue;
    for (const slot of ['weapon', 'armor'] as const) {
      if (hero.gear[slot] > 0 && !h.items[slot]) {
        const item = commonItem(world, slot, hero.gear[slot], 'equipamento de antes do cofre');
        item.owners.push(hero.id);
        h.items[slot] = item;
      }
    }
  }
  for (const child of world.children) {
    const old = child.heirloom as unknown as number | Item | null;
    if (typeof old === 'number') child.heirloom = old > 0 ? commonItem(world, 'weapon', old, 'herança') : null;
  }
  const town = world.town as Town & Partial<Pick<Town, 'arsenal' | 'forge' | 'specs'>>;
  town.arsenal ??= [];
  town.forge ??= [];
  town.specs ??= {};
  for (const r of world.remains) r.items ??= [];
  world.version = 9;
}

/** v6 → v7 (M3): expansão sul com três lotes de moradia. */
function migrateToV7(world: World): void {
  type Loose<T> = { [K in keyof T]?: T[K] };
  const town = world.town as Loose<World['town']> & World['town'];
  town.expansion ??= { cleared: false, houses: [false, false, false] };
  town.expansion.houses = [0, 1, 2].map((i) => town.expansion.houses?.[i] === true) as [boolean, boolean, boolean];
  world.version = 7;
}

/** v5 → v6 (M3): eventos sazonais pendentes. */
function migrateToV6(world: World): void {
  type Loose<T> = { [K in keyof T]?: T[K] };
  const town = world.town as Loose<World['town']> & World['town'];
  town.event ??= null;
  town.lastEventKey ??= '';
  world.version = 6;
}

/** v4 → v5 (M3): decretos e salários. Saves antigos começam sem decreto. */
function migrateToV5(world: World): void {
  type Loose<T> = { [K in keyof T]?: T[K] };
  const town = world.town as Loose<World['town']> & World['town'];
  town.decrees = (town.decrees ?? []).filter((id) => (DECREE_IDS as string[]).includes(id));
  world.version = 5;
}

/** v1 → v2 (M2, Pessoas): lesões, casais, filhos, aposentados com função, epitáfios e prefeito. */
function migrateToV2(world: World): void {
  type Loose<T> = { [K in keyof T]?: T[K] };
  const town = world.town as Loose<World['town']> & World['town'];
  town.buildings.casa ??= 0;
  town.mayorEnergy ??= BALANCE.mayorEnergy;
  town.speechDay ??= -1;
  (world as Loose<World> & World).children ??= [];
  const m = world.metrics as Loose<World['metrics']> & World['metrics'];
  for (const k of ['injuries', 'scars', 'marriages', 'births', 'comeOfAge', 'oldAgeDeaths'] as const) m[k] ??= 0;
  for (const hero of world.heroes) {
    const h = hero as Loose<typeof hero> & typeof hero;
    h.injury ??= null;
    h.scars ??= [];
    h.partnerId ??= null;
    h.parents ??= [];
    h.retiredRole ??= h.status === 'retired' ? defaultRole(h) : null;
    h.lastTalkDay ??= -1;
    h.epitaph ??= null;
  }
  // Quem morreu antes do M2 ganha o epitáfio agora.
  for (const hero of world.heroes) if (hero.status === 'dead' && !hero.epitaph) hero.epitaph = epitaph(world, hero);
  world.version = 2;
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
