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
    apply: (s: PlayerStats) => s,
  },
];
