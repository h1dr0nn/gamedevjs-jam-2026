// ─── Shared enums ────────────────────────────────────────────────────────────

export const enum EnemyType {
  Grunt = 'grunt',
  Shielder = 'shielder',
  Bomber = 'bomber',
  Turret = 'turret',
}

export const enum EnvObjectType {
  Barrel = 'barrel',
  Boulder = 'boulder',
  CrackedWall = 'crackedwall',
  ElectricPanel = 'electricpanel',
}

export const enum UpgradeCategory {
  Dash = 'dash',
  Explosion = 'explosion',
  Momentum = 'momentum',
  Utility = 'utility',
}

export const enum RoomType {
  Combat = 'combat',
  Shop = 'shop',
  Elite = 'elite',
  Boss = 'boss',
}

// ─── Upgrade ─────────────────────────────────────────────────────────────────

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  apply: (stats: PlayerStats) => PlayerStats;
}

// ─── Player stats ─────────────────────────────────────────────────────────────

export interface PlayerStats {
  maxHp: number;
  dashCooldown: number;      // ms
  dashDistance: number;      // pixels
  dashCharges: number;       // max simultaneous charges
  comboWindow: number;       // ms before combo resets
  comboMultiplierCap: number;
  explosionRadius: number;   // base explosion radius multiplier
}

export const DEFAULT_PLAYER_STATS: PlayerStats = {
  maxHp: 3,
  dashCooldown: 350,
  dashDistance: 200,
  dashCharges: 1,
  comboWindow: 1500,
  comboMultiplierCap: 6,
  explosionRadius: 1.0,
};

// ─── Room ─────────────────────────────────────────────────────────────────────

export interface RoomCell {
  wall: boolean;
  envObject: EnvObjectType | null;
}

export type RoomGrid = RoomCell[][];  // [row][col], 12 rows × 16 cols

export interface RoomConfig {
  type: RoomType;
  grid: RoomGrid;
  enemySpawns: Array<{ col: number; row: number; type: EnemyType }>;
  floor: number;
}

// ─── Game events (EventEmitter keys) ─────────────────────────────────────────

export const EVENTS = {
  ENEMY_KILLED: 'enemy-killed',
  COMBO_UPDATE: 'combo-update',
  COMBO_RESET: 'combo-reset',
  ROOM_CLEARED: 'room-cleared',
  PLAYER_HP_CHANGE: 'player-hp-change',
  PLAYER_DIED: 'player-died',
  UPGRADE_CHOSEN: 'upgrade-chosen',
  EXPLOSION: 'explosion',           // payload: { x, y, radius }
  DEBRIS: 'debris',                 // payload: { x, y, directions: number[] }
} as const;
