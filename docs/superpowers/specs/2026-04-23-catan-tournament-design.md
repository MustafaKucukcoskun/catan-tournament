# Catan Tournament Hub — Design Spec

**Tarih:** 2026-04-23
**Durum:** Draft, kullanıcı onayı bekleniyor
**Timebox:** 1 gün (MVP for live Catan tournament management)
**Stack:** Next.js 16 · Tailwind 4 · Supabase (Postgres + Realtime) · supabase-js · react-hexgrid · seedrandom · Vercel

---

## 1. Overview

Catan (Settlers of Catan) baz oyunu için **turnuva yönetim web uygulaması**. İki kitle var:

- **Admin** (turnuva organizatörü, 1+ kişi): Turnuva oluşturur, oyuncuları kaydeder, masa eşleşmelerini/map'leri yönetir, maç sonuçlarını (VP'leri) girer, sıralamayı ve bracket'i yönetir.
- **Public / Spectator** (sınırsız, auth yok): Canlı liderlik tablosunu, aktif masaları, biten maçları, eleme bracket'ini ve map görsellerini izler.

Uygulama Vercel'e deploy edilir, Supabase Postgres'e bağlanır, supabase-js ile realtime kanallar üzerinden canlı güncelleme yapar. Admin'ler tek bir paylaşılan parola ile `.env` üzerinden yetkilenir — ileride Supabase Auth'a geçiş trivial.

---

## 2. Hedefler ve Hedef Dışı (Non-Goals)

### 2.1 Hedefler (MVP için zorunlu)

1. Admin turnuva oluşturur (ad, oyuncu sayısı, lig turu sayısı, eleme sayısı, map stratejisi)
2. Admin oyuncuları kaydeder (isim)
3. Sistem otomatik masa dağıtımı yapar (4-kişilik + 3-kişilik kombinasyon, N ≥ 6 için bye yok)
4. Sistem ilk lig turunda rastgele pairing yapar, 2+ turda **sliding-window Swiss** + repeat-avoidance
5. Her masaya otomatik Catan map üretir (constraint-based shuffle + retry) veya admin manuel override eder
6. Admin her masanın sonuç VP'lerini girer, sistem kazananı auto-detect eder (en yüksek VP)
7. Lig sonunda sistem **tiered random bracket seeding** ile 4^n oyuncuyu elemeye geçirir
8. Tiebreaker otomatik çalışır (VP → galibiyet → VP% → max single VP → H2H → rastgele); sadece **eleme cutoff'ta** eşitlik kalırsa admin modal'ı açılır
9. Eleme 4-kişilik pod bracket olarak ilerler (4ⁿ → 4ⁿ⁻¹ → ... → 4 → 1 şampiyon)
10. Public UI canlı leaderboard, aktif masalar, biten maçlar, bracket sekmelerini gösterir (realtime)
11. Admin manuel override: oyuncu sürükle-bırak masa yer değiştir, map regenerate/edit, VP düzelt
12. Admin password ile korunur (`.env` + httpOnly cookie + rate limit + timing-safe compare)
13. Her masanın map'i `seed` ile reprodüktif olarak saklanır

### 2.2 Hedef dışı (v1 scope dışı)

- Oyuncu için ayrı hesap / auth
- Oyuncu profilleri, istatistik geçmişi, ELO
- Catan 5-6 kişilik genişleme oyunu (baz 3-4 kişilik)
- 5 kişilik turnuva edge case'i (matematiksel olarak bye gerektirir; kullanıcı açıkça "asla olmaz" dedi, sistem sessiz handle eder ama optimize edilmeyecek)
- Mobile-native app (web responsive yeterli)
- Video streaming / canlı yayın entegrasyonu
- Çoklu dil (v1: Türkçe + teknik terimler İngilizce)
- Preset map library full set — CWC tamamı, yüzlerce template (v1: ~5 seed
  preset + save-as-template + admin template CRUD)
- Player ELO / rating tracking
- External API integration (catanrandomizer.com vs)

### 2.3 Stretch goals (zaman kalırsa)

- Tournament durdurma/devam etme flow'u
- CSV/JSON export (tournament results)
- Match timer (her masada maç süresi geriye sayım, opsiyonel)
- QR kod: oyuncular masalarını bulsun
- "Pair round" butonu — admin manuel pair tetiklemesi
- Dark/light mode toggle (v1 dark-only)

---

## 3. Teknoloji Stack

### 3.1 Frontend

