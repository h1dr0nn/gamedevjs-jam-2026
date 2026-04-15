import Phaser from 'phaser';
import { setMuted, isMuted } from '../systems/AudioSystem';

export class PauseScene extends Phaser.Scene {
  constructor() { super({ key: 'Pause' }); }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0, 0);
    this.add.text(width / 2, height / 2 - 80, 'PAUSED', { fontFamily: 'monospace', fontSize: '40px', color: '#00ffff', fontStyle: 'bold' }).setOrigin(0.5);

    const muteText = this.add
      .text(width / 2, height / 2, `[ M ] Sound: ${isMuted() ? 'OFF' : 'ON'}`, { fontFamily: 'monospace', fontSize: '14px', color: '#88bbbb' })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 30, '[ ESC ] Resume    [ Q ] Quit to menu', { fontFamily: 'monospace', fontSize: '12px', color: '#445566' })
      .setOrigin(0.5);

    this.input.keyboard!.on('keydown-M', () => {
      setMuted(!isMuted());
      muteText.setText(`[ M ] Sound: ${isMuted() ? 'OFF' : 'ON'}`);
    });
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.resume('Game');
      this.scene.stop();
    });
    this.input.keyboard!.on('keydown-Q', () => {
      this.scene.stop('Game');
      this.scene.stop('UI');
      this.scene.start('Menu');
      this.scene.stop();
    });
  }
}
