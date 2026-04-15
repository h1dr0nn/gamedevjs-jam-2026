import Phaser from 'phaser';
import { newRun, runState } from '../systems/RunState';
import { metaStore } from '../systems/MetaStore';
import type { PrototypeId } from '../types';

export class ShutdownScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Shutdown' });
  }

  create(data: { won: boolean }): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 1).setOrigin(0, 0);

    const run = runState.current;
    const proto = run?.proto ?? 'destroyer';

    const titleText = data.won ? 'ESCAPED' : 'SHUTDOWN';
    const subtitle = data.won ? 'The machine lies silent.' : 'System failure detected.';
    const title = this.add
      .text(width / 2, 100, titleText, { fontFamily: 'monospace', fontSize: '64px', color: data.won ? '#00ffcc' : '#ff3355', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 150, subtitle, { fontFamily: 'monospace', fontSize: '14px', color: '#778899' })
      .setOrigin(0.5);

    // Shutdown animation of the robot
    const sprite = this.add.sprite(width / 2, height / 2 + 10, `robot-${proto}-shutdown`).setScale(1.6);
    sprite.play(`robot-${proto}-shutdown`);

    // Stats
    const startY = Math.min(height / 2 + 150, height - 220);
    const lines = [
      `Prototype:  ${proto.toUpperCase()}`,
      `Reached:    Floor ${(run?.deepestFloorReached ?? 1)}`,
      `Kills:      ${run?.kills ?? 0}  (${run?.envKills ?? 0} environmental)`,
      `Scrap:      +${Math.floor((run?.scrapEarned ?? 0) * (data.won ? 1 : 0.5))}`,
      `Chips held: ${run?.chipIds.length ?? 0}`,
    ];
    lines.forEach((l, i) => {
      this.add
        .text(width / 2, startY + i * 22, l, { fontFamily: 'monospace', fontSize: '14px', color: '#88bbbb' })
        .setOrigin(0.5);
    });

    this.add
      .text(width / 2, height - 100, `Runs: ${metaStore.runs}  ·  Best: Floor ${metaStore.deepestFloor}  ·  Total Scrap: ${metaStore.scrap}`, { fontFamily: 'monospace', fontSize: '11px', color: '#445566' })
      .setOrigin(0.5);

    const hint = this.add
      .text(width / 2, height - 60, '[ ENTER ]  new run          [ ESC ]  menu', { fontFamily: 'monospace', fontSize: '14px', color: '#00ffcc', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);

    const wait = this.time.delayedCall(800, () => {});
    void wait; void title;

    this.input.keyboard!.on('keydown-ENTER', () => this.newRun(proto));
    this.input.keyboard!.on('keydown-SPACE', () => this.newRun(proto));
    this.input.keyboard!.on('keydown-ESC', () => this.toMenu());
  }

  private newRun(proto: string): void {
    runState.current = newRun(proto as PrototypeId);
    this.scene.start('Game');
  }

  private toMenu(): void {
    this.scene.start('Menu');
  }
}
