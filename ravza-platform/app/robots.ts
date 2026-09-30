import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.APP_URL ?? 'http://localhost:3001';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/panel/',
          '/admin',
          '/super-admin',
          '/api/',
          '/talep',
          '/geri-bildirim/',
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
