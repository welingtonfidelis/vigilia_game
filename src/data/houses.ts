// Casas das famílias de heróis (M6 F5): os sobrenomes que a vila sorteia, as cores e os
// símbolos do brasão e os feitos que uma casa pode juntar. Os efeitos ficam em src/sim/houses.ts.

import type { HouseDeedId } from '../sim/types.ts';

/** Sobrenomes de casa: palavras da vila, da pedra e do ofício, sem nobreza de fora. */
export const HOUSE_SURNAMES: string[] = [
  'Valente',
  'Candeia',
  'Berrante',
  'Bigorna',
  'Ferrolho',
  'Freixo',
  'Carvalho',
  'Urzal',
  'Rochedo',
  'Penhasco',
  'Pedralva',
  'Fontenegra',
  'Torrealta',
  'Vaufundo',
  'Breu',
  'Cardo',
  'Pavio',
  'Malho',
  'Estribo',
  'Ameia',
  'Barbacã',
  'Sentinela',
  'Lamparina',
  'Corvelo',
  'Lobato',
  'Raposo',
  'Teixo',
  'Azinhal',
  'Cinzento',
  'Ventura',
  'Fogaça',
  'Grota',
  'Ravina',
  'Guarita',
  'Muralha',
  'Ponteira',
  'Brasido',
  'Sineiro',
  'Velado',
  'Penedo',
  'Lajeado',
  'Seixal',
  'Junco',
  'Espinheiro',
  'Tojal',
  'Alvorada',
  'Serrado',
  'Moinho',
];

/** Cor do campo do brasão: as tinturas escuras e os dois metais. */
export const CREST_TINCTURES: { name: string; color: string; metal: boolean }[] = [
  { name: 'rubro', color: '#8f2f2a', metal: false },
  { name: 'azul', color: '#2f4f86', metal: false },
  { name: 'verde', color: '#2f6a43', metal: false },
  { name: 'negro', color: '#24201c', metal: false },
  { name: 'púrpura', color: '#5d3a78', metal: false },
  { name: 'ocre', color: '#8a5a24', metal: false },
  { name: 'ouro', color: '#d8a842', metal: true },
  { name: 'prata', color: '#c9c6bd', metal: true },
];

/** Símbolos do brasão (o desenho fica em src/ui/Crest.tsx). */
export const CREST_SYMBOLS: string[] = ['torre', 'chave', 'lua', 'sol', 'estrela', 'espada', 'martelo', 'vela', 'olho', 'árvore', 'coroa', 'corvo'];

export const HOUSE_DEEDS: Record<HouseDeedId, { name: string; text: string }> = {
  tresGeracoes: { name: 'Três gerações no abismo', text: 'Avós, filhos e netos da casa desceram ao abismo.' },
  senhorPorGeracao: { name: 'Um Senhor por geração', text: 'Cada geração da casa esteve no grupo que derrotou um Senhor.' },
  vinteAnos: { name: 'Vinte anos sem baixas', text: 'Vinte anos sem enterrar ninguém da casa.' },
};
