import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { HexMap } from '@/components/hex/HexMap';
import { getServerClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth/session';
import { deleteTemplate } from '@/app/actions/template';
import { Button } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  if (!(await isAuthenticated())) redirect('/admin/login');
  const sb = getServerClient();
  const { data } = await sb.from('map_templates').select('*').order('created_at', { ascending: false });
  return (
    <Shell variant="admin">
      <div className="space-y-6">
        <h1 className="text-4xl font-[var(--font-display)]">Map Şablonları</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(data ?? []).map(tpl => (
            <Card key={tpl.id}>
              <div className="flex items-center justify-between mb-3">
                <Badge tone={tpl.is_official ? 'gold' : 'neutral'}>{tpl.source}</Badge>
                <form action={async () => { 'use server'; await deleteTemplate(tpl.id); }}>
                  <Button type="submit" variant="destructive" size="sm">Sil</Button>
                </form>
              </div>
              <div className="text-lg font-medium">{tpl.name}</div>
              <div className="mt-3">
                <HexMap map={tpl.data as any} hexSize={20} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Shell>
  );
}
