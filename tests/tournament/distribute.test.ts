import { describe, it, expect } from 'vitest';
import { distributePlayers } from '@/lib/tournament/distribute';

describe('distributePlayers', () => {
  it.each([
    [4,  { fourTables: 1,  threeTables: 0, byes: 0 }],
    [6,  { fourTables: 0,  threeTables: 2, byes: 0 }],
    [7,  { fourTables: 1,  threeTables: 1, byes: 0 }],
    [8,  { fourTables: 2,  threeTables: 0, byes: 0 }],
    [16, { fourTables: 4,  threeTables: 0, byes: 0 }],
    [17, { fourTables: 2,  threeTables: 3, byes: 0 }],
    [41, { fourTables: 8,  threeTables: 3, byes: 0 }],
    [44, { fourTables: 11, threeTables: 0, byes: 0 }],
    [45, { fourTables: 9,  threeTables: 3, byes: 0 }],
  ])('distributes %i players correctly', (n, expected) => {
    expect(distributePlayers(n)).toEqual(expected);
  });

  it('uses bye for N=5', () => {
    const result = distributePlayers(5);
    expect(result.byes).toBe(1);
    expect(result.fourTables * 4 + result.threeTables * 3 + result.byes).toBe(5);
  });

  it('throws for N < 4', () => {
    expect(() => distributePlayers(3)).toThrow();
  });
});
