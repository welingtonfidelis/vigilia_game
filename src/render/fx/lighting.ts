// Iluminação da vila (Fase 2 do visual 2.5D).
//
// Um mapa de luz em baixa resolução cobre o mundo e é multiplicado sobre a cena: de dia
// é quase branco (só uma névoa fria), à noite vira um azul-esverdeado escuro. Cada fonte
// de luz (LightSource) soma a sua cor no mapa com um degradê radial, então o chão e as
// paredes em volta ficam tingidos pela fogueira, pela forja ou pela água da fonte, e o
// resto da floresta afunda no escuro. Opcionalmente a fonte tem um brilho aditivo (halo)
// por cima de tudo, para a chama ou a janela parecerem acesas mesmo de dia.

import Phaser from 'phaser';

export interface LightSpec {
  /** Para agrupar e trocar luzes juntas (as janelas de um prédio, por exemplo). */
  group?: string;
  x: number;
  y: number;
  /** Cor da luz (0xRRGGBB). */
  color: number;
  /** Raio em px do mundo. */
  radius: number;
  /** 0 a 1: quanto a luz clareia o mapa no centro. */
  intensity: number;
  /** Tremulação de chama: amplitude (0 a 1) da oscilação de raio e força. */
  flicker?: number;
  /** Pulsação lenta: período em ms e quanto a força cai no vale (0 a 1). */
  pulse?: { period: number; depth: number };
  /** Só acende com a noite (janelas, lampiões); senão acende sempre que estiver escuro o bastante. */
  nightOnly?: boolean;
  /** Halo aditivo por cima da cena: escala do brilho e força de dia e de noite. */
  halo?: { scaleX: number; scaleY: number; day: number; night: number; dy?: number };
  /** Luz que anda (a lanterna do prefeito): devolve a posição de agora. */
  follow?: () => { x: number; y: number };
  /** Liga e desliga sem remover (a forja de um ferreiro em ruína). */
  enabled?: () => boolean;
  /** Multiplica a força agora (a caverna brilha mais com a corrupção). */
  gain?: () => number;
}

/** Uma luz registrada no sistema. */
export class LightSource {
  readonly spec: LightSpec;
  readonly halo: Phaser.GameObjects.Image | null;
  /** Fase aleatória para duas chamas iguais não tremularem juntas. */
  private readonly phase = Math.random() * 1000;
  x: number;
  y: number;
  /** Força de agora (0 a 1), já com noite, tremulação e pulsação. */
  strength = 0;
  /** Raio de agora, já com a tremulação. */
  radius: number;

  constructor(scene: Phaser.Scene, spec: LightSpec, haloDepth: number) {
    this.spec = spec;
    this.x = spec.x;
    this.y = spec.y;
    this.radius = spec.radius;
    this.halo = spec.halo
      ? scene.add
          .image(spec.x, spec.y + (spec.halo.dy ?? 0), 'glow')
          .setTint(spec.color)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(haloDepth)
          .setScale(spec.halo.scaleX, spec.halo.scaleY)
          .setAlpha(0)
      : null;
  }

  update(time: number, night: number): void {
    const s = this.spec;
    if (s.follow) {
      const p = s.follow();
      this.x = p.x;
      this.y = p.y;
    }
    const on = s.enabled ? s.enabled() : true;
    const t = time + this.phase;
    let k = 1;
    if (s.flicker) {
      // Duas senoides fora de passo e um tremor fino: chama viva, sem cara de metrônomo.
      const wobble = Math.sin(t / 97) * 0.5 + Math.sin(t / 53 + 1.7) * 0.3 + Math.sin(t / 23) * 0.2;
      k *= 1 - s.flicker * (0.5 + 0.5 * wobble);
    }
    if (s.pulse) k *= 1 - s.pulse.depth * (0.5 + 0.5 * Math.sin((t / s.pulse.period) * Math.PI * 2));
    const nightGate = s.nightOnly ? Math.min(1, Math.max(0, (night - 0.1) / 0.5)) : 1;
    this.strength = on ? s.intensity * k * nightGate * (s.gain ? s.gain() : 1) : 0;
    this.radius = s.radius * (s.flicker ? 0.94 + 0.06 * k : 1);
    if (this.halo) {
      const h = s.halo!;
      const base = h.day + (h.night - h.day) * night;
      this.halo
        .setVisible(on)
        .setPosition(this.x, this.y + (h.dy ?? 0))
        .setAlpha(on ? base * k * (s.nightOnly ? nightGate : 1) : 0);
    }
  }

