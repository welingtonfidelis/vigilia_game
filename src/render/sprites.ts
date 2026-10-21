// Heróis e prefeito com os sprites do 0x72 (parado/correndo, virando para o lado do movimento).
// Só posição visual: quem decide para onde vão é o núcleo.

import Phaser from 'phaser';
import type { ActivityKind, Child, Citizen, Hero } from '../sim/index.ts';
import { citizenLook, ICON_KINDS } from './art.ts';
import { ART_SCALE, heroSprite } from './assets.ts';
import { heroSpriteId, packAsset } from './pack.ts';
import { Route } from './nav.ts';
import { DEPTH, smooth } from './town.ts';
import type { Point } from './layout.ts';
import { RANK_COLORS } from './palette.ts';

const LABEL_STYLE = {
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
  fontSize: '13px',
  color: '#f4ecd8',
  stroke: '#0b0a08',
  strokeThickness: 3,
};

/** Altura da cabeça acima dos pés (o quadro do 0x72 tem folga em cima). */
const HEAD_Y = -44;

interface WalkerVisual {
  texture: string;
  idle: string;
  run: string;
}

abstract class Walker {
  readonly root: Phaser.GameObjects.Container;
  protected readonly body: Phaser.GameObjects.Sprite;
  protected readonly weapon: Phaser.GameObjects.Image | null;
  protected readonly base: string;
  protected readonly visual: WalkerVisual | undefined;
  protected moving = false;
  /** Caminho em volta dos prédios até o destino atual. */
  readonly route = new Route();
  private playing = '';
  private left = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    base: string,
    weapon: string | null,
    scale = ART_SCALE,
    visual?: WalkerVisual,
  ) {
    this.base = base;
    this.visual = visual;
    const shadow = scene.add.image(0, 0, 'shadow').setScale(scale);
    this.weapon = weapon ? scene.add.image(10, -12, 'dungeon', weapon).setOrigin(0.5, 1).setScale(scale) : null;
    this.body = scene.add
      .sprite(0, 2, visual?.texture ?? 'dungeon', visual ? 0 : `${base}_idle_anim_f0`)
      .setOrigin(0.5, 1)
      .setScale(scale);
    const parts: Phaser.GameObjects.GameObject[] = [shadow, this.body];
    if (this.weapon) parts.push(this.weapon);
    this.root = scene.add.container(Math.round(x), Math.round(y), parts).setDepth(y);
    this.play('idle');
  }

  get x(): number {
    return this.root.x;
  }
  get y(): number {
    return this.root.y;
  }

  /** Anda em direção ao ponto. Devolve true quando chegou. */
  walkTo(target: Point, step: number): boolean {
    const dx = target.x - this.root.x;
    const dy = target.y - this.root.y;
    const dist = Math.hypot(dx, dy);
    const arrived = dist <= Math.max(step, 0.5);
    if (arrived) {
      this.root.setPosition(target.x, target.y);
      this.moving = false;
    } else {
      this.root.setPosition(this.root.x + (dx / dist) * step, this.root.y + (dy / dist) * step);
      this.moving = step > 0;
      if (this.moving && Math.abs(dx) > 2) this.face(dx < 0);
    }
    this.root.setDepth(this.root.y);
    return arrived;
  }

  /** Movimento por vetor (WASD): não trata o passo como um destino a alcançar. */
  walkBy(dx: number, dy: number): void {
    if (Math.abs(dx) + Math.abs(dy) < 0.001) {
      this.moving = false;
      return;
    }
    this.root.setPosition(this.root.x + dx, this.root.y + dy);
    this.moving = true;
    if (Math.abs(dx) > 2) this.face(dx < 0);
    this.root.setDepth(this.root.y);
  }

  protected face(left: boolean): void {
    if (left === this.left) return;
    this.left = left;
    this.body.setFlipX(left);
    if (this.weapon) this.weapon.setFlipX(left).setX(left ? -10 : 10);
  }

  private play(kind: 'idle' | 'run'): void {
    const key = this.visual ? this.visual[kind] : `${this.base}_${kind}`;
    if (this.playing === key) return;
    this.playing = key;
    this.body.play(key, true);
  }

  /** `rate` acompanha a velocidade do jogo (0 = pausado, a respiração continua devagar). */
  animate(rate: number): void {
    this.play(this.moving ? 'run' : 'idle');
    this.body.anims.timeScale = Math.min(2, rate > 0 ? rate : 0.6);
    if (this.weapon) this.weapon.y = this.moving && (this.body.anims.currentFrame?.index ?? 0) % 2 === 0 ? -14 : -12;
  }
}

