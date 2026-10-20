// Sprites do 0x72 na UI em DOM: um recorte da folha em CSS, animado com steps().

import { ACTS } from '../sim/index.ts';
import type { ClassId, Hero, Unit, World } from '../sim/index.ts';
import { animFrames, DUNGEON_URL, frameRect, heroSprite, MONSTERS, SHEET_0X72_SIZE } from '../render/assets.ts';
import { armorIconUrl, PACK_BASE, weaponIconUrl } from '../render/pack.ts';

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

export const HeroPortrait = (props: { hero: Hero; scale?: number; animate?: boolean; variant?: 'detail' | 'small' }) => {
  const scale = props.scale ?? (props.variant === 'detail' ? 3 : 2);
  return (
    <PixelSprite
      base={heroSprite(props.hero.classId, props.hero.gender)}
      scale={scale}
      crop={HERO_CROP}
      animate={props.animate}
      ghost={props.hero.status === 'dead'}
    />
  );
};

/** Qual monstro do 0x72 desenha esta unidade (inimigo do ato, chefe ou eco de um herói morto). */
export function monsterBase(world: World, unit: Unit, act: number): { base: string; ghost: boolean } {
  const def = ACTS[act];
  if (!def) return { base: 'skelet', ghost: false };
  if (unit.tags.includes('boss')) return { base: MONSTERS[def.boss.id]?.base ?? 'big_demon', ghost: false };
  if (unit.name.startsWith('Eco de ')) {
    const lost = world.heroes.find((h) => h.name === unit.name.slice('Eco de '.length));
    return { base: lost ? heroSprite(lost.classId, lost.gender) : 'wogol', ghost: true };
  }
  const enemy = def.enemies.find((e) => unit.name.startsWith(e.name));
  return { base: (enemy && MONSTERS[enemy.id]?.base) || 'skelet', ghost: false };
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
