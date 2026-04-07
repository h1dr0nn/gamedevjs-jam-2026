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
    combo.registerKill();
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
    combo.registerKill();
    expect(combo.getDashBoost()).toBeGreaterThan(1.0);
  });
});
