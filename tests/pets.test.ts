import { describe, expect, it } from 'vitest';
import { commands, createWorld, DAYS_PER_YEAR, TICKS_PER_DAY } from '../src/sim/index.ts';
import { dailyPets, petCap } from '../src/sim/pets.ts';
import type { World } from '../src/sim/index.ts';

/** Avança só o relógio e roda o dia dos bichos (o resto da simulação não importa aqui). */
function days(world: World, n: number): void {
  for (let i = 0; i < n; i++) {
    world.tick += TICKS_PER_DAY;
    dailyPets(world);
  }
}

describe('cães e gatos da vila', () => {
  it('chegam aos poucos: um cão, depois um gato, no máximo 2 no primeiro ano e 3 depois', () => {
    const world = createWorld(5);
    days(world, 30);
    const pets = world.town.pets ?? [];
    expect(pets.length).toBe(2);
    expect(pets.map((p) => p.species).sort()).toEqual(['cao', 'gato']);
    expect(petCap(world)).toBe(2);
    days(world, DAYS_PER_YEAR);
    expect(world.town.pets!.length).toBeLessThanOrEqual(3);
    expect(world.chronicle.filter((e) => e.kind === 'bicho').length).toBeGreaterThanOrEqual(2);
  });

  it('vão embora depois de alguns anos e outro, de outra pelagem, chega no lugar', () => {
    const world = createWorld(9);
    days(world, 20);
    const first = world.town.pets![0]!;
    days(world, first.leavesDay - Math.floor(world.tick / TICKS_PER_DAY) + 30);
    expect(world.town.pets!.some((p) => p.id === first.id)).toBe(false);
    const sameSpecies = world.town.pets!.filter((p) => p.species === first.species);
    expect(sameSpecies.length).toBeGreaterThan(0);
    expect(world.chronicle.some((e) => e.kind === 'bicho' && e.text.includes(first.name) && /embora|sumiu/.test(e.text))).toBe(true);
  });

  it('carinho uma vez por dia por bicho', () => {
    const world = createWorld(5);
    days(world, 30);
    const pet = world.town.pets![0]!;
    expect(commands.petAnimal(world, pet.id).ok).toBe(true);
    const again = commands.petAnimal(world, pet.id);
    expect(again.ok).toBe(false);
    days(world, 1);
    expect(commands.petAnimal(world, pet.id).ok).toBe(true);
    expect(pet.pets).toBe(2);
  });

  it('não mexem no sorteio do núcleo (o resto da campanha fica igual)', () => {
    const world = createWorld(5);
    const before = JSON.stringify(world.rng);
    days(world, 200);
    expect(JSON.stringify(world.rng)).toBe(before);
    expect(world.nextId).toBe(createWorld(5).nextId);
  });
});
