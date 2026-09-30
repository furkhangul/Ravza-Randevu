import { env } from '@/lib/server-env';

/**
 * Talep başına RawdahBooking satın alımları ve QR paylaşım bağlantıları.
 *
 * Bir talep için her cinsiyetten en fazla bir satın alım kaydı olabilir
 * (tekil indeks). Satın alma isteği gönderilmeden önce kayıt `purchasing`
 * durumunda açılır; aynı anda ikinci bir istek bu indekse takılır. Böylece
 * çift tıklama, iki sekme veya ağ tekrarında kontör iki kez harcanmaz.
 */

export type BookingGender = 'female' | 'male';

export type BookingStatus =
  /** İstek gönderiliyor; sonucu henüz bilinmiyor. */
  | 'purchasing'
  /** Satın alındı, QR bağlantısı henüz oluşturulamadı. */
  | 'purchased'
  /** Bağlantı koptu veya sağlayıcı belirsiz yanıt verdi; kör tekrar yapılmaz. */
  | 'unknown'
  /** Sağlayıcı reddetti; kontör düşülmedi, yeniden denenebilir. */
  | 'failed'
  /** Satın alındı ve QR paylaşım bağlantısı hazır. */
  | 'shared';

export type RawdahBooking = {
  id: string;
  quoteRequestId: string;
  gender: BookingGender;
  dateKey: string;
  timeSlot: string;
  quantity: number;
  groupCode: string;
  status: BookingStatus;
  purchaseId: string | null;
  balanceAfter: number | null;
  shareCode: string | null;
  shareUrl: string | null;
  sharedCount: number | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

export type SlotPreference = {
  date: string;
  female: { timeSlot: string; window: string } | null;
  male: { timeSlot: string; window: string } | null;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS quote_slot_preferences (
    quote_request_id TEXT PRIMARY KEY NOT NULL,
    slots_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS quote_rawdah_bookings (
    id TEXT PRIMARY KEY NOT NULL,
    quote_request_id TEXT NOT NULL,
    gender TEXT NOT NULL,
    date_key TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    group_code TEXT NOT NULL,
    status TEXT NOT NULL,
    purchase_id TEXT,
    balance_after INTEGER,
    share_code TEXT,
    share_url TEXT,
    shared_count INTEGER,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_rawdah_bookings_gender
    ON quote_rawdah_bookings(quote_request_id, gender)`,
];

function getDb(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const db = getDb();
    await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

type BookingRow = {
  id: string;
  quote_request_id: string;
  gender: BookingGender;
  date_key: string;
  time_slot: string;
  quantity: number;
  group_code: string;
  status: BookingStatus;
  purchase_id: string | null;
  balance_after: number | null;
  share_code: string | null;
  share_url: string | null;
  shared_count: number | null;
  error: string | null;
  created_at: number;
  updated_at: number;
};

function mapRow(row: BookingRow): RawdahBooking {
  return {
    id: row.id,
    quoteRequestId: row.quote_request_id,
    gender: row.gender,
    dateKey: row.date_key,
    timeSlot: row.time_slot,
    quantity: row.quantity,
    groupCode: row.group_code,
    status: row.status,
    purchaseId: row.purchase_id,
    balanceAfter: row.balance_after,
    shareCode: row.share_code,
    shareUrl: row.share_url,
    sharedCount: row.shared_count,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const timePattern = /^\d{2}:\d{2}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

/** İstemciden gelen saat seçimini doğrular; geçersizse `null`. */
export function parseSlotPreference(value: unknown): SlotPreference | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const date = typeof record.date === 'string' ? record.date : '';
  if (!datePattern.test(date)) return null;
  const pick = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return null;
    const slot = raw as Record<string, unknown>;
    const timeSlot = typeof slot.timeSlot === 'string' ? slot.timeSlot : '';
    const window = typeof slot.window === 'string' ? slot.window.slice(0, 20) : '';
    return timePattern.test(timeSlot) ? { timeSlot, window } : null;
  };
  const female = pick(record.female);
  const male = pick(record.male);
  if (!female && !male) return null;
  return { date, female, male };
}

export async function saveSlotPreference(quoteRequestId: string, preference: SlotPreference) {
  await ensureSchema();
  await getDb()
    .prepare(
      `INSERT OR REPLACE INTO quote_slot_preferences (quote_request_id, slots_json, created_at)
       VALUES (?, ?, ?)`,
    )
    .bind(quoteRequestId, JSON.stringify(preference), Date.now())
    .run();
}

export async function getSlotPreference(quoteRequestId: string): Promise<SlotPreference | null> {
  await ensureSchema();
  const row = await getDb()
    .prepare('SELECT slots_json FROM quote_slot_preferences WHERE quote_request_id = ?')
    .bind(quoteRequestId)
    .first<{ slots_json: string }>();
  if (!row) return null;
  try {
    return parseSlotPreference(JSON.parse(row.slots_json));
  } catch {
    return null;
  }
}

export async function listBookings(quoteRequestId: string): Promise<RawdahBooking[]> {
  await ensureSchema();
  const result = await getDb()
    .prepare(
      'SELECT * FROM quote_rawdah_bookings WHERE quote_request_id = ? ORDER BY gender ASC',
    )
    .bind(quoteRequestId)
    .all<BookingRow>();
  return (result.results ?? []).map(mapRow);
}

/**
 * Satın almadan önce kaydı kilitler. Aynı talep ve cinsiyet için başarısız
 * olmayan bir kayıt varsa `null` döner ve satın alma yapılmamalıdır.
 */
export async function claimBooking(input: {
  quoteRequestId: string;
  gender: BookingGender;
  dateKey: string;
  timeSlot: string;
  quantity: number;
  groupCode: string;
}): Promise<RawdahBooking | null> {
  await ensureSchema();
  const db = getDb();
  const now = Date.now();
  // Önceki başarısız deneme yenisine yer açar; diğer durumlar kilitli kalır.
  await db
    .prepare(
      `DELETE FROM quote_rawdah_bookings
       WHERE quote_request_id = ? AND gender = ? AND status = 'failed'`,
    )
    .bind(input.quoteRequestId, input.gender)
    .run();
  const id = `QRB-${crypto.randomUUID()}`;
  try {
    await db
      .prepare(
        `INSERT INTO quote_rawdah_bookings
          (id, quote_request_id, gender, date_key, time_slot, quantity, group_code,
           status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'purchasing', ?, ?)`,
      )
      .bind(
        id,
        input.quoteRequestId,
        input.gender,
        input.dateKey,
        input.timeSlot,
        input.quantity,
        input.groupCode,
        now,
        now,
      )
      .run();
  } catch {
    return null;
  }
  const row = await db
    .prepare('SELECT * FROM quote_rawdah_bookings WHERE id = ?')
    .bind(id)
    .first<BookingRow>();
  return row ? mapRow(row) : null;
}

export async function updateBooking(
  id: string,
  patch: Partial<
    Pick<
      RawdahBooking,
      'status' | 'purchaseId' | 'balanceAfter' | 'shareCode' | 'shareUrl' | 'sharedCount' | 'error'
    >
  >,
) {
  await ensureSchema();
  const columns: Record<string, string> = {
    status: 'status',
    purchaseId: 'purchase_id',
    balanceAfter: 'balance_after',
    shareCode: 'share_code',
    shareUrl: 'share_url',
    sharedCount: 'shared_count',
    error: 'error',
  };
  const entries = Object.entries(patch).filter(([key]) => key in columns);
  if (!entries.length) return;
  const assignments = entries.map(([key]) => `${columns[key]} = ?`).join(', ');
  await getDb()
    .prepare(`UPDATE quote_rawdah_bookings SET ${assignments}, updated_at = ? WHERE id = ?`)
    .bind(...entries.map(([, value]) => value ?? null), Date.now(), id)
    .run();
}

/** Talep silinirken saat tercihi ve satın alma kayıtları da silinir. */
export async function deleteRawdahDataForQuote(quoteRequestId: string) {
  await ensureSchema();
  const db = getDb();
  await db.batch([
    db.prepare('DELETE FROM quote_slot_preferences WHERE quote_request_id = ?').bind(quoteRequestId),
    db.prepare('DELETE FROM quote_rawdah_bookings WHERE quote_request_id = ?').bind(quoteRequestId),
  ]);
}
