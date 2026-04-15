/**
 * Tiny audio system — generates short SFX with WebAudio.
 * Using procedural blip/saw/noise envelopes keeps build size at zero asset cost.
 */

type SfxName =
  | 'shoot' | 'hit' | 'kill' | 'jump' | 'dash' | 'hurt' | 'die'
  | 'pickup' | 'door' | 'menu' | 'special' | 'gas' | 'saw' | 'gen';

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

let muted = false;
let volume = 0.4;

export function setMuted(v: boolean): void { muted = v; }
export function isMuted(): boolean { return muted; }
export function setVolume(v: number): void { volume = Math.max(0, Math.min(1, v)); }

interface SfxOpts { freq: number; freq2?: number; type: OscillatorType; duration: number; vol?: number; sweep?: number; noise?: number; }

const SFX: Record<SfxName, SfxOpts> = {
  shoot: { freq: 720, freq2: 480, type: 'square', duration: 0.07, vol: 0.16, sweep: -1 },
  hit: { freq: 240, type: 'square', duration: 0.06, vol: 0.18 },
  kill: { freq: 120, freq2: 700, type: 'sawtooth', duration: 0.18, vol: 0.22, sweep: 1 },
  jump: { freq: 380, freq2: 620, type: 'square', duration: 0.1, vol: 0.16, sweep: 1 },
  dash: { freq: 800, freq2: 320, type: 'sawtooth', duration: 0.12, vol: 0.18, sweep: -1 },
  hurt: { freq: 180, freq2: 90, type: 'sawtooth', duration: 0.18, vol: 0.25, sweep: -1 },
  die: { freq: 200, freq2: 60, type: 'sawtooth', duration: 0.6, vol: 0.32, sweep: -1 },
  pickup: { freq: 600, freq2: 1100, type: 'triangle', duration: 0.14, vol: 0.18, sweep: 1 },
  door: { freq: 220, freq2: 520, type: 'square', duration: 0.18, vol: 0.18, sweep: 1 },
  menu: { freq: 480, type: 'square', duration: 0.04, vol: 0.12 },
  special: { freq: 220, freq2: 1100, type: 'square', duration: 0.3, vol: 0.28, sweep: 1 },
  gas: { freq: 80, type: 'square', duration: 0.32, vol: 0.18, noise: 1 },
  saw: { freq: 160, type: 'sawtooth', duration: 0.25, vol: 0.18 },
  gen: { freq: 180, freq2: 900, type: 'square', duration: 0.4, vol: 0.28, sweep: 1 },
};

export function playSfx(name: SfxName): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const o = SFX[name];
  const t0 = c.currentTime;
  const t1 = t0 + o.duration;

  if (o.noise) {
    const buf = c.createBuffer(1, c.sampleRate * o.duration, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime((o.vol ?? 0.2) * volume, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t1);
    src.connect(g).connect(c.destination);
    src.start(t0);
    src.stop(t1);
    return;
  }

  const osc = c.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.freq2 !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(o.freq2, t1);
  }
  const g = c.createGain();
  const peak = (o.vol ?? 0.2) * volume;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.01, o.duration / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t1);
}

/** Resume context after first user gesture (browser autoplay rule). */
export function unlockAudio(): void {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}
