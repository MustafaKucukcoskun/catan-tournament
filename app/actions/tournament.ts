'use server';
import { getServerClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export interface CreateTournamentInput {
  name: string;
  totalPlayers: number;
  leagueRounds: number;
  eliminationCount: 4 | 16 | 64 | 256;
  mapStrategy?: { distribution: 'same' | 'different' | 'grouped'; source: 'random' | 'manual' | 'preset' };
  mapRules?: { [key: string]: Json | undefined };
  fairnessPreset?: 'strict' | 'balanced' | 'random';
}

export async function createTournament(input: CreateTournamentInput) {
  const sb = getServerClient();
  if (input.eliminationCount > input.totalPlayers) {
    return { error: 'Eleme sayısı toplam oyuncudan fazla olamaz' };
  }
  const { data, error } = await sb
    .from('tournaments')
    .insert({
      name: input.name,
      total_players: input.totalPlayers,
      league_rounds: input.leagueRounds,
      elimination_count: input.eliminationCount,
      map_strategy: input.mapStrategy ?? { distribution: 'same', source: 'random' },
      map_rules: input.mapRules,
      fairness_preset: input.fairnessPreset ?? 'balanced',
    })
    .select('id')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/admin');
  redirect(`/admin/t/${data.id}/players`);
}

export async function deleteTournament(id: string) {
  const sb = getServerClient();
  const { error } = await sb.from('tournaments').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/archive');
  return { ok: true };
}

export async function renameTournament(id: string, name: string) {
  const sb = getServerClient();
  const { error } = await sb.from('tournaments').update({ name }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/t/${id}`);
  revalidatePath(`/admin/t/${id}`);
  return { ok: true };
}
