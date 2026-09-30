import { sha256Hex } from '@/lib/auth-crypto';
import { env } from '@/lib/server-env';

/**
 * Basit sabit pencereli sayaç (auth_rate_limits tablosu). Anahtar özetlenerek
 * saklanır; ham IP veya e-posta yazılmaz. Pencere başına `max` aşılırsa `true`.
 */
export async function overRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);
  const row = await env.DB.prepare(
    `INSERT INTO auth_rate_limits (key, window_start, attempts) VALUES (?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET
       attempts = CASE WHEN window_start = excluded.window_start THEN attempts + 1 ELSE 1 END,
       window_start = excluded.window_start
     RETURNING attempts`,
  )
    .bind(await sha256Hex(key), windowStart)
    .first<{ attempts: number }>();
  return (row?.attempts ?? max + 1) > max;
}

export function clientIp(request: Request) {
  return request.headers.get('cf-connecting-ip') || 'local';
}
