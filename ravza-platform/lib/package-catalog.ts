import type { SaveUmrahPackageInput } from '../db/catalog.ts';
import { isValidIsoDate } from './date-validation.ts';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function nullableText(value: unknown, maxLength: number) {
  const result = text(value, maxLength);
  return result || null;
}

function integer(value: unknown, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

export function parsePackageInput(
  body: Record<string, unknown>,
): { ok: true; value: SaveUmrahPackageInput } | { ok: false; error: string } {
  const id = text(body.id, 80) || `PKG-${crypto.randomUUID()}`;
  const requestedProductType = text(body.productType, 20);
  const productType = ['hajj', 'umrah'].includes(requestedProductType)
    ? (requestedProductType as SaveUmrahPackageInput['productType'])
    : null;
  const slug = text(body.slug, 80).toLowerCase();
  const name = text(body.name, 120);
  const requestedStatus = text(body.status, 20);
  const status = ['draft', 'published', 'archived'].includes(requestedStatus)
    ? (requestedStatus as SaveUmrahPackageInput['status'])
    : null;
  const departureCity = nullableText(body.departureCity, 80);
  const departureDate = nullableText(body.departureDate, 10);
  const returnDate = nullableText(body.returnDate, 10);
  const makkahNights = integer(body.makkahNights, 0, 60);
  const medinaNights = integer(body.medinaNights, 0, 60);
  const parsedPrice = Number(body.priceMinor);
  const priceMinor =
    Number.isInteger(parsedPrice) &&
    parsedPrice > 0 &&
    parsedPrice <= 100_000_000
      ? parsedPrice
      : null;
  const includedServices = Array.isArray(body.includedServices)
    ? body.includedServices
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 20)
    : [];

  if (
    !id ||
    !productType ||
    !slugPattern.test(slug) ||
    name.length < 3 ||
    !status
  )
    return { ok: false, error: 'Paket türü, adı, kodu veya durumu geçersiz.' };
  if (makkahNights === null || medinaNights === null)
    return { ok: false, error: 'Gece sayıları doğrulanamadı.' };
  if (departureDate && !isValidIsoDate(departureDate))
    return { ok: false, error: 'Gidiş tarihi yyyy-MM-dd olmalıdır.' };
  if (returnDate && !isValidIsoDate(returnDate))
    return { ok: false, error: 'Dönüş tarihi yyyy-MM-dd olmalıdır.' };
  if (departureDate && returnDate && returnDate <= departureDate)
    return { ok: false, error: 'Dönüş tarihi gidişten sonra olmalıdır.' };
  if (
    status === 'published' &&
    (!departureCity ||
      !departureDate ||
      !returnDate ||
      !priceMinor ||
      makkahNights + medinaNights < 1 ||
      includedServices.length < 1)
  )
    return {
      ok: false,
      error:
        'Yayın için şehir, tarihler, pozitif USD fiyatı, gece ve hizmet kapsamı zorunludur.',
    };

  return {
    ok: true,
    value: {
      id,
      productType,
      slug,
      name,
      status,
      departureCity,
      departureDate,
      returnDate,
      makkahNights,
      medinaNights,
      priceMinor,
      currency: 'USD',
      includedServices,
    },
  };
}
