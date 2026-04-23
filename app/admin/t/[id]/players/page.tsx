import { Shell } from '@/components/layout/Shell';
import { PlayerRoster } from '@/components/admin/PlayerRoster';
import { getServerClient } from '@/lib/supabase/server';
import { isAuthenticated } from '@/lib/auth/session';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PlayersPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) redirect('/admin/login');
  const { id } = await params;
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', id).single();
  if (!t) notFound();
  const { data: players } = await sb.from('players').select('id,name,seat_code').eq('tournament_id', id);

  return (
    <Shell variant="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-[var(--font-display)]">{t.name}</h1>
          <div className="text-sm text-[var(--color-fg-muted)] mt-1">Oyuncu Kaydı</div>
        </div>
        <PlayerRoster
          tournamentId={id}
          totalRequired={t.total_players}
          players={players ?? []}
          canStart={(players ?? []).length === t.total_players && t.status === 'setup'}
        />
      </div>
    </Shell>
  );
}
