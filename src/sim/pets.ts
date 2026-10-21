// Cães e gatos da vila (só enfeite e carinho): chegam um de cada vez, ficam alguns anos e
// vão embora; outro, de outra pelagem, aparece no lugar. O sorteio sai de um hash da
// semente e do dia, sem mexer no RNG do núcleo: o resto da campanha fica igual.

import { PET_LOOKS, PET_NAMES, PET_SPECIES_NAME } from '../data/pets.ts';
import { dayOf, yearOf } from './calendar.ts';
import { record } from './chronicle.ts';
import { BALANCE as B, DAYS_PER_YEAR } from './config.ts';
import type { Pet, PetSpecies, World } from './types.ts';

/** Número estável em [0, 1) para (semente, dia, sal). */
function roll(seed: number, day: number, salt: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(day + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(salt + 0x165667b1, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 0x100000000;
}

/** Quantos bichos a vila comporta agora: poucos no primeiro ano, um a mais depois. */
export const petCap = (world: World): number => (yearOf(dayOf(world.tick)) >= 2 ? B.petsMax : B.petsMaxFirstYear);

export const petCoat = (pet: Pet): string => PET_LOOKS[pet.species].find((l) => l.id === pet.look)?.coat ?? '';

export function dailyPets(world: World): void {
  const town = world.town;
  const today = dayOf(world.tick);
  const pets = (town.pets ??= []);
  for (const pet of [...pets]) {
    if (today < pet.leavesDay) continue;
    pets.splice(pets.indexOf(pet), 1);
    const text =
      pet.species === 'cao'
        ? `${pet.name}, o cão ${petCoat(pet)} da vila, foi embora de vez. O pote de água ficou na praça.`
        : `${pet.name}, o gato ${petCoat(pet)}, sumiu pelos telhados e não voltou mais.`;
    record(world, 'bicho', [], text);
  }
  if (pets.length < petCap(world) && roll(world.seed, today, 1) < B.petArrivalChance) arrive(world, today, pets);
}

function arrive(world: World, today: number, pets: Pet[]): void {
  const has = (s: PetSpecies) => pets.some((p) => p.species === s);
  const species: PetSpecies = !has('cao') ? 'cao' : !has('gato') ? 'gato' : roll(world.seed, today, 2) < 0.5 ? 'cao' : 'gato';
  // Pelagem que ninguém da mesma espécie está usando: parece outro bicho de verdade.
  const looks = PET_LOOKS[species].filter((l) => !pets.some((p) => p.species === species && p.look === l.id));
  const look = looks[Math.floor(roll(world.seed, today, 3) * looks.length)] ?? PET_LOOKS[species][0]!;
  const names = PET_NAMES[species].filter((n) => !pets.some((p) => p.name === n));
  const name = names[Math.floor(roll(world.seed, today, 4) * names.length)] ?? PET_NAMES[species][0]!;
  const [minYears, maxYears] = B.petYears;
  const stay = Math.round((minYears + roll(world.seed, today, 5) * (maxYears - minYears)) * DAYS_PER_YEAR);
  const town = world.town;
  town.petSeq = (town.petSeq ?? 0) + 1;
  const pet: Pet = { id: town.petSeq, species, look: look.id, name, arrivedDay: today, leavesDay: today + stay, lastPetDay: -1, pets: 0 };
  pets.push(pet);
  record(world, 'bicho', [], `Um ${PET_SPECIES_NAME[species]} ${look.coat} apareceu na vila; o povo chamou de ${name}.`);
}

/** Carinho do prefeito: uma vez por dia por bicho. */
export function petAnimal(world: World, petId: number): { ok: true } | { ok: false; reason: string } {
  const pet = world.town.pets?.find((p) => p.id === petId);
  if (!pet) return { ok: false, reason: 'Esse bicho já não está na vila.' };
  const today = dayOf(world.tick);
  if (pet.lastPetDay === today) return { ok: false, reason: `${pet.name} já ganhou carinho hoje.` };
  pet.lastPetDay = today;
  pet.pets++;
  return { ok: true };
}
