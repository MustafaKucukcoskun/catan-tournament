export interface Distribution {
  fourTables: number;
  threeTables: number;
  byes: number;
}

export function distributePlayers(n: number): Distribution {
  if (n < 4) throw new Error(`Cannot distribute ${n} players (min 4)`);

  // Prefer 4s, allow 3s, bye last resort
  for (let threeTables = 0; threeTables <= Math.floor(n / 3); threeTables++) {
    const remaining = n - threeTables * 3;
    if (remaining >= 0 && remaining % 4 === 0) {
      return { fourTables: remaining / 4, threeTables, byes: 0 };
    }
  }
  // Bye fallback (only needed for N=5)
  for (let byes = 1; byes <= 3; byes++) {
    for (let threeTables = 0; threeTables <= Math.floor((n - byes) / 3); threeTables++) {
      const remaining = n - byes - threeTables * 3;
      if (remaining >= 0 && remaining % 4 === 0) {
        return { fourTables: remaining / 4, threeTables, byes };
      }
    }
  }
  throw new Error(`Cannot distribute ${n} players`);
}
