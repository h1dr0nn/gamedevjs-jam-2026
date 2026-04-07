import Phaser from 'phaser';
import { TILES } from '../../utils/TileResolver';

export class Boulder extends Phaser.Physics.Arcade.Sprite {
  launched = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TILES.boulder.sheet, TILES.boulder.frame);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static until launched
    this.setDisplaySize(22, 22);
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(22, 22);
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
}
