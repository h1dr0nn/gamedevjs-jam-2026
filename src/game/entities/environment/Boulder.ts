import Phaser from 'phaser';

export class Boulder extends Phaser.Physics.Arcade.Sprite {
  launched = false;
  private gfx: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static until launched
    this.gfx = scene.add.ellipse(x, y, 20, 20, 0x888888);
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(20, 20);
  }

  launch(angle: number): void {
    if (this.launched) return;
    this.launched = true;
    const scene = this.scene;
    // Re-add as dynamic body
    scene.physics.world.remove(this.body as Phaser.Physics.Arcade.StaticBody);
    scene.physics.add.existing(this, false);
    const SPEED = 400;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(
      Math.cos(angle) * SPEED,
      Math.sin(angle) * SPEED
    );
    scene.time.delayedCall(400, () => {
      if (this.active) (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.gfx) { this.gfx.x = this.x; this.gfx.y = this.y; }
  }

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}
