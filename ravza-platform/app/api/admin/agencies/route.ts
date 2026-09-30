import {
  addLedgerEntry,
  agencyBalance,
  decideCreditRequest,
  getAgency,
  getCreditRequest,
  listAgencyBookings,
  listAgencySummaries,
  listCreditRequests,
  listLedger,
  listMembers,
  findAgencyMember,
  resetMemberPassword,
  setAgencyNote,
  setMemberStatus,
  setAgencyStatus,
  totalOutstandingCredits,
} from '@/db/agencies';
import { authorizeApi } from '@/lib/app-auth';
import { hashPassword } from '@/lib/auth-crypto';
import {
  notifyAgencyApproved,
  notifyAgencyRejected,
  notifyCreditRequestRejected,
  notifyCreditsLoaded,
  notifyPasswordReset,
} from '@/lib/notify';
import { temporaryPassword } from '@/lib/temp-password';
import { refundAgencyBooking, syncAgencyBookings } from '@/lib/agency-fulfillment';
import { MAX_CREDIT_REQUEST } from '@/lib/agency-validation';
import {
  createLiveRawdahProviderFromEnv,
  type LiveRawdahReadOnlyProvider,
} from '@/packages/provider-rawdah/src';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
const ADMIN_ROLES = ['SUPER_ADMIN', 'AGENCY_ADMIN'] as const;

async function masterBalance(): Promise<number | null> {
  try {
    return await (createLiveRawdahProviderFromEnv() as LiveRawdahReadOnlyProvider).getAppointmentBalance();
  } catch {
    return null;
  }
}

/**
 * Liste: tüm acenteler, bekleyen kontör talepleri ve özet (dağıtılan kontör ↔
 * RawdahBooking gerçek bakiyesi). `?id=` ile tek acentenin ayrıntısı.
 */
export async function GET(request: Request) {
  const auth = await authorizeApi([...ADMIN_ROLES]);
  if (!auth.ok) return reply({ error: auth.error }, auth.status);
  const id = new URL(request.url).searchParams.get('id');
  try {
    if (id) {
      const agency = await getAgency(id);
      if (!agency) return reply({ error: 'not_found' }, 404);
      const [members, balance, ledger, requests, bookings] = await Promise.all([
        listMembers(id),
        agencyBalance(id),
        listLedger(id, 200),
        listCreditRequests(id),
        listAgencyBookings(id, 200),
      ]);
      return reply({
        agency,
        balance,
        members: members.map(({ id: memberId, email, fullName, phone, role, status, lastLoginAt, createdAt }) => ({
          id: memberId, email, fullName, phone, role, status, lastLoginAt, createdAt,
        })),
        ledger,
        requests,
        bookings,
      });
    }
    const [agencies, requests, outstanding, master] = await Promise.all([
      listAgencySummaries(),
      listCreditRequests(),
      totalOutstandingCredits(),
      masterBalance(),
    ]);
    const names = Object.fromEntries(agencies.map((agency) => [agency.id, agency.companyName]));
    return reply({
      agencies,
      pendingRequests: requests
        .filter((item) => item.status === 'pending')
        .map((item) => ({ ...item, companyName: names[item.agencyId] ?? '—' })),
      outstanding,
      masterBalance: master,
    });
  } catch {
    return reply({ error: 'unavailable' }, 503);
  }
}

const int = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};
const note = (value: unknown, max = 300) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

