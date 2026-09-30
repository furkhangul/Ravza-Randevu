/**
 * Talep (teklif) akışının saf mantığı: doğrulama, talep kodu, telefon
 * normalizasyonu, durum geçişleri ve WhatsApp mesajı.
 *
 * Bu dosya ağ veya veritabanı bilmez; tamamı test edilebilir.
 */

import { isValidIsoDate } from './date-validation.ts';
import {
  isAppointmentPackageCode,
  matchPackageForPersonCount,
  type AppointmentPackageCode,
} from './appointment-packages.ts';

export type QuoteService = 'rawdah' | 'umrah' | 'bulk';
export type TimePreference =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'any';
export type QuoteChannel = 'whatsapp' | 'email' | 'phone' | 'panel';
export type QuoteLocale = 'tr' | 'en' | 'ar';

export type QuoteStatus =
  | 'new'
  | 'contacted'
  | 'quoted'
  | 'confirmed'
  | 'scheduled'
  | 'qr_ready'
  | 'delivered'
  | 'closed'
  | 'cancelled'
  | 'expired';

/** Müşteriye gösterilen boru hattı; yan dallar (iptal/süre doldu) hariç. */
export const quotePipeline: QuoteStatus[] = [
  'new',
  'contacted',
  'quoted',
  'confirmed',
  'scheduled',
  'qr_ready',
  'delivered',
  'closed',
];

const transitions: Record<QuoteStatus, QuoteStatus[]> = {
  new: ['contacted', 'cancelled', 'expired'],
  contacted: ['quoted', 'cancelled', 'expired'],
  quoted: ['confirmed', 'contacted', 'cancelled', 'expired'],
  confirmed: ['scheduled', 'cancelled'],
  scheduled: ['qr_ready', 'cancelled'],
  qr_ready: ['delivered'],
  delivered: ['closed'],
  closed: [],
  cancelled: [],
  expired: ['contacted'],
};

export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function nextStatuses(from: QuoteStatus): QuoteStatus[] {
  return transitions[from] ?? [];
}

export function pipelineIndex(status: QuoteStatus): number {
  return quotePipeline.indexOf(status);
}

/* ————————————————————————— Talep kodu ————————————————————————— */

// Crockford Base32'den karışmaya açık harfler (0, O, 1, I, L, U) çıkarıldı.
const codeAlphabet = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

export type RandomBytes = (length: number) => Uint8Array;

const defaultRandomBytes: RandomBytes = (length) =>
  crypto.getRandomValues(new Uint8Array(length));

/**
 * `TALEP-YYYYMMDD-XXXX`. Tarih kısmı operasyonun kodu gözle tarihlemesini
 * sağlar; rastgele kısım tahmin edilmeyi zorlaştırır. Kod tek başına
 * kişisel veri açmaz — sorgulama ayrıca telefonun son dört hanesini ister.
 */
export function generateQuoteCode(
  now: Date = new Date(),
  randomBytes: RandomBytes = defaultRandomBytes,
): string {
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${now.getUTCDate()}`.padStart(2, '0');
  const bytes = randomBytes(4);
  let suffix = '';
  for (const byte of bytes) suffix += codeAlphabet[byte % codeAlphabet.length];
  return `TALEP-${year}${month}${day}-${suffix}`;
}

const codePattern = /^TALEP-\d{8}-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}$/;

export function isQuoteCode(value: string): boolean {
  return codePattern.test(value.trim().toUpperCase());
}

/* ———————————————————————— Telefon ———————————————————————— */

/**
 * E.164'e normalize eder. Türkiye varsayılan ülke kodudur; kullanıcı
 * `+` ile başlayan bir numara yazdıysa ona dokunulmaz.
 */
export function normalizePhone(
  input: string,
  defaultDialCode = '90',
): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`;

  if (!digits.startsWith('+')) {
    const local = digits.replace(/\D/g, '');
    if (!local) return null;
    // 0 ile başlayan yerel yazım ve ülke kodu olmadan girilen numara.
    const withoutTrunk = local.startsWith('0') ? local.slice(1) : local;
    digits = withoutTrunk.startsWith(defaultDialCode)
      ? `+${withoutTrunk}`
      : `+${defaultDialCode}${withoutTrunk}`;
  }

  const numeric = digits.slice(1).replace(/\D/g, '');
  if (numeric.length < 8 || numeric.length > 15) return null;
  return `+${numeric}`;
}

