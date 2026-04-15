import Phaser from 'phaser';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage = 1;
  fromPlayer = false;
  pierce = 0;
  private hitEnemies = new Set<number>();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'proj-player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(40);
  }

  fire(opts: { dx: number; speed: number; damage: number; fromPlayer: boolean; pierce?: number; textureKey?: string; scale?: number; color?: number; lifeMs?: number }): void {
    this.fromPlayer = opts.fromPlayer;
    this.damage = opts.damage;
    this.pierce = opts.pierce ?? 0;
    this.hitEnemies.clear();
    this.setActive(true).setVisible(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(14, 6);
    body.setVelocity(opts.dx * opts.speed, 0);
    this.setFlipX(opts.dx < 0);
    if (opts.textureKey) this.setTexture(opts.textureKey);
    this.setScale(opts.scale ?? 2);
    this.setTint(opts.color ?? (opts.fromPlayer ? 0xffff88 : 0xff5533));
    const life = opts.lifeMs ?? 1500;
    this.scene.time.delayedCall(life, () => this.kill());
  }

  canHit(id: number): boolean {
    if (this.hitEnemies.has(id)) return false;
    return true;
  }

  recordHit(id: number): boolean {
    this.hitEnemies.add(id);
    if (this.pierce > 0) {
      this.pierce--;
      return true;
    }
    return false;
  }

  kill(): void {
    if (!this.active) return;
    this.setActive(false).setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.destroy();
  }
}
