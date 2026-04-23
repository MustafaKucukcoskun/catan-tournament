import seedrandom from 'seedrandom';
import {
  RESOURCE_POOL, TOKEN_POOL, HEX_POSITIONS_19, PORT_POOL, pipValue
} from './constants';
import { validateMap, type MapRules, type Hex } from './validator';
import type { PortType } from './constants';

export interface MapData {
  hexes: Hex[];
  ports: { edgeId: number; type: PortType; ratio: 2 | 3 }[];
  seed: string;
  attempts: number;
}

export interface GenerateOptions {
  seed?: string;
  rules: MapRules;
  retryCount: number;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildHexes(rng: () => number): Hex[] {
  const resources = shuffle(RESOURCE_POOL, rng);
  const tokens = shuffle(TOKEN_POOL, rng);
  let tokenIdx = 0;
  return HEX_POSITIONS_19.map((pos, i) => {
    const resource = resources[i];
    const token = resource === 'desert' ? null : tokens[tokenIdx++];
    return { ...pos, resource, token, pip: pipValue(token) };
  });
}

/**
 * Local swap repair: given a candidate board with violations, attempt to fix
 * them by swapping (resource, token, pip) between hex positions. Positions
 * and pool distributions are preserved. Deterministic given rng stream.
 * Returns a valid board or null.
 */
function localSwapRepair(hexes: Hex[], rules: MapRules, rng: () => number, maxPasses = 2000): Hex[] | null {
  const current = hexes.map(h => ({ ...h }));
  let best = validateMap(current, rules);
  if (best.ok) return current;

  for (let pass = 0; pass < maxPasses; pass++) {
    const i = Math.floor(rng() * current.length);
    let j = Math.floor(rng() * current.length);
    if (i === j) j = (j + 1) % current.length;

    const a = current[i];
    const b = current[j];

    const tmp = { resource: a.resource, token: a.token, pip: a.pip };
    a.resource = b.resource; a.token = b.token; a.pip = b.pip;
    b.resource = tmp.resource; b.token = tmp.token; b.pip = tmp.pip;

    const after = validateMap(current, rules);
    if (after.ok) return current;

    if (after.violations.length < best.violations.length) {
      best = after;
    } else {
      // revert
      const tmp2 = { resource: a.resource, token: a.token, pip: a.pip };
      a.resource = b.resource; a.token = b.token; a.pip = b.pip;
      b.resource = tmp2.resource; b.token = tmp2.token; b.pip = tmp2.pip;
    }
  }

  return validateMap(current, rules).ok ? current : null;
}

export function generateMap(opts: GenerateOptions): MapData {
  const seed = opts.seed ?? Math.random().toString(36).slice(2);
  const rng = seedrandom(seed);

  for (let attempt = 1; attempt <= opts.retryCount; attempt++) {
    const hexes = buildHexes(rng);

    const { ok } = validateMap(hexes, opts.rules);
    let finalHexes: Hex[] | null = ok ? hexes : null;

    // Constraint-directed local repair when pure shuffle violates rules.
    if (!finalHexes) finalHexes = localSwapRepair(hexes, opts.rules, rng);

    if (finalHexes) {
      const ports = shuffle(PORT_POOL, rng).map((p, i) => ({ edgeId: i, type: p.type, ratio: p.ratio }));
      return { hexes: finalHexes, ports, seed, attempts: attempt };
    }
  }

  throw new Error(`Map generation failed after ${opts.retryCount} attempts (seed=${seed})`);
}
