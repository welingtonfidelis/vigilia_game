// Heróis e prefeito na vila. Só posição visual: quem decide para onde vão é o núcleo.

import Phaser from 'phaser';
import type { ActivityKind, Hero } from '../sim/index.ts';
import { HAIR_STYLES, HEAD_Y, ICON_KINDS } from './art.ts';
import { DEPTH } from './environment.ts';
import { hash, type Point } from './layout.ts';
import { HAIR, RANK_COLORS, SKIN } from './palette.ts';

const LABEL_STYLE = {
  fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
  fontSize: '13px',
  color: '#f4ecd8',
  stroke: '#0b0a08',
  strokeThickness: 3,
};

abstract class Walker {
  readonly root: Phaser.GameObjects.Container;
  protected readonly body: Phaser.GameObjects.Image;
  protected readonly head: Phaser.GameObjects.Image;
  protected readonly hat: Phaser.GameObjects.Image;
  protected readonly hair: Phaser.GameObjects.Image | null;
  protected phase = 0;
  protected moving = false;

  constructor(scene: Phaser.Scene, x: number, y: number, bodyKey: string, hatKey: string, hairStyle: number | null) {
    const shadow = scene.add.image(0, 0, 'shadow');
    this.body = scene.add.image(0, 0, bodyKey).setOrigin(0.5, 1);
    this.head = scene.add.image(0, HEAD_Y, 'head');
    this.hair = hairStyle === null ? null : scene.add.image(0, HEAD_Y - 3, `hair-${hairStyle}`);
    this.hat = scene.add.image(0, HEAD_Y - 5, hatKey);
    const parts: Phaser.GameObjects.GameObject[] = [shadow, this.body, this.head];
    if (this.hair) parts.push(this.hair);
    parts.push(this.hat);
    this.root = scene.add.container(x, y, parts).setDepth(y);
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

  protected face(left: boolean): void {
    this.body.setFlipX(left);
    this.hat.setFlipX(left);
    this.hair?.setFlipX(left);
  }

  animate(dt: number): void {
    if (this.moving) this.phase += dt * 14;
    else this.phase = 0;
    const bob = this.moving ? Math.abs(Math.sin(this.phase)) * -2.5 : 0;
    this.body.y = bob;
    this.head.y = HEAD_Y + bob;
    this.hat.y = HEAD_Y - 5 + bob;
    if (this.hair) this.hair.y = HEAD_Y - 3 + bob;
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
  private rank = '';
  hidden = false;
  /** Para onde está andando agora (pode estar uma atividade atrás do núcleo). */
  commit: Commit | null = null;

  constructor(scene: Phaser.Scene, hero: Hero, at: Point) {
    const h = hash(hero.id, 77);
    super(scene, at.x, at.y, `body-${hero.classId}`, `hat-${hero.classId}`, h % HAIR_STYLES);
    this.id = hero.id;
    this.head.setTint(SKIN[h % SKIN.length]!);
    this.hair?.setTint(HAIR[(h >>> 8) % HAIR.length]!);
    this.ring = scene.add.image(0, 2, 'ring').setVisible(false);
    this.root.addAt(this.ring, 0);
    this.icon = scene.add.image(0, HEAD_Y - 22, 'icon-aguardar').setVisible(false);
    this.root.add(this.icon);
    this.label = scene.add.text(at.x, at.y + 6, hero.name, LABEL_STYLE).setOrigin(0.5, 0).setDepth(DEPTH.labels);
    this.badgeDot = scene.add.circle(0, 0, 7, 0xffffff).setStrokeStyle(1.5, 0x0b0a08);
    this.badgeText = scene.add
      .text(0, 0, '', { fontFamily: 'Georgia, serif', fontSize: '10px', color: '#0b0a08', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.badge = scene.add.container(at.x + 11, at.y + HEAD_Y - 6, [this.badgeDot, this.badgeText]).setDepth(DEPTH.labels);
    this.sync(hero);
  }

  sync(hero: Hero): void {
    if (hero.rank !== this.rank) {
      this.rank = hero.rank;
      this.badgeText.setText(hero.rank);
      this.badgeDot.setFillStyle(RANK_COLORS[hero.rank]);
    }
    const grieving = hero.grief > 30;
    this.label.setColor(hero.vengeful ? '#ff9a7a' : grieving ? '#a8c0ff' : '#f4ecd8');
  }

  setActivityIcon(kind: ActivityKind | null): void {
    if (kind && ICON_KINDS.includes(kind)) {
      this.icon.setTexture(`icon-${kind}`).setVisible(true);
    } else {
      this.icon.setVisible(false);
    }
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
    this.badge.setPosition(this.root.x + 11, this.root.y + HEAD_Y - 6).setScale(labelScale);
  }

  hits(x: number, y: number): boolean {
    return !this.hidden && Math.abs(x - this.root.x) < 18 && y > this.root.y - 50 && y < this.root.y + 22;
  }

  destroy(): void {
    this.root.destroy();
    this.label.destroy();
    this.badge.destroy();
  }
}

export class Mayor extends Walker {
  readonly lantern: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'body-mayor', 'hat-mayor', null);
    this.head.setTint(SKIN[1]!);
    this.lantern = scene.add.image(x + 11, y - 6, 'glow').setTint(0xffc46b).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.lights).setScale(2.2);
    this.label = scene.add
      .text(x, y + 6, 'Prefeito', { ...LABEL_STYLE, color: '#ffd98a', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.labels);
  }

  placeLabels(labelScale: number, night: number): void {
    this.label.setPosition(this.root.x, this.root.y + 5).setScale(labelScale);
    const flip = this.body.flipX ? -1 : 1;
    this.lantern.setPosition(this.root.x + 11 * flip, this.root.y - 6).setAlpha(0.15 + 0.75 * night);
  }
}
