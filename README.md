# Gamedev.js Jam 2026

A browser game built for [Gamedev.js Jam 2026](https://itch.io/jam/gamedevjs-2026) (13–26 April 2026).

**Challenges entered:** Build it with Phaser · Deploy to Wavedash · Open Source by GitHub

## Tech Stack

- **Engine:** [Phaser 3](https://phaser.io)
- **Frontend:** React + Vite + TypeScript
- **Deploy:** [Wavedash](https://wavedash.com)

## Project Structure

```
src/
├── main.tsx              # React entry point
├── App.tsx               # Phaser game container
└── game/
    ├── config.ts         # Phaser game config
    └── scenes/
        ├── BootScene.ts    # Initial boot
        ├── PreloadScene.ts # Asset loading + progress bar
        ├── MenuScene.ts    # Main menu
        ├── GameScene.ts    # Core gameplay
        └── UIScene.ts      # HUD overlay (score, etc.)
```

## Getting Started

```bash
npm install
npm run dev       # Development server at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

## Deploy to Wavedash

1. Install CLI: `brew install wvdsh/tap/wavedash`
2. Set your `game_id` in `wavedash.toml`
3. Build: `npm run build`
4. Push: `wavedash build push`
