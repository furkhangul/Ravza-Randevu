import type { MetadataRoute } from 'next';

/**
 * Yalnız herkese açık ve kalıcı yüzeyler listelenir. Talep takibi
 * (`/talep/*`) kişiye özel olduğu için dışarıda tutulur ve `robots.ts`
 * tarafından taramaya kapatılır. `/paketler` `/rehber`'e yönlendiği için
 * listede yoktur. `lastModified` her istekte değişeceği için verilmez.
 */
const weekly = new Set(['', '/siparis']);

const publicRoutes = [
  '',
  '/siparis',
  '/rehber',
  '/blog',
  '/blog/qr-durumu',
  '/blog/cift-onay',
  '/blog/excel-dogrulama',
  '/sss',
  '/iletisim',
  '/kvkk',
  '/aydinlatma',
  '/cerez-politikasi',
  '/sorumluluk-reddi',
  '/saklama-imha',
  '/sozlesme',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.APP_URL ?? 'http://localhost:3001';
  return publicRoutes.map((route) => ({
    url: `${origin}${route}`,
    changeFrequency: weekly.has(route) ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : weekly.has(route) ? 0.9 : 0.6,
  }));
}
