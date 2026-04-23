'use server';
import { getServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MapData } from '@/lib/map/generator';

export async function createTemplate(input: {
  name: string;
  source: 'CWC' | 'US Nationals' | 'Community' | 'Custom';
  year?: number;
  players: '3-4' | '5-6';
  data: MapData;
  isOfficial?: boolean;
}) {
  const sb = getServerClient();
  const { error } = await sb.from('map_templates').insert({
    name: input.name,
    source: input.source,
    year: input.year,
    players: input.players,
    data: input.data as any,
    is_official: input.isOfficial ?? false,
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/map-templates');
  return { ok: true };
}

export async function updateTemplate(
  id: string,
  patch: { name?: string; data?: MapData }
) {
  const sb = getServerClient();
  const { error } = await sb.from('map_templates').update(patch as any).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/map-templates');
  return { ok: true };
}

export async function deleteTemplate(id: string) {
  const sb = getServerClient();
  const { error } = await sb.from('map_templates').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/map-templates');
  return { ok: true };
}

export async function saveMapAsTemplate(matchTableId: string, name: string) {
  const sb = getServerClient();
  const { data: mt } = await sb
    .from('match_tables')
    .select('map_data')
    .eq('id', matchTableId)
    .single();
  if (!mt?.map_data) return { error: 'Map not found' };
  const { error } = await sb.from('map_templates').insert({
    name,
    source: 'Custom',
    players: '3-4',
    data: mt.map_data as any,
    is_official: false,
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/map-templates');
  return { ok: true };
}
