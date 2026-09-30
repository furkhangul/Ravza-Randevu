import { AgencyAuthShell } from '@/components/agency-auth-shell';
import { AgencyApplicationForm } from '@/components/agency-auth-forms';

export const metadata = { title: 'Acente başvurusu · Ravza Randevu' };

export default function AgencyApplicationPage() {
  return (
    <AgencyAuthShell
      title="Acente / şirket başvurusu"
      lead="Başvurunuzu ekibimiz inceler. Onaylandığında hesabınız açılır ve talep ettiğiniz kontör bakiyenize yüklenir."
      cardTitle="Başvuru formu"
    >
      <AgencyApplicationForm />
    </AgencyAuthShell>
  );
}
