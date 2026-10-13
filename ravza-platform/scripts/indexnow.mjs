// Sitemap'teki herkese açık adresleri IndexNow ile Bing ve Yandex'e bildirir.
// Kullanım (yayından sonra): node scripts/indexnow.mjs
// Anahtar dosyası public/<anahtar>.txt olarak yayında olmalıdır.
const host = 'ravzarandevu.com.tr';
const key = 'a8612ab0c1b0dcd3d19076308196c39e';

const sitemap = await fetch(`https://${host}/sitemap.xml`).then((r) => r.text());
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urlList.length === 0) throw new Error('Sitemap boş veya okunamadı.');

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList,
  }),
});
console.log(`IndexNow: ${urlList.length} adres gönderildi → ${response.status}`);
