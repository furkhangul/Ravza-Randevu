# RAVZA PLATFORMU — v5 YENİDEN TASARIM MASTER PROMPTU
### (Online ödemeyi kaldır → WhatsApp sipariş asistanı + toplu paketler + dini temalı arayüz + sade panel)

> **Nasıl kullanılır:** Bu dosyanın tamamını tek mesajda AI'a ver. AI projeyi `ravza-platform/` kökünde açık kabul eder.
> Faz faz çalışır, her fazın sonunda `npm run lint && npm test && npm run build` çalıştırır ve raporlar.
> Sorularını Faz 0'da topluca sorar; cevap gelmezse **Bölüm 17'deki varsayımları** kullanıp devam eder ve varsayımları rapora yazar.

---

## 0. ROLÜN VE TEK CÜMLELİK GÖREV

Sen kıdemli bir ürün mühendisisin: React 19 + RSC (vinext) + TypeScript + Tailwind v4 + shadcn/base-ui + Drizzle/SQLite (Cloudflare Workers) yığınında hem ürün tasarımı hem üretim kalitesinde kod yazıyorsun. Aynı zamanda İslami hassasiyetleri bilen bir arayüz tasarımcısısın.

**Görev:** Mevcut Ravza randevu platformundan **online tahsilat akışını müşteri yüzeyinden kaldır**; yerine **WhatsApp üzerinden yürüyen, adım adım soru soran bir sipariş asistanı** koy; satışı **kişi sayısına göre toplu paketlere** (1 / 3 / 5 / 10 / 25 / özel) dönüştür; tüm siteyi **dini temalı, sakin, çok net ve çok özenli** bir tasarım sistemine taşı; **admin panelini 13 ekrandan ~7 ekrana indir**; kullanıcının **kalan kontörü / kalan randevu hakkı** her yerde görünür olsun; **geri bildirim (değerlendirme) modülü** ekle.

**Referans his:** `https://rawdahbooking.com/` — tek amaçlı, kısa yoldan sipariş, gereksiz hiçbir şey yok. Oradan **fikir** al; **metin, görsel, logo veya birebir tasarım kopyalama.** Marka bizim.

---

## 1. PROJE BAĞLAMI (mevcut durum — doğrulanmış)

| Konu | Durum |
|---|---|
| Kök dizin | `ravza-platform/` |
| Çalıştırma | `npm run dev` (vinext, port 3001), `npm run build`, `npm start` (wrangler), `npm test` (node:test), `npm run lint` (oxlint), `npm run format` (oxfmt) |
| Yığın | React 19.2, vinext 1.0-beta, Tailwind v4 (`app/globals.css`), shadcn + @base-ui/react, drizzle-orm + SQLite/D1, Cloudflare Workers |
| İşleten tüzel kişilik | Bu depoda tutulmaz |
| Sağlayıcı | RawdahBooking API — `packages/provider-rawdah/src/index.ts`. **Salt-okunur.** `RAWDAH_WRITE_ENABLED=false`, `RAWDAH_PDF_EXPORT_ENABLED=false`, `RAWDAH_SHARE_LINK_ENABLED=false` |
| Ödeme | `packages/payment-iyzico/` + `app/api/payment/status` + `db/schema.ts` içinde `paymentAttempts`, `paymentWebhookEvents`. Kapılar: `PAYMENT_CHECKOUT_ENABLED=false`, `PAYMENT_LIVE_ENABLED=false` |
| Müşteri akışı | `components/customer-purchase-flow.tsx` (1164 satır, 4 adım: Paket → Yolcular → Ravza tercihi → **Ödeme**) |
| Panel | `app/dashboard/{overview,calendar,new-booking,orders,ledger,qr-center,passengers,requests,packages,membership,profile,support}` + `app/admin` + `app/super-admin` |
| İletişim widget'ı | `components/floating-contact.tsx` — `LEGAL_CONTACT_PHONE`, `LEGAL_WHATSAPP_NUMBER` boşsa hiçbir şey göstermez |
| Diller | TR / EN / AR (RTL dahil) — `components/public-preferences.tsx` |
| Tasarım tokenları | `app/globals.css` `:root` + `.dark`; yeşil `#0a2e1f`, altın `#c9a86a`, krem `#f8f5f0`, koyu `#071c14` |
| Durum belgesi | `docs/implementation-status.md` — **her fazın sonunda güncellenecek** |

**Neden değişiyor:** Sağlayıcı/iş ortağı, tahsilatın site üzerinden yapılamayacağını, paranın **elden veya iletişim kanalıyla (WhatsApp / e-posta / telefon)** konuşularak alınacağını bildirdi. Site artık bir **tahsilat sitesi değil, bir talep–teklif–teslim sitesi**.

---

## 2. DEĞİŞMEZ KURALLAR (bunları ihlal eden çıktı reddedilir)

