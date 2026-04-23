import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { getServerClient } from '@/lib/supabase/server';
import { adminLogout } from '@/app/actions/admin';
import { Plus, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

type TournamentRow = {
  id: string;
  name: string;
  status: string;
  total_players: number;
  league_rounds: number | null;
  current_round: number | null;
  current_round_type: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type MatchTableRow = {
  id: string;
  table_number: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  round_id: string;
};

type RoundRow = {
  id: string;
  tournament_id: string;
  round_number: number;
  round_type: string;
  status: string;
};

type TablePlayerRow = {
  id: string;
  match_table_id: string;
  player_id: string;
  final_vp: number | null;
  is_winner: boolean;
  seat_position: number | null;
};

type PlayerRow = {
  id: string;
  name: string;
  seat_code: string;
  tournament_id: string;
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(s => s[0]!)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatElapsed(startedAt: string | null): string {
  if (!startedAt) return '--:--';
  const started = new Date(startedAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - started) / 1000));
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatConcludedTime(completedAt: string | null): string {
  if (!completedAt) return 'concluded';
  const d = new Date(completedAt);
  return `concluded ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default async function AdminDashboard() {
  const sb = getServerClient();

  // All tournaments, newest first
  const { data: allData } = await sb
    .from('tournaments')
    .select(
      'id,name,status,total_players,league_rounds,current_round,current_round_type,started_at,completed_at,created_at'
    )
    .order('created_at', { ascending: false });

  const all = (allData ?? []) as (TournamentRow & { created_at: string })[];
  const active = all.filter(
    t => t.status === 'league' || t.status === 'elimination'
  );
  const setup = all.filter(t => t.status === 'setup');
  const completed = all.filter(t => t.status === 'completed');

  // Prefer the most-recently-started active tournament as the "focus"
  const focus: TournamentRow | null = active[0] ?? null;

  // Load round / table / player context for the focus tournament (if any)
  let currentTables: MatchTableRow[] = [];
  let concludedToday: MatchTableRow[] = [];
  let playersByTable = new Map<string, (TablePlayerRow & { player: PlayerRow | null })[]>();
  let currentRoundNumber: number | null = null;
  let totalPlayers = 0;

  if (focus) {
    totalPlayers = focus.total_players;
    const { data: roundsData } = await sb
      .from('rounds')
      .select('id,tournament_id,round_number,round_type,status')
      .eq('tournament_id', focus.id);
    const rounds = (roundsData ?? []) as RoundRow[];
    const currentRound = rounds.find(
      r =>
        r.round_number === focus.current_round &&
        r.round_type === (focus.current_round_type ?? 'league')
    );
    currentRoundNumber = focus.current_round;

    const { data: tablesData } = await sb
      .from('match_tables')
      .select('id,table_number,status,started_at,completed_at,round_id')
      .in(
        'round_id',
        rounds.map(r => r.id)
      )
      .order('table_number', { ascending: true });
    const allTables = (tablesData ?? []) as MatchTableRow[];

    currentTables = currentRound
      ? allTables.filter(t => t.round_id === currentRound.id)
      : [];

    // Concluded today = tables completed since local midnight
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    concludedToday = allTables.filter(
      t =>
        t.status === 'completed' &&
        t.completed_at &&
        new Date(t.completed_at).getTime() >= midnight.getTime()
    );

    if (allTables.length > 0) {
      const { data: tpData } = await sb
        .from('table_players')
        .select('id,match_table_id,player_id,final_vp,is_winner,seat_position')
        .in(
          'match_table_id',
          allTables.map(t => t.id)
        );
      const tps = (tpData ?? []) as TablePlayerRow[];

      const { data: playerData } = await sb
        .from('players')
        .select('id,name,seat_code,tournament_id')
        .eq('tournament_id', focus.id);
      const players = (playerData ?? []) as PlayerRow[];
      const playerIx = new Map(players.map(p => [p.id, p]));

      for (const tp of tps) {
        const arr = playersByTable.get(tp.match_table_id) ?? [];
        arr.push({ ...tp, player: playerIx.get(tp.player_id) ?? null });
        playersByTable.set(tp.match_table_id, arr);
      }
    }
  }

  const liveTables = currentTables.filter(t => t.status === 'live');
  const concludedThisRound = currentTables.filter(
    t => t.status === 'completed'
  );
  const liveCount = liveTables.length;

  // Compute avg match duration (concluded today)
  const avgDuration = (() => {
    const durations = concludedToday
      .filter(t => t.started_at && t.completed_at)
      .map(
        t =>
          new Date(t.completed_at!).getTime() -
          new Date(t.started_at!).getTime()
      );
    if (durations.length === 0) return '--:--:--';
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const total = Math.floor(avg / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  // Subtitle eyebrow for the top bar
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const eyebrow = focus
    ? `${weekday.toLowerCase()} · ${focus.total_players} players · ${currentTables.length} pods`
    : `${weekday.toLowerCase()} · tournament director`;
  const heroTitle = focus
    ? focus.status === 'elimination'
      ? `Elimination · round ${focus.current_round ?? 1}`
      : `Round ${focus.current_round ?? 1}`
    : 'Admin';

  const sidebarFocus = focus
    ? {
        id: focus.id,
        name: focus.name,
        current_round: focus.current_round,
        league_rounds: focus.league_rounds,
        current_round_type: focus.current_round_type,
        status: focus.status,
      }
    : null;

  return (
    <Shell tournament={sidebarFocus} liveCount={liveCount}>
      {/* Top bar */}
      <header
        className="flex items-end justify-between gap-5 border-b px-9 pb-5 pt-7"
        style={{ borderColor: 'rgba(244,185,66,0.10)' }}
      >
        <div>
          <div
            className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.12em]"
            style={{ color: '#A89880' }}
          >
            {eyebrow}
          </div>
          <h1
            className="mt-1.5 font-[var(--font-display)] text-[32px] leading-[1.2]"
            style={{
              color: '#F2E4CA',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            {heroTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <form action={adminLogout}>
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-2 rounded-[6px] bg-transparent px-[14px] font-[var(--font-body)] text-[13px] font-semibold transition-colors hover:bg-[#3A2A1E] hover:text-[#F2E4CA]"
              style={{ color: '#A89880' }}
            >
              Sign out
            </button>
          </form>
          {focus && focus.status === 'league' ? (
            <Link
              href={`/admin/t/${focus.id}`}
              className="inline-flex h-8 items-center gap-2 rounded-[6px] border bg-transparent px-[14px] font-[var(--font-body)] text-[13px] font-semibold transition-colors hover:bg-[rgba(232,93,46,0.08)]"
              style={{
                borderColor: '#E85D2E',
                color: '#E85D2E',
              }}
            >
              Pair round {(focus.current_round ?? 0) + 1}
            </Link>
          ) : null}
          <Link
            href="/admin/new"
            className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-transparent px-[14px] font-[var(--font-body)] text-[13px] font-semibold transition-all hover:brightness-110"
            style={{
              background: '#E85D2E',
              color: '#F2E4CA',
              boxShadow: 'none',
            }}
          >
            <Plus size={14} strokeWidth={2} />
            New tournament
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-6 px-9 py-7">
        {/* Stat tiles */}
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="active matches"
            value={String(liveCount)}
            delta={
              liveCount > 0
                ? `${liveCount} pod${liveCount === 1 ? '' : 's'} on the floor`
                : 'no live pods'
            }
            live={liveCount > 0}
          />
          <StatTile
            label="concluded today"
            value={String(concludedToday.length)}
            delta={
              concludedToday.length > 0
                ? `avg ${avgDuration}`
                : 'quiet so far'
            }
          />
          <StatTile
            label="players on deck"
            value={String(totalPlayers)}
            delta={
              focus
                ? focus.status === 'elimination'
                  ? 'single elim · top cut'
                  : 'swiss league'
                : `${all.length} tournament${all.length === 1 ? '' : 's'}`
            }
          />
          <StatTile
            label="round"
            value={
              focus
                ? focus.status === 'elimination'
                  ? `E${focus.current_round ?? 1}`
                  : `${focus.current_round ?? 0}/${focus.league_rounds ?? 0}`
                : String(all.length)
            }
            delta={
              focus
                ? `${focus.status === 'elimination' ? 'elimination' : 'swiss'} · ${focus.total_players} players`
                : `${active.length} live · ${setup.length} setup`
            }
          />
        </div>

        {/* Live pods section (focus tournament) */}
        {focus && (
          <section id="pods">
            <div className="mb-3.5 flex items-baseline justify-between">
              <h2
                className="m-0 font-[var(--font-display)] text-[22px]"
                style={{ color: '#F2E4CA', fontWeight: 600 }}
              >
                Live pods{' '}
                <span
                  className="italic"
                  style={{ color: '#F4B942' }}
                >
                  — now playing
                </span>
              </h2>
              <span
                className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.12em]"
                style={{ color: '#A89880' }}
              >
                {liveTables.length} live · {concludedThisRound.length} concluded
              </span>
            </div>
            {liveTables.length > 0 ? (
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                {liveTables.map(mt => (
                  <MatchCard
                    key={mt.id}
                    tournamentId={focus.id}
                    mt={mt}
                    players={(playersByTable.get(mt.id) ?? []).sort(
                      (a, b) => (a.seat_position ?? 0) - (b.seat_position ?? 0)
                    )}
                    live
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock
                title="No pods on the floor"
                body="Pair a round to kick off live play."
              />
            )}
          </section>
        )}

        {/* Recently concluded */}
        {focus && concludedThisRound.length > 0 && (
          <section>
            <div className="mb-3.5 flex items-baseline justify-between">
              <h2
                className="m-0 font-[var(--font-display)] text-[22px]"
                style={{ color: '#F2E4CA', fontWeight: 600 }}
              >
                Recently concluded
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {concludedThisRound.slice(0, 6).map(mt => (
                <MatchCard
                  key={mt.id}
                  tournamentId={focus.id}
                  mt={mt}
                  players={(playersByTable.get(mt.id) ?? []).sort(
                    (a, b) => (b.final_vp ?? 0) - (a.final_vp ?? 0)
                  )}
                  live={false}
                />
              ))}
            </div>
          </section>
        )}

        {/* Tournament roster — always present, but visually secondary to pods */}
        <section>
          <div className="mb-3.5 flex items-baseline justify-between">
            <h2
              className="m-0 font-[var(--font-display)] text-[22px]"
              style={{ color: '#F2E4CA', fontWeight: 600 }}
            >
              Tournaments{' '}
              <span
                className="italic"
                style={{ color: '#F4B942' }}
              >
                — all rooms
              </span>
            </h2>
            <span
              className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.12em]"
              style={{ color: '#A89880' }}
            >
              {active.length} live · {setup.length} setup · {completed.length} archived
            </span>
          </div>

          {all.length === 0 ? (
            <EmptyBlock
              title="No tournaments yet"
              body="Create the first one to open the hall."
              action={
                <Link
                  href="/admin/new"
                  className="inline-flex h-8 items-center gap-2 rounded-[6px] px-[14px] font-[var(--font-body)] text-[13px] font-semibold"
                  style={{ background: '#E85D2E', color: '#F2E4CA' }}
                >
                  <Plus size={14} strokeWidth={2} /> New tournament
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {all.map(t => (
                <TournamentRowCard key={t.id} t={t} isFocus={t.id === focus?.id} />
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );

  // ---- inline helpers kept here for locality ----

  function StatTile({
    label,
    value,
    delta,
    live,
  }: {
    label: string;
    value: string;
    delta?: string;
    live?: boolean;
  }) {
    return (
      <div
        className={`flex flex-col gap-2 rounded-[6px] border p-4 ${live ? 'animate-breath' : ''}`}
        style={{
          background: '#2A1E14',
          borderColor: live ? '#FF6B35' : 'rgba(244,185,66,0.10)',
          boxShadow: live
            ? '0 0 0 1px #FF6B35, 0 0 20px rgba(255,107,53,0.35)'
            : 'none',
        }}
      >
        <div
          className="flex items-center gap-1.5 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.12em]"
          style={{ color: live ? '#FF6B35' : '#A89880' }}
        >
          {live && (
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse-ember rounded-full"
              style={{
                background: '#FF6B35',
                boxShadow: '0 0 10px #FF6B35',
              }}
              aria-hidden
            />
          )}
          {label}
        </div>
        <div
          className="font-[var(--font-mono)] text-[32px] leading-none tabular-nums"
          style={{ color: '#F2E4CA', fontWeight: 600 }}
        >
          {value}
        </div>
        {delta && (
          <div
            className="font-[var(--font-mono)] text-[11px] tabular-nums"
            style={{ color: '#A89880' }}
          >
            {delta}
          </div>
        )}
      </div>
    );
  }

  function MatchCard({
    tournamentId,
    mt,
    players,
    live,
  }: {
    tournamentId: string;
    mt: MatchTableRow;
    players: (TablePlayerRow & { player: PlayerRow | null })[];
    live: boolean;
  }) {
    const leader = players.reduce<(TablePlayerRow & { player: PlayerRow | null }) | null>(
      (best, p) => {
        const pVp = p.final_vp ?? 0;
        const bestVp = best?.final_vp ?? -1;
        return pVp > bestVp ? p : best;
      },
      null
    );

    return (
      <Link
        href={
          live
            ? `/admin/t/${tournamentId}/score/${mt.id}`
            : `/admin/t/${tournamentId}/score/${mt.id}`
        }
        className={`flex flex-col gap-3 rounded-[6px] border p-[18px] transition-all ${live ? 'animate-breath' : ''}`}
        style={{
          background: '#2A1E14',
          borderColor: live ? '#FF6B35' : 'rgba(244,185,66,0.10)',
          boxShadow: live
            ? '0 0 0 1px #FF6B35, 0 0 20px rgba(255,107,53,0.35)'
            : 'none',
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-1.5 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.12em]"
            style={{ color: live ? '#FF6B35' : '#A89880' }}
          >
            {live && (
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse-ember rounded-full"
                style={{
                  background: '#FF6B35',
                  boxShadow: '0 0 10px #FF6B35',
                }}
                aria-hidden
              />
            )}
            {live
              ? `LIVE · pod ${mt.table_number}`
              : `pod ${mt.table_number} · ${formatConcludedTime(mt.completed_at)}`}
          </div>
          {live && (
            <span
              className="font-[var(--font-mono)] text-[16px] tabular-nums"
              style={{
                color: '#F2E4CA',
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              {formatElapsed(mt.started_at)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {players.map(p => {
            const isLeader =
              leader?.player_id === p.player_id &&
              (p.final_vp ?? 0) > 0;
            const isOut = !live && (p.final_vp ?? 0) === 0 && !p.is_winner;
            return (
              <div
                key={p.id}
                className="flex items-center gap-2.5"
                style={{ opacity: isOut ? 0.5 : 1 }}
              >
                <div
                  className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full font-[var(--font-display)] text-[11px] font-semibold"
                  style={{
                    background: '#3A2A1E',
                    border: p.is_winner
                      ? '1.5px solid #F4B942'
                      : '1px solid rgba(244,185,66,0.15)',
                    color: '#F2E4CA',
                  }}
                >
                  {p.player ? initials(p.player.name) : '··'}
                </div>
                <span
                  className="flex-1 font-[var(--font-body)] text-[14px]"
                  style={{ color: '#F2E4CA' }}
                >
                  {p.player?.name ?? 'Seat open'}
                </span>
                <span
                  className="font-[var(--font-mono)] text-[13px] tabular-nums"
                  style={{
                    color: isLeader || p.is_winner ? '#F4B942' : '#A89880',
                    fontWeight: isLeader || p.is_winner ? 600 : 400,
                  }}
                >
                  {p.final_vp ?? 0} VP
                </span>
              </div>
            );
          })}
        </div>
      </Link>
    );
  }

  function TournamentRowCard({
    t,
    isFocus,
  }: {
    t: TournamentRow;
    isFocus: boolean;
  }) {
    const tone =
      t.status === 'completed'
        ? 'gold'
        : t.status === 'setup'
          ? 'neutral'
          : 'live';
    const label =
      t.status === 'league'
        ? `Round ${t.current_round ?? 1}/${t.league_rounds ?? 0}`
        : t.status === 'elimination'
          ? `Elim · ${t.current_round ?? 1}`
          : t.status === 'completed'
            ? 'Concluded'
            : 'Setup';
    return (
      <Link
        href={`/admin/t/${t.id}`}
        className="group flex flex-col gap-3 rounded-[6px] border p-[18px] transition-colors"
        style={{
          background: '#2A1E14',
          borderColor: isFocus
            ? 'rgba(244,185,66,0.35)'
            : 'rgba(244,185,66,0.10)',
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-[2px] font-[var(--font-mono)] text-[11px] uppercase tracking-[0.12em]"
            style={{
              background:
                tone === 'gold'
                  ? 'rgba(244,185,66,0.15)'
                  : tone === 'live'
                    ? 'rgba(255,107,53,0.15)'
                    : '#3A2A1E',
              color:
                tone === 'gold'
                  ? '#F4B942'
                  : tone === 'live'
                    ? '#FF6B35'
                    : '#A89880',
            }}
          >
            {tone === 'live' && (
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse-ember rounded-full"
                style={{
                  background: '#FF6B35',
                  boxShadow: '0 0 8px #FF6B35',
                }}
                aria-hidden
              />
            )}
            {label}
          </span>
          <span
            className="font-[var(--font-mono)] text-[11px] tabular-nums"
            style={{ color: '#A89880' }}
          >
            {t.total_players} players
          </span>
        </div>
        <h3
          className="m-0 font-[var(--font-display)] text-[20px] leading-tight"
          style={{ color: '#F2E4CA', fontWeight: 600 }}
        >
          {t.name}
        </h3>
        <div
          className="mt-auto flex items-center gap-1.5 font-[var(--font-body)] text-[13px]"
          style={{ color: '#A89880' }}
        >
          Open console
          <ArrowRight
            size={14}
            strokeWidth={1.75}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </Link>
    );
  }

  function EmptyBlock({
    title,
    body,
    action,
  }: {
    title: string;
    body: string;
    action?: React.ReactNode;
  }) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-[6px] border px-6 py-12 text-center"
        style={{
          background: '#2A1E14',
          borderColor: 'rgba(244,185,66,0.10)',
        }}
      >
        <div
          className="font-[var(--font-display)] text-[20px] italic"
          style={{ color: '#A89880', fontWeight: 500 }}
        >
          {title}
        </div>
        <div
          className="font-[var(--font-body)] text-[14px]"
          style={{ color: '#5A4A36' }}
        >
          {body}
        </div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  }
}
