import { findMemberById, getAgency, type Agency, type AgencyMember } from '@/db/agencies';
import { getSessionUser } from '@/lib/session';

export type AgencyContext = { member: AgencyMember; agency: Agency };

/**
 * Acente portalı kimliği. Yalnız `agency` oturumu kabul edilir; üye ve acente
 * aktif olmalıdır. Bütün acente verileri bu bağlamdaki `agency.id` ile
 * sınırlanır; istemciden gelen acente kimliğine hiçbir zaman güvenilmez.
 */
export async function getAgencyContext(): Promise<AgencyContext | null> {
  const session = await getSessionUser();
  if (!session || session.audience !== 'agency' || !session.userId.startsWith('agency:')) return null;
  const member = await findMemberById(session.userId.slice(7));
  if (!member || member.status !== 'active') return null;
  const agency = await getAgency(member.agencyId);
  if (!agency || agency.status !== 'active') return null;
  return { member, agency };
}

export async function requireAgencyApi(): Promise<
  { ok: true; context: AgencyContext } | { ok: false; response: Response }
> {
  const context = await getAgencyContext().catch(() => null);
  if (!context)
    return {
      ok: false,
      response: Response.json(
        { error: 'agency_authentication_required' },
        { status: 401, headers: { 'cache-control': 'private, no-store' } },
      ),
    };
  return { ok: true, context };
}
