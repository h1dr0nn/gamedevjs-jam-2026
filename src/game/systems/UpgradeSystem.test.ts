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
