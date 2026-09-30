# iyzico ödeme kararı ve açılış kapıları

## Karar

Türkiye'deki ilk sürüm için varsayılan kart sağlayıcısı **iyzico Checkout Form** seçildi. Bu, “piyasadaki koşulsuz en iyi sağlayıcı” iddiası değil; hosted ödeme sayfası, USD/TRY desteği, sandbox, 3DS akışı, resmi imza doğrulama belgeleri ve kart verisini Ravza uygulamasından uzak tutması nedeniyle verilen teknik ürün kararıdır. İş sahibi tahsilatların yaklaşık `%99` oranında USD olacağını bildirdi; uygulama varsayılanı bu nedenle USD'dir. Ticari komisyon, USD settlement para birimi, bloke süresi, iade SLA'i ve sözleşme koşulları teklif alındığında yeniden karşılaştırılmalıdır.

Hedef kitlenin yaklaşık `%80` oranında Türk olduğu ve Türk müşterilerin yaklaşık `%99` oranında Türkiye'de ikamet ettiği bildirildi. Bu oranlar bireysel yerleşiklik kanıtı değildir. Tek bir global USD checkout açılmaz ve ödeme öncesinde müşterinin yerleşikliği ayrıca belirlenir. Türkiye'de yerleşik müşterinin USD ödemesi, Hazine ve Maliye Bakanlığının hizmet sözleşmesi istisnaları bakımından yazılı hukuk görüşü alınana kadar `PAYMENT_DOMESTIC_USD_LEGAL_APPROVED=false` kapısında tutulur. Yurt dışı yerleşik müşteri politikası ayrı uygulanır.

İş kararı gereği Türkiye müşterisinde TL karşılığı tahsilat veya otomatik para birimi fallback'i yoktur (`PAYMENT_DOMESTIC_USD_REQUIRED=true`). Varsayılan para birimi USD dışında yapılandırılırsa ödeme adaptörü hazır sayılmaz. Hukuk onayı olmadan USD zorunluluğu işlemi açmaz; tam tersine yerli checkout'u bloke eder.

Resmi teknik kaynaklar:

- Checkout Form: https://docs.iyzico.com/en/getting-started/preliminaries/api-reference-beta/payment-methods/checkoutform
- HMACSHA256 yetkilendirme: https://docs.iyzico.com/en/getting-started/preliminaries/authentication/hmacsha256-auth
- Webhook ve `X-IYZ-SIGNATURE-V3`: https://docs.iyzico.com/en/advanced/webhook
- Sandbox/canlı ayrımı: https://docs.iyzico.com/en/getting-started/preliminaries/live-vs-sandbox
- Hazine ve Maliye Bakanlığı dövizli sözleşmeler SSS: https://ms.hmb.gov.tr/uploads/2025/11/Sikca-Sorulan-Sorular-ba3feb0209aa5f1a.pdf
- Ticaret Bakanlığı mesafeli sözleşme rehberi: https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme

## Kodda hazır olanlar

- IYZWSv2 HMAC-SHA256 istek imzası
- Hosted Payment Page webhook imza doğrulaması
- yalnız resmi sandbox/canlı API alan adlarına izin veren istemci
- sandbox ve canlı için ayrı etkinleştirme kapıları
- ödeme denemesi, idempotency ve tekrar webhook tablosu
- USD varsayılanı ve `USD/TRY/EUR/GBP/NOK/CHF` para birimi doğrulaması
- para biriminden bağımsız `amount_minor` tutar alanı
- müşteri yerleşikliğine göre USD hukuk kapısı
- USD zorunluluğunda TRY fallback'i reddeden yapılandırma kontrolü
- kimlik doğrulamalı ve gizli değer döndürmeyen durum API'si

## Bilerek kapalı kalanlar

Checkout başlatma ve webhook işleme uçları aşağıdaki koşullar tamamlanmadan eklenmez/açılmaz; yarım bir ödeme uç noktası para ve kontörü yanlış eşleyebilir.

1. iyzico üye işyeri sandbox API anahtarı ve secret key
2. şirket unvanı, vergi/fatura modeli ve satışa çıkacak gerçek paket/fiyatlar
3. USD kabulü, USD settlement/mahsuplaşma hesabı, kur farkı ve yabancı kart komisyonunun üye işyeri teklifinde doğrulanması
4. Türkiye'de yerleşik tüketiciye USD fiyat/ödeme uygulanmasının hizmet istisnasına girdiğine dair yazılı hukuk görüşü
5. iade/iptal ve başarısız işlem politikası
6. kalıcı, herkese açık HTTPS callback/webhook adresi
7. sentetik ödeme → webhook → sorgulama → tekil kontör hareketi E2E testi
8. canlıya geçmeden webhook tekrarları, timeout sonrası sorgu ve günlük mutabakat testi

## Güvenlik kuralı

Kart numarası, son kullanma tarihi ve CVC hiçbir Ravza formuna, API'sine, loguna veya veritabanına alınmaz. Kontör yalnız imzası doğrulanmış webhook ile iyzico sorgu sonucunun aynı işlem kimliği, tutar ve para birimini göstermesinden sonra benzersiz ledger referansıyla üretilir.
