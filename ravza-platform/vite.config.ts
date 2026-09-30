import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, type Plugin, type PluginOption } from 'vite';

/**
 * İki yayın hedefi vardır:
 * - varsayılan: Node.js (Natro VPS), veritabanı yerel SQLite dosyası
 * - DEPLOY_TARGET=cloudflare: Cloudflare Workers + D1 (`npm run deploy`)
 */
const isCloudflare = process.env.DEPLOY_TARGET === 'cloudflare';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

// Cloudflare'da ravza-demo-db için doğrulanmış üretim kimliği.
const PRODUCTION_DATABASE_ID = '199a0a2d-81be-4681-bc59-4f3162afe32a';
// Eski yerel hesapların bulunduğu Miniflare veritabanı kimliğini koru.
const LOCAL_DATABASE_ID = '00000000-0000-4000-8000-000000000000';

const serverEnvFile = /[\\/]lib[\\/]server-env\.ts$/;
const cloudflareServerEnvFile = fileURLToPath(
  new URL('./lib/server-env.cloudflare.ts', import.meta.url),
);

/**
 * Cloudflare'da sunucu bağlamı `cloudflare:workers` üzerinden gelir.
 * `@/lib/server-env` hangi yazımla içe aktarılırsa aktarılsın, çözümlenen dosya
 * SQLite sürümüyse Cloudflare sürümüne yönlendirilir. (Basit bir `resolve.alias`
 * yetmez: `@/` yolları vinext tarafından alias'tan önce çözülebiliyor.)
 */
function cloudflareServerEnv(): Plugin {
  return {
    name: 'ravza:cloudflare-server-env',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!source.includes('server-env') || source.includes('server-env.cloudflare')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved && serverEnvFile.test(resolved.id.split('?')[0])) {
        return cloudflareServerEnvFile;
      }
      return null;
    },
  };
}

async function cloudflarePlugins(): Promise<PluginOption[]> {
  const { default: hostingConfig } = await import('./.openai/hosting.json', {
    with: { type: 'json' },
  });
  const { sites } = await import('@openai/sites-vite-plugin');
  const { d1, r2 } = hostingConfig;
  const d1DatabaseId = process.env.CLOUDFLARE_D1_DATABASE_ID ?? PRODUCTION_DATABASE_ID;
  const d1DatabaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME ?? 'ravza-demo-db';

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return [
    sites(),
    cloudflare({
      viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
      config: {
        name: 'ravza-operations-demo',
        // İstekler vinext'e gider; ayrıca dakikada bir bildirim kuyruğu işlenir.
        main: './worker/index.ts',
        triggers: { crons: ['* * * * *'] },
        // Alan adı Cloudflare'da; SSL sertifikası ve DNS kaydı yayında otomatik oluşur.
        routes: [
          { pattern: 'ravzarandevu.com.tr', custom_domain: true },
          { pattern: 'www.ravzarandevu.com.tr', custom_domain: true },
        ],
        compatibility_flags: ['nodejs_compat'],
        vars: {
          APP_URL: 'https://ravzarandevu.com.tr',
          // E-posta bildirimleri (Resend). API anahtarı gizli: EMAIL_API_KEY secret olarak girilir.
          EMAIL_FROM_ADDRESS: 'bildirim@ravzarandevu.com.tr',
          EMAIL_FROM_NAME: 'Ravza Randevu',
          EMAIL_REPLY_TO: 'info@ravzarandevu.com.tr',
          // Yeni talep, acente başvurusu ve kontör talebi bildirimleri buraya gider.
          APP_ADMIN_EMAILS: 'info@ravzarandevu.com.tr',
          RAWDAH_BASE_URL: 'https://rawdahbooking.com',
          RAWDAH_AUTH_PATH: '/api/Auth/login',
          RAWDAH_LIVE_ENABLED: 'true',
          // Talep onayında RawdahBooking'den satın alma ve QR paylaşım bağlantısı.
          RAWDAH_WRITE_ENABLED: 'true',
          RAWDAH_PDF_EXPORT_ENABLED: 'false',
          RAWDAH_SHARE_LINK_ENABLED: 'true',
        },
        ai: { binding: 'AI' },
        d1_databases: d1
          ? [
              {
                binding: d1,
                database_name: d1DatabaseName,
                database_id: d1DatabaseId || PRODUCTION_DATABASE_ID,
                preview_database_id: LOCAL_DATABASE_ID,
              },
            ]
          : [],
        r2_buckets: r2 ? [{ binding: r2, bucket_name: 'site-creator-r2' }] : [],
      },
    }),
  ];
}

export default defineConfig(async () => ({
  css: { postcss: { plugins: [tailwindcss()] } },
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
  // Yerel SQLite sürücüsü derlenmiş bir eklentidir; paketlenmez, çalışma anında yüklenir.
  ssr: isCloudflare ? undefined : { external: ['better-sqlite3'] },
  plugins: [
    ...(isCloudflare ? [cloudflareServerEnv()] : []),
    vinext(),
    ...(isCloudflare ? await cloudflarePlugins() : []),
  ],
}));
