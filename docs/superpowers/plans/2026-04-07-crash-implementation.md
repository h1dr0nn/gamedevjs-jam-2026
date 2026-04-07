# CRASH — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build CRASH, a top-down roguelite where the player kills enemies by dashing into them and triggering chain-reaction environmental hazards, with per-run upgrades and 5 floors of proc-gen rooms.

**Architecture:** Pure-logic systems (ComboSystem, UpgradeSystem, RoomGenerator) are framework-agnostic TypeScript classes — unit-testable with Vitest. Phaser-dependent code (entities, scenes) uses TypeScript compilation + manual browser verification. GameScene orchestrates all systems via a single EventEmitter bus.

**Tech Stack:** Phaser 3.88.2, React 18, Vite, TypeScript (strict), Vitest for unit tests. All visuals use Phaser Graphics API (procedural) — no external sprite files needed.

---

## Parallel Execution Map

```
Task 1 (types + vitest)
    ├── Task 2 (ComboSystem)   ─── parallel ───  Task 3 (UpgradeSystem)
    │        └── Task 5 (Player + DashSystem)
    │                  └── Task 6 (Enemy base + Grunt)  ─── parallel ───  Task 7 (Barrel + EnvironmentSystem)
    │                            └── Task 8 (Shielder + Bomber + Turret)
    │                            └── Task 9 (Boulder + CrackedWall)
    │                  └── Task 10 (CollisionHandler + GameScene MVP)
    │                            └── Task 11 (RoomGenerator)
    │                                      └── Task 12 (GameScene full integration)
    └── Task 4 (RoomGenerator data / rooms.ts)
Task 13 (UIScene + UpgradeScene)  ─── after Task 10
Task 14 (JuiceSystem)             ─── after Task 10
Task 15 (MenuScene + PreloadScene polish)  ─── after Task 12
Task 16 (Audio)                   ─── after Task 12
```

---

## File Map

### New files to create
```
src/game/
  entities/
    Player.ts              — Phaser sprite, movement, HP, dash state
    enemies/
      Enemy.ts             — Abstract base: HP, AI state machine, draw()
      Grunt.ts             — Moves toward player
      Shielder.ts          — Rotates to face player, blocks front
      Bomber.ts            — Charges player, explodes on contact
      Turret.ts            — Stationary, fires projectile patterns
    environment/
      Barrel.ts            — Explodes on dash, chains to nearby barrels
      Boulder.ts           — Flies in dash direction, crushes enemies
      CrackedWall.ts       — Shatters, debris damages in 8 directions
  systems/
    DashSystem.ts          — Dash state, cooldown, i-frames, afterimage
    ComboSystem.ts         — Kill-chain multiplier, timer, events
    CollisionHandler.ts    — Wires player/dash collisions to kills & env triggers
    EnvironmentSystem.ts   — Chain explosion logic, debris spawning
    RoomGenerator.ts       — Proc-gen 16×12 grid rooms with weighted hazards
    UpgradeSystem.ts       — Per-run upgrade pool, apply effects
    JuiceSystem.ts         — Screen shake, afterimage trail, particles, slow-mo
  scenes/
    UpgradeScene.ts        — Overlay showing 3 upgrade choices between rooms
  data/
    upgrades.ts            — All upgrade definitions
    enemies.ts             — Enemy spawn weights per floor
    rooms.ts               — Room template patterns for RoomGenerator
```

### Files to modify
```
src/game/config.ts         — Add UpgradeScene to scene list
src/game/scenes/GameScene.ts    — Full rewrite: orchestrate all systems
src/game/scenes/UIScene.ts      — Rewrite: combo meter, HP bar, floor indicator
src/game/scenes/MenuScene.ts    — Update title to CRASH, add controls hint
src/game/scenes/PreloadScene.ts — Register procedural asset placeholders
package.json               — Add vitest
vite.config.ts             — Add vitest config
```

---

## Task 1: Testing Infrastructure + Type Definitions

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/game/types.ts`

- [ ] **Step 1.1: Install vitest**

```bash
cd d:/Projects/Projects/gamedevjs-jam-2026
npm install -D vitest
```

- [ ] **Step 1.2: Add vitest config to vite.config.ts**

Replace the file content:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 1.3: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 1.4: Create src/game/types.ts**

```ts
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
```

- [ ] **Step 1.5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 1.6: Commit**

```bash
git add package.json vite.config.ts src/game/types.ts
git commit -m "feat: add vitest and shared type definitions"
```

---

## Task 2: ComboSystem

**Files:**
- Create: `src/game/systems/ComboSystem.ts`
- Create: `src/game/systems/ComboSystem.test.ts`

- [ ] **Step 2.1: Write failing tests**

Create `src/game/systems/ComboSystem.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ComboSystem } from './ComboSystem';

describe('ComboSystem', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts at multiplier 1', () => {
    const combo = new ComboSystem({ comboWindow: 1500, comboMultiplierCap: 6 });
    expect(combo.multiplier).toBe(1);
  });

  it('increments multiplier on kill', () => {
    const combo = new ComboSystem({ comboWindow: 1500, comboMultiplierCap: 6 });
    combo.registerKill();
    expect(combo.multiplier).toBe(2);
    combo.registerKill();
    expect(combo.multiplier).toBe(3);
  });

  it('caps at comboMultiplierCap', () => {
    const combo = new ComboSystem({ comboWindow: 1500, comboMultiplierCap: 6 });
    for (let i = 0; i < 10; i++) combo.registerKill();
    expect(combo.multiplier).toBe(6);
  });

  it('resets to 1 after comboWindow elapses with no kill', () => {
    const combo = new ComboSystem({ comboWindow: 1500, comboMultiplierCap: 6 });
    combo.registerKill();
    expect(combo.multiplier).toBe(2);
    vi.advanceTimersByTime(1600);
    combo.update();
    expect(combo.multiplier).toBe(1);
  });

  it('does not reset if kill happens within window', () => {
    const combo = new ComboSystem({ comboWindow: 1500, comboMultiplierCap: 6 });
    combo.registerKill();
    vi.advanceTimersByTime(1000);
    combo.registerKill();  // reset timer
    vi.advanceTimersByTime(1000);
    combo.update();
    expect(combo.multiplier).toBe(3);
  });

  it('emits combo-update event on kill', () => {
    const combo = new ComboSystem({ comboWindow: 1500, comboMultiplierCap: 6 });
    const handler = vi.fn();
    combo.on('combo-update', handler);
    combo.registerKill();
    expect(handler).toHaveBeenCalledWith(2);
  });

  it('emits combo-reset event on timeout', () => {
    const combo = new ComboSystem({ comboWindow: 1500, comboMultiplierCap: 6 });
    const resetHandler = vi.fn();
    combo.on('combo-reset', resetHandler);
    combo.registerKill();
    vi.advanceTimersByTime(1600);
    combo.update();
    expect(resetHandler).toHaveBeenCalled();
  });

  it('getDashBoost returns 1.0 at x1, scales up', () => {
    const combo = new ComboSystem({ comboWindow: 1500, comboMultiplierCap: 6 });
    expect(combo.getDashBoost()).toBe(1.0);
    combo.registerKill(); // x2
    expect(combo.getDashBoost()).toBeGreaterThan(1.0);
  });
});
```

- [ ] **Step 2.2: Run tests — expect FAIL**

```bash
npx vitest run src/game/systems/ComboSystem.test.ts
```
Expected: FAIL — `ComboSystem` not found.

- [ ] **Step 2.3: Implement ComboSystem**

Create `src/game/systems/ComboSystem.ts`:
```ts
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
    // x1 = 1.0, x2 = 1.2, x3 = 1.4, ...
    return 1.0 + (this.multiplier - 1) * 0.2;
  }

  reset(): void {
    this.multiplier = 1;
    this.active = false;
  }
}
```

- [ ] **Step 2.4: Run tests — expect PASS**

```bash
npx vitest run src/game/systems/ComboSystem.test.ts
```
Expected: all 8 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/game/systems/ComboSystem.ts src/game/systems/ComboSystem.test.ts
git commit -m "feat: add ComboSystem with unit tests"
```

---

## Task 3: UpgradeSystem

**Files:**
- Create: `src/game/data/upgrades.ts`
- Create: `src/game/systems/UpgradeSystem.ts`
- Create: `src/game/systems/UpgradeSystem.test.ts`

- [ ] **Step 3.1: Create upgrade definitions**

