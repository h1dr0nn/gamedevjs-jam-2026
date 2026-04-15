import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);
    this.add.rectangle(width / 2, height / 2, 304, 12).setStrokeStyle(1, 0x334455);
    const bar = this.add.rectangle(width / 2, height / 2, 0, 8, 0x00ff99);

    this.load.on('progress', (v: number) => {
      bar.width = 300 * v;
    });
  }

  create(): void {
    this.scene.start('Menu');
  }
}
