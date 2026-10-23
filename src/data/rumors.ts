// Rumores da próxima passagem (M6 F2): o que a guilda ouve sobre uma passagem antes de alguém
// abrir. Uma frase por regra da dimensão e uma por bioma; o rumor usa a da regra que ele revela
// e, sem regra, a do bioma.

import type { DimRuleId } from '../sim/types.ts';

export const RULE_RUMORS: Record<DimRuleId, string> = {
  nevoa: 'Dizem que lá dentro a névoa é tão grossa que ninguém acerta um golpe direito.',
  mare: 'Um pescador jura que a água sobe e desce lá embaixo como maré, e pesa nas pernas.',
  esporos: 'Quem chegou perto voltou tossindo um pó amarelo que não sai da roupa.',
  calor: 'Contam que o ar queima lá dentro, e que os monstros guardam ouro derretido.',
  silencio: 'O acólito diz que reza nenhuma chega lá: as feridas fecham devagar.',
  ganancia: 'Fala-se de baús por toda parte, e de quem os guarda.',
  luaSangue: 'Dizem que lá dentro há uma lua vermelha, e que os grandes bebem sangue.',
  ecos: 'Ouviram vozes conhecidas lá embaixo, de gente que o abismo já levou.',
};

/** Pelo índice do bioma em src/data/biomes.ts. */
export const BIOME_RUMORS: readonly string[] = [
  'Um coveiro diz que as urnas lá embaixo ainda estão cheias.',
  'Os mineiros falam de galerias que a água engoliu e de luzes no fundo.',
  'Dizem que cresce um jardim lá dentro, e que ele respira.',
  'Um velho jura ter visto torres de uma cidade debaixo da água.',
  'Contam de martelos que batem sozinhos no escuro.',
  'Ninguém que desceu tão fundo voltou para contar como é.',
  'Dizem que lá dentro tudo zune, e que as paredes são de cera.',
  'Os marinheiros falam de um canto que vem da água parada.',
  'Ouviram engrenagens girando lá embaixo, sem ninguém para dar corda.',
  'Contam de dunas de ossos que mudam de lugar à noite.',
];
