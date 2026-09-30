/**
 * Ravza randevu paketleri: kişi sayısına göre toplu satış katmanları.
 *
 * Umre paketi (`lib/package-catalog.ts`) ayrı bir üründür ve seyahat
 * acentesi yetkisine bağlıdır. Bu dosya yalnız randevu/randevu hakkı satışını
 * tanımlar; iki katalog bilerek karıştırılmaz.
 */

export type AppointmentPackageCode =
  | 'solo'
  | 'family'
  | 'group'
  | 'kafile'
  | 'agency'
  | 'custom';

export type AppointmentPackageStatus = 'draft' | 'published' | 'archived';

export type LocalizedText = { tr: string; en: string; ar: string };

export type AppointmentPackageRecord = {
  id: string;
  code: AppointmentPackageCode;
  name: LocalizedText;
  personCount: number;
  /** Kişi başı fiyat, USD cent. `null` ise fiyat kesinleşmemiştir. */
  pricePerPersonMinor: number | null;
  currency: 'USD';
  included: LocalizedText[];
  excluded: LocalizedText[];
  status: AppointmentPackageStatus;
  highlight: boolean;
  sortOrder: number;
  updatedAt: number;
};

export const appointmentPackageCodes: AppointmentPackageCode[] = [
  'solo',
  'family',
  'group',
  'kafile',
  'agency',
  'custom',
];

/** `custom` için kişi sayısı taleple gelir; taban değer alt sınırdır. */
export const packagePersonCount: Record<AppointmentPackageCode, number> = {
  solo: 1,
  family: 3,
  group: 5,
  kafile: 10,
  agency: 25,
  custom: 25,
};

export function isAppointmentPackageCode(
  value: unknown,
): value is AppointmentPackageCode {
  return (
    typeof value === 'string' &&
    (appointmentPackageCodes as string[]).includes(value)
  );
}

/**
 * Girilen kişi sayısına en uygun paketi seçer: sayıyı aşmayan en büyük
 * katman. 25'ten fazlası özel pakete düşer.
 */
export function matchPackageForPersonCount(
  personCount: number,
): AppointmentPackageCode {
  if (!Number.isInteger(personCount) || personCount < 1) return 'solo';
  if (personCount > 25) return 'custom';
  const ordered: AppointmentPackageCode[] = [
    'agency',
    'kafile',
    'group',
    'family',
    'solo',
  ];
  return (
    ordered.find((code) => packagePersonCount[code] <= personCount) ?? 'solo'
  );
}

export function packageTotalMinor(
  pkg: Pick<AppointmentPackageRecord, 'pricePerPersonMinor' | 'personCount'>,
  personCount = pkg.personCount,
): number | null {
  if (pkg.pricePerPersonMinor === null) return null;
  if (!Number.isInteger(personCount) || personCount < 1) return null;
  return pkg.pricePerPersonMinor * personCount;
}

/**
 * Tek kişilik pakete göre kişi başı avantaj yüzdesi. Referans fiyat yoksa
 * veya avantaj yoksa `null` döner — kartta uydurma rozet çıkmasın diye.
 */
export function packageAdvantagePercent(
  pricePerPersonMinor: number | null,
  soloPricePerPersonMinor: number | null,
): number | null {
  if (
    pricePerPersonMinor === null ||
    soloPricePerPersonMinor === null ||
    soloPricePerPersonMinor <= 0 ||
    pricePerPersonMinor >= soloPricePerPersonMinor
  )
    return null;
  const percent = Math.round(
    ((soloPricePerPersonMinor - pricePerPersonMinor) /
      soloPricePerPersonMinor) *
      100,
  );
  return percent > 0 ? percent : null;
}

/**
 * Yayın kuralı: fiyatsız paket de yayımlanabilir (kartta "WhatsApp'tan
 * teyit" yazar) fakat adı ve kapsamı eksik paket yayımlanamaz.
 */
export function canPublishAppointmentPackage(
  pkg: Pick<AppointmentPackageRecord, 'name' | 'included' | 'personCount'>,
): boolean {
  return (
    pkg.name.tr.trim().length >= 3 &&
    pkg.included.length >= 3 &&
    Number.isInteger(pkg.personCount) &&
    pkg.personCount >= 1
  );
}

