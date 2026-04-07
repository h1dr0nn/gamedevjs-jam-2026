import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private score = 0;

  constructor() {
    super({ key: 'Game' });
  }

  create() {
    // TODO: Build game mechanics after theme reveal (13/04)

    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, 'Game Scene\n\nTODO: Build after theme reveal!', {
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.cursors = this.input.keyboard?.createCursorKeys();

    // Launch UI overlay
    this.scene.launch('UI', { scene: this });
  }

  update() {
    // TODO: Game logic here
    void this.cursors;
    void this.score;
  }

  addScore(points: number) {
    this.score += points;
    this.events.emit('score-update', this.score);
  }

  gameOver() {
    this.scene.stop('UI');
    this.scene.start('Menu');
  }
}
