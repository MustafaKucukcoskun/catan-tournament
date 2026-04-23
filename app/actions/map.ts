'use server';
import { getServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateMap } from '@/lib/map/generator';
import type { MapData } from '@/lib/map/generator';
import type { MapRules } from '@/lib/map/validator';

export async function regenerateMap(matchTableId: string, tournamentId: string) {
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('map_rules').eq('id', tournamentId).single();
  const rules = t?.map_rules as unknown as MapRules;
  const map = generateMap({
    rules,
    retryCount: (t?.map_rules as any)?.retry_count ?? 500,
    seed: `regen-${matchTableId}-${Date.now()}`,
  });
  await sb.from('match_tables')
    .update({ map_data: map as any, map_seed: map.seed })
    .eq('id', matchTableId);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true, seed: map.seed };
}

export async function updateMapManual(
  matchTableId: string,
  mapData: MapData,
  tournamentId: string
) {
  const sb = getServerClient();
  await sb.from('match_tables')
    .update({ map_data: mapData as any, map_seed: `manual-${Date.now()}` })
    .eq('id', matchTableId);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

export async function swapPlayers(
  tournamentId: string,
  tableAId: string,
  playerAId: string,
  tableBId: string,
  playerBId: string
) {
  const sb = getServerClient();
  // Swap seat_position / match_table_id between two table_players rows
  const { data: a } = await sb.from('table_players').select('*')
    .eq('match_table_id', tableAId).eq('player_id', playerAId).single();
  const { data: b } = await sb.from('table_players').select('*')
    .eq('match_table_id', tableBId).eq('player_id', playerBId).single();
  if (!a || !b) return { error: 'Player not found in table' };

  await sb.from('table_players').update({
    match_table_id: tableBId,
    seat_position: b.seat_position,
  }).eq('id', a.id);
  await sb.from('table_players').update({
    match_table_id: tableAId,
    seat_position: a.seat_position,
  }).eq('id', b.id);

  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

export async function resolveTieAtCutoff(
  tournamentId: string,
  ranking: { playerId: string; rank: number }[]
) {
  const sb = getServerClient();
  for (const r of ranking) {
    await sb.from('leaderboard_stats')
      .update({ rank: r.rank })
      .eq('tournament_id', tournamentId)
      .eq('player_id', r.playerId);
  }
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}
