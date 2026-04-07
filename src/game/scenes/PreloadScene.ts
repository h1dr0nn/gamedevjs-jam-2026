import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    // Show loading bar
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2, height / 2, 0, 20, 0x00ff99);
    const border = this.add.rectangle(width / 2, height / 2, 304, 24).setStrokeStyle(2, 0xffffff);

    this.load.on('progress', (value: number) => {
      bar.width = 300 * value;
    });

    // TODO: Load game assets here
    // this.load.image('player', 'assets/player.png');
    // this.load.tilemapTiledJSON('map', 'assets/map.json');
    // this.load.audio('bgm', 'assets/audio/bgm.mp3');

    // Suppress unused variable warning in production
    void border;
  }

  create() {
    this.scene.start('Menu');
  }
}
