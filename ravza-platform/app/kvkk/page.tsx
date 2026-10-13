import Link from '@/components/safe-link';

import { InfoPage, InfoSection } from '@/components/info-page';
import { LegalDraftBanner } from '@/components/legal-draft-banner';
import { getLegalProfile, legalValue } from '@/lib/legal-config';

export const metadata = {
  title: 'KVKK ve kişisel veri koruma · Ravza Randevu',
  description:
    'Ravza Randevu kişisel verilerin korunması merkezi: hangi verilerin neden işlendiği, haklarınız ve başvuru yolları.',
  alternates: { canonical: '/kvkk' },
};

export default function KvkkPage() {
  const profile = getLegalProfile();
  return (
    <InfoPage
      eyebrow="Kişisel veri koruma merkezi · Taslak v0.2"
      title="Veriyi yalnız gerektiği kadar işleriz."
      intro="Bu merkez, Ravza Randevu'un kişisel veri yaklaşımını tek yerde açıklar. Metinler 6698 sayılı Kanun ve güncel Kurul rehberleri esas alınarak hazırlanmış çalışma taslaklarıdır."
    >
      <LegalDraftBanner profile={profile} />
      <InfoSection title="Veri sorumlusu ve rol dağılımı">
        <p>
          Tüzel kişilik: {profile.entityType}; veri sorumlusu unvanı:{' '}
          {legalValue(profile.companyName, 'ticari unvan')}; marka:{' '}
          {profile.brandName}. Platformun acente adına işlediği yolcu
          kayıtlarında veri sorumlusu/veri işleyen rolleri acente sözleşmesinde
          işlem bazında belirlenecektir.
        </p>
        <p>
          Acenteler, platforma aktardıkları yolcu verileri için geçerli bir
          işleme şartına sahip olduklarını, ilgili kişileri aydınlattıklarını ve
          yalnız gerekli veriyi ilettiklerini taahhüt eder.
        </p>
      </InfoSection>
      <InfoSection title="Ürün ilkeleri">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Pasaport, vize, sağlık ve biyometrik veri varsayılan olarak
            toplanmaz.
          </li>
          <li>
            Kart verisi Ravza sunucularından geçmez; hosted ödeme ekranı
            kullanılır.
          </li>
          <li>
            Kişisel veri yaratıcı yapay zekâ veya pazarlama üretim hattına
            gönderilmez.
          </li>
          <li>
            Yönetim görünümünde kişisel alanlar maskeleme ve rol kontrolüyle
            sınırlandırılır.
          </li>
          <li>
            Canlı yurt dışı aktarımı, uygun hukuki güvence kurulmadan açılmaz.
          </li>
        </ul>
      </InfoSection>
      <InfoSection title="Metinler ve başvuru kanalları">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            className="rounded-xl border border-border p-4 font-medium text-foreground hover:bg-muted"
            href="/aydinlatma"
          >
            Aydınlatma metni
          </Link>
          <Link
            className="rounded-xl border border-border p-4 font-medium text-foreground hover:bg-muted"
            href="/saklama-imha"
          >
            Saklama ve imha politikası
          </Link>
          <Link
            className="rounded-xl border border-border p-4 font-medium text-foreground hover:bg-muted"
            href="/kvkk-basvuru"
          >
            İlgili kişi başvurusu
          </Link>
          <Link
            className="rounded-xl border border-border p-4 font-medium text-foreground hover:bg-muted"
            href="/cerez-politikasi"
          >
            Çerez politikası
          </Link>
        </div>
      </InfoSection>
      <InfoSection title="Yurt dışı aktarım kapısı">
        <p>
          RawdahBooking veya yurt dışında bulunan başka bir hizmete düzenli
          kişisel veri aktarımı; aktarım envanteri, veri alıcısının rolü, teknik
          tedbirleri ve Kanun’un 9. maddesindeki mekanizma doğrulanmadan
          başlatılmaz. Standart sözleşme kullanılacaksa Kurumun ilan ettiği
          metin değiştirilmeden imzalanır ve süresinde bildirilir.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
