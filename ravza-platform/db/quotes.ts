import type { QuoteEditChanges } from '@/lib/quote-request';
import { env } from '@/lib/server-env';

import type {
  QuoteChannel,
  QuoteLocale,
  QuoteRequestInput,
  QuoteService,
  QuoteStatus,
  TimePreference,
} from '../lib/quote-request.ts';
import type { AppointmentPackageCode } from '../lib/appointment-packages.ts';

/**
 * Talep kayıtları. Kişisel veri taşıdığı için:
 * - IP ve tarayıcı bilgisi yalnız tuzlanmış özet olarak saklanır,
 * - listeleme yüzeyleri maskelenmiş görünümü kullanır,
 * - saklama süresi dolan kayıtlar anonimleştirilir (`anonymizeExpiredQuotes`).
 */

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS quote_requests (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL,
    service TEXT NOT NULL,
    package_code TEXT NOT NULL,
    person_count INTEGER NOT NULL,
    female_count INTEGER NOT NULL,
    male_count INTEGER NOT NULL,
    date_from TEXT NOT NULL,
    date_to TEXT NOT NULL,
    flexible INTEGER NOT NULL DEFAULT 0,
    time_preference TEXT NOT NULL DEFAULT 'any',
    full_name TEXT NOT NULL,
    phone_e164 TEXT NOT NULL,
    email TEXT,
    note TEXT,
    locale TEXT NOT NULL DEFAULT 'tr',
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    source_path TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    assigned_to TEXT,
    quoted_amount_minor INTEGER,
    quoted_currency TEXT,
    payment_method TEXT,
    payment_note TEXT,
    kvkk_consent_version TEXT NOT NULL,
    kvkk_consent_at INTEGER NOT NULL,
    marketing_consent INTEGER NOT NULL DEFAULT 0,
    ip_hash TEXT,
    user_agent_hash TEXT,
    anonymized_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_requests_code ON quote_requests(code)`,
  `CREATE INDEX IF NOT EXISTS idx_quote_requests_status_created ON quote_requests(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_quote_requests_ip_created ON quote_requests(ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS quote_request_events (
    id TEXT PRIMARY KEY NOT NULL,
    quote_request_id TEXT NOT NULL,
    type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    body TEXT,
    actor TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_quote_events_request ON quote_request_events(quote_request_id, created_at)`,
];

function getQuotesDb(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

let schemaReady: Promise<void> | null = null;

export function ensureQuoteDatabase(): Promise<void> {
  // Her istekte DDL çalıştırmamak için tek seferlik söz saklanır.
  schemaReady ??= (async () => {
    const db = getQuotesDb();
    await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  })();
  return schemaReady;
}

/** Tuzlanmış SHA-256. Tuz yoksa özet üretilmez; ham IP asla saklanmaz. */
export async function hashIdentifier(value: string): Promise<string | null> {
  const salt = process.env.PII_HASH_SALT ?? '';
  if (!salt || !value) return null;
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export type QuoteRequestRecord = {
  id: string;
  code: string;
  service: QuoteService;
  packageCode: AppointmentPackageCode;
  personCount: number;
  femaleCount: number;
  maleCount: number;
  dateFrom: string;
  dateTo: string;
  flexible: boolean;
  timePreference: TimePreference;
  fullName: string;
  phone: string;
  email: string | null;
  note: string | null;
  locale: QuoteLocale;
  channel: QuoteChannel;
  status: QuoteStatus;
  assignedTo: string | null;
  quotedAmountMinor: number | null;
  paymentMethod: string | null;
  paymentNote: string | null;
  marketingConsent: boolean;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

type QuoteRow = {
  id: string;
  code: string;
  service: string;
  package_code: string;
  person_count: number;
  female_count: number;
  male_count: number;
  date_from: string;
  date_to: string;
  flexible: number;
  time_preference: string;
  full_name: string;
  phone_e164: string;
  email: string | null;
  note: string | null;
  locale: string;
  channel: string;
  status: string;
  assigned_to: string | null;
  quoted_amount_minor: number | null;
  payment_method: string | null;
  payment_note: string | null;
  marketing_consent: number;
  created_at: number;
  updated_at: number;
  expires_at: number;
};

function mapRow(row: QuoteRow): QuoteRequestRecord {
  return {
    id: row.id,
    code: row.code,
    service: row.service as QuoteService,
    packageCode: row.package_code as AppointmentPackageCode,
    personCount: row.person_count,
    femaleCount: row.female_count,
    maleCount: row.male_count,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    flexible: row.flexible === 1,
    timePreference: row.time_preference as TimePreference,
    fullName: row.full_name,
    phone: row.phone_e164,
    email: row.email,
    note: row.note,
    locale: row.locale as QuoteLocale,
    channel: row.channel as QuoteChannel,
    status: row.status as QuoteStatus,
    assignedTo: row.assigned_to,
    quotedAmountMinor: row.quoted_amount_minor,
    paymentMethod: row.payment_method,
    paymentNote: row.payment_note,
    marketingConsent: row.marketing_consent === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

const EXPIRY_DAYS = 14;

export async function createQuoteRequest(
  input: QuoteRequestInput,
  meta: {
    code: string;
    channel: QuoteChannel;
    sourcePath: string | null;
    kvkkConsentVersion: string;
    ipHash: string | null;
    userAgentHash: string | null;
  },
): Promise<QuoteRequestRecord> {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  const now = Date.now();
  const id = `QR-${crypto.randomUUID()}`;
  await db
    .prepare(
      `INSERT INTO quote_requests (
        id, code, service, package_code, person_count, female_count, male_count,
        date_from, date_to, flexible, time_preference, full_name, phone_e164,
        email, note, locale, channel, source_path, status, kvkk_consent_version,
        kvkk_consent_at, marketing_consent, ip_hash, user_agent_hash,
        created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      meta.code,
      input.service,
      input.packageCode,
      input.personCount,
      input.femaleCount,
      input.maleCount,
      input.dateFrom,
      input.dateTo,
      input.flexible ? 1 : 0,
      input.timePreference,
      input.fullName,
      input.phone,
      input.email,
      input.note,
      input.locale,
      meta.channel,
      meta.sourcePath,
      meta.kvkkConsentVersion,
      now,
      input.marketingConsent ? 1 : 0,
      meta.ipHash,
      meta.userAgentHash,
      now,
      now,
      now + EXPIRY_DAYS * 86_400_000,
    )
    .run();

  await appendQuoteEvent(id, {
    type: 'status_change',
    fromStatus: null,
    toStatus: 'new',
    body: null,
    actor: 'customer',
  });

  const row = await db
    .prepare('SELECT * FROM quote_requests WHERE id = ?')
    .bind(id)
    .first<QuoteRow>();
  if (!row) throw new Error('quote_request_insert_failed');
  return mapRow(row);
}

export type QuoteEvent = {
  type: 'status_change' | 'note' | 'contact';
  fromStatus: QuoteStatus | null;
  toStatus: QuoteStatus | null;
  body: string | null;
  actor: string;
};

export async function appendQuoteEvent(
  quoteRequestId: string,
  event: QuoteEvent,
): Promise<void> {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  await db
    .prepare(
      `INSERT INTO quote_request_events
        (id, quote_request_id, type, from_status, to_status, body, actor, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      `QE-${crypto.randomUUID()}`,
      quoteRequestId,
      event.type,
      event.fromStatus,
      event.toStatus,
      event.body,
      event.actor,
      Date.now(),
    )
    .run();
}

export async function listQuoteEvents(quoteRequestId: string) {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  const result = await db
    .prepare(
      'SELECT * FROM quote_request_events WHERE quote_request_id = ? ORDER BY created_at ASC',
    )
    .bind(quoteRequestId)
    .all<{
      id: string;
      type: string;
      from_status: string | null;
      to_status: string | null;
      body: string | null;
      actor: string;
      created_at: number;
    }>();
  return result.results.map((row) => ({
    id: row.id,
    type: row.type as QuoteEvent['type'],
    fromStatus: row.from_status as QuoteStatus | null,
    toStatus: row.to_status as QuoteStatus | null,
    body: row.body,
    actor: row.actor,
    createdAt: row.created_at,
  }));
}

export async function findQuoteByCode(
  code: string,
): Promise<QuoteRequestRecord | null> {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  const row = await db
    .prepare('SELECT * FROM quote_requests WHERE code = ?')
    .bind(code.trim().toUpperCase())
    .first<QuoteRow>();
  return row ? mapRow(row) : null;
}

export async function listQuoteRequests(
  options: { status?: QuoteStatus; limit?: number } = {},
): Promise<QuoteRequestRecord[]> {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);
  const result = options.status
    ? await db
        .prepare(
          'SELECT * FROM quote_requests WHERE status = ? ORDER BY created_at DESC LIMIT ?',
        )
        .bind(options.status, limit)
        .all<QuoteRow>()
    : await db
        .prepare(
          'SELECT * FROM quote_requests ORDER BY created_at DESC LIMIT ?',
        )
        .bind(limit)
        .all<QuoteRow>();
  return result.results.map(mapRow);
}

export async function countQuoteStatuses(): Promise<
  Record<string, number>
> {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  const result = await db
    .prepare('SELECT status, COUNT(*) AS total FROM quote_requests GROUP BY status')
    .all<{ status: string; total: number }>();
  const counts: Record<string, number> = {};
  for (const row of result.results) counts[row.status] = row.total;
  return counts;
}

export async function updateQuoteStatus(
  id: string,
  toStatus: QuoteStatus,
  fromStatus: QuoteStatus,
  actor: string,
  body: string | null = null,
): Promise<void> {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  await db
    .prepare('UPDATE quote_requests SET status = ?, updated_at = ? WHERE id = ?')
    .bind(toStatus, Date.now(), id)
    .run();
  await appendQuoteEvent(id, {
    type: 'status_change',
    fromStatus,
    toStatus,
    body,
    actor,
  });
}

export async function setQuoteCommercials(
  id: string,
  input: {
    quotedAmountMinor: number | null;
    paymentMethod: string | null;
    paymentNote: string | null;
    assignedTo: string | null;
  },
): Promise<void> {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  await db
    .prepare(
      `UPDATE quote_requests SET quoted_amount_minor = ?, quoted_currency = 'USD',
        payment_method = ?, payment_note = ?, assigned_to = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      input.quotedAmountMinor,
      input.paymentMethod,
      input.paymentNote,
      input.assignedTo,
      Date.now(),
      id,
    )
    .run();
}

/** Basit hacim sınırı: aynı tuzlanmış IP özeti için pencere içindeki talep. */
export async function countRecentQuotesByIp(
  ipHash: string,
  windowMs: number,
): Promise<number> {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  const row = await db
    .prepare(
      'SELECT COUNT(*) AS total FROM quote_requests WHERE ip_hash = ? AND created_at > ?',
    )
    .bind(ipHash, Date.now() - windowMs)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

/**
 * Saklama politikası: kapanmış talepler 24 ay sonra anonimleştirilir.
 * Kayıt silinmez; istatistik için kişisel olmayan alanlar kalır.
 */
export async function anonymizeExpiredQuotes(
  retentionMonths = 24,
): Promise<number> {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  const threshold = Date.now() - retentionMonths * 30 * 86_400_000;
  const result = await db
    .prepare(
      `UPDATE quote_requests SET
        full_name = 'anonim', phone_e164 = '', email = NULL, note = NULL,
        ip_hash = NULL, user_agent_hash = NULL, anonymized_at = ?
       WHERE created_at < ? AND anonymized_at IS NULL`,
    )
    .bind(Date.now(), threshold)
    .run();
  return result.meta.changes ?? 0;
}

/** Panel istatistikleri için: verilen andan sonra oluşturulan talepler (kişisel veri yok). */
export async function listQuotesForStats(sinceMs: number) {
  await ensureQuoteDatabase();
  const result = await getQuotesDb()
    .prepare(
      `SELECT created_at, status, person_count, female_count, male_count
       FROM quote_requests WHERE created_at >= ?`,
    )
    .bind(sinceMs)
    .all<{
      created_at: number;
      status: string;
      person_count: number;
      female_count: number;
      male_count: number;
    }>();
  return (result.results ?? []).map((row) => ({
    createdAt: row.created_at,
    status: row.status,
    personCount: row.person_count,
    femaleCount: row.female_count,
    maleCount: row.male_count,
  }));
}

/** Panel istatistikleri için: onay ve QR hazır durum geçişleri. */
export async function listStatusEventsForStats(sinceMs: number) {
  await ensureQuoteDatabase();
  const result = await getQuotesDb()
    .prepare(
      `SELECT to_status, created_at FROM quote_request_events
       WHERE type = 'status_change' AND to_status IN ('confirmed', 'qr_ready') AND created_at >= ?`,
    )
    .bind(sinceMs)
    .all<{ to_status: string; created_at: number }>();
  return (result.results ?? []).map((row) => ({ toStatus: row.to_status, createdAt: row.created_at }));
}

const editColumns: Record<keyof QuoteEditChanges, string> = {
  fullName: 'full_name',
  phone: 'phone_e164',
  email: 'email',
  personCount: 'person_count',
  femaleCount: 'female_count',
  maleCount: 'male_count',
  dateFrom: 'date_from',
  dateTo: 'date_to',
  flexible: 'flexible',
  timePreference: 'time_preference',
  note: 'note',
};

/** Yönetici düzenlemesini kaydeder ve geçmişe hangi alanların değiştiğini yazar. */
export async function updateQuoteDetails(
  id: string,
  changes: QuoteEditChanges,
  actor: string,
): Promise<void> {
  await ensureQuoteDatabase();
  const entries = (Object.entries(changes) as Array<[keyof QuoteEditChanges, unknown]>).filter(
    ([key]) => key in editColumns,
  );
  if (!entries.length) return;
  const values = entries.map(([key, value]) =>
    key === 'flexible' ? (value ? 1 : 0) : (value ?? null),
  );
  await getQuotesDb()
    .prepare(
      `UPDATE quote_requests SET ${entries.map(([key]) => `${editColumns[key]} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
    )
    .bind(...(values as Array<string | number | null>), Date.now(), id)
    .run();
  const labels: Partial<Record<keyof QuoteEditChanges, string>> = {
    fullName: 'ad soyad',
    phone: 'telefon',
    email: 'e-posta',
    femaleCount: 'kişi dağılımı',
    dateFrom: 'tarih',
    flexible: 'esneklik',
    timePreference: 'saat tercihi',
    note: 'not',
  };
  const changed = [...new Set(entries.map(([key]) => labels[key]).filter(Boolean))];
  await appendQuoteEvent(id, {
    type: 'note',
    fromStatus: null,
    toStatus: null,
    body: `Talep bilgileri düzenlendi: ${changed.join(', ')}`,
    actor,
  });
}

/**
 * Talebi ve ona bağlı kayıtları (geçmiş, geri bildirim daveti) kalıcı olarak
 * siler. Ravza satın alma kayıtları `db/rawdah-bookings` tarafından ayrıca silinir.
 */
export async function deleteQuoteRequest(id: string): Promise<void> {
  await ensureQuoteDatabase();
  const db = getQuotesDb();
  const hasFeedback = await db
    .prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'feedback'`)
    .first<{ ok: number }>();
  await db.batch([
    db.prepare('DELETE FROM quote_request_events WHERE quote_request_id = ?').bind(id),
    ...(hasFeedback ? [db.prepare('DELETE FROM feedback WHERE quote_request_id = ?').bind(id)] : []),
    db.prepare('DELETE FROM quote_requests WHERE id = ?').bind(id),
  ]);
}
