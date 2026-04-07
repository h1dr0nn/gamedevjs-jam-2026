import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Grunt } from '../entities/enemies/Grunt';
import { Shielder } from '../entities/enemies/Shielder';
import { Bomber } from '../entities/enemies/Bomber';
import { Turret } from '../entities/enemies/Turret';
import { Barrel } from '../entities/environment/Barrel';
import { Boulder } from '../entities/environment/Boulder';
import { CrackedWall } from '../entities/environment/CrackedWall';
import { ComboSystem } from '../systems/ComboSystem';
import { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { CollisionHandler } from '../systems/CollisionHandler';
import { JuiceSystem } from '../systems/JuiceSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { RoomGenerator } from '../systems/RoomGenerator';
import { ALL_UPGRADES } from '../data/upgrades';
import { EVENTS, RoomConfig, RoomType, EnemyType, EnvObjectType, PlayerStats } from '../types';

const TILE_SIZE = 50;
const COLS = 16;
const ROWS = 12;

export class GameScene extends Phaser.Scene {
  player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private barrels!: Phaser.GameObjects.Group;
  private boulders!: Phaser.GameObjects.Group;
  private crackedWalls!: Phaser.GameObjects.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private crosshair!: Phaser.GameObjects.Arc;
  private comboSystem!: ComboSystem;
  private envSystem!: EnvironmentSystem;
  private collisionHandler!: CollisionHandler;
  private juiceSystem!: JuiceSystem;
  private upgradeSystem!: UpgradeSystem;
  private currentFloor = 1;
  private roomsCleared = 0;
  private roomCleared = false;
  private roomGen!: RoomGenerator;

  constructor() { super({ key: 'Game' }); }

  create(): void {
    const W = COLS * TILE_SIZE;
    const H = ROWS * TILE_SIZE;
    this.physics.world.setBounds(0, 0, W, H);

    // Groups
    this.enemies = this.add.group();
    this.barrels = this.add.group();
    this.boulders = this.add.group();
    this.crackedWalls = this.add.group();
    this.walls = this.physics.add.staticGroup();

    // Atmosphere
    const cam = this.cameras.main;
    cam.postFX?.addVignette(0.5, 0.5, 0.35, 0.4);
    cam.postFX?.addBloom(0xffffff, 1, 1, 1, 0.8);

    // Player
    this.player = new Player(this, W / 2, H / 2);

    // Wall collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);

    // Custom crosshair cursor
    this.input.setDefaultCursor('none');
    this.crosshair = this.add.circle(0, 0, 8, 0x00ff99, 0).setStrokeStyle(2, 0x00ff99).setDepth(200);
    const innerDot = this.add.circle(0, 0, 2, 0x00ff99).setDepth(200);
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.crosshair.x = pointer.worldX;
      this.crosshair.y = pointer.worldY;
      innerDot.x = pointer.worldX;
      innerDot.y = pointer.worldY;
    });

    // Systems
    this.comboSystem = new ComboSystem({
      comboWindow: this.player.stats.comboWindow,
      comboMultiplierCap: this.player.stats.comboMultiplierCap,
    });
    this.envSystem = new EnvironmentSystem(this, this.player.stats);

    // Collision wiring
    this.collisionHandler = new CollisionHandler(
      this, this.player,
      this.enemies, this.barrels, this.boulders, this.crackedWalls,
      this.envSystem
    );
    this.collisionHandler.wire();
    this.juiceSystem = new JuiceSystem(this);

    this.upgradeSystem = new UpgradeSystem(ALL_UPGRADES);
    this.roomGen = new RoomGenerator(this.currentFloor);

    // Spawn first room
    const firstRoom = this.roomGen.generate(RoomType.Combat);
    this.buildRoomVisuals(firstRoom);
    this.spawnRoomFromConfig(firstRoom);

    // Events
    this.events.on(EVENTS.ENEMY_KILLED, (enemy: Enemy) => {
      this.comboSystem.registerKill();
      this.juiceSystem.spawnKillParticles(enemy.x, enemy.y, 0xff6600);
      this.checkRoomClear();
    });
    this.comboSystem.on('combo-update', (mult: number) => {
      this.events.emit(EVENTS.COMBO_UPDATE, mult);
    });
    this.comboSystem.on('combo-reset', () => {
      this.events.emit(EVENTS.COMBO_RESET);
    });
    this.events.on(EVENTS.PLAYER_DIED, () => this.gameOver());

    // Launch UI overlay
    this.scene.launch('UI', { gameScene: this });
  }

  update(_time: number, _delta: number): void {
    this.comboSystem.update();
    this.collisionHandler.checkTurretBullets(this.enemies);
    // Remove dead enemies
    this.enemies.getChildren().slice().forEach(e => {
      const enemy = e as { isDead?: boolean; active: boolean };
      if (enemy.isDead && enemy.active) {
        (e as Phaser.GameObjects.GameObject).destroy();
      }
    });
  }

  private checkRoomClear(): void {
    if (this.roomCleared) return;
    const alive = this.enemies.getChildren().filter(e => {
      const enemy = e as Enemy;
      return enemy.active && !enemy.isDead;
    });
    if (alive.length === 0) {
      this.roomCleared = true;
      this.roomsCleared++;
      this.events.emit(EVENTS.ROOM_CLEARED);
      this.time.delayedCall(800, () => this.showUpgradeScreen());
    }
  }

  private showUpgradeScreen(): void {
    this.scene.pause();
    this.scene.launch('Upgrade', {
      stats: this.player.stats,
      upgradeSystem: this.upgradeSystem,
      onChosen: (newStats: PlayerStats) => {
        this.player.applyStats(newStats);
        this.envSystem.updateStats(newStats);
        this.scene.resume();
        this.loadNextRoom();
      },
    });
  }

  private loadNextRoom(): void {
    this.roomCleared = false;
    if (this.roomsCleared % 5 === 0) this.currentFloor++;
    this.events.emit('floor-update', this.currentFloor);
    this.roomGen = new RoomGenerator(this.currentFloor);

    this.enemies.clear(true, true);
    this.barrels.clear(true, true);
    this.boulders.clear(true, true);
    this.crackedWalls.clear(true, true);

    const config = this.roomGen.generate(RoomType.Combat);
    this.buildRoomVisuals(config);
    this.spawnRoomFromConfig(config);
  }

  private spawnRoomFromConfig(config: RoomConfig): void {
    const TILE_SIZE_LOCAL = TILE_SIZE;
    config.enemySpawns.forEach(spawn => {
      const px = (spawn.col + 0.5) * TILE_SIZE_LOCAL;
      const py = (spawn.row + 0.5) * TILE_SIZE_LOCAL;
      let enemy: Enemy;
      switch (spawn.type) {
        case EnemyType.Shielder: {
          const s = new Shielder(this, px, py);
          s.setTarget(this.player);
          enemy = s;
          break;
        }
        case EnemyType.Bomber: {
          const b = new Bomber(this, px, py);
          b.setTarget(this.player);
          enemy = b;
          break;
        }
        case EnemyType.Turret: {
          const t = new Turret(this, px, py);
          t.setTarget(this.player);
          enemy = t;
          break;
        }
        default: {
          const g = new Grunt(this, px, py);
          g.setTarget(this.player);
          enemy = g;
          break;
        }
      }
      this.enemies.add(enemy);
    });
  }

  private roomVisuals: Phaser.GameObjects.GameObject[] = [];

  private buildRoomVisuals(config: RoomConfig): void {
    // Clear old visuals
    this.roomVisuals.forEach(v => v.destroy());
    this.roomVisuals = [];
    this.walls.clear(true, true);

    const W = COLS * TILE_SIZE;
    const H = ROWS * TILE_SIZE;

    // Floor base — tiled sprite
    const floor = this.add.tileSprite(W / 2, H / 2, W, H, 'floor');
    this.roomVisuals.push(floor);

    // Scatter floor dust particles for texture
    for (let i = 0; i < 20; i++) {
      const dx = Phaser.Math.Between(TILE_SIZE, W - TILE_SIZE);
      const dy = Phaser.Math.Between(TILE_SIZE, H - TILE_SIZE);
      const dot = this.add.circle(dx, dy, Phaser.Math.Between(1, 2), 0x222244, 0.3);
      this.roomVisuals.push(dot);
    }

    config.grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        const cx = (c + 0.5) * TILE_SIZE;
        const cy = (r + 0.5) * TILE_SIZE;

        if (cell.wall) {
          // Visual
          const wallImg = this.add.image(cx, cy, 'wall');
          this.roomVisuals.push(wallImg);
          // Physics — static body for collision
          const wallBody = this.add.rectangle(cx, cy, TILE_SIZE, TILE_SIZE) as unknown as Phaser.Physics.Arcade.Sprite;
          this.walls.add(wallBody);
          return;
        }

        if (cell.envObject) {
          switch (cell.envObject) {
            case EnvObjectType.Barrel: {
              const b = new Barrel(this, cx, cy);
              this.barrels.add(b);
              break;
            }
            case EnvObjectType.Boulder: {
              const bo = new Boulder(this, cx, cy);
              this.boulders.add(bo);
              break;
            }
            case EnvObjectType.CrackedWall: {
              const cw = new CrackedWall(this, cx, cy);
              this.crackedWalls.add(cw);
              break;
            }
            default:
              break;
          }
        }
      });
    });
  }

  private gameOver(): void {
    this.scene.stop('UI');
    this.scene.start('Menu');
  }
}
