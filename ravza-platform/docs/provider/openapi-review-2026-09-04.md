# Rawdah Booking OpenAPI incelemesi — 4 Eylül 2026

## Kaynaklar

- `api-1.json` — SHA-256 `B254ED1076FFCB3C96DDF537BF810F5EA6022079D319CE9F448F9491EDB39B58`
- `api-1.yaml` — SHA-256 `05EA5764F451DE6EAA285FBF47494DB3DEB71F0D023CA0BB4CAFADDB24259654`

Kaynak dosyalar iş sahibinden 4 Eylül 2026 tarihinde alındı. İnceleme sırasında canlı JWT, özel anahtar, API anahtarı veya parola örneği bulunmadı.

## Doğrulanan kapsam

- OpenAPI `3.0.1`
- Başlık `Rawdah Booking API`, sürüm `v1`
- `Bearer` güvenlik şeması
- E-posta/parola alan `POST /api/Auth/login`; yanıtta token ve sona erme zamanı
- Partner uçları Bearer JWT ister; giriş yolu anonimdir ve `expiresAt` UTC olarak döner.
- Refresh token/yenileme endpoint'i yoktur. Token yalnız sunucu belleğinde, JWT `exp` ile yanıt `expiresAt` değerlerinin erken olanına kadar tutulur; `401` sonrasında kör tekrar yapılmaz.
- Giriş yanıtındaki kullanıcı özeti sayısal `appointmentBalance`, şirket ve kullanıcı türü alanlarını içerir. API girişinde sıfır bakiye `403` üretebilir.
- Güvenlik rehberi kimlik bilgileri ile JWT'nin yalnız sunucu tarafı gizli depoda tutulmasını, yalnız HTTPS kullanılmasını ve token'ın log, analitik, URL sorgusu ya da uzun ömürlü tarayıcı depolamasına yazılmamasını şart koşar.
- Yerel entegrasyon kimlik bilgilerini yalnız tam `https://rawdahbooking.com/` origin'ine gönderecek allowlist uygular. JWT yalnız `Authorization: Bearer` başlığında taşınır; ek cookie kopyası gönderilmez. Canlı sağlayıcı proxy yanıtları `private, no-store` olarak işaretlenir.
- Belgelenmemiş rate-limit, webhook veya refresh mekanizması varsayılmaz. En az yetkili hesap türü ayrıca doğrulanacaktır.
- Toplam yedi endpoint:
  - `GET /api/AppointmentQueue/GetBookedAppointments`
  - `POST /api/AppointmentQueue/PurchaseAppointments`
  - `POST /api/Auth/login`
  - `GET /api/QRCode/GetPrintGroups`
  - `GET /api/QRCode/GetPrintListPassengers`
  - `POST /api/QRCode/CreatePrintShareLink`
  - `POST /api/QRCode/ExportPrintListPdf`
