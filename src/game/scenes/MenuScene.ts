import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'Menu' }); }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    this.add.text(width / 2, height / 2 - 100, 'CRASH', {
      fontSize: '72px', color: '#00ffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 40, 'MOVE TO SURVIVE. DASH TO KILL.', {
      fontSize: '16px', color: '#556677', letterSpacing: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, 'WASD / Arrows — Move\nClick — Dash toward cursor', {
      fontSize: '14px', color: '#888888', align: 'center',
    }).setOrigin(0.5);

    const startText = this.add.text(width / 2, height / 2 + 100, '[ PRESS SPACE ]', {
      fontSize: '20px', color: '#00ff99', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({ targets: startText, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('Game'));
    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
