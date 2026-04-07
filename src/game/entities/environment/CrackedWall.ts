import Phaser from 'phaser';

export class CrackedWall extends Phaser.Physics.Arcade.Sprite {
  shattered = false;
  private gfx: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.gfx = scene.add.rectangle(x, y, 32, 32, 0x556677).setStrokeStyle(2, 0x334455);
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(32, 32);
  }

  shatter(): Array<{ x: number; y: number; angle: number }> {
    if (this.shattered) return [];
    this.shattered = true;
    const cx = this.x;
    const cy = this.y;
    this.gfx.destroy();
    this.destroy();
    return Array.from({ length: 8 }, (_, i) => ({
      x: cx,
      y: cy,
      angle: (i * Math.PI * 2) / 8,
    }));
  }

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}