Create `src/game/data/upgrades.ts`:
```ts
import { UpgradeDef, UpgradeCategory, PlayerStats } from '../types';

export const ALL_UPGRADES: UpgradeDef[] = [
  // Dash
  {
    id: 'dash_cooldown_1',
    name: 'Afterburner',
    description: 'Dash cooldown -80ms',
    category: UpgradeCategory.Dash,
    apply: (s: PlayerStats) => ({ ...s, dashCooldown: Math.max(100, s.dashCooldown - 80) }),
  },
  {
    id: 'dash_distance_1',
    name: 'Rocket Legs',
    description: 'Dash distance +50px',
    category: UpgradeCategory.Dash,
    apply: (s: PlayerStats) => ({ ...s, dashDistance: s.dashDistance + 50 }),
  },
  {
    id: 'dash_charge_1',
    name: 'Double Tap',
    description: 'Gain 1 extra dash charge',
    category: UpgradeCategory.Dash,
    apply: (s: PlayerStats) => ({ ...s, dashCharges: s.dashCharges + 1 }),
  },
  // Explosion
  {
    id: 'explosion_radius_1',
    name: 'Big Bang',
    description: 'Explosion radius ×1.4',
    category: UpgradeCategory.Explosion,
    apply: (s: PlayerStats) => ({ ...s, explosionRadius: s.explosionRadius * 1.4 }),
  },
  {
    id: 'explosion_chain_1',
    name: 'Chain Reaction',
    description: 'Explosions chain to barrels twice as far',
    category: UpgradeCategory.Explosion,
    apply: (s: PlayerStats) => ({ ...s, explosionRadius: s.explosionRadius * 1.8 }),
  },
  // Momentum
  {
    id: 'combo_window_1',
    name: 'In The Zone',
    description: 'Combo window +500ms',
    category: UpgradeCategory.Momentum,
    apply: (s: PlayerStats) => ({ ...s, comboWindow: s.comboWindow + 500 }),
  },
  {
    id: 'combo_cap_1',
    name: 'Overdrive',
    description: 'Combo multiplier cap +2',
    category: UpgradeCategory.Momentum,
    apply: (s: PlayerStats) => ({ ...s, comboMultiplierCap: s.comboMultiplierCap + 2 }),
  },
  // Utility
  {
    id: 'hp_up_1',
    name: 'Adrenaline',
    description: '+1 max HP (and restore it)',
    category: UpgradeCategory.Utility,
    apply: (s: PlayerStats) => ({ ...s, maxHp: s.maxHp + 1 }),
  },
  {
    id: 'revival_1',
    name: 'Last Stand',
    description: 'Survive one fatal hit with 1 HP (once per run)',
    category: UpgradeCategory.Utility,
    apply: (s: PlayerStats) => s, // effect handled separately by Player
  },
];
```

- [ ] **Step 3.2: Write failing tests**

Create `src/game/systems/UpgradeSystem.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { UpgradeSystem } from './UpgradeSystem';
import { ALL_UPGRADES } from '../data/upgrades';
import { DEFAULT_PLAYER_STATS } from '../types';

describe('UpgradeSystem', () => {
  it('picks 3 unique upgrades from pool', () => {
    const sys = new UpgradeSystem(ALL_UPGRADES);
    const choices = sys.rollChoices(3);
    expect(choices).toHaveLength(3);
    const ids = choices.map(u => u.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('applies upgrade and mutates stats', () => {
    const sys = new UpgradeSystem(ALL_UPGRADES);
    const before = { ...DEFAULT_PLAYER_STATS };
    const afterburner = ALL_UPGRADES.find(u => u.id === 'dash_cooldown_1')!;
    const after = sys.applyUpgrade(before, afterburner);
    expect(after.dashCooldown).toBe(before.dashCooldown - 80);
  });

  it('does not mutate original stats object', () => {
    const sys = new UpgradeSystem(ALL_UPGRADES);
    const original = { ...DEFAULT_PLAYER_STATS };
    const frozen = { ...original };
    const afterburner = ALL_UPGRADES.find(u => u.id === 'dash_cooldown_1')!;
    sys.applyUpgrade(original, afterburner);
    expect(original).toEqual(frozen);
  });

  it('rollChoices returns fewer items if pool is smaller', () => {
    const sys = new UpgradeSystem(ALL_UPGRADES.slice(0, 2));
    const choices = sys.rollChoices(3);
    expect(choices).toHaveLength(2);
  });
});
```

- [ ] **Step 3.3: Run tests — expect FAIL**

```bash
npx vitest run src/game/systems/UpgradeSystem.test.ts
```
Expected: FAIL — `UpgradeSystem` not found.

- [ ] **Step 3.4: Implement UpgradeSystem**

Create `src/game/systems/UpgradeSystem.ts`:
```ts
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
```

- [ ] **Step 3.5: Run tests — expect PASS**

```bash
npx vitest run src/game/systems/UpgradeSystem.test.ts
```
Expected: all 4 tests pass.

- [ ] **Step 3.6: Commit**

```bash
git add src/game/data/upgrades.ts src/game/systems/UpgradeSystem.ts src/game/systems/UpgradeSystem.test.ts
git commit -m "feat: add UpgradeSystem and upgrade definitions"
```

---

## Task 4: RoomGenerator

**Files:**
- Create: `src/game/data/rooms.ts`
- Create: `src/game/data/enemies.ts`
- Create: `src/game/systems/RoomGenerator.ts`
- Create: `src/game/systems/RoomGenerator.test.ts`

- [ ] **Step 4.1: Create data files**

Create `src/game/data/enemies.ts`:
```ts
import { EnemyType } from '../types';

// Weight tables per floor (1-5). Higher floor = harder mix.
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
```

Create `src/game/data/rooms.ts`:
```ts
// Room template patterns: 0 = floor, 1 = wall, 2 = barrel, 3 = boulder, 4 = cracked wall
// Each pattern is a 12×16 number array (rows × cols)
// Templates are used as seeds; RoomGenerator overlays enemies separately.

export type CellCode = 0 | 1 | 2 | 3 | 4;
export type RoomTemplate = CellCode[][];  // 12 rows × 16 cols

/** Build a blank room with border walls */
function borderRoom(): RoomTemplate {
  return Array.from({ length: 12 }, (_, r) =>
    Array.from({ length: 16 }, (_, c) => {
      if (r === 0 || r === 11 || c === 0 || c === 15) return 1;
      return 0;
    }) as CellCode[]
  );
}

/** Add a 2-cell-wide corridor in the center of each wall for doors */
function addDoors(grid: RoomTemplate): RoomTemplate {
  const g = grid.map(row => [...row] as CellCode[]);
  // Top/bottom doors (cols 7–8)
  g[0][7] = 0; g[0][8] = 0;
  g[11][7] = 0; g[11][8] = 0;
  // Left/right doors (rows 5–6)
  g[5][0] = 0; g[6][0] = 0;
  g[5][15] = 0; g[6][15] = 0;
  return g;
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  // Template 0: open room with 4 barrels at corners
  (() => {
    const g = addDoors(borderRoom());
    g[2][2] = 2; g[2][13] = 2; g[9][2] = 2; g[9][13] = 2;
    return g;
  })(),

  // Template 1: central pillar with barrels flanking it
  (() => {
    const g = addDoors(borderRoom());
    // Central 2×2 pillar
    g[5][7] = 1; g[5][8] = 1; g[6][7] = 1; g[6][8] = 1;
    g[3][5] = 2; g[3][10] = 2; g[8][5] = 2; g[8][10] = 2;
    return g;
  })(),

  // Template 2: cracked walls creating corridors
  (() => {
    const g = addDoors(borderRoom());
    g[3][3] = 4; g[3][12] = 4; g[8][3] = 4; g[8][12] = 4;
    g[2][7] = 3; g[9][7] = 3;  // boulders
    return g;
  })(),

  // Template 3: C-shaped inner wall with barrel in nook
  (() => {
    const g = addDoors(borderRoom());
    for (let r = 3; r <= 8; r++) g[r][4] = 1;
    g[3][4] = 0; // open top
    g[5][5] = 2; g[6][5] = 2;
    return g;
  })(),
];
```

- [ ] **Step 4.2: Write failing tests**

