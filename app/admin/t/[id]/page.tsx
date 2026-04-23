import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { advanceRound } from '@/app/actions/match';
import {
  ArrowRight,
  Play,
  CheckCircle2,
  Map as MapIcon,
  Plus,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type MatchTableRow = {
  id: string;
  table_number: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  round_id: string;
  seat_count: number;
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

export default async function AdminTournamentView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = getServerClient();

  const { data: tData } = await sb
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  if (!tData) notFound();
  const t = tData;

  const { data: roundsData } = await sb
    .from('rounds')
    .select('*')
    .eq('tournament_id', id);
  const rounds = roundsData ?? [];

  const currentRound = rounds.find(
    r =>
      r.round_number === t.current_round &&
      r.round_type === (t.current_round_type ?? 'league')
  );

  const { data: tablesData } = await sb
    .from('match_tables')
    .select('*')
    .in(
      'round_id',
      rounds.map(r => r.id)
    )
    .order('table_number', { ascending: true });
  const allTables = (tablesData ?? []) as MatchTableRow[];

  const currentTables = currentRound
    ? allTables.filter(mt => mt.round_id === currentRound.id)
    : [];

  // Today's concluded tables
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const concludedToday = allTables.filter(
    mt =>
      mt.status === 'completed' &&
      mt.completed_at &&
      new Date(mt.completed_at).getTime() >= midnight.getTime()
  );

  let playersByTable = new Map<
    string,
    (TablePlayerRow & { player: PlayerRow | null })[]
  >();
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
      .select('id,name,seat_code')
      .eq('tournament_id', id);
    const players = (playerData ?? []) as PlayerRow[];
    const playerIx = new Map(players.map(p => [p.id, p]));

    for (const tp of tps) {
      const arr = playersByTable.get(tp.match_table_id) ?? [];
      arr.push({ ...tp, player: playerIx.get(tp.player_id) ?? null });
      playersByTable.set(tp.match_table_id, arr);
    }
  }

  const liveTables = currentTables.filter(mt => mt.status === 'live');
  const concludedThisRound = currentTables.filter(
    mt => mt.status === 'completed'
  );
  const allCompleted =
    currentTables.length > 0 &&
    currentTables.every(mt => mt.status === 'completed');
  const liveCount = liveTables.length;

  // Compute avg match duration of concluded-today
  const avgDuration = (() => {
    const durations = concludedToday
      .filter(tbl => tbl.started_at && tbl.completed_at)
      .map(
        tbl =>
          new Date(tbl.completed_at!).getTime() -
          new Date(tbl.started_at!).getTime()
      );
    if (durations.length === 0) return '--:--:--';
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const total = Math.floor(avg / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const eyebrow = `${weekday.toLowerCase()} · ${t.total_players} players · ${currentTables.length} pods`;
  const heroTitle =
    t.status === 'setup'
      ? 'Setup'
      : t.status === 'elimination'
        ? `Elimination · round ${t.current_round ?? 1}`
        : t.status === 'completed'
          ? 'Concluded'
          : `Round ${t.current_round ?? 1}`;

  const sidebarTournament = {
    id: t.id,
    name: t.name,
    current_round: t.current_round,
    league_rounds: t.league_rounds,
    current_round_type: t.current_round_type,
    status: t.status,
  };

  return (
    <Shell tournament={sidebarTournament} liveCount={liveCount}>
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
          <div
            className="mt-1 font-[var(--font-display)] text-[16px] italic"
            style={{ color: '#A89880' }}
          >
            {t.name}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href={`/t/${id}`}
            className="inline-flex h-8 items-center gap-2 rounded-[6px] bg-transparent px-[14px] font-[var(--font-body)] text-[13px] font-semibold transition-colors hover:bg-[#3A2A1E] hover:text-[#F2E4CA]"
            style={{ color: '#A89880' }}
          >
            Public view
          </Link>
          <Link
            href={`/admin/t/${id}/settings`}
            className="inline-flex h-8 items-center gap-2 rounded-[6px] bg-transparent px-[14px] font-[var(--font-body)] text-[13px] font-semibold transition-colors hover:bg-[#3A2A1E] hover:text-[#F2E4CA]"
            style={{ color: '#A89880' }}
          >
            Settings
          </Link>
          {allCompleted && t.status !== 'completed' && (
            <form
              action={async () => {
                'use server';
                await advanceRound(id);
              }}
            >
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-2 rounded-[6px] border bg-transparent px-[14px] font-[var(--font-body)] text-[13px] font-semibold transition-colors hover:bg-[rgba(232,93,46,0.08)]"
                style={{ borderColor: '#E85D2E', color: '#E85D2E' }}
              >
                {t.status === 'league' &&
                t.current_round !== null &&
                t.league_rounds !== null &&
                t.current_round >= t.league_rounds
                  ? 'Seed elimination'
                  : t.current_round_type === 'elimination'
                    ? 'Advance bracket'
                    : `Pair round ${(t.current_round ?? 0) + 1}`}
                <ArrowRight size={14} strokeWidth={1.75} />
              </button>
            </form>
          )}
          <Link
            href={`/admin/t/${id}/players`}
            className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-transparent px-[14px] font-[var(--font-body)] text-[13px] font-semibold transition-all hover:brightness-110"
            style={{ background: '#E85D2E', color: '#F2E4CA' }}
          >
            <Plus size={14} strokeWidth={2} />
            New match
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
            value={String(t.total_players)}
            delta={
              t.status === 'elimination'
                ? `top ${t.elimination_count} advanced`
                : 'swiss league'
            }
          />
          <StatTile
            label="round"
            value={
              t.status === 'elimination'
                ? `E${t.current_round ?? 1}`
                : `${t.current_round ?? 0}/${t.league_rounds ?? 0}`
            }
            delta={
              t.status === 'elimination'
                ? `single elim · ${t.elimination_count} players`
                : `swiss · ${t.total_players} players`
            }
          />
        </div>

        {/* Setup empty state */}
        {t.status === 'setup' && (
          <EmptyBlock
            title="Not yet started"
            body="Register players and start the tournament to open pod play."
            action={
              <div className="flex gap-2">
                <Link
                  href={`/admin/t/${id}/players`}
                  className="inline-flex h-8 items-center gap-2 rounded-[6px] border px-[14px] font-[var(--font-body)] text-[13px] font-semibold"
                  style={{ borderColor: '#E85D2E', color: '#E85D2E' }}
                >
                  Manage roster
                </Link>
                <Link
                  href={`/admin/t/${id}/seat`}
                  className="inline-flex h-8 items-center gap-2 rounded-[6px] px-[14px] font-[var(--font-body)] text-[13px] font-semibold"
                  style={{ background: '#E85D2E', color: '#F2E4CA' }}
                >
                  Start tournament <ArrowRight size={14} strokeWidth={2} />
                </Link>
              </div>
            }
          />
        )}

        {/* Live pods */}
        {currentTables.length > 0 && (
          <section id="pods">
            <div className="mb-3.5 flex items-baseline justify-between">
              <h2
                className="m-0 font-[var(--font-display)] text-[22px]"
                style={{ color: '#F2E4CA', fontWeight: 600 }}
              >
                Live pods{' '}
                <span className="italic" style={{ color: '#F4B942' }}>
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
                    tournamentId={id}
                    mt={mt}
                    players={(playersByTable.get(mt.id) ?? []).sort(
                      (a, b) => (a.seat_position ?? 0) - (b.seat_position ?? 0)
                    )}
                    live
                  />
                ))}
              </div>
            ) : concludedThisRound.length > 0 ? (
              <EmptyBlock
                title="Round complete"
                body={
                  allCompleted
                    ? 'Advance to the next round when ready.'
                    : 'Waiting on the remaining pods.'
                }
              />
            ) : (
              <EmptyBlock
                title="No pods on the floor"
                body="Pair a round to kick off live play."
              />
            )}
          </section>
        )}

        {/* Recently concluded this round */}
        {concludedThisRound.length > 0 && (
          <section>
            <div className="mb-3.5 flex items-baseline justify-between">
              <h2
                className="m-0 font-[var(--font-display)] text-[22px]"
                style={{ color: '#F2E4CA', fontWeight: 600 }}
              >
                This round{' '}
                <span className="italic" style={{ color: '#F4B942' }}>
                  — concluded
                </span>
              </h2>
              <span
                className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.12em]"
                style={{ color: '#A89880' }}
              >
                {concludedThisRound.length} pod{concludedThisRound.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {concludedThisRound.map(mt => (
                <MatchCard
                  key={mt.id}
                  tournamentId={id}
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
      </div>
    </Shell>
  );
}

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
  const leader = players.reduce<
    (TablePlayerRow & { player: PlayerRow | null }) | null
  >((best, p) => {
    const pVp = p.final_vp ?? 0;
    const bestVp = best?.final_vp ?? -1;
    return pVp > bestVp ? p : best;
  }, null);

  return (
    <div
      className={`flex flex-col gap-3 rounded-[6px] border p-[18px] ${live ? 'animate-breath' : ''}`}
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
            leader?.player_id === p.player_id && (p.final_vp ?? 0) > 0;
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
      <div
        className="mt-1 flex items-center gap-2 border-t pt-3"
        style={{ borderColor: 'rgba(244,185,66,0.08)' }}
      >
        {live ? (
          <Link
            href={`/admin/t/${tournamentId}/score/${mt.id}`}
            className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-[6px] border px-3 font-[var(--font-body)] text-[13px] font-semibold transition-colors hover:bg-[rgba(232,93,46,0.08)]"
            style={{ borderColor: '#E85D2E', color: '#E85D2E' }}
          >
            <Play size={13} strokeWidth={2} /> Enter score
          </Link>
        ) : (
          <Link
            href={`/admin/t/${tournamentId}/score/${mt.id}`}
            className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-[6px] bg-transparent px-3 font-[var(--font-body)] text-[13px] transition-colors hover:bg-[#3A2A1E] hover:text-[#F2E4CA]"
            style={{ color: '#A89880' }}
          >
            <CheckCircle2 size={13} strokeWidth={1.75} /> Review
          </Link>
        )}
        <Link
          href={`/admin/t/${tournamentId}/map/${mt.id}`}
          className="inline-flex h-8 items-center justify-center gap-2 rounded-[6px] bg-transparent px-3 font-[var(--font-body)] text-[13px] transition-colors hover:bg-[#3A2A1E] hover:text-[#F2E4CA]"
          style={{ color: '#A89880' }}
        >
          <MapIcon size={13} strokeWidth={1.75} /> Map
        </Link>
      </div>
    </div>
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
