import { redirect } from 'next/navigation';

import { getPortalUser, type PortalUser } from '@/lib/current-user';
import { resolveAppRole, type AppRole } from '@/lib/roles';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { users } from '@/db/schema';

export type AppUser = PortalUser & { role: AppRole };

async function withRole(user: PortalUser): Promise<AppUser | null> {
  const [stored] = await getDb().select().from(users).where(eq(users.id, user.userId)).limit(1);
  if (stored) return stored.status === 'active' ? { ...user, role: stored.role } : null;
  const role = resolveAppRole(user.email);
  // Parolayla giren yönetici hesabı, e-posta listesinde adı geçmese de en az
  // acente yöneticisi yetkisiyle çalışır; kaydın kendisi zaten yetki kanıtıdır.
  if (user.audience === 'staff' && role === 'STAFF') {
    return { ...user, role: 'AGENCY_ADMIN' };
  }
  return { ...user, role };
}

export async function getAppUser(): Promise<AppUser | null> {
  const user = await getPortalUser();
  // E-posta bir yöneticiyle aynı olsa bile müşteri oturumu yetki vermez.
  return user?.audience === 'staff' ? withRole(user) : null;
}

export async function requireAppUser(returnTo: string): Promise<AppUser> {
  const user = await getAppUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(returnTo)}`);
}

export async function requireAppRole(
  returnTo: string,
  allowed: AppRole[],
): Promise<AppUser> {
  const user = await requireAppUser(returnTo);
  if (!allowed.includes(user.role)) redirect('/?access=denied');
  return user;
}

export async function authorizeApi(
  allowed: AppRole[] = ['SUPER_ADMIN', 'AGENCY_ADMIN', 'STAFF'],
) {
  const user = await getAppUser();
  if (!user)
    return {
      ok: false as const,
      status: 401 as const,
      error: 'authentication_required',
    };
  if (!allowed.includes(user.role))
    return {
      ok: false as const,
      status: 403 as const,
      error: 'insufficient_role',
    };
  return { ok: true as const, user };
}
