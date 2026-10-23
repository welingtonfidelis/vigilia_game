// Senhores do abismo (M5 F2): o chefe de cada nível, enfrentado com o amuleto daquele
// nível. Do 1 ao 5, os Senhores dos biomas de sempre; do 6 ao 9, os das dimensões fundas
// (M5 F6); o 10 é Aquilo que Vigia, o chefe máximo. No pós-jogo os dez voltam em ciclo, mais
// fortes.

import { BIOMES, type BossDef } from './biomes.ts';

export interface LordDef extends BossDef {
  /** Nível do abismo deste Senhor (o do amuleto). */
  level: number;
  /** Bioma do covil (cenário, guardas e a arte do Senhor). */
  biome: number;
  /** O chefe máximo: vencê-lo fecha a campanha. */
  final: boolean;
  /** Força da luta (vida e ataque), acertada para um grupo que domina o nível ter ~80% (M5 F5). */
  power: number;
  /** O peso da mecânica dele além dos números: a confiança da guilda divide por isto. */
  threat: number;
}

/** Quantos níveis até o chefe máximo; depois o ciclo recomeça. */
export const LORD_LEVELS = 10;

/**
 * `power` e `threat` saem da varredura do balanceador (grupos sintéticos contra cada Senhor,
 * seção 15.5 do doc): `threat` deixa a confiança 1 perto de metade de chance, e `power` põe o
 * grupo que domina o nível (rank A no teto, equipamento do nível) em ~80%.
 */
const BASE: { biome: number; power: number; threat: number }[] = [
  { biome: 0, power: 1.73, threat: 0.63 },
  { biome: 1, power: 2.21, threat: 0.55 },
  { biome: 2, power: 2.29, threat: 0.63 },
  { biome: 3, power: 1.9, threat: 0.53 },
  { biome: 4, power: 1.34, threat: 0.63 },
  { biome: 6, power: 1.1, threat: 0.66 },
  { biome: 7, power: 1.17, threat: 0.64 },
  { biome: 8, power: 0.69, threat: 0.86 },
  { biome: 9, power: 1.45, threat: 0.51 },
  { biome: 5, power: 1.36, threat: 0.66 },
];

/** O Senhor do nível (no pós-jogo, o do ciclo, com o número do retorno no nome). */
export function lordOf(level: number): LordDef {
  const n = Math.max(1, Math.round(level));
  const i = (n - 1) % LORD_LEVELS;
  const cycle = Math.floor((n - 1) / LORD_LEVELS);
  const base = BASE[i]!;
  const boss = BIOMES[base.biome]!.boss;
  const name = boss.name;
  return {
    ...boss,
    name: cycle > 0 ? `${name} (${cycle}º retorno)` : name,
    level: n,
    biome: base.biome,
    final: i === LORD_LEVELS - 1,
    power: base.power,
    threat: base.threat,
  };
}
