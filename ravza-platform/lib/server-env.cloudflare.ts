/**
 * Cloudflare yayını için sunucu bağlamı: `DEPLOY_TARGET=cloudflare` iken
 * `vite.config.ts`, `@/lib/server-env` içe aktarımlarını bu dosyaya yönlendirir.
 */
export { env } from 'cloudflare:workers';
