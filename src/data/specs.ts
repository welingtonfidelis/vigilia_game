// Especializações de nível 3 (M4): ao chegar no nível 3, cada prédio escolhe um caminho.

import type { BuildingId, SpecId } from '../sim/types.ts';

export interface SpecDef {
  id: SpecId;
  building: BuildingId;
  name: string;
  effect: string;
}

const spec = (building: BuildingId, id: SpecId, name: string, effect: string): SpecDef => ({ id, building, name, effect });

/** As duas escolhas de cada prédio, na ordem em que aparecem no diálogo. */
export const SPECS: Record<BuildingId, [SpecDef, SpecDef]> = {
  taverna: [
    spec('taverna', 'cervejaria', 'Cervejaria', 'A bebida dá o dobro de ânimo e de diversão.'),
    spec('taverna', 'apostas', 'Casa de apostas', 'Rende ouro por herói na vila, mas os heróis gastam mais na mesa.'),
  ],
  estalagem: [
    spec('estalagem', 'luxo', 'Quartos de luxo', 'O descanso recupera 20% a mais de vida e levanta o ânimo.'),
    spec('estalagem', 'dormitorio', 'Dormitório', '+4 vagas de herói.'),
  ],
  ferreiro: [
    spec('ferreiro', 'laminas', 'Lâminas', 'Armas épicas na encomenda, +1 tier máximo de arma e duas encomendas de arma ao mesmo tempo.'),
    spec('ferreiro', 'couracas', 'Couraças', 'Armaduras épicas na encomenda, +1 tier máximo de armadura e duas encomendas de armadura ao mesmo tempo.'),
  ],
  templo: [
    spec('templo', 'luz', 'Luz', 'Fé e luto se recuperam no dobro da velocidade.'),
    spec('templo', 'penitencia', 'Penitência', 'Todos fogem menos (limiar −6) e limpar andares baixa a corrupção 10% a mais.'),
  ],
  guilda: [
    spec('guilda', 'mercenaria', 'Mercenária', '+1 grupo ao mesmo tempo e contratos pagam 25% a mais.'),
    spec('guilda', 'ordem', 'Ordem', 'Grupos de até 6 heróis e +10 de lealdade a cada volta.'),
  ],
  campo: [
    spec('campo', 'disciplina', 'Disciplina', 'O treino dá 50% a mais de experiência.'),
    spec('campo', 'arena', 'Arena', 'Treinar diverte muito e as apostas pagam ao tesouro, com uma chance pequena de lesão leve.'),
  ],
  casa: [
    spec('casa', 'cirurgia', 'Cirurgia', 'Lesões saram no dobro da velocidade e nunca viram cicatriz.'),
    spec('casa', 'ervas', 'Ervas', 'Os grupos recuperam 10% da vida entre uma sala e outra.'),
  ],
};

export const SPEC_DEFS: Record<SpecId, SpecDef> = Object.fromEntries(
  Object.values(SPECS).flatMap((pair) => pair.map((d) => [d.id, d])),
) as Record<SpecId, SpecDef>;
