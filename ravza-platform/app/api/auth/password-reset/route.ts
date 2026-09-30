import { and, eq, gt, isNull } from 'drizzle-orm';

import { getDb } from '@/db';
import { adminCredentials, passwordResetTokens } from '@/db/schema';
import { queueNotification } from '@/db/notifications';
import {
  checkPasswordStrength,
  hashPassword,
  passwordProblemMessages,
  randomToken,
  sha256Hex,
} from '@/lib/auth-crypto';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };
const TOKEN_TTL_MS = 1000 * 60 * 60;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

function checkOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}

/**
 * Parola yenileme talebi.
 *
 * Yanıt, e-postanın kayıtlı olup olmadığına bakılmaksızın hep aynıdır:
 * hangi adreslerin sistemde olduğunu dışarıya sızdırmamak için. Bağlantı
 * 60 dakika geçerlidir, tek kullanımlıktır ve tabloda yalnız özeti durur.
 */
export async function POST(request: Request) {
  if (!checkOrigin(request)) return json({ error: 'invalid_origin' }, 403);

  let payload: { email?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  const email =
    typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) return json({ error: 'missing_email' }, 400);

  const sameAnswer = json({
    ok: true,
    message:
      'Bu adres kayıtlıysa parola yenileme bağlantısı birazdan gelecek. Gelen kutunuzu ve gereksiz posta klasörünü kontrol edin.',
  });

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.email, email))
      .limit(1);

    const account = rows[0];
    if (!account || account.status !== 'active') return sameAnswer;

    const token = randomToken(32);
    const now = new Date();
    await db.insert(passwordResetTokens).values({
      id: randomToken(16),
      tokenHash: await sha256Hex(token),
      adminId: account.id,
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
      createdAt: now,
    });

    const appUrl = (process.env.APP_URL ?? '').replace(/\/$/, '');
    await queueNotification({
      key: 'password_reset',
      // Her talep ayrı bir bağlantı üretir; önceki talebi engellemez.
      dedupeKey: `password_reset:${account.id}:${now.getTime()}`,
      email: account.email,
      recipientName: account.displayName || account.username,
      variables: {
        ad: account.displayName || account.username,
        baglanti: `${appUrl}/sifre-yenile?token=${token}`,
      },
    });
  } catch {
    // Hata olsa bile aynı yanıt döner; ayrıntı dışarıya verilmez.
    return sameAnswer;
  }

  return sameAnswer;
}

/** Jetonla yeni parola belirleme. */
export async function PUT(request: Request) {
  if (!checkOrigin(request)) return json({ error: 'invalid_origin' }, 403);

  let payload: { token?: unknown; password?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  const token = typeof payload.token === 'string' ? payload.token : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!token || !password) return json({ error: 'missing_fields' }, 400);

  const problems = checkPasswordStrength(password);
  if (problems.length > 0) {
    return json(
      {
        error: 'weak_password',
        problems: problems.map((problem) => passwordProblemMessages[problem]),
      },
      400,
    );
  }

  try {
    const db = getDb();
    const now = new Date();
    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, await sha256Hex(token)),
          gt(passwordResetTokens.expiresAt, now),
          isNull(passwordResetTokens.usedAt),
        ),
      )
      .limit(1);

    const reset = rows[0];
    if (!reset) return json({ error: 'invalid_or_expired_token' }, 400);

    const derived = await hashPassword(password);
    await db
      .update(adminCredentials)
      .set({
        passwordHash: derived.hash,
        passwordSalt: derived.salt,
        iterations: derived.iterations,
        failedAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(adminCredentials.id, reset.adminId));

    // Jeton tek kullanımlık: aynı bağlantıyla ikinci kez parola değiştirilemez.
    await db
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, reset.id));

    return json({ ok: true });
  } catch {
    return json({ error: 'reset_failed' }, 503);
  }
}
