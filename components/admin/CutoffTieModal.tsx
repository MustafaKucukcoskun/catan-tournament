'use client';
import { useState, useTransition } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { resolveTieAndAdvance } from '@/app/actions/match';

export interface TieConflict {
  players: string[]; // player ids in the tie cluster
  reason: string;
}

interface Props {
  tournamentId: string;
  conflicts: TieConflict[];
  onClose: () => void;
}

export function CutoffTieModal({ tournamentId, conflicts, onClose }: Props) {
  // MVP: resolve the first tie cluster; additional clusters (rare) require re-invoking advance.
  const firstConflict = conflicts[0];
  const [orderedIds, setOrderedIds] = useState<string[]>(firstConflict?.players ?? []);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!firstConflict) return null;

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...orderedIds];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setOrderedIds(next);
  }
  function moveDown(idx: number) {
    if (idx === orderedIds.length - 1) return;
    const next = [...orderedIds];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    setOrderedIds(next);
  }

  function handleResolve() {
    setError(null);
    startTransition(async () => {
      const result = await resolveTieAndAdvance(tournamentId, orderedIds);
      if (result && 'error' in result && result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal open onClose={onClose} title="Eleme Cutoff Eşitliği">
      <p className="text-sm text-[var(--color-fg-muted)] mb-4">
        Eleme sınırındaki oyuncular tam eşit puanlı. Sıralamayı elle belirle (en üst = elemeye geçer):
      </p>
      <div className="space-y-2 mb-4">
        {orderedIds.map((pid, idx) => (
          <div
            key={pid}
            className="flex items-center gap-2 p-2 bg-[var(--color-bg-elevated)] rounded-[var(--radius-sm)]"
          >
            <span className="font-[var(--font-mono)] text-sm w-8 text-[var(--color-fg-muted)]">
              {idx + 1}.
            </span>
            <span className="flex-1 font-[var(--font-mono)] text-xs text-[var(--color-fg-primary)]">
              {pid}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => moveUp(idx)}
              disabled={idx === 0 || isPending}
              aria-label="Yukarı taşı"
            >
              ↑
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => moveDown(idx)}
              disabled={idx === orderedIds.length - 1 || isPending}
              aria-label="Aşağı taşı"
            >
              ↓
            </Button>
          </div>
        ))}
      </div>
      {error && (
        <div className="mb-3 text-sm text-[var(--color-error)]">{error}</div>
      )}
      <Button onClick={handleResolve} disabled={isPending} className="w-full">
        {isPending ? 'Kaydediliyor...' : 'Sırayı Onayla ve İlerlet'}
      </Button>
    </Modal>
  );
}