export function phoneLastFour(phoneE164: string): string {
  return phoneE164.replace(/\D/g, '').slice(-4);
}

/* ——————————————————————— Girdi doğrulama ——————————————————————— */

export type QuoteRequestInput = {
  service: QuoteService;
  packageCode: AppointmentPackageCode;
  personCount: number;
  femaleCount: number;
  maleCount: number;
  dateFrom: string;
  dateTo: string;
  flexible: boolean;
  timePreference: TimePreference;
  fullName: string;
  phone: string;
  email: string | null;
  note: string | null;
  locale: QuoteLocale;
  marketingConsent: boolean;
};

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; field?: string };

const services: QuoteService[] = ['rawdah', 'umrah', 'bulk'];
const timePreferences: TimePreference[] = [
  'morning',
  'afternoon',
  'evening',
  'night',
  'any',
];
const locales: QuoteLocale[] = ['tr', 'en', 'ar'];

const MAX_PERSONS = 500;
const MAX_RANGE_DAYS = 60;

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function integer(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

/** Serbest metin yalnız düz metin olarak saklanır; işaretleme kaçışlanır. */
export function sanitizeNote(value: string): string {
  return value
    .replace(/[<>]/g, (character) => (character === '<' ? '&lt;' : '&gt;'))
    .replace(/\s+\n/g, '\n')
    .trim()
    .slice(0, 300);
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function parseQuoteRequestInput(
  body: Record<string, unknown>,
  now: Date = new Date(),
): ParseResult<QuoteRequestInput> {
  const service = services.includes(body.service as QuoteService)
    ? (body.service as QuoteService)
    : null;
  if (!service)
    return { ok: false, error: 'Hizmet türü seçilmedi.', field: 'service' };

  const personCount = integer(body.personCount);
  if (personCount === null || personCount < 1 || personCount > MAX_PERSONS)
    return {
      ok: false,
      error: `Kişi sayısı 1 ile ${MAX_PERSONS} arasında olmalıdır.`,
      field: 'personCount',
    };

  const femaleCount = integer(body.femaleCount);
  const maleCount = integer(body.maleCount);
  if (
    femaleCount === null ||
    maleCount === null ||
    femaleCount < 0 ||
    maleCount < 0
  )
    return {
      ok: false,
      error: 'Kadın ve erkek sayısı eksik.',
      field: 'femaleCount',
    };
  if (femaleCount + maleCount !== personCount)
    return {
      ok: false,
      error: 'Kadın + erkek sayısı toplam kişi sayısına eşit olmalıdır.',
      field: 'femaleCount',
    };

  const dateFrom = text(body.dateFrom, 10);
  const dateTo = text(body.dateTo, 10);
  if (!isValidIsoDate(dateFrom) || !isValidIsoDate(dateTo))
    return {
      ok: false,
      error: 'Tarihler yyyy-AA-gg biçiminde olmalıdır.',
      field: 'dateFrom',
    };
  const today = now.toISOString().slice(0, 10);
  if (dateFrom < today)
    return {
      ok: false,
      error: 'Geçmiş bir tarih seçilemez.',
      field: 'dateFrom',
    };
  if (dateTo < dateFrom)
    return {
      ok: false,
      error: 'Bitiş tarihi başlangıçtan önce olamaz.',
      field: 'dateTo',
    };
  if (daysBetween(dateFrom, dateTo) > MAX_RANGE_DAYS)
    return {
      ok: false,
      error: `Tarih aralığı en fazla ${MAX_RANGE_DAYS} gün olabilir.`,
      field: 'dateTo',
    };

  const timePreference = timePreferences.includes(
    body.timePreference as TimePreference,
  )
    ? (body.timePreference as TimePreference)
    : 'any';

  const fullName = text(body.fullName, 120);
  if (fullName.length < 3)
    return { ok: false, error: 'Ad soyad giriniz.', field: 'fullName' };

  const phone = normalizePhone(text(body.phone, 30));
  if (!phone)
    return {
      ok: false,
      error: 'Telefon numarası geçersiz.',
      field: 'phone',
    };

  const rawEmail = text(body.email, 160).toLowerCase();
  if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rawEmail))
    return { ok: false, error: 'E-posta adresi geçersiz.', field: 'email' };

  const packageCode = isAppointmentPackageCode(body.packageCode)
    ? body.packageCode
    : matchPackageForPersonCount(personCount);

  const locale = locales.includes(body.locale as QuoteLocale)
    ? (body.locale as QuoteLocale)
    : 'tr';

  return {
    ok: true,
    value: {
      service,
      packageCode,
      personCount,
      femaleCount,
      maleCount,
      dateFrom,
      dateTo,
      flexible: body.flexible === true,
      timePreference,
      fullName,
      phone,
      email: rawEmail || null,
      note: sanitizeNote(text(body.note, 400)) || null,
      locale,
      marketingConsent: body.marketingConsent === true,
    },
  };
}

