# Catan Tournament Hub

**Tournament management web app for Catan.** Admins run Swiss-style league rounds followed by 4-player elimination pods. Players and spectators follow a live leaderboard, and every table gets a generated board that follows fairness rules.

<!-- TODO: add a screenshot of the live leaderboard and a generated board, e.g. docs/screenshot.png -->

## Features

- **League rounds:** round 1 is random. Later rounds sort players by total VP and fill 4-player tables from a sliding window, avoiding repeat opponents where possible. Player counts that don't divide by 4 get 3-player tables.
- **Elimination pods:** seeded from league standings in tiers, so the top seeds land at different tables. Ties at the cut-off line are detected and shown to the admin.
- **Board generator:** five rules that can be switched on or off per tournament: no adjacent red numbers (6 and 8), no adjacent equal numbers, no adjacent equal resources, a cap on pips per vertex, and no adjacent 2 and 12.
- **Live views:** leaderboard and table status update through Supabase Realtime. There is a public spectator page and an archive of finished tournaments.
- **Admin area:** shared admin password checked in constant time, sessions stored as hashed tokens in `httpOnly`, `SameSite=strict` cookies.

## Run locally

Requirements: Node.js 20+ (22 recommended) and a Supabase project (the free tier is enough).

```bash
npm install
cp .env.local.example .env.local   # fill in the values below
npm run dev                        # http://localhost:3000
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public reads) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes, never sent to the browser |
| `ADMIN_PASSWORD` | Shared password for the admin area |

For a fresh Supabase project, apply the migrations and enable Realtime:

1. `supabase/migrations/00001_schema.sql` (9 tables)
2. `supabase/migrations/00002_rls.sql` (public read policies)
3. `alter publication supabase_realtime add table leaderboard_stats, match_tables, table_players, tournaments;`

## Tests

```bash
npm run test:run    # single run (CI)
npm run test        # watch mode
```

42 Vitest tests cover the pure logic: player distribution, league pairing, bracket seeding, tiebreakers, leaderboard recomputation, board generation and validation, and the password check.

## Tech stack

Next.js 16 (App Router, server actions) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL + Realtime) · `react-hexgrid` · Framer Motion · `seedrandom` · Vitest

## Design decisions

- **Tournament and map logic is plain TypeScript.** `lib/tournament/` and `lib/map/` import nothing from React or Supabase. They are tested directly, and the leaderboard can be recomputed from match results at any time instead of being patched incrementally.
- **Boards are reproducible.** Every board comes from a seed, so the same seed always rebuilds the same board. That makes it possible to show a board again or debug a rule violation.
- **Shuffle, then repair.** A random shuffle rarely satisfies all five rules at once. Instead of reshuffling blindly, the generator swaps pairs of hexes and keeps a swap only if it reduces the number of violations. If that does not converge, it starts again from a new shuffle.
- **Tiebreak order:** total VP, then wins, then VP percentage, then best single game, then head-to-head. If players are still tied at the elimination cut-off, the admin decides.

## Project structure

```
app/
  actions/        server actions (tournament, player, match, map, template, admin)
  admin/          admin pages, guarded by proxy.ts
  t/[id]/         public tournament view
  archive/        finished tournaments
components/       ui primitives, hex map, leaderboard and bracket, admin forms
lib/
  tournament/     distribute, pairing, bracket, tiebreaker, recompute
  map/            constants, neighbors, validator, generator
  auth/           password check and admin sessions
  supabase/       client and server wrappers, generated types
supabase/migrations/   schema and RLS
tests/                 Vitest unit tests
```

The visual language (colors, type, motion, anti-patterns) is documented in [`DESIGN.md`](DESIGN.md).

## Deploy (Vercel)

1. Import the repository on vercel.com. The framework (Next.js) is detected automatically and the root directory is the repository root.
2. Add the four environment variables above.
3. Deploy.

## Scope notes

- Admin auth is a single shared password. Moving to Supabase Auth is straightforward when needed.
- Hex-by-hex board editing, drag-and-drop seating and multi-language support are planned for v2. The UI is in Turkish for now.
- Byes are only needed for exactly 5 players, which the tournament format avoids.

## License

[MIT](LICENSE)