Create `src/game/systems/RoomGenerator.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { RoomGenerator } from './RoomGenerator';
import { RoomType, EnemyType } from '../types';

describe('RoomGenerator', () => {
  it('generates a room with correct grid dimensions', () => {
    const gen = new RoomGenerator(1);
    const room = gen.generate(RoomType.Combat);
    expect(room.grid).toHaveLength(12);
    expect(room.grid[0]).toHaveLength(16);
  });

  it('border cells are always walls', () => {
    const gen = new RoomGenerator(1);
    const room = gen.generate(RoomType.Combat);
    for (let c = 0; c < 16; c++) {
      // Doors are open, but non-door border cells are walls
      // Check corners are walls
      expect(room.grid[0][0].wall).toBe(true);
      expect(room.grid[11][15].wall).toBe(true);
    }
  });

  it('generates between 2 and 6 enemy spawns for floor 1 combat room', () => {
    const gen = new RoomGenerator(1);
    const room = gen.generate(RoomType.Combat);
    expect(room.enemySpawns.length).toBeGreaterThanOrEqual(2);
    expect(room.enemySpawns.length).toBeLessThanOrEqual(6);
  });

  it('floor 1 only spawns Grunts', () => {
    const gen = new RoomGenerator(1);
    for (let i = 0; i < 20; i++) {
      const room = gen.generate(RoomType.Combat);
      room.enemySpawns.forEach(s => expect(s.type).toBe(EnemyType.Grunt));
    }
  });

  it('enemy spawns are not on wall cells', () => {
    const gen = new RoomGenerator(1);
    const room = gen.generate(RoomType.Combat);
    room.enemySpawns.forEach(({ row, col }) => {
      expect(room.grid[row][col].wall).toBe(false);
    });
  });

  it('sets correct floor and type on returned config', () => {
    const gen = new RoomGenerator(3);
    const room = gen.generate(RoomType.Elite);
    expect(room.floor).toBe(3);
    expect(room.type).toBe(RoomType.Elite);
  });
});
```

- [ ] **Step 4.3: Run tests — expect FAIL**

```bash
npx vitest run src/game/systems/RoomGenerator.test.ts
```
Expected: FAIL — `RoomGenerator` not found.

- [ ] **Step 4.4: Implement RoomGenerator**

Create `src/game/systems/RoomGenerator.ts`:
```ts
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

    // Collect walkable interior cells (exclude border and env objects)
    const walkable: Array<{ row: number; col: number }> = [];
    for (let r = 1; r < 11; r++) {
      for (let c = 1; c < 15; c++) {
        if (!grid[r][c].wall && grid[r][c].envObject === null) {
          walkable.push({ row: r, col: c });
        }
      }
    }

    // Shuffle and pick spawn cells
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
```

- [ ] **Step 4.5: Run tests — expect PASS**

```bash
npx vitest run src/game/systems/RoomGenerator.test.ts
```
Expected: all 6 tests pass.

- [ ] **Step 4.6: Run all tests**

```bash
npx vitest run
```
Expected: all tests pass (ComboSystem + UpgradeSystem + RoomGenerator).

- [ ] **Step 4.7: Commit**

```bash
git add src/game/data/ src/game/systems/RoomGenerator.ts src/game/systems/RoomGenerator.test.ts
git commit -m "feat: add RoomGenerator, enemy weights, room templates"
```

---

## Task 5: Player Entity + DashSystem

**Files:**
- Create: `src/game/entities/Player.ts`
- Create: `src/game/systems/DashSystem.ts`

> No unit tests — Phaser-dependent. Verification: `npx tsc --noEmit` + browser.

- [ ] **Step 5.1: Create DashSystem**

Create `src/game/systems/DashSystem.ts`:
```ts
import Phaser from 'phaser';
import { PlayerStats } from '../types';

export type DashState = 'ready' | 'dashing' | 'cooldown';

export class DashSystem {
  state: DashState = 'ready';
  chargesLeft: number;

  private readonly scene: Phaser.Scene;
  private cooldownTimer = 0;
  private dashEndTimer = 0;
  private readonly DASH_DURATION = 120; // ms

  constructor(scene: Phaser.Scene, private stats: PlayerStats) {
    this.scene = scene;
    this.chargesLeft = stats.dashCharges;
  }

  updateStats(stats: PlayerStats): void {
    this.stats = stats;
    this.chargesLeft = stats.dashCharges;
  }

  /** Attempt a dash toward (targetX, targetY). Returns true if dash started. */
  tryDash(
    body: Phaser.Physics.Arcade.Body,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): boolean {
    if (this.state !== 'ready' || this.chargesLeft <= 0) return false;

    const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY);
    const boost = 1.0; // caller applies combo boost externally
    const speed = (this.stats.dashDistance / this.DASH_DURATION) * 1000 * boost;

    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.state = 'dashing';
    this.chargesLeft--;
    this.dashEndTimer = this.DASH_DURATION;

    return true;
  }

  /** Call every frame with delta (ms). Manages state transitions. */
  update(delta: number, body: Phaser.Physics.Arcade.Body): void {
    if (this.state === 'dashing') {
      this.dashEndTimer -= delta;
      if (this.dashEndTimer <= 0) {
        body.setVelocity(0, 0);
        this.state = 'cooldown';
        this.cooldownTimer = this.stats.dashCooldown;
      }
    } else if (this.state === 'cooldown') {
      this.cooldownTimer -= delta;
      if (this.cooldownTimer <= 0) {
        this.state = 'ready';
        this.chargesLeft = Math.min(this.chargesLeft + 1, this.stats.dashCharges);
      }
    }
  }

  get isDashing(): boolean { return this.state === 'dashing'; }
}
```

- [ ] **Step 5.2: Create Player entity**

Create `src/game/entities/Player.ts`:
```ts
import Phaser from 'phaser';
import { PlayerStats, DEFAULT_PLAYER_STATS, EVENTS } from '../types';
import { DashSystem } from '../systems/DashSystem';

const STILL_TIMEOUT = 2000; // ms before player becomes vulnerable

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  stats: PlayerStats;
  readonly dashSystem: DashSystem;
  hasRevival = false;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private stillTimer = 0;
  isVulnerable = false;
  private afterimages: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.stats = { ...DEFAULT_PLAYER_STATS };
    this.hp = this.stats.maxHp;
    this.dashSystem = new DashSystem(scene, this.stats);

    // Draw player as a cyan rectangle (replace with sprite later)
    const gfx = scene.add.rectangle(0, 0, 20, 20, 0x00ffff).setOrigin(0.5);
    this.scene.children.bringToTop(gfx);
    // Attach graphics to sprite position in update
    (this as unknown as { _gfx: Phaser.GameObjects.Rectangle })._gfx = gfx;

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(20, 20);

    // Pointer (mouse/touch) to aim dash
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.performDash(pointer.worldX, pointer.worldY);
    });
  }

  private performDash(toX: number, toY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const started = this.dashSystem.tryDash(body, this.x, this.y, toX, toY);
    if (started) {
      this.stillTimer = 0;
      this.isVulnerable = false;
      this.spawnAfterimage();
    }
  }

  private spawnAfterimage(): void {
    const ghost = this.scene.add.rectangle(this.x, this.y, 20, 20, 0x00ffff, 0.5);
    this.afterimages.push(ghost);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      onComplete: () => {
        ghost.destroy();
        const idx = this.afterimages.indexOf(ghost);
        if (idx !== -1) this.afterimages.splice(idx, 1);
      },
    });
  }

  takeDamage(amount: number): void {
    if (this.dashSystem.isDashing) return; // i-frames
    if (this.hasRevival && this.hp <= amount) {
      this.hp = 1;
      this.hasRevival = false;
      return;
    }
    this.hp -= amount;
    this.scene.events.emit(EVENTS.PLAYER_HP_CHANGE, this.hp);
    if (this.hp <= 0) {
      this.scene.events.emit(EVENTS.PLAYER_DIED);
    }
  }

  applyStats(stats: PlayerStats): void {
    this.stats = stats;
    this.dashSystem.updateStats(stats);
    // Restore HP if maxHp increased
    if (stats.maxHp > this.hp) this.hp = stats.maxHp;
    this.scene.events.emit(EVENTS.PLAYER_HP_CHANGE, this.hp);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.dashSystem.update(delta, body);

    // WASD movement (only when not dashing)
    if (!this.dashSystem.isDashing) {
      const SPEED = 160;
      let vx = 0, vy = 0;
      if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -SPEED;
      else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = SPEED;
      if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -SPEED;
      else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = SPEED;
      body.setVelocity(vx, vy);

      if (vx === 0 && vy === 0) {
        this.stillTimer += delta;
        if (this.stillTimer >= STILL_TIMEOUT) {
          this.isVulnerable = true;
        }
      } else {
        this.stillTimer = 0;
        this.isVulnerable = false;
      }
    }

    // Sync visual rectangle
    const gfx = (this as unknown as { _gfx: Phaser.GameObjects.Rectangle })._gfx;
    if (gfx) { gfx.x = this.x; gfx.y = this.y; }

    // Tint red when vulnerable
    if (gfx) gfx.setFillStyle(this.isVulnerable ? 0xff4444 : 0x00ffff);
  }

  destroy(fromScene?: boolean): void {
    const gfx = (this as unknown as { _gfx: Phaser.GameObjects.Rectangle })._gfx;
    gfx?.destroy();
    this.afterimages.forEach(a => a.destroy());
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 5.3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5.4: Commit**

```bash
git add src/game/entities/Player.ts src/game/systems/DashSystem.ts
git commit -m "feat: add Player entity and DashSystem"
```

---

## Task 6: Enemy Base + Grunt

**Files:**
- Create: `src/game/entities/enemies/Enemy.ts`
- Create: `src/game/entities/enemies/Grunt.ts`

- [ ] **Step 6.1: Create Enemy base class**

Create `src/game/entities/enemies/Enemy.ts`:
```ts
import Phaser from 'phaser';
import { EnemyType } from '../../types';

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  abstract readonly type: EnemyType;
  hp: number;
  protected maxHp: number;
  protected gfx!: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, hp: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.maxHp = hp;
    this.hp = hp;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 20);
    this.createGraphics();
  }

  protected abstract createGraphics(): void;

  takeDamage(amount: number): void {
    this.hp -= amount;
  }

  get isDead(): boolean { return this.hp <= 0; }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.gfx) { this.gfx.x = this.x; this.gfx.y = this.y; }
    this.aiUpdate(time, delta);
  }

  protected abstract aiUpdate(time: number, delta: number): void;

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 6.2: Create Grunt**

