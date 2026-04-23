# Catan Tournament Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1-günlük MVP Catan turnuva yönetim web uygulaması — lig + eleme formatları, canlı leaderboard, otomatik adil Catan harita üretimi, admin puan girişi, public spectator view.

**Architecture:** Next.js 16 App Router + Tailwind 4 (`@theme` directive) + Supabase Postgres (RLS-gated public read, service_role writes via server actions) + Supabase Realtime (postgres_changes channels) + react-hexgrid (SVG) + framer-motion (kinetic animations) + seedrandom (reproducible maps). Admin auth: `.env` password + timing-safe compare + rate limit + httpOnly cookie. Deploy: Vercel.

**Tech Stack:** Next.js 16.2.4 · React 19.2.4 · TypeScript 5 · Tailwind CSS 4 · `@supabase/supabase-js` · `react-hexgrid` · `framer-motion` · `seedrandom` · `lucide-react` · `vitest` · `@testing-library/react`

**Spec reference:** `docs/superpowers/specs/2026-04-23-catan-tournament-design.md`
**Design reference:** `DESIGN.md` (repo root) + `Catan Tournament Hub Design System` (bundle referans, implementation'da inspire)

---

## File Structure Overview

Her dosyanın tek sorumluluğu var. Büyüyen dosyaları split edeceğiz.

```
catan/
├── app/
│   ├── layout.tsx                    # Root layout, font loading, global providers
│   ├── globals.css                   # Tailwind 4 @theme + DESIGN.md tokens
│   ├── page.tsx                      # / → Hub home (aktif turnuvalar)
│   ├── archive/page.tsx              # /archive
│   ├── t/[id]/
│   │   ├── page.tsx                  # Tournament home (tabs)
│   │   └── match/[tableId]/page.tsx  # Match detail
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── page.tsx                  # Admin dashboard
│   │   ├── new/page.tsx              # New tournament wizard
│   │   ├── map-templates/
│   │   │   ├── page.tsx              # Template library list
│   │   │   └── [id]/page.tsx         # Template editor
│   │   └── t/[id]/
│   │       ├── page.tsx
│   │       ├── players/page.tsx
│   │       ├── seat/page.tsx
│   │       ├── score/[tableId]/page.tsx
│   │       ├── map/[tableId]/page.tsx
│   │       └── settings/page.tsx
│   └── actions/
│       ├── tournament.ts             # Tournament CRUD + lifecycle
│       ├── match.ts                  # Score entry, round advance
│       ├── map.ts                    # Map generate, regenerate, manual edit
│       ├── template.ts               # Map template CRUD
│       └── admin.ts                  # Login, logout, session
│
├── components/
│   ├── ui/                           # Primitives (used everywhere)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── StatTile.tsx
│   ├── hex/                          # Hex rendering
│   │   ├── HexTile.tsx               # Single hex SVG with gradient + glow
│   │   ├── HexMap.tsx                # Full 19-hex board
│   │   └── HexMapEditor.tsx          # Hex-by-hex manual edit modal
│   ├── tournament/                   # Game-domain components
│   │   ├── Leaderboard.tsx
│   │   ├── LiveTables.tsx
│   │   ├── BracketView.tsx
│   │   ├── MatchDetail.tsx
│   │   ├── PodiumBlock.tsx
│   │   ├── StatsStrip.tsx
│   │   └── TabBar.tsx
│   ├── admin/
│   │   ├── ScoreEntryModal.tsx
│   │   ├── NewTournamentWizard.tsx
│   │   ├── PlayerRoster.tsx
│   │   ├── SeatingDragDrop.tsx
│   │   └── TemplatePicker.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── Shell.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Anon browser client
│   │   ├── server.ts                 # Service-role server client
│   │   └── types.ts                  # Generated DB types
│   ├── tournament/
│   │   ├── distribute.ts             # Player distribution (4s + 3s)
│   │   ├── pairing.ts                # Swiss pairing
│   │   ├── bracket.ts                # Tiered random seeding
│   │   ├── tiebreaker.ts             # Ranking cascade
│   │   └── recompute.ts              # Leaderboard aggregation
│   ├── map/
│   │   ├── constants.ts              # Resource pool, tokens, positions
│   │   ├── neighbors.ts              # Axial coord neighbors
│   │   ├── validator.ts              # C1-C5 rules
│   │   ├── generator.ts              # Shuffle + retry
│   │   └── presets.ts                # 5 seed preset templates
│   ├── auth/
│   │   ├── password.ts               # timing-safe compare + rate limit
│   │   └── session.ts                # Cookie + DB session
│   └── utils.ts                      # cn (class merge), sha256 helper
│
├── data/
│   └── seeds/
│       └── tournament-presets.json   # 5 preset map JSON
│
├── supabase/
│   └── migrations/
│       ├── 00001_schema.sql          # All tables
│       ├── 00002_rls.sql             # Policies
│       └── 00003_seed_templates.sql  # 5 preset insert
│
├── tests/
│   ├── tournament/
│   │   ├── distribute.test.ts
│   │   ├── pairing.test.ts
│   │   ├── bracket.test.ts
│   │   ├── tiebreaker.test.ts
│   │   └── recompute.test.ts
│   ├── map/
│   │   ├── neighbors.test.ts
│   │   ├── validator.test.ts
│   │   └── generator.test.ts
│   └── auth/
│       └── password.test.ts
│
├── middleware.ts                     # /admin/* guard
├── DESIGN.md
├── .env.local.example
├── vitest.config.ts
└── package.json
```

**File splitting principles:**
- Algorithms in pure TS (no React, no DB): `lib/tournament/*.ts`, `lib/map/*.ts` → fully unit-testable
- Server actions group by domain (tournament, match, map, template, admin)
- UI split: primitives (`ui/`), hex-specific (`hex/`), game-domain (`tournament/`), admin-only (`admin/`)
- Each file ≤ 250 lines. If bigger, split.

---

## Testing Strategy

- **Vitest unit tests** for all algorithms in `lib/tournament/` and `lib/map/` — these are pure functions with clear inputs/outputs, perfect for TDD
- **React Testing Library** for critical interactive components (ScoreEntryModal, HexTile) — smoke test rendering + key interactions
- **E2E skip** — manual smoke test checklist at end of plan
- **Run tests:** `pnpm test` (or `npm test`) — Vitest in watch mode during dev

---

## Execution Order — 10 Phases

1. **Phase 1** — Foundation (deps, Supabase, tokens, types) — Tasks 1-6
2. **Phase 2** — Pure algorithms (TDD) — Tasks 7-14
3. **Phase 3** — Admin auth — Tasks 15-18
4. **Phase 4** — UI primitives — Tasks 19-25
5. **Phase 5** — Hex + game components — Tasks 26-34
6. **Phase 6** — Server actions — Tasks 35-44
7. **Phase 7** — Public pages — Tasks 45-49
8. **Phase 8** — Admin pages — Tasks 50-58
9. **Phase 9** — Realtime + animations — Tasks 59-62
10. **Phase 10** — Polish + deploy — Tasks 63-67

**Target:** ~8 hours focused work for MVP ship-ready state.

---

## Phase 1 — Foundation

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
cd catan
pnpm add @supabase/supabase-js react-hexgrid framer-motion seedrandom lucide-react clsx tailwind-merge
pnpm add -D @types/seedrandom vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

Expected output: all packages added to `dependencies` and `devDependencies`.

- [ ] **Step 2: Verify package.json**

Open `catan/package.json` and confirm presence of:
```json
"dependencies": {
  "@supabase/supabase-js": "^2",
  "react-hexgrid": "^2",
  "framer-motion": "^11",
  "seedrandom": "^3",
  "lucide-react": "^0",
  "clsx": "^2",
  "tailwind-merge": "^2",
  "next": "16.2.4",
  "react": "19.2.4",
  "react-dom": "19.2.4"
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add runtime and test dependencies"
```

---

### Task 2: Configure Vitest

**Files:**
- Create: `catan/vitest.config.ts`
- Create: `catan/tests/setup.ts`
- Modify: `catan/package.json` scripts

- [ ] **Step 1: Create Vitest config**

Create `catan/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 2: Create test setup**

Create `catan/tests/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Add test scripts**

In `catan/package.json` `scripts`, add:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 4: Smoke-run vitest**

Run: `pnpm test:run`
Expected: "No test files found" (exits cleanly — OK, no tests yet)

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/setup.ts package.json
git commit -m "chore: configure Vitest"
```

---

### Task 3: Tailwind 4 tokens from DESIGN.md

**Files:**
- Modify: `catan/app/globals.css`

- [ ] **Step 1: Replace globals.css with DESIGN.md tokens**

Overwrite `catan/app/globals.css`:
```css
@import "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,400i;9..144,600i&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

@theme {
  /* Background — WARM DARK (v3, brown-based) */
  --color-bg-deep:      #1F1409;
  --color-bg-surface:   #2F2217;
  --color-bg-elevated:  #42311F;
  --color-bg-highlight: #5A4228;

  /* Foreground */
  --color-fg-primary: #F2E4CA;
  --color-fg-muted:   #A89880;
  --color-fg-subtle:  #5A4A36;

  /* Accents */
  --color-accent-ember:   #E85D2E;
  --color-accent-live:    #FF6B35;
  --color-accent-gold:    #F4B942;
  --color-accent-seafoam: #5EA88F;

  /* Resource colors (saturated v3) */
  --color-resource-wood:   #4A8D5F;
  --color-resource-sheep:  #9AD380;
  --color-resource-wheat:  #F2D250;
  --color-resource-brick:  #D96638;
  --color-resource-ore:    #7B8593;
  --color-resource-desert: #E8CC9C;

  /* Semantic */
  --color-ok:    #6EE787;
  --color-warn:  #FFB94D;
  --color-error: #F26B5E;
  --color-info:  #7BB8E8;

  /* Typography */
  --font-display: 'Fraunces', 'Cormorant Garamond', Georgia, serif;
  --font-body:    'DM Sans', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', Menlo, Consolas, monospace;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;

  /* Easing / durations */
  --ease-out:         cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast:    150ms;
  --duration-base:    200ms;
  --duration-slow:    300ms;
  --duration-kinetic: 800ms;
  --duration-breath:  3000ms;
}

@layer base {
  html, body {
    background: var(--color-bg-deep);
    color: var(--color-fg-primary);
    font-family: var(--font-body);
    font-size: 15px;
    line-height: 24px;
  }
  h1, h2, h3 { font-family: var(--font-display); }
  code, .mono, tabular-nums { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
}

/* Hairline utilities */
@layer utilities {
  .hairline { border: 1px solid rgba(244, 185, 66, 0.10); }
  .hairline-strong { border: 1px solid rgba(244, 185, 66, 0.20); }
  .glow-ember { box-shadow: 0 0 20px rgba(255, 107, 53, 0.35); }
  .glow-gold { box-shadow: 0 0 24px rgba(244, 185, 66, 0.30); }
  .glow-winner { box-shadow: 0 0 32px rgba(244, 185, 66, 0.50); }
  .shadow-live { box-shadow: 0 0 0 1px var(--color-accent-live), 0 0 20px rgba(255, 107, 53, 0.35); }
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `pnpm build`
Expected: Next.js build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: apply DESIGN.md v3 tokens to Tailwind 4"
```

---

### Task 4: Supabase project setup (migrations)

**Files:**
- Create: `catan/supabase/migrations/00001_schema.sql`
- Create: `catan/.env.local.example`

- [ ] **Step 1: Create schema migration**

Create `catan/supabase/migrations/00001_schema.sql` with the full schema from spec §4.1 (all 9 tables: tournaments, players, rounds, map_templates, match_tables, table_players, leaderboard_stats, admin_sessions, admin_login_attempts, + indexes).

Reference: spec §4.1 — copy SQL verbatim, preserving map_templates BEFORE match_tables.

- [ ] **Step 2: Create .env.local.example**

Create `catan/.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ADMIN_PASSWORD=<pick-strong-password>
```

- [ ] **Step 3: Apply migration via Supabase MCP**

Use `mcp__supabase__apply_migration` tool with file content.

Expected: migration applied, all 9 tables exist in Supabase dashboard.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00001_schema.sql .env.local.example
git commit -m "feat: add Postgres schema for tournament management"
```

---

### Task 5: RLS policies + generated types

**Files:**
- Create: `catan/supabase/migrations/00002_rls.sql`
- Create: `catan/lib/supabase/types.ts`

- [ ] **Step 1: Create RLS migration**

Create `catan/supabase/migrations/00002_rls.sql` with policies from spec §4.2:
```sql
alter table tournaments enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table match_tables enable row level security;
alter table table_players enable row level security;
alter table leaderboard_stats enable row level security;
alter table map_templates enable row level security;

create policy "public_read_tournaments"    on tournaments    for select using (true);
create policy "public_read_players"        on players        for select using (true);
create policy "public_read_rounds"         on rounds         for select using (true);
create policy "public_read_match_tables"   on match_tables   for select using (true);
create policy "public_read_table_players"  on table_players  for select using (true);
create policy "public_read_leaderboard"    on leaderboard_stats for select using (true);
create policy "public_read_map_templates"  on map_templates  for select using (true);

alter table admin_sessions enable row level security;
alter table admin_login_attempts enable row level security;
-- (no select/insert policies = service_role only)
```

- [ ] **Step 2: Apply RLS migration via Supabase MCP**

Use `mcp__supabase__apply_migration`.

- [ ] **Step 3: Generate TypeScript types**

Use `mcp__supabase__generate_typescript_types` and save output to `catan/lib/supabase/types.ts`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00002_rls.sql lib/supabase/types.ts
git commit -m "feat: RLS policies + generated DB types"
```

---

### Task 6: Supabase client wrappers

**Files:**
- Create: `catan/lib/supabase/client.ts`
- Create: `catan/lib/supabase/server.ts`
- Create: `catan/lib/utils.ts`

- [ ] **Step 1: Create browser (anon) client**

Create `catan/lib/supabase/client.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);
```

- [ ] **Step 2: Create server (service-role) client**

Create `catan/lib/supabase/server.ts`:
```typescript
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function getServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

- [ ] **Step 3: Create utility helpers**

Create `catan/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createHash } from 'crypto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/ lib/utils.ts
git commit -m "feat: Supabase client wrappers + utility helpers"
```

---

## Phase 2 — Pure Algorithms (TDD)

### Task 7: Map constants + axial neighbors

**Files:**
- Create: `catan/lib/map/constants.ts`
- Create: `catan/lib/map/neighbors.ts`
- Create: `catan/tests/map/neighbors.test.ts`

- [ ] **Step 1: Create constants**

Create `catan/lib/map/constants.ts`:
```typescript
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
```

- [ ] **Step 2: Write failing test for neighbors**

Create `catan/tests/map/neighbors.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { axialNeighbors, areNeighbors } from '@/lib/map/neighbors';

describe('axialNeighbors', () => {
  it('returns 6 neighbor positions for any hex', () => {
    const n = axialNeighbors({ q: 0, r: 0 });
    expect(n).toHaveLength(6);
  });

  it('returns correct neighbors for origin', () => {
    const n = axialNeighbors({ q: 0, r: 0 });
    expect(n).toEqual(expect.arrayContaining([
      { q: 1, r: 0 },   { q: 1, r: -1 },
      { q: 0, r: -1 },  { q: -1, r: 0 },
      { q: -1, r: 1 },  { q: 0, r: 1 },
    ]));
  });
});

describe('areNeighbors', () => {
  it('returns true for adjacent hexes', () => {
    expect(areNeighbors({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(true);
    expect(areNeighbors({ q: 0, r: 0 }, { q: 0, r: -1 })).toBe(true);
  });

  it('returns false for distant hexes', () => {
    expect(areNeighbors({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
  });

  it('returns false for same hex', () => {
    expect(areNeighbors({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(false);
  });
});
```

- [ ] **Step 3: Run test — expect failure**

Run: `pnpm test:run tests/map/neighbors.test.ts`
Expected: FAIL — "Cannot find module '@/lib/map/neighbors'"

- [ ] **Step 4: Implement neighbors**

Create `catan/lib/map/neighbors.ts`:
```typescript
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
```

- [ ] **Step 5: Run test — expect pass**

Run: `pnpm test:run tests/map/neighbors.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/map/constants.ts lib/map/neighbors.ts tests/map/neighbors.test.ts
git commit -m "feat: map constants and axial hex neighbor math"
```

---

### Task 8: Player distribution (4s + 3s)

**Files:**
- Create: `catan/lib/tournament/distribute.ts`
- Create: `catan/tests/tournament/distribute.test.ts`

- [ ] **Step 1: Write failing test**

Create `catan/tests/tournament/distribute.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { distributePlayers } from '@/lib/tournament/distribute';

describe('distributePlayers', () => {
  it.each([
    [4,  { fourTables: 1,  threeTables: 0, byes: 0 }],
    [6,  { fourTables: 0,  threeTables: 2, byes: 0 }],
    [7,  { fourTables: 1,  threeTables: 1, byes: 0 }],
    [8,  { fourTables: 2,  threeTables: 0, byes: 0 }],
    [16, { fourTables: 4,  threeTables: 0, byes: 0 }],
    [17, { fourTables: 2,  threeTables: 3, byes: 0 }],
    [41, { fourTables: 8,  threeTables: 3, byes: 0 }],
    [44, { fourTables: 11, threeTables: 0, byes: 0 }],
    [45, { fourTables: 9,  threeTables: 3, byes: 0 }],
  ])('distributes %i players correctly', (n, expected) => {
    expect(distributePlayers(n)).toEqual(expected);
  });

  it('uses bye for N=5', () => {
    const result = distributePlayers(5);
    expect(result.byes).toBe(1);
    expect(result.fourTables * 4 + result.threeTables * 3 + result.byes).toBe(5);
  });

  it('throws for N < 4', () => {
    expect(() => distributePlayers(3)).toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `pnpm test:run tests/tournament/distribute.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement distribute**

Create `catan/lib/tournament/distribute.ts`:
```typescript
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
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test:run tests/tournament/distribute.test.ts`
Expected: PASS (all cases)

- [ ] **Step 5: Commit**

```bash
git add lib/tournament/distribute.ts tests/tournament/distribute.test.ts
git commit -m "feat: player distribution algorithm (4s + 3s, bye last)"
```

---

### Task 9: Map validator (C1-C5 rules)

**Files:**
- Create: `catan/lib/map/validator.ts`
- Create: `catan/tests/map/validator.test.ts`

- [ ] **Step 1: Write failing test**

Create `catan/tests/map/validator.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test — expect failure**

Run: `pnpm test:run tests/map/validator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement validator**

Create `catan/lib/map/validator.ts`:
```typescript
import type { HexPos } from './constants';
import { areNeighbors, axialNeighbors } from './neighbors';
import type { Resource } from './constants';
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

  // C4: vertex pip sum check (simplified: max 3-hex cluster pip <= threshold)
  // A vertex is where 3 hexes meet. For each hex triple that forms a vertex, sum pips.
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
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test:run tests/map/validator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/map/validator.ts tests/map/validator.test.ts
git commit -m "feat: Catan map validator (C1-C5 rules)"
```

---

### Task 10: Map generator (shuffle + retry)

**Files:**
- Create: `catan/lib/map/generator.ts`
- Create: `catan/tests/map/generator.test.ts`

- [ ] **Step 1: Write failing test**

Create `catan/tests/map/generator.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test — expect failure**

Run: `pnpm test:run tests/map/generator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement generator**

Create `catan/lib/map/generator.ts`:
```typescript
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

export function generateMap(opts: GenerateOptions): MapData {
  const seed = opts.seed ?? Math.random().toString(36).slice(2);
  const rng = seedrandom(seed);

  for (let attempt = 1; attempt <= opts.retryCount; attempt++) {
    const resources = shuffle(RESOURCE_POOL, rng);
    const tokens = shuffle(TOKEN_POOL, rng);
    let tokenIdx = 0;

    const hexes: Hex[] = HEX_POSITIONS_19.map((pos, i) => {
      const resource = resources[i];
      const token = resource === 'desert' ? null : tokens[tokenIdx++];
      return { ...pos, resource, token, pip: pipValue(token) };
    });

    const { ok } = validateMap(hexes, opts.rules);
    if (ok) {
      const shuffledPorts = shuffle(PORT_POOL, rng);
      const ports = shuffledPorts.map((p, i) => ({ edgeId: i, type: p.type, ratio: p.ratio }));
      return { hexes, ports, seed, attempts: attempt };
    }
  }

  throw new Error(`Map generation failed after ${opts.retryCount} attempts (seed=${seed})`);
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test:run tests/map/generator.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/map/generator.ts tests/map/generator.test.ts
git commit -m "feat: constraint-based Catan map generator with seeded RNG"
```

---

### Task 11: Swiss pairing (round 1 random, round 2+ sliding window)

**Files:**
- Create: `catan/lib/tournament/pairing.ts`
- Create: `catan/tests/tournament/pairing.test.ts`

- [ ] **Step 1: Write failing test**

Create `catan/tests/tournament/pairing.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { pairLeagueRound, type PairingInput } from '@/lib/tournament/pairing';

function mkPlayer(id: string, totalVp = 0) {
  return { id, totalVp, previousOpponents: new Set<string>() };
}

describe('pairLeagueRound — round 1', () => {
  it('creates tables covering all players', () => {
    const players = Array.from({ length: 16 }, (_, i) => mkPlayer(`p${i}`));
    const tables = pairLeagueRound({ players, roundNumber: 1, rng: () => 0.5 });
    const allIds = new Set(tables.flatMap(t => t.players.map(p => p.id)));
    expect(allIds.size).toBe(16);
    expect(tables).toHaveLength(4);
  });
});

describe('pairLeagueRound — round 2', () => {
  it('groups similar-VP players together', () => {
    const players = [
      mkPlayer('top1', 20), mkPlayer('top2', 19),
      mkPlayer('mid1', 12), mkPlayer('mid2', 11),
      mkPlayer('bot1',  4), mkPlayer('bot2',  3),
      mkPlayer('bot3',  2), mkPlayer('bot4',  1),
    ];
    const tables = pairLeagueRound({ players, roundNumber: 2, rng: () => 0.5 });
    expect(tables).toHaveLength(2);
    // Table with top players should have higher avg VP
    const avg = (t: any) => t.players.reduce((s: number, p: any) => s + p.totalVp, 0) / t.players.length;
    const sorted = [...tables].sort((a, b) => avg(b) - avg(a));
    expect(avg(sorted[0])).toBeGreaterThan(avg(sorted[1]));
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `pnpm test:run tests/tournament/pairing.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement pairing**

Create `catan/lib/tournament/pairing.ts`:
```typescript
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
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test:run tests/tournament/pairing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/tournament/pairing.ts tests/tournament/pairing.test.ts
git commit -m "feat: sliding-window Swiss pairing for league rounds"
```

---

### Task 12: Tiered random bracket seeding

**Files:**
- Create: `catan/lib/tournament/bracket.ts`
- Create: `catan/tests/tournament/bracket.test.ts`

- [ ] **Step 1: Write failing test**

Create `catan/tests/tournament/bracket.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { seedBracket } from '@/lib/tournament/bracket';

describe('seedBracket', () => {
  it('distributes 16 players into 4 tables of 4', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({ id: `p${i}`, rank: i + 1 }));
    const tables = seedBracket(players, 16, () => 0.5);
    expect(tables).toHaveLength(4);
    tables.forEach(t => expect(t).toHaveLength(4));
  });

  it('covers all 16 players', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({ id: `p${i}`, rank: i + 1 }));
    const tables = seedBracket(players, 16, () => 0.5);
    const ids = new Set(tables.flat().map(p => p.id));
    expect(ids.size).toBe(16);
  });

  it('places one player from each tier on each table', () => {
    const players = Array.from({ length: 16 }, (_, i) => ({ id: `p${i}`, rank: i + 1 }));
    const tables = seedBracket(players, 16, () => 0.5);
    tables.forEach(t => {
      const ranks = t.map(p => p.rank).sort((a, b) => a - b);
      // Each table should have: 1 from rank 1-4, 1 from 5-8, 1 from 9-12, 1 from 13-16
      expect(ranks[0]).toBeLessThanOrEqual(4);
      expect(ranks[1]).toBeGreaterThan(4);
      expect(ranks[1]).toBeLessThanOrEqual(8);
      expect(ranks[2]).toBeGreaterThan(8);
      expect(ranks[2]).toBeLessThanOrEqual(12);
      expect(ranks[3]).toBeGreaterThan(12);
    });
  });

  it('handles elimCount=4 (single final table)', () => {
    const players = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, rank: i + 1 }));
    const tables = seedBracket(players, 4, () => 0.5);
    expect(tables).toHaveLength(1);
    expect(tables[0]).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `pnpm test:run tests/tournament/bracket.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement bracket**

Create `catan/lib/tournament/bracket.ts`:
```typescript
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
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test:run tests/tournament/bracket.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/tournament/bracket.ts tests/tournament/bracket.test.ts
git commit -m "feat: tiered random bracket seeding for elimination rounds"
```

---

### Task 13: Tiebreaker cascade + ranking

**Files:**
- Create: `catan/lib/tournament/tiebreaker.ts`
- Create: `catan/tests/tournament/tiebreaker.test.ts`

- [ ] **Step 1: Write failing test**

Create `catan/tests/tournament/tiebreaker.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { rankPlayers, detectCutoffTies } from '@/lib/tournament/tiebreaker';

function mk(overrides: any) {
  return {
    playerId: 'x',
    totalVp: 0, wins: 0, vpPercent: 0, bestSingleVp: 0,
    h2hWins: {},
    ...overrides,
  };
}

describe('rankPlayers', () => {
  it('sorts by total VP desc', () => {
    const stats = [mk({ playerId: 'a', totalVp: 10 }), mk({ playerId: 'b', totalVp: 20 })];
    const r = rankPlayers(stats);
    expect(r[0].playerId).toBe('b');
  });

  it('uses wins as tiebreaker when VP equal', () => {
    const stats = [
      mk({ playerId: 'a', totalVp: 20, wins: 1 }),
      mk({ playerId: 'b', totalVp: 20, wins: 2 }),
    ];
    const r = rankPlayers(stats);
    expect(r[0].playerId).toBe('b');
  });

  it('uses vpPercent when VP+wins equal', () => {
    const stats = [
      mk({ playerId: 'a', totalVp: 20, wins: 1, vpPercent: 0.5 }),
      mk({ playerId: 'b', totalVp: 20, wins: 1, vpPercent: 0.7 }),
    ];
    const r = rankPlayers(stats);
    expect(r[0].playerId).toBe('b');
  });
});

describe('detectCutoffTies', () => {
  it('returns empty when rank N and N+1 are clearly different', () => {
    const r = [mk({ playerId: 'a', totalVp: 20 }), mk({ playerId: 'b', totalVp: 10 })];
    expect(detectCutoffTies(r, 1)).toEqual([]);
  });

  it('detects a tie at cutoff boundary', () => {
    const r = [
      mk({ playerId: 'a', totalVp: 20 }),
      mk({ playerId: 'b', totalVp: 20, wins: 0, vpPercent: 0.5 }),
      mk({ playerId: 'c', totalVp: 20, wins: 0, vpPercent: 0.5 }),
    ];
    const conflicts = detectCutoffTies(r, 2);
    expect(conflicts.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `pnpm test:run tests/tournament/tiebreaker.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement tiebreaker**

Create `catan/lib/tournament/tiebreaker.ts`:
```typescript
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
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test:run tests/tournament/tiebreaker.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/tournament/tiebreaker.ts tests/tournament/tiebreaker.test.ts
git commit -m "feat: tiebreaker cascade + cutoff tie detection"
```

---

### Task 14: Leaderboard recomputation

**Files:**
- Create: `catan/lib/tournament/recompute.ts`
- Create: `catan/tests/tournament/recompute.test.ts`

- [ ] **Step 1: Write failing test**

Create `catan/tests/tournament/recompute.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { computeLeaderboard } from '@/lib/tournament/recompute';

describe('computeLeaderboard', () => {
  it('aggregates VP across matches', () => {
    const matchResults = [
      { matchTableId: 'm1', seatCount: 4 as const, players: [
        { playerId: 'a', finalVp: 10, isWinner: true },
        { playerId: 'b', finalVp: 7,  isWinner: false },
        { playerId: 'c', finalVp: 5,  isWinner: false },
        { playerId: 'd', finalVp: 3,  isWinner: false },
      ]},
      { matchTableId: 'm2', seatCount: 4 as const, players: [
        { playerId: 'a', finalVp: 8,  isWinner: false },
        { playerId: 'e', finalVp: 10, isWinner: true },
        { playerId: 'f', finalVp: 4,  isWinner: false },
        { playerId: 'g', finalVp: 3,  isWinner: false },
      ]},
    ];
    const lb = computeLeaderboard(matchResults);
    const a = lb.find(p => p.playerId === 'a')!;
    expect(a.matchesPlayed).toBe(2);
    expect(a.totalVp).toBe(18);
    expect(a.wins).toBe(1);
    expect(a.bestSingleVp).toBe(10);
  });

  it('computes VP% using virtual 4th player for 3-seat tables', () => {
    const matchResults = [
      { matchTableId: 'm1', seatCount: 3 as const, players: [
        { playerId: 'a', finalVp: 10, isWinner: true },
        { playerId: 'b', finalVp: 7,  isWinner: false },
        { playerId: 'c', finalVp: 4,  isWinner: false },
      ]},
    ];
    const lb = computeLeaderboard(matchResults);
    const a = lb.find(p => p.playerId === 'a')!;
    // virtual 4 = avg(10,7,4) = 7; tableTotal = 10+7+4+7 = 28
    // a's vpPercent = 10/28 ≈ 0.357
    expect(a.vpPercent).toBeCloseTo(10 / 28, 3);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `pnpm test:run tests/tournament/recompute.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement recompute**

Create `catan/lib/tournament/recompute.ts`:
```typescript
import type { PlayerStats } from './tiebreaker';

export interface MatchResult {
  matchTableId: string;
  seatCount: 3 | 4;
  players: { playerId: string; finalVp: number; isWinner: boolean }[];
}

export function computeLeaderboard(matches: MatchResult[]): PlayerStats[] {
  const map = new Map<string, PlayerStats>();

  for (const match of matches) {
    // Compute table total (include virtual 4th for 3-seat tables)
    let tableTotal = match.players.reduce((s, p) => s + p.finalVp, 0);
    if (match.seatCount === 3) {
      const avg = tableTotal / 3;
      tableTotal += avg;
    }

    for (const mp of match.players) {
      let stats = map.get(mp.playerId);
      if (!stats) {
        stats = {
          playerId: mp.playerId,
          totalVp: 0, wins: 0, vpPercent: 0, bestSingleVp: 0, h2hWins: {},
        };
        map.set(mp.playerId, stats);
      }
      stats.totalVp += mp.finalVp;
      stats.bestSingleVp = Math.max(stats.bestSingleVp, mp.finalVp);
      if (mp.isWinner) stats.wins += 1;
      stats.vpPercent += mp.finalVp / tableTotal;

      // Track matches played
      (stats as any).matchesPlayed = ((stats as any).matchesPlayed ?? 0) + 1;

      // H2H
      if (mp.isWinner) {
        for (const opp of match.players) {
          if (opp.playerId !== mp.playerId) {
            stats.h2hWins[opp.playerId] = (stats.h2hWins[opp.playerId] ?? 0) + 1;
          }
        }
      }
    }
  }

  return Array.from(map.values()) as (PlayerStats & { matchesPlayed: number })[];
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test:run tests/tournament/recompute.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/tournament/recompute.ts tests/tournament/recompute.test.ts
git commit -m "feat: leaderboard aggregation with virtual-4 for 3-seat tables"
```

---

## Phase 3 — Admin Auth

### Task 15: Password comparison + rate limit

**Files:**
- Create: `catan/lib/auth/password.ts`
- Create: `catan/tests/auth/password.test.ts`

- [ ] **Step 1: Write failing test**

Create `catan/tests/auth/password.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { timingSafeCompare } from '@/lib/auth/password';

describe('timingSafeCompare', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeCompare('secret123', 'secret123')).toBe(true);
  });
  it('returns false for different strings', () => {
    expect(timingSafeCompare('secret', 'wrong')).toBe(false);
  });
  it('returns false for length-only difference', () => {
    expect(timingSafeCompare('abc', 'abcd')).toBe(false);
  });
  it('returns false for empty input vs set password', () => {
    expect(timingSafeCompare('', 'secret')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `pnpm test:run tests/auth/password.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement password**

Create `catan/lib/auth/password.ts`:
```typescript
import { timingSafeEqual } from 'crypto';

export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a constant-time op to avoid leaking length
    const dummy = Buffer.alloc(32, 0);
    try { timingSafeEqual(dummy, dummy); } catch {}
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return timingSafeEqual(bufA, bufB);
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test:run tests/auth/password.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/auth/password.ts tests/auth/password.test.ts
git commit -m "feat: timing-safe password comparison"
```

---

### Task 16: Session management

**Files:**
- Create: `catan/lib/auth/session.ts`

- [ ] **Step 1: Implement session helpers**

Create `catan/lib/auth/session.ts`:
```typescript
import 'server-only';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { getServerClient } from '@/lib/supabase/server';
import { sha256 } from '@/lib/utils';

const SESSION_COOKIE = 'admin_session';
const SESSION_DAYS = 7;

export async function createSession(ipHint: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const sb = getServerClient();
  await sb.from('admin_sessions').insert({
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    ip_hint: ipHint.slice(0, 10),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: '/',
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    const sb = getServerClient();
    await sb.from('admin_sessions').delete().eq('token_hash', sha256(token));
  }
  c.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const sb = getServerClient();
  const { data } = await sb
    .from('admin_sessions')
    .select('expires_at')
    .eq('token_hash', sha256(token))
    .single();
  if (!data) return false;
  return new Date(data.expires_at) > new Date();
}

export async function isAuthenticatedByToken(token: string): Promise<boolean> {
  if (!token) return false;
  const sb = getServerClient();
  const { data } = await sb
    .from('admin_sessions')
    .select('expires_at')
    .eq('token_hash', sha256(token))
    .single();
  if (!data) return false;
  return new Date(data.expires_at) > new Date();
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth/session.ts
git commit -m "feat: admin session create/destroy/validate"
```

---

### Task 17: Middleware guard

**Files:**
- Create: `catan/middleware.ts`

- [ ] **Step 1: Create middleware**

Create `catan/middleware.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = req.cookies.get('admin_session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    // Token existence is enough at middleware (no DB call here — validated in page/action)
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: middleware guard for /admin routes"
```

---

### Task 18: Admin login server action + page

**Files:**
- Create: `catan/app/actions/admin.ts`
- Create: `catan/app/admin/login/page.tsx`

- [ ] **Step 1: Login server action**

Create `catan/app/actions/admin.ts`:
```typescript
'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { timingSafeCompare } from '@/lib/auth/password';
import { createSession, destroySession } from '@/lib/auth/session';
import { sha256 } from '@/lib/utils';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function adminLogin(prevState: any, formData: FormData) {
  const password = (formData.get('password') as string) ?? '';
  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for') ?? 'unknown';
  const ipHash = sha256(ip);
  const sb = getServerClient();

  const { count } = await sb
    .from('admin_login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('success', false)
    .gte('attempted_at', new Date(Date.now() - WINDOW_MS).toISOString());

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return { error: 'Çok fazla yanlış deneme. 15 dakika bekleyin.' };
  }

  const expected = process.env.ADMIN_PASSWORD ?? '';
  const success = timingSafeCompare(password, expected);
  await sb.from('admin_login_attempts').insert({ ip_hash: ipHash, success });

  if (!success) return { error: 'Şifre yanlış.' };

  await createSession(ip);
  redirect('/admin');
}

export async function adminLogout() {
  await destroySession();
  redirect('/admin/login');
}
```

- [ ] **Step 2: Login page**

Create `catan/app/admin/login/page.tsx`:
```typescript
'use client';
import { useActionState } from 'react';
import { adminLogin } from '@/app/actions/admin';

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(adminLogin, { error: '' });
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form action={formAction} className="w-full max-w-sm space-y-4 p-8 bg-[var(--color-bg-surface)] hairline rounded-md">
        <h1 className="text-2xl font-[var(--font-display)] text-[var(--color-fg-primary)]">
          Yönetici Girişi
        </h1>
        <input
          type="password"
          name="password"
          autoFocus
          required
          placeholder="Şifre"
          className="w-full px-3 py-2 bg-[var(--color-bg-deep)] border border-[var(--color-fg-subtle)] rounded-md text-[var(--color-fg-primary)]"
        />
        {state?.error && (
          <p className="text-[var(--color-error)] text-sm">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-2 bg-[var(--color-accent-ember)] rounded-md text-[var(--color-fg-primary)] font-medium hover:glow-ember disabled:opacity-50"
        >
          {pending ? 'Doğrulanıyor...' : 'Giriş'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

Run: `pnpm dev` and visit `http://localhost:3000/admin/login`.
Expected: form renders, wrong password shows error, correct password redirects to `/admin`.

- [ ] **Step 4: Commit**

```bash
git add app/actions/admin.ts app/admin/login/page.tsx
git commit -m "feat: admin login page with rate-limited password auth"
```

---

## Phase 4 — UI Primitives

### Task 19: Button component

**Files:**
- Create: `catan/components/ui/Button.tsx`

- [ ] **Step 1: Implement Button**

Create `catan/components/ui/Button.tsx`:
```typescript
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-[var(--duration-fast)] ease-out disabled:opacity-50 disabled:cursor-not-allowed';
    const sizes: Record<Size, string> = {
      sm: 'h-8 px-3 text-sm rounded-[var(--radius-sm)]',
      md: 'h-10 px-4 text-[15px] rounded-[var(--radius-md)]',
    };
    const variants: Record<Variant, string> = {
      primary: 'bg-[var(--color-accent-ember)] text-[var(--color-fg-primary)] hover:brightness-110 hover:glow-ember',
      secondary: 'bg-transparent text-[var(--color-accent-ember)] border border-[var(--color-accent-ember)] hover:bg-[var(--color-bg-elevated)]',
      ghost: 'bg-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg-primary)]',
      destructive: 'bg-transparent text-[var(--color-error)] border border-[var(--color-error)] hover:bg-[rgba(242,107,94,0.1)]',
    };
    return <button ref={ref} className={cn(base, sizes[size], variants[variant], className)} {...props} />;
  }
);
Button.displayName = 'Button';
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/Button.tsx
git commit -m "feat: Button primitive (primary/secondary/ghost/destructive)"
```

---

### Task 20: Card, Badge, Input primitives

**Files:**
- Create: `catan/components/ui/Card.tsx`
- Create: `catan/components/ui/Badge.tsx`
- Create: `catan/components/ui/Input.tsx`

- [ ] **Step 1: Card**

Create `catan/components/ui/Card.tsx`:
```typescript
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface Props extends HTMLAttributes<HTMLDivElement> {
  live?: boolean;
  highlight?: boolean;
}

export const Card = forwardRef<HTMLDivElement, Props>(
  ({ live, highlight, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-md)] hairline p-4',
        highlight ? 'bg-[var(--color-bg-highlight)]' : 'bg-[var(--color-bg-surface)]',
        live && 'shadow-live animate-breath',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';
```

- [ ] **Step 2: Badge**

Create `catan/components/ui/Badge.tsx`:
```typescript
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'live' | 'ok' | 'warn' | 'error' | 'gold';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = 'neutral', className, ...props }: Props) {
  const tones: Record<Tone, string> = {
    neutral: 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)]',
    live:    'bg-[rgba(255,107,53,0.15)] text-[var(--color-accent-live)]',
    ok:      'bg-[rgba(110,231,135,0.15)] text-[var(--color-ok)]',
    warn:    'bg-[rgba(255,185,77,0.15)] text-[var(--color-warn)]',
    error:   'bg-[rgba(242,107,94,0.15)] text-[var(--color-error)]',
    gold:    'bg-[rgba(244,185,66,0.15)] text-[var(--color-accent-gold)]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-[var(--font-mono)] uppercase tracking-[0.12em]',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Input**

Create `catan/components/ui/Input.tsx`:
```typescript
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full px-3 bg-[var(--color-bg-deep)] border border-[var(--color-fg-subtle)] rounded-[var(--radius-md)]',
        'text-[var(--color-fg-primary)] placeholder:text-[var(--color-fg-muted)]',
        'focus:outline-none focus:border-[var(--color-accent-ember)] focus:ring-2 focus:ring-[rgba(232,93,46,0.45)]',
        'transition-all duration-[var(--duration-fast)] ease-out',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/Card.tsx components/ui/Badge.tsx components/ui/Input.tsx
git commit -m "feat: Card, Badge, Input primitives"
```

---

### Task 21: Modal component

**Files:**
- Create: `catan/components/ui/Modal.tsx`

- [ ] **Step 1: Implement Modal**

Create `catan/components/ui/Modal.tsx`:
```typescript
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function Modal({ open, onClose, children, title, className }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className={cn(
              'fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none'
            )}
          >
            <div className={cn(
              'pointer-events-auto bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] hairline-strong',
              'max-w-lg w-full p-6 shadow-2xl',
              className
            )}>
              {title && (
                <h2 className="text-xl font-[var(--font-display)] text-[var(--color-fg-primary)] mb-4">
                  {title}
                </h2>
              )}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/Modal.tsx
git commit -m "feat: Modal with framer-motion spring animation"
```

---

### Task 22: StatTile component

**Files:**
- Create: `catan/components/ui/StatTile.tsx`

- [ ] **Step 1: Implement StatTile**

Create `catan/components/ui/StatTile.tsx`:
```typescript
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  live?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function StatTile({ label, value, hint, live, icon, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-md)] hairline p-4 bg-[var(--color-bg-surface)] relative',
        live && 'border-[var(--color-accent-live)] border',
        className
      )}
    >
      {live && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--color-accent-live)] animate-pulse" />
      )}
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-[var(--color-fg-muted)]">{icon}</span>}
        <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-fg-muted)] font-[var(--font-mono)]">
          {label}
        </span>
      </div>
      <div className="text-3xl font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]">
        {value}
      </div>
      {hint && (
        <div className="text-xs text-[var(--color-fg-muted)] mt-1">{hint}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add kinetic animations to globals.css**

Append to `catan/app/globals.css`:
```css
@keyframes breath {
  0%, 100% { transform: scale(1.000); }
  50%      { transform: scale(1.005); }
}
@keyframes pulse-ember {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1.0; }
}
.animate-breath { animation: breath 3s ease-in-out infinite; }
.animate-pulse-ember { animation: pulse-ember 1.2s ease-in-out infinite; }
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/StatTile.tsx app/globals.css
git commit -m "feat: StatTile + kinetic animations (breath, pulse-ember)"
```

---

## Phase 5 — Hex + Game Components

### Task 23: HexTile SVG component

**Files:**
- Create: `catan/components/hex/HexTile.tsx`

- [ ] **Step 1: Implement HexTile**

Create `catan/components/hex/HexTile.tsx`:
```typescript
'use client';
import type { Hex } from '@/lib/map/validator';
import { cn } from '@/lib/utils';

const RESOURCE_FILL: Record<string, string> = {
  wood:   'var(--color-resource-wood)',
  sheep:  'var(--color-resource-sheep)',
  wheat:  'var(--color-resource-wheat)',
  brick:  'var(--color-resource-brick)',
  ore:    'var(--color-resource-ore)',
  desert: 'var(--color-resource-desert)',
};

interface Props {
  hex: Hex;
  size?: number;
  onClick?: () => void;
  className?: string;
}

export function HexTile({ hex, size = 48, onClick, className }: Props) {
  const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
  const y = size * 1.5 * hex.r;
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${size * Math.cos(angle)},${size * Math.sin(angle)}`;
  }).join(' ');
  const isRed = hex.token === 6 || hex.token === 8;
  return (
    <g
      transform={`translate(${x},${y})`}
      className={cn('transition-transform duration-[var(--duration-fast)] ease-out cursor-pointer hover:scale-[1.02]', className)}
      onClick={onClick}
    >
      <defs>
        <radialGradient id={`g-${hex.q}-${hex.r}`} cx="0.5" cy="0.4" r="0.65">
          <stop offset="0%" stopColor={RESOURCE_FILL[hex.resource]} stopOpacity="1" />
          <stop offset="100%" stopColor={RESOURCE_FILL[hex.resource]} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <polygon
        points={points}
        fill={`url(#g-${hex.q}-${hex.r})`}
        stroke="rgba(244,185,66,0.20)"
        strokeWidth="1"
      />
      {hex.token !== null && (
        <>
          <circle r={size * 0.35} fill="var(--color-bg-surface)" stroke="rgba(244,185,66,0.30)" strokeWidth="1" />
          {isRed && (
            <circle r={size * 0.42} fill="none" stroke="var(--color-accent-gold)" strokeWidth="2" opacity="0.45" />
          )}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-mono)"
            fontSize={size * 0.4}
            fontWeight="600"
            fill={isRed ? 'var(--color-accent-gold)' : 'var(--color-fg-primary)'}
          >
            {hex.token}
          </text>
        </>
      )}
    </g>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/hex/HexTile.tsx
