import { InfoPage, InfoSection } from '@/components/info-page';
import { LegalDraftBanner } from '@/components/legal-draft-banner';
import { getLegalProfile } from '@/lib/legal-config';

export const metadata = {
  title: 'Saklama ve imha politikası · Ravza Randevu',
  description:
    'Ravza Randevu’da kişisel verilerin ne kadar süre saklandığı ve nasıl imha edildiği.',
  alternates: { canonical: '/saklama-imha' },
};

const rows = [
  [
    'Hesap ve B2B sözleşme',
    'İlişki boyunca; kapanış sonrası 10 yıl taslak üst sınır',
    'Silme veya hukuki kayıtların erişim kısıtlı arşivi',
  ],
  [
    'Fatura ve ödeme referansı',
    'İlgili mali kayıt süresi; taslakta 10 yıl',
    'Güvenli silme / yasal arşiv',
  ],
  [
    'Operasyon ve yolcu çalışma kaydı',
    'İşlem kapanışından sonra 90 gün; uyuşmazlık varsa hukuki saklama',
    'Silme veya geri döndürülemez anonimleştirme',
  ],
  ['Başarısız dosya/yükleme taslağı', 'En çok 30 gün', 'Otomatik silme'],
  ['Destek talebi', 'Kapanıştan sonra 3 yıl', 'Silme veya anonimleştirme'],
  ['Güvenlik ve denetim izi', 'Oluşumdan sonra 3 yıl', 'Erişim kısıtlı silme'],
  [
    'Pazarlama tercihi',
    'Rıza geri alınana kadar; geri alma ispatı 3 yıl',
    'Silme / bastırma listesinde asgari kayıt',
  ],
];

export default function RetentionPolicyPage() {
  const profile = getLegalProfile();
  return (
    <InfoPage
      eyebrow="Saklama ve imha politikası · Taslak v0.2"
      title="Süresi biten veri sistemde kalmaz."
      intro="Bu politika, veri envanteri ve hukuk onayıyla kesinleştirilecek operasyonel saklama üst sınırlarını ve kontrollü imha yöntemlerini tanımlar."
    >
      <LegalDraftBanner profile={profile} />
      <InfoSection title="İlkeler ve sorumluluk">
        <p>
          İşleme amacı veya hukuki sebep ortadan kalktığında kayıt; aktif
          sistemlerden, yedek döngüsünden ve bağlı işlemcilerden izlenebilir bir
          iş akışıyla silinir, yok edilir veya anonim hale getirilir. Hukuki
          saklama emri varsa yalnız gerekli kayıt erişim kısıtlı tutulur.
        </p>
        <p>
          Veri sorumlusu temsilcisi politika sahibidir; teknik sorumlu silme
          işini, hukuk/uyum sorumlusu istisnayı, iç kontrol ise kanıt kaydını
          doğrular.
        </p>
      </InfoSection>
      <InfoSection title="Taslak saklama matrisi">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-foreground">
                <th className="py-3 pr-4">Kayıt</th>
                <th className="py-3 pr-4">Üst sınır</th>
                <th className="py-3">Süre sonu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[0]} className="border-b border-border/70">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {row[0]}
                  </td>
                  <td className="py-3 pr-4">{row[1]}</td>
                  <td className="py-3">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Bu süreler ürün kararı niteliğinde taslaktır; vergi, ticaret,
          tüketici, turizm ve uyuşmazlık mevzuatı şirketin gerçek iş modeline
          göre hukuk danışmanınca doğrulanacaktır.
        </p>
      </InfoSection>
      <InfoSection title="Periyodik imha ve kanıt">
        <p>
          Periyodik imha döngüsü altı ayı aşmaz. Silme, yok etme ve
          anonimleştirme işlemlerinin işlem türü, kapsamı, zamanı, sorumlusu ve
          sonucu kayıt altına alınır; başka bir hukuki yükümlülük yoksa bu kanıt
          kayıtları en az üç yıl saklanır.
        </p>
      </InfoSection>
      <InfoSection title="Teknik yöntemler">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Uygulama ve indekslerden satır/nesne silme; erişim anahtarlarını
            iptal etme.
          </li>
          <li>
            Yedeklerde süre dolumuyla üstüne yazma ve geri yüklemede yeniden
            silme listesi.
          </li>
          <li>
            Bulut sağlayıcı veya ödeme kuruluşunda silme talebi ve tamamlanma
            kanıtı.
          </li>
          <li>
            Anonimleştirmede geri bağlama anahtarını kaldırma ve yeniden
            tanımlama riskini test etme.
          </li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
