import { PlayerAvatar } from './PlayerAvatar';
import type { LeaderboardRow } from './Leaderboard';

interface Props {
  top3: LeaderboardRow[];
}

export function PodiumBlock({ top3 }: Props) {
  const first = top3.find(r => r.rank === 1);
  const second = top3.find(r => r.rank === 2);
  const third = top3.find(r => r.rank === 3);
  return (
    <div className="bg-[var(--color-bg-highlight)] rounded-[var(--radius-lg)] hairline-strong p-8">
      <div className="grid grid-cols-3 items-end gap-6">
        <PodiumSlot row={second} size={80} halo="silver" label="2." />
        <PodiumSlot row={first} size={112} halo="gold-winner" label="1." featured />
        <PodiumSlot row={third} size={72} halo="bronze" label="3." />
      </div>
    </div>
  );
}

function PodiumSlot({ row, size, halo, label, featured }: {
  row?: LeaderboardRow; size: number; halo: any; label: string; featured?: boolean;
}) {
  if (!row) return <div />;
  return (
    <div className="flex flex-col items-center gap-2">
      <PlayerAvatar seatCode={row.seatCode} size={size} halo={halo} />
      <div className="text-center">
        <div className={featured ? 'text-lg font-[var(--font-display)]' : 'text-sm'}>
          {row.name}
        </div>
        <div className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)] text-sm">
          {row.totalVp} VP · {row.wins} G
        </div>
      </div>
    </div>
  );
}
