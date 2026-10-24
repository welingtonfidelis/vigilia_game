// Prólogo animado (§9.7 do doc): seis cenas de pixel art que contam a história da vila. A
// narração e o botão Pular são DOM (src/ui/Prologue.tsx); a frase, a duração e a música de cada
// cena moram em src/data/prologue.ts. Abre por cima da vila, que dorme enquanto isso: as texturas
// e as animações que ela carregou servem às duas. Só tela, nada no mundo.

import Phaser from 'phaser';
import { PROLOGUE } from '../data/prologue.ts';
import type { UiStore } from '../ui/store.ts';
import { playArt, showArt } from './art32.ts';
import { ART_SCALE } from './assets.ts';
import { puffTexture } from './fx/particles.ts';
import { heroSpriteId, lightsTexture } from './pack.ts';

export const PROLOGUE_SCENE = 'prologue';

/** Palco de cada cena (mundo) e o quadrado do meio que aparece inteiro em qualquer tela. */
const STAGE_W = 640;
const STAGE_H = 360;
const SAFE = 260;

/** Noite: o que não é fogo nem vela sai multiplicado por este azul. */
const NIGHT = 0x7480b0;
/** Silhuetas ao longe e o que a fogueira esquenta. */
const FAR = 0x2c3552;
const WARM = 0xd8bc98;
/** A vila à noite, mais escura que a abadia (o fogo e os lampiões fazem a luz). */
const DUSK = 0x56628e;

/** Alto do penhasco nas cenas da abadia e a largura de um bloco dele. */
const TOP = 60;
const BLOCK = 64 * ART_SCALE;

type Obj = Phaser.GameObjects.GameObject;

interface AbbeySet {
  abbey: Phaser.GameObjects.Image;
  lights: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  lantern: Phaser.GameObjects.Image;
  blocks: Map<number, Obj[]>;
}