/* ———————————————————— WhatsApp mesajı ———————————————————— */

type MessageCopy = {
  intro: (brand: string) => string;
  code: string;
  service: string;
  pkg: string;
  persons: (count: number) => string;
  split: (female: number, male: number) => string;
  dates: string;
  flexible: string;
  fixed: string;
  time: string;
  name: string;
  phone: string;
  note: string;
  outro: string;
  services: Record<QuoteService, string>;
  times: Record<TimePreference, string>;
};

const messageCopy: Record<QuoteLocale, MessageCopy> = {
  tr: {
    intro: (brand) => `Merhaba, ${brand} üzerinden talep oluşturdum.`,
    code: 'Talep kodu',
    service: 'Hizmet',
    pkg: 'Paket',
    persons: (count) => `${count} kişi`,
    split: (female, male) => `${female} kadın, ${male} erkek`,
    dates: 'Tarih',
    flexible: 'tarihlerim esnek',
    fixed: 'tarihler kesin',
    time: 'Tercih edilen saat',
    name: 'Ad Soyad',
    phone: 'Telefon',
    note: 'Not',
    outro: 'Fiyat ve ödeme için bilgi verebilir misiniz?',
    services: {
      rawdah: 'Ravza randevusu',
      umrah: 'Umre paketi',
      bulk: 'Toplu / acente talebi',
    },
    times: {
      morning: 'Sabah',
      afternoon: 'Öğleden sonra',
      evening: 'Akşam',
      night: 'Gece',
      any: 'Fark etmez',
    },
  },
  en: {
    intro: (brand) => `Hello, I created a request on ${brand}.`,
    code: 'Request code',
    service: 'Service',
    pkg: 'Package',
    persons: (count) => `${count} people`,
    split: (female, male) => `${female} women, ${male} men`,
    dates: 'Dates',
    flexible: 'dates are flexible',
    fixed: 'dates are fixed',
    time: 'Preferred time',
    name: 'Full name',
    phone: 'Phone',
    note: 'Note',
    outro: 'Could you share the price and payment details?',
    services: {
      rawdah: 'Rawdah appointment',
      umrah: 'Umrah package',
      bulk: 'Group / agency request',
    },
    times: {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      night: 'Night',
      any: 'No preference',
    },
  },
  ar: {
    intro: (brand) => `السلام عليكم، أنشأت طلبًا عبر ${brand}.`,
    code: 'رقم الطلب',
    service: 'الخدمة',
    pkg: 'الباقة',
    persons: (count) => `${count} أشخاص`,
    split: (female, male) => `${female} نساء، ${male} رجال`,
    dates: 'التواريخ',
    flexible: 'التواريخ مرنة',
    fixed: 'التواريخ محددة',
    time: 'الوقت المفضل',
    name: 'الاسم الكامل',
    phone: 'الهاتف',
    note: 'ملاحظة',
    outro: 'هل يمكنكم إفادتي بالسعر وطريقة الدفع؟',
    services: {
      rawdah: 'موعد الروضة',
      umrah: 'باقة العمرة',
      bulk: 'طلب جماعي / وكالة',
    },
    times: {
      morning: 'صباحًا',
      afternoon: 'بعد الظهر',
      evening: 'مساءً',
      night: 'ليلًا',
      any: 'لا يهم',
    },
  },
};

export type WhatsappMessageInput = QuoteRequestInput & {
  code: string;
  packageName: string;
  brandName: string;
};

export function buildWhatsappMessage(input: WhatsappMessageInput): string {
  const t = messageCopy[input.locale] ?? messageCopy.tr;
  const lines = [
    t.intro(input.brandName),
    '',
    `${t.code}: ${input.code}`,
    `${t.service}: ${t.services[input.service]}`,
    `${t.pkg}: ${input.packageName} (${t.persons(input.personCount)})`,
    `${t.split(input.femaleCount, input.maleCount)}`,
    `${t.dates}: ${input.dateFrom} - ${input.dateTo} (${
      input.flexible ? t.flexible : t.fixed
    })`,
    `${t.time}: ${t.times[input.timePreference]}`,
    `${t.name}: ${input.fullName}`,
    `${t.phone}: ${input.phone}`,
  ];
  if (input.note) lines.push(`${t.note}: ${input.note}`);
  lines.push('', t.outro);
  return lines.join('\n');
}

