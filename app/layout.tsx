import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Catan Tournament Hub',
  description: 'Tournament management for Catan',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-[var(--color-bg-deep)] text-[var(--color-fg-primary)]">
        {children}
      </body>
    </html>
  );
}
