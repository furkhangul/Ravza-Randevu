import { env } from '@/lib/server-env';

import { ensureCatalogDatabase, listUmrahPackages } from './catalog.ts';
import type { CustomerOrderInput } from '../lib/customer-order.ts';

export type CustomerOrderPassengerRecord = {
  id: string;
  orderId: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  birthDate: string;
  nationality: string;
  visaStatus: 'pending' | 'applied' | 'approved' | 'rejected';
  visaNumber: string;
  appointmentStatus: 'pending' | 'booked' | 'qr_ready' | 'failed';
  appointmentDate: string;
  appointmentTime: string;
  appointmentGate: string;
  qrPayload: string;
  rawdahPermitId: string;
};

export type CustomerOrderRecord = {
  id: string;
  customerUserId: string;
  customerEmail: string;
  contactEmail: string;
  contactPhone: string;
  packageId: string;
  packageName: string;
  productType: 'hajj' | 'umrah';
  status: 'awaiting_payment' | 'payment_pending' | 'confirmed' | 'cancelled';
  passengerCount: number;
  amountMinor: number;
  currency: 'USD';
  departureCity: string;
  departureDate: string;
  returnDate: string;
  ravzaVisitDate: string;
  residenceCountry: string;
  residenceCity: string;
  departureLocation: string;
  selectedSlots: CustomerOrderInput['selectedSlots'];
  passengers: CustomerOrderPassengerRecord[];
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
  archiveDate: string;
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS customer_orders (
    id TEXT PRIMARY KEY NOT NULL,
    customer_user_id TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    residence_country TEXT NOT NULL DEFAULT '',
    residence_city TEXT NOT NULL DEFAULT '',
    departure_location TEXT NOT NULL DEFAULT '',
    package_id TEXT NOT NULL REFERENCES umrah_packages(id),
    package_name TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'umrah',
    status TEXT NOT NULL DEFAULT 'awaiting_payment',
    passenger_count INTEGER NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    departure_city TEXT NOT NULL,
    departure_date TEXT NOT NULL,
    return_date TEXT NOT NULL,
    ravza_visit_date TEXT NOT NULL,
    ravza_selections_json TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_orders_user_idempotency ON customer_orders(customer_user_id, idempotency_key)`,
  `CREATE INDEX IF NOT EXISTS idx_customer_orders_user_created ON customer_orders(customer_user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON customer_orders(status)`,
  `CREATE TABLE IF NOT EXISTS customer_order_passengers (
    id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT NOT NULL REFERENCES customer_orders(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    birth_date TEXT NOT NULL DEFAULT '',
    nationality TEXT NOT NULL DEFAULT '',
    visa_status TEXT NOT NULL DEFAULT 'pending',
    visa_number TEXT NOT NULL DEFAULT '',
    appointment_status TEXT NOT NULL DEFAULT 'pending',
    appointment_date TEXT NOT NULL DEFAULT '',
    appointment_time TEXT NOT NULL DEFAULT '',
    appointment_gate TEXT NOT NULL DEFAULT '',
    qr_payload TEXT NOT NULL DEFAULT '',
    rawdah_permit_id TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_customer_order_passengers_order ON customer_order_passengers(order_id)`,
];

function getDb(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

export async function ensureCustomerOrdersDatabase() {
  await ensureCatalogDatabase();
  const db = getDb();
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  const columns = await db
    .prepare('PRAGMA table_info(customer_orders)')
    .all<{ name: string }>();
  if (!columns.results.some((column) => column.name === 'product_type'))
    await db
      .prepare(
        "ALTER TABLE customer_orders ADD COLUMN product_type TEXT NOT NULL DEFAULT 'umrah'",
      )
      .run();
  for (const [name, sql] of [
    [
      'residence_country',
      "ALTER TABLE customer_orders ADD COLUMN residence_country TEXT NOT NULL DEFAULT ''",
    ],
    [
      'residence_city',
      "ALTER TABLE customer_orders ADD COLUMN residence_city TEXT NOT NULL DEFAULT ''",
    ],
    [
      'departure_location',
      "ALTER TABLE customer_orders ADD COLUMN departure_location TEXT NOT NULL DEFAULT ''",
    ],
  ] as const) {
    if (!columns.results.some((column) => column.name === name))
      await db.prepare(sql).run();
  }
  const passengerColumns = await db
    .prepare('PRAGMA table_info(customer_order_passengers)')
    .all<{ name: string }>();
  for (const [name, sql] of [
    [
      'birth_date',
      "ALTER TABLE customer_order_passengers ADD COLUMN birth_date TEXT NOT NULL DEFAULT ''",
    ],
    [
      'nationality',
      "ALTER TABLE customer_order_passengers ADD COLUMN nationality TEXT NOT NULL DEFAULT ''",
    ],
    [
      'visa_status',
      "ALTER TABLE customer_order_passengers ADD COLUMN visa_status TEXT NOT NULL DEFAULT 'pending'",
    ],
    [
      'visa_number',
      "ALTER TABLE customer_order_passengers ADD COLUMN visa_number TEXT NOT NULL DEFAULT ''",
    ],
    [
      'appointment_status',
      "ALTER TABLE customer_order_passengers ADD COLUMN appointment_status TEXT NOT NULL DEFAULT 'pending'",
    ],
    [
      'appointment_date',
      "ALTER TABLE customer_order_passengers ADD COLUMN appointment_date TEXT NOT NULL DEFAULT ''",
    ],
    [
      'appointment_time',
      "ALTER TABLE customer_order_passengers ADD COLUMN appointment_time TEXT NOT NULL DEFAULT ''",
    ],
    [
      'appointment_gate',
      "ALTER TABLE customer_order_passengers ADD COLUMN appointment_gate TEXT NOT NULL DEFAULT ''",
    ],
    [
      'qr_payload',
      "ALTER TABLE customer_order_passengers ADD COLUMN qr_payload TEXT NOT NULL DEFAULT ''",
    ],
    [
      'rawdah_permit_id',
      "ALTER TABLE customer_order_passengers ADD COLUMN rawdah_permit_id TEXT NOT NULL DEFAULT ''",
    ],
  ] as const) {
    if (!passengerColumns.results.some((column) => column.name === name))
      await db.prepare(sql).run();
  }
  return db;
}

function parseSelections(value: string): CustomerOrderInput['selectedSlots'] {
  try {
    return JSON.parse(value) as CustomerOrderInput['selectedSlots'];
  } catch {
    return {};
  }
}

type OrderRow = Omit<CustomerOrderRecord, 'selectedSlots' | 'passengers'> & {
  ravzaSelectionsJson: string;
};

function addCalendarDay(value: string): string {
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

function orderLifecycle(visitDate: string) {
  const archiveDate = addCalendarDay(visitDate);
  const today = new Date().toISOString().slice(0, 10);
  return { archiveDate, isArchived: Boolean(visitDate && today >= archiveDate) };
}

async function hydrateOrder(
  db: D1Database,
  row: OrderRow,
): Promise<CustomerOrderRecord> {
  const result = await db
    .prepare(
      `SELECT id, order_id AS orderId, first_name AS firstName, last_name AS lastName, gender,
        birth_date AS birthDate, nationality,
        visa_status AS visaStatus, visa_number AS visaNumber,
        appointment_status AS appointmentStatus, appointment_date AS appointmentDate,
        appointment_time AS appointmentTime, appointment_gate AS appointmentGate,
        qr_payload AS qrPayload, rawdah_permit_id AS rawdahPermitId
       FROM customer_order_passengers WHERE order_id = ? ORDER BY created_at ASC`,
    )
    .bind(row.id)
    .all<CustomerOrderPassengerRecord>();
  const { ravzaSelectionsJson, ...order } = row;
  const lifecycle = orderLifecycle(order.ravzaVisitDate);
  return {
    ...order,
    selectedSlots: parseSelections(ravzaSelectionsJson),
    passengers: result.results,
    ...lifecycle,
  };
}

const orderColumns = `
  SELECT id, customer_user_id AS customerUserId, customer_email AS customerEmail,
    contact_email AS contactEmail, contact_phone AS contactPhone,
    package_id AS packageId, package_name AS packageName,
    product_type AS productType, status,
    passenger_count AS passengerCount, amount_minor AS amountMinor, currency,
    departure_city AS departureCity, departure_date AS departureDate,
    return_date AS returnDate, ravza_visit_date AS ravzaVisitDate,
    residence_country AS residenceCountry, residence_city AS residenceCity,
    departure_location AS departureLocation,
    ravza_selections_json AS ravzaSelectionsJson, created_at AS createdAt,
    updated_at AS updatedAt
  FROM customer_orders`;

export async function listCustomerOrders(customerUserId: string) {
  const db = await ensureCustomerOrdersDatabase();
  const result = await db
    .prepare(
      `${orderColumns} WHERE customer_user_id = ? ORDER BY created_at DESC`,
    )
    .bind(customerUserId)
    .all<OrderRow>();
  return Promise.all(result.results.map((row) => hydrateOrder(db, row)));
}

export async function listAllCustomerOrdersForAdmin() {
  const db = await ensureCustomerOrdersDatabase();
  const result = await db
    .prepare(`${orderColumns} ORDER BY created_at DESC`)
    .all<OrderRow>();
  return Promise.all(result.results.map((row) => hydrateOrder(db, row)));
}

export async function updateCustomerOrderStatus(
  orderId: string,
  status: CustomerOrderRecord['status'],
) {
  const db = await ensureCustomerOrdersDatabase();
  const now = Date.now();
  await db
    .prepare(
      `UPDATE customer_orders
       SET status = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(status, now, orderId)
    .run();
}

/**
 * Admin onayı müşteri için tek bir tamamlanmış adımdır: sipariş onaylanır,
 * randevu tarihi/saatleri yolcu kayıtlarına yazılır ve her yolcuya QR bağlantısı
 * ile okunabilir izin kodu üretilir. Aynı işlem tekrar çağrılırsa mevcut QR
 * kayıtları korunur.
 */
export async function approveCustomerOrder(orderId: string) {
  const db = await ensureCustomerOrdersDatabase();
  const row = await db
    .prepare(`${orderColumns} WHERE id = ? LIMIT 1`)
    .bind(orderId)
    .first<OrderRow>();
  if (!row) throw new Error('ORDER_NOT_FOUND');

  const order = await hydrateOrder(db, row);
  const now = Date.now();
  await db
    .prepare(
      `UPDATE customer_orders SET status = 'confirmed', updated_at = ? WHERE id = ?`,
    )
    .bind(now, orderId)
    .run();

  // Onay yalnız siparişi kesinleştirir. Ravza randevusu RawdahBooking'de alınır;
  // gerçek QR ve izin numarası panelden yolcu bazında girilir
  // (confirmRawdahBookingForPassenger). Burada QR üretilmez.
  void order;

  const updated = await db
    .prepare(`${orderColumns} WHERE id = ? LIMIT 1`)
    .bind(orderId)
    .first<OrderRow>();
  if (!updated) throw new Error('ORDER_NOT_FOUND');
  return hydrateOrder(db, updated);
}

export async function updatePassengerVisa(
  passengerId: string,
  visaStatus: 'pending' | 'applied' | 'approved' | 'rejected',
  visaNumber: string = '',
) {
  const db = await ensureCustomerOrdersDatabase();
  await db
    .prepare(
      `UPDATE customer_order_passengers
       SET visa_status = ?, visa_number = ?
       WHERE id = ?`,
    )
    .bind(visaStatus, visaNumber, passengerId)
    .run();
}

export async function confirmRawdahBookingForPassenger(
  passengerId: string,
  details: {
    appointmentDate: string;
    appointmentTime: string;
    appointmentGate?: string;
    /** RawdahBooking'den alınan gerçek QR bağlantısı veya QR metni. */
    qrPayload: string;
    /** RawdahBooking'deki gerçek izin numarası. */
    permitId: string;
  },
) {
  const qrPayload = details.qrPayload.trim();
  const permitRef = details.permitId.trim();
  if (!qrPayload || !permitRef) throw new Error('QR_AND_PERMIT_REQUIRED');

  const db = await ensureCustomerOrdersDatabase();
  const passenger = await db
    .prepare(
      `SELECT id, order_id AS orderId, first_name AS firstName, last_name AS lastName, gender
       FROM customer_order_passengers WHERE id = ?`,
    )
    .bind(passengerId)
    .first<{
      id: string;
      orderId: string;
      firstName: string;
      lastName: string;
      gender: 'male' | 'female';
    }>();

  if (!passenger) {
    throw new Error('PASSENGER_NOT_FOUND');
  }

  const gate =
    details.appointmentGate ||
    (passenger.gender === 'female'
      ? 'Kapı 25 (Bab-ı Osman)'
      : 'Kapı 38 (Bab-ül Baki)');

  await db
    .prepare(
      `UPDATE customer_order_passengers
       SET appointment_status = 'qr_ready',
           appointment_date = ?,
           appointment_time = ?,
           appointment_gate = ?,
           qr_payload = ?,
           rawdah_permit_id = ?
       WHERE id = ?`,
    )
    .bind(
      details.appointmentDate,
      details.appointmentTime,
      gate,
      qrPayload,
      permitRef,
      passengerId,
    )
    .run();

  try {
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO demo_ledger (id, order_id, amount, type, reference_key, created_at)
         VALUES (?, ?, ?, 'consumption', ?, ?)`,
      )
      .bind(
        `LED-PAX-${passengerId}-${now}`,
        passenger.orderId,
        -1,
        `consume-pax-${passengerId}-${now}`,
        now,
      )
      .run();
  } catch {
    // If demo_ledger is not in this schema context, proceed cleanly
  }

  return {
    passengerId,
    permitRef,
    qrUrl: qrPayload,
    gate,
    appointmentDate: details.appointmentDate,
    appointmentTime: details.appointmentTime,
  };
}

export async function createCustomerOrder(
  input: CustomerOrderInput,
  customer: { userId: string; email: string },
) {
  const db = await ensureCustomerOrdersDatabase();
  const packages = await listUmrahPackages({ publishedOnly: true });
  const selectedPackage = packages.find(
    (item) => item.slug === input.packageSlug,
  );
  if (
    !selectedPackage ||
    !selectedPackage.priceMinor ||
    !selectedPackage.departureCity ||
    !selectedPackage.departureDate ||
    !selectedPackage.returnDate
  )
    throw new Error('PACKAGE_NOT_AVAILABLE');

  const existing = await db
    .prepare(
      `${orderColumns} WHERE customer_user_id = ? AND idempotency_key = ? LIMIT 1`,
    )
    .bind(customer.userId, input.idempotencyKey)
    .first<OrderRow>();
  if (existing) return hydrateOrder(db, existing);

  const now = Date.now();
  const orderId = `${selectedPackage.productType === 'hajj' ? 'HAC' : 'UMR'}-${crypto.randomUUID()}`;
  const statements = [
    db
      .prepare(
        `INSERT INTO customer_orders (
          id, customer_user_id, customer_email, contact_email, contact_phone,
          residence_country, residence_city, departure_location,
          package_id, package_name, product_type, status, passenger_count, amount_minor,
          currency, departure_city, departure_date, return_date,
          ravza_visit_date, ravza_selections_json, idempotency_key,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        orderId,
        customer.userId,
        customer.email,
        input.contactEmail,
        input.contactPhone,
        input.residenceCountry,
        input.residenceCity,
        input.departureLocation,
        selectedPackage.id,
        selectedPackage.name,
        selectedPackage.productType,
        input.passengers.length,
        selectedPackage.priceMinor * input.passengers.length,
        selectedPackage.departureCity,
        selectedPackage.departureDate,
        selectedPackage.returnDate,
        input.ravzaVisitDate,
        JSON.stringify(input.selectedSlots),
        input.idempotencyKey,
        now,
        now,
      ),
    ...input.passengers.map((passenger) =>
      db
        .prepare(
          `INSERT INTO customer_order_passengers (
            id, order_id, first_name, last_name, gender, birth_date,
            nationality, visa_status, visa_number, appointment_status,
            appointment_date, appointment_time, appointment_gate,
            qr_payload, rawdah_permit_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', '', 'pending', '', '', '', '', '', ?)`,
        )
        .bind(
          `PAX-${crypto.randomUUID()}`,
          orderId,
          passenger.firstName,
          passenger.lastName,
          passenger.gender,
          passenger.birthDate,
          passenger.nationality,
          now,
        ),
    ),
  ];
  await db.batch(statements);
  const created = await db
    .prepare(`${orderColumns} WHERE id = ? LIMIT 1`)
    .bind(orderId)
    .first<OrderRow>();
  if (!created) throw new Error('ORDER_CREATE_FAILED');
  return hydrateOrder(db, created);
}
