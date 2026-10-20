// Sprites do 0x72 na UI em DOM: um recorte da folha em CSS, animado com steps().

import { ACTS } from '../sim/index.ts';
import type { ClassId, Hero, Unit, World } from '../sim/index.ts';
import { animFrames, DUNGEON_URL, frameRect, heroSprite, MONSTERS, SHEET_0X72_SIZE, type MonsterLook } from '../render/assets.ts';
import { armorIconUrl, heroPortraitUrl, packAsset, PACK_BASE, weaponIconUrl } from '../render/pack.ts';

/** Arma de classe no ícone do pack (24×24), para a ficha do herói. */
export function WeaponIcon(props: { classId: ClassId; scale?: number }) {
  const s = props.scale ?? 2;
  return <img class="ui-icon" src={weaponIconUrl(props.classId)} width={24 * s} height={24 * s} alt="" aria-hidden="true" />;
}

/** Armadura comprada, no ícone 24×24 do pack. */
export function ArmorIcon(props: { size?: number }) {
  const size = props.size ?? 52;
  return <img class="ui-icon" src={armorIconUrl()} width={size} height={size} alt="" aria-hidden="true" />;
}

/** `crop` tira pixels vazios do topo do quadro (os heróis do 0x72 têm folga em cima). */
export function PixelSprite(props: { base: string; scale?: number; animate?: boolean; ghost?: boolean; crop?: number; title?: string }) {
  const frames = animFrames(props.base, 'idle');
  const first = frames[0] ? frameRect(frames[0]) : null;
  if (!first) return null;
  const s = props.scale ?? 2;
  const [x, y0, w, h0] = first;
  const crop = Math.min(props.crop ?? 0, h0 - 8);
  const y = y0 + crop;
  const h = h0 - crop;
  const animate = props.animate !== false && frames.length > 1;
  const style: Record<string, string> = {
    width: `${w * s}px`,
    height: `${h * s}px`,
    backgroundImage: `url(${DUNGEON_URL})`,
    backgroundSize: `${SHEET_0X72_SIZE * s}px ${SHEET_0X72_SIZE * s}px`,
    backgroundPosition: `${-x * s}px ${-y * s}px`,
    '--px-from': `${-x * s}px`,
    '--px-to': `${-(x + frames.length * w) * s}px`,
    '--px-y': `${-y * s}px`,
    '--px-steps': String(frames.length),
  };
  return <span class={`px${animate ? ' px-anim' : ''}${props.ghost ? ' px-ghost' : ''}`} style={style} title={props.title} aria-hidden="true" />;
}

/** Folga vazia no topo dos quadros de herói do 0x72 (16×28). */
export const HERO_CROP = 7;

/** Sprite do pack 1.7 para o painel do Abismo: idle 4 quadros, normais a 2x e chefes a 1x. */
export function MonsterSprite(props: { asset: string; boss: boolean; animate: boolean }) {
  const asset = packAsset(props.asset);
  if (!asset) return null;
  const [w, h] = asset.frameSize ?? [16, 16];
  const scale = props.boss ? 1 : 2;
  const style: Record<string, string> = {
    width: `${w * scale}px`,
    height: `${h * scale}px`,
    backgroundImage: `url(${PACK_BASE}${asset.file})`,
    backgroundSize: `${w * 8 * scale}px ${h * scale}px`,
    backgroundPosition: '0 0',
    '--monster-to': `${-w * 4 * scale}px`,
  };
  return <span class={`monster-sprite${props.boss ? ' boss' : ''}${props.animate ? ' animate' : ''}`} style={style} aria-hidden="true" />;
}

export const HeroPortrait = (props: { hero: Hero; scale?: number; animate?: boolean; variant?: 'detail' | 'small' }) => {
  const detail = props.variant === 'detail';
  return (
    <img
      class={`portrait-img ${detail ? 'portrait-detail' : 'portrait-small'}${props.hero.status === 'dead' ? ' portrait-ghost' : ''}`}
      src={heroPortraitUrl(props.hero.classId, props.hero.gender, !detail)}
      alt=""
      aria-hidden="true"
    />
  );
};

/** Qual visual desenha esta unidade (pack 1.7 ou eco 0x72 de um herói morto). */
export function monsterBase(world: World, unit: Unit, act: number): MonsterLook {
  const def = ACTS[act];
  if (!def) return { base: 'skelet' };
  if (unit.tags.includes('boss')) return MONSTERS[def.boss.id] ?? { base: 'big_demon' };
  if (unit.name.startsWith('Eco de ')) {
    const lost = world.heroes.find((h) => h.name === unit.name.slice('Eco de '.length));
    return { base: lost ? heroSprite(lost.classId, lost.gender) : 'wogol', ghost: true };
  }
  const enemy = def.enemies.find((e) => unit.name.startsWith(e.name));
  return (enemy && MONSTERS[enemy.id]) || { base: 'skelet' };
}

/** Criança do pack (16×21, dois quadros) na lista do elenco; quadro 0 parado. */
export function ChildIcon(props: { gender: 'm' | 'f'; scale?: number }) {
  const s = props.scale ?? 1;
  return (
    <span
      class="pack-child"
      aria-hidden="true"
      style={{
        width: `${16 * s}px`,
        height: `${21 * s}px`,
        backgroundImage: `url(${PACK_BASE}export/png/char-child-${props.gender}.png)`,
        backgroundSize: `${32 * s}px ${21 * s}px`,
        backgroundPosition: '0 0',
      }}
    />
  );
}
