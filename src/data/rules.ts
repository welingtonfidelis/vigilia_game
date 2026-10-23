// Regras especiais das dimensões (M5). Cada passagem sorteia de zero a duas; sem regra
// nenhuma, a dimensão está em Calmaria. Os efeitos ficam na simulação (dungeon, combate
// e expedição); aqui só o nome e a explicação para a tela e a crônica.

import type { DimRuleId } from '../sim/types.ts';

export interface DimRuleDef {
  id: DimRuleId;
  name: string;
  /** Uma frase para o painel do abismo. */
  blurb: string;
}

export const DIM_RULES: Record<DimRuleId, DimRuleDef> = {
  nevoa: { id: 'nevoa', name: 'Névoa espessa', blurb: 'Golpes críticos pela metade, dos dois lados.' },
  mare: { id: 'mare', name: 'Maré alta', blurb: 'Todos 15% mais lentos; a descida leva 1 hora a mais.' },
  esporos: { id: 'esporos', name: 'Esporos no ar', blurb: 'Os heróis perdem 2% da vida a cada sala que atravessam.' },
  calor: { id: 'calor', name: 'Calor da forja', blurb: 'Monstros com 20% mais ataque, e 30% mais ouro no saque.' },
  silencio: { id: 'silencio', name: 'Silêncio', blurb: 'A cura rende 40% menos.' },
  ganancia: { id: 'ganancia', name: 'Ganância', blurb: 'Metade a mais de baús e de elites.' },
  luaSangue: { id: 'luaSangue', name: 'Lua de sangue', blurb: 'Elites vampíricos aparecem duas vezes mais.' },
  ecos: { id: 'ecos', name: 'Ecos', blurb: 'Os ecos de heróis mortos aparecem com mais frequência.' },
};

export const DIM_RULE_IDS = Object.keys(DIM_RULES) as DimRuleId[];

/** "Névoa espessa e Maré alta", ou "Calmaria". */
export function rulesLabel(rules: readonly DimRuleId[]): string {
  if (rules.length === 0) return 'Calmaria';
  const names = rules.map((r) => DIM_RULES[r].name);
  return names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;
}
