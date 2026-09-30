# Yerel Uygulama Durumu

> **v5 (20 Eylül 2026):** Tahsilat müşteri yüzeyinden tamamen kaldırıldı. Satış modeli
> **talep → WhatsApp görüşmesi → elden/havale ödeme** akışına taşındı. Panel 13 ekrandan
> 7 ekrana indirildi, kontör göstergesi her sayfaya eklendi, geri bildirim modülü açıldı
> ve arayüz "Sükûnet" tasarım sistemine geçirildi.

## v5 ile gelen yüzeyler

- **Sipariş asistanı** (`/siparis` ve her sayfada sağ alt panel): altı adımlı, LLM içermeyen
  sihirbaz. Talep önce veritabanına yazılır, sonra `wa.me` bağlantısıyla WhatsApp'a
  yönlendirilir; WhatsApp hiç açılmasa bile kayıt operasyona ulaşır.
- **Talep takibi** (`/talep`, `/talep/{kod}`): talep kodu **ve** telefonun son dört hanesi
  birlikte sorulur; yanıt ad, telefon ve not alanlarını hiçbir koşulda döndürmez.
- **Randevu paketleri** (`/paketler`): kişi sayısına göre altı katman (1/3/5/10/25/özel).
  Fiyatlar boş başlar ve kartta "Fiyat WhatsApp'tan teyit edilir" görünür; panelden girilir.
- **Ziyaret rehberi** (`/rehber`): kadın/erkek saat farkı, QR kullanımı, hazırlık ve sık hatalar.
- **Geri bildirim** (`/geri-bildirim/{jeton}` + `/panel/geri-bildirim`): yalnız teslim edilen
  talebe tek kullanımlık davet gider; moderasyondan geçmeyen yorum hiçbir yüzeyde görünmez.
- **Panel** (`/panel/*`): Bugün, Talepler, Randevular, Yolcular, Kontör, Paketler,
  Geri bildirim, Ayarlar + yalnız süper yöneticiye açık Yönetim merkezi.
- **Kontör göstergesi**: panelin üst çubuğunda; tek API'den beslenir, okunamazsa `0` değil
  `—` gösterir.

## v5 ile kaldırılanlar

- Dört adımlı ödemeli rezervasyon akışı (`/book` → `/siparis` yönlendirmesi) ve
  `components/customer-purchase-flow.tsx`.
- `app/api/payment/*` rotaları. `packages/payment-iyzico/` ve `payment_attempts` /
  `payment_webhook_events` tabloları **duruyor** fakat hiçbir sayfadan import edilmiyor.
- Ana sayfadaki three.js Kâbe sahnesi ve `three` bağımlılığı (mobil JS yükü için).
- Eski `/dashboard/*`, `/admin`, `/super-admin`, `/customer`, `/landing`, `/packages`
  adresleri: hepsi kalıcı yönlendirmeye (308) dönüştürüldü.

## Bilinen açıklar (v5)

- Bildirim kataloğu hâlâ `customerOrders` modeline bağlıdır; talep yaşam döngüsü
  (`quote_requests`) için ayrı bildirim olayları **bağlanmadı**. Metinler ödeme vaadi
  içermeyecek şekilde güncellendi, zamanlama mantığı değişmedi.
- WhatsApp Cloud API yalnız sözleşme düzeyinde hazır (`lib/whatsapp-cloud.ts`);
  bayrak kapalı, webhook rotası açılmadı, canlı çağrı yok.
- `PII_HASH_SALT` girilmeden hacim sınırı (IP başına 10 dakikada 5 talep) devre dışıdır.
  Ham IP hiçbir koşulda saklanmaz.
- Talep saklama süresi işi (`anonymizeExpiredQuotes`) yazıldı fakat bir cron'a bağlanmadı.

## Çalışan yerel yüzeyler

