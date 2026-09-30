import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, rmdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const dryRun = process.argv.includes('--dry-run');
// Gizli ayar aktarımı normal yayından ayrıdır; açık onaydan sonra kullanılır.
const withProviderSecrets = process.argv.includes('--with-provider-secrets');
const local = withProviderSecrets ? parseEnv(readFileSync(join(root, '.env.local'), 'utf8')) : {};
const secrets = {};
for (const key of withProviderSecrets ? ['RAWDAH_EMAIL', 'RAWDAH_PASSWORD'] : []) {
  const value = process.env[key] ?? local[key];
  if (!value) throw new Error(`${key} eksik; Cloudflare yayını durduruldu.`);
  secrets[key] = value;
}

function run(script, args) {
  const result = spawnSync(process.execPath, [resolve(root, script), ...args], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DEPLOY_TARGET: 'cloudflare', WRANGLER_WRITE_LOGS: 'false' },
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Komut tamamlanamadı: ${script} (${result.status ?? 'başlatılamadı'})`);
  }
}

run('node_modules/vinext/dist/cli.js', ['build']);
const configPath = join(root, 'dist/server/wrangler.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
if (config.name !== 'ravza-operations-demo' || !config.d1_databases?.some(
  (db) => db.binding === 'DB' && db.database_id === '199a0a2d-81be-4681-bc59-4f3162afe32a',
)) throw new Error('Canlı Worker veya D1 hedefi beklenen proje değil.');

const deployArgs = [
  'deploy', '--config', configPath, '--keep-vars',
  '--message', 'Agency teams, email notifications, terms',
  ...(dryRun ? ['--dry-run'] : []),
];
if (!withProviderSecrets) {
  run('node_modules/wrangler/bin/wrangler.js', deployArgs);
  process.exit(0);
}

// Yalnız sağlayıcıya ait iki gizli ayar aktarılır. .env.local bütünü yüklenmez.
// Geçici dosya Git kapsamı dışındaki .wrangler altında tutulur ve temizlenir.
const tempRoot = join(root, '.wrangler');
mkdirSync(tempRoot, { recursive: true });
const tempDir = mkdtempSync(join(tempRoot, 'deploy-secrets-'));
const secretPath = join(tempDir, 'secrets.json');
if (!resolve(tempDir).startsWith(resolve(tempRoot) + (process.platform === 'win32' ? '\\' : '/'))) {
  throw new Error('Geçici dosya yolu proje dışında.');
}
try {
  writeFileSync(secretPath, JSON.stringify(secrets), { mode: 0o600 });
  run('node_modules/wrangler/bin/wrangler.js', [
    ...deployArgs,
    '--secrets-file', secretPath,
  ]);
} finally {
  // Sabit kökün doğrudan altında oluşturduğumuz geçici klasörle sınırlıdır.
  rmSync(secretPath, { force: true });
  rmdirSync(tempDir);
}
