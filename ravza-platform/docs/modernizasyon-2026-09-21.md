# Ravza ziyaret sitesi — 21 Eylül 2026

Kaynak ve güncellenen proje: `C:\Users\Furkan\Desktop\Hac\ravza-platform`.
Değiştirilen mevcut dosyaların yedeği: `C:\Users\Furkan\Desktop\Hac\yedekler\modernizasyon-20260921`.

## Kapsam

- Bireysel ziyaretçiler, aileler, gruplar ve acenteler için Ravza ziyareti odağı korundu.
- Ana sayfa; mobil menü, üst bilgi, alt bilgi, paket sunumu, rehber, sık sorulan sorular, iletişim ve talep takibi ortak tasarımla yenilendi.
- Masaüstü ve telefon için sohbet paneli ve talep sayfası eklendi. Yerel kaynak dosyalar üzerinde çalışıldı; uzaktaki siteye yayın yapılmadı.
- Ziyaret rehberinde Ravza’da namaz için randevu ve kabr-i şerife selam ziyareti arasındaki ayrım açıklandı. Resmî kaynak bağlantıları sayfada yer alır.

## Asistan nasıl çalışır?

Türkçe sohbet mantığı `lib/visit-conversation.ts` dosyasındadır. Haricî bir büyük dil modeli veya ücretli API kullanmaz. Ziyaret amacıyla sınırlandırılmış, test edilen bir konuşma akışıdır; genel amaçlı bir yapay zekâ değildir.

Kişi sayısı, kadın–erkek dağılımı, Türkçe ay adlarıyla tarihler, sayısal tarihler, bugünün/yarının tarihi ve saat tercihleri anlaşılır. Araya giren ücret, Nusuk, QR, iptal ve takip soruları mevcut ziyaret bilgileri korunarak cevaplanır. Belirsiz ifadelerde açıklama istenir; kontenjan, ücret veya kesin randevu uydurulmaz.

Örnek: `5 kişiyiz, 2 kadın 3 erkek, 1-5 Ekim 2026`.
Ardından `Ücret nasıl belirleniyor?` sorusu ve `Tarihimiz 2-6 Ekim 2026 oldu` düzeltmesi yapılabilir.

Sohbet, tek başına talep kaydetmez. Bilgiler mevcut `/api/quote-requests` akışına bağlı forma aktarılır. İletişim bilgileri, son kontrol ve açık onay sonrasında kayıt yapılır. WhatsApp bağlantısını ziyaretçi kendisi açar. İngilizce ve Arapça için mevcut yapılandırılmış talep formu korunmuştur; serbest metin sohbet Türkçedir.

## Doğrulama

- `npm test`: mevcut işlev testleri ve yeni konuşma senaryoları.
- `npx tsc --noEmit --incremental false`: tip kontrolü.
- Değişen TypeScript dosyaları için Oxlint.
- `npm run build`: üretim derlemesi.
- Tarayıcıda masaüstü ve 390 px telefon görünümü; sohbet, araya giren soru, tarih düzeltmesi, forma aktarım ve form doğrulaması.

Üretimde gerçek randevu, ödeme veya dış mesaj oluşturulmadı. Mevcut sağlayıcı ve iletişim yapılandırması değiştirilmedi.

## Yerel çalıştırma

Proje klasöründe `npm run dev -- --host 127.0.0.1 --port 3000` çalıştırın ve `http://localhost:3000/` adresini açın.
