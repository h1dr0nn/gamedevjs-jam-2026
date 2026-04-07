import Phaser from 'phaser';

export class CrackedWall extends Phaser.Physics.Arcade.Sprite {
  shattered = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'wall');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDisplaySize(50, 50);
    this.setTint(0x556677);
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(50, 50);
  }

  shatter(): Array<{ x: number; y: number; angle: number }> {
    if (this.shattered) return [];
    this.shattered = true;
    const cx = this.x;
    const cy = this.y;
    this.destroy();
    return Array.from({ length: 8 }, (_, i) => ({
      x: cx,
      y: cy,
      angle: (i * Math.PI * 2) / 8,
    }));
  }
}
