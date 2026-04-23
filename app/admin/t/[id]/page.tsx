import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { advanceRound } from '@/app/actions/match';

export const dynamic = 'force-dynamic';

export default async function AdminTournamentView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', id).single();
  if (!t) notFound();
  const { data: rounds } = await sb.from('rounds').select('*').eq('tournament_id', id);
  const { data: tables } = await sb.from('match_tables').select('*')
    .in('round_id', (rounds ?? []).map(r => r.id));

  const currentRoundId = (rounds ?? [])
    .find(r => r.round_number === t.current_round && r.round_type === t.current_round_type)?.id;
  const currentTables = (tables ?? []).filter(mt => mt.round_id === currentRoundId);
  const allCompleted = currentTables.length > 0 && currentTables.every(mt => mt.status === 'completed');

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Badge tone={t.status === 'completed' ? 'gold' : 'live'}>
              {t.status === 'league' ? `Lig ${t.current_round}/${t.league_rounds}` :
               t.status === 'elimination' ? `Eleme Tur ${t.current_round}` :
               t.status === 'completed' ? 'Tamamlandı' : 'Kurulumda'}
            </Badge>
            <h1 className="text-4xl font-[var(--font-display)] mt-2">{t.name}</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/t/${id}`}><Button variant="secondary">Public Görünüm</Button></Link>
            <Link href={`/admin/t/${id}/settings`}><Button variant="ghost">Ayarlar</Button></Link>
          </div>
        </div>

        {t.status !== 'completed' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentTables.map(mt => (
                <Card key={mt.id} live={mt.status === 'live'}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge tone={mt.status === 'live' ? 'live' : mt.status === 'completed' ? 'gold' : 'neutral'}>
                      Masa {mt.table_number}
                    </Badge>
                    {mt.status === 'live' && (
                      <Link href={`/admin/t/${id}/score/${mt.id}`}>
                        <Button size="sm">Skor Gir</Button>
                      </Link>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link href={`/admin/t/${id}/map/${mt.id}`} className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-accent-ember)]">
                      🔄 Map düzenle
                    </Link>
                  </div>
                </Card>
              ))}
            </div>

            {allCompleted && (
              <form action={async () => { 'use server'; await advanceRound(id); }}>
                <Button type="submit" className="w-full">Turu Tamamla →</Button>
              </form>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
