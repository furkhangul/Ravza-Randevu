import { eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { customerProfiles } from '@/db/schema';
import { missingProfileFields } from '@/lib/profile-fields';

export type CustomerProfile = {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
  birthDate: string;
  gender: 'male' | 'female' | '';
  nationality: string;
  passportNumber: string;
  residenceCountry: string;
  residenceCity: string;
  preferredLocale: string;
  source: 'google' | 'manual';
  marketingOptIn: boolean;
  completedAt: number | null;
};

export {
  missingProfileFields,
  profileFieldLabels,
  requiredProfileFields,
  type RequiredProfileField,
} from '@/lib/profile-fields';

function toProfile(row: typeof customerProfiles.$inferSelect): CustomerProfile {
  return {
    userId: row.userId,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    birthDate: row.birthDate,
    gender: row.gender,
    nationality: row.nationality,
    passportNumber: row.passportNumber,
    residenceCountry: row.residenceCountry,
    residenceCity: row.residenceCity,
    preferredLocale: row.preferredLocale,
    source: row.source,
    marketingOptIn: row.marketingOptIn,
    completedAt: row.completedAt ? row.completedAt.getTime() : null,
  };
}

export async function getCustomerProfile(
  userId: string,
): Promise<CustomerProfile | null> {
  const rows = await getDb()
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.userId, userId))
    .limit(1);
  return rows[0] ? toProfile(rows[0]) : null;
}

export type ProfileUpdate = Partial<
  Pick<
    CustomerProfile,
    | 'fullName'
    | 'phone'
    | 'birthDate'
    | 'gender'
    | 'nationality'
    | 'passportNumber'
    | 'residenceCountry'
    | 'residenceCity'
    | 'preferredLocale'
    | 'marketingOptIn'
  >
>;

export async function upsertCustomerProfile(
  userId: string,
  email: string,
  update: ProfileUpdate,
): Promise<CustomerProfile> {
  const db = getDb();
  const now = new Date();
  const existing = await getCustomerProfile(userId);

  if (!existing) {
    await db.insert(customerProfiles).values({
      userId,
      email,
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      ...update,
    });
  } else {
    await db
      .update(customerProfiles)
      .set({ ...update, email, updatedAt: now })
      .where(eq(customerProfiles.userId, userId));
  }

  const saved = await getCustomerProfile(userId);
  if (!saved) throw new Error('profile_persist_failed');

  // Zorunlu alanların tamamı dolduğu ilk anda tamamlanma zamanı işaretlenir.
  if (!saved.completedAt && missingProfileFields(saved).length === 0) {
    await db
      .update(customerProfiles)
      .set({ completedAt: now })
      .where(eq(customerProfiles.userId, userId));
    return { ...saved, completedAt: now.getTime() };
  }

  return saved;
}
