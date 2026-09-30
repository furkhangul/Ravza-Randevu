import { AppointmentPackageWorkbench } from '@/components/appointment-package-workbench';
import { PackageCatalogWorkbench } from '@/components/package-catalog-workbench';
import { PanelTabs, readTab } from '@/components/panel-tabs';
import { ScreenGuide } from '@/components/screen-guide';
import { SectionShell } from '@/components/section-shell';
import { getUmrahPackageStatus } from '@/lib/commercial-gates';

export const dynamic = 'force-dynamic';

export default async function PanelPackagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const umrah = getUmrahPackageStatus();
  const tabs = [
    { key: 'randevu', label: 'Randevu paketleri' },
    ...(umrah.requested ? [{ key: 'umre', label: 'Umre kataloğu' }] : []),
  ];
  const current = await readTab(
    searchParams,
    tabs.map((tab) => tab.key),
  );

  return (
    <SectionShell
      title="Paketler"
      eyebrow="Katalog yönetimi"
      activePath="/panel/paketler"
    >
      <ScreenGuide
        purpose="Siteye çıkan randevu paketlerinin fiyatını, yayın durumunu ve öne çıkan paketi buradan belirlersiniz."
        actions={[
          'Kişi başı fiyatı girmek veya boş bırakmak',
          'Paketi yayımlamak ya da taslağa almak',
          'Bir paketi “en çok tercih edilen” olarak işaretlemek',
        ]}
        effect="Değişiklik anında /paketler sayfasına ve sipariş asistanına yansır."
        limit="Kapsam maddeleri koddan gelir; panelden serbest metin girilmez."
      />
      <PanelTabs basePath="/panel/paketler" current={current} tabs={tabs} />
      {current === 'randevu' ? <AppointmentPackageWorkbench /> : null}
      {current === 'umre' ? (
        <>
          <p className="mb-4 rounded-xl border border-[#d7c9ae] bg-[#f8f3e8] p-4 text-sm leading-6">
            Umre paketi satışı seyahat acentesi işletme belgesi, Diyanet
            yetkisi, paket tur sözleşmesi ve sigorta kapılarına bağlıdır.
            Kapılar açılmadan bu katalog müşteriye görünmez.
          </p>
          <PackageCatalogWorkbench />
        </>
      ) : null}
    </SectionShell>
  );
}
