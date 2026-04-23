import { cn } from '@/lib/utils';

// Halos: matches the exported kit's visual grammar.
// - gold-winner: 2px gold ring + slow breathing halo (Podium #1)
// - silver: 2px gold-at-55% ring + faint halo (Podium #2)
// - bronze: 2px warm-ember-at-55% ring + faint halo (Podium #3)
// - pulse-live: 2px hot-ember ring + pulsing opacity (LIVE state)
type Halo = 'none' | 'gold-winner' | 'silver' | 'bronze' | 'pulse-live';

interface Props {
  seatCode: string;
  size?: number;
  halo?: Halo;
  className?: string;
}

export function PlayerAvatar({ seatCode, size = 40, halo = 'none', className }: Props) {
  // Initials are rendered in Fraunces per the Claude Design export.
  // seatCode is already a 2-char code (e.g. "A1"), so use it verbatim.
  const borderColor =
    halo === 'gold-winner'
      ? 'var(--color-accent-gold)'
      : halo === 'silver'
        ? 'rgba(244,185,66,0.55)'
        : halo === 'bronze'
          ? 'rgba(200,86,42,0.55)'
          : halo === 'pulse-live'
            ? 'var(--color-accent-live)'
            : 'rgba(244,185,66,0.15)';
  const borderWidth =
    halo === 'gold-winner' || halo === 'pulse-live' ? 2 : halo === 'silver' || halo === 'bronze' ? 2 : 1;
  const boxShadow =
    halo === 'silver'
      ? '0 0 12px rgba(244,185,66,0.18)'
      : halo === 'bronze'
        ? '0 0 10px rgba(200,86,42,0.18)'
        : undefined;
  const animationClass =
    halo === 'gold-winner' ? 'animate-gold-halo' : halo === 'pulse-live' ? 'animate-pulse-ember' : '';

  return (
    <div
      className={cn(
        'rounded-full grid place-items-center bg-[var(--color-bg-elevated)] shrink-0',
        'text-[var(--color-fg-primary)] font-[var(--font-display)] uppercase',
        animationClass,
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        fontWeight: 600,
        border: `${borderWidth}px solid ${borderColor}`,
        boxShadow,
      }}
    >
      {seatCode}
    </div>
  );
}
