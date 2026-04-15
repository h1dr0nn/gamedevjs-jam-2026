import type { PrototypeId } from '../types';

interface MetaState {
  scrap: number;
  unlockedProtos: PrototypeId[];
  deepestFloor: number;
  runs: number;
  wins: number;
}

const KEY = 'shutdown:meta:v1';

const defaultState: MetaState = {
  scrap: 0,
  unlockedProtos: ['destroyer'],
  deepestFloor: 0,
  runs: 0,
  wins: 0,
};

export class MetaStore {
  private state: MetaState;

  constructor() {
    this.state = defaultState;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.state = { ...defaultState, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
  }

  get scrap() { return this.state.scrap; }
  get unlockedProtos() { return this.state.unlockedProtos; }
  get deepestFloor() { return this.state.deepestFloor; }
  get runs() { return this.state.runs; }
  get wins() { return this.state.wins; }

  isUnlocked(p: PrototypeId): boolean { return this.state.unlockedProtos.includes(p); }

  addScrap(n: number): void { this.state.scrap += n; this.save(); }
  recordRun(deepestFloorReached: number, won: boolean): void {
    this.state.runs++;
    if (won) this.state.wins++;
    if (deepestFloorReached > this.state.deepestFloor) this.state.deepestFloor = deepestFloorReached;
    // Auto-unlock protos by reaching floors
    if (deepestFloorReached >= 2 && !this.isUnlocked('infantryman')) this.state.unlockedProtos.push('infantryman');
    if (deepestFloorReached >= 3 && !this.isUnlocked('swordsman')) this.state.unlockedProtos.push('swordsman');
    this.save();
  }
  unlockProto(p: PrototypeId): void {
    if (!this.isUnlocked(p)) {
      this.state.unlockedProtos.push(p);
      this.save();
    }
  }
}

export const metaStore = new MetaStore();
