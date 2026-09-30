import { findFeedbackInvite, submitFeedback } from '@/db/feedback';
import { findQuoteByCode } from '@/db/quotes';
import { parseFeedbackInput } from '@/lib/feedback';

const NO_STORE = { 'cache-control': 'private, no-store' } as const;

/**
 * Geri bildirim yalnız teslim edilmiş bir talebin tek kullanımlık davet
 * jetonuyla toplanır. Jeton kullanıldıktan sonra silinir; aynı bağlantı
 * ikinci kez çalışmaz.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: 'Geçersiz istek.' },
      { status: 400, headers: NO_STORE },
    );
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!/^[0-9a-f]{32}$/.test(token))
    return Response.json(
      { error: 'Davet bağlantısı geçersiz veya süresi dolmuş.' },
      { status: 400, headers: NO_STORE },
    );

  const parsed = parseFeedbackInput(body);
  if (!parsed.ok)
    return Response.json(
      { error: parsed.error, field: parsed.field },
      { status: 400, headers: NO_STORE },
    );

  try {
    const invite = await findFeedbackInvite(token);
    if (!invite)
      return Response.json(
        { error: 'Davet bağlantısı geçersiz veya süresi dolmuş.' },
        { status: 404, headers: NO_STORE },
      );
    if (invite.submitted)
      return Response.json(
        { error: 'Bu davet için zaten bir değerlendirme gönderildi.' },
        { status: 409, headers: NO_STORE },
      );

    const quote = invite.quoteCode
      ? await findQuoteByCode(invite.quoteCode)
      : null;
    const saved = await submitFeedback(
      token,
      parsed.value,
      quote?.fullName ?? 'Ziyaretçi',
    );
    if (!saved)
      return Response.json(
        { error: 'Değerlendirme kaydedilemedi.' },
        { status: 409, headers: NO_STORE },
      );

    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch {
    return Response.json(
      { error: 'Değerlendirme şu anda kaydedilemiyor.' },
      { status: 503, headers: NO_STORE },
    );
  }
}
