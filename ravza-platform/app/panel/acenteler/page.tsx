import { AdminAgencies } from '@/components/admin-agencies';
import { SectionShell } from '@/components/section-shell';

export const dynamic = 'force-dynamic';

export default function AgenciesPage() {
  return (
    <SectionShell title="Acenteler" eyebrow="Acente ve şirket hesapları" activePath="/panel/acenteler">
      <AdminAgencies />
    </SectionShell>
  );
}
