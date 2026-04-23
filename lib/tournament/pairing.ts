import { distributePlayers } from './distribute';

export interface PairingPlayer {
  id: string;
  totalVp: number;
  previousOpponents: Set<string>;
}

export interface PairingTable {
  players: PairingPlayer[];
  seatCount: 3 | 4;
}

export interface PairingInput {
  players: PairingPlayer[];
  roundNumber: number;
  rng?: () => number;
  windowSize?: number;
}

function shuffleInPlace<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function pairLeagueRound(input: PairingInput): PairingTable[] {
  const rng = input.rng ?? Math.random;
  const { fourTables, threeTables } = distributePlayers(input.players.length);

  // Round 1: fully random
  if (input.roundNumber === 1) {
    const pool = [...input.players];
    shuffleInPlace(pool, rng);
    return buildTables(pool, fourTables, threeTables);
  }

  // Round 2+: Swiss with sliding window
  const sorted = [...input.players].sort((a, b) => b.totalVp - a.totalVp);
  const pool = [...sorted];
  const windowSize = input.windowSize ?? 3;
  const tables: PairingTable[] = [];

  for (let t = 0; t < fourTables; t++) {
    const seat1 = pool.shift()!;
    const table: PairingPlayer[] = [seat1];
    for (let seat = 2; seat <= 4; seat++) {
      const windowEnd = Math.min(windowSize, pool.length);
      let candidates = pool.slice(0, windowEnd).filter(p =>
        !table.some(tp => tp.previousOpponents.has(p.id))
      );
      if (candidates.length === 0) candidates = pool.slice(0, windowEnd);
      const pick = candidates[Math.floor(rng() * candidates.length)];
      table.push(pick);
      pool.splice(pool.indexOf(pick), 1);
    }
    tables.push({ players: table, seatCount: 4 });
  }

  for (let t = 0; t < threeTables; t++) {
    const seats = pool.splice(0, 3);
    tables.push({ players: seats, seatCount: 3 });
  }

  return tables;
}

function buildTables(pool: PairingPlayer[], four: number, three: number): PairingTable[] {
  const tables: PairingTable[] = [];
  for (let t = 0; t < four; t++) {
    tables.push({ players: pool.splice(0, 4), seatCount: 4 });
  }
  for (let t = 0; t < three; t++) {
    tables.push({ players: pool.splice(0, 3), seatCount: 3 });
  }
  return tables;
}
