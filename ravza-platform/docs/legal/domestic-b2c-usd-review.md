# Türkiye'de yerleşik tüketiciye USD satış inceleme notu

## Mevcut ürün bilgisi

- Hedef yolcuların yaklaşık `%80` kadarı Türktür; Türk müşterilerin yaklaşık `%99`u Türkiye'de ikamet etmektedir.
- Bu tahmini oranlar bireysel müşterinin yerleşiklik beyanı yerine kullanılmaz.
- Hedef satış ve maliyet modeli USD ağırlıklıdır.
- Hizmet, Suudi Arabistan'daki Ravza randevusunun RawdahBooking API üzerinden ayrılmasını içerir.

## Resmî kaynaklardan çıkan sınır

Hazine ve Maliye Bakanlığının 2025 tarihli SSS belgesine göre Türkiye'de yerleşik kişilerin kendi aralarındaki hizmet sözleşmelerinde dövizli bedel genel olarak sınırlıdır. Türkiye'de yerleşik kişilerin yurt dışındaki faaliyetleri ve Türkiye'de başlayıp yurt dışında sonlanan, yurt dışında başlayıp Türkiye'de veya yine yurt dışında sonlanan hizmetler için istisnalar bulunmaktadır.

Ravza randevu hizmetinin bu istisnalardan hangisine ve hangi kapsamda girdiği ürün ekibi tarafından varsayılmaz. Türkiye müşterisine USD fiyat ve ödeme ancak sözleşme örneğini inceleyen hukukçu ile mali müşavirin yazılı onayından sonra açılır.

Ticaret Bakanlığı rehberi uyarınca tüketici, ödeme yükümlülüğünden önce en az şu konularda açıkça bilgilendirilmelidir: hizmetin temel özellikleri, satıcı/sağlayıcı kimliği ve iletişimi, vergiler dâhil toplam fiyat ve ek masraflar, cayma/iptal şartları ve başvuru yolları. Bilgilendirmenin sunulduğu ve tüketici tarafından teyit edildiği ispatlanabilir olmalıdır.

## Uygulanan teknik politika

- Varsayılan hedef para birimi `USD` olarak korunur.
- Müşteri yerleşikliği checkout öncesinde belirlenir; vatandaşlık tek başına yerleşiklik kararı değildir.
- `TR + USD` akışı `PAYMENT_DOMESTIC_USD_LEGAL_APPROVED=false` iken bloke edilir.
- İş kararı gereği Türkiye müşterisinde TL tahsilat/fallback yoktur; `PAYMENT_DOMESTIC_USD_REQUIRED=true` zorunluluğu hukuk onayı yokken kapıyı açmaz.
- Yurt dışı yerleşik müşteri akışı ayrı fiyat, vergi, fatura ve ödeme kuruluşu kurallarından geçer.
- Checkout ekranı vergiler ve ek masraflar dâhil kesin toplamı, para birimini ve fiyat geçerlilik süresini ödeme öncesinde gösterir.

## Açılış kanıtı

1. İmzalı hukuk görüşü ve mali müşavir notu,
2. kullanılan sözleşme/ön bilgilendirme metninin sürümü,
3. USD settlement ve yabancı kart komisyonunu gösteren üye işyeri teklifi,
4. kur kaynağı ve fiyat kilidi süresi,
5. sandbox ödeme, iade, ters ibraz ve mutabakat testi.

Bu belge hukuk görüşü değildir; canlı ödeme kapısının hangi dış kanıtlarla açılacağını tanımlar.

## Kaynaklar

- Hazine ve Maliye Bakanlığı, 32 sayılı Karara ilişkin SSS: https://ms.hmb.gov.tr/uploads/2025/11/Sikca-Sorulan-Sorular-ba3feb0209aa5f1a.pdf
- Ticaret Bakanlığı, Mesafeli Sözleşmeler Hakkında Bilgilendirme: https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme
