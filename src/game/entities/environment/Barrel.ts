import Phaser from 'phaser';
export class Barrel extends Phaser.Physics.Arcade.Sprite {
  exploded = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'barrel');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.setDisplaySize(20, 20);
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(20, 20);
  }

  triggerExplosion(): void {
    if (this.exploded) return;
    this.exploded = true;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 50,
      onComplete: () => { if (this.active) this.destroy(); },
    });
  }
}
