import { describe, it, expect } from 'vitest';
import { computeLeaderboard } from '@/lib/tournament/recompute';

describe('computeLeaderboard', () => {
  it('aggregates VP across matches', () => {
    const matchResults = [
      { matchTableId: 'm1', seatCount: 4 as const, players: [
        { playerId: 'a', finalVp: 10, isWinner: true },
        { playerId: 'b', finalVp: 7,  isWinner: false },
        { playerId: 'c', finalVp: 5,  isWinner: false },
        { playerId: 'd', finalVp: 3,  isWinner: false },
      ]},
      { matchTableId: 'm2', seatCount: 4 as const, players: [
        { playerId: 'a', finalVp: 8,  isWinner: false },
        { playerId: 'e', finalVp: 10, isWinner: true },
        { playerId: 'f', finalVp: 4,  isWinner: false },
        { playerId: 'g', finalVp: 3,  isWinner: false },
      ]},
    ];
    const lb = computeLeaderboard(matchResults);
    const a = lb.find(p => p.playerId === 'a')!;
    expect((a as any).matchesPlayed).toBe(2);
    expect(a.totalVp).toBe(18);
    expect(a.wins).toBe(1);
    expect(a.bestSingleVp).toBe(10);
  });

  it('computes VP% using virtual 4th player for 3-seat tables', () => {
    const matchResults = [
      { matchTableId: 'm1', seatCount: 3 as const, players: [
        { playerId: 'a', finalVp: 10, isWinner: true },
        { playerId: 'b', finalVp: 7,  isWinner: false },
        { playerId: 'c', finalVp: 4,  isWinner: false },
      ]},
    ];
    const lb = computeLeaderboard(matchResults);
    const a = lb.find(p => p.playerId === 'a')!;
    // virtual 4 = avg(10,7,4) = 7; tableTotal = 10+7+4+7 = 28
    // a's vpPercent = 10/28 ≈ 0.357
    expect(a.vpPercent).toBeCloseTo(10 / 28, 3);
  });
});
