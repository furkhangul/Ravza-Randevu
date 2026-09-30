import {
  getAppointmentPackage,
  listAppointmentPackages,
  saveAppointmentPackage,
} from '@/db/appointment-packages';
import { authorizeApi } from '@/lib/app-auth';
import {
  canPublishAppointmentPackage,
  isAppointmentPackageCode,
} from '@/lib/appointment-packages';

const NO_STORE = { 'cache-control': 'private, no-store' } as const;

export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok)
    return Response.json(
      { error: auth.error },
      { status: auth.status, headers: NO_STORE },
    );
  try {
    return Response.json(
      { packages: await listAppointmentPackages() },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'packages_unavailable' },
      { status: 503, headers: NO_STORE },
    );
  }
}

/**
 * Yalnız ticari alanlar güncellenir: fiyat, kişi sayısı, yayın durumu ve
 * öne çıkarma. Kapsam metinleri kod tarafında tanımlıdır; panelden
 * serbest metin girilmesi çeviri ve tutarlılık sorunları doğuruyordu.
 */
export async function PUT(request: Request) {
  const auth = await authorizeApi(['SUPER_ADMIN', 'AGENCY_ADMIN']);
  if (!auth.ok)
    return Response.json(
      { error: auth.error },
      { status: auth.status, headers: NO_STORE },
    );

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: 'invalid_body' },
      { status: 400, headers: NO_STORE },
    );
  }

  if (!isAppointmentPackageCode(body.code))
    return Response.json(
      { error: 'invalid_code' },
      { status: 400, headers: NO_STORE },
    );

  const status =
    body.status === 'draft' ||
    body.status === 'published' ||
    body.status === 'archived'
      ? body.status
      : null;
  if (!status)
    return Response.json(
      { error: 'invalid_status' },
      { status: 400, headers: NO_STORE },
    );

  const personCount = Number(body.personCount);
  if (!Number.isInteger(personCount) || personCount < 1 || personCount > 500)
    return Response.json(
      { error: 'invalid_person_count' },
      { status: 400, headers: NO_STORE },
    );

  // Boş fiyat geçerlidir: kart "WhatsApp'tan teyit" mesajı gösterir.
  const rawPrice = body.pricePerPersonMinor;
  const price =
    rawPrice === null || rawPrice === '' || typeof rawPrice === 'undefined'
      ? null
      : Number(rawPrice);
  if (price !== null && (!Number.isInteger(price) || price <= 0))
    return Response.json(
      { error: 'invalid_price' },
      { status: 400, headers: NO_STORE },
    );

  try {
    const existing = await getAppointmentPackage(body.code);
    if (!existing)
      return Response.json(
        { error: 'not_found' },
        { status: 404, headers: NO_STORE },
      );

    if (
      status === 'published' &&
      !canPublishAppointmentPackage({
        name: existing.name,
        included: existing.included,
        personCount,
      })
    )
      return Response.json(
        { error: 'publish_requirements_missing' },
        { status: 400, headers: NO_STORE },
      );

    await saveAppointmentPackage({
      code: body.code,
      name: existing.name,
      personCount,
      pricePerPersonMinor: price,
      included: existing.included,
      excluded: existing.excluded,
      status,
      highlight: body.highlight === true,
    });

    return Response.json(
      { packages: await listAppointmentPackages() },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'package_update_failed' },
      { status: 503, headers: NO_STORE },
    );
  }
}
