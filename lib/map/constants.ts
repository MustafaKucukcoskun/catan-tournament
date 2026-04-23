export type Resource = 'wood' | 'sheep' | 'wheat' | 'brick' | 'ore' | 'desert';
export type PortType = 'generic' | 'wood' | 'sheep' | 'wheat' | 'brick' | 'ore';

export const RESOURCE_POOL: Resource[] = [
  'wood', 'wood', 'wood', 'wood',
  'sheep', 'sheep', 'sheep', 'sheep',
  'wheat', 'wheat', 'wheat', 'wheat',
  'brick', 'brick', 'brick',
  'ore', 'ore', 'ore',
  'desert',
];

export const TOKEN_POOL: number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12
];

export interface HexPos { q: number; r: number; }

export const HEX_POSITIONS_19: HexPos[] = [
  {q: 0, r: -2}, {q: 1, r: -2}, {q: 2, r: -2},
  {q: -1, r: -1}, {q: 0, r: -1}, {q: 1, r: -1}, {q: 2, r: -1},
  {q: -2, r: 0}, {q: -1, r: 0}, {q: 0, r: 0}, {q: 1, r: 0}, {q: 2, r: 0},
  {q: -2, r: 1}, {q: -1, r: 1}, {q: 0, r: 1}, {q: 1, r: 1},
  {q: -2, r: 2}, {q: -1, r: 2}, {q: 0, r: 2},
];

export const PORT_POOL: { type: PortType; ratio: 2 | 3 }[] = [
  { type: 'generic', ratio: 3 }, { type: 'generic', ratio: 3 },
  { type: 'generic', ratio: 3 }, { type: 'generic', ratio: 3 },
  { type: 'wood', ratio: 2 },    { type: 'sheep', ratio: 2 },
  { type: 'wheat', ratio: 2 },   { type: 'brick', ratio: 2 },
  { type: 'ore', ratio: 2 },
];

export function pipValue(token: number | null): number {
  if (token === null) return 0;
  const map: Record<number, number> = {
    2: 1, 12: 1,
    3: 2, 11: 2,
    4: 3, 10: 3,
    5: 4, 9: 4,
    6: 5, 8: 5,
  };
  return map[token] ?? 0;
}

export function isRed(token: number | null): boolean {
  return token === 6 || token === 8;
}
