import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'Preload' }); }

  preload(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    const bar = this.add.rectangle(width / 2, height / 2, 0, 8, 0x00ff99);
    this.add.rectangle(width / 2, height / 2, 304, 12).setStrokeStyle(1, 0x334455);

    this.add.text(width / 2, height / 2 - 30, 'CRASH', {
      fontSize: '32px', color: '#00ffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.load.on('progress', (v: number) => { bar.width = 300 * v; });
    // All visuals are procedural — no external assets to load.
  }

  create(): void { this.scene.start('Menu'); }
}
