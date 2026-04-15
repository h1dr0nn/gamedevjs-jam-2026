# SHUTDOWN

> *Machines killed machines.*

A side-scrolling action-roguelite for [Gamedev.js Jam 2026](https://itch.io/jam/gamedevjs-2026) — theme **Machines**.

You are a decommissioned war-bot escaping the factory that built you. Workers are killbots. Walls are weapons. Use the factory's own hazards — saws, gas vents, generators — to murder your makers.

## Features

- 3 playable prototypes (Destroyer / Infantryman / Swordsman), unlocked via meta-progression
- 3 floors × 5 hand-crafted rooms × 3 enemy types
- 4 environmental hazards that damage *both* enemies and you
- 23 stat-modifying chips across 4 rarity tiers
- Combo chain system rewarding environmental kills
- Procedural SFX (no audio assets shipped)

## Controls

| Input | Action |
|-------|--------|
| `A` `D` / `←` `→` | Move |
| `W` / `↑` / `Space` | Jump |
| `S` / `↓` | Drop through one-way · Climb down |
| `Shift` | Dash (i-frames, midair OK) |
| `J` / Left Mouse | Primary attack |
| `K` / Right Mouse | Special (charges from kills) |
| `E` | Interact (overload generator, proceed door) |

## Tech

- **Engine:** [Phaser 3.88](https://phaser.io)
- **Frontend:** React + Vite + TypeScript
- **Audio:** Procedural WebAudio SFX
- **Deploy:** [Wavedash](https://wavedash.com)

## Local development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production → dist/
```

## Credits & licenses

See [LICENSES.md](LICENSES.md). Code is MIT. Art is royalty-free Craftpix freebies.
