import type { HexPos, Resource } from './constants';
import { areNeighbors } from './neighbors';
import { isRed } from './constants';

export interface Hex extends HexPos {
  resource: Resource;
  token: number | null;
  pip: number;
}

export interface MapRules {
  c1_no_red_adj: boolean;
  c2_no_same_num_adj: boolean;
  c3_no_same_resource_adj: boolean;
  c4_max_vertex_pip: number;
  c5_no_2_12_adj: boolean;
}

export interface ValidationResult {
  ok: boolean;
  violations: string[];
}

export function validateMap(hexes: Hex[], rules: MapRules): ValidationResult {
  const violations: string[] = [];

  for (const hex of hexes) {
    for (const nb of hexes) {
      if (!areNeighbors(hex, nb)) continue;
      if (rules.c1_no_red_adj && isRed(hex.token) && isRed(nb.token)) {
        violations.push(`C1: red ${hex.token} adj ${nb.token}`);
      }
      if (rules.c2_no_same_num_adj && hex.token !== null && hex.token === nb.token) {
        violations.push(`C2: same token ${hex.token} adj`);
      }
      if (rules.c3_no_same_resource_adj && hex.resource === nb.resource && hex.resource !== 'desert') {
        violations.push(`C3: same resource ${hex.resource} adj`);
      }
      if (rules.c5_no_2_12_adj && (hex.token === 2 || hex.token === 12) && (nb.token === 2 || nb.token === 12)) {
        violations.push(`C5: 2/12 adj`);
      }
    }
  }

  // C4: vertex pip sum check (triple-hex intersections)
  const vertices = findVertices(hexes);
  for (const v of vertices) {
    const sumPip = v.reduce((s, h) => s + h.pip, 0);
    if (sumPip > rules.c4_max_vertex_pip) {
      violations.push(`C4: vertex pip sum ${sumPip} > ${rules.c4_max_vertex_pip}`);
    }
  }

  return { ok: violations.length === 0, violations };
}

function findVertices(hexes: Hex[]): Hex[][] {
  const vertices: Hex[][] = [];
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      if (!areNeighbors(hexes[i], hexes[j])) continue;
      for (let k = j + 1; k < hexes.length; k++) {
        if (areNeighbors(hexes[i], hexes[k]) && areNeighbors(hexes[j], hexes[k])) {
          vertices.push([hexes[i], hexes[j], hexes[k]]);
        }
      }
    }
  }
  return vertices;
}
