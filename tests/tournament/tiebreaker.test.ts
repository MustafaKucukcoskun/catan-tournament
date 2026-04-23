import { describe, it, expect } from 'vitest';
import { rankPlayers, detectCutoffTies } from '@/lib/tournament/tiebreaker';

function mk(overrides: any) {
  return {
    playerId: 'x',
    totalVp: 0, wins: 0, vpPercent: 0, bestSingleVp: 0,
    h2hWins: {},
    ...overrides,
  };
}

describe('rankPlayers', () => {
  it('sorts by total VP desc', () => {
    const stats = [mk({ playerId: 'a', totalVp: 10 }), mk({ playerId: 'b', totalVp: 20 })];
    const r = rankPlayers(stats);
    expect(r[0].playerId).toBe('b');
  });

  it('uses wins as tiebreaker when VP equal', () => {
    const stats = [
      mk({ playerId: 'a', totalVp: 20, wins: 1 }),
      mk({ playerId: 'b', totalVp: 20, wins: 2 }),
    ];
    const r = rankPlayers(stats);
    expect(r[0].playerId).toBe('b');
  });

  it('uses vpPercent when VP+wins equal', () => {
    const stats = [
      mk({ playerId: 'a', totalVp: 20, wins: 1, vpPercent: 0.5 }),
      mk({ playerId: 'b', totalVp: 20, wins: 1, vpPercent: 0.7 }),
    ];
    const r = rankPlayers(stats);
    expect(r[0].playerId).toBe('b');
  });
});

describe('detectCutoffTies', () => {
  it('returns empty when rank N and N+1 are clearly different', () => {
    const r = [mk({ playerId: 'a', totalVp: 20 }), mk({ playerId: 'b', totalVp: 10 })];
    expect(detectCutoffTies(r, 1)).toEqual([]);
  });

  it('detects a tie at cutoff boundary', () => {
    const r = [
      mk({ playerId: 'a', totalVp: 20 }),
      mk({ playerId: 'b', totalVp: 20, wins: 0, vpPercent: 0.5 }),
      mk({ playerId: 'c', totalVp: 20, wins: 0, vpPercent: 0.5 }),
    ];
    const conflicts = detectCutoffTies(r, 2);
    expect(conflicts.length).toBeGreaterThan(0);
  });
});
