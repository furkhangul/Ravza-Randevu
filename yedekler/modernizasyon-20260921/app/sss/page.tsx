import { InfoPage, InfoSection } from '@/components/info-page';

export const metadata = {
  title: 'Sık sorulan sorular · Ravza Randevu',
  description:
    'Ravza randevusu, paketler, ödeme, QR kodu ve kişisel veriler hakkında sık sorulan sorular.',
};

/**
 * Cevaplar hem sayfada hem `FAQPage` yapılandırılmış verisinde aynı
 * kaynaktan üretilir; ikisinin ayrışması arama sonuçlarında yanlış
 * bilgiye yol açardı.
 */
const faq: Array<[string, string]> = [
  [
    'Ravza randevusu nasıl alınır?',
    'Talep oluştururken kadın ve erkek ziyaretçiler için ayrı saat tercihi alınır. Ravza izinleri ziyaretten kısa süre önce açılır ve kontenjan hızla dolar. Bu nedenle seçtiğiniz saat bir tercihtir; kesinleşmiş randevu değildir.',
  ],
  [
    'Randevu garantisi veriyor musunuz?',
    'Hayır. Havuzda uygun yer bulunduğunda randevunuz oluşturulur. Ziyarete giriş kararı Harameyn yönetimine aittir ve bu karar bizim kontrolümüzde değildir.',
  ],
  [
    'Ödemeyi nasıl yapacağım?',
    'Site üzerinden tahsilat yapılmaz; bu sayfalarda kart bilgisi istenmez. Fiyat ve ödeme şekli WhatsApp, telefon veya e-posta görüşmesinde konuşulur ve elden ya da havale ile tamamlanır.',
  ],
  [
    'Fiyatlar kesin mi?',
    'Paket sayfasında görünen tutarlar kişi başı USD üzerinden gösterilir; diğer para birimleri yalnız yaklaşık çeviridir. Fiyatı henüz kesinleşmemiş paketlerde kart üzerinde “Fiyat WhatsApp’tan teyit edilir” yazar.',
  ],
  [
    'Kadın ve erkek aynı saatte ziyaret edebilir mi?',
    'Hayır. Ravza ziyaret saatleri kadın ve erkek için ayrıdır. Bu yüzden talep sırasında kadın ve erkek sayısını ayrı sorarız; aynı ailenin üyeleri farklı saatlere düşebilir.',
  ],
  [
    'QR kodu ne zaman görünür?',
    'İzin onaylandıktan sonra kapıda okutulan QR oluşur ve size iletilir. Doğrulanmış bir süre olmadığı için kesin saat veya geçerlilik süresi bildirilmez; durum “hazır”, “sağlayıcı yanıtı bekleniyor” veya “kontrol gerekiyor” olarak gösterilir.',
  ],
  [
    'Talebimi nereden takip ederim?',
    'Her talebe TALEP- ile başlayan bir kod verilir. Bu kod ve telefon numaranızın son dört hanesiyle talep takip sayfasından durumu görebilirsiniz.',
  ],
  [
    'Bilgilerim WhatsApp’a nasıl gidiyor?',
    'Yalnız sizin onayınızla. Sipariş asistanının son adımında ayrı bir onay kutusu bulunur; onay vermeden talep gönderilmez ve onayın metin sürümü ile zamanı kaydedilir.',
  ],
  [
    'Yolcu bilgilerim nasıl korunur?',
    'Bilgiler yalnız talebin gerektirdiği kadar alınır. Pasaport görseli, kart bilgisi veya parola talep edilmez. Ayrıntı için KVKK merkezi ve aydınlatma metnine bakabilirsiniz.',
  ],
  [
    'Talebimden vazgeçersem ne olur?',
    'Randevu oluşturulmadan önce ücretsiz iptal edilir. Oluşmuş bir randevu için geçerli koşullar hizmet koşullarında yazar.',
  ],
];

export default function FaqPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <InfoPage
        eyebrow="Sık sorulan sorular"
        title="Net cevaplar, ölçülü vaatler."
        intro="Talep oluşturmaktan QR kodunun teslimine kadar süreç, sunabildiğimiz kadarıyla ve abartısız anlatılır."
      >
        {faq.map(([question, answer]) => (
          <InfoSection key={question} title={question}>
            <p>{answer}</p>
          </InfoSection>
        ))}
      </InfoPage>
    </>
  );
}
