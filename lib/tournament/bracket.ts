export interface SeedablePlayer {
  id: string;
  rank: number;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function seedBracket<T extends SeedablePlayer>(
  topN: T[],
  elimCount: number,
  rng: () => number = Math.random
): T[][] {
  const sorted = [...topN].sort((a, b) => a.rank - b.rank).slice(0, elimCount);

  if (elimCount === 4) {
    // Final table — shuffle
    return [shuffle(sorted, rng)];
  }

  const tableCount = elimCount / 4;
  const tier1 = shuffle(sorted.slice(0, tableCount), rng);
  const tier2 = shuffle(sorted.slice(tableCount, tableCount * 2), rng);
  const tier3 = shuffle(sorted.slice(tableCount * 2, tableCount * 3), rng);
  const tier4 = shuffle(sorted.slice(tableCount * 3, tableCount * 4), rng);

  const tables: T[][] = [];
  for (let i = 0; i < tableCount; i++) {
    tables.push([tier1[i], tier2[i], tier3[i], tier4[i]]);
  }
  return tables;
}
