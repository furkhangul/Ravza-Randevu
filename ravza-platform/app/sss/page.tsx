import { InfoPage } from "@/components/info-page";

export const metadata = {
  title: "Sık sorulan sorular · Ravza Randevu",
  description:
    "Ravza randevusu, paketler, ödeme, QR kodu ve kişisel veriler hakkında sık sorulan sorular.",
};

/**
 * Cevaplar hem sayfada hem `FAQPage` yapılandırılmış verisinde aynı
 * kaynaktan üretilir; ikisinin ayrışması arama sonuçlarında yanlış
 * bilgiye yol açardı.
 */
const faq: Array<[string, string]> = [
  [
    "Ravza randevusu nasıl alınır?",
    "Resmî randevu kanalı Nusuk’tur. Bu siteden ziyaret talebinizi hazırlayıp ekibimize iletebilirsiniz. Ekibimiz uygunluğu değerlendirir. Talep oluşturmak veya saat tercih etmek, kesinleşmiş randevu anlamına gelmez.",
  ],
  [
    "Randevu garantisi veriyor musunuz?",
    "Hayır. Havuzda uygun yer bulunduğunda randevunuz oluşturulur. Ziyarete giriş kararı Harameyn yönetimine aittir ve bu karar bizim kontrolümüzde değildir.",
  ],
  [
    "Güncel hizmet bedelini nasıl öğrenebilirim?",
    "Yeni başlangıç duyurusundaki kişi başı fiyat $2.50 USD olarak belirtilmiştir; TL ve SAR karşılıkları yaklaşık gösterilir. Ekibimiz talebiniz için güncel bilgiyi teyit eder.",
  ],
  [
    "Duyurudaki tutarlar ne anlama geliyor?",
    "Yeni başlangıç tutarı kişi başı $2.50 USD olarak belirtilmiştir. TL ve SAR gösterimleri yaklaşık çevrimdir ve kur değişebilir; talep ayrıntılarını ekibimiz teyit eder.",
  ],
  [
    "Kadın ve erkek aynı saatte ziyaret edebilir mi?",
    "Hayır. Ravza ziyaret saatleri kadın ve erkek için ayrıdır. Bu yüzden talep sırasında kadın ve erkek sayısını ayrı sorarız; aynı ailenin üyeleri farklı saatlere düşebilir.",
  ],
  [
    "QR kodu ne zaman görünür?",
    "İzin onaylandıktan sonra kapıda okutulan QR oluşur ve size iletilir. Doğrulanmış bir süre olmadığı için kesin saat veya geçerlilik süresi bildirilmez; durum “hazır”, “sağlayıcı yanıtı bekleniyor” veya “kontrol gerekiyor” olarak gösterilir.",
  ],
  [
    "Talebimi nereden takip ederim?",
    "Her talebe TALEP- ile başlayan bir kod verilir. Bu kod ve telefon numaranızın son dört hanesiyle talep takip sayfasından durumu görebilirsiniz.",
  ],
  [
    "Bilgilerim WhatsApp’a nasıl gidiyor?",
    "Yalnız sizin onayınızla. Ziyaret asistanının son adımında ayrı bir onay kutusu bulunur; onay vermeden talep gönderilmez ve onayın metin sürümü ile zamanı kaydedilir.",
  ],
  [
    "Yolcu bilgilerim nasıl korunur?",
    "Bilgiler yalnız talebin gerektirdiği kadar alınır. Pasaport görseli, kart bilgisi veya parola talep edilmez. Ayrıntı için KVKK merkezi ve aydınlatma metnine bakabilirsiniz.",
  ],
  [
    "Talebimden vazgeçersem ne olur?",
    "Randevu oluşturulmadan önce ücretsiz iptal edilir. Oluşmuş bir randevu için geçerli koşullar hizmet koşullarında yazar.",
  ],
];

export default function FaqPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
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
        title="Aklınızdaki sorulara, açık cevaplar."
        intro="Bireysel ziyaret ve grup taleplerinden randevu takibine kadar merak ettikleriniz."
      >
        {faq.map(([question, answer]) => (
          <details key={question} className="ravza-faq-item">
            <summary>
              {question}
              <span aria-hidden="true">+</span>
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </InfoPage>
    </>
  );
}


