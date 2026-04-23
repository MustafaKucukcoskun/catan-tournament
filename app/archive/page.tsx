import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { getServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const sb = getServerClient();
  const { data } = await sb.from('tournaments')
    .select('id,name,completed_at,total_players')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-4xl font-[var(--font-display)]">Arşiv</h1>
        {data && data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.map(t => (
              <Link key={t.id} href={`/t/${t.id}`}>
                <Card className="hover:brightness-110 transition-all">
                  <div className="text-lg font-medium">{t.name}</div>
                  <div className="text-xs text-[var(--color-fg-muted)] mt-2 font-[var(--font-mono)]">
                    {t.total_players} oyuncu · {t.completed_at ? new Date(t.completed_at).toLocaleDateString('tr-TR') : '—'}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="text-lg text-[var(--color-fg-muted)]">Henüz biten turnuva yok.</div>
          </Card>
        )}
      </div>
    </Shell>
  );
}
