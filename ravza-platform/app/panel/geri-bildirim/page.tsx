import { FeedbackModeration } from '@/components/feedback-moderation';
import { ScreenGuide } from '@/components/screen-guide';
import { SectionShell } from '@/components/section-shell';

export const dynamic = 'force-dynamic';

export default function PanelFeedbackPage() {
  return (
    <SectionShell
      title="Geri bildirim"
      eyebrow="Moderasyon kuyruğu"
      activePath="/panel/geri-bildirim"
    >
      <ScreenGuide
        purpose="Teslim edilen taleplerden gelen değerlendirmeleri inceler, yayımlar veya gerekçesiyle reddedersiniz."
        actions={[
          'Bekleyen değerlendirmeleri okumak',
          'Yayımlamak ve isterseniz işletme yanıtı eklemek',
          'Uygunsuz içeriği gerekçesiyle reddetmek',
        ]}
        effect="Yalnız yayımlananlar ana sayfada ve paket sayfasında görünür; yapılandırılmış veri de yalnız bunlardan üretilir."
        limit="Yorum metni düzenlenemez. Değiştirilmiş yorum sahte sosyal kanıt olur ve yasal risk doğurur."
      />
      <FeedbackModeration />
    </SectionShell>
  );
}
