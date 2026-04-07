import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyType } from '../../types';

export class Grunt extends Enemy {
  readonly type = EnemyType.Grunt;
  private target: { x: number; y: number } | null = null;
  private readonly SPEED = 80;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 2, 'grunt');
    this.setDisplaySize(20, 20);
    (this.body as Phaser.Physics.Arcade.Body).setSize(20, 20);
  }

  setTarget(target: { x: number; y: number }): void {
    this.target = target;
  }

  protected aiUpdate(_time: number, _delta: number): void {
    if (!this.target || this.isDead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    body.setVelocity(Math.cos(angle) * this.SPEED, Math.sin(angle) * this.SPEED);
  }
}
