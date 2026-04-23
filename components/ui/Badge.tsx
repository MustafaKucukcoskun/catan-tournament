import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'live' | 'ok' | 'warn' | 'error' | 'gold';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = 'neutral', className, ...props }: Props) {
  const tones: Record<Tone, string> = {
    neutral: 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)]',
    live:    'bg-[rgba(255,107,53,0.15)] text-[var(--color-accent-live)]',
    ok:      'bg-[rgba(110,231,135,0.15)] text-[var(--color-ok)]',
    warn:    'bg-[rgba(255,185,77,0.15)] text-[var(--color-warn)]',
    error:   'bg-[rgba(242,107,94,0.15)] text-[var(--color-error)]',
    gold:    'bg-[rgba(244,185,66,0.15)] text-[var(--color-accent-gold)]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-[var(--font-mono)] uppercase tracking-[0.12em]',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
