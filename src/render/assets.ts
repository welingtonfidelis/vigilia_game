// Arte do jogo: escala, nomes de arma e qual folha do pack desenha cada inimigo. Sem
// Phaser: a interface em DOM também usa (retratos e monstros em CSS). Toda a arte é do
// pack próprio do Vigília (public/assets/vigilia/), em 16-bit e 32-bit.

import { BIOMES } from '../sim/index.ts';
import type { ClassId, Unit, World } from '../sim/index.ts';
import { heroPortraitUrl, heroSpriteId } from './pack.ts';

/** Cada pixel da arte vale 2 unidades do mundo (o tile de 16 px ocupa 32). */
export const ART_SCALE = 2;
export const TILE = 16 * ART_SCALE;

/** Nome da arma de classe, para a ficha (o desenho no mapa foi retirado). */
export const WEAPON_NAMES: Record<ClassId, string> = {
  guardiao: 'espada de cavaleiro',
  selvagem: 'machado de guerra',
  lanceiro: 'lança',
  arqueiro: 'arco',
  clerigo: 'cajado sagrado',
  piromante: 'cajado de fogo',
};

export interface MonsterLook {
  /** Folha do pack: char/monster/<id>, char/boss/<id> ou, no eco, a do herói morto. */
  asset: string;
  frameSize?: [number, number];
  /** Eco de herói morto: a folha do herói em tom fantasma. */
  ghost?: boolean;
  /** Retrato do eco na interface (o do herói morto). */
  portrait?: string;
}

/** Monstros de cada bioma (por id em src/data/biomes.ts) e os Senhores. */
export const MONSTERS: Record<string, MonsterLook> = {
  esqueleto: { asset: 'char/monster/esqueleto', frameSize: [24, 32] },
  rato: { asset: 'char/monster/rato', frameSize: [24, 16] },
  acolito: { asset: 'char/monster/acolito', frameSize: [24, 32] },
  guardiaoUrnas: { asset: 'char/boss/guardiaoUrnas', frameSize: [48, 56] },
  mineiro: { asset: 'char/monster/mineiro', frameSize: [24, 32] },
  enguia: { asset: 'char/monster/enguia', frameSize: [24, 24] },
  golem: { asset: 'char/monster/golem', frameSize: [32, 40] },
  couraca: { asset: 'char/boss/couraca', frameSize: [56, 48] },
  esporento: { asset: 'char/monster/esporento', frameSize: [24, 24] },
  aranha: { asset: 'char/monster/aranha', frameSize: [32, 24] },
  brotado: { asset: 'char/monster/brotado', frameSize: [32, 40] },
  maeBolor: { asset: 'char/boss/maeBolor', frameSize: [48, 56] },
  sacerdote: { asset: 'char/monster/sacerdote', frameSize: [24, 32] },
  sereia: { asset: 'char/monster/sereia', frameSize: [24, 28] },
  cavaleiroSalobro: { asset: 'char/monster/cavaleiroSalobro', frameSize: [32, 40] },
  arcebispo: { asset: 'char/boss/arcebispo', frameSize: [48, 60] },
  ferreiroCinzento: { asset: 'char/monster/ferreiroCinzento', frameSize: [32, 40] },
  caoBrasa: { asset: 'char/monster/caoBrasa', frameSize: [24, 18] },
  escravoForja: { asset: 'char/monster/escravoForja', frameSize: [24, 32] },
  martelo: { asset: 'char/boss/martelo', frameSize: [48, 56] },
  sombra: { asset: 'char/monster/sombra', frameSize: [24, 32] },
  lamento: { asset: 'char/monster/lamento', frameSize: [24, 32] },
  arauto: { asset: 'char/monster/arauto', frameSize: [32, 40] },
  aquiloQueVigia: { asset: 'char/boss/aquiloQueVigia', frameSize: [64, 64] },
  // Dimensões fundas (M5 F6)
  zangao: { asset: 'char/monster/zangao', frameSize: [24, 32] },
  mariposa: { asset: 'char/monster/mariposa', frameSize: [24, 24] },
  casulo: { asset: 'char/monster/casulo', frameSize: [32, 40] },
  rainhaEsporos: { asset: 'char/boss/rainhaEsporos', frameSize: [56, 56] },
  peixeLanterna: { asset: 'char/monster/peixeLanterna', frameSize: [24, 24] },
  aguaViva: { asset: 'char/monster/aguaViva', frameSize: [24, 28] },
  caranguejo: { asset: 'char/monster/caranguejo', frameSize: [40, 32] },
  coroSubmerso: { asset: 'char/boss/coroSubmerso', frameSize: [56, 60] },
  automato: { asset: 'char/monster/automato', frameSize: [24, 32] },
  aranhaEngrenagem: { asset: 'char/monster/aranhaEngrenagem', frameSize: [32, 24] },
  fornalha: { asset: 'char/monster/fornalha', frameSize: [32, 40] },
  colosso: { asset: 'char/boss/colosso', frameSize: [64, 64] },
  mumia: { asset: 'char/monster/mumia', frameSize: [24, 32] },
  chacal: { asset: 'char/monster/chacal', frameSize: [32, 24] },
  escorpiao: { asset: 'char/monster/escorpiao', frameSize: [40, 32] },
  reiOssuarios: { asset: 'char/boss/reiOssuarios', frameSize: [48, 60] },
};

/** Monstros de todos os biomas, do nome mais longo ao mais curto (o invasor também acha a dele). */
const ALL_ENEMIES = BIOMES.flatMap((b) => b.enemies).sort((a, b) => b.name.length - a.name.length);

/** Qual folha desenha esta unidade (monstro do bioma, invasor, Senhor ou o eco de um herói morto). */
export function monsterBase(world: World, unit: Unit, biome: number): MonsterLook {
  const def = BIOMES[biome];
  if (!def) return MONSTERS.esqueleto!;
  if (unit.tags.includes('boss')) return MONSTERS[def.boss.id] ?? MONSTERS.esqueleto!;
  if (unit.name.startsWith('Eco de ')) {
    const lost = world.heroes.find((h) => h.name === unit.name.slice('Eco de '.length));
    if (!lost) return { asset: 'char/monster/sombra', ghost: true };
    return { asset: heroSpriteId(lost.classId, lost.gender), ghost: true, portrait: heroPortraitUrl(lost.classId, lost.gender, true) };
  }
  // Pelo id do monstro (a nêmesis tem nome próprio, M6 F2); unidades antigas, pelo nome.
  const enemy = ALL_ENEMIES.find((e) => e.id === unit.defId) ?? ALL_ENEMIES.find((e) => unit.name.startsWith(e.name));
  return (enemy && MONSTERS[enemy.id]) || MONSTERS.esqueleto!;
}
