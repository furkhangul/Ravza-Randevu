# ADR 0002 — Kişisel veri sınırı

- Durum: Kabul edildi
- Tarih: 2026-09-04

## Karar

Pasaport, vize, doğum tarihi, telefon, QR, ödeme ve destek içerikleri yaratıcı AI araçlarına gönderilmez. Sağlayıcı şeması doğrulanana kadar ürün yüzeyleri sentetik fixture kullanır.

## Uygulama

Üretimde doğrulanmış gerekli hassas alanlar AEAD + KMS ile korunacak; log, hata izleme ve export yüzeylerinde maskelenecektir. Saklama süresi hukuk ve iş amacıyla belirlenecektir.
