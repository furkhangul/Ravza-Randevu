import { acceptanceStatement } from '@/db/legal-acceptances';
import { AGENCY_TERMS_VERSION } from '@/lib/agency-terms';
import { DISCLAIMER_VERSION } from '@/lib/disclaimer';
import { env } from '@/lib/server-env';

/**
 * Acente / şirket portalı veri katmanı.
 *
 * Acenteler admin yetki sisteminden (admin_credentials, users) tamamen ayrı
 * tablolarda tutulur; bir acente hesabı hiçbir koşulda panel yetkisi kazanmaz.
 *
 * Kontör defteri (agency_credit_ledger) tek doğruluk kaynağıdır: bakiye,
 * hareketlerin toplamıdır. Harcama, bakiye yeterliyse tek bir SQL ifadesiyle
 * yazılır; iki eşzamanlı istek bakiyeyi eksiye düşüremez. Her hareketin
 * (tür, referans) çifti tekildir; aynı işlem iki kez deftere işlenemez.
 */

export type AgencyStatus = 'pending' | 'active' | 'rejected' | 'suspended';
export type CreditRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LedgerType = 'allocation' | 'consumption' | 'refund' | 'adjustment';
export type AgencyBookingStatus = 'purchasing' | 'purchased' | 'unknown' | 'failed' | 'shared';

export type Agency = {
  id: string;
  companyName: string;
  taxOffice: string;
  taxNumber: string;
  tursabNumber: string;
  address: string;
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: AgencyStatus;
  rejectReason: string | null;
  adminNote: string | null;
  createdAt: number;
  approvedAt: number | null;
  approvedBy: string | null;
  updatedAt: number;
  termsVersion: string | null;
  termsAcceptedAt: number | null;
};

export type AgencyMember = {
  id: string;
  agencyId: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'owner' | 'staff';
  status: 'active' | 'suspended';
  passwordHash: string;
  passwordSalt: string;
  iterations: number;
  failedAttempts: number;
  lockedUntil: number | null;
  lastLoginAt: number | null;
  createdAt: number;
};

export type CreditRequest = {
  id: string;
  agencyId: string;
  quantity: number;
  note: string | null;
  status: CreditRequestStatus;
  approvedQuantity: number | null;
  unitPriceMinor: number | null;
  currency: string;
  paymentNote: string | null;
  decisionNote: string | null;
  requestedBy: string;
  decidedBy: string | null;
  decidedAt: number | null;
  createdAt: number;
};

export type LedgerEntry = {
  id: string;
  agencyId: string;
  amount: number;
  type: LedgerType;
  reference: string;
  note: string | null;
  actor: string;
  createdAt: number;
};

