import { describe, it, expect } from 'vitest';
import { RoomGenerator } from './RoomGenerator';
import { RoomType, EnemyType } from '../types';

describe('RoomGenerator', () => {
  it('generates a room with correct grid dimensions', () => {
    const gen = new RoomGenerator(1);
    const room = gen.generate(RoomType.Combat);
    expect(room.grid).toHaveLength(12);
    expect(room.grid[0]).toHaveLength(16);
  });

  it('corner cells are always walls', () => {
    const gen = new RoomGenerator(1);
    const room = gen.generate(RoomType.Combat);
    expect(room.grid[0][0].wall).toBe(true);
    expect(room.grid[11][15].wall).toBe(true);
  });

  it('generates between 2 and 6 enemy spawns for floor 1 combat room', () => {
    const gen = new RoomGenerator(1);
    const room = gen.generate(RoomType.Combat);
    expect(room.enemySpawns.length).toBeGreaterThanOrEqual(2);
    expect(room.enemySpawns.length).toBeLessThanOrEqual(6);
  });

  it('floor 1 only spawns Grunts', () => {
    const gen = new RoomGenerator(1);
    for (let i = 0; i < 20; i++) {
      const room = gen.generate(RoomType.Combat);
      room.enemySpawns.forEach(s => expect(s.type).toBe(EnemyType.Grunt));
    }
  });

  it('enemy spawns are not on wall cells', () => {
    const gen = new RoomGenerator(1);
    const room = gen.generate(RoomType.Combat);
    room.enemySpawns.forEach(({ row, col }) => {
      expect(room.grid[row][col].wall).toBe(false);
    });
  });

  it('sets correct floor and type on returned config', () => {
    const gen = new RoomGenerator(3);
    const room = gen.generate(RoomType.Elite);
    expect(room.floor).toBe(3);
    expect(room.type).toBe(RoomType.Elite);
  });
});
