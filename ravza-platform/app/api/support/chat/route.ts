import { env } from '@/lib/server-env';
import { sha256Hex } from '@/lib/auth-crypto';
import { answer, extractText, type BrainDeps, type Slot } from '@/lib/assistant-brain';
import { isValidIsoDate, riyadhToday } from '@/lib/date-validation';
import { emptyVisit, localToday, validateVisitDates, type VisitDetails } from '@/lib/visit-conversation';
import { createLiveRawdahProviderFromEnv } from '@/packages/provider-rawdah/src';

export const dynamic = 'force-dynamic';

/**
 * Ravza asistanı. Talep bilgilerini kural motoru yazar; boş saatler sağlayıcıdan canlı okunur;
 * serbest sorulara yapay zekâ (Workers AI, isteğe bağlı Claude) doğrulanmış bilgilerle yanıt verir.
 * Yapay zekâ yoksa veya hata verirse asistan kural motoruyla çalışmaya devam eder.
 */
const WORKERS_MODEL = '@cf/openai/gpt-oss-120b';

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };
const COUNTS_PER_MINUTE = 12;
const MAX_BODY_LENGTH = 12_000;

type ChatRole = 'assistant' | 'user';
type ChatLine = { role: ChatRole; content: string };

function fail(error: string, status: number) {
  return Response.json({ error }, { status, headers: NO_STORE });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function redactPrivateText(value: string): string {
  const dates: string[] = [];
  return value
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, (date) => {
      dates.push(date);
      return `__VISIT_DATE_${dates.length - 1}__`;
    })
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[e-posta gizlendi]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[telefon veya numara gizlendi]')
    .replace(/\b\d{8,}\b/g, '[numara gizlendi]')
    .replace(
      /\b(pasaport|passport|kimlik|kart|parola|şifre|sifre)\s*[:#]?\s*[\p{L}\p{N}-]{4,}/giu,
      '$1 [özel bilgi gizlendi]',
    )
    .replace(/__VISIT_DATE_(\d+)__/g, (_, index: string) => dates[Number(index)] ?? '');
}

function readHistory(value: unknown): ChatLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-8)
    .flatMap((line): ChatLine[] => {
      if (!isRecord(line) || (line.role !== 'user' && line.role !== 'assistant'))
        return [];
      if (typeof line.content !== 'string') return [];
      const content = redactPrivateText(line.content.trim()).slice(0, 700);
      return content ? [{ role: line.role, content }] : [];
    });
}

function readCount(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 500
  )
    return value;
  return undefined;
}

function readDetails(value: unknown): VisitDetails {
  const input = isRecord(value) ? value : {};
  const personCount = readCount(input.personCount);
  const femaleCount = readCount(input.femaleCount);
  const maleCount = readCount(input.maleCount);
  const result: VisitDetails = { ...emptyVisit };

  if (personCount !== undefined && personCount !== null && personCount > 0)
    result.personCount = personCount;

  if (
    result.personCount !== null &&
    femaleCount !== undefined &&
    femaleCount !== null &&
    maleCount !== undefined &&
    maleCount !== null &&
    femaleCount + maleCount === result.personCount
  ) {
    result.femaleCount = femaleCount;
    result.maleCount = maleCount;
  }

  const dateFrom = typeof input.dateFrom === 'string' ? input.dateFrom : '';
  const dateTo = typeof input.dateTo === 'string' ? input.dateTo : '';
  if (
    dateFrom &&
    dateTo &&
    !validateVisitDates(dateFrom, dateTo, localToday())
  ) {
    result.dateFrom = dateFrom;
    result.dateTo = dateTo;
  }

  result.flexible = input.flexible === true;
  if (
    input.timePreference === 'morning' ||
    input.timePreference === 'afternoon' ||
    input.timePreference === 'evening' ||
    input.timePreference === 'night'
  )
    result.timePreference = input.timePreference;

  return result;
}

async function enforceRateLimit(request: Request) {
  if (!env.DB) return false;
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const key = await sha256Hex(`support-ai:${ip}`);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % 60);
  const row = await env.DB.prepare(
    `INSERT INTO auth_rate_limits (key, window_start, attempts) VALUES (?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET
       attempts = CASE WHEN window_start = excluded.window_start THEN attempts + 1 ELSE 1 END,
       window_start = excluded.window_start
     RETURNING attempts`,
  )
    .bind(key, windowStart)
    .first<{ attempts: number }>();

  if ((row?.attempts ?? COUNTS_PER_MINUTE + 1) > COUNTS_PER_MINUTE)
    return false;
  if (row?.attempts === 1)
    await env.DB.prepare('DELETE FROM auth_rate_limits WHERE window_start < ?')
      .bind(now - 86_400)
      .run();
  return true;
}

/** Sohbet modeli: ANTHROPIC_API_KEY tanımlıysa Claude, değilse Workers AI. */
function chatModel(): BrainDeps['ai'] {
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (claudeKey)
    return async (messages) => {
      const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system,
          messages: messages.filter((m) => m.role !== 'system'),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error('claude_failed');
      const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
      return (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim();
    };
  const ai = env.AI;
  if (!ai) return null;
  return async (messages) =>
    extractText(
      await ai.run(WORKERS_MODEL as Parameters<Ai['run']>[0], {
        messages,
        max_tokens: 1400,
        temperature: 0.3,
        reasoning_effort: 'low',
      } as never),
    );
}

/** Belirli bir günün canlı boş saatleri (Medine takvimi, bugünden itibaren 90 gün). */
async function liveAvailability(date: string): Promise<Slot[] | null> {
  if (process.env.RAWDAH_LIVE_ENABLED !== 'true') return null;
  const today = riyadhToday();
  const last = new Date(`${today}T00:00:00Z`);
  last.setUTCDate(last.getUTCDate() + 90);
  if (!isValidIsoDate(date) || date < today || date > last.toISOString().slice(0, 10)) return null;
  try {
    const provider = createLiveRawdahProviderFromEnv();
    const result = await Promise.race([
      provider.getAvailability(date),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
    ]);
    return result.slots
      .filter((slot) => slot.gender === "female" || slot.gender === "male")
      .map(({ timeSlot, window, gender, available }) => ({ timeSlot, window, gender: gender as Slot["gender"], available }));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return fail('invalid_origin', 403);

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_LENGTH) return fail('message_too_large', 413);
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return fail('invalid_body', 400);
    body = parsed;
  } catch {
    return fail('invalid_body', 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 1000) return fail('invalid_message', 400);
  if (!env.DB) return fail('assistant_unavailable', 503);

  try {
    if (!(await enforceRateLimit(request))) return fail('rate_limited', 429);
    const locale = body.locale === 'en' || body.locale === 'ar' ? body.locale : 'tr';
    const result = await answer(
      {
        message: redactPrivateText(message).slice(0, 1000),
        history: readHistory(body.history),
        details: readDetails(body.details),
        locale,
      },
      { ai: chatModel(), availability: liveAvailability },
    );
    return Response.json(result, { headers: NO_STORE });
  } catch {
    // Sohbet içeriği ve üretilen metin bilinçli olarak günlüğe yazılmaz.
    return fail('assistant_unavailable', 503);
  }
}
