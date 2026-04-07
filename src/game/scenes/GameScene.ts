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

const TILE_SIZE = 48;
const COLS = 16;
const ROWS = 12;

export class GameScene extends Phaser.Scene {
  player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private barrels!: Phaser.GameObjects.Group;
  private boulders!: Phaser.GameObjects.Group;
  private crackedWalls!: Phaser.GameObjects.Group;
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
    this.cameras.main.setBounds(0, 0, W, H);

    // Groups
    this.enemies = this.add.group();
    this.barrels = this.add.group();
    this.boulders = this.add.group();
    this.crackedWalls = this.add.group();

    // Player
    this.player = new Player(this, W / 2, H / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

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
    const TILE_SIZE_LOCAL = 48;
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

  private buildRoomVisuals(config: RoomConfig): void {
    const COLS_LOCAL = 16;
    const ROWS_LOCAL = 12;
    const TILE = 48;
    const W = COLS_LOCAL * TILE;
    const H = ROWS_LOCAL * TILE;
    const wallColor = 0x334455;
    const floorColor = 0x1a1a2e;

    // Floor base
    this.add.rectangle(W / 2, H / 2, W, H, floorColor);

    config.grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        const cx = (c + 0.5) * TILE;
        const cy = (r + 0.5) * TILE;

        if (cell.wall) {
          this.add.rectangle(cx, cy, TILE, TILE, wallColor);
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
