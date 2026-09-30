import { env } from '@/lib/server-env';

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS demo_agencies (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    contact_masked TEXT NOT NULL,
    city TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS demo_orders (
    id TEXT PRIMARY KEY NOT NULL,
    group_code TEXT NOT NULL,
    visit_window TEXT NOT NULL,
    gender TEXT NOT NULL,
    passenger_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_demo_orders_status_created ON demo_orders(status, created_at)`,
  `CREATE TABLE IF NOT EXISTS demo_passengers (
    id TEXT PRIMARY KEY NOT NULL,
    display_name TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_demo_passengers_status_created ON demo_passengers(status, created_at)`,
  `CREATE TABLE IF NOT EXISTS demo_tickets (
    id TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_demo_tickets_status_created ON demo_tickets(status, created_at)`,
  `CREATE TABLE IF NOT EXISTS demo_ledger (
    id TEXT PRIMARY KEY NOT NULL,
    order_id TEXT,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    reference_key TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_demo_ledger_created ON demo_ledger(created_at)`,
  `CREATE TABLE IF NOT EXISTS demo_audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    actor_user_id TEXT NOT NULL DEFAULT 'system',
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_demo_audit_created ON demo_audit_logs(created_at)`,
];

export function getDemoDb(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

export async function ensureDemoDatabase() {
  const db = getDemoDb();
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));

  const auditColumns = await db
    .prepare("PRAGMA table_info('demo_audit_logs')")
    .all<{ name: string }>();
  if (!auditColumns.results.some((column) => column.name === 'actor_user_id')) {
    await db
      .prepare(
        "ALTER TABLE demo_audit_logs ADD COLUMN actor_user_id TEXT NOT NULL DEFAULT 'system'",
      )
      .run();
  }

  const agencyCount = await db
    .prepare('SELECT COUNT(*) AS count FROM demo_agencies')
    .first<{ count: number }>();
  if ((agencyCount?.count ?? 0) === 0) {
    const now = Date.now();
    await db.batch([
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_agencies (id, name, contact_masked, city, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'AGN-DEMO-018',
          'Hira Turizm',
          'F. G.',
          'İstanbul',
          'active',
          now - 86_400_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_agencies (id, name, contact_masked, city, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'AGN-DEMO-021',
          'Menzil Seyahat',
          'A. K.',
          'Konya',
          'pending',
          now - 7_200_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_agencies (id, name, contact_masked, city, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'AGN-DEMO-022',
          'Safa Organizasyon',
          'S. D.',
          'Ankara',
          'pending',
          now - 3_600_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_agencies (id, name, contact_masked, city, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'AGN-DEMO-016',
          'Nur Tur',
          'M. Y.',
          'Bursa',
          'rejected',
          now - 172_800_000,
        ),
    ]);
  }

  const orderCount = await db
    .prepare('SELECT COUNT(*) AS count FROM demo_orders')
    .first<{ count: number }>();
  if ((orderCount?.count ?? 0) === 0) {
    const now = Date.now();
    await db.batch([
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_orders (id, group_code, visit_window, gender, passenger_count, status, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'ORD-DEMO-1042',
          'EYLUL-04-A',
          'Bugün · 17:00–17:20',
          'Kadın',
          3,
          'qr_ready',
          'seed-1042',
          now - 7_200_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_orders (id, group_code, visit_window, gender, passenger_count, status, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'ORD-DEMO-1043',
          'EYLUL-04-B',
          'Bugün · 19:00–19:20',
          'Erkek',
          4,
          'qr_pending',
          'seed-1043',
          now - 5_400_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_orders (id, group_code, visit_window, gender, passenger_count, status, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'ORD-DEMO-1044',
          'EYLUL-04-C',
          'Yarın · 21:20–21:40',
          'Kadın',
          1,
          'unknown',
          'seed-1044',
          now - 3_600_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_orders (id, group_code, visit_window, gender, passenger_count, status, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'ORD-DEMO-1041',
          'EYLUL-03-D',
          'Dün · 08:00–08:20',
          'Erkek',
          5,
          'completed',
          'seed-1041',
          now - 86_400_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_ledger (id, order_id, amount, type, reference_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'LED-DEMO-START',
          null,
          261,
          'purchase',
          'seed-balance',
          now - 604_800_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_ledger (id, order_id, amount, type, reference_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'LED-DEMO-1042',
          'ORD-DEMO-1042',
          -3,
          'consumption',
          'seed-consume-1042',
          now - 7_200_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_ledger (id, order_id, amount, type, reference_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'LED-DEMO-1043',
          'ORD-DEMO-1043',
          -4,
          'reservation',
          'seed-reserve-1043',
          now - 5_400_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_ledger (id, order_id, amount, type, reference_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'LED-DEMO-1044',
          'ORD-DEMO-1044',
          -1,
          'reservation',
          'seed-reserve-1044',
          now - 3_600_000,
        ),
      db
        .prepare(
          'INSERT OR IGNORE INTO demo_ledger (id, order_id, amount, type, reference_key, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          'LED-DEMO-1041',
          'ORD-DEMO-1041',
          -5,
          'consumption',
          'seed-consume-1041',
          now - 86_400_000,
        ),
    ]);
  }

  return db;
}

export function demoId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function containsSensitiveText(value: string) {
  return /\b[A-Z][0-9]{7,9}\b|\b\d{11}\b|\b\d{16}\b|@|\+?\d[\d\s()-]{8,}/i.test(
    value,
  );
}
