'use server';
import { getServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { pairLeagueRound, type PairingPlayer } from '@/lib/tournament/pairing';
// seedBracket will be used in T31 (elimination bracket generator).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { seedBracket } from '@/lib/tournament/bracket';
import { generateMap } from '@/lib/map/generator';
import type { MapRules } from '@/lib/map/validator';

export async function startTournament(tournamentId: string) {
  const sb = getServerClient();
  await sb.from('tournaments').update({
    status: 'league',
    started_at: new Date().toISOString(),
    current_round: 1,
    current_round_type: 'league',
  }).eq('id', tournamentId);
  await generateLeagueRound(tournamentId, 1);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

export async function generateLeagueRound(tournamentId: string, roundNumber: number) {
  const sb = getServerClient();

  const { data: tournament } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
  if (!tournament) return { error: 'Tournament not found' };

  const { data: playersData } = await sb.from('players').select('*').eq('tournament_id', tournamentId);
  const { data: stats } = await sb.from('leaderboard_stats').select('*').eq('tournament_id', tournamentId);
  const statMap = new Map((stats ?? []).map(s => [s.player_id, s]));

  const pairingPlayers: PairingPlayer[] = (playersData ?? []).map(p => ({
    id: p.id,
    totalVp: statMap.get(p.id)?.total_vp ?? 0,
    previousOpponents: new Set<string>(), // TODO: populate from history (later improvement)
  }));

  const tables = pairLeagueRound({ players: pairingPlayers, roundNumber });

  const { data: round } = await sb
    .from('rounds')
    .insert({
      tournament_id: tournamentId,
      round_number: roundNumber,
      round_type: 'league',
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const map = generateMap({
      seed: `${tournamentId}-r${roundNumber}-t${i + 1}`,
      rules: tournament.map_rules as unknown as MapRules,
      retryCount: (tournament.map_rules as any)?.retry_count ?? 500,
    });
    const { data: mt } = await sb
      .from('match_tables')
      .insert({
        round_id: round!.id,
        table_number: i + 1,
        seat_count: t.seatCount,
        status: 'live',
        started_at: new Date().toISOString(),
        map_data: map as any,
        map_seed: map.seed,
      })
      .select('id')
      .single();

    const seatRows = t.players.map((p, seat) => ({
      match_table_id: mt!.id,
      player_id: p.id,
      seat_position: seat + 1,
    }));
    await sb.from('table_players').insert(seatRows);
  }

  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}
