import { destroySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Oturumu hem sunucudan hem tarayıcıdan düşürür. */
export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  if (request.headers.get('origin') !== requestUrl.origin) {
    return Response.json({ error: 'invalid_origin' }, { status: 403 });
  }
  await destroySession();
  return Response.json(
    { ok: true },
    { headers: { 'cache-control': 'private, no-store, max-age=0' } },
  );
}
