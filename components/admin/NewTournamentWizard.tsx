'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createTournament } from '@/app/actions/tournament';

export function NewTournamentWizard() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [totalPlayers, setTotalPlayers] = useState(16);
  const [leagueRounds, setLeagueRounds] = useState(2);
  const [elim, setElim] = useState<4 | 16 | 64 | 256>(16);
  const [conflict, setConflict] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    // Validate: totalPlayers vs elim vs leagueRounds
    if (leagueRounds === 0 && totalPlayers !== elim) {
      setConflict('league_zero_mismatch');
      return;
    }
    if (elim > totalPlayers) {
      setConflict('elim_larger_than_total');
      return;
    }
    setSubmitting(true);
    await createTournament({
      name, totalPlayers, leagueRounds, eliminationCount: elim,
    });
  }

  return (
    <Card className="max-w-2xl p-6 space-y-4">
      <label className="block">
        <div className="text-sm text-[var(--color-fg-muted)] mb-1">Turnuva adı</div>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Bahar Turnuvası" required />
      </label>
      <div className="grid grid-cols-3 gap-4">
        <label className="block">
          <div className="text-sm text-[var(--color-fg-muted)] mb-1">Oyuncu</div>
          <Input type="number" min={4} value={totalPlayers} onChange={e => setTotalPlayers(Number(e.target.value))} />
        </label>
        <label className="block">
          <div className="text-sm text-[var(--color-fg-muted)] mb-1">Lig Turu</div>
          <Input type="number" min={0} value={leagueRounds} onChange={e => setLeagueRounds(Number(e.target.value))} />
        </label>
        <label className="block">
          <div className="text-sm text-[var(--color-fg-muted)] mb-1">Eleme</div>
          <select
            value={elim}
            onChange={e => setElim(Number(e.target.value) as 4 | 16 | 64 | 256)}
            className="h-10 w-full px-3 bg-[var(--color-bg-deep)] border border-[var(--color-fg-subtle)] rounded-[var(--radius-md)] text-[var(--color-fg-primary)]"
          >
            <option value={4}>4 (Direkt Final)</option>
            <option value={16}>16</option>
            <option value={64}>64</option>
            <option value={256}>256</option>
          </select>
        </label>
      </div>
      <Button onClick={submit} disabled={submitting || !name}>
        {submitting ? 'Oluşturuluyor...' : 'Turnuvayı Oluştur'}
      </Button>

      <Modal open={conflict === 'league_zero_mismatch'} onClose={() => setConflict(null)} title="Uyumsuzluk">
        <p className="mb-4">
          Salt eleme (lig turu = 0) seçildi, ancak oyuncu sayısı ({totalPlayers}) eleme sayısına ({elim}) eşit değil.
          Aşağıdaki yollardan biri gerekli:
        </p>
        <div className="space-y-2">
          <Button variant="secondary" onClick={() => { setTotalPlayers(elim); setConflict(null); }} className="w-full">
            Oyuncu sayısını {elim}&apos;a düşür
          </Button>
          <Button variant="secondary" onClick={() => { setLeagueRounds(1); setConflict(null); }} className="w-full">
            1 Lig turu ekle (play-in)
          </Button>
          <Button variant="ghost" onClick={() => setConflict(null)} className="w-full">İptal</Button>
        </div>
      </Modal>
    </Card>
  );
}