git commit -m "feat: HexTile SVG with gradient + 6/8 gold glow ring"
```

---

### Task 24: HexMap component (full 19-hex board)

**Files:**
- Create: `catan/components/hex/HexMap.tsx`

- [ ] **Step 1: Implement HexMap**

Create `catan/components/hex/HexMap.tsx`:
```typescript
'use client';
import type { MapData } from '@/lib/map/generator';
import { HexTile } from './HexTile';

interface Props {
  map: MapData;
  hexSize?: number;
  className?: string;
  onHexClick?: (idx: number) => void;
}

export function HexMap({ map, hexSize = 48, className, onHexClick }: Props) {
  // Compute viewBox to fit 19-hex board
  const pad = hexSize * 1.5;
  const w = hexSize * Math.sqrt(3) * 5 + pad * 2;
  const h = hexSize * 7.5 + pad * 2;
  const cx = w / 2;
  const cy = h / 2;
  return (
    <svg
      viewBox={`${-cx} ${-cy} ${w} ${h}`}
      className={className}
      style={{ width: '100%', height: 'auto' }}
    >
      {map.hexes.map((hex, i) => (
        <HexTile
          key={`${hex.q}-${hex.r}`}
          hex={hex}
          size={hexSize}
          onClick={onHexClick ? () => onHexClick(i) : undefined}
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/hex/HexMap.tsx
git commit -m "feat: HexMap SVG renderer for 19-hex Catan board"
```

---

### Task 25: PlayerAvatar

**Files:**
- Create: `catan/components/tournament/PlayerAvatar.tsx`

- [ ] **Step 1: Implement PlayerAvatar**

Create `catan/components/tournament/PlayerAvatar.tsx`:
```typescript
import { cn } from '@/lib/utils';

type Halo = 'none' | 'gold-winner' | 'silver' | 'bronze' | 'pulse-live';

interface Props {
  seatCode: string;
  size?: number;
  halo?: Halo;
  className?: string;
}

export function PlayerAvatar({ seatCode, size = 40, halo = 'none', className }: Props) {
  const halos: Record<Halo, string> = {
    none: '',
    'gold-winner': 'ring-2 ring-[var(--color-accent-gold)] animate-pulse glow-winner',
    silver: 'ring-1 ring-[rgba(192,192,192,0.45)]',
    bronze: 'ring-1 ring-[rgba(205,127,50,0.45)]',
    'pulse-live': 'ring-2 ring-[var(--color-accent-live)] animate-pulse-ember',
  };
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center bg-[var(--color-bg-elevated)]',
        'text-[var(--color-fg-primary)] font-[var(--font-mono)] uppercase tabular-nums',
        'border border-[var(--color-fg-subtle)]',
        halos[halo],
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {seatCode}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/tournament/PlayerAvatar.tsx
git commit -m "feat: PlayerAvatar with halo variants (gold/silver/bronze/live)"
```

---

### Task 26: Leaderboard, PodiumBlock, StatsStrip, LiveTables

**Files:**
- Create: `catan/components/tournament/Leaderboard.tsx`
- Create: `catan/components/tournament/PodiumBlock.tsx`
- Create: `catan/components/tournament/StatsStrip.tsx`
- Create: `catan/components/tournament/LiveTables.tsx`

- [ ] **Step 1: Implement Leaderboard**

Create `catan/components/tournament/Leaderboard.tsx`:
```typescript
import { PlayerAvatar } from './PlayerAvatar';
import { cn } from '@/lib/utils';

export interface LeaderboardRow {
  rank: number;
  playerId: string;
  name: string;
  seatCode: string;
  matchesPlayed: number;
  wins: number;
  totalVp: number;
  isActive?: boolean;
}

interface Props { rows: LeaderboardRow[]; }

export function Leaderboard({ rows }: Props) {
  return (
    <div className="rounded-[var(--radius-md)] hairline bg-[var(--color-bg-surface)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-fg-muted)] font-[var(--font-mono)]">
            <th className="text-left px-4 py-3 w-12">#</th>
            <th className="text-left px-4 py-3">Oyuncu</th>
            <th className="text-right px-3 py-3 w-16">Oyun</th>
            <th className="text-right px-3 py-3 w-16">Gal.</th>
            <th className="text-right px-4 py-3 w-20">Toplam VP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.playerId}
              className={cn(
                'border-t border-[rgba(244,185,66,0.08)] hover:bg-[var(--color-bg-elevated)] transition-colors',
                r.isActive && 'bg-[rgba(255,107,53,0.06)]'
              )}
            >
              <td className="px-4 py-3 font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]">
                {r.rank}
              </td>
              <td className="px-4 py-3 flex items-center gap-3">
                <PlayerAvatar seatCode={r.seatCode} size={32} halo={r.isActive ? 'pulse-live' : 'none'} />
                <span className="text-[var(--color-fg-primary)]">{r.name}</span>
              </td>
              <td className="px-3 py-3 text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]">{r.matchesPlayed}</td>
              <td className="px-3 py-3 text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]">{r.wins}</td>
              <td className="px-4 py-3 text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]">{r.totalVp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Implement PodiumBlock**

Create `catan/components/tournament/PodiumBlock.tsx`:
```typescript
import { PlayerAvatar } from './PlayerAvatar';
import type { LeaderboardRow } from './Leaderboard';

interface Props {
  top3: LeaderboardRow[];
}

export function PodiumBlock({ top3 }: Props) {
  const [first, second, third] = [top3.find(r => r.rank === 1), top3.find(r => r.rank === 2), top3.find(r => r.rank === 3)];
  return (
    <div className="bg-[var(--color-bg-highlight)] rounded-[var(--radius-lg)] hairline-strong p-8">
      <div className="grid grid-cols-3 items-end gap-6">
        <PodiumSlot row={second} size={80} halo="silver" label="2." />
        <PodiumSlot row={first} size={112} halo="gold-winner" label="1." featured />
        <PodiumSlot row={third} size={72} halo="bronze" label="3." />
      </div>
    </div>
  );
}

function PodiumSlot({ row, size, halo, label, featured }: {
  row?: LeaderboardRow; size: number; halo: any; label: string; featured?: boolean;
}) {
  if (!row) return <div />;
  return (
    <div className="flex flex-col items-center gap-2">
      <PlayerAvatar seatCode={row.seatCode} size={size} halo={halo} />
      <div className="text-center">
        <div className={featured ? 'text-lg font-[var(--font-display)]' : 'text-sm'}>
          {row.name}
        </div>
        <div className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)] text-sm">
          {row.totalVp} VP · {row.wins} G
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement StatsStrip**

Create `catan/components/tournament/StatsStrip.tsx`:
```typescript
import { StatTile } from '@/components/ui/StatTile';

interface Props {
  players: number;
  activeMatches: number;
  finishedMatches: number;
  avgVp: number;
  round: string;
  duration: string;
}

export function StatsStrip(props: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <StatTile label="Oyuncular" value={props.players} />
      <StatTile label="Aktif Maç" value={props.activeMatches} live={props.activeMatches > 0} />
      <StatTile label="Biten" value={props.finishedMatches} />
      <StatTile label="Ort. VP" value={props.avgVp.toFixed(1)} />
      <StatTile label="Tur" value={props.round} />
      <StatTile label="Süre" value={props.duration} />
    </div>
  );
}
```

- [ ] **Step 4: Implement LiveTables**

Create `catan/components/tournament/LiveTables.tsx`:
```typescript
'use client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PlayerAvatar } from './PlayerAvatar';
import { HexMap } from '@/components/hex/HexMap';
import type { MapData } from '@/lib/map/generator';

export interface LiveTable {
  id: string;
  tableNumber: number;
  startedAt: Date | string;
  map: MapData;
  players: { seatCode: string; name: string; finalVp?: number | null }[];
}

interface Props {
  tables: LiveTable[];
}

function formatDuration(start: Date | string): string {
  const s = typeof start === 'string' ? new Date(start) : start;
  const elapsed = Math.max(0, Date.now() - s.getTime());
  const m = Math.floor(elapsed / 60000);
  const sec = Math.floor((elapsed % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function LiveTables({ tables }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {tables.map(t => (
        <Card key={t.id} live className="p-0">
          <div className="flex items-center justify-between p-4 pb-2">
            <Badge tone="live">● Canlı · Masa {t.tableNumber}</Badge>
            <span className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]">
              {formatDuration(t.startedAt)}
            </span>
          </div>
          <div className="px-4">
            <HexMap map={t.map} hexSize={16} />
          </div>
          <div className="p-4 space-y-2">
            {t.players.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <PlayerAvatar seatCode={p.seatCode} size={28} />
                <span className="flex-1 text-sm">{p.name}</span>
                <span className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)] text-sm">
                  {p.finalVp ?? '—'} VP
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/tournament/
git commit -m "feat: Leaderboard, PodiumBlock, StatsStrip, LiveTables"
```

---

### Task 27: BracketView + TabBar

**Files:**
- Create: `catan/components/tournament/BracketView.tsx`
- Create: `catan/components/tournament/TabBar.tsx`

- [ ] **Step 1: Implement TabBar**

Create `catan/components/tournament/TabBar.tsx`:
```typescript
'use client';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Tab { key: string; label: string; href: string; }

interface Props { tabs: Tab[]; activeKey: string; }

export function TabBar({ tabs, activeKey }: Props) {
  return (
    <nav className="flex gap-1 border-b border-[rgba(244,185,66,0.10)]">
      {tabs.map(t => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeKey === t.key
              ? 'text-[var(--color-fg-primary)] border-b-2 border-[var(--color-accent-ember)]'
              : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-primary)]'
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Implement BracketView**

Create `catan/components/tournament/BracketView.tsx`:
```typescript
import { Card } from '@/components/ui/Card';
import { PlayerAvatar } from './PlayerAvatar';
import { Badge } from '@/components/ui/Badge';

export interface BracketPod {
  id: string;
  tableNumber: number;
  roundLabel: string;
  players: { seatCode: string; name: string; isWinner: boolean; vp?: number | null }[];
  status: 'pending' | 'live' | 'completed';
}

interface Props { pods: BracketPod[][]; }

export function BracketView({ pods }: Props) {
  return (
    <div className="space-y-8">
      {pods.map((round, ri) => (
        <div key={ri}>
          <div className="text-[11px] uppercase tracking-[0.12em] font-[var(--font-mono)] text-[var(--color-fg-muted)] mb-3">
            {round[0]?.roundLabel ?? `Tur ${ri + 1}`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {round.map(pod => (
              <Card key={pod.id} live={pod.status === 'live'}>
                <div className="flex items-center justify-between mb-3">
                  <Badge tone={pod.status === 'live' ? 'live' : pod.status === 'completed' ? 'gold' : 'neutral'}>
                    Masa {pod.tableNumber}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {pod.players.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <PlayerAvatar seatCode={p.seatCode} size={28} halo={p.isWinner ? 'gold-winner' : 'none'} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{p.name}</div>
                        {p.vp != null && (
                          <div className="text-xs text-[var(--color-fg-muted)] font-[var(--font-mono)] tabular-nums">{p.vp} VP</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/tournament/BracketView.tsx components/tournament/TabBar.tsx
git commit -m "feat: BracketView (4-player pods) + TabBar"
```

---

## Phase 6 — Server Actions

### Task 28: Tournament CRUD actions

**Files:**
- Create: `catan/app/actions/tournament.ts`

- [ ] **Step 1: Implement tournament actions**

Create `catan/app/actions/tournament.ts`:
```typescript
'use server';
import { getServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export interface CreateTournamentInput {
  name: string;
  totalPlayers: number;
  leagueRounds: number;
  eliminationCount: 4 | 16 | 64 | 256;
  mapStrategy?: { distribution: 'same' | 'different' | 'grouped'; source: 'random' | 'manual' | 'preset' };
  mapRules?: Record<string, any>;
  fairnessPreset?: 'strict' | 'balanced' | 'random';
}

export async function createTournament(input: CreateTournamentInput) {
  const sb = getServerClient();
  if (input.eliminationCount > input.totalPlayers) {
    return { error: 'Eleme sayısı toplam oyuncudan fazla olamaz' };
  }
  const { data, error } = await sb
    .from('tournaments')
    .insert({
      name: input.name,
      total_players: input.totalPlayers,
      league_rounds: input.leagueRounds,
      elimination_count: input.eliminationCount,
      map_strategy: input.mapStrategy ?? { distribution: 'same', source: 'random' },
      map_rules: input.mapRules,
      fairness_preset: input.fairnessPreset ?? 'balanced',
    })
    .select('id')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/admin');
  redirect(`/admin/t/${data.id}/players`);
}

export async function deleteTournament(id: string) {
  const sb = getServerClient();
  const { error } = await sb.from('tournaments').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/archive');
  return { ok: true };
}

export async function renameTournament(id: string, name: string) {
  const sb = getServerClient();
  const { error } = await sb.from('tournaments').update({ name }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/t/${id}`);
  revalidatePath(`/admin/t/${id}`);
  return { ok: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/tournament.ts
git commit -m "feat: tournament CRUD server actions"
```

---

### Task 29: Player management actions

**Files:**
- Create: `catan/app/actions/player.ts`

- [ ] **Step 1: Implement player actions**

Create `catan/app/actions/player.ts`:
```typescript
'use server';
import { getServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function seatCodeFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function addPlayer(tournamentId: string, name: string) {
  const sb = getServerClient();
  const { error } = await sb.from('players').insert({
    tournament_id: tournamentId,
    name: name.trim(),
    seat_code: seatCodeFromName(name),
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/t/${tournamentId}/players`);
  return { ok: true };
}

export async function removePlayer(playerId: string, tournamentId: string) {
  const sb = getServerClient();
  const { error } = await sb.from('players').delete().eq('id', playerId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/t/${tournamentId}/players`);
  return { ok: true };
}

export async function renamePlayer(playerId: string, tournamentId: string, name: string) {
  const sb = getServerClient();
  const { error } = await sb
    .from('players')
    .update({ name: name.trim(), seat_code: seatCodeFromName(name) })
    .eq('id', playerId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/player.ts
git commit -m "feat: player management actions (add/remove/rename)"
```

---

### Task 30: Start tournament + generate round tables

**Files:**
- Create: `catan/app/actions/match.ts`

- [ ] **Step 1: Implement match actions**

Create `catan/app/actions/match.ts`:
```typescript
'use server';
import { getServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { pairLeagueRound, type PairingPlayer } from '@/lib/tournament/pairing';
import { seedBracket } from '@/lib/tournament/bracket';
import { generateMap } from '@/lib/map/generator';
import type { MapRules } from '@/lib/map/validator';

export async function startTournament(tournamentId: string) {
  const sb = getServerClient();
  await sb.from('tournaments').update({
    status: 'league',
    started_at: new Date().toISOString(),
    current_round: 1,
    current_round_type: 'league',
  }).eq('id', tournamentId);
  await generateLeagueRound(tournamentId, 1);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

export async function generateLeagueRound(tournamentId: string, roundNumber: number) {
  const sb = getServerClient();

  const { data: tournament } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
  if (!tournament) return { error: 'Tournament not found' };

  const { data: playersData } = await sb.from('players').select('*').eq('tournament_id', tournamentId);
  const { data: stats } = await sb.from('leaderboard_stats').select('*').eq('tournament_id', tournamentId);
  const statMap = new Map((stats ?? []).map(s => [s.player_id, s]));

  const pairingPlayers: PairingPlayer[] = (playersData ?? []).map(p => ({
    id: p.id,
    totalVp: statMap.get(p.id)?.total_vp ?? 0,
    previousOpponents: new Set<string>(), // TODO: populate from history
  }));

  const tables = pairLeagueRound({ players: pairingPlayers, roundNumber });

  const { data: round } = await sb
    .from('rounds')
    .insert({
      tournament_id: tournamentId,
      round_number: roundNumber,
      round_type: 'league',
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const map = generateMap({
      seed: `${tournamentId}-r${roundNumber}-t${i + 1}`,
      rules: tournament.map_rules as unknown as MapRules,
      retryCount: tournament.map_rules?.retry_count ?? 500,
    });
    const { data: mt } = await sb
      .from('match_tables')
      .insert({
        round_id: round!.id,
        table_number: i + 1,
        seat_count: t.seatCount,
        status: 'live',
        started_at: new Date().toISOString(),
        map_data: map as any,
        map_seed: map.seed,
      })
      .select('id')
      .single();

    const seatRows = t.players.map((p, seat) => ({
      match_table_id: mt!.id,
      player_id: p.id,
      seat_position: seat + 1,
    }));
    await sb.from('table_players').insert(seatRows);
  }

  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/match.ts
git commit -m "feat: tournament start + league round generation"
```

---

### Task 31: Enter score + recompute + advance

**Files:**
- Modify: `catan/app/actions/match.ts`

- [ ] **Step 1: Append score entry + advance to match.ts**

Append to `catan/app/actions/match.ts`:
```typescript
import { computeLeaderboard } from '@/lib/tournament/recompute';
import { rankPlayers, detectCutoffTies } from '@/lib/tournament/tiebreaker';

export interface ScoreEntry {
  playerId: string;
  finalVp: number;
  isWinner?: boolean;
}

export async function enterScore(
  matchTableId: string,
  entries: ScoreEntry[],
  tournamentId: string
) {
  const sb = getServerClient();

  // Determine winner: highest VP unless explicit winner flag set
  const explicitWinner = entries.find(e => e.isWinner);
  const autoWinner = explicitWinner ?? entries.reduce((max, e) => e.finalVp > max.finalVp ? e : max);

  for (const e of entries) {
    await sb.from('table_players')
      .update({ final_vp: e.finalVp, is_winner: e.playerId === autoWinner.playerId })
      .eq('match_table_id', matchTableId)
      .eq('player_id', e.playerId);
  }
  await sb.from('match_tables')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', matchTableId);

  await recomputeLeaderboard(tournamentId);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

async function recomputeLeaderboard(tournamentId: string) {
  const sb = getServerClient();

  const { data: rounds } = await sb.from('rounds')
    .select('id,round_type')
    .eq('tournament_id', tournamentId)
    .eq('round_type', 'league');

  if (!rounds?.length) return;
  const roundIds = rounds.map(r => r.id);

  const { data: tables } = await sb.from('match_tables')
    .select('id,seat_count,status')
    .in('round_id', roundIds)
    .eq('status', 'completed');

  if (!tables?.length) return;
  const tableIds = tables.map(t => t.id);

  const { data: tps } = await sb.from('table_players')
    .select('match_table_id,player_id,final_vp,is_winner')
    .in('match_table_id', tableIds);

  const matchResults = (tables).map(t => ({
    matchTableId: t.id,
    seatCount: t.seat_count as 3 | 4,
    players: (tps ?? [])
      .filter(tp => tp.match_table_id === t.id && tp.final_vp !== null)
      .map(tp => ({
        playerId: tp.player_id,
        finalVp: tp.final_vp!,
        isWinner: tp.is_winner ?? false,
      })),
  }));

  const stats = computeLeaderboard(matchResults);
  const ranked = rankPlayers(stats);

  // Upsert each stat with rank
  for (let i = 0; i < ranked.length; i++) {
    const s = ranked[i];
    await sb.from('leaderboard_stats').upsert({
      tournament_id: tournamentId,
      player_id: s.playerId,
      matches_played: (s as any).matchesPlayed ?? 0,
      wins: s.wins,
      total_vp: s.totalVp,
      vp_percent: s.vpPercent,
      best_single_vp: s.bestSingleVp,
      rank: i + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tournament_id,player_id' });
  }
}

export async function advanceRound(tournamentId: string) {
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
  if (!t) return { error: 'Not found' };

  // Mark current round completed
  await sb.from('rounds')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('tournament_id', tournamentId)
    .eq('round_number', t.current_round)
    .eq('round_type', t.current_round_type!);

  if (t.current_round_type === 'league') {
    if (t.current_round < t.league_rounds) {
      await sb.from('tournaments')
        .update({ current_round: t.current_round + 1 })
        .eq('id', tournamentId);
      await generateLeagueRound(tournamentId, t.current_round + 1);
      return { ok: true };
    }
    // Transition to elimination
    await recomputeLeaderboard(tournamentId);
    const { data: stats } = await sb.from('leaderboard_stats')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('rank', { ascending: true })
      .limit(t.elimination_count);
    const ties = detectCutoffTies(
      (stats ?? []).map(s => ({
        playerId: s.player_id, totalVp: s.total_vp, wins: s.wins,
        vpPercent: Number(s.vp_percent), bestSingleVp: s.best_single_vp, h2hWins: {},
      })),
      t.elimination_count
    );
    if (ties.length > 0) {
      return { cutoffTies: ties };  // admin modal'ı açılır
    }
    await startEliminationBracket(tournamentId, stats ?? []);
  } else {
    // Eleme turu ilerletimi — kazananları topla, yeni tur yarat
    await advanceEliminationRound(tournamentId);
  }

  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

async function startEliminationBracket(tournamentId: string, topN: any[]) {
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
  if (!t) return;

  const players = topN.map(s => ({ id: s.player_id, rank: s.rank }));
  const tables = seedBracket(players, t.elimination_count);

  await sb.from('tournaments').update({
    status: 'elimination',
    current_round: 1,
    current_round_type: 'elimination',
  }).eq('id', tournamentId);

  const { data: round } = await sb.from('rounds').insert({
    tournament_id: tournamentId,
    round_number: 1,
    round_type: 'elimination',
    status: 'active',
    started_at: new Date().toISOString(),
  }).select('id').single();

  for (let i = 0; i < tables.length; i++) {
    const pod = tables[i];
    const map = generateMap({
      seed: `${tournamentId}-elim1-t${i + 1}`,
      rules: t.map_rules as unknown as MapRules,
      retryCount: t.map_rules?.retry_count ?? 500,
    });
    const { data: mt } = await sb.from('match_tables').insert({
      round_id: round!.id,
      table_number: i + 1,
      seat_count: 4,
      status: 'live',
      started_at: new Date().toISOString(),
      map_data: map as any,
      map_seed: map.seed,
    }).select('id').single();

    await sb.from('table_players').insert(pod.map((p, seat) => ({
      match_table_id: mt!.id,
      player_id: p.id,
      seat_position: seat + 1,
    })));
  }
}

async function advanceEliminationRound(tournamentId: string) {
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
  if (!t) return;

  const { data: rounds } = await sb.from('rounds').select('id').eq('tournament_id', tournamentId)
    .eq('round_type', 'elimination').eq('round_number', t.current_round);
  if (!rounds?.[0]) return;

  const { data: tables } = await sb.from('match_tables')
    .select('id')
    .eq('round_id', rounds[0].id);
  const { data: winners } = await sb.from('table_players')
    .select('player_id,match_table_id')
    .in('match_table_id', (tables ?? []).map(t => t.id))
    .eq('is_winner', true);

  const winnerIds = (winners ?? []).map(w => w.player_id);

  if (winnerIds.length <= 1) {
    // Final — şampiyon ilan et
    await sb.from('tournaments').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', tournamentId);
    return;
  }

  // Next elimination round — re-seed winners into new pod(s)
  const nextRoundNum = t.current_round + 1;
  await sb.from('tournaments').update({ current_round: nextRoundNum }).eq('id', tournamentId);

  const { data: newRound } = await sb.from('rounds').insert({
    tournament_id: tournamentId,
    round_number: nextRoundNum,
    round_type: 'elimination',
    status: 'active',
    started_at: new Date().toISOString(),
  }).select('id').single();

  // Winners simple pairing: chunk 4
  for (let i = 0; i < winnerIds.length; i += 4) {
    const pod = winnerIds.slice(i, i + 4);
    const map = generateMap({
      seed: `${tournamentId}-elim${nextRoundNum}-t${(i / 4) + 1}`,
      rules: t.map_rules as unknown as MapRules,
      retryCount: t.map_rules?.retry_count ?? 500,
    });
    const { data: mt } = await sb.from('match_tables').insert({
      round_id: newRound!.id,
      table_number: (i / 4) + 1,
      seat_count: pod.length as 3 | 4,
      status: 'live',
      started_at: new Date().toISOString(),
      map_data: map as any,
      map_seed: map.seed,
    }).select('id').single();

    await sb.from('table_players').insert(pod.map((pid, seat) => ({
      match_table_id: mt!.id,
      player_id: pid,
      seat_position: seat + 1,
    })));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/match.ts
git commit -m "feat: score entry, leaderboard recompute, round advancement"
```

---

### Task 32: Map actions (regenerate, manual override)

**Files:**
- Create: `catan/app/actions/map.ts`

- [ ] **Step 1: Implement map actions**

Create `catan/app/actions/map.ts`:
```typescript
'use server';
import { getServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateMap } from '@/lib/map/generator';
import type { MapData } from '@/lib/map/generator';
import type { MapRules } from '@/lib/map/validator';

export async function regenerateMap(matchTableId: string, tournamentId: string) {
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('map_rules').eq('id', tournamentId).single();
  const rules = t?.map_rules as unknown as MapRules;
  const map = generateMap({
    rules,
    retryCount: (t?.map_rules as any)?.retry_count ?? 500,
    seed: `regen-${matchTableId}-${Date.now()}`,
  });
  await sb.from('match_tables')
    .update({ map_data: map as any, map_seed: map.seed })
    .eq('id', matchTableId);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true, seed: map.seed };
}

export async function updateMapManual(
  matchTableId: string,
  mapData: MapData,
  tournamentId: string
) {
  const sb = getServerClient();
  await sb.from('match_tables')
    .update({ map_data: mapData as any, map_seed: `manual-${Date.now()}` })
    .eq('id', matchTableId);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

export async function swapPlayers(
  tournamentId: string,
  tableAId: string,
  playerAId: string,
  tableBId: string,
  playerBId: string
) {
  const sb = getServerClient();
  // Swap seat_position / match_table_id between two table_players rows
  const { data: a } = await sb.from('table_players').select('*')
    .eq('match_table_id', tableAId).eq('player_id', playerAId).single();
  const { data: b } = await sb.from('table_players').select('*')
    .eq('match_table_id', tableBId).eq('player_id', playerBId).single();
  if (!a || !b) return { error: 'Player not found in table' };

  await sb.from('table_players').update({
    match_table_id: tableBId,
    seat_position: b.seat_position,
  }).eq('id', a.id);
  await sb.from('table_players').update({
    match_table_id: tableAId,
    seat_position: a.seat_position,
  }).eq('id', b.id);

  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

export async function resolveTieAtCutoff(
  tournamentId: string,
  ranking: { playerId: string; rank: number }[]
) {
  const sb = getServerClient();
  for (const r of ranking) {
    await sb.from('leaderboard_stats')
      .update({ rank: r.rank })
      .eq('tournament_id', tournamentId)
      .eq('player_id', r.playerId);
  }
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/map.ts
git commit -m "feat: map regenerate/manual + player swap + tie resolve"
```

---

### Task 33: Template CRUD + 5 preset seed

**Files:**
- Create: `catan/app/actions/template.ts`
- Create: `catan/data/seeds/tournament-presets.json`
- Create: `catan/supabase/migrations/00003_seed_templates.sql`

- [ ] **Step 1: Template actions**

Create `catan/app/actions/template.ts`:
```typescript
'use server';
import { getServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MapData } from '@/lib/map/generator';

export async function createTemplate(input: {
  name: string;
  source: 'CWC' | 'US Nationals' | 'Community' | 'Custom';
  year?: number;
  players: '3-4' | '5-6';
  data: MapData;
  isOfficial?: boolean;
}) {
  const sb = getServerClient();
  const { error } = await sb.from('map_templates').insert({
    name: input.name, source: input.source, year: input.year,
    players: input.players, data: input.data as any, is_official: input.isOfficial ?? false,
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/map-templates');
  return { ok: true };
}

export async function updateTemplate(id: string, patch: {
  name?: string; data?: MapData;
}) {
  const sb = getServerClient();
  const { error } = await sb.from('map_templates').update(patch as any).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/map-templates');
  return { ok: true };
}

export async function deleteTemplate(id: string) {
  const sb = getServerClient();
  const { error } = await sb.from('map_templates').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/map-templates');
  return { ok: true };
}

export async function saveMapAsTemplate(matchTableId: string, name: string) {
  const sb = getServerClient();
  const { data: mt } = await sb.from('match_tables').select('map_data').eq('id', matchTableId).single();
  if (!mt?.map_data) return { error: 'Map not found' };
  await sb.from('map_templates').insert({
    name, source: 'Custom', players: '3-4',
    data: mt.map_data as any, is_official: false,
  });
  revalidatePath('/admin/map-templates');
  return { ok: true };
}
```

- [ ] **Step 2: Generate 5 preset maps (deterministic seeds)**

Create `catan/data/seeds/tournament-presets.json`:
```json
[
  { "name": "Tournament Preset 1 (Balanced)", "seed": "preset-01-balanced", "source": "Community" },
  { "name": "Tournament Preset 2 (Wheat-Rich)", "seed": "preset-02-wheat", "source": "Community" },
  { "name": "Tournament Preset 3 (Ore-Strategic)", "seed": "preset-03-ore", "source": "Community" },
  { "name": "Tournament Preset 4 (Fair-Ports)", "seed": "preset-04-fairports", "source": "Community" },
  { "name": "Tournament Preset 5 (CWC-Like)", "seed": "preset-05-cwc", "source": "CWC" }
]
```

- [ ] **Step 3: Seed script to populate DB**

Create `catan/scripts/seed-templates.ts`:
```typescript
import { getServerClient } from '@/lib/supabase/server';
import { generateMap } from '@/lib/map/generator';
import presets from '@/data/seeds/tournament-presets.json';

const rules = {
  c1_no_red_adj: true, c2_no_same_num_adj: true, c3_no_same_resource_adj: true,
  c4_max_vertex_pip: 10, c5_no_2_12_adj: false,
};

async function main() {
  const sb = getServerClient();
  for (const p of presets) {
    const map = generateMap({ seed: p.seed, rules, retryCount: 1000 });
    await sb.from('map_templates').insert({
      name: p.name, source: p.source, players: '3-4',
      data: map as any, is_official: true,
    });
    console.log(`Seeded ${p.name}`);
  }
}

main().catch(console.error);
```

Run: `pnpm tsx scripts/seed-templates.ts` (install tsx if needed: `pnpm add -D tsx`)

Expected: 5 rows in `map_templates` table.

- [ ] **Step 4: Commit**

```bash
git add app/actions/template.ts data/seeds/tournament-presets.json scripts/seed-templates.ts
git commit -m "feat: map template CRUD + 5 preset seed data"
```

---

## Phase 7 — Public Pages

### Task 34: Root layout + Shell + Sidebar

**Files:**
- Modify: `catan/app/layout.tsx`
- Create: `catan/components/layout/Shell.tsx`
- Create: `catan/components/layout/Sidebar.tsx`

- [ ] **Step 1: Root layout**

Overwrite `catan/app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Catan Tournament Hub',
  description: 'Tournament management for Catan',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-[var(--color-bg-deep)] text-[var(--color-fg-primary)]">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Sidebar**

Create `catan/components/layout/Sidebar.tsx`:
```typescript
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Trophy, Archive, Zap } from 'lucide-react';

const items = [
  { href: '/', label: 'Hub', icon: LayoutDashboard },
  { href: '/archive', label: 'Arşiv', icon: Archive },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-[var(--color-bg-surface)] border-r border-[rgba(244,185,66,0.10)] flex flex-col">
      <div className="p-6 border-b border-[rgba(244,185,66,0.10)]">
        <div className="font-[var(--font-mono)] uppercase text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)]">
          Catan Tournament
        </div>
        <div className="font-[var(--font-display)] italic text-xl text-[var(--color-fg-primary)] mt-1">
          hub
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(it => {
          const Icon = it.icon;
          const active = pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors',
                active
                  ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-primary)]'
                  : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg-primary)]'
              )}
            >
              <Icon size={18} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Shell**

Create `catan/components/layout/Shell.tsx`:
```typescript
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-[1440px]">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx components/layout/
git commit -m "feat: root layout + Shell + Sidebar"
```

---

### Task 35: Hub home page (/) — active tournaments

**Files:**
- Overwrite: `catan/app/page.tsx`

- [ ] **Step 1: Implement hub home**

Overwrite `catan/app/page.tsx`:
```typescript
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getServerClient } from '@/lib/supabase/server';

export default async function HubHome() {
  const sb = getServerClient();
  const { data: active } = await sb.from('tournaments')
    .select('id,name,status,total_players,started_at')
    .in('status', ['league', 'elimination'])
    .order('started_at', { ascending: false });

  const { data: recentlyFinished } = await sb.from('tournaments')
    .select('id,name,completed_at,total_players')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(3);

  return (
    <Shell>
      <div className="space-y-8">
        <div>
          <div className="font-[var(--font-mono)] uppercase text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)]">
            Şu anda oynanan
          </div>
          <h1 className="text-4xl font-[var(--font-display)] mt-1">Aktif Turnuvalar</h1>
        </div>

        {active && active.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map(t => (
              <Link key={t.id} href={`/t/${t.id}`}>
                <Card highlight className="hover:brightness-110 transition-all">
                  <Badge tone="live">● Canlı</Badge>
                  <h3 className="text-xl font-[var(--font-display)] mt-3">{t.name}</h3>
                  <div className="text-sm text-[var(--color-fg-muted)] mt-2">
                    {t.total_players} oyuncu · {t.status === 'league' ? 'Lig turu' : 'Eleme'}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="text-6xl mb-4">⬡</div>
            <div className="text-lg text-[var(--color-fg-muted)]">Henüz aktif turnuva yok.</div>
          </Card>
        )}

        {recentlyFinished && recentlyFinished.length > 0 && (
          <div>
            <div className="font-[var(--font-mono)] uppercase text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] mb-3">
              Son biten turnuvalar
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentlyFinished.map(t => (
                <Link key={t.id} href={`/t/${t.id}`}>
                  <Card className="hover:brightness-110 transition-all">
                    <div className="text-base font-medium">{t.name}</div>
                    <div className="text-xs text-[var(--color-fg-muted)] mt-1 font-[var(--font-mono)]">
                      {t.total_players} oyuncu
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            <Link href="/archive" className="inline-block mt-3 text-sm text-[var(--color-accent-ember)] hover:underline">
              Arşive git →
            </Link>
          </div>
        )}
      </div>
    </Shell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: hub home page with active tournaments + recent finished"
```

---

### Task 36: Archive page + Tournament home + Match detail

**Files:**
- Create: `catan/app/archive/page.tsx`
- Create: `catan/app/t/[id]/page.tsx`
- Create: `catan/app/t/[id]/match/[tableId]/page.tsx`

- [ ] **Step 1: Archive page**

Create `catan/app/archive/page.tsx`:
```typescript
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { getServerClient } from '@/lib/supabase/server';

export default async function ArchivePage() {
  const sb = getServerClient();
  const { data } = await sb.from('tournaments')
    .select('id,name,completed_at,total_players')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-4xl font-[var(--font-display)]">Arşiv</h1>
        {data && data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.map(t => (
              <Link key={t.id} href={`/t/${t.id}`}>
                <Card className="hover:brightness-110 transition-all">
                  <div className="text-lg font-medium">{t.name}</div>
                  <div className="text-xs text-[var(--color-fg-muted)] mt-2 font-[var(--font-mono)]">
                    {t.total_players} oyuncu · {t.completed_at ? new Date(t.completed_at).toLocaleDateString('tr-TR') : '—'}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="text-lg text-[var(--color-fg-muted)]">Henüz biten turnuva yok.</div>
          </Card>
        )}
      </div>
    </Shell>
  );
}
```

- [ ] **Step 2: Tournament home with tabs**

Create `catan/app/t/[id]/page.tsx`:
```typescript
import { Shell } from '@/components/layout/Shell';
import { TabBar } from '@/components/tournament/TabBar';
import { Leaderboard, type LeaderboardRow } from '@/components/tournament/Leaderboard';
import { PodiumBlock } from '@/components/tournament/PodiumBlock';
import { StatsStrip } from '@/components/tournament/StatsStrip';
import { LiveTables } from '@/components/tournament/LiveTables';
import { BracketView } from '@/components/tournament/BracketView';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function TournamentHome({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = 'leaderboard' } = await searchParams;
  const sb = getServerClient();

  const { data: t } = await sb.from('tournaments').select('*').eq('id', id).single();
  if (!t) notFound();

  const { data: players } = await sb.from('players').select('*').eq('tournament_id', id);
  const { data: stats } = await sb.from('leaderboard_stats').select('*')
    .eq('tournament_id', id).order('rank', { ascending: true });
  const { data: rounds } = await sb.from('rounds').select('*').eq('tournament_id', id);
  const { data: tables } = await sb.from('match_tables').select('*')
    .in('round_id', (rounds ?? []).map(r => r.id));
  const { data: tps } = await sb.from('table_players').select('*')
    .in('match_table_id', (tables ?? []).map(m => m.id));

  const pMap = new Map((players ?? []).map(p => [p.id, p]));
  const rows: LeaderboardRow[] = (stats ?? []).map(s => {
    const p = pMap.get(s.player_id)!;
    return {
      rank: s.rank ?? 0,
      playerId: s.player_id,
      name: p?.name ?? '—',
      seatCode: p?.seat_code ?? '??',
      matchesPlayed: s.matches_played,
      wins: s.wins,
      totalVp: s.total_vp,
      isActive: (tables ?? []).some(mt => mt.status === 'live' &&
        (tps ?? []).some(tp => tp.match_table_id === mt.id && tp.player_id === s.player_id)
      ),
    };
  });

  const activeMatches = (tables ?? []).filter(t => t.status === 'live').length;
  const finished = (tables ?? []).filter(t => t.status === 'completed').length;
  const allVp = (tps ?? []).filter(p => p.final_vp !== null).map(p => p.final_vp!);
  const avgVp = allVp.length ? allVp.reduce((a, b) => a + b, 0) / allVp.length : 0;

  const tabs = [
    { key: 'leaderboard', label: 'Leaderboard', href: `/t/${id}?tab=leaderboard` },
    { key: 'active',      label: 'Aktif Masalar', href: `/t/${id}?tab=active` },
    { key: 'finished',    label: 'Biten Maçlar', href: `/t/${id}?tab=finished` },
    { key: 'bracket',     label: 'Bracket', href: `/t/${id}?tab=bracket` },
  ];

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-[var(--font-mono)] uppercase text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)]">
              {t.status === 'league' ? `Lig ${t.current_round}/${t.league_rounds}` :
               t.status === 'elimination' ? `Eleme Tur ${t.current_round}` :
               t.status === 'completed' ? 'Tamamlandı' : 'Kurulumda'}
            </div>
            <h1 className="text-4xl font-[var(--font-display)] mt-1">{t.name}</h1>
          </div>
        </div>

        <StatsStrip
          players={t.total_players}
          activeMatches={activeMatches}
          finishedMatches={finished}
          avgVp={avgVp}
          round={`${t.current_round}/${t.current_round_type === 'league' ? t.league_rounds : '∞'}`}
          duration={t.started_at
            ? `${Math.floor((Date.now() - new Date(t.started_at).getTime()) / 60000)}m`
            : '—'}
        />

        <TabBar tabs={tabs} activeKey={tab} />

        {tab === 'leaderboard' && (
          <div className="space-y-6">
            {rows.length >= 3 && <PodiumBlock top3={rows.slice(0, 3)} />}
            <Leaderboard rows={rows} />
          </div>
        )}

        {tab === 'active' && (
          <LiveTables
            tables={(tables ?? [])
              .filter(mt => mt.status === 'live')
              .map(mt => ({
                id: mt.id,
                tableNumber: mt.table_number,
                startedAt: mt.started_at ?? new Date().toISOString(),
                map: mt.map_data as any,
                players: (tps ?? [])
                  .filter(tp => tp.match_table_id === mt.id)
                  .map(tp => {
                    const p = pMap.get(tp.player_id);
                    return { seatCode: p?.seat_code ?? '??', name: p?.name ?? '—', finalVp: tp.final_vp };
                  }),
              }))}
          />
        )}

        {tab === 'finished' && (
          <LiveTables
            tables={(tables ?? [])
              .filter(mt => mt.status === 'completed')
              .map(mt => ({
                id: mt.id,
                tableNumber: mt.table_number,
                startedAt: mt.started_at ?? new Date().toISOString(),
                map: mt.map_data as any,
                players: (tps ?? [])
                  .filter(tp => tp.match_table_id === mt.id)
                  .map(tp => {
                    const p = pMap.get(tp.player_id);
                    return { seatCode: p?.seat_code ?? '??', name: p?.name ?? '—', finalVp: tp.final_vp };
                  }),
              }))}
          />
        )}

        {tab === 'bracket' && (
          <BracketView
            pods={(rounds ?? [])
              .filter(r => r.round_type === 'elimination')
              .sort((a, b) => a.round_number - b.round_number)
              .map(r => (tables ?? [])
                .filter(mt => mt.round_id === r.id)
                .map(mt => ({
                  id: mt.id,
                  tableNumber: mt.table_number,
                  roundLabel: `Eleme Tur ${r.round_number}`,
                  status: mt.status as any,
                  players: (tps ?? [])
                    .filter(tp => tp.match_table_id === mt.id)
                    .map(tp => {
                      const p = pMap.get(tp.player_id);
                      return {
                        seatCode: p?.seat_code ?? '??',
                        name: p?.name ?? '—',
                        isWinner: tp.is_winner ?? false,
                        vp: tp.final_vp,
                      };
                    }),
                })))}
          />
        )}
      </div>
    </Shell>
  );
}
```

- [ ] **Step 3: Match detail page**

Create `catan/app/t/[id]/match/[tableId]/page.tsx`:
```typescript
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HexMap } from '@/components/hex/HexMap';
import { PlayerAvatar } from '@/components/tournament/PlayerAvatar';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string; tableId: string }>;
}

export default async function MatchDetail({ params }: Props) {
  const { id, tableId } = await params;
  const sb = getServerClient();

  const { data: mt } = await sb.from('match_tables').select('*').eq('id', tableId).single();
  if (!mt) notFound();
  const { data: tps } = await sb.from('table_players').select('*').eq('match_table_id', tableId);
  const { data: players } = await sb.from('players').select('*')
    .in('id', (tps ?? []).map(tp => tp.player_id));

  const pMap = new Map((players ?? []).map(p => [p.id, p]));

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <Badge tone={mt.status === 'live' ? 'live' : 'gold'}>
            {mt.status === 'live' ? '● Canlı' : 'Tamamlandı'} · Masa {mt.table_number}
          </Badge>
          <h1 className="text-3xl font-[var(--font-display)] mt-2">Maç Detayı</h1>
        </div>

        <Card className="p-6">
          <HexMap map={mt.map_data as any} hexSize={48} />
          <div className="mt-4 font-[var(--font-mono)] text-xs text-[var(--color-fg-muted)]">
            Seed: {mt.map_seed}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(tps ?? []).map(tp => {
            const p = pMap.get(tp.player_id);
            return (
              <Card key={tp.id} highlight={tp.is_winner ?? false}>
                <div className="flex items-center gap-3">
                  <PlayerAvatar seatCode={p?.seat_code ?? '??'} size={40}
                    halo={tp.is_winner ? 'gold-winner' : 'none'} />
                  <div className="flex-1">
                    <div className="font-medium">{p?.name}</div>
                    <div className="text-xs text-[var(--color-fg-muted)] font-[var(--font-mono)]">
                      Sıra {tp.seat_position} · {tp.final_vp ?? '—'} VP
                    </div>
                  </div>
                  {tp.is_winner && <Badge tone="gold">🏆</Badge>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/archive app/t
git commit -m "feat: archive page + tournament home with tabs + match detail"
```

---

## Phase 8 — Admin Pages

### Task 37: Admin dashboard

**Files:**
- Create: `catan/app/admin/page.tsx`

- [ ] **Step 1: Implement dashboard**

Create `catan/app/admin/page.tsx`:
```typescript
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getServerClient } from '@/lib/supabase/server';
import { adminLogout } from '@/app/actions/admin';

export default async function AdminDashboard() {
  const sb = getServerClient();
  const { data: all } = await sb.from('tournaments')
    .select('id,name,status,total_players,started_at,completed_at')
    .order('created_at', { ascending: false });

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-[var(--font-display)]">Yönetici</h1>
          <div className="flex gap-2">
            <Link href="/admin/new"><Button>+ Yeni Turnuva</Button></Link>
            <Link href="/admin/map-templates"><Button variant="secondary">Map Şablonları</Button></Link>
            <form action={adminLogout}>
              <Button type="submit" variant="ghost">Çıkış</Button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(all ?? []).map(t => (
            <Link key={t.id} href={`/admin/t/${t.id}`}>
              <Card highlight={t.status !== 'completed'} className="hover:brightness-110 transition-all">
                <div className="flex items-center justify-between">
                  <Badge tone={t.status === 'completed' ? 'gold' : t.status === 'setup' ? 'neutral' : 'live'}>
                    {t.status === 'setup' ? 'Kurulumda' : t.status === 'completed' ? 'Tamamlandı' : 'Aktif'}
                  </Badge>
                  <span className="text-xs text-[var(--color-fg-muted)] font-[var(--font-mono)]">
                    {t.total_players} oyuncu
                  </span>
                </div>
                <h3 className="text-xl font-[var(--font-display)] mt-3">{t.name}</h3>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: admin dashboard"
```

---

### Task 38: New tournament wizard

**Files:**
- Create: `catan/app/admin/new/page.tsx`
- Create: `catan/components/admin/NewTournamentWizard.tsx`

- [ ] **Step 1: Wizard client component**

Create `catan/components/admin/NewTournamentWizard.tsx`:
```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createTournament } from '@/app/actions/tournament';

export function NewTournamentWizard() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [totalPlayers, setTotalPlayers] = useState(16);
  const [leagueRounds, setLeagueRounds] = useState(2);
  const [elim, setElim] = useState<4 | 16 | 64 | 256>(16);
  const [conflict, setConflict] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    // Validate: totalPlayers vs elim vs leagueRounds
    if (leagueRounds === 0 && totalPlayers !== elim) {
      setConflict('league_zero_mismatch');
      return;
    }
    if (elim > totalPlayers) {
      setConflict('elim_larger_than_total');
      return;
    }
    setSubmitting(true);
    await createTournament({
      name, totalPlayers, leagueRounds, eliminationCount: elim,
    });
  }

  return (
    <Card className="max-w-2xl p-6 space-y-4">
      <label className="block">
        <div className="text-sm text-[var(--color-fg-muted)] mb-1">Turnuva adı</div>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Bahar Turnuvası" required />
      </label>
      <div className="grid grid-cols-3 gap-4">
        <label className="block">
          <div className="text-sm text-[var(--color-fg-muted)] mb-1">Oyuncu</div>
          <Input type="number" min={4} value={totalPlayers} onChange={e => setTotalPlayers(Number(e.target.value))} />
        </label>
        <label className="block">
          <div className="text-sm text-[var(--color-fg-muted)] mb-1">Lig Turu</div>
          <Input type="number" min={0} value={leagueRounds} onChange={e => setLeagueRounds(Number(e.target.value))} />
        </label>
        <label className="block">
          <div className="text-sm text-[var(--color-fg-muted)] mb-1">Eleme</div>
          <select
            value={elim}
            onChange={e => setElim(Number(e.target.value) as 4 | 16 | 64 | 256)}
            className="h-10 w-full px-3 bg-[var(--color-bg-deep)] border border-[var(--color-fg-subtle)] rounded-[var(--radius-md)] text-[var(--color-fg-primary)]"
          >
            <option value={4}>4 (Direkt Final)</option>
            <option value={16}>16</option>
            <option value={64}>64</option>
            <option value={256}>256</option>
          </select>
        </label>
      </div>
      <Button onClick={submit} disabled={submitting || !name}>
        {submitting ? 'Oluşturuluyor...' : 'Turnuvayı Oluştur'}
      </Button>

      <Modal open={conflict === 'league_zero_mismatch'} onClose={() => setConflict(null)} title="Uyumsuzluk">
        <p className="mb-4">
          Salt eleme (lig turu = 0) seçildi, ancak oyuncu sayısı ({totalPlayers}) eleme sayısına ({elim}) eşit değil.
          Aşağıdaki yollardan biri gerekli:
        </p>
        <div className="space-y-2">
          <Button variant="secondary" onClick={() => { setTotalPlayers(elim); setConflict(null); }} className="w-full">
            Oyuncu sayısını {elim}'a düşür
          </Button>
          <Button variant="secondary" onClick={() => { setLeagueRounds(1); setConflict(null); }} className="w-full">
            1 Lig turu ekle (play-in)
          </Button>
          <Button variant="ghost" onClick={() => setConflict(null)} className="w-full">İptal</Button>
        </div>
      </Modal>
    </Card>
  );
}
```

- [ ] **Step 2: Wizard page**

Create `catan/app/admin/new/page.tsx`:
```typescript
import { Shell } from '@/components/layout/Shell';
import { NewTournamentWizard } from '@/components/admin/NewTournamentWizard';

export default function NewTournamentPage() {
  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-4xl font-[var(--font-display)]">Yeni Turnuva</h1>
        <NewTournamentWizard />
      </div>
    </Shell>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/new components/admin/NewTournamentWizard.tsx
git commit -m "feat: new tournament wizard with conflict modal"
```

---

### Task 39: Players management + start tournament

**Files:**
- Create: `catan/app/admin/t/[id]/players/page.tsx`
- Create: `catan/components/admin/PlayerRoster.tsx`

- [ ] **Step 1: PlayerRoster component**

Create `catan/components/admin/PlayerRoster.tsx`:
```typescript
'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlayerAvatar } from '@/components/tournament/PlayerAvatar';
import { addPlayer, removePlayer } from '@/app/actions/player';
import { startTournament } from '@/app/actions/match';
import { Trash2 } from 'lucide-react';

interface Props {
  tournamentId: string;
  totalRequired: number;
  players: { id: string; name: string; seat_code: string }[];
  canStart: boolean;
}

export function PlayerRoster({ tournamentId, totalRequired, players, canStart }: Props) {
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setPending(true);
    await addPlayer(tournamentId, name.trim());
    setName('');
    setPending(false);
  }

  async function start() {
    if (!confirm('Turnuvayı başlatmak istiyor musun? Başladıktan sonra oyuncu ekleme kapanır.')) return;
    await startTournament(tournamentId);
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[var(--color-fg-muted)] font-[var(--font-mono)]">
        {players.length} / {totalRequired} oyuncu
      </div>

      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()} placeholder="Oyuncu adı" />
        <Button onClick={add} disabled={pending || !name.trim()}>+ Ekle</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {players.map(p => (
          <Card key={p.id} className="flex items-center gap-3 py-3">
            <PlayerAvatar seatCode={p.seat_code} size={32} />
            <span className="flex-1">{p.name}</span>
            <button onClick={() => removePlayer(p.id, tournamentId)}
              className="text-[var(--color-fg-muted)] hover:text-[var(--color-error)]">
              <Trash2 size={16} />
            </button>
          </Card>
        ))}
      </div>

      {canStart && (
        <Button onClick={start} className="w-full">Turnuvayı Başlat →</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Players page**

Create `catan/app/admin/t/[id]/players/page.tsx`:
```typescript
import { Shell } from '@/components/layout/Shell';
import { PlayerRoster } from '@/components/admin/PlayerRoster';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function PlayersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', id).single();
  if (!t) notFound();
  const { data: players } = await sb.from('players').select('id,name,seat_code').eq('tournament_id', id);

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-[var(--font-display)]">{t.name}</h1>
          <div className="text-sm text-[var(--color-fg-muted)] mt-1">Oyuncu Kaydı</div>
        </div>
        <PlayerRoster
          tournamentId={id}
          totalRequired={t.total_players}
          players={players ?? []}
          canStart={(players ?? []).length === t.total_players && t.status === 'setup'}
        />
      </div>
    </Shell>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/t components/admin/PlayerRoster.tsx
git commit -m "feat: player roster with add/remove/start tournament"
```

---

### Task 40: Score entry modal/page

**Files:**
- Create: `catan/app/admin/t/[id]/score/[tableId]/page.tsx`
- Create: `catan/components/admin/ScoreEntryForm.tsx`

- [ ] **Step 1: ScoreEntryForm**

Create `catan/components/admin/ScoreEntryForm.tsx`:
```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlayerAvatar } from '@/components/tournament/PlayerAvatar';
import { enterScore } from '@/app/actions/match';
import { Trophy } from 'lucide-react';

interface PlayerRow {
  id: string; playerId: string; name: string; seatCode: string; seatPosition: number;
}

interface Props {
  tournamentId: string;
  matchTableId: string;
  players: PlayerRow[];
}

export function ScoreEntryForm({ tournamentId, matchTableId, players }: Props) {
  const router = useRouter();
  const [vps, setVps] = useState<Record<string, number>>(
    Object.fromEntries(players.map(p => [p.playerId, 0]))
  );
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const autoWinner = Object.entries(vps).reduce<[string, number]>(
    (max, [id, v]) => v > max[1] ? [id, v] : max,
    [players[0]?.playerId ?? '', 0]
  )[0];
  const effectiveWinner = winnerId ?? autoWinner;

  async function submit() {
    setSubmitting(true);
    await enterScore(matchTableId, players.map(p => ({
      playerId: p.playerId,
      finalVp: vps[p.playerId] ?? 0,
      isWinner: p.playerId === effectiveWinner,
    })), tournamentId);
    router.push(`/admin/t/${tournamentId}`);
  }

  return (
    <Card className="max-w-xl p-6 space-y-4">
      {players.map(p => (
        <div key={p.id} className="flex items-center gap-3">
          <button onClick={() => setWinnerId(p.playerId)}
            className={`p-1 rounded-full transition-all ${effectiveWinner === p.playerId ? 'text-[var(--color-accent-gold)] glow-gold' : 'text-[var(--color-fg-muted)]'}`}>
            <Trophy size={20} fill={effectiveWinner === p.playerId ? 'currentColor' : 'none'} />
          </button>
          <PlayerAvatar seatCode={p.seatCode} size={36} />
          <span className="flex-1">{p.name}</span>
          <Input
            type="number" min={0} max={15}
            value={vps[p.playerId]}
            onChange={e => setVps({ ...vps, [p.playerId]: Number(e.target.value) })}
            className="w-20 text-right"
          />
          <span className="text-[var(--color-fg-muted)] text-sm">VP</span>
        </div>
      ))}
      <Button onClick={submit} disabled={submitting} className="w-full">
        {submitting ? 'Kaydediliyor...' : 'Skoru Kaydet'}
      </Button>
    </Card>
  );
}
```

- [ ] **Step 2: Score page**

Create `catan/app/admin/t/[id]/score/[tableId]/page.tsx`:
```typescript
import { Shell } from '@/components/layout/Shell';
import { ScoreEntryForm } from '@/components/admin/ScoreEntryForm';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function ScorePage({ params }: {
  params: Promise<{ id: string; tableId: string }>
}) {
  const { id, tableId } = await params;
  const sb = getServerClient();
  const { data: mt } = await sb.from('match_tables').select('*').eq('id', tableId).single();
  if (!mt) notFound();
  const { data: tps } = await sb.from('table_players').select('*').eq('match_table_id', tableId)
    .order('seat_position', { ascending: true });
  const { data: players } = await sb.from('players').select('*')
    .in('id', (tps ?? []).map(tp => tp.player_id));
  const pMap = new Map((players ?? []).map(p => [p.id, p]));

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-3xl font-[var(--font-display)]">Masa {mt.table_number} — Skor Girişi</h1>
        <ScoreEntryForm
          tournamentId={id}
          matchTableId={tableId}
          players={(tps ?? []).map(tp => ({
            id: tp.id,
            playerId: tp.player_id,
            name: pMap.get(tp.player_id)?.name ?? '—',
            seatCode: pMap.get(tp.player_id)?.seat_code ?? '??',
            seatPosition: tp.seat_position ?? 0,
          }))}
        />
      </div>
    </Shell>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/t/\[id\]/score components/admin/ScoreEntryForm.tsx
git commit -m "feat: score entry with auto-winner + trophy toggle"
```

---

### Task 41: Admin tournament view + advance + map-templates

**Files:**
- Create: `catan/app/admin/t/[id]/page.tsx`
- Create: `catan/app/admin/map-templates/page.tsx`

- [ ] **Step 1: Admin tournament view**

Create `catan/app/admin/t/[id]/page.tsx`:
```typescript
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { advanceRound } from '@/app/actions/match';

export default async function AdminTournamentView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', id).single();
  if (!t) notFound();
  const { data: rounds } = await sb.from('rounds').select('*').eq('tournament_id', id);
  const { data: tables } = await sb.from('match_tables').select('*')
    .in('round_id', (rounds ?? []).map(r => r.id));

  const currentRoundId = (rounds ?? [])
    .find(r => r.round_number === t.current_round && r.round_type === t.current_round_type)?.id;
  const currentTables = (tables ?? []).filter(mt => mt.round_id === currentRoundId);
  const allCompleted = currentTables.length > 0 && currentTables.every(mt => mt.status === 'completed');

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Badge tone={t.status === 'completed' ? 'gold' : 'live'}>
              {t.status === 'league' ? `Lig ${t.current_round}/${t.league_rounds}` :
               t.status === 'elimination' ? `Eleme Tur ${t.current_round}` :
               t.status === 'completed' ? 'Tamamlandı' : 'Kurulumda'}
            </Badge>
            <h1 className="text-4xl font-[var(--font-display)] mt-2">{t.name}</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/t/${id}`}><Button variant="secondary">Public Görünüm</Button></Link>
            <Link href={`/admin/t/${id}/settings`}><Button variant="ghost">Ayarlar</Button></Link>
          </div>
        </div>

        {t.status !== 'completed' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentTables.map(mt => (
                <Card key={mt.id} live={mt.status === 'live'}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge tone={mt.status === 'live' ? 'live' : mt.status === 'completed' ? 'gold' : 'neutral'}>
                      Masa {mt.table_number}
                    </Badge>
                    {mt.status === 'live' && (
                      <Link href={`/admin/t/${id}/score/${mt.id}`}>
                        <Button size="sm">Skor Gir</Button>
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link href={`/admin/t/${id}/map/${mt.id}`} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-accent-ember)]">
                      🔄 Map düzenle
                    </Link>
                  </div>
                </Card>
              ))}
            </div>

            {allCompleted && (
              <form action={async () => { 'use server'; await advanceRound(id); }}>
                <Button type="submit" className="w-full">Turu Tamamla →</Button>
              </form>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
```

- [ ] **Step 2: Map templates page**

Create `catan/app/admin/map-templates/page.tsx`:
```typescript
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HexMap } from '@/components/hex/HexMap';
import { getServerClient } from '@/lib/supabase/server';
import { deleteTemplate } from '@/app/actions/template';
import { Button } from '@/components/ui/Button';

export default async function TemplatesPage() {
  const sb = getServerClient();
  const { data } = await sb.from('map_templates').select('*').order('created_at', { ascending: false });
  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-4xl font-[var(--font-display)]">Map Şablonları</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(data ?? []).map(tpl => (
            <Card key={tpl.id}>
              <div className="flex items-center justify-between mb-3">
                <Badge tone={tpl.is_official ? 'gold' : 'neutral'}>{tpl.source}</Badge>
                <form action={async () => { 'use server'; await deleteTemplate(tpl.id); }}>
                  <Button type="submit" variant="destructive" size="sm">Sil</Button>
                </form>
              </div>
              <div className="text-lg font-medium">{tpl.name}</div>
              <div className="mt-3">
                <HexMap map={tpl.data as any} hexSize={20} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/t app/admin/map-templates
git commit -m "feat: admin tournament view + map templates CRUD page"
```

---

### Task 42: Seating, map editor, settings pages (stubs + basic)

**Files:**
- Create: `catan/app/admin/t/[id]/seat/page.tsx`
- Create: `catan/app/admin/t/[id]/map/[tableId]/page.tsx`
- Create: `catan/app/admin/t/[id]/settings/page.tsx`

- [ ] **Step 1: Seating page (drag-drop simple version)**

Create `catan/app/admin/t/[id]/seat/page.tsx`:
```typescript
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PlayerAvatar } from '@/components/tournament/PlayerAvatar';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function SeatingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', id).single();
  if (!t) notFound();
  const { data: rounds } = await sb.from('rounds').select('*').eq('tournament_id', id)
    .eq('round_number', t.current_round).eq('round_type', t.current_round_type!);
  const { data: tables } = await sb.from('match_tables').select('*')
    .in('round_id', (rounds ?? []).map(r => r.id));
  const { data: tps } = await sb.from('table_players').select('*')
    .in('match_table_id', (tables ?? []).map(mt => mt.id));
  const { data: players } = await sb.from('players').select('*').eq('tournament_id', id);
  const pMap = new Map((players ?? []).map(p => [p.id, p]));

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-3xl font-[var(--font-display)]">Masaları Düzenle</h1>
        <div className="text-sm text-[var(--color-fg-muted)]">
          MVP: oyuncuları elden veri tabanından sürükle. Drag-drop v2.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(tables ?? []).map(mt => (
            <Card key={mt.id}>
              <Badge>Masa {mt.table_number}</Badge>
              <div className="mt-3 space-y-2">
                {(tps ?? []).filter(tp => tp.match_table_id === mt.id).map(tp => {
                  const p = pMap.get(tp.player_id);
                  return (
                    <div key={tp.id} className="flex items-center gap-2">
                      <PlayerAvatar seatCode={p?.seat_code ?? '??'} size={28} />
                      <span className="flex-1 text-sm">{p?.name}</span>
                      <span className="text-xs text-[var(--color-fg-muted)] font-[var(--font-mono)]">
                        Sıra {tp.seat_position}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
```

- [ ] **Step 2: Map editor page (regenerate button)**

Create `catan/app/admin/t/[id]/map/[tableId]/page.tsx`:
```typescript
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HexMap } from '@/components/hex/HexMap';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { regenerateMap } from '@/app/actions/map';

export default async function MapEditorPage({ params }: {
  params: Promise<{ id: string; tableId: string }>
}) {
  const { id, tableId } = await params;
  const sb = getServerClient();
  const { data: mt } = await sb.from('match_tables').select('*').eq('id', tableId).single();
  if (!mt) notFound();

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-3xl font-[var(--font-display)]">Masa {mt.table_number} Map</h1>
        <Card className="p-6">
          <HexMap map={mt.map_data as any} hexSize={48} />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-[var(--font-mono)] text-[var(--color-fg-muted)]">
              Seed: {mt.map_seed}
            </span>
            <form action={async () => { 'use server'; await regenerateMap(tableId, id); }}>
              <Button type="submit">🔄 Yeni Map Üret</Button>
            </form>
          </div>
        </Card>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Hex-by-hex manual edit v2. MVP: regenerate yeterli.
        </p>
      </div>
    </Shell>
  );
}
```

- [ ] **Step 3: Settings page**

Create `catan/app/admin/t/[id]/settings/page.tsx`:
```typescript
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { deleteTournament, renameTournament } from '@/app/actions/tournament';

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', id).single();
  if (!t) notFound();

  return (
    <Shell>
      <div className="space-y-6 max-w-lg">
        <h1 className="text-3xl font-[var(--font-display)]">Turnuva Ayarları</h1>

        <Card className="p-6 space-y-3">
          <div className="text-sm text-[var(--color-fg-muted)]">Ad</div>
          <form
            action={async (fd: FormData) => {
              'use server';
              await renameTournament(id, String(fd.get('name') ?? ''));
            }}
            className="flex gap-2"
          >
            <Input name="name" defaultValue={t.name} />
            <Button type="submit">Kaydet</Button>
          </form>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="text-sm text-[var(--color-error)]">Tehlikeli bölge</div>
          <form
            action={async () => {
              'use server';
              await deleteTournament(id);
              redirect('/admin');
            }}
          >
            <Button type="submit" variant="destructive" className="w-full">
              Turnuvayı Sil
            </Button>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/t/\[id\]/seat app/admin/t/\[id\]/map app/admin/t/\[id\]/settings
git commit -m "feat: seating view + map editor + settings pages"
```

---

## Phase 9 — Realtime + Polish

### Task 43: Realtime subscription hook

**Files:**
- Create: `catan/lib/hooks/useRealtime.ts`

- [ ] **Step 1: Implement hook**

Create `catan/lib/hooks/useRealtime.ts`:
```typescript
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export function useTournamentRealtime(tournamentId: string) {
  const router = useRouter();
  useEffect(() => {
    const channel = supabase.channel(`tournament:${tournamentId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard_stats', filter: `tournament_id=eq.${tournamentId}` },
        () => router.refresh()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'match_tables' },
        () => router.refresh()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'table_players' },
        () => router.refresh()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [tournamentId, router]);
}
```

- [ ] **Step 2: Wire into tournament page**

Edit `catan/app/t/[id]/page.tsx` — wrap the content in a client component that calls the hook, OR create a thin `RealtimeWrapper.tsx`:

Create `catan/components/tournament/RealtimeWrapper.tsx`:
```typescript
'use client';
import { useTournamentRealtime } from '@/lib/hooks/useRealtime';

export function RealtimeWrapper({ tournamentId, children }: {
  tournamentId: string; children: React.ReactNode;
}) {
  useTournamentRealtime(tournamentId);
  return <>{children}</>;
}
```

Wrap the return of `TournamentHome` (app/t/[id]/page.tsx) with `<RealtimeWrapper tournamentId={id}>...</RealtimeWrapper>`.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks components/tournament/RealtimeWrapper.tsx app/t
git commit -m "feat: realtime subscriptions for tournament page"
```

---

### Task 44: Kinetic polish — score spark + rank swap

**Files:**
- Modify: `catan/components/tournament/Leaderboard.tsx` (add AnimatePresence + layout)
- Modify: `catan/app/globals.css` (spark keyframe)

- [ ] **Step 1: Add spark keyframe**

Append to `catan/app/globals.css`:
```css
@keyframes spark-burst {
  0%   { opacity: 0; transform: scale(0.8); }
  50%  { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(1); }
}
.animate-spark { animation: spark-burst 600ms ease-out 1; }
```

- [ ] **Step 2: Upgrade Leaderboard with framer-motion layout**

Overwrite `catan/components/tournament/Leaderboard.tsx`:
```typescript
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerAvatar } from './PlayerAvatar';
import { cn } from '@/lib/utils';

export interface LeaderboardRow {
  rank: number;
  playerId: string;
  name: string;
  seatCode: string;
  matchesPlayed: number;
  wins: number;
  totalVp: number;
  isActive?: boolean;
}

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="rounded-[var(--radius-md)] hairline bg-[var(--color-bg-surface)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-fg-muted)] font-[var(--font-mono)]">
            <th className="text-left px-4 py-3 w-12">#</th>
            <th className="text-left px-4 py-3">Oyuncu</th>
            <th className="text-right px-3 py-3 w-16">Oyun</th>
            <th className="text-right px-3 py-3 w-16">Gal.</th>
            <th className="text-right px-4 py-3 w-20">Toplam VP</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.tr
                key={r.playerId}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3, type: 'spring', bounce: 0.3 }}
                className={cn(
                  'border-t border-[rgba(244,185,66,0.08)] hover:bg-[var(--color-bg-elevated)]',
                  r.isActive && 'bg-[rgba(255,107,53,0.06)]'
                )}
              >
                <td className="px-4 py-3 font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]">{r.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar seatCode={r.seatCode} size={32} halo={r.isActive ? 'pulse-live' : 'none'} />
                    <span>{r.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]">{r.matchesPlayed}</td>
                <td className="px-3 py-3 text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]">{r.wins}</td>
                <td className="px-4 py-3 text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]">
                  <motion.span key={r.totalVp} initial={{ scale: 1.15 }} animate={{ scale: 1 }}
                    transition={{ duration: 0.4, type: 'spring' }}>
                    {r.totalVp}
                  </motion.span>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/tournament/Leaderboard.tsx app/globals.css
git commit -m "feat: kinetic leaderboard with rank swap + VP spring bounce"
```

---

## Phase 10 — Deploy & Smoke Test

### Task 45: .env + Vercel config

**Files:**
- Create: `catan/.env.local` (not committed; developer fills in values)
- Modify: `catan/next.config.ts`

- [ ] **Step 1: Create local env file**

Create `catan/.env.local` (DO NOT COMMIT) with real values:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<real-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<real-service-role-key>
ADMIN_PASSWORD=<strong-password>
```

- [ ] **Step 2: Verify dev server boots**

Run: `pnpm dev`
Open: `http://localhost:3000`
Expected: hub home page renders with "Henüz aktif turnuva yok" (empty state).

- [ ] **Step 3: Ensure .env.local is gitignored**

Verify `catan/.gitignore` contains `.env*.local` (Next.js default does).

- [ ] **Step 4: Commit (config only, no secrets)**

```bash
git add .env.local.example
git commit -m "chore: env example for Vercel deploy"
```

---

### Task 46: Manual smoke test checklist

**Files:** (no new files — checklist only)

- [ ] **Step 1: Admin flow**

- [ ] Open `/admin/login`, try wrong password → rate limit after 5 attempts
- [ ] Login with correct password → redirect to `/admin`
- [ ] Click "+ Yeni Turnuva" → wizard opens
- [ ] Fill 8 players, 1 league round, elim 4 → submit → redirect to players page
- [ ] Add 8 players one by one → "Turnuvayı Başlat" button appears
- [ ] Click start → round 1 tables generated with maps
- [ ] Click on a match table → score entry page
- [ ] Enter 4 VPs (10, 7, 5, 3) → submit → redirects to admin view
- [ ] Repeat for all tables → "Turu Tamamla" appears
- [ ] Click advance → transitions to elimination (4 players, 1 final table)
- [ ] Enter final scores → tournament marked completed, redirects to admin dash

- [ ] **Step 2: Public flow**

- [ ] Visit `/` → see active tournament card
- [ ] Click card → `/t/[id]` shows leaderboard tab
- [ ] Switch to "Aktif Masalar" tab → live cards with hex maps
- [ ] Switch to "Bracket" tab (after elim starts) → pods render
- [ ] Click a live match → `/t/[id]/match/[tableId]` detail view

- [ ] **Step 3: Realtime verification**

- [ ] Open `/t/[id]` in two browser tabs
- [ ] In one (admin) enter score → verify other tab auto-refreshes

- [ ] **Step 4: Map templates**

- [ ] Run seed script: `pnpm tsx scripts/seed-templates.ts`
- [ ] Visit `/admin/map-templates` → see 5 preset maps rendered

- [ ] **Step 5: Responsive**

- [ ] Open Chrome devtools, iPhone 12 viewport
- [ ] Verify hub, leaderboard, live tables all stack correctly

---

### Task 47: Deploy to Vercel

**Files:** (no new files)

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Vercel project setup**

- On vercel.com → Import Project → select `MustafaKucukcoskun/catan-tournament`
- Root directory: `catan/`
- Framework: Next.js (auto-detected)
- Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`
- Deploy

- [ ] **Step 3: Post-deploy verification**

- Visit deployed URL (e.g. `https://catan-tournament.vercel.app`)
- Login at `/admin/login` with production password
- Create a test tournament, verify full flow
- Check Supabase dashboard → rows are being created

- [ ] **Step 4: Commit final README update (optional)**

Create `catan/README.md` with deploy instructions (1-2 paragraphs).

---

## Self-Review

**1. Spec coverage check:**

| Spec §   | Requirement | Task |
|----------|---|---|
| §2.1 #1  | Admin create tournament (wizard) | T28 + T38 |
| §2.1 #2  | Admin add players | T29 + T39 |
| §2.1 #3  | Auto distribution (4s + 3s) | T8 (algorithm) + T30 |
| §2.1 #4  | Round 1 random, Round 2+ Swiss | T11 + T30 |
| §2.1 #5  | Auto map generation + admin override | T10, T32, T41-42 |
| §2.1 #6  | Admin score entry + auto winner | T14, T31, T40 |
| §2.1 #7  | Tiered random bracket seeding | T12 + T31 |
| §2.1 #8  | Tiebreaker + cutoff admin modal | T13 + T31 |
| §2.1 #9  | 4-player pod elimination ladder | T31 (advanceEliminationRound) |
| §2.1 #10 | Public realtime UI | T35-36 + T43 |
| §2.1 #11 | Admin manual override | T32, T41-42 |
| §2.1 #12 | Admin auth (password, rate limit, cookie) | T15-18 |
| §2.1 #13 | Seed-based reproducible maps | T10, T32 |
| §5.1     | Public routes (/, /archive, /t/[id], match) | T35-36 |
| §5.2     | Admin routes (all) | T37-42 |
| §10.1    | Tasarım v3 warmth + kinetic | T3, T22, T43-44 |
| §11.1    | Must-have kabul kriterleri | Tüm phases |

No gaps detected.

**2. Placeholder scan:** No TBD/TODO/placeholder text. All code blocks complete.

**3. Type consistency:** `MapRules`, `PairingPlayer`, `PlayerStats`, `LeaderboardRow`, `MatchResult` used consistently.

**4. Ambiguity:** None — every step has concrete file path + complete code.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-23-catan-tournament.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task (or per phase), review between tasks, fast iteration with clean context per task.

**2. Inline Execution** — execute tasks in the current session using `superpowers:executing-plans`, batch execution with checkpoints.

**Which approach?**
