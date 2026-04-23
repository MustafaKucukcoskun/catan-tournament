// Ported from Claude Design export, Variant C (Amber Atmosphere):
//   ui_kits/tournament-hub/leaderboard-amber.jsx — "Stats band, minimal,
//   hairline-separated". Six inline cells, two hairline rules bracketing
//   the strip. The `active` cell picks up the live ember dot + ember color
//   on its eyebrow — the only place accent color enters the strip.
// The surrounding page already renders the tournament title/Fraunces h1, so
// this strip is intentionally thin and typographic, not a tile dashboard.
//
// Each cell now supports an optional hint line (JetBrains Mono, tabular-
// nums, muted) so we can carry the data-density feel of the spectator kit
// ("+2 since 6:00pm", "avg 01:38:04", "next round 20:00") without changing
// the skeleton.

import { cn } from '@/lib/utils';

interface Props {
  players: number;
  activeMatches: number;
  finishedMatches: number;
  avgVp: number;
  round: string;
  duration: string;
  /** Optional secondary hint lines keyed by cell. */
  hints?: Partial<Record<
    'players' | 'active' | 'finished' | 'avgVp' | 'round' | 'duration',
    string
  >>;
}

interface Cell {
  key: string;
  label: string;
  value: string;
  hint?: string;
  live?: boolean;
  /** Tint the value (never label) when not live. */
  tint?: 'gold' | 'seafoam';
}

export function StatsStrip({
  players, activeMatches, finishedMatches, avgVp, round, duration, hints,
}: Props) {
  const cells: Cell[] = [
    { key: 'players',  label: 'players',  value: String(players), hint: hints?.players },
    {
      key: 'active', label: 'active', value: String(activeMatches),
      live: activeMatches > 0, hint: hints?.active,
    },
    {
      key: 'finished', label: 'finished', value: String(finishedMatches),
      hint: hints?.finished, tint: 'seafoam',
    },
    {
      key: 'avgVp', label: 'avg vp',
      value: avgVp && Number.isFinite(avgVp) ? avgVp.toFixed(1) : '—',
      hint: hints?.avgVp,
    },
    { key: 'round', label: 'round', value: round, hint: hints?.round, tint: 'gold' },
    { key: 'duration', label: 'duration', value: duration, hint: hints?.duration },
  ];

  return (
    <div
      className="flex flex-wrap md:flex-nowrap"
      style={{
        padding: '20px 0',
        borderTop: '1px solid rgba(244,185,66,0.15)',
        borderBottom: '1px solid rgba(244,185,66,0.15)',
      }}
    >
      {cells.map((cell, i, arr) => {
        const valueColor =
          cell.live   ? 'var(--color-fg-primary)' :
          cell.tint === 'gold'    ? 'var(--color-accent-gold)' :
          cell.tint === 'seafoam' ? 'var(--color-accent-seafoam)' :
          'var(--color-fg-primary)';

        return (
          <div
            key={cell.key}
            className={cn(
              'flex flex-col min-w-[140px] relative',
              cell.live && 'md:before:absolute md:before:-top-5 md:before:bottom-[-21px] md:before:left-0 md:before:right-0 md:before:pointer-events-none',
            )}
            style={{
              flex: '1 1 140px',
              padding: '2px 24px',
              gap: 8,
              borderRight:
                i < arr.length - 1 ? '1px solid rgba(244,185,66,0.10)' : 'none',
            }}
          >
            {/* subtle ember ambient behind the live cell */}
            {cell.live && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-[-12px] left-2 right-2 rounded-[var(--radius-md)] opacity-60"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 50%, rgba(255,107,53,0.10) 0%, transparent 65%)',
                }}
              />
            )}

            <div className="flex items-center gap-1.5 relative">
              {cell.live && <LiveDot size={6} />}
              <span
                className="font-[var(--font-mono)]"
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  color: cell.live
                    ? 'var(--color-accent-live)'
                    : 'var(--color-fg-muted)',
                  fontWeight: 500,
                }}
              >
                {cell.label}
              </span>
            </div>

            <span
              className="font-[var(--font-mono)] tabular-nums relative"
              style={{
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: '-0.01em',
                color: valueColor,
              }}
            >
              {cell.value}
            </span>

            {cell.hint && (
              <span
                className="font-[var(--font-mono)] tabular-nums relative"
                style={{
                  fontSize: 11,
                  lineHeight: 1.2,
                  color: 'var(--color-fg-muted)',
                  fontWeight: 400,
                }}
              >
                {cell.hint}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Minimal LiveDot — kept local so StatsStrip has no runtime deps beyond React.
function LiveDot({ size = 6 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full animate-pulse-ember shrink-0"
      style={{
        width: size,
        height: size,
        background: 'var(--color-accent-live)',
        boxShadow: '0 0 10px var(--color-accent-live)',
      }}
    />
  );
}
