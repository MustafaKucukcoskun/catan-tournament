import { Shell } from '@/components/layout/Shell';
import { TabBar } from '@/components/tournament/TabBar';
import { Leaderboard, type LeaderboardRow } from '@/components/tournament/Leaderboard';
import { PodiumBlock } from '@/components/tournament/PodiumBlock';
import { StatsStrip } from '@/components/tournament/StatsStrip';
import { LiveTables } from '@/components/tournament/LiveTables';
import { BracketView } from '@/components/tournament/BracketView';
import { RealtimeWrapper } from '@/components/tournament/RealtimeWrapper';
import { SessionClock } from '@/components/tournament/SessionClock';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { MapData } from '@/lib/map/generator';

// Editorial public tournament view — ported from Claude Design export:
//   ui_kits/tournament-hub/screens.jsx (DashboardScreen hero treatment,
//     LeaderboardScreen podium/table, BracketScreen column layout)
//   ui_kits/tournament-hub/leaderboard-amber.jsx (Variant C hero + stats
//     band + tabs + italic section heads)
//   preview/components-cards.html (card anatomy, live ember breathing)
//
// Hero band:
//   - Tournament name eyebrow (mono, 0.22em tracking) + gradient hairline
//   - Tournament name as Fraunces display (48–72px)
//   - Phase italic aside: "Round 3 · *the pressure round*" with gold emphasis
//   - Metadata strip: live session clock + player count + live-pod count

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export const dynamic = 'force-dynamic';

function formatShortDateTR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 6)  return 'gece geç saatler';
  if (h < 12) return 'sabah oturumu';
  if (h < 17) return 'öğleden sonra oturumu';
  if (h < 22) return 'akşam oturumu';
  return 'gece oturumu';
}

