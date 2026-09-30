import { isValidIsoDate } from './date-validation.ts';
import { normalizePhone } from './quote-request.ts';

/** Acente başvurusu ve acente işlemleri için giriş doğrulama (saf, test edilebilir). */

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; field?: string };

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** En az 10 karakter, harf ve rakam. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return 'Şifre en az 10 karakter olmalıdır.';
  if (password.length > 200) return 'Şifre çok uzun.';
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password) || !/\d/.test(password))
    return 'Şifre en az bir harf ve bir rakam içermelidir.';
  return null;
}

export type AgencyApplicationInput = {
  companyName: string;
  taxOffice: string;
  taxNumber: string;
  tursabNumber: string;
  address: string;
  city: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  password: string;
  initialCredits: number;
};

export const MAX_CREDIT_REQUEST = 100_000;

export function parseAgencyApplication(body: Record<string, unknown>): Parsed<AgencyApplicationInput> {
  const companyName = text(body.companyName, 160);
  if (companyName.length < 3) return { ok: false, error: 'Ticari unvanı yazın.', field: 'companyName' };
  const taxOffice = text(body.taxOffice, 80);
  if (taxOffice.length < 2) return { ok: false, error: 'Vergi dairesini yazın.', field: 'taxOffice' };
  const taxNumber = text(body.taxNumber, 20).replace(/\s/g, '');
  if (!/^\d{10,11}$/.test(taxNumber))
    return { ok: false, error: 'Vergi numarası 10, TC kimlik no 11 haneli olmalıdır.', field: 'taxNumber' };
  const tursabNumber = text(body.tursabNumber, 30);
  const address = text(body.address, 300);
  if (address.length < 10) return { ok: false, error: 'Şirket adresini yazın.', field: 'address' };
  const city = text(body.city, 60);
  if (city.length < 2) return { ok: false, error: 'Şehri yazın.', field: 'city' };
  const contactName = text(body.contactName, 120);
  if (contactName.length < 3) return { ok: false, error: 'Yetkili kişinin adını yazın.', field: 'contactName' };
  const contactPhone = normalizePhone(text(body.contactPhone, 30));
  if (!contactPhone) return { ok: false, error: 'Telefon numarası geçersiz.', field: 'contactPhone' };
  const contactEmail = text(body.contactEmail, 254).toLowerCase();
  if (!emailPattern.test(contactEmail)) return { ok: false, error: 'E-posta adresi geçersiz.', field: 'contactEmail' };
  const password = typeof body.password === 'string' ? body.password : '';
  const problem = passwordProblem(password);
  if (problem) return { ok: false, error: problem, field: 'password' };
  if (body.termsAccepted !== true)
    return { ok: false, error: 'Acente kullanım koşullarını ve KVKK metnini onaylayın.', field: 'termsAccepted' };
  if (body.disclaimerAccepted !== true)
    return { ok: false, error: 'Sorumluluk reddi beyanını onaylayın.', field: 'disclaimerAccepted' };
  const rawCredits = body.initialCredits === '' || body.initialCredits === undefined ? 0 : Number(body.initialCredits);
  if (!Number.isInteger(rawCredits) || rawCredits < 0 || rawCredits > MAX_CREDIT_REQUEST)
    return { ok: false, error: `İlk kontör talebi 0 ile ${MAX_CREDIT_REQUEST} arasında olmalıdır.`, field: 'initialCredits' };
  return {
    ok: true,
    value: {
      companyName,
      taxOffice,
      taxNumber,
      tursabNumber,
      address,
      city,
      contactName,
      contactPhone,
      contactEmail,
      password,
      initialCredits: rawCredits,
    },
  };
}

export function parseCreditRequest(body: Record<string, unknown>): Parsed<{ quantity: number; note: string | null }> {
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CREDIT_REQUEST)
    return { ok: false, error: `Adet 1 ile ${MAX_CREDIT_REQUEST} arasında olmalıdır.`, field: 'quantity' };
  const note = text(body.note, 300);
  return { ok: true, value: { quantity, note: note || null } };
}

export type AgencyPurchase = {
  groupName: string;
  dateKey: string;
  female: { timeSlot: string; count: number } | null;
  male: { timeSlot: string; count: number } | null;
};

/** Tek seferde en fazla bu kadar kişi (RawdahBooking stok ve hata yönetimi için makul sınır). */
export const MAX_GROUP = 200;

export function parseAgencyPurchase(body: Record<string, unknown>, today: string): Parsed<AgencyPurchase> {
  const groupName = text(body.groupName, 80);
  const dateKey = typeof body.dateKey === 'string' ? body.dateKey : '';
  if (!isValidIsoDate(dateKey) || dateKey < today) return { ok: false, error: 'Geçerli bir ziyaret tarihi seçin.', field: 'dateKey' };
  const part = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const count = Number(record.count);
    const timeSlot = typeof record.timeSlot === 'string' ? record.timeSlot : '';
    if (!Number.isInteger(count) || count <= 0) return null;
    return { timeSlot, count };
  };
  const female = part(body.female);
  const male = part(body.male);
  if (!female && !male) return { ok: false, error: 'En az bir kişi girin.', field: 'count' };
  for (const [label, item] of [['Kadın', female], ['Erkek', male]] as const) {
    if (!item) continue;
    if (!/^\d{2}:\d{2}$/.test(item.timeSlot)) return { ok: false, error: `${label} grubu için saat seçin.`, field: 'timeSlot' };
    if (item.count > MAX_GROUP) return { ok: false, error: `Tek seferde en fazla ${MAX_GROUP} kişi.`, field: 'count' };
  }
  return { ok: true, value: { groupName, dateKey, female, male } };
}
