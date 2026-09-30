import {
  countQuoteStatuses,
  deleteQuoteRequest,
  findQuoteByCode,
  listQuoteEvents,
  listQuoteRequests,
  setQuoteCommercials,
  updateQuoteDetails,
  updateQuoteStatus,
} from '@/db/quotes';
import { deleteRawdahDataForQuote, listBookings } from '@/db/rawdah-bookings';
import { createFeedbackInvite } from '@/db/feedback';
import { authorizeApi } from '@/lib/app-auth';
import { canTransition, parseQuoteEdit, type QuoteStatus } from '@/lib/quote-request';

const NO_STORE = { 'cache-control': 'private, no-store' } as const;

const statuses: QuoteStatus[] = [
  'new',
  'contacted',
  'quoted',
  'confirmed',
  'scheduled',
  'qr_ready',
  'delivered',
  'closed',
  'cancelled',
  'expired',
];

/**
 * Operasyon listesi. Ad ve telefon yalnız talebi yürüten ekip için
 * döner; yanıt `no-store` ile servis edilir ve hiçbir alan log'lanmaz.
 */
export async function GET(request: Request) {
  const auth = await authorizeApi();
  if (!auth.ok)
    return Response.json(
      { error: auth.error },
      { status: auth.status, headers: NO_STORE },
    );

  const url = new URL(request.url);
  const requested = url.searchParams.get('durum');
  const status = statuses.includes(requested as QuoteStatus)
    ? (requested as QuoteStatus)
    : undefined;

  try {
    const [requests, counts] = await Promise.all([
      listQuoteRequests({ status, limit: 100 }),
      countQuoteStatuses(),
    ]);
    return Response.json({ requests, counts }, { headers: NO_STORE });
  } catch {
    return Response.json(
      { error: 'quote_requests_unavailable' },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeApi(['SUPER_ADMIN', 'AGENCY_ADMIN']);
  if (!auth.ok)
    return Response.json(
      { error: auth.error },
      { status: auth.status, headers: NO_STORE },
    );

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: 'invalid_body' },
      { status: 400, headers: NO_STORE },
    );
  }

  const code = typeof body.code === 'string' ? body.code : '';
  const toStatus = body.status as QuoteStatus | undefined;
  let feedbackInviteUrl: string | null = null;

  try {
    const record = await findQuoteByCode(code);
    if (!record)
      return Response.json(
        { error: 'not_found' },
        { status: 404, headers: NO_STORE },
      );

    if (
      typeof body.quotedAmountMinor !== 'undefined' ||
      typeof body.paymentMethod !== 'undefined'
    ) {
      const amount = Number(body.quotedAmountMinor);
      await setQuoteCommercials(record.id, {
        quotedAmountMinor:
          Number.isInteger(amount) && amount >= 0 ? amount : null,
        paymentMethod:
          body.paymentMethod === 'cash' ||
          body.paymentMethod === 'transfer' ||
          body.paymentMethod === 'other'
            ? body.paymentMethod
            : null,
        paymentNote:
          typeof body.paymentNote === 'string'
            ? body.paymentNote.slice(0, 300)
            : null,
        assignedTo: auth.user.displayName,
      });
    }

    if (toStatus) {
      if (!statuses.includes(toStatus))
        return Response.json(
          { error: 'invalid_status' },
          { status: 400, headers: NO_STORE },
        );
      if (!canTransition(record.status, toStatus))
        return Response.json(
          { error: 'transition_not_allowed', from: record.status },
          { status: 409, headers: NO_STORE },
        );
      // Ravza talebi "QR hazır"a yalnız gerçek QR bağlantısı oluşunca geçer
      // (lib/rawdah-fulfillment); elle geçiş müşteriye QR'sız "hazır" gösterirdi.
      if (toStatus === 'qr_ready' && record.service !== 'umrah')
        return Response.json(
          { error: 'qr_required', from: record.status },
          { status: 409, headers: NO_STORE },
        );
      await updateQuoteStatus(
        record.id,
        toStatus,
        record.status,
        auth.user.displayName,
        typeof body.note === 'string' ? body.note.slice(0, 300) : null,
      );

      // Teslimden sonra tek kullanımlık geri bildirim daveti açılır.
      // Ham jeton yalnız bu yanıtta döner ve veritabanında saklanmaz;
      // operasyon bağlantıyı müşteriye kendisi iletir.
      if (toStatus === 'delivered') {
        const invite = await createFeedbackInvite({
          quoteRequestId: record.id,
          quoteCode: record.code,
          fullName: record.fullName,
        });
        // APP_URL tanımlı değilse isteğin kendi kökü kullanılır; operasyonun
        // panoya kopyalayıp gönderebileceği tam bir adres gerekir.
        const origin =
          (process.env.APP_URL ?? '').replace(/\/$/, '') ||
          new URL(request.url).origin;
        feedbackInviteUrl = `${origin}/geri-bildirim/${invite.token}`;
      }
    }

    const updated = await findQuoteByCode(code);
    const events = updated ? await listQuoteEvents(updated.id) : [];
    return Response.json(
      { request: updated, events, feedbackInviteUrl },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'quote_update_failed' },
      { status: 503, headers: NO_STORE },
    );
  }
}

