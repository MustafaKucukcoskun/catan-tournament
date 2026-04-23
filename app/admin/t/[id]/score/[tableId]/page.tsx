import { Shell } from '@/components/layout/Shell';
import { ScoreEntryForm } from '@/components/admin/ScoreEntryForm';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ScorePage({ params }: {
  params: Promise<{ id: string; tableId: string }>
}) {
  const { id, tableId } = await params;
  const sb = getServerClient();
  const { data: mt } = await sb.from('match_tables').select('*').eq('id', tableId).single();
  if (!mt) notFound();
  const { data: tps } = await sb.from('table_players').select('*').eq('match_table_id', tableId)
    .order('seat_position', { ascending: true });
  const { data: players } = await sb.from('players').select('*')
    .in('id', (tps ?? []).map(tp => tp.player_id));
  const pMap = new Map((players ?? []).map(p => [p.id, p]));

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-3xl font-[var(--font-display)]">Masa {mt.table_number} — Skor Girişi</h1>
        <ScoreEntryForm
          tournamentId={id}
          matchTableId={tableId}
          players={(tps ?? []).map(tp => ({
            id: tp.id,
            playerId: tp.player_id,
            name: pMap.get(tp.player_id)?.name ?? '—',
            seatCode: pMap.get(tp.player_id)?.seat_code ?? '??',
            seatPosition: tp.seat_position ?? 0,
          }))}
        />
      </div>
    </Shell>
  );
}
