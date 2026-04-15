import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    this.add
      .text(width / 2, height / 2 - 60, 'GAME TITLE', {
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const start = this.add
      .text(width / 2, height / 2 + 40, '[ PRESS SPACE ]', {
        fontSize: '20px',
        color: '#00ff99',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: start, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    this.input.once('pointerdown', () => this.startGame());
  }

  private startGame(): void {
    this.scene.start('Game');
    this.scene.launch('UI');
  }
}