1. **Hiçbir yerde gerçek kart/tahsilat akışı açma.** iyzico paketi ve `paymentAttempts` tabloları **silinmez** (geçmiş kayıt ve ileride açılma ihtimali için) ama **müşteri yüzeyinden tamamen çıkar**. Kod `packages/payment-iyzico/` altında kalır, hiçbir sayfadan import edilmez. `PAYMENT_CHECKOUT_ENABLED` / `PAYMENT_LIVE_ENABLED` false kalır ve UI bu bayraklara artık hiç bakmaz — ödeme adımı **yok**, "yakında" bile yazmaz.
2. **Sahte veri üretme.** Yorum, puan, "1.200 mutlu müşteri", "%98 memnuniyet" gibi uydurma sosyal kanıt yasak. Demo veri kullanılacaksa ekranda `Örnek veri` rozetiyle ve yalnız `NODE_ENV !== 'production'` koşuluyla gösterilir.
3. **Fiyat uydurma.** Paket fiyatları veritabanı + `.env` kaynaklıdır. Kesinleşmemiş fiyat için kartta `Fiyat WhatsApp'tan teyit edilir` yazar; rastgele rakam yazılmaz.
4. **Aşırı vaat yasak.** "Randevu garantisi", "kesin giriş", "devlet onaylı", "resmî acente" gibi ifadeler kullanılmaz. Doğru dil: *"Havuzda yer bulunduğunda randevunuz oluşturulur; uygunluk Harameyn yönetimine bağlıdır."*
5. **Sağlayıcıya yazma kapalı kalır.** RawdahBooking'e satın alma / PDF / paylaşım linki isteği gönderen yeni kod **eklenmez**. Canlı müsaitlik salt-okunur kalır.
6. **KVKK.** WhatsApp'a yönlendirme kişisel verinin üçüncü tarafa aktarılmasıdır. Asistanın son adımında **ayrı, işaretsiz gelen** onay kutusu ve `/kvkk` linki zorunlu. Onay kaydı (metin sürümü + zaman damgası) veritabanına yazılır.
7. **Telefon/WhatsApp numarası koda gömülmez.** Yalnız `LEGAL_WHATSAPP_NUMBER`, `LEGAL_CONTACT_PHONE`, `LEGAL_CONTACT_EMAIL`. Boşsa ilgili buton görünmez (mevcut davranış korunur).
8. **Kişisel veri taşıyan her API yanıtı** `Cache-Control: private, no-store` ile servis edilir; log'a yolcu adı/pasaport yazılmaz.
9. **Bağımlılık ekleme yok.** Takvim, grafik, ikon, carousel, drawer için mevcut `components/ui/*` kullanılır. Zorunlu bir istisna çıkarsa gerekçesini yaz ve **önce sor**.
10. **Mevcut kod dilini koru.** Kod yorumları Türkçe ve seyrek; `oxfmt` biçimi; dosya adları kebab-case; `@/` alias; sunucu bileşeni varsayılan, `'use client'` yalnız gerektiğinde.

---

## 3. YENİ SATIŞ MODELİ (zihin haritası)

```
Ziyaretçi → Paket seçer (kişi sayısı) → Sipariş Asistanı 6 soru sorar
   → Talep kaydedilir (TALEP-20260920-4K7Q) → DB: quote_requests
   → WhatsApp'a hazır mesajla yönlenir (wa.me deep link)
   → Operasyon WhatsApp'tan konuşur; fiyat/ödeme ELDEN veya havale ile halledilir
   → Operasyon panelden talebi "Onaylandı"ya taşır, kontör düşer
   → Randevu oluşur → QR hazır → müşteriye WhatsApp/e-posta ile iletilir
   → Müşteri "Seyahatim" panelinden durumu ve kalan hakkını görür
   → Teslimden sonra geri bildirim daveti gider
```

**Talep durum boru hattı (tek kaynak, `quote_requests.status`):**
`new` → `contacted` → `quoted` → `confirmed` → `scheduled` → `qr_ready` → `delivered` → `closed`
Yan dallar: `cancelled`, `expired` (14 gün dokunulmazsa otomatik).

Her durum geçişi `auditLogs`'a yazılır (kim, ne zaman, eski → yeni).

---

## 4. PAKET MİMARİSİ — "Toplu Ravza Gönderim Paketleri"

### 4.1 Katmanlar
Kişi sayısına göre 6 seviye. `umrahPackages` tablosunu genişletmek yerine **yeni tablo** `appointment_packages` (Bölüm 11) kullan; Umre paketi ayrı üründür, karıştırma.

| Kod | Ad (TR) | Kişi | Konum |
|---|---|---|---|
| `solo` | Tek Kişilik Ziyaret | 1 | Giriş seviyesi |
| `family` | Aile Paketi | 3 | — |
| `group` | Grup Paketi | 5 | **"En çok tercih edilen"** rozeti |
| `kafile` | Kafile Paketi | 10 | — |
| `agency` | Acente Paketi | 25 | B2B |
| `custom` | Özel / Kurumsal | 25+ | Fiyat WhatsApp'tan |

### 4.2 Her paket kartında zorunlu alanlar
- Kişi sayısı (büyük, tek bakışta)
- **Kişi başı** fiyat + **toplam** (ikisi birden; kişi başı büyük, toplam küçük satırda)
- Kademeli avantaj rozeti: `10 kişide kişi başı %X avantaj` (hesaplanan; uydurma değil)
- Kapsam listesi (net, 4–6 madde): havuzdan randevu ayırma, kadın/erkek ayrı saat tercihi, QR üretimi, PDF liste, WhatsApp'tan teslim, uygun olmazsa alternatif saat arama
- **Kapsam dışı** listesi (2–3 madde): uçak/otel/vize, Harameyn'in giriş kararı, ziyaret günü ulaşım
- Teslim süresi beklentisi: `Randevu tarihinden önce, QR hazır olur olmaz`
- İptal/değişiklik kuralı (kısa satır + `/sozlesme` linki)
- Tek birincil buton: **"Bu paketle sipariş ver"** → Sipariş Asistanı açılır (paket önseçili)

### 4.3 Kurallar
- Fiyat USD birincil; TRY/EUR/SAR yanında **yaklaşık** ibaresiyle gösterilir (`lib/format-money.ts` mevcut; kur sabit olmadığı için "yaklaşık" şart).
- Fiyat alanı boşsa kart "Fiyat WhatsApp'tan teyit edilir" gösterir, buton yine çalışır.
- Karşılaştırma: mobilde yatay kaydırma değil **akordeon**; masaüstünde 3 sütun grid.
- Paketler `/paketler` sayfasında ve ana sayfada (ilk 3) görünür.

---

## 5. WHATSAPP SİPARİŞ ASİSTANI (projenin kalbi)

### 5.1 Ne olduğu / ne olmadığı
**Faz 1 (bu işin kapsamı):** Site içinde çalışan, **deterministik** (LLM YOK) adım adım soru soran sihirbaz. Sonunda talebi kaydeder ve kullanıcıyı `wa.me` linkiyle, **mesajı hazır yazılmış** olarak WhatsApp'a gönderir.
**Faz 2 (şimdi yapma, sadece altyapıyı hazırla):** WhatsApp Cloud API ile gerçek iki yönlü bot. `WHATSAPP_CLOUD_API_ENABLED=false` bayrağı, webhook rota iskeleti ve şablon mesaj tipleri tanımlansın; canlı çağrı yapılmasın.