- Müşteriye açık Umre paket kataloğu, dört adımlı rezervasyon/ödeme akışı ve ayrı `Seyahatim` paneli
- Müşteri rezervasyonunda çıkış, yolcu listesi, kadın/erkek için ayrı Ravza saat tercihi, yerleşiklik ve USD ödeme özeti
- Halka açık Ravza takvimi varsayılan olarak yalnız sentetik önizleme kullanır; canlı müşteri takvimi ayrı özellik bayrağıyla kapalıdır
- Operasyon genel bakışı
- Takvim ve idempotent demo randevu oluşturma
- Sipariş arama ve filtreleme
- Kontör defteri
- QR merkezi, salt-okunur canlı yaklaşan grup listesi ve sentetik durum geçişi
- Excel önizleme ve sentetik yolcu kaydı
- Paketler, üyelik ve profil
- Destek talebi ve geçmişi
- Acente inceleme ve CEO görünümü
- Kayıt, e-posta doğrulama, MFA ve bildirim tercihleri
- ChatGPT kimliğiyle panel oturumu, sunucu tarafı API koruması ve e-posta allowlist tabanlı yönetici rolleri
- Ana panelde RawdahBooking kaynağından salt-okunur canlı müsaitlik özeti
- Hazır havuz randevusu ile müşterinin vizesi üzerinden asenkron talep birbirinden ayrıldı; `/dashboard/requests` tarih/saat aralığı, cinsiyet ve talep kuyruğu durumlarını gösterir
- Panel navigasyonu operasyon, hesap ve yönetim kümelerine ayrıldı; mobil yatay menü ve rol bazlı yönetim görünürlüğü eklendi
- Operasyon genel bakışı Medine görseli, iki ayrı randevu giriş noktası ve canlı durum özetleriyle modern kontrol yüzeyine dönüştürüldü
- Yolcu ekranına Excel önizlemesine ek olarak tekli sentetik yolcu akışı eklendi
- CEO merkezine USD bazlı sentetik finans görünümü, mutabakat kuyruğu, yayın kapıları ve sistem güvenliği özetleri eklendi
- Landing, rehber, SSS, iletişim ve yasal taslaklar
- Ayrıntılı KVKK merkezi, aydınlatma, saklama-imha, ilgili kişi başvurusu ve çerez taslakları
- iyzico Checkout Form için sandbox/canlı kapıları, HMAC imza katmanı ve ödeme kayıt şeması
- USD öncelikli, çoklu para birimli ödeme modeli (`amount_minor`); mevcut TRY kayıtları korunur
- Tüzel kişilik bilgileri `.env.local` içindeki `LEGAL_*` anahtarlarından okunur; bu depoda tutulmaz.
- Hedef satış modeli doğrudan yolcuya şirketimizin kendi düzenlediği Umre paketini satmak ve paket içindeki Ravza randevusunu RawdahBooking API üzerinden ayırmaktır; başka acentenin hazır paketini yeniden satış modeli seçilmemiştir ve B2C canlı açılış kapalıdır
- Umre paketi için seyahat acentesi, Diyanet dönem yetkisi, paket tur sözleşmesi ve sigorta/güvence kapıları kod seviyesinde kapalıdır
- Şirket adına geçerli seyahat acentesi işletme belgesi bulunduğu **doğrulanmadı**; vergi levhası bu belgenin yerine geçmez ve `TRAVEL_AGENCY_AUTHORITY_VERIFIED=false` kalır. Şirket 1999'dan beri 791101 faaliyet koduyla kayıtlı olduğundan önce mevcut/geçmiş belge durumu sorgulanacak, yoksa yeni başvuru yapılacak
- Hedef kitlenin yaklaşık `%80` Türk olduğu kaydedildi; vatandaşlık yerleşiklik yerine kullanılmaz ve Türkiye'de yerleşik müşteri USD checkout'u ayrı hukuk onayı bayrağına bağlıdır
- Türk müşterilerin yaklaşık `%99`unun Türkiye'de ikamet ettiği kaydedildi; bireysel yerleşiklik checkout sırasında yine doğrulanır
- Türkiye'de ikamet eden müşteride USD tahsilat zorunludur; TRY fallback yoktur ve yazılı hukuk onayı olmadan checkout bloke kalır
- Arama motoru yüzeyi için `sitemap.xml`, `robots.txt` ve `TravelAgency` yapılandırılmış verisi eklendi; özel panel/API rotaları taramaya kapatıldı
- Yerel prototipte kullanılan Kâbe, Medine, Mina ve hazırlık görselleri hash, kullanım yüzeyi, alt metin, üretim kaynağı ve hak inceleme durumuyla varlık manifestine kaydedildi

