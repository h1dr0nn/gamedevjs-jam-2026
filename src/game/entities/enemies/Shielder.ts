import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyType } from '../../types';

export class Shielder extends Enemy {
  readonly type = EnemyType.Shielder;
  private target: { x: number; y: number } | null = null;
  faceAngle = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 3);
  }

  protected createGraphics(): void {
    this.gfx = this.scene.add.rectangle(this.x, this.y, 18, 18, 0x0044ff);
  }

  setTarget(target: { x: number; y: number }): void {
    this.target = target;
  }

  isBlockingDash(fromX: number, fromY: number): boolean {
    if (!this.target) return false;
    const toPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const incomingAngle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(toPlayer - incomingAngle));
    return diff < Math.PI / 2;
  }

  protected aiUpdate(_time: number, _delta: number): void {
    if (!this.target) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.faceAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const SPEED = 50;
    body.setVelocity(Math.cos(this.faceAngle) * SPEED, Math.sin(this.faceAngle) * SPEED);
  }
}
