import { cn } from '@/lib/utils';

type Halo = 'none' | 'gold-winner' | 'silver' | 'bronze' | 'pulse-live';

interface Props {
  seatCode: string;
  size?: number;
  halo?: Halo;
  className?: string;
}

export function PlayerAvatar({ seatCode, size = 40, halo = 'none', className }: Props) {
  const halos: Record<Halo, string> = {
    none: '',
    'gold-winner': 'ring-2 ring-[var(--color-accent-gold)] animate-pulse glow-winner',
    silver: 'ring-1 ring-[rgba(192,192,192,0.45)]',
    bronze: 'ring-1 ring-[rgba(205,127,50,0.45)]',
    'pulse-live': 'ring-2 ring-[var(--color-accent-live)] animate-pulse-ember',
  };
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center bg-[var(--color-bg-elevated)]',
        'text-[var(--color-fg-primary)] font-[var(--font-mono)] uppercase tabular-nums',
        'border border-[var(--color-fg-subtle)]',
        halos[halo],
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {seatCode}
    </div>
  );
}
