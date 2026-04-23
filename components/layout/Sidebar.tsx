/**
 * @deprecated — the monolithic Sidebar has been split into PublicSidebar and
 * AdminSidebar. This module is kept as an alias for AdminSidebar so any
 * lingering `import { Sidebar } from '@/components/layout/Sidebar'` still
 * compiles, but new code should import PublicSidebar or AdminSidebar
 * directly, or use <Shell variant="public|admin"> which picks the right one.
 */
export { AdminSidebar as Sidebar, type SidebarTournament } from './AdminSidebar';
