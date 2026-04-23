import { Shell } from '@/components/layout/Shell';
import { TabBar } from '@/components/tournament/TabBar';
import { Leaderboard, type LeaderboardRow } from '@/components/tournament/Leaderboard';
import { PodiumBlock } from '@/components/tournament/PodiumBlock';
import { StatsStrip } from '@/components/tournament/StatsStrip';
import { LiveTables } from '@/components/tournament/LiveTables';
import { BracketView } from '@/components/tournament/BracketView';
import { RealtimeWrapper } from '@/components/tournament/RealtimeWrapper';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export const dynamic = 'force-dynamic';

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

  // Editorial hero — ported from the Claude Design export (Variant A hero
  // band). Eyebrow is upper-mono with 0.22em tracking, title is Fraunces with
  // an italic gold "emphasis" word, metadata is middot-separated.
  const phase =
    t.status === 'league'
      ? { eyebrow: `${t.name} · round ${t.current_round}`, title: 'the league round', italic: 'league round' }
      : t.status === 'elimination'
        ? { eyebrow: `${t.name} · elimination ${t.current_round}`, title: 'the pressure round', italic: 'pressure round' }
        : t.status === 'completed'
          ? { eyebrow: `${t.name} · final`, title: 'the final standings', italic: 'final standings' }
          : { eyebrow: `${t.name} · setup`, title: 'the setup', italic: 'setup' };

  // Rough "tonight" / "this evening" copy based on current hour — purely
  // editorial flourish, matches the kit's "tuesday evening" italic aside.
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning session' : hour < 17 ? 'afternoon session' : 'evening session';
  const durationText = t.started_at
    ? (() => {
        const ms = Date.now() - new Date(t.started_at).getTime();
        const mins = Math.floor(ms / 60_000);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
      })()
    : '—';

  return (
    <Shell>
      <RealtimeWrapper tournamentId={id}>
      <div style={{ padding: '36px 36px 48px', maxWidth: 1440, margin: '0 auto' }} className="space-y-6">
        {/* Editorial hero band */}
        <div
          className="pb-8"
          style={{ borderBottom: '1px solid rgba(244,185,66,0.10)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span
              className="font-[var(--font-mono)] text-[var(--color-fg-muted)]"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
              }}
            >
              {phase.eyebrow}
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
          </div>
          <h1
            className="m-0 font-[var(--font-display)] text-[var(--color-fg-primary)]"
            style={{
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.02,
            }}
          >
            {phase.title.replace(phase.italic, '').trim()}{' '}
            <em
              className="text-[var(--color-accent-gold)]"
              style={{ fontWeight: 400, fontStyle: 'italic' }}
            >
              {phase.italic}
            </em>
          </h1>
          <div className="mt-5 flex flex-wrap items-center" style={{ gap: 14 }}>
            <span
              className="font-[var(--font-body)] text-[var(--color-fg-muted)] italic"
              style={{ fontSize: 15 }}
            >
              {timeOfDay}
            </span>
            <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
            <span
              className="font-[var(--font-body)] text-[var(--color-fg-muted)]"
              style={{ fontSize: 15 }}
            >
              {t.total_players} players
            </span>
            <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
            <span
              className="inline-flex items-center font-[var(--font-body)] text-[var(--color-fg-muted)]"
              style={{ fontSize: 15, gap: 8 }}
            >
              {activeMatches > 0 ? (
                <>
                  <span
                    className="inline-block rounded-full animate-pulse-ember shrink-0"
                    style={{
                      width: 7,
                      height: 7,
                      background: 'var(--color-accent-live)',
                      boxShadow: '0 0 10px var(--color-accent-live)',
                    }}
                  />
                  {activeMatches} {activeMatches === 1 ? 'pod' : 'pods'} live
                </>
              ) : (
                'no live pods'
              )}
            </span>
          </div>
        </div>

        <StatsStrip
          players={t.total_players}
          activeMatches={activeMatches}
          finishedMatches={finished}
          avgVp={avgVp}
          round={`${t.current_round}/${t.current_round_type === 'league' ? t.league_rounds : '∞'}`}
          duration={durationText}
        />

        <TabBar tabs={tabs} activeKey={tab} />

        {tab === 'leaderboard' && (
          <div className="space-y-10">
            {rows.length >= 3 && <PodiumBlock top3={rows.slice(0, 3)} />}
            <Leaderboard
              rows={rows}
              skipTop={rows.length >= 3 ? 3 : 0}
              title="the field"
              titleStyle="italic"
              roundLabel={
                rows.length >= 3 && rows.length > 3
                  ? `positions 4 — ${rows.length}`
                  : rows.length > 0
                    ? `${rows.length} players`
                    : undefined
              }
            />
          </div>
        )}

        {tab === 'active' && (
          <LiveTables
            title="on the tables"
            eyebrow={activeMatches > 0 ? `${activeMatches} live` : undefined}
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
            title="concluded matches"
            variant="concluded"
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
      </RealtimeWrapper>
    </Shell>
  );
}
