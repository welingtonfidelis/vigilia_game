// Sprites do 0x72 na UI em DOM: um recorte da folha em CSS, animado com steps().

import type { ClassId, Hero } from '../sim/index.ts';
import { animFrames, DUNGEON_URL, frameRect, SHEET_0X72_SIZE } from '../render/assets.ts';
import { amuletIconUrl, armorIconUrl, heroPortraitHd, heroPortraitUrl, packAsset, PACK_BASE, weaponIconUrl } from '../render/pack.ts';
import type { PackAsset } from '../render/pack.ts';

/** Qual visual desenha cada monstro: mora em render/assets.ts (o corredor em canvas também usa). */
export { monsterBase } from '../render/assets.ts';

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

/** Amuleto, no ícone 24×24 do pack (corrente e pingente com a pedra do abismo). */
export function AmuletIcon(props: { size?: number }) {
  const size = props.size ?? 52;
  return <img class="ui-icon" src={amuletIconUrl()} width={size} height={size} alt="" aria-hidden="true" />;
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
export function MonsterSprite(props: { asset: string; boss: boolean; animate: boolean; scale?: number }) {
  const asset = packAsset(props.asset);
  if (!asset) return null;
  const [w, h] = asset.frameSize ?? [16, 16];
  const scale = props.scale ?? (props.boss ? 1 : 2);
  const style: Record<string, string> = {
    width: `${w * scale}px`,
    height: `${h * scale}px`,
    backgroundImage: `url(${PACK_BASE}${asset.file})`,
    backgroundSize: `${w * (asset.columns ?? 8) * scale}px ${h * scale}px`,
    backgroundPosition: '0 0',
    '--monster-to': `${-w * 4 * scale}px`,
  };
  return <span class={`monster-sprite${props.boss ? ' boss' : ''}${props.animate ? ' animate' : ''}`} style={style} aria-hidden="true" />;
}

/** Retrato 32x36 do pack 1.9 para a lista de inimigos do Abismo. */
export function MonsterPortrait(props: { asset: string; scale?: number }) {
  const base = props.asset
    .replace(/^char\/monster\//, 'ui/portrait/monster/')
    .replace(/^char\/boss\//, 'ui/portrait/boss/')
    .replace(/-(deep|core|phase2)$/, '');
  const asset = packAsset(base);
  if (!asset) return <MonsterSprite asset={props.asset} boss={props.asset.startsWith('char/boss/')} animate={false} />;
  const scale = props.scale ?? 1;
  return <img class="monster-portrait" src={`${PACK_BASE}${asset.file}`} width={32 * scale} height={36 * scale} alt="" aria-hidden="true" />;
}

export const HeroPortrait = (props: { hero: Hero; scale?: number; animate?: boolean; variant?: 'detail' | 'small' }) => {
  const detail = props.variant === 'detail';
  const hd = detail ? heroPortraitHd(props.hero.classId, props.hero.gender) : undefined;
  if (hd) return <HeroModel hero={props.hero} asset={hd} scale={props.scale ?? 1} animate={props.animate !== false && props.hero.status !== 'dead'} />;
  return (
    <img
      class={`portrait-img ${detail ? 'portrait-detail' : 'portrait-small'}${props.hero.status === 'dead' ? ' portrait-ghost' : ''}`}
      src={heroPortraitUrl(props.hero.classId, props.hero.gender, !detail)}
      alt=""
      aria-hidden="true"
    />
  );
};

/**
 * Modelo detalhado do estilo novo (48×64, idle de 4 quadros a 4 fps), para as telas de
 * perto. Só escala inteira, para o pixel não borrar.
 */
function HeroModel(props: { hero: Hero; asset: PackAsset; scale: number; animate: boolean }) {
  const { asset } = props;
  const [w, h] = asset.frameSize ?? [48, 64];
  const s = Math.max(1, Math.round(props.scale));
  const idle = asset.animations?.idle ?? { frames: [0], fps: 1 };
  const style: Record<string, string> = {
    width: `${w * s}px`,
    height: `${h * s}px`,
    backgroundImage: `url(${PACK_BASE}${asset.file})`,
    backgroundSize: `${w * (asset.columns ?? 1) * s}px ${h * s}px`,
    '--model-to': `${-w * idle.frames.length * s}px`,
    '--model-steps': String(idle.frames.length),
    '--model-time': `${idle.frames.length / (idle.fps || 1)}s`,
  };
  const ghost = props.hero.status === 'dead' ? ' portrait-ghost' : '';
  return <span class={`hero-model${props.animate ? ' animate' : ''}${ghost}`} style={style} aria-hidden="true" />;
}

/** Criança do pack na lista do elenco: quadro 0 parado, no tamanho que a folha tiver. */
export function ChildIcon(props: { gender: 'm' | 'f'; scale?: number }) {
  const s = props.scale ?? 1;
  const asset = packAsset(`char/child/${props.gender}`);
  if (!asset) return null;
  const [w, h] = asset.frameSize ?? [16, 24];
  return (
    <span
      class="pack-child"
      aria-hidden="true"
      style={{
        width: `${w * s}px`,
        height: `${h * s}px`,
        backgroundImage: `url(${PACK_BASE}${asset.file})`,
        backgroundSize: `${w * (asset.columns ?? 1) * s}px ${h * s}px`,
        backgroundPosition: '0 0',
      }}
    />
  );
}
