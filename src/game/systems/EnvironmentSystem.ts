import Phaser from 'phaser';
import { Barrel } from '../entities/environment/Barrel';
import { Enemy } from '../entities/enemies/Enemy';
import { PlayerStats, EVENTS } from '../types';

export class EnvironmentSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private stats: PlayerStats
  ) {}

  updateStats(stats: PlayerStats): void {
    this.stats = stats;
  }

  explodeAt(
    x: number,
    y: number,
    barrels: Phaser.GameObjects.Group,
    enemies: Phaser.GameObjects.Group,
    depth = 0
  ): void {
    const radius = 80 * this.stats.explosionRadius;

    const circle = this.scene.add.circle(x, y, radius, 0xff6600, 0.4);
    this.scene.tweens.add({
      targets: circle,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      onComplete: () => circle.destroy(),
    });

    this.scene.cameras.main.shake(150, 0.008);
    this.scene.events.emit(EVENTS.EXPLOSION, { x, y, radius });

    enemies.getChildren().forEach(obj => {
      const enemy = obj as Enemy;
      if (!enemy.active) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist <= radius) {
        enemy.takeDamage(1);
        if (enemy.isDead) {
          this.scene.events.emit(EVENTS.ENEMY_KILLED, enemy);
        }
      }
    });

    if (depth < 4) {
      barrels.getChildren().forEach(obj => {
        const barrel = obj as Barrel;
        if (!barrel.active || barrel.exploded) return;
        const dist = Phaser.Math.Distance.Between(x, y, barrel.x, barrel.y);
        if (dist <= radius) {
          barrel.triggerExplosion();
          this.scene.time.delayedCall(80, () => {
            this.explodeAt(barrel.x, barrel.y, barrels, enemies, depth + 1);
          });
        }
      });
    }
  }

  spawnDebris(x: number, y: number, angles: number[]): void {
    angles.forEach(angle => {
      const debris = this.scene.add.rectangle(x, y, 8, 8, 0x888888);
      this.scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * 80,
        y: y + Math.sin(angle) * 80,
        alpha: 0,
        duration: 250,
        onComplete: () => debris.destroy(),
      });
    });
  }
}
