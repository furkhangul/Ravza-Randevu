/**
 * Geri bildirim saf mantığı: isim maskeleme, davet jetonu ve girdi
 * doğrulaması.
 *
 * Yorumlar yalnız teslim edilmiş taleplerden toplanır ve moderasyondan
 * geçmeden hiçbir yüzeyde görünmez. Metin operasyon tarafından
 * düzenlenemez; yalnız yayımlanır, reddedilir veya yanıtlanır.
 */

export type FeedbackStatus = 'pending' | 'published' | 'rejected';
export type DisplayNameMode = 'full' | 'initials' | 'anonymous';

export type FeedbackRecord = {
  id: string;
  quoteRequestId: string | null;
  quoteCode: string | null;
  rating: number;
  ratingCommunication: number | null;
  ratingClarity: number | null;
  ratingTimeliness: number | null;
  body: string;
  displayName: string;
  displayNameMode: DisplayNameMode;
  status: FeedbackStatus;
  rejectReason: string | null;
  businessReply: string | null;
  publishedAt: number | null;
  createdAt: number;
};

export function maskDisplayName(
  fullName: string,
  mode: DisplayNameMode,
): string {
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'Ziyaretçi';
  if (mode === 'anonymous') return 'Anonim ziyaretçi';
  if (mode === 'full') return cleaned;
  return cleaned
    .split(' ')
    .map((part) => `${part.charAt(0).toLocaleUpperCase('tr-TR')}.`)
    .join(' ');
}

export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  const total = ratings.reduce((sum, value) => sum + value, 0);
  return Math.round((total / ratings.length) * 10) / 10;
}

export function ratingDistribution(ratings: number[]): Record<number, number> {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rating of ratings)
    if (rating >= 1 && rating <= 5) distribution[rating] += 1;
  return distribution;
}

export type FeedbackInput = {
  rating: number;
  ratingCommunication: number | null;
  ratingClarity: number | null;
  ratingTimeliness: number | null;
  body: string;
  displayNameMode: DisplayNameMode;
  publishConsent: boolean;
};

export type FeedbackParseResult =
  | { ok: true; value: FeedbackInput }
  | { ok: false; error: string; field?: string };

function subRating(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

export function parseFeedbackInput(
  body: Record<string, unknown>,
): FeedbackParseResult {
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return { ok: false, error: 'Puan 1 ile 5 arasında olmalıdır.', field: 'rating' };

  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (text.length > 600)
    return {
      ok: false,
      error: 'Yorum en fazla 600 karakter olabilir.',
      field: 'body',
    };

  const mode =
    body.displayNameMode === 'full' ||
    body.displayNameMode === 'initials' ||
    body.displayNameMode === 'anonymous'
      ? body.displayNameMode
      : 'initials';

  if (body.publishConsent !== true)
    return {
      ok: false,
      error: 'Yayın izni verilmeden yorum kaydedilemez.',
      field: 'publishConsent',
    };

  return {
    ok: true,
    value: {
      rating,
      ratingCommunication: subRating(body.ratingCommunication),
      ratingClarity: subRating(body.ratingClarity),
      ratingTimeliness: subRating(body.ratingTimeliness),
      body: text.replace(/[<>]/g, ''),
      displayNameMode: mode,
      publishConsent: true,
    },
  };
}

/** Davet jetonu: 32 karakterlik onaltılık dizi, 14 gün geçerli. */
export function generateFeedbackToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const FEEDBACK_TOKEN_TTL_MS = 14 * 86_400_000;
