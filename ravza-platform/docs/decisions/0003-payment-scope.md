# ADR 0003 — Ödeme ve kontör kapsamı

- Durum: Kabul edildi
- Tarih: 2026-09-04

## Karar

Kart verisi uygulama sunucusundan geçmeyecek; yalnız lisanslı sağlayıcının hosted çözümü kullanılacaktır. Havale, ancak iki kişi onayı ve audit ile kredi üretir. Kripto başlangıç kapsamı dışındadır.

Türkiye ilk sürümü için varsayılan teknik sağlayıcı iyzico Checkout Form'dur. Seçim; hosted form, USD/TRY, sandbox, 3DS ve belgelenmiş webhook imzası gerekçelerine dayanır. Satışların yaklaşık `%99` USD olması beklendiğinden varsayılan para birimi USD'dir. Ticari komisyon, settlement para birimi ve ödeme vadeleri üye işyeri teklifi geldiğinde yeniden değerlendirilir.

Kontör bakiyesi değiştirilebilir tek bir sayaçtan değil, benzersiz referanslı `credit_ledger` hareketlerinden türetilir. Ödeme denemeleri ve tekrar webhookları ayrı idempotent tablolarda izlenir. Demo hiçbir ödeme kabul etmez; sandbox bile anahtar ve açık etkinleştirme bayrağı olmadan çağrı yapmaz.
