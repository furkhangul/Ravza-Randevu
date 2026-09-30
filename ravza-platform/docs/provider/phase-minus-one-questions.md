# RawdahBooking Faz -1 doğrulama paketi

Bu belge gönderime hazır bir taslaktır. Şirket adı, yetkili kişi ve sözleşmesel bilgiler eklenmeden gönderilmez.

## Mevcut durum — 4 Eylül 2026

- RawdahBooking hesabı ve salt-okunur takvim erişimi çalışıyor.
- Hesap yalnız bu entegrasyon için açılmış ayrı hesaptır; kesin rol/yetki kapsamı sağlayıcıdan beklenecek.
- API kullanım izni kabul edildi; OpenAPI 3.0.1 JSON/YAML teknik ekleri alındı ve hashleriyle incelendi.
- Satın alma alanları ve yanıtı açıklandı; çağrının idempotent olmadığı ve belirsiz hatada kör tekrar yapılmaması gerektiği doğrulandı.
- QR grup listesi, `groupKey`, `purchaseId`, `printGuid`, sayaçlar ve `Male=8` / `Female=9` eşlemesi doğrulandı.
- Yolcu/QR liste filtreleri, durum değerleri ve temel QR metadata alanları doğrulandı; gerçek yolcu verisinin arayüz erişimi tenant eşlemesine bağlandı.
- PDF export sözleşmesi ve `Printed` yan etkisi doğrulandı; özellik ayrı kilitle kapalı tutuluyor.
- Oturumsuz beş karakterli paylaşım bağlantısı sözleşmesi doğrulandı; güvenlik ömrü ve iptal modeli yayımlanmadığı için özellik ayrı kilitle kapalı.
- Resmi partner girişi `/api/Auth/login`, UTC `expiresAt` ve refresh-token bulunmadığı doğrulandı; token yalnız sunucu belleğinde kontrollü kullanılıyor.
- Güvenlik kuralları alındı: yalnız HTTPS, sunucu tarafı gizli saklama, token'ın log/analitik/URL/tarayıcı depolamasından uzak tutulması ve belgelenmemiş mekanizmaların varsayılmaması kod ve dokümana işlendi.
- Uygulama kimlik bilgilerini yalnız `https://rawdahbooking.com/` origin'ine gönderiyor; canlı proxy yanıtları önbelleğe kapalı.
- Sağlayıcı ayrı sandbox/test hesabı vermedi; test kontörü olup olmadığı henüz doğrulanmadı.
- Partner/white-label ve yeniden satış sözleşmesi bulunmuyor.
- Hedef model doğrudan Hac/Umre yolcusuna satış ve API üzerinden yer ayırmadır; tahsilatın yaklaşık `%99` USD olması beklenir. Bu hedef, yazılı B2C/yeniden satış izni yerine geçmez.
- Belgede bulunan yedi endpoint doğrulandı; aşağıdaki eksik ticari ve teknik kapsam henüz sağlayıcıya toplu olarak gönderilmedi.

## Ticari ve sözleşmesel

1. White-label kullanım, B2B yeniden satış, alt bayi ve koşullu B2C hakları nelerdir?
2. Güncel paket basamakları, para birimi, vergiler, ödeme komisyonu, minimum alım, geçerlilik, fiyat değişim bildirimi ve iade koşulları nelerdir?
3. Giriş sonucu, sağlayıcı kesintisi, başarısız randevu, QR gecikmesi, kontör telafisi ve destek eskalasyonu için yazılı SLA nedir?
4. Veri sorumlusu/veri işleyen rolleri, veri lokasyonu, alt işleyenler, saklama, silme ve Türkiye dışı aktarım mekanizması nedir?
5. PII ve güvenlik logları için kesin saklama/silme süreleri nelerdir?

## Teknik erişim

1. Güncel OpenAPI/Swagger veya Postman koleksiyonunu, sandbox ve production base URL'lerini paylaşır mısınız?
2. Ayrı test hesabı verilmedi. Yalnız sentetik yolcu için test kontörü veya production'dan ayrı güvenli bir test ortamı sağlayabilir misiniz?
3. Refresh token olmadığı doğrulandı. `expiresAt` her zaman JWT `exp` claim'iyle aynı mı; rate limit ve tam hata kataloğu nedir?
4. En az yetkili partner hesabının rol/izin kapsamı nedir; satın alma ve QR dışa aktarma için ayrı yetkiler tanımlanabilir mi?
5. Yedi yayınlanmış endpoint için request/response örnekleri, pagination, enum ve saat dilimi semantiği nedir?
6. Satın almada `Male`/`Female`, QR grup ve yolcu filtrelerinde `Male=8` / `Female=9` doğrulandı. Eski XML yorumundaki `1/2` değerleri kaldırılacak mı?
7. Bakiye, işlem sonucu/mutabakat, yolcu oluşturma, Excel import, iptal ve webhook endpoint'leri var mıdır?

## Satın alma ve QR

1. Satın alma idempotent değil. Timeout sonrası QR grupları/bakiye kontrolünün ötesinde kesin sonucu hangi benzersiz alanlarla mutabık hâle getiririz?
2. `Available 0`, `50+` ve slot saat aralığı alanlarının kesin semantiği nedir?
3. QR hazırlık politikası, önerilen polling aralığı ve imzalı webhook desteği nedir?
4. `GetPrintGroups` filtre kaynağıdır; yolcu yanıtındaki `ravzaReservationId` doğrulandı. Bu alan satın alma sonucuyla deterministik mutabakat için kullanılabilir mi?
5. Kısa paylaşım kodu beş karakter ve oturumsuzdur. Karakter kümesi/entropi, TTL, iptal, tek kullanımlılık, rate limit, erişim kaydı ve veri kapsamı nedir?
6. PDF yanıt türü, temel hata kodları ve `X-Marked-Count` doğrulandı. Güvenli saklama/silme süresi ile belirsiz sonuç mutabakatı nedir?

## Yolcu/Excel akışı

1. Güncel sürümlü `.xlsx` şablonu ve alan validasyonları nelerdir?
2. Tekli form ile toplu importta `VisaNumber` ve `Phone` zorunluluğu neden farklı görünüyor?
3. Kendi vizesiyle talep akışında kontör talep anında mı, atama anında mı düşer; atanmazsa iade edilir mi?
4. Erişilebilirlik desteği alanının API adı, tipi, amacı ve veri sınıfı nedir?

## Çıkış kanıtı

Yanıtlar tarih ve doküman sürümüyle arşivlenir. Faz -1 ancak sandbox'ta sentetik tek yolcu ile `login → müsaitlik → satın alma → QR → kısa link → PDF` akışı ve kontör mutabakatı kanıtlandığında kapanır.
