'use client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PlayerAvatar } from './PlayerAvatar';
import { HexMap } from '@/components/hex/HexMap';
import type { MapData } from '@/lib/map/generator';

export interface LiveTable {
  id: string;
  tableNumber: number;
  startedAt: Date | string;
  map: MapData;
  players: { seatCode: string; name: string; finalVp?: number | null }[];
}

interface Props {
  tables: LiveTable[];
}

function formatDuration(start: Date | string): string {
  const s = typeof start === 'string' ? new Date(start) : start;
  const elapsed = Math.max(0, Date.now() - s.getTime());
  const m = Math.floor(elapsed / 60000);
  const sec = Math.floor((elapsed % 60000) / 1000);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function LiveTables({ tables }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {tables.map(t => (
        <Card key={t.id} live className="p-0">
          <div className="flex items-center justify-between p-4 pb-2">
            <Badge tone="live">● Canlı · Masa {t.tableNumber}</Badge>
            <span className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]">
              {formatDuration(t.startedAt)}
            </span>
          </div>
          <div className="px-4">
            <HexMap map={t.map} hexSize={16} />
          </div>
          <div className="p-4 space-y-2">
            {t.players.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <PlayerAvatar seatCode={p.seatCode} size={28} />
                <span className="flex-1 text-sm">{p.name}</span>
                <span className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)] text-sm">
                  {p.finalVp ?? '—'} VP
                </span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
