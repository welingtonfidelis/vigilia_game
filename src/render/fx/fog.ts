// Neblina rasteira (Fase 4 do visual 2.5D): bancos de névoa que passam devagar sobre o
// cemitério e nas bordas da floresta. Cada banco é um retângulo do mundo com alguns
// tufos de névoa (textura gerada aqui) que andam com o vento e dão a volta no banco.

import Phaser from 'phaser';

export interface FogBank {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Quantos tufos de névoa. */
  count: number;
  /** Opacidade de dia e de noite. */
  day: number;
  night: number;
  /** Vento em px do mundo por segundo (positivo = para leste). */
  speed: number;
  depth: number;
  /** Escala dos tufos (a textura tem 192×96 px). */
  scale?: number;
  /** Cor da névoa (padrão cinza-azulado claro). */
  tint?: number;
}

interface Puff {
  image: Phaser.GameObjects.Image;
  bank: FogBank;
  speed: number;
  phase: number;
  base: number;
}

const VARIANTS = 3;

/** Tufo de névoa: vários degradês sobrepostos, mais largo que alto, borda bem macia. */
function fogTexture(scene: Phaser.Scene, variant: number): string {
  const key = `fx/fog-${variant}`;
  if (scene.textures.exists(key)) return key;
  const w = 192;
  const h = 96;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  let s = 17 + variant * 101;
  const rnd = (): number => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < 9; i++) {
    const cx = w * (0.22 + 0.56 * rnd());
    const cy = h * (0.4 + 0.2 * rnd());
    const r = h * (0.22 + 0.2 * rnd());
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,0.32)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  scene.textures.addCanvas(key, canvas);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

export class FogSystem {
  private readonly scene: Phaser.Scene;
  private readonly puffs: Puff[] = [];
  private clock = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  add(bank: FogBank): void {
    for (let i = 0; i < bank.count; i++) {
      const scale = (bank.scale ?? 1.4) * (0.8 + 0.5 * Math.random());
      const image = this.scene.add
        .image(bank.x + Math.random() * bank.w, bank.y + Math.random() * bank.h, fogTexture(this.scene, i % VARIANTS))
        .setScale(scale, scale * (0.8 + 0.3 * Math.random()))
        .setTint(bank.tint ?? 0xd6dee4)
        .setDepth(bank.depth)
        .setAlpha(0);
      this.puffs.push({ image, bank, speed: bank.speed * (0.7 + 0.6 * Math.random()), phase: Math.random() * Math.PI * 2, base: 0.7 + 0.3 * Math.random() });
    }
  }

  /** `rate` segue a velocidade do jogo (0 = parado); `night` de 0 a 1. */
  update(dt: number, rate: number, night: number): void {
    this.clock += dt * rate;
    for (const p of this.puffs) {
      const b = p.bank;
      const half = p.image.displayWidth / 2;
      let x = p.image.x + p.speed * dt * rate;
      if (x - half > b.x + b.w) x = b.x - half;
      if (x + half < b.x) x = b.x + b.w + half;
      p.image.x = x;
      const breathe = 0.75 + 0.25 * Math.sin(this.clock * 0.25 + p.phase);
      p.image.setAlpha((b.day + (b.night - b.day) * night) * p.base * breathe);
    }
  }
}
