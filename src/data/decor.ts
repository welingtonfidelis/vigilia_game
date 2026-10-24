// Cosmética da vila (M6 F6): o catálogo de enfeites, o que libera cada um e os nomes de
// sempre das ruas. Os efeitos ficam em src/sim/cosmetics.ts; a arte, no pack (id `art`).

import type { DecorId, StreetId } from '../sim/types.ts';

/** O que libera um enfeite: os feitos da vila, nunca o ouro. */
export type DecorUnlock =
  | { kind: 'livre' }
  | { kind: 'lendas'; n: number }
  | { kind: 'torneios'; n: number }
  | { kind: 'feitoCasa' }
  | { kind: 'nemesis' }
  | { kind: 'senhor' }
  | { kind: 'pagina'; biome: number };

export interface DecorDef {
  id: DecorId;
  name: string;
  /** Ouro simbólico (até 50). */
  cost: number;
  unlock: DecorUnlock;
  /** Id da arte no pack. */
  art: string;
  /** Acende à noite (o lampião). */
  light?: boolean;
}

export const DECOR: DecorDef[] = [
  { id: 'banco', name: 'Banco', cost: 0, unlock: { kind: 'livre' }, art: 'prop/bench' },
  { id: 'lampiao', name: 'Lampião', cost: 0, unlock: { kind: 'livre' }, art: 'prop/lamp', light: true },
  { id: 'canteiro', name: 'Canteiro de flores', cost: 10, unlock: { kind: 'livre' }, art: 'prop/enfeite/canteiro' },
  { id: 'poco', name: 'Poço', cost: 40, unlock: { kind: 'lendas', n: 3 }, art: 'prop/well' },
  { id: 'bandeirola', name: 'Bandeirola nas cores da vila', cost: 20, unlock: { kind: 'torneios', n: 1 }, art: 'prop/enfeite/bandeirola' },
  { id: 'arco', name: 'Arco de flores', cost: 30, unlock: { kind: 'feitoCasa' }, art: 'prop/enfeite/arco' },
  { id: 'trofeuNemesis', name: 'Troféu de nêmesis', cost: 0, unlock: { kind: 'nemesis' }, art: 'prop/enfeite/trofeu-nemesis' },
  { id: 'taca', name: 'Taça do torneio', cost: 25, unlock: { kind: 'torneios', n: 5 }, art: 'prop/enfeite/taca' },
  { id: 'estandarteSenhor', name: 'Estandarte de Senhor', cost: 0, unlock: { kind: 'senhor' }, art: 'prop/enfeite/estandarte-senhor' },
  { id: 'urna', name: 'Urna das Catacumbas', cost: 0, unlock: { kind: 'pagina', biome: 0 }, art: 'prop/enfeite/urna' },
  { id: 'vagonete', name: 'Vagonete das Minas', cost: 0, unlock: { kind: 'pagina', biome: 1 }, art: 'prop/enfeite/vagonete' },
  { id: 'cogumelo', name: 'Cogumelo do Jardim', cost: 0, unlock: { kind: 'pagina', biome: 2 }, art: 'prop/enfeite/cogumelo' },
  { id: 'sino', name: 'Sino da Cidade Afogada', cost: 0, unlock: { kind: 'pagina', biome: 3 }, art: 'prop/enfeite/sino' },
  { id: 'bigorna', name: 'Bigorna da Forja', cost: 0, unlock: { kind: 'pagina', biome: 4 }, art: 'prop/enfeite/bigorna' },
  { id: 'cristal', name: 'Cristal do Coração', cost: 0, unlock: { kind: 'pagina', biome: 5 }, art: 'prop/enfeite/cristal' },
  { id: 'favo', name: 'Favo da Colmeia', cost: 0, unlock: { kind: 'pagina', biome: 6 }, art: 'prop/enfeite/favo' },
  { id: 'concha', name: 'Concha da Fossa', cost: 0, unlock: { kind: 'pagina', biome: 7 }, art: 'prop/enfeite/concha' },
  { id: 'engrenagem', name: 'Engrenagem da Cidadela', cost: 0, unlock: { kind: 'pagina', biome: 8 }, art: 'prop/enfeite/engrenagem' },
  { id: 'cranio', name: 'Crânio do Deserto', cost: 0, unlock: { kind: 'pagina', biome: 9 }, art: 'prop/enfeite/cranio' },
];

export const DECOR_BY_ID = new Map<DecorId, DecorDef>(DECOR.map((d) => [d.id, d]));

/** Quantos pontos de enfeite a vila tem (as posições ficam em src/render/layout.ts). */
export const DECOR_POINTS = 12;

export const STREETS: { id: StreetId; name: string; what: string }[] = [
  { id: 'praca', name: 'Praça da Fogueira', what: 'A praça' },
  { id: 'estradaCima', name: 'Estrada de Cima', what: 'A estrada do templo, da taverna e da guilda' },
  { id: 'estradaBaixo', name: 'Estrada de Baixo', what: 'A estrada da estalagem, da casa de cura, do campo e do ferreiro' },
  { id: 'ruaPortao', name: 'Rua do Portão', what: 'A rua que desce do portão até a estrada de cima' },
  { id: 'ruaTermas', name: 'Rua das Termas', what: 'A rua que desce da praça até a fonte termal' },
];
