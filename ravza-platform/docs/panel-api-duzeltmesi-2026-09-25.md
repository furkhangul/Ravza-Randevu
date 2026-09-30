# Panel ve API düzeltmesi — 25 Eylül 2026

Kaynak: `C:\Users\Furkan\Desktop\Hac\ravza-platform`.

## Nedenler ve düzeltmeler

- Admin girişi başarılıydı; ardından rol kontrolü yerel kurulumda olmayan `users` tablosunu sorgulayıp `D1_ERROR: no such table: users` üretiyordu. Tablo yoksa mevcut doğrulanmış admin hesabının e-posta rolü kuralı kullanılır. Tablo varsa rol ve askıya alınma kontrolü korunur. Genel veritabanı hataları yetki verilerek geçiştirilmez.
- Paneldeki canlı takvim `PublicPreferencesProvider` dışında kalıyordu. Panel ortak layout'u gerekli dil ve bakiye sağlayıcılarını içerir.
- Randevu hakkı göstergesi canlı bakiye yerine `demo_ledger` toplamını gösteriyordu. İnceleme sırasında örnek toplam 248, sağlayıcının bildirdiği gerçek bakiye 5020 idi. `/api/credits/summary` artık belgelenen `/api/Auth/login` yanıtındaki `user.appointmentBalance` alanını okur. Bu rakamlar inceleme anının değerleridir; kodda sabitlenmez.
- Üst çubuk, bakiye, üyelik ve takvim özeti aynı canlı bakiye sorgusunu paylaşır. Sağlayıcının sunmadığı satın alma/kullanım geçmişi, örnek üyelik ve 250 hak sınırı gerçek veri gibi gösterilmez. Bakiye okunamıyorsa `—` gösterilir ve yeniden sorgulanabilir.
- Takvim hatasında 50/18/9 gibi örnek kontenjanlara dönüş kaldırıldı. Tarih değişiminde eski saat seçimi temizlenir, eski yanıtlar yok sayılır, geçersiz/boş tarihte kayıt düğmesi kapanır. Mevcut yerel deneme kaydı açıkça etiketlendi; canlı satın alma açılmadı.
- Takvim tarihi Medine saatine göre belirlenir. Takvim yanıtları önbellekten sunulmaz. Tablonun altındaki sayı kişi toplamı değil, “uygun saat aralığı” olarak etiketlenir.

## Doğrulama

- Ayrı yerel veritabanı kopyasında test hesabıyla admin girişi ve tarayıcıda panel açılışı doğrulandı.
- 10 panel sayfası/sekmesi render edildi: ana panel, talepler, randevular, QR sekmesi, yolcular, bakiye, üyelik sekmesi, paketler, geri bildirim ve ayarlar.
- Oturumsuz erişim 401; askıya alınmış kullanıcı ve admin hesabı 401; yetkisiz süper yönetici ekranı erişimi reddedildi. `users` tablosu varken kayıtlı rolün kullanıldığı doğrulandı.
- Tarayıcıda panel, bakiye kartı ve randevu özeti canlı 5.020 değerini gösterdi. Tarih değişimi ve boş tarihte örnek veri göstermeyen hata durumu doğrulandı.
- İlgili domain/auth/quote testleri: 60/60 geçti. Beş yeni test canlı bakiye, sıfır/eksik bakiye ayrımı, başarısız yenileme, Medine tarih sınırı ve 50 üzeri takvim adetlerini kapsar.
- Tam test paketi: 110 test, 107 başarılı, 3 önceden mevcut ziyaret asistanı testi başarısız. Başarısızlıklar ücret metni, randevu açıklaması ve hazırlık ilerleme hesabındadır.
- Değiştirilen dosyaların lint kontrolü başarılı. Üretim derlemesi başarılı.
- Tam TypeScript kontrolünde kaynakta önceden de bulunan dört hata devam eder: `app/page.tsx` eksik `packages` özelliği, `components/visit-assistant.tsx` içinde `trim` tipi ve iki düğmenin olay işleyici tipi. Genel lint kontrolünde de bu çalışma dışındaki dosyalarda mevcut hatalar vardır.

Gerçek admin hesapları ve veritabanı kayıtları değiştirilmedi. Test hesabı yalnız ayrı test kopyasında oluşturuldu.

## Cloudflare yayını ve giriş hizmeti — aynı gün

- Kullanıcının isteği üzerine düzeltmeler canlı `ravza-operations-demo` Worker'ına yayımlandı: https://ravza-operations-demo.gl56frkn.workers.dev.
- Son canlı sürüm: `a5c5a66b-5c5f-4219-bd2a-036c0234fd30`. Üretim derlemesi ve Wrangler yayın denemesi başarılı; yeni yapılandırma ve yayın betiği lint kontrolünden geçti.
- Yerel 503 hatasının nedeni üretim D1 kimliğinin yerel emülatörde farklı, yönetici tablosu bulunmayan bir dosyayı seçmesiydi. `preview_database_id` eski yerel veritabanına ayarlandı; üretim D1 bağı `199a0a2d-81be-4681-bc59-4f3162afe32a` olarak korundu. Yerel giriş hizmeti artık bulunmayan kullanıcı için beklenen 401 yanıtını veriyor.
- Canlı veritabanında mevcut aktif yönetici ve süper yönetici rol kaydı bulundu. Canlı şema değiştirilmedi, test hesabı eklenmedi, parola sıfırlanmadı. Mevcut tarayıcı oturumu ile canlı randevu paneli açıldı.
- Canlı Worker'da Rawdah API gizli ayarları eksikti. Kullanıcı açık onayından sonra yalnız `RAWDAH_EMAIL` ve `RAWDAH_PASSWORD`, Cloudflare Secrets'a aktarıldı. Gizli değerlerin üretilen sunucu/istemci dosyalarına gömülmediği kontrol edildi; geçici aktarım dosyaları temizlendi.
- Canlı takvim API'si 200 ve `no-store` yanıtı verdi; 25 Eylül için 59 kadın/erkek saat kaydı döndü. İnceleme anında en yüksek kontenjan 181 idi. Bu değişken değerler kodda sabit değildir.
- Canlı tarayıcıdaki yönetici panelinde 5.020 bakiye ve gerçek saat kontenjanları görüldü; randevu ekranında tarayıcı hata kaydı yoktu. Oturumsuz özel API 401, panel 307 ile giriş sayfasına yönlendi; giriş hizmeti 503 yerine doğru 401 yanıtını verdi.
- Gelecek güncellemeler için `npm run deploy` komutu eklendi. Normal yayın gizli ayar aktarmaz, mevcut canlı ayarları korur. Çalışma ve yayın süreci `docs/cloudflare-yayin.md` içinde kayıtlıdır.
