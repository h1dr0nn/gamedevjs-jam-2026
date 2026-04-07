import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Grunt } from '../entities/enemies/Grunt';
import { Barrel } from '../entities/environment/Barrel';
import { Boulder } from '../entities/environment/Boulder';
import { CrackedWall } from '../entities/environment/CrackedWall';
import { ComboSystem } from '../systems/ComboSystem';
import { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { CollisionHandler } from '../systems/CollisionHandler';
import { EVENTS } from '../types';

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

  constructor() { super({ key: 'Game' }); }

  create(): void {
    const W = COLS * TILE_SIZE;
    const H = ROWS * TILE_SIZE;
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBounds(0, 0, W, H);

    // Floor
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e);

    // Border walls (visual only — world bounds handle physics)
    this.drawBorderWalls(W, H);

    // Groups
    this.enemies = this.add.group();
    this.barrels = this.add.group();
    this.boulders = this.add.group();
    this.crackedWalls = this.add.group();

    // Player
    this.player = new Player(this, W / 2, H / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Spawn test room
    this.spawnTestRoom(W, H);

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

    // Events
    this.events.on(EVENTS.ENEMY_KILLED, () => {
      this.comboSystem.registerKill();
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

  private drawBorderWalls(W: number, H: number): void {
    const color = 0x334455;
    this.add.rectangle(W / 2, TILE_SIZE / 2, W, TILE_SIZE, color);
    this.add.rectangle(W / 2, H - TILE_SIZE / 2, W, TILE_SIZE, color);
    this.add.rectangle(TILE_SIZE / 2, H / 2, TILE_SIZE, H, color);
    this.add.rectangle(W - TILE_SIZE / 2, H / 2, TILE_SIZE, H, color);
  }

  private spawnTestRoom(W: number, H: number): void {
    const grunt1 = new Grunt(this, 150, 150);
    grunt1.setTarget(this.player);
    this.enemies.add(grunt1);

    const grunt2 = new Grunt(this, W - 150, H - 150);
    grunt2.setTarget(this.player);
    this.enemies.add(grunt2);

    const grunt3 = new Grunt(this, W - 150, 150);
    grunt3.setTarget(this.player);
    this.enemies.add(grunt3);

    const barrel1 = new Barrel(this, 200, H / 2);
    this.barrels.add(barrel1);
    const barrel2 = new Barrel(this, 260, H / 2);
    this.barrels.add(barrel2);

    const boulder = new Boulder(this, W / 2, 150);
    this.boulders.add(boulder);

    const wall = new CrackedWall(this, W / 2 + 100, H / 2);
    this.crackedWalls.add(wall);
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

  private gameOver(): void {
    this.scene.stop('UI');
    this.scene.start('Menu');
  }
}
