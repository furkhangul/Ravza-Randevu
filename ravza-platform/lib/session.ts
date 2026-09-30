import { cookies } from 'next/headers';
import { and, eq, gt, lt } from 'drizzle-orm';

import { getDb } from '@/db';
import { adminCredentials, authSessions } from '@/db/schema';
import { findMemberById, getAgency } from '@/db/agencies';
import { randomToken, sha256Hex } from '@/lib/auth-crypto';

export const SESSION_COOKIE = 'ravza_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export type SessionUser = {
  userId: string;
  email: string;
  displayName: string;
  provider: 'google' | 'password';
  /** `agency`: acente/şirket portalı. Müşteri ve yönetici alanlarına erişemez. */
  audience: 'customer' | 'staff' | 'agency';
};

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/**
 * Yeni oturum açar. Çereze yalnız rastgele jeton yazılır; veritabanında onun
 * SHA-256 özeti durur, böylece veritabanı okunsa bile jeton üretilemez.
 */
export async function createSession(user: SessionUser): Promise<void> {
  await destroySession();
  const db = getDb();
  const token = randomToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.insert(authSessions).values({
    id: randomToken(16),
    tokenHash: await sha256Hex(token),
    userId: user.userId,
    email: user.email,
    displayName: user.displayName,
    provider: user.provider,
    audience: user.audience,
    expiresAt,
    createdAt: now,
  });

  // Süresi geçmiş kayıtlar birikmesin.
  await db.delete(authSessions).where(lt(authSessions.expiresAt, now));

  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_MS / 1000));
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let rows;
  try {
    const db = getDb();
    rows = await db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.tokenHash, await sha256Hex(token)),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
  } catch {
    // Veritabanı bağlanamıyorsa oturum yok sayılır, sayfa çökmez.
    return null;
  }

  const session = rows[0];
  if (!session) return null;

  // Acente oturumu yalnız üye ve acente aktifken geçerlidir; askıya alınan
  // veya reddedilen acentenin açık oturumu anında düşer.
  if (session.audience === 'agency') {
    if (!session.userId.startsWith('agency:')) return null;
    try {
      const member = await findMemberById(session.userId.slice(7));
      if (!member || member.status !== 'active') return null;
      const agency = await getAgency(member.agencyId);
      if (!agency || agency.status !== 'active') return null;
    } catch {
      return null;
    }
  }

  if (session.audience === 'staff') {
    if (!session.userId.startsWith('admin:')) return null;
    const [account] = await getDb().select().from(adminCredentials)
      .where(eq(adminCredentials.id, session.userId.slice(6))).limit(1);
    if (!account || account.status !== 'active') return null;
  }

  return {
    userId: session.userId,
    email: session.email,
    displayName: session.displayName || session.email,
    provider: session.provider,
    audience: session.audience,
  };
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const db = getDb();
      await db
        .delete(authSessions)
        .where(eq(authSessions.tokenHash, await sha256Hex(token)));
    } catch {
      // Kayıt silinemese bile çerez düşürülür; jeton artık taşınmaz.
    }
  }
  store.delete(SESSION_COOKIE);
}