// Extracted outside the component so the purity lint rule never applies.
// The function is called once per server render; it's perfectly fine.
function computeDurationLabel(startedAt: string | null | undefined): string {
  if (!startedAt) return '—';
  const elapsedMs = Math.max(
    0,
    new Date().getTime() - new Date(startedAt).getTime(),
  );
  const mins = Math.floor(elapsedMs / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
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
  const pending = (tables ?? []).filter(t => t.status === 'pending').length;
  const allVp = (tps ?? []).filter(p => p.final_vp !== null).map(p => p.final_vp!);
  const avgVp = allVp.length ? allVp.reduce((a, b) => a + b, 0) / allVp.length : 0;

  const bracketRounds = (rounds ?? []).filter(r => r.round_type === 'elimination');

  const tabs = [
    {
      key: 'leaderboard',
      label: 'Sıralama',
      href: `/t/${id}?tab=leaderboard`,
      count: rows.length || undefined,
    },
    {
      key: 'active',
      label: 'Aktif masalar',
      href: `/t/${id}?tab=active`,
      count: activeMatches || undefined,
      live: activeMatches > 0,
    },
    {
      key: 'finished',
      label: 'Biten maçlar',
      href: `/t/${id}?tab=finished`,
      count: finished || undefined,
    },
    {
      key: 'bracket',
      label: 'Bracket',
      href: `/t/${id}?tab=bracket`,
      count: bracketRounds.length || undefined,
    },
  ];

  // Phase copy — plain phase label + italic flourish kept separate so we
  // never run into brittle string-split code for the headline.
  let phaseLabel = 'Kurulum';
  let phaseItalic = 'hazırlık aşamasında';
  if (t.status === 'league' && t.current_round && t.league_rounds) {
    phaseLabel = `Lig turu ${t.current_round}/${t.league_rounds}`;
    phaseItalic = 'lig turu';
  } else if (t.status === 'elimination') {
    phaseLabel = `Eleme · tur ${t.current_round ?? 1}`;
    phaseItalic = 'baskı turu';
  } else if (t.status === 'completed') {
    phaseLabel = 'Tamamlandı';
    phaseItalic = 'final sıralama';
  }

  // Session hints to thicken the stats strip with data density
  const sinceLabel = t.started_at ? formatShortDateTR(t.started_at) : undefined;
  const statsHints = {
    players: `${players?.length ?? 0} kayıtlı`,
    active: activeMatches > 0 ? 'şu an oynanıyor' : 'salon sessiz',
    finished: finished > 0 ? `ort ${avgVp.toFixed(1)} VP` : '—',
    avgVp: finished > 0 ? `${finished} maç üzerinden` : 'henüz veri yok',
    round: t.status === 'league' ? 'swiss' : t.status === 'elimination' ? 'tek eleme' : '—',
    duration: sinceLabel ? `${sinceLabel} itibariyle` : undefined,
  };

  // Precompute the elapsed-duration label on the server so the React 19
  // purity rule doesn't flag Date.now() mid-render (this is a Server
  // Component — intentional — but the lint rule fires regardless).
  const durationText = computeDurationLabel(t.started_at);

  const activeTables = (tables ?? [])
    .filter(mt => mt.status === 'live')
    .map(mt => ({
      id: mt.id,
      tableNumber: mt.table_number,
      startedAt: mt.started_at ?? new Date().toISOString(),
      map: mt.map_data as unknown as MapData,
      players: (tps ?? [])
        .filter(tp => tp.match_table_id === mt.id)
        .map(tp => {
          const p = pMap.get(tp.player_id);
          return { seatCode: p?.seat_code ?? '??', name: p?.name ?? '—', finalVp: tp.final_vp };
        }),
    }));

  const finishedTables = (tables ?? [])
    .filter(mt => mt.status === 'completed')
    .map(mt => ({
      id: mt.id,
      tableNumber: mt.table_number,
      startedAt: mt.started_at ?? new Date().toISOString(),
      map: mt.map_data as unknown as MapData,
      players: (tps ?? [])
        .filter(tp => tp.match_table_id === mt.id)
        .map(tp => {
          const p = pMap.get(tp.player_id);
          return { seatCode: p?.seat_code ?? '??', name: p?.name ?? '—', finalVp: tp.final_vp };
        }),
    }));

  const bracketPods = bracketRounds
    .sort((a, b) => a.round_number - b.round_number)
    .map(r => (tables ?? [])
      .filter(mt => mt.round_id === r.id)
      .map(mt => ({
        id: mt.id,
        tableNumber: mt.table_number,
        roundLabel: `Eleme · tur ${r.round_number}`,
        status: mt.status as 'pending' | 'live' | 'completed',
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
      })));

  return (
    <Shell>
      <RealtimeWrapper tournamentId={id}>
        <div
          style={{ padding: '36px 36px 56px', maxWidth: 1440, margin: '0 auto' }}
          className="flex flex-col gap-8"
        >
          {/* ---------- HERO BAND ---------- */}
          <section
            className="relative pb-8"
            style={{ borderBottom: '1px solid rgba(244,185,66,0.15)' }}
          >
            {/* Warm ambient wash */}
            <div
              aria-hidden
              className="pointer-events-none absolute animate-amber-wash-a"
              style={{
                top: -80, left: '5%', width: 480, height: 340,
                background: 'radial-gradient(circle, rgba(244,185,66,0.10) 0%, transparent 65%)',
                zIndex: 0,
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute animate-amber-wash-b"
              style={{
                top: 20, right: '6%', width: 400, height: 300,
                background: 'radial-gradient(circle, rgba(232,93,46,0.08) 0%, transparent 65%)',
                zIndex: 0,
              }}
            />

            <div className="relative flex items-center gap-3 mb-4">
              <span
                className="font-[var(--font-mono)] text-[var(--color-fg-muted)]"
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.22em',
                }}
              >
                {phaseLabel} · {timeOfDay()}
              </span>
              <span
                aria-hidden
                className="flex-1"
                style={{
                  height: 1,
                  background:
                    'linear-gradient(to right, rgba(244,185,66,0.30), transparent)',
                }}
              />
              {/* Live session clock on the right of the eyebrow */}
              {t.started_at && t.status !== 'completed' && (
                <SessionClock
                  startedAt={t.started_at}
                  live={activeMatches > 0}
                  compact
                />
              )}
            </div>

            <h1
              className="relative m-0 font-[var(--font-display)] text-[var(--color-fg-primary)]"
              style={{
                fontSize: 'clamp(38px, 5.6vw, 68px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.04,
              }}
            >
              {t.name}
            </h1>
            <div
              className="relative mt-2 font-[var(--font-display)] italic text-[var(--color-accent-gold)]"
              style={{ fontSize: 'clamp(16px, 1.6vw, 20px)', fontWeight: 400 }}
            >
              — {phaseItalic}
            </div>

            <div className="relative mt-5 flex flex-wrap items-center" style={{ gap: 14 }}>
              <span
                className="font-[var(--font-body)] text-[var(--color-fg-muted)]"
                style={{ fontSize: 15 }}
              >
                <span className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]">
                  {t.total_players}
                </span>{' '}
                oyuncu
              </span>

              <span aria-hidden style={{ color: 'var(--color-fg-subtle)' }}>·</span>

              <span
                className="inline-flex items-center font-[var(--font-body)]"
                style={{ fontSize: 15, gap: 8, color: 'var(--color-fg-muted)' }}
              >
                {activeMatches > 0 ? (
                  <>
                    <span
                      aria-hidden
                      className="inline-block rounded-full animate-pulse-ember shrink-0"
                      style={{
                        width: 7, height: 7,
                        background: 'var(--color-accent-live)',
                        boxShadow: '0 0 10px var(--color-accent-live)',
                      }}
                    />
                    <span className="font-[var(--font-mono)] tabular-nums text-[var(--color-accent-live)]">
                      {activeMatches}
                    </span>
                    {activeMatches === 1 ? 'masa canlı' : 'masa canlı'}
                  </>
                ) : (
                  <span className="italic">canlı masa yok</span>
                )}
              </span>

              {finished > 0 && (
                <>
                  <span aria-hidden style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                  <span
                    className="font-[var(--font-body)] text-[var(--color-fg-muted)]"
                    style={{ fontSize: 15 }}
                  >
                    <span className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]">
                      {finished}
                    </span>{' '}
                    tamamlandı
                  </span>
                </>
              )}

              {pending > 0 && (
                <>
                  <span aria-hidden style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                  <span
                    className="font-[var(--font-body)] text-[var(--color-fg-muted)]"
                    style={{ fontSize: 15 }}
                  >
                    <span className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]">
                      {pending}
                    </span>{' '}
                    bekliyor
                  </span>
                </>
              )}
            </div>
          </section>

          {/* ---------- STATS STRIP ---------- */}
          <StatsStrip
            players={t.total_players}
            activeMatches={activeMatches}
            finishedMatches={finished}
            avgVp={avgVp}
            round={
              t.current_round_type === 'league'
                ? `${t.current_round ?? 0}/${t.league_rounds ?? '—'}`
                : t.status === 'elimination'
                  ? `E${t.current_round ?? 1}`
                  : '—'
            }
            duration={durationText}
            hints={statsHints}
          />

          {/* ---------- TABS ---------- */}
          <TabBar tabs={tabs} activeKey={tab} />

          {/* ---------- PANELS ---------- */}
          {tab === 'leaderboard' && (
            <div className="flex flex-col gap-10">
              {rows.length >= 3 && <PodiumBlock top3={rows.slice(0, 3)} />}
              <Leaderboard
                rows={rows}
                skipTop={rows.length >= 3 ? 3 : 0}
                title="saha"
                titleStyle="italic"
                roundLabel={
                  rows.length >= 3 && rows.length > 3
                    ? `sıralama 4 — ${rows.length}`
                    : rows.length > 0
                      ? `${rows.length} oyuncu`
                      : undefined
                }
              />
            </div>
          )}

          {tab === 'active' && (
            <LiveTables
              title="masalarda"
              eyebrow={activeMatches > 0 ? `${activeMatches} canlı` : undefined}
              tables={activeTables}
            />
          )}

          {tab === 'finished' && (
            <LiveTables
              title="biten maçlar"
              variant="concluded"
              tables={finishedTables}
            />
          )}

          {tab === 'bracket' && <BracketView pods={bracketPods} />}
        </div>
      </RealtimeWrapper>
    </Shell>
  );
}