Create `src/game/entities/enemies/Grunt.ts`:
```ts
import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyType } from '../../types';

export class Grunt extends Enemy {
  readonly type = EnemyType.Grunt;
  private target: Phaser.GameObjects.GameObject & { x: number; y: number } | null = null;
  private readonly SPEED = 80;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 2);
  }

  protected createGraphics(): void {
    this.gfx = this.scene.add.rectangle(this.x, this.y, 18, 18, 0xff6600);
  }

  setTarget(target: Phaser.GameObjects.GameObject & { x: number; y: number }): void {
    this.target = target;
  }

  protected aiUpdate(_time: number, _delta: number): void {
    if (!this.target || this.isDead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    body.setVelocity(Math.cos(angle) * this.SPEED, Math.sin(angle) * this.SPEED);
  }
}
```

- [ ] **Step 6.3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6.4: Commit**

```bash
git add src/game/entities/enemies/Enemy.ts src/game/entities/enemies/Grunt.ts
git commit -m "feat: add Enemy base class and Grunt"
```

---

## Task 7: Environment Objects + EnvironmentSystem

**Files:**
- Create: `src/game/entities/environment/Barrel.ts`
- Create: `src/game/entities/environment/Boulder.ts`
- Create: `src/game/entities/environment/CrackedWall.ts`
- Create: `src/game/systems/EnvironmentSystem.ts`

- [ ] **Step 7.1: Create Barrel**

Create `src/game/entities/environment/Barrel.ts`:
```ts
import Phaser from 'phaser';

export class Barrel extends Phaser.Physics.Arcade.Sprite {
  exploded = false;
  private gfx: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
    this.gfx = scene.add.rectangle(x, y, 18, 18, 0xff3300);
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(18, 18);
  }

  triggerExplosion(): void {
    if (this.exploded) return;
    this.exploded = true;
    this.gfx.destroy();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 50,
      onComplete: () => this.destroy(),
    });
  }

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 7.2: Create Boulder**

Create `src/game/entities/environment/Boulder.ts`:
```ts
import Phaser from 'phaser';

export class Boulder extends Phaser.Physics.Arcade.Sprite {
  launched = false;
  private gfx: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static until launched
    this.gfx = scene.add.ellipse(x, y, 20, 20, 0x888888);
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(20, 20);
  }

  launch(angle: number): void {
    if (this.launched) return;
    this.launched = true;
    // Switch to dynamic body
    const scene = this.scene;
    scene.physics.world.remove(this.body as Phaser.Physics.Arcade.StaticBody);
    scene.physics.add.existing(this, false);
    const SPEED = 400;
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(
      Math.cos(angle) * SPEED,
      Math.sin(angle) * SPEED
    );
    // Stop after 400ms
    scene.time.delayedCall(400, () => {
      if (this.active) (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    });
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.gfx) { this.gfx.x = this.x; this.gfx.y = this.y; }
  }

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 7.3: Create CrackedWall**

Create `src/game/entities/environment/CrackedWall.ts`:
```ts
import Phaser from 'phaser';

export class CrackedWall extends Phaser.Physics.Arcade.Sprite {
  shattered = false;
  private gfx: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.gfx = scene.add.rectangle(x, y, 32, 32, 0x556677).setStrokeStyle(2, 0x334455);
    (this.body as Phaser.Physics.Arcade.StaticBody).setSize(32, 32);
  }

  shatter(): Array<{ x: number; y: number; angle: number }> {
    if (this.shattered) return [];
    this.shattered = true;
    this.gfx.destroy();
    this.destroy();
    // Return 8 debris directions
    return Array.from({ length: 8 }, (_, i) => ({
      x: this.x,
      y: this.y,
      angle: (i * Math.PI * 2) / 8,
    }));
  }

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 7.4: Create EnvironmentSystem**

Create `src/game/systems/EnvironmentSystem.ts`:
```ts
import Phaser from 'phaser';
import { Barrel } from '../entities/environment/Barrel';
import { Enemy } from '../entities/enemies/Enemy';
import { PlayerStats, EVENTS } from '../types';

export class EnvironmentSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private stats: PlayerStats
  ) {}

  updateStats(stats: PlayerStats): void {
    this.stats = stats;
  }

  /**
   * Trigger a barrel explosion at (x, y).
   * Damages all enemies within radius.
   * Chains to other barrels within radius.
   */
  explodeAt(
    x: number,
    y: number,
    barrels: Phaser.GameObjects.Group,
    enemies: Phaser.GameObjects.Group,
    depth = 0
  ): void {
    const radius = 80 * this.stats.explosionRadius;

    // Flash effect
    const circle = this.scene.add.circle(x, y, radius, 0xff6600, 0.4);
    this.scene.tweens.add({
      targets: circle,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      onComplete: () => circle.destroy(),
    });

    this.scene.cameras.main.shake(150, 0.008);
    this.scene.events.emit(EVENTS.EXPLOSION, { x, y, radius });

    // Damage enemies in radius
    enemies.getChildren().forEach(obj => {
      const enemy = obj as Enemy;
      if (!enemy.active) return;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist <= radius) {
        enemy.takeDamage(1);
        if (enemy.isDead) {
          this.scene.events.emit(EVENTS.ENEMY_KILLED, enemy);
        }
      }
    });

    // Chain to other barrels (max depth 4)
    if (depth < 4) {
      barrels.getChildren().forEach(obj => {
        const barrel = obj as Barrel;
        if (!barrel.active || barrel.exploded) return;
        const dist = Phaser.Math.Distance.Between(x, y, barrel.x, barrel.y);
        if (dist <= radius) {
          barrel.triggerExplosion();
          this.scene.time.delayedCall(80, () => {
            this.explodeAt(barrel.x, barrel.y, barrels, enemies, depth + 1);
          });
        }
      });
    }
  }

  /**
   * Spawn debris particles moving in given angles.
   * Each debris damages enemies it hits (handled by CollisionHandler).
   */
  spawnDebris(
    x: number,
    y: number,
    angles: number[]
  ): Phaser.GameObjects.Rectangle[] {
    return angles.map(angle => {
      const debris = this.scene.add.rectangle(x, y, 8, 8, 0x888888);
      this.scene.tweens.add({
        targets: debris,
        x: x + Math.cos(angle) * 80,
        y: y + Math.sin(angle) * 80,
        alpha: 0,
        duration: 250,
        onComplete: () => debris.destroy(),
      });
      return debris;
    });
  }
}
```

- [ ] **Step 7.5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7.6: Commit**

```bash
git add src/game/entities/environment/ src/game/systems/EnvironmentSystem.ts
git commit -m "feat: add Barrel, Boulder, CrackedWall, EnvironmentSystem"
```

---

## Task 8: Shielder, Bomber, Turret

**Files:**
- Create: `src/game/entities/enemies/Shielder.ts`
- Create: `src/game/entities/enemies/Bomber.ts`
- Create: `src/game/entities/enemies/Turret.ts`

> Can run **parallel** with Task 7 after Task 6 completes.

- [ ] **Step 8.1: Create Shielder**

Create `src/game/entities/enemies/Shielder.ts`:
```ts
import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyType } from '../../types';

