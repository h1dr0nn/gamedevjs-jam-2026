import { DUNGEON_FRAMES, RPG_FRAMES } from '../data/tileFrames';

export type SpriteRef = { sheet: string; frame: number };

export const TILES: Record<string, SpriteRef> = {
  player:   { sheet: 'rpg-sheet',     frame: RPG_FRAMES.KNIGHT   },
  grunt:    { sheet: 'rpg-sheet',     frame: RPG_FRAMES.GOBLIN   },
  shielder: { sheet: 'rpg-sheet',     frame: RPG_FRAMES.SKELETON },
  bomber:   { sheet: 'rpg-sheet',     frame: RPG_FRAMES.SLIME    },
  turret:   { sheet: 'rpg-sheet',     frame: RPG_FRAMES.BAT      },
  barrel:   { sheet: 'dungeon-sheet', frame: DUNGEON_FRAMES.BARREL },
  boulder:  { sheet: 'rpg-sheet',     frame: RPG_FRAMES.BOULDER  },
  wall:     { sheet: 'dungeon-sheet', frame: DUNGEON_FRAMES.WALL_DARK  },
  floor:    { sheet: 'dungeon-sheet', frame: DUNGEON_FRAMES.FLOOR_STONE },
};
