import { UpgradeDef, PlayerStats } from '../types';

export class UpgradeSystem {
  private pool: UpgradeDef[];
  private appliedIds: Set<string> = new Set();

  constructor(pool: UpgradeDef[]) {
    this.pool = [...pool];
  }

  /** Return n random upgrades from the pool (no duplicates within the roll) */
  rollChoices(n: number): UpgradeDef[] {
    const shuffled = [...this.pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  applyUpgrade(stats: PlayerStats, upgrade: UpgradeDef): PlayerStats {
    this.appliedIds.add(upgrade.id);
    return upgrade.apply(stats);
  }

  hasApplied(id: string): boolean {
    return this.appliedIds.has(id);
  }

  reset(): void {
    this.appliedIds.clear();
  }
}
