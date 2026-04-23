-- ============================================================
-- TOURNAMENTS
-- ============================================================
create table tournaments (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  total_players      int  not null check (total_players >= 4),
  league_rounds      int  not null default 0,
  elimination_count  int  not null check (elimination_count in (4, 16, 64, 256)),
  status             text not null default 'setup',
  current_round      int  not null default 0,
  current_round_type text,
  map_strategy       jsonb not null default
    '{"distribution":"same","source":"random"}'::jsonb,
  fairness_preset    text not null default 'balanced',
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
  seat_code      text not null,
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
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  completed_at   timestamptz,
  unique (tournament_id, round_number, round_type)
);

-- ============================================================
-- MAP TEMPLATES (declared before match_tables for FK order)
-- ============================================================
create table map_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  source        text not null default 'custom',
  year          int,
  players       text not null default '3-4',
  data          jsonb not null,
  thumbnail_url text,
  is_official   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- MATCH TABLES
-- ============================================================
create table match_tables (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid not null references rounds on delete cascade,
  table_number    int  not null,
  seat_count      int  not null default 4 check (seat_count in (3, 4)),
  status          text not null default 'pending',
  started_at      timestamptz,
  completed_at    timestamptz,
  map_data        jsonb,
  map_seed        text,
  map_template_id uuid references map_templates,
  unique (round_id, table_number)
);

-- ============================================================
-- TABLE PLAYERS
-- ============================================================
create table table_players (
  id              uuid primary key default gen_random_uuid(),
  match_table_id  uuid not null references match_tables on delete cascade,
  player_id       uuid not null references players on delete cascade,
  seat_position   int  check (seat_position between 1 and 4),
  final_vp        int  check (final_vp >= 0),
  is_winner       boolean not null default false,
  is_bye          boolean not null default false,
  is_virtual      boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (match_table_id, player_id)
);

-- ============================================================
-- LEADERBOARD STATS
-- ============================================================
create table leaderboard_stats (
  id                uuid primary key default gen_random_uuid(),
  tournament_id     uuid not null references tournaments on delete cascade,
  player_id         uuid not null references players on delete cascade,
  matches_played    int  not null default 0,
  wins              int  not null default 0,
  total_vp          int  not null default 0,
  vp_percent        numeric(6,3) not null default 0,
  best_single_vp    int  not null default 0,
  rank              int,
  updated_at        timestamptz not null default now(),
  unique (tournament_id, player_id)
);

-- ============================================================
-- ADMIN SESSIONS
-- ============================================================
create table admin_sessions (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ip_hint      text
);

-- ============================================================
-- ADMIN LOGIN ATTEMPTS
-- ============================================================
create table admin_login_attempts (
  id           bigserial primary key,
  ip_hash      text not null,
  attempted_at timestamptz not null default now(),
  success      boolean not null default false
);
create index idx_login_attempts_ip_time
  on admin_login_attempts(ip_hash, attempted_at desc);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_players_tournament       on players(tournament_id);
create index idx_rounds_tournament        on rounds(tournament_id);
create index idx_match_tables_round       on match_tables(round_id);
create index idx_table_players_match      on table_players(match_table_id);
create index idx_table_players_player     on table_players(player_id);
create index idx_leaderboard_tournament   on leaderboard_stats(tournament_id, rank);