/** Yönetici işlemleri. Kontör yüklemeleri (tür, referans) tekilliğiyle çift işlenmez. */
export async function POST(request: Request) {
  const auth = await authorizeApi([...ADMIN_ROLES]);
  if (!auth.ok) return reply({ error: auth.error }, auth.status);
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'invalid_origin' }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: 'invalid_body' }, 400);
  }
  const actor = `admin:${auth.user.displayName}`;
  const id = typeof body.id === 'string' ? body.id : '';

  try {
    switch (body.action) {
      case 'approve': {
        const agency = await getAgency(id);
        if (!agency) return reply({ error: 'not_found' }, 404);
        if (agency.status !== 'pending' && agency.status !== 'rejected')
          return reply({ error: 'Bu acente zaten onaylanmış veya askıda.' }, 409);
        const credits = int(body.credits) ?? 0;
        if (credits < 0 || credits > MAX_CREDIT_REQUEST) return reply({ error: 'Kontör miktarı geçersiz.' }, 400);
        await setAgencyStatus({ id, status: 'active', actor });
        // Başvurudaki ilk kontör talebi varsa onunla, yoksa doğrudan yükleme olarak işlenir.
        const pending = (await listCreditRequests(id)).filter((item) => item.status === 'pending');
        const first = pending.at(-1);
        if (credits > 0) {
          if (first) {
            await decideCreditRequest({
              id: first.id,
              status: 'approved',
              approvedQuantity: credits,
              unitPriceMinor: int(body.unitPriceMinor),
              paymentNote: note(body.paymentNote),
              decisionNote: 'Acente onayıyla birlikte',
              decidedBy: actor,
            });
          }
          await addLedgerEntry({
            agencyId: id,
            amount: credits,
            type: 'allocation',
            reference: first ? first.id : `approval-${id}`,
            note: 'Acente onayı ile kontör yüklemesi',
            actor,
          });
        }
        const balanceAfterApproval = await agencyBalance(id);
        await notifyAgencyApproved(agency, credits, balanceAfterApproval);
        return reply({ ok: true, balance: balanceAfterApproval });
      }
      case 'reject': {
        const reason = note(body.reason);
        if (!reason) return reply({ error: 'Red sebebi yazın; acente giriş yaparken bu sebebi görür.' }, 400);
        const target = await getAgency(id);
        if (!target) return reply({ error: 'not_found' }, 404);
        await setAgencyStatus({ id, status: 'rejected', actor, rejectReason: reason });
        await notifyAgencyRejected(target, reason);
        return reply({ ok: true });
      }
      case 'suspend':
      case 'activate': {
        const agency = await getAgency(id);
        if (!agency) return reply({ error: 'not_found' }, 404);
        if (body.action === 'activate' && agency.status !== 'suspended')
          return reply({ error: 'Yalnız askıdaki acente aktifleştirilebilir.' }, 409);
        await setAgencyStatus({ id, status: body.action === 'suspend' ? 'suspended' : 'active', actor });
        return reply({ ok: true });
      }
      case 'approveRequest': {
        const requestId = typeof body.requestId === 'string' ? body.requestId : '';
        const credit = await getCreditRequest(requestId);
        if (!credit) return reply({ error: 'not_found' }, 404);
        const agency = await getAgency(credit.agencyId);
        if (!agency || agency.status !== 'active') return reply({ error: 'Önce acenteyi onaylayın.' }, 409);
        const quantity = int(body.quantity) ?? credit.quantity;
        if (quantity < 1 || quantity > MAX_CREDIT_REQUEST) return reply({ error: 'Kontör miktarı geçersiz.' }, 400);
        const decided = await decideCreditRequest({
          id: credit.id,
          status: 'approved',
          approvedQuantity: quantity,
          unitPriceMinor: int(body.unitPriceMinor),
          paymentNote: note(body.paymentNote),
          decisionNote: note(body.decisionNote),
          decidedBy: actor,
        });
        if (!decided) return reply({ error: 'Bu talep zaten sonuçlanmış.' }, 409);
        await addLedgerEntry({
          agencyId: credit.agencyId,
          amount: quantity,
          type: 'allocation',
          reference: credit.id,
          note: `Kontör talebi onayı${note(body.paymentNote) ? ` · ${note(body.paymentNote)}` : ''}`,
          actor,
        });
        const balanceAfterRequest = await agencyBalance(credit.agencyId);
        await notifyCreditsLoaded(agency, {
          reference: credit.id,
          quantity,
          balance: balanceAfterRequest,
          note: note(body.paymentNote) ?? 'Kontör talebiniz onaylandı',
        });
        return reply({ ok: true, balance: balanceAfterRequest });
      }
      case 'rejectRequest': {
        const requestId = typeof body.requestId === 'string' ? body.requestId : '';
        const rejectedRequest = await getCreditRequest(requestId);
        const decided = await decideCreditRequest({
          id: requestId,
          status: 'rejected',
          approvedQuantity: null,
          unitPriceMinor: null,
          paymentNote: null,
          decisionNote: note(body.decisionNote),
          decidedBy: actor,
        });
        if (!decided || !rejectedRequest) return reply({ error: 'Talep bulunamadı veya zaten sonuçlanmış.' }, 409);
        const requestAgency = await getAgency(rejectedRequest.agencyId);
        if (requestAgency)
          await notifyCreditRequestRejected(requestAgency, {
            requestId,
            quantity: rejectedRequest.quantity,
            reason: note(body.decisionNote) ?? '',
          });
        return reply({ ok: true });
      }
      case 'adjust': {
        const agency = await getAgency(id);
        if (!agency) return reply({ error: 'not_found' }, 404);
        const amount = int(body.amount);
        const reason = note(body.note);
        if (!amount || Math.abs(amount) > MAX_CREDIT_REQUEST) return reply({ error: 'Miktar geçersiz.' }, 400);
        if (!reason) return reply({ error: 'Açıklama yazın (neden eklendi / düşüldü).' }, 400);
        const balance = await agencyBalance(id);
        if (balance + amount < 0) return reply({ error: `Bakiye eksiye düşemez (mevcut ${balance}).` }, 409);
        const reference = `adj-${crypto.randomUUID()}`;
        await addLedgerEntry({ agencyId: id, amount, type: 'adjustment', reference, note: reason, actor });
        const balanceAfterAdjust = await agencyBalance(id);
        if (amount > 0) await notifyCreditsLoaded(agency, { reference, quantity: amount, balance: balanceAfterAdjust, note: reason });
        return reply({ ok: true, balance: balanceAfterAdjust });
      }
      case 'refundBooking': {
        const bookingId = typeof body.bookingId === 'string' ? body.bookingId : '';
        const refunded = await refundAgencyBooking(bookingId, actor);
        return refunded ? reply({ ok: true }) : reply({ error: 'Yalnız sonucu belirsiz randevu iade edilebilir.' }, 409);
      }
      case 'sync': {
        const changed = await syncAgencyBookings(id || undefined);
        return reply({ ok: true, changed });
      }
      case 'resetPassword': {
        const memberId = typeof body.memberId === 'string' ? body.memberId : '';
        const member = (await listMembers(id)).find((item) => item.id === memberId);
        if (!member) return reply({ error: 'not_found' }, 404);
        const temporary = temporaryPassword();
        await resetMemberPassword(member.id, await hashPassword(temporary));
        const memberAgency = await getAgency(id);
        if (memberAgency) await notifyPasswordReset(memberAgency, member, temporary);
        return reply({ ok: true, temporaryPassword: temporary, email: member.email });
      }
      case 'setMemberStatus': {
        const memberId = typeof body.memberId === 'string' ? body.memberId : '';
        const status = body.status === 'suspended' ? 'suspended' : 'active';
        const member = await findAgencyMember(id, memberId);
        if (!member) return reply({ error: 'not_found' }, 404);
        await setMemberStatus(member.id, status);
        return reply({ ok: true });
      }
      case 'note': {
        await setAgencyNote(id, note(body.note, 1000));
        return reply({ ok: true });
      }
      default:
        return reply({ error: 'invalid_action' }, 400);
    }
  } catch {
    return reply({ error: 'unavailable' }, 503);
  }
}
