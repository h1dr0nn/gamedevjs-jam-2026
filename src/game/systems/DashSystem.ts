import Phaser from 'phaser';
import { PlayerStats } from '../types';

export type DashState = 'ready' | 'dashing' | 'cooldown';

export class DashSystem {
  state: DashState = 'ready';
  chargesLeft: number;

  private cooldownTimer = 0;
  private dashEndTimer = 0;
  private dashStartX = 0;
  private dashStartY = 0;
  private readonly DASH_DURATION = 120; // ms

  constructor(_scene: Phaser.Scene, private stats: PlayerStats) {
    this.chargesLeft = stats.dashCharges;
  }

  updateStats(stats: PlayerStats): void {
    this.stats = stats;
    this.chargesLeft = stats.dashCharges;
  }

  tryDash(
    body: Phaser.Physics.Arcade.Body,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): boolean {
    if (this.state !== 'ready' || this.chargesLeft <= 0) return false;

    const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
    const speed = (this.stats.dashDistance / this.DASH_DURATION) * 1000;

    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.state = 'dashing';
    this.chargesLeft--;
    this.dashEndTimer = this.DASH_DURATION;
    this.dashStartX = fromX;
    this.dashStartY = fromY;

    return true;
  }

  update(delta: number, body: Phaser.Physics.Arcade.Body): void {
    if (this.state === 'dashing') {
      // Cap delta to prevent frame-spike teleportation
      const dt = Math.min(delta, 50);
      this.dashEndTimer -= dt;

      // Also stop if player has already traveled max distance
      const traveled = Phaser.Math.Distance.Between(
        this.dashStartX, this.dashStartY,
        body.center.x, body.center.y
      );

      if (this.dashEndTimer <= 0 || traveled >= this.stats.dashDistance) {
        body.setVelocity(0, 0);
        this.state = 'cooldown';
        this.cooldownTimer = this.stats.dashCooldown;
      }
    } else if (this.state === 'cooldown') {
      this.cooldownTimer -= delta;
      if (this.cooldownTimer <= 0) {
        this.state = 'ready';
        this.chargesLeft = Math.min(this.chargesLeft + 1, this.stats.dashCharges);
      }
    }
  }

  get isDashing(): boolean { return this.state === 'dashing'; }
}
