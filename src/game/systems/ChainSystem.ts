import Phaser from 'phaser';

export class ChainSystem extends Phaser.Events.EventEmitter {
  private count = 0;
  private lastKillTime = 0;

  constructor(
    private scene: Phaser.Scene,
    private windowMs: number,
    private cap: number,
  ) {
    super();
  }

  setWindow(ms: number): void {
    this.windowMs = ms;
  }
  setCap(cap: number): void {
    this.cap = cap;
  }

  registerKill(envBonus = false): number {
    this.count = Math.min(this.cap, this.count + (envBonus ? 2 : 1));
    this.lastKillTime = this.scene.time.now;
    this.emit('chain', this.count);
    return this.count;
  }

  update(): void {
    if (this.count > 0 && this.scene.time.now - this.lastKillTime > this.windowMs) {
      this.count = 0;
      this.emit('reset');
    }
  }

  get value(): number {
    return this.count;
  }

  remaining(): number {
    return Math.max(0, 1 - (this.scene.time.now - this.lastKillTime) / this.windowMs);
  }
}
