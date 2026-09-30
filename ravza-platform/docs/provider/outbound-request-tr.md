# RawdahBooking'e gönderilecek talep

- Durum: **Gönderilmedi — iletişim kanalı ve yetkili kişi bekleniyor**
- Hazırlanma tarihi: 4 Eylül 2026
- Dil: Türkçe

## Konu

API teknik dokümantasyonu, sandbox ve partner/white-label sözleşme talebi

## Mesaj

Merhaba,

Ravza Operasyon projesi kapsamında mevcut RawdahBooking hesabımızla API erişim izni talebimizi iletmiştik. Entegrasyonu yalnız yazılı olarak doğrulanmış kapsam ve güvenlik koşullarıyla tamamlayabilmek için aşağıdaki bilgi ve belgeleri rica ederiz:

1. B2B yeniden satış, white-label kullanım ve alt bayi yetkilerini kapsayan güncel partner sözleşmesi veya ticari ek,
2. Güncel ve sürümlü OpenAPI/Swagger ya da Postman koleksiyonu,
3. Sandbox base URL, test hesabı ve yalnız sentetik yolcu için test kontörü,
4. Production base URL, kimlik doğrulama, token ömrü, rate limit ve hata kodları,
5. Müsaitlik, satın alma, işlem sonucu sorgulama, bakiye, yolcu ekleme/toplu aktarım, iptal, QR grup/yolcu listesi, kısa paylaşım bağlantısı ve PDF endpoint'lerinin request/response örnekleri,
6. Cinsiyet enum eşlemesi, saat dilimi, pagination ve alan zorunlulukları,
7. Idempotency desteği ile timeout/bağlantı kopması sonrasında kesin işlem sonucu sorgulama yöntemi,
8. QR hazırlık politikası, önerilen polling aralığı ve varsa imzalı webhook belgeleri,
9. Kısa bağlantı için TTL, iptal, rate limit, erişim kaydı ve veri kapsamı,
10. Güncel fiyat, para birimi, vergi, komisyon, minimum alım, kontör geçerliliği, iade/telafi ve fiyat değişikliği bildirim koşulları,
11. Sağlayıcı kesintisi, başarısız randevu, geciken QR ve destek eskalasyonu için SLA,
12. Yolcu verileri bakımından veri sorumlusu/veri işleyen rolleri, veri lokasyonu, alt işleyenler, saklama-silme ve Türkiye dışına aktarım hükümleri.

Canlıya geçmeden önce tek sentetik yolcuyla `giriş → müsaitlik → satın alma → QR → kısa bağlantı → PDF` akışını sandbox ortamında test etmek istiyoruz. Teknik ve ticari irtibat kişilerini de paylaşabilir misiniz?

Teşekkürler.

Ravza Operasyon

## Göndermeden önce doldurulacaklar

- gönderen kişinin adı ve soyadı
- RawdahBooking hesap e-postası
- telefon veya e-posta iletişim kanalı
- varsa daha önce açılan talep/konuşma numarası

Hesap parolası, API secret veya yolcu verisi mesaja eklenmez.
