// Senhores do abismo (M5 F2): o chefe de cada nível, enfrentado com o amuleto daquele
// nível. Do 1 ao 5, os Senhores dos biomas de sempre; do 6 ao 9, Senhores novos (arte
// própria na F6; até lá, nome novo com a arte e a mecânica de um dos cinco primeiros);
// o 10 é Aquilo que Vigia, o chefe máximo. No pós-jogo os dez voltam em ciclo, mais fortes.

import { BIOMES, type BossDef } from './biomes.ts';

export interface LordDef extends BossDef {
  /** Nível do abismo deste Senhor (o do amuleto). */
  level: number;
  /** Bioma do covil (cenário, guardas e a arte do Senhor). */
  biome: number;
  /** O chefe máximo: vencê-lo fecha a campanha. */
  final: boolean;
  /** Senhor novo ainda com arte emprestada (sai na F6). */
  provisional: boolean;
}

/** Quantos níveis até o chefe máximo; depois o ciclo recomeça. */
export const LORD_LEVELS = 10;

const BASE: { biome: number; name?: string }[] = [
  { biome: 0 },
  { biome: 1 },
  { biome: 2 },
  { biome: 3 },
  { biome: 4 },
  { biome: 2, name: 'A Rainha dos Esporos' },
  { biome: 3, name: 'O Coro Submerso' },
  { biome: 1, name: 'O Colosso de Ferro-negro' },
  { biome: 0, name: 'O Rei dos Ossuários' },
  { biome: 5 },
];

/** O Senhor do nível (no pós-jogo, o do ciclo, com o número do retorno no nome). */
export function lordOf(level: number): LordDef {
  const n = Math.max(1, Math.round(level));
  const i = (n - 1) % LORD_LEVELS;
  const cycle = Math.floor((n - 1) / LORD_LEVELS);
  const base = BASE[i]!;
  const boss = BIOMES[base.biome]!.boss;
  const name = base.name ?? boss.name;
  return {
    ...boss,
    name: cycle > 0 ? `${name} (${cycle}º retorno)` : name,
    level: n,
    biome: base.biome,
    final: i === LORD_LEVELS - 1,
    provisional: base.name !== undefined,
  };
}
