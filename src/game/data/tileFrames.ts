/** Frame indices into Kenney spritesheets */

// Dungeon sheet: 28 cols × 17 rows  — frame = row * 28 + col
export const DUNGEON_FRAMES = {
  FLOOR_STONE:     3 * 28 + 5,   // stone floor tile
  FLOOR_STONE_ALT: 3 * 28 + 6,   // alternate floor
  WALL_DARK:       7 * 28 + 23,  // dark stone wall
  WALL_DARK_ALT:   7 * 28 + 24,  // alternate dark wall
  BARREL:         14 * 28 + 10,  // barrel prop
  CHEST:          14 * 28 + 12,  // chest
  SKULL:           1 * 28 + 3,   // skull decoration
  PILLAR:          0 * 28 + 0,   // stone pillar
};

// RPG sheet: 56 cols × 30 rows  — frame = row * 56 + col
export const RPG_FRAMES = {
  KNIGHT:   27 * 56 + 28,  // knight character
  GOBLIN:   27 * 56 + 31,  // goblin enemy
  SKELETON: 27 * 56 + 35,  // skeleton enemy
  SLIME:    28 * 56 + 28,  // slime enemy
  BAT:      28 * 56 + 31,  // bat enemy
  BOULDER:   3 * 56 + 38,  // rock/boulder
};
