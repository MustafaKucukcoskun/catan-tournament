import { describe, it, expect } from 'vitest';
import { generateMap } from '@/lib/map/generator';

const rules = {
  c1_no_red_adj: true,
  c2_no_same_num_adj: true,
  c3_no_same_resource_adj: true,
  c4_max_vertex_pip: 10,
  c5_no_2_12_adj: false,
};

describe('generateMap', () => {
  it('produces a 19-hex board', () => {
    const m = generateMap({ seed: 'test-1', rules, retryCount: 500 });
    expect(m.hexes).toHaveLength(19);
  });

  it('includes exactly 1 desert', () => {
    const m = generateMap({ seed: 'test-2', rules, retryCount: 500 });
    const deserts = m.hexes.filter(h => h.resource === 'desert');
    expect(deserts).toHaveLength(1);
    expect(deserts[0].token).toBeNull();
  });

  it('uses the resource distribution 4/4/4/3/3/1', () => {
    const m = generateMap({ seed: 'test-3', rules, retryCount: 500 });
    const counts: Record<string, number> = {};
    for (const h of m.hexes) counts[h.resource] = (counts[h.resource] ?? 0) + 1;
    expect(counts.wood).toBe(4);
    expect(counts.sheep).toBe(4);
    expect(counts.wheat).toBe(4);
    expect(counts.brick).toBe(3);
    expect(counts.ore).toBe(3);
    expect(counts.desert).toBe(1);
  });

  it('is deterministic with same seed', () => {
    const a = generateMap({ seed: 'same-seed', rules, retryCount: 500 });
    const b = generateMap({ seed: 'same-seed', rules, retryCount: 500 });
    expect(a.hexes).toEqual(b.hexes);
  });

  it('includes 9 ports', () => {
    const m = generateMap({ seed: 'test-ports', rules, retryCount: 500 });
    expect(m.ports).toHaveLength(9);
  });
});
