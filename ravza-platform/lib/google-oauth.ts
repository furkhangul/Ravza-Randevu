import { randomToken, sha256Hex } from '@/lib/auth-crypto';
import { loginReturnPath } from '@/lib/login-path';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export const GOOGLE_STATE_COOKIE = 'ravza_oauth_state';
export const GOOGLE_VERIFIER_COOKIE = 'ravza_oauth_verifier';
export const GOOGLE_RETURN_COOKIE = 'ravza_oauth_return';

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/**
 * Google girişi yalnız üç değişkenin üçü de doluysa açılır. Eksikse yapılandırma
 * `null` döner ve arayüz "henüz bağlanmadı" durumunu gösterir — hiçbir yerde
 * yarım yapılandırmayla istek atılmaz.
 */
export function getGoogleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const appUrl = process.env.APP_URL?.trim();
  if (!clientId || !clientSecret || !appUrl) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl.replace(/\/$/, '')}/api/auth/google/callback`,
  };
}

export function isGoogleLoginEnabled(): boolean {
  return getGoogleConfig() !== null;
}

/** PKCE S256 doğrulayıcı ve ondan türetilen challenge. */
export async function createPkcePair() {
  const verifier = randomToken(32);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return { verifier, challenge };
}

export function buildAuthorizeUrl(
  config: GoogleConfig,
  state: string,
  challenge: string,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    // Yalnız kimlik: e-posta ve temel profil. Takvim, Drive, kişiler istenmez.
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  givenName: string;
  familyName: string;
  picture: string;
  locale: string;
};

export async function exchangeCodeForProfile(
  config: GoogleConfig,
  code: string,
  verifier: string,
): Promise<GoogleProfile> {
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`google_token_exchange_failed_${tokenResponse.status}`);
  }

  const tokens = (await tokenResponse.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error('google_token_missing');

  const profileResponse = await fetch(USERINFO_URL, {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileResponse.ok) {
    throw new Error(`google_userinfo_failed_${profileResponse.status}`);
  }

  const raw = (await profileResponse.json()) as Record<string, unknown>;
  const sub = typeof raw.sub === 'string' ? raw.sub : '';
  const email = typeof raw.email === 'string' ? raw.email : '';
  if (!sub || !email) throw new Error('google_profile_incomplete');

  return {
    sub,
    email: email.toLowerCase(),
    emailVerified: raw.email_verified === true,
    name: typeof raw.name === 'string' ? raw.name : '',
    givenName: typeof raw.given_name === 'string' ? raw.given_name : '',
    familyName: typeof raw.family_name === 'string' ? raw.family_name : '',
    picture: typeof raw.picture === 'string' ? raw.picture : '',
    locale: typeof raw.locale === 'string' ? raw.locale : '',
  };
}

/** Açık yönlendirme (open redirect) engeli: yalnız site içi yollar kabul edilir. */
export function safeReturnPath(value: string | undefined | null): string {
  return loginReturnPath(value);
}

export async function stateFingerprint(state: string): Promise<string> {
  return sha256Hex(state);
}
