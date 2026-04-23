'use server';
import { getServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

function seatCodeFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function addPlayer(tournamentId: string, name: string) {
  const sb = getServerClient();
  const { error } = await sb.from('players').insert({
    tournament_id: tournamentId,
    name: name.trim(),
    seat_code: seatCodeFromName(name),
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/t/${tournamentId}/players`);
  return { ok: true };
}

export async function removePlayer(playerId: string, tournamentId: string) {
  const sb = getServerClient();
  const { error } = await sb.from('players').delete().eq('id', playerId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/t/${tournamentId}/players`);
  return { ok: true };
}

export async function renamePlayer(playerId: string, tournamentId: string, name: string) {
  const sb = getServerClient();
  const { error } = await sb
    .from('players')
    .update({ name: name.trim(), seat_code: seatCodeFromName(name) })
    .eq('id', playerId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}
