import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { deleteTournament, renameTournament } from '@/app/actions/tournament';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', id).single();
  if (!t) notFound();

  return (
    <Shell>
      <div className="space-y-6 max-w-lg">
        <h1 className="text-3xl font-[var(--font-display)]">Turnuva Ayarları</h1>

        <Card className="p-6 space-y-3">
          <div className="text-sm text-[var(--color-fg-muted)]">Ad</div>
          <form
            action={async (fd: FormData) => {
              'use server';
              await renameTournament(id, String(fd.get('name') ?? ''));
            }}
            className="flex gap-2"
          >
            <Input name="name" defaultValue={t.name} />
            <Button type="submit">Kaydet</Button>
          </form>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="text-sm text-[var(--color-error)]">Tehlikeli bölge</div>
          <form
            action={async () => {
              'use server';
              await deleteTournament(id);
              redirect('/admin');
            }}
          >
            <Button type="submit" variant="destructive" className="w-full">
              Turnuvayı Sil
            </Button>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
