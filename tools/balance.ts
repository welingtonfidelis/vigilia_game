// Balanceador headless: roda várias campanhas com o prefeito automático e resume
// ritmo, mortalidade e economia. Uso: npm run balance -- --seeds 20 --years 10 [--json] [--saves]
// [--difficulty facil|normal|dificil] [--set chave=valor,...]
// Com --saves (o playtest automático: npm run playtest), a cada 5 anos salva e carrega o
// mundo e segue jogando com o carregado; o save tem que voltar idêntico.
// Com --level-every N (atalho de teste do M5 F1, antes dos amuletos), o nível do abismo
// sobe 1 a cada N anos, para olhar o gerador e as curvas nos níveis altos.

import { mkdirSync, writeFileSync } from 'node:fs';
import { abyssPressure, autoMayor, checksum, createWorld, deserialize, runDays, serialize, DAYS_PER_YEAR, TICKS_PER_DAY, TICKS_PER_SECOND } from '../src/sim/index.ts';
import type { Difficulty, World } from '../src/sim/index.ts';
import { BALANCE } from '../src/sim/config.ts';
import { parseArgs, num } from './args.ts';

const args = parseArgs(process.argv.slice(2));
const seeds = num(args.seeds, 12);
const years = num(args.years, 10);
const firstSeed = num(args.from, 1);
const checkSaves = !!args.saves;
const difficulty = (typeof args.difficulty === 'string' ? args.difficulty : 'normal') as Difficulty;
const levelEvery = num(args['level-every'], 0);
// --set chave=valor,chave=valor muda o BALANCE só nesta rodada (para testar ajustes).
for (const kv of (typeof args.set === 'string' ? args.set : '').split(',').filter(Boolean)) {
  const [key, value] = kv.split('=');
  if (!key || !(key in BALANCE)) throw new Error(`--set: chave desconhecida ${key}`);
  (BALANCE as Record<string, unknown>)[key] = Number(value);
}
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
  let world = createWorld(s, difficulty);
  const step = levelEvery > 0 ? Math.min(SAVE_EVERY, levelEvery) : SAVE_EVERY;
  for (let y = 0; y < years; y += step) {
    runDays(world, Math.min(step, years - y) * DAYS_PER_YEAR, { onHour: autoMayor });
    if (levelEvery > 0 && (y + step) % levelEvery === 0) world.abyss.level++;
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
console.log(`\nVigília · balanceamento · ${seeds} sementes × ${years} anos · ${difficulty}\n`);
const header = ['seed', 'nível', 'passagens (abertas/seladas)', 'senhores (ano)', 'mortes/ano', 'recrut', 'saíram', 'elenco', 'nv médio', 'tesouro', 'ouro heróis', 'impasses', 'ócio máx', 'ms'];
console.log(header.join(' | '));
for (const { seed, world, ms } of runs) {
  const m = world.metrics;
  const last = m.daily[m.daily.length - 1]!;
  const bosses = m.bossKills.map((b) => fmt(yearOfDay(b.day))).join(' ') || '—';
  console.log(
    [
      seed,
      world.abyss.level,
      `${m.passagesOpened}/${m.passagesSealed}`,
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
console.log('\n── Ritmo do abismo ──');
const perYear = (f: (w: World) => number) => fmt(all.reduce((s, w) => s + f(w), 0) / all.length / years);
console.log(`  passagens abertas por ano: ${perYear((w) => w.metrics.passagesOpened)} · seladas por ano: ${perYear((w) => w.metrics.passagesSealed)}`);
console.log(`  nível do abismo no fim: ${fmt(mean(all.map((w) => w.abyss.level)))} · pressão no fim: ${fmt(mean(all.map((w) => abyssPressure(w))), 0)}`);
const kills = all.reduce((s, w) => s + w.metrics.bossKills.length, 0);
const fails = all.reduce((s, w) => s + w.metrics.lordFailures, 0);
const pctLost = fails / Math.max(1, kills + fails);
console.log(`  contratos do Senhor: ${kills + fails} · perdidos ${pct(pctLost)} (meta: 20% a 35%)`);
// Ano em que cada nível de Senhor caiu (M5 F2), média · faixa · % das sementes.
const lordLevels = [...new Set(all.flatMap((w) => w.metrics.bossKills.map((b) => b.level)))].sort((a, b) => a - b);
for (const level of lordLevels) {
  const days = all.map((w) => w.metrics.bossKills.find((b) => b.level === level)?.day).filter((d): d is number => d !== undefined);
  const ys = days.map(yearOfDay);
  console.log(
    `  Senhor do nível ${String(level).padEnd(3)} ano ${fmt(mean(ys))} (~${fmt(hoursAt1x(mean(ys)))} h em 1×) · ${fmt(Math.min(...ys))}–${fmt(Math.max(...ys))} · ${pct(days.length / all.length)}`,
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

// M5 F4: vila longa. Nível médio dos prédios nos anos de referência e a parte do que entra
// no tesouro que sai em manutenção diária e consertos.
console.log('\n── Vila longa (M5 F4) ──');
const buildingsAt = (year: number) => {
  const samples = all.map((w) => w.metrics.daily[year * DAYS_PER_YEAR - 1]).filter((s) => s !== undefined);
  return samples.length ? mean(samples.map((s) => s.buildings)) : NaN;
};
// Com o ouro do abismo pela metade (§15.9), a vila fecha o fim de jogo perto do 8, não do 9.
const villageTargets: [number, number][] = [
  [10, 3],
  [40, 6],
  [75, 8],
];
for (const [year, target] of villageTargets) {
  if (year > years) continue;
  const at = buildingsAt(year);
  console.log(`  ${Math.abs(at - target) <= 1 ? '✔' : '✘'} nível médio dos prédios no ano ${year}: ${fmt(at)} (meta ~${target})`);
}
const upkeepShare = sum((w) => w.metrics.maintenance) / Math.max(1, sum((w) => w.metrics.treasuryIn));
console.log(`  ${upkeepShare >= 0.15 && upkeepShare <= 0.3 ? '✔' : '✘'} manutenção e consertos: ${pct(upkeepShare)} do que entrou no tesouro (meta 15% a 30%)`);
console.log(`  consertos por campanha ${per((w) => w.metrics.repairs)} · conservação média no fim ${fmt(mean(all.map((w) => w.metrics.daily.at(-1)!.care)), 0)}`);

console.log('\n── Audiências, desejos e nêmesis (M6) ──');
console.log(`  petições por ano ${perYear((w) => w.metrics.audiences?.asked ?? 0)} · respondidas ${perYear((w) => w.metrics.audiences?.answered ?? 0)} · vencidas ${perYear((w) => w.metrics.audiences?.expired ?? 0)}`);
console.log(`  desejos por campanha ${per((w) => w.metrics.wishes?.made ?? 0)} · cumpridos ${per((w) => w.metrics.wishes?.done ?? 0)} · esquecidos ${per((w) => w.metrics.wishes?.failed ?? 0)}`);
console.log(
  `  nêmesis por campanha ${per((w) => w.metrics.nemeses?.born ?? 0)} · encontros ${per((w) => w.metrics.nemeses?.met ?? 0)} · heróis que levaram ${per((w) => w.metrics.nemeses?.kills ?? 0)} · caídas ${per((w) => w.metrics.nemeses?.fallen ?? 0)}`,
);

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
console.log('  ano | andar mais fundo | tesouro | ouro heróis | elenco | nv médio | população | pressão | prédios | conservação');
for (let y = 1; y <= years; y++) {
  const idx = y * DAYS_PER_YEAR - 1;
  const samples = all.map((w) => w.metrics.daily[idx]).filter((s) => s !== undefined);
  if (samples.length === 0) continue;
  const corr = samples.map((s) => s.pressure);
  console.log(
    `  ${String(y).padStart(3)} | ${fmt(mean(samples.map((s) => s.deepest))).padStart(16)} | ${fmt(mean(samples.map((s) => s.treasury)), 0).padStart(7)} | ${fmt(mean(samples.map((s) => s.heroGold)), 0).padStart(11)} | ${fmt(mean(samples.map((s) => s.roster))).padStart(6)} | ${fmt(mean(samples.map((s) => s.avgLevel))).padStart(8)} | ${fmt(mean(samples.map((s) => s.population)), 0).padStart(9)} | ${fmt(mean(corr), 0).padStart(7)} | ${fmt(mean(samples.map((s) => s.buildings))).padStart(7)} | ${fmt(mean(samples.map((s) => s.care)), 0)}`,
  );
}

// ── Saúde (critérios do M0) ───────────────────────────────────────────────
const stalemates = sum((w) => w.metrics.stalemates);
const idleMax = Math.max(...all.map((w) => w.metrics.longestIdleStreak));
const emptyTown = all.filter((w) => w.metrics.daily.some((d, i) => i > 30 && d.roster === 0)).length;
console.log('\n── Saúde ──');
if (difficulty !== 'normal') console.log('  (fora do Normal, as metas são as faixas de ano dos Senhores; o resto é referência)');
console.log(`  ${stalemates === 0 ? '✔' : '✘'} sem impasses de combate (${stalemates})`);
console.log(`  ${idleMax <= 4 ? '✔' : '✘'} sem ócio prolongado: maior sequência de dias sem expedição = ${idleMax}`);
console.log(`  ${emptyTown === 0 ? '✔' : '✘'} vila nunca fica sem heróis depois do 1º mês (${emptyTown} sementes)`);

// Metas do M5 (seção 11 do doc, ritmo 5×): mortalidade, Senhores e o ouro do fim.
const deathsPerYear = sum((w) => w.metrics.deaths) / all.length / years;
const heroGold = all.map((w) => w.metrics.daily[w.metrics.daily.length - 1]!.heroGold);
const goldMean = mean(heroGold);
const treasuryMax = Math.max(...all.map((w) => w.metrics.daily[w.metrics.daily.length - 1]!.treasury));
console.log(`  ${deathsPerYear >= 3 && deathsPerYear <= 6 ? '✔' : '✘'} mortalidade entre 3 e 6 por ano (${fmt(deathsPerYear)})`);
const sealedPerYear = sum((w) => w.metrics.passagesSealed) / all.length / years;
console.log(`  ${sealedPerYear >= 1 ? '✔' : '✘'} passagens seladas: pelo menos 1 por ano (${fmt(sealedPerYear)})`);
console.log(`  ${pctLost >= 0.2 && pctLost <= 0.35 ? '✔' : '✘'} contratos do Senhor perdidos entre 20% e 35% (${pct(pctLost)})`);
// Faixas de ano por dificuldade: [Senhor do 1, Senhor do 5, chefe máximo (média), parte das sementes].
const PACE: Record<Difficulty, { lord1: [number, number]; lord5: [number, number]; final: [number, number]; share: number }> = {
  facil: { lord1: [3, 6], lord5: [18, 30], final: [45, 65], share: 0.8 },
  normal: { lord1: [4, 7], lord5: [30, 40], final: [70, 90], share: 0.8 },
  dificil: { lord1: [5, 9], lord5: [40, 65], final: [85, 115], share: 2 / 3 },
};
const pace = PACE[difficulty];
const lordYear = (level: number) => {
  const ys = all.map((w) => w.metrics.bossKills.find((b) => b.level === level)?.day).filter((d): d is number => d !== undefined).map(yearOfDay);
  return { mean: mean(ys), share: ys.length / all.length };
};
const inRange = (x: number, [lo, hi]: [number, number]) => x >= lo && x <= hi;
for (const [level, range, label] of [
  [1, pace.lord1, 'Senhor do nível 1'],
  [5, pace.lord5, 'Senhor do nível 5'],
] as const) {
  const y = lordYear(level);
  if (years >= range[1]) console.log(`  ${y.share === 1 && inRange(y.mean, range) ? '✔' : '✘'} ${label} entre os anos ${range[0]} e ${range[1]} (ano ${fmt(y.mean)}, ${pct(y.share)})`);
}
const finalLord = lordYear(10);
if (years >= pace.final[1]) {
  console.log(
    `  ${finalLord.share >= pace.share && inRange(finalLord.mean, pace.final) ? '✔' : '✘'} chefe máximo entre os anos ${pace.final[0]} e ${pace.final[1]}, em ${pct(pace.share)} das sementes (ano ${fmt(finalLord.mean)}, ${pct(finalLord.share)})`,
  );
}
// O ouro do fim só tem meta na campanha inteira (100 anos): heróis entre 50 e 150 mil, tesouro até 60 mil.
if (years >= 90) {
  console.log(
    `  ${goldMean >= 50000 && goldMean <= 150000 ? '✔' : '✘'} ouro dos heróis no fim entre 50 e 150 mil (média ${fmt(goldMean / 1000)} mil · ${fmt(Math.min(...heroGold) / 1000)}–${fmt(Math.max(...heroGold) / 1000)} mil)`,
  );
  console.log(`  ${treasuryMax <= 60000 ? '✔' : '✘'} tesouro sem estourar no fim: até 60 mil (máximo ${fmt(treasuryMax / 1000)} mil)`);
}
if (checkSaves) console.log(`  ${saveFailures === 0 ? '✔' : '✘'} salvar e carregar volta idêntico (${saveChecks - saveFailures}/${saveChecks})`);
console.log(`  tempo médio por campanha: ${fmt(mean(runs.map((r) => r.ms)), 0)} ms\n`);

if (args.json) {
  mkdirSync('reports', { recursive: true });
  const file = `reports/balance-${seeds}x${years}.json`;
  writeFileSync(file, JSON.stringify(runs.map((r) => ({ seed: r.seed, metrics: r.world.metrics })), null, 1));
  console.log(`Relatório completo em ${file}\n`);
}
