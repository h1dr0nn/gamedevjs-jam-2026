import Phaser from 'phaser';
import { EVENTS } from '../types';
import type { RunState } from '../systems/RunState';

export class UIScene extends Phaser.Scene {
  private hpHearts: Phaser.GameObjects.Graphics[] = [];
  private chainText!: Phaser.GameObjects.Text;
  private chainBar!: Phaser.GameObjects.Graphics;
  private specialBar!: Phaser.GameObjects.Graphics;
  private floorRoomText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;
  private chipRow!: Phaser.GameObjects.Container;
  private gameScene!: Phaser.Scene;
  private currentChain = 0;

  constructor() {
    super({ key: 'UI' });
  }

  create(data: { gameScene: Phaser.Scene; proto: string }): void {
    this.gameScene = data.gameScene;
    const { width, height } = this.scale;

    // Top-left: hearts + prototype label
    this.add.text(12, 10, data.proto.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#55aaaa',
    });
    const heartY = 34;
    const maxHeartsDraw = 10;
    for (let i = 0; i < maxHeartsDraw; i++) {
      const g = this.add.graphics();
      g.setVisible(false);
      g.setPosition(16 + i * 20, heartY);
      this.hpHearts.push(g);
    }

    // Top-center: chain
    this.chainText = this.add
      .text(width / 2, 20, '', { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0);
    this.chainBar = this.add.graphics();

    // Top-right: floor/room + kills
    this.floorRoomText = this.add
      .text(width - 12, 10, '1-1', { fontFamily: 'monospace', fontSize: '20px', color: '#00ffcc', fontStyle: 'bold' })
      .setOrigin(1, 0);
    this.killsText = this.add
      .text(width - 12, 36, '0 kills', { fontFamily: 'monospace', fontSize: '11px', color: '#556677' })
      .setOrigin(1, 0);

    // Bottom-left: special charge bar
    this.specialBar = this.add.graphics();
    this.add
      .text(16, height - 24, 'SPECIAL', { fontFamily: 'monospace', fontSize: '10px', color: '#88bbbb' });

    // Bottom-right: chip icons row
    this.chipRow = this.add.container(width - 12, height - 16);
    this.add
      .text(width - 12, height - 40, 'CHIPS', { fontFamily: 'monospace', fontSize: '10px', color: '#88bbbb' })
      .setOrigin(1, 1);

    // Events
    this.gameScene.events.on(EVENTS.PLAYER_HP, (hp: number, max: number) => this.drawHp(hp, max));
    this.gameScene.events.on(EVENTS.CHAIN_UPDATE, (n: number) => this.onChainUpdate(n));
    this.gameScene.events.on(EVENTS.CHAIN_RESET, () => this.onChainReset());
    this.gameScene.events.on(EVENTS.SPECIAL_CHARGE, (cur: number, max: number) => this.drawSpecial(cur, max));
    this.gameScene.events.on(EVENTS.CHIPS_UPDATE, (ids: string[]) => this.drawChipRow(ids));
    this.gameScene.events.on(EVENTS.RUN_STATS, (r: RunState) => {
      this.killsText.setText(`${r.kills} kills · ${r.scrapEarned} scrap`);
    });
    this.gameScene.events.on('floor-room', (fi: number, ri: number) => {
      this.floorRoomText.setText(`${fi + 1}-${ri + 1}`);
    });

    this.scale.on('resize', (size: Phaser.Structs.Size) => this.layout(size.width, size.height));
    this.drawSpecial(0, 100);
  }

  private layout(w: number, h: number): void {
    this.chainText.setPosition(w / 2, 20);
    this.floorRoomText.setPosition(w - 12, 10);
    this.killsText.setPosition(w - 12, 36);
    this.chipRow.setPosition(w - 12, h - 16);
    this.drawSpecial(this.currentChain, 100);
  }

  private drawHp(hp: number, max: number): void {
    this.hpHearts.forEach((g, i) => {
      if (i >= max) { g.setVisible(false); return; }
      g.setVisible(true).clear();
      const filled = i < hp;
      const col = filled ? 0xff4466 : 0x332233;
      g.fillStyle(col, 1);
      // Pixel heart-ish: 18x16 rounded block
      g.fillRoundedRect(0, 0, 16, 14, 3);
      if (filled) {
        g.fillStyle(0xffaacc, 0.8);
        g.fillRoundedRect(2, 2, 6, 3, 1);
      }
    });
  }

  private onChainUpdate(n: number): void {
    this.currentChain = n;
    this.chainText.setText(n >= 2 ? `×${n}` : '');
    this.chainText.setColor(n >= 6 ? '#ff66aa' : n >= 4 ? '#ffaa33' : n >= 2 ? '#00ff99' : '#ffffff');
    this.tweens.add({ targets: this.chainText, scaleX: 1.3, scaleY: 1.3, duration: 80, yoyo: true });
    this.drawChainBar(1);
  }

  private onChainReset(): void {
    this.currentChain = 0;
    this.chainText.setText('');
    this.chainBar.clear();
  }

  private drawChainBar(frac: number): void {
    const w = 160;
    const cx = this.scale.width / 2;
    this.chainBar.clear();
    if (frac <= 0) return;
    this.chainBar.fillStyle(0x00ffcc, 0.7);
    this.chainBar.fillRect(cx - w / 2, 52, w * frac, 3);
  }

  private drawSpecial(cur: number, max: number): void {
    const h = this.scale.height;
    const w = 140;
    const frac = Math.min(1, cur / max);
    this.specialBar.clear();
    this.specialBar.fillStyle(0x112233, 0.8);
    this.specialBar.fillRect(16, h - 44, w, 8);
    this.specialBar.fillStyle(frac >= 1 ? 0x00ffff : 0x3388aa, 0.95);
    this.specialBar.fillRect(16, h - 44, w * frac, 8);
    if (frac >= 1) {
      this.specialBar.lineStyle(1, 0xffffff, 0.8);
      this.specialBar.strokeRect(16, h - 44, w, 8);
    }
  }

  private drawChipRow(ids: string[]): void {
    this.chipRow.removeAll(true);
    const iconSize = 22;
    ids.slice(-8).forEach((id, i) => {
      const x = -i * (iconSize + 3);
      const box = this.add.rectangle(x, 0, iconSize, iconSize, 0x112233, 1).setOrigin(1, 1).setStrokeStyle(1, 0x2a4466);
      const label = this.add.text(x - 2, -2, id.slice(0, 2).toUpperCase(), { fontFamily: 'monospace', fontSize: '9px', color: '#88ffff' }).setOrigin(1, 1);
      this.chipRow.add([box, label]);
    });
  }

  update(_time: number, delta: number): void {
    if (this.currentChain > 0) {
      const windowMs = 2000;
      const decay = delta / windowMs;
      const cur = (this as unknown as { _chainFrac?: number });
      cur._chainFrac = Math.max(0, (cur._chainFrac ?? 1) - decay);
      this.drawChainBar(cur._chainFrac);
      if (cur._chainFrac <= 0) cur._chainFrac = 1;
    }
  }
}
