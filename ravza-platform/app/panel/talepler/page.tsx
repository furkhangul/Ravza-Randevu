import { OrdersWorkbench } from '@/components/orders-workbench';
import { PanelTabs, readTab } from '@/components/panel-tabs';
import { QuoteRequestsWorkbench } from '@/components/quote-requests-workbench';
import { ScreenGuide } from '@/components/screen-guide';
import { SectionShell } from '@/components/section-shell';

export const dynamic = 'force-dynamic';

const tabs = [
  { key: 'talepler', label: 'Talepler' },
  { key: 'kayitlar', label: 'Randevu kayıtları' },
];

export default async function PanelRequestsPage({
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
      title="Talepler"
      eyebrow="Tek boru hattı"
      activePath="/panel/talepler"
    >
      <ScreenGuide
        purpose="Siteden, WhatsApp’tan ve telefondan gelen tüm talepler tek listede toplanır; durumu ilerleterek operasyonu yürütürsünüz."
        actions={[
          'Talep kodu, ad veya telefonla arama yapmak',
          'Durum filtreleriyle bekleyen işleri ayırmak',
          'Detay çekmecesinden WhatsApp’a dönmek ve durumu ilerletmek',
        ]}
        effect="Her durum değişikliği denetim kaydına yazılır. “Teslim edildi” geçişi müşteriye geri bildirim daveti açar."
        limit="Fiyat ve tahsilat bu ekranda yapılmaz; görüşmede netleşen tutar bilgi amaçlı kaydedilir."
      />
      <PanelTabs basePath="/panel/talepler" current={current} tabs={tabs} />
      {current === 'talepler' ? (
        <QuoteRequestsWorkbench />
      ) : (
        <OrdersWorkbench />
      )}
    </SectionShell>
  );
}