export interface Commit {
  key: string;
  point: Point;
  since: number;
  arrivedAt: number | null;
  hide: boolean;
}

export class HeroSprite extends Walker {
  readonly id: number;
  readonly label: Phaser.GameObjects.Text;
  private readonly badge: Phaser.GameObjects.Container;
  private readonly badgeText: Phaser.GameObjects.Text;
  private readonly badgeDot: Phaser.GameObjects.Arc;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Image;
  private readonly bandage: Phaser.GameObjects.Image;
  private rank = '';
  /** Altura da cabeça deste herói (o estilo novo tem 32 px de quadro, não 28). */
  private readonly headY: number;
  hidden = false;
  /** Para onde está andando agora (pode estar uma atividade atrás do núcleo). */
  commit: Commit | null = null;

  constructor(scene: Phaser.Scene, hero: Hero, at: Point) {
    // Heróis redesenhados do pack 1.4 (direção sombria), com a arma de classe no sprite.
    const texture = heroSpriteId(hero.classId, hero.gender);
    super(scene, at.x, at.y, heroSprite(hero.classId, hero.gender), null, ART_SCALE, {
      texture,
      idle: `${texture}:idle`,
      run: `${texture}:run`,
    });
    this.id = hero.id;
    this.headY = HEAD_Y - ((packAsset(texture)?.frameSize?.[1] ?? 28) - 28) * ART_SCALE;
    this.ring = scene.add.image(0, 2, 'ring').setScale(ART_SCALE).setVisible(false);
    this.root.addAt(this.ring, 0);
    this.icon = scene.add.image(0, this.headY - 10, 'icon-aguardar').setOrigin(0.5, 1).setScale(ART_SCALE).setVisible(false);
    this.bandage = scene.add.image(-5, this.headY + 10, 'bandage').setScale(ART_SCALE).setVisible(false);
    this.root.add([this.bandage, this.icon]);
    this.label = smooth(scene.add.text(at.x, at.y + 6, hero.name, LABEL_STYLE)).setOrigin(0.5, 0).setDepth(DEPTH.labels);
    this.badgeDot = scene.add.circle(0, 0, 7, 0xffffff).setStrokeStyle(2, 0x0b0a08);
    this.badgeText = smooth(scene.add.text(0, 0, '', { fontFamily: 'Georgia, serif', fontSize: '10px', color: '#0b0a08', fontStyle: 'bold' })).setOrigin(0.5);
    this.badge = scene.add.container(at.x + 13, at.y + this.headY, [this.badgeDot, this.badgeText]).setDepth(DEPTH.labels);
    this.sync(hero);
  }

  sync(hero: Hero): void {
    if (hero.rank !== this.rank) {
      this.rank = hero.rank;
      this.badgeText.setText(hero.rank);
      this.badgeDot.setFillStyle(RANK_COLORS[hero.rank]);
    }
    const grieving = hero.grief > 30;
    const retired = hero.status === 'retired';
    this.label.setColor(hero.vengeful ? '#ff9a7a' : grieving ? '#a8c0ff' : retired ? '#c9b48a' : '#f4ecd8');
    this.bandage.setVisible(hero.injury !== null);
    this.weapon?.setVisible(!retired);
  }

  setActivityIcon(kind: ActivityKind | null): void {
    if (kind && ICON_KINDS.includes(kind)) this.icon.setTexture(`icon-${kind}`).setVisible(true);
    else this.icon.setVisible(false);
  }

  setSelected(selected: boolean): void {
    this.ring.setVisible(selected);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.root.setVisible(!hidden);
    this.label.setVisible(!hidden);
    this.badge.setVisible(!hidden);
  }

  placeLabels(labelScale: number): void {
    this.label.setPosition(this.root.x, this.root.y + 5).setScale(labelScale);
    this.badge.setPosition(this.root.x + 13, this.root.y + this.headY).setScale(labelScale);
  }

  hits(x: number, y: number): boolean {
    return !this.hidden && Math.abs(x - this.root.x) < 18 && y > this.root.y + this.headY - 6 && y < this.root.y + 22;
  }

  destroy(): void {
    this.root.destroy();
    this.label.destroy();
    this.badge.destroy();
  }
}

/** Criança da vila: metade do tamanho, brinca na praça de dia (só enfeite). */
export class ChildSprite extends Walker {
  readonly id: number;
  readonly label: Phaser.GameObjects.Text;
  readonly parents: [number, number];
  hidden = false;

