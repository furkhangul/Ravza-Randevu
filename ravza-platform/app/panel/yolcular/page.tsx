import { PassengerImport } from '@/components/passenger-import';
import { ScreenGuide } from '@/components/screen-guide';
import { SectionShell } from '@/components/section-shell';

export const dynamic = 'force-dynamic';

export default function PanelPassengersPage() {
  return (
    <SectionShell
      title="Yolcular"
      eyebrow="Toplu yükleme ve satır doğrulama"
      activePath="/panel/yolcular"
    >
      <ScreenGuide
        purpose="Yolcu kayıtlarını toplu Excel yüklemesiyle veya tek tek eklemenizi sağlar; her satır ayrı doğrulanır."
        actions={[
          'Excel dosyası seçip kaydetmeden önce hatalı satırları görmek',
          'Doğrulanan satırları kayda almak',
          'Tek yolcuyu elle eklemek',
        ]}
        effect="Kaydedilen yolcular veritabanına yazılır ve randevu kayıtlarıyla eşleşir."
        limit="Pasaport görseli ve hassas belge bu ekrana yüklenmez; yalnız listede gereken alanlar tutulur."
      />
      <PassengerImport />
    </SectionShell>
  );
}
