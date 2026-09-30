import { LoginExperience } from '@/components/login-experience';
import { getPortalUser } from '@/lib/current-user';
import { isGoogleLoginEnabled } from '@/lib/google-oauth';
import { loginReturnPath } from '@/lib/login-path';

export const dynamic = 'force-dynamic';
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.return_to) ? params.return_to[0] : params.return_to;
  const staff = Boolean(raw && /^\/(?:panel|dashboard|super-admin)(?:\/|$)/.test(raw));
  const user = await getPortalUser();
  return <LoginExperience signedIn={Boolean(user && (!staff || user.audience === 'staff'))} staff={staff} googleEnabled={isGoogleLoginEnabled()} returnTo={loginReturnPath(raw, staff)} accountHref={user?.audience === 'staff' ? '/panel' : '/hesabim'} />;
}
