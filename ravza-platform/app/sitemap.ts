import type { MetadataRoute } from 'next';

/**
 * Yalnız herkese açık ve kalıcı yüzeyler listelenir. Talep takibi
 * (`/talep/*`) kişiye özel olduğu için dışarıda tutulur ve `robots.ts`
 * tarafından taramaya kapatılır.
 */
const weekly = new Set(['', '/paketler', '/siparis']);

const publicRoutes = [
  '',
  '/paketler',
  '/siparis',
  '/rehber',
  '/blog',
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
    lastModified: new Date(),
    changeFrequency: weekly.has(route) ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : weekly.has(route) ? 0.9 : 0.6,
  }));
}
