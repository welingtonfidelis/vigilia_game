// Itens do M4: afixos, nomes por classe e por encaixe, lendárias e preços de encomenda.

import type { ClassId, ItemAffix, ItemSlot, MaterialId, Rarity } from '../sim/types.ts';

export interface AffixDef {
  id: ItemAffix;
  /** Adjetivo no masculino e no feminino, para concordar com o nome da peça. */
  adj: { m: string; f: string };
  /** O que faz, para a ficha. */
  effect: string;
}

export const AFFIXES: Record<ItemAffix, AffixDef> = {
  afiado: { id: 'afiado', adj: { m: 'afiado', f: 'afiada' }, effect: '+5% de crítico' },
  perfurante: { id: 'perfurante', adj: { m: 'perfurante', f: 'perfurante' }, effect: '+15% de perfuração' },
  guardiao: { id: 'guardiao', adj: { m: 'protetor', f: 'protetora' }, effect: '+4 de defesa' },
  robusto: { id: 'robusto', adj: { m: 'robusto', f: 'robusta' }, effect: '+10% de vida' },
  sereno: { id: 'sereno', adj: { m: 'sereno', f: 'serena' }, effect: 'foge menos (limiar −8)' },
  agil: { id: 'agil', adj: { m: 'ágil', f: 'ágil' }, effect: 'ataques 10% mais rápidos' },
  sanguessuga: { id: 'sanguessuga', adj: { m: 'sanguessuga', f: 'sanguessuga' }, effect: 'recupera 8% do dano causado' },
  afortunado: { id: 'afortunado', adj: { m: 'afortunado', f: 'afortunada' }, effect: '+10% do ouro do saque do grupo' },
};

export const AFFIX_IDS = Object.keys(AFFIXES) as ItemAffix[];

/** O afixo que cada material dá na forja (o afortunado só vem do abismo). */
export const MATERIAL_AFFIX: Record<MaterialId, ItemAffix[]> = {
  ossos: ['afiado'],
  ferroNegro: ['perfurante', 'guardiao'],
  esporos: ['robusto'],
  perolas: ['sereno'],
  brasas: ['agil'],
  almas: ['sanguessuga'],
};

/** "de osso", "de ferro-negro"…, para o nome das peças feitas com o material. */
export const MATERIAL_OF: Record<MaterialId, string> = {
  ossos: 'de osso',
  ferroNegro: 'de ferro-negro',
  esporos: 'de esporo',
  perolas: 'de pérola negra',
  brasas: 'de brasa',
  almas: 'de alma',
};

type Noun = { name: string; g: 'm' | 'f' };

/** A arma de cada classe (a peça muda de nome conforme quem usa). */
export const WEAPON_NOUN: Record<ClassId, Noun> = {
  guardiao: { name: 'Espada', g: 'f' },
  selvagem: { name: 'Machado', g: 'm' },
  lanceiro: { name: 'Lança', g: 'f' },
  arqueiro: { name: 'Arco', g: 'm' },
  clerigo: { name: 'Martelo', g: 'm' },
  piromante: { name: 'Cajado', g: 'm' },
};

export const ARMOR_NOUN: Record<ClassId, Noun> = {
  guardiao: { name: 'Couraça', g: 'f' },
  selvagem: { name: 'Gibão de peles', g: 'm' },
  lanceiro: { name: 'Cota de malha', g: 'f' },
  arqueiro: { name: 'Gibão', g: 'm' },
  clerigo: { name: 'Hábito', g: 'm' },
  piromante: { name: 'Manto', g: 'm' },
};

/** Sem dono (no arsenal), a peça leva um nome genérico. */
export const GENERIC_NOUN: Record<ItemSlot, Noun> = {
  weapon: { name: 'Arma', g: 'f' },
  armor: { name: 'Armadura', g: 'f' },
  amulet: { name: 'Amuleto', g: 'm' },
};

export const SLOT_NAMES: Record<ItemSlot, string> = { weapon: 'Arma', armor: 'Armadura', amulet: 'Amuleto' };

export const RARITY_NAMES: Record<Rarity, { m: string; f: string }> = {
  comum: { m: 'comum', f: 'comum' },
  rara: { m: 'raro', f: 'rara' },
  epica: { m: 'épico', f: 'épica' },
  lendaria: { m: 'lendário', f: 'lendária' },
};

/** Quantos afixos cada raridade traz. */
export const RARITY_AFFIXES: Record<Rarity, number> = { comum: 0, rara: 1, epica: 2, lendaria: 3 };

/** Nomes próprios das lendárias; cada um aparece uma vez por campanha enquanto houver. */
export const LEGENDARY_TITLES: string[] = [
  'Vigia Partida',
  'Lamento de Ferro-negro',
  'Última Vela',
  'Dente do Guardião',
  'Promessa Afogada',
  'Coração de Brasa',
  'Silêncio das Urnas',
  'Juramento do Fundo',
  'Olho que Não Dorme',
  'Raiz da Mãe-Bolor',
  'Maré Negra',
  'Cinza do Martelo',
];
