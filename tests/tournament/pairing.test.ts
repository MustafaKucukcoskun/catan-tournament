import { describe, it, expect } from 'vitest';
import { pairLeagueRound, type PairingInput } from '@/lib/tournament/pairing';

function mkPlayer(id: string, totalVp = 0) {
  return { id, totalVp, previousOpponents: new Set<string>() };
}

describe('pairLeagueRound — round 1', () => {
  it('creates tables covering all players', () => {
    const players = Array.from({ length: 16 }, (_, i) => mkPlayer(`p${i}`));
    const tables = pairLeagueRound({ players, roundNumber: 1, rng: () => 0.5 });
    const allIds = new Set(tables.flatMap(t => t.players.map(p => p.id)));
    expect(allIds.size).toBe(16);
    expect(tables).toHaveLength(4);
  });
});

describe('pairLeagueRound — round 2', () => {
  it('groups similar-VP players together', () => {
    const players = [
      mkPlayer('top1', 20), mkPlayer('top2', 19),
      mkPlayer('mid1', 12), mkPlayer('mid2', 11),
      mkPlayer('bot1',  4), mkPlayer('bot2',  3),
      mkPlayer('bot3',  2), mkPlayer('bot4',  1),
    ];
    const tables = pairLeagueRound({ players, roundNumber: 2, rng: () => 0.5 });
    expect(tables).toHaveLength(2);
    // Table with top players should have higher avg VP
    const avg = (t: any) => t.players.reduce((s: number, p: any) => s + p.totalVp, 0) / t.players.length;
    const sorted = [...tables].sort((a, b) => avg(b) - avg(a));
    expect(avg(sorted[0])).toBeGreaterThan(avg(sorted[1]));
  });
});
