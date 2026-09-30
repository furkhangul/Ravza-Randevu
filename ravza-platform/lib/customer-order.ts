import { isValidIsoDate, isValidPastIsoDate } from './date-validation.ts';

export type CustomerOrderPassengerInput = {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  birthDate: string;
  nationality: string;
};

export type CustomerOrderInput = {
  packageSlug: string;
  contactEmail: string;
  contactPhone: string;
  residenceCountry: string;
  residenceCity: string;
  departureLocation: string;
  passengers: CustomerOrderPassengerInput[];
  ravzaVisitDate: string;
  selectedSlots: Partial<
    Record<'male' | 'female', { timeSlot: string; window: string }>
  >;
  idempotencyKey: string;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const idempotencyPattern = /^[a-zA-Z0-9_-]{16,100}$/;

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function parseCustomerOrderInput(
  body: Record<string, unknown>,
): { ok: true; value: CustomerOrderInput } | { ok: false; error: string } {
  const packageSlug = clean(body.packageSlug, 80).toLowerCase();
  const contactEmail = clean(body.contactEmail, 160).toLowerCase();
  const contactPhone = clean(body.contactPhone, 30);
  const residenceCountry = clean(body.residenceCountry, 80);
  const residenceCity = clean(body.residenceCity, 80);
  const departureLocation = clean(body.departureLocation, 120);
  const ravzaVisitDate = clean(body.ravzaVisitDate, 10);
  const idempotencyKey = clean(body.idempotencyKey, 100);
  const rawPassengers = Array.isArray(body.passengers) ? body.passengers : [];
  const passengers = rawPassengers.slice(0, 8).map((item) => {
    const record =
      item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const gender = clean(record.gender, 10);
    return {
      firstName: clean(record.firstName, 80),
      lastName: clean(record.lastName, 80),
      gender: gender === 'male' || gender === 'female' ? gender : undefined,
      birthDate: clean(record.birthDate, 10),
      nationality: clean(record.nationality, 80),
    };
  });
  const rawSlots =
    body.selectedSlots && typeof body.selectedSlots === 'object'
      ? (body.selectedSlots as Record<string, unknown>)
      : {};
  const selectedSlots: CustomerOrderInput['selectedSlots'] = {};
  for (const gender of ['male', 'female'] as const) {
    const raw = rawSlots[gender];
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    const timeSlot = clean(record.timeSlot, 20);
    const window = clean(record.window, 40);
    if (timeSlot && window) selectedSlots[gender] = { timeSlot, window };
  }

  if (!slugPattern.test(packageSlug))
    return { ok: false, error: 'Geçerli bir paket seçilmelidir.' };
  if (!contactEmail.includes('@') || contactEmail.length < 5)
    return { ok: false, error: 'İletişim e-postası geçersiz.' };
  if (contactPhone.length < 7)
    return { ok: false, error: 'İletişim telefonu geçersiz.' };
  if (!residenceCountry || !residenceCity || !departureLocation)
    return { ok: false, error: 'İkamet ve çıkış konumu eksik.' };
  if (!isValidIsoDate(ravzaVisitDate))
    return { ok: false, error: 'Ravza ziyaret tarihi geçersiz.' };
  if (!idempotencyPattern.test(idempotencyKey))
    return { ok: false, error: 'İşlem anahtarı geçersiz.' };
  if (
    passengers.length < 1 ||
    passengers.length !== rawPassengers.length ||
    passengers.some(
      (item) =>
        !item.firstName ||
        !item.lastName ||
        !item.gender ||
        !isValidPastIsoDate(item.birthDate) ||
        !item.nationality,
    )
  )
    return { ok: false, error: 'Yolcu bilgileri eksik veya geçersiz.' };
  const requiredGenders = (['male', 'female'] as const).filter((gender) =>
    passengers.some((item) => item.gender === gender),
  );
  if (requiredGenders.some((gender) => !selectedSlots[gender]))
    return {
      ok: false,
      error: 'Her yolcu grubu için Ravza saati seçilmelidir.',
    };

  return {
    ok: true,
    value: {
      packageSlug,
      contactEmail,
      contactPhone,
      residenceCountry,
      residenceCity,
      departureLocation,
      passengers: passengers as CustomerOrderPassengerInput[],
      ravzaVisitDate,
      selectedSlots,
      idempotencyKey,
    },
  };
}
