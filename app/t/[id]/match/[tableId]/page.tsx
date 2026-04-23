import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HexMap } from '@/components/hex/HexMap';
import { PlayerAvatar } from '@/components/tournament/PlayerAvatar';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string; tableId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function MatchDetail({ params }: Props) {
  const { tableId } = await params;
  const sb = getServerClient();

  const { data: mt } = await sb.from('match_tables').select('*').eq('id', tableId).single();
  if (!mt) notFound();
  const { data: tps } = await sb.from('table_players').select('*').eq('match_table_id', tableId);
  const { data: players } = await sb.from('players').select('*')
    .in('id', (tps ?? []).map(tp => tp.player_id));

  const pMap = new Map((players ?? []).map(p => [p.id, p]));

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <Badge tone={mt.status === 'live' ? 'live' : 'gold'}>
            {mt.status === 'live' ? '● Canlı' : 'Tamamlandı'} · Masa {mt.table_number}
          </Badge>
          <h1 className="text-3xl font-[var(--font-display)] mt-2">Maç Detayı</h1>
        </div>

        <Card className="p-6">
          <HexMap map={mt.map_data as any} hexSize={48} />
          <div className="mt-4 font-[var(--font-mono)] text-xs text-[var(--color-fg-muted)]">
            Seed: {mt.map_seed}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(tps ?? []).map(tp => {
            const p = pMap.get(tp.player_id);
            return (
              <Card key={tp.id} highlight={tp.is_winner ?? false}>
                <div className="flex items-center gap-3">
                  <PlayerAvatar seatCode={p?.seat_code ?? '??'} size={40}
                    halo={tp.is_winner ? 'gold-winner' : 'none'} />
                  <div className="flex-1">
                    <div className="font-medium">{p?.name}</div>
                    <div className="text-xs text-[var(--color-fg-muted)] font-[var(--font-mono)]">
                      Sıra {tp.seat_position} · {tp.final_vp ?? '—'} VP
                    </div>
                  </div>
                  {tp.is_winner && <Badge tone="gold">🏆</Badge>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
