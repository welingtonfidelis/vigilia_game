// Calibra os Senhores (M5 F5): em cada nível, grupos sintéticos de 5 (rank A, com tanque e
// curandeiro) com nível e equipamento variando descem ao covil pela expedição de verdade.
// Ajusta uma logística da vitória pela confiança e sugere, para src/data/lords.ts:
// - threat: deixa a confiança 1 perto de metade de chance (contra o grupo sintético);
// - power: põe em ~1,15 o grupo que vence o guardião mais fundo do nível com 1,5.
// Grupos reais (itens com afixos, traços, provisões) vencem mais que os sintéticos: a escala
// `lordConfidenceScale` do config acerta a diferença e foi medida à parte (seção 15.5 do doc).
// Uso: npm run lords -- [--trials 5] [--levels 1,2,3] [--set chave=valor,...]
import { commands, createWorld, heroStats, lordConfidence, maxLevel, runTicks, TICKS_PER_DAY } from '../src/sim/index.ts';
import type { ClassId, World } from '../src/sim/index.ts';
import { BALANCE } from '../src/sim/config.ts';
import { createHero } from '../src/sim/hero.ts';
import { commonItem, equip } from '../src/sim/items.ts';
import { availableBiomes, confidence, levelTier, passageFloors } from '../src/sim/dungeon.ts';
import { seedRng } from '../src/sim/rng.ts';
import { lordOf } from '../src/data/lords.ts';
import { parseArgs, num } from './args.ts';

const args = parseArgs(process.argv.slice(2));
// A varredura mede contra o grupo sintético, sem a escala dos grupos reais.
(BALANCE as Record<string, unknown>).lordConfidenceScale = 1;
for (const kv of (typeof args.set === 'string' ? args.set : '').split(',').filter(Boolean)) {
  const [key, value] = kv.split('=');
  if (!key || !(key in BALANCE)) throw new Error(`--set: chave desconhecida ${key}`);
  (BALANCE as Record<string, unknown>)[key] = Number(value);
}
const levels = (typeof args.levels === 'string' ? args.levels : '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
const trials = num(args.trials, 5);
const CLASSES: ClassId[] = ['guardiao', 'clerigo', 'arqueiro', 'piromante', 'guardiao'];

function party(world: World, level: number, levelFrac: number, gearEdge: number): number[] {
  world.abyss.level = level;
  world.town.buildings.guilda = 3;
  return CLASSES.map((classId) => {
    const h = createHero(world);
    h.classId = classId;
    h.rank = 'A';
    h.level = Math.max(1, Math.round(maxLevel(world, h) * levelFrac));
    h.status = 'town';
    h.activity = null;
    h.injury = null;
    h.traits = [{ id: 'bravo', revealed: true }];
    h.morale = 90;
    const tier = Math.max(0, levelTier(level) + gearEdge);
    equip(world, h, commonItem(world, 'weapon', tier, 'teste'));
    equip(world, h, commonItem(world, 'armor', tier, 'teste'));
    h.hp = heroStats(world, h).maxHp;
    return h.id;
  });
}

const FRACS = [0.08, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1];
const EDGES = [-6, -3, 0, 3, 6, 9, 13, 18];
const results: { level: number; conf: number; win: boolean }[] = [];
for (const level of levels) {
  for (const frac of FRACS) {
    for (const edge of EDGES) {
      for (let t = 0; t < trials; t++) {
        const world = createWorld(500 + level * 31 + t);
        const ids = party(world, level, frac, edge);
        world.abyss.amulet = { level, readyTick: 0, inUse: false };
        world.rng = seedRng(9000 + level * 101 + t * 7 + Math.round(frac * 100) + edge);
        const heroes = ids.map((id) => world.heroes.find((h) => h.id === id)!);
        const conf = lordConfidence(world, heroes, level);
        const kills = world.metrics.bossKills.length;
        const fails = world.metrics.lordFailures;
        if (!commands.challengeLord(world, ids).ok) continue;
        for (let d = 0; d < 20 && world.metrics.bossKills.length === kills && world.metrics.lordFailures === fails; d++) runTicks(world, TICKS_PER_DAY);
        if (world.metrics.bossKills.length === kills && world.metrics.lordFailures === fails) continue;
        results.push({ level, conf, win: world.metrics.bossKills.length > kills });
      }
    }
  }
}

function fit(rs: { conf: number; win: boolean }[]): { c50: number; k: number } {
  let a = 0;
  let k = 3;
  for (let it = 0; it < 6000; it++) {
    let ga = 0;
    let gk = 0;
    for (const r of rs) {
      const x = Math.log(Math.max(r.conf, 0.01));
      const p = 1 / (1 + Math.exp(-k * (x - a)));
      const e = (r.win ? 1 : 0) - p;
      ga += -k * e;
      gk += (x - a) * e;
    }
    a += (0.05 * ga) / rs.length;
    k = Math.max(0.5, Math.min(30, k + (0.05 * gk) / rs.length));
  }
  return { c50: Math.exp(a), k };
}
const tune: string[] = [];
for (const level of levels) {
  const rs = results.filter((r) => r.level === level);
  const f = fit(rs);
  // Referência: o grupo do grid que vence o guardião mais fundo do nível com confiança perto de 1,5.
  let best: { g: number; lord: number } | null = null;
  for (const frac of FRACS) {
    for (const edge of EDGES) {
      const kw = createWorld(77 + level);
      const team = party(kw, level, frac, edge).map((id) => kw.heroes.find((h) => h.id === id)!);
      const biomes = availableBiomes(level);
      const g = biomes.reduce((sum, biome) => sum + confidence(kw, team, { passageId: -1, level, biome, rules: [], floor: passageFloors(level) - 1 }), 0) / biomes.length;
      if (!best || Math.abs(Math.log(g / 1.5)) < Math.abs(Math.log(best.g / 1.5))) best = { g, lord: lordConfidence(kw, team, level) };
    }
  }
  const lord = lordOf(level);
  const threat = lord.threat * f.c50;
  const refHonest = best!.lord / f.c50;
  const power = lord.power * (refHonest / 1.15);
  const keptConf = best!.lord;
  const keptHonest = refHonest;
  tune.push(`L${level}: power ${power.toFixed(2)}, threat ${threat.toFixed(2)} (guardião ${best!.g.toFixed(2)}: Senhor ${keptConf.toFixed(2)} → honesta ${keptHonest.toFixed(2)})`);
  const band = (lo: number, hi: number) => {
    const b = rs.filter((r) => r.conf >= lo && r.conf < hi);
    return b.length ? `${Math.round((100 * b.filter((r) => r.win).length) / b.length)}%/${b.length}` : '—';
  };
  console.log(
    `L${String(level).padEnd(2)} metade em ${f.c50.toFixed(2)} (k ${f.k.toFixed(1)}) · conf ${Math.min(...rs.map((r) => r.conf)).toFixed(2)}–${Math.max(...rs.map((r) => r.conf)).toFixed(2)} · <0,8 ${band(0, 0.8)} · 0,8–1,1 ${band(0.8, 1.1)} · 1,1–1,4 ${band(1.1, 1.4)} · ≥1,4 ${band(1.4, 99)}`,
  );
}

console.log(tune.join('\n'));
