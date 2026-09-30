# Natro VPS Kurulumu

Uygulama VPS'te Node.js ile çalışır. Veritabanı sunucudaki bir SQLite dosyasıdır
(`/var/lib/ravza/ravza.db`). Önde nginx durur ve HTTPS sertifikasını Let's Encrypt verir.

```
Ziyaretçi ──HTTPS──> nginx :443 ──> Node (127.0.0.1:3000) ──> /var/lib/ravza/ravza.db
                                     ▲
             cron (dakikada bir) ────┘  bildirim kuyruğu
             cron (her gece)  ──────────> /var/backups/ravza  (14 gün)
```

## 0. Natro'dan alınacak paket

- **İşletim sistemi:** Ubuntu 24.04 LTS
- **Bellek:** En az 2 GB RAM. Derleme sırasında bellek yetmezse 3. adımdaki swap açılır.
- **Disk:** 20 GB yeterlidir.

Natro panelinde VPS'in **IP adresini** ve **root parolasını** not alın.

## 1. Alan adını VPS'e yönlendirin

Alan adının DNS yönetiminde (Natro paneli veya alan adını aldığınız firma):

| Durum | Kayıt |
|---|---|
| Site doğrudan `ALAN-ADINIZ.com.tr` olacak | `@` için **A** kaydı → VPS IP, `www` için **A** kaydı → VPS IP |
| Eski site kalacak, uygulama alt alan adında olacak | yalnız `randevu` için **A** kaydı → VPS IP |

**MX (e-posta) kayıtlarına dokunmayın.** Yayılması birkaç dakika ile birkaç saat arasında sürer.
Kontrol etmek için: `nslookup ALAN-ADINIZ.com.tr`

## 2. Sunucuya bağlanın

Windows PowerShell'den:

```sh
ssh root@VPS_IP
```

## 3. Temel kurulum (bir kez)

```sh
apt update && apt upgrade -y
apt install -y nginx git curl sqlite3 build-essential python3 ufw

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v   # v22.13 veya üstü olmalı

# Güvenlik duvarı: yalnız SSH ve web
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 2 GB swap (derleme sırasında bellek yetmezliğini önler)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Uygulama kullanıcısı ve klasörler
useradd --system --create-home --home-dir /opt/ravza --shell /usr/sbin/nologin ravza
mkdir -p /var/lib/ravza /etc/ravza /var/backups/ravza
chown ravza:ravza /var/lib/ravza
chmod 700 /var/lib/ravza /var/backups/ravza
```

## 4. Kodu sunucuya alın

Önerilen yol **özel (private) bir GitHub deposu**. Güncellemeler sonradan tek komutla yapılır.

```sh
sudo -u ravza git clone https://github.com/KULLANICI/ravza-platform.git /opt/ravza/app
```

Özel depo için GitHub parola kabul etmez. Parola yerine bir **Personal Access Token**
girin, ya da sunucuya bir deploy key tanımlayın.

## 5. Ayar dosyası

```sh
cp /opt/ravza/app/deploy/ravza.env.example /etc/ravza/ravza.env
chmod 600 /etc/ravza/ravza.env
nano /etc/ravza/ravza.env
```

Mutlaka doldurulması gerekenler:

- `APP_URL`: `https://www.ALAN-ADINIZ.com.tr` (sonunda `/` olmadan)
- `APP_ADMIN_EMAILS`, `APP_SUPER_ADMIN_EMAILS`
- `CRON_SECRET`: `openssl rand -hex 32` çıktısı
- `PII_HASH_SALT`: `openssl rand -hex 32` çıktısı. Bir kez belirlenir, sonra değiştirilmez.
- `RAWDAH_EMAIL`, `RAWDAH_PASSWORD`, `LEGAL_*`, `EMAIL_*`, `SMS_*`: yerel `.env.local` dosyanızdaki değerler

Google ile giriş kullanılıyorsa Google Cloud Console'da yetkili yönlendirme adresini
`https://www.ALAN-ADINIZ.com.tr/api/auth/google/callback` olarak güncelleyin.

## 6. Derleme ve veritabanı

```sh
cd /opt/ravza/app
sudo -u ravza npm ci
sudo -u ravza npm run build
sudo -u ravza env DATABASE_PATH=/var/lib/ravza/ravza.db node scripts/migrate.mjs
```

