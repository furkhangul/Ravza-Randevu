import { resetMemberPassword } from '@/db/agencies';
import { requireAgencyApi } from '@/lib/agency-auth';
import { hashPassword, verifyPassword } from '@/lib/auth-crypto';
import { passwordProblem } from '@/lib/agency-validation';
import { overRateLimit } from '@/lib/rate-limit';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'cache-control': 'private, no-store' };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

/** Acente kullanıcısının kendi şifresini değiştirmesi; diğer oturumlar kapanır, bu oturum yenilenir. */
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
  const current = typeof body.current === 'string' ? body.current : '';
  const next = typeof body.next === 'string' ? body.next : '';
  const problem = passwordProblem(next);
  if (problem) return reply({ error: problem }, 400);
  const { member, agency } = auth.context;
  try {
    if (await overRateLimit(`agency-password:${member.id}`, 5, 900)) return reply({ error: 'Çok fazla deneme. 15 dakika sonra tekrar deneyin.' }, 429);
    const valid = await verifyPassword(current, { hash: member.passwordHash, salt: member.passwordSalt, iterations: member.iterations });
    if (!valid) return reply({ error: 'Mevcut şifre hatalı.' }, 400);
    await resetMemberPassword(member.id, await hashPassword(next));
    await createSession({
      userId: `agency:${member.id}`,
      email: member.email,
      displayName: `${member.fullName} · ${agency.companyName}`,
      provider: 'password',
      audience: 'agency',
    });
    return reply({ ok: true });
  } catch {
    return reply({ error: 'Şifre şu anda değiştirilemedi.' }, 503);
  }
}
