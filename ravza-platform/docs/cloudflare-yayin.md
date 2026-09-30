# Cloudflare yayını

Kullanıcı isteği (25 Eylül 2026): Güncellemeler masaüstündeki kaynakla birlikte Cloudflare üzerindeki canlı siteye de uygulanır. Yalnız localhost kontrolü tamamlanmış yayın sayılmaz.

- Asıl kaynak: `C:\Users\Furkan\Desktop\Hac\ravza-platform`
- Canlı adres: https://ravza-operations-demo.gl56frkn.workers.dev
- Worker: `ravza-operations-demo`
- Canlı D1: `ravza-demo-db`, kimlik `199a0a2d-81be-4681-bc59-4f3162afe32a`, bağ adı `DB`.
- Yerel D1 önizleme kimliği: `00000000-0000-4000-8000-000000000000`. Bu kimlik eski yerel yönetici hesaplarını korur; canlı veritabanına yazmaz.

## Güncelleme

İlgili testleri ve değişen dosyaların lint kontrolünü çalıştırın. Ardından asıl kaynak klasöründe:

```sh
npm run deploy -- --dry-run
npm run deploy
```

Betik uygulamayı derler, Worker ve üretim D1 kimliğini doğrular ve `--keep-vars` ile yayımlar. Normal yayın mevcut Cloudflare değişkenlerini ve gizli ayarlarını korur; `.env.local` dosyasını yüklemez. API yazma, PDF ve paylaşım işlemleri mevcut durumda kapalıdır.

`RAWDAH_EMAIL` ve `RAWDAH_PASSWORD` Cloudflare Secrets içindedir. Sağlayıcı kimlik bilgilerinin aktarımı için kullanıcı 25 Eylül 2026'da açıkça onay vermiştir. Yalnız bu iki anahtarın yeniden aktarılması gerekirse:

```sh
npm run deploy -- --with-provider-secrets
```

Bu seçenek yalnız iki sağlayıcı anahtarını okur; diğer yerel ayarları yüklemez. Geçici dosya `.wrangler` altında oluşturulur ve işlem sonunda silinir. Anahtar değerleri loglanmaz veya istemci derlemesine eklenmez.

## Yayın sonrası doğrulama

- Yeni sürümün D1 bağı gerçek üretim kimliği olmalıdır. Wrangler konsolunun yerel önizleme kimliğini gösterdiği durumlarda canlı sürüm metaverisini ayrıca kontrol edin.
- `/api/health` 200, canlı okuma açık ve yazma kapalı olmalıdır.
- Oturumsuz panel girişi giriş sayfasına yönlenmeli, özel API 401 dönmelidir.
- Var olmayan bir kullanıcıyla giriş denemesi 401 dönmeli; `auth_store_unavailable`/503 görülmemelidir. Gerçek hesaplara yanlış parola denemesi yapmayın.
- Tarayıcıdaki yönetici oturumuyla panel, randevu takvimi, bakiye kartı ve diğer panel bağlantılarını kontrol edin. Bakiye ve kontenjanlar hata halinde örnek değer göstermemelidir.
- Canlı veritabanına test hesabı eklemeyin ve mevcut kullanıcı parolalarını değiştirmeyin.
