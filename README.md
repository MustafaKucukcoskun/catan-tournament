# Catan Tournament Hub

Tournament management web app for Catan (Settlers of Catan). Supports
Swiss-style league rounds + 4-player elimination pods, live leaderboard,
auto-generated Catan maps, admin scoring, public spectator view.

## Stack

Next.js 16 · React 19 · Tailwind 4 · Supabase (Postgres + Realtime) ·
`@supabase/supabase-js` · `react-hexgrid` · `framer-motion` · `seedrandom`

## Local development

### Prerequisites
- Node.js 20+ (22 recommended)
- Supabase project (free tier is fine)
- npm

### Setup
1. `npm install`
2. Copy `.env.local.example` → `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` (from Supabase dashboard)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD` (pick strong, share with admins)
3. If running against a fresh Supabase project, apply migrations:
   - `supabase/migrations/00001_schema.sql` (9 tables)
   - `supabase/migrations/00002_rls.sql` (public read policies)
   - Enable realtime publication: `alter publication supabase_realtime add table leaderboard_stats, match_tables, table_players, tournaments;`
4. `npm run dev` → http://localhost:3000

### Tests
- `npm run test` — Vitest in watch mode
- `npm run test:run` — single-shot (CI)

### Build
- `npm run build` — production build
- `npm run start` — run production locally

## Deploy (Vercel)

1. Push to GitHub (this repo).
2. Import project on vercel.com.
   - Root directory: `catan/`
   - Framework preset: Next.js (auto-detected)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
4. Deploy.

## Architecture

- `app/` — Next.js App Router pages
  - `app/actions/` — server actions (tournament/player/match/map/template/admin)
  - `app/admin/` — admin-only pages (guarded by `proxy.ts`)
  - `app/t/[id]/` — public tournament view
  - `app/archive/` — completed tournaments
- `components/`
  - `ui/` — primitives (Button, Card, Badge, Input, Modal, StatTile)
  - `hex/` — HexTile + HexMap SVG
  - `tournament/` — Leaderboard, Bracket, PodiumBlock, etc.
  - `admin/` — admin wizards and forms
  - `layout/` — Shell + Sidebar
- `lib/`
  - `supabase/` — client + server wrappers + generated types
  - `tournament/` — pure TS: distribute, pairing, bracket, tiebreaker, recompute
  - `map/` — pure TS: constants, neighbors, validator, generator (constraint-based shuffle + retry + localSwapRepair)
  - `auth/` — password compare + session management
- `supabase/migrations/` — schema + RLS
- `data/seeds/` — preset map metadata
- `tests/` — Vitest unit tests for pure algorithms

## Design system

See `DESIGN.md` at repo root — the authoritative source for colors, typography, motion, and anti-patterns. Mood: "Catan Night × Live Tournament Energy" (warm-dark, ember accents, kinetic live states).

## MVP Scope Notes

- Admin auth is single shared password (`ADMIN_PASSWORD` env). Supabase Auth migration is trivial when needed.
- Hex-by-hex manual map editing is v2 — MVP has "regenerate" button only.
- Player seating drag-drop is v2 — MVP shows assignments read-only.
- Multi-language support is v2 — MVP is Turkish.
- Automatic bye handling covered only for N=5 edge case (per spec, "5-kişilik turnuva hiç olmayacak" — kullanıcı talebi).
