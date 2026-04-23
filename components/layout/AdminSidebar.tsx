'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  Users,
  Trophy,
  GitBranch,
  Settings,
  Map as MapIcon,
} from 'lucide-react';
import { adminLogout } from '@/app/actions/admin';

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
  icon: typeof LayoutGrid;
  live?: boolean;
  matchPrefix?: string;
  requiresTournament?: boolean;
}

interface Props {
  tournament?: SidebarTournament | null;
  liveCount?: number;
}

/**
 * AdminSidebar — tournament-director-facing sidebar.
 *
 * Shown only inside /admin/* routes. Contains admin dashboard and tournament
 * management links, plus the "Turnuva yöneticisi" footer card with sign-out.
 * Tournament-scoped nav items (Canlı Masalar, Leaderboard, Bracket, Ayarlar)
 * only render when a tournament is in context — i.e. we're inside /admin/t/[id]/*.
 */
export function AdminSidebar({ tournament, liveCount }: Props) {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      id: 'dashboard',
      href: '/admin',
      label: 'Dashboard',
      icon: LayoutGrid,
    },
    ...(tournament
      ? [
          {
            id: 'pods',
            href: `/admin/t/${tournament.id}#pods`,
            label: 'Canlı Masalar',
            icon: Users,
            live: (liveCount ?? 0) > 0,
          },
          {
            id: 'leaderboard',
            href: `/admin/t/${tournament.id}#leaderboard`,
            label: 'Leaderboard',
            icon: Trophy,
          },
          {
            id: 'bracket',
            href: `/admin/t/${tournament.id}#bracket`,
            label: 'Eleme Bracket',
            icon: GitBranch,
          },
          {
            id: 'settings',
            href: `/admin/t/${tournament.id}/settings`,
            label: 'Ayarlar',
            icon: Settings,
          },
        ]
      : []),
    {
      id: 'map-templates',
      href: '/admin/map-templates',
      label: 'Map Şablonları',
      icon: MapIcon,
      matchPrefix: '/admin/map-templates',
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

      {/* Tournament context */}
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
        const href = it.href;
        const hrefPath = href.split('#')[0].split('?')[0];
        const active =
          pathname === hrefPath ||
          (it.matchPrefix && pathname.startsWith(it.matchPrefix)) ||
          (it.id === 'dashboard' &&
            !tournament &&
            pathname === '/admin') ||
          (it.id === 'pods' &&
            tournament &&
            pathname === `/admin/t/${tournament.id}`) ||
          (it.id === 'settings' &&
            tournament &&
            pathname.startsWith(`/admin/t/${tournament.id}/settings`));
        return (
          <Link
            key={it.id}
            href={href}
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
            {it.live && (
              <span
                className="inline-block h-[7px] w-[7px] flex-shrink-0 animate-pulse-ember rounded-full"
                style={{
                  background: '#FF6B35',
                  boxShadow: '0 0 10px #FF6B35',
                }}
                aria-hidden
              />
            )}
          </Link>
        );
      })}

      <div className="flex-1" />

      {/* Admin footer card */}
      <div
        className="flex items-center gap-2.5 rounded-[6px] border p-3"
        style={{
          background: '#2A1E14',
          borderColor: 'rgba(244,185,66,0.10)',
        }}
      >
        <div
          className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full font-[var(--font-display)] text-[13px] font-semibold"
          style={{
            background: '#3A2A1E',
            border: '1px solid rgba(244,185,66,0.15)',
            color: '#F2E4CA',
          }}
        >
          A
        </div>
        <div className="flex flex-col leading-tight">
          <span
            className="font-[var(--font-body)] text-[13px]"
            style={{ color: '#F2E4CA' }}
          >
            Turnuva yöneticisi
          </span>
          <span
            className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.1em]"
            style={{ color: '#A89880' }}
          >
            admin · çevrimiçi
          </span>
        </div>
      </div>

      {/* Sign-out button */}
      <form action={adminLogout} className="mt-2">
        <button
          type="submit"
          className="w-full rounded-[6px] border bg-transparent px-3 py-2 font-[var(--font-body)] text-[12px] font-semibold transition-colors hover:bg-[#3A2A1E] hover:text-[#F2E4CA]"
          style={{
            borderColor: 'rgba(244,185,66,0.10)',
            color: '#A89880',
          }}
        >
          Çıkış yap
        </button>
      </form>
    </aside>
  );
}
