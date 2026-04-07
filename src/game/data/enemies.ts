import { EnemyType } from '../types';

export const ENEMY_WEIGHTS: Record<number, Array<{ type: EnemyType; weight: number }>> = {
  1: [
    { type: EnemyType.Grunt, weight: 10 },
  ],
  2: [
    { type: EnemyType.Grunt, weight: 7 },
    { type: EnemyType.Shielder, weight: 3 },
  ],
  3: [
    { type: EnemyType.Grunt, weight: 5 },
    { type: EnemyType.Shielder, weight: 3 },
    { type: EnemyType.Bomber, weight: 2 },
  ],
  4: [
    { type: EnemyType.Grunt, weight: 4 },
    { type: EnemyType.Shielder, weight: 3 },
    { type: EnemyType.Bomber, weight: 2 },
    { type: EnemyType.Turret, weight: 1 },
  ],
  5: [
    { type: EnemyType.Grunt, weight: 3 },
    { type: EnemyType.Shielder, weight: 3 },
    { type: EnemyType.Bomber, weight: 2 },
    { type: EnemyType.Turret, weight: 2 },
  ],
};

export function pickEnemyType(floor: number): EnemyType {
  const table = ENEMY_WEIGHTS[Math.min(floor, 5)];
  const total = table.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const entry of table) {
    r -= entry.weight;
    if (r <= 0) return entry.type;
  }
  return EnemyType.Grunt;
}
