import Phaser from 'phaser';
import { EVENTS } from '../types';

export class JuiceSystem {
  private slowmoActive = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.wireEvents();
  }

  private wireEvents(): void {
    this.scene.events.on(EVENTS.COMBO_UPDATE, (mult: number) => {
      if (mult >= 3 && !this.slowmoActive) {
        this.triggerSlowmo();
      }
    });
  }

  spawnKillParticles(x: number, y: number, color = 0xffffff): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = Phaser.Math.Between(20, 60);
      const particle = this.scene.add.circle(x, y, Phaser.Math.Between(2, 5), color);
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: Phaser.Math.Between(150, 300),
        onComplete: () => particle.destroy(),
      });
    }
  }

  triggerSlowmo(): void {
    if (this.slowmoActive) return;
    this.slowmoActive = true;
    this.scene.physics.world.timeScale = 0.15;
    this.scene.time.timeScale = 0.15;
    this.scene.time.delayedCall(80, () => {
      this.scene.physics.world.timeScale = 1.0;
      this.scene.time.timeScale = 1.0;
      this.slowmoActive = false;
    });
  }

  screenFlash(alpha = 0.3, duration = 80): void {
    const { width, height } = this.scene.scale;
    const flash = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0xffffff, alpha)
      .setScrollFactor(0)
      .setDepth(100);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      onComplete: () => flash.destroy(),
    });
  }
}
