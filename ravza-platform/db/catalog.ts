import { env } from '@/lib/server-env';

export type UmrahPackageRecord = {
  id: string;
  productType: 'hajj' | 'umrah';
  slug: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  departureCity: string | null;
  departureDate: string | null;
  returnDate: string | null;
  makkahNights: number;
  medinaNights: number;
  priceMinor: number | null;
  currency: 'USD';
  includedServices: string[];
  updatedAt: number;
};

export type SaveUmrahPackageInput = Omit<
  UmrahPackageRecord,
  'includedServices' | 'updatedAt'
> & {
  includedServices: string[];
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS umrah_packages (
    id TEXT PRIMARY KEY NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'umrah' CHECK(product_type IN ('hajj', 'umrah')),
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    departure_city TEXT,
    departure_date TEXT,
    return_date TEXT,
    makkah_nights INTEGER NOT NULL DEFAULT 0,
    medina_nights INTEGER NOT NULL DEFAULT 0,
    price_minor INTEGER,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency = 'USD'),
    included_services_json TEXT NOT NULL DEFAULT '[]',
    updated_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_umrah_packages_slug ON umrah_packages(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_umrah_packages_status_departure ON umrah_packages(status, departure_date)`,
];

function getCatalogDb(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

function parseServices(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

type PackageRow = Omit<UmrahPackageRecord, 'includedServices'> & {
  includedServicesJson: string;
};

function mapPackage(row: PackageRow): UmrahPackageRecord {
  const { includedServicesJson, ...rest } = row;
  return { ...rest, includedServices: parseServices(includedServicesJson) };
}

export async function ensureCatalogDatabase() {
  const db = getCatalogDb();
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  const columns = await db
    .prepare('PRAGMA table_info(umrah_packages)')
    .all<{ name: string }>();
  if (!columns.results.some((column) => column.name === 'product_type'))
    await db
      .prepare(
        "ALTER TABLE umrah_packages ADD COLUMN product_type TEXT NOT NULL DEFAULT 'umrah'",
      )
      .run();

  const now = Date.now();
  const seedStatement = `INSERT OR IGNORE INTO umrah_packages (
    id, product_type, slug, name, status, departure_city, departure_date,
    return_date, makkah_nights, medina_nights, price_minor, currency,
    included_services_json, updated_by, created_at, updated_at
  ) VALUES (?, ?, ?, ?, 'draft', 'İstanbul', NULL, NULL, ?, ?, NULL, 'USD', ?, 'system', ?, ?)`;
  const publishedSeedStatement = `INSERT OR IGNORE INTO umrah_packages (
    id, product_type, slug, name, status, departure_city, departure_date,
    return_date, makkah_nights, medina_nights, price_minor, currency,
    included_services_json, updated_by, created_at, updated_at
  ) VALUES (?, 'umrah', ?, ?, 'published', ?, ?, ?, ?, ?, ?, 'USD', ?, 'system', ?, ?)`;
  await db.batch([
    db
      .prepare(seedStatement)
      .bind(
        'PKG-UMRAH-DRAFT',
        'umrah',
        'umre-yolculugu',
        'Umre Yolculuğu',
        4,
        4,
        JSON.stringify([
          'Gidiş-dönüş uçuş planı',
          'Mekke ve Medine konaklaması',
          'Havalimanı ve şehir transferleri',
          'Ravza randevu operasyonu',
        ]),
        now,
        now,
      ),
    db
      .prepare(seedStatement)
      .bind(
        'PKG-HAJJ-DRAFT',
        'hajj',
        'hac-yolculugu',
        'Hac Yolculuğu',
        12,
        4,
        JSON.stringify([
          'Gidiş-dönüş uçuş planı',
          'Mekke ve Medine konaklaması',
          'Arafat, Mina ve Müzdelife organizasyonu',
          'Ravza randevu operasyonu',
        ]),
        now,
        now,
      ),
    db
      .prepare(publishedSeedStatement)
      .bind(
        'PKG-UMRAH-ESSENTIAL-2026-10',
        'ekonomik-umre-ekim-2026',
        'Ekonomik Umre',
        'İstanbul',
        '2026-10-18',
        '2026-10-26',
        4,
        3,
        149_000,
        JSON.stringify([
          'Gidiş-dönüş ekonomi uçuşu',
          'Mekke ve Medine konaklaması',
          'Havalimanı ve şehir transferleri',
          'Türkçe grup rehberliği',
          'Ravza randevu operasyonu',
        ]),
        now,
        now,
      ),
    db
      .prepare(publishedSeedStatement)
      .bind(
        'PKG-UMRAH-COMFORT-2026-11',
        'konfor-umre-kasim-2026',
        'Konfor Umre',
        'İstanbul',
        '2026-11-08',
        '2026-11-18',
        5,
        4,
        189_000,
        JSON.stringify([
          'Gidiş-dönüş ekonomi uçuşu',
          'Kâbe ve Mescid-i Nebevî çevresinde seçili oteller',
          'Kahvaltı ve akşam yemeği',
          'Tüm şehir ve havalimanı transferleri',
          'Türkçe grup rehberliği',
          'Ravza randevu operasyonu',
        ]),
        now,
        now,
      ),
    db
      .prepare(publishedSeedStatement)
      .bind(
        'PKG-UMRAH-PREMIUM-2026-12',
        'premium-umre-aralik-2026',
        'Premium Umre',
        'İstanbul',
        '2026-12-20',
        '2026-12-30',
        5,
        4,
        249_000,
        JSON.stringify([
          'Esnek uçuş planı',
          'Kutsal mekânlara yakın üst segment oteller',
          'Kahvaltı ve akşam yemeği',
          'Özel grup transferleri',
          'Türkçe özel rehberlik',
          'Ravza randevu operasyonu',
        ]),
        now,
        now,
      ),
  ]);
  return db;
}

const selectColumns = `
  SELECT id, product_type AS productType, slug, name, status,
    departure_city AS departureCity,
    departure_date AS departureDate,
    return_date AS returnDate,
    makkah_nights AS makkahNights,
    medina_nights AS medinaNights,
    price_minor AS priceMinor,
    currency,
    included_services_json AS includedServicesJson,
    updated_at AS updatedAt
  FROM umrah_packages`;

export async function listUmrahPackages(options?: { publishedOnly?: boolean }) {
  const db = await ensureCatalogDatabase();
  const result = options?.publishedOnly
    ? await db
        .prepare(
          `${selectColumns} WHERE status = 'published' ORDER BY departure_date ASC, created_at ASC`,
        )
        .all<PackageRow>()
    : await db
        .prepare(`${selectColumns} ORDER BY updated_at DESC`)
        .all<PackageRow>();
  return result.results.map(mapPackage);
}

export async function saveUmrahPackage(
  input: SaveUmrahPackageInput,
  actorUserId: string,
) {
  const db = await ensureCatalogDatabase();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO umrah_packages (
        id, product_type, slug, name, status, departure_city, departure_date, return_date,
        makkah_nights, medina_nights, price_minor, currency,
        included_services_json, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        product_type = excluded.product_type,
        slug = excluded.slug,
        name = excluded.name,
        status = excluded.status,
        departure_city = excluded.departure_city,
        departure_date = excluded.departure_date,
        return_date = excluded.return_date,
        makkah_nights = excluded.makkah_nights,
        medina_nights = excluded.medina_nights,
        price_minor = excluded.price_minor,
        currency = excluded.currency,
        included_services_json = excluded.included_services_json,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at`,
    )
    .bind(
      input.id,
      input.productType,
      input.slug,
      input.name,
      input.status,
      input.departureCity,
      input.departureDate,
      input.returnDate,
      input.makkahNights,
      input.medinaNights,
      input.priceMinor,
      'USD',
      JSON.stringify(input.includedServices),
      actorUserId,
      now,
      now,
    )
    .run();
}
