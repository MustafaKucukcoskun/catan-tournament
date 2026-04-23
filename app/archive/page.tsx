import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { PlayerAvatar } from '@/components/tournament/PlayerAvatar';
import { getServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const sb = getServerClient();
  const { data: tournaments } = await sb.from('tournaments')
    .select('id,name,completed_at,total_players')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  if (!tournaments || tournaments.length === 0) {
    return (
      <Shell>
        <div className="space-y-6">
          <h1 className="text-4xl font-[var(--font-display)]">Arşiv</h1>
          <Card className="p-8 text-center">
            <div className="text-lg text-[var(--color-fg-muted)]">
              Henüz biten turnuva yok.
            </div>
          </Card>
        </div>
      </Shell>
    );
  }

  const tIds = tournaments.map(t => t.id);
  const { data: champions } = await sb.from('leaderboard_stats')
    .select('tournament_id, player_id')
    .in('tournament_id', tIds)
    .eq('rank', 1);

  const championPlayerIds = (champions ?? []).map(c => c.player_id);
  const { data: players } = championPlayerIds.length > 0
    ? await sb.from('players')
        .select('id, name, seat_code')
        .in('id', championPlayerIds)
    : { data: [] };

  const pMap = new Map((players ?? []).map(p => [p.id, p]));
  const champByTourney = new Map<string, { name: string; seatCode: string }>();
  for (const c of champions ?? []) {
    const p = pMap.get(c.player_id);
    if (p) champByTourney.set(c.tournament_id, { name: p.name, seatCode: p.seat_code });
  }

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-4xl font-[var(--font-display)]">Arşiv</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tournaments.map(t => {
            const champ = champByTourney.get(t.id);
            return (
              <Link key={t.id} href={`/t/${t.id}`}>
                <Card className="hover:brightness-110 transition-all">
                  <div className="text-lg font-medium">{t.name}</div>
                  {champ && (
                    <div className="flex items-center gap-2 mt-3">
                      <PlayerAvatar
                        seatCode={champ.seatCode}
                        size={28}
                        halo="gold-winner"
                      />
                      <span className="text-sm text-[var(--color-fg-primary)]">
                        <span className="text-[var(--color-accent-gold)]">Şampiyon:</span>{' '}
                        {champ.name}
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-[var(--color-fg-muted)] mt-2 font-[var(--font-mono)]">
                    {t.total_players} oyuncu ·{' '}
                    {t.completed_at
                      ? new Date(t.completed_at).toLocaleDateString('tr-TR')
                      : '—'}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
