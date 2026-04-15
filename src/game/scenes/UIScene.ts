import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UI' });
  }

  create(): void {
    // HUD overlay — populate when gameplay is defined.
  }
}
