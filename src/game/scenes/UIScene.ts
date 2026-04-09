import Phaser from 'phaser';
import { EVENTS } from '../types';

const MAX_HP = 3;

export class UIScene extends Phaser.Scene {
  private comboText!: Phaser.GameObjects.Text;
  private comboBar!: Phaser.GameObjects.Graphics;
  private hpIcons: Phaser.GameObjects.Rectangle[] = [];
  private timerText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private comboBarWidth = 0;
  private readonly BAR_MAX_WIDTH = 120;

  constructor() { super({ key: 'UI' }); }

  create({ gameScene }: { gameScene: Phaser.Scene }): void {
    const { width } = this.scale;

    // ─── XP bar — full width at very top ─────────────────────────
    this.xpBarBg = this.add.rectangle(width / 2, 3, width, 6, 0x222244);
    this.xpBarFill = this.add.rectangle(0, 3, 0, 6, 0x44ff44).setOrigin(0, 0.5);

    // Level badge — top left
    this.levelText = this.add.text(8, 14, 'Lv.1', {
      fontSize: '14px', color: '#44ff44', fontStyle: 'bold',
    });

    // HP icons — after level badge
    for (let i = 0; i < MAX_HP; i++) {
      const icon = this.add.rectangle(60 + i * 24, 22, 18, 18, 0xff4444);
      this.hpIcons.push(icon);
    }

    // Combo text — top center
    this.comboText = this.add
      .text(width / 2, 16, 'x1', { fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0);

    // Combo drain bar
    this.comboBar = this.add.graphics();
    this.drawComboBar(0);

    // Timer — top right
    this.timerText = this.add
      .text(width - 16, 14, '0:00', { fontSize: '18px', color: '#aaaaaa', fontStyle: 'bold' })
      .setOrigin(1, 0);

    // Kill count — below timer
    this.killText = this.add
      .text(width - 16, 36, '0 kills', { fontSize: '12px', color: '#556677' })
      .setOrigin(1, 0);

    // ─── Events ──────────────────────────────────────────────────
    gameScene.events.on(EVENTS.COMBO_UPDATE, (mult: number) => {
      this.comboText.setText(`x${mult}`);
      this.comboText.setColor(mult >= 4 ? '#ffaa00' : mult >= 2 ? '#00ff99' : '#ffffff');
      this.comboBarWidth = this.BAR_MAX_WIDTH;
      this.drawComboBar(1.0);
      this.tweens.add({
        targets: this.comboText, scaleX: 1.4, scaleY: 1.4, duration: 80, yoyo: true,
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

    gameScene.events.on('timer-update', (elapsed: number) => {
      const sec = Math.floor(elapsed / 1000);
      const min = Math.floor(sec / 60);
      const s = sec % 60;
      this.timerText.setText(`${min}:${s.toString().padStart(2, '0')}`);
    });

    gameScene.events.on('kill-update', (kills: number) => {
      this.killText.setText(`${kills} kills`);
    });

    gameScene.events.on('xp-update', ({ xp, xpToNext }: { xp: number; xpToNext: number; level: number }) => {
      const frac = Math.min(xp / xpToNext, 1);
      this.xpBarFill.width = this.scale.width * frac;
    });

    gameScene.events.on('level-up', (level: number) => {
      this.levelText.setText(`Lv.${level}`);
      // Flash the XP bar
      this.xpBarFill.setFillStyle(0xffffff);
      this.time.delayedCall(150, () => this.xpBarFill.setFillStyle(0x44ff44));
    });

    // Resize handler
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width;
      this.comboText.x = w / 2;
      this.timerText.x = w - 16;
      this.killText.x = w - 16;
      this.xpBarBg.x = w / 2;
      this.xpBarBg.width = w;
    });
  }

  private drawComboBar(fraction: number): void {
    const cx = this.scale.width / 2;
    this.comboBar.clear();
    if (fraction <= 0) return;
    this.comboBar.fillStyle(0x00ff99, 0.8);
    this.comboBar.fillRect(cx - this.BAR_MAX_WIDTH / 2, 42, this.BAR_MAX_WIDTH * fraction, 3);
  }

  private updateHpIcons(hp: number): void {
    this.hpIcons.forEach((icon, i) => {
      icon.setFillStyle(i < hp ? 0xff4444 : 0x444444);
    });
  }

  update(_time: number, delta: number): void {
    if (this.comboBarWidth > 0) {
      this.comboBarWidth = Math.max(0, this.comboBarWidth - (this.BAR_MAX_WIDTH / 1500) * delta);
      this.drawComboBar(this.comboBarWidth / this.BAR_MAX_WIDTH);
    }
  }
}
