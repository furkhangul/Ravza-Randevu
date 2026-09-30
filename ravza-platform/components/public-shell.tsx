import type { ReactNode } from 'react';

import { PublicShellClient } from '@/components/public-shell-client';
import { loadAssistantPackages } from '@/lib/assistant-data';
import { getAgencyLicenceDisplay, getLegalProfile } from '@/lib/legal-config';

/**
 * Sunucu bileşeni: şirket iletişim kanallarını, acente işletme belgesi
 * gösterimini ve sipariş asistanının paket listesini ortamdan okur,
 * istemci kabuğuna aktarır. Böylece her sayfa ayrı ayrı geçirmek
 * zorunda kalmaz.
 */
export async function PublicShell({ children }: { children: ReactNode }) {
  const profile = getLegalProfile();
  const packages = await loadAssistantPackages();
  return (
    <PublicShellClient
      contact={{
        phone: profile.contactPhone,
        whatsapp: profile.whatsappNumber,
      }}
      licence={getAgencyLicenceDisplay()}
      brandName={profile.brandName}
      packages={packages}
    >
      {children}
    </PublicShellClient>
  );
}
