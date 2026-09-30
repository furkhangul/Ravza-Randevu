import { InfoPage, InfoSection } from '@/components/info-page';
import { LegalDraftBanner } from '@/components/legal-draft-banner';
import { getLegalProfile, legalValue } from '@/lib/legal-config';

export default function PrivacyNoticePage() {
  const profile = getLegalProfile();
  return (
    <InfoPage
      eyebrow="KVKK aydınlatma metni · Taslak v0.2 · 4 Eylül 2026"
      title="Hangi veriyi, neden işlediğimiz açık."
      intro="Bu metin hesap kullanıcıları, acente yetkilileri, destek başvuruları ve platform üzerinden yönetilen operasyon kayıtları için hazırlanmıştır."
    >
      <LegalDraftBanner profile={profile} />
      <InfoSection title="1. Veri sorumlusu">
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri
          sorumlusu
          {` ${legalValue(profile.companyName, 'ticari unvan')}`} olup adresi
          {` ${legalValue(profile.address, 'şirket adresi')}`} şeklindedir.
          İletişim:
          {` ${legalValue(profile.kvkkEmail, 'KVKK e-postası')}`}.
        </p>
      </InfoSection>
      <InfoSection title="2. İşlenen veri kategorileri">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Kimlik ve iletişim: ad-soyad, iş e-postası, telefon ve acente
            bilgisi.
          </li>
          <li>Hesap ve yetki: kullanıcı kimliği, rol, oturum ve MFA durumu.</li>
          <li>
            Operasyon: grup kodu, randevu tercihi, cinsiyet kategorisi, yolcu
            sayısı ve sağlayıcı işlem referansları.
          </li>
          <li>
            İşlem güvenliği: IP/ağ bilgisi, zaman damgası, hata, audit ve
            idempotency kayıtları.
          </li>
          <li>
            Finans: paket, tutar, fatura ve ödeme kuruluşu işlem referansları;
            kart numarası ve güvenlik kodu Ravza tarafından alınmaz.
          </li>
          <li>
            Destek: talep konusu, yazışma ve çözüm kaydı. Sohbet asistanına
            yazılan mesajlar ve önceki sohbetten sınırlı bağlam yanıt üretimi
            amacıyla Cloudflare Workers AI’ye iletilir.
          </li>
        </ul>
        <p>
          Sağlık, biyometri ve benzeri özel nitelikli veriler bu ürünün
          varsayılan kapsamı dışındadır; destek alanlarına veya dosyalara
          yazılmamalıdır.
        </p>
      </InfoSection>
      <InfoSection title="3. Amaçlar ve hukuki sebepler">
        <p>
          Veriler; üyeliğin ve B2B hizmet sözleşmesinin kurulması/ifası, randevu
          ve QR operasyonunun yürütülmesi, ödeme-mutabakat, destek,
          dolandırıcılık ve yetkisiz erişimin önlenmesi, hukuki taleplerin
          yönetimi ve mevzuattan doğan kayıt yükümlülükleri için işlenir.
        </p>
        <p>
          Dayanaklar somut işleme göre Kanun’un 5/2 maddesindeki sözleşmenin
          kurulması veya ifası, hukuki yükümlülük, bir hakkın
          tesisi/kullanılması, ve temel haklara zarar vermemek kaydıyla meşru
          menfaat şartlarıdır. Pazarlama veya zorunlu olmayan çerezler eklenirse
          bunlar ayrı ve geri alınabilir açık rıza mekanizmasına bağlanır.
        </p>
      </InfoSection>
      <InfoSection title="4. Toplama yöntemi ve alıcılar">
        <p>
          Veriler web arayüzü, sipariş asistanı, yetkili acente kullanıcısı,
          destek kanalı ve randevu sağlayıcısı üzerinden otomatik veya kısmen
          otomatik yollarla toplanır. Gerektiği ölçüde yetkili personel,
          barındırma/kimlik altyapısı, mali müşavir, hukuk danışmanı ve kanunen
          yetkili kamu kurumlarıyla paylaşılabilir. 
        </p>
        <p>
          <strong>WhatsApp aktarımı:</strong> Sipariş asistanının sonunda
          &ldquo;WhatsApp&rsquo;tan gönder&rdquo; adımını seçmeniz hâlinde talep
          özetiniz (ad, telefon, kişi sayısı, tarih ve notunuz) WhatsApp
          altyapısı üzerinden iletilir. Bu aktarım yalnız asistanın son
          adımındaki ayrı onay kutusunu işaretlemenizle gerçekleşir; onayın
          metin sürümü ve zamanı kaydedilir. Onay vermek istemezseniz e-posta
          veya telefon kanallarını kullanabilirsiniz.
        </p>
        <p>
          <strong>Yapay zekâ destekli sohbet:</strong> Asistan, yanıt üretmek
          için güncel mesajı, sohbetin son bölümünü ve henüz gönderilmemiş
          ziyaret taslağındaki kişi/tarih tercihlerini Cloudflare Workers AI
          hizmetine iletir. Sohbet dökümü Ravza uygulama veritabanına
          kaydedilmez. Asistan randevu açamaz, talebi onaylayamaz, ödeme alamaz
          veya kayıtlı hesap verilerini sorgulayamaz. Kullanıcı &ldquo;talep
          oluştur&rdquo; adımına geçip formu gönderirse seçtiği sohbet sorusu
          talep notuna eklenir ve formdaki bilgilendirme/onay akışı uygulanır.
          Mesajlara pasaport, kimlik, ödeme kartı, parola, sağlık bilgisi veya
          doğrulama kodu yazılmamalıdır.
        </p>
        <p>
          Yurt dışındaki randevu sağlayıcısına yolcu listesi aktarımı, KVKK
          aktarım mekanizması tamamlanana kadar kapalıdır. Yapay zekâ destekli
          sohbet mesajları ve taslak ziyaret bilgileri, yukarıda açıklandığı
          üzere yanıt üretimi için ayrı olarak Cloudflare Workers AI hizmetine
          iletilir. Site barındırma ve yapay zekâ hizmeti (Cloudflare) ile e-posta
          bildirimleri (Resend) için kullanılan hizmet sağlayıcılarının sunucuları
          yurt dışında bulunabilir.
        </p>
      </InfoSection>
      <InfoSection title="5. Haklar ve başvuru">
        <p>
          İlgili kişiler Kanun’un 11. maddesi kapsamındaki öğrenme, bilgi talep
          etme, düzeltme, silme/yok etme, aktarılan üçüncü kişilere bildirim,
          otomatik analiz sonucuna itiraz ve zarar halinde tazminat talebi
          haklarını kullanabilir. Kimlik doğrulanabilir başvurular için
          ayrıntılar /kvkk-basvuru sayfasındadır; talepler mevzuattaki süre
          içinde ve en geç otuz gün içinde sonuçlandırılır.
        </p>
      </InfoSection>
    </InfoPage>
  );
}


