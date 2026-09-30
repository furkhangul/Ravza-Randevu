import {
  getCustomerProfile,
  missingProfileFields,
  upsertCustomerProfile,
  type ProfileUpdate,
} from '@/db/customer-profile';
import { getPortalUser } from '@/lib/current-user';
import { isValidPastIsoDate } from '@/lib/date-validation';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function GET() {
  const user = await getPortalUser();
  if (!user) {
    return Response.json(
      { error: 'authentication_required' },
      { status: 401, headers: NO_STORE },
    );
  }
  try {
    const profile = await getCustomerProfile(user.userId);
    return Response.json(
      { profile, missing: missingProfileFields(profile) },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'profile_unavailable' },
      { status: 503, headers: NO_STORE },
    );
  }
}

export async function PUT(request: Request) {
  const user = await getPortalUser();
  if (!user) {
    return Response.json(
      { error: 'authentication_required' },
      { status: 401, headers: NO_STORE },
    );
  }
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return Response.json(
      { error: 'invalid_origin' },
      { status: 403, headers: NO_STORE },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { error: 'invalid_body' },
      { status: 400, headers: NO_STORE },
    );
  }

  const birthDate = text(payload.birthDate, 10);
  if (birthDate && !isValidPastIsoDate(birthDate)) {
    return Response.json(
      { error: 'invalid_birth_date' },
      { status: 400, headers: NO_STORE },
    );
  }

  const genderInput = text(payload.gender, 6);
  const update: ProfileUpdate = {
    fullName: text(payload.fullName, 120),
    phone: text(payload.phone, 32),
    birthDate,
    gender:
      genderInput === 'male' || genderInput === 'female' ? genderInput : '',
    nationality: text(payload.nationality, 60),
    passportNumber: text(payload.passportNumber, 24).toUpperCase(),
    residenceCountry: text(payload.residenceCountry, 60),
    residenceCity: text(payload.residenceCity, 60),
    marketingOptIn: payload.marketingOptIn === true,
  };

  try {
    const profile = await upsertCustomerProfile(
      user.userId,
      user.email,
      update,
    );
    return Response.json(
      { profile, missing: missingProfileFields(profile) },
      { headers: NO_STORE },
    );
  } catch {
    return Response.json(
      { error: 'profile_save_failed' },
      { status: 503, headers: NO_STORE },
    );
  }
}
