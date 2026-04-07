type ComboEventMap = {
  'combo-update': number;
  'combo-reset': void;
};

type ComboEventKey = keyof ComboEventMap;
type ComboHandler<K extends ComboEventKey> = (payload: ComboEventMap[K]) => void;

interface ComboConfig {
  comboWindow: number;
  comboMultiplierCap: number;
}

export class ComboSystem {
  multiplier = 1;

  private readonly comboWindow: number;
  private readonly cap: number;
  private lastKillTime = 0;
  private active = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: { [K in ComboEventKey]?: Array<ComboHandler<any>> } = {};

  constructor(config: ComboConfig) {
    this.comboWindow = config.comboWindow;
    this.cap = config.comboMultiplierCap;
  }

  on<K extends ComboEventKey>(event: K, handler: ComboHandler<K>): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(handler);
  }

  private emit<K extends ComboEventKey>(event: K, payload?: ComboEventMap[K]): void {
    this.listeners[event]?.forEach(h => h(payload as ComboEventMap[K]));
  }

  registerKill(): void {
    this.lastKillTime = Date.now();
    this.active = true;
    this.multiplier = Math.min(this.multiplier + 1, this.cap);
    this.emit('combo-update', this.multiplier);
  }

  /** Call every frame from game loop */
  update(): void {
    if (!this.active) return;
    if (Date.now() - this.lastKillTime >= this.comboWindow) {
      this.multiplier = 1;
      this.active = false;
      this.emit('combo-reset');
    }
  }

  /** Returns dash speed/distance multiplier based on current combo */
  getDashBoost(): number {
    return 1.0 + (this.multiplier - 1) * 0.2;
  }

  reset(): void {
    this.multiplier = 1;
    this.active = false;
  }
}
