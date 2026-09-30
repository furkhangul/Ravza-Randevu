import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { authIdentities, customerProfiles } from '@/db/schema';
import { randomToken, timingSafeEqual } from '@/lib/auth-crypto';
import {
  GOOGLE_RETURN_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  exchangeCodeForProfile,
  getGoogleConfig,
  safeReturnPath,
  type GoogleProfile,
} from '@/lib/google-oauth';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

function failure(request: Request, reason: string) {
  return Response.redirect(
    new URL(`/login?google=${reason}`, request.url),
    302,
  );
}

/** Google kimliğini ve müşteri profilini kaydeder, ardından oturum açar. */
async function persistIdentity(profile: GoogleProfile): Promise<string> {
  const db = getDb();
  const now = new Date();
  const userId = `google:${profile.sub}`;

  const existing = await db
    .select()
    .from(authIdentities)
    .where(
      and(
        eq(authIdentities.provider, 'google'),
        eq(authIdentities.providerAccountId, profile.sub),
      ),
    )
    .limit(1);

  const identityValues = {
    email: profile.email,
    emailVerified: profile.emailVerified,
    fullName: profile.name,
    givenName: profile.givenName,
    familyName: profile.familyName,
    pictureUrl: profile.picture,
    locale: profile.locale,
    lastLoginAt: now,
  };

  if (existing[0]) {
    await db
      .update(authIdentities)
      .set(identityValues)
      .where(eq(authIdentities.id, existing[0].id));
  } else {
    await db.insert(authIdentities).values({
      id: randomToken(16),
      provider: 'google',
      providerAccountId: profile.sub,
      createdAt: now,
      ...identityValues,
    });
  }

  // Profil ilk girişte Google verisiyle doldurulur. Sonraki girişlerde
  // müşterinin kendi girdiği bilgilerin üzerine yazılmaz.
  const profileRow = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.userId, userId))
    .limit(1);

  if (!profileRow[0]) {
    await db.insert(customerProfiles).values({
      userId,
      email: profile.email,
      fullName: profile.name,
      preferredLocale: profile.locale.startsWith('tr') ? 'tr' : 'tr',
      source: 'google',
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(customerProfiles)
      .set({
        email: profile.email,
        fullName: profileRow[0].fullName || profile.name,
        updatedAt: now,
      })
      .where(eq(customerProfiles.userId, userId));
  }

  return userId;
}

export async function GET(request: Request) {
  const config = getGoogleConfig();
  if (!config) return failure(request, 'unconfigured');

  const url = new URL(request.url);
  if (url.searchParams.get('error')) return failure(request, 'cancelled');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return failure(request, 'invalid_response');

  const store = await cookies();
  const expectedState = store.get(GOOGLE_STATE_COOKIE)?.value;
  const verifier = store.get(GOOGLE_VERIFIER_COOKIE)?.value;
  const returnTo = safeReturnPath(store.get(GOOGLE_RETURN_COOKIE)?.value);

  store.delete(GOOGLE_STATE_COOKIE);
  store.delete(GOOGLE_VERIFIER_COOKIE);
  store.delete(GOOGLE_RETURN_COOKIE);

  if (!expectedState || !verifier || !timingSafeEqual(state, expectedState)) {
    return failure(request, 'state_mismatch');
  }

  try {
    const profile = await exchangeCodeForProfile(config, code, verifier);
    const userId = await persistIdentity(profile);
    await createSession({
      userId,
      email: profile.email,
      displayName: profile.name || profile.email,
      provider: 'google',
      audience: 'customer',
    });
  } catch {
    return failure(request, 'exchange_failed');
  }

  return Response.redirect(new URL(returnTo, request.url), 302);
}
