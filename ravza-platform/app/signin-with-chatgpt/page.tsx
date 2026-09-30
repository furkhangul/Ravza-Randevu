import { redirect } from 'next/navigation';
import { loginReturnPath } from '@/lib/login-path';
export const dynamic = 'force-dynamic';
export default async function LegacyLogin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.return_to) ? params.return_to[0] : params.return_to;
  const staff = Boolean(raw && /^\/(?:panel|dashboard|super-admin)(?:\/|$)/.test(raw));
  redirect(staff ? '/admin' : '/login?return_to=' + encodeURIComponent(loginReturnPath(raw)));
}
