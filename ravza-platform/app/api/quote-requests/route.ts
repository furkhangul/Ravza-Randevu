import { getAppointmentPackage } from '@/db/appointment-packages';
import { parseSlotPreference, saveSlotPreference } from '@/db/rawdah-bookings';
import { notifyQuoteCreated } from '@/lib/notify';
import {
  countRecentQuotesByIp,
  createQuoteRequest,
  hashIdentifier,
} from '@/db/quotes';
import { getLegalProfile } from '@/lib/legal-config';
import {
  buildMailtoUrl,
  buildWhatsappMessage,
  buildWhatsappUrl,
  generateQuoteCode,
  parseQuoteRequestInput,
} from '@/lib/quote-request';

const NO_STORE = { 'cache-control': 'private, no-store' } as const;

/** KVKK aydınlatma metninin sürümü; onay kaydıyla birlikte saklanır. */
const KVKK_CONSENT_VERSION = '2026-09-20';

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;
const MAX_BODY_BYTES = 8 * 1024;

function fail(error: string, status: number, field?: string) {
  return Response.json({ error, field }, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES)
    return fail('Gönderilen veri çok büyük.', 413);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return fail('Geçersiz istek gövdesi.', 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return fail('Geçersiz istek gövdesi.', 400);
  }

  // Görünmez alan doldurulmuşsa istek bir bottan gelmiştir. Hata
  // ayrıntısı verilmez; saldırgana geri bildirim vermek işe yaramaz.
  if (typeof body.website === 'string' && body.website.trim() !== '')
    return fail('Talep alınamadı.', 400);

  if (body.kvkkConsent !== true)
    return fail(
      'Devam etmek için KVKK aydınlatma metnini onaylamanız gerekir.',
      400,
      'kvkkConsent',
    );

  const parsed = parseQuoteRequestInput(body);
  if (!parsed.ok) return fail(parsed.error, 400, parsed.field);

  const ipHash = await hashIdentifier(
    request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for') ??
      '',
  );
  const userAgentHash = await hashIdentifier(
    request.headers.get('user-agent') ?? '',
  );

  try {
    if (ipHash) {
      const recent = await countRecentQuotesByIp(ipHash, RATE_WINDOW_MS);
      if (recent >= RATE_LIMIT)
        return fail(
          'Kısa sürede çok fazla talep oluşturuldu. Lütfen bir süre sonra tekrar deneyin veya bize doğrudan ulaşın.',
          429,
        );
    }

    const profile = getLegalProfile();
    const pkg = await getAppointmentPackage(parsed.value.packageCode);
    const packageName =
      pkg?.name[parsed.value.locale] || pkg?.name.tr || 'Özel talep';

    const code = generateQuoteCode();
    const record = await createQuoteRequest(parsed.value, {
      code,
      channel: 'whatsapp',
      sourcePath:
        typeof body.sourcePath === 'string' ? body.sourcePath.slice(0, 200) : null,
      kvkkConsentVersion: KVKK_CONSENT_VERSION,
      ipHash,
      userAgentHash,
    });

    // Sohbet veya formda seçilen Ravza saatleri, yönetici satın alırken hazır gelir.
    const slotPreference = parseSlotPreference(body.selectedSlots);
    if (slotPreference) {
      try {
        await saveSlotPreference(record.id, slotPreference);
      } catch {
        // Tercih kaydedilemese de talep geçerlidir; yönetici saati panelde seçer.
      }
    }
    await notifyQuoteCreated(record);

    const message = buildWhatsappMessage({
      ...parsed.value,
      code: record.code,
      packageName,
      brandName: profile.brandName,
    });

    return Response.json(
      {
        code: record.code,
        message,
        whatsappUrl: buildWhatsappUrl(profile.whatsappNumber, message),
        mailtoUrl: buildMailtoUrl(profile.contactEmail, record.code, message),
        phone: profile.contactPhone || null,
      },
      { headers: NO_STORE },
    );
  } catch {
    // Kişisel veri taşıdığı için hata gövdesi log'lanmaz.
    return fail(
      'Talep şu anda kaydedilemedi. Lütfen bize doğrudan ulaşın.',
      503,
    );
  }
}
