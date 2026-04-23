import { Shell } from '@/components/layout/Shell';
import { NewTournamentWizard } from '@/components/admin/NewTournamentWizard';

export default function NewTournamentPage() {
  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-4xl font-[var(--font-display)]">Yeni Turnuva</h1>
        <NewTournamentWizard />
      </div>
    </Shell>
  );
}