export type AgencyBooking = {
  id: string;
  agencyId: string;
  memberId: string;
  groupName: string;
  groupCode: string;
  gender: 'female' | 'male';
  dateKey: string;
  timeSlot: string;
  quantity: number;
  status: AgencyBookingStatus;
  purchaseId: string | null;
  shareCode: string | null;
  shareUrl: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS agency_accounts (
    id TEXT PRIMARY KEY NOT NULL,
    company_name TEXT NOT NULL,
    tax_office TEXT NOT NULL DEFAULT '',
    tax_number TEXT NOT NULL DEFAULT '',
    tursab_number TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reject_reason TEXT,
    admin_note TEXT,
    created_at INTEGER NOT NULL,
    approved_at INTEGER,
    approved_by TEXT,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_accounts_tax ON agency_accounts(tax_number) WHERE tax_number <> ''`,
  `CREATE TABLE IF NOT EXISTS agency_members (
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'owner',
    status TEXT NOT NULL DEFAULT 'active',
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    iterations INTEGER NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    last_login_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_members_email ON agency_members(email)`,
  `CREATE INDEX IF NOT EXISTS idx_agency_members_agency ON agency_members(agency_id)`,
  `CREATE TABLE IF NOT EXISTS agency_credit_requests (
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_quantity INTEGER,
    unit_price_minor INTEGER,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_note TEXT,
    decision_note TEXT,
    requested_by TEXT NOT NULL,
    decided_by TEXT,
    decided_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_agency_credit_requests_agency ON agency_credit_requests(agency_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS agency_credit_ledger (
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    reference TEXT NOT NULL,
    note TEXT,
    actor TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_ledger_reference ON agency_credit_ledger(type, reference)`,
  `CREATE INDEX IF NOT EXISTS idx_agency_ledger_agency ON agency_credit_ledger(agency_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS agency_bookings (
    id TEXT PRIMARY KEY NOT NULL,
    agency_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    group_name TEXT NOT NULL DEFAULT '',
    group_code TEXT NOT NULL,
    gender TEXT NOT NULL,
    date_key TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL,
    purchase_id TEXT,
    share_code TEXT,
    share_url TEXT,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_agency_bookings_agency ON agency_bookings(agency_id, created_at)`,
];

function getDb(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

let schemaReady: Promise<void> | null = null;
export function ensureAgencySchema(): Promise<void> {
  schemaReady ??= (async () => {
    const db = getDb();
    await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
    // Sonradan eklenen sütunlar: tablo varsa eklenir, zaten varsa hata yutulur.
    for (const statement of [
      'ALTER TABLE agency_accounts ADD COLUMN terms_version TEXT',
      'ALTER TABLE agency_accounts ADD COLUMN terms_accepted_at INTEGER',
    ]) {
      try {
        await db.prepare(statement).run();
      } catch {
        // duplicate column: önceki bir istekte eklendi.
      }
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

/* ------------------------------------------------------------------ */
/* Satır eşlemeleri                                                    */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;
const str = (value: unknown) => (typeof value === 'string' ? value : '');
const num = (value: unknown) => (typeof value === 'number' ? value : Number(value ?? 0));
const optNum = (value: unknown) => (value === null || value === undefined ? null : Number(value));
const optStr = (value: unknown) => (typeof value === 'string' ? value : null);

function mapAgency(row: Row): Agency {
  return {
    id: str(row.id),
    companyName: str(row.company_name),
    taxOffice: str(row.tax_office),
    taxNumber: str(row.tax_number),
    tursabNumber: str(row.tursab_number),
    address: str(row.address),
    city: str(row.city),
    contactName: str(row.contact_name),
    contactPhone: str(row.contact_phone),
    contactEmail: str(row.contact_email),
    status: str(row.status) as AgencyStatus,
    rejectReason: optStr(row.reject_reason),
    adminNote: optStr(row.admin_note),
    createdAt: num(row.created_at),
    approvedAt: optNum(row.approved_at),
    approvedBy: optStr(row.approved_by),
    updatedAt: num(row.updated_at),
    termsVersion: optStr(row.terms_version),
    termsAcceptedAt: optNum(row.terms_accepted_at),
  };
}

function mapMember(row: Row): AgencyMember {
  return {
    id: str(row.id),
    agencyId: str(row.agency_id),
    email: str(row.email),
    fullName: str(row.full_name),
    phone: str(row.phone),
    role: str(row.role) as AgencyMember['role'],
    status: str(row.status) as AgencyMember['status'],
    passwordHash: str(row.password_hash),
    passwordSalt: str(row.password_salt),
    iterations: num(row.iterations),
    failedAttempts: num(row.failed_attempts),
    lockedUntil: optNum(row.locked_until),
    lastLoginAt: optNum(row.last_login_at),
    createdAt: num(row.created_at),
  };
}

function mapRequest(row: Row): CreditRequest {
  return {
    id: str(row.id),
    agencyId: str(row.agency_id),
    quantity: num(row.quantity),
    note: optStr(row.note),
    status: str(row.status) as CreditRequestStatus,
    approvedQuantity: optNum(row.approved_quantity),
    unitPriceMinor: optNum(row.unit_price_minor),
    currency: str(row.currency) || 'USD',
    paymentNote: optStr(row.payment_note),
    decisionNote: optStr(row.decision_note),
    requestedBy: str(row.requested_by),
    decidedBy: optStr(row.decided_by),
    decidedAt: optNum(row.decided_at),
    createdAt: num(row.created_at),
  };
}

function mapLedger(row: Row): LedgerEntry {
  return {
    id: str(row.id),
    agencyId: str(row.agency_id),
    amount: num(row.amount),
    type: str(row.type) as LedgerType,
    reference: str(row.reference),
    note: optStr(row.note),
    actor: str(row.actor),
    createdAt: num(row.created_at),
  };
}

function mapBooking(row: Row): AgencyBooking {
  return {
    id: str(row.id),
    agencyId: str(row.agency_id),
    memberId: str(row.member_id),
    groupName: str(row.group_name),
    groupCode: str(row.group_code),
    gender: str(row.gender) as AgencyBooking['gender'],
    dateKey: str(row.date_key),
    timeSlot: str(row.time_slot),
    quantity: num(row.quantity),
    status: str(row.status) as AgencyBookingStatus,
    purchaseId: optStr(row.purchase_id),
    shareCode: optStr(row.share_code),
    shareUrl: optStr(row.share_url),
    error: optStr(row.error),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

/* ------------------------------------------------------------------ */
/* Başvuru ve üyeler                                                   */
/* ------------------------------------------------------------------ */

export type AgencyRegistration = {
  companyName: string;
  taxOffice: string;
  taxNumber: string;
  tursabNumber: string;
  address: string;
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  password: { hash: string; salt: string; iterations: number };
  initialCredits: number;
};

/** Başvuruyu, sahip kullanıcıyı ve (varsa) ilk kontör talebini tek işlemde yazar. */
export async function createAgencyApplication(input: AgencyRegistration) {
  await ensureAgencySchema();
  const db = getDb();
  const now = Date.now();
  const agencyId = newId('AGN');
  const memberId = newId('AGM');
  const disclaimer = await acceptanceStatement(
    { subjectType: 'agency_member', subjectId: memberId, document: 'disclaimer', version: DISCLAIMER_VERSION },
    Math.floor(now / 1000),
  );
  await db.batch([
    db
      .prepare(
        `INSERT INTO agency_accounts
          (id, company_name, tax_office, tax_number, tursab_number, address, city,
           contact_name, contact_phone, contact_email, status, created_at, updated_at,
           terms_version, terms_accepted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      )
      .bind(
        agencyId,
        input.companyName,
        input.taxOffice,
        input.taxNumber,
        input.tursabNumber,
        input.address,
        input.city,
        input.contactName,
        input.contactPhone,
        input.contactEmail,
        now,
        now,
        AGENCY_TERMS_VERSION,
        now,
      ),
    db
      .prepare(
        `INSERT INTO agency_members
          (id, agency_id, email, full_name, phone, role, status, password_hash, password_salt, iterations, created_at)
         VALUES (?, ?, ?, ?, ?, 'owner', 'active', ?, ?, ?, ?)`,
      )
      .bind(
        memberId,
        agencyId,
        input.contactEmail,
        input.contactName,
        input.contactPhone,
        input.password.hash,
        input.password.salt,
        input.password.iterations,
        now,
      ),
    ...(input.initialCredits > 0
      ? [
          db
            .prepare(
              `INSERT INTO agency_credit_requests (id, agency_id, quantity, note, status, requested_by, created_at)
               VALUES (?, ?, ?, 'Başvuru ile birlikte istenen ilk kontör', 'pending', ?, ?)`,
            )
            .bind(newId('ACR'), agencyId, input.initialCredits, memberId, now),
        ]
      : []),
    disclaimer,
  ]);
  return { agencyId, memberId };
}

export async function findMemberByEmail(email: string) {
  await ensureAgencySchema();
  const row = await getDb()
    .prepare('SELECT * FROM agency_members WHERE email = ?')
    .bind(email)
    .first<Row>();
  return row ? mapMember(row) : null;
}

export async function findMemberById(id: string) {
  await ensureAgencySchema();
  const row = await getDb().prepare('SELECT * FROM agency_members WHERE id = ?').bind(id).first<Row>();
  return row ? mapMember(row) : null;
}

export async function findAgencyByTaxNumber(taxNumber: string) {
  await ensureAgencySchema();
  const row = await getDb()
    .prepare('SELECT * FROM agency_accounts WHERE tax_number = ?')
    .bind(taxNumber)
    .first<Row>();
  return row ? mapAgency(row) : null;
}

export async function getAgency(id: string) {
  await ensureAgencySchema();
  const row = await getDb().prepare('SELECT * FROM agency_accounts WHERE id = ?').bind(id).first<Row>();
  return row ? mapAgency(row) : null;
}

export async function recordLoginAttempt(memberId: string, success: boolean, lockMs: number, maxFailures: number) {
  const db = getDb();
  const now = Date.now();
  if (success) {
    await db
      .prepare(
        'UPDATE agency_members SET failed_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?',
      )
      .bind(now, memberId)
      .run();
    return;
  }
  await db
    .prepare(
      `UPDATE agency_members SET
        failed_attempts = CASE WHEN locked_until IS NOT NULL AND locked_until <= ? THEN 1 ELSE failed_attempts + 1 END,
        locked_until = CASE WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until <= ? THEN 1 ELSE failed_attempts + 1 END) >= ? THEN ? ELSE locked_until END
       WHERE id = ?`,
    )
    .bind(now, now, maxFailures, now + lockMs, memberId)
    .run();
}

/* ------------------------------------------------------------------ */
/* Kontör defteri                                                      */
/* ------------------------------------------------------------------ */

export async function agencyBalance(agencyId: string): Promise<number> {
  await ensureAgencySchema();
  const row = await getDb()
    .prepare('SELECT COALESCE(SUM(amount), 0) AS balance FROM agency_credit_ledger WHERE agency_id = ?')
    .bind(agencyId)
    .first<{ balance: number }>();
  return Number(row?.balance ?? 0);
}

/**
 * Deftere hareket yazar. (tür, referans) zaten varsa hiçbir şey yapmaz ve
 * `false` döner: aynı onay veya iade iki kez işlenemez.
 */
export async function addLedgerEntry(entry: {
  agencyId: string;
  amount: number;
  type: LedgerType;
  reference: string;
  note: string | null;
  actor: string;
}): Promise<boolean> {
  await ensureAgencySchema();
  const result = await getDb()
    .prepare(
      `INSERT OR IGNORE INTO agency_credit_ledger (id, agency_id, amount, type, reference, note, actor, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(newId('ALG'), entry.agencyId, entry.amount, entry.type, entry.reference, entry.note, entry.actor, Date.now())
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

/**
 * Bakiye yeterliyse harcamayı yazar; tek SQL ifadesi olduğu için iki
 * eşzamanlı harcama bakiyeyi eksiye düşüremez.
 */
export async function consumeCredits(entry: {
  agencyId: string;
  quantity: number;
  reference: string;
  note: string;
  actor: string;
}): Promise<boolean> {
  await ensureAgencySchema();
  const result = await getDb()
    .prepare(
      `INSERT OR IGNORE INTO agency_credit_ledger (id, agency_id, amount, type, reference, note, actor, created_at)
       SELECT ?, ?, ?, 'consumption', ?, ?, ?, ?
       WHERE (SELECT COALESCE(SUM(amount), 0) FROM agency_credit_ledger WHERE agency_id = ?) >= ?`,
    )
    .bind(
      newId('ALG'),
      entry.agencyId,
      -entry.quantity,
      entry.reference,
      entry.note,
      entry.actor,
      Date.now(),
      entry.agencyId,
      entry.quantity,
    )
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function listLedger(agencyId: string, limit = 100) {
  await ensureAgencySchema();
  const result = await getDb()
    .prepare('SELECT * FROM agency_credit_ledger WHERE agency_id = ? ORDER BY created_at DESC LIMIT ?')
    .bind(agencyId, limit)
    .all<Row>();
  return (result.results ?? []).map(mapLedger);
}

/* ------------------------------------------------------------------ */
/* Kontör talepleri                                                    */
/* ------------------------------------------------------------------ */

export async function createCreditRequest(input: { agencyId: string; quantity: number; note: string | null; requestedBy: string }) {
  await ensureAgencySchema();
  const id = newId('ACR');
  await getDb()
    .prepare(
      `INSERT INTO agency_credit_requests (id, agency_id, quantity, note, status, requested_by, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    )
    .bind(id, input.agencyId, input.quantity, input.note, input.requestedBy, Date.now())
    .run();
  return id;
}

export async function listCreditRequests(agencyId?: string) {
  await ensureAgencySchema();
  const db = getDb();
  const result = agencyId
    ? await db
        .prepare('SELECT * FROM agency_credit_requests WHERE agency_id = ? ORDER BY created_at DESC LIMIT 100')
        .bind(agencyId)
        .all<Row>()
    : await db.prepare('SELECT * FROM agency_credit_requests ORDER BY created_at DESC LIMIT 500').all<Row>();
  return (result.results ?? []).map(mapRequest);
}

export async function getCreditRequest(id: string) {
  await ensureAgencySchema();
  const row = await getDb().prepare('SELECT * FROM agency_credit_requests WHERE id = ?').bind(id).first<Row>();
  return row ? mapRequest(row) : null;
}

/**
 * Talebi bekliyor durumundan karara geçirir. Yalnız bekleyen talep güncellenir;
 * ikinci bir onay isteği `false` alır (çift kontör yüklemesi olmaz).
 */
export async function decideCreditRequest(input: {
  id: string;
  status: 'approved' | 'rejected' | 'cancelled';
  approvedQuantity: number | null;
  unitPriceMinor: number | null;
  paymentNote: string | null;
  decisionNote: string | null;
  decidedBy: string;
}): Promise<boolean> {
  await ensureAgencySchema();
  const result = await getDb()
    .prepare(
      `UPDATE agency_credit_requests SET status = ?, approved_quantity = ?, unit_price_minor = ?,
         payment_note = ?, decision_note = ?, decided_by = ?, decided_at = ?
       WHERE id = ? AND status = 'pending'`,
    )
    .bind(
      input.status,
      input.approvedQuantity,
      input.unitPriceMinor,
      input.paymentNote,
      input.decisionNote,
      input.decidedBy,
      Date.now(),
      input.id,
    )
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* Acente yönetimi (admin)                                             */
/* ------------------------------------------------------------------ */

export type AgencySummary = Agency & {
  balance: number;
  pendingRequests: number;
  pendingQuantity: number;
  bookingCount: number;
  usedCredits: number;
};

export async function listAgencySummaries(): Promise<AgencySummary[]> {
  await ensureAgencySchema();
  const result = await getDb()
    .prepare(
      `SELECT a.*,
        (SELECT COALESCE(SUM(amount), 0) FROM agency_credit_ledger l WHERE l.agency_id = a.id) AS balance,
        (SELECT COUNT(*) FROM agency_credit_requests r WHERE r.agency_id = a.id AND r.status = 'pending') AS pending_requests,
        (SELECT COALESCE(SUM(quantity), 0) FROM agency_credit_requests r WHERE r.agency_id = a.id AND r.status = 'pending') AS pending_quantity,
        (SELECT COUNT(*) FROM agency_bookings b WHERE b.agency_id = a.id) AS booking_count,
        (SELECT COALESCE(-SUM(amount), 0) FROM agency_credit_ledger l WHERE l.agency_id = a.id AND l.type IN ('consumption', 'refund')) AS used_credits
       FROM agency_accounts a ORDER BY a.created_at DESC`,
    )
    .all<Row>();
  return (result.results ?? []).map((row) => ({
    ...mapAgency(row),
    balance: num(row.balance),
    pendingRequests: num(row.pending_requests),
    pendingQuantity: num(row.pending_quantity),
    bookingCount: num(row.booking_count),
    usedCredits: num(row.used_credits),
  }));
}

/** Tüm aktif acentelerin kullanılmamış kontör toplamı (RawdahBooking bakiyesiyle karşılaştırılır). */
export async function totalOutstandingCredits(): Promise<number> {
  await ensureAgencySchema();
  const row = await getDb()
    .prepare(
      `SELECT COALESCE(SUM(l.amount), 0) AS total FROM agency_credit_ledger l
       JOIN agency_accounts a ON a.id = l.agency_id WHERE a.status = 'active'`,
    )
    .first<{ total: number }>();
  return Number(row?.total ?? 0);
}

export async function listMembers(agencyId: string) {
  await ensureAgencySchema();
  const result = await getDb()
    .prepare('SELECT * FROM agency_members WHERE agency_id = ? ORDER BY created_at')
    .bind(agencyId)
    .all<Row>();
  return (result.results ?? []).map(mapMember);
}

export async function setAgencyStatus(input: {
  id: string;
  status: AgencyStatus;
  actor: string;
  rejectReason?: string | null;
}): Promise<boolean> {
  await ensureAgencySchema();
  const now = Date.now();
  const result = await getDb()
    .prepare(
      `UPDATE agency_accounts SET status = ?, reject_reason = ?, updated_at = ?,
         approved_at = CASE WHEN ? = 'active' AND approved_at IS NULL THEN ? ELSE approved_at END,
         approved_by = CASE WHEN ? = 'active' AND approved_by IS NULL THEN ? ELSE approved_by END
       WHERE id = ?`,
    )
    .bind(
      input.status,
      input.status === 'rejected' ? (input.rejectReason ?? null) : null,
      now,
      input.status,
      now,
      input.status,
      input.actor,
      input.id,
    )
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function setAgencyNote(id: string, note: string | null) {
  await ensureAgencySchema();
  await getDb()
    .prepare('UPDATE agency_accounts SET admin_note = ?, updated_at = ? WHERE id = ?')
    .bind(note, Date.now(), id)
    .run();
}

/* ------------------------------------------------------------------ */
/* Acente randevuları                                                  */
/* ------------------------------------------------------------------ */

export async function createAgencyBooking(input: {
  id: string;
  agencyId: string;
  memberId: string;
  groupName: string;
  groupCode: string;
  gender: 'female' | 'male';
  dateKey: string;
  timeSlot: string;
  quantity: number;
}) {
  await ensureAgencySchema();
  const now = Date.now();
  await getDb()
    .prepare(
      `INSERT INTO agency_bookings
        (id, agency_id, member_id, group_name, group_code, gender, date_key, time_slot, quantity, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'purchasing', ?, ?)`,
    )
    .bind(
      input.id,
      input.agencyId,
      input.memberId,
      input.groupName,
      input.groupCode,
      input.gender,
      input.dateKey,
      input.timeSlot,
      input.quantity,
      now,
      now,
    )
    .run();
}

export async function updateAgencyBooking(
  id: string,
  patch: Partial<Pick<AgencyBooking, 'status' | 'purchaseId' | 'shareCode' | 'shareUrl' | 'error'>>,
) {
  await ensureAgencySchema();
  const columns: Record<string, string> = {
    status: 'status',
    purchaseId: 'purchase_id',
    shareCode: 'share_code',
    shareUrl: 'share_url',
    error: 'error',
  };
  const entries = Object.entries(patch).filter(([key]) => key in columns);
  if (!entries.length) return;
  await getDb()
    .prepare(`UPDATE agency_bookings SET ${entries.map(([key]) => `${columns[key]} = ?`).join(', ')}, updated_at = ? WHERE id = ?`)
    .bind(...entries.map(([, value]) => value ?? null), Date.now(), id)
    .run();
}

export async function getAgencyBooking(id: string) {
  await ensureAgencySchema();
  const row = await getDb().prepare('SELECT * FROM agency_bookings WHERE id = ?').bind(id).first<Row>();
  return row ? mapBooking(row) : null;
}

export async function listAgencyBookings(agencyId?: string, limit = 200) {
  await ensureAgencySchema();
  const db = getDb();
  const result = agencyId
    ? await db
        .prepare('SELECT * FROM agency_bookings WHERE agency_id = ? ORDER BY created_at DESC LIMIT ?')
        .bind(agencyId, limit)
        .all<Row>()
    : await db.prepare('SELECT * FROM agency_bookings ORDER BY created_at DESC LIMIT ?').bind(limit).all<Row>();
  return (result.results ?? []).map(mapBooking);
}

/** Yönetici şifre sıfırlaması: yeni şifreyi yazar, kilidi kaldırır ve açık oturumları kapatır. */
export async function resetMemberPassword(
  memberId: string,
  password: { hash: string; salt: string; iterations: number },
) {
  await ensureAgencySchema();
  const db = getDb();
  await db.batch([
    db
      .prepare(
        `UPDATE agency_members SET password_hash = ?, password_salt = ?, iterations = ?,
           failed_attempts = 0, locked_until = NULL WHERE id = ?`,
      )
      .bind(password.hash, password.salt, password.iterations, memberId),
    db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(`agency:${memberId}`),
  ]);
}

/* ------------------------------------------------------------------ */
/* Acente çalışanları                                                  */
/* ------------------------------------------------------------------ */

export const MAX_MEMBERS = 25;

/** Acenteye yeni kullanıcı ekler. E-posta tüm acenteler içinde tekildir. */
export async function createMember(input: {
  agencyId: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'owner' | 'staff';
  password: { hash: string; salt: string; iterations: number };
}) {
  await ensureAgencySchema();
  const id = newId('AGM');
  await getDb()
    .prepare(
      `INSERT INTO agency_members
        (id, agency_id, email, full_name, phone, role, status, password_hash, password_salt, iterations, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    )
    .bind(id, input.agencyId, input.email, input.fullName, input.phone, input.role, input.password.hash, input.password.salt, input.password.iterations, Date.now())
    .run();
  return id;
}

/** Kullanıcıyı askıya alır veya açar; askıya alınanın açık oturumları kapanır. */
export async function setMemberStatus(memberId: string, status: 'active' | 'suspended') {
  await ensureAgencySchema();
  const db = getDb();
  await db.batch([
    db.prepare('UPDATE agency_members SET status = ? WHERE id = ?').bind(status, memberId),
    ...(status === 'suspended'
      ? [db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(`agency:${memberId}`)]
      : []),
  ]);
}

/** Ekip listesi; acenteler arası sızıntı olmasın diye her zaman acente kimliğiyle süzülür. */
export async function findAgencyMember(agencyId: string, memberId: string) {
  const member = await findMemberById(memberId);
  return member && member.agencyId === agencyId ? member : null;
}
