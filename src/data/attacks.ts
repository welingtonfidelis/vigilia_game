// Ataques que mudam com o nível e golpes dos monstros (§9.9 do doc). Só aparência: dano,
// crítico, cura e duração das lutas não mudam, e o estágio sai do nível na hora de desenhar.
// Os efeitos são folhas do pixelfx geradas pelo tools/pfx.ts (índice em src/render/lane/pfx-index.ts).

import type { ClassId } from '../sim/types.ts';

/** Nível em que cada estágio começa (I, II, III). */
export const STAGE_LEVELS = [1, 15, 35] as const;

export type Stage = 0 | 1 | 2;

export const stageOf = (level: number): Stage => (level >= STAGE_LEVELS[2] ? 2 : level >= STAGE_LEVELS[1] ? 1 : 0);

/** Onde o efeito sai: na frente de quem golpeia (virado para o alvo) ou no alvo. */
export type Anchor = 'atacante' | 'alvo';

export interface Strike {
  /** Id da folha no índice do pixelfx. */
  fx: string;
  anchor: Anchor;
  /** Efeito grande: só um por corredor de cada vez (com outro na tela, sai o crit-hit). */
  big?: boolean;
}

export interface AttackStage {
  /** Nome do ataque, na ficha e no relatório. */
  name: string;
  /** Golpe comum; sem ele, o efeito do ato (corpo a corpo) ou o projétil da classe. */
  hit?: Strike;
  /** Efeitos do crítico; sem eles, o crit-hit no alvo. */
  crit?: Strike[];
  /** Projétil próprio (o arqueiro no II e no III). */
  projectile?: string;
  /** Efeito em quem apanha (o guardião no III). */
  hurt?: Strike;
  /** Efeito da cura dada (o clérigo). */
  heal?: Strike;
}

const CRIT: Strike = { fx: 'crit-hit', anchor: 'alvo' };

export const CLASS_ATTACKS: Record<ClassId, readonly [AttackStage, AttackStage, AttackStage]> = {
  guardiao: [
    { name: 'Golpe de espada' },
    { name: 'Corte Crescente', hit: { fx: 'sword-slash', anchor: 'atacante' } },
    { name: 'Giro da Muralha', hit: { fx: 'spin-slash', anchor: 'atacante' }, hurt: { fx: 'shield-block', anchor: 'alvo' } },
  ],
  lanceiro: [
    { name: 'Golpe de lança' },
    { name: 'Estocada', hit: { fx: 'thrust', anchor: 'atacante' } },
    { name: 'Varredura', hit: { fx: 'spear-sweep', anchor: 'atacante' }, crit: [{ fx: 'thrust', anchor: 'atacante' }, CRIT] },
  ],
  selvagem: [
    { name: 'Golpe de machado' },
    { name: 'Corte em X', hit: { fx: 'double-slash', anchor: 'atacante' } },
    { name: 'Talho Pesado', hit: { fx: 'heavy-cleave', anchor: 'atacante' } },
  ],
  arqueiro: [
    { name: 'Flecha' },
    { name: 'Flecha Assobiante', projectile: 'arrow' },
    { name: 'Chuva de Estrelas', projectile: 'arrow', crit: [{ fx: 'star-fall', anchor: 'alvo', big: true }] },
  ],
  piromante: [
    { name: 'Bola de Fogo' },
    { name: 'Anel de Fogo', crit: [{ fx: 'fire-ring', anchor: 'alvo', big: true }] },
    { name: 'Meteoro', crit: [{ fx: 'meteor', anchor: 'alvo', big: true }] },
  ],
  clerigo: [
    { name: 'Luz do Alto', heal: { fx: 'healing-bloom', anchor: 'alvo' } },
    { name: 'Bênção da Luz', heal: { fx: 'heal-aoe', anchor: 'alvo' } },
    { name: 'Coluna de Luz', heal: { fx: 'heal-aoe', anchor: 'alvo' }, crit: [{ fx: 'holy-pillar', anchor: 'alvo', big: true }] },
  ],
};

// ── Monstros ────────────────────────────────────────────────────────────────

export type MonsterStyle = 'garra' | 'arma' | 'pancada';

/** Efeito de cada estilo; a folha é `${fx}-${bioma em romano minúsculo}` (claw-swipe-iii). */
export const STYLE_STRIKE: Record<MonsterStyle, Strike> = {
  garra: { fx: 'claw-swipe', anchor: 'alvo' },
  arma: { fx: 'sword-slash', anchor: 'atacante' },
  pancada: { fx: 'blunt-hit', anchor: 'alvo' },
};

