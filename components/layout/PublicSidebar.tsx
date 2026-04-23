'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Archive } from 'lucide-react';

export interface SidebarTournament {
  id: string;
  name: string;
  current_round: number | null;
  league_rounds: number | null;
  current_round_type: string | null;
  status: string;
}

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: typeof Home;
}

interface Props {
  tournament?: SidebarTournament | null;
  liveCount?: number;
}

/**
 * PublicSidebar — spectator-facing sidebar.
 *
 * Shows only public navigation (Ana sayfa, Arşiv). Tournament context is
 * display-only (name + round label) when a tournament is in scope. There is
 * no admin nav, no "Tournament director" card, and no link into /admin/*.
 */
export function PublicSidebar({ tournament }: Props) {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      id: 'home',
      href: '/',
      label: 'Ana sayfa',
      icon: Home,
    },
    {
      id: 'archive',
      href: '/archive',
      label: 'Arşiv',
      icon: Archive,
    },
  ];

  const roundLabel = tournament
    ? tournament.status === 'completed'
      ? 'Tamamlandı'
      : tournament.current_round_type === 'elimination'
        ? `Eleme · tur ${tournament.current_round ?? 1}`
        : `Tur ${tournament.current_round ?? 1} / ${tournament.league_rounds ?? 0}`
    : null;

  return (
    <aside
      className="flex w-[232px] flex-shrink-0 flex-col gap-1.5 border-r px-[14px] py-[22px]"
      style={{
        background: '#1A1208',
        borderColor: 'rgba(244,185,66,0.10)',
      }}
    >
      {/* Brand wordmark */}
      <div className="px-[10px] pb-[22px] pt-1">
        <div className="flex items-center gap-3">
          <svg width={30} height={38} viewBox="0 0 32 40" aria-hidden>
            <polygon
              points="16,2 30,10 30,30 16,38 2,30 2,10"
              fill="none"
              stroke="#F4B942"
              strokeWidth="1.5"
            />
            <polygon
              points="16,7 26,12.5 26,27.5 16,33 6,27.5 6,12.5"
              fill="#F4B942"
              opacity="0.18"
            />
            <circle cx="16" cy="20" r="2.2" fill="#F4B942" />
          </svg>
          <div className="flex flex-col leading-none">
            <span
              className="font-[var(--font-body)] text-[10px] font-semibold tracking-[0.18em]"
              style={{ color: '#A89880' }}
            >
              CATAN TOURNAMENT
            </span>
            <span
              className="mt-0.5 font-[var(--font-display)] text-[22px] italic"
              style={{ color: '#F2E4CA', fontWeight: 600 }}
            >
              hub
            </span>
          </div>
        </div>
      </div>

      {/* Tournament context — display-only, no admin link */}
      {tournament && (
        <div className="px-[10px] pb-1.5">
          <div
            className="flex items-center gap-1.5 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.12em]"
            style={{ color: '#A89880' }}
          >
            <span className="truncate">{tournament.name}</span>
          </div>
          {roundLabel && (
            <div
              className="mt-1 font-[var(--font-body)] text-xs"
              style={{ color: '#A89880' }}
            >
              {roundLabel}
            </div>
          )}
        </div>
      )}

      <div
        className="my-2.5 mb-1 h-px"
        style={{ background: 'rgba(244,185,66,0.10)' }}
      />

      {/* Primary nav */}
      {items.map(it => {
        const Icon = it.icon;
        const active =
          pathname === it.href ||
          (it.id === 'home' && pathname === '/') ||
          (it.id === 'archive' && pathname.startsWith('/archive'));
        return (
          <Link
            key={it.id}
            href={it.href}
            className={cn(
              'relative flex items-center gap-3 rounded-[6px] px-3 py-2.5 font-[var(--font-body)] text-sm transition-colors',
              active ? 'font-semibold' : 'font-normal'
            )}
            style={{
              background: active ? '#3A2A1E' : 'transparent',
              color: active ? '#F2E4CA' : '#A89880',
            }}
          >
            {active && (
              <span
                className="absolute left-0 top-2 bottom-2 w-[2px] rounded-sm"
                style={{ background: '#E85D2E' }}
                aria-hidden
              />
            )}
            <Icon size={18} strokeWidth={1.75} />
            <span className="flex-1">{it.label}</span>
          </Link>
        );
      })}

      <div className="flex-1" />
    </aside>
  );
}
