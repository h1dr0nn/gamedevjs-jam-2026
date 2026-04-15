import Phaser from 'phaser';
import type { PrototypeId, PlayerStats } from '../types';
import { EVENTS } from '../types';
import type { InputState } from '../systems/InputSystem';
import type { JuiceSystem } from '../systems/JuiceSystem';
import { Projectile } from './Projectile';
import { playSfx } from '../systems/AudioSystem';

type AnimState = 'idle' | 'walk' | 'jump' | 'fall' | 'attack' | 'hurt' | 'dead' | 'dash' | 'climb' | 'shutdown' | 'enabling';

const COYOTE_MS = 120;
const JUMP_BUFFER_MS = 140;
const CLIMB_SPEED = 150;
const GRAVITY_Y = 900;
// Multiplier applied while holding jump (floatier ascent), and when falling (snappier descent)
const JUMP_HOLD_GRAVITY_MUL = 0.45;
const FALL_GRAVITY_MUL = 1.6;

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats: PlayerStats;
  readonly proto: PrototypeId;

  private facing: 1 | -1 = 1;
  private lockAnimUntil = 0;

  private lastOnGround = 0;
  private jumpBufferedAt = -9999;
  private canAirDash = true;

  private dashChargesLeft: number;
  private dashReadyAt = 0;
  private dashEndsAt = 0;
  private isDashing = false;

  private iFrameUntil = 0;
  private nextAttackAt = 0;
  private nextHurtAnimAt = 0;

  private onLadder = false;
  private climbing = false;
  private jumpHeld = false;

  private specialCharge = 0;

  private juice: JuiceSystem;
  private projectileGroup: Phaser.Physics.Arcade.Group;

  isDead = false;

  constructor(scene: Phaser.Scene, x: number, y: number, proto: PrototypeId, stats: PlayerStats, juice: JuiceSystem, projGroup: Phaser.Physics.Arcade.Group) {
    super(scene, x, y, `robot-${proto}-idle`);
    this.proto = proto;
    this.stats = stats;
    this.juice = juice;
    this.projectileGroup = projGroup;
    this.dashChargesLeft = stats.dashCharges;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(50);
    this.setCollideWorldBounds(true);
    this.setScale(0.6);
    this.play(`robot-${proto}-idle`);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Body size in source-sprite units (before scale). Phaser auto-applies scale.
    body.setSize(28, 52);
    body.setOffset(50, 70);
    body.setGravityY(GRAVITY_Y);
    body.setMaxVelocity(600, 900);

    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimComplete, this);
  }

  setLadderOverlap(on: boolean): void {
    this.onLadder = on;
    if (!on && this.climbing) {
      this.climbing = false;
      (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
    }
  }

  applyChip(apply: (s: PlayerStats) => PlayerStats): void {
    const before = this.stats;
    const next = apply(before);
    this.stats = next;
    this.dashChargesLeft = Math.max(this.dashChargesLeft, next.dashCharges);
    this.scene.events.emit(EVENTS.PLAYER_HP, this.stats.hp, this.stats.maxHp);
  }

  heal(amount: number): void {
    if (this.isDead) return;
    this.stats = { ...this.stats, hp: Math.min(this.stats.maxHp, this.stats.hp + amount) };
    this.scene.events.emit(EVENTS.PLAYER_HP, this.stats.hp, this.stats.maxHp);
  }

  tryDamage(amount: number, knockbackFromX = 0): boolean {
    if (this.isDead) return false;
    const now = this.scene.time.now;
    if (now < this.iFrameUntil) return false;
    if (this.isDashing) return false;
    this.stats = { ...this.stats, hp: Math.max(0, this.stats.hp - amount) };
    this.iFrameUntil = now + this.stats.iFrameDuration;
    this.nextHurtAnimAt = now + 250;
    this.juice.shake(200, 0.012);
    this.juice.hitstop(60);
    this.juice.spawnHitSpark(this.x, this.y - 20, 0xff4444);
    this.scene.events.emit(EVENTS.PLAYER_HP, this.stats.hp, this.stats.maxHp);
    // knockback
    const kx = knockbackFromX < this.x ? 240 : -240;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(kx, -200);
    this.playAnim('hurt', 300);
    if (this.stats.hp <= 0) {
      playSfx('die');
      this.die();
    } else {
      playSfx('hurt');
      // blink
      this.scene.tweens.add({
        targets: this,
        alpha: 0.3,
        duration: 80,
        yoyo: true,
        repeat: Math.floor(this.stats.iFrameDuration / 160),
        onComplete: () => this.setAlpha(1),
      });
    }
    return true;
  }

  private die(): void {
    if (this.isDead) return;
    this.isDead = true;
    this.playAnim('dead', 9999);
    (this.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    this.scene.events.emit(EVENTS.PLAYER_DIED);
  }

  addSpecialCharge(n: number): void {
    this.specialCharge = Math.min(this.stats.specialChargeNeeded, this.specialCharge + n);
    this.scene.events.emit(EVENTS.SPECIAL_CHARGE, this.specialCharge, this.stats.specialChargeNeeded);
  }

  triggerSpecial(): boolean {
    if (this.specialCharge < this.stats.specialChargeNeeded) return false;
    this.specialCharge = 0;
    this.scene.events.emit(EVENTS.SPECIAL_CHARGE, 0, this.stats.specialChargeNeeded);
    // Special = fire a volley of 3 piercing projectiles
    const dmg = this.stats.attackDamage * 2;
    for (let i = -1; i <= 1; i++) {
      const p = this.projectileGroup.get(this.x + this.facing * 40, this.y - 20 + i * 10, 'proj-special') as Projectile;
      if (!p) continue;
      p.setActive(true).setVisible(true);
      p.fire({ dx: this.facing, speed: 560, damage: dmg, fromPlayer: true, pierce: 4, color: 0x00ffff, scale: 3, lifeMs: 900 });
    }
    this.juice.slowMo(220, 0.45);
    this.juice.flash(0x00ffff, 0.3);
    this.playAnim('attack', 280);
    playSfx('special');
    return true;
  }

  update(_time: number, delta: number, input: InputState): void {
    if (this.isDead) return;
    const now = this.scene.time.now;
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (body.blocked.down || body.touching.down) {
      this.lastOnGround = now;
      this.canAirDash = true;
      if (this.dashChargesLeft < this.stats.dashCharges) this.dashChargesLeft = this.stats.dashCharges;
    }

    // Climb ladder
    if (this.onLadder && (input.up || input.down)) {
      this.climbing = true;
      body.setAllowGravity(false);
    }
    if (this.climbing) {
      const vy = input.up ? -CLIMB_SPEED : input.down ? CLIMB_SPEED : 0;
      body.setVelocityY(vy);
      if (!this.onLadder) {
        this.climbing = false;
        body.setAllowGravity(true);
      }
    }

    // Dash handling
    if (this.isDashing) {
      if (now >= this.dashEndsAt) {
        this.isDashing = false;
        body.setVelocityX(this.facing * this.stats.moveSpeed * 0.3);
      } else {
        // keep dash velocity
        if ((now / 40) % 2 < 1) this.juice.afterimage(this, 200);
      }
    }

    if (input.dashPressed && !this.isDashing && now >= this.dashReadyAt) {
      const canUse = body.blocked.down || body.touching.down || this.canAirDash;
      if (canUse && this.dashChargesLeft > 0) {
        this.dashChargesLeft--;
        if (!(body.blocked.down || body.touching.down)) this.canAirDash = false;
        this.isDashing = true;
        this.dashEndsAt = now + this.stats.dashDuration;
        this.dashReadyAt = now + this.stats.dashCooldown;
        this.iFrameUntil = Math.max(this.iFrameUntil, now + this.stats.dashDuration + 60);
        const dir = input.left && !input.right ? -1 : input.right && !input.left ? 1 : this.facing;
        this.facing = dir as 1 | -1;
        body.setVelocityX(dir * this.stats.dashSpeed);
        body.setVelocityY(-40);
        this.juice.shake(80, 0.004);
        this.playAnim('dash', this.stats.dashDuration);
        playSfx('dash');
      }
    }

    // Horizontal movement with smooth acceleration/deceleration
    if (!this.isDashing && now >= this.nextHurtAnimAt) {
      const grounded = body.blocked.down || body.touching.down;
      const accel = grounded ? 1600 : 900; // faster accel on ground
      const decel = grounded ? 1800 : 600; // slower decel in air (momentum)
      if (input.left && !input.right) {
        body.setAccelerationX(-accel);
        this.facing = -1;
      } else if (input.right && !input.left) {
        body.setAccelerationX(accel);
        this.facing = 1;
      } else {
        body.setAccelerationX(0);
        // Apply deceleration
        if (Math.abs(body.velocity.x) > 5) {
          const sign = body.velocity.x > 0 ? 1 : -1;
          const newVx = body.velocity.x - sign * decel * (delta / 1000);
          body.setVelocityX(Math.abs(newVx) < 5 ? 0 : newVx);
        } else {
          body.setVelocityX(0);
        }
      }
      // Clamp to max speed
      if (Math.abs(body.velocity.x) > this.stats.moveSpeed) {
        body.setVelocityX(Math.sign(body.velocity.x) * this.stats.moveSpeed);
      }
    }
    this.setFlipX(this.facing < 0);

    // Jump (buffer + coyote + variable height)
    if (input.jumpPressed) this.jumpBufferedAt = now;
    const withinCoyote = now - this.lastOnGround <= COYOTE_MS;
    const withinBuffer = now - this.jumpBufferedAt <= JUMP_BUFFER_MS;
    if (withinBuffer && withinCoyote && !this.climbing) {
      body.setVelocityY(-this.stats.jumpVelocity);
      this.lastOnGround = -9999;
      this.jumpBufferedAt = -9999;
      this.jumpHeld = true;
      playSfx('jump');
    }
    if (this.climbing && input.jumpPressed) {
      this.climbing = false;
      body.setAllowGravity(true);
      body.setVelocityY(-this.stats.jumpVelocity * 0.7);
      this.jumpHeld = true;
    }
    // Variable jump height: reduce gravity while holding jump during ascent
    if (!input.jump) this.jumpHeld = false;
    if (body.velocity.y < 0 && this.jumpHeld) {
      body.setGravityY(GRAVITY_Y * JUMP_HOLD_GRAVITY_MUL);
    } else if (body.velocity.y > 0) {
      // Faster fall for snappy landings
      body.setGravityY(GRAVITY_Y * FALL_GRAVITY_MUL);
    } else {
      body.setGravityY(GRAVITY_Y);
    }

    // Attack
    if (input.attackPressed && now >= this.nextAttackAt && now >= this.nextHurtAnimAt) {
      this.attack();
    }

    // Special
    if (input.specialPressed) this.triggerSpecial();

    this.updateAnim(body, now);
  }

  private attack(): void {
    const now = this.scene.time.now;
    this.nextAttackAt = now + this.stats.attackCooldown;
    const key = `robot-${this.proto}-attack`;
    this.play(key, true);
    this.lockAnimUntil = now + 200;

    // Ranged: Destroyer / Infantryman fire projectiles
    if (this.proto !== 'swordsman') {
      const p = this.projectileGroup.get(this.x + this.facing * 40, this.y - 10, 'proj-player') as Projectile;
      if (p) {
        p.setActive(true).setVisible(true);
        p.fire({
          dx: this.facing,
          speed: 640,
          damage: this.stats.attackDamage,
          fromPlayer: true,
          pierce: this.stats.pierce,
          color: this.proto === 'destroyer' ? 0xffaa33 : 0xffff88,
          scale: this.proto === 'destroyer' ? 3 : 2,
          lifeMs: 900,
        });
      }
      this.juice.shake(40, 0.003);
      playSfx('shoot');
    } else {
      // Melee: swing -> registered by scene querying nearby enemies
      this.scene.events.emit('melee-swing', { x: this.x + this.facing * 40, y: this.y - 10, dir: this.facing, range: this.stats.attackRange, damage: this.stats.attackDamage });
      this.juice.shake(60, 0.005);
      playSfx('hit');
    }
  }

  private playAnim(state: AnimState, lockMs: number): void {
    const key = `robot-${this.proto}-${state}`;
    if (!this.scene.anims.exists(key)) return;
    void state;
    this.play(key, true);
    this.lockAnimUntil = this.scene.time.now + lockMs;
  }

  private updateAnim(body: Phaser.Physics.Arcade.Body, now: number): void {
    if (now < this.lockAnimUntil) return;
    const grounded = body.blocked.down || body.touching.down;
    if (this.climbing) {
      this.setTexture(`robot-${this.proto}-walk`).anims.play(`robot-${this.proto}-walk`, true);
      this.anims.msPerFrame = body.velocity.y === 0 ? 9999 : 80;
      return;
    }
    if (!grounded) {
      // Use walk for jump/fall (best available), could differentiate with jump/fall anim if sprite has it
      this.playAnim('walk', 0);
      return;
    }
    if (Math.abs(body.velocity.x) > 10) this.playAnim('walk', 0);
    else this.playAnim('idle', 0);
  }

  private onAnimComplete = (anim: Phaser.Animations.Animation) => {
    if (anim.key.endsWith('-attack') || anim.key.endsWith('-attack1')) {
      this.lockAnimUntil = 0;
    }
  };

  getFacing(): 1 | -1 {
    return this.facing;
  }
}
