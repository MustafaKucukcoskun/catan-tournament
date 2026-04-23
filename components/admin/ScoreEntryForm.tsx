'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlayerAvatar } from '@/components/tournament/PlayerAvatar';
import { enterScore } from '@/app/actions/match';
import { Trophy } from 'lucide-react';

interface PlayerRow {
  id: string; playerId: string; name: string; seatCode: string; seatPosition: number;
}

interface Props {
  tournamentId: string;
  matchTableId: string;
  players: PlayerRow[];
}

export function ScoreEntryForm({ tournamentId, matchTableId, players }: Props) {
  const router = useRouter();
  const [vps, setVps] = useState<Record<string, number>>(
    Object.fromEntries(players.map(p => [p.playerId, 0]))
  );
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const autoWinner = Object.entries(vps).reduce<[string, number]>(
    (max, [id, v]) => v > max[1] ? [id, v] : max,
    [players[0]?.playerId ?? '', 0]
  )[0];
  const effectiveWinner = winnerId ?? autoWinner;

  async function submit() {
    setSubmitting(true);
    await enterScore(matchTableId, players.map(p => ({
      playerId: p.playerId,
      finalVp: vps[p.playerId] ?? 0,
      isWinner: p.playerId === effectiveWinner,
    })), tournamentId);
    router.push(`/admin/t/${tournamentId}`);
  }

  return (
    <Card className="max-w-xl p-6 space-y-4">
      {players.map(p => (
        <div key={p.id} className="flex items-center gap-3">
          <button onClick={() => setWinnerId(p.playerId)}
            className={`p-1 rounded-full transition-all ${effectiveWinner === p.playerId ? 'text-[var(--color-accent-gold)] glow-gold' : 'text-[var(--color-fg-muted)]'}`}>
            <Trophy size={20} fill={effectiveWinner === p.playerId ? 'currentColor' : 'none'} />
          </button>
          <PlayerAvatar seatCode={p.seatCode} size={36} />
          <span className="flex-1">{p.name}</span>
          <Input
            type="number" min={0} max={15}
            value={vps[p.playerId]}
            onChange={e => setVps({ ...vps, [p.playerId]: Number(e.target.value) })}
            className="w-20 text-right"
          />
          <span className="text-[var(--color-fg-muted)] text-sm">VP</span>
        </div>
      ))}
      <Button onClick={submit} disabled={submitting} className="w-full">
        {submitting ? 'Kaydediliyor...' : 'Skoru Kaydet'}
      </Button>
    </Card>
  );
}
