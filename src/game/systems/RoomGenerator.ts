import { RoomConfig, RoomGrid, RoomType, EnvObjectType, EnemyType } from '../types';
import { ROOM_TEMPLATES, CellCode } from '../data/rooms';
import { pickEnemyType } from '../data/enemies';

const CODE_TO_ENV: Partial<Record<CellCode, EnvObjectType>> = {
  2: EnvObjectType.Barrel,
  3: EnvObjectType.Boulder,
  4: EnvObjectType.CrackedWall,
};

const ENEMY_COUNT_BY_ROOM: Record<RoomType, [number, number]> = {
  [RoomType.Combat]: [2, 4],
  [RoomType.Elite]: [4, 6],
  [RoomType.Shop]: [0, 0],
  [RoomType.Boss]: [1, 1],
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class RoomGenerator {
  constructor(private readonly floor: number) {}

  generate(type: RoomType): RoomConfig {
    const template = ROOM_TEMPLATES[randInt(0, ROOM_TEMPLATES.length - 1)];

    const grid: RoomGrid = template.map(row =>
      row.map(code => ({
        wall: code === 1,
        envObject: CODE_TO_ENV[code] ?? null,
      }))
    );

    const [minE, maxE] = ENEMY_COUNT_BY_ROOM[type];
    const count = type === RoomType.Boss ? 1 : randInt(minE, maxE);
    const enemySpawns: RoomConfig['enemySpawns'] = [];

    const walkable: Array<{ row: number; col: number }> = [];
    for (let r = 1; r < 11; r++) {
      for (let c = 1; c < 15; c++) {
        if (!grid[r][c].wall && grid[r][c].envObject === null) {
          walkable.push({ row: r, col: c });
        }
      }
    }

    const shuffled = walkable.sort(() => Math.random() - 0.5);
    for (let i = 0; i < count && i < shuffled.length; i++) {
      enemySpawns.push({
        ...shuffled[i],
        type: type === RoomType.Boss ? EnemyType.Turret : pickEnemyType(this.floor),
      });
    }

    return { type, grid, enemySpawns, floor: this.floor };
  }
}
