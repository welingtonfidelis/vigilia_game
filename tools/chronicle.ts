// Roda uma campanha com o prefeito automático e imprime a Crônica da Vila.
// Uso: npm run chronicle -- --seed 7 --years 3 [--all]

import { abyssPressure, autoMayor, BIOMES, createWorld, describeHero, formatDate, rulesLabel, runDays, DAYS_PER_YEAR } from '../src/sim/index.ts';
import type { ChronicleKind } from '../src/sim/index.ts';
import { parseArgs, num } from './args.ts';

const args = parseArgs(process.argv.slice(2));
const seed = num(args.seed, 7);
const years = num(args.years, 3);
const ROUTINE: ChronicleKind[] = ['partida', 'retorno', 'berrante', 'nivel', 'contrato'];

const world = createWorld(seed);
runDays(world, years * DAYS_PER_YEAR, { onHour: autoMayor });

console.log(`\n═══ Crônica de Vigília · semente ${seed} · ${years} anos ═══\n`);
for (const entry of world.chronicle) {
  if (!args.all && ROUTINE.includes(entry.kind)) continue;
  console.log(`${formatDate(entry.tick).padEnd(26)} ${entry.text}`);
}

const alive = world.heroes.filter((h) => h.status === 'town' || h.status === 'expedition');
const dead = world.heroes.filter((h) => h.status === 'dead');
console.log('\n─── Na vila hoje ───');
for (const h of alive) console.log(`  ${describeHero(h)} · ${h.stats.expeditions} exp · ${Math.round(h.gold)} ouro`);
console.log('\n─── Memorial ───');
for (const h of dead) console.log(`  ${describeHero(h)} · ${h.death?.where} · ${formatDate(h.death!.tick)}`);
const passages = world.abyss.passages
  .map((p) => `${p.discovered ? BIOMES[p.biome]!.name : 'desconhecida'} (nível ${p.level}, ${rulesLabel(p.rules)}): ${p.conquered.filter(Boolean).length}/${p.floors}${p.sealed ? ' ✝' : ''}`)
  .join(' · ');
console.log(`\nAbismo: nível ${world.abyss.level} · pressão ${Math.round(abyssPressure(world))} · ${passages || 'nenhuma passagem aberta'}`);
console.log(`Tesouro: ${Math.round(world.town.treasury)} · População: ${Math.round(world.town.population)} · Reputação: ${world.town.reputation}\n`);