- **Next.js 16** (App Router; CLAUDE.md uyarısı: breaking changes var, implementation'da `node_modules/next/dist/docs/` okunacak + Context7 MCP ile güncel docs çekilecek)
- **React 19.2** (scaffold ile geliyor)
- **Tailwind CSS 4** (`@theme` directive ile token'lar — NOT `tailwind.config.ts`)
- **TypeScript** (strict)
- **react-hexgrid** (SVG hex rendering için; axial coord, Layout/Hexagon/Text component'leri)
- **framer-motion** (kinetic animasyonlar — live pulses, score sparks, podium halo)
- **seedrandom** (reprodüktif map RNG)
- **lucide-react** (icon set — 1.5-2px stroke, Fraunces+DM Sans ile uyumlu)

### 3.2 Backend / Data

- **Supabase Postgres** — relational DB
- **`@supabase/supabase-js`** — client library (read/write/realtime)
- **Supabase Realtime** — postgres_changes subscription ile live leaderboard, live tables, score updates
- **Supabase RLS** — public read policies + service_role write (server actions'tan)

### 3.3 Auth

- **Password-only admin auth** (tek shared password, `.env` `ADMIN_PASSWORD` olarak)
- `crypto.timingSafeEqual` ile constant-time karşılaştırma
- httpOnly + secure + sameSite=strict cookie (7 gün session)
- Rate limit: 5 yanlış / 15 dk IP başına (basit in-memory Map, v1 için yeterli)
- Supabase Auth v1'de yok; gelecek migrasyon trivial

### 3.4 Deploy

- **Vercel** (Next.js native)
- `ADMIN_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — env vars
- Supabase project: free tier v1 için yeterli

### 3.5 Design tooling (implementation sırasında)

- **frontend-design skill** (Anthropic plugin, yüklü) — özgün UI pattern'ları, AI-slop önleyici
- **Magic MCP / 21st.dev** — component builder, inspiration, refiner
- **Context7 MCP** — Next.js 16, Tailwind 4, react-hexgrid güncel docs
- **Claude Design export** (referans) — `C:\dev\Yazılım ve bilişim\Next.js\CATAN\Catan Tournament Hub Design System`

---

## 4. Data Model (Supabase Postgres)

### 4.1 Şema

```sql
-- ============================================================
-- TOURNAMENTS
-- ============================================================
create table tournaments (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  total_players      int  not null check (total_players >= 4),
  league_rounds      int  not null default 0,      -- 0 = salt eleme
  elimination_count  int  not null check (elimination_count in (4, 16, 64, 256)),
  status             text not null default 'setup',
    -- setup | league | elimination | completed
  current_round      int  not null default 0,
  current_round_type text,                         -- league | elimination
  map_strategy       jsonb not null default
    '{"distribution":"same","source":"random"}'::jsonb,
  fairness_preset    text not null default 'balanced',
    -- strict | balanced | random
  map_rules          jsonb not null default
    '{"c1_no_red_adj":true,"c2_no_same_num_adj":true,
      "c3_no_same_resource_adj":true,"c4_max_vertex_pip":10,
      "c5_no_2_12_adj":false,"port_tokens":false,
      "retry_count":500}'::jsonb,
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  completed_at       timestamptz
);

-- ============================================================
-- PLAYERS
-- ============================================================
create table players (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments on delete cascade,
  name           text not null,
  seat_code      text not null,  -- "HK","LF" — avatar initials
  registered_at  timestamptz not null default now(),
  unique (tournament_id, name)
);

-- ============================================================
-- ROUNDS
-- ============================================================
create table rounds (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments on delete cascade,
  round_number   int  not null,
  round_type     text not null check (round_type in ('league','elimination')),
  status         text not null default 'pending',
    -- pending | active | completed
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  completed_at   timestamptz,
  unique (tournament_id, round_number, round_type)
);

-- ============================================================
-- MAP TEMPLATES (preset library + user-saved) — declared before
-- match_tables because match_tables.map_template_id references it
-- ============================================================
create table map_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  source        text not null default 'custom',
    -- CWC | US Nationals | Community | Custom
  year          int,
  players       text not null default '3-4',
  data          jsonb not null,  -- hex layout + ports (SGN-lite format)
  thumbnail_url text,
  is_official   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- MATCH TABLES (maç masası — "table" SQL rezerve, bu yüzden match_tables)
-- ============================================================
create table match_tables (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid not null references rounds on delete cascade,
  table_number    int  not null,
  seat_count      int  not null default 4 check (seat_count in (3, 4)),
  status          text not null default 'pending',
    -- pending | live | completed
  started_at      timestamptz,
  completed_at    timestamptz,
  map_data        jsonb,
    -- { hexes: [...], ports: [...], seed: "abc123" }
  map_seed        text,
  map_template_id uuid references map_templates,
  unique (round_id, table_number)
);

-- ============================================================
-- TABLE PLAYERS (masaya oturan oyuncular + sonuç VP'leri)
-- ============================================================
create table table_players (
  id              uuid primary key default gen_random_uuid(),
  match_table_id  uuid not null references match_tables on delete cascade,
  player_id       uuid not null references players on delete cascade,
  seat_position   int  check (seat_position between 1 and 4),
  final_vp        int  check (final_vp >= 0),
    -- null = henüz girilmedi; 0+ = girildi
  is_winner       boolean not null default false,
  is_bye          boolean not null default false,
  is_virtual      boolean not null default false,
    -- CWC sanal 4. oyuncu (3-kişilik masa için)
  created_at      timestamptz not null default now(),
  unique (match_table_id, player_id)
);

-- ============================================================
-- LEADERBOARD STATS (cached aggregation)
-- ============================================================
create table leaderboard_stats (
  id                uuid primary key default gen_random_uuid(),
  tournament_id     uuid not null references tournaments on delete cascade,
  player_id         uuid not null references players on delete cascade,
  matches_played    int  not null default 0,
  wins              int  not null default 0,
  total_vp          int  not null default 0,
  vp_percent        numeric(6,3) not null default 0,
    -- sum(playerVP / tableTotalVP) — tiebreaker
  best_single_vp    int  not null default 0,
  rank              int,
    -- 1,2,3... — null if not ranked yet
  updated_at        timestamptz not null default now(),
  unique (tournament_id, player_id)
);

-- ============================================================
-- ADMIN SESSIONS (password cookie için)
-- ============================================================
create table admin_sessions (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,  -- SHA-256 of the session token
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ip_hint      text  -- partial IP for audit
);

-- ============================================================
-- ADMIN LOGIN ATTEMPTS (rate limit için)
-- ============================================================
create table admin_login_attempts (
  id          bigserial primary key,
  ip_hash     text not null,  -- SHA-256 of IP
  attempted_at timestamptz not null default now(),
  success     boolean not null default false
);
create index idx_login_attempts_ip_time
  on admin_login_attempts(ip_hash, attempted_at desc);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_players_tournament on players(tournament_id);
create index idx_rounds_tournament on rounds(tournament_id);
create index idx_match_tables_round on match_tables(round_id);
create index idx_table_players_match on table_players(match_table_id);
create index idx_table_players_player on table_players(player_id);
create index idx_leaderboard_tournament on leaderboard_stats(tournament_id, rank);
```

### 4.2 RLS Policies (Row Level Security)

```sql
-- Public read on all tournament data (spectator view)
alter table tournaments enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table match_tables enable row level security;
alter table table_players enable row level security;
alter table leaderboard_stats enable row level security;
alter table map_templates enable row level security;

create policy "public_read_tournaments"    on tournaments
  for select using (true);
create policy "public_read_players"        on players
  for select using (true);
create policy "public_read_rounds"         on rounds
  for select using (true);
create policy "public_read_match_tables"   on match_tables
  for select using (true);
create policy "public_read_table_players"  on table_players
  for select using (true);
create policy "public_read_leaderboard"    on leaderboard_stats
  for select using (true);
create policy "public_read_map_templates"  on map_templates
  for select using (true);

-- Admin session tables: service_role only (no public access)
alter table admin_sessions enable row level security;
alter table admin_login_attempts enable row level security;
-- (No select policy = nobody can read via anon key)
```

**All write operations** go through Next.js server actions using
`service_role` key (bypasses RLS). Client never writes directly.

### 4.3 Derived data invariants

- `leaderboard_stats` is **recomputed** after every score entry (trigger
  or server action — v1 choice: **server action** for simplicity).
- `vp_percent` = `Σ (playerVP / tableTotalVP)` over all matches played.
  For 3-player tables, `tableTotalVP` includes the **virtual 4th player**
  (= mean of the 3 real players) so the percentage is comparable with
  4-player tables.
- `rank` is null until a round completes. After round completes, the
  tiebreaker cascade assigns ranks.

---

## 5. Sayfa / Route Mimarisi

### 5.1 Public rotalar

```
/                              → Hub home — AKTİF turnuvalar listesi (multiple OK)
                                 + "Son biten turnuvalar" kısa özet bandı
                                 + "Arşive git" CTA
/archive                       → Arşiv sayfası — tüm biten turnuvalar grid/timeline
                                 (hem public hem admin görebilir, full details)
/t/[id]                        → Tournament home (aktif veya bitmiş fark etmez)
                                   ↳ Tabs: Leaderboard | Aktif Masalar
                                            | Biten Maçlar | Bracket
/t/[id]/match/[tableId]        → Match detail (full hex map, players, scores)
```

**Multi-active tournament support:** Birden fazla turnuva aynı anda
aktif olabilir. Admin turnuva URL'sini oyunculara paylaşır (örn. 
`https://site.com/t/abc-123`). Ana sayfada aktif turnuvalar listelenir
ki kullanıcılar keşfedebilsin.

**Arşiv sayfası:** Status = `completed` olan tüm turnuvalar listelenir,
her biri için snapshot kart (ad, tarih, şampiyon avatar+ad, oyuncu
sayısı, toplam maç sayısı). Karta tıklanınca turnuva home'a gider — 
spectator tüm leaderboard/bracket/maçları görebilir. **Admin ekstra
yetki:** arşiv turnuvayı rename / silme / düzenleme (nadir, audit-trail 
bırakmalı).

### 5.2 Admin rotalar

```
/admin/login                   → Password input form
/admin                         → Admin dashboard (tüm turnuvalar — aktif + bitmiş)
/admin/new                     → New tournament wizard (multi-step form)
/admin/t/[id]                  → Admin view of tournament (public tabs + edit powers)
/admin/t/[id]/players          → Player roster management + seat_position edit
/admin/t/[id]/seat             → Manual seating drag-drop view
/admin/t/[id]/score/[tableId]  → Score entry modal-as-page
/admin/t/[id]/map/[tableId]    → Map edit modal (hex-by-hex override)
/admin/t/[id]/settings         → Tournament settings (pause, rename, delete)
/admin/map-templates           → Map template library CRUD
                                   ↳ List · Yeni preset ekle · Edit · Delete
                                   ↳ "Save from match" — bir maçın mapini preset'e çevir
```

**Admin override yetkisi — hiçbir kısıtlama yok:** Admin turnuvanın
HER fazında (setup, league, elimination, completed) tüm veriyi
düzenleyebilir: oyuncu ekle/sil/rename, masa aç/kapat, seat_position
değiştir, VP düzelt, kazanan bayrağını override, map regenerate/manuel
edit, tur geri al/ileri al. Audit log her admin değişikliği kaydeder
(nice-to-have, v2 için).

### 5.3 Server actions (Next.js `"use server"`)

Actions file: `app/actions/tournament.ts`, `app/actions/match.ts`,
`app/actions/admin.ts`, `app/actions/map.ts`.

- `createTournament(input)` → insert tournament + round 0
- `addPlayer(tournamentId, name)` → insert player
- `removePlayer(playerId)` → delete (only if tournament status = setup)
- `startTournament(tournamentId)` → transition setup → league (or elimination)
- `generateRoundTables(tournamentId, roundNumber)` → distribute players,
  create match_tables + table_players, generate maps
- `regenerateMap(matchTableId)` → new seed, new map_data
- `updateMapManual(matchTableId, newMapData)` → admin manual override
- `swapPlayers(matchTableIdA, playerA, matchTableIdB, playerB)` → drag-drop
- `enterScore(matchTableId, [{playerId, finalVp}])` → set VP, mark winner,
  recompute leaderboard_stats, check round completion
- `advanceRound(tournamentId)` → mark round complete, generate next round
  or transition to elimination
- `resolveTieAtCutoff(tournamentId, playerAId, playerBId, winnerId)` →
  admin's manual tie resolution
- `adminLogin(password)` → rate limit check, timing-safe compare, cookie set
- `adminLogout()` → cookie delete + session row delete

---

## 6. Key Algoritmalar

### 6.1 Player distribution (masa dağıtımı)

**Girdi:** `N` oyuncu (≥ 4), tablo boyutu 4 (varsayılan) veya 3.

**Çıktı:** `{ fourTables, threeTables, byes }`

```typescript
function distributePlayers(N: number): {
  fourTables: number;
  threeTables: number;
  byes: number;
} {
  // Öncelik: 4'lü masa sayısını maksimize et, 3'lü minimize et, bye son çare
  // 4a + 3b = N denklemini a,b ≥ 0 integers için çöz
  for (let threeTables = 0; threeTables <= Math.floor(N / 3); threeTables++) {
    const remaining = N - threeTables * 3;
    if (remaining >= 0 && remaining % 4 === 0) {
      const fourTables = remaining / 4;
      return { fourTables, threeTables, byes: 0 };
    }
  }
  // N < 6 için bye gerekir (genelde sadece N=5)
  for (let byes = 1; byes <= 3; byes++) {
    for (
      let threeTables = 0;
      threeTables <= Math.floor((N - byes) / 3);
      threeTables++
    ) {
      const remaining = N - byes - threeTables * 3;
      if (remaining >= 0 && remaining % 4 === 0) {
        return { fourTables: remaining / 4, threeTables, byes };
      }
    }
  }
  throw new Error(`Cannot distribute ${N} players`);
}
```

| N   | fourTables | threeTables | byes |
| --- | ---------- | ----------- | ---- |
| 4   | 1          | 0           | 0    |
| 5   | 1          | 0           | 1    |
| 6   | 0          | 2           | 0    |
| 7   | 1          | 1           | 0    |
| 8   | 2          | 0           | 0    |
| ... | ...        | ...         | ...  |
| 41  | 8          | 3           | 0    |
| 44  | 11         | 0           | 0    |
| 45  | 9          | 3           | 0    |

### 6.2 Pairing — Tur 1 random, Tur 2+ sliding-window Swiss

```typescript
function pairLeagueRound(
  players: Player[],
  roundNumber: number,
  tournament: Tournament,
): Table[] {
  if (roundNumber === 1) {
    // Fully random
    shuffle(players);
    return distributeToTables(players, tournament);
  }

  // Round 2+: Swiss pairing
  const sortedByVP = [...players].sort((a, b) => b.totalVp - a.totalVp);
  const tables: Table[] = [];
  const pool = [...sortedByVP];
  const windowSize = 3; // ± positions

  const { fourTables, threeTables } = distributePlayers(players.length);

  // 4-kişilik masalar önce
  for (let t = 0; t < fourTables; t++) {
    const seat1 = pool.shift()!; // en yüksek puanlı
    const table: Player[] = [seat1];

    for (let seat = 2; seat <= 4; seat++) {
      // Pencere: pool'un başından ±windowSize aday
      const windowEnd = Math.min(windowSize, pool.length);
      const candidates = pool
        .slice(0, windowEnd)
        .filter((p) => !hasPlayedWith(table, p));

      if (candidates.length === 0) {
        // Constraint relax: repeat izin ver
        candidates.push(...pool.slice(0, windowEnd));
      }

      // Rastgele seç
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      table.push(picked);
      pool.splice(pool.indexOf(picked), 1);
    }

    tables.push({ players: table, seatCount: 4 });
  }

  // 3-kişilik masalar (eğer varsa)
  for (let t = 0; t < threeTables; t++) {
    const seats: Player[] = [];
    for (let seat = 1; seat <= 3; seat++) {
      if (pool.length === 0) break;
      const picked = pool.shift()!;
      seats.push(picked);
    }
    tables.push({ players: seats, seatCount: 3 });
  }

  return tables;
}
```

**Repeat avoidance:** `hasPlayedWith(table, player)` — bu oyuncu önceki
turlarda `table`'daki herhangi biriyle aynı masada oynadı mı? Soft
constraint: ideal durumda hayır, imkansızsa fallback (relax).

### 6.3 Elimination bracket — Tiered random seeding

```typescript
function seedBracket(
  topN: Player[], // top `elimCount` players sorted by rank
  elimCount: number, // 4, 16, 64, 256
): Table[] {
  if (elimCount === 4) {
    // Final tek masa — shuffle edip masaya oturt
    const shuffled = [...topN];
    shuffle(shuffled);
    return [{ players: shuffled, seatCount: 4 }];
  }

  const tableCount = elimCount / 4;

  // 4 tier'a böl
  const tier1 = topN.slice(0, tableCount); // favoriler
  const tier2 = topN.slice(tableCount, tableCount * 2); // güçlü orta
  const tier3 = topN.slice(tableCount * 2, tableCount * 3); // zayıf orta
  const tier4 = topN.slice(tableCount * 3, tableCount * 4); // underdog

  // Her tier'ı shuffle (kullanıcının istediği rastgelelik)
  shuffle(tier1);
  shuffle(tier2);
  shuffle(tier3);
  shuffle(tier4);

  // Transpose: her masa her tier'dan 1 oyuncu
  const tables: Table[] = [];
  for (let i = 0; i < tableCount; i++) {
    tables.push({
      players: [tier1[i], tier2[i], tier3[i], tier4[i]],
      seatCount: 4,
    });
  }

  return tables;
}
```

**Eleme ilerleyişi:** Her tur `advance(tables)` çağrısı her masadan kazananı alır (`is_winner: true`), bu oyuncuları bir sonraki tura yeni bracket ile aktarır. 16 → 4 masa → 4 kazanan → **final** (4 kişilik tek masa) → şampiyon.

### 6.4 Catan map generator — constraint-based shuffle + retry

**Kurallar (admin toggle'lanabilir):**

| Kod | Kural                                       | Default |
| --- | ------------------------------------------- | ------- |
| C1  | 6 ve 8 bitişik olamaz (kırmızı sayı)        | on      |
| C2  | Aynı sayı token'ları bitişik olamaz         | on      |
| C3  | Aynı resource hex'ler bitişik olamaz        | on      |
| C4  | Bir vertex (3 hex kesişimi) toplam pip ≤ 10 | on      |
| C5  | 2 ve 12 bitişik olamaz                      | off     |

**Pip değerleri:** 2/12=1, 3/11=2, 4/10=3, 5/9=4, 6/8=5.

```typescript
const RESOURCE_POOL = [
  "wood",
  "wood",
  "wood",
  "wood", // 4
  "sheep",
  "sheep",
  "sheep",
  "sheep", // 4
  "wheat",
  "wheat",
  "wheat",
  "wheat", // 4
  "brick",
  "brick",
  "brick", // 3
  "ore",
  "ore",
  "ore", // 3
  "desert", // 1
];
const TOKEN_POOL = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
const PORT_POOL = [
  { type: "generic" },
  { type: "generic" },
  { type: "generic" },
  { type: "generic" },
  { type: "wood" },
  { type: "brick" },
  { type: "sheep" },
  { type: "wheat" },
  { type: "ore" },
];

const HEX_POSITIONS_19 = [
  // axial coordinates (q, r)
  { q: 0, r: -2 },
  { q: 1, r: -2 },
  { q: 2, r: -2 },
  { q: -1, r: -1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: 2, r: -1 },
  { q: -2, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 2, r: 0 },
  { q: -2, r: 1 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
  { q: 1, r: 1 },
  { q: -2, r: 2 },
  { q: -1, r: 2 },
  { q: 0, r: 2 },
];

function generateMap(config: MapConfig): MapData {
  const rng = seedrandom(config.seed ?? randomSeed());

  for (let attempt = 0; attempt < config.retryCount; attempt++) {
    const resources = shuffle(RESOURCE_POOL, rng);
    const tokens = shuffleTokensExcludingDesert(TOKEN_POOL, resources, rng);
    const layout = HEX_POSITIONS_19.map((pos, i) => ({
      ...pos,
      resource: resources[i],
      token: resources[i] === "desert" ? null : tokens[nextTokenIdx()],
      pip: resources[i] === "desert" ? 0 : pipValue(tokens[nextTokenIdx()]),
    }));

    if (validate(layout, config.rules)) {
      const ports = shuffle(PORT_POOL, rng);
      return {
        hexes: layout,
        ports,
        seed: config.seed,
        attempts: attempt + 1,
        score: computeFairnessScore(layout),
      };
    }
  }

  // Fallback: local swap repair
  return localSwapRepair(/* best candidate */);
}

function validate(layout: Hex[], rules: MapRules): boolean {
  for (const hex of layout) {
    for (const neighbor of neighbors(hex, layout)) {
      if (rules.c1_no_red_adj && isRed(hex) && isRed(neighbor)) return false;
      if (
        rules.c2_no_same_num_adj &&
        hex.token === neighbor.token &&
        hex.token !== null
      )
        return false;
      if (rules.c3_no_same_resource_adj && hex.resource === neighbor.resource)
        return false;
      if (rules.c5_no_2_12_adj && isTwoTwelve(hex) && isTwoTwelve(neighbor))
        return false;
    }
  }
  // C4: vertex pip toplamı kontrolü
  for (const vertex of allVertices(layout)) {
    if (sumPips(vertex) > rules.c4_max_vertex_pip) return false;
  }
  return true;
}
```

**Map data JSON şeması** (DB'de `map_data` olarak saklanır):

```json
{
  "hexes": [
    {"q": 0, "r": -2, "resource": "wood", "token": 11, "pip": 2},
    ...
  ],
  "ports": [
    {"edgeId": 0, "type": "generic", "ratio": 3},
    ...
  ],
  "seed": "abc123",
  "attempts": 47,
  "score": 87
}
```

### 6.5 Tiebreaker cascade

```typescript
function rankPlayers(players: PlayerStats[]): RankedPlayer[] {
  return players.sort((a, b) => {
    // 1. Toplam VP (birincil)
    if (a.totalVp !== b.totalVp) return b.totalVp - a.totalVp;
    // 2. Galibiyet sayısı
    if (a.wins !== b.wins) return b.wins - a.wins;
    // 3. VP% (Victory Point Percentage)
    if (a.vpPercent !== b.vpPercent) return b.vpPercent - a.vpPercent;
    // 4. En yüksek tek-oyun VP
    if (a.bestSingleVp !== b.bestSingleVp)
      return b.bestSingleVp - a.bestSingleVp;
    // 5. Head-to-head (bu çift aynı masada oynadıysa)
    const h2h = headToHeadComparison(a.playerId, b.playerId);
    if (h2h !== 0) return h2h;
    // 6. Rastgele
    return Math.random() - 0.5;
  });
}
```

**Eleme cutoff modal'ı** (sadece burada admin'e sorulur):

```typescript
function detectCutoffTies(
  ranked: RankedPlayer[],
  elimCount: number,
): TieConflict[] {
  const conflicts: TieConflict[] = [];
  // Sadece sıralama elimCount ile elimCount+1 arası kontrol
  const atCutoff = ranked[elimCount - 1];
  const justBelow = ranked[elimCount];
  if (!justBelow) return [];

  if (isTruelyTied(atCutoff, justBelow)) {
    conflicts.push({ players: [atCutoff, justBelow], decidedBy: "admin" });
  }
  // Grup eşitlik var mı (3+ oyuncu cutoff civarı eşit)
  // ... expand cluster
  return conflicts;
}
```

### 6.6 Auto-winner detection

Maç sonucu girildikten sonra:

```typescript
function determineWinner(tablePlayers: TablePlayer[]): TablePlayer {
  // En yüksek VP kazanır (oyuncu 10+ VP ile oyunu bitirmiştir)
  // Catan kuralı: 2 oyuncu aynı anda 10+ VP'ye ulaşamaz
  // (Sadece sırası olan oyuncu "kazandım" diyebilir; gelişme kartı VP'leri
  // oto-reveal olur; o yüzden max VP = kazanan)
  return tablePlayers.reduce((max, p) =>
    (p.finalVp ?? 0) > (max.finalVp ?? 0) ? p : max,
  );
}
```

Admin manuel override: "Kazanan" bayrağını farklı oyuncuya çevirebilir (nadir
edge case için).

### 6.7 Leaderboard recomputation

Her `enterScore` veya `updateScore` sonrası:

```typescript
async function recomputeLeaderboard(tournamentId: string) {
  const allTablePlayers = await fetchAllScoredTablePlayers(tournamentId);
  const playerStats = new Map<string, PlayerStats>();

  for (const tp of allTablePlayers) {
    if (tp.finalVp === null) continue; // henüz skor girilmedi
    const stats = playerStats.get(tp.playerId) ?? blankStats(tp.playerId);

    stats.matchesPlayed += 1;
    stats.totalVp += tp.finalVp;
    stats.bestSingleVp = Math.max(stats.bestSingleVp, tp.finalVp);
    if (tp.isWinner) stats.wins += 1;

    // VP% hesabı: masa toplamına böl
    const tableTotal = computeTableTotal(tp.matchTableId);
    // 3-kişilik ise sanal 4. oyuncu dahil (= ortalama)
    stats.vpPercent += tp.finalVp / tableTotal;

    playerStats.set(tp.playerId, stats);
  }

  // Tiebreaker cascade ile sırala
  const ranked = rankPlayers([...playerStats.values()]);

  // DB'ye yaz
  for (const [i, stats] of ranked.entries()) {
    await upsertLeaderboardStat({ ...stats, rank: i + 1 });
  }
}
```

**Not:** v1'de bu server action'da her skor girişinden sonra tetiklenir.
v2'de Postgres trigger + materialized view'e çevrilebilir.

---

## 7. UI Akışları (Admin + Spectator)

### 7.1 Admin: Turnuva oluştur

1. `/admin/login` → password gir → cookie set
2. `/admin/new` → wizard:
   - Adım 1: Turnuva adı, oyuncu sayısı
   - Adım 2: Mod — Salt eleme (`leagueRounds=0`) / Lig + eleme (`leagueRounds≥1`)
   - Adım 3: Eleme sayısı (4 / 16 / 64 / 256)
   - Adım 4: **Uyumsuzluk kontrolü** — `totalPlayers` ile `eliminationCount` uyumsuzsa (ve `leagueRounds=0` ise) modal: "Oyuncu sayısını düşür" veya "Lig turu ekle"
   - Adım 5: Map stratejisi (aynı/farklı/gruplu × random/manuel/preset)
   - Adım 6: Map kuralları (fairness preset, C1-C5 toggles, retry count)
   - Onayla → `createTournament` action → redirect to `/admin/t/[id]`

### 7.2 Admin: Oyuncu kaydı + tur başlat

1. `/admin/t/[id]/players` → ad girme formu + liste
2. Her ad için `addPlayer`
3. `totalPlayers` dolunca "Başlat" butonu aktif olur
4. `startTournament` → round 1 otomatik pairing + map generation → redirect to `/admin/t/[id]`

### 7.3 Admin: Skor girişi

1. `/admin/t/[id]` Aktif Masalar tabında masa kartına tıkla
2. `/admin/t/[id]/score/[tableId]` modal/sayfa açılır
3. 4 (veya 3) oyuncu için VP input alanları
4. "Kazanan" bayrağı (otomatik en yüksek VP'ye işaretlenir, admin override edebilir)
5. "Kaydet" → `enterScore` action → `recomputeLeaderboard` → realtime event yayınlanır

### 7.4 Admin: Tur ilerlet

1. Tüm masalarda skor girildiğinde "Tur tamamla" butonu aktif olur
2. `advanceRound`:
   - Eğer son lig turu değilse → yeni lig turu pairing'i oluştur
   - Eğer son lig turu ise → elemeye geçiş, bracket seeding + map generation
   - Eğer eleme turu ise → kazananları bir sonraki elemeye geçir (veya şampiyon ilan et)
3. **Eleme cutoff tie** varsa: `detectCutoffTies` → modal açılır → admin kararını girer → `resolveTieAtCutoff`

### 7.5 Admin: Masa / map override

1. `/admin/t/[id]` Aktif Masalar tabında "düzenle" icon'u
2. Oyuncuları drag-drop masa-arası taşı → `swapPlayers`
3. Map kartında "🔄 Regenerate" → `regenerateMap` (yeni seed)
4. Map kartında "✏️ Düzenle" → `/admin/t/[id]/map/[tableId]` hex-by-hex editor → `updateMapManual`

### 7.6 Spectator: İzleme

1. `/` → redirect to aktif turnuva
2. `/t/[id]` default: Leaderboard tab
   - Podium top 3 (canlı gold halo on #1)
   - Stats strip (6 tile, Active tile'ında LIVE pulse)
   - Table (rank, avatar, name, played, wins, VP)
   - Side panel: Live tables (3-5 compact card, breathing glow)
3. Tab geçişleri: Aktif Masalar | Biten Maçlar | Bracket
4. Masa kartına tıkla → `/t/[id]/match/[tableId]` full map + player details

---

## 8. Admin Auth sistemi

### 8.1 Login flow

```typescript
// app/actions/admin.ts
export async function adminLogin(formData: FormData) {
  "use server";
  const password = formData.get("password") as string;
  const ip = headers().get("x-forwarded-for") ?? "unknown";
  const ipHash = sha256(ip);

  // Rate limit check
  const recentAttempts = await sb
    .from("admin_login_attempts")
    .select("id", { count: "exact" })
    .eq("ip_hash", ipHash)
    .eq("success", false)
    .gte("attempted_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

  if ((recentAttempts.count ?? 0) >= 5) {
    return { ok: false, error: "Çok fazla yanlış deneme. 15 dakika bekleyin." };
  }

  // Timing-safe compare
  const expected = process.env.ADMIN_PASSWORD!;
  const success =
    crypto.timingSafeEqual(
      Buffer.from(password.padEnd(expected.length).slice(0, expected.length)),
      Buffer.from(expected),
    ) && password === expected;

  await sb.from("admin_login_attempts").insert({ ip_hash: ipHash, success });

  if (!success) {
    return { ok: false, error: "Şifre yanlış." };
  }

  // Create session
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  await sb.from("admin_sessions").insert({
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ip_hint: ip.slice(0, 10),
  });

  cookies().set("admin_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  redirect("/admin");
}
```

### 8.2 Middleware guard

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  if (
    req.nextUrl.pathname.startsWith("/admin") &&
    req.nextUrl.pathname !== "/admin/login"
  ) {
    const token = req.cookies.get("admin_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    // Session DB check (hash compare)
    const valid = await checkSession(sha256(token));
    if (!valid) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
}
```

---

## 9. Realtime events (Supabase)

Client subscription:

```typescript
// app/t/[id]/page.tsx
useEffect(() => {
  const channel = supabase
    .channel(`tournament:${tournamentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "leaderboard_stats",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      (payload) => updateLeaderboard(payload),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "match_tables" },
      (payload) => updateActiveTables(payload),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "table_players" },
      (payload) => updateMatchProgress(payload),
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, [tournamentId]);
```

**UI reaksiyonu:**

- `match_tables.status` `pending → live`: kart "breathing" animasyonu başlat, ember glow
- `match_tables.status` `live → completed`: 1 saniye gold halo pulse, sonra sakinleş
- `table_players.final_vp` değişir: ilgili satırda gold spark burst (600ms), number spring bounce
- `leaderboard_stats.rank` değişir: satır slide-swap animasyonu (300ms spring)

---

## 10. Tasarım direktifi

**Authoritative kaynak:** `DESIGN.md` (repo root).

**Özetle:**

- Mood: **Catan Night × Live Tournament Energy** (warm-dark brown, ember accents, kinetic live states)
- Typography: **Fraunces** (display, italic moments) + **DM Sans** (body) + **JetBrains Mono** (data)
- Palette: `#1A1208` bg, `#E85D2E` ember, `#FF6B35` live, `#F4B942` gold
- Shape: 4-10px radius, 1px warm-tinted hairlines, no shadow on regular cards
- Motion: 150-200ms ease-out default + kinetic layer (live pulses, breathing cards, spark bursts, winner halo)
- Avoid list: Inter/Roboto/Cinzel, purple gradients, glassmorphism, wood-grain, medieval iconography (detaylı DESIGN.md'de)

**Implementation sırasında kullanılacak tooling:**

- `frontend-design` plugin — özgün UI pattern'ları, AI-slop önleyici checklist
- Magic MCP / 21st.dev — component inspiration + builder + refiner
- Context7 MCP — Next.js 16 + Tailwind 4 + react-hexgrid güncel docs

**Referans:** Claude Design export bundle'ı (`C:\dev\Yazılım ve bilişim\Next.js\CATAN\Catan Tournament Hub Design System`) — kullanıcının beğendiği tasarım yönü, layout ve tone referansı. Bunu **taklit etme**, "inspire from" olarak kullan — daha **eğlenceli** moments ekleyebiliriz (celebratory micro-interactions, playful loading states, warmer hover effects).

### 10.1 Eğlence vurgusu + Renk açma (kullanıcı talebi — güncellenmiş)

**Kullanıcı geri bildirimi (2026-04-23):** "Uygulama iç karartıcı havası
var, bu kadar kapalı olmasına gerek yok — genel tasarımı bozmadan bazı
kısımları renk olarak açabiliriz."

DESIGN.md v3'te yapılan değişiklikler (buna göre):
- Background tokenları biraz lightened (`--bg-deep` `#1A1208` → `#1F1409`,
  `--bg-surface` `#2A1E14` → `#2F2217`, `--bg-elevated` → `#42311F`)
- Yeni `--bg-highlight: #5A4228` — **spotlight zones** için: podium
  area, hero band, featured live pod cards, champion reveal
- Resource renkleri daha saturated (forest, sheep, brick, wheat, sand
  biraz daha canlı)
- Accent discipline biraz daha gevşetildi — stat tile ikonları state
  göstergesi ise subtle accent alabilir

**Spotlight zones — nerede `--bg-highlight` kullan:**
- Podium block (top 3) container'ı
- Hero band turnuva adı alanı
- Featured live pod cards (en aktif maçlar için)
- Champion cinematic reveal sayfası
- Active tab highlight

Genel tasarım **korunur** (Catan Night warmth + kinetic enerji), sadece
"önemli moment" alanları kullanıcının dikkatini daha sıcak tutar.

**Eğlenceli dokunuşlar (implementasyon sırasında eklenecek):**

- Loading state'ler: "dice rolling" animasyon (iki küçük zar ikon
  rotasyonu) veya hex tile flip cascade
- Empty state'ler: tek büyük hex + samimi mesaj (örn. "Henüz masa yok
  — ilk turnuva burada başlar")
- Hover micro-interactions: hex tile'larda warm glow + subtle ease-out,
  player avatars'da initials flash
- Turnuva başlama sequence: 2 saniyelik cinematic overlay ("Turnuva
  Başladı!" Fraunces italic fade-in, sonra kaybolur)
- Final şampiyon: dramatic reveal — black overlay 1 sn, center podium
  avatar altın halo expand, confetti **one-shot** (max 2 saniye, gold
  spark shower — düşen partikül değil)
- Tur geçiş animasyonu: tablo satırlarında sıra değişikliklerinde
  ince slide-swap (layoutId ile framer-motion)

**NOT:** Yine de DESIGN.md'deki avoid list'e uy — endless confetti yok,
scroll parallax yok, card tilt yok.

---

## 11. Kabul Kriterleri (MVP)

### 11.1 Must have (ship blockers)

- [ ] Admin password ile giriş yapabilir, rate limit çalışır
- [ ] Admin yeni turnuva oluşturabilir (wizard, tüm parametreler)
- [ ] Admin oyuncu ekleyebilir, totalPlayers dolana kadar
- [ ] Uyumsuzluk tespit edilir ve modal gösterilir (totalPlayers ≠ elimCount, leagueRounds=0)
- [ ] Admin turnuvayı başlatabilir (round 1 auto-pair + map gen)
- [ ] Her maç masası için Catan map üretilir ve DB'de saklanır
- [ ] Public `/` ana sayfa aktif turnuvaları listeler (multi-active support)
- [ ] Public `/archive` biten turnuvaları grid olarak gösterir (hem public hem admin erişim)
- [ ] Public `/t/[id]` leaderboard canlı güncellenir (realtime)
- [ ] Aktif masalar canlı görünür, breathing glow animasyonu
- [ ] Admin skor girebilir (4 player VP + kazanan bayrağı auto)
- [ ] Skor girişi sonrası leaderboard otomatik yeniden hesaplanır
- [ ] Admin turu ilerletebilir (pairing veya eleme geçiş)
- [ ] Eleme bracket görselleştirilir (4'lü pod grid yapısı — **tiered random seeding** ile kurulur, NOT serpantine)
- [ ] Eleme cutoff tie varsa admin modal açılır
- [ ] Final şampiyon ilan edilir, turnuva `completed` statüsüne geçer
- [ ] Admin manuel override her yerde: oyuncu swap, map regenerate/edit, VP edit, seat_position düzenle, kazanan override
- [ ] **Admin map-templates CRUD sayfası** — preset template ekle/düzenle/sil + "save from match"
- [ ] **5 preset map seed** DB'ye yüklenmiş (resmi turnuva map'lerinden, manuel transcribe)
- [ ] Responsive: mobile, tablet, desktop
- [ ] Dark theme only (v1), **`--bg-highlight` spotlight zones** implementiert
- [ ] Turkish UI strings

### 11.2 Nice to have (varsa)

- [ ] Map manuel edit modal (hex-by-hex)
- [ ] Preset map library (5 seed preset + save-as-template)
- [ ] Tournament list page (geçmiş turnuvalar)
- [ ] CSV export
- [ ] Turnuva başlangıç cinematic sequence
- [ ] Final şampiyon dramatic reveal
- [ ] Live match timer (başlangıcından beri X dakika)
- [ ] Empty states illustrations
- [ ] Loading: dice roll animation

### 11.3 Out of scope (v1'de yapılmayacak)

- Player auth / profile
- Player history / ELO
- Multi-language
- Native mobile app
- Catan 5-6 player extension
- Tournament pause/resume
- Video broadcast
- External map API integration

---

## 12. Kararlara Bağlanan Açık Sorular (2026-04-23)

Hepsi kullanıcı ile netleştirildi — referans olarak saklıyorum:

1. **Public `/` anasayfa:** Aktif turnuvalar listelenir (multi-active
   support). Aktif yoksa "Son biten turnuvalar" bandı + "Arşive git"
   CTA gösterilir. Admin kullanıcılara turnuva URL'sini direkt paylaşır
   (`/t/[id]`), ama kullanıcılar ana sayfadan da aktif turnuvaları
   keşfedebilir.

2. **Preset map seed data:** V1'de **5 preset template** DB'ye seed
   edilecek (resmi turnuva map'lerinden manuel transcribe —
   catancollector.com + Catan Studio 2019 PDF üzerinden). Admin panelinden
   (`/admin/map-templates`) bu preset'ler **düzenlenebilir / silinebilir /
   yeni preset eklenebilir**. Ayrıca "save from match" — bir maçın
   map'ini tek tıkla preset'e çevirme.

3. **Champion declaration UX:** Final kazananı ilan edildikten sonra
   turnuva `completed` statüsüne geçer. **Multi-active tournament
   support var** — birden fazla turnuva aynı anda aktif olabilir. V1
   senaryosunda çoğunlukla 1 aktif turnuva olacak, ama sistem teknik
   olarak sınırsız destekler.

4. **Tournament archive:** `/archive` sayfası v1 kapsamında. Biten
   turnuvalar grid/timeline olarak görünür; tüm detayları (leaderboard,
   bracket, maç geçmişi, map'ler) hem public hem admin **tam olarak**
   görüntüleyebilir. Silme işlemi admin yetkisinde (kullanıcı talebi).

5. **Player order (seat position):** Random olarak atanır başlangıçta,
   ama **admin her zaman her yerde düzenleyebilir** — seat_position
   dahil tüm alanlarda override yetkisi var. Admin uygulama içinde
   **hiçbir yerde kısıtlanmaz**.

6. **Bye puanı (N=5 edge case):** Kullanıcı "hiç olmayacak, kafana
   göre yap" dedi. V1 default: bye oyuncu o tur `matches_played` sayısına
   dahil değil, VP değişmez. Leaderboard'da etki yok.

---

## 13. İmplementasyon Sırasında Kullanılacak Notlar

- **Next.js 16 uyarısı (CLAUDE.md):** Breaking changes var. Implementation
  başlamadan önce `node_modules/next/dist/docs/` içindeki ilgili guide'lar
  okunacak. Context7 MCP ile güncel docs çekilecek (app router, server
  actions, middleware, dynamic routes).
- **Tailwind 4:** Token'lar `tailwind.config.ts`'de değil, CSS dosyasında
  `@theme` directive'i içinde tanımlanır. Bu yeni bir convention.
- **Supabase RLS:** Public read policies aktif olmalı, aksi halde spectator
  view veri göremez. Service_role key sadece server actions'ta kullanılır.
- **react-hexgrid:** Axial coordinate kullanır; `Layout`, `Hexagon`, `Text`
  component'leri hazır. Pointy-top ya da flat-top seçimi — Catan için
  **pointy-top** (standart Catan tahtası görünümü).
- **framer-motion:** Kinetic animasyonlar için. `motion.div` wrapper,
  `layoutId` ile rank swap, `AnimatePresence` ile modal transitions.
- **seedrandom:** `Math.seedrandom(seedString)` ile deterministic RNG.
  Map seed'ini DB'ye kaydet, ileride aynı seed ile tekrar oluştur.
- **Date handling:** `created_at`, `started_at`, `completed_at` hepsi
  timestamptz, UTC saklanır, UI'da `toLocaleString('tr-TR')` ile gösterilir.

---

## 14. Dizin Yapısı (önerilen)

```
catan/
├── app/
│   ├── layout.tsx
│   ├── globals.css                   # Tailwind 4 @theme directive
│   ├── page.tsx                      # Hub home — aktif turnuvalar listesi
│   ├── archive/
│   │   └── page.tsx                  # Biten turnuvalar arşivi
│   ├── t/
│   │   └── [id]/
│   │       ├── page.tsx              # Tournament home (tabs)
│   │       └── match/[tableId]/page.tsx
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── page.tsx                  # Admin dashboard
│   │   ├── new/page.tsx              # Create tournament wizard
│   │   ├── map-templates/
│   │   │   ├── page.tsx              # Template library CRUD
│   │   │   └── [id]/page.tsx         # Template edit
│   │   └── t/[id]/
│   │       ├── page.tsx              # Admin tournament view
│   │       ├── players/page.tsx
│   │       ├── seat/page.tsx
│   │       ├── score/[tableId]/page.tsx
│   │       ├── map/[tableId]/page.tsx
│   │       └── settings/page.tsx
│   └── actions/
│       ├── tournament.ts
│       ├── match.ts
│       ├── map.ts
│       ├── template.ts
│       └── admin.ts
├── components/
│   ├── ui/                           # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── StatTile.tsx
│   ├── hex/
│   │   ├── HexTile.tsx
│   │   ├── HexMap.tsx
│   │   └── HexMapEditor.tsx
│   ├── tournament/
│   │   ├── Leaderboard.tsx
│   │   ├── LiveTables.tsx
│   │   ├── BracketView.tsx
│   │   ├── MatchDetail.tsx
│   │   ├── PodiumBlock.tsx
│   │   └── StatsStrip.tsx
│   ├── admin/
│   │   ├── ScoreEntryModal.tsx
│   │   ├── NewTournamentWizard.tsx
│   │   ├── PlayerRoster.tsx
│   │   └── SeatingDragDrop.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Shell.tsx
│       └── TabBar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Anon client
│   │   ├── server.ts                # Service role client
│   │   └── types.ts                 # Generated from DB schema
│   ├── tournament/
│   │   ├── distribute.ts            # Player distribution algo
│   │   ├── pairing.ts               # Swiss pairing
│   │   ├── bracket.ts               # Tiered random seeding
│   │   ├── tiebreaker.ts            # Ranking cascade
│   │   └── advance.ts               # Round advancement
│   ├── map/
│   │   ├── generator.ts             # Constraint-based shuffle+retry
│   │   ├── validator.ts             # C1-C5 rules
│   │   ├── neighbors.ts             # Axial coord neighbor math
│   │   └── presets.ts               # Seed preset library
│   └── auth/
│       ├── password.ts              # timing-safe compare
│       └── session.ts               # Cookie + DB session
├── data/
│   └── seeds/
│       └── tournament-presets.json  # Map template seed data
├── middleware.ts                     # Admin auth guard
├── DESIGN.md                         # Design system source of truth
└── package.json
```

---

## Son söz

Bu spec **MVP'nin tüm kritik kararlarını** kapsıyor. İmplementasyon
sırasında UI detaylar (özellikle tasarım, animasyon tuning, empty
states) iteratif olarak gelişecek — `frontend-design` plugin, Magic
MCP ve Claude Design export referansı ile.

**Spec onaylanınca:** `superpowers:writing-plans` skill → detaylı
implementasyon planı (task breakdown, dependency graph, timeline).

**Onay istenen noktalar:**

- Data model (§4) — schema doğru mu?
- Algoritmalar (§6) — net mi, eksik edge case var mı?
- Kabul kriterleri (§11) — MVP scope bu mu?
- Açık sorular (§12) — cevap ne?
- Tasarım direktifi (§10) — eğlence vurgusu yeterli mi?