const EDIT_ROLES = ['SUPER_ADMIN', 'AGENCY_ADMIN'] as const;

function sameOrigin(request: Request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}

/** RawdahBooking'den satın alma yapılmış (veya sonucu belirsiz) talep mi? */
async function hasActiveBooking(quoteRequestId: string) {
  const bookings = await listBookings(quoteRequestId).catch(() => []);
  return bookings.some((booking) => booking.status !== 'failed');
}

/**
 * Talep bilgilerini düzenler. Satın alma yapılmış talepte kişi dağılımı ve
 * tarih değiştirilemez: randevu RawdahBooking'de bu bilgilerle alınmıştır.
 */
export async function PUT(request: Request) {
  const auth = await authorizeApi([...EDIT_ROLES]);
  if (!auth.ok)
    return Response.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });
  if (!sameOrigin(request))
    return Response.json({ error: 'invalid_origin' }, { status: 403, headers: NO_STORE });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400, headers: NO_STORE });
  }

  try {
    const record = await findQuoteByCode(typeof body.code === 'string' ? body.code : '');
    if (!record) return Response.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
    const changes = typeof body.changes === 'object' && body.changes ? (body.changes as Record<string, unknown>) : {};
    const parsed = parseQuoteEdit(changes, record);
    if (!parsed.ok)
      return Response.json({ error: parsed.error, field: parsed.field }, { status: 400, headers: NO_STORE });

    const touchesBooking =
      (parsed.value.femaleCount !== undefined &&
        (parsed.value.femaleCount !== record.femaleCount || parsed.value.maleCount !== record.maleCount)) ||
      (parsed.value.dateFrom !== undefined &&
        (parsed.value.dateFrom !== record.dateFrom || parsed.value.dateTo !== record.dateTo));
    if (touchesBooking && (await hasActiveBooking(record.id)))
      return Response.json(
        {
          error:
            'Bu talep için RawdahBooking randevusu alındı; kişi sayısı ve tarih değiştirilemez.',
          field: 'femaleCount',
        },
        { status: 409, headers: NO_STORE },
      );

    await updateQuoteDetails(record.id, parsed.value, auth.user.displayName);
    const updated = await findQuoteByCode(record.code);
    return Response.json({ request: updated }, { headers: NO_STORE });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}

/**
 * Talebi kalıcı olarak siler (geçmiş, geri bildirim daveti, saat tercihi ve
 * satın alma kaydı dahil). RawdahBooking'deki randevu etkilenmez; bu yüzden
 * satın alınmış talepte istemci ayrıca `confirmBooked: true` göndermelidir.
 */
export async function DELETE(request: Request) {
  const auth = await authorizeApi([...EDIT_ROLES]);
  if (!auth.ok)
    return Response.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });
  if (!sameOrigin(request))
    return Response.json({ error: 'invalid_origin' }, { status: 403, headers: NO_STORE });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400, headers: NO_STORE });
  }

  try {
    const record = await findQuoteByCode(typeof body.code === 'string' ? body.code : '');
    if (!record) return Response.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
    if ((await hasActiveBooking(record.id)) && body.confirmBooked !== true)
      return Response.json({ error: 'booked_confirmation_required' }, { status: 409, headers: NO_STORE });

    await deleteRawdahDataForQuote(record.id);
    await deleteQuoteRequest(record.id);
    return Response.json({ ok: true, code: record.code }, { headers: NO_STORE });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