## Güvenlik sınırı

Yerel uygulama RawdahBooking takvimini ve yaklaşan QR gruplarını salt-okunur gösterebilir. Sipariş, QR paylaşımı, ödeme, e-posta ve mesajlaşma sentetiktir; sağlayıcıya yazma kod seviyesinde kapalıdır.

Yolcu/QR durum istemcisi doğrulanmış filtre ve yanıt sözleşmesiyle hazırdır. Yanıt kişisel veri içerdiği için gerçek yolcu listesi tenant/acente yetkilendirmesi kurulmadan genel QR ekranına açılmaz.

PDF export istemcisi ikili PDF gövdesini ve işaretlenen kişi sayısını doğrular. İşlem sağlayıcıda `Printed` durumu yarattığı için satın almadan bağımsız `RAWDAH_PDF_EXPORT_ENABLED=false` kilidiyle kapalıdır.

Paylaşım bağlantısı istemcisi yalnız beş karakterli kodu ve `https://rwdh.link/{code}` hedefini kabul eder. Link oturumsuz olduğu ve TTL/iptal/rate-limit politikası yayımlanmadığı için `RAWDAH_SHARE_LINK_ENABLED=false` kilidiyle kapalıdır.

Partner API girişi resmi `/api/Auth/login` yolunu kullanır. JWT istemciye verilmez veya kalıcı depoya/loga yazılmaz; yalnız sunucu belleğinde, bildirilen/JWT içi sona erme zamanlarının erken olanına kadar tutulur. Refresh token varsayılmaz ve `401` için kör tekrar yapılmaz.

Rawdah kimlik bilgileri yalnız tam `https://rawdahbooking.com/` origin'ine gönderilebilir; HTTP, alt/benzer alan adı, URL kullanıcı bilgisi, özel port, path, query ve fragment reddedilir. JWT yalnız Bearer başlığında taşınır. Canlı müsaitlik ve QR grup API yanıtları `private, no-store` başlıklarıyla servis edilir. `.env.local` Git kapsamı dışındadır.

## Dış girdiye bağlı kalanlar

1. Güncel ticari sözleşme ve yazılı kullanım izni
2. Sürümlü OpenAPI/Postman koleksiyonu ve enum tablosu
3. Sandbox hesabı, test kontörü ve tek sentetik yolcu E2E sonucu
4. Rate limit, idempotency, hata ve QR zamanlama politikaları
5. iyzico sandbox anahtarları, USD kabul/settlement koşulları, üye işyeri sözleşmesi, vergi/fatura ve iade modeli
6. Şirket kimliğinin kalanı (MERSİS, iletişim/KVKK e-postaları, KEP, imza yetkilisi), hukuk onaylı metinler ve KVKK yurt dışı aktarım mekanizması — ticari unvan, vergi ve adres bilgileri doğrulandı
7. Acente-tenant üyelik kaynağı ve yönetici MFA politikası (temel oturum ve rol kapıları hazır)
8. Kendi Umre paketimiz için seyahat acentesi işletme belgesi (önce mevcut belge sorgusu), Diyanet yetkisi, kesin hizmet kapsamı, sigorta ve tedarikçi sözleşmeleri — şirket kuruluşu artık gerekmiyor
9. Müşteri satışına açılacak kesin kişi başı USD paket fiyatı, uçuş/otel/tarih seçenekleri ve iyzico üye işyeri anahtarları
10. Görsellerin üretim yayını öncesi kültürel doğruluk, ticari kullanım hakkı ve insan onay kaydı

Bu girdiler olmadan canlı işlem açılmaz; ekranlardan tahmin edilen API sözleşmesi uygulanmaz.

Girdilerin nasıl temin edileceği ve güvenli teslim yöntemi için `docs/go-live-inputs.md` dosyasına bakın.
