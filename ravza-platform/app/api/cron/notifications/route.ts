import { drainOutbox } from '@/db/notifications';
import { timingSafeEqual } from '@/lib/auth-crypto';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };

/**
 * Zamanı gelmiş bildirimleri gönderir.
 *
 * Dışarıdan çağrılabilen bir adres olduğu için `CRON_SECRET` ile korunur;
 * gizli anahtar tanımlı değilse uç nokta tamamen kapalıdır. Cloudflare Cron
 * Trigger'ından veya harici bir zamanlayıcıdan dakikada bir çağrılır.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return Response.json(
      { error: 'cron_disabled' },
      { status: 503, headers: NO_STORE },
    );
  }

  const provided = request.headers.get('x-cron-secret') ?? '';
  if (!timingSafeEqual(provided, secret)) {
    return Response.json(
      { error: 'unauthorized' },
      { status: 401, headers: NO_STORE },
    );
  }

  try {
    const summary = await drainOutbox(50);
    return Response.json(summary, { headers: NO_STORE });
  } catch {
    return Response.json(
      { error: 'drain_failed' },
      { status: 503, headers: NO_STORE },
    );
  }
}
