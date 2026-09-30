import { redirect } from 'next/navigation';

import { getChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';
import { getSessionUser } from '@/lib/session';

export type AuthSource = 'chatgpt' | 'google' | 'password';

export type PortalUser = ChatGPTUser & {
  authSource: AuthSource;
  /** `staff` yalnız yönetici parola girişiyle verilir. */
  audience: 'customer' | 'staff';
};

/**
 * Sitedeki tek kimlik kaynağı.
 *
 * Üç giriş yolu aynı kullanıcı nesnesine indirgenir:
 * 1. ChatGPT uygulama başlıkları (uygulama içinde açıldığında),
 * 2. Google ile giriş (oturum çerezi),
 * 3. Yönetici kullanıcı adı + parola (oturum çerezi).
 *
 * Başlıkla gelen kimlik önceliklidir; yoksa çerez oturumuna bakılır.
 */
export async function getPortalUser(): Promise<PortalUser | null> {
  const headerUser = await getChatGPTUser();
  if (headerUser)
    return { ...headerUser, authSource: 'chatgpt', audience: 'customer' };

  const session = await getSessionUser();
  // Acente oturumu müşteri veya yönetici kimliği değildir; bu alanlarda oturum yok sayılır.
  if (!session || session.audience === 'agency') return null;

  return {
    userId: session.userId,
    email: session.email,
    displayName: session.displayName,
    fullName: session.displayName || null,
    authSource: session.provider,
    audience: session.audience as 'customer' | 'staff',
  };
}

export async function requirePortalUser(returnTo: string): Promise<PortalUser> {
  const user = await getPortalUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(returnTo)}`);
}
