import { describe, it, expect } from 'vitest';
import { validateMap, type MapRules, type Hex } from '@/lib/map/validator';

const rules: MapRules = {
  c1_no_red_adj: true,
  c2_no_same_num_adj: true,
  c3_no_same_resource_adj: true,
  c4_max_vertex_pip: 10,
  c5_no_2_12_adj: false,
};

describe('validateMap', () => {
  it('rejects adjacent 6 and 8', () => {
    const hexes: Hex[] = [
      { q: 0, r: 0, resource: 'wood', token: 6, pip: 5 },
      { q: 1, r: 0, resource: 'sheep', token: 8, pip: 5 },
    ];
    expect(validateMap(hexes, rules).ok).toBe(false);
  });

  it('accepts non-adjacent 6 and 8', () => {
    const hexes: Hex[] = [
      { q: 0, r: 0, resource: 'wood', token: 6, pip: 5 },
      { q: 2, r: 0, resource: 'sheep', token: 8, pip: 5 },
    ];
    expect(validateMap(hexes, rules).ok).toBe(true);
  });

  it('rejects adjacent same resource', () => {
    const hexes: Hex[] = [
      { q: 0, r: 0, resource: 'wood', token: 3, pip: 2 },
      { q: 1, r: 0, resource: 'wood', token: 5, pip: 4 },
    ];
    expect(validateMap(hexes, rules).ok).toBe(false);
  });

  it('rejects adjacent same number', () => {
    const hexes: Hex[] = [
      { q: 0, r: 0, resource: 'wood', token: 4, pip: 3 },
      { q: 1, r: 0, resource: 'sheep', token: 4, pip: 3 },
    ];
    expect(validateMap(hexes, rules).ok).toBe(false);
  });
});
