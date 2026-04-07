import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyType } from '../../types';
import { TILES } from '../../utils/TileResolver';

export class Turret extends Enemy {
  readonly type = EnemyType.Turret;
  private target: { x: number; y: number } | null = null;
  private fireTimer = 0;
  private readonly FIRE_INTERVAL = 2000;
  bullets: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 4, TILES.turret.sheet, TILES.turret.frame);
    this.setDisplaySize(24, 24);
    (this.body as Phaser.Physics.Arcade.Body).setSize(24, 24);
  }

  setTarget(target: { x: number; y: number }): void {
    this.target = target;
  }

  protected aiUpdate(_time: number, delta: number): void {
    if (!this.target || this.isDead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);

    this.fireTimer += delta;
    if (this.fireTimer >= this.FIRE_INTERVAL) {
      this.fireTimer = 0;
      this.fireBullet();
    }
    this.bullets = this.bullets.filter(b => b.active);
  }

  private fireBullet(): void {
    if (!this.target) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const bullet = this.scene.add.circle(this.x, this.y, 5, 0xff00ff);
    const SPEED = 200;
    const vx = Math.cos(angle) * SPEED;
    const vy = Math.sin(angle) * SPEED;
    this.bullets.push(bullet);
    // Store velocity on bullet for collision checks in GameScene.update
    (bullet as unknown as { vx: number; vy: number }).vx = vx;
    (bullet as unknown as { vy: number }).vy = vy;
    this.scene.tweens.add({
      targets: bullet,
      x: bullet.x + vx * 2,
      y: bullet.y + vy * 2,
      duration: 2000,
      onComplete: () => { if (bullet.active) bullet.destroy(); },
    });
  }

  destroy(fromScene?: boolean): void {
    this.bullets.forEach(b => { if (b.active) b.destroy(); });
    super.destroy(fromScene);
  }
}
