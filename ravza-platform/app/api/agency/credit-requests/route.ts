import { agencyBalance, createCreditRequest, listCreditRequests } from '@/db/agencies';
import { requireAgencyApi } from '@/lib/agency-auth';
import { parseCreditRequest } from '@/lib/agency-validation';
import { notifyCreditRequested } from '@/lib/notify';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'cache-control': 'private, no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
const MAX_PENDING = 5;

/** Acentenin kontör talebi; yönetici onaylayınca bakiyeye eklenir. */
export async function POST(request: Request) {
  const auth = await requireAgencyApi();
  if (!auth.ok) return auth.response;
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'invalid_origin' }, 403);
  if (auth.context.member.role !== 'owner') return reply({ error: 'Kontör talebini acente sahibi yapabilir.' }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: 'Geçersiz istek.' }, 400);
  }
  const parsed = parseCreditRequest(body);
  if (!parsed.ok) return reply({ error: parsed.error, field: parsed.field }, 400);
  try {
    const pending = (await listCreditRequests(auth.context.agency.id)).filter((item) => item.status === 'pending');
    if (pending.length >= MAX_PENDING)
      return reply({ error: `En fazla ${MAX_PENDING} bekleyen talebiniz olabilir. Önce mevcut talepler sonuçlansın.` }, 409);
    const requestId = await createCreditRequest({
      agencyId: auth.context.agency.id,
      quantity: parsed.value.quantity,
      note: parsed.value.note,
      requestedBy: auth.context.member.id,
    });
    await notifyCreditRequested(auth.context.agency, {
      requestId,
      quantity: parsed.value.quantity,
      note: parsed.value.note,
      requestedBy: auth.context.member.fullName,
      balance: await agencyBalance(auth.context.agency.id),
    });
    return reply({ ok: true }, 201);
  } catch {
    return reply({ error: 'Talep şu anda alınamadı.' }, 503);
  }
}
