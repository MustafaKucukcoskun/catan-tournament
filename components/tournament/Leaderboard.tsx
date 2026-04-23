'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerAvatar } from './PlayerAvatar';
import { cn } from '@/lib/utils';

export interface LeaderboardRow {
  rank: number;
  playerId: string;
  name: string;
  seatCode: string;
  matchesPlayed: number;
  wins: number;
  totalVp: number;
  isActive?: boolean;
}

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="rounded-[var(--radius-md)] hairline bg-[var(--color-bg-surface)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-fg-muted)] font-[var(--font-mono)]">
            <th className="text-left px-4 py-3 w-12">#</th>
            <th className="text-left px-4 py-3">Oyuncu</th>
            <th className="text-right px-3 py-3 w-16">Oyun</th>
            <th className="text-right px-3 py-3 w-16">Gal.</th>
            <th className="text-right px-4 py-3 w-20">Toplam VP</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.tr
                key={r.playerId}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3, type: 'spring', bounce: 0.3 }}
                className={cn(
                  'border-t border-[rgba(244,185,66,0.08)] hover:bg-[var(--color-bg-elevated)]',
                  r.isActive && 'bg-[rgba(255,107,53,0.06)]'
                )}
              >
                <td className="px-4 py-3 font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]">{r.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar seatCode={r.seatCode} size={32} halo={r.isActive ? 'pulse-live' : 'none'} />
                    <span>{r.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]">{r.matchesPlayed}</td>
                <td className="px-3 py-3 text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]">{r.wins}</td>
                <td className="px-4 py-3 text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]">
                  <motion.span key={r.totalVp} initial={{ scale: 1.15 }} animate={{ scale: 1 }}
                    transition={{ duration: 0.4, type: 'spring' }}>
                    {r.totalVp}
                  </motion.span>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
