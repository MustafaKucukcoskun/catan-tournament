import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { NewTournamentWizard } from '@/components/admin/NewTournamentWizard';
import { isAuthenticated } from '@/lib/auth/session';

export default async function NewTournamentPage() {
  if (!(await isAuthenticated())) redirect('/admin/login');
  return (
    <Shell variant="admin">
      <div className="space-y-6">
        <h1 className="text-4xl font-[var(--font-display)]">Yeni Turnuva</h1>
        <NewTournamentWizard />
      </div>
    </Shell>
  );
}
