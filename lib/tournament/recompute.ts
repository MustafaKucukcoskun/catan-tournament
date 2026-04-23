import type { PlayerStats } from './tiebreaker';

export interface MatchResult {
  matchTableId: string;
  seatCount: 3 | 4;
  players: { playerId: string; finalVp: number; isWinner: boolean }[];
}

export function computeLeaderboard(matches: MatchResult[]): PlayerStats[] {
  const map = new Map<string, PlayerStats>();

  for (const match of matches) {
    // Compute table total (include virtual 4th for 3-seat tables)
    let tableTotal = match.players.reduce((s, p) => s + p.finalVp, 0);
    if (match.seatCount === 3) {
      const avg = tableTotal / 3;
      tableTotal += avg;
    }

    for (const mp of match.players) {
      let stats = map.get(mp.playerId);
      if (!stats) {
        stats = {
          playerId: mp.playerId,
          totalVp: 0, wins: 0, vpPercent: 0, bestSingleVp: 0, h2hWins: {},
        };
        map.set(mp.playerId, stats);
      }
      stats.totalVp += mp.finalVp;
      stats.bestSingleVp = Math.max(stats.bestSingleVp, mp.finalVp);
      if (mp.isWinner) stats.wins += 1;
      stats.vpPercent += mp.finalVp / tableTotal;

      // Track matches played
      (stats as any).matchesPlayed = ((stats as any).matchesPlayed ?? 0) + 1;

      // H2H — record wins over each opponent at this table
      if (mp.isWinner) {
        for (const opp of match.players) {
          if (opp.playerId !== mp.playerId) {
            stats.h2hWins[opp.playerId] = (stats.h2hWins[opp.playerId] ?? 0) + 1;
          }
        }
      }
    }
  }

  return Array.from(map.values()) as (PlayerStats & { matchesPlayed: number })[];
}
