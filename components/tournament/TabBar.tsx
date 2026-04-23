'use client';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface Tab {
  key: string;
  label: string;
  href: string;
  /** Optional right-aligned meta (e.g., count) */
  count?: number | string;
  live?: boolean;
}

interface Props {
  tabs: Tab[];
  activeKey: string;
  className?: string;
}

/**
 * Editorial tab bar — sentence-case labels in DM Sans with a JetBrains
 * Mono tabular count pill, a 2px ember underline on the active tab, and
 * a live-ember dot next to any tab flagged `live`.
 */
export function TabBar({ tabs, activeKey, className }: Props) {
  return (
    <nav
      className={cn(
        'flex flex-wrap items-end gap-1 border-b border-[rgba(244,185,66,0.10)]',
        className,
      )}
    >
      {tabs.map(t => {
        const isActive = t.key === activeKey;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group relative inline-flex items-center gap-2.5 px-4 pt-3 pb-3',
              'text-[14px] font-medium transition-colors duration-[var(--duration-fast)]',
              isActive
                ? 'text-[var(--color-fg-primary)]'
                : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-primary)]',
            )}
          >
            {t.live && (
              <span
                className={cn(
                  'inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent-live)] animate-pulse-ember',
                  'shadow-[0_0_8px_var(--color-accent-live)]',
                )}
              />
            )}
            <span className="leading-none">{t.label}</span>
            {t.count !== undefined && (
              <span
                className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-[var(--radius-sm)]',
                  'font-[var(--font-mono)] tabular-nums text-[11px]',
                  isActive
                    ? 'bg-[rgba(244,185,66,0.14)] text-[var(--color-accent-gold)]'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)]',
                )}
              >
                {t.count}
              </span>
            )}
            {/* Active underline — 2px ember bar */}
            <span
              aria-hidden
              className={cn(
                'absolute left-2 right-2 -bottom-px h-[2px] rounded-full transition-all duration-[var(--duration-base)]',
                isActive
                  ? 'bg-[var(--color-accent-ember)] shadow-[0_0_12px_rgba(232,93,46,0.55)]'
                  : 'bg-transparent group-hover:bg-[rgba(168,152,128,0.18)]',
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
