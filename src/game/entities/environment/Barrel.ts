import Phaser from 'phaser';

export class Barrel extends Phaser.Physics.Arcade.Sprite {
  exploded = false;
  private gfx: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.gfx = scene.add.rectangle(x, y, 18, 18, 0xff3300);
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(18, 18);
  }

  triggerExplosion(): void {
    if (this.exploded) return;
    this.exploded = true;
    this.gfx.destroy();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 50,
      onComplete: () => { if (this.active) this.destroy(); },
    });
  }

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}
