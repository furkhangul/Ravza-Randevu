import Link from '@/components/safe-link';
import { InfoPage, InfoSection } from '@/components/info-page';
import { AGENCY_TERMS_VERSION } from '@/lib/agency-terms';
import { getLegalProfile, legalValue } from '@/lib/legal-config';

export const metadata = {
  title: 'Acente Kullanım Koşulları · Ravza Randevu',
  description: 'Acente ve şirket hesapları için kontör, randevu, QR ve hesap kullanım koşulları.',
};

export default function AgencyTermsPage() {
  const profile = getLegalProfile();
  const company = profile.companyName || 'Ravza Randevu';
  return (
    <InfoPage
      eyebrow={`Acente Kullanım Koşulları · Sürüm ${AGENCY_TERMS_VERSION}`}
      title="Acente ve şirket hesabı kuralları."
      intro="Bu koşullar, Ravza Randevu acente panelini kullanan acente ve şirketler ile bu hesaplar altındaki tüm kullanıcılar için geçerlidir. Başvuru formunda kabul edilen sürüm ve tarihi hesabınızda kayıtlıdır."
    >
      <InfoSection title="1. Taraflar ve konu">
        <p>
          Bu koşullar, {company} (bundan sonra “Platform”) ile Platform’a başvurusu onaylanan acente veya şirket
          (bundan sonra “Acente”) arasındadır. Konusu; Acente’nin Platform üzerinden Ravza-i Mutahhara ziyareti için
          randevu hakkı (kontör) edinmesi, bu kontörle randevu alması ve randevuya ait resmî QR bağlantılarına
          erişmesidir.
        </p>
      </InfoSection>

      <InfoSection title="2. Tanımlar">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Kontör:</strong> Bir kişilik Ravza randevusu alma hakkı. 1 kontör = 1 kişi.</li>
          <li><strong>Randevu:</strong> Kontör karşılığında, sağlayıcı RawdahBooking üzerinden belirli gün, saat ve cinsiyet grubu için alınan ziyaret hakkı.</li>
          <li><strong>QR bağlantısı:</strong> Randevuya ait resmî QR kodlarının görüntülendiği, sağlayıcı tarafından üretilen bağlantı (rwdh.link).</li>
          <li><strong>Acente sahibi:</strong> Acente hesabında tam yetkili kullanıcı. <strong>Çalışan:</strong> Acente sahibinin eklediği, randevu alabilen kullanıcı.</li>
        </ul>
      </InfoSection>

      <InfoSection title="3. Başvuru, onay ve hesap">
        <ul className="list-disc space-y-2 pl-5">
          <li>Başvuruda verilen şirket ve yetkili bilgilerinin doğru ve güncel olmasından Acente sorumludur.</li>
          <li>Platform başvuruyu inceleyip onaylama veya gerekçesini bildirerek reddetme hakkına sahiptir. Onaylanmadan hesap kullanılamaz.</li>
          <li>Bilgilerde değişiklik olursa Acente bunu gecikmeden Platform’a bildirir.</li>
        </ul>
      </InfoSection>

      <InfoSection title="4. Kullanıcılar ve hesap güvenliği">
        <ul className="list-disc space-y-2 pl-5">
          <li>Her kullanıcı kendi e-posta adresi ve şifresiyle girer; hesaplar paylaşılmaz.</li>
          <li>Acente sahibi çalışan ekleyebilir, askıya alabilir ve şifrelerini sıfırlayabilir. Çalışanların panelde yaptığı işlemler Acente adına yapılmış sayılır.</li>
          <li>Geçici şifreler ilk girişten sonra değiştirilmelidir. Şifrenin üçüncü kişilerle paylaşılmasından doğan sonuçlardan Acente sorumludur.</li>
          <li>Hesabın yetkisiz kullanıldığından şüphelenilirse Acente bunu derhâl Platform’a bildirir; Platform hesabı güvenlik için geçici olarak askıya alabilir.</li>
        </ul>
      </InfoSection>

      <InfoSection title="5. Kontör">
        <ul className="list-disc space-y-2 pl-5">
          <li>Kontör, Acente’nin talebi ve Platform’un onayıyla hesaba yüklenir. Kontör bedeli ve ödeme koşulları taraflar arasında ayrıca kararlaştırılır; Platform üzerinden tahsilat yapılmaz.</li>
          <li>Kontör yalnız Platform içinde, Ravza randevusu almak için kullanılır; nakde çevrilemez, başka bir acenteye devredilemez.</li>
          <li>Tüm yüklemeler, kullanımlar, iadeler ve düzeltmeler panelde “Kontör hareketleri” bölümünde kayıt altındadır. Kayıtlara itiraz 30 gün içinde yazılı olarak yapılır.</li>
          <li>Hesap kapatılırsa kullanılmamış kontörlerin durumu taraflar arasında ayrıca kararlaştırılır.</li>
        </ul>
      </InfoSection>

      <InfoSection title="6. Randevu ve QR">
        <ul className="list-disc space-y-2 pl-5">
          <li>Panelde gösterilen boş yer bilgisi sağlayıcıdan anlık okunur ve satın alma anına kadar değişebilir.</li>
          <li>Randevu alındığında seçilen kişi sayısı kadar kontör düşülür ve QR bağlantısı oluşturulur.</li>
          <li>QR kodları, sağlayıcı kuralı gereği randevu saatinden yaklaşık 2 saat önce bağlantıda hazır hâle gelir.</li>
          <li>Kadın ve erkek ziyaret saatleri ayrıdır; her grup kendi saatinde giriş yapar.</li>
          <li>Ziyarete kabul, Mescid-i Nebevî ve yetkili Suudi Arabistan makamlarının (Nusuk dahil) güncel kurallarına tabidir. Platform resmî bir kurum değildir; girişin kabulü veya reddi yetkililerin kararıdır.</li>
        </ul>
      </InfoSection>

      <InfoSection title="7. İptal ve iade">
        <ul className="list-disc space-y-2 pl-5">
          <li>Alınmış bir randevu sağlayıcı tarafından iptal veya iade edilemediği için randevuya harcanan kontör iade edilmez.</li>
          <li>Sağlayıcı satın almayı reddederse (saat dolması, stok bitmesi gibi) düşülen kontör otomatik olarak iade edilir.</li>
          <li>Bağlantı kesintisi gibi nedenlerle sonucu belirsiz kalan işlemde kontör geçici olarak bekletilir; Platform sağlayıcı kayıtlarını inceleyerek randevuyu tamamlar veya kontörü iade eder.</li>
        </ul>
      </InfoSection>

      <InfoSection title="8. Acentenin yükümlülükleri">
        <ul className="list-disc space-y-2 pl-5">
          <li>Randevuları yalnız kendi yolcuları ve müşterileri için kullanır; yolculara tarih, saat, cinsiyet grubu ve QR kuralları hakkında doğru bilgi verir.</li>
          <li>QR bağlantılarını yalnız ilgili yolcularla paylaşır; bağlantının yetkisiz kişilerce kullanılmasından doğan sonuçlardan sorumludur.</li>
          <li>Seyahat acentalığına ilişkin mevzuata (1618 sayılı Kanun ve ilgili yönetmelikler dahil) uygun faaliyet gösterir.</li>
          <li>Paneli otomatik araçlarla zorlamaz, sistemi kötüye kullanacak veya diğer kullanıcıları etkileyecek işlemler yapmaz.</li>
        </ul>
      </InfoSection>

      <InfoSection title="9. Kişisel veriler">
        <p>
          Acente, kendi yolcularına ait kişisel veriler bakımından 6698 sayılı Kişisel Verilerin Korunması Kanunu
          kapsamında veri sorumlusudur ve yolcularını gerekli şekilde aydınlatır. Platform, acente yetkilisi ve
          kullanıcılarının bilgilerini hesabın yönetimi, güvenliği ve bildirimler için işler. Ayrıntılar{' '}
          <Link href="/aydinlatma" className="underline">KVKK aydınlatma metninde</Link> yer alır.
        </p>
      </InfoSection>

      <InfoSection title="10. Sorumluluğun sınırı">
        <p>
          Platform, hizmeti özenle ve sürekli sunmak için gerekli önlemleri alır. Sağlayıcı (RawdahBooking), resmî
          makamlar veya internet altyapısı kaynaklı kesinti, kural değişikliği ve mücbir sebeplerden doğan
          aksaklıklardan, kendi kusuru bulunmadığı ölçüde sorumlu tutulamaz. Kast ve ağır ihmal hâlleri saklı kalmak
          üzere Platform’un bu koşullardan doğan sorumluluğu, ilgili işlem için harcanan kontörün bedeli ile sınırlıdır.
        </p>
      </InfoSection>

      <InfoSection title="11. Askıya alma ve fesih">
        <ul className="list-disc space-y-2 pl-5">
          <li>Bu koşulların ihlali, yanlış bilgi verilmesi veya güvenlik riski hâlinde Platform hesabı askıya alabilir veya kapatabilir; askıya alma anında açık oturumlar sona erer.</li>
          <li>Acente, hesabının kapatılmasını yazılı olarak her zaman talep edebilir.</li>
        </ul>
      </InfoSection>

      <InfoSection title="12. Bildirimler">
        <p>
          Başvuru sonucu, kontör yüklemeleri, randevular ve şifre işlemleri, hesapta kayıtlı e-posta adreslerine
          gönderilir. Acente iletişim bilgilerini güncel tutmakla yükümlüdür. Platform’a{' '}
          {legalValue(profile.contactEmail, 'iletişim e-postası')} adresinden ulaşılabilir.
        </p>
      </InfoSection>

      <InfoSection title="13. Değişiklikler ve uyuşmazlık">
        <ul className="list-disc space-y-2 pl-5">
          <li>Platform bu koşulları güncelleyebilir; değişiklikler sürüm tarihiyle bu sayfada yayımlanır ve kayıtlı e-postalara bildirilir. Yayından sonra paneli kullanmaya devam etmek güncel koşulların kabulü anlamına gelir.</li>
          <li>Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır. Uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri ve icra daireleri yetkilidir; kanunen zorunlu arabuluculuk hükümleri saklıdır.</li>
        </ul>
      </InfoSection>

      <InfoSection title="14. Yürürlük">
        <p>Bu sürüm {AGENCY_TERMS_VERSION} tarihinde yürürlüğe girmiştir.</p>
      </InfoSection>
    </InfoPage>
  );
}