> Neden: WhatsApp Business API doğrulanmış işletme hesabı ve şablon onayı ister. `wa.me` deep link bugün, hiçbir onay beklemeden çalışır ve kullanıcı için aradaki fark neredeyse yoktur.

### 5.2 Yerleşim
- Sağ altta sabit buton (mevcut `floating-contact.tsx` bunun içine evrilir): kapalıyken WhatsApp ikonu + küçük "Sipariş ver" etiketi; 3 sn sonra bir kez nazikçe yukarı zıplar (reduced-motion'da zıplamaz).
- Açıldığında: masaüstünde 380px sağ alt panel, mobilde tam ekran `Drawer` (`components/ui/drawer.tsx`).
- Sohbet görünümü: operasyon balonları solda (marka yeşili kenarlıklı, beyaz zemin), kullanıcı seçimleri sağda (yeşil dolgu). `components/ui/bubble.tsx` ve `message*.tsx` mevcut — onları kullan.
- Üstte ince ilerleme çubuğu: `Adım 3 / 6`.
- Her adımda "Geri" var; cevaplar özet şeridinde chip olarak görünür, chip'e tıklayınca o adıma dönülür.

### 5.3 Adımlar (state machine)

```
S1 HİZMET  : [Ravza randevusu] [Umre paketi] [Toplu / acente talebi]
S2 KİŞİ    : 1 / 3 / 5 / 10 / 25 / Diğer(sayı gir) → paket otomatik eşleşir, kart önizlemesi belirir
S3 DAĞILIM : Kadın: n  Erkek: n  (toplam S2 ile eşleşmeli; Ravza slotları cinsiyete göre ayrıdır)
S4 TARİH   : Tarih aralığı (react-day-picker, mevcut) + "Esnek miyim?" [Evet/Hayır]
             + tercih edilen zaman dilimi [Sabah / Öğleden sonra / Akşam / Gece / Fark etmez]
S5 İLETİŞİM: Ad Soyad · Telefon (ülke kodlu, TR varsayılan) · E-posta (opsiyonel) · Not (opsiyonel, 300 krktr)
S6 ÖZET    : Tüm cevaplar + KVKK onay kutusu (işaretsiz gelir) + ticari mesaj izni (ayrı, opsiyonel)
             → [WhatsApp'tan gönder]   ikincil: [E-posta ile gönder] [Ara] [Talep kodunu kopyala]
```

**Doğrulama kuralları**
- S3 toplamı ≠ S2 ise ilerletme; satır içi hata: *"Kadın + erkek sayısı toplam kişi sayısına eşit olmalı."*
- Telefon: E.164'e normalize et (`+90...`), 8–15 hane; geçersizse satır içi hata.
- Tarih: geçmiş tarih seçilemez; aralık 60 günden uzunsa uyar.
- Not alanı: HTML kaçışlanır, 300 karakterde kesilir.
- Bot koruması: görünmez honeypot alanı + aynı IP için 10 dakikada 5 talep sınırı (sunucu tarafı sayaç). Aşılırsa 429 + nazik mesaj.

### 5.4 Gönderim akışı (sunucu)
`POST /api/quote-requests` → doğrula → `quote_requests` kaydı + `auditLogs` → `{ code: "TALEP-20260920-4K7Q", whatsappUrl }` döner.

**Talep kodu:** `TALEP-YYYYMMDD-XXXX`; XXXX, karışıklığa açık harfleri çıkarılmış Crockford Base32 (`0, O, 1, I, L` yok), `crypto.getRandomValues` ile. Kod tahmin edilemez olmalı, çünkü destek konuşmalarında referans olarak kullanılacak.

**WhatsApp mesaj şablonu** (TR; EN/AR karşılıkları da yazılacak — `encodeURIComponent` ile URL'e gömülür):

```
Merhaba, {MARKA} üzerinden talep oluşturdum.

Talep kodu: {KOD}
Hizmet: {HIZMET}
Paket: {PAKET_ADI} ({KISI} kişi)
Dağılım: {KADIN} kadın, {ERKEK} erkek
Tarih: {BASLANGIC} - {BITIS} ({ESNEK})
Tercih edilen saat: {ZAMAN}
Ad Soyad: {AD}
Telefon: {TEL}
Not: {NOT}

Fiyat ve ödeme için bilgi verebilir misiniz?
```

Link: `https://wa.me/{LEGAL_WHATSAPP_NUMBER_SADECE_RAKAM}?text={encodeURIComponent(mesaj)}`

**Dayanıklılık**
- WhatsApp açılmazsa (masaüstü, uygulama yok): 2 sn sonra "WhatsApp açılmadı mı?" kutusu → `web.whatsapp.com` linki + **mesajı panoya kopyala** butonu + `mailto:` alternatifi.
- Talep zaten kaydedildiği için WhatsApp'a hiç gidilmese bile operasyon panelde görür. Bu kritik: **kayıt önce, yönlendirme sonra.**
- Başarı ekranı: büyük talep kodu, "Bu kodu saklayın", `/talep/{kod}` durum takip linki — sayfa **kod + telefonun son 4 hanesi** ile doğrular; kod tek başına kişisel veri açmaz.

### 5.5 Erişilebilirlik
- Panel `role="dialog"` + `aria-modal`; açılışta odak ilk etkileşimli öğede, `Esc` kapatır, kapanınca odak tetikleyiciye döner.
- Her bot mesajı `aria-live="polite"` bölgesine düşer.
- Tüm seçenekler klavyeyle gezilebilir; dokunma hedefi ≥ 44px.
- Sihirbaz yarım kalırsa `sessionStorage`'a taslak yazılır (yalnız oturum boyunca, her okuma/yazma `try/catch` içinde); geri dönünce "Kaldığınız yerden devam edelim mi?" sorulur.

---

## 6. TASARIM SİSTEMİ — "Sükûnet"

### 6.1 Ruh
Sakin, ağırbaşlı, ferah. Reklam panosu değil, **vakıf/kurum** hissi. Beyaz alan bol, tipografi büyük, hareket az. Ziyaretçi 5 saniyede şunu anlamalı: *ne satıyorsunuz, kaç kişilik, nasıl sipariş veririm.*

### 6.2 Renk (mevcut tokenları koru, üzerine ekle)
`app/globals.css` içindeki `:root` / `.dark` değişkenleri **temel**. Şunları ekle:

```css
:root{
  --ravza-green:#0a2e1f;      /* birincil */
  --ravza-green-soft:#1f5a41;
  --gold:#c9a86a;             /* vurgu — yalnız ince detay */
  --gold-soft:#e8dcc0;
  --sand:#f8f5f0;             /* zemin */
  --ink:#14261d;
  --success:#2f7d5f; --warning:#b07d28; --danger:#9b3232;
}
```
**Kurallar:** Altın yalnız kenarlık, ayraç, ikon ve küçük rozetlerde; büyük dolgu alanı olarak kullanılmaz. Bir ekranda en fazla 2 vurgu rengi. Koyu modda altın `#d2b77b`'e düşer (zaten tanımlı). Koyu moddaki gri `sidebar-*` ve `chart-*` tokenları marka renkleriyle **yeniden yazılır** (şu an nötr gri, marka dışı).

### 6.3 Tipografi
- Başlık: Türkçe diakritikleri (ş ğ ı İ ö ü ç) **tam destekli** bir serif — `Cormorant Garamond` veya `Gilda Display`. Seçince ı/İ ve ğ'yi görsel olarak doğrula; bozuksa fallback'e geç.
- Gövde: mevcut Geist/Inter.
- Arapça: `Noto Naskh Arabic` (gövde) / `Amiri` (başlık). RTL'de satır yüksekliği +%15.
- Ölçek: 48/36/28/22/18/16/14. Gövde 17px, satır yüksekliği 1.7. Paragraf genişliği ≤ 68 karakter.
- Arapça hat/ayet kullanılacaksa: **görsel değil metin**, kaynağı belirtilmiş, Türkçe meali ve sûre-ayet numarasıyla. Süsleme amaçlı, okunmayan veya anlamı bozulmuş hat kullanma.

### 6.4 Motif ve form dili
- **Mihrap kemeri**: hero görseli ve öne çıkan kart üstten kemerli maskelenir. Sayfada en fazla 2 yer.
- **Girih / 8 köşeli yıldız (rub el hizb)**: inline SVG `<pattern>`, `opacity: .04–.06`, yalnız bölüm ayraçlarında ve sayfa zemininde. **Asla metnin arkasında okunabilirliği düşürecek şekilde değil.**
- **Meşrebiye kafesi**: bölüm ayracı olarak ince yatay şerit.
- Köşe yarıçapı: kartlar `--radius-xl`, butonlar `--radius-md`. Karışık yarıçap yok.
- Gölge: tek yumuşak katman (`0 1rem 3rem rgba(20,38,28,.12)`); neon/renkli gölge yok.
- İkonlar `lucide-react`; dini sembol icat etme.

### 6.5 Görseller
- `assets/masters/` altındaki mevcut görseller kullanılır; `assets/manifest.json` güncellenir (hash, yüzey, alt metin, hak durumu).
- **Kâbe / Mescid-i Nebevî görselinin üstüne fiyat etiketi, indirim rozeti veya CTA basma.** Görsel ayrı, ticari mesaj ayrı blokta.
- Yüz/portre kullanma; kalabalık sahneler uzaktan ve saygılı.
- Her görselde anlamlı `alt` (TR/EN/AR), `loading="lazy"`, `width/height` (CLS), webp.

### 6.6 Hareket
- Süre ≤ 300ms, easing `cubic-bezier(.2,.8,.2,1)`; yalnız `opacity` + `transform`.
- `prefers-reduced-motion: reduce` altında **tüm** animasyon ve 3B sahne kapanır. `components/kaaba-scroll-scene.tsx` mobilde ve reduced-motion'da statik görsele düşsün ve **three.js bundle'ı hiç yüklenmesin** (dinamik import).
- Otomatik oynayan video/ses **yok**. Müzik **yok**.

### 6.7 Zorunlu UI durumları
Her liste/kart/tablo için dördü de tasarlanır: **yükleniyor** (skeleton, spinner değil), **boş** (`components/ui/empty.tsx`, ne yapılacağını söyleyen tek cümle + aksiyon), **hata** (ne oldu + tekrar dene + destek linki), **dolu**.

### 6.8 Erişilebilirlik ve performans bütçesi
- WCAG 2.2 AA: metin kontrastı ≥ 4.5:1, büyük metin ≥ 3:1, `:focus-visible` halkası görünür (`--ring`).
- RTL: `ps-/pe-`, `start/end` mantıksal özellikler; `dir="rtl"` altında ikon yönü ve ilerleme çubuğu ters çalışır.
- Bütçe: LCP < 2.5s (4G), CLS < 0.1, INP < 200ms, ana sayfa ilk yük JS < 180KB gzip. Aşılıyorsa ağır bileşenleri dinamik yükle.

---

## 7. SAYFA SAYFA İÇERİK HARİTASI (müşteri yüzeyi)

### 7.1 `/` Ana sayfa — bölüm sırası (kesin)
1. **Hero.** Tek cümlelik vaat: *"Ravza-i Mutahhara ziyareti için randevunuzu biz ayarlayalım."* Altında tek satır açıklama, iki buton: birincil **"Sipariş ver"** (asistanı açar), ikincil **"Paketleri gör"**. Sağda kemerli Medine görseli. Rakam/istatistik yok.
2. **3 adımda nasıl çalışır.** İkonlu 3 kart: *Talep oluştur → WhatsApp'tan konuşalım → QR'ınız hazır.* Her kartta 1 cümle. Bu bölüm sitedeki en önemli ikinci şey.
3. **Paketler.** 3 öne çıkan kart (3 / 5 / 10 kişi) + "Tüm paketler" linki.
4. **Canlı müsaitlik şeridi** (salt-okunur, mevcut `live-availability-summary.tsx`): "Önümüzdeki 7 günde kadın/erkek uygun slot var mı?" Veri yoksa bölüm **gizlenir**, boş kutu bırakılmaz.
5. **Neden biz.** 4 madde; her madde **doğrulanabilir** olmalı (kurumsal kimlik, tek kanaldan takip, kadın/erkek ayrı saat yönetimi, toplu grup desteği). Uydurma rakam yok.
6. **Ziyaret adabı / hazırlık rehberi** önizlemesi → `/rehber`.
7. **Geri bildirimler** (Bölüm 10). Onaylı gerçek yorum yoksa bölüm **gizlenir**.
8. **SSS** (ilk 5 soru, akordeon) → `/sss`.
9. **Güven şeridi (footer üstü):** ticari unvan, VKN, adres, telefon, e-posta, `/kvkk`, `/sozlesme`, `/cerez-politikasi`. Belgesi doğrulanmamış hiçbir yetki/rozet gösterilmez (`TRAVEL_AGENCY_AUTHORITY_VERIFIED` false iken acente numarası **yazılmaz**).

### 7.2 Rotalar
| Rota | İçerik | Not |
|---|---|---|
| `/` | yukarıdaki | — |
| `/paketler` | 6 paket + karşılaştırma + SSS | `/packages` buraya 301 |
| `/siparis` | Asistanın tam sayfa hâli (mobil/paylaşım için) | `?paket=group` ile önseçim |
| `/talep/{kod}` | Talep durum takibi (kod + telefon son 4 hane) | `no-store`, `noindex` |
| `/rehber` | Ravza ziyaret adabı, kadın/erkek saat farkı, QR nasıl kullanılır, sık hatalar | SEO değeri yüksek |
| `/sss` | Kategorili SSS + `FAQPage` JSON-LD | mevcut sayfa zenginleştirilir |
| `/blog`, `/blog/[slug]` | mevcut | korunur |
| `/iletisim` | Kanallar, çalışma saatleri (Türkiye + Medine saati), harita yok (adres metin) | — |
| `/hesabim` (Seyahatim) | Bölüm 9 | giriş gerekli |
| `/kvkk`, `/aydinlatma`, `/sozlesme`, `/cerez-politikasi`, `/saklama-imha`, `/kvkk-basvuru` | mevcut | **ödeme/iade maddeleri yeni modele göre güncellenir** |
| `/book` | **kaldırılır** → `/siparis`'e 301 | 4 adımlı ödemeli akış biter |

### 7.3 Metin tonu
Kısa cümle, sade Türkçe, "siz" dili, abartısız. Her sayfada en fazla 1 ünlem. Dini terimler doğru yazılır: *Ravza-i Mutahhara, Mescid-i Nebevî, Harameyn, Mescid-i Haram.* Tüm metinler TR/EN/AR üçlüsüyle yazılır; eksik çeviri `TODO` ile bırakılmaz, İngilizce'den fallback yapılır ve bu davranış tek bir yardımcı fonksiyonda toplanır.

---

## 8. ADMİN PANELİ SADELEŞTİRME (13 ekran → 7)

### 8.1 Eşleme tablosu (uygula)
| Yeni ekran | Birleştirdiği eskiler | İçerik |
|---|---|---|
| `/panel` **Bugün** | `overview` | Kontör bakiyesi, bekleyen talep sayısı, bugünkü randevular, QR bekleyenler, son 5 hareket. 4 metrik + 1 liste, fazlası yok. |
| `/panel/talepler` | `orders` + `requests` + yeni WhatsApp talepleri | **Tek boru hattı.** Kanban benzeri durum sekmeleri + tablo. Satır: kod, ad, kişi, tarih, durum, kanal. Detay çekmecesinde: tüm cevaplar, WhatsApp'a dön butonu, durum değiştir, iç not. |
| `/panel/randevular` | `calendar` + `new-booking` + `qr-center` | Sol takvim, sağ seçili günün slotları; "Randevu oluştur" aynı ekranda çekmece; alt sekmede QR grupları ve durumları. |
| `/panel/yolcular` | `passengers` | Excel şablonu indir, sürükle-bırak yükle, satır satır hata raporu, tekil ekleme. |
| `/panel/kontor` | `ledger` + `membership` | Bakiye kartı, hareket defteri (giriş/çıkış/iade), "Kontör paketi talep et" → WhatsApp asistanı (B2B sürümü). |
| `/panel/paketler` | `packages` | Paket CRUD (kişi sayısı, fiyat, kapsam, yayın durumu). Yayın için zorunlu alan kontrolü (mevcut `lib/package-catalog.ts` kuralları korunur). |
| `/panel/geri-bildirim` | yeni | Moderasyon kuyruğu (Bölüm 10). |
| `/panel/ayarlar` | `profile` + `support` + `notification-channels` | Sekmeler: Firma, Kullanıcılar, Bildirim kanalları, Destek talepleri, Yasal/kapılar (salt-okunur). |
| `/panel/yonetim` | `admin` + `super-admin` | **Yalnız super admin rolüne görünür.** Acente onayı, denetim kaydı, sistem sağlığı, CEO özeti. Diğer rollerde menüde bile çıkmaz. |

`/dashboard/*` rotaları korunur ve yeni `/panel/*` rotalarına **301** ile yönlendirilir; eski bileşenler silinmeden önce yeni ekranlarda karşılıkları çalışır durumda olmalı.

### 8.2 Panel kabuğu
- Sol dikey `components/ui/sidebar.tsx`: 2 grup — **Operasyon** (Bugün, Talepler, Randevular, Yolcular) ve **Yönetim** (Kontör, Paketler, Geri bildirim, Ayarlar, [Yönetim]). Daraltılabilir; tercih `localStorage`'a `try/catch` ile yazılır.
- Üst çubuk: sayfa başlığı, **kontör pill'i** (Bölüm 9), dil/para birimi, bildirim zili, kullanıcı menüsü.
- Mobilde sidebar `Sheet` olarak açılır; alt gezinmede en sık 4 ekran.
- `Cmd/Ctrl+K` komut paleti (`components/ui/command.tsx` mevcut): talep kodu ara, ekrana git, "Yeni talep".
- Her ekranda en fazla **bir** birincil buton.

### 8.3 Sadeleştirme ölçütü
Bir ekranda ilk görünümde 7'den fazla metrik/kart varsa fazlasını detay sayfasına taşı. Grafik yalnız zaman içinde değişen bir şey anlatıyorsa kalır; süs grafik silinir.

---

## 9. KONTÖR / KALAN HAK GÖRÜNÜRLÜĞÜ ("her şeyim burada yazsın")

### 9.1 Kontör pill'i (global)
Panel üst çubuğunda her zaman görünen bileşen `components/credit-pill.tsx`:
- `Kontör 248` — yeşil; `< 20` ise amber + "Az kaldı"; `0` ise kırmızı + "Talep oluştur" linki.
- Tıklayınca popover: **Toplam alınan / Kullanılan / Rezerve (bekleyen talepler) / Kalan** + "Defteri aç" linki.
- Veri tek kaynaktan: `GET /api/credits/summary` (sunucu tarafı hesap, istemcide toplama yok). `private, no-store`.
- Yükleniyorken iskelet gösterir, hata durumunda `—` ve tooltip'te sebep; asla `0` göstermez (yanıltıcı olur).

### 9.2 Müşteri paneli `/hesabim` — "Seyahatim"
Tek ekranda, yukarıdan aşağı:
1. **Durum şeridi**: aktif talebin boru hattı (Talep alındı → Görüşüldü → Onaylandı → Randevu planlandı → QR hazır → Teslim edildi) — tamamlananlar yeşil tik, aktif olan vurgulu.
2. **Kalan hakkım**: kaç kişilik hak alındı, kaçı kullanıldı, kaçı kaldı. Büyük rakam.
3. **Yolcularım**: ad (maskeli), cinsiyet, randevu tarihi/saati, QR durumu, QR'ı aç/paylaş.
4. **Belgelerim**: QR PDF (hazırsa), talep özeti, ödeme **dekont/alındı notu** (operasyon elle yükler — otomatik tahsilat yok).
5. **Ödeme durumu**: `Nakit/elden` | `Havale` | `Bekliyor` — **bilgi amaçlı**, tutar operasyonun girdiği değerdir, sitede tahsilat yapılmaz. Yanında "Ödeme hakkında konuş" → WhatsApp.
6. **Yazışma özeti**: son WhatsApp/e-posta temas tarihi, sorumlu kişi adı.
7. **Geri bildirim ver** kartı — yalnız `delivered` durumundan sonra görünür.

### 9.3 Bildirim ve hatırlatma
`db/notifications.ts` + `app/api/cron/notifications` mevcut; şu olaylar eklenir: `quote.created`, `quote.contacted`, `quote.confirmed`, `appointment.scheduled`, `qr.ready`, `visit.reminder_24h`, `feedback.invite`. Her olayın TR/EN/AR metni `lib/notification-messages.ts` içine yazılır. Gönderim kanalı sırası: WhatsApp şablonu (Faz 2'de aktif) → e-posta → panel içi. Kanal kapalıysa kayıt yine `notificationOutbox`'a düşer, gönderilmez.

---

## 10. GERİ BİLDİRİM MODÜLÜ

### 10.1 Toplama
- Yalnız `delivered` olmuş talep sahibine davet gider; link tek kullanımlık ve süreli (14 gün) token içerir.
- Form: 1–5 yıldız (zorunlu), kısa yorum (max 600 karakter), "Adım nasıl görünsün?" [Tam ad / Baş harfler / Anonim], yayın izni onay kutusu (işaretsiz).
- Ek: opsiyonel alt puanlar — *iletişim hızı, netlik, zamanında teslim*.

### 10.2 Moderasyon (`/panel/geri-bildirim`)
- Kuyruk: `pending` → `published` | `rejected` (sebep zorunlu).
- Operasyon **yanıt** yazabilir; yanıt yorumun altında "İşletme yanıtı" olarak görünür.
- Yorum metni düzenlenemez — yalnız yayınla/reddet/yanıtla. (Düzenleme yetkisi sahtecilik riskidir.)
- Panelde özet: ortalama puan, dağılım, son 30 gün trendi. **Hiç yorum yoksa hiçbir şey uydurma.**

### 10.3 Yayın
- Ana sayfada ve `/paketler`'de yalnız `published` olanlar, tarih sırasıyla.
- Her kartta: yıldız, tarih, isim (seçime göre maskeli), `Doğrulanmış talep` rozeti (talep koduyla eşleşiyorsa).
- `Review` / `AggregateRating` JSON-LD **yalnız gerçek, yayınlanmış yorumlardan** üretilir. Sahte yapılandırılmış veri yasal risktir.
- Yorumların hiçbiri seed/fixture olarak production'a girmez.

---

## 11. VERİ MODELİ DEĞİŞİKLİKLERİ (`db/schema.ts` + `drizzle-kit generate`)

Yeni tablolar (mevcut isimlendirme ve `sqliteTable` stiline uy; tüm zaman damgaları epoch ms integer):

```
appointment_packages
  id, code(solo|family|group|kafile|agency|custom), name_tr/en/ar,
  person_count, price_per_person_minor, currency('USD'), discount_percent,
  included_json, excluded_json, status(draft|published|archived),
  highlight(boolean), sort_order, created_at, updated_at

quote_requests
  id, code(unique), service(rawdah|umrah|bulk), package_id(nullable),
  person_count, female_count, male_count,
  date_from, date_to, flexible(boolean), time_preference,
  full_name, phone_e164, email(nullable), note(nullable),
  locale, channel(whatsapp|email|phone|panel), source_path,
  status(new|contacted|quoted|confirmed|scheduled|qr_ready|delivered|closed|cancelled|expired),
  assigned_to(nullable), quoted_amount_minor(nullable), quoted_currency(nullable),
  payment_method(nullable: cash|transfer|other), payment_note(nullable),
  kvkk_consent_version, kvkk_consent_at, marketing_consent(boolean),
  ip_hash, user_agent_hash, created_at, updated_at, expires_at

quote_request_events        -- durum geçişi ve iç notlar
  id, quote_request_id, type(status_change|note|contact), from_status, to_status,
  body(nullable), actor_id, created_at

feedback
  id, quote_request_id(nullable), rating(1..5),
  rating_communication, rating_clarity, rating_timeliness (nullable),
  body, display_name_mode(full|initials|anonymous), display_name,
  status(pending|published|rejected), reject_reason(nullable),
  business_reply(nullable), replied_at(nullable),
  token_hash, token_expires_at, published_at, created_at
```

**Kurallar**
- Telefon, e-posta, ad gibi alanlar log'lanmaz; `ip_hash`/`user_agent_hash` tuzlu SHA-256.
- Migration `drizzle/` altına üretilir; mevcut tablolar **değiştirilmez**, yalnız eklenir.
- `creditLedger` mevcut; kontör düşümü **yalnız** `confirmed` geçişinde ve **idempotent** (aynı talep ikinci kez düşmez — `quote_request_id` benzersiz kısıt).
- Saklama süresi: `quote_requests` için 24 ay sonra anonimleştirme görevi (`docs/saklama-imha` politikasıyla tutarlı) — cron iskeleti yazılır.

---

## 12. EKSTRA DETAYLAR (bunları sen ekle — "çok fazla detay" isteği)

**Ürün**
- Hicrî tarih + **Medine saati** göstergesi (header'da küçük, `Intl.DateTimeFormat` ile `islamic-umalqura` ve `Asia/Riyadh`).
- Kadın/erkek slot farkını anlatan görsel mini rehber (`/rehber` içinde) — en sık karışan konu.
- Talep özetini **PDF/görsel karta** dönüştürüp WhatsApp'ta paylaşılabilir hâle getirme (istemci tarafı canvas, sunucuya PII göndermeden).
- Grup lideri modu: 10+ kişilik talepte yolcu listesi için Excel şablonu indirme linki asistanın son adımında çıkar.
- "Bana uygun paketi bul": kişi sayısı + tarih esnekliği girince doğru paketi öneren mini seçici.
- Çalışma saati farkındalığı: mesai dışında asistan "Şu an mesai dışındayız, talebiniz kaydolur, sabah dönüş yapılır" der (saatler `.env`'den).
- Talep kodu ile hızlı sorgulama kutusu footer'da.

**Teknik**
- PWA: `manifest.webmanifest` + service worker; **yalnız** QR/talep durumu sayfası offline önbelleğe alınır (havaalanı/roaming senaryosu). PII önbelleğe yazılmaz.
- SEO: `sitemap.ts`/`robots.ts` mevcut — `/siparis`, `/paketler`, `/rehber` eklenir; `/talep/*` ve `/panel/*` `noindex`. JSON-LD: `Organization` + `Service` + `FAQPage` (+ gerçek yorum varsa `Review`).
- OG görselleri: paket başına dinamik olmayan, `assets/masters/og.png` tabanlı statik varyantlar.
- Hata izleme: `console.error` yerine tek bir `lib/log.ts` — PII filtresi içinde.
- `app/not-found.tsx` ve hata sınırı sayfaları markalı hâle getirilir; 500 sayfasında WhatsApp butonu olur.
- Basit analitik: yalnız olay sayacı (`quote_started`, `quote_step_completed`, `quote_submitted`, `whatsapp_opened`) — çerezsiz, PII'siz, mevcut `analytics-consent.tsx` iznine bağlı.

---

## 13. TEKNİK STANDARTLAR

- TypeScript `strict`; `any` yok; API sınırlarında runtime doğrulama (elle yazılmış parser, mevcut `lib/package-catalog.ts` desenini izle).
- Sunucu bileşeni varsayılan; `'use client'` yalnız etkileşim gerektiren yaprak bileşenlerde. Sipariş asistanı istemci, veri yazma sunucu.
- Her yeni API rotası: yöntem kontrolü, gövde boyutu sınırı, doğrulama, yetki, `no-store`, hata modeli `{ error: string }` ve doğru HTTP kodu.
- Yeni saf fonksiyonlar için `node:test` testi: talep kodu üretimi, telefon normalizasyonu, cinsiyet toplamı doğrulaması, WhatsApp mesaj şablonu (URL kaçışı dahil), paket fiyat/indirim hesabı, durum geçiş makinesi (geçersiz geçiş reddedilir).
- `npm run lint`, `npm test`, `npm run build` **üçü de temiz** olmadan faz bitmez.
- Değişiklikler küçük ve anlamlı commit'lere bölünür; commit mesajları Türkçe, emir kipi.
- Silmeden önce taşı: eski bileşen silinecekse önce yeni ekran çalışır olmalı, sonra tek commit'te temizlik.

---

## 14. KABUL KRİTERLERİ (bitti demeden önce tek tek doğrula)

- [ ] Müşteri yüzeyinde ödeme/kart/checkout kelimesi geçen tek bir ekran veya buton kalmadı; `/book` → `/siparis` yönleniyor.
- [ ] Sipariş asistanı 6 adımı tamamlıyor, talep veritabanına **WhatsApp'a gitmeden önce** yazılıyor.
- [ ] WhatsApp mesajı doğru dolduruluyor; Türkçe karakterler ve satır sonları WhatsApp'ta bozulmuyor (gerçek cihazda veya `web.whatsapp.com` ile doğrulandı).
- [ ] WhatsApp açılmadığında kopyala/e-posta/telefon alternatifleri çalışıyor.
- [ ] 6 paket seviyesi yayınlanabiliyor; fiyatsız paket kartı doğru mesajı gösteriyor.
- [ ] Panelde 7 ana ekran var; eski 13 rota yönlendiriyor; hiçbir işlev kaybolmadı.
- [ ] Kontör pill'i panelin her sayfasında ve `/hesabim`'da doğru rakamı gösteriyor; kaynak tek API.
- [ ] Geri bildirim: davet → form → moderasyon → yayın zinciri uçtan uca çalışıyor; onaysız yorum hiçbir yerde görünmüyor.
- [ ] Sahte yorum/istatistik/fiyat yok; demo veri `Örnek veri` rozetli ve production'da kapalı.
- [ ] TR/EN/AR üç dilde tüm yeni metinler var; AR'da RTL yerleşim bozulmuyor.
- [ ] `prefers-reduced-motion` açıkken hiçbir animasyon ve three.js sahnesi çalışmıyor, bundle da yüklenmiyor.
- [ ] Klavyeyle asistanın tamamı doldurulabiliyor; odak tuzağı ve Esc doğru.
- [ ] Kontrast kontrolü: birincil buton, altın rozet, amber/kırmızı kontör durumları AA geçiyor.
- [ ] Mobilde 360px genişlikte yatay kaydırma yok; asistan tam ekran drawer olarak çalışıyor.
- [ ] `lint` + `test` + `build` temiz. `docs/implementation-status.md` güncellendi.
- [ ] Yolcu adı/telefon hiçbir log satırında yok; PII taşıyan yanıtlar `no-store`.

---

## 15. ÇALIŞMA SIRASI (fazlar — sırayı bozma)

| Faz | İş | Çıktı |
|---|---|---|
| **0** | Repo keşfi, Bölüm 17 varsayımlarını netleştir, kısa plan sun | Plan + soru listesi |
| **1** | Tasarım sistemi: tokenlar, tipografi, motif bileşenleri, durum bileşenleri | `globals.css` + `components/ui` eklentileri, 1 örnek ekran |
| **2** | Veri modeli + migration + saf fonksiyonlar + testleri | `db/schema.ts`, `drizzle/`, `tests/` |
| **3** | Sipariş asistanı (UI + API + wa.me) uçtan uca | `/siparis`, widget, `POST /api/quote-requests` |
| **4** | Paketler: tablo, CRUD, `/paketler`, ana sayfa kartları | Müşteri + panel |
| **5** | Ödeme akışının sökülmesi + `/book` yönlendirme + yasal metin güncellemesi | Temizlik commit'i |
| **6** | Panel birleştirme (7 ekran) + kontör pill + `/hesabim` yenilenmesi | `/panel/*` |
| **7** | Geri bildirim modülü | Davet, form, moderasyon, yayın |
| **8** | Ana sayfa + `/rehber` + SSS + SEO + erişilebilirlik ve performans geçişi | Son cila |
| **9** | Kabul kriterleri denetimi, `implementation-status.md`, teslim raporu | Rapor |

Her fazın sonunda dur, kısa rapor ver, onay bekle. Bir faz yarım kalmışsa sonrakine geçme.

---

## 16. RAPORLAMA FORMATI (her faz sonunda)

```
FAZ N — <ad>
Yapılanlar      : madde madde, dosya yollarıyla
Ekran değişimi  : hangi rota nasıl göründü (kısa)
Komut çıktıları : lint / test / build sonucu (sayı ile)
Kalan/atlanan   : ne yapılmadı ve neden
Varsayımlar     : hangi bilgiyi tahmin ettin
Sıradaki faz    : tek cümle
```
Abartma, "mükemmel oldu" deme; ölçülebilir yaz. Çalışmayan bir şeyi çalışıyor gösterme.

---

## 17. BELİRSİZLİKLER — SORMADAN KULLANILACAK VARSAYIMLAR

Faz 0'da bunları topluca sor. Cevap gelmezse aşağıdaki varsayımla devam et ve raporda belirt.

| Konu | Varsayım |
|---|---|
| Marka adı | `.env` `LEGAL_BRAND_NAME`; boşsa "Ravza Randevu" |
| WhatsApp numarası | `LEGAL_WHATSAPP_NUMBER`; boşsa asistan çalışır, gönderim adımında "Kanal yakında" + e-posta alternatifi |
| Paket fiyatları | Boş bırak; kart "Fiyat WhatsApp'tan teyit edilir" gösterir |
| Kişi başı indirim | 3→%0, 5→%3, 10→%6, 25→%10 (yer tutucu, panelden değiştirilebilir, ekranda "örnek" ibaresi yok — yalnız gerçek değer girildiğinde gösterilir) |
| Mesai saatleri | Hafta içi 09:00–18:00 (TRT), Cumartesi 10:00–15:00, Pazar kapalı |
| Umre paketi satışı | Kapılar kapalı → `/paketler`'de Umre bölümü gizli, yalnız Ravza randevu paketleri açık |
| Domain | `APP_URL` |
| Para birimi | USD birincil, diğerleri "yaklaşık" |
| Dil önceliği | TR varsayılan, EN ve AR tam |
| WhatsApp Cloud API | Kapalı; yalnız iskelet |

---

## 18. SON SÖZ (AI'a)

Bu iş bir **dönüşüm**, sıfırdan yazım değil. Mevcut kodun çalışan kısımlarını koru, tekrar yazma. Tasarımda "daha çok efekt" değil **daha az gürültü** hedefle: ziyaretçi Medine'ye gitmeyi düşünen, muhtemelen yaşlı, muhtemelen telefondan giren, teknik olmayan biri. Ona tek bir net yol göster: **paketi seç, altı soruyu cevapla, WhatsApp'tan konuş.** Geri kalan her şey bu yolun etrafındaki sessiz süstür.