- Cinsiyet enum değerleri `8` ve `9`; anlam eşlemesi açıklanmıyor.
- Havuz yanıtındaki `hasBalance`, satın alma için bakiyenin yeterli olup olmadığını boolean olarak bildiriyor; sayısal bakiye vermiyor.
- `dataMale` ve `dataFemale`, `dateKey → timeSlot → adet` yapısında dönüyor. `dateKey` ve `timeSlot` satın alma isteğine değiştirilmeden aktarılmalı.
- Gösterilen adetler üst sınırla kısaltılabilir; gerçek stok satın alma anında tekrar doğrulanıyor.
- Satın alma isteğinde `dateKey`, `timeSlot`, `genderId` ve `quantity` zorunlu; `groupCode` isteğe bağlıdır.
- Satın alma `genderId` değeri integer enum değil, `"Male"` veya `"Female"` string değeridir.
- Başarılı yanıtta sipariş kimliği, satın alınan adet, kalan bakiye, düşülen bakiye ve indirim bilgisi dönebilir.
- Satın alma `POST` çağrısı idempotent değildir. Timeout, bağlantı kopması veya `5xx` sonucunda otomatik tekrar yapılmaz; işlem `unknown` durumuna alınır.
- `GetPrintGroups`, oturumdaki kullanıcıya ait yalnız bugün ve gelecekteki grupları döndürür; parametre almaz.
- `groupKey` kararlı grup anahtarıdır. Yolcu/QR, paylaşım ve PDF çağrılarının filtre alanları bu yanıttan taşınır.
- QR grup cinsiyet eşlemesi `Male=8`, `Female=9` olarak doğrulandı. `printGuid`, varsa beş karakterli paylaşım kısa kodudur.
- `confirmedCount`, `printedCount` ve `totalCount` sırasıyla yazdırmaya hazır, yazdırılmış ve toplam adetleri verir.
- `GetPrintListPassengers` için yalnız `date` zorunludur; diğer filtreler QR grup yanıtından taşınır.
- Yolcu durumu `All`, `WithQr`, `WithoutQr` ve `Printed` filtreleriyle sorgulanabilir. Yanıt toplam ve QR'lı kişi sayısını ayrıca verir.
- Yolcu filtresinde `genderId` integer `8/9` kullanılır; eski XML açıklamasındaki `1/2` değerleri kullanılmaz.
- Yolcu yanıtı ad-soyad ve rezervasyon kimliği içerdiğinden kişisel veri kabul edilir; tenant/acente yetkilendirmesi olmadan genel arayüze açılmaz.
- PDF dışa aktarımına yalnız QR'ı hazır yolcuların girdiği belirtildi; QR hazırlık SLA'sı yayımlanmamıştır.
- PDF dışa aktarımı `passengerIds` zorunlu, `groupName` ve `New/Old` şablonu isteğe bağlı bir `POST` çağrısıdır.
- Başarılı yanıt JSON değil `application/pdf` gövdesidir; `X-Marked-Count` yazdırıldı işaretlenen kişi sayısını verir.
- PDF üretimi aynı zamanda seçilen yolcuları `Printed` yapar ve `groupName` verilirse grup kodunu değiştirir. Bu nedenle ayrı özellik kilidi, çift onay ve denetim kaydı olmadan çağrılamaz.
- Boş seçim veya seçilenlerde hazır QR bulunmaması `400` döndürür. Ağ/`5xx` belirsizliğinde otomatik tekrar yapılmaz.
- `CreatePrintShareLink`, QR grup filtrelerini ve isteğe bağlı ilk-N kişi sınırını kullanarak oturumsuz bir kısa bağlantı üretir.
- Başarılı yanıtta beş karakterli kod, yalnız `https://rwdh.link/{code}` biçimindeki URL ve kapsanan yolcu sayısı kabul edilir.
- `shareGroupName` seçilen kümenin grup adını değiştirebilir. Çağrı ayrı özellik kilidi ve çift onay olmadan çalıştırılmaz; ağ belirsizliğinde otomatik tekrar yapılmaz.
- Beş karakterli kod oturumsuz bearer bağlantıdır. TTL, iptal, tek kullanımlılık, deneme/rate limit, erişim kaydı ve tam veri kapsamı yayımlanmadığı için canlı paylaşım bloke kalır.
- QR grup, yolcu, paylaşım bağlantısı ve PDF istek/yanıt modelleri mevcut.

## JSON/YAML farkı

İki dosyada aynı yedi path ve aynı 16 şema vardır. YAML içindeki tırnaksız ISO tarih örnekleri bazı YAML okuyucularında `Date` nesnesine dönüşebildiği için kod üretimi ve sözleşme testi için **JSON dosyası kanonik kaynak** kabul edilir.

## Yazmayı hâlâ bloke eden şema boşlukları

1. Belge `servers` alanı içermiyor; sandbox ve production base URL ayrımı yok.
2. OpenAPI şeması zorunlu alanları işaretlemiyor; insan-okunur belge dört zorunlu alanı açıklıyor.
3. Cinsiyet temsili endpoint'e göre değişir: satın almada `Male`/`Female` string, QR grup filtresinde `Male=8` ve `Female=9` kullanılır.
4. Satın alma idempotent değildir; istemci otomatik retry yapamaz.
5. Timeout sonrası kesin sipariş sonucu sorgulama endpoint'i yok; belge QR grupları/bakiye kontrolü öneriyor ancak deterministik mutabakat yöntemi açıklamıyor.
6. Refresh token olmadığı doğrulandı; ancak `expiresAt` ile JWT claim süresinin her zaman eşleşip eşleşmediği, rate limit, tam hata kataloğu ve saat dilimi semantiği belirtilmiyor.
7. QR polling/webhook politikası, kısa bağlantı TTL/iptal/rate-limit modeli ve indirilen PDF'in güvenli saklama/silme davranışı tanımlı değil.
8. Yolcu oluşturma/toplu import, bakiye, iptal ve mutabakat endpoint'leri bulunmuyor.
9. PII/gizlilik log saklama politikası ve anonim paylaşım bağlantısının güvenlik ömrü yayımlanmamıştır.

Bu nedenle doküman salt-okunur entegrasyonu güçlendirir ve yazma istemcisi için tip kaynağıdır; tek başına canlı satın alma yetkisi değildir. Yazma ancak sandbox/test kontörü ve yukarıdaki belirsizliklerin yazılı cevabı ile açılır.

## Test ortamı durumu

4 Eylül 2026 tarihinde iş sahibi, sağlayıcının ayrı bir test hesabı vermediğini doğruladı. Bu nedenle sentetik uçtan uca satın alma testi production hesabı veya gerçek bakiye üzerinde otomatik çalıştırılmaz. Sağlayıcıdan test kontörü ya da production'dan ayrılmış güvenli bir test yöntemi alınana kadar satın alma endpoint'i kapalı tutulur.
