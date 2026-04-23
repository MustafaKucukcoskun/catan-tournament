'use client';

import { useEffect, useState } from 'react';

// Live session clock — ticks every second, colon flickers gold each tick
// (matches preview/motion-signatures.html and DESIGN.md "Timer display"
// signature). Pure client component so we don't bust server caching.

interface Props {
  startedAt: string | Date;
  /** When false we freeze the clock (session paused / concluded) */
  live?: boolean;
  /** Compact eyebrow form — smaller type, no hours unless exceeded */
  compact?: boolean;
}

export function SessionClock({ startedAt, live = true, compact = false }: Props) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  const start =
    typeof startedAt === 'string' ? new Date(startedAt).getTime() : startedAt.getTime();
  const elapsed = Math.max(0, now - start);
  const h = Math.floor(elapsed / 3_600_000);
  const m = Math.floor((elapsed % 3_600_000) / 60_000);
  const s = Math.floor((elapsed % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  const showHours = h > 0 || !compact;
  const display = showHours
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`;
  const parts = display.split(':');

  return (
    <span
      className="inline-flex items-center gap-2 font-[var(--font-mono)] tabular-nums"
      style={{
        fontSize: compact ? 13 : 22,
        color: 'var(--color-fg-primary)',
        letterSpacing: '-0.01em',
        fontWeight: 600,
      }}
    >
      {compact && (
        <span
          aria-hidden
          className="font-[var(--font-mono)] text-[var(--color-fg-muted)]"
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            fontWeight: 500,
          }}
        >
          oturum
        </span>
      )}
      <span className="relative">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span
                className={live ? 'animate-colon-flicker' : undefined}
                style={{ color: live ? 'var(--color-fg-muted)' : 'var(--color-fg-subtle)' }}
              >
                :
              </span>
            )}
          </span>
        ))}
      </span>
    </span>
  );
}
