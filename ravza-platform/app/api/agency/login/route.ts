import { findMemberByEmail, getAgency, recordLoginAttempt } from '@/db/agencies';
import { DEFAULT_ITERATIONS, verifyPassword } from '@/lib/auth-crypto';
import { clientIp, overRateLimit } from '@/lib/rate-limit';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'cache-control': 'private, no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

/**
 * Acente girişi. Başvuru onaylanmadıysa, reddedildiyse veya askıdaysa giriş
 * açılmaz ve nedeni söylenir. Bilinmeyen e-postada da parola doğrulaması
 * yapılır; yanıt süresinden hesap varlığı anlaşılamaz.
 */
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'invalid_origin' }, 403);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return reply({ error: 'invalid_body' }, 400);
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || password.length > 200) return reply({ error: 'invalid_credentials' }, 400);

  try {
    if (await overRateLimit(`agency-login:${clientIp(request)}`, 15, 60)) return reply({ error: 'rate_limited' }, 429);
    const member = await findMemberByEmail(email);
    if (!member) {
      await verifyPassword(password, { hash: '0'.repeat(64), salt: '0'.repeat(32), iterations: DEFAULT_ITERATIONS });
      return reply({ error: 'invalid_credentials' }, 401);
    }
    if (member.lockedUntil && member.lockedUntil > Date.now()) return reply({ error: 'account_locked' }, 423);
    const valid = await verifyPassword(password, {
      hash: member.passwordHash,
      salt: member.passwordSalt,
      iterations: member.iterations,
    });
    if (!valid) {
      await recordLoginAttempt(member.id, false, LOCK_MS, MAX_FAILURES);
      return reply({ error: 'invalid_credentials' }, 401);
    }
    const agency = await getAgency(member.agencyId);
    if (!agency) return reply({ error: 'invalid_credentials' }, 401);
    if (agency.status === 'pending') return reply({ error: 'agency_pending' }, 403);
    if (agency.status === 'rejected') return reply({ error: 'agency_rejected', reason: agency.rejectReason }, 403);
    if (agency.status === 'suspended' || member.status !== 'active') return reply({ error: 'agency_suspended' }, 403);

    await recordLoginAttempt(member.id, true, LOCK_MS, MAX_FAILURES);
    await createSession({
      userId: `agency:${member.id}`,
      email: member.email,
      displayName: `${member.fullName} · ${agency.companyName}`,
      provider: 'password',
      audience: 'agency',
    });
    return reply({ ok: true });
  } catch {
    return reply({ error: 'unavailable' }, 503);
  }
}
