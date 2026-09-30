import { cookies } from 'next/headers';

import { randomToken } from '@/lib/auth-crypto';
import {
  GOOGLE_RETURN_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  buildAuthorizeUrl,
  createPkcePair,
  getGoogleConfig,
  safeReturnPath,
} from '@/lib/google-oauth';

export const dynamic = 'force-dynamic';

/**
 * Google giriş akışını başlatır: CSRF için `state`, kod hırsızlığına karşı PKCE
 * doğrulayıcısı üretilir; ikisi de yalnız sunucunun okuyabildiği kısa ömürlü
 * çerezlere yazılır ve kullanıcı Google'a yönlendirilir.
 */
export async function GET(request: Request) {
  const config = getGoogleConfig();
  if (!config) {
    return Response.redirect(
      new URL('/login?google=unconfigured', request.url),
      302,
    );
  }

  const returnTo = safeReturnPath(
    new URL(request.url).searchParams.get('return_to'),
  );
  const state = randomToken(24);
  const { verifier, challenge } = await createPkcePair();

  const store = await cookies();
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  };
  store.set(GOOGLE_STATE_COOKIE, state, options);
  store.set(GOOGLE_VERIFIER_COOKIE, verifier, options);
  store.set(GOOGLE_RETURN_COOKIE, returnTo, options);

  return Response.redirect(buildAuthorizeUrl(config, state, challenge), 302);
}
