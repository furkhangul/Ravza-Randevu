# Canlıya çıkış kontrol listesi

Son güncelleme: 2026-09-07

Yazılım tarafında bekleyen iş yoktur. Aşağıdaki maddelerin tamamı **dışarıdan gelecek belge, sözleşme veya bilgi** bekler. Her satır, tamamlandığında hangi ortam değişkenini açtığını gösterir.

## 1. Umre paketi satışı — dört belge kapısı

Dördü birden doğrulanmadan `UMRAH_PACKAGE_ENABLED=true` yapılamaz.

| Kapı | Gereken belge | Durum |
| --- | --- | --- |
| `TRAVEL_AGENCY_AUTHORITY_VERIFIED` | Kültür ve Turizm Bakanlığı seyahat acentesi işletme belgesi | Bekliyor |
| `DIYANET_UMRAH_AUTHORITY_VERIFIED` | İlgili dönem Diyanet Umre organizasyonu yetkisi | Bekliyor |
| `PACKAGE_TOUR_CONTRACT_APPROVED` | Hukuk onaylı broşür, ön bilgilendirme formu ve paket tur sözleşmesi | Bekliyor |
| `PACKAGE_TOUR_INSURANCE_VERIFIED` | Zorunlu sigorta/güvence ve acil destek düzeni | Bekliyor |

### Öncelikli ilk adım

Şirket **1999'dan beri `791101 – Seyahat acentesi faaliyetleri`** koduyla kayıtlı. Bu, geçmişte alınmış bir işletme belgesi bulunma ihtimalinin yüksek olduğu anlamına gelir.

Cevaplanacak soru: **Şirket adına düzenlenmiş geçerli bir işletme belgesi var mı? Varsa grubu (A/B/C), belge numarası ve geçerlilik durumu nedir?**

- **Belge varsa:** süreç yeni başvuru değil, doğrulama akışına döner. `docs/legal/tursab-application-checklist.md` listesinin 1–7. adımları düşer.
- **Belge yoksa/iptalse:** aynı dosyadaki başvuru listesi baştan uygulanır.

Belge geldiğinde ayrıca `LEGAL_AGENCY_TITLE` ve `TRAVEL_AGENCY_LICENCE_NUMBER` doldurulur; footer'daki belge numarası gösterimi (Seyahat Acentaları Yönetmeliği m.17/3 gereği zorunlu) otomatik görünür hale gelir.

## 2. Ödeme

| Kapı | Gereken | Durum |
| --- | --- | --- |
| `PAYMENT_CHECKOUT_ENABLED` | iyzico üye işyeri sözleşmesi + `IYZICO_API_KEY` / `IYZICO_SECRET_KEY` | Bekliyor |
| `PAYMENT_DOMESTIC_USD_LEGAL_APPROVED` | Türkiye'de yerleşik müşteriden USD tahsilat için yazılı hukuk onayı | Bekliyor |
| `PAYMENT_LIVE_ENABLED` | Sandbox doğrulaması ve mutabakat akışının teyidi | Bekliyor |

iyzico HMAC imzalama (IYZWSv2) ve webhook doğrulaması kodda hazır ve testlidir; yalnız anahtar ve sözleşme eksiktir.

## 3. RawdahBooking sağlayıcısı

| Kapı | Gereken | Durum |
| --- | --- | --- |
| `RAWDAH_WRITE_ENABLED` | Ticari sözleşme, yazılı kullanım izni, sandbox hesabı ve tek yolcu E2E sonucu | Bekliyor |
| `CUSTOMER_LIVE_AVAILABILITY_ENABLED` | Canlı takvimin müşteriye açılması kararı | Bekliyor |
| — | Yolcu verisi yurt dışına aktarılacağı için **KVKK m.9 aktarım mekanizması** | Bekliyor |

Ayrıca sağlayıcıdan alınması gerekenler: sürümlü OpenAPI/Postman koleksiyonu, enum tablosu, rate limit, idempotency, hata ve QR zamanlama politikaları.

`RAWDAH_PDF_EXPORT_ENABLED` ve `RAWDAH_SHARE_LINK_ENABLED` ayrı kapılardır: PDF export sağlayıcıda `Printed` durumu yarattığı, paylaşım linki ise oturumsuz olduğu ve TTL/iptal politikası yayımlanmadığı için kapalıdır.

## 4. Şirket bilgileri

Doldurulmuş: ticari unvan, vergi dairesi, VKN, adres.

Eksik olanlar — `.env.local` içine girilecek:

- `LEGAL_MERSIS_NUMBER`
- `LEGAL_CONTACT_EMAIL`
- `KVKK_CONTACT_EMAIL`
- `LEGAL_KEP_ADDRESS`
- `LEGAL_CONTACT_PHONE`
- `LEGAL_WHATSAPP_NUMBER`

Bunlar geldiğinde: hukuk metinlerindeki yer tutucular kapanır, "çalışma metni" uyarısı yeşil duruma döner ve **yüzen WhatsApp/telefon widget'ı otomatik görünür hale gelir**. Bu, listedeki en hızlı tamamlanabilecek madde.

Ayrıca hukuk onayı gerekenler: acente/Ravza veri sorumlusu–işleyen rolleri, VERBİS yükümlülüğü, saklama matrisi süreleri, B2B sözleşme sorumluluk tavanı ve yetkili mahkeme.

## 5. Ürün içeriği

Katalogdaki üç paket **örnek veridir**; kartlarda "tanıtım fiyatı" notu görünür.

Gereken: gerçek paket adları, kalkış/dönüş tarihleri, kişi başı USD fiyat (`UMRAH_PACKAGE_PRICE_USD`), otel bilgisi, dahil ve hariç hizmet listesi.

Pazar araştırmasına göre eklenmesi değerli ama şu an bulunmayan alanlar: oda tipi bazlı fiyatlama (2/3/4 kişilik — bu pazarın asıl fiyat ekseni), otel yıldızı ve Harem'e mesafe, gün gün program, uçuş detayları.

## 6. Teknik ve yayın

- **Sürüm kontrolü:** görseller ve bazı bileşenler uzun süre Git dışında kaldı. Depo temiz tutulmalı, yayın öncesi her şey commit edilmiş olmalı.
- **Yayın altyapısı:** alan adı, `APP_URL`, Cloudflare Workers/D1 üretim bağlantısı ve migration akışı.
- **Yönetici erişimi:** `APP_ADMIN_EMAILS` / `APP_SUPER_ADMIN_EMAILS` üretim değerleri ve yönetici MFA politikası.
- **Görsel hakları:** varlıklar `assets/manifest.json` içinde izlenir. Kullanımdaki üç görselin tamamı artık kayıtlı master'lardan türetilmiştir; üretim yayını öncesi ticari kullanım hakkı ve kültürel doğruluk için insan onayı alınmalıdır (`humanApproval` alanları).

## Tamamlananlar

- Müşteri yolculuğu: katalog, filtreleme, dört adımlı rezervasyon, müşteri paneli
- Operasyon paneli: takvim, siparişler, kontör, QR merkezi, yolcular, vize, acente yönetimi
- Üç dil (TR/EN/AR) ve RTL; USD/TRY/EUR/SAR/KWD gösterim para birimi
- Marka kimliği: Ravza Randevu logosu, favicon, sosyal paylaşım görseli
- Ravza izin süreci gerçekçi biçimde anlatılıyor (7–14 günlük izin penceresi, garanti verilmiyor)
- Üretim derlemesi, lint, tip kontrolü ve alan testleri temiz
