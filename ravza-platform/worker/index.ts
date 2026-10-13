import handler from 'vinext/server/fetch-handler';

type Env = {
  APP_URL?: string;
  CRON_SECRET?: string;
  EMAIL_API_KEY?: string;
  SMS_API_KEY?: string;
};

const CANONICAL_HOST = 'ravzarandevu.com.tr';
const CANONICAL_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`]);

/**
 * Cloudflare Worker girişi: istekleri vinext'e bırakır, ayrıca dakikada bir
 * bildirim kuyruğunu işler (`/api/cron/notifications`).
 *
 * Kuyruk yalnız bir e-posta veya SMS sağlayıcısı tanımlıyken işlenir; aksi
 * hâlde bekleyen bildirimler "sağlayıcı yok" diye atlanır ve bir daha
 * gönderilmezdi. Anahtar eklendiğinde bekleyenler sırayla gönderilir.
 */
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // SEO: www ve http kopyaları tek kanonik adrese kalıcı yönlendirilir.
    const url = new URL(request.url);
    if (
      CANONICAL_HOSTS.has(url.hostname) &&
      (url.hostname !== CANONICAL_HOST || url.protocol !== 'https:')
    ) {
      url.hostname = CANONICAL_HOST;
      url.protocol = 'https:';
      const status = request.method === 'GET' || request.method === 'HEAD' ? 301 : 308;
      return Response.redirect(url.toString(), status);
    }
    return handler.fetch(request, env, ctx);
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const secret = env.CRON_SECRET?.trim();
    if (!secret || !(env.EMAIL_API_KEY || env.SMS_API_KEY)) return;
    const origin = (env.APP_URL || 'https://ravzarandevu.com.tr').replace(/\/$/, '');
    const request = new Request(`${origin}/api/cron/notifications`, {
      method: 'POST',
      headers: { 'x-cron-secret': secret },
    });
    ctx.waitUntil(Promise.resolve(handler.fetch(request, env, ctx)));
  },
};