export class Shielder extends Enemy {
  readonly type = EnemyType.Shielder;
  private target: { x: number; y: number } | null = null;
  faceAngle = 0; // radians, angle shielder faces (toward player)

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 3);
  }

  protected createGraphics(): void {
    this.gfx = this.scene.add.rectangle(this.x, this.y, 18, 18, 0x0044ff);
    // Shield indicator (small yellow rectangle on front)
  }

  setTarget(target: { x: number; y: number }): void {
    this.target = target;
  }

  /** Returns true if the incoming dash is hitting the shielded front */
  isBlockingDash(fromX: number, fromY: number): boolean {
    if (!this.target) return false;
    // Front = direction toward player
    const toPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const incomingAngle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(toPlayer - incomingAngle));
    return diff < Math.PI / 2; // within 90° arc = blocked
  }

  protected aiUpdate(_time: number, _delta: number): void {
    if (!this.target) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.faceAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    // Move slowly toward player
    const SPEED = 50;
    body.setVelocity(Math.cos(this.faceAngle) * SPEED, Math.sin(this.faceAngle) * SPEED);
  }
}
```

- [ ] **Step 8.2: Create Bomber**

Create `src/game/entities/enemies/Bomber.ts`:
```ts
import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyType, EVENTS } from '../../types';

export class Bomber extends Enemy {
  readonly type = EnemyType.Bomber;
  private target: { x: number; y: number } | null = null;
  private detonating = false;
  private fuseTimer = 0;
  private readonly FUSE_TIME = 1500; // ms after reaching player
  private readonly TRIGGER_RANGE = 40;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 1);
  }

  protected createGraphics(): void {
    this.gfx = this.scene.add.rectangle(this.x, this.y, 20, 20, 0xff0066);
  }

  setTarget(target: { x: number; y: number }): void {
    this.target = target;
  }

  protected aiUpdate(_time: number, delta: number): void {
    if (!this.target || this.isDead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

    if (!this.detonating) {
      const SPEED = 120;
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
      body.setVelocity(Math.cos(angle) * SPEED, Math.sin(angle) * SPEED);
      if (dist <= this.TRIGGER_RANGE) {
        this.detonating = true;
        body.setVelocity(0, 0);
        this.gfx.setFillStyle(0xffffff); // flash white
      }
    } else {
      this.fuseTimer += delta;
      // Blink faster as timer increases
      const blink = Math.floor(this.fuseTimer / 150) % 2 === 0;
      this.gfx.setFillStyle(blink ? 0xffffff : 0xff0066);
      if (this.fuseTimer >= this.FUSE_TIME) {
        this.scene.events.emit(EVENTS.EXPLOSION, { x: this.x, y: this.y, radius: 60 });
        this.hp = 0;
      }
    }
  }
}
```

- [ ] **Step 8.3: Create Turret**

Create `src/game/entities/enemies/Turret.ts`:
```ts
import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { EnemyType } from '../../types';