  destroy(): void {
    this.halo?.destroy();
  }
}

export interface LightingOptions {
  /** Área coberta pelo mapa (o mundo e uma margem para telas maiores que a vila). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Profundidade do mapa de luz (acima de tudo que está no chão, abaixo de rótulos). */
  depth: number;
  /** Profundidade dos halos aditivos. */
  haloDepth: number;
  /** px do mundo por texel do mapa: o degradê é suave, 4 basta e custa pouco. */
  resolution?: number;
}

/** Cor do mapa de dia (névoa fria leve) e de noite fechada (multiplicação). */
const DAY = { r: 0.9, g: 0.92, b: 0.98 };
// #1a2421 a 55% sobre branco, um pouco mais fundo: a floresta some, a vila fica de pé.
const NIGHT = { r: 0.36, g: 0.42, b: 0.44 };

export class LightingSystem {
  private readonly scene: Phaser.Scene;
  private readonly opts: LightingOptions;
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly stamp: Phaser.GameObjects.Image;
  private readonly lights = new Set<LightSource>();
  private readonly res: number;

  constructor(scene: Phaser.Scene, opts: LightingOptions) {
    this.scene = scene;
    this.opts = opts;
    this.res = opts.resolution ?? 4;
    this.rt = scene.add
      .renderTexture(opts.x, opts.y, Math.ceil(opts.width / this.res), Math.ceil(opts.height / this.res))
      .setOrigin(0, 0)
      .setScale(this.res)
      .setDepth(opts.depth)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.rt.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.stamp = scene.make.image({ x: 0, y: 0, key: falloffTexture(scene), add: false }).setBlendMode(Phaser.BlendModes.ADD);
  }

  add(spec: LightSpec): LightSource {
    const light = new LightSource(this.scene, spec, this.opts.haloDepth);
    this.lights.add(light);
    return light;
  }

  /** Troca todas as luzes de um grupo (janelas de um prédio que subiu de nível…). */
  setGroup(group: string, specs: LightSpec[]): void {
    for (const light of [...this.lights]) {
      if (light.spec.group !== group) continue;
      light.destroy();
      this.lights.delete(light);
    }
    for (const spec of specs) this.add({ ...spec, group });
  }

  remove(light: LightSource): void {
    light.destroy();
    this.lights.delete(light);
  }

  /** Redesenha o mapa: chamar todo quadro com o relógio da cena e o quanto é noite (0 a 1). */
  update(time: number, night: number): void {
    const mix = (a: number, b: number) => a + (b - a) * night;
    const ambient = Phaser.Display.Color.GetColor(
      Math.round(mix(DAY.r, NIGHT.r) * 255),
      Math.round(mix(DAY.g, NIGHT.g) * 255),
      Math.round(mix(DAY.b, NIGHT.b) * 255),
    );
    const { x: ox, y: oy } = this.opts;
    const view = this.scene.cameras.main.worldView;
    const texSize = this.stamp.width;
    this.rt.clear();
    this.rt.fill(ambient, 1);
    this.rt.beginDraw();
    for (const light of this.lights) {
      light.update(time, night);
      if (light.strength <= 0.01) continue;
      // Fora da tela não pinta (o halo já se esconde sozinho pela câmera).
      if (light.x + light.radius < view.x || light.x - light.radius > view.right || light.y + light.radius < view.y || light.y - light.radius > view.bottom) continue;
      // Quanto clareia depende de quão escuro está: de dia não sobra nada para clarear.
      // Teto abaixo de 1: a cor da luz soma no mapa sem estourar em branco (o laranja fica laranja).
      this.stamp
        .setTint(light.spec.color)
        .setAlpha(Math.min(0.85, light.strength * (0.25 + 0.75 * night)))
        .setScale((light.radius * 2) / this.res / texSize);
      this.rt.batchDraw(this.stamp, (light.x - ox) / this.res, (light.y - oy) / this.res);
    }
    this.rt.endDraw();
  }
}

/** Degradê radial branco → transparente, com queda suave (quase quadrática). */
function falloffTexture(scene: Phaser.Scene): string {
  const key = 'light/falloff';
  if (scene.textures.exists(key)) return key;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addCanvas(key, canvas);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}
