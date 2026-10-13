import { getUmrahPackageStatus } from '@/lib/commercial-gates';
import { riyadhToday } from '@/lib/date-validation';
import { env } from '@/lib/server-env';
import {
  createLiveRawdahProviderFromEnv,
  type AvailabilitySlot,
  type Gender,
} from '@/packages/provider-rawdah/src';

/**
 * Yönetici özeti için gerçek veriler. Her tutar D1'deki kayıtlardan, kalan
 * randevu hakkı ve müsaitlik canlı RawdahBooking'den okunur. Okunamayan değer
 * sıfır gibi gösterilmez, `null` döner ve ekranda "okunamadı" yazılır.
 *
 * Tutarlar USD kuruş (minor) cinsindendir.
 */

export type MoneyLine = { amountMinor: number; count: number };

export type ReconciliationRow = {
  source: 'agency' | 'quote';
  id: string;
  label: string;
  status: 'purchasing' | 'unknown' | 'failed';
  dateKey: string;
  timeSlot: string;
  quantity: number;
  error: string | null;
  updatedAt: number;
};

export type DayAvailability = {
  dateKey: string;
  day: 'today' | 'tomorrow';
  gender: Gender;
  openSlots: number;
  capacity: number;
  capacityPlus: boolean;
  firstWindow: string | null;
};

export type ExecutiveStats = {
  generatedAt: number;
  money: {
    creditSales: MoneyLine;
    confirmedQuotes: MoneyLine;
    confirmedOrders: MoneyLine;
    pendingQuotes: MoneyLine;
    pendingOrders: MoneyLine;
  } | null;
  provider: {
    balance: number | null;
    usedAppointments: number | null;
    availability: DayAvailability[] | null;
  };
  queue: {
    pendingAgencies: number;
    activeAgencies: number;
    pendingCreditRequests: number;
    newQuotes: number;
    failedNotifications: number;
    queuedNotifications: number;
  } | null;
  reconciliation: ReconciliationRow[] | null;
  switches: { label: string; on: boolean }[];
  umrahGates: { label: string; ready: boolean }[];
};

const CONFIRMED_QUOTE = `('confirmed','scheduled','qr_ready','delivered','closed')`;
// 'purchasing' yalnız takılı kaldıysa (10 dk) mutabakat konusudur.
const STUCK_MS = 10 * 60 * 1000;

