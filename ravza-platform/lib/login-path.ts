/** Girişten sonra yalnız aynı sitedeki ve ilgili hesaba ait ekrana dön. */
export function loginReturnPath(value: unknown, staff = false): string {
  const fallback = staff ? '/panel' : '/hesabim';
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\\\x00-\x20]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://ravza.local');
    if (url.origin !== 'https://ravza.local') return fallback;
    const p = url.pathname;
    if (/^\/(?:login|register|admin|signin-with-chatgpt|signout-with-chatgpt|api|callback)(?:\/|$)/.test(p)) return fallback;
    const panel = /^\/(?:panel|dashboard|super-admin)(?:\/|$)/.test(p);
    if (!staff && panel) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}
