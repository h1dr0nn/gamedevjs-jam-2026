import Phaser from 'phaser';
import { EnemyType } from '../../types';

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  abstract readonly type: EnemyType;
  hp: number;
  protected maxHp: number;
  protected gfx!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, hp: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.maxHp = hp;
    this.hp = hp;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 20);
    this.createGraphics();
  }

  protected abstract createGraphics(): void;

  takeDamage(amount: number): void {
    this.hp -= amount;
  }

  get isDead(): boolean { return this.hp <= 0; }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.gfx) { this.gfx.x = this.x; this.gfx.y = this.y; }
    this.aiUpdate(time, delta);
  }

  protected abstract aiUpdate(time: number, delta: number): void;

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}
