'use client';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Tab { key: string; label: string; href: string; }

interface Props { tabs: Tab[]; activeKey: string; }

export function TabBar({ tabs, activeKey }: Props) {
  return (
    <nav className="flex gap-1 border-b border-[rgba(244,185,66,0.10)]">
      {tabs.map(t => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            activeKey === t.key
              ? 'text-[var(--color-fg-primary)] border-b-2 border-[var(--color-accent-ember)]'
              : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg-primary)]'
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
