import { describe, it, expect } from 'vitest';
import { seedBracket } from '@/lib/tournament/bracket';

describe('seedBracket', () => {
  it('distributes 16 players into 4 tables of 4', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({ id: `p${i}`, rank: i + 1 }));
    const tables = seedBracket(players, 16, () => 0.5);
    expect(tables).toHaveLength(4);
    tables.forEach(t => expect(t).toHaveLength(4));
  });

  it('covers all 16 players', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({ id: `p${i}`, rank: i + 1 }));
    const tables = seedBracket(players, 16, () => 0.5);
    const ids = new Set(tables.flat().map(p => p.id));
    expect(ids.size).toBe(16);
  });

  it('places one player from each tier on each table', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({ id: `p${i}`, rank: i + 1 }));
    const tables = seedBracket(players, 16, () => 0.5);
    tables.forEach(t => {
      const ranks = t.map(p => p.rank).sort((a, b) => a - b);
      // Each table should have: 1 from rank 1-4, 1 from 5-8, 1 from 9-12, 1 from 13-16
      expect(ranks[0]).toBeLessThanOrEqual(4);
      expect(ranks[1]).toBeGreaterThan(4);
      expect(ranks[1]).toBeLessThanOrEqual(8);
      expect(ranks[2]).toBeGreaterThan(8);
      expect(ranks[2]).toBeLessThanOrEqual(12);
      expect(ranks[3]).toBeGreaterThan(12);
    });
  });

  it('handles elimCount=4 (single final table)', () => {
    const players = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, rank: i + 1 }));
    const tables = seedBracket(players, 4, () => 0.5);
    expect(tables).toHaveLength(1);
    expect(tables[0]).toHaveLength(4);
  });
});