function db(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

async function tableExists(name: string) {
  const row = await db()
    .prepare(
      `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .bind(name)
    .first<{ ok: number }>();
  return Boolean(row);
}

async function money(sql: string): Promise<MoneyLine> {
  const row = await db()
    .prepare(sql)
    .first<{ amount: number | null; n: number }>();
  return { amountMinor: Number(row?.amount ?? 0), count: Number(row?.n ?? 0) };
}

async function count(sql: string): Promise<number> {
  const row = await db().prepare(sql).first<{ n: number }>();
  return Number(row?.n ?? 0);
}

async function readMoney(): Promise<ExecutiveStats['money']> {
  const [hasCredit, hasQuotes, hasOrders] = await Promise.all([
    tableExists('agency_credit_requests'),
    tableExists('quote_requests'),
    tableExists('customer_orders'),
  ]);
  const empty: MoneyLine = { amountMinor: 0, count: 0 };
  const [
    creditSales,
    confirmedQuotes,
    pendingQuotes,
    confirmedOrders,
    pendingOrders,
  ] = await Promise.all([
    hasCredit
      ? money(`SELECT SUM(approved_quantity * unit_price_minor) AS amount, COUNT(*) AS n
             FROM agency_credit_requests
            WHERE status = 'approved' AND currency = 'USD'
              AND unit_price_minor IS NOT NULL AND approved_quantity IS NOT NULL`)
      : empty,
    hasQuotes
      ? money(`SELECT SUM(quoted_amount_minor) AS amount, COUNT(*) AS n FROM quote_requests
            WHERE status IN ${CONFIRMED_QUOTE} AND quoted_amount_minor IS NOT NULL`)
      : empty,
    hasQuotes
      ? money(`SELECT SUM(quoted_amount_minor) AS amount, COUNT(*) AS n FROM quote_requests
            WHERE status = 'quoted' AND quoted_amount_minor IS NOT NULL`)
      : empty,
    hasOrders
      ? money(`SELECT SUM(amount_minor) AS amount, COUNT(*) AS n FROM customer_orders
            WHERE status = 'confirmed' AND currency = 'USD'`)
      : empty,
    hasOrders
      ? money(`SELECT SUM(amount_minor) AS amount, COUNT(*) AS n FROM customer_orders
            WHERE status IN ('awaiting_payment','payment_pending') AND currency = 'USD'`)
      : empty,
  ]);
  return {
    creditSales,
    confirmedQuotes,
    confirmedOrders,
    pendingQuotes,
    pendingOrders,
  };
}

async function readQueue(): Promise<ExecutiveStats['queue']> {
  const [hasAgencies, hasCredit, hasQuotes, hasOutbox] = await Promise.all([
    tableExists('agency_accounts'),
    tableExists('agency_credit_requests'),
    tableExists('quote_requests'),
    tableExists('notification_outbox'),
  ]);
  const [
    pendingAgencies,
    activeAgencies,
    pendingCreditRequests,
    newQuotes,
    failedNotifications,
    queuedNotifications,
  ] = await Promise.all([
    hasAgencies
      ? count(
          `SELECT COUNT(*) AS n FROM agency_accounts WHERE status = 'pending'`,
        )
      : 0,
    hasAgencies
      ? count(
          `SELECT COUNT(*) AS n FROM agency_accounts WHERE status = 'active'`,
        )
      : 0,
    hasCredit
      ? count(
          `SELECT COUNT(*) AS n FROM agency_credit_requests WHERE status = 'pending'`,
        )
      : 0,
    hasQuotes
      ? count(`SELECT COUNT(*) AS n FROM quote_requests WHERE status = 'new'`)
      : 0,
    hasOutbox
      ? count(
          `SELECT COUNT(*) AS n FROM notification_outbox WHERE status = 'failed'`,
        )
      : 0,
    hasOutbox
      ? count(
          `SELECT COUNT(*) AS n FROM notification_outbox WHERE status = 'queued'`,
        )
      : 0,
  ]);
  return {
    pendingAgencies,
    activeAgencies,
    pendingCreditRequests,
    newQuotes,
    failedNotifications,
    queuedNotifications,
  };
}

type BookingRow = {
  id: string;
  label: string;
  status: ReconciliationRow['status'] | 'purchased' | 'shared';
  date_key: string;
  time_slot: string;
  quantity: number;
  error: string | null;
  updated_at: number;
};

async function readBookings(): Promise<{
  rows: ReconciliationRow[];
  used: number;
}> {
  const [hasAgency, hasQuote] = await Promise.all([
    tableExists('agency_bookings'),
    tableExists('quote_rawdah_bookings'),
  ]);
  const stuckBefore = Date.now() - STUCK_MS;
  const problem = `(status IN ('unknown','failed') OR (status = 'purchasing' AND updated_at < ${stuckBefore}))`;
  const rows: ReconciliationRow[] = [];
  let used = 0;
  for (const [source, ok, table, label] of [
    [
      'agency',
      hasAgency,
      'agency_bookings',
      `COALESCE(NULLIF(group_name, ''), group_code)`,
    ],
    ['quote', hasQuote, 'quote_rawdah_bookings', 'group_code'],
  ] as const) {
    if (!ok) continue;
    used += await count(
      `SELECT COALESCE(SUM(quantity), 0) AS n FROM ${table} WHERE status IN ('purchased','shared')`,
    );
    const result = await db()
      .prepare(
        `SELECT id, ${label} AS label, status, date_key, time_slot, quantity, error, updated_at
           FROM ${table} WHERE ${problem} ORDER BY updated_at DESC LIMIT 20`,
      )
      .all<BookingRow>();
    for (const row of result.results) {
      rows.push({
        source,
        id: row.id,
        label: row.label,
        status: row.status as ReconciliationRow['status'],
        dateKey: row.date_key,
        timeSlot: row.time_slot,
        quantity: row.quantity,
        error: row.error,
        updatedAt: row.updated_at,
      });
    }
  }
  rows.sort((a, b) => b.updatedAt - a.updatedAt);
  return { rows, used };
}

function summarizeDay(
  dateKey: string,
  day: DayAvailability['day'],
  slots: AvailabilitySlot[],
): DayAvailability[] {
  return (['female', 'male'] as const).map((gender) => {
    const open = slots
      .filter(
        (slot) =>
          slot.gender === gender &&
          (slot.available === '50+' || slot.available > 0),
      )
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    return {
      dateKey,
      day,
      gender,
      openSlots: open.length,
      capacity: open.reduce(
        (sum, slot) => sum + (slot.available === '50+' ? 50 : slot.available),
        0,
      ),
      capacityPlus: open.some((slot) => slot.available === '50+'),
      firstWindow: open[0]?.window ?? null,
    };
  });
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function readProvider() {
  if (process.env.RAWDAH_LIVE_ENABLED !== 'true')
    return { balance: null, availability: null };
  const provider = createLiveRawdahProviderFromEnv();
  // Önce giriş + bakiye; aynı token sonraki iki müsaitlik okumasında kullanılır.
  const balance = await provider.getAppointmentBalance().catch(() => null);
  const today = riyadhToday();
  const days = [today, addDays(today, 1)];
  const results = await Promise.allSettled(
    days.map((day) => provider.getAvailability(day)),
  );
  const availability = results.every((result) => result.status === 'rejected')
    ? null
    : results.flatMap((result, index) =>
        result.status === 'fulfilled'
          ? summarizeDay(
              days[index],
              index === 0 ? 'today' : 'tomorrow',
              result.value.slots,
            )
          : [],
      );
  return { balance, availability };
}

const UMRAH_GATE_LABEL: Record<string, string> = {
  travel_agency_authority: 'Seyahat acentesi yetkisi',
  diyanet_umrah_authority: 'Diyanet umre yetkisi',
  package_tour_contract: 'Paket tur sözleşmesi',
  package_tour_insurance: 'Paket tur sigortası',
};

export async function getExecutiveStats(): Promise<ExecutiveStats> {
  const [moneyResult, queueResult, bookingsResult, providerResult] =
    await Promise.allSettled([
      readMoney(),
      readQueue(),
      readBookings(),
      readProvider(),
    ]);
  const bookings =
    bookingsResult.status === 'fulfilled' ? bookingsResult.value : null;
  const provider =
    providerResult.status === 'fulfilled'
      ? providerResult.value
      : { balance: null, availability: null };

  return {
    generatedAt: Date.now(),
    money: moneyResult.status === 'fulfilled' ? moneyResult.value : null,
    provider: { ...provider, usedAppointments: bookings?.used ?? null },
    queue: queueResult.status === 'fulfilled' ? queueResult.value : null,
    reconciliation: bookings?.rows ?? null,
    switches: [
      {
        label: 'Sağlayıcıdan canlı okuma',
        on: process.env.RAWDAH_LIVE_ENABLED === 'true',
      },
      {
        label: 'Sağlayıcıdan satın alma',
        on: process.env.RAWDAH_WRITE_ENABLED === 'true',
      },
      {
        label: 'QR paylaşım bağlantısı',
        on: process.env.RAWDAH_SHARE_LINK_ENABLED === 'true',
      },
      { label: 'E-posta bildirimi', on: Boolean(process.env.EMAIL_API_KEY) },
    ],
    umrahGates: getUmrahPackageStatus().gates.map((gate) => ({
      label: UMRAH_GATE_LABEL[gate.key] ?? gate.key,
      ready: gate.ready,
    })),
  };
}
