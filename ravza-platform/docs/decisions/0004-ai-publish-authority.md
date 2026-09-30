# ADR 0004 — Yaratıcı AI yayın yetkisi

- Durum: Kabul edildi
- Tarih: 2026-09-04

## Karar

AI yalnız brief, taslak ve varyant üretir. İnsan seçimi olmadan final render, Figma/Canva yazma veya yayın yapılamaz. Yayın yetkisi yalnız onay servisine aittir.

Her iş idempotency anahtarı, maliyet üst sınırı, sağlayıcı/model anlık görüntüsü, prompt sürümü, çıktı hash'i ve insan onayıyla izlenir.
