import Phaser from 'phaser';
import { UpgradeDef, PlayerStats, EVENTS } from '../types';
import { UpgradeSystem } from '../systems/UpgradeSystem';

export class UpgradeScene extends Phaser.Scene {
  constructor() { super({ key: 'Upgrade' }); }

  create({ stats, upgradeSystem, onChosen }: {
    stats: PlayerStats;
    upgradeSystem: UpgradeSystem;
    onChosen: (newStats: PlayerStats) => void;
  }): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    this.add.text(width / 2, 60, 'CHOOSE UPGRADE', {
      fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const choices = upgradeSystem.rollChoices(3);
    const cardW = 200, cardH = 160, gap = 24;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    const startX = (width - totalW) / 2;

    choices.forEach((upgrade: UpgradeDef, i: number) => {
      const cx = startX + i * (cardW + gap) + cardW / 2;
      const cy = height / 2;

      const bg = this.add.rectangle(cx, cy, cardW, cardH, 0x223344)
        .setStrokeStyle(2, 0x00ff99)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx, cy - 40, upgrade.name, {
        fontSize: '16px', color: '#00ff99', fontStyle: 'bold',
        wordWrap: { width: cardW - 16 },
      }).setOrigin(0.5);

      this.add.text(cx, cy, upgrade.description, {
        fontSize: '13px', color: '#cccccc',
        wordWrap: { width: cardW - 16 },
        align: 'center',
      }).setOrigin(0.5);

      this.add.text(cx, cy + 50, upgrade.category.toUpperCase(), {
        fontSize: '11px', color: '#556677',
      }).setOrigin(0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x334455));
      bg.on('pointerout', () => bg.setFillStyle(0x223344));
      bg.on('pointerdown', () => {
        const newStats = upgradeSystem.applyUpgrade(stats, upgrade);
        this.events.emit(EVENTS.UPGRADE_CHOSEN, upgrade);
        this.scene.stop();
        onChosen(newStats);
      });
    });
  }
}
