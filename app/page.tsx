import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HubHome() {
  const sb = getServerClient();
  const { data: active } = await sb.from('tournaments')
    .select('id,name,status,total_players,started_at')
    .in('status', ['league', 'elimination'])
    .order('started_at', { ascending: false });

  const { data: recentlyFinished } = await sb.from('tournaments')
    .select('id,name,completed_at,total_players')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(3);

  return (
    <Shell>
      <div className="space-y-8">
        <div>
          <div className="font-[var(--font-mono)] uppercase text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)]">
            Şu anda oynanan
          </div>
          <h1 className="text-4xl font-[var(--font-display)] mt-1">Aktif Turnuvalar</h1>
        </div>

        {active && active.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map(t => (
              <Link key={t.id} href={`/t/${t.id}`}>
                <Card highlight className="hover:brightness-110 transition-all">
                  <Badge tone="live">● Canlı</Badge>
                  <h3 className="text-xl font-[var(--font-display)] mt-3">{t.name}</h3>
                  <div className="text-sm text-[var(--color-fg-muted)] mt-2">
                    {t.total_players} oyuncu · {t.status === 'league' ? 'Lig turu' : 'Eleme'}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="text-6xl mb-4">⬡</div>
            <div className="text-lg text-[var(--color-fg-muted)]">Henüz aktif turnuva yok.</div>
          </Card>
        )}

        {recentlyFinished && recentlyFinished.length > 0 && (
          <div>
            <div className="font-[var(--font-mono)] uppercase text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)] mb-3">
              Son biten turnuvalar
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentlyFinished.map(t => (
                <Link key={t.id} href={`/t/${t.id}`}>
                  <Card className="hover:brightness-110 transition-all">
                    <div className="text-base font-medium">{t.name}</div>
                    <div className="text-xs text-[var(--color-fg-muted)] mt-1 font-[var(--font-mono)]">
                      {t.total_players} oyuncu
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            <Link href="/archive" className="inline-block mt-3 text-sm text-[var(--color-accent-ember)] hover:underline">
              Arşive git →
            </Link>
          </div>
        )}
      </div>
    </Shell>
  );
}
