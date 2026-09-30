import { AdminWorkbench } from '@/components/admin-workbench';
import { ExecutiveOverview } from '@/components/executive-overview';
import { PanelTabs, readTab } from '@/components/panel-tabs';
import { ScreenGuide } from '@/components/screen-guide';
import { SectionShell } from '@/components/section-shell';
import { requireAppRole } from '@/lib/app-auth';

export const dynamic = 'force-dynamic';

const tabs = [
  { key: 'acenteler', label: 'Acente incelemesi' },
  { key: 'ozet', label: 'Yönetici özeti' },
];

export default async function PanelAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Yönetim merkezi yalnız süper yöneticiye açıktır; menüde de görünmez.
  await requireAppRole('/panel/yonetim', ['SUPER_ADMIN']);
  const current = await readTab(
    searchParams,
    tabs.map((tab) => tab.key),
  );

  return (
    <SectionShell
      title="Yönetim merkezi"
      eyebrow="Süper yönetici"
      activePath="/panel/yonetim"
    >
      <ScreenGuide
        purpose="Acente başvurularının incelenmesi ve sistemin bütününe dair özet burada toplanır."
        actions={[
          'Bekleyen acente başvurularını onaylamak veya reddetmek',
          'Denetim kaydındaki son işlemleri görmek',
          'Yayın kapılarının durumunu izlemek',
        ]}
        effect="Onay ve ret işlemleri denetim kaydına yazılır."
        limit="Bu ekran yalnız süper yönetici rolüne açıktır."
      />
      <PanelTabs basePath="/panel/yonetim" current={current} tabs={tabs} />
      {current === 'acenteler' ? <AdminWorkbench /> : <ExecutiveOverview />}
    </SectionShell>
  );
}
