// Arte do pack na interface em DOM: ícones, retratos, monstros e modelos em CSS.

import type { ClassId, Hero } from '../sim/index.ts';
import { artFile, hiUrl, imgSrc } from '../render/art32.ts';
import { amuletIconUrl, armorIconUrl, heroPortraitHd, heroPortraitUrl, heroSpriteId, packAsset, PACK_BASE, weaponIconUrl } from '../render/pack.ts';
import type { PackAsset } from '../render/pack.ts';

/** Qual visual desenha cada monstro: mora em render/assets.ts (o corredor em canvas também usa). */
export { monsterBase } from '../render/assets.ts';

/** Arma de classe no ícone do pack (24×24), para a ficha do herói. */
export function WeaponIcon(props: { classId: ClassId; scale?: number }) {
  const s = props.scale ?? 2;
  return <img class="ui-icon" {...imgSrc(weaponIconUrl(props.classId))} width={24 * s} height={24 * s} alt="" aria-hidden="true" />;
}

/** Armadura comprada, no ícone 24×24 do pack. */
export function ArmorIcon(props: { size?: number }) {
  const size = props.size ?? 52;
  return <img class="ui-icon" {...imgSrc(armorIconUrl())} width={size} height={size} alt="" aria-hidden="true" />;
}

/** Amuleto, no ícone 24×24 do pack (corrente e pingente com a pedra do abismo). */
export function AmuletIcon(props: { size?: number }) {
  const size = props.size ?? 52;
  return <img class="ui-icon" {...imgSrc(amuletIconUrl())} width={size} height={size} alt="" aria-hidden="true" />;
}

/** Sprite do pack 1.7 para o painel do Abismo: idle 4 quadros, normais a 2x e chefes a 1x. */
export function MonsterSprite(props: { asset: string; boss: boolean; animate: boolean; scale?: number }) {
  const asset = packAsset(props.asset);
  if (!asset) return null;
  const [w, h] = asset.frameSize ?? [16, 16];
  const scale = props.scale ?? (props.boss ? 1 : 2);
  const style: Record<string, string> = {
    width: `${w * scale}px`,
    height: `${h * scale}px`,
    backgroundImage: `url(${hiUrl(`${PACK_BASE}${asset.file}`)})`,
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
  return <img class="monster-portrait" {...imgSrc(`${PACK_BASE}${asset.file}`)} width={32 * scale} height={36 * scale} alt="" aria-hidden="true" />;
}

export const HeroPortrait = (props: { hero: Hero; scale?: number; animate?: boolean; variant?: 'detail' | 'small' }) => {
  const detail = props.variant === 'detail';
  const hd = detail ? heroPortraitHd(props.hero.classId, props.hero.gender) : undefined;
  if (hd) return <HeroModel hero={props.hero} asset={hd} scale={props.scale ?? 1} animate={props.animate !== false && props.hero.status !== 'dead'} />;
  return (
    <img
      class={`portrait-img ${detail ? 'portrait-detail' : 'portrait-small'}${props.hero.status === 'dead' ? ' portrait-ghost' : ''}`}
      {...imgSrc(heroPortraitUrl(props.hero.classId, props.hero.gender, !detail))}
      alt=""
      aria-hidden="true"
    />
  );
};

/**
 * Modelo detalhado do estilo novo (48×64, idle de 4 quadros a 4 fps), para as telas de
 * perto. Só escala inteira, para o pixel não borrar. No modo 32-bit, a folha 32-bit do
 * herói, de quadros do mesmo tamanho, entra no lugar (com o idle dela).
 */
function HeroModel(props: { hero: Hero; asset: PackAsset; scale: number; animate: boolean }) {
  const sheet = packAsset(heroSpriteId(props.hero.classId, props.hero.gender));
  const hi = sheet ? artFile(sheet.id, sheet.file) : null;
  const asset = sheet && hi?.hires ? sheet : props.asset;
  const url = hi?.hires ? `${PACK_BASE}${hi.file}` : hiUrl(`${PACK_BASE}${props.asset.file}`);
  const [w, h] = props.asset.frameSize ?? [48, 64];
  const s = Math.max(1, Math.round(props.scale));
  const idle = asset.animations?.idle ?? { frames: [0], fps: 1 };
  const style: Record<string, string> = {
    width: `${w * s}px`,
    height: `${h * s}px`,
    backgroundImage: `url(${url})`,
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
        backgroundImage: `url(${hiUrl(`${PACK_BASE}${asset.file}`)})`,
        backgroundSize: `${w * (asset.columns ?? 1) * s}px ${h * s}px`,
        backgroundPosition: '0 0',
      }}
    />
  );
}
