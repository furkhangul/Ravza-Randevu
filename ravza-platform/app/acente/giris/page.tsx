import { redirect } from 'next/navigation';
import { AgencyAuthShell } from '@/components/agency-auth-shell';
import { AgencyLoginForm } from '@/components/agency-auth-forms';
import { getAgencyContext } from '@/lib/agency-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Acente girişi · Ravza Randevu', robots: { index: false } };

export default async function AgencyLoginPage() {
  if (await getAgencyContext().catch(() => null)) redirect('/acente');
  return (
    <AgencyAuthShell
      title="Kafileniz için toplu Ravza randevusu."
      lead="Onaylı acente ve şirketler kontör bakiyeleriyle istedikleri gün ve saatte Ravza randevusu alır, resmî QR bağlantılarını yolcularına iletir."
      cardTitle="Acente hesabı"
    >
      <AgencyLoginForm />
    </AgencyAuthShell>
  );
}