export class Turret extends Enemy {
  readonly type = EnemyType.Turret;
  private target: { x: number; y: number } | null = null;
  private fireTimer = 0;
  private readonly FIRE_INTERVAL = 2000; // ms between shots
  bullets: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 4);
  }

  protected createGraphics(): void {
    this.gfx = this.scene.add.rectangle(this.x, this.y, 22, 22, 0xaa00aa);
  }

  setTarget(target: { x: number; y: number }): void {
    this.target = target;
  }

  protected aiUpdate(_time: number, delta: number): void {
    if (!this.target || this.isDead) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0); // stationary

    this.fireTimer += delta;
    if (this.fireTimer >= this.FIRE_INTERVAL) {
      this.fireTimer = 0;
      this.fireBullet();
    }
    // Update bullets
    this.bullets = this.bullets.filter(b => b.active);
  }

  private fireBullet(): void {
    if (!this.target) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const bullet = this.scene.add.circle(this.x, this.y, 5, 0xff00ff);
    const SPEED = 200;
    const vx = Math.cos(angle) * SPEED;
    const vy = Math.sin(angle) * SPEED;
    this.bullets.push(bullet);
    this.scene.tweens.add({
      targets: bullet,
      x: bullet.x + vx * 2,
      y: bullet.y + vy * 2,
      duration: 2000,
      onComplete: () => bullet.destroy(),
    });
    // Store velocity on bullet for collision checks
    (bullet as unknown as { vx: number; vy: number }).vx = vx;
    (bullet as unknown as { vx: number; vy: number }).vy = vy;
  }

  destroy(fromScene?: boolean): void {
    this.bullets.forEach(b => b.destroy());
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 8.4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8.5: Commit**

```bash
git add src/game/entities/enemies/Shielder.ts src/game/entities/enemies/Bomber.ts src/game/entities/enemies/Turret.ts
git commit -m "feat: add Shielder, Bomber, Turret enemies"
```

---

## Task 9: CollisionHandler + GameScene MVP

**Files:**
- Create: `src/game/systems/CollisionHandler.ts`
- Modify: `src/game/scenes/GameScene.ts`

> This is the first task that produces a **playable browser build**.

- [ ] **Step 9.1: Create CollisionHandler**

Create `src/game/systems/CollisionHandler.ts`:
```ts
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Shielder } from '../entities/enemies/Shielder';
import { Barrel } from '../entities/environment/Barrel';
import { Boulder } from '../entities/environment/Boulder';
import { CrackedWall } from '../entities/environment/CrackedWall';
import { EnvironmentSystem } from './EnvironmentSystem';
import { EVENTS } from '../types';

export class CollisionHandler {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly enemyGroup: Phaser.GameObjects.Group,
    private readonly barrelGroup: Phaser.GameObjects.Group,
    private readonly boulderGroup: Phaser.GameObjects.Group,
    private readonly crackedWallGroup: Phaser.GameObjects.Group,
    private readonly envSystem: EnvironmentSystem
  ) {}

  /** Wire all overlaps. Call once after scene setup. */
  wire(): void {
    // Dash into enemies
    this.scene.physics.add.overlap(
      this.player,
      this.enemyGroup,
      (_player, enemyObj) => {
        if (!this.player.dashSystem.isDashing) return;
        const enemy = enemyObj as Enemy;
        if (enemy instanceof Shielder && enemy.isBlockingDash(this.player.x, this.player.y)) {
          // Bounced off shield — push player back
          const body = this.player.body as Phaser.Physics.Arcade.Body;
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          body.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
          return;
        }
        enemy.takeDamage(1);
        this.scene.cameras.main.shake(80, 0.006);
        if (enemy.isDead) {
          this.scene.events.emit(EVENTS.ENEMY_KILLED, enemy);
          enemy.destroy();
        }
      }
    );

    // Dash into barrels
    this.scene.physics.add.overlap(
      this.player,
      this.barrelGroup,
      (_player, barrelObj) => {
        if (!this.player.dashSystem.isDashing) return;
        const barrel = barrelObj as Barrel;
        if (!barrel.exploded) {
          barrel.triggerExplosion();
          this.envSystem.explodeAt(
            barrel.x, barrel.y,
            this.barrelGroup, this.enemyGroup
          );
        }
      }
    );

    // Dash into boulders
    this.scene.physics.add.overlap(
      this.player,
      this.boulderGroup,
      (_player, boulderObj) => {
        if (!this.player.dashSystem.isDashing) return;
        const boulder = boulderObj as Boulder;
        if (!boulder.launched) {
          const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, boulder.x, boulder.y);
          boulder.launch(angle);
        }
      }
    );

    // Dash into cracked walls
    this.scene.physics.add.overlap(
      this.player,
      this.crackedWallGroup,
      (_player, wallObj) => {
        if (!this.player.dashSystem.isDashing) return;
        const wall = wallObj as CrackedWall;
        const debris = wall.shatter();
        this.envSystem.spawnDebris(wall.x, wall.y, debris.map(d => d.angle));
        this.scene.cameras.main.shake(100, 0.005);
      }
    );

    // Enemies touching player (non-dash = take damage)
    this.scene.physics.add.overlap(
      this.player,
      this.enemyGroup,
      (_player, enemyObj) => {
        if (this.player.dashSystem.isDashing) return;
        const enemy = enemyObj as Enemy;
        if (enemy.active && !enemy.isDead) {
          this.player.takeDamage(1);
        }
      }
    );
  }

  /** Check Turret bullets against player each frame. Call from GameScene.update(). */
  checkTurretBullets(turrets: Phaser.GameObjects.Group): void {
    if (this.player.dashSystem.isDashing) return; // i-frames
    turrets.getChildren().forEach(obj => {
      const turret = obj as import('../entities/enemies/Turret').Turret;
      if (!turret.active) return;
      turret.bullets.forEach(bullet => {
        if (!bullet.active) return;
        const dist = Phaser.Math.Distance.Between(
          bullet.x, bullet.y, this.player.x, this.player.y
        );
        if (dist < 16) {
          bullet.destroy();
          this.player.takeDamage(1);
        }
      });
    });
  }
}
```

- [ ] **Step 9.2: Rewrite GameScene with MVP**

Replace `src/game/scenes/GameScene.ts`:
```ts
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Grunt } from '../entities/enemies/Grunt';
import { Barrel } from '../entities/environment/Barrel';
import { Boulder } from '../entities/environment/Boulder';
import { CrackedWall } from '../entities/environment/CrackedWall';
import { ComboSystem } from '../systems/ComboSystem';
import { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { CollisionHandler } from '../systems/CollisionHandler';
import { EVENTS } from '../types';

const TILE_SIZE = 48;
const COLS = 16;
const ROWS = 12;

export class GameScene extends Phaser.Scene {
  player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private barrels!: Phaser.GameObjects.Group;
  private boulders!: Phaser.GameObjects.Group;
  private crackedWalls!: Phaser.GameObjects.Group;
  private comboSystem!: ComboSystem;
  private envSystem!: EnvironmentSystem;
  private collisionHandler!: CollisionHandler;

  constructor() { super({ key: 'Game' }); }

  create(): void {
    const W = COLS * TILE_SIZE;
    const H = ROWS * TILE_SIZE;
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBounds(0, 0, W, H);

    // Draw floor
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e);

    // Draw walls (border)
    this.drawBorderWalls(W, H);

    // Groups
    this.enemies = this.add.group();
    this.barrels = this.add.group();
    this.boulders = this.add.group();
    this.crackedWalls = this.add.group();

    // Player
    this.player = new Player(this, W / 2, H / 2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Spawn some enemies + objects for MVP test
    this.spawnTestRoom();

    // Systems
    this.comboSystem = new ComboSystem({
      comboWindow: this.player.stats.comboWindow,
      comboMultiplierCap: this.player.stats.comboMultiplierCap,
    });
    this.envSystem = new EnvironmentSystem(this, this.player.stats);

    // Wiring
    this.collisionHandler = new CollisionHandler(
      this, this.player,
      this.enemies, this.barrels, this.boulders, this.crackedWalls,
      this.envSystem
    );
    this.collisionHandler.wire();

    // Events
    this.events.on(EVENTS.ENEMY_KILLED, () => {
      this.comboSystem.registerKill();
    });
    // Forward ComboSystem events to scene EventEmitter (UIScene listens here)
    this.comboSystem.on('combo-update', (mult: number) => {
      this.events.emit(EVENTS.COMBO_UPDATE, mult);
    });
    this.comboSystem.on('combo-reset', () => {
      this.events.emit(EVENTS.COMBO_RESET);
    });
    this.events.on(EVENTS.PLAYER_DIED, () => this.gameOver());

    // Launch UI
    this.scene.launch('UI', { gameScene: this });
  }

  private drawBorderWalls(W: number, H: number): void {
    const color = 0x334455;
    this.add.rectangle(W / 2, TILE_SIZE / 2, W, TILE_SIZE, color);        // top
    this.add.rectangle(W / 2, H - TILE_SIZE / 2, W, TILE_SIZE, color);    // bottom
    this.add.rectangle(TILE_SIZE / 2, H / 2, TILE_SIZE, H, color);        // left
    this.add.rectangle(W - TILE_SIZE / 2, H / 2, TILE_SIZE, H, color);    // right
  }

  private spawnTestRoom(): void {
    const W = COLS * TILE_SIZE;
    const H = ROWS * TILE_SIZE;

    // Grunts
    const grunt1 = new Grunt(this, 150, 150);
    grunt1.setTarget(this.player);
    this.enemies.add(grunt1);

    const grunt2 = new Grunt(this, W - 150, H - 150);
    grunt2.setTarget(this.player);
    this.enemies.add(grunt2);

    const grunt3 = new Grunt(this, W - 150, 150);
    grunt3.setTarget(this.player);
    this.enemies.add(grunt3);

    // Barrels
    const barrel1 = new Barrel(this, 200, H / 2);
    this.barrels.add(barrel1);
    const barrel2 = new Barrel(this, 260, H / 2);
    this.barrels.add(barrel2);

    // Boulder
    const boulder = new Boulder(this, W / 2, 150);
    this.boulders.add(boulder);

    // Cracked wall
    const wall = new CrackedWall(this, W / 2 + 100, H / 2);
    this.crackedWalls.add(wall);
  }

  update(_time: number, delta: number): void {
    this.comboSystem.update();
    // Check Turret bullet collisions
    this.collisionHandler.checkTurretBullets(this.enemies);
    // Clean up dead enemies
    this.enemies.getChildren().forEach(e => {
      const enemy = e as { isDead?: boolean; active: boolean };
      if (enemy.isDead && enemy.active) {
        (e as Phaser.GameObjects.GameObject).destroy();
      }
    });
  }

  private gameOver(): void {
    this.scene.stop('UI');
    this.scene.start('Menu');
  }
}
```

- [ ] **Step 9.3: Update config.ts to include UpgradeScene placeholder**

In `src/game/config.ts`, add the import and scene placeholder (we'll replace with real UpgradeScene in Task 13):
```ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: import.meta.env.DEV,
      },
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, UIScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
  return new Phaser.Game(config);
}
```
> Note: gravity changed from `{ x: 0, y: 300 }` to `{ x: 0, y: 0 }` — this is top-down, no gravity needed.

- [ ] **Step 9.4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9.5: Browser smoke test**

```bash
npm run dev
```
Open `http://localhost:5173`. Expected:
- Press SPACE on menu → enters game
- WASD moves player (cyan square)
- Click anywhere → player dashes toward cursor
- Dashing into orange squares (Grunts) kills them
- Dashing into red rectangle (Barrel) → orange explosion flash
- Two barrels chain-explode
- Grey circle (Boulder) flies when dashed into
- Striped rectangle (CrackedWall) shatters into particles
- Screen shakes on impact

- [ ] **Step 9.6: Commit**

```bash
git add src/game/systems/CollisionHandler.ts src/game/scenes/GameScene.ts src/game/config.ts
git commit -m "feat: GameScene MVP — dash combat, barrel chains, boulder, cracked wall"
```

---

## Task 10: UIScene Rewrite (Combo + HP)

**Files:**
- Modify: `src/game/scenes/UIScene.ts`

- [ ] **Step 10.1: Rewrite UIScene**

Replace `src/game/scenes/UIScene.ts`:
```ts
import Phaser from 'phaser';
import { EVENTS } from '../types';

const MAX_HP = 3;

export class UIScene extends Phaser.Scene {
  private comboText!: Phaser.GameObjects.Text;
  private comboTimer!: Phaser.GameObjects.Graphics;
  private hpIcons: Phaser.GameObjects.Rectangle[] = [];
  private floorText!: Phaser.GameObjects.Text;
  private comboMult = 1;
  private comboBarWidth = 0;
  private readonly BAR_MAX_WIDTH = 120;

  constructor() { super({ key: 'UI' }); }

  create({ gameScene }: { gameScene: Phaser.Scene }): void {
    // HP icons (top-left)
    for (let i = 0; i < MAX_HP; i++) {
      const icon = this.add.rectangle(20 + i * 28, 20, 20, 20, 0xff4444);
      this.hpIcons.push(icon);
    }

    // Combo display (top-center)
    this.comboText = this.add
      .text(400, 16, 'x1', { fontSize: '24px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5, 0);

    // Combo bar (below combo text)
    this.comboTimer = this.add.graphics();
    this.drawComboBar(0);

    // Floor indicator (top-right)
    this.floorText = this.add
      .text(780, 16, 'Floor 1', { fontSize: '16px', color: '#aaaaaa' })
      .setOrigin(1, 0);

    // Listen for game events
    gameScene.events.on(EVENTS.COMBO_UPDATE, (mult: number) => {
      this.comboMult = mult;
      this.comboText.setText(`x${mult}`);
      this.comboText.setColor(mult >= 4 ? '#ffaa00' : mult >= 2 ? '#00ff99' : '#ffffff');
      this.comboBarWidth = this.BAR_MAX_WIDTH;
      this.drawComboBar(1.0);
      // Scale punch on text
      this.tweens.add({
        targets: this.comboText,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 80,
        yoyo: true,
      });
    });

    gameScene.events.on(EVENTS.COMBO_RESET, () => {
      this.comboMult = 1;
      this.comboText.setText('x1').setColor('#ffffff');
      this.comboBarWidth = 0;
      this.drawComboBar(0);
    });

    gameScene.events.on(EVENTS.PLAYER_HP_CHANGE, (hp: number) => {
      this.updateHpIcons(hp);
    });

    gameScene.events.on('floor-update', (floor: number) => {
      this.floorText.setText(`Floor ${floor}`);
    });
  }

  private drawComboBar(fraction: number): void {
    this.comboTimer.clear();
    if (fraction <= 0) return;
    this.comboTimer.fillStyle(0x00ff99, 0.8);
    this.comboTimer.fillRect(
      400 - this.BAR_MAX_WIDTH / 2,
      44,
      this.BAR_MAX_WIDTH * fraction,
      4
    );
  }

  private updateHpIcons(hp: number): void {
    this.hpIcons.forEach((icon, i) => {
      icon.setFillStyle(i < hp ? 0xff4444 : 0x444444);
    });
  }

  update(_time: number, delta: number): void {
    // Drain combo bar
    if (this.comboBarWidth > 0) {
      this.comboBarWidth = Math.max(0, this.comboBarWidth - (this.BAR_MAX_WIDTH / 1500) * delta);
      this.drawComboBar(this.comboBarWidth / this.BAR_MAX_WIDTH);
    }
  }
}
```

- [ ] **Step 10.2: TypeScript check + browser test**

```bash
npx tsc --noEmit
npm run dev
```
Expected:
- Top-left: 3 red HP squares
- Top-center: "x1" combo counter
- Green bar below combo drains over 1.5s after a kill
- Counter increments and turns orange at x4+
- HP icon goes grey when player takes damage

- [ ] **Step 10.3: Commit**

```bash
git add src/game/scenes/UIScene.ts
git commit -m "feat: UIScene with combo meter and HP display"
```

---

## Task 11: UpgradeScene + Room-to-Room Flow

**Files:**
- Create: `src/game/scenes/UpgradeScene.ts`
- Modify: `src/game/config.ts`
- Modify: `src/game/scenes/GameScene.ts`

- [ ] **Step 11.1: Create UpgradeScene**

Create `src/game/scenes/UpgradeScene.ts`:
```ts
import Phaser from 'phaser';
import { UpgradeDef, PlayerStats, EVENTS } from '../types';
import { ALL_UPGRADES } from '../data/upgrades';
import { UpgradeSystem } from '../systems/UpgradeSystem';

export class UpgradeScene extends Phaser.Scene {
  constructor() { super({ key: 'Upgrade' }); }

  create({ stats, upgradeSystem, onChosen }: {
    stats: PlayerStats;
    upgradeSystem: UpgradeSystem;
    onChosen: (newStats: PlayerStats) => void;
  }): void {
    const { width, height } = this.scale;

    // Dim overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    this.add.text(width / 2, 60, 'CHOOSE UPGRADE', {
      fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const choices = upgradeSystem.rollChoices(3);
    const cardW = 200, cardH = 160, gap = 24;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    const startX = (width - totalW) / 2;

    choices.forEach((upgrade: UpgradeDef, i: number) => {
      const cx = startX + i * (cardW + gap) + cardW / 2;
      const cy = height / 2;

      const bg = this.add.rectangle(cx, cy, cardW, cardH, 0x223344)
        .setStrokeStyle(2, 0x00ff99)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx, cy - 40, upgrade.name, {
        fontSize: '16px', color: '#00ff99', fontStyle: 'bold',
        wordWrap: { width: cardW - 16 },
      }).setOrigin(0.5);

      this.add.text(cx, cy, upgrade.description, {
        fontSize: '13px', color: '#cccccc',
        wordWrap: { width: cardW - 16 },
        align: 'center',
      }).setOrigin(0.5);

      this.add.text(cx, cy + 50, upgrade.category.toUpperCase(), {
        fontSize: '11px', color: '#556677',
      }).setOrigin(0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x334455));
      bg.on('pointerout', () => bg.setFillStyle(0x223344));
      bg.on('pointerdown', () => {
        const newStats = upgradeSystem.applyUpgrade(stats, upgrade);
        this.scene.events.emit(EVENTS.UPGRADE_CHOSEN, upgrade);
        this.scene.stop();
        onChosen(newStats);
      });
    });
  }
}
```

- [ ] **Step 11.2: Add UpgradeScene to config.ts**

In `src/game/config.ts`, add import and scene:
```ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { UpgradeScene } from './scenes/UpgradeScene';

export function createGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent,
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: import.meta.env.DEV },
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, UIScene, UpgradeScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  };
  return new Phaser.Game(config);
}
```

- [ ] **Step 11.3: Add room-clear + upgrade trigger to GameScene**

Add these fields and methods to `GameScene` class in `src/game/scenes/GameScene.ts`:

Add imports at top:
```ts
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { ALL_UPGRADES } from '../data/upgrades';
import { RoomGenerator } from '../systems/RoomGenerator';
import { Shielder } from '../entities/enemies/Shielder';
import { Bomber } from '../entities/enemies/Bomber';
import { Turret } from '../entities/enemies/Turret';
import { RoomType } from '../types';
```

Add fields to class:
```ts
private upgradeSystem!: UpgradeSystem;
private currentFloor = 1;
private roomsCleared = 0;
private roomCleared = false;
private roomGen!: RoomGenerator;
```

In `create()`, after existing system setup:
```ts
this.upgradeSystem = new UpgradeSystem(ALL_UPGRADES);
this.roomGen = new RoomGenerator(this.currentFloor);
```

Add enemy kill listener update in `create()`:
```ts
this.events.on(EVENTS.ENEMY_KILLED, (_enemy: unknown) => {
  this.comboSystem.registerKill();
  this.checkRoomClear();
});
```

Add new methods:
```ts
private checkRoomClear(): void {
  if (this.roomCleared) return;
  const alive = this.enemies.getChildren().filter(e => (e as Enemy).active && !(e as Enemy).isDead);
  if (alive.length === 0) {
    this.roomCleared = true;
    this.roomsCleared++;
    this.events.emit(EVENTS.ROOM_CLEARED);
    this.time.delayedCall(800, () => this.showUpgradeScreen());
  }
}

private showUpgradeScreen(): void {
  this.scene.pause();
  this.scene.launch('Upgrade', {
    stats: this.player.stats,
    upgradeSystem: this.upgradeSystem,
    onChosen: (newStats: PlayerStats) => {
      this.player.applyStats(newStats);
      this.envSystem.updateStats(newStats);
      this.scene.resume();
      this.loadNextRoom();
    },
  });
}

private loadNextRoom(): void {
  this.roomCleared = false;
  if (this.roomsCleared % 5 === 0) this.currentFloor++;
  this.events.emit('floor-update', this.currentFloor);
  this.roomGen = new RoomGenerator(this.currentFloor);

  // Clear current entities
  this.enemies.clear(true, true);
  this.barrels.clear(true, true);
  this.boulders.clear(true, true);
  this.crackedWalls.clear(true, true);

  // Spawn new room from generator
  const config = this.roomGen.generate(RoomType.Combat);
  this.spawnRoomFromConfig(config);
}

private spawnRoomFromConfig(config: RoomConfig): void {
  const { enemySpawns } = config;
  enemySpawns.forEach(spawn => {
    const px = (spawn.col + 0.5) * TILE_SIZE;
    const py = (spawn.row + 0.5) * TILE_SIZE;
    let enemy: Enemy;
    switch (spawn.type) {
      case EnemyType.Shielder: enemy = new Shielder(this, px, py); break;
      case EnemyType.Bomber:   enemy = new Bomber(this, px, py); break;
      case EnemyType.Turret:   enemy = new Turret(this, px, py); break;
      default:                 enemy = new Grunt(this, px, py);
    }
    (enemy as Grunt | Shielder | Bomber | Turret).setTarget(this.player);
    this.enemies.add(enemy);
  });
}
```

Add missing imports to `GameScene.ts`:
```ts
import { RoomConfig, EnemyType, PlayerStats, RoomType } from '../types';
import { Enemy } from '../entities/enemies/Enemy';
import { Shielder } from '../entities/enemies/Shielder';
import { Bomber } from '../entities/enemies/Bomber';
import { Turret } from '../entities/enemies/Turret';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { ALL_UPGRADES } from '../data/upgrades';
import { RoomGenerator } from '../systems/RoomGenerator';
```

- [ ] **Step 11.4: TypeScript check + browser test**

```bash
npx tsc --noEmit
npm run dev
```
Expected:
- Kill all 3 Grunts → 800ms later upgrade screen slides up
- Click an upgrade card → screen dismisses, next room spawns
- Floor counter increments every 5 rooms

- [ ] **Step 11.5: Commit**

```bash
git add src/game/scenes/UpgradeScene.ts src/game/config.ts src/game/scenes/GameScene.ts
git commit -m "feat: UpgradeScene overlay and room-to-room progression"
```

---

## Task 12: JuiceSystem (Polish Effects)

**Files:**
- Create: `src/game/systems/JuiceSystem.ts`
- Modify: `src/game/scenes/GameScene.ts`

> Can run **parallel** with Task 11.

- [ ] **Step 12.1: Create JuiceSystem**

Create `src/game/systems/JuiceSystem.ts`:
```ts
import Phaser from 'phaser';
import { EVENTS } from '../types';

export class JuiceSystem {
  private readonly scene: Phaser.Scene;
  private slowmoActive = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.wireEvents();
  }

  private wireEvents(): void {
    // Slow-mo flash at combo x3+
    this.scene.events.on(EVENTS.COMBO_UPDATE, (mult: number) => {
      if (mult >= 3 && !this.slowmoActive) {
        this.triggerSlowmo();
      }
    });
  }

  /** Spawn kill particles at position */
  spawnKillParticles(x: number, y: number, color = 0xffffff): void {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = Phaser.Math.Between(20, 60);
      const particle = this.scene.add.circle(x, y, Phaser.Math.Between(2, 5), color);
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: Phaser.Math.Between(150, 300),
        onComplete: () => particle.destroy(),
      });
    }
  }

  /** 2-3 frame slow-motion flash */
  triggerSlowmo(): void {
    if (this.slowmoActive) return;
    this.slowmoActive = true;
    this.scene.physics.world.timeScale = 0.15;
    this.scene.time.timeScale = 0.15;

    this.scene.time.delayedCall(80, () => {
      this.scene.physics.world.timeScale = 1.0;
      this.scene.time.timeScale = 1.0;
      this.slowmoActive = false;
    });
  }

  /** Flash the screen white briefly */
  screenFlash(alpha = 0.3, duration = 80): void {
    const { width, height } = this.scene.scale;
    const flash = this.scene.add
      .rectangle(width / 2, height / 2, width, height, 0xffffff, alpha)
      .setScrollFactor(0)
      .setDepth(100);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      onComplete: () => flash.destroy(),
    });
  }
}
```

- [ ] **Step 12.2: Wire JuiceSystem into GameScene**

In `GameScene.create()`, after systems setup, add:
```ts
import { JuiceSystem } from '../systems/JuiceSystem';
// ...
this.juiceSystem = new JuiceSystem(this);
```

Add field: `private juiceSystem!: JuiceSystem;`

Update enemy kill event handler:
```ts
this.events.on(EVENTS.ENEMY_KILLED, (enemy: Enemy) => {
  this.comboSystem.registerKill();
  this.juiceSystem.spawnKillParticles(enemy.x, enemy.y, 0xff6600);
  this.checkRoomClear();
});
```

- [ ] **Step 12.3: TypeScript check + browser test**

```bash
npx tsc --noEmit
npm run dev
```
Expected:
- Killing an enemy → orange particle burst
- Killing 3 enemies quickly → brief slow-mo effect (world slows, then snaps back)
- Barrel explosion → screen shakes (already wired in EnvironmentSystem)

- [ ] **Step 12.4: Commit**

```bash
git add src/game/systems/JuiceSystem.ts src/game/scenes/GameScene.ts
git commit -m "feat: JuiceSystem — kill particles and combo slow-mo"
```

---

## Task 13: MenuScene Polish + Game Over Screen

**Files:**
- Modify: `src/game/scenes/MenuScene.ts`
- Modify: `src/game/scenes/PreloadScene.ts`

- [ ] **Step 13.1: Update MenuScene**

Replace `src/game/scenes/MenuScene.ts`:
```ts
import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'Menu' }); }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    this.add.text(width / 2, height / 2 - 100, 'CRASH', {
      fontSize: '72px', color: '#00ffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 40, 'MOVE TO SURVIVE. DASH TO KILL.', {
      fontSize: '16px', color: '#556677', letterSpacing: 3,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 20, 'WASD / Arrows — Move\nClick — Dash', {
      fontSize: '14px', color: '#888888', align: 'center',
    }).setOrigin(0.5);

    const startText = this.add.text(width / 2, height / 2 + 100, '[ PRESS SPACE ]', {
      fontSize: '20px', color: '#00ff99', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.tweens.add({ targets: startText, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('Game'));
    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
```

- [ ] **Step 13.2: Update PreloadScene**

Replace `src/game/scenes/PreloadScene.ts`:
```ts
import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() { super({ key: 'Preload' }); }

  preload(): void {
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2, height / 2, 0, 8, 0x00ff99);
    this.add.rectangle(width / 2, height / 2, 304, 12).setStrokeStyle(1, 0x334455);
    this.add.text(width / 2, height / 2 - 30, 'CRASH', {
      fontSize: '32px', color: '#00ffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.load.on('progress', (v: number) => { bar.width = 300 * v; });

    // No external assets — all procedural. Dummy load to show bar.
    // TODO: Add actual sprite/audio assets here before jam submission
  }

  create(): void { this.scene.start('Menu'); }
}
```

- [ ] **Step 13.3: TypeScript check + full flow test**

```bash
npx tsc --noEmit
npm run dev
```
Expected:
- Boot → loading bar → CRASH menu
- SPACE → game starts
- Dying → back to menu

- [ ] **Step 13.4: Commit**

```bash
git add src/game/scenes/MenuScene.ts src/game/scenes/PreloadScene.ts
git commit -m "feat: CRASH title screen and preload scene polish"
```

---

## Task 14: RoomGenerator Full Integration

**Files:**
- Modify: `src/game/scenes/GameScene.ts`

> Replace `spawnTestRoom()` with proper tilemap-rendered room from RoomGenerator.

- [ ] **Step 14.1: Add tile rendering to GameScene**

Add `buildRoomVisuals()` to `GameScene`:
```ts
private buildRoomVisuals(config: RoomConfig): void {
  const wallColor = 0x334455;
  const floorColor = 0x1a1a2e;
  // Draw floor
  this.add.rectangle(
    (COLS * TILE_SIZE) / 2, (ROWS * TILE_SIZE) / 2,
    COLS * TILE_SIZE, ROWS * TILE_SIZE, floorColor
  );
  // Draw walls and objects
  config.grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      const cx = (c + 0.5) * TILE_SIZE;
      const cy = (r + 0.5) * TILE_SIZE;
      if (cell.wall) {
        this.add.rectangle(cx, cy, TILE_SIZE, TILE_SIZE, wallColor);
        return;
      }
      if (cell.envObject) {
        switch (cell.envObject) {
          case EnvObjectType.Barrel: {
            const b = new Barrel(this, cx, cy);
            this.barrels.add(b);
            break;
          }
          case EnvObjectType.Boulder: {
            const bo = new Boulder(this, cx, cy);
            this.boulders.add(bo);
            break;
          }
          case EnvObjectType.CrackedWall: {
            const cw = new CrackedWall(this, cx, cy);
            this.crackedWalls.add(cw);
            break;
          }
        }
      }
    });
  });
}
```

Replace `spawnTestRoom()` call in `create()` with:
```ts
const firstRoom = this.roomGen.generate(RoomType.Combat);
this.buildRoomVisuals(firstRoom);
this.spawnRoomFromConfig(firstRoom);
```

Add `EnvObjectType` to the types import at top of `GameScene.ts`:
```ts
import { RoomConfig, EnemyType, EnvObjectType, PlayerStats, RoomType, EVENTS } from '../types';
```

Also update `loadNextRoom()` to call `buildRoomVisuals()` after clearing entities.

- [ ] **Step 14.2: TypeScript check + browser test**

```bash
npx tsc --noEmit
npm run dev
```
Expected:
- Room walls render from RoomGenerator templates
- Barrels, boulders, cracked walls appear per template
- Enemies spawn at correct positions
- After clearing room → upgrade → new room (different layout) generates

- [ ] **Step 14.3: Commit**

```bash
git add src/game/scenes/GameScene.ts
git commit -m "feat: integrate RoomGenerator into GameScene for proc-gen rooms"
```

---

## Task 15: Final Build + All Tests

- [ ] **Step 15.1: Run all unit tests**

```bash
npx vitest run
```
Expected: all tests pass (ComboSystem × 8, UpgradeSystem × 4, RoomGenerator × 6 = 18 total).

- [ ] **Step 15.2: TypeScript strict check**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 15.3: Production build**

```bash
npm run build
```
Expected: builds to `dist/` with no errors.

- [ ] **Step 15.4: Preview production build**

```bash
npm run preview
```
Open `http://localhost:4173`. Verify full game flow works in production build.

- [ ] **Step 15.5: Final commit**

```bash
git add -A
git commit -m "feat: CRASH game complete — roguelite with dash combat and proc-gen rooms"
```

---

## Scope Cut Reference

If running out of time, cut in this order (lowest priority first):

| Feature | Where to cut |
|---------|-------------|
| Electric Panel env object | Skip in RoomGenerator templates |
| Turret enemy | Remove from enemy weights |
| Boss room | Remove boss room logic from RoomGenerator |
| Meta-progression | Already not in plan — skip entirely |
| Bomber enemy | Simplify to Grunt with more HP |
| JuiceSystem slowmo | Comment out `triggerSlowmo()` call |

**Minimum shippable build:** Tasks 1–9 + Task 10 (UI) = core dash combat with barrels working + combo display. The game is playable and submittable at that point.
