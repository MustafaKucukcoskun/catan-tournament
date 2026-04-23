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
-- (no select/insert policies = service_role only access)
