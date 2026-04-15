export const EVENTS = {
  PLAYER_HP: 'player-hp',
  PLAYER_DIED: 'player-died',
  ENEMY_KILLED: 'enemy-killed',
  CHAIN_UPDATE: 'chain-update',
  CHAIN_RESET: 'chain-reset',
  SPECIAL_CHARGE: 'special-charge',
  ROOM_CLEARED: 'room-cleared',
  FLOOR_CHANGED: 'floor-changed',
  REWIRE_OPEN: 'rewire-open',
  REWIRE_CHOSEN: 'rewire-chosen',
  CHIPS_UPDATE: 'chips-update',
  RUN_STATS: 'run-stats',
  REQUEST_PAUSE: 'request-pause',
  REQUEST_RESUME: 'request-resume',
} as const;

export type PrototypeId = 'destroyer' | 'infantryman' | 'swordsman';
export type EnemyId = 'drone' | 'gunner' | 'captain';
export type HazardId = 'saw' | 'gas' | 'generator' | 'pit';
export type BiomeId = 'factory_day' | 'power_night' | 'steampunk' | 'factory_night';
export type ChipRarity = 'common' | 'rare' | 'epic' | 'cursed';

export interface PlayerStats {
  maxHp: number;
  hp: number;
  moveSpeed: number;
  jumpVelocity: number;
  dashSpeed: number;
  dashCooldown: number;
  dashDuration: number;
  dashCharges: number;
  attackDamage: number;
  attackCooldown: number;
  attackRange: number;
  specialChargeNeeded: number;
  chainWindow: number;
  chainCap: number;
  iFrameDuration: number;
  pierce: number;
  critChance: number;
  envDamageMultiplier: number;
  hazardRadiusMultiplier: number;
  invulnerableToOwnGas: boolean;
}

export const defaultStats = (proto: PrototypeId): PlayerStats => {
  const base: PlayerStats = {
    maxHp: 5,
    hp: 5,
    moveSpeed: 260,
    jumpVelocity: 560,
    dashSpeed: 580,
    dashCooldown: 800,
    dashDuration: 160,
    dashCharges: 1,
    attackDamage: 1,
    attackCooldown: 380,
    attackRange: 60,
    specialChargeNeeded: 80,
    chainWindow: 2500,
    chainCap: 10,
    iFrameDuration: 700,
    pierce: 0,
    critChance: 0,
    envDamageMultiplier: 1,
    hazardRadiusMultiplier: 1,
    invulnerableToOwnGas: false,
  };
  // Destroyer: slow heavy hitter, big shots
  if (proto === 'destroyer') return { ...base, maxHp: 6, hp: 6, moveSpeed: 210, jumpVelocity: 500, attackDamage: 2, attackCooldown: 550, attackRange: 360 };
  // Infantryman: fast rapid fire
  if (proto === 'infantryman') return { ...base, maxHp: 5, hp: 5, moveSpeed: 270, attackDamage: 1, attackCooldown: 120, attackRange: 300, dashCooldown: 700 };
  // Swordsman: mobile melee, quick dash
  return { ...base, maxHp: 4, hp: 4, moveSpeed: 290, jumpVelocity: 590, dashCooldown: 600, dashCharges: 2, attackDamage: 3, attackCooldown: 320, attackRange: 80 };
};

export interface ChipDef {
  id: string;
  name: string;
  desc: string;
  iconId: number;
  rarity: ChipRarity;
  apply: (stats: PlayerStats) => PlayerStats;
}

export interface EnemyDef {
  id: EnemyId;
  hp: number;
  speed: number;
  contactDamage: number;
  attackDamage: number;
  attackCooldown: number;
  attackRange: number;
  aggroRange: number;
  scrapValue: number;
  width: number;
  height: number;
  spriteScale: number;
  behavior: 'rusher' | 'gunner' | 'heavy';
}

export interface RoomTemplate {
  id: string;
  tiles: string[];
  spawns: { type: EnemyId; x: number; y: number }[];
  hazards: { type: HazardId; x: number; y: number; options?: Record<string, number | boolean> }[];
  chipSpawn?: { x: number; y: number };
  kind: 'combat' | 'gauntlet' | 'shop' | 'elite';
}

export interface FloorConfig {
  id: number;
  name: string;
  biome: BiomeId;
  tileKeyPrefix: 'factory' | 'power';
  enemyPool: { type: EnemyId; weight: number }[];
  hazardPool: HazardId[];
  rooms: number;
  hasMiniboss: boolean;
  sawDamage: number;
}
