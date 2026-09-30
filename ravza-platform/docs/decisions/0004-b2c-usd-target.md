# ADR 0004 — Doğrudan yolcu satışı ve USD önceliği

- Durum: Hedef kabul edildi, canlı açılış koşullu
- Tarih: 2026-09-04

## Karar

Ürünün hedef satış akışı doğrudan yolcudan ödeme almak, müşteriye şirketimizin kendi düzenlediği Umre paketini sunmak ve ilgili Ravza randevusunu RawdahBooking API üzerinden ayırmaktır. Başka bir yetkili acentenin hazır paketini aracılık/yeniden satış modeli seçilmemiştir. Ravza randevusu tek başına satılan ana ürün değil, Umre paketinin operasyon bileşenidir. Tahsilatların yaklaşık `%99` oranında USD olması beklendiği için uygulamanın varsayılan satış para birimi `USD` olacaktır. Eski TRY kayıtları korunur; ödeme tutarları para biriminin en küçük biriminde `amount_minor` olarak tutulur.

RawdahBooking hesabı yalnız bu entegrasyon için açılmış ayrı bir hesaptır. Sağlayıcıdaki kesin rol ve izin kapsamı ayrıca doğrulanacaktır.

Hedef yolcuların yaklaşık `%80` oranında Türk olduğu ve bu Türk müşterilerin yaklaşık `%99` oranında Türkiye'de ikamet ettiği iş sahibi tarafından bildirildi. Bu oranlar checkout'taki bireysel yerleşiklik beyanının yerine geçmez; ödeme öncesinde müşterinin Türkiye'de mi, yurt dışında mı yerleşik olduğu ayrıca doğrulanır. USD hedefi korunur; ancak Türkiye'de yerleşik müşteri için USD checkout, hizmetin dövizli sözleşme istisnasına girdiği yazılı hukuk görüşüyle doğrulanmadan açılamaz. Yurt dışı yerleşik müşteri akışı ayrı değerlendirilir.

İş sahibi Türkiye'de ikamet eden müşteride de tahsilatın mutlaka USD olacağını ve TL karşılığı tahsilat/fallback istemediğini belirledi. Sistem bu tercihi `PAYMENT_DOMESTIC_USD_REQUIRED=true` ile kaydeder. Bu tercih hukuki kapıyı atlamaz; gerekli yazılı onay yoksa checkout kapalı kalır.

## Canlı açılış kapısı

Bu hedef, tek başına canlı B2C satış yetkisi değildir. Aşağıdakiler tamamlanmadan müşteri tahsilatı veya sağlayıcı satın alma çağrısı açılmaz:

1. RawdahBooking'in white-label/yeniden satış ve doğrudan yolcu satış izni,
2. şirket kuruluşu ile ödeme kuruluşu üye işyeri onayı,
3. tüketici, turizm/acentelik, vergi, fatura, iade ve dövizli fiyatlandırma incelemesi,
4. USD tahsilat, mutabakat, kur farkı ve ters ibraz koşullarının yazılı onayı,
5. sandbox ödeme ve sentetik RawdahBooking E2E kanıtı.
6. seyahat acentesi ve ilgili dönem Diyanet Umre yetkisi, paket tur sözleşmesi ve zorunlu sigorta/güvence kanıtı.

## Teknik sonuç

iyzico Checkout Form resmî sözleşmesinde USD desteklenir; bu nedenle teknik sağlayıcı seçimi şimdilik korunur. Canlı USD tahsilatı, üye işyeri teklifinde USD kabulü ve net settlement para birimi doğrulandıktan sonra açılır.

Türkiye'de yerleşik tüketicide ödeme öncesi temel hizmet özellikleri, şirket kimliği ve iletişim bilgileri, vergiler dâhil toplam fiyat, ek masraflar, cayma/iptal ve başvuru yolları kalıcı veri saklayıcısıyla sunulup teyit edilmelidir.
