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

  return (
    <Shell>
      <RealtimeWrapper tournamentId={id}>
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
      </RealtimeWrapper>
    </Shell>
  );
}
