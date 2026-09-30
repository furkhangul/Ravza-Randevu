# Umre paket turu canlı satış kapısı

## Kaydedilen ürün kararı

Müşteriye yalnız Ravza randevusu değil, **şirketimizin kendi düzenlediği Umre paketi** satılacaktır. Başka bir yetkili acentenin hazır paketini aracılık/yeniden satış modeliyle sunma kararı alınmamıştır. Ravza randevusu ve QR operasyonu kendi paketimizin bileşenidir. Bu modelde paketin düzenleyicisi olarak uçuş, konaklama, transfer, vize, rehberlik, değişiklik, iade, destek ve diğer hizmet yükümlülükleri şirketimize aittir. Kesin kapsam sürümlü ürün kartına yazılır; henüz belirlenmeyen hizmetler müşteriye vaat edilmez.

## Resmî çerçeve

Ticaret Bakanlığına göre ulaştırma, konaklama ve diğer turizm hizmetlerinden en az ikisinin birlikte, her şey dâhil fiyatla ve 24 saatten uzun/gecelemeli sunulduğu ürün paket turdur. Yurt dışı paket tur fiyatı dövizle belirlenebilir; kullanılacak kur sözleşme kurulurken belirtilmelidir.

Paket tur satışından önce broşür verilmeli; yazılı veya mesafeli kurulan sözleşmenin bir kopyası kağıt ya da kalıcı veri saklayıcısıyla müşteriye teslim edilmelidir. Tur iptali ve esaslı değişikliklerde tüketicinin seçim ve iade hakları, fiyat değişikliğinin sınırlı koşulları, düzenleyici/aracının sorumluluğu ve zorunlu sigorta/güvence hükümleri uygulanır.

Seyahat Acentaları Yönetmeliği; tur/paket tur oluşturma, pazarlama ve satışını, ulaşım-konaklama rezervasyonunu ve dinî seyahat organizasyonunu seyahat acentelerine özgü hizmetler arasında sayar.

Diyanet'in Hac ve Umre hizmetleri düzenlemesi, Umre seyahatlerini Başkanlığın gözetim ve denetiminde ve uluslararası seyahat hizmeti verme yetkili acenteler üzerinden yürütür. Diyanet ayrıca dönemsel olarak sözleşme imzaladığı/yetkilendirdiği acenteleri yayımlar. RawdahBooking API izni bu yetkilerin yerine geçmez.

## Kod seviyesindeki kapılar

Canlı Umre paket satışı ancak aşağıdaki dört belge kapısı da doğrulanırsa etkinleşebilir:

1. `TRAVEL_AGENCY_AUTHORITY_VERIFIED` — kendi şirketinin geçerli seyahat acentesi işletme belgesi,
2. `DIYANET_UMRAH_AUTHORITY_VERIFIED` — ilgili dönem Umre organizasyonu yetkisi/sözleşmesi,
3. `PACKAGE_TOUR_CONTRACT_APPROVED` — hukuk onaylı broşür, ön bilgilendirme ve paket tur sözleşmesi,
4. `PACKAGE_TOUR_INSURANCE_VERIFIED` — zorunlu sigorta/güvence ve acil destek düzeni.

Bu kapılar tamamlanmadan `UMRAH_PACKAGE_ENABLED=false` kalır. Ödeme ve RawdahBooking yazma kapıları ayrıca bağımsızdır; bir kapının açılması diğerini otomatik açmaz.

Paket modeli `UMRAH_PACKAGE_MODEL=own` olarak kaydedilmiştir. Bu değer yalnız iş modelini belirtir; belge kapılarından hiçbirini doğrulanmış saymaz.

## Güncel belge durumu

2026-09-06 tarihinde şirketin GİB vergi levhası teslim edildi. Buna göre faal tüzel kişilik mevcuttur; işe başlama 01.01.1999, ana faaliyet kodu `791101 — Seyahat acentesi faaliyetleri`. Ayrıntı için `docs/decisions/0006-existing-legal-entity.md`.

Bu belge **işletme belgesi değildir**. Vergi levhası mükellefiyeti gösterir; seyahat acentesi işletme belgesi Kültür ve Turizm Bakanlığı tarafından ayrı olarak düzenlenir ve kendi belge numarasını taşır. Şirket adına geçerli işletme belgesi bulunduğu doğrulanmadığı için `TRAVEL_AGENCY_AUTHORITY_VERIFIED=false` kalır ve kendi Umre paketimizin canlı satışı açılamaz.

Şirket kuruluşu artık beklenmemektedir; süreç, mevcut şirketin belge durumunun tespitiyle başlar. Şirket 1999'dan beri seyahat acentesi faaliyet koduyla kayıtlı olduğundan, geçmişte alınmış bir belge bulunması muhtemeldir. Belge mevcut ve geçerliyse doğrulama, değilse yeni başvuru akışı uygulanır. Ayrıntılı çalışma listesi `docs/legal/tursab-application-checklist.md` dosyasındadır.

## Ürün sahibinden sırayla alınacak bilgiler

1. Şirket adına düzenlenmiş geçerli bir seyahat acentesi işletme belgesi var mı? Varsa grubu, belge numarası ve geçerlilik tarihi nedir?
2. Belge yoksa, acenta unvanı için öncelik sırasıyla hangi alternatifler istenecek?
3. Nitelikli personel şartı hangi diploma/belge sahibi kişiyle karşılanacak?
4. İlgili dönem için Diyanet Umre organizasyonu yetkisi/sözleşmesi var mı?
4. İlgili Umre dönemi için Diyanet yetkisi/sözleşmesi nasıl alınacak?
5. Pakete kesin olarak dâhil hizmetler ve hariç tutulanlar nelerdir?
6. Çıkış şehirleri, tarih, gece sayısı, oteller/oda tipi ve uçuş planı nedir?
7. Vize, transfer, rehberlik, yemek, sağlık/acil destek ve sigorta sorumluları kimdir?
8. Kişi başı USD fiyat, çocuk/tek kişilik oda farkı, vergi/harçlar ve fiyat geçerlilik süresi nedir?
9. İptal, isim değişikliği, vize reddi, uçuş/otel değişikliği, Ravza randevusunun alınamaması ve mücbir sebep politikası nedir?

Bu belge hukuk görüşü değildir; sistemin canlı satış için kabul edeceği kanıt kapılarını tanımlar.

## Resmî kaynaklar

- Ticaret Bakanlığı, Paket Tur Sözleşmeleri: https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/paket-tur-sozlesmeleri-hakkinda-bilgilendirme
- Seyahat Acentaları Yönetmeliği: https://resmigazete.gov.tr/eskiler/2007/10/20071005-7.htm
- Diyanet Hac ve Umre Hizmetleri Genel Müdürlüğü: https://hacumre.diyanet.gov.tr/Pages/Default.aspx
- Kültür ve Turizm Bakanlığı, Seyahat Acentası Unvan Talebi: https://yigm.ktb.gov.tr/TR-9625/1-seyahat-acentasi-isletme-belgesi-talebine-esas-olacak-unvan-talebi.html
- Kültür ve Turizm Bakanlığı, İlk İşletme Belgesi Başvurusu: https://yigm.ktb.gov.tr/TR-138832/seyahat-acentasi-ilk-belge-basvurusu.html
