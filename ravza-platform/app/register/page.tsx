import { LoginExperience } from '@/components/login-experience';
import { getPortalUser } from '@/lib/current-user';
import { isGoogleLoginEnabled } from '@/lib/google-oauth';
export const dynamic = 'force-dynamic';
export default async function RegisterPage() {
  const user = await getPortalUser();
  return <LoginExperience signedIn={Boolean(user)} register googleEnabled={isGoogleLoginEnabled()} returnTo="/hesabim" />;
}
