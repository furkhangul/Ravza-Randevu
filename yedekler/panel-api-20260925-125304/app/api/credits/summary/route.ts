import { ensureDemoDatabase } from '@/db/demo';
import { ensureQuoteDatabase } from '@/db/quotes';
import { env } from 'cloudflare:workers';
import { authorizeApi } from '@/lib/app-auth';

const NO_STORE = { 'cache-control': 'private, no-store' } as const;

/**
 * Ravza randevu hakkı özeti tek kaynaktır: defterin toplamı bakiyeyi, onaylanmış ama
 * henüz teslim edilmemiş talepler rezerveyi verir. İstemci hiçbir
 * toplama yapmaz; ekranlar arasında farklı rakam çıkmasın diye.
 */
export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok)
    return Response.json(
      { error: auth.error },
      { status: auth.status, headers: NO_STORE },
    );

  try {
    const db = await ensureDemoDatabase();
    const [inflow, outflow, balance] = await Promise.all([
      db
        .prepare(
          'SELECT COALESCE(SUM(amount), 0) AS total FROM demo_ledger WHERE amount > 0',
        )
        .first<{ total: number }>(),
      db
        .prepare(
          'SELECT COALESCE(SUM(amount), 0) AS total FROM demo_ledger WHERE amount < 0',
        )
        .first<{ total: number }>(),
      db
        .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM demo_ledger')
        .first<{ total: number }>(),
    ]);

    let reserved = 0;
    try {
      await ensureQuoteDatabase();
      const row = await env.DB.prepare(
        `SELECT COALESCE(SUM(person_count), 0) AS total FROM quote_requests
         WHERE status IN ('confirmed', 'scheduled')`,
      ).first<{ total: number }>();
      reserved = row?.total ?? 0;
    } catch {
      // Talep tablosu henüz yoksa rezerve sıfırdır; bakiye yine doğrudur.
    }

    return Response.json(
      {
        purchased: inflow?.total ?? 0,
        used: Math.abs(outflow?.total ?? 0),
        reserved,
        remaining: balance?.total ?? 0,
      },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'credit_summary_unavailable' },
      { status: 503, headers: NO_STORE },
    );
  }
}

