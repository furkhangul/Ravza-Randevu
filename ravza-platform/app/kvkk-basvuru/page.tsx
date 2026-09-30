import { InfoPage, InfoSection } from '@/components/info-page';
import { LegalDraftBanner } from '@/components/legal-draft-banner';
import { getLegalProfile, legalValue } from '@/lib/legal-config';

export default function DataSubjectRequestPage() {
  const profile = getLegalProfile();
  return (
    <InfoPage
      eyebrow="İlgili kişi başvurusu · Taslak"
      title="Verinizle ilgili talebinizi iletin."
      intro="Başvurunun güvenli ve zamanında işlenebilmesi için gerekli asgari bilgileri ve kabul edilen kanalları burada bulabilirsiniz."
    >
      <LegalDraftBanner profile={profile} />
      <InfoSection title="Başvuruda bulunması gerekenler">
        <ul className="list-disc space-y-2 pl-5">
          <li>Ad, soyad ve başvuru yazılıysa imza.</li>
          <li>
            Türkiye Cumhuriyeti vatandaşları için T.C. kimlik numarası;
            yabancılar için uyruğu, pasaport numarası veya varsa kimlik
            numarası.
          </li>
          <li>Tebligata esas yerleşim yeri veya iş yeri adresi.</li>
          <li>
            Varsa bildirime esas e-posta, telefon ve işlem/acente referansı.
          </li>
          <li>
            Kanun’un 11. maddesindeki hangi hakka ilişkin olduğu ve talebin
            açıklaması.
          </li>
        </ul>
        <p>
          Kimlik belgesinin gereksiz alanlarını kapatın; başvuruya yolcu
          listesi, parola veya kart bilgisi eklemeyin.
        </p>
      </InfoSection>
      <InfoSection title="Başvuru kanalları">
        <p>
          E-posta: {legalValue(profile.kvkkEmail, 'KVKK e-postası')}; KEP:
          {` ${legalValue(profile.kepAddress, 'KEP adresi')}`}; elden veya
          posta:
          {` ${legalValue(profile.address, 'şirket adresi')}`}.
        </p>
        <p>
          Elektronik başvurunun kimliği doğrulayacak bir yöntemle yapılması
          gerekir. Güvenli başvuru formu, KVKK e-postası tanımlanana kadar
          bilerek aktif edilmemiştir.
        </p>
      </InfoSection>
      <InfoSection title="Yanıt ve ücret">
        <p>
          Başvurular talebin niteliğine göre en kısa sürede ve en geç otuz gün
          içinde ücretsiz sonuçlandırılır. İşlem ayrıca maliyet gerektirirse
          Kurulun belirlediği tarifedeki ücret istenebilir. Eksik kimlik veya
          talep bilgisi bulunursa güvenli kanaldan ek doğrulama talep edilir.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