/**
 * `wa.me` yalnız rakam kabul eder. Numara yoksa çağıran taraf WhatsApp
 * butonunu göstermemelidir; boş bir link üretmek kullanıcıyı yanıltır.
 */
export function buildWhatsappUrl(
  whatsappNumber: string,
  message: string,
): string | null {
  const digits = whatsappNumber.replace(/\D/g, '');
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(
  email: string,
  code: string,
  message: string,
): string | null {
  if (!email) return null;
  const subject = `Talep ${code}`;
  return `mailto:${email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(message)}`;
}

/** Yöneticinin düzenleyebildiği talep alanları. */
export type QuoteEditChanges = Partial<{
  fullName: string;
  phone: string;
  email: string | null;
  personCount: number;
  femaleCount: number;
  maleCount: number;
  dateFrom: string;
  dateTo: string;
  flexible: boolean;
  timePreference: TimePreference;
  note: string | null;
}>;

/**
 * Panelden gelen düzenlemeyi doğrular. Yalnız gönderilen alanlar değişir;
 * kişi dağılımı ve tarih aralığı mevcut değerlerle birlikte tutarlı olmalıdır.
 * Geçmiş tarihe izin verilir: yönetici eski bir kaydı düzeltebilir.
 */
export function parseQuoteEdit(
  body: Record<string, unknown>,
  current: { femaleCount: number; maleCount: number; dateFrom: string; dateTo: string },
): ParseResult<QuoteEditChanges> {
  const changes: QuoteEditChanges = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

  if (has('fullName')) {
    const name = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    if (name.length < 2 || name.length > 120)
      return { ok: false, error: 'Ad soyad 2–120 karakter olmalıdır.', field: 'fullName' };
    changes.fullName = name;
  }
  if (has('phone')) {
    const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '');
    if (!phone) return { ok: false, error: 'Telefon numarası geçersiz.', field: 'phone' };
    changes.phone = phone;
  }
  if (has('email')) {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254))
      return { ok: false, error: 'E-posta adresi geçersiz.', field: 'email' };
    changes.email = email || null;
  }
  if (has('femaleCount') || has('maleCount')) {
    const female = has('femaleCount') ? integer(body.femaleCount) : current.femaleCount;
    const male = has('maleCount') ? integer(body.maleCount) : current.maleCount;
    if (female === null || male === null || female < 0 || male < 0)
      return { ok: false, error: 'Kadın ve erkek sayısı geçersiz.', field: 'femaleCount' };
    if (female + male < 1 || female + male > MAX_PERSONS)
      return { ok: false, error: `Toplam kişi 1 ile ${MAX_PERSONS} arasında olmalıdır.`, field: 'femaleCount' };
    changes.femaleCount = female;
    changes.maleCount = male;
    changes.personCount = female + male;
  }
  if (has('dateFrom') || has('dateTo')) {
    const from = has('dateFrom') && typeof body.dateFrom === 'string' ? body.dateFrom : current.dateFrom;
    const to = has('dateTo') && typeof body.dateTo === 'string' ? body.dateTo : current.dateTo;
    if (!isValidIsoDate(from) || !isValidIsoDate(to))
      return { ok: false, error: 'Tarih geçersiz.', field: 'dateFrom' };
    if (to < from) return { ok: false, error: 'Bitiş tarihi başlangıçtan önce olamaz.', field: 'dateTo' };
    changes.dateFrom = from;
    changes.dateTo = to;
  }
  if (has('flexible')) changes.flexible = body.flexible === true;
  if (has('timePreference')) {
    if (!timePreferences.includes(body.timePreference as TimePreference))
      return { ok: false, error: 'Saat tercihi geçersiz.', field: 'timePreference' };
    changes.timePreference = body.timePreference as TimePreference;
  }
  if (has('note')) {
    const note = typeof body.note === 'string' ? sanitizeNote(body.note) : '';
    changes.note = note || null;
  }
  if (!Object.keys(changes).length) return { ok: false, error: 'Değişiklik yok.' };
  return { ok: true, value: changes };
}
