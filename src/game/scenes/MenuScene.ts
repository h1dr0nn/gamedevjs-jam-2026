import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 60, 'GAMEDEV.JS JAM 2026', {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // TODO: Replace with actual game title after theme reveal
    this.add
      .text(width / 2, height / 2, 'Game Title Here', {
        fontSize: '20px',
        color: '#00ff99',
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(width / 2, height / 2 + 80, 'Press SPACE to Start', {
        fontSize: '18px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // Blink animation
    this.tweens.add({
      targets: startText,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.start('Game');
    });
  }
}
