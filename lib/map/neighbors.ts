import type { HexPos } from './constants';

const DIRS: HexPos[] = [
  { q: 1, r: 0 },   { q: 1, r: -1 },
  { q: 0, r: -1 },  { q: -1, r: 0 },
  { q: -1, r: 1 },  { q: 0, r: 1 },
];

export function axialNeighbors(pos: HexPos): HexPos[] {
  return DIRS.map(d => ({ q: pos.q + d.q, r: pos.r + d.r }));
}

export function areNeighbors(a: HexPos, b: HexPos): boolean {
  if (a.q === b.q && a.r === b.r) return false;
  return DIRS.some(d => a.q + d.q === b.q && a.r + d.r === b.r);
}
