import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  live?: boolean;
  icon?: ReactNode;
  className?: string;
}

export function StatTile({ label, value, hint, live, icon, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-md)] hairline p-4 bg-[var(--color-bg-surface)] relative',
        live && 'border-[var(--color-accent-live)] border',
        className
      )}
    >
      {live && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--color-accent-live)] animate-pulse" />
      )}
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-[var(--color-fg-muted)]">{icon}</span>}
        <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-fg-muted)] font-[var(--font-mono)]">
          {label}
        </span>
      </div>
      <div className="text-3xl font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]">
        {value}
      </div>
      {hint && (
        <div className="text-xs text-[var(--color-fg-muted)] mt-1">{hint}</div>
      )}
    </div>
  );
}
