import { Card } from '@/components/ui/Card';
import { PlayerAvatar } from './PlayerAvatar';
import { Badge } from '@/components/ui/Badge';

export interface BracketPod {
  id: string;
  tableNumber: number;
  roundLabel: string;
  players: { seatCode: string; name: string; isWinner: boolean; vp?: number | null }[];
  status: 'pending' | 'live' | 'completed';
}

interface Props { pods: BracketPod[][]; }

export function BracketView({ pods }: Props) {
  return (
    <div className="space-y-8">
      {pods.map((round, ri) => (
        <div key={ri}>
          <div className="text-[11px] uppercase tracking-[0.12em] font-[var(--font-mono)] text-[var(--color-fg-muted)] mb-3">
            {round[0]?.roundLabel ?? `Tur ${ri + 1}`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {round.map(pod => (
              <Card key={pod.id} live={pod.status === 'live'}>
                <div className="flex items-center justify-between mb-3">
                  <Badge tone={pod.status === 'live' ? 'live' : pod.status === 'completed' ? 'gold' : 'neutral'}>
                    Masa {pod.tableNumber}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {pod.players.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <PlayerAvatar seatCode={p.seatCode} size={28} halo={p.isWinner ? 'gold-winner' : 'none'} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{p.name}</div>
                        {p.vp != null && (
                          <div className="text-xs text-[var(--color-fg-muted)] font-[var(--font-mono)] tabular-nums">{p.vp} VP</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
