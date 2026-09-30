/**
 * Müşteri profilinin zorunlu alanları — veritabanından bağımsız saf mantık,
 * böylece hem sunucuda hem testte doğrudan çalışır.
 */

export const requiredProfileFields = [
  'fullName',
  'phone',
  'birthDate',
  'nationality',
  'residenceCountry',
  'residenceCity',
] as const;

export type RequiredProfileField = (typeof requiredProfileFields)[number];

export const profileFieldLabels: Record<RequiredProfileField, string> = {
  fullName: 'Ad soyad',
  phone: 'Telefon',
  birthDate: 'Doğum tarihi',
  nationality: 'Uyruk',
  residenceCountry: 'Yaşadığınız ülke',
  residenceCity: 'Yaşadığınız şehir',
};

/** Yalnız boşluktan oluşan değer dolu sayılmaz. */
export function missingProfileFields(
  profile: Partial<Record<RequiredProfileField, string>> | null,
): RequiredProfileField[] {
  if (!profile) return [...requiredProfileFields];
  return requiredProfileFields.filter(
    (field) => !(profile[field] ?? '').trim(),
  );
}
