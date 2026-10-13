import { InfoPage, InfoSection } from '@/components/info-page';
import { LegalDraftBanner } from '@/components/legal-draft-banner';
import { getLegalProfile, legalValue } from '@/lib/legal-config';

export const metadata = {
  title: 'Hizmet ve kullanım koşulları · Ravza Randevu',
  description:
    'Ravza Randevu acente hizmetinin kapsamı, sınırları ve kullanım koşulları.',
  alternates: { canonical: '/sozlesme' },
};

export default function TermsPage() {
  const profile = getLegalProfile();
  return (
    <InfoPage
      eyebrow="B2B kullanım ve hizmet koşulları · Taslak v0.2"
      title="Hizmetin sınırları baştan görünür."
      intro="Bu taslak yalnız ticari veya mesleki amaçla hareket eden acenteler içindir. Şirket bilgileri, fiyat eki ve hukuk onayı tamamlanmadan bağlayıcı teklif veya sözleşme değildir."
    >
      <LegalDraftBanner profile={profile} />
      <InfoSection title="1. Taraflar ve kapsam">
        <p>
          Şirket türü: {profile.entityType}. Sağlayıcı:{' '}
          {legalValue(profile.companyName, 'ticari unvan')}; MERSİS:
          {` ${legalValue(profile.mersisNumber, 'MERSİS numarası')}`}; adres:
          {` ${legalValue(profile.address, 'şirket adresi')}`}. Müşteri, hesabı
          şirketi/acentesi adına açan ticari kullanıcıdır.
        </p>
        <p>
          Platform; randevu müsaitliği, yolcu iş akışı, randevu hakkı defteri, QR
          durumu, destek ve mutabakat araçları sağlar. Kutsal alana giriş,
          randevu sonucu, kota veya QR’ın belirli sürede hazır olması garanti
          edilmez; nihai durum yetkili üçüncü taraf sağlayıcının sistemine
          bağlıdır.
        </p>
      </InfoSection>
      <InfoSection title="2. Hesap ve yetkili kullanıcılar">
        <p>
          Müşteri kullanıcılarını yetkilendirir, rollerini güncel tutar, MFA ve
          erişim bilgilerini korur. Yetkisiz kullanım şüphesini gecikmeden
          bildirir. Hesap devredilemez; her kullanıcı kendi kimliğiyle işlem
          yapar.
        </p>
      </InfoSection>
      <InfoSection title="3. Ravza randevu hakkı, sipariş ve onay">
        <p>
          Paket adı, randevu hakkı miktarı, KDV dahil/dahil değil fiyat, geçerlilik ve
          iade şartı siparişten önce ayrı ticari ekte gösterilir. Ravza randevu hakkı nakit
          veya elektronik para değildir; yalnız tanımlı platform hizmetine
          mahsup edilir. Sipariş ikinci onaydan sonra işleme alınır ve benzersiz
          işlem referansıyla denetim izine yazılır.
        </p>
      </InfoSection>
      <InfoSection title="4. Ödeme, iptal ve iade">
        <p>
          Hizmet bedeli ve kapsamı sipariş öncesinde taraflarla ayrıca netleştirilir; iptal ve iade koşulları hizmet sözleşmesinde açıklanır.
        </p>
        <p>
          Talep oluşturmak tek başına bir ödeme yükümlülüğü doğurmaz. Randevu
          oluşturulmadan önce talep ücretsiz iptal edilebilir. Sonucu belirsiz
          işlemde otomatik randevu hakkı üretilmez; sağlayıcı kaydıyla mutabakat
          yapılır.
        </p>
        <p>
          Kullanılmamış paket, kısmi kullanım, sağlayıcı reddi, randevu iptali
          ve QR gecikmesi için kesin parasal kurallar ticari fiyat/iade ekinde
          yer alacaktır. Bu ek onaylanana kadar gerçek satın alma kapalıdır.
        </p>
      </InfoSection>
      <InfoSection title="5. Kabul edilebilir kullanım ve veri">
        <p>
          Müşteri yalnız yetkili olduğu, doğru ve gerekli yolcu verisini işler;
          yanıltıcı kayıt, kota istismarı, otomasyon engellerini aşma, tersine
          mühendislik, kimlik paylaşımı ve hukuka aykırı içerik yasaktır.
          Sağlık, biyometri, parola veya kart bilgisi serbest metin/destek
          alanına girilmez.
        </p>
      </InfoSection>
      <InfoSection title="6. Süreklilik, askıya alma ve üçüncü taraflar">
        <p>
          Bakım, güvenlik olayı, sağlayıcı kesintisi, resmi makam kararı veya
          kötüye kullanım halinde hizmet/sipariş güvenli şekilde durdurulabilir.
          Sonucu belirsiz işlem, doğrulanana kadar tamamlanmış sayılmaz. Üçüncü
          taraf şartları müşteriye uygulanabildiği ölçüde sipariş öncesinde
          gösterilir.
        </p>
      </InfoSection>
      <InfoSection title="7. Gizlilik, fikri haklar ve sorumluluk">
        <p>
          Taraflar eriştikleri ticari ve kişisel veriyi gizli tutar. Yazılım,
          tasarım ve marka hakları sağlayıcıya veya lisans verenlerine aittir.
          Emredici hukuk saklı kalmak üzere dolaylı zarar ve kâr kaybı için
          sınırlar, hizmet seviyesi ve sorumluluk tavanı ticari sözleşmede somut
          bedel ve risk modeline göre belirlenecektir.
        </p>
      </InfoSection>
      <InfoSection title="8. Değişiklik, fesih ve uyuşmazlık">
        <p>
          Maddi değişiklikler sürüm ve yürürlük tarihiyle bildirilir. Fesih
          sonrası erişim kapanır; bakiye/iade ve veri silme sözleşme eklerine
          göre yürütülür. Uygulanacak hukuk, yetkili mahkeme, bildirim adresleri
          ve mücbir sebep hükümleri şirket merkezi ve hukuk incelemesiyle
          kesinleştirilecektir.
        </p>
      </InfoSection>
    </InfoPage>
  );
}



