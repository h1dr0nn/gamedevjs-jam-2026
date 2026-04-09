import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Grunt } from '../entities/enemies/Grunt';
import { Shielder } from '../entities/enemies/Shielder';
import { Bomber } from '../entities/enemies/Bomber';
import { Turret } from '../entities/enemies/Turret';
import { Barrel } from '../entities/environment/Barrel';
import { ComboSystem } from '../systems/ComboSystem';
import { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { CollisionHandler } from '../systems/CollisionHandler';
import { JuiceSystem } from '../systems/JuiceSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { ALL_UPGRADES } from '../data/upgrades';
import { EVENTS, EnemyType, PlayerStats } from '../types';


const TILE_SIZE = 50;
const COLS = 40;
const ROWS = 30;
const W = COLS * TILE_SIZE;
const H = ROWS * TILE_SIZE;

// ─── Wave scaling ────────────────────────────────────────────────────────────
const SPAWN_INTERVAL_START = 2500;
const SPAWN_INTERVAL_MIN = 600;
const SPAWN_RAMP_TIME = 180_000;
const BARREL_SPAWN_INTERVAL = 12_000;

const ENEMY_UNLOCK: Array<{ type: EnemyType; time: number; weight: number }> = [
  { type: EnemyType.Grunt,    time: 0,      weight: 10 },
  { type: EnemyType.Shielder, time: 30_000, weight: 4 },
  { type: EnemyType.Bomber,   time: 60_000, weight: 3 },
  { type: EnemyType.Turret,   time: 90_000, weight: 2 },
];

// ─── XP / Level ──────────────────────────────────────────────────────────────
const BASE_XP_TO_LEVEL = 10;
const XP_SCALE = 1.3;       // each level needs 1.3× more XP
const GEM_MAGNET_RADIUS = 80;
const GEM_COLLECT_RADIUS = 20;
const GEM_MAGNET_SPEED = 300;

/** XP value by enemy type */
const XP_VALUES: Record<string, number> = {
  [EnemyType.Grunt]: 1,
  [EnemyType.Shielder]: 3,
  [EnemyType.Bomber]: 2,
  [EnemyType.Turret]: 5,
};

export class GameScene extends Phaser.Scene {
  player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private barrels!: Phaser.GameObjects.Group;
  private boulders!: Phaser.GameObjects.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private crosshair!: Phaser.GameObjects.Arc;
  private crosshairDot!: Phaser.GameObjects.Arc;
  private comboSystem!: ComboSystem;
  private envSystem!: EnvironmentSystem;
  private collisionHandler!: CollisionHandler;
  private juiceSystem!: JuiceSystem;
  private upgradeSystem!: UpgradeSystem;

  // ─── Arena state ───────────────────────────────────────────────
  private elapsed = 0;
  private killCount = 0;
  private spawnTimer = 0;
  private barrelTimer = 0;
  private arenaVisuals: Phaser.GameObjects.GameObject[] = [];

  // ─── XP / Level state ─────────────────────────────────────────
  private xp = 0;
  private level = 1;
  private xpToNext = BASE_XP_TO_LEVEL;
  private gems: Array<{ obj: Phaser.GameObjects.Arc; value: number }> = [];

  constructor() { super({ key: 'Game' }); }

  create(): void {
    this.elapsed = 0;
    this.killCount = 0;
    this.spawnTimer = 0;
    this.barrelTimer = 0;
    this.xp = 0;
    this.level = 1;
    this.xpToNext = BASE_XP_TO_LEVEL;
    this.gems = [];

    this.physics.world.setBounds(0, 0, W, H);

    // Groups
    this.enemies = this.add.group();
    this.barrels = this.add.group();
    this.boulders = this.add.group();
    this.walls = this.physics.add.staticGroup();

    this.buildArena();

    // Camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    const vignette = cam.postFX?.addVignette(0.5, 0.5, 0.85, 0.3);
    cam.postFX?.addBloom(0xffffff, 1, 1, 1, 0.8);
    if (vignette) {
      const updateVignette = () => {
        const aspect = this.scale.width / this.scale.height;
        vignette.radius = Math.max(0.7, 0.85 * aspect);
      };
      updateVignette();
      this.scale.on('resize', updateVignette);
    }

    // Player
    this.player = new Player(this, W / 2, H / 2);
    cam.startFollow(this.player, true, 0.08, 0.08);

    // Collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);

    // Crosshair
    this.input.setDefaultCursor('none');
    this.crosshair = this.add.circle(0, 0, 8, 0x00ff99, 0).setStrokeStyle(2, 0x00ff99).setDepth(200);
    this.crosshairDot = this.add.circle(0, 0, 2, 0x00ff99).setDepth(200);
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.crosshair.x = pointer.worldX;
      this.crosshair.y = pointer.worldY;
      this.crosshairDot.x = pointer.worldX;
      this.crosshairDot.y = pointer.worldY;
    });

    // Systems
    this.comboSystem = new ComboSystem({
      comboWindow: this.player.stats.comboWindow,
      comboMultiplierCap: this.player.stats.comboMultiplierCap,
    });
    this.envSystem = new EnvironmentSystem(this, this.player.stats);
    this.collisionHandler = new CollisionHandler(
      this, this.player,
      this.enemies, this.barrels, this.boulders,
      this.physics.add.staticGroup(),
      this.envSystem
    );
    this.collisionHandler.wire();
    this.juiceSystem = new JuiceSystem(this);
    this.upgradeSystem = new UpgradeSystem(ALL_UPGRADES);

    // Events
    this.events.on(EVENTS.ENEMY_KILLED, (enemy: Enemy) => {
      this.comboSystem.registerKill();
      this.juiceSystem.spawnKillParticles(enemy.x, enemy.y, 0xff6600);
      this.killCount++;
      this.events.emit('kill-update', this.killCount);
      this.spawnGem(enemy.x, enemy.y, XP_VALUES[enemy.type] ?? 1);
    });
    this.comboSystem.on('combo-update', (mult: number) => {
      this.events.emit(EVENTS.COMBO_UPDATE, mult);
    });
    this.comboSystem.on('combo-reset', () => {
      this.events.emit(EVENTS.COMBO_RESET);
    });
    this.events.on(EVENTS.PLAYER_DIED, () => this.gameOver());

    this.spawnWave();
    this.scene.launch('UI', { gameScene: this });
  }

  update(_time: number, delta: number): void {
    this.elapsed += delta;
    this.comboSystem.update();
    this.collisionHandler.checkTurretBullets(this.enemies);
    this.events.emit('timer-update', this.elapsed);

    // Wave spawn
    const interval = this.getSpawnInterval();
    this.spawnTimer += delta;
    if (this.spawnTimer >= interval) {
      this.spawnTimer -= interval;
      this.spawnWave();
    }

    // Barrel spawn
    this.barrelTimer += delta;
    if (this.barrelTimer >= BARREL_SPAWN_INTERVAL) {
      this.barrelTimer -= BARREL_SPAWN_INTERVAL;
      this.spawnBarrel();
    }

    // XP gem magnet + collect
    this.updateGems(delta);

    // Clean dead enemies
    this.enemies.getChildren().slice().forEach(e => {
      const enemy = e as { isDead?: boolean; active: boolean };
      if (enemy.isDead && enemy.active) {
        (e as Phaser.GameObjects.GameObject).destroy();
      }
    });

    // Cap enemies
    const MAX_ENEMIES = 40;
    const children = this.enemies.getChildren();
    if (children.length > MAX_ENEMIES) {
      for (let i = 0; i < children.length - MAX_ENEMIES; i++) {
        (children[i] as Phaser.GameObjects.GameObject).destroy();
      }
    }
  }

  // ─── XP Gems ──────────────────────────────────────────────────────────
  private spawnGem(x: number, y: number, value: number): void {
    const size = value >= 3 ? 5 : 3;
    const color = value >= 5 ? 0xff00ff : value >= 3 ? 0x00ccff : 0x44ff44;
    const gem = this.add.circle(x, y, size, color).setDepth(10);
    // Small pop-out animation
    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(15, 30);
    this.tweens.add({
      targets: gem,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      duration: 150,
      ease: 'Quad.easeOut',
    });
    this.gems.push({ obj: gem, value });
  }

  private updateGems(delta: number): void {
    const px = this.player.x;
    const py = this.player.y;
    const dt = delta / 1000;

    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      if (!gem.obj.active) {
        this.gems.splice(i, 1);
        continue;
      }
      const dist = Phaser.Math.Distance.Between(gem.obj.x, gem.obj.y, px, py);

      // Collect
      if (dist < GEM_COLLECT_RADIUS) {
        this.collectXp(gem.value);
        gem.obj.destroy();
        this.gems.splice(i, 1);
        continue;
      }

      // Magnet pull toward player
      if (dist < GEM_MAGNET_RADIUS) {
        const angle = Phaser.Math.Angle.Between(gem.obj.x, gem.obj.y, px, py);
        gem.obj.x += Math.cos(angle) * GEM_MAGNET_SPEED * dt;
        gem.obj.y += Math.sin(angle) * GEM_MAGNET_SPEED * dt;
      }
    }
  }

  private collectXp(amount: number): void {
    this.xp += amount;
    this.events.emit('xp-update', { xp: this.xp, xpToNext: this.xpToNext, level: this.level });

    if (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(BASE_XP_TO_LEVEL * Math.pow(XP_SCALE, this.level - 1));
      this.events.emit('level-up', this.level);
      this.events.emit('xp-update', { xp: this.xp, xpToNext: this.xpToNext, level: this.level });
      this.time.delayedCall(200, () => this.showUpgradeScreen());
    }
  }

  // ─── Wave spawn ────────────────────────────────────────────────────────
  private getSpawnInterval(): number {
    const t = Math.min(this.elapsed / SPAWN_RAMP_TIME, 1);
    return SPAWN_INTERVAL_START - t * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN);
  }

  private getSpawnCount(): number {
    const t = Math.min(this.elapsed / SPAWN_RAMP_TIME, 1);
    return Math.floor(1 + t * 4) + (Math.random() < 0.3 ? 1 : 0);
  }

  private pickEnemyType(): EnemyType {
    const unlocked = ENEMY_UNLOCK.filter(e => this.elapsed >= e.time);
    const total = unlocked.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const entry of unlocked) {
      r -= entry.weight;
      if (r <= 0) return entry.type;
    }
    return EnemyType.Grunt;
  }

  private spawnWave(): void {
    const count = this.getSpawnCount();
    for (let i = 0; i < count; i++) {
      const pos = this.getEdgeSpawnPos();
      this.spawnEnemy(this.pickEnemyType(), pos.x, pos.y);
    }
  }

  private getEdgeSpawnPos(): { x: number; y: number } {
    const margin = TILE_SIZE * 1.5;
    const side = Phaser.Math.Between(0, 3);
    switch (side) {
      case 0: return { x: Phaser.Math.Between(margin, W - margin), y: margin };
      case 1: return { x: Phaser.Math.Between(margin, W - margin), y: H - margin };
      case 2: return { x: margin, y: Phaser.Math.Between(margin, H - margin) };
      default: return { x: W - margin, y: Phaser.Math.Between(margin, H - margin) };
    }
  }

  private spawnEnemy(type: EnemyType, x: number, y: number): void {
    let enemy: Enemy;
    switch (type) {
      case EnemyType.Shielder: { const s = new Shielder(this, x, y); s.setTarget(this.player); enemy = s; break; }
      case EnemyType.Bomber: { const b = new Bomber(this, x, y); b.setTarget(this.player); enemy = b; break; }
      case EnemyType.Turret: { const t = new Turret(this, x, y); t.setTarget(this.player); enemy = t; break; }
      default: { const g = new Grunt(this, x, y); g.setTarget(this.player); enemy = g; break; }
    }
    this.enemies.add(enemy);
  }

  private spawnBarrel(): void {
    const x = Phaser.Math.Between(TILE_SIZE * 2, W - TILE_SIZE * 2);
    const y = Phaser.Math.Between(TILE_SIZE * 2, H - TILE_SIZE * 2);
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 80) return;
    const barrel = new Barrel(this, x, y);
    this.barrels.add(barrel);
  }

  // ─── Arena ─────────────────────────────────────────────────────────────
  private buildArena(): void {
    const floor = this.add.tileSprite(W / 2, H / 2, W, H, 'floor');
    this.arenaVisuals.push(floor);

    for (let i = 0; i < 30; i++) {
      const dx = Phaser.Math.Between(TILE_SIZE, W - TILE_SIZE);
      const dy = Phaser.Math.Between(TILE_SIZE, H - TILE_SIZE);
      this.arenaVisuals.push(this.add.circle(dx, dy, Phaser.Math.Between(1, 2), 0x222244, 0.3));
    }
    // Border walls
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (r > 0 && r < ROWS - 1 && c > 0 && c < COLS - 1) continue;
        const cx = (c + 0.5) * TILE_SIZE;
        const cy = (r + 0.5) * TILE_SIZE;
        this.arenaVisuals.push(
          this.add.image(cx, cy, 'wall').setDisplaySize(TILE_SIZE, TILE_SIZE)
        );
        this.walls.add(this.add.rectangle(cx, cy, TILE_SIZE, TILE_SIZE) as unknown as Phaser.Physics.Arcade.Sprite);
      }
    }
    // Pillars
    const pillars = [
      { c: 6, r: 5 }, { c: 13, r: 5 }, { c: 20, r: 5 }, { c: 27, r: 5 }, { c: 33, r: 5 },
      { c: 6, r: 10 }, { c: 20, r: 10 }, { c: 33, r: 10 },
      { c: 6, r: 15 }, { c: 13, r: 15 }, { c: 20, r: 15 }, { c: 27, r: 15 }, { c: 33, r: 15 },
      { c: 6, r: 20 }, { c: 20, r: 20 }, { c: 33, r: 20 },
      { c: 6, r: 24 }, { c: 13, r: 24 }, { c: 20, r: 24 }, { c: 27, r: 24 }, { c: 33, r: 24 },
    ];
    pillars.forEach(({ c, r }) => {
      const cx = (c + 0.5) * TILE_SIZE;
      const cy = (r + 0.5) * TILE_SIZE;
      this.arenaVisuals.push(
        this.add.image(cx, cy, 'wall').setDisplaySize(TILE_SIZE, TILE_SIZE)
      );
      this.walls.add(this.add.rectangle(cx, cy, TILE_SIZE, TILE_SIZE) as unknown as Phaser.Physics.Arcade.Sprite);
    });
  }

  // ─── Upgrades ──────────────────────────────────────────────────────────
  private showUpgradeScreen(): void {
    this.scene.pause();
    this.scene.launch('Upgrade', {
      stats: this.player.stats,
      upgradeSystem: this.upgradeSystem,
      onChosen: (newStats: PlayerStats) => {
        this.player.applyStats(newStats);
        this.envSystem.updateStats(newStats);
        this.scene.resume();
      },
    });
  }

  private gameOver(): void {
    this.scene.stop('UI');
    this.scene.start('Menu');
  }
}
