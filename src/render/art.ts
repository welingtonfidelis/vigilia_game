// Texturas pequenas que os pacotes não têm (lápide, fogueira, berrante, ícones de atividade),
// desenhadas pixel a pixel no mesmo tamanho de arte (16 px) para casar com Tiny Town e 0x72.

import Phaser from 'phaser';
import type { ActivityKind } from '../sim/index.ts';

type Palette = Record<string, readonly [number, number?]>;

export const ICON_KINDS: ActivityKind[] = ['descansar', 'beber', 'rezar', 'comprar', 'treinar', 'tumulo', 'socializar', 'aguardar'];

/** Desenha um mapa de caracteres como textura (um caractere = um pixel da arte). */
function pixels(scene: Phaser.Scene, key: string, rows: readonly string[], palette: Palette): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const w = Math.max(...rows.map((r) => r.length));
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const p = palette[row[x]!];
      if (!p) continue;
      g.fillStyle(p[0], p[1] ?? 1);
      g.fillRect(x, y, 1, 1);
    }
  });
  g.generateTexture(key, w, rows.length);
  g.destroy();
}

const BUBBLE = [
  '.bbbbbbbbbb.',
  'bbbbbbbbbbbb',
  'bbbbbbbbbbbb',
  'bbbbbbbbbbbb',
  'bbbbbbbbbbbb',
  'bbbbbbbbbbbb',
  'bbbbbbbbbbbb',
  'bbbbbbbbbbbb',
  '.bbbbbbbbbb.',
  '....bbbb....',
  '.....bb.....',
];

const GLYPHS: Record<string, readonly string[]> = {
  descansar: ['zzzz....', '...z....', '..z..zzz', '.z.....z', 'zzzz..z.', '.....zzz'],
  beber: ['.wwwww..', '.mmmmm..', '.mmmmmmm', '.mmmmm.m', '.mmmmmmm', '.mmmmm..'],
  rezar: ['...gg...', '.gggggg.', '...gg...', '...gg...', '...gg...', '...gg...'],
  comprar: ['..gggg..', '.gyyyyg.', '.gygyyg.', '.gygyyg.', '.gyyyyg.', '..gggg..'],
  treinar: ['......ss', '.....ss.', '....ss..', '.h.ss...', '..hh....', '.h..h...'],
  tumulo: ['...tt...', '...tt...', '..tttt..', '.tttttt.', '.tttttt.', '..tttt..'],
  socializar: ['........', '........', 'kk.kk.kk', 'kk.kk.kk', '........', '........'],
  aguardar: ['.prrrr..', '.prrrrr.', '.prrrr..', '.p......', '.p......', '.p......'],
};

const GLYPH_PALETTE: Palette = {
  b: [0xe8dcc0],
  z: [0x3a4a7a],
  w: [0xfaf6ea],
  m: [0xb87a2a],
  g: [0x9a7420],
  y: [0xe9c049],
  s: [0x9aa3ab],
  h: [0x6a4422],
  t: [0x4a7ac8],
  k: [0x2a2420],
  p: [0x3a2a1a],
  r: [0x9a2a2a],
};

export function makeTextures(scene: Phaser.Scene): void {
  pixels(scene, 'shadow', ['..xxxxxxxx..', '.xxxxxxxxxx.', '.xxxxxxxxxx.', '..xxxxxxxx..'], { x: [0x000000, 0.38] });
  pixels(scene, 'ring', ['....yyyyyyyy....', '..yy........yy..', 'yy............yy', 'yy............yy', '..yy........yy..', '....yyyyyyyy....'], {
    y: [0xffd86a],
  });
  pixels(
    scene,
    'grave',
    [
      '....dddd....',
      '..ddssssdd..',
      '.dssssllssd.',
      '.dssssllssd.',
      '.dsllllllsd.',
      '.dsllllllsd.',
      '.dssssllssd.',
      '.dssssllssd.',
      '.dssssllssd.',
      '.dsssssssed.',
      '.dsssssseed.',
      'dddddddddddd',
    ],
    { d: [0x3e3e46], s: [0x7e7e88], l: [0x55555e], e: [0x4a5a3a] },
  );
  pixels(scene, 'mound', ['...bbbbbbbb...', '.bbccbbbbccbb.', 'bbbbbbbbbbbbbb', '.bbbbbbbbbbbb.'], { b: [0x3a2c20], c: [0x4e3c2a] });
  pixels(
    scene,
    'horn',
    [
      'oo..............',
      'owo.............',
      'owwoo...........',
      'owwwwoo.........',
      'owwwwwwooooo....',
      '.owwwwwwwwwgoo..',
      '..oowwwwwwwgwwoo',
      '....ooooooooooo.',
    ],
    { o: [0x2a2018], w: [0xd8ccb0], g: [0x6a6a70] },
  );
  pixels(scene, 'paper', ['..r..', 'wwwww', 'wllww', 'wwwww', 'wllww', 'wwwww'], { w: [0xe8dcc0], l: [0x7a6a50], r: [0x9a2a2a] });
  pixels(
    scene,
    'campfire',
    ['..s.ssss.s..', '.sbbbbbbbbs.', 'sbbbllllbbbs', '.sllbbbbllss', '..ssssssss..'],
    { s: [0x6a6a70], b: [0x2a1a12], l: [0x6a4422] },
  );
  const fire = { y: [0xffe680], o: [0xff9a2a], r: [0xc8401a] } as const;
  pixels(scene, 'fire0', ['....y.....', '...yo.....', '...oyo..y.', '..oyyo.yo.', '..oyyyooo.', '.ooyyyyyo.', '.orryyyro.', '..rrrrrr..'], fire);
  pixels(scene, 'fire1', ['.....y....', '....oy....', '.y.oyo....', '.oyoyyo...', '.ooyyyoo..', '.ooyyyyyo.', '.orryyyro.', '..rrrrrr..'], fire);
  pixels(scene, 'fire2', ['...y......', '...oy..y..', '..oyo.oy..', '..oyyoyyo.', '.ooyyyyoo.', '.ooyyyyyo.', '.orryyyro.', '..rrrrrr..'], fire);
  pixels(scene, 'spark', ['xx', 'xx'], { x: [0xffffff] });
  for (const kind of ICON_KINDS) {
    const glyph = GLYPHS[kind]!;
    const rows = BUBBLE.map((row, y) => {
      const g = glyph[y - 1];
      if (!g) return row;
      return row.slice(0, 2) + [...g].map((c, x) => (c === '.' ? row[x + 2] : c)).join('') + row.slice(10);
    });
    pixels(scene, `icon-${kind}`, rows, GLYPH_PALETTE);
  }
  // Brilho suave (luzes à noite): filtrado linear, senão vira um quadrado serrilhado.
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let r = 32; r > 0; r -= 2) {
    g.fillStyle(0xffffff, 0.06);
    g.fillCircle(32, 32, r);
  }
  g.generateTexture('glow', 64, 64);
  g.destroy();
  scene.textures.get('glow').setFilter(Phaser.Textures.FilterMode.LINEAR);
}
