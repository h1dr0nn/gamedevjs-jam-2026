import Phaser from 'phaser';
import type { HazardId } from '../types';
import type { JuiceSystem } from '../systems/JuiceSystem';
import type { Enemy } from './Enemy';
import type { Player } from './Player';
import { playSfx } from '../systems/AudioSystem';

export interface HazardOpts {
  sawDamage: number;
}

/**
 * A single hazard tile. Owns its own sprite + logic timers.
 * Damage to enemies / player is pushed each frame by HazardSystem.
 */
export class Hazard {
  type: HazardId;
  sprite: Phaser.GameObjects.Sprite;
  private scene: Phaser.Scene;
  private juice: JuiceSystem;
  private opts: HazardOpts;

  // Saw
  private sawActive = true;

  // Gas phases: idle -> warn -> erupt -> idle ...
  private gasPhase: 'idle' | 'warn' | 'erupt' = 'idle';
  private gasNextSwitchAt = 0;
  private gasAoe!: Phaser.GameObjects.Ellipse;

  // Generator
  private genOverloadedAt = -9999;
  private genActiveUntil = 0;
  private genRing?: Phaser.GameObjects.Arc;

  // Pit
  private pitZone?: Phaser.GameObjects.Rectangle;

  activeDamageZone: Phaser.Geom.Rectangle | null = null;
  activeDamage = 0;
  lethalToEnemies = false;

  constructor(scene: Phaser.Scene, type: HazardId, x: number, y: number, juice: JuiceSystem, opts: HazardOpts) {
    this.scene = scene;
    this.type = type;
    this.juice = juice;
    this.opts = opts;

    switch (type) {
      case 'saw':
        this.sprite = scene.add.sprite(x, y, 'hz-saw').setDepth(30).setScale(1.4);
        this.sprite.play('hz-saw-spin');
        break;
      case 'gas':
        this.sprite = scene.add.sprite(x, y + 4, 'hz-gas-cycle').setDepth(30);
        this.sprite.setAlpha(0);
        this.gasAoe = scene.add.ellipse(x, y - 20, 80, 90, 0x66ff66, 0).setDepth(28);
        this.gasNextSwitchAt = scene.time.now + 1400;
        break;
      case 'generator':
        this.sprite = scene.add.sprite(x, y - 6, 'hz-generator').setDepth(30).setScale(1.2);
        this.sprite.play('hz-generator-idle');
        break;
      case 'pit':
        this.sprite = scene.add.sprite(x, y + 22, 'tile-factory-back_01').setAlpha(0).setDepth(1);
        this.pitZone = scene.add.rectangle(x, y + 22, 32, 30, 0x000000, 0).setDepth(3);
        break;
    }
  }

  /**
   * Player interaction:
   *  - saw: dash into it -> fly horizontally for 1.5s
   *  - gas: attack to force-erupt
   *  - generator: interact to overload -> EMP 2s
   */
  interact(player: Player): boolean {
    if (this.type === 'generator') {
      if (this.scene.time.now < this.genActiveUntil) return false;
      this.overloadGenerator(player);
      return true;
    }
    return false;
  }

  private overloadGenerator(player: Player): void {
    this.genOverloadedAt = this.scene.time.now;
    this.genActiveUntil = this.scene.time.now + 1800;
    this.sprite.play('hz-generator-pulse');
    this.juice.shake(160, 0.008);
    this.juice.flash(0x88ffff, 0.3);
    playSfx('gen');
    const radius = 140 * player.stats.hazardRadiusMultiplier;
    const ring = this.scene.add.circle(this.sprite.x, this.sprite.y, 8, 0x88ffff, 0.5).setDepth(35);
    this.genRing = ring;
    this.scene.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 1800,
      onComplete: () => ring.destroy(),
    });
  }

  update(time: number): void {
    this.activeDamageZone = null;
    this.activeDamage = 0;
    this.lethalToEnemies = false;

    switch (this.type) {
      case 'saw':
        if (this.sawActive) {
          this.activeDamageZone = new Phaser.Geom.Rectangle(this.sprite.x - 22, this.sprite.y - 22, 44, 44);
          this.activeDamage = this.opts.sawDamage;
          this.lethalToEnemies = true;
        }
        break;
      case 'gas':
        this.updateGas(time);
        break;
      case 'generator':
        this.updateGenerator(time);
        break;
      case 'pit':
        this.activeDamageZone = new Phaser.Geom.Rectangle(this.sprite.x - 16, this.sprite.y - 10, 32, 40);
        this.activeDamage = 3;
        this.lethalToEnemies = true;
        break;
    }
  }

  private updateGas(time: number): void {
    if (time < this.gasNextSwitchAt) {
      // apply damage while erupting
      if (this.gasPhase === 'erupt') {
        this.activeDamageZone = new Phaser.Geom.Rectangle(this.sprite.x - 40, this.sprite.y - 80, 80, 100);
        this.activeDamage = 1;
        this.lethalToEnemies = true;
      }
      return;
    }
    // transition
    if (this.gasPhase === 'idle') {
      this.gasPhase = 'warn';
      this.sprite.setAlpha(0.35);
      this.sprite.play('hz-gas-start');
      this.gasAoe.setFillStyle(0xffaa00, 0.18);
      this.gasNextSwitchAt = time + 700;
    } else if (this.gasPhase === 'warn') {
      this.gasPhase = 'erupt';
      this.sprite.setAlpha(1);
      this.sprite.play('hz-gas-cycle');
      this.gasAoe.setFillStyle(0x66ff66, 0.28);
      this.juice.shake(50, 0.003);
      playSfx('gas');
      this.gasNextSwitchAt = time + 1100;
    } else {
      this.gasPhase = 'idle';
      this.sprite.play('hz-gas-end');
      this.sprite.setAlpha(0);
      this.gasAoe.setFillStyle(0x66ff66, 0);
      this.gasNextSwitchAt = time + 2400;
    }
  }

  private updateGenerator(time: number): void {
    if (time < this.genActiveUntil) {
      // pulsing EMP: stun/kill enemies in radius
      const elapsed = time - this.genOverloadedAt;
      const radius = Phaser.Math.Linear(10, 140, Math.min(1, elapsed / 600));
      this.activeDamageZone = new Phaser.Geom.Rectangle(this.sprite.x - radius, this.sprite.y - radius, radius * 2, radius * 2);
      this.activeDamage = 3;
      this.lethalToEnemies = true;
    } else if (this.sprite.anims.currentAnim?.key !== 'hz-generator-idle') {
      this.sprite.play('hz-generator-idle');
    }
  }

  /** Returns true if enemy is inside the active zone and should be damaged. */
  intersectsEnemy(enemy: Enemy): boolean {
    if (!this.activeDamageZone) return false;
    return this.activeDamageZone.contains(enemy.x, enemy.y - 20);
  }

  intersectsPlayer(player: Player): boolean {
    if (!this.activeDamageZone) return false;
    if (this.type === 'gas' && player.stats.invulnerableToOwnGas) return false;
    return this.activeDamageZone.contains(player.x, player.y - 20);
  }

  destroy(): void {
    this.sprite.destroy();
    this.gasAoe?.destroy();
    this.pitZone?.destroy();
    this.genRing?.destroy();
  }
}
