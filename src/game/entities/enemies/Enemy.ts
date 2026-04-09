import Phaser from 'phaser';
import { EnemyType } from '../../types';

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  abstract readonly type: EnemyType;
  hp: number;
  protected maxHp: number;

  constructor(scene: Phaser.Scene, x: number, y: number, hp: number, textureKey: string) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setTexture(textureKey);
    this.maxHp = hp;
    this.hp = hp;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 20);
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
  }

  get isDead(): boolean { return this.hp <= 0; }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.aiUpdate(time, delta);
  }

  protected abstract aiUpdate(time: number, delta: number): void;
}
