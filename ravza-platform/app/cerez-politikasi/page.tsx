import { InfoPage, InfoSection } from '@/components/info-page';
import { LegalDraftBanner } from '@/components/legal-draft-banner';
import { getLegalProfile } from '@/lib/legal-config';

export default function CookiePolicyPage() {
  const profile = getLegalProfile();
  return (
    <InfoPage
      eyebrow="Çerez politikası · Taslak v0.1"
      title="Zorunlu oturum çerezleri ve onaya bağlı ölçüm."
      intro="Reklam, profilleme ve pazarlama çerezi kullanılmaz. Zorunlu oturum teknolojileri her zaman çalışır; ölçüm çerezi ise yalnız siz açıkça onay verirseniz devreye girer."
    >
      <LegalDraftBanner profile={profile} />
      <InfoSection title="Mevcut kullanım">
        <p>
          Zorunlu oturum değerleri giriş durumunu korumak, yetkisiz erişimi
          önlemek ve isteğin güvenli kullanıcıdan geldiğini doğrulamak amacıyla
          kullanılır. Bunlar olmadan panel oturumu çalışmaz; reklam profili
          oluşturmaz.
        </p>
      </InfoSection>
      <InfoSection title="Ölçüm (analitik) çerezleri">
        <p>
          Sitenin hangi sayfalarının kullanıldığını anlamak için Google
          Analytics kullanılabilir. Bu ölçüm <strong>varsayılan olarak
          kapalıdır</strong>: sayfanın altında çıkan tercih kutusunda
          &quot;Kabul et&quot; demediğiniz sürece hiçbir ölçüm betiği yüklenmez
          ve hiçbir veri gönderilmez. Reddet düğmesi kabul ile aynı
          büyüklüktedir ve reddetseniz de site tam olarak çalışır.
        </p>
        <p>
          Onay verildiğinde IP adresi anonimleştirilir; reklam sinyalleri ve
          kişiselleştirme kapalı tutulur, yani veriler reklam hedeflemesi için
          kullanılmaz. Tercihiniz tarayıcınızda saklanır; tarayıcı verisini
          temizlediğinizde tercih kutusu yeniden çıkar ve seçiminizi
          değiştirebilirsiniz.
        </p>
      </InfoSection>
      <InfoSection title="Kişiselleştirme ve pazarlama">
        <p>
          Kişiselleştirme veya pazarlama çerezi kullanılmamaktadır. İleride
          eklenirse etkinleşmeden önce ayrı tercih alınacaktır.
        </p>
      </InfoSection>
      <InfoSection title="Tarayıcı ayarları">
        <p>
          Çerezleri tarayıcı ayarlarından silebilir veya engelleyebilirsiniz.
          Zorunlu oturum verisini engellemek giriş ve güvenli panel
          özelliklerinin çalışmamasına neden olabilir.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
