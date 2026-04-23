'use client';
import { useState, useTransition } from 'react';
import { ArrowRight } from 'lucide-react';
import { advanceRound } from '@/app/actions/match';
import { CutoffTieModal, type TieConflict } from './CutoffTieModal';

interface Props {
  tournamentId: string;
  allCompleted: boolean;
  label: string;
}

export function AdvanceRoundButton({ tournamentId, allCompleted, label }: Props) {
  const [isPending, startTransition] = useTransition();
  const [tieConflicts, setTieConflicts] = useState<TieConflict[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!allCompleted) return null;

  function handleAdvance() {
    setError(null);
    startTransition(async () => {
      const result = await advanceRound(tournamentId);
      if (result && 'cutoffTies' in result && result.cutoffTies) {
        setTieConflicts(result.cutoffTies as TieConflict[]);
        return;
      }
      if (result && 'error' in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAdvance}
        disabled={isPending}
        className="inline-flex h-8 items-center gap-2 rounded-[6px] border bg-transparent px-[14px] font-[var(--font-body)] text-[13px] font-semibold transition-colors hover:bg-[rgba(232,93,46,0.08)] disabled:opacity-50"
        style={{ borderColor: '#E85D2E', color: '#E85D2E' }}
      >
        {isPending ? 'İşleniyor...' : label}
        <ArrowRight size={14} strokeWidth={1.75} />
      </button>
      {error && (
        <span className="text-xs text-[var(--color-error)] ml-2">{error}</span>
      )}
      {tieConflicts && (
        <CutoffTieModal
          tournamentId={tournamentId}
          conflicts={tieConflicts}
          onClose={() => setTieConflicts(null)}
        />
      )}
    </>
  );
}
