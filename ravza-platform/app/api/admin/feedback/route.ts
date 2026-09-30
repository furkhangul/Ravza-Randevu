import { listFeedback, moderateFeedback } from '@/db/feedback';
import { authorizeApi } from '@/lib/app-auth';
import type { FeedbackStatus } from '@/lib/feedback';

const NO_STORE = { 'cache-control': 'private, no-store' } as const;

export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok)
    return Response.json(
      { error: auth.error },
      { status: auth.status, headers: NO_STORE },
    );
  try {
    return Response.json(
      { feedback: await listFeedback({ limit: 100 }) },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'feedback_unavailable' },
      { status: 503, headers: NO_STORE },
    );
  }
}

/**
 * Moderasyon yalnız yayımlar, reddeder veya işletme yanıtı ekler.
 * Yorum metni düzenlenemez: müşterinin yazdığını değiştirmek sahte
 * sosyal kanıt üretmenin en kolay yoludur.
 */
export async function PATCH(request: Request) {
  const auth = await authorizeApi(['SUPER_ADMIN', 'AGENCY_ADMIN']);
  if (!auth.ok)
    return Response.json(
      { error: auth.error },
      { status: auth.status, headers: NO_STORE },
    );

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: 'invalid_body' },
      { status: 400, headers: NO_STORE },
    );
  }

  const id = typeof body.id === 'string' ? body.id : '';
  const status = body.status as FeedbackStatus;
  if (!id || !['pending', 'published', 'rejected'].includes(status))
    return Response.json(
      { error: 'invalid_request' },
      { status: 400, headers: NO_STORE },
    );

  const rejectReason =
    typeof body.rejectReason === 'string' ? body.rejectReason.trim() : '';
  if (status === 'rejected' && rejectReason.length < 3)
    return Response.json(
      { error: 'reject_reason_required' },
      { status: 400, headers: NO_STORE },
    );

  try {
    await moderateFeedback(id, {
      status,
      rejectReason: rejectReason.slice(0, 300) || undefined,
      reply:
        typeof body.reply === 'string' && body.reply.trim()
          ? body.reply.trim().slice(0, 600)
          : undefined,
    });
    return Response.json(
      { feedback: await listFeedback({ limit: 100 }) },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'feedback_update_failed' },
      { status: 503, headers: NO_STORE },
    );
  }
}
