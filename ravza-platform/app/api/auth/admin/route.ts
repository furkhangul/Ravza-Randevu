import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { adminCredentials } from '@/db/schema';
import { DEFAULT_ITERATIONS, verifyPassword } from '@/lib/auth-crypto';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 1000 * 60 * 15;

function reject(error: string, status = 401) {
  return Response.json({ error }, { status, headers: NO_STORE });
}

/**
 * Yönetici kullanıcı adı + parola girişi.
 *
 * Kullanıcı adı bulunamadığında da parola doğrulaması yapılmış kadar zaman
 * harcanır; böylece yanıt süresinden hangi kullanıcı adlarının var olduğu
 * anlaşılamaz. Beş hatalı denemeden sonra hesap 15 dakika kilitlenir.
 */
export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  if (request.headers.get('origin') !== requestUrl.origin) {
    return reject('invalid_origin', 403);
  }

  let payload: { username?: unknown; password?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return reject('invalid_body', 400);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return reject('invalid_body', 400);
  }

  const username =
    typeof payload.username === 'string'
      ? payload.username.trim().toLowerCase()
      : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!username || !password) return reject('missing_credentials', 400);
  if (username.length > 120 || password.length > 200) return reject('invalid_credentials', 400);

  let rows;
  try {
    const db = getDb();
    rows = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.username, username))
      .limit(1);
  } catch {
    return reject('auth_store_unavailable', 503);
  }

  const account = rows[0];
  if (!account) {
    // Sahte doğrulama: zamanlama farkı sızdırmamak için.
      await verifyPassword(password, {
      hash: '0'.repeat(64),
      salt: '0'.repeat(32),
      iterations: DEFAULT_ITERATIONS,
    });
    return reject('invalid_credentials');
  }

  const now = new Date();
  if (account.status !== 'active') return reject('account_suspended', 403);
  if (account.lockedUntil && account.lockedUntil > now) {
    return reject('account_locked', 423);
  }

  const valid = await verifyPassword(password, {
    hash: account.passwordHash,
    salt: account.passwordSalt,
    iterations: account.iterations,
  });

  const db = getDb();

  if (!valid) {
    const failedAttempts = (account.lockedUntil && account.lockedUntil <= now ? 0 : account.failedAttempts) + 1;
    await db
      .update(adminCredentials)
      .set({
        failedAttempts,
        lockedUntil:
          failedAttempts >= MAX_FAILED_ATTEMPTS
            ? new Date(now.getTime() + LOCK_MS)
            : null,
      })
      .where(eq(adminCredentials.id, account.id));
    return reject('invalid_credentials');
  }

  await db
    .update(adminCredentials)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: now })
    .where(eq(adminCredentials.id, account.id));

  await createSession({
    userId: `admin:${account.id}`,
    email: account.email,
    displayName: account.displayName || account.username,
    provider: 'password',
    audience: 'staff',
  });

  return Response.json({ ok: true }, { headers: NO_STORE });
}
