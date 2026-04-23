export interface PlayerStats {
  playerId: string;
  totalVp: number;
  wins: number;
  vpPercent: number;
  bestSingleVp: number;
  h2hWins: Record<string, number>;
}

export interface TieConflict {
  players: string[];
  reason: string;
}

export function rankPlayers(stats: PlayerStats[]): PlayerStats[] {
  return [...stats].sort((a, b) => {
    if (a.totalVp !== b.totalVp) return b.totalVp - a.totalVp;
    if (a.wins !== b.wins) return b.wins - a.wins;
    if (a.vpPercent !== b.vpPercent) return b.vpPercent - a.vpPercent;
    if (a.bestSingleVp !== b.bestSingleVp) return b.bestSingleVp - a.bestSingleVp;
    // head-to-head
    const h2h = (a.h2hWins[b.playerId] ?? 0) - (b.h2hWins[a.playerId] ?? 0);
    if (h2h !== 0) return -h2h;
    return Math.random() - 0.5;
  });
}

export function detectCutoffTies(ranked: PlayerStats[], elimCount: number): TieConflict[] {
  if (elimCount >= ranked.length) return [];
  const atCutoff = ranked[elimCount - 1];
  const justBelow = ranked[elimCount];
  if (!atCutoff || !justBelow) return [];

  const trulyTied = (a: PlayerStats, b: PlayerStats) =>
    a.totalVp === b.totalVp && a.wins === b.wins &&
    a.vpPercent === b.vpPercent && a.bestSingleVp === b.bestSingleVp;

  if (trulyTied(atCutoff, justBelow)) {
    // Expand tie cluster
    const cluster = [atCutoff];
    for (let i = elimCount; i < ranked.length; i++) {
      if (trulyTied(atCutoff, ranked[i])) cluster.push(ranked[i]);
      else break;
    }
    return [{ players: cluster.map(p => p.playerId), reason: 'Equal on all metrics' }];
  }

  return [];
}
