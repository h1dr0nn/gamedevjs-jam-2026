import Phaser from 'phaser';
import { PlayerStats, DEFAULT_PLAYER_STATS, EVENTS } from '../types';
import { DashSystem } from '../systems/DashSystem';
import { TILES } from '../utils/TileResolver';

const STILL_TIMEOUT = 2000;

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  stats: PlayerStats;
  readonly dashSystem: DashSystem;
  hasRevival = false;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private stillTimer = 0;
  isVulnerable = false;
  private afterimages: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TILES.player.sheet, TILES.player.frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(24, 24);
    this.postFX?.addGlow(0x00ffff, 4, 0, false, 0.1, 16);

    this.stats = { ...DEFAULT_PLAYER_STATS };
    this.hp = this.stats.maxHp;
    this.dashSystem = new DashSystem(scene, this.stats);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(20, 20);

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.performDash(pointer.worldX, pointer.worldY);
    });
  }

  private performDash(toX: number, toY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const started = this.dashSystem.tryDash(body, this.x, this.y, toX, toY);
    if (started) {
      this.stillTimer = 0;
      this.isVulnerable = false;
      this.spawnAfterimage();
    }
  }

  private spawnAfterimage(): void {
    const ghost = this.scene.add.image(this.x, this.y, TILES.player.sheet, TILES.player.frame);
    ghost.setDisplaySize(24, 24);
    ghost.setAlpha(0.5);
    ghost.setTint(0x00ffff);
    this.afterimages.push(ghost);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: ghost.scaleX * 1.5,
      scaleY: ghost.scaleY * 1.5,
      duration: 200,
      onComplete: () => {
        ghost.destroy();
        const idx = this.afterimages.indexOf(ghost);
        if (idx !== -1) this.afterimages.splice(idx, 1);
      },
    });
  }

  takeDamage(amount: number): void {
    if (this.dashSystem.isDashing) return;
    if (this.hasRevival && this.hp <= amount) {
      this.hp = 1;
      this.hasRevival = false;
      return;
    }
    this.hp -= amount;
    this.scene.events.emit(EVENTS.PLAYER_HP_CHANGE, this.hp);
    if (this.hp <= 0) {
      this.scene.events.emit(EVENTS.PLAYER_DIED);
    }
  }

  applyStats(stats: PlayerStats): void {
    this.stats = stats;
    this.dashSystem.updateStats(stats);
    if (stats.maxHp > this.hp) this.hp = stats.maxHp;
    this.scene.events.emit(EVENTS.PLAYER_HP_CHANGE, this.hp);
  }

  preUpdate(_time: number, delta: number): void {
    super.preUpdate(_time, delta);
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.dashSystem.update(delta, body);

    if (!this.dashSystem.isDashing) {
      const SPEED = 160;
      let vx = 0, vy = 0;
      if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
      else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
      if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
      else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;
      const len = Math.sqrt(vx * vx + vy * vy) || 1;
      body.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);

      if (vx === 0 && vy === 0) {
        this.stillTimer += delta;
        if (this.stillTimer >= STILL_TIMEOUT) this.isVulnerable = true;
      } else {
        this.stillTimer = 0;
        this.isVulnerable = false;
      }
    }

    if (this.isVulnerable) {
      this.setTint(0xff4444);
    } else {
      this.clearTint();
    }
  }

  destroy(fromScene?: boolean): void {
    this.afterimages.forEach(a => a.destroy());
    super.destroy(fromScene);
  }
}
