import { Shell } from '@/components/layout/Shell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { HexMap } from '@/components/hex/HexMap';
import { getServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { regenerateMap } from '@/app/actions/map';

export const dynamic = 'force-dynamic';

export default async function MapEditorPage({ params }: {
  params: Promise<{ id: string; tableId: string }>
}) {
  const { id, tableId } = await params;
  const sb = getServerClient();
  const { data: mt } = await sb.from('match_tables').select('*').eq('id', tableId).single();
  if (!mt) notFound();

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-3xl font-[var(--font-display)]">Masa {mt.table_number} Map</h1>
        <Card className="p-6">
          <HexMap map={mt.map_data as any} hexSize={48} />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-[var(--font-mono)] text-[var(--color-fg-muted)]">
              Seed: {mt.map_seed}
            </span>
            <form action={async () => { 'use server'; await regenerateMap(tableId, id); }}>
              <Button type="submit">🔄 Yeni Map Üret</Button>
            </form>
          </div>
        </Card>
        <p className="text-sm text-[var(--color-fg-muted)]">
          Hex-by-hex manual edit v2. MVP: regenerate yeterli.
        </p>
      </div>
    </Shell>
  );
}
