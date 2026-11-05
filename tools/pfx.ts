// Efeitos do corredor feitos com o pixelfx (github.com/patch-gg/pixelfx, MIT; ver o
// LICENSE-pixelfx.txt ao lado das folhas). Roda cada efeito, corta as margens vazias, baixa
// os quadros por segundo e grava as folhas em public/assets/vigilia/pfx/ e o índice
// src/render/lane/pfx-index.ts. Uso: npm run pfx

import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { clearFrame, composite, createFrame, createFx, type FxModule } from 'pixelfx';
import { BIOME_PALETTE, BOSS_STRIKE, STYLE_STRIKE, styleFx, type MonsterStyle } from '../src/data/attacks.ts';
import { BIOMES } from '../src/sim/index.ts';

interface Recipe {
  /** Efeito do pixelfx (categoria/nome). */
  fx: string;
  /** Quadros por segundo da folha (o efeito roda a 120 Hz por dentro de qualquer jeito). */
  fps: number;
  /** Opções do efeito (paleta, semente). */
  options?: Record<string, unknown>;
  /** Reduz a folha (2 = metade, média de 2×2): o corredor desenha este efeito menor que os outros. */
  shrink?: number;
  /** Corta o efeito neste tempo (s), esmaecendo nos últimos 0,4 s. */
  cut?: number;
  /** Quando o efeito acerta (s); sem isso, o tempo do golpe que o pixelfx traz, ou 0. */
  hit?: number;
}

/** O que o corredor usa (src/render/lane/renderer.ts). */
const RECIPES: Record<string, Recipe> = {
  // Projétil do piromante.
  fireball: { fx: 'fire/fireball', fps: 20 },
  // Ataque do clérigo: a luz cai em cima do alvo.
  smite: { fx: 'holy/smite', fps: 20 },
  // Projétil dos monstros da retaguarda, na metade do tamanho.
  'void-orb': { fx: 'shadow/void-orb', fps: 15, shrink: 2 },
  // Golpe crítico, de quem for.
  'crit-hit': { fx: 'impacts/crit-hit', fps: 24 },
  // Monstro morto que deixa ouro.
  'coin-drop': { fx: 'spawn/coin-drop', fps: 15 },
  // Cura, aos pés do herói.
  'healing-bloom': { fx: 'nature/healing-bloom', fps: 20 },
  // Ataques dos heróis por estágio (§9.9, src/data/attacks.ts).
  'sword-slash': { fx: 'melee/sword-slash', fps: 20 },
  'spin-slash': { fx: 'melee/spin-slash', fps: 20 },
  'shield-block': { fx: 'impacts/shield-block', fps: 20 },
  thrust: { fx: 'melee/thrust', fps: 20 },
  'spear-sweep': { fx: 'melee/spear-sweep', fps: 20 },
  'double-slash': { fx: 'melee/double-slash', fps: 20 },
  'heavy-cleave': { fx: 'melee/heavy-cleave', fps: 15, cut: 1.4 },
  arrow: { fx: 'projectiles/arrow', fps: 20 },
  'star-fall': { fx: 'arcane/star-fall', fps: 15, cut: 2, hit: 0.3 },
  'fire-ring': { fx: 'fire/fire-ring', fps: 15, cut: 2.2 },
  meteor: { fx: 'fire/meteor', fps: 15, cut: 2.4, hit: 0.67 },
  'holy-pillar': { fx: 'holy/holy-pillar', fps: 15, cut: 2.2, hit: 0.4 },
  'heal-aoe': { fx: 'holy/heal-aoe', fps: 15, cut: 2 },
};

// Golpes dos monstros: cada estilo na paleta de cada bioma, e o golpe de cada chefe na do bioma dele.
const STYLE_SOURCE: Record<MonsterStyle, string> = { garra: 'melee/claw-swipe', arma: 'melee/sword-slash', pancada: 'impacts/blunt-hit' };
for (let b = 0; b < BIOME_PALETTE.length; b++) {
  const pal = BIOME_PALETTE[b]!;
  for (const style of Object.keys(STYLE_STRIKE) as MonsterStyle[]) {
    // A poeira clara da pancada cobria os heróis: escura, do bioma, e cortada cedo.
    const options = style === 'pancada' ? { palette: [...pal], dust: pal[1], clod: pal[0], warm: pal[3] } : { palette: [...pal] };
    RECIPES[styleFx(style, b)] = { fx: STYLE_SOURCE[style], fps: 15, options, ...(style === 'pancada' ? { cut: 0.5 } : {}) };
  }
}
BIOMES.forEach((biome, b) => {
  const strike = BOSS_STRIKE[biome.boss.id];
  if (strike) RECIPES[strike.fx] = { fx: strike.source, fps: 15, cut: 1.6, options: { palette: [...BIOME_PALETTE[b]!] } };
});

const OUT = new URL('../public/assets/vigilia/pfx/', import.meta.url);
const INDEX = new URL('../src/render/lane/pfx-index.ts', import.meta.url);

