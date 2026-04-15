import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, 'GameScene', {
        fontSize: '18px',
        color: '#556677',
      })
      .setOrigin(0.5);
  }

  update(_time: number, _delta: number): void {
    // Gameplay update loop
  }
}
