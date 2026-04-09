import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyType, EVENTS } from '../../types';
export class Bomber extends Enemy {
  readonly type = EnemyType.Bomber;
  private target: { x: number; y: number } | null = null;
  private detonating = false;
  private fuseTimer = 0;
  private readonly FUSE_TIME = 1500;
  private readonly TRIGGER_RANGE = 40;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 1, 'bomber');
    this.setDisplaySize(20, 20);
    (this.body as Phaser.Physics.Arcade.Body).setSize(20, 20);
  }

  setTarget(target: { x: number; y: number }): void {
    this.target = target;
  }

  protected aiUpdate(_time: number, delta: number): void {
    if (!this.target || this.isDead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

    if (!this.detonating) {
      const SPEED = 120;
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
      body.setVelocity(Math.cos(angle) * SPEED, Math.sin(angle) * SPEED);
      if (dist <= this.TRIGGER_RANGE) {
        this.detonating = true;
        body.setVelocity(0, 0);
        this.setTint(0xffffff);
      }
    } else {
      this.fuseTimer += delta;
      const blink = Math.floor(this.fuseTimer / 150) % 2 === 0;
      this.setTint(blink ? 0xffffff : 0xff0066);
      if (this.fuseTimer >= this.FUSE_TIME) {
        this.scene.events.emit(EVENTS.EXPLOSION, { x: this.x, y: this.y, radius: 60 });
        this.hp = 0;
      }
    }
  }
}
