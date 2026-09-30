import { env } from '@/lib/server-env';

import {
  packagePersonCount,
  type AppointmentPackageCode,
  type AppointmentPackageRecord,
  type AppointmentPackageStatus,
  type LocalizedText,
} from '../lib/appointment-packages.ts';

/**
 * Randevu paketleri D1 tablosu. `db/catalog.ts` ile aynı yaklaşım:
 * şema idempotent biçimde kurulur, tohum kayıtlar `INSERT OR IGNORE`
 * ile atılır. Fiyat alanı bilerek boş bırakılır — kesinleşmemiş fiyatı
 * uydurmak yerine kart "WhatsApp'tan teyit" mesajı gösterir.
 */

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS appointment_packages (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL CHECK(code IN ('solo','family','group','kafile','agency','custom')),
    name_json TEXT NOT NULL,
    person_count INTEGER NOT NULL,
    price_per_person_minor INTEGER,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency = 'USD'),
    included_json TEXT NOT NULL DEFAULT '[]',
    excluded_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
    highlight INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_appointment_packages_code ON appointment_packages(code)`,
  `CREATE INDEX IF NOT EXISTS idx_appointment_packages_status ON appointment_packages(status, sort_order)`,
];

function getPackagesDb(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable');
  return env.DB;
}

function parseLocalized(value: string): LocalizedText {
  try {
    const parsed = JSON.parse(value) as Partial<LocalizedText>;
    return {
      tr: typeof parsed.tr === 'string' ? parsed.tr : '',
      en: typeof parsed.en === 'string' ? parsed.en : '',
      ar: typeof parsed.ar === 'string' ? parsed.ar : '',
    };
  } catch {
    return { tr: '', en: '', ar: '' };
  }
}

function parseLocalizedList(value: string): LocalizedText[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => !!item)
      .map((item) => ({
        tr: typeof item.tr === 'string' ? item.tr : '',
        en: typeof item.en === 'string' ? item.en : '',
        ar: typeof item.ar === 'string' ? item.ar : '',
      }))
      .filter((item) => item.tr);
  } catch {
    return [];
  }
}

type PackageRow = {
  id: string;
  code: AppointmentPackageCode;
  name_json: string;
  person_count: number;
  price_per_person_minor: number | null;
  included_json: string;
  excluded_json: string;
  status: AppointmentPackageStatus;
  highlight: number;
  sort_order: number;
  updated_at: number;
};

function mapRow(row: PackageRow): AppointmentPackageRecord {
  return {
    id: row.id,
    code: row.code,
    name: parseLocalized(row.name_json),
    personCount: row.person_count,
    pricePerPersonMinor: row.price_per_person_minor,
    currency: 'USD',
    included: parseLocalizedList(row.included_json),
    excluded: parseLocalizedList(row.excluded_json),
    status: row.status,
    highlight: row.highlight === 1,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

type Seed = {
  code: AppointmentPackageCode;
  name: LocalizedText;
  included: LocalizedText[];
  excluded: LocalizedText[];
  highlight: boolean;
};

const commonIncluded: LocalizedText[] = [
  {
    tr: 'Havuzdan uygun randevunun ayrılması',
    en: 'Reserving an available slot from the pool',
    ar: 'حجز موعد متاح من المخزون',
  },
  {
    tr: 'Kadın ve erkek için ayrı saat tercihi',
    en: 'Separate time preference for women and men',
    ar: 'اختيار وقت منفصل للنساء والرجال',
  },
  {
    tr: 'Kişiye özel QR kodunun üretilmesi',
    en: 'Personal QR code generation',
    ar: 'إصدار رمز QR خاص بكل شخص',
  },
  {
    tr: 'QR kodunun WhatsApp veya e-posta ile teslimi',
    en: 'QR delivery over WhatsApp or e-mail',
    ar: 'تسليم الرمز عبر واتساب أو البريد',
  },
  {
    tr: 'Uygun saat bulunamazsa alternatif arama',
    en: 'Alternative search when no slot fits',
    ar: 'البحث عن بديل عند عدم توفر موعد',
  },
];

const groupIncluded: LocalizedText[] = [
  ...commonIncluded,
  {
    tr: 'Grup için tek PDF yolcu listesi',
    en: 'Single PDF passenger list for the group',
    ar: 'قائمة ركاب واحدة بصيغة PDF للمجموعة',
  },
  {
    tr: 'Tek muhatap üzerinden operasyon takibi',
    en: 'Operations tracked through one contact',
    ar: 'متابعة العملية عبر جهة اتصال واحدة',
  },
];

const commonExcluded: LocalizedText[] = [
  {
    tr: 'Uçak bileti, otel ve vize işlemleri',
    en: 'Flights, hotels and visa procedures',
    ar: 'تذاكر الطيران والفنادق وإجراءات التأشيرة',
  },
  {
    tr: 'Ziyaret günü şehir içi ulaşım',
    en: 'Local transport on the visit day',
    ar: 'التنقل داخل المدينة يوم الزيارة',
  },
  {
    tr: 'Harameyn yönetiminin giriş kararı',
    en: 'Entry decision of the Haramain authority',
    ar: 'قرار الدخول الصادر عن إدارة الحرمين',
  },
];

const seeds: Seed[] = [
  {
    code: 'solo',
    name: {
      tr: 'Tek Kişilik Ziyaret',
      en: 'Single Visit',
      ar: 'زيارة فردية',
    },
    included: commonIncluded,
    excluded: commonExcluded,
    highlight: false,
  },
  {
    code: 'family',
    name: { tr: 'Aile Paketi', en: 'Family Package', ar: 'باقة العائلة' },
    included: commonIncluded,
    excluded: commonExcluded,
    highlight: false,
  },
  {
    code: 'group',
    name: { tr: 'Grup Paketi', en: 'Group Package', ar: 'باقة المجموعة' },
    included: groupIncluded,
    excluded: commonExcluded,
    highlight: true,
  },
  {
    code: 'kafile',
    name: { tr: 'Kafile Paketi', en: 'Convoy Package', ar: 'باقة القافلة' },
    included: groupIncluded,
    excluded: commonExcluded,
    highlight: false,
  },
  {
    code: 'agency',
    name: { tr: 'Acente Paketi', en: 'Agency Package', ar: 'باقة الوكالة' },
    included: [
      ...groupIncluded,
      {
        tr: 'Acente paneli ve kontör defteri erişimi',
        en: 'Agency panel and credit ledger access',
        ar: 'الوصول إلى لوحة الوكالة ودفتر الرصيد',
      },
    ],
    excluded: commonExcluded,
    highlight: false,
  },
  {
    code: 'custom',
    name: {
      tr: 'Özel / Kurumsal',
      en: 'Custom / Corporate',
      ar: 'خاصة / مؤسسية',
    },
    included: [
      ...groupIncluded,
      {
        tr: 'Kişi sayısına göre özel planlama',
        en: 'Planning tailored to your headcount',
        ar: 'تخطيط مخصص حسب عدد الأشخاص',
      },
    ],
    excluded: commonExcluded,
    highlight: false,
  },
];

export async function ensureAppointmentPackages() {
  const db = getPackagesDb();
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  const now = Date.now();
  const statement = `INSERT OR IGNORE INTO appointment_packages (
    id, code, name_json, person_count, price_per_person_minor, currency,
    included_json, excluded_json, status, highlight, sort_order, created_at, updated_at
  ) VALUES (?, ?, ?, ?, NULL, 'USD', ?, ?, 'published', ?, ?, ?, ?)`;
  await db.batch(
    seeds.map((seed, index) =>
      db
        .prepare(statement)
        .bind(
          `APKG-${seed.code.toUpperCase()}`,
          seed.code,
          JSON.stringify(seed.name),
          packagePersonCount[seed.code],
          JSON.stringify(seed.included),
          JSON.stringify(seed.excluded),
          seed.highlight ? 1 : 0,
          index,
          now,
          now,
        ),
    ),
  );
}

export async function listAppointmentPackages(
  options: { publishedOnly?: boolean } = {},
): Promise<AppointmentPackageRecord[]> {
  await ensureAppointmentPackages();
  const db = getPackagesDb();
  const query = options.publishedOnly
    ? `SELECT * FROM appointment_packages WHERE status = 'published' ORDER BY sort_order ASC`
    : `SELECT * FROM appointment_packages ORDER BY sort_order ASC`;
  const result = await db.prepare(query).all<PackageRow>();
  return result.results.map(mapRow);
}

export async function getAppointmentPackage(
  code: AppointmentPackageCode,
): Promise<AppointmentPackageRecord | null> {
  await ensureAppointmentPackages();
  const db = getPackagesDb();
  const row = await db
    .prepare('SELECT * FROM appointment_packages WHERE code = ?')
    .bind(code)
    .first<PackageRow>();
  return row ? mapRow(row) : null;
}

export type UpdateAppointmentPackageInput = {
  code: AppointmentPackageCode;
  name: LocalizedText;
  personCount: number;
  pricePerPersonMinor: number | null;
  included: LocalizedText[];
  excluded: LocalizedText[];
  status: AppointmentPackageStatus;
  highlight: boolean;
};

export async function saveAppointmentPackage(
  input: UpdateAppointmentPackageInput,
): Promise<void> {
  await ensureAppointmentPackages();
  const db = getPackagesDb();
  await db
    .prepare(
      `UPDATE appointment_packages SET
        name_json = ?, person_count = ?, price_per_person_minor = ?,
        included_json = ?, excluded_json = ?, status = ?, highlight = ?,
        updated_at = ?
       WHERE code = ?`,
    )
    .bind(
      JSON.stringify(input.name),
      input.personCount,
      input.pricePerPersonMinor,
      JSON.stringify(input.included),
      JSON.stringify(input.excluded),
      input.status,
      input.highlight ? 1 : 0,
      Date.now(),
      input.code,
    )
    .run();
}
