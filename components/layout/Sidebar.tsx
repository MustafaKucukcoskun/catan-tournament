'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Archive } from 'lucide-react';

const items = [
  { href: '/', label: 'Hub', icon: LayoutDashboard },
  { href: '/archive', label: 'Arşiv', icon: Archive },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-[var(--color-bg-surface)] border-r border-[rgba(244,185,66,0.10)] flex flex-col">
      <div className="p-6 border-b border-[rgba(244,185,66,0.10)]">
        <div className="font-[var(--font-mono)] uppercase text-[11px] tracking-[0.12em] text-[var(--color-fg-muted)]">
          Catan Tournament
        </div>
        <div className="font-[var(--font-display)] italic text-xl text-[var(--color-fg-primary)] mt-1">
          hub
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(it => {
          const Icon = it.icon;
          const active = pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors',
                active
                  ? 'bg-[var(--color-bg-elevated)] text-[var(--color-fg-primary)]'
                  : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-fg-primary)]'
              )}
            >
              <Icon size={18} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
