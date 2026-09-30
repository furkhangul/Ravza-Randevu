import { env } from '@/lib/server-env';
import { checkPasswordStrength, DEFAULT_ITERATIONS, hashPassword, randomToken, sha256Hex, verifyPassword } from '@/lib/auth-crypto';
import { createSession } from '@/lib/session';
import { acceptanceStatement } from '@/db/legal-acceptances';
import { DISCLAIMER_VERSION } from '@/lib/disclaimer';

export const dynamic = 'force-dynamic';
const headers = { 'cache-control': 'private, no-store, max-age=0' };
const reply = (error: string, status: number) => Response.json({ error }, { status, headers });
type Account = { id: string; email: string; full_name: string; password_hash: string; password_salt: string; iterations: number; status: string; locked_until: number | null };
async function authenticate(request: Request, register: boolean) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply('invalid_origin', 403);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return reply('invalid_body', 400);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return reply('invalid_body', 400);
    body = parsed;
  } catch { return reply('invalid_body', 400); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 200) return reply('invalid_credentials', 400);
  if (register && (name.length < 2 || name.length > 120 || body.consent !== true || body.disclaimer !== true || checkPasswordStrength(password).length)) return reply('invalid_registration', 400);

  try {
    const db = env.DB;
    if (!db) return reply('auth_store_unavailable', 503);
    const now = Math.floor(Date.now() / 1000);
    const ip = request.headers.get('cf-connecting-ip') || 'local';
    const key = await sha256Hex('customer-auth:' + ip);
    const windowStart = now - now % 60;
    const rate = await db.prepare(`INSERT INTO auth_rate_limits (key, window_start, attempts) VALUES (?, ?, 1)
      ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN window_start = excluded.window_start THEN attempts + 1 ELSE 1 END, window_start = excluded.window_start RETURNING attempts`)
      .bind(key, windowStart).first<{ attempts: number }>();
    if ((rate?.attempts ?? 100) > 15) return reply('rate_limited', 429);
    await db.prepare('DELETE FROM auth_rate_limits WHERE window_start < ?').bind(now - 86400).run();

    let account = await db.prepare('SELECT * FROM customer_credentials WHERE email = ?').bind(email).first<Account>();
    if (register) {
      if (account) return reply('account_exists', 409);
      const derived = await hashPassword(password);
      const id = 'customer:' + randomToken(16);
      // Profil ile parola kaydı aynı işlemde oluşur. E-posta başka bir kimlikle birleştirilmez.
      const disclaimer = await acceptanceStatement({ subjectType: 'customer', subjectId: id, document: 'disclaimer', version: DISCLAIMER_VERSION }, now);
      try {
        await db.batch([
          db.prepare('INSERT INTO customer_credentials (id,email,full_name,password_hash,password_salt,iterations,created_at) VALUES (?,?,?,?,?,?,?)')
            .bind(id, email, name, derived.hash, derived.salt, derived.iterations, now),
          db.prepare("INSERT INTO customer_profiles (user_id,email,full_name,source,created_at,updated_at) VALUES (?,?,?,'manual',?,?)")
            .bind(id, email, name, now, now),
          disclaimer,
        ]);
      } catch (error) {
        if (String(error).includes('UNIQUE')) return reply('account_exists', 409);
        throw error;
      }
      account = { id, email, full_name: name, password_hash: derived.hash, password_salt: derived.salt, iterations: derived.iterations, status: 'active', locked_until: null };
    } else {
      if (account && account.status !== 'active') return reply('invalid_credentials', 401);
      if (account?.locked_until && account.locked_until > now) return reply('account_locked', 423);
      const valid = await verifyPassword(password, {
        hash: account?.password_hash ?? '0'.repeat(64),
        salt: account?.password_salt ?? '0'.repeat(32),
        iterations: account?.iterations ?? DEFAULT_ITERATIONS,
      });
      if (!account || !valid) {
        if (account) await db.prepare(`UPDATE customer_credentials SET
          failed_attempts = CASE WHEN locked_until IS NOT NULL AND locked_until <= ? THEN 1 ELSE failed_attempts + 1 END,
          locked_until = CASE WHEN locked_until IS NOT NULL AND locked_until <= ? THEN NULL WHEN failed_attempts + 1 >= 5 THEN ? ELSE NULL END WHERE id = ?`)
          .bind(now, now, now + 900, account.id).run();
        return reply('invalid_credentials', 401);
      }
      await db.prepare('UPDATE customer_credentials SET failed_attempts = 0, locked_until = NULL WHERE id = ?').bind(account.id).run();
    }
    await createSession({ userId: account.id, email: account.email, displayName: account.full_name, provider: 'password', audience: 'customer' });
    return Response.json({ ok: true }, { status: register ? 201 : 200, headers });
  } catch {
    return reply('auth_store_unavailable', 503);
  }
}
export const POST = (request: Request) => authenticate(request, false);
export const PUT = (request: Request) => authenticate(request, true);
