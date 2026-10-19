// Diagnóstico: onde, como e quem morre. Uso: node tools/deaths.ts --seeds 6 --years 5
import { autoMayor, createWorld, runDays, DAYS_PER_YEAR } from '../src/sim/index.ts';
import { CLASSES } from '../src/data/classes.ts';
import { parseArgs, num } from './args.ts';

const args = parseArgs(process.argv.slice(2));
const seeds = num(args.seeds, 6);
const years = num(args.years, 5);
const by = new Map<string, number>();
const cls = new Map<string, number>();
const lvl = new Map<string, number>();
const exps = new Map<string, number>();
const where = new Map<string, number>();
const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
let total = 0;
for (let s = 1; s <= seeds; s++) {
  const w = createWorld(s);
  runDays(w, years * DAYS_PER_YEAR, { onHour: autoMayor });
  for (const h of w.heroes) {
    if (h.status !== 'dead') continue;
    total++;
    inc(by, h.death!.by.replace(/ (Veloz|Vampirico|Explosivo|Couracado|Feroz)/g, '*'));
    inc(cls, CLASSES[h.classId].role);
    inc(lvl, h.level <= 2 ? '1-2' : h.level <= 5 ? '3-5' : h.level <= 10 ? '6-10' : '11+');
    inc(exps, h.stats.expeditions === 0 ? '0' : h.stats.expeditions <= 3 ? '1-3' : h.stats.expeditions <= 10 ? '4-10' : '11+');
    inc(where, h.death!.where);
  }
}
const show = (title: string, m: Map<string, number>) => {
  console.log(`\n${title}`);
  for (const [k, v] of [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${k.padEnd(34)} ${v} (${Math.round((v / total) * 100)}%)`);
};
console.log(`mortes: ${total}`);
show('papel', cls); show('nível', lvl); show('expedições antes de morrer', exps); show('causa', by); show('onde', where);
