// Balanceador headless: roda várias campanhas com o prefeito automático e resume
// ritmo, mortalidade e economia. Uso: npm run balance -- --seeds 20 --years 10 [--json] [--saves]
// Com --saves (o playtest automático: npm run playtest), a cada 5 anos salva e carrega o
// mundo e segue jogando com o carregado; o save tem que voltar idêntico.

import { mkdirSync, writeFileSync } from 'node:fs';
import { ACTS } from '../src/data/acts.ts';
import { ACT_COUNT, autoMayor, checksum, createWorld, deserialize, runDays, serialize, DAYS_PER_YEAR, TICKS_PER_DAY, TICKS_PER_SECOND } from '../src/sim/index.ts';
import type { World } from '../src/sim/index.ts';
import { parseArgs, num } from './args.ts';

const args = parseArgs(process.argv.slice(2));
const seeds = num(args.seeds, 12);
const years = num(args.years, 10);
const firstSeed = num(args.from, 1);
const checkSaves = !!args.saves;
/** De quantos em quantos anos o playtest salva e carrega. */
const SAVE_EVERY = 5;
let saveChecks = 0;
let saveFailures = 0;

interface Run {
  seed: number;
  world: World;
  ms: number;
}

const runs: Run[] = [];
for (let s = firstSeed; s < firstSeed + seeds; s++) {
  const t0 = performance.now();
  let world = createWorld(s);
  for (let y = 0; y < years; y += SAVE_EVERY) {
    runDays(world, Math.min(SAVE_EVERY, years - y) * DAYS_PER_YEAR, { onHour: autoMayor });
    if (!checkSaves) continue;
    const loaded = deserialize(serialize(world));
    saveChecks++;
    if (checksum(loaded) !== checksum(world)) saveFailures++;
    world = loaded;
  }
  runs.push({ seed: s, world, ms: performance.now() - t0 });
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fmt = (x: number, d = 1) => x.toFixed(d);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const yearOfDay = (day: number) => day / DAYS_PER_YEAR;
/** Horas reais em velocidade 1× para chegar a um ano do jogo. */
const hoursAt1x = (year: number) => (year * DAYS_PER_YEAR * TICKS_PER_DAY) / TICKS_PER_SECOND / 3600;

// ── Por semente ───────────────────────────────────────────────────────────
console.log(`\nVigília · balanceamento · ${seeds} sementes × ${years} anos\n`);
const header = ['seed', 'chefes (ano)', 'mortes/ano', 'recrut', 'saíram', 'elenco', 'nv médio', 'tesouro', 'ouro heróis', 'impasses', 'ócio máx', 'ms'];
console.log(header.join(' | '));
for (const { seed, world, ms } of runs) {
  const m = world.metrics;
  const last = m.daily[m.daily.length - 1]!;
  const bosses = m.bossKills.map((b) => fmt(yearOfDay(b.day))).join(' ') || '—';
  console.log(
    [
      seed,
      bosses,
      fmt(m.deaths / years),
      m.recruits,
      m.left,
      last.roster,
      last.avgLevel,
      last.treasury,
      last.heroGold,
      m.stalemates,
      m.longestIdleStreak,
      Math.round(ms),
    ].join(' | '),
  );
}

// ── Agregado ──────────────────────────────────────────────────────────────
const all = runs.map((r) => r.world);
console.log('\n── Ritmo do abismo (ano em que cada chefe caiu, média · faixa · % das sementes) ──');
for (let a = 0; a < ACTS.length; a++) {
  const days = all.map((w) => w.metrics.bossKills.find((b) => b.act === a)?.day).filter((d): d is number => d !== undefined);
  if (days.length === 0) {
    console.log(`  ${ACTS[a]!.name.padEnd(18)} —`);
    continue;
  }
  const ys = days.map(yearOfDay);
  console.log(
    `  ${ACTS[a]!.name.padEnd(18)} ano ${fmt(mean(ys))} (~${fmt(hoursAt1x(mean(ys)))} h em 1×) · ${fmt(Math.min(...ys))}–${fmt(Math.max(...ys))} · ${pct(days.length / all.length)}`,
  );
}

const sum = (f: (w: World) => number) => all.reduce((s, w) => s + f(w), 0);
const exps = sum((w) => w.metrics.expeditions);
console.log('\n── Expedições ──');
console.log(`  por ano: ${fmt(exps / all.length / years)} · salas limpas/ano: ${fmt(sum((w) => w.metrics.roomsCleared) / all.length / years)}`);
const outcomes = ['conquista', 'retirada', 'chamado', 'cansaco', 'massacre', 'fuga'] as const;
console.log(
  '  desfechos: ' +
    outcomes.map((o) => `${o} ${pct(sum((w) => w.metrics.outcomes[o]) / Math.max(1, exps))}`).join(' · '),
);
console.log(`  fugas individuais: ${sum((w) => w.metrics.fled)} · promoções de rank: ${sum((w) => w.metrics.rankUps)} · impasses: ${sum((w) => w.metrics.stalemates)}`);

console.log('\n── Mortalidade ──');
console.log(`  mortes por ano: ${fmt(sum((w) => w.metrics.deaths) / all.length / years)} · mortes por expedição: ${fmt(sum((w) => w.metrics.deaths) / Math.max(1, exps), 2)}`);
console.log(`  saíram da vila: ${fmt(sum((w) => w.metrics.left) / all.length, 1)}/campanha · aposentados: ${fmt(sum((w) => w.metrics.retired) / all.length, 1)}`);

console.log('\n── Pessoas (M2, por campanha) ──');
const per = (f: (w: World) => number) => fmt(sum(f) / all.length);
console.log(
  `  lesões ${per((w) => w.metrics.injuries)} · cicatrizes ${per((w) => w.metrics.scars)} · casamentos ${per((w) => w.metrics.marriages)} · nascimentos ${per((w) => w.metrics.births)} · maioridades ${per((w) => w.metrics.comeOfAge)} · mortes de velhice ${per((w) => w.metrics.oldAgeDeaths)}`,
);
const retiredByRole = (role: string) => per((w) => w.heroes.filter((h) => h.status === 'retired' && h.retiredRole === role).length);
console.log(`  aposentados vivos no fim: mentor ${retiredByRole('mentor')} · ferreiro ${retiredByRole('ferreiro')} · contador ${retiredByRole('contador')} · curandeiro ${retiredByRole('curandeiro')}`);

console.log('\n── Vila (M3, por campanha) ──');
console.log(
  `  incursões ${per((w) => w.metrics.raids)} · mortes de moradores ${per((w) => w.metrics.citizenDeaths)} · moradores que saíram ${per((w) => w.metrics.citizensLeft)}`,
);
const finalPop = mean(all.map((w) => w.town.population));
const ruined = mean(all.map((w) => Object.values(w.town.buildings).filter((lvl) => lvl === 0).length));
const mood = mean(all.map((w) => (w.citizens.length ? w.citizens.reduce((s, c) => s + c.happiness, 0) / w.citizens.length : 60)));
console.log(`  população final ${fmt(finalPop, 0)} · humor médio ${fmt(mood, 0)} · prédios em ruína no fim ${fmt(ruined, 1)}`);

console.log('\n── Confiança ao descer × desfecho (calibra a escolha de andar) ──');
const buckets = new Map<string, { n: number; deaths: number; wipes: number; conquests: number }>();
for (const w of all) {
  for (const [k, v] of Object.entries(w.metrics.byConfidence)) {
    const b = buckets.get(k) ?? { n: 0, deaths: 0, wipes: 0, conquests: 0 };
    b.n += v.n;
    b.deaths += v.deaths;
    b.wipes += v.wipes;
    b.conquests += v.conquests;
    buckets.set(k, b);
  }
}
for (const [k, b] of [...buckets.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  ≥${k}: ${String(b.n).padStart(5)} exp · mortes/exp ${fmt(b.deaths / b.n, 2)} · massacres ${pct(b.wipes / b.n)} · conquistas ${pct(b.conquests / b.n)}`);
}

console.log('\n── Ano a ano (média das sementes) ──');
console.log('  ano | andar mais fundo | tesouro | ouro heróis | elenco | nv médio | população | corrupção ato atual');
for (let y = 1; y <= years; y++) {
  const idx = y * DAYS_PER_YEAR - 1;
  const samples = all.map((w) => w.metrics.daily[idx]).filter((s) => s !== undefined);
  if (samples.length === 0) continue;
  const corr = samples.map((s) => s.corruption[Math.min(Math.floor(s.deepest / 4), s.corruption.length - 1)] ?? 0);
  console.log(
    `  ${String(y).padStart(3)} | ${fmt(mean(samples.map((s) => s.deepest))).padStart(16)} | ${fmt(mean(samples.map((s) => s.treasury)), 0).padStart(7)} | ${fmt(mean(samples.map((s) => s.heroGold)), 0).padStart(11)} | ${fmt(mean(samples.map((s) => s.roster))).padStart(6)} | ${fmt(mean(samples.map((s) => s.avgLevel))).padStart(8)} | ${fmt(mean(samples.map((s) => s.population)), 0).padStart(9)} | ${fmt(mean(corr), 0)}`,
  );
}

// ── Saúde (critérios do M0) ───────────────────────────────────────────────
const stalemates = sum((w) => w.metrics.stalemates);
const idleMax = Math.max(...all.map((w) => w.metrics.longestIdleStreak));
const emptyTown = all.filter((w) => w.metrics.daily.some((d, i) => i > 30 && d.roster === 0)).length;
console.log('\n── Saúde ──');
console.log(`  ${stalemates === 0 ? '✔' : '✘'} sem impasses de combate (${stalemates})`);
console.log(`  ${idleMax <= 4 ? '✔' : '✘'} sem ócio prolongado: maior sequência de dias sem expedição = ${idleMax}`);
console.log(`  ${emptyTown === 0 ? '✔' : '✘'} vila nunca fica sem heróis depois do 1º mês (${emptyTown} sementes)`);

// Critérios do M4 (playtest amplo): ritmo, mortalidade e o ouro do fim de jogo.
const deathsPerYear = sum((w) => w.metrics.deaths) / all.length / years;
const lastBoss = all.map((w) => w.metrics.bossKills.find((b) => b.act === ACT_COUNT - 1)?.day).map((d) => (d === undefined ? null : yearOfDay(d)));
const lastBossYears = lastBoss.filter((y): y is number => y !== null);
const lastBossReach = lastBossYears.length / all.length;
const lastBossMean = mean(lastBossYears);
const heroGold = all.map((w) => w.metrics.daily[w.metrics.daily.length - 1]!.heroGold);
const goldMean = mean(heroGold);
const treasuryMax = Math.max(...all.map((w) => w.metrics.daily[w.metrics.daily.length - 1]!.treasury));
console.log(`  ${deathsPerYear >= 3 && deathsPerYear <= 6 ? '✔' : '✘'} mortalidade entre 3 e 6 por ano (${fmt(deathsPerYear)})`);
if (years >= 22) {
  // A dispersão entre sementes é grande desde antes do M4 (o prefeito automático erra); o que
  // se cobra é que quase todas cheguem lá e que a média fique na janela.
  const ok = lastBossReach >= 0.8 && lastBossMean >= 14 && lastBossMean <= 22;
  console.log(
    `  ${ok ? '✔' : '✘'} último chefe cai em pelo menos 80% das sementes, com média entre os anos 14 e 22 (${pct(lastBossReach)} · média ${fmt(lastBossMean)} · ${fmt(Math.min(...lastBossYears))}–${fmt(Math.max(...lastBossYears))})`,
  );
}
console.log(
  `  ${goldMean >= 15000 && goldMean <= 40000 ? '✔' : '✘'} ouro dos heróis no fim entre 15 e 40 mil (média ${fmt(goldMean / 1000)} mil · ${fmt(Math.min(...heroGold) / 1000)}–${fmt(Math.max(...heroGold) / 1000)} mil)`,
);
console.log(`  ${treasuryMax <= 20000 ? '✔' : '✘'} tesouro sem estourar no fim (máximo ${fmt(treasuryMax / 1000)} mil)`);
if (checkSaves) console.log(`  ${saveFailures === 0 ? '✔' : '✘'} salvar e carregar volta idêntico (${saveChecks - saveFailures}/${saveChecks})`);
console.log(`  tempo médio por campanha: ${fmt(mean(runs.map((r) => r.ms)), 0)} ms\n`);

if (args.json) {
  mkdirSync('reports', { recursive: true });
  const file = `reports/balance-${seeds}x${years}.json`;
  writeFileSync(file, JSON.stringify(runs.map((r) => ({ seed: r.seed, metrics: r.world.metrics })), null, 1));
  console.log(`Relatório completo em ${file}\n`);
}
