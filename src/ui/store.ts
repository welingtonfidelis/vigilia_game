// Estado da tela (não vai no save): painel aberto, avisos, interação próxima e preferências.
// A cena Phaser escreve aqui; a UI em Preact lê e redesenha.

import type { BuildingId, World } from '../sim/index.ts';
import { DEFAULT_PREFS, type Prefs } from '../game/storage.ts';

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
  | { kind: 'campaignEnd' };

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
  'menu',
]);

export type Tone = 'info' | 'good' | 'gold' | 'bad' | 'grief' | 'warn';

export interface Toast {
  id: number;
  text: string;
  tone: Tone;
  heroIds: number[];
  at: number;
}

export interface Prompt {
  id: string;
  label: string;
}

type Listener = () => void;

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
  private nextToast = 1;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  open(panel: Panel): void {
    const current = this.panel;
    const fromList = current && current.kind !== 'hero' && panel.kind === 'hero';
    this.back = fromList ? current : panel.kind === 'hero' ? this.back : null;
    this.panel = panel;
    this.changed();
  }

  close(): void {
    this.panel = null;
    this.back = null;
    this.changed();
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

  toast(text: string, tone: Tone = 'info', heroIds: number[] = []): void {
    this.toasts = [{ id: this.nextToast++, text, tone, heroIds, at: Date.now() }, ...this.toasts].slice(0, 3);
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
