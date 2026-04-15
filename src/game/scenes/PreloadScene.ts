import Phaser from 'phaser';
import type { PrototypeId, EnemyId } from '../types';

const PROTOS: PrototypeId[] = ['destroyer', 'infantryman', 'swordsman'];
const ENEMIES: EnemyId[] = ['drone', 'gunner', 'captain'];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);
    this.add.rectangle(width / 2, height / 2, 304, 12).setStrokeStyle(1, 0x334455);
    const bar = this.add.rectangle(width / 2, height / 2, 0, 8, 0x00ff99);
    this.add
      .text(width / 2, height / 2 - 30, 'BOOTING  SHUTDOWN.EXE', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#00ffff',
      })
      .setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      bar.width = 300 * v;
    });

    // Backgrounds (4 layers each)
    for (const biome of ['factory_day', 'factory_night', 'power_night', 'steampunk']) {
      for (let i = 1; i <= 4; i++) {
        this.load.image(`bg-${biome}-${i}`, `assets/bg/${biome}/${i}.png`);
      }
    }

    // Tiles
    for (let i = 1; i <= 12; i++) {
      const n = i.toString().padStart(2, '0');
      this.load.image(`tile-factory-tile_${n}`, `assets/tiles/factory/tile_${n}.png`);
      this.load.image(`tile-power-tile_${n}`, `assets/tiles/power/tile_${n}.png`);
    }
    for (let i = 1; i <= 8; i++) {
      const n = i.toString().padStart(2, '0');
      this.load.image(`tile-factory-back_${n}`, `assets/tiles/factory/back_${n}.png`);
    }
    this.load.image('obj-ladder', 'assets/tiles/objects/ladder.png');
    this.load.image('obj-barrel', 'assets/tiles/objects/barrel.png');
    this.load.image('obj-box', 'assets/tiles/objects/box.png');

    // Hazards
    this.load.spritesheet('hz-saw', 'assets/hazards/saw.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('hz-gas-cycle', 'assets/hazards/gas_cycle.png', { frameWidth: 72, frameHeight: 72 });
    this.load.spritesheet('hz-gas-start', 'assets/hazards/gas_start.png', { frameWidth: 72, frameHeight: 72 });
    this.load.spritesheet('hz-gas-end', 'assets/hazards/gas_end.png', { frameWidth: 72, frameHeight: 72 });
    this.load.spritesheet('hz-generator', 'assets/hazards/generator.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('hz-card', 'assets/hazards/card.png', { frameWidth: 24, frameHeight: 24 });

    // Robots (all 128x128 per frame)
    for (const proto of PROTOS) {
      this.load.spritesheet(`robot-${proto}-idle`, `assets/robot/${proto}/idle.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`robot-${proto}-walk`, `assets/robot/${proto}/walk.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`robot-${proto}-hurt`, `assets/robot/${proto}/hurt.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`robot-${proto}-dead`, `assets/robot/${proto}/dead.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`robot-${proto}-shutdown`, `assets/robot/${proto}/shutdown.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`robot-${proto}-enabling`, `assets/robot/${proto}/enabling.png`, { frameWidth: 128, frameHeight: 128 });
      this.load.spritesheet(`robot-${proto}-attack`, `assets/robot/${proto}/attack1.png`, { frameWidth: 128, frameHeight: 128 });
    }

    // Enemies (all 96x96 per frame)
    for (const id of ENEMIES) {
      this.load.spritesheet(`enemy-${id}-idle`, `assets/enemy/${id}/idle.png`, { frameWidth: 96, frameHeight: 96 });
      this.load.spritesheet(`enemy-${id}-walk`, `assets/enemy/${id}/walk.png`, { frameWidth: 96, frameHeight: 96 });
      this.load.spritesheet(`enemy-${id}-hurt`, `assets/enemy/${id}/hurt.png`, { frameWidth: 96, frameHeight: 96 });
      this.load.spritesheet(`enemy-${id}-dead`, `assets/enemy/${id}/dead.png`, { frameWidth: 96, frameHeight: 96 });
      this.load.spritesheet(`enemy-${id}-attack`, `assets/enemy/${id}/attack.png`, { frameWidth: 96, frameHeight: 96 });
    }

    // UI icons
    const chipIconIds = [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49];
    for (const id of chipIconIds) {
      this.load.image(`chip-icon-${id}`, `assets/ui/chip_${id}.png`);
    }
  }

  create(): void {
    // Robots
    for (const proto of PROTOS) {
      this.anims.create({ key: `robot-${proto}-idle`, frames: this.anims.generateFrameNumbers(`robot-${proto}-idle`, {}), frameRate: 7, repeat: -1 });
      this.anims.create({ key: `robot-${proto}-walk`, frames: this.anims.generateFrameNumbers(`robot-${proto}-walk`, {}), frameRate: 12, repeat: -1 });
      this.anims.create({ key: `robot-${proto}-hurt`, frames: this.anims.generateFrameNumbers(`robot-${proto}-hurt`, {}), frameRate: 10 });
      this.anims.create({ key: `robot-${proto}-dead`, frames: this.anims.generateFrameNumbers(`robot-${proto}-dead`, {}), frameRate: 8 });
      this.anims.create({ key: `robot-${proto}-shutdown`, frames: this.anims.generateFrameNumbers(`robot-${proto}-shutdown`, {}), frameRate: 6 });
      this.anims.create({ key: `robot-${proto}-enabling`, frames: this.anims.generateFrameNumbers(`robot-${proto}-enabling`, {}), frameRate: 7 });
      this.anims.create({ key: `robot-${proto}-attack`, frames: this.anims.generateFrameNumbers(`robot-${proto}-attack`, {}), frameRate: 16 });
      // dash = walk for now
      this.anims.create({ key: `robot-${proto}-dash`, frames: this.anims.generateFrameNumbers(`robot-${proto}-walk`, {}), frameRate: 20 });
    }
    // Enemies
    for (const id of ENEMIES) {
      this.anims.create({ key: `enemy-${id}-idle`, frames: this.anims.generateFrameNumbers(`enemy-${id}-idle`, {}), frameRate: 6, repeat: -1 });
      this.anims.create({ key: `enemy-${id}-walk`, frames: this.anims.generateFrameNumbers(`enemy-${id}-walk`, {}), frameRate: 10, repeat: -1 });
      this.anims.create({ key: `enemy-${id}-hurt`, frames: this.anims.generateFrameNumbers(`enemy-${id}-hurt`, {}), frameRate: 10 });
      this.anims.create({ key: `enemy-${id}-dead`, frames: this.anims.generateFrameNumbers(`enemy-${id}-dead`, {}), frameRate: 9 });
      this.anims.create({ key: `enemy-${id}-attack`, frames: this.anims.generateFrameNumbers(`enemy-${id}-attack`, {}), frameRate: 12 });
    }

    // Hazard anims
    this.anims.create({ key: 'hz-saw-spin', frames: this.anims.generateFrameNumbers('hz-saw', {}), frameRate: 22, repeat: -1 });
    this.anims.create({ key: 'hz-gas-start', frames: this.anims.generateFrameNumbers('hz-gas-start', {}), frameRate: 10 });
    this.anims.create({ key: 'hz-gas-cycle', frames: this.anims.generateFrameNumbers('hz-gas-cycle', {}), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'hz-gas-end', frames: this.anims.generateFrameNumbers('hz-gas-end', {}), frameRate: 10 });
    this.anims.create({ key: 'hz-generator-idle', frames: this.anims.generateFrameNumbers('hz-generator', { start: 0, end: 0 }), frameRate: 1, repeat: -1 });
    this.anims.create({ key: 'hz-generator-pulse', frames: this.anims.generateFrameNumbers('hz-generator', {}), frameRate: 14, repeat: 2 });

    // Procedural textures for projectiles & doors
    this.makeProjTexture('proj-player', 16, 6, 0xffff88);
    this.makeProjTexture('proj-enemy', 12, 6, 0xff3355);
    this.makeProjTexture('proj-special', 22, 8, 0x00ffff);
    this.makeDoorTexture();

    this.scene.start('Menu');
  }

  private makeProjTexture(key: string, w: number, h: number, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillRoundedRect(0, 0, w, h, 2);
    g.fillStyle(0xffffff, 0.6);
    g.fillRoundedRect(1, 1, w - 4, 2, 1);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeDoorTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0x1a1f2f, 1);
    g.fillRect(0, 0, 40, 64);
    g.lineStyle(2, 0x00ffcc, 0.8);
    g.strokeRect(2, 2, 36, 60);
    g.lineStyle(1, 0x00ffcc, 0.5);
    g.lineBetween(20, 4, 20, 60);
    g.generateTexture('door', 40, 64);
    g.destroy();
  }
}
