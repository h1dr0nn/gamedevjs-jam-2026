import Phaser from 'phaser';
import { EVENTS } from '../types';

const MAX_HP = 3;

export class UIScene extends Phaser.Scene {
  private comboText!: Phaser.GameObjects.Text;
  private comboBar!: Phaser.GameObjects.Graphics;
  private hpIcons: Phaser.GameObjects.Rectangle[] = [];
  private floorText!: Phaser.GameObjects.Text;
  private comboBarWidth = 0;
  private readonly BAR_MAX_WIDTH = 120;

  constructor() { super({ key: 'UI' }); }

  create({ gameScene }: { gameScene: Phaser.Scene }): void {
    // HP icons — top left
    for (let i = 0; i < MAX_HP; i++) {
      const icon = this.add.rectangle(20 + i * 28, 20, 20, 20, 0xff4444);
      this.hpIcons.push(icon);
    }

    // Combo text — top center
    this.comboText = this.add
      .text(400, 16, 'x1', { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0);

    // Combo drain bar — below combo text
    this.comboBar = this.add.graphics();
    this.drawComboBar(0);

    // Floor indicator — top right
    this.floorText = this.add
      .text(780, 16, 'Floor 1', { fontSize: '16px', color: '#aaaaaa' })
      .setOrigin(1, 0);

    // Listen to game events
    gameScene.events.on(EVENTS.COMBO_UPDATE, (mult: number) => {
      this.comboText.setText(`x${mult}`);
      this.comboText.setColor(mult >= 4 ? '#ffaa00' : mult >= 2 ? '#00ff99' : '#ffffff');
      this.comboBarWidth = this.BAR_MAX_WIDTH;
      this.drawComboBar(1.0);
      this.tweens.add({
        targets: this.comboText,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 80,
        yoyo: true,
      });
    });

    gameScene.events.on(EVENTS.COMBO_RESET, () => {
      this.comboText.setText('x1').setColor('#ffffff');
      this.comboBarWidth = 0;
      this.drawComboBar(0);
    });

    gameScene.events.on(EVENTS.PLAYER_HP_CHANGE, (hp: number) => {
      this.updateHpIcons(hp);
    });

    gameScene.events.on('floor-update', (floor: number) => {
      this.floorText.setText(`Floor ${floor}`);
    });
  }

  private drawComboBar(fraction: number): void {
    this.comboBar.clear();
    if (fraction <= 0) return;
    this.comboBar.fillStyle(0x00ff99, 0.8);
    this.comboBar.fillRect(
      400 - this.BAR_MAX_WIDTH / 2,
      44,
      this.BAR_MAX_WIDTH * fraction,
      4
    );
  }

  private updateHpIcons(hp: number): void {
    this.hpIcons.forEach((icon, i) => {
      icon.setFillStyle(i < hp ? 0xff4444 : 0x444444);
    });
  }

  update(_time: number, delta: number): void {
    if (this.comboBarWidth > 0) {
      this.comboBarWidth = Math.max(
        0,
        this.comboBarWidth - (this.BAR_MAX_WIDTH / 1500) * delta
      );
      this.drawComboBar(this.comboBarWidth / this.BAR_MAX_WIDTH);
    }
  }
}
