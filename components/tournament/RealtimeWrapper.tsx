'use client';
import { useTournamentRealtime } from '@/lib/hooks/useRealtime';

export function RealtimeWrapper({ tournamentId, children }: {
  tournamentId: string; children: React.ReactNode;
}) {
  useTournamentRealtime(tournamentId);
  return <>{children}</>;
}
