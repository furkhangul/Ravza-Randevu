import { findQuoteByCode, listQuoteEvents } from '@/db/quotes';
import { sha256Hex } from '@/lib/auth-crypto';
import { isQuoteCode, phoneLastFour } from '@/lib/quote-request';
import { customerQrLinks, qrReadiness } from '@/lib/rawdah-fulfillment';
import { env } from '@/lib/server-env';

const NO_STORE = { 'cache-control': 'private, no-store' } as const;

/**
 * Yanıt Ravza giriş QR bağlantılarını taşıyabildiği için, telefonun son dört
 * hanesini deneyerek bulmak engellenir: 15 dakikada talep kodu başına 10,
 * IP başına 30 sorgu.
 */
const WINDOW_SECONDS = 15 * 60;
async function overLimit(key: string, max: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % WINDOW_SECONDS);
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

/**
 * Talep durumu sorgusu. Kod tek başına yeterli değildir: telefonun son
 * dört hanesi de istenir, böylece kod ele geçse bile kişisel veri
 * açılmaz. Yanıt yalnız durum ve özet alanları taşır; ad, telefon ve not
 * hiçbir koşulda dönmez.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: 'Geçersiz istek.' },
      { status: 400, headers: NO_STORE },
    );
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const last4 =
    typeof body.phoneLast4 === 'string' ? body.phoneLast4.replace(/\D/g, '') : '';

  if (!isQuoteCode(code) || last4.length !== 4)
    return Response.json(
      { error: 'Talep kodu veya telefon son dört hane hatalı.' },
      { status: 400, headers: NO_STORE },
    );

  try {
    const ip = request.headers.get('cf-connecting-ip') || 'local';
    if (
      (await overLimit(`quote-lookup-code:${code}`, 10)) ||
      (await overLimit(`quote-lookup-ip:${ip}`, 30))
    )
      return Response.json(
        { error: 'Çok fazla deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429, headers: NO_STORE },
      );

    const record = await findQuoteByCode(code);
    // Bulunamayan kayıt ile eşleşmeyen telefon aynı yanıtı döndürür;
    // aksi hâlde geçerli kodlar numara denenerek tespit edilebilirdi.
    if (!record || phoneLastFour(record.phone) !== last4)
      return Response.json(
        { error: 'Talep bulunamadı. Kodu ve telefon numaranızı kontrol edin.' },
        { status: 404, headers: NO_STORE },
      );

    const events = await listQuoteEvents(record.id);
    // QR bağlantısı okunamasa bile durum bilgisi gösterilmeye devam eder.
    const qrLinks = await customerQrLinks(record).catch(() => []);
    const qrReady = qrLinks.length ? await qrReadiness(record).catch(() => []) : [];
    return Response.json(
      {
        code: record.code,
        status: record.status,
        service: record.service,
        packageCode: record.packageCode,
        personCount: record.personCount,
        femaleCount: record.femaleCount,
        maleCount: record.maleCount,
        dateFrom: record.dateFrom,
        dateTo: record.dateTo,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        qrLinks: qrLinks.map((link) => {
          const ready = qrReady.find((item) => item.gender === link.gender);
          return { ...link, ready: ready ? ready.withQr >= ready.total && ready.total > 0 : null };
        }),
        history: events
          .filter((event) => event.type === 'status_change' && event.toStatus)
          .map((event) => ({
            status: event.toStatus,
            createdAt: event.createdAt,
          })),
      },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'Sorgu şu anda yapılamıyor.' },
      { status: 503, headers: NO_STORE },
    );
  }
}
