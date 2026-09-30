import { BookingWorkbench } from '@/components/booking-workbench';
import { PanelTabs, readTab } from '@/components/panel-tabs';
import { QrCenterWorkbench } from '@/components/qr-center-workbench';
import { ScreenGuide } from '@/components/screen-guide';
import { SectionShell } from '@/components/section-shell';
import { VisaRequestWorkbench } from '@/components/visa-request-workbench';

export const dynamic = 'force-dynamic';

const tabs = [
  { key: 'takvim', label: 'Takvim ve kayıt' },
  { key: 'qr', label: 'QR merkezi' },
  { key: 'vize', label: 'Vize ile talep' },
];

export default async function PanelAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await readTab(
    searchParams,
    tabs.map((tab) => tab.key),
  );

  return (
    <SectionShell
      title="Randevular"
      eyebrow="Takvim, kayıt ve QR"
      activePath="/panel/randevular"
    >
      <ScreenGuide
        purpose="Havuz takvimi, randevu kaydı ve QR hazırlık durumu aynı ekranda toplandı. Kadın ve erkek saatleri ayrı listelenir."
        actions={[
          'Tarih seçip uygun saatleri görmek',
          'Grup kodu, cinsiyet ve kişi sayısıyla kayıt açmak',
          'Yaklaşan grupların QR durumunu ilerletmek',
        ]}
        effect="Kayıt oluşturmak randevu hakkı defterine satır düşürür; QR durumu ilerletmek denetim kaydına yazılır."
        limit="Sağlayıcıya yazma kapalıdır. Canlı takvim salt okunur, durum geçişleri yereldir."
      />
      <PanelTabs basePath="/panel/randevular" current={current} tabs={tabs} />
      {current === 'takvim' ? <BookingWorkbench /> : null}
      {current === 'qr' ? <QrCenterWorkbench /> : null}
      {current === 'vize' ? <VisaRequestWorkbench /> : null}
    </SectionShell>
  );
}

