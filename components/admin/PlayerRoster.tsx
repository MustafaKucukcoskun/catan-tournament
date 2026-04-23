'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlayerAvatar } from '@/components/tournament/PlayerAvatar';
import { addPlayer, removePlayer } from '@/app/actions/player';
import { startTournament } from '@/app/actions/match';
import { Trash2 } from 'lucide-react';

interface Props {
  tournamentId: string;
  totalRequired: number;
  players: { id: string; name: string; seat_code: string }[];
  canStart: boolean;
}

export function PlayerRoster({ tournamentId, totalRequired, players, canStart }: Props) {
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setPending(true);
    await addPlayer(tournamentId, name.trim());
    setName('');
    setPending(false);
  }

  async function start() {
    if (!confirm('Turnuvayı başlatmak istiyor musun? Başladıktan sonra oyuncu ekleme kapanır.')) return;
    await startTournament(tournamentId);
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-[var(--color-fg-muted)] font-[var(--font-mono)]">
        {players.length} / {totalRequired} oyuncu
      </div>

      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()} placeholder="Oyuncu adı" />
        <Button onClick={add} disabled={pending || !name.trim()}>+ Ekle</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {players.map(p => (
          <Card key={p.id} className="flex items-center gap-3 py-3">
            <PlayerAvatar seatCode={p.seat_code} size={32} />
            <span className="flex-1">{p.name}</span>
            <button onClick={() => removePlayer(p.id, tournamentId)}
              className="text-[var(--color-fg-muted)] hover:text-[var(--color-error)]">
              <Trash2 size={16} />
            </button>
          </Card>
        ))}
      </div>

      {canStart && (
        <Button onClick={start} className="w-full">Turnuvayı Başlat →</Button>
      )}
    </div>
  );
}