/** Esmaece a luz perto da borda da tela do efeito, como o render do pixelfx faz nas folhas. */
function edgeFade(light: Uint32Array, w: number, h: number, E = 8): void {
  for (let y = 0; y < h; y++) {
    const ey = Math.min(y, h - 1 - y);
    for (let x = 0; x < w; x++) {
      const e = Math.min(ey, x, w - 1 - x);
      if (e >= E) {
        x = w - 1 - E;
        continue;
      }
      const i = y * w + x;
      const l = light[i]!;
      if (!(l & 0xffffff)) continue;
      const u = (e + 0.5) / E;
      const k = u * u * (3 - 2 * u);
      light[i] = (l & 0xff000000) | Math.round((l & 255) * k) | (Math.round(((l >>> 8) & 255) * k) << 8) | (Math.round(((l >>> 16) & 255) * k) << 16);
    }
  }
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer): number => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function png(rgba: Uint8ClampedArray, w: number, h: number): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

interface Entry {
  file: string;
  /** Segundos do primeiro quadro até o acerto. */
  hit: number;
  frame: [number, number];
  cols: number;
  frames: number;
  fps: number;
  loop: boolean;
  pivot: [number, number];
}

mkdirSync(OUT, { recursive: true });
const index: Record<string, Entry> = {};
for (const [id, r] of Object.entries(RECIPES)) {
  const mod = (await import(`pixelfx/fx/${r.fx}`)) as FxModule;
  const { meta } = mod;
  const [W, H] = meta.size;
  const [OX, OY] = meta.origin;
  const length = Math.min(meta.duration, r.cut ?? Infinity);
  const n = Math.max(1, Math.round(length * r.fps) + (meta.loop ? 0 : 1));
  const inst = createFx(mod, { x: OX, y: OY, ...(r.options ?? {}) });
  const frame = createFrame(W, H);
  const shots: Uint8ClampedArray[] = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) inst.update(1 / r.fps);
    clearFrame(frame);
    inst.draw(frame);
    edgeFade(frame.light, W, H);
    const rgba = composite(frame, new Uint8ClampedArray(W * H * 4), null);
    // Cortado antes do fim: esmaece nos últimos 0,4 s em vez de sumir de uma vez.
    if (r.cut !== undefined && r.cut < meta.duration) {
      const k = Math.min(1, Math.max(0, (length - i / r.fps) / 0.4));
      if (k < 1) for (let j = 3; j < rgba.length; j += 4) rgba[j] = rgba[j]! * k;
    }
    shots.push(rgba);
  }
  // Sem os quadros vazios do fim (o efeito some antes da duração) e sem margem vazia.
  const empty = (s: Uint8ClampedArray): boolean => !s.some((v, i) => i % 4 === 3 && v > 0);
  while (!meta.loop && shots.length > 1 && empty(shots.at(-1)!)) shots.pop();
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (const s of shots)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (s[(y * W + x) * 4 + 3]! > 0) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
  const k = r.shrink ?? 1;
  // Recorte em múltiplos da redução, para a média de k×k não cair no meio de um quadro.
  x0 -= x0 % k;
  y0 -= y0 % k;
  const w = Math.ceil((x1 - x0 + 1) / k) * k;
  const h = Math.ceil((y1 - y0 + 1) / k) * k;
  const fw = w / k;
  const fh = h / k;
  const cols = Math.max(1, Math.ceil(Math.sqrt((shots.length * fh) / fw)));
  const rows = Math.ceil(shots.length / cols);
  const sheet = new Uint8ClampedArray(cols * fw * rows * fh * 4);
  shots.forEach((s, i) => {
    const ox = (i % cols) * fw;
    const oy = Math.floor(i / cols) * fh;
    for (let y = 0; y < fh; y++)
      for (let x = 0; x < fw; x++) {
        // Média de k×k com alfa pré-multiplicado (o brilho não escurece na borda).
        let r = 0, g = 0, b = 0, a = 0;
        for (let dy = 0; dy < k; dy++)
          for (let dx = 0; dx < k; dx++) {
            const sx = x0 + x * k + dx;
            const sy = y0 + y * k + dy;
            if (sx >= W || sy >= H) continue;
            const j = (sy * W + sx) * 4;
            const al = s[j + 3]! / 255;
            r += s[j]! * al;
            g += s[j + 1]! * al;
            b += s[j + 2]! * al;
            a += al;
          }
        const o = ((oy + y) * cols * fw + ox + x) * 4;
        if (a > 0) sheet.set([r / a, g / a, b / a, (a / (k * k)) * 255], o);
      }
  });
  const file = `pfx/${id}.png`;
  const bytes = png(sheet, cols * fw, rows * fh);
  writeFileSync(new URL(`${id}.png`, OUT), bytes);
  index[id] = { file, hit: r.hit ?? mod.act?.hits?.[0]?.t ?? 0, frame: [fw, fh], cols, frames: shots.length, fps: r.fps, loop: meta.loop, pivot: [(OX - x0) / k, (OY - y0) / k] };
  console.log(`${id.padEnd(14)} ${r.fx.padEnd(22)} ${shots.length} quadros ${fw}×${fh}  ${(bytes.length / 1024).toFixed(0)} KB`);
}
copyFileSync(new URL('../node_modules/pixelfx/LICENSE', import.meta.url), new URL('LICENSE-pixelfx.txt', OUT));
copyFileSync(new URL('../node_modules/pixelfx/NOTICE.md', import.meta.url), new URL('NOTICE-pixelfx.md', OUT));

const body = JSON.stringify(index, null, 2);
writeFileSync(
  INDEX,
  '// Gerado por tools/pfx.ts (npm run pfx): as folhas dos efeitos do pixelfx no corredor.\n// Não editar à mão.\n\n' +
    `export const PFX = ${body} as const;\n\nexport type PfxId = keyof typeof PFX;\n`,
);
