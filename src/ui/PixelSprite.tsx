// Sprites do 0x72 na UI em DOM: um recorte da folha em CSS, animado com steps().

import { ACTS } from '../sim/index.ts';
import type { ClassId, Hero, Unit, World } from '../sim/index.ts';
import { animFrames, CLASS_LOOK, DUNGEON_URL, frameRect, heroSprite, MONSTERS, SHEET_0X72_SIZE } from '../render/assets.ts';

/** Arma de classe, parada, só para a ficha do herói. O recorte é feito por CSS:
 *  o fundo fica clipado na caixa do próprio quadro, sem puxar o vizinho do atlas. */
export function WeaponIcon(props: { classId: ClassId; scale?: number }) {
  const name = CLASS_LOOK[props.classId].weapon;
  const frame = name ? frameRect(name) : null;
  if (!frame) return null;
  const s = props.scale ?? 2;
  const [x, y, w, h] = frame;
  return (
    <span
      class="px"
      style={{
        width: `${w * s}px`,
        height: `${h * s}px`,
        backgroundImage: `url(${DUNGEON_URL})`,
        backgroundSize: `${SHEET_0X72_SIZE * s}px ${SHEET_0X72_SIZE * s}px`,
        backgroundPosition: `${-x * s}px ${-y * s}px`,
      }}
      aria-hidden="true"
    />
  );
}

/** Peitoral em pixel art para a armadura comprada (o pacote 0x72 não tem uma). */
const ARMOR_ROWS = [
  '................',
  '..oooo....oooo..',
  '.osssso..osssso.',
  '.osssssoossssso.',
  '.osssssssssssso.',
  '.osllllllllllso.',
  '.oslllgggglllso.',
  '.osllllggllllso.',
  '.osllllggllllso.',
  '..osllllllllso..',
  '..osllllllllso..',
  '...osllllllso...',
  '...osllggllso...',
  '....osllllso....',
  '.....oooooo.....',
  '................',
];

const ARMOR_COLORS: Record<string, string> = {
  o: '#17130f',
  s: '#4a5460',
  l: '#aab6c0',
  g: '#e9c049',
};

export function ArmorIcon(props: { size?: number }) {
  const size = props.size ?? 52;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true" style={{ display: 'block' }}>
      {ARMOR_ROWS.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={ARMOR_COLORS[c]} />,
        ),
      )}
    </svg>
  );
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

export const HeroPortrait = (props: { hero: Hero; scale?: number; animate?: boolean }) => (
  <PixelSprite
    base={heroSprite(props.hero.classId, props.hero.gender)}
    scale={props.scale ?? 2}
    crop={HERO_CROP}
    animate={props.animate}
    ghost={props.hero.status === 'dead'}
  />
);

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
