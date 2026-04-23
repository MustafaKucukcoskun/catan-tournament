import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 max-w-[1440px]">{children}</main>
    </div>
  );
}
