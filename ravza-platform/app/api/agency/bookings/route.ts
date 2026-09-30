import { agencyBalance } from '@/db/agencies';
import { requireAgencyApi } from '@/lib/agency-auth';
import { agencyFulfillmentEnabled, purchaseForAgency, syncAgencyBookings } from '@/lib/agency-fulfillment';
import { parseAgencyPurchase } from '@/lib/agency-validation';
import { notifyAgencyBooking } from '@/lib/notify';
import { riyadhToday } from '@/lib/date-validation';
import { overRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'cache-control': 'private, no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

/**
 * action=purchase: acente kontörüyle RawdahBooking'den randevu alır ve QR bağlantısı oluşturur.
 * action=sync: yarım kalan randevuların QR bağlantısını tamamlar (yeniden satın almaz).
 */
export async function POST(request: Request) {
  const auth = await requireAgencyApi();
  if (!auth.ok) return auth.response;
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'invalid_origin' }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: 'Geçersiz istek.' }, 400);
  }
  const { agency } = auth.context;
  try {
    if (!agencyFulfillmentEnabled()) return reply({ error: 'Randevu alma şu anda kapalı. Lütfen bizimle iletişime geçin.' }, 409);
    if (body.action === 'sync') {
      await syncAgencyBookings(agency.id);
      return reply({ ok: true });
    }
    if (body.action !== 'purchase') return reply({ error: 'invalid_action' }, 400);
    if (await overRateLimit(`agency-purchase:${agency.id}`, 20, 60))
      return reply({ error: 'Çok fazla işlem. Bir dakika sonra tekrar deneyin.' }, 429);
    const parsed = parseAgencyPurchase(body, riyadhToday());
    if (!parsed.ok) return reply({ error: parsed.error, field: parsed.field }, 400);
    const needed = (parsed.value.female?.count ?? 0) + (parsed.value.male?.count ?? 0);
    const balance = await agencyBalance(agency.id);
    if (balance < needed)
      return reply({ error: `Yetersiz kontör: ${needed} gerekli, bakiyeniz ${balance}. Kontör talep edebilirsiniz.` }, 409);
    const results = await purchaseForAgency(auth.context, parsed.value);
    const balanceAfter = await agencyBalance(agency.id);
    await notifyAgencyBooking(agency, auth.context.member, {
      reference: results.map((item) => item.bookingId).join('+'),
      groupName: parsed.value.groupName,
      dateKey: parsed.value.dateKey,
      used: results
        .filter((item) => item.status !== 'failed' && item.status !== 'insufficient')
        .reduce((sum, item) => sum + (parsed.value[item.gender]?.count ?? 0), 0),
      balance: balanceAfter,
      links: results.map((item) => ({
        gender: item.gender,
        time: parsed.value[item.gender]?.timeSlot ?? '',
        count: parsed.value[item.gender]?.count ?? 0,
        url: item.shareUrl,
      })),
    });
    return reply({ results, balance: balanceAfter });
  } catch {
    return reply({ error: 'İşlem tamamlanamadı. Randevular listesinden durumu kontrol edin; tekrar satın almadan önce bize danışın.' }, 503);
  }
}
