// Estado da tela (não vai no save): painel aberto, avisos, interação próxima e preferências.
// A cena Phaser escreve aqui; a UI em Preact lê e redesenha.

import type { BuildingId, World } from '../sim/index.ts';
import { DEFAULT_PREFS, type Prefs } from '../game/storage.ts';
import type { SfxName } from '../audio/sfx.ts';

export type Panel =
  | { kind: 'hero'; heroId: number }
  | { kind: 'building'; id: BuildingId }
  | { kind: 'horn' }
  | { kind: 'board' }
  | { kind: 'coffer' }
  | { kind: 'dungeon' }
  | { kind: 'chronicle' }
  | { kind: 'roster' }
  | { kind: 'memorial' }
  | { kind: 'menu' }
  /** `oldSave`: havia um save de antes do M5, guardado à parte (a campanha recomeça). */
  | { kind: 'welcome'; oldSave?: boolean }
  | { kind: 'thermal' }
  | { kind: 'event' }
  | { kind: 'battle'; partyId: number }
  | { kind: 'village' }
  | { kind: 'campaignEnd' }
  /** Fragmentos, amuleto e contrato do Senhor (M5). */
  | { kind: 'amulet' }
  /** Um Senhor caiu: o abismo desceu um nível. */
  | { kind: 'lordEnd'; level: number }
  /** O torneio da estação: a chave e os duelos para rever (M6 F4). */
  | { kind: 'tournament' }
  | { kind: 'hall'; tab?: HallTab; houseId?: number }
  | { kind: 'paco'; tab?: PacoTab }
  /** Pedidos da manhã e desejos dos heróis (M6 F1). */
  | { kind: 'audiences' }
  /** A história da vila, para ler (Menu e boas-vindas). */
  | { kind: 'story' };

export type PanelKind = Panel['kind'];

/** Painéis que fecham com um clique fora: os de consulta. Decisões e marcos esperam o botão. */
export const DISMISSIBLE: ReadonlySet<PanelKind> = new Set<PanelKind>([
  'hero',
  'building',
  'horn',
  'board',
  'coffer',
  'thermal',
  'village',
  'dungeon',
  'chronicle',
  'roster',
  'memorial',
  'amulet',
  'audiences',
  'tournament',
  'hall',
  'paco',
  'menu',
]);

/** Abas do Paço do prefeito (M6 F6). */
export type PacoTab = 'audiencias' | 'cargos' | 'estandarte' | 'enfeites' | 'nomes';

/** Abas do Salão das Lendas (M6 F5). */
export type HallTab = 'codex' | 'houses' | 'trophies' | 'statues';

export type Tone = 'info' | 'good' | 'gold' | 'bad' | 'grief' | 'warn';

export interface Toast {
  id: number;
  text: string;
  tone: Tone;
  heroIds: number[];
  at: number;
  /** Chamada (M6 F3/F4): o aviso ganha o botão "Assistir", que abre este painel. */
  watch?: Panel;
}

export interface Prompt {
  id: string;
  label: string;
}

type Listener = () => void;

/** Prólogo animado (§9.7 do doc) na tela: de onde veio e qual cena está passando. */
export interface PrologueState {
  /** 'novo': jogo novo (a boas-vindas abre no fim); 'menu': revisto pelo Menu. */
  from: 'novo' | 'menu';
  /** Para a boas-vindas do fim: havia um save de antes do M5. */
  oldSave?: boolean;
  /** -1: o título, esperando o toque; 0 a 5: a cena que está passando. */
  shot: number;
}

export interface PrologueControl {
  next: () => void;
  skip: () => void;
}

export class UiStore {
  panel: Panel | null = null;
  /** Painel anterior, para "voltar" do herói para a lista de onde ele foi aberto. */
  back: Panel | null = null;
  prompt: Prompt | null = null;
  toasts: Toast[] = [];
  prefs: Prefs = { ...DEFAULT_PREFS };
  rev = 0;
  /** A cena registra aqui como interagir com o que estiver perto do prefeito. */
  interact: (id: string) => void = () => {};
  /** Prólogo animado: o estado (null fora dele), o lançador (ligado pelo main) e o controle (da cena). */
  prologue: PrologueState | null = null;
  launchPrologue: () => void = () => {};
  prologueControl: PrologueControl | null = null;
  /** Efeitos de som para quem não fala com o áudio direto (a cena do prólogo). */
  sfx: (name: SfxName) => void = () => {};
  private nextToast = 1;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  open(panel: Panel): void {
    const current = this.panel;
    // A ficha do herói e a história voltam para o painel de onde foram abertas.
    const fromList = current && current.kind !== panel.kind && (panel.kind === 'hero' || panel.kind === 'story');
    this.back = fromList ? current : panel.kind === 'hero' ? this.back : null;
    this.panel = panel;
    this.changed();
  }

  close(): void {
    this.panel = null;
    this.back = null;
    this.changed();
  }

  /** Abre o prólogo: no jogo novo, com o título esperando o toque; pelo Menu, já começa. */
  playPrologue(from: PrologueState['from'], oldSave?: boolean): void {
    this.panel = null;
    this.back = null;
    this.prologue = { from, oldSave, shot: -1 };
    this.changed();
    if (from === 'menu') this.launchPrologue();
  }

  setPrologue(state: PrologueState | null): void {
    this.prologue = state;
    this.changed();
  }

  /** Fim do prólogo (ou pulado no título): no jogo novo, a boas-vindas abre em seguida. */
  finishPrologue(): void {
    const p = this.prologue;
    this.prologue = null;
    this.prologueControl = null;
    if (p?.from === 'novo') this.open({ kind: 'welcome', oldSave: p.oldSave });
    else this.changed();
  }

  goBack(): void {
    this.panel = this.back;
    this.back = null;
    this.changed();
  }

  setPrompt(prompt: Prompt | null): void {
    if (prompt?.id === this.prompt?.id && prompt?.label === this.prompt?.label) return;
    this.prompt = prompt;
    this.changed();
  }

  toast(text: string, tone: Tone = 'info', heroIds: number[] = [], watch?: Panel): void {
    this.toasts = [{ id: this.nextToast++, text, tone, heroIds, at: Date.now(), ...(watch ? { watch } : {}) }, ...this.toasts].slice(0, 3);
    this.changed();
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.changed();
  }

  setPrefs(patch: Partial<Prefs>): void {
    this.prefs = { ...this.prefs, ...patch };
    this.changed();
  }

  /**
   * Abre (ou fecha) o acompanhamento das dungeons, com o grupo em luta na frente.
   * Sem ninguém lá embaixo, só avisa.
   */
  watch(world: World): void {
    if (this.panel?.kind === 'battle') return this.close();
    const party =
      world.parties.find((p) => p.phase === 'combate') ?? world.parties.find((p) => p.phase !== 'voltando') ?? world.parties[0];
    if (!party) return this.toast('Nenhum grupo no abismo agora.', 'info');
    this.open({ kind: 'battle', partyId: party.id });
  }

  get selectedHeroId(): number | null {
    return this.panel?.kind === 'hero' ? this.panel.heroId : null;
  }

  private changed(): void {
    this.rev++;
    for (const fn of this.listeners) fn();
  }
}
