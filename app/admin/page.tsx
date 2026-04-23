import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getServerClient } from '@/lib/supabase/server';
import { adminLogout } from '@/app/actions/admin';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const sb = getServerClient();
  const { data: all } = await sb.from('tournaments')
    .select('id,name,status,total_players,started_at,completed_at')
    .order('created_at', { ascending: false });

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-[var(--font-display)]">Yönetici</h1>
          <div className="flex gap-2">
            <Link href="/admin/new"><Button>+ Yeni Turnuva</Button></Link>
            <Link href="/admin/map-templates"><Button variant="secondary">Map Şablonları</Button></Link>
            <form action={adminLogout}>
              <Button type="submit" variant="ghost">Çıkış</Button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(all ?? []).map(t => (
            <Link key={t.id} href={`/admin/t/${t.id}`}>
              <Card highlight={t.status !== 'completed'} className="hover:brightness-110 transition-all">
                <div className="flex items-center justify-between">
                  <Badge tone={t.status === 'completed' ? 'gold' : t.status === 'setup' ? 'neutral' : 'live'}>
                    {t.status === 'setup' ? 'Kurulumda' : t.status === 'completed' ? 'Tamamlandı' : 'Aktif'}
                  </Badge>
                  <span className="text-xs text-[var(--color-fg-muted)] font-[var(--font-mono)]">
                    {t.total_players} oyuncu
                  </span>
                </div>
                <h3 className="text-xl font-[var(--font-display)] mt-3">{t.name}</h3>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Shell>
  );
}
