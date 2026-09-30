# Ravza Randevu

Ravza-i Mutahhara ziyareti için randevu, QR ve operasyon platformu. Ziyaretçi talebini
sitede oluşturur; fiyat ve ödeme **WhatsApp, telefon veya e-posta** üzerinden konuşulur ve
elden ya da havale ile tamamlanır. **Tahsilat site üzerinden yapılmaz.** Ravza randevu
süreci RawdahBooking API'si üzerinden salt-okunur olarak izlenir.


## Çalıştırma

```sh
npm install
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi
npm run db:migrate  # SQLite göçlerini uygular (data/ravza.db)
npm start        # derlenmiş uygulamayı çalıştırır (dist/standalone/server.js)
npm test         # alan mantığı testleri
npm run lint     # oxlint
```

Gizli değerler `.env.local` içindedir ve Git kapsamı dışındadır; örnek anahtar listesi
`config/local-env.example` dosyasındadır.

## Yüzeyler

**Ziyaretçi tarafı**
- `/` — vaat, üç adımlı anlatım, öne çıkan paketler, havuz durumu, rehber, onaylı yorumlar, SSS
- `/paketler` — kişi sayısına göre randevu paketleri (1 / 3 / 5 / 10 / 25 / özel)
- `/siparis` — altı adımlı sipariş asistanı; talep kaydedilir, sonra WhatsApp'a yönlendirir
- `/talep`, `/talep/{kod}` — talep kodu + telefon son dört hanesiyle durum takibi
- `/rehber` — ziyaret rehberi; `/sss`, `/blog`, `/iletisim` ve KVKK/sözleşme metinleri
- `/hesabim` — Seyahatim paneli
- `/geri-bildirim/{jeton}` — teslim edilen talebe gönderilen tek kullanımlık değerlendirme daveti

**Operasyon paneli** (`/panel/*`) — yedi ekran
| Ekran | İçerik |
| --- | --- |
| `/panel` | Bugün: talep sayaçları, sıradaki iş, havuz durumu |
| `/panel/talepler` | Tüm talepler tek boru hattında; durum ilerletme ve WhatsApp'a dönüş |
| `/panel/randevular` | Takvim ve kayıt · QR merkezi · vize ile talep |
| `/panel/yolcular` | Excel yükleme ve satır bazlı doğrulama |
| `/panel/kontor` | Hareket defteri · üyelik ve haklar |
| `/panel/paketler` | Randevu paketleri (· Umre kataloğu, kapı açıksa) |
| `/panel/geri-bildirim` | Moderasyon kuyruğu |
| `/panel/ayarlar` | Firma · bildirim kanalları · destek · yasal durum |
| `/panel/yonetim` | Yalnız süper yönetici: acente incelemesi ve yönetici özeti |

Eski `/dashboard/*`, `/admin`, `/super-admin`, `/book`, `/packages`, `/landing`, `/customer`
adresleri kalıcı olarak (308) yeni yüzeylere yönlendirilir.

Arayüz Türkçe, İngilizce ve Arapça (RTL dahil) çalışır; para birimi göstergesi USD, TRY,
EUR, SAR ve KWD arasında değiştirilebilir ve USD dışındakiler **yaklaşık** gösterimdir.

## Talep akışı

```
Ziyaretçi → paket seçer → asistan 6 soru sorar → talep kaydedilir (TALEP-YYYYAAGG-XXXX)
  → wa.me bağlantısıyla WhatsApp'a yönlenir → operasyon görüşür, fiyat/ödeme netleşir
  → panelden durum ilerletilir → randevu → QR → teslim → geri bildirim daveti
```

Durumlar: `new → contacted → quoted → confirmed → scheduled → qr_ready → delivered → closed`
(yan dallar: `cancelled`, `expired`). Geçişler `lib/quote-request.ts` içindeki durum
makinesiyle sınırlandırılır ve her geçiş denetim kaydına yazılır.

## Aktivasyon kapıları

Aşağıdaki yetenekler kod tarafında hazırdır ve ilgili belge/sözleşme tamamlandığında ortam
değişkeniyle açılır. Belge doğrulanmadan açılmazlar:

| Kapı | Açan koşul |
| --- | --- |
| `TRAVEL_AGENCY_AUTHORITY_VERIFIED` | Kültür ve Turizm Bakanlığı seyahat acentesi işletme belgesi |
| `DIYANET_UMRAH_AUTHORITY_VERIFIED` | İlgili dönem Diyanet Umre organizasyonu yetkisi |
| `PACKAGE_TOUR_CONTRACT_APPROVED` | Hukuk onaylı broşür, ön bilgilendirme ve paket tur sözleşmesi |
| `PACKAGE_TOUR_INSURANCE_VERIFIED` | Zorunlu sigorta/güvence ve acil destek düzeni |
| `RAWDAH_WRITE_ENABLED` | RawdahBooking ticari sözleşmesi ve doğrulanmış E2E |
| `WHATSAPP_CLOUD_API_ENABLED` | Doğrulanmış işletme hesabı ve onaylı şablon metinleri |

Ödeme kapıları (`PAYMENT_*`) artık kullanılmaz: müşteri yüzeyinde ödeme adımı yoktur.
`packages/payment-iyzico/` ve ilgili tablolar geçmiş kayıt için durur, hiçbir sayfadan
import edilmez.

## Veri ve içerik notları

- Paket fiyatları boş başlar; girilmeden kart "Fiyat WhatsApp'tan teyit edilir" gösterir.
  Uydurma fiyat, sahte yorum ve uydurma istatistik kullanılmaz.
- Geri bildirimler yalnız teslim edilen taleplerden, tek kullanımlık jetonla toplanır ve
  moderasyondan geçmeden yayımlanmaz. `Review` yapılandırılmış verisi yalnız yayımlanmış
  gerçek yorumlardan üretilir.
- `PII_HASH_SALT` girilmeden IP/tarayıcı özeti üretilmez ve hacim sınırı devre dışı kalır.
  Ham IP hiçbir koşulda saklanmaz.
- Görsel varlıkların kaynağı, hash'i ve hak inceleme durumu `assets/manifest.json` içinde izlenir.
- Güncel yüzey ve bekleyen dış girdi listesi `docs/implementation-status.md` dosyasındadır.
- Bu dönüşümü üreten ayrıntılı iş tanımı `docs/AI-PROMPT.md` dosyasındadır.
