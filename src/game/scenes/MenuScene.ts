import Phaser from 'phaser';
import { newRun, runState } from '../systems/RunState';
import { metaStore } from '../systems/MetaStore';
import { playSfx, unlockAudio } from '../systems/AudioSystem';
import type { PrototypeId } from '../types';

const PROTOS: { id: PrototypeId; name: string; tagline: string }[] = [
  { id: 'destroyer', name: 'DESTROYER', tagline: 'Heavy cannon · 6 HP' },
  { id: 'infantryman', name: 'INFANTRYMAN', tagline: 'Rapid fire · 5 HP' },
  { id: 'swordsman', name: 'SWORDSMAN', tagline: 'Blade & dash · 4 HP · i-frames' },
];

export class MenuScene extends Phaser.Scene {
  private selectedIndex = 0;
  private cards: Phaser.GameObjects.Container[] = [];
  private startText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    this.cards = [];
    this.selectedIndex = 0;
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x05060c).setOrigin(0, 0);

    // Background panel
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.add.rectangle(x, y, 2, 2, 0x00ffff, 0.15);
    }

    this.add
      .text(width / 2, 80, 'SHUTDOWN', {
        fontFamily: 'monospace',
        fontSize: '72px',
        color: '#00ffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 140, 'MACHINES KILLED MACHINES', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#55aaaa',
      })
      .setOrigin(0.5);

    // Prototype cards
    const cardW = 240;
    const gap = 30;
    const totalW = cardW * 3 + gap * 2;
    const startX = (width - totalW) / 2 + cardW / 2;
    PROTOS.forEach((proto, i) => {
      const locked = !metaStore.isUnlocked(proto.id);
      const x = startX + i * (cardW + gap);
      const y = height / 2 + 10;
      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, cardW, 260, 0x0c1420, 1).setStrokeStyle(2, 0x1a3050);
      card.add(bg);

      const spriteKey = `robot-${proto.id}-idle`;
      const sprite = this.add.sprite(0, -40, spriteKey).setScale(1.2);
      sprite.play(spriteKey);
      if (locked) sprite.setTint(0x333344);
      card.add(sprite);

      const nameText = this.add
        .text(0, 70, proto.name, { fontFamily: 'monospace', fontSize: '18px', color: locked ? '#334455' : '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5);
      const tagText = this.add
        .text(0, 94, proto.tagline, { fontFamily: 'monospace', fontSize: '11px', color: locked ? '#223344' : '#66aabb' })
        .setOrigin(0.5);
      card.add([nameText, tagText]);

      if (locked) {
        const lockText = this.add
          .text(0, 0, 'LOCKED', { fontFamily: 'monospace', fontSize: '14px', color: '#ff3355', fontStyle: 'bold' })
          .setOrigin(0.5);
        const req = this.add
          .text(0, 20, proto.id === 'infantryman' ? 'Reach Floor 2' : 'Reach Floor 3', { fontFamily: 'monospace', fontSize: '10px', color: '#ff3355' })
          .setOrigin(0.5);
        card.add([lockText, req]);
      }

      this.cards.push(card);
    });

    this.infoText = this.add
      .text(width / 2, height - 110, '', { fontFamily: 'monospace', fontSize: '14px', color: '#88bbbb' })
      .setOrigin(0.5);
    this.startText = this.add
      .text(width / 2, height - 60, '← →  select   ENTER start', { fontFamily: 'monospace', fontSize: '16px', color: '#00ff99', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.tweens.add({ targets: this.startText, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(width - 12, height - 12, `Runs: ${metaStore.runs}  ·  Best: Floor ${metaStore.deepestFloor}`, { fontFamily: 'monospace', fontSize: '11px', color: '#445566' })
      .setOrigin(1, 1);

    this.add
      .text(12, height - 12, 'A/D ←→ move · W/SPACE jump · SHIFT dash\nJ shoot · K special · E interact', { fontFamily: 'monospace', fontSize: '11px', color: '#445566' })
      .setOrigin(0, 1);

    this.input.keyboard!.on('keydown-LEFT', () => this.move(-1));
    this.input.keyboard!.on('keydown-A', () => this.move(-1));
    this.input.keyboard!.on('keydown-RIGHT', () => this.move(1));
    this.input.keyboard!.on('keydown-D', () => this.move(1));
    this.input.keyboard!.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard!.on('keydown-SPACE', () => this.confirm());

    this.updateSelection();
  }

  private move(dir: number): void {
    unlockAudio();
    this.selectedIndex = (this.selectedIndex + dir + PROTOS.length) % PROTOS.length;
    this.updateSelection();
    playSfx('menu');
  }

  private updateSelection(): void {
    this.cards.forEach((c, i) => {
      const bg = c.getAt(0) as Phaser.GameObjects.Rectangle;
      const selected = i === this.selectedIndex;
      bg.setStrokeStyle(2, selected ? 0x00ffff : 0x1a3050);
      c.setScale(selected ? 1.04 : 1);
    });
    const proto = PROTOS[this.selectedIndex];
    const locked = !metaStore.isUnlocked(proto.id);
    this.infoText.setText(locked ? '— LOCKED —' : proto.tagline);
  }

  private confirm(): void {
    unlockAudio();
    const proto = PROTOS[this.selectedIndex];
    if (!metaStore.isUnlocked(proto.id)) {
      playSfx('hurt');
      return;
    }
    playSfx('door');
    runState.current = newRun(proto.id);
    this.scene.start('Game');
  }
}