### (İsteğe bağlı) Cloudflare'daki mevcut verileri taşıma

Site daha önce Cloudflare'da yayındaydıysa ve oradaki kayıtlar korunacaksa, bu adımı
**migrate komutundan önce, boş veritabanına** uygulayın. Yerel bilgisayarda:

```sh
npx wrangler d1 export ravza-demo-db --remote --output=d1-dump.sql
scp d1-dump.sql root@VPS_IP:/tmp/
```

Sunucuda:

```sh
sudo -u ravza sqlite3 /var/lib/ravza/ravza.db < /tmp/d1-dump.sql
sudo -u ravza env DATABASE_PATH=/var/lib/ravza/ravza.db node scripts/migrate.mjs
rm /tmp/d1-dump.sql
```

## 7. Servisi başlatın

```sh
cp /opt/ravza/app/deploy/ravza.service /etc/systemd/system/ravza.service
systemctl daemon-reload
systemctl enable --now ravza
systemctl status ravza                  # "active (running)" görünmeli
curl http://127.0.0.1:3000/api/health   # {"status":"ok",...}
```

Günlükleri izlemek için: `journalctl -u ravza -f`

## 8. nginx ve HTTPS

```sh
cp /opt/ravza/app/deploy/nginx-ravza.conf /etc/nginx/sites-available/ravza
nano /etc/nginx/sites-available/ravza      # ALAN-ADINIZ yerine gerçek alan adı
ln -s /etc/nginx/sites-available/ravza /etc/nginx/sites-enabled/ravza
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

apt install -y certbot python3-certbot-nginx
certbot --nginx -d ALAN-ADINIZ.com.tr -d www.ALAN-ADINIZ.com.tr
```

Certbot sertifikayı kurar, HTTP'yi HTTPS'e yönlendirir ve yenilemeyi kendisi yapar.

## 9. Zamanlanmış işler (bildirimler ve yedek)

```sh
cp /opt/ravza/app/deploy/cron.d-ravza /etc/cron.d/ravza
chmod 644 /etc/cron.d/ravza
```

- Dakikada bir, sıradaki e-posta ve SMS bildirimleri gönderilir (`CRON_SECRET` boşsa bu iş hiçbir şey yapmaz).
- Her gece 03:30'da veritabanı `/var/backups/ravza` klasörüne yedeklenir, 14 gün saklanır.

Yedekleri ara sıra bilgisayarınıza da indirin, çünkü sunucu çökerse içindeki yedekler de gider:

```sh
scp root@VPS_IP:/var/backups/ravza/*.gz .
```

## 10. Yönetici hesabı

```sh
cd /opt/ravza/app
node scripts/create-admin.mjs <kullanici-adi> <e-posta> "<Ad Soyad>"
# Çıktıdaki SQL'i çalıştırın:
sudo -u ravza sqlite3 /var/lib/ravza/ravza.db
```

## Güncelleme

Kodda değişiklik yapıp GitHub'a gönderdikten sonra sunucuda:

```sh
sudo /opt/ravza/app/deploy/update.sh
```

Betik sırasıyla kodu çeker, derler, yedek alır, veritabanı göçlerini uygular ve servisi yeniden başlatır.

## Cloudflare sürümünden farklar

- **Destek sohbeti (yapay zekâ asistanı)** Cloudflare Workers AI'ya bağlıydı. VPS'te bu
  hizmet kapalıdır: sohbet isteği 503 döner ve asistan hata mesajı gösterir.
  Talep formu ve WhatsApp yönlendirmesi bundan etkilenmez.
- Cloudflare D1 yerine aynı şemayla yerel SQLite kullanılır (`lib/sqlite-d1.ts`).

## Sorun giderme

| Belirti | Kontrol |
|---|---|
| 502 Bad Gateway | `systemctl status ravza`, `journalctl -u ravza -n 50` |
| Giriş veya form "invalid_origin" hatası veriyor | `/etc/ravza/ravza.env` içinde `VINEXT_TRUST_PROXY=1` var mı? nginx `X-Forwarded-Proto` gönderiyor mu? |
| `npm run build` "Killed" ile bitiyor | Bellek yetmiyor, 3. adımdaki swap açık mı? (`free -h`) |
| Bildirimler gitmiyor | `CRON_SECRET` dolu mu? `sh /opt/ravza/app/deploy/cron-notifications.sh` elle çalıştırın |
