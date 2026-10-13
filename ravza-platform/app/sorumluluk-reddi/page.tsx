import Link from '@/components/safe-link';
import { InfoPage, InfoSection } from '@/components/info-page';
import { DISCLAIMER_VERSION } from '@/lib/disclaimer';
import { getLegalProfile, legalValue } from '@/lib/legal-config';

export const metadata = {
  title: 'Sorumluluk Reddi Beyanı · Ravza Randevu',
  description: 'Ravza Randevu hizmetinin kapsamı, sınırları ve kullanıcı sorumlulukları.',
  alternates: { canonical: '/sorumluluk-reddi' },
};

export default function DisclaimerPage() {
  const profile = getLegalProfile();
  return (
    <InfoPage
      eyebrow={`Sorumluluk Reddi Beyanı · Sürüm ${DISCLAIMER_VERSION}`}
      title="Neyi yapıyoruz, neyi garanti edemiyoruz."
      intro="Müşteri hesabı açan veya acente başvurusu yapan herkes bu beyanı okuyup kabul eder. Kabul ettiğiniz sürüm ve tarih hesabınızla birlikte kaydedilir."
    >
      <InfoSection title="1. Platformun niteliği">
        <p>
          Ravza Randevu; Ravza-i Mutahhara ziyareti için talep toplayan, boş randevu bilgisini gösteren ve bağımsız bir
          randevu sağlayıcısı aracılığıyla randevu ve QR bağlantısı temin eden özel bir aracı hizmettir. Suudi Arabistan
          makamlarının, Mescid-i Nebevî idaresinin, Nusuk uygulamasının veya herhangi bir resmî kurumun temsilcisi, ortağı
          ya da yetkili satıcısı değildir ve onlar adına beyanda bulunmaz.
        </p>
        <p>
          Platform, Diyanet İşleri Başkanlığının hac ve umre mevzuatı kapsamında düzenlenen bir umre organizasyonu değildir.
          Umre organizasyonu yalnız bu mevzuata göre yetkilendirilmiş seyahat acentalarınca yapılabilir.
        </p>
      </InfoSection>

      <InfoSection title="2. Randevu ve giriş garantisi yoktur">
        <ul className="list-disc space-y-2 pl-5">
          <li>Ziyaret saatleri, kontenjanlar ve giriş kuralları yetkili makamlar tarafından belirlenir ve önceden haber verilmeksizin değişebilir, kısaltılabilir veya iptal edilebilir.</li>
          <li>Randevu veya QR kodu almanız, Ravza-i Mutahhara’ya girişinizi garanti etmez. Girişin kabulü, sıra düzeni ve süre, alandaki görevlilerin takdirindedir.</li>
          <li>Kalabalık, güvenlik önlemleri, bakım çalışmaları, resmî ziyaretler, hava koşulları veya salgın tedbirleri gibi nedenlerle ziyaret ertelenebilir ya da gerçekleşmeyebilir.</li>
        </ul>
      </InfoSection>

      <InfoSection title="3. Boş yer bilgisi ve QR kodu">
        <ul className="list-disc space-y-2 pl-5">
          <li>Sitede gösterilen boş randevu sayıları sağlayıcıdan anlık okunur; bilgi, talep veya satın alma anına kadar değişebilir ve bağlayıcı bir teklif değildir.</li>
          <li>QR kodları sağlayıcının kuralına göre randevu saatinden yaklaşık iki saat önce hazır hâle gelir. Sağlayıcı veya resmî sistemlerdeki gecikme ve kesintiler QR’ın zamanında görünmesini etkileyebilir.</li>
          <li>Saatler Medine yerel saatiyle gösterilir. Saat farkını hesaba katmak ve randevu saatinde yerinde bulunmak kullanıcının sorumluluğundadır.</li>
        </ul>
      </InfoSection>

      <InfoSection title="4. Kullanıcının sorumlulukları">
        <ul className="list-disc space-y-2 pl-5">
          <li>Kişi sayısı, kadın–erkek dağılımı, tarih ve iletişim bilgilerinin doğru verilmesinden kullanıcı sorumludur. Yanlış bilgiden doğan randevu kaybı Platform’a yüklenemez.</li>
          <li>Kadın ve erkek ziyaretçiler yalnız kendi gruplarına ayrılan saatte giriş yapabilir. QR bağlantısı yalnız ilgili grupla paylaşılmalıdır; bağlantının üçüncü kişilerce kullanılmasından paylaşan kişi sorumludur.</li>
          <li>Kullanıcı, alandaki görevlilerin talimatlarına ve Mescid-i Nebevî’nin ziyaret kurallarına uymakla yükümlüdür.</li>
          <li>Hesap şifresinin korunması ve hesap üzerinden yapılan işlemler hesap sahibinin sorumluluğundadır.</li>
          <li>Üyelik oluşturan kişi 18 yaşını doldurmuş ve fiil ehliyetine sahip olmalıdır. Reşit olmayan ziyaretçiler için talep, veli veya vasileri tarafından oluşturulur.</li>
        </ul>
      </InfoSection>

      <InfoSection title="5. Hizmetin kapsamı dışındakiler">
        <p>
          Vize, uçuş, konaklama, ulaşım, sigorta, sağlık hizmeti ve umre organizasyonu bu hizmetin parçası değildir; ayrıca
          yazılı olarak kararlaştırılmadıkça Platform bunlardan sorumlu tutulamaz. Seyahat için gerekli belge ve izinleri
          edinmek kullanıcıya aittir.
        </p>
      </InfoSection>

      <InfoSection title="6. İptal ve iade">
        <p>
          Ravza randevusu, belirli bir tarih ve saatte ifa edilen bir hizmettir. Bu nedenle Mesafeli Sözleşmeler
          Yönetmeliği’nin 15. maddesinin birinci fıkrasının (g) ve (h) bentleri uyarınca, randevu sizin onayınızla satın
          alındıktan sonra cayma hakkı kullanılamaz. Ekibimiz satın almadan önce bu durumu size bildirir ve onayınızı alır.
          Randevu satın alınmadan önce talebinizden ücretsiz olarak vazgeçebilirsiniz. Satın alma sağlayıcı tarafından
          reddedilirse ödediğiniz bedel iade edilir. Hizmetin hiç veya gereği gibi ifa edilmemesinden doğan kanuni
          haklarınız saklıdır. Acenteler için ayrıntılı kurallar{' '}
          <Link href="/acente/kosullar" className="underline">Acente Kullanım Koşulları</Link>’nda yer alır.
        </p>
      </InfoSection>

      <InfoSection title="7. Bilgilendirici içerik">
        <p>
          Umre ve ziyaret rehberi, sık sorulan sorular ve yapay zekâ asistanının yanıtları genel bilgilendirme amaçlıdır;
          dinî hüküm, hukuki veya tıbbi tavsiye niteliği taşımaz. Asistan yanıtları hata içerebilir; kesin bilgi için ekibimize
          ve yetkili kaynaklara başvurun.
        </p>
      </InfoSection>

      <InfoSection title="8. Üçüncü taraf hizmetleri ve bağlantılar">
        <p>
          Randevu, QR ve bildirim işlemlerinde bağımsız üçüncü taraf hizmetleri kullanılır. Platform’un kusuru
          bulunmadığı ölçüde, bu hizmetlerdeki kesinti, hata veya kural değişikliklerinden ve siteden verilen dış
          bağlantıların içeriğinden Platform sorumlu değildir.
        </p>
      </InfoSection>

      <InfoSection title="9. Sorumluluğun sınırı">
        <p>
          Platform; mücbir sebepler, resmî makam kararları ve kendi kusurundan kaynaklanmayan sağlayıcı veya internet
          altyapısı aksaklıkları nedeniyle doğan zararlardan sorumlu tutulamaz. Platform’un kusurundan doğan zararlarda
          kanuni sorumluluk hükümleri uygulanır; kast veya ağır ihmal hâlinde sorumluluk hiçbir şekilde kaldırılamaz ve
          sınırlandırılamaz. Tüketicilerin 6502 sayılı Tüketicinin Korunması Hakkında Kanun’dan doğan hakları saklıdır.
          Acente ve şirket gibi tacir kullanıcılar bakımından sorumluluk,{' '}
          <Link href="/acente/kosullar" className="underline">Acente Kullanım Koşulları</Link>’nda düzenlenir.
        </p>
      </InfoSection>

      <InfoSection title="10. Uygulanacak hukuk ve uyuşmazlıklar">
        <ul className="list-disc space-y-2 pl-5">
          <li>Bu beyana Türkiye Cumhuriyeti hukuku uygulanır.</li>
          <li>
            Tüketiciler; Ticaret Bakanlığınca her yıl belirlenen parasal sınırın (2026 yılı için 186.000 TL) altındaki
            uyuşmazlıklarda yerleşim yerlerindeki veya işlemi yaptıkları yerdeki tüketici hakem heyetine, bu sınırın
            üzerindeki uyuşmazlıklarda tüketici mahkemesine başvurabilir. Tüketici mahkemesinde dava açmadan önce
            arabulucuya başvurulması kanunen zorunludur.
          </li>
          <li>Tacirler arasındaki uyuşmazlıklarda kanunen zorunlu arabuluculuk hükümleri saklıdır.</li>
        </ul>
      </InfoSection>

      <InfoSection title="11. Değişiklikler ve iletişim">
        <p>
          Bu beyan güncellenebilir; yeni sürüm tarihiyle bu sayfada yayımlanır ve esaslı değişiklikler kayıtlı üyelere
          e-postayla bildirilir. Değişiklikten önce yapılmış işlemlere, işlem tarihindeki sürüm uygulanır. Sorularınız için{' '}
          {legalValue(profile.contactEmail, 'iletişim e-postası')} adresine veya{' '}
          <Link href="/iletisim" className="underline">İletişim</Link> sayfasına başvurabilirsiniz. Kişisel verilerinizin
          işlenmesi <Link href="/aydinlatma" className="underline">aydınlatma metninde</Link> anlatılır.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
