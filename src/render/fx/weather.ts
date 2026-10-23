// Clima das estações na vila (M6 F6): chuva em diagonal com respingos no chão, neve, folhas e
// pétalas. Os emissores cobrem a vista da câmera (a zona anda com ela) e a quantidade segue o
// clima do dia; o relâmpago é um clarão curto na câmera. Só tela: o clima sai de src/sim/weather.ts.

import Phaser from 'phaser';
import type { WeatherKind } from '../../sim/index.ts';

export type WeatherQuality = 'completo' | 'leve' | 'desligado';

type Kind = 'rain' | 'splash' | 'snow' | 'leaf' | 'petal';

/** Texturas de pixel das partículas (desenhadas aqui, para não depender do pack). */
function textures(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  make('fx/weather/rain', 2, 9, (g) => {
    g.fillStyle(0xc8d8ea, 0.55).fillRect(0, 0, 1, 9);
    g.fillStyle(0xe8f0f8, 0.8).fillRect(0, 5, 1, 4);
  });
  make('fx/weather/splash', 5, 3, (g) => {
    g.fillStyle(0xdde8f4, 0.8).fillRect(0, 1, 1, 1).fillRect(4, 1, 1, 1).fillRect(1, 0, 3, 1);
  });
  make('fx/weather/snow', 2, 2, (g) => g.fillStyle(0xf4f8ff, 1).fillRect(0, 0, 2, 2));
  make('fx/weather/leaf', 4, 3, (g) => {
    g.fillStyle(0xffffff, 1).fillRect(1, 0, 2, 1).fillRect(0, 1, 4, 1).fillRect(1, 2, 2, 1);
  });
  make('fx/weather/petal', 3, 2, (g) => g.fillStyle(0xffffff, 1).fillRect(0, 0, 3, 1).fillRect(1, 1, 1, 1));
}

/** Quanto de cada partícula o clima pede (por segundo, na qualidade completa). */
function rates(kind: WeatherKind, season: number): Record<Kind, number> {
  const r: Record<Kind, number> = { rain: 0, splash: 0, snow: 0, leaf: 0, petal: 0 };
  if (kind === 'garoa') r.rain = 70;
  if (kind === 'chuva') r.rain = 260;
  if (kind === 'tempestade') r.rain = 520;
  r.splash = r.rain * 0.35;
  if (kind === 'neve') r.snow = 90;
  if (kind === 'nevasca') r.snow = 300;
  if (season === 2) r.leaf = kind === 'vento' ? 26 : 12;
  if (season === 0 && kind !== 'garoa') r.petal = 10;
  return r;
}

export class WeatherSystem {
  private readonly scene: Phaser.Scene;
  private readonly emitters = new Map<Kind, Phaser.GameObjects.Particles.ParticleEmitter>();
  /** Vista da câmera com folga: a boca de todos os emissores. */
  private readonly zone = new Phaser.Geom.Rectangle(0, 0, 100, 100);
  private readonly ground = new Phaser.Geom.Rectangle(0, 0, 100, 100);
  private nextFlash = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;
    textures(scene);
    const inside = (r: Phaser.Geom.Rectangle) => ({
      type: 'random' as const,
      source: {
        getRandomPoint: (p: Phaser.Types.Math.Vector2Like) => {
          p.x = r.x + Math.random() * r.width;
          p.y = r.y + Math.random() * r.height;
          return p;
        },
      },
    });
    const top = inside(this.zone);
    const floor = inside(this.ground);
    const add = (kind: Kind, key: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig): void => {
      const e = scene.add.particles(0, 0, key, { ...cfg, emitting: false }).setDepth(depth);
      this.emitters.set(kind, e);
    };
    // Chuva: cai em diagonal (vento de oeste) e atravessa a vista inteira.
    add('rain', 'fx/weather/rain', {
      lifespan: 1600,
      speedY: { min: 620, max: 760 },
      speedX: { min: 110, max: 150 },
      rotate: -11,
      scale: 2,
      alpha: { start: 0.75, end: 0.5 },
      emitZone: top,
    });
    add('splash', 'fx/weather/splash', {
      lifespan: 220,
      scale: { start: 2, end: 1 },
      alpha: { start: 0.8, end: 0 },
      emitZone: floor,
    });
    add('snow', 'fx/weather/snow', {
      lifespan: 14000,
      speedY: { min: 32, max: 70 },
      speedX: { min: -18, max: 26 },
      scale: { min: 1, max: 2.2 },
      alpha: { start: 0.95, end: 0.75 },
      emitZone: top,
    });
    add('leaf', 'fx/weather/leaf', {
      lifespan: 11000,
      speedY: { min: 22, max: 55 },
      speedX: { min: 40, max: 120 },
      rotate: { min: 0, max: 360 },
      scale: 2,
      tint: [0xc8742c, 0xa6501e, 0xd8a03a, 0x8a5a2a],
      emitZone: top,
    });
    add('petal', 'fx/weather/petal', {
      lifespan: 12000,
      speedY: { min: 14, max: 36 },
      speedX: { min: 18, max: 48 },
      rotate: { min: 0, max: 360 },
      scale: 2,
      tint: [0xf0c8d8, 0xffffff, 0xf4e0a0],
      emitZone: top,
    });
  }

  /** Acompanha a câmera e acerta a quantidade de cada partícula. */
  update(cam: Phaser.Cameras.Scene2D.Camera, kind: WeatherKind, season: number, quality: WeatherQuality, paused: boolean): void {
    const v = cam.worldView;
    // A chuva e a neve nascem acima da vista e um pouco à esquerda (o vento as traz para dentro).
    this.zone.setTo(v.x - v.width * 0.25, v.y - 120, v.width * 1.3, 40);
    this.ground.setTo(v.x, v.y + v.height * 0.1, v.width, v.height * 0.9);
    const want = rates(kind, season);
    const k = quality === 'desligado' ? 0 : quality === 'leve' ? 0.5 : 1;
    for (const [name, e] of this.emitters) {
      const perSecond = paused ? 0 : want[name] * k;
      if (perSecond <= 0) {
        if (e.emitting) e.stop();
        continue;
      }
      // Quantidade por disparo para manter a frequência num valor razoável.
      const quantity = Math.max(1, Math.round(perSecond / 30));
      e.frequency = (1000 * quantity) / perSecond;
      e.quantity = quantity;
      if (!e.emitting) e.start();
    }
  }

  /** Relâmpago na tempestade: um clarão curto de tempos em tempos (devolve true quando houve). */
  lightning(now: number, cam: Phaser.Cameras.Scene2D.Camera, quality: WeatherQuality): boolean {
    if (quality !== 'completo') return false;
    if (now < this.nextFlash) return false;
    const first = this.nextFlash === 0;
    this.nextFlash = now + 6000 + Math.random() * 12000;
    if (first) return false;
    cam.flash(140, 230, 236, 255, true);
    this.scene.time.delayedCall(220, () => cam.flash(90, 200, 210, 240, true));
    return true;
  }
}
