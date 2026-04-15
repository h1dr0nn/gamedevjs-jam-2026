import type { PrototypeId } from '../types';

export interface RunState {
  proto: PrototypeId;
  floorIndex: number; // 0-based index into FLOORS
  roomIndex: number; // 0-based within floor
  chipIds: string[];
  seenChipIds: Set<string>;
  startedAt: number;
  kills: number;
  envKills: number;
  scrapEarned: number;
  deepestFloorReached: number;
  won: boolean;
}

export function newRun(proto: PrototypeId): RunState {
  return {
    proto,
    floorIndex: 0,
    roomIndex: 0,
    chipIds: [],
    seenChipIds: new Set(),
    startedAt: Date.now(),
    kills: 0,
    envKills: 0,
    scrapEarned: 0,
    deepestFloorReached: 1,
    won: false,
  };
}

export const runState: { current: RunState | null } = { current: null };
