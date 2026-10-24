// Partículas leves da vila: fagulhas de fogueira e forja, fumaça de chaminé, vapor da
// fonte termal e o miasma roxo da caverna. Cada emissor é um preset do Phaser com liga/desliga (forja em ruína,
// chaminé de prédio que ainda não tem chaminé) e grupos para trocar de uma vez.

import Phaser from 'phaser';

export type ParticlePreset = 'sparks' | 'smoke' | 'steam' | 'miasma';

export interface EmitterSpec {
  group?: string;
  preset: ParticlePreset;
  x: number;
  y: number;
  /** Largura da boca de onde as partículas saem (px do mundo). */
  spread?: number;
  /** Altura da boca (padrão 4: uma fresta; a água da fonte é uma área). */
  spreadY?: number;
  /** Multiplica a quantidade (1 = padrão do preset). */
  rate?: number;
  depth: number;
  enabled?: () => boolean;
  /** Troca as cores do preset (fagulhas violeta na caverna, por exemplo). */
  tint?: number[];
}

interface Emitter {
  spec: EmitterSpec;
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  on: boolean;
}

/** Bolinha de fumaça borrada (as fagulhas usam o 'spark' de pixel). */
export function puffTexture(scene: Phaser.Scene): string {
  const key = 'fx/puff';
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 16);
  scene.textures.addCanvas(key, canvas);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

function config(scene: Phaser.Scene, spec: EmitterSpec): { key: string; cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig } {
  const rate = spec.rate ?? 1;
  const spread = spec.spread ?? 8;
  const spreadY = spec.spreadY ?? 4;
  // Boca do emissor: um retângulo raso; as partículas nascem em qualquer ponto dele.
  const zone = {
    type: 'random' as const,
    source: {
      getRandomPoint: (p: Phaser.Types.Math.Vector2Like) => {
        p.x = (Math.random() - 0.5) * spread;
        p.y = (Math.random() - 0.5) * spreadY;
        return p;
      },
    },
  };
  switch (spec.preset) {
    case 'sparks':
      return {
        key: 'spark',
        cfg: {
          lifespan: { min: 600, max: 1300 },
          speedY: { min: -70, max: -28 },
          speedX: { min: -14, max: 14 },
          gravityY: 18,
          scale: { start: 1.6, end: 0.3 },
          alpha: { start: 1, end: 0 },
          tint: [0xffe08a, 0xffa040, 0xff6a20],
          blendMode: Phaser.BlendModes.ADD,
          frequency: 170 / rate,
          quantity: 1,
          emitZone: zone,
        },
      };
    case 'smoke':
      return {
        key: puffTexture(scene),
        cfg: {
          lifespan: { min: 3000, max: 4400 },
          speedY: { min: -20, max: -11 },
          // Vento leve para leste: a fumaça deita para o mesmo lado em toda a vila.
          speedX: { min: 3, max: 10 },
          scale: { start: 0.6, end: 2.6 },
          // Cinza claro: a fumaça escura sumia contra telhado e gramado escuros.
          alpha: { start: 0.4, end: 0 },
          tint: [0x8c8a88, 0xa29e98],
          frequency: 520 / rate,
          quantity: 1,
          emitZone: zone,
        },
      };
    case 'steam':
      return {
        key: puffTexture(scene),
        cfg: {
          lifespan: { min: 2600, max: 4200 },
          speedY: { min: -14, max: -6 },
          speedX: { min: -4, max: 5 },
          scale: { start: 0.7, end: 2.4 },
          // Branco-ciano translúcido: some devagar enquanto sobe da água quente.
          alpha: { start: 0.26, end: 0 },
          tint: [0xe8fbff, 0xbff4f2, 0xd8f0ff],
          frequency: 240 / rate,
          quantity: 1,
          emitZone: zone,
        },
      };
    case 'miasma':
      return {
        key: puffTexture(scene),
        cfg: {
          lifespan: { min: 2600, max: 4200 },
          speedY: { min: -18, max: -6 },
          speedX: { min: -9, max: 9 },
          scale: { start: 0.5, end: 1.6 },
          alpha: { start: 0.38, end: 0 },
          tint: [0x9d4edd, 0x6a2a9a, 0xb46ae0],
          blendMode: Phaser.BlendModes.ADD,
          frequency: 260 / rate,
          quantity: 1,
          emitZone: zone,
        },
      };
  }
}

export class ParticleSystem {
  private readonly scene: Phaser.Scene;
  private readonly emitters = new Set<Emitter>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  add(spec: EmitterSpec): void {
    const { key, cfg } = config(this.scene, spec);
    if (spec.tint) cfg.tint = spec.tint;
    const emitter = this.scene.add.particles(spec.x, spec.y, key, cfg).setDepth(spec.depth);
    this.emitters.add({ spec, emitter, on: true });
  }

  /** Troca os emissores de um grupo (as chaminés de um prédio que subiu de nível). */
  setGroup(group: string, specs: EmitterSpec[]): void {
    for (const e of [...this.emitters]) {
      if (e.spec.group !== group) continue;
      e.emitter.destroy();
      this.emitters.delete(e);
    }
    for (const spec of specs) this.add({ ...spec, group });
  }

  /** Liga e desliga conforme cada emissor pede; `rate` segue a velocidade do jogo (0 = pausa). */
  update(rate: number): void {
    for (const e of this.emitters) {
      const want = (e.spec.enabled ? e.spec.enabled() : true) && rate > 0;
      if (want !== e.on) {
        e.on = want;
        if (want) e.emitter.start();
        else e.emitter.stop();
      }
      e.emitter.timeScale = Math.min(2, Math.max(0.5, rate));
    }
  }
}
