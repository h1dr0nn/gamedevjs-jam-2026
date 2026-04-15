import Phaser from 'phaser';

export class JuiceSystem {
  private hitstopUntil = 0;

  constructor(private scene: Phaser.Scene) {}

  shake(duration = 120, intensity = 0.005): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  hitstop(ms = 60): void {
    const now = performance.now();
    // Already in a longer hitstop — don't stack/override
    if (now < this.hitstopUntil) return;
    this.hitstopUntil = now + ms;

    // Slow animations slightly via timeScale but keep physics running (no isPaused)
    // window.setTimeout is immune to Phaser timeScale so resume is guaranteed
    this.scene.time.timeScale = 0.05;
    window.setTimeout(() => {
      // Only restore if we're still the "owner" of this hitstop
      if (performance.now() >= this.hitstopUntil - 5) {
        this.scene.time.timeScale = 1;
      }
    }, ms);
  }

  slowMo(duration = 180, factor = 0.35): void {
    const t = this.scene.time;
    t.timeScale = factor;
    this.scene.tweens.addCounter({
      from: factor,
      to: 1,
      duration,
      ease: 'Quad.easeIn',
      onUpdate: (tw) => {
        t.timeScale = tw.getValue() ?? 1;
      },
      onComplete: () => {
        t.timeScale = 1;
      },
    });
  }

  spawnHitSpark(x: number, y: number, color = 0xffcc33): void {
    const s = this.scene.add.circle(x, y, 6, color, 1).setDepth(900);
    this.scene.tweens.add({
      targets: s,
      scale: 2.5,
      alpha: 0,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => s.destroy(),
    });
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 18;
      const spark = this.scene.add.rectangle(x, y, 3, 3, color).setDepth(900);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        alpha: 0,
        duration: 300,
        onComplete: () => spark.destroy(),
      });
    }
  }

  spawnDeathBurst(x: number, y: number, color = 0xff5533): void {
    this.spawnHitSpark(x, y, color);
    for (let i = 0; i < 14; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 40;
      const p = this.scene.add.rectangle(x, y, 4, 4, color).setDepth(900);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        alpha: 0,
        duration: 500 + Math.random() * 200,
        onComplete: () => p.destroy(),
      });
    }
    const ring = this.scene.add.circle(x, y, 8, 0xffffff, 0.6).setDepth(899);
    this.scene.tweens.add({
      targets: ring,
      scale: 5,
      alpha: 0,
      duration: 300,
      onComplete: () => ring.destroy(),
    });
  }

  afterimage(sprite: Phaser.GameObjects.Sprite, lifeMs = 280): void {
    const ghost = this.scene.add
      .sprite(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setFlipX(sprite.flipX)
      .setAlpha(0.55)
      .setTint(0x66ffff)
      .setDepth(sprite.depth - 1);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: lifeMs,
      onComplete: () => ghost.destroy(),
    });
  }

  flash(color = 0xffffff, _alpha = 0.35, duration = 120): void {
    const cam = this.scene.cameras.main;
    cam.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff, false);
  }
}
