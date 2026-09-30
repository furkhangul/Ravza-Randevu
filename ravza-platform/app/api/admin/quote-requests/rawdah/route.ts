import { findQuoteByCode } from '@/db/quotes';
import { getSlotPreference, listBookings } from '@/db/rawdah-bookings';
import { authorizeApi } from '@/lib/app-auth';
import { isValidIsoDate } from '@/lib/date-validation';
import {
  fulfillmentEnabled,
  neededBookings,
  PURCHASABLE_STATUSES,
  purchaseForQuote,
  qrReadiness,
  releaseUnknownBooking,
  syncQuoteBookings,
} from '@/lib/rawdah-fulfillment';
import {
  createLiveRawdahProviderFromEnv,
  type LiveRawdahReadOnlyProvider,
} from '@/packages/provider-rawdah/src';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };
const ADMIN_ROLES = ['SUPER_ADMIN', 'AGENCY_ADMIN'] as const;

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

async function readBalance(): Promise<number | null> {
  try {
    const provider = createLiveRawdahProviderFromEnv() as LiveRawdahReadOnlyProvider;
    return await provider.getAppointmentBalance();
  } catch {
    return null;
  }
}

async function snapshot(code: string) {
  const record = await findQuoteByCode(code);
  if (!record) return null;
  const [preference, bookings, balance, qr] = await Promise.all([
    getSlotPreference(record.id),
    listBookings(record.id),
    readBalance(),
    qrReadiness(record).catch(() => []),
  ]);
  return {
    code: record.code,
    status: record.status,
    enabled: fulfillmentEnabled(),
    purchasable: PURCHASABLE_STATUSES.includes(record.status),
    balance,
    preference,
    needed: neededBookings(record).map(([gender, count]) => ({ gender, count })),
    bookings,
    qr,
  };
}

/** Talebin Ravza randevusu durumu: tercih, satın alımlar, kontör bakiyesi. */
export async function GET(request: Request) {
  const auth = await authorizeApi([...ADMIN_ROLES]);
  if (!auth.ok) return reply({ error: auth.error }, auth.status);
  const code = new URL(request.url).searchParams.get('code') ?? '';
  try {
    const data = await snapshot(code);
    return data ? reply(data) : reply({ error: 'not_found' }, 404);
  } catch {
    return reply({ error: 'unavailable' }, 503);
  }
}

/**
 * action=purchase: RawdahBooking'den satın alır (kişi başı 1 kontör) ve QR
 *   bağlantısını oluşturur.
 * action=sync: belirsiz veya yarım kalan kayıtları sağlayıcıdan okuyarak tamamlar.
 * action=release: yönetici satın almanın olmadığını doğruladığında belirsiz
 *   kaydı serbest bırakır.
 */
export async function POST(request: Request) {
  const auth = await authorizeApi([...ADMIN_ROLES]);
  if (!auth.ok) return reply({ error: auth.error }, auth.status);
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return reply({ error: 'invalid_origin' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: 'invalid_body' }, 400);
  }
  const code = typeof body.code === 'string' ? body.code : '';
  const action = body.action;
  const gender = body.gender === 'female' || body.gender === 'male' ? body.gender : null;

  try {
    const record = await findQuoteByCode(code);
    if (!record) return reply({ error: 'not_found' }, 404);

    if (action === 'purchase') {
      if (!fulfillmentEnabled()) return reply({ error: 'fulfillment_disabled' }, 409);
      if (!PURCHASABLE_STATUSES.includes(record.status)) {
        return reply({ error: 'status_not_purchasable', status: record.status }, 409);
      }
      const dateKey = typeof body.dateKey === 'string' ? body.dateKey : '';
      const timeSlot = typeof body.timeSlot === 'string' ? body.timeSlot : '';
      if (!gender || !isValidIsoDate(dateKey) || !/^\d{2}:\d{2}$/.test(timeSlot)) {
        return reply({ error: 'invalid_slot' }, 400);
      }
      const outcome = await purchaseForQuote(record, { gender, dateKey, timeSlot });
      const data = await snapshot(code);
      return reply({ ...data, outcome }, outcome.ok ? 200 : 409);
    }

    if (action === 'sync') {
      if (!fulfillmentEnabled()) return reply({ error: 'fulfillment_disabled' }, 409);
      await syncQuoteBookings(record);
      return reply(await snapshot(code));
    }

    if (action === 'release') {
      if (!gender) return reply({ error: 'invalid_gender' }, 400);
      const released = await releaseUnknownBooking(record, gender);
      return reply({ ...(await snapshot(code)), released });
    }

    return reply({ error: 'invalid_action' }, 400);
  } catch {
    return reply({ error: 'unavailable' }, 503);
  }
}
