import { LedgerWorkbench } from '@/components/ledger-workbench';
import { MembershipWorkbench } from '@/components/membership-workbench';
import { PanelTabs, readTab } from '@/components/panel-tabs';
import { ScreenGuide } from '@/components/screen-guide';
import { SectionShell } from '@/components/section-shell';

export const dynamic = 'force-dynamic';

const tabs = [
  { key: 'defter', label: 'Hareket defteri' },
  { key: 'haklar', label: 'Üyelik ve haklar' },
];

export default async function PanelCreditsPage({
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
      title="Ravza randevu hakkı"
      eyebrow="Bakiye ve hareketler"
      activePath="/panel/kontor"
    >
      <ScreenGuide
        purpose="Kalan randevu hakkı doğrudan RawdahBooking hesabından okunur. Üst çubuk ve bu ekran aynı bakiye bilgisini kullanır."
        actions={[
          'Güncel kullanılabilir randevu hakkını görmek',
          'Bakiyeyi yeniden sorgulamak',
          'Son kontrol zamanını görmek',
        ]}
        effect="Bu ekran bakiyeyi yalnız okur; randevu hakkı kullanmaz. Hareket ve paket geçmişi sağlayıcının API yanıtında bulunmuyor."
        limit="Ravza randevu hakkı satın alma sitede yapılmaz; yeni paket talebi WhatsApp üzerinden yürütülür."
      />
      <PanelTabs basePath="/panel/kontor" current={current} tabs={tabs} />
      {current === 'defter' ? <LedgerWorkbench /> : <MembershipWorkbench />}
    </SectionShell>
  );
}
