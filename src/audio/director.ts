// Decide o que soa: traduz eventos da sessão em efeitos (com prioridade e intervalo
// mínimo) e lê o clima do mundo para a música e o ambiente. Puro: testável no Node.

import { commands, hourOf, isNight, TICKS_PER_DAY } from '../sim/index.ts';
import type { ChronicleKind, World } from '../sim/index.ts';
import type { SessionEvent } from '../game/session.ts';
import type { SfxName } from './sfx.ts';

export interface Cue {
  sfx: SfxName;
  priority: number;
}

const ENTRY_CUES: Partial<Record<ChronicleKind, Cue>> = {
  chegada: { sfx: 'arrival', priority: 2 },
  partida: { sfx: 'depart', priority: 2 },
  retorno: { sfx: 'return', priority: 3 },
  morte: { sfx: 'death', priority: 9 },
  fuga: { sfx: 'flee', priority: 5 },
  vinganca: { sfx: 'vengeance', priority: 7 },
  luto: { sfx: 'grief', priority: 4 },
  tumulo: { sfx: 'grief', priority: 4 },
  restos: { sfx: 'grief', priority: 5 },
  conquista: { sfx: 'conquest', priority: 6 },
  chefe: { sfx: 'boss', priority: 10 },
  fim: { sfx: 'finale', priority: 11 },
  eco: { sfx: 'echo', priority: 8 },
  promocao: { sfx: 'promotion', priority: 6 },
  nivel: { sfx: 'level', priority: 3 },
  construcao: { sfx: 'build', priority: 6 },
  contrato: { sfx: 'contract', priority: 3 },
  corrupcao: { sfx: 'corruption', priority: 6 },
  vinculo: { sfx: 'bond', priority: 2 },
  traco: { sfx: 'reveal', priority: 2 },
  resgate: { sfx: 'rescue', priority: 5 },
  partiuDaVila: { sfx: 'leave', priority: 3 },
  dispensa: { sfx: 'leave', priority: 3 },
  aposentadoria: { sfx: 'bond', priority: 3 },
  lesao: { sfx: 'wound', priority: 6 },
  cicatriz: { sfx: 'grief', priority: 4 },
  casamento: { sfx: 'wedding', priority: 7 },
  nascimento: { sfx: 'birth', priority: 7 },
  maioridade: { sfx: 'conquest', priority: 7 },
  funcao: { sfx: 'reveal', priority: 2 },
  cidadao: { sfx: 'arrival', priority: 2 },
  incursao: { sfx: 'bell', priority: 9 },
  // 'prefeito' fica de fora: as ações do prefeito já soam na hora do comando.
  // 'berrante' fica de fora: o som sai na hora do comando, não quando a crônica registra.
};

/** Resposta imediata às alavancas do prefeito (comparadas por identidade: nomes somem no build). */
const COMMAND_CUES = new Map<unknown, SfxName>([
  [commands.blowHorn, 'horn'],
  [commands.build, 'build'],
  [commands.postContract, 'contract'],
  [commands.cancelContract, 'click'],
  [commands.recall, 'bell'],
  [commands.setDoctrine, 'click'],
  [commands.setLootTax, 'click'],
  [commands.sponsor, 'coins'],
  [commands.dismiss, 'leave'],
  [commands.talk, 'bond'],
  [commands.gift, 'coins'],
  [commands.comfort, 'grief'],
  [commands.speech, 'speech'],
  [commands.rename, 'click'],
  [commands.retire, 'bond'],
  [commands.assignRole, 'click'],
]);

export function cuesFor(event: SessionEvent): Cue[] {
  switch (event.type) {
    case 'entries':
      return event.entries.flatMap((e) => {
        const cue = ENTRY_CUES[e.kind];
        return cue ? [cue] : [];
      });
    case 'expedition':
      return event.summary.gold > 0 && event.summary.outcome !== 'massacre' ? [{ sfx: 'coins', priority: 3 }] : [];
    case 'command': {
      if (!event.ok) return [{ sfx: 'deny', priority: 8 }];
      const sfx = COMMAND_CUES.get(event.command);
      return sfx ? [{ sfx, priority: 8 }] : [];
    }
    default:
      return [];
  }
}