  constructor(scene: Phaser.Scene, child: Child, at: Point) {
    const texture = `char/child/${child.gender}`;
    super(scene, at.x, at.y, heroSprite(child.classId, child.gender), null, ART_SCALE, {
      texture,
      idle: `${texture}:idle`,
      run: `${texture}:walk`,
    });
    this.id = child.id;
    this.parents = child.parents;
    this.label = smooth(scene.add.text(at.x, at.y + 3, child.name, { ...LABEL_STYLE, fontSize: '11px', color: '#d8d0c0' }))
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.labels);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.root.setVisible(!hidden);
    this.label.setVisible(!hidden);
  }

  placeLabels(labelScale: number): void {
    this.label.setPosition(this.root.x, this.root.y + 3).setScale(labelScale * 0.9);
  }

  hits(x: number, y: number): boolean {
    return !this.hidden && Math.abs(x - this.root.x) < 14 && y > this.root.y - 38 && y < this.root.y + 16;
  }

  destroy(): void {
    this.root.destroy();
    this.label.destroy();
  }
}

export class Mayor extends Walker {
  readonly lantern: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'doc', null, ART_SCALE, {
      texture: 'char/mayor',
      idle: 'char/mayor:idle',
      run: 'char/mayor:run',
    });
    this.lantern = scene.add.image(x + 11, y - 14, 'glow').setTint(0xffc46b).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights).setScale(2.2);
    this.label = smooth(scene.add.text(x, y + 6, 'Prefeito', { ...LABEL_STYLE, color: '#ffd98a', fontStyle: 'bold' }))
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.labels);
  }

  placeLabels(labelScale: number, night: number): void {
    this.label.setPosition(this.root.x, this.root.y + 5).setScale(labelScale);
    this.lantern.setPosition(this.root.x + (this.body.flipX ? -10 : 10), this.root.y - 16).setAlpha(0.15 + 0.75 * night);
  }
}


/** Morador com a folha própria da vila: 16×21, dois quadros, sem arma. */
export class CitizenSprite {
  readonly id: number;
  readonly root: Phaser.GameObjects.Container;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly texture: string;
  private moving = false;
  private left = false;
  private frameTime = 0;
  /** Caminho em volta dos prédios até o destino atual. */
  readonly route = new Route();
  hidden = false;

  constructor(scene: Phaser.Scene, citizen: Citizen, at: Point) {
    this.id = citizen.id;
    const look = citizenLook(citizen);
    this.texture = `char/villager/${look}/${citizen.gender}`;
    const shadow = scene.add.image(0, 0, 'shadow').setScale(ART_SCALE);
    this.body = scene.add.sprite(0, 2, this.texture, 0).setOrigin(0.5, 1).setScale(ART_SCALE);
    this.root = scene.add.container(Math.round(at.x), Math.round(at.y), [shadow, this.body]).setDepth(at.y);
  }

  get x(): number {
    return this.root.x;
  }
  get y(): number {
    return this.root.y;
  }

  /** Anda em direção ao ponto. Devolve true quando chegou. */
  walkTo(target: Point, step: number): boolean {
    const dx = target.x - this.root.x;
    const dy = target.y - this.root.y;
    const dist = Math.hypot(dx, dy);
    const arrived = dist <= Math.max(step, 0.5);
    if (arrived) {
      this.root.setPosition(target.x, target.y);
      this.moving = false;
    } else {
      this.root.setPosition(this.root.x + (dx / dist) * step, this.root.y + (dy / dist) * step);
      this.moving = step > 0;
      if (this.moving && Math.abs(dx) > 2) this.face(dx < 0);
    }
    this.root.setDepth(this.root.y);
    return arrived;
  }

  private face(left: boolean): void {
    if (left === this.left) return;
    this.left = left;
    this.body.setFlipX(left);
  }

  /** Quadro 0 parado; 1 e 0 alternando enquanto anda. */
  animate(rate: number, dt: number): void {
    if (!this.moving || rate <= 0) {
      this.frameTime = 0;
      if (this.body.frame.name !== '0') this.body.setTexture(this.texture, 0);
      return;
    }
    this.frameTime += dt * rate;
    const frame = Math.floor(this.frameTime * 6) % 2;
    if (this.body.frame.name !== String(frame)) this.body.setTexture(this.texture, frame);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.root.setVisible(!hidden);
  }

  hits(x: number, y: number): boolean {
    return !this.hidden && Math.abs(x - this.root.x) < 14 && y > this.root.y - 44 && y < this.root.y + 16;
  }

  destroy(): void {
    this.root.destroy();
  }
}
