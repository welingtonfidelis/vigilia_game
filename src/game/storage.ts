// Salvar e carregar no localStorage. Qualquer acesso pode falhar (aba anônima,
// cota cheia, armazenamento bloqueado), então tudo passa por try/catch.

import { deserialize, formatDate, OldSaveError, serialize } from '../sim/index.ts';
import type { World } from '../sim/index.ts';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'vigilia:save';
export const META_KEY = 'vigilia:save:meta';
export const PREFS_KEY = 'vigilia:prefs';
/** Save de antes do M5, guardado para exportar quando a campanha nova começa. */
export const OLD_SAVE_KEY = 'vigilia:save:antigo';
/** Save que não abriu por erro (não por versão): fica guardado aqui antes que a vila nova grave por cima. */
export const BROKEN_SAVE_KEY = 'vigilia:save:quebrado';

export interface SaveMeta {
  savedAt: number;
  tick: number;
  seed: number;
  label: string;
  heroes: number;
}

export type StoreResult = { ok: true } | { ok: false; reason: string };
export type LoadResult = { ok: true; world: World } | { ok: false; reason: string; old?: boolean; broken?: boolean };

export function browserStore(): KeyValueStore | null {
  try {
    const store = globalThis.localStorage;
    return store ?? null;
  } catch {
    return null;
  }
}

const NO_STORE = 'O navegador não deixou salvar (armazenamento bloqueado).';

export function saveWorld(store: KeyValueStore | null, world: World, now = Date.now()): StoreResult {
  if (!store) return { ok: false, reason: NO_STORE };
  const meta: SaveMeta = {
    savedAt: now,
    tick: world.tick,
    seed: world.seed,
    label: formatDate(world.tick),
    heroes: world.heroes.filter((h) => h.status === 'town' || h.status === 'expedition').length,
  };
  try {
    store.setItem(SAVE_KEY, serialize(world));
    store.setItem(META_KEY, JSON.stringify(meta));
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `Não foi possível salvar: ${errorText(err)}` };
  }
}

export function loadWorld(store: KeyValueStore | null): LoadResult {
  if (!store) return { ok: false, reason: NO_STORE };
  try {
    const json = store.getItem(SAVE_KEY);
    if (!json) return { ok: false, reason: 'Não há jogo salvo.' };
    try {
      return { ok: true, world: deserialize(json) };
    } catch (err) {
      if (!(err instanceof OldSaveError)) throw err;
      // Save de antes do abismo das dimensões: fica guardado à parte, e o jogo começa de novo.
      store.setItem(OLD_SAVE_KEY, json);
      store.removeItem(SAVE_KEY);
      store.removeItem(META_KEY);
      return { ok: false, reason: err.message, old: true };
    }
  } catch (err) {
    // Não abriu por erro: o save vai para o lado antes que o salvar sozinho da vila nova grave por cima.
    console.error('O save não abriu', err);
    let kept = false;
    try {
      const json = store.getItem(SAVE_KEY);
      if (json) {
        store.setItem(BROKEN_SAVE_KEY, json);
        kept = true;
      }
    } catch {
      // Sem espaço para a cópia: o aviso conta.
    }
    return { ok: false, reason: `O save não abriu: ${errorText(err)}.${kept ? ' Uma cópia ficou guardada à parte no navegador.' : ''}`, broken: kept };
  }
}

/** O save de antes do M5, se a vila tinha um (para exportar). */
export function readOldSave(store: KeyValueStore | null): string | null {
  try {
    return store?.getItem(OLD_SAVE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function readSaveMeta(store: KeyValueStore | null): SaveMeta | null {
  if (!store) return null;
  try {
    const raw = store.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as SaveMeta) : null;
  } catch {
    return null;
  }
}

export function clearSave(store: KeyValueStore | null): void {
  try {
    store?.removeItem(SAVE_KEY);
    store?.removeItem(META_KEY);
  } catch {
    // Sem armazenamento não há o que apagar.
  }
}

// ── Preferências da tela (não fazem parte do save) ─────────────────────────

export interface Prefs {
  uiScale: number;
  pauseOnDeath: boolean;
  /** Com a aba em segundo plano o jogo segue correndo (o padrão é parar junto com a tela). */
  runInBackground: boolean;
  /** Arte do jogo: 16-bit (pack de sempre) ou 32-bit (o dobro de pixels). */
  art: '16' | '32';
  autosave: boolean;
  muted: boolean;
  /** Volumes de 0 a 1. */
  masterVolume: number;
  musicVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  /** Chamadas do abismo (M6 F3): avisos com "Assistir" quando algo vai acontecer. */
  calls: { guardiao: boolean; senhor: boolean; nemesis: boolean; encontro: boolean; torneio?: boolean };
  /** Modo destaque do Acompanhar: um corredor só, que troca sozinho para onde algo acontece. */
  highlight: boolean;
  /** No celular, o botão flutuante dos painéis fica no canto esquerdo (para canhotos). */
  fabLeft: boolean;
  /** Clima das estações (M6 F6): chuva, neve, folhas e relâmpagos; leve corta pela metade. */
  weather: 'completo' | 'leve' | 'desligado';
}

export const DEFAULT_PREFS: Prefs = {
  uiScale: 1,
  pauseOnDeath: false,
  runInBackground: false,
  // 32-bit desde o fechamento do M6: toda a arte nova tem par 32-bit e o canvas desenha na densidade da tela.
  art: '32',
  autosave: true,
  muted: false,
  masterVolume: 0.8,
  musicVolume: 0.4,
  ambientVolume: 0.5,
  sfxVolume: 0.9,
  calls: { guardiao: true, senhor: true, nemesis: true, encontro: true, torneio: true },
  highlight: false,
  fabLeft: false,
  weather: 'completo',
};

export function loadPrefs(store: KeyValueStore | null): Prefs {
  try {
    const raw = store?.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(store: KeyValueStore | null, prefs: Prefs): void {
  try {
    store?.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preferência perdida não é grave.
  }
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));
