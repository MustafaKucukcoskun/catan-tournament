'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export function useTournamentRealtime(tournamentId: string) {
  const router = useRouter();
  useEffect(() => {
    const channel = supabase.channel(`tournament:${tournamentId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard_stats', filter: `tournament_id=eq.${tournamentId}` },
        () => router.refresh()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'match_tables' },
        () => router.refresh()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'table_players' },
        () => router.refresh()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [tournamentId, router]);
}
