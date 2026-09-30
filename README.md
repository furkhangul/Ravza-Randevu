# Ravza Randevu

Ravza-i Mutahhara ziyareti için **randevu, QR ve operasyon platformu**.

Ziyaretçi talebini sitede birkaç adımda oluşturur; fiyat ve ödeme WhatsApp, telefon veya
e-posta üzerinden netleşir. Operasyon ekibi aynı talebi panelden randevuya, randevuyu QR'a,
QR'ı teslime kadar tek bir boru hattında takip eder. Site üzerinden tahsilat yapılmaz.

## Öne çıkanlar

- **Sipariş asistanı** — altı adımda talep toplar, talep kodu üretir ve ziyaretçiyi WhatsApp'a yönlendirir
- **Toplu paketler** — kişi sayısına göre 1 / 3 / 5 / 10 / 25 ve özel paketler
- **Talep takibi** — talep kodu ve telefonun son dört hanesiyle durum sorgulama
- **Operasyon paneli** — talepler, randevu takvimi, QR merkezi, yolcu listesi (Excel), kontör defteri
- **Acente portalı** — acente başvurusu, inceleme ve acenteye özel akış
- **Bildirimler** — otomatik e-posta ve SMS, zamanlanmış gönderim
- **Geri bildirim** — yalnız teslim edilen taleplerden, tek kullanımlık davetle ve moderasyonla
- **Üç dil** — Türkçe, İngilizce ve Arapça (RTL dahil); USD, TRY, EUR, SAR, KWD gösterimi
- **RawdahBooking entegrasyonu** — müsaitlik ve randevu süreci sağlayıcı API'si üzerinden izlenir

## Talep akışı

```
Ziyaretçi → paket seçer → asistan soruları sorar → talep kaydedilir (TALEP-YYYYAAGG-XXXX)
  → WhatsApp'a yönlenir → fiyat ve ödeme netleşir
  → panelden durum ilerletilir → randevu → QR → teslim → geri bildirim
```

Durumlar: `new → contacted → quoted → confirmed → scheduled → qr_ready → delivered → closed`
(yan dallar: `cancelled`, `expired`). Her geçiş durum makinesiyle sınırlandırılır ve denetim
kaydına yazılır.

## Teknoloji

| Katman | Kullanılan |
| --- | --- |
| Arayüz | React 19 (RSC), vinext, TypeScript, Tailwind CSS v4, shadcn / Base UI |
| Veri | Drizzle ORM, SQLite (better-sqlite3) / Cloudflare D1 |
| Yayın | Node.js standalone (nginx + systemd, VPS) veya Cloudflare Workers |
| Kalite | `node --test`, oxlint, oxfmt |

## Depo yapısı

| Yol | İçerik |
| --- | --- |
| [`ravza-platform/`](ravza-platform) | Uygulamanın kaynak kodu (ayrıntılı belge: [README](ravza-platform/README.md)) |
| `ravza-platform/app` | Sayfalar ve API uçları |
| `ravza-platform/components`, `lib`, `db` | Arayüz bileşenleri, alan mantığı, şema |
| `ravza-platform/packages` | Sağlayıcı (Rawdah), ödeme, tasarım belirteçleri ve içerik paketleri |
| `ravza-platform/deploy`, `docs` | Sunucu kurulum dosyaları ve proje belgeleri |
| `api-1.json`, `api-1.yaml` | Rawdah Booking API'sinin OpenAPI tanımı |
| `assets-staging/` | Yayına alınmayı bekleyen görseller |
| `yedekler/` | Büyük değişikliklerden önce alınan dosya yedekleri |
| `ravza-platform-site.tar.gz` | Derlenmiş site arşivi |

## Kurulum

Node.js **22.13 veya üzeri** gerekir.

```sh
cd ravza-platform
npm install
cp .env.example .env.local   # değerleri doldurun
npm run db:migrate           # SQLite göçlerini uygular
npm run dev                  # geliştirme sunucusu
```

Diğer komutlar:

```sh
npm run build   # üretim derlemesi
npm start       # derlenmiş uygulamayı çalıştırır
npm test        # alan mantığı testleri
npm run lint    # oxlint
```

Gizli değerler (`.env.local`, sunucudaki `ravza.env`) depoya konmaz; yalnız örnek dosyalar
(`.env.example`, `deploy/ravza.env.example`) sürüm kontrolündedir.

## Yayın

- **VPS:** [`ravza-platform/docs/NATRO-VPS-KURULUM.md`](ravza-platform/docs/NATRO-VPS-KURULUM.md)
- **Cloudflare:** [`ravza-platform/docs/cloudflare-yayin.md`](ravza-platform/docs/cloudflare-yayin.md)
- **Yayın öncesi kontrol listesi:** [`ravza-platform/docs/go-live-checklist.md`](ravza-platform/docs/go-live-checklist.md)

## Geliştirici

**Furkan** — [@furkhangul](https://github.com/furkhangul)

## Lisans

[MIT](LICENSE) © 2026 Furkan
