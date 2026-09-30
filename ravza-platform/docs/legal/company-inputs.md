# Hukuk metinlerini kesinleştirmek için şirket girdileri

## Doğrulanan şirket kimliği

Kaynak: şirketin GİB vergi levhası (iş sahibi tarafından 2026-09-06 tarihinde teslim edildi). Belge kopyası depoya konulmaz; erişim kontrollü şirket arşivinde tutulur.

| Alan | Değer | Env anahtarı |
| --- | --- | --- |
| Şirket türü | Limited Şirket | `LEGAL_ENTITY_TYPE` |
| Ticari unvan | — | `LEGAL_COMPANY_NAME` |
| Vergi dairesi | Siirt | `LEGAL_TAX_OFFICE` |
| Vergi kimlik no | — | `LEGAL_TAX_NUMBER` |
| İş yeri adresi | Batı Mah. Şeyh El Hazin Cad. No: 40/A, Merkez/Siirt | `LEGAL_ADDRESS` |
| Vergi türü | Kurumlar vergisi | — |
| İşe başlama | 01.01.1999 | — |
| Ana faaliyet kodu | 791101 — Seyahat acentesi faaliyetleri | — |
| Çalışma markası | Ravza Operasyon | `LEGAL_BRAND_NAME` |

Değerler `.env.local` dosyasına girildi; dosya Git kapsamı dışındadır.

### Vergi levhasının kanıtlamadıkları

Vergi levhası bir **mükellefiyet** belgesidir. `791101` ana faaliyet kodu şirketin seyahat acentesi faaliyeti için vergi kaydı olduğunu gösterir; **seyahat acentesi işletme belgesi yerine geçmez**. İşletme belgesi Kültür ve Turizm Bakanlığı tarafından düzenlenir ve ayrı bir belge numarası taşır. Bu nedenle `TRAVEL_AGENCY_AUTHORITY_VERIFIED=false` kalır.

## Hâlâ eksik olan girdiler

Aşağıdaki bilgiler şirket sahibinden gelmeden hukuk metinlerinde tahmin edilmez:

- MERSİS numarası
- genel iletişim e-postası
- KVKK başvuru e-postası ve varsa KEP adresi
- imzaya yetkili kişi/kişiler
- gerçek paketler, KDV durumu, fatura zamanı ve fiyatlar
- kullanılmamış/kısmen kullanılmış kontör iade kuralı
- sağlayıcı reddi, randevu iptali ve QR gecikmesi için ticari telafi kuralı

`lib/legal-config.ts` bu alanlar tamamlanana kadar `complete=false` döndürür ve hukuk sayfalarında eksik alanlar için yer tutucu gösterilir.

Değerler yerelde `.env.local` dosyasına, canlıda secret/konfigürasyon yönetimine girilir. Örnek anahtarlar `config/local-env.example` dosyasındadır.

## Hukuk onayında özellikle doğrulanacaklar

- acente ve Ravza'nın her veri akışındaki veri sorumlusu/veri işleyen rolü
- VERBİS yükümlülüğü veya istisnası
- saklama matrisindeki taslak süreler
- B2B sözleşmesinin sorumluluk tavanı, yetkili mahkeme ve fesih hükümleri
- tüketiciye satış açılacaksa mesafeli sözleşme ön bilgilendirme ve cayma/istisna akışı
- RawdahBooking'e düzenli yurt dışı aktarım için KVKK 9. madde mekanizması

Standart sözleşme kullanılacaksa Kurulun yayımladığı uygun tip değiştirilmeden imzalanmalı; imzaların tamamlanmasından itibaren beş iş günü içinde Kuruma bildirim süreci planlanmalıdır.
