import type { ChipDef } from '../types';

export const CHIPS: ChipDef[] = [
  // ─── Core ────────────────────────────────────────────────────────
  { id: 'plating', name: 'Reinforced Plating', desc: '+2 Max HP', iconId: 1, rarity: 'common',
    apply: (s) => ({ ...s, maxHp: s.maxHp + 2, hp: s.hp + 2 }) },
  { id: 'servos', name: 'Overclocked Servos', desc: '+20% Move Speed', iconId: 3, rarity: 'common',
    apply: (s) => ({ ...s, moveSpeed: s.moveSpeed * 1.2 }) },
  { id: 'legs', name: 'Piston Legs', desc: '+15% Jump height', iconId: 5, rarity: 'common',
    apply: (s) => ({ ...s, jumpVelocity: s.jumpVelocity * 1.15 }) },
  { id: 'dashcap', name: 'Dash Capacitor', desc: '+1 Dash charge', iconId: 7, rarity: 'rare',
    apply: (s) => ({ ...s, dashCharges: s.dashCharges + 1 }) },
  { id: 'cooldash', name: 'Kinetic Cooler', desc: 'Dash CD −30%', iconId: 9, rarity: 'rare',
    apply: (s) => ({ ...s, dashCooldown: s.dashCooldown * 0.7 }) },
  { id: 'longdash', name: 'Reaction Thrusters', desc: 'Dash distance +40%', iconId: 11, rarity: 'rare',
    apply: (s) => ({ ...s, dashSpeed: s.dashSpeed * 1.4, dashDuration: s.dashDuration * 1.1 }) },

  // ─── Offense ─────────────────────────────────────────────────────
  { id: 'barrel', name: 'Heavy Barrel', desc: '+30% Damage', iconId: 13, rarity: 'common',
    apply: (s) => ({ ...s, attackDamage: Math.ceil(s.attackDamage * 1.3) }) },
  { id: 'trigger', name: 'Hair Trigger', desc: '−25% Attack cooldown', iconId: 15, rarity: 'rare',
    apply: (s) => ({ ...s, attackCooldown: s.attackCooldown * 0.75 }) },
  { id: 'longrange', name: 'Extended Mag', desc: '+25% Attack range', iconId: 17, rarity: 'common',
    apply: (s) => ({ ...s, attackRange: s.attackRange * 1.25 }) },
  { id: 'pierce', name: 'AP Rounds', desc: 'Shots pierce +1 enemy', iconId: 19, rarity: 'rare',
    apply: (s) => ({ ...s, pierce: s.pierce + 1 }) },
  { id: 'crit', name: 'Targeting Core', desc: '+15% Crit chance', iconId: 21, rarity: 'rare',
    apply: (s) => ({ ...s, critChance: s.critChance + 0.15 }) },

  // ─── Hazard ──────────────────────────────────────────────────────
  { id: 'envdmg', name: 'Hazard Sync', desc: 'Environmental kills deal +50% dmg', iconId: 23, rarity: 'rare',
    apply: (s) => ({ ...s, envDamageMultiplier: s.envDamageMultiplier + 0.5 }) },
  { id: 'hazrad', name: 'Blast Amplifier', desc: 'Hazard radius +30%', iconId: 25, rarity: 'rare',
    apply: (s) => ({ ...s, hazardRadiusMultiplier: s.hazardRadiusMultiplier * 1.3 }) },
  { id: 'gasmask', name: 'Filter Mask', desc: 'Immune to gas (all sources)', iconId: 27, rarity: 'epic',
    apply: (s) => ({ ...s, invulnerableToOwnGas: true }) },

  // ─── Chain ──────────────────────────────────────────────────────
  { id: 'chainwin', name: 'Combo Memory', desc: 'Chain window +40%', iconId: 29, rarity: 'common',
    apply: (s) => ({ ...s, chainWindow: s.chainWindow * 1.4 }) },
  { id: 'chaincap', name: 'Overclock Core', desc: 'Chain cap +5', iconId: 31, rarity: 'rare',
    apply: (s) => ({ ...s, chainCap: s.chainCap + 5 }) },

  // ─── Defense ─────────────────────────────────────────────────────
  { id: 'iframe', name: 'Phase Shield', desc: 'Longer i-frames after hit', iconId: 33, rarity: 'rare',
    apply: (s) => ({ ...s, iFrameDuration: s.iFrameDuration * 1.5 }) },
  { id: 'heal', name: 'Nano-Repair', desc: 'Full heal now', iconId: 35, rarity: 'rare',
    apply: (s) => ({ ...s, hp: s.maxHp }) },

  // ─── Epic ────────────────────────────────────────────────────────
  { id: 'berserker', name: 'Berserker Core', desc: '+50% damage, −1 max HP', iconId: 37, rarity: 'epic',
    apply: (s) => ({ ...s, attackDamage: Math.ceil(s.attackDamage * 1.5), maxHp: Math.max(1, s.maxHp - 1), hp: Math.min(s.hp, Math.max(1, s.maxHp - 1)) }) },
  { id: 'doubleshot', name: 'Fork Amplifier', desc: '+1 projectile per shot', iconId: 39, rarity: 'epic',
    apply: (s) => ({ ...s, pierce: s.pierce + 2, attackCooldown: s.attackCooldown * 1.1 }) },
  { id: 'ghost', name: 'Ghost Protocol', desc: '+0.5s dash i-frames', iconId: 41, rarity: 'epic',
    apply: (s) => ({ ...s, dashDuration: s.dashDuration + 500 }) },

  // ─── Cursed ──────────────────────────────────────────────────────
  { id: 'glass', name: 'Glass Cannon', desc: '+100% damage, max HP = 2', iconId: 43, rarity: 'cursed',
    apply: (s) => ({ ...s, attackDamage: s.attackDamage * 2, maxHp: 2, hp: Math.min(s.hp, 2) }) },
  { id: 'hunger', name: 'Hunger Drive', desc: '+40% dmg, lose 1 HP/room', iconId: 45, rarity: 'cursed',
    apply: (s) => ({ ...s, attackDamage: Math.ceil(s.attackDamage * 1.4) }) },
];

export function pickChips(seen: Set<string>, count = 3): ChipDef[] {
  const pool = CHIPS.filter((c) => !seen.has(c.id));
  if (pool.length <= count) return pool;
  const result: ChipDef[] = [];
  const weights: Record<string, number> = { common: 10, rare: 5, epic: 2, cursed: 1 };
  const copy = [...pool];
  while (result.length < count && copy.length > 0) {
    const total = copy.reduce((s, c) => s + weights[c.rarity], 0);
    let r = Math.random() * total;
    for (let i = 0; i < copy.length; i++) {
      r -= weights[copy[i].rarity];
      if (r <= 0) {
        result.push(copy[i]);
        copy.splice(i, 1);
        break;
      }
    }
  }
  return result;
}