/** Intervalo mínimo entre duas vezes o mesmo efeito (ms). Em 4× a crônica dispara muito. */
export const COOLDOWN_MS: Partial<Record<SfxName, number>> = {
  arrival: 500,
  depart: 700,
  return: 600,
  coins: 250,
  build: 1200,
  contract: 900,
  bond: 2000,
  reveal: 2000,
  level: 900,
  grief: 2500,
  death: 2500,
  conquest: 1500,
  click: 40,
  wound: 1500,
  wedding: 3000,
  birth: 3000,
};

const DEFAULT_COOLDOWN = 400;
/** Atraso entre efeitos do mesmo lote, para não soarem empilhados (s). */
export const STAGGER_S = 0.35;

export interface Planned {
  sfx: SfxName;
  delay: number;
}

export class CuePlanner {
  private last = new Map<SfxName, number>();
  private readonly maxPerBatch: number;

  constructor(maxPerBatch = 3) {
    this.maxPerBatch = maxPerBatch;
  }

  /** Escolhe o que tocar agora: maior prioridade primeiro, sem repetir e respeitando o intervalo. */
  plan(cues: Cue[], nowMs: number): Planned[] {
    const out: Planned[] = [];
    const seen = new Set<SfxName>();
    for (const cue of [...cues].sort((a, b) => b.priority - a.priority)) {
      if (out.length >= this.maxPerBatch) break;
      if (seen.has(cue.sfx)) continue;
      seen.add(cue.sfx);
      const last = this.last.get(cue.sfx);
      if (last !== undefined && nowMs - last < (COOLDOWN_MS[cue.sfx] ?? DEFAULT_COOLDOWN)) continue;
      this.last.set(cue.sfx, nowMs);
      out.push({ sfx: cue.sfx, delay: out.length * STAGGER_S });
    }
    return out;
  }
}

// ── Clima ───────────────────────────────────────────────────────────────────

export type MusicMode = 'dia' | 'noite' | 'luto' | 'tensao' | 'alvorada' | 'masmorra';

/** Onde o ouvido está: na vila ou dentro do abismo (acompanhando um grupo). */
export type Scene = 'vila' | 'masmorra';

export interface Mood {
  mode: MusicMode;
  night: boolean;
  hour: number;
  /** Corrupção do ato mais corrompido, de 0 a 1. */
  corruption: number;
  /** Grupos lutando agora no abismo. */
  fighting: number;
  scene?: Scene;
}

/** Quanto tempo a música fica de luto depois de uma morte. */
export const MOURNING_TICKS = 2 * TICKS_PER_DAY;

export function moodOf(world: World): Mood {
  const night = isNight(world.tick);
  const corruption = world.acts.reduce((max, a) => (a.unlocked ? Math.max(max, a.corruption) : max), 0) / 100;
  const fighting = world.parties.filter((p) => p.phase === 'combate').length;
  const bossFight = world.parties.some((p) => p.combat?.isBoss);
  const lastDeath = world.chronicle.findLast((e) => e.kind === 'morte');
  const mourning = !!lastDeath && world.tick - lastDeath.tick < MOURNING_TICKS;
  const mode: MusicMode =
    world.endedTick !== null ? 'alvorada' : bossFight ? 'tensao' : mourning ? 'luto' : night ? 'noite' : 'dia';
  return { mode, night, hour: hourOf(world.tick), corruption, fighting };
}

/**
 * O clima de quem está acompanhando a dungeon: a vila some e entra o abismo, com a
 * música da masmorra (ou a de tensão numa luta de chefe à vista).
 */
export function dungeonMood(world: World, partyIds: number[]): Mood {
  const base = moodOf(world);
  const watched = world.parties.filter((p) => partyIds.includes(p.id));
  const boss = watched.some((p) => p.combat?.isBoss);
  return { ...base, mode: boss ? 'tensao' : 'masmorra', scene: 'masmorra', fighting: 0 };
}

/** Na dungeon, só passam os avisos que importam lá embaixo; os da vila esperam. */
const DUNGEON_SFX = new Set<SfxName>(['death', 'flee', 'vengeance', 'boss', 'conquest', 'finale', 'echo', 'level', 'promotion', 'wound', 'rescue', 'return', 'coins', 'bell', 'deny', 'click', 'grief']);

export const cuesInScene = (cues: Cue[], scene: Scene): Cue[] => (scene === 'vila' ? cues : cues.filter((c) => DUNGEON_SFX.has(c.sfx)));
