// Texturas pequenas que o pack não tem (lápide, fogueira, berrante, ícones de atividade),
// desenhadas pixel a pixel no mesmo tamanho de arte (16 px) do pack.

import Phaser from 'phaser';
import type { ActivityKind, Citizen, CitizenJob, Gender } from '../sim/index.ts';

type Palette = Record<string, readonly [number, number?]>;

export const ICON_KINDS: ActivityKind[] = ['descansar', 'beber', 'rezar', 'comprar', 'treinar', 'tumulo', 'socializar', 'aguardar', 'tratar', 'termas'];

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
  tratar: ['...rr...', '...rr...', '.rrrrrr.', '.rrrrrr.', '...rr...', '...rr...'],
  termas: ['c..c..c.', '.c..c...', '..c..c..', '........', '.aaaaaa.', 'aaaaaaaa'],
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
  c: [0xd8f2ec],
  a: [0x3a8a90],
};

export type VillagerLook = 'lavrador' | 'artesa' | 'acolito' | 'guarda';

interface VillagerArt {
  rows: readonly string[];
  step: readonly string[];
  palettes: Record<Gender, Palette>;
}

/** Pele, contorno, olho e botas valem para todos; cada ofício troca o resto. */
const VILLAGER_BASE: Palette = {
  o: [0x241a14],
  s: [0xe0b088],
  e: [0x241a14],
  b: [0x3a2418],
};

const VILLAGER_ART: Record<VillagerLook, VillagerArt> = {
  lavrador: {
    rows: [
      '....aaaaaaaa....',
      '...aaaaaaaaaa...',
      '.....aaaaaa.....',
      '....hhhhhhhh....',
      '....osssssso....',
      '....osesseso....',
      '....osssssso....',
      '.....osssso.....',
      '....otttttto....',
      '...otttttttto...',
      '...otttttttto...',
      '...otttttttto...',
      '...otttttttto...',
      '...otttggttto...',
      '...otttttttto...',
      '....otttttto....',
      '....oppppppo....',
      '....opp..ppo....',
      '....opp..ppo....',
      '....obb..bbo....',
      '....obb..bbo....',
    ],
    step: [
      '....oppppppo....',
      '...opp...ppo....',
      '...opp...ppo....',
      '...obb...bbo....',
      '...obb...bbo....',
    ],
    palettes: {
      m: {'h': [0x6a4422], 't': [0x5a7a4a], 'p': [0x4a3a2a], 'a': [0xc8a050], 'g': [0xc8a050]},
      f: {'h': [0x965a3a], 't': [0x7a8a4a], 'p': [0x5a3a2a], 'a': [0xd8b060], 'g': [0xd8b060]},
    },
  },
  artesa: {
    rows: [
      '....cccccccc....',
      '...cchhhhhhcc...',
      '....hhhhhhhh....',
      '....osssssso....',
      '....osesseso....',
      '....osssssso....',
      '....osssssso....',
      '.....osssso.....',
      '....otttttto....',
      '...otttaattto...',
      '...otttaattto...',
      '...otttaattto...',
      '...otttaattto...',
      '...otttggttto...',
      '...otttttttto...',
      '....otttttto....',
      '...oppppppppo...',
      '...oppppppppo...',
      '...oppppppppo...',
      '....obbbbbbo....',
      '.....obbbbo.....',
    ],
    step: [
      '...oppppppppo...',
      '...oppppppppo...',
      '...oppppppppo...',
      '....obbbbbbo....',
      '.....obbbbo.....',
    ],
    palettes: {
      m: {'h': [0x5a3a22], 'c': [0x8a3a3a], 't': [0x5a4a6a], 'p': [0x4a3a5a], 'a': [0xe8e0d0], 'g': [0xc8a050]},
      f: {'h': [0x7a4a2a], 'c': [0x4a6a8a], 't': [0x6a4a6a], 'p': [0x5a3a5a], 'a': [0xf0e8d8], 'g': [0xc8a050]},
    },
  },
  acolito: {
    rows: [
      '....tttttttt....',
      '...tttttttttt...',
      '...ttsssssstt...',
      '...ttsssssstt...',
      '...ttsessestt...',
      '...ttsssssstt...',
      '....ttsssstt....',
      '.....tttttt.....',
      '...tttttttttt...',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..ttttaaaatttt..',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '...tttttttttt...',
    ],
    step: [
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '..tttttttttttt..',
      '...tttttttttt...',
    ],
    palettes: {
      m: {'t': [0x4a4a6a], 'a': [0xc8a050]},
      f: {'t': [0x5a4a5a], 'a': [0xd8b060]},
    },
  },
  guarda: {
    rows: [
      '....mmmmmmmm..m.',
      '...mmmmmmmmmm.m.',
      '....mssssssm..w.',
      '....osssssso..w.',
      '....osesseso..w.',
      '....osssssso..w.',
      '....osssssso..w.',
      '.....osssso...w.',
      '...omttttttmo.w.',
      '...otttttttto.w.',
      '...otttttttto.w.',
      '...otttttttto.w.',
      '...otttttttto.w.',
      '...otttggttto.w.',
      '...otttttttto.w.',
      '....otttttto..w.',
      '....oppppppo..w.',
      '....opp..ppo..w.',
      '....opp..ppo..w.',
      '....obb..bbo..w.',
      '....obb..bbo..w.',
    ],
    step: [
      '....oppppppo..w.',
      '...opp...ppo..w.',
      '...opp...ppo..w.',
      '...obb...bbo..w.',
      '...obb...bbo..w.',
    ],
    palettes: {
      m: {'m': [0x9aa3ab], 't': [0x3a5a8a], 'p': [0x2a2a3a], 'g': [0xc8a050], 'w': [0x6a4422]},
      f: {'m': [0x9aa3ab], 't': [0x6a3a4a], 'p': [0x2a2a3a], 'g': [0xc8a050], 'w': [0x6a4422]},
    },
  },
};

const LOOK_BY_JOB: Record<CitizenJob, VillagerLook> = {
  lavrador: 'lavrador',
  pedreiro: 'lavrador',
  copeiro: 'artesa',
  ferreiro: 'artesa',
  acolito: 'acolito',
  guarda: 'guarda',
};

export const citizenLook = (citizen: Citizen): VillagerLook => LOOK_BY_JOB[citizen.job];

export const villagerTexture = (look: VillagerLook, gender: Gender, frame: 0 | 1): string =>
  `villager-${look}-${gender}-${frame}`;

/** Quatro corpos de morador, dois gêneros e dois quadros de caminhada. */
function makeVillagers(scene: Phaser.Scene): void {
  for (const [look, art] of Object.entries(VILLAGER_ART) as [VillagerLook, VillagerArt][]) {
    for (const gender of ['m', 'f'] as const) {
      for (const frame of [0, 1] as const) {
        const key = villagerTexture(look, gender, frame);
        if (scene.textures.exists(key)) continue;
        const rows = frame === 0 ? art.rows : [...art.rows.slice(0, 16), ...art.step];
        pixels(scene, key, rows, { ...VILLAGER_BASE, ...art.palettes[gender] });
      }
    }
  }
}

export function makeTextures(scene: Phaser.Scene): void {
  makeVillagers(scene);
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
  pixels(scene, 'bandage', ['.wwww.', 'wwrwww', 'wwwwww', '.wwww.'], { w: [0xf2ece0], r: [0xb83a2a] });
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
