# Canlıya geçiş için dış girdiler

Kod tarafındaki güvenli yerel temel hazırdır. Aşağıdaki maddeler üçüncü taraf hesabı, ticari karar veya yazılı onay gerektirdiği için uygulama tarafından tahmin edilmez.

## 1. RawdahBooking yazma erişimi

RawdahBooking destek/satış kanalından şunları isteyin:

- güncel ve sürümlü OpenAPI/Swagger veya Postman koleksiyonu;
- sandbox hesabı ile yalnız sentetik yolcu için test kontörü;
- `PurchaseAppointments` istek/yanıt örneği, cinsiyet enumları ve saat dilimi;
- idempotency anahtarı, timeout sonrası sonuç sorgulama ve hata kataloğu;
- QR grup, yolcu listesi, kısa bağlantı ve PDF uçlarının sözleşmesi;
- rate limit, QR polling/webhook ve saklama politikası;
- white-label/yeniden satış ve kişisel veri işleme izni.

Yanıt veya dosyalar geldiğinde repoya gizli anahtar koymadan `docs/provider/` altında tarih ve sürümle arşivleyin.

## 2. Şirket ve hukuk bilgileri

- ticari unvan, marka adı, vergi/fatura bilgileri;
- destek e-postası, telefon/WhatsApp ve çalışma saatleri;
- KVKK veri sorumlusu bilgileri ve saklama/silme süreleri;
- avukat onaylı hizmet sözleşmesi, gizlilik ve açık rıza metinleri;
- iade, iptal, başarısız randevu ve QR gecikmesi kuralları.
- Umre paketinin seyahat acentesi ve ilgili dönem Diyanet yetki/sözleşme kanıtı;
- paket tur broşürü, sözleşmesi, zorunlu sigorta/güvence ve acil destek planı;

## 3. Ödeme ve bildirim sağlayıcıları

- seçilen varsayılan sağlayıcı iyzico için sandbox API anahtarı ve secret key;
- varsayılan USD tahsilatının kabulü, USD settlement/mahsuplaşma hesabı, kur farkı, KDV/fatura ve komisyon modeli;
- üye işyeri sözleşmesindeki bloke/ödeme vadesi, iade ve ters ibraz koşulları;
- e-posta sağlayıcısı ve doğrulanmış gönderici alan adı;
- gerekiyorsa WhatsApp Business/Telegram bot hesapları;
- webhook imza anahtarları ve tekrar deneme politikaları.

## 4. Canlı ortam

- alan adı ve DNS erişimi;
- yönetici ve süper yönetici e-posta allowlist'i;
- acente üyeliğini belirleyecek kaynak veya onay süreci;
- yedekleme, izleme, olay bildirimi ve destek sorumluları.

Gizli değerler sohbete veya Git'e yazılmaz. Yerelde `.env.local`, canlı ortamda Sites secret yönetimi kullanılır.

Ödeme açılış sırası ve test kapıları `docs/payments/iyzico.md`, Türkiye müşterisi USD incelemesi `docs/legal/domestic-b2c-usd-review.md`, kesinleştirilecek şirket alanları `docs/legal/company-inputs.md` dosyasındadır.
