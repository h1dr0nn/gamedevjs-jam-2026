import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Shielder } from '../entities/enemies/Shielder';
import { Barrel } from '../entities/environment/Barrel';
import { Boulder } from '../entities/environment/Boulder';
import { CrackedWall } from '../entities/environment/CrackedWall';
import { Turret } from '../entities/enemies/Turret';
import { EnvironmentSystem } from './EnvironmentSystem';
import { EVENTS } from '../types';

export class CollisionHandler {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemyGroup: Phaser.GameObjects.Group,
    private readonly barrelGroup: Phaser.GameObjects.Group,
    private readonly boulderGroup: Phaser.GameObjects.Group,
    private readonly crackedWallGroup: Phaser.GameObjects.Group,
    private readonly envSystem: EnvironmentSystem
  ) {}

  wire(): void {
    // Dash into enemies
    this.scene.physics.add.overlap(
      this.player,
      this.enemyGroup,
      (_p, enemyObj) => {
        if (!this.player.dashSystem.isDashing) return;
        const enemy = enemyObj as Enemy;
        if (enemy instanceof Shielder && enemy.isBlockingDash(this.player.x, this.player.y)) {
          const body = this.player.body as Phaser.Physics.Arcade.Body;
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          body.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
          return;
        }
        enemy.takeDamage(1);
        this.scene.cameras.main.shake(80, 0.006);
        if (enemy.isDead) {
          this.scene.events.emit(EVENTS.ENEMY_KILLED, enemy);
          enemy.destroy();
        }
      }
    );

    // Dash into barrels
    this.scene.physics.add.overlap(
      this.player,
      this.barrelGroup,
      (_p, barrelObj) => {
        if (!this.player.dashSystem.isDashing) return;
        const barrel = barrelObj as Barrel;
        if (!barrel.exploded) {
          barrel.triggerExplosion();
          this.envSystem.explodeAt(barrel.x, barrel.y, this.barrelGroup, this.enemyGroup);
        }
      }
    );

    // Dash into boulders
    this.scene.physics.add.overlap(
      this.player,
      this.boulderGroup,
      (_p, boulderObj) => {
        if (!this.player.dashSystem.isDashing) return;
        const boulder = boulderObj as Boulder;
        if (!boulder.launched) {
          const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, boulder.x, boulder.y);
          boulder.launch(angle);
        }
      }
    );

    // Dash into cracked walls
    this.scene.physics.add.overlap(
      this.player,
      this.crackedWallGroup,
      (_p, wallObj) => {
        if (!this.player.dashSystem.isDashing) return;
        const wall = wallObj as CrackedWall;
        const debris = wall.shatter();
        this.envSystem.spawnDebris(wall.x, wall.y, debris.map(d => d.angle));
        this.scene.cameras.main.shake(100, 0.005);
      }
    );

    // Enemy contact with player (non-dash = damage)
    this.scene.physics.add.overlap(
      this.player,
      this.enemyGroup,
      (_p, enemyObj) => {
        if (this.player.dashSystem.isDashing) return;
        const enemy = enemyObj as Enemy;
        if (enemy.active && !enemy.isDead) {
          this.player.takeDamage(1);
        }
      }
    );
  }

  /** Check Turret bullet proximity vs player each frame. Call from GameScene.update(). */
  checkTurretBullets(enemyGroup: Phaser.GameObjects.Group): void {
    if (this.player.dashSystem.isDashing) return;
    enemyGroup.getChildren().forEach(obj => {
      const turret = obj as Turret;
      if (!turret.active || !(turret instanceof Turret)) return;
      turret.bullets.forEach(bullet => {
        if (!bullet.active) return;
        const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, this.player.x, this.player.y);
        if (dist < 16) {
          bullet.destroy();
          this.player.takeDamage(1);
        }
      });
    });
  }
}
