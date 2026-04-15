import type { FloorConfig } from '../types';

export const FLOORS: FloorConfig[] = [
  {
    id: 1,
    name: 'ASSEMBLY LINE',
    biome: 'factory_day',
    tileKeyPrefix: 'factory',
    enemyPool: [{ type: 'drone', weight: 10 }],
    hazardPool: ['saw', 'gas'],
    rooms: 5,
    hasMiniboss: true,
    sawDamage: 2,
  },
  {
    id: 2,
    name: 'POWER CORE',
    biome: 'power_night',
    tileKeyPrefix: 'power',
    enemyPool: [
      { type: 'drone', weight: 6 },
      { type: 'gunner', weight: 6 },
    ],
    hazardPool: ['saw', 'gas', 'generator'],
    rooms: 5,
    hasMiniboss: true,
    sawDamage: 2,
  },
  {
    id: 3,
    name: 'ROOFTOPS',
    biome: 'steampunk',
    tileKeyPrefix: 'factory',
    enemyPool: [
      { type: 'drone', weight: 4 },
      { type: 'gunner', weight: 6 },
      { type: 'captain', weight: 3 },
    ],
    hazardPool: ['saw', 'gas', 'generator', 'pit'],
    rooms: 5,
    hasMiniboss: true,
    sawDamage: 3,
  },
];
