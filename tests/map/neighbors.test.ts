import { describe, it, expect } from 'vitest';
import { axialNeighbors, areNeighbors } from '@/lib/map/neighbors';

describe('axialNeighbors', () => {
  it('returns 6 neighbor positions for any hex', () => {
    const n = axialNeighbors({ q: 0, r: 0 });
    expect(n).toHaveLength(6);
  });

  it('returns correct neighbors for origin', () => {
    const n = axialNeighbors({ q: 0, r: 0 });
    expect(n).toEqual(expect.arrayContaining([
      { q: 1, r: 0 },   { q: 1, r: -1 },
      { q: 0, r: -1 },  { q: -1, r: 0 },
      { q: -1, r: 1 },  { q: 0, r: 1 },
    ]));
  });
});

describe('areNeighbors', () => {
  it('returns true for adjacent hexes', () => {
    expect(areNeighbors({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(true);
    expect(areNeighbors({ q: 0, r: 0 }, { q: 0, r: -1 })).toBe(true);
  });

  it('returns false for distant hexes', () => {
    expect(areNeighbors({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
  });

  it('returns false for same hex', () => {
    expect(areNeighbors({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(false);
  });
});
