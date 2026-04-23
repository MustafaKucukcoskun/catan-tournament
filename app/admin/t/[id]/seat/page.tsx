import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PlayerAvatar } from '@/components/tournament/PlayerAvatar';
import { getServerClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth/session';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SeatingPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) redirect('/admin/login');
  const { id } = await params;
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', id).single();
  if (!t) notFound();
  const { data: rounds } = await sb.from('rounds').select('*').eq('tournament_id', id)
    .eq('round_number', t.current_round).eq('round_type', t.current_round_type!);
  const { data: tables } = await sb.from('match_tables').select('*')
    .in('round_id', (rounds ?? []).map(r => r.id));
  const { data: tps } = await sb.from('table_players').select('*')
    .in('match_table_id', (tables ?? []).map(mt => mt.id));
  const { data: players } = await sb.from('players').select('*').eq('tournament_id', id);
  const pMap = new Map((players ?? []).map(p => [p.id, p]));

  return (
    <Shell variant="admin">
      <div className="space-y-6">
        <h1 className="text-3xl font-[var(--font-display)]">Masaları Düzenle</h1>
        <div className="text-sm text-[var(--color-fg-muted)]">
          Sürükle-bırak ile oyuncu değişimi sonraki sürümde.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(tables ?? []).map(mt => (
            <Card key={mt.id}>
              <Badge>Masa {mt.table_number}</Badge>
              <div className="mt-3 space-y-2">
                {(tps ?? []).filter(tp => tp.match_table_id === mt.id).map(tp => {
                  const p = pMap.get(tp.player_id);
                  return (
                    <div key={tp.id} className="flex items-center gap-2">
                      <PlayerAvatar seatCode={p?.seat_code ?? '??'} size={28} />
                      <span className="flex-1 text-sm">{p?.name}</span>
                      <span className="text-xs text-[var(--color-fg-muted)] font-[var(--font-mono)]">
                        Sıra {tp.seat_position}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
