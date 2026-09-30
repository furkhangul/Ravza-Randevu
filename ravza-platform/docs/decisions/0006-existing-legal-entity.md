# ADR 0006 — Mevcut tüzel kişilik kullanılacak

- Durum: Kabul edildi
- Tarih: 2026-09-06
- Yerini aldığı karar: ADR 0005 (Planlanan tüzel kişilik)

## Bağlam

ADR 0005, Ravza Operasyon için **yeni** bir Limited Şirket kurulacağını varsayıyordu. İş sahibi 2026-09-06 tarihinde şirketin GİB vergi levhasını teslim etti; buna göre faal bir tüzel kişilik zaten mevcuttur.

## Karar

Platform, yeni şirket kurmak yerine mevcut tüzel kişilik üzerinden yürütülecektir:

- Ticari unvan: (kaldırıldı)
- Vergi dairesi / VKN: (kaldırıldı)
- İş yeri adresi: Batı Mah. Şeyh El Hazin Cad. No: 40/A, Merkez/Siirt
- İşe başlama: 01.01.1999
- Ana faaliyet kodu: 791101 — Seyahat acentesi faaliyetleri

`Ravza Operasyon` bu tüzel kişiliğin çalışma markası olarak konumlanır; hukuk metinlerinde taraf olarak tam ticari unvan kullanılır.

## Sonuçlar

Açılan girdiler:

- Şirket kuruluşu bekleme durumu ortadan kalktı; TÜRSAB hazırlık listesindeki "kuruluş ilini ve adresini belirle" adımı kapandı.
- Fatura, sözleşme tarafı ve tebligat adresi için gerçek değerler artık mevcut.
- Ana faaliyet kodunun `791101` olması, ana sözleşmenin seyahat acentalığı faaliyetini kapsadığına dair güçlü göstergedir; yine de Ticaret Sicili Gazetesi metniyle doğrulanmalıdır.

Değişmeyen kapılar:

- Vergi levhası işletme belgesi değildir. `TRAVEL_AGENCY_AUTHORITY_VERIFIED=false` kalır.
- `DIYANET_UMRAH_AUTHORITY_VERIFIED`, `PACKAGE_TOUR_CONTRACT_APPROVED`, `PACKAGE_TOUR_INSURANCE_VERIFIED` ve `UMRAH_PACKAGE_ENABLED` değişmedi.
- Ödeme kapıları (`PAYMENT_CHECKOUT_ENABLED`, `PAYMENT_LIVE_ENABLED`) bu karardan etkilenmez; iyzico üye işyeri sözleşmesi ayrıca gerekir.

## Açık soru — öncelikli

Şirket 1999'dan beri `791101` faaliyet koduyla kayıtlı. Bu, şirketin geçmişte seyahat acentesi işletme belgesi almış olabileceğini düşündürür. İş sahibine sorulacak:

1. Şirket adına düzenlenmiş bir seyahat acentesi işletme belgesi var mı; varsa grubu ve belge numarası nedir?
2. Belge daha önce alınıp askıya alındı/iptal edildi mi?
3. TÜRSAB üyeliği ve aidat durumu güncel mi?

Cevap "belge mevcut ve geçerli" ise süreç yeni başvuru değil, **belge doğrulama ve güncelleme** akışına döner; bu, `docs/legal/tursab-application-checklist.md` listesini kısaltır.
