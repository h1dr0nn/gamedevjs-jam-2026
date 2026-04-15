import Phaser from 'phaser';
import type { EnemyDef } from '../types';
import { EVENTS } from '../types';
import type { Player } from './Player';
import type { JuiceSystem } from '../systems/JuiceSystem';
import { Projectile } from './Projectile';
import { playSfx } from '../systems/AudioSystem';

const GRAVITY_Y = 1400;
let nextId = 1;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly enemyId: number;
  readonly def: EnemyDef;
  hp: number;
  isDead = false;
  scrapValue: number;

  private player: Player;
  private juice: JuiceSystem;
  private projectileGroup: Phaser.Physics.Arcade.Group;
  private nextAttackAt = 0;
  private attackLockUntil = 0;
  private hurtUntil = 0;
  private direction: 1 | -1 = -1;
  private aggro = false;
  private patrolDir: 1 | -1 = 1;
  private patrolTurnAt = 0;
  private spawnX: number;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef, player: Player, juice: JuiceSystem, projGroup: Phaser.Physics.Arcade.Group) {
    super(scene, x, y, `enemy-${def.id}-idle`);
    this.enemyId = nextId++;
    this.def = def;
    this.hp = def.hp;
    this.scrapValue = def.scrapValue;
    this.player = player;
    this.juice = juice;
    this.projectileGroup = projGroup;

    this.spawnX = x;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(45);
    this.setScale(0.65 * def.spriteScale);
    this.play(`enemy-${def.id}-idle`);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(def.width, def.height);
    body.setOffset((96 - def.width) / 2, 96 - def.height - 4);
    body.setGravityY(GRAVITY_Y);
    body.setCollideWorldBounds(true);
  }

  tryDamage(amount: number, fromX: number): boolean {
    if (this.isDead) return false;
    this.hp -= amount;
    this.hurtUntil = this.scene.time.now + 220;
    this.juice.spawnHitSpark(this.x, this.y - 20, 0xffff88);
    this.juice.hitstop(40);
    playSfx('hit');
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Stronger knockback for satisfying hits
    const kbDir = fromX < this.x ? 1 : -1;
    body.setVelocityX(kbDir * 320);
    body.setVelocityY(-200);
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => this.clearTint());
    this.play(`enemy-${this.def.id}-hurt`, true);
    if (this.hp <= 0) this.kill(false);
    return true;
  }

  killByHazard(): void {
    this.kill(true);
  }

  private kill(envKill: boolean): void {
    if (this.isDead) return;
    this.isDead = true;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.juice.spawnDeathBurst(this.x, this.y - 20, envKill ? 0x66ff66 : 0xff7744);
    this.scene.events.emit(EVENTS.ENEMY_KILLED, { x: this.x, y: this.y, envKill, scrap: this.scrapValue, id: this.enemyId });
    playSfx('kill');
    this.play(`enemy-${this.def.id}-dead`, true);
    this.scene.time.delayedCall(450, () => this.destroy());
  }

  update(time: number, _delta: number): void {
    if (this.isDead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (time < this.hurtUntil) return;
    if (time < this.attackLockUntil) return;

    const dx = this.player.x - this.x;
    const dy = this.player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (!this.aggro && dist < this.def.aggroRange) this.aggro = true;

    if (!this.aggro) {
      // Patrol within 120px of spawn point
      const patrolRange = 120;
      const distFromSpawn = this.x - this.spawnX;
      if (time >= this.patrolTurnAt) {
        if (distFromSpawn > patrolRange) { this.patrolDir = -1; this.patrolTurnAt = time + 1200; }
        else if (distFromSpawn < -patrolRange) { this.patrolDir = 1; this.patrolTurnAt = time + 1200; }
      }
      // Check wall ahead to reverse patrol
      if (body.blocked.right && this.patrolDir === 1) { this.patrolDir = -1; this.patrolTurnAt = time + 800; }
      if (body.blocked.left && this.patrolDir === -1) { this.patrolDir = 1; this.patrolTurnAt = time + 800; }
      const patrolSpeed = this.def.speed * 0.4;
      body.setVelocityX(this.patrolDir * patrolSpeed);
      this.setFlipX(this.patrolDir < 0);
      this.play(`enemy-${this.def.id}-walk`, true);
      return;
    }

    this.direction = dx < 0 ? -1 : 1;
    this.setFlipX(this.direction < 0);

    switch (this.def.behavior) {
      case 'rusher':
        this.updateRusher(time, body, dist);
        break;
      case 'gunner':
        this.updateGunner(time, body, dist, dy);
        break;
      case 'heavy':
        this.updateHeavy(time, body, dist);
        break;
    }
  }

  private updateRusher(time: number, body: Phaser.Physics.Arcade.Body, dist: number): void {
    if (dist < this.def.attackRange) {
      body.setVelocityX(0);
      if (time >= this.nextAttackAt) {
        this.play(`enemy-${this.def.id}-attack`, true);
        this.nextAttackAt = time + this.def.attackCooldown;
        this.attackLockUntil = time + 300;
        this.scene.time.delayedCall(180, () => {
          if (this.isDead) return;
          if (Math.hypot(this.player.x - this.x, this.player.y - this.y) < this.def.attackRange + 10) {
            this.player.tryDamage(this.def.attackDamage, this.x);
          }
        });
      }
    } else {
      body.setVelocityX(this.direction * this.def.speed);
      this.play(`enemy-${this.def.id}-walk`, true);
    }
  }

  private updateGunner(time: number, body: Phaser.Physics.Arcade.Body, dist: number, dy: number): void {
    // keep distance ~ 250px
    const desired = 260;
    if (Math.abs(dy) > 120) {
      // player above/below: fall back
      body.setVelocityX(-this.direction * this.def.speed * 0.5);
    } else if (dist < desired - 60) {
      body.setVelocityX(-this.direction * this.def.speed * 0.8);
    } else if (dist > desired + 60) {
      body.setVelocityX(this.direction * this.def.speed * 0.6);
    } else {
      body.setVelocityX(0);
    }
    if (Math.abs(body.velocity.x) > 5) this.play(`enemy-${this.def.id}-walk`, true);
    else this.play(`enemy-${this.def.id}-idle`, true);

    if (dist < this.def.attackRange && Math.abs(dy) < 100 && time >= this.nextAttackAt) {
      this.play(`enemy-${this.def.id}-attack`, true);
      this.nextAttackAt = time + this.def.attackCooldown;
      this.attackLockUntil = time + 400;
      this.scene.time.delayedCall(260, () => {
        if (this.isDead) return;
        const p = this.projectileGroup.get(this.x + this.direction * 20, this.y - 20, 'proj-enemy') as Projectile;
        if (p) {
          p.setActive(true).setVisible(true);
          p.fire({ dx: this.direction, speed: 360, damage: this.def.attackDamage, fromPlayer: false, color: 0xff3355, scale: 2, lifeMs: 1500 });
        }
      });
    }
  }

  private updateHeavy(time: number, body: Phaser.Physics.Arcade.Body, dist: number): void {
    if (dist < this.def.attackRange) {
      body.setVelocityX(0);
      if (time >= this.nextAttackAt) {
        this.play(`enemy-${this.def.id}-attack`, true);
        this.nextAttackAt = time + this.def.attackCooldown;
        this.attackLockUntil = time + 500;
        this.juice.shake(80, 0.006);
        this.scene.time.delayedCall(340, () => {
          if (this.isDead) return;
          if (Math.hypot(this.player.x - this.x, this.player.y - this.y) < this.def.attackRange + 20) {
            this.player.tryDamage(this.def.attackDamage, this.x);
            this.juice.shake(140, 0.009);
          }
        });
      }
    } else {
      body.setVelocityX(this.direction * this.def.speed);
      this.play(`enemy-${this.def.id}-walk`, true);
    }
  }
}
