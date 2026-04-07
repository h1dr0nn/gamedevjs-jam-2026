// Room template patterns: 0=floor, 1=wall, 2=barrel, 3=boulder, 4=cracked wall
// Each template is 12 rows × 16 cols

export type CellCode = 0 | 1 | 2 | 3 | 4;
export type RoomTemplate = CellCode[][];

function borderRoom(): RoomTemplate {
  return Array.from({ length: 12 }, (_, r) =>
    Array.from({ length: 16 }, (_, c) => {
      if (r === 0 || r === 11 || c === 0 || c === 15) return 1;
      return 0;
    }) as CellCode[]
  );
}

function addDoors(grid: RoomTemplate): RoomTemplate {
  const g = grid.map(row => [...row] as CellCode[]);
  g[0][7] = 0; g[0][8] = 0;
  g[11][7] = 0; g[11][8] = 0;
  g[5][0] = 0; g[6][0] = 0;
  g[5][15] = 0; g[6][15] = 0;
  return g;
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  // Template 0: open room with 4 barrels at corners
  (() => {
    const g = addDoors(borderRoom());
    g[2][2] = 2; g[2][13] = 2; g[9][2] = 2; g[9][13] = 2;
    return g;
  })(),

  // Template 1: central pillar with barrels flanking it
  (() => {
    const g = addDoors(borderRoom());
    g[5][7] = 1; g[5][8] = 1; g[6][7] = 1; g[6][8] = 1;
    g[3][5] = 2; g[3][10] = 2; g[8][5] = 2; g[8][10] = 2;
    return g;
  })(),

  // Template 2: cracked walls + boulders
  (() => {
    const g = addDoors(borderRoom());
    g[3][3] = 4; g[3][12] = 4; g[8][3] = 4; g[8][12] = 4;
    g[2][7] = 3; g[9][7] = 3;
    return g;
  })(),

  // Template 3: C-shaped inner wall with barrels in nook
  (() => {
    const g = addDoors(borderRoom());
    for (let r = 3; r <= 8; r++) g[r][4] = 1 as CellCode;
    g[3][4] = 0 as CellCode;
    g[5][5] = 2; g[6][5] = 2;
    return g;
  })(),
];
