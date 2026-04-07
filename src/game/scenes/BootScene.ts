import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    // Load minimal assets needed for preload screen (progress bar, etc.)
  }

  create() {
    this.scene.start('Preload');
  }
}
