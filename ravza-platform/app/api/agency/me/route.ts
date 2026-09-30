import { agencyBalance, listAgencyBookings, listCreditRequests, listLedger } from '@/db/agencies';
import { requireAgencyApi } from '@/lib/agency-auth';
import { agencyFulfillmentEnabled, agencyQrReadiness } from '@/lib/agency-fulfillment';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'cache-control': 'private, no-store' };

/** Acente panelinin tüm verisi; yalnız oturumdaki acenteye ait kayıtlar. */
export async function GET() {
  const auth = await requireAgencyApi();
  if (!auth.ok) return auth.response;
  const { agency, member } = auth.context;
  try {
    const [balance, requests, bookings, ledger] = await Promise.all([
      agencyBalance(agency.id),
      listCreditRequests(agency.id),
      listAgencyBookings(agency.id, 200),
      listLedger(agency.id, 100),
    ]);
    const readiness = await agencyQrReadiness(bookings).catch(() => ({}));
    return Response.json(
      {
        agency: {
          companyName: agency.companyName,
          taxNumber: agency.taxNumber,
          contactName: agency.contactName,
          contactEmail: agency.contactEmail,
          contactPhone: agency.contactPhone,
          approvedAt: agency.approvedAt,
        },
        member: { fullName: member.fullName, email: member.email, role: member.role },
        balance,
        enabled: agencyFulfillmentEnabled(),
        requests: requests.map(({ id, quantity, note, status, approvedQuantity, decisionNote, createdAt, decidedAt }) => ({
          id, quantity, note, status, approvedQuantity, decisionNote, createdAt, decidedAt,
        })),
        bookings: bookings.map((booking) => ({
          id: booking.id,
          groupName: booking.groupName,
          gender: booking.gender,
          dateKey: booking.dateKey,
          timeSlot: booking.timeSlot,
          quantity: booking.quantity,
          status: booking.status,
          shareUrl: booking.shareUrl,
          createdAt: booking.createdAt,
          qr: (readiness as Record<string, { total: number; withQr: number }>)[booking.id] ?? null,
        })),
        ledger: ledger.map(({ id, amount, type, note, createdAt }) => ({ id, amount, type, note, createdAt })),
      },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
