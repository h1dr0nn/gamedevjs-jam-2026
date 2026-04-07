import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private scoreText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UI' });
  }

  create({ scene }: { scene: Phaser.Scene }) {
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '20px',
      color: '#ffffff',
    });

    scene.events.on('score-update', (score: number) => {
      this.scoreText?.setText(`Score: ${score}`);
    });
  }
}
