import type { ReactNode } from 'react';
import { PublicSidebar } from './PublicSidebar';
import { AdminSidebar, type SidebarTournament } from './AdminSidebar';

interface Props {
  variant?: 'public' | 'admin';
  children: ReactNode;
  tournament?: SidebarTournament | null;
  liveCount?: number;
}

/**
 * Shell — matches the Claude Design admin kit layout.
 *
 * Two-column frame: 232px sidebar + flexible main column.
 * Main column scrolls independently, sits against a deep coffee-bean
 * bg with an optional faint hex-lattice watermark.
 *
 * `variant` selects which sidebar renders:
 *   - `public` (default) → PublicSidebar (spectator nav only)
 *   - `admin` → AdminSidebar (tournament director nav + admin footer)
 *
 * Public routes (`/`, `/archive`, `/t/[id]`, `/t/[id]/match/[tableId]`)
 * must NOT pass `variant="admin"`. Admin routes (`/admin/*` except
 * `/admin/login`) must pass `variant="admin"`.
 */
export function Shell({
  variant = 'public',
  children,
  tournament,
  liveCount,
}: Props) {
  const SidebarComponent = variant === 'admin' ? AdminSidebar : PublicSidebar;
  return (
    <div
      className="flex min-h-screen"
      style={{ background: '#1A1208', color: '#F2E4CA' }}
    >
      <SidebarComponent tournament={tournament} liveCount={liveCount} />
      <main className="relative flex-1 overflow-x-hidden">
        {/* Warm hex-watermark wash — whispers Catan without shouting. */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 8% 12%, rgba(244,185,66,0.03) 0, transparent 25%), radial-gradient(circle at 92% 88%, rgba(232,93,46,0.03) 0, transparent 30%)',
          }}
        />
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}

export type { SidebarTournament };