/** Brilho redondo e macio (velas, fogo, lua, o olho), somado por cima com ADD. */
function glowTexture(scene: Phaser.Scene): string {
  const key = 'prologo/glow';
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  scene.textures.addCanvas(key, canvas);
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

const mix = (a: number, b: number, t: number): number => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

export class PrologueScene extends Phaser.Scene {
  private readonly ui: UiStore;
  private shot = -1;
  private objs: Obj[] = [];
  private abbeySet: AbbeySet | null = null;
  /** Para onde a câmera olha e quanto ela aproxima além do zoom de encaixe. */
  private readonly focus = { x: 0, y: 0, zoom: 1 };
  private busy = false;
  private ending = false;

  constructor(ui: UiStore) {
    super(PROLOGUE_SCENE);
    this.ui = ui;
  }

  create(): void {
    this.objs = [];
    this.abbeySet = null;
    this.busy = false;
    this.ending = false;
    this.scene.sleep('village');
    this.cameras.main.setBackgroundColor('#05060a');
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fit, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fit, this));
    this.ui.prologueControl = { next: () => this.next(), skip: () => this.finish() };
    this.play(0, true);
  }

  // ── Câmera ──────────────────────────────────────────────────────────────

  /** Zoom inteiro que cobre a tela sem cortar o quadrado do meio (o pixel não treme). */
  private fit(): void {
    const cam = this.cameras.main;
    const w = this.scale.width;
    const h = this.scale.height;
    cam.setSize(w, h);
    const cover = Math.max(w / STAGE_W, h / STAGE_H);
    const z = Math.max(1, Math.floor(Math.min(cover, w / SAFE, h / SAFE)));
    cam.setZoom(z * this.focus.zoom);
    cam.centerOn(this.focus.x, this.focus.y);
  }

  private look(x: number, y: number, zoom = 1): void {
    this.focus.x = x;
    this.focus.y = y;
    this.focus.zoom = zoom;
    this.fit();
  }

  private pan(x: number, y: number, ms: number, delay = 0, zoom = this.focus.zoom): void {
    this.tweens.add({ targets: this.focus, x, y, zoom, duration: ms, delay, ease: 'Sine.easeInOut', onUpdate: () => this.fit() });
  }

  // ── Roteiro ─────────────────────────────────────────────────────────────

  private play(i: number, cut: boolean): void {
    if (this.ending) return;
    this.shot = i;
    this.busy = false;
    this.tweens.killAll();
    this.time.removeAllEvents();
    // A queda continua a cena da abadia, sem corte.
    if (!(i === 1 && this.abbeySet)) this.clear();
    if (this.ui.prologue) this.ui.setPrologue({ ...this.ui.prologue, shot: i });
    [this.shotAbbey, this.shotFall, this.shotEye, this.shotFire, this.shotHeroes, this.shotMayor][i]!.call(this);
    if (cut) this.cameras.main.fadeFrom(800, 0, 0, 0, true);
    this.time.delayedCall(PROLOGUE[i]!.seconds * 1000, () => this.next());
  }

  private next(): void {
    if (this.busy || this.ending) return;
    const i = this.shot + 1;
    if (i >= PROLOGUE.length) return this.finish();
    if (i === 1) return this.play(1, false);
    this.busy = true;
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.play(i, true));
    cam.fade(450, 0, 0, 0, true);
  }

  private finish(): void {
    if (this.ending) return;
    this.ending = true;
    this.time.removeAllEvents();
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.end());
    cam.fade(900, 0, 0, 0, true);
  }

  private end(): void {
    this.tweens.killAll();
    this.clear();
    this.scene.wake('village');
    this.ui.finishPrologue();
    this.scene.stop();
  }

  // ── Peças ───────────────────────────────────────────────────────────────

  private clear(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
    this.abbeySet = null;
  }

  private keep<T extends Obj>(o: T): T {
    this.objs.push(o);
    return o;
  }

  private art(key: string, x: number, y: number, depth: number, tint = NIGHT, ox = 0.5, oy = 1): Phaser.GameObjects.Image {
    const img = showArt(this.add.image(x, y, key), key).setOrigin(ox, oy).setDepth(depth);
    if (tint !== 0xffffff) img.setTint(tint);
    return this.keep(img);
  }

  /** Personagem ou efeito do pack, com a animação no modo de arte atual. */
  private sprite(id: string, x: number, y: number, depth: number, anim?: string, tint = NIGHT): Phaser.GameObjects.Sprite {
    const s = showArt(this.add.sprite(x, y, id), id, ART_SCALE, 0).setOrigin(0.5, 1).setDepth(depth);
    playArt(s, id, anim);
    if (tint !== 0xffffff) s.setTint(tint);
    return this.keep(s);
  }

  private glow(x: number, y: number, radius: number, color: number, alpha: number, depth: number): Phaser.GameObjects.Image {
    return this.keep(this.add.image(x, y, glowTexture(this)).setBlendMode(Phaser.BlendModes.ADD).setTint(color).setAlpha(alpha).setScale(radius / 64).setDepth(depth));
  }

  /** Chama que treme: o brilho respira em volta do valor de base. */
  private flicker(img: Phaser.GameObjects.Image, alpha: number, scale = 0.06): void {
    const base = img.scaleX;
    this.tweens.add({ targets: img, alpha: { from: alpha, to: alpha * 0.75 }, scale: { from: base, to: base * (1 + scale) }, duration: 160 + Math.random() * 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Céu ou escuro em degradê, de y0 a y1, com a cor das pontas seguindo para fora (`up`: também para cima). */
  private backdrop(top: number, bottom: number, y0: number, y1: number, depth = 0, x0 = -3000, x1 = 3000, up = true): void {
    const g = this.keep(this.add.graphics().setDepth(depth));
    if (up) g.fillStyle(top, 1).fillRect(x0, y0 - 3000, x1 - x0, 3000);
    g.fillGradientStyle(top, top, bottom, bottom, 1).fillRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle(bottom, 1).fillRect(x0, y1, x1 - x0, 3000);
  }

  private stars(n: number, x0: number, x1: number, y0: number, y1: number, depth: number): void {
    const g = this.keep(this.add.graphics().setDepth(depth));
    for (let i = 0; i < n; i++) {
      const b = Math.random();
      g.fillStyle(b > 0.92 ? 0xfff2d0 : 0xdfe8ff, 0.25 + b * 0.6).fillRect(Math.round(x0 + Math.random() * (x1 - x0)), Math.round(y0 + Math.random() * (y1 - y0)), b > 0.8 ? 2 : 1, b > 0.8 ? 2 : 1);
    }
    for (let i = 0; i < 14; i++) {
      const s = this.glow(x0 / 3 + Math.random() * (x1 - x0) / 1.5, y0 + Math.random() * (y1 - y0), 5, 0xe8f0ff, 0.9, depth);
      this.tweens.add({ targets: s, alpha: 0.15, duration: 700 + Math.random() * 1500, yoyo: true, repeat: -1, delay: Math.random() * 1500 });
    }
  }

  /** Chão da vila à noite: grama escura com manchas. */
  private ground(): void {
    // Tudo da vila tem profundidade pelo y (negativo lá em cima): o chão fica bem abaixo.
    this.backdrop(0x10160f, 0x10160f, -2000, 2000, -2000);
    const g = this.keep(this.add.graphics().setDepth(-1999));
    for (let i = 0; i < 900; i++) {
      g.fillStyle(Math.random() < 0.5 ? 0x172015 : 0x0a0f09, 1).fillRect(Math.round(-800 + Math.random() * 1600) & ~1, Math.round(-600 + Math.random() * 1400) & ~1, 2, 2);
    }
  }

  private pines(points: [number, number][], tint: number): void {
    for (const [x, y] of points) this.art('prop/tree/pine', x, y, y, tint);
  }

  private particles(x: number, y: number, key: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
    return this.keep(this.add.particles(x, y, key, cfg).setDepth(depth));
  }

  // ── 1. A abadia ─────────────────────────────────────────────────────────

  private block(c: number, key: string, flip = false): Obj[] {
    const x = c * BLOCK;
    const img = this.art(key, x, TOP, 20, NIGHT, 0, 0).setFlipX(flip);
    // A rocha segue para baixo na cor do pé do bloco; na borda quebrada, só a parte de pé.
    const solid = key === 'prologo/borda' ? 28 * ART_SCALE : BLOCK;
    const rect = this.keep(this.add.rectangle(flip ? x + BLOCK - solid : x, TOP + BLOCK, solid, 2400, 0x06060b).setOrigin(0, 0).setDepth(20));
    return [img, rect];
  }

  private abbeyStage(): AbbeySet {
    this.backdrop(0x070a18, 0x1d2746, -700, TOP + 40);
    this.stars(420, -1400, 1400, -800, TOP - 90, 1);
    this.art('prologo/lua', -24, -214, 2, 0xc8d4f0, 0.5, 0.5);
    this.glow(-24, -214, 110, 0xaec4ff, 0.2, 2);
    // A serra ao longe e os pinheiros das bordas.
    const ridge = this.keep(this.add.graphics().setDepth(3));
    ridge.fillStyle(0x0c1124, 1).beginPath().moveTo(-1600, TOP + 20);
    for (let x = -1600; x <= 1600; x += 48) ridge.lineTo(x, TOP - 20 - ((Math.sin(x * 0.011) + Math.sin(x * 0.029 + 1)) * 0.25 + 0.5) * 70);
    ridge.lineTo(1600, TOP + 20).closePath().fillPath();
    this.pines([[-600, TOP + 6], [-520, TOP + 4], [-430, TOP + 8], [-350, TOP + 4], [330, TOP + 6], [420, TOP + 4], [500, TOP + 8], [590, TOP + 5]], FAR);
    // O escuro da fenda, que só aparece quando o chão abrir.
    this.backdrop(0x0b0914, 0x020205, TOP, TOP + 360, 5, -420, 420, false);
    const abbey = this.art('prologo/abadia', 0, TOP + 6, 10);
    const lights = this.art(lightsTexture('prologo/abadia'), 0, TOP + 6, 11, 0xffffff);
    const glow = this.glow(0, TOP - 70, 150, 0xffb050, 0.12, 12);
    const lantern = this.glow(0, TOP - 16, 30, 0xffc070, 0.5, 12);
    this.flicker(lantern, 0.5);
    const blocks = new Map<number, Obj[]>();
    for (let c = -12; c < 12; c++) blocks.set(c, this.block(c, 'prologo/penhasco'));
    return { abbey, lights, glow, lantern, blocks };
  }

  private shotAbbey(): void {
    this.abbeySet = this.abbeyStage();
    this.look(0, TOP - 10);
    this.pan(0, -60, 7600);
    this.time.delayedCall(800, () => this.ui.sfx('death'));
  }

  // ── 2. A queda ──────────────────────────────────────────────────────────

  private shotFall(): void {
    const set = (this.abbeySet ??= this.abbeyStage());
    const cam = this.cameras.main;
    this.time.delayedCall(300, () => {
      cam.shake(2600, 0.005);
      this.ui.sfx('blast');
    });
    // As janelas piscam e apagam.
    this.tweens.add({ targets: set.lights, alpha: { from: 1, to: 0.1 }, duration: 90, yoyo: true, repeat: 5, delay: 400, onComplete: () => set.lights.setAlpha(0) });
    this.tweens.add({ targets: [set.glow, set.lantern], alpha: 0, duration: 1400, delay: 600 });
    this.time.delayedCall(900, () => this.dust());
    this.time.delayedCall(1150, () => {
      this.ui.sfx('kill');
      this.openChasm(set);
    });
    // A abadia afunda na fenda e some no escuro.
    this.tweens.add({ targets: [set.abbey, set.lights], y: TOP + 680, angle: 4, duration: 3800, delay: 1000, ease: 'Cubic.easeIn' });
    this.tweens.addCounter({ from: 0, to: 1, duration: 3200, delay: 1500, onUpdate: (t) => set.abbey.setTint(mix(NIGHT, 0x000000, t.getValue() ?? 0)) });
    this.time.delayedCall(2700, () => {
      cam.shake(1400, 0.003);
      this.ui.sfx('blast');
    });
    this.time.delayedCall(5200, () => this.monk());
    this.pan(0, TOP + 40, 3200, 1800);
  }

  /** O chão abre: os blocos do meio somem e as bordas quebradas ficam de frente uma para a outra. */
  private openChasm(set: AbbeySet): void {
    for (const c of [-2, -1, 0, 1]) for (const o of set.blocks.get(c) ?? []) o.destroy();
    set.blocks.set(-2, this.block(-2, 'prologo/borda'));
    set.blocks.set(1, this.block(1, 'prologo/borda', true));
    set.blocks.delete(-1);
    set.blocks.delete(0);
    // Pedras caindo atrás da abadia.
    for (let i = 0; i < 9; i++) {
      const x = -150 + Math.random() * 300;
      const rock = this.art(Math.random() < 0.5 ? 'decal/rubble' : 'prop/boulder/01', x, TOP + Math.random() * 20, 9).setScale(Math.random() < 0.5 ? 1 : 1.5);
      this.tweens.add({ targets: rock, y: TOP + 700, angle: Math.random() * 180 - 90, duration: 1800 + Math.random() * 1200, delay: Math.random() * 900, ease: 'Quad.easeIn' });
    }
  }

  private dust(): void {
    this.particles(0, TOP, puffTexture(this), {
      x: { min: -200, max: 200 },
      lifespan: { min: 1800, max: 3200 },
      speedY: { min: -60, max: -18 },
      speedX: { min: -30, max: 30 },
      scale: { start: 2.5, end: 7 },
      alpha: { start: 0.55, end: 0 },
      tint: [0x5a5c6a, 0x6e6c74, 0x45464f],
      quantity: 6,
      frequency: 60,
      duration: 1600,
    }, 25);
  }

  /** O monge chega à beira com a vela e desce atrás da abadia. */
  private monk(): void {
    const monk = this.sprite('prologo/monge', -240, TOP + 8, 25, undefined, 0xb8b0c8);
    const light = this.glow(-240, TOP - 12, 34, 0xffc070, 0.65, 26);
    // No celular em pé a tela mostra pouco além da fenda: a câmera vai até a beira com ele.
    this.pan(-70, TOP + 40, 1800);
    this.flicker(light, 0.65, 0.12);
    const follow = () => light.setPosition(monk.x, monk.y - 20);
    monk.setAlpha(0);
    this.tweens.add({ targets: monk, alpha: 1, duration: 500 });
    this.tweens.add({ targets: monk, x: -168, duration: 1600, ease: 'Sine.easeOut', onUpdate: follow });
    this.tweens.add({
      targets: monk,
      x: -136,
      y: TOP + 420,
      duration: 3200,
      delay: 2000,
      ease: 'Sine.easeIn',
      onStart: () => monk.setDepth(15),
      onUpdate: () => {
        follow();
        const k = Phaser.Math.Clamp((monk.y - TOP) / 400, 0, 1);
        monk.setAlpha(1 - k * 0.8);
        light.setAlpha(0.65 * (1 - k * 0.6));
      },
    });
  }

  // ── 3. A pálpebra ───────────────────────────────────────────────────────

  private shotEye(): void {
    this.backdrop(0x170d26, 0x030207, -700, 700);
    // As paredes da fenda, com a borda acesa de roxo.
    for (const side of [-1, 1]) {
      const pts: Phaser.Math.Vector2[] = [];
      for (let y = -1400; y <= 1400; y += 40) pts.push(new Phaser.Math.Vector2(side * (150 + 30 * Math.sin(y * 0.02) + 22 * Math.sin(y * 0.057 + side) + Math.random() * 10), y));
      const wall = this.keep(this.add.graphics().setDepth(9));
      wall.fillStyle(0x0b0812, 1).fillPoints([new Phaser.Math.Vector2(side * 3000, -1400), ...pts, new Phaser.Math.Vector2(side * 3000, 1400)], true);
      wall.lineStyle(2, 0x34204a, 1).strokePoints(pts);
    }
    this.art('prologo/abadia-ruina', 0, 236, 5, 0x4a3d68);
    this.glow(0, 180, 170, 0x6a2a9a, 0.22, 4);
    for (const [x, y] of [[-95, 120], [100, 70], [45, 200], [-50, -150], [80, -230]] as const) {
      const shard = this.art('prop/arena/VI/floating-shard', x, y, 7, 0x8a6ab0, 0.5, 0.5);
      this.tweens.add({ targets: shard, y: y - 8, duration: 1600 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.particles(0, 0, puffTexture(this), {
      x: { min: -360, max: 360 },
      y: { min: 50, max: 220 },
      lifespan: { min: 5000, max: 8000 },
      speedX: { min: -14, max: 14 },
      speedY: { min: -5, max: 3 },
      scale: { start: 4, end: 9 },
      alpha: { start: 0.28, end: 0 },
      tint: [0x3a2a55, 0x2a1f40, 0x4a3366],
      frequency: 120,
      advance: 6000,
    }, 8);
    const eye = showArt(this.add.sprite(0, -10, 'prologo/olho'), 'prologo/olho', ART_SCALE, 0).setOrigin(0.5, 0.5).setDepth(6).setAlpha(0);
    this.keep(eye);
    const glow = this.glow(0, -10, 230, 0x9d4edd, 0, 5);
    const frame = (f: number) => eye.setFrame(f);
    this.look(0, -460);
    this.pan(0, 20, 4400);
    this.time.delayedCall(1900, () => {
      this.ui.sfx('echo');
      this.tweens.add({ targets: eye, alpha: 1, duration: 1400 });
      this.tweens.add({ targets: glow, alpha: 0.18, duration: 1400 });
    });
    this.time.delayedCall(4300, () => frame(1));
    this.time.delayedCall(4650, () => {
      frame(2);
      this.ui.sfx('reveal');
      this.cameras.main.shake(500, 0.002);
      this.tweens.add({ targets: glow, alpha: { from: 0.45, to: 0.3 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.time.delayedCall(7200, () => frame(3));
  }

  // ── 4. A fogueira ───────────────────────────────────────────────────────

  private fireStage(): void {
    this.ground();
    const dirt = this.keep(this.add.graphics().setDepth(-1998));
    dirt.fillStyle(0x1d1a14, 1).fillEllipse(0, 70, 300, 130);
    this.pines([[-600, -150], [-500, -175], [-400, -160], [-320, -190], [330, -185], [420, -160], [520, -180], [610, -150], [-660, 40], [650, 60]], FAR);
    this.art('building/casa/ruin', -240, -10, -10, DUSK);
    this.art('building/templo/ruin', 250, -20, -20, DUSK);
    this.art('building/house/02', -80, -80, -80, DUSK);
    this.art('building/house/05', 120, -95, -95, DUSK);
    this.art('decal/rubble', -150, 40, 40, DUSK);
    this.art('decal/rubble', 170, 30, 30, DUSK);
    this.art('prop/logs', -120, 120, 120, DUSK);
    this.art('prop/campfire/on', 0, 70, 70, 0xffffff);
    this.sprite('fx/fire', 0, 66, 71, undefined, 0xffffff);
    this.particles(0, 52, 'spark', {
      lifespan: { min: 700, max: 1500 },
      speedY: { min: -80, max: -30 },
      speedX: { min: -16, max: 16 },
      gravityY: 18,
      scale: { start: 1.6, end: 0.3 },
      alpha: { start: 1, end: 0 },
      tint: [0xffe08a, 0xffa040, 0xff6a20],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 140,
    }, 72);
    this.particles(0, 40, puffTexture(this), {
      lifespan: { min: 3000, max: 4500 },
      speedY: { min: -24, max: -12 },
      speedX: { min: 3, max: 10 },
      scale: { start: 0.7, end: 3 },
      alpha: { start: 0.3, end: 0 },
      tint: [0x6c6a68, 0x7e7a76],
      frequency: 420,
    }, 73);
    this.flicker(this.glow(0, 40, 240, 0xff9a40, 0.3, 80), 0.3, 0.04);
    this.flicker(this.glow(0, 56, 80, 0xffd890, 0.45, 81), 0.45, 0.1);
  }

  private shotFire(): void {
    this.fireStage();
    const people: [string, number, number][] = [
      ['char/villager/lavrador/m', -78, 66],
      ['char/villager/artesa/f', -52, 104],
      ['char/child/f', -18, 116],
      ['char/villager/guarda/m', 64, 62],
      ['char/villager/acolito/f', 50, 108],
    ];
    for (const [id, x, y] of people) this.sprite(id, x, y, y, 'idle', WARM);
    this.look(-160, 0);
    this.pan(0, 30, 7200);
    this.time.delayedCall(1400, () => this.ui.sfx('build'));
  }

  // ── 5. Os heróis ────────────────────────────────────────────────────────

  private shotHeroes(): void {
    this.ground();
    const road = this.keep(this.add.graphics().setDepth(-1998));
    road.fillStyle(0x1d1913, 1).fillRect(-44, -60, 88, 900);
    const trees: [number, number][] = [];
    for (let y = -170; y <= 520; y += 70) for (const side of [-1, 1]) trees.push([side * (130 + ((y * 7) % 90) + 40 * Math.abs(Math.sin(y))), y]);
    this.pines(trees, 0x5a6688);
    this.art('prop/gate-horn/open', 0, -40, -40, DUSK);
    for (const x of [-72, 72]) {
      this.art('prop/lamp', x, 20, 20, DUSK);
      this.flicker(this.glow(x, -34, 46, 0xffc070, 0.5, 30), 0.5, 0.08);
    }
    // As covas à beira da estrada, lá embaixo; a mais nova tem flores.
    this.art('decal/grave', -70, 470, 470);
    this.art('prop/tumulo/flores', -70, 474, 475);
    this.art('decal/grave', 72, 486, 486);
    this.art('decal/grave', -112, 500, 500);
    this.art('decal/grave', 108, 458, 458);
    this.glow(-60, 450, 110, 0x8aa0d0, 0.16, 520);
    const heroes: [string, string, number][] = [
      ['guardiao', 'm', -70],
      ['arqueiro', 'f', -30],
      ['clerigo', 'm', 12],
      ['piromante', 'f', 48],
      ['lanceiro', 'm', 82],
    ];
    heroes.forEach(([cls, g, tx], k) => {
      const hero = this.sprite(heroSpriteId(cls, g), k % 2 ? -8 : 8, -46, -46, 'run', 0xb4bcd8).setAlpha(0);
      this.tweens.add({ targets: hero, alpha: 1, duration: 250, delay: 900 + k * 420 });
      this.tweens.add({
        targets: hero,
        x: tx,
        y: 300 + k * 12,
        duration: 3400,
        delay: 900 + k * 420,
        onUpdate: () => hero.setDepth(hero.y),
        onComplete: () => this.tweens.add({ targets: hero, alpha: 0, duration: 500 }),
      });
    });
    this.look(0, 0);
    this.pan(0, 200, 3600, 1300);
    this.pan(0, 440, 2600, 5000);
    this.time.delayedCall(350, () => this.ui.sfx('horn'));
    this.time.delayedCall(7300, () => this.ui.sfx('grief'));
  }

  // ── 6. O prefeito ───────────────────────────────────────────────────────

  private shotMayor(): void {
    this.fireStage();
    this.sprite('char/villager/lavrador/f', -70, 70, 70, 'idle', WARM);
    this.sprite(heroSpriteId('guardiao', 'f'), -46, 108, 108, 'idle', WARM);
    this.sprite(heroSpriteId('clerigo', 'm'), 62, 66, 66, 'idle', WARM);
    this.sprite('char/mayor', 34, 100, 100, 'idle', 0xe8d0b0);
    this.look(24, 70, 1.6);
    this.pan(0, 10, 7400, 300, 1);
  }
}
