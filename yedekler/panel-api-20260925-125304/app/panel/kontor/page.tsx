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
        purpose="Kalan randevu hakkı, nereden geldiği ve hangi işlemle azaldığı tek yerde izlenir. Üst çubuktaki randevu hakkı göstergesi de bu kaynaktan beslenir."
        actions={[
          'Ravza randevu hakkı giriş ve çıkışlarını tarih sırasıyla incelemek',
          'Bir randevu kaydının hangi hareketle eşleştiğini bulmak',
          'Kalan hak ve rezerve edilen miktarı ayırmak',
        ]}
        effect="Defter yalnız eklenir; satır silinemez, geçmişe dönük düzeltme yeni satırla yapılır."
        limit="Ravza randevu hakkı satın alma sitede yapılmaz; yeni paket talebi WhatsApp üzerinden yürütülür."
      />
      <PanelTabs basePath="/panel/kontor" current={current} tabs={tabs} />
      {current === 'defter' ? <LedgerWorkbench /> : <MembershipWorkbench />}
    </SectionShell>
  );
}