/** Estilo dos monstros corpo a corpo; a retaguarda (orbe) fica de fora. */
export const MONSTER_STYLE: Record<string, MonsterStyle> = {
  rato: 'garra',
  enguia: 'garra',
  caoBrasa: 'garra',
  zangao: 'garra',
  mariposa: 'garra',
  aguaViva: 'garra',
  caranguejo: 'garra',
  aranhaEngrenagem: 'garra',
  chacal: 'garra',
  escorpiao: 'garra',
  sombra: 'garra',
  esqueleto: 'arma',
  mineiro: 'arma',
  sereia: 'arma',
  cavaleiroSalobro: 'arma',
  arauto: 'arma',
  automato: 'arma',
  mumia: 'arma',
  golem: 'pancada',
  esporento: 'pancada',
  brotado: 'pancada',
  ferreiroCinzento: 'pancada',
  casulo: 'pancada',
  fornalha: 'pancada',
};

/** Golpe próprio de cada chefe e Senhor; a folha é `boss-${id}`, na paleta do bioma dele. */
export const BOSS_STRIKE: Record<string, Strike & { source: string }> = {
  guardiaoUrnas: { fx: 'boss-guardiaoUrnas', anchor: 'atacante', source: 'melee/heavy-cleave' },
  couraca: { fx: 'boss-couraca', anchor: 'atacante', source: 'melee/hammer-smash' },
  maeBolor: { fx: 'boss-maeBolor', anchor: 'atacante', source: 'melee/whip-crack' },
  arcebispo: { fx: 'boss-arcebispo', anchor: 'atacante', source: 'melee/scythe-reap' },
  martelo: { fx: 'boss-martelo', anchor: 'atacante', source: 'melee/hammer-smash' },
  aquiloQueVigia: { fx: 'boss-aquiloQueVigia', anchor: 'atacante', source: 'melee/scythe-reap' },
  rainhaEsporos: { fx: 'boss-rainhaEsporos', anchor: 'alvo', source: 'melee/claw-swipe' },
  coroSubmerso: { fx: 'boss-coroSubmerso', anchor: 'atacante', source: 'melee/whip-crack' },
  colosso: { fx: 'boss-colosso', anchor: 'atacante', source: 'melee/hammer-smash' },
  reiOssuarios: { fx: 'boss-reiOssuarios', anchor: 'atacante', source: 'melee/heavy-cleave' },
};

/** Paleta de cada bioma, do escuro ao claro (na ordem de BIOMES). */
export const BIOME_PALETTE: readonly (readonly string[])[] = [
  ['#2a2016', '#5a4630', '#a08a64', '#e0cfa0', '#fff4d8'], // Catacumbas: osso e âmbar de vela
  ['#0e2228', '#1f4a52', '#3f7f86', '#9fd0cc', '#eafcff'], // Minas Inundadas: ferrugem e azul-petróleo
  ['#1a0f24', '#3a2a5a', '#5fae5a', '#b8f07a', '#f4ffe0'], // Jardim de Fungos: violeta e verde de esporo
  ['#0b2028', '#1d5058', '#3fa0a0', '#a8e8e0', '#f4ffff'], // Cidade Afogada: ciano e pérola
  ['#2a0a06', '#6a1c0c', '#c8461e', '#ff9a40', '#fff0b0'], // Forja Abissal: brasa
  ['#1a0614', '#4a0f3a', '#9a2a6a', '#e06ab0', '#ffe0f4'], // Coração do Abismo: carmesim e violeta
  ['#2a2620', '#5a5446', '#a8a088', '#e8e0c8', '#ffffff'], // Colmeia Pálida: cera pálida
  ['#060c24', '#14286a', '#2a5ab0', '#7ab0f0', '#e8f4ff'], // Fossa Cantante: azul abissal
  ['#1e140a', '#4a3418', '#8a6a2a', '#d8b060', '#fff0c0'], // Cidadela de Engrenagens: bronze
  ['#2a1e10', '#6a5030', '#b8945a', '#ecd8a0', '#fffbe8'], // Deserto de Ossos: areia e osso
];

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'] as const;

/** Folha do golpe de um estilo num bioma (0 a 9). */
export const styleFx = (style: MonsterStyle, biome: number): string => `${STYLE_STRIKE[style].fx}-${ROMAN[Math.max(0, Math.min(9, biome))]}`;
